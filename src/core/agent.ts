import axios from 'axios';
import { Client, Message } from 'discord.js';
import { v4 as uuidv4 } from 'uuid';
import { AGENT_CONFIG } from './config.js';
import { getAvailableTools, handleToolCalls } from './tool-handler.js';
import {
  ChatEvent,
  WorkingMemory,
  BABY_MEMORY_CONFIG,
} from './memory/types.js';
import { shouldReplyGate, updateSelfConcept } from './memory/gate.js';
import { retrieveRelevantMemories } from './memory/retrieval.js';
import { buildDynamicSystemPrompt } from './memory/prompt.js';
import { createEpisodeFromEvents } from './memory/episodic.js';

// =============================================================================
// Main Agent State
// =============================================================================

let workingMemory: WorkingMemory = [];
let eventBuffer: ChatEvent[] = [];
let lastMessageTimestamp = Date.now();

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Converts a Discord Message to our internal ChatEvent format.
 */
function formatMessageToEvent(message: Message): ChatEvent {
  return {
    msg_id: message.id,
    author_id: message.author.id,
    author_name: message.author.displayName,
    timestamp: Math.floor(message.createdTimestamp / 1000),
    content: message.content,
    is_mention: message.mentions.users.has(message.client.user!.id),
  };
}

/**
 * Sends a response, splitting it into multiple messages if necessary.
 * Also updates the agent's self-concept with the response.
 */
async function sendResponse(message: Message, content: string) {
  try {
    // Update self-concept before sending, so the agent learns from its own words
    await updateSelfConcept(content);

    if (!AGENT_CONFIG.splitMessages) {
      await message.reply(content);
      return;
    }
    const parts = content.split('\n\n').filter(part => part.trim().length > 0);
    if (parts.length === 0) return;

    await message.reply(parts[0]);

    if (parts.length > 1) {
      for (let i = 1; i < parts.length; i++) {
        if (AGENT_CONFIG.messageSplitDelay > 0) {
            if ('sendTyping' in message.channel) {
                await message.channel.sendTyping();
            }
          await new Promise(resolve => setTimeout(resolve, AGENT_CONFIG.messageSplitDelay));
        }
        if ('send' in message.channel) {
            await message.channel.send(parts[i]);
        }
      }
    }
  } catch (error) {
    console.error('Failed to send response:', error);
  }
}

/**
 * Makes a request to the LLM API to generate a response.
 */
async function callLLM(messages: any[], tools: any[]) {
  return axios.post(AGENT_CONFIG.apiEndpoint, {
    model: AGENT_CONFIG.model,
    messages,
    tools,
    tool_choice: 'auto',
  }, {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${AGENT_CONFIG.apiKey}`
    }
  });
}

// =============================================================================
// Core Agent Logic
// =============================================================================

/**
 * Processes an incoming chat event, updating memory and deciding whether to respond.
 */
export async function runAgent(client: Client, message: Message) {
  // Ignore messages from the bot itself
  if (message.author.id === client.user?.id) {
    return;
  }

  const event = formatMessageToEvent(message);

  // Add event to buffers
  workingMemory.push(event);
  if (workingMemory.length > BABY_MEMORY_CONFIG.workingMemorySize) {
    workingMemory.shift(); // Keep WM at a fixed size
  }
  eventBuffer.push(event);
  const now = Date.now();

  // Check if it's time to form an episode
  const timeSinceLastMessage = now - lastMessageTimestamp;
  if (
    eventBuffer.length >= BABY_MEMORY_CONFIG.episodeCreationThreshold ||
    (timeSinceLastMessage > BABY_MEMORY_CONFIG.episodeCreationTimeout * 1000 && eventBuffer.length > 0)
  ) {
    await createEpisodeFromEvents([...eventBuffer]);
    eventBuffer = []; // Clear the buffer after creating an episode
  }
  lastMessageTimestamp = now;


  // 1. "Should I Reply?" Gate
  if (!(await shouldReplyGate(event, BABY_MEMORY_CONFIG))) {
    return; // Agent decides to remain silent
  }

  if ('sendTyping' in message.channel) {
    await message.channel.sendTyping();
  }

  // 2. Retrieve Relevant Memories
  const relevantMemories = await retrieveRelevantMemories(event, BABY_MEMORY_CONFIG);

  // 3. Build Dynamic System Prompt
  const systemPrompt = await buildDynamicSystemPrompt(workingMemory, relevantMemories);

  const messages: any[] = [{ role: 'system', content: systemPrompt }];
  const tools = getAvailableTools();

  // 4. Call LLM for response
  try {
    let llmResponse = await callLLM(messages, tools);
    let assistantMessage = llmResponse.data.choices[0].message;

    messages.push(assistantMessage);

    // 5. Handle Tool Calls
    if (assistantMessage.tool_calls && assistantMessage.tool_calls.length > 0) {
      const toolResultMessages = await handleToolCalls(
        assistantMessage.tool_calls,
        client,
        message,
      );
      messages.push(...toolResultMessages);

      // Make a final call to get the response after tool execution
      llmResponse = await callLLM(messages, tools);
      assistantMessage = llmResponse.data.choices[0].message;
    }

    // 6. Send Final Response
    if (assistantMessage.content) {
      await sendResponse(message, assistantMessage.content);
    }
  } catch (error) {
    if (axios.isAxiosError(error)) {
        console.error('Error calling LLM:', error.response?.data || error.message);
    } else {
        console.error('An unexpected error occurred during LLM call:', error);
    }
  }
} 
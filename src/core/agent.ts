import axios from 'axios';
import { Client, Message } from 'discord.js';
import { AGENT_CONFIG } from './config.js';
import { getAvailableTools, handleToolCalls } from './tool-handler.js';

/**
 * Formats Discord message content to make mentions more intelligible.
 * Replaces Discord's mention format with a more descriptive format that includes
 * username, display name, and user ID to make it clear when someone is mentioned.
 * 
 * @param message - The Discord message to format
 * @returns Formatted message content with intelligible mentions
 */
function formatMessageContent(message: Message): string {
  let content = message.content;
  
  // Handle user mentions
  for (const user of message.mentions.users.values()) {
    const mentionPattern = new RegExp(`<@!?${user.id}>`, 'g');
    
    // Special case for mentions of the current bot
    let replacement: string;
    if (user.id === message.client.user?.id) {
      replacement = `[<@me>]`;
    } else {
      replacement = `[${user.displayName} <@${user.id}>]`;
    }
    
    content = content.replace(mentionPattern, replacement);
  }
  
  // Handle role mentions
  for (const role of message.mentions.roles.values()) {
    const mentionPattern = new RegExp(`<@&${role.id}>`, 'g');
    const replacement = `[${role.name} <@&${role.id}>]`;
    content = content.replace(mentionPattern, replacement);
  }
  
  // Handle channel mentions
  for (const channel of message.mentions.channels.values()) {
    const mentionPattern = new RegExp(`<#${channel.id}>`, 'g');
    const channelName = 'name' in channel ? channel.name : channel.id;
    const replacement = `[#${channelName} <#${channel.id}>]`;
    content = content.replace(mentionPattern, replacement);
  }
  
  return content;
}

/**
 * Fetches and formats the last N messages from a channel for use in LLM requests.
 * 
 * @param message - The Discord message to get the channel from
 * @param limit - Number of messages to fetch (defaults to AGENT_CONFIG.messageHistoryLimit)
 * @returns Array of formatted messages for LLM consumption
 */
async function fetchAndFormatMessages(message: Message, limit: number = AGENT_CONFIG.messageHistoryLimit): Promise<any[]> {
  // Fetch the last N messages from the channel
  const messages = await message.channel.messages.fetch({ limit });
  const messageArray = Array.from(messages.values()).reverse(); // Reverse to get chronological order
  
  const formattedMessages: any[] = [];
  
  // Add each Discord message as a separate LLM message
  for (const msg of messageArray) {
    // Determine if this message is from the bot itself
    const isFromBot = msg.author.id === msg.client.user?.id;
    
    formattedMessages.push({
      role: isFromBot ? 'assistant' : 'user',
      content: [
        {
          type: 'text',
          text: isFromBot 
            ? formatMessageContent(msg)  // Don't add username prefix for bot messages
            : `[${msg.author.displayName} <@${msg.author.id}>] ${formatMessageContent(msg)}`
        }
      ]
    });
  }
  
  return formattedMessages;
}

/**
 * Determines whether the agent should respond to a message.
 * Fetches the last N messages from the channel and uses an LLM to score
 * how relevant they are to the bot's purpose. Only responds if confidence > threshold.
 * 
 * @param message - The Discord message to evaluate
 * @returns Promise that resolves to true if the agent should respond, false otherwise
 */
async function shouldRespondToMessage(message: Message): Promise<boolean> {
  try {
    // Get formatted messages using the shared function
    const messageHistory = await fetchAndFormatMessages(message, AGENT_CONFIG.confidenceCheck.messageHistoryLimit);
    
    // Prepare the confidence check request with system message first
    const confidenceMessages = [
      {
        role: 'system',
        content: [
          {
            type: 'text',
            text: AGENT_CONFIG.confidenceCheck.systemPrompt
          }
        ]
      },
      ...messageHistory
    ];

    const response = await axios.post(AGENT_CONFIG.confidenceCheck.apiEndpoint, {
      model: AGENT_CONFIG.confidenceCheck.model,
      messages: confidenceMessages,
      response_format: {
        type: 'json_schema',
        json_schema: {
          name: 'message_send_confidence',
          strict: true,
          schema: {
            type: 'object',
            properties: {
              confidence: {
                type: 'number',
                description: 'Value between 0 and 1 representing confidence to send a message',
                minimum: 0,
                maximum: 1
              }
            },
            required: ['confidence'],
            additionalProperties: false
          }
        }
      }
    }, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${AGENT_CONFIG.confidenceCheck.apiKey}`
      }
    });

    const result = JSON.parse(response.data.choices[0].message.content);
    const confidence = result.confidence;
    
    console.log(`Confidence score: ${confidence} (threshold: ${AGENT_CONFIG.confidenceCheck.threshold})`);
    
    return confidence >= AGENT_CONFIG.confidenceCheck.threshold;
  } catch (error) {
    console.error('Error checking message confidence:', error);
    // If there's an error, default to not responding
    return false;
  }
}

/**
 * Sends a message that may contain multiple parts split by double newlines.
 * The first part is sent as a reply, subsequent parts are sent as regular messages.
 * 
 * @param message - The Discord message that triggered the response
 * @param content - The content to send (may contain double newlines)
 * @returns Promise that resolves when all messages are sent or fails silently
 */
async function sendResponse(message: Message, content: string) {
  try {
    // Check if message splitting is enabled
    if (!AGENT_CONFIG.splitMessages) {
      await message.reply(content);
      return;
    }

    // Split messages on double newlines
    const parts = content.split('\n\n').filter(part => part.trim().length > 0);
    
    if (parts.length === 0) return;
    
    // Send the first part as a reply
    await message.reply(parts[0]);
    
    // Send remaining parts as regular messages with configurable delay
    if ('send' in message.channel && parts.length > 1) {
      for (let i = 1; i < parts.length; i++) {
        // Show typing indicator and wait for configured delay before sending next part
        if (AGENT_CONFIG.messageSplitDelay > 0) {
          await message.channel.sendTyping();
          await new Promise(resolve => setTimeout(resolve, AGENT_CONFIG.messageSplitDelay));
        }
        await message.channel.send(parts[i]);
      }
    }
  } catch (error) {
    console.error('Failed to send response:', error);
  }
}

/**
 * Makes a request to the LLM API to generate a response.
 * 
 * @param messages - Array of messages
 * @param tools - Array of available tools
 * @returns Promise that resolves to the API response
 */
async function callLLM(messages: any[], tools: any[]) {
  const response = await axios.post(AGENT_CONFIG.apiEndpoint, {
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

  return response.data;
}

/**
 * Runs the AI agent to process a Discord message and generate a single response.
 * 
 * The agent:
 * 1. Checks if it should auto-trigger (mention/reply) or passes confidence check
 * 2. Formats the last N messages from the channel
 * 3. Sends a single request to the LLM
 * 4. Executes any tool calls and sends the final response
 * 
 * @param client - The Discord.js client instance
 * @param message - The Discord message that triggered the agent
 * @returns Promise that resolves when the agent completes its task
 */
export async function runAgent(client: Client, message: Message) {

  // Check if we should auto-trigger / pass confidence check  
  if (message.mentions.users.has(message.client.user!.id)) {
    console.log('Auto-triggering response (bot mentioned)');
  } else if (!(await shouldRespondToMessage(message))) {
    return;
  }

  // Start typing indicator
  if (message.channel.isTextBased()) {
    await (message.channel as any).sendTyping();
  }

  const tools = getAvailableTools();
  const systemPrompt = AGENT_CONFIG.systemPrompt({ message });

  // Get formatted message history using the shared function
  const messageHistory = await fetchAndFormatMessages(message);

  const messages: any[] = [
    {
      role: 'system',
      content: systemPrompt,
    },
    ...messageHistory
  ];

  const response = await callLLM(messages, tools);
  const choice = response.choices[0];
  const assistantMessage = choice.message;

  // Add the assistant's response to the message history.
  // This is crucial for the model to understand the context of the tool call.
  messages.push(assistantMessage);

  // Handle tool calls if present
  if (assistantMessage.tool_calls && assistantMessage.tool_calls.length > 0) {
    const toolResultMessages = await handleToolCalls(
      assistantMessage.tool_calls,
      client,
      message,
    );

    // Add tool results to the conversation
    messages.push(...toolResultMessages);

    // Make a final call to get the response after tool execution
    const finalResponse = await callLLM(messages, tools);
    const finalChoice = finalResponse.choices[0];
    const finalAssistantMessage = finalChoice.message;

    if (finalAssistantMessage.content) {
      await sendResponse(message, finalAssistantMessage.content);
    }
  } else {
    // No tool calls, send the response directly
    if (assistantMessage.content) {
      await sendResponse(message, assistantMessage.content);
    }
  }
} 
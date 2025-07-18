import axios from 'axios';
import { Client, Message } from 'discord.js';
import { searchGif, gifSearchTool } from '../tools/gif-search.js';
import { AGENT_CONFIG } from './config.js';

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
 * Determines whether the agent should respond to a message.
 * Currently responds to all messages, but this function can be modified
 * later to implement more sophisticated triggering logic.
 * 
 * @param message - The Discord message to evaluate
 * @returns True if the agent should respond, false otherwise
 */
function shouldRespondToMessage(message: Message): boolean {
  // For now, respond to all messages
  // This can be modified later to implement more sophisticated logic
  return true;
}

/**
 * Sends a message to the same channel as the original message.
 * 
 * @param message - The Discord message that triggered the response
 * @param content - The content to send
 * @returns Promise that resolves when the message is sent or fails silently
 */
async function sendMessageToChannel(message: Message, content: string) {
  try {
    if (message.channel.isTextBased()) {
      await (message.channel as any).send(content);
    }
  } catch (error) {
    console.error('Failed to send message:', error);
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
    tools
  }, {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.LLM_API_KEY}`
    }
  });

  return response.data;
}

/**
 * Runs the AI agent to process a Discord message and generate a single response.
 * 
 * The agent:
 * 1. Checks if it should respond to the message
 * 2. Formats the current message content
 * 3. Sends a single request to the LLM
 * 4. Executes any tool calls and sends the final response
 * 
 * @param client - The Discord.js client instance
 * @param message - The Discord message that triggered the agent
 * @returns Promise that resolves when the agent completes its task
 */
export async function runAgent(client: Client, message: Message) {
  // Check if we should respond to this message
  if (!shouldRespondToMessage(message)) {
    return;
  }

  const tools = [gifSearchTool];
  const systemPrompt = AGENT_CONFIG.systemPrompt({ message });

  // Format the current message content
  const formattedContent = `[${message.author.displayName} <@${message.author.id}>]\n${formatMessageContent(message)}`;

  const messages: any[] = [
    {
      role: 'system',
      content: systemPrompt,
    },
    {
      role: 'user',
      content: formattedContent
    }
  ];

  const response = await callLLM(messages, tools);
  const choice = response.choices[0];
  const assistantMessage = choice.message;

  // Handle tool calls if present
  if (assistantMessage.tool_calls && assistantMessage.tool_calls.length > 0) {
    for (const toolCall of assistantMessage.tool_calls) {
      const args = JSON.parse(toolCall.function.arguments);
      let result;

      // Direct the tool call to the correct tool
      if (toolCall.function.name === 'search_gif') {
        result = await searchGif(client, message, args.query);
      }

      console.log(`Executing ${toolCall.function.name}:`, args);
      console.log(`Result:`, result);
      
      // Add the tool result to the conversation
      messages.push({
        role: 'tool',
        tool_call_id: toolCall.id,
        content: JSON.stringify(result)
      });
    }

    // Make a final call to get the response after tool execution
    const finalResponse = await callLLM(messages, tools);
    const finalChoice = finalResponse.choices[0];
    const finalAssistantMessage = finalChoice.message;

    if (finalAssistantMessage.content) {
      await sendMessageToChannel(message, finalAssistantMessage.content);
    }
  } else {
    // No tool calls, send the response directly
    if (assistantMessage.content) {
      await sendMessageToChannel(message, assistantMessage.content);
    }
  }
} 
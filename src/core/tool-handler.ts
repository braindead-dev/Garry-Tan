import { Client, Message } from 'discord.js';
import { searchGif, gifSearchTool } from '../tools/gif-search.js';

export type ToolExecutionFunction = (
  client: Client,
  message: Message,
  args: any,
) => Promise<any>;

export interface Tool {
  definition: any;
  execute: ToolExecutionFunction;
}

// A registry of all available tools
const toolRegistry: Record<string, Tool> = {
  search_gif: {
    definition: gifSearchTool.function,
    execute: (client, message, args) => searchGif(client, message, args.query),
  },
};

/**
 * Gets the definitions of all available tools for the LLM.
 * @returns An array of tool definitions.
 */
export function getAvailableTools(): any[] {
  return Object.values(toolRegistry).map(tool => ({
    type: 'function',
    function: tool.definition,
  }));
}

// Type for a tool call from the LLM response
interface ToolCall {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string;
  };
}

/**
 * Processes tool calls from an LLM, executes them, and returns the results.
 *
 * @param toolCalls - An array of tool calls from the LLM.
 * @param client - The Discord.js client instance.
 * @param message - The Discord message that triggered the agent.
 * @returns A promise that resolves to an array of tool result messages.
 */
export async function handleToolCalls(
  toolCalls: ToolCall[],
  client: Client,
  message: Message,
): Promise<any[]> {
  const toolResultMessages: any[] = [];

  for (const toolCall of toolCalls) {
    const toolName = toolCall.function.name;
    const tool = toolRegistry[toolName];

    if (tool) {
      try {
        const args = JSON.parse(toolCall.function.arguments);
        console.log(`Executing tool "${toolName}" with args:`, args);

        const result = await tool.execute(client, message, args);
        console.log(`Tool "${toolName}" result:`, result);

        toolResultMessages.push({
          role: 'tool',
          tool_call_id: toolCall.id,
          content: JSON.stringify(result),
        });
      } catch (error: any) {
        console.error(`Error executing tool "${toolName}":`, error);
        toolResultMessages.push({
          role: 'tool',
          tool_call_id: toolCall.id,
          content: JSON.stringify({
            error: `Failed to execute tool: ${error.message}`,
          }),
        });
      }
    } else {
      console.error(`Unknown tool called: "${toolName}"`);
      toolResultMessages.push({
        role: 'tool',
        tool_call_id: toolCall.id,
        content: JSON.stringify({ error: `Tool "${toolName}" not found.` }),
      });
    }
  }

  return toolResultMessages;
} 
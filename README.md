# Garry Tan Discord Bot

Garry Tan (CEO of Y Combinator)'s soul entrapped as a Discord bot. Intelligently engages in conversation when he wants to, without needing to be mentioned. Just like the real thing.

## 📋 Prerequisites

- Node.js (v18 or higher)
- Discord Bot Token
- API Key to some LLM completions API (OpenAI, Groq, etc.)

## 🛠️ Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd Garry-Tan
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   Create a `.env` file in the root directory:
   ```env
   DISCORD_TOKEN=your_discord_bot_token_here
   LLM_API_KEY=your_llm_api_key_here
   
   # Optional: Override default API endpoints and models
   LLM_API_ENDPOINT=https://api.groq.com/openai/v1/chat/completions
   LLM_MODEL=gemma2-9b-it
   CONFIDENCE_API_ENDPOINT=https://api.openai.com/v1/chat/completions
   CONFIDENCE_API_KEY=your_openai_api_key_here
   CONFIDENCE_MODEL=gpt-4o-mini
   ```

4. **Build the project**
   ```bash
   npm run build
   ```

5. **Start the bot**
   ```bash
   npm start
   ```

## 🔧 Configuration

### Personality Settings

Edit `src/core/config.ts` to customize the bot's personality:

```typescript
const PERSONALITY = {
  name: 'Garry Tan',
  description: 'Canadian-American venture capitalist, executive, CEO of Y Combinator...',
  communicationStyle: 'Concise, thoughtful, pragmatic, approachable and friendly. Uses decent grammar and capitalization in his messages.'
};
```

### Response Confidence

The bot uses a confidence scoring system (0-1) to determine when to respond. Adjust the threshold in `AGENT_CONFIG.confidenceCheck.threshold` (default: 0.7).

### Message History

Configure how many previous messages the bot considers:
```typescript
messageHistoryLimit: 10  // Used for response generation
```

The confidence check system has its own separate message history limit:
```typescript
confidenceCheck: {
  messageHistoryLimit: 5,  // Separate limit for confidence evaluation
  // ... other config
}
```

This allows the confidence check to consider fewer messages (for faster evaluation) while the response generation can use more context.

## 🤖 How It Works

### Architecture Overview

(using some models that worked for me)
```
Discord Message → Confidence Check → Message Processing → Response Generation
                       ↓                    ↓                    ↓
                   AI Analysis        Format History        LLM + Tools
                  (gpt-4o-mini)       (Last 10 msgs)       (gemma2-9b-it)
```

### Message Processing Flow

1. **Message Reception**: Bot receives all messages but filters out its own
2. **Auto-trigger Check**: If bot is mentioned or replied to, skip confidence check and respond
3. **Confidence Analysis**: AI determines if response is appropriate (0-1 score) and checks if it passes the 0.7 threshold
4. **Context Gathering**: Fetches and formats last 10 messages from channel
5. **Initial Response Generation**: Uses personality config and context to generate response or tool calls
6. **Tool Execution**: If tools are requested, executes them and incorporates results
7. **Final Response**: Generates final response incorporating tool results
8. **Message Delivery**: Sends response, potentially split across multiple messages

## 🛠️ Tool System

The bot features a modular tool system that allows it to perform actions beyond just text responses.

### Available Tools

#### GIF Search (`search_gif`)
- **Purpose**: Search for and send animated GIFs
- **Usage**: Bot automatically decides when a GIF would enhance the conversation
- **Example**: 
  ```
  User: "Just closed our Series A!"
  Garry Tan: "Congratulations! 🎉" [sends celebration GIF]
  ```

### Tool Architecture

The tool system is built with modularity in mind:

```typescript
// Tool Registry (src/core/tool-handler.ts)
const toolRegistry: Record<string, Tool> = {
  search_gif: {
    definition: gifSearchTool.function,  // OpenAI function schema
    execute: (client, message, args) => searchGif(client, message, args.query),
  },
  // Add more tools here...
};
```

### Adding New Tools

1. **Create the tool implementation** in `src/tools/your-tool.js`:
   ```typescript
   export const yourToolDefinition = {
     name: 'your_tool',
     description: 'What your tool does',
     parameters: {
       // OpenAI function schema
     }
   };
   
   export async function executeYourTool(client, message, args) {
     // Tool implementation
     return result;
   }
   ```

2. **Register the tool** in `src/core/tool-handler.ts`:
   ```typescript
   import { executeYourTool, yourToolDefinition } from '../tools/your-tool.js';
   
   const toolRegistry: Record<string, Tool> = {
     // ... existing tools
     your_tool: {
       definition: yourToolDefinition,
       execute: executeYourTool,
     },
   };
   ```

### Tool Execution Flow

1. **LLM Decision**: The model decides whether to use tools based on conversation context
2. **Tool Call**: Model returns structured tool calls with parameters
3. **Execution**: `handleToolCalls` function executes each tool with error handling
4. **Result Integration**: Tool results are added to conversation context
5. **Final Response**: Model generates final response incorporating tool results

### Error Handling

The tool system includes robust error handling:
- **Parse Errors**: Invalid JSON arguments are caught and reported
- **Execution Errors**: Tool failures are gracefully handled with error messages
- **Unknown Tools**: Calls to non-existent tools are handled safely
- **Conversation Continuity**: Errors don't break the conversation flow

## 💬 Conversation Examples

### Intelligent Mention Handling

The bot properly handles Discord mentions:
- `<@123456789>` → `[Username <@123456789>]`
- Bot mentions → `[<@me>]`
- Role mentions → `[RoleName <@&123456789>]`
- Channel mentions → `[#channel-name <#123456789>]`

### Direct Mentions (Auto-trigger)
```
User: "Hey @Garry Tan, thoughts on this startup idea?"
Garry Tan: "I'd love to hear more about the problem you're solving..."
```

### Replies (Auto-trigger)
```
User: "Is anyone in this channel knowledgeable about raising?"
Garry Tan: "What stage are you at?"
User: "We're pre-seed, just built our MVP"
Garry Tan: "That's exciting! How's user feedback been so far?"
```

### Tool Usage
```
User: "We just got accepted into YC!"
Garry Tan: "Incredible news! Welcome to the family! 🚀" [sends YC celebration GIF]
```

## 🔧 Development

### Project Structure

```
src/
├── core/
│   ├── agent.ts          # Main agent logic and conversation flow
│   ├── config.ts         # Configuration and personality settings
│   └── tool-handler.ts   # Centralized tool management system
├── tools/
│   └── gif-search.ts     # GIF search tool implementation
└── index.ts              # Discord bot initialization
```

### Key Design Principles

- **Modularity**: Tools are self-contained and easy to add/remove
- **Error Resilience**: Robust error handling prevents conversation breakage
- **Context Awareness**: Proper conversation history management for tool calls
- **Separation of Concerns**: Agent logic, tool execution, and configuration are separate

#### Contributions always open!! Create a PR

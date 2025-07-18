# Gary Tan Discord Bot

A sophisticated Discord bot that embodies Gary Tan, the Canadian-American venture capitalist and CEO of Y Combinator. This bot intelligently participates in group conversations, providing startup advice and engaging discussions about entrepreneurship, venture capital, and the startup ecosystem.

## 🚀 Features

### Smart Conversation Intelligence
- **Confidence-based Response System**: Uses AI to determine when to participate in group conversations
- **Context-aware Messaging**: Understands group dynamics and only responds when appropriate
- **Message History Analysis**: Considers conversation context from the last 10 messages
- **Personality-driven Responses**: Maintains consistent character as Gary Tan

### AI-Powered Capabilities
- **Advanced LLM Integration**: Uses OpenAI's GPT models for natural conversation
- **Dual-model Architecture**: Separate models for confidence checking and response generation
- **Tool Integration**: Extensible system for adding new capabilities
- **GIF Search**: Built-in tool for searching and sharing relevant GIFs

### Configurable Personality
- **Customizable Communication Style**: Adjustable speaking patterns and tone
- **Interest-based Responses**: Focuses on Y Combinator, startups, and venture capital
- **Authentic Character**: Maintains Gary Tan's voice and expertise areas

## 📋 Prerequisites

- Node.js (v18 or higher)
- Discord Bot Token
- OpenAI API Key
- A Discord server where you have permission to add bots

## 🛠️ Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd Gary-Tan
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   Create a `.env` file in the root directory:
   ```env
   DISCORD_TOKEN=your_discord_bot_token_here
   LLM_API_KEY=your_openai_api_key_here
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
  interests: ['Y Combinator', 'startups', 'venture capital', ...],
  communicationStyle: 'concise, thoughtful, and pragmatic - very approachable and friendly'
};
```

### Response Confidence

The bot uses a confidence scoring system (0-1) to determine when to respond:

- **High Confidence (0.7-1.0)**: Direct questions, mentions, or highly relevant topics
- **Medium Confidence (0.4-0.6)**: Related topics but not urgent
- **Low Confidence (0.0-0.3)**: Unrelated conversations or concluded discussions

Adjust the threshold in `AGENT_CONFIG.confidenceCheck.threshold` (default: 0.7).

### Message History

Configure how many previous messages the bot considers:
```typescript
messageHistoryLimit: 10  // Adjustable in AGENT_CONFIG
```

## 🤖 How It Works

### Architecture Overview

```
Discord Message → Confidence Check → Message Processing → Response Generation
                       ↓                    ↓                    ↓
                   AI Analysis      Format History      LLM + Tools
                   (gpt-4o)         (Last 10 msgs)     (gpt-4.1)
```

### Message Processing Flow

1. **Message Reception**: Bot receives all messages but filters out its own
2. **Confidence Analysis**: AI determines if response is appropriate (0-1 score)
3. **Context Gathering**: Fetches and formats last 10 messages from channel
4. **Response Generation**: Uses personality config and context to generate response
5. **Tool Execution**: Processes any tool calls (e.g., GIF search)
6. **Message Delivery**: Sends final response to Discord channel

### Intelligent Mention Handling

The bot properly handles Discord mentions:
- `<@123456789>` → `[Username <@123456789>]`
- Bot mentions → `[<@me>]`
- Role mentions → `[RoleName <@&123456789>]`
- Channel mentions → `[#channel-name <#123456789>]`

## 🔨 Development

### Project Structure

```
src/
├── core/
│   ├── agent.ts      # Main bot logic and message processing
│   └── config.ts     # Configuration and personality settings
├── tools/
│   └── gif-search.ts # GIF search tool implementation
└── index.ts          # Bot initialization and Discord client setup
```

### Key Functions

- **`runAgent()`**: Main orchestration function
- **`shouldRespondToMessage()`**: Confidence-based response filtering
- **`fetchAndFormatMessages()`**: Message history preparation
- **`formatMessageContent()`**: Discord mention processing

### Adding New Tools

1. Create a new tool file in `src/tools/`
2. Export a tool definition object with OpenAI function calling format
3. Export an implementation function
4. Add to the tools array in `agent.ts`

Example tool structure:
```typescript
export const myTool = {
  type: 'function' as const,
  function: {
    name: 'my_tool',
    description: 'Description of what this tool does',
    parameters: { /* JSON schema */ }
  }
};

export async function myToolFunction(client: Client, message: Message, args: any) {
  // Implementation
}
```

## 📊 Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `DISCORD_TOKEN` | ✅ | - | Discord bot token |
| `LLM_API_KEY` | ✅ | - | OpenAI API key |
| `LLM_API_ENDPOINT` | ❌ | OpenAI endpoint | Main LLM API endpoint |
| `LLM_MODEL` | ❌ | gpt-4.1 | Model for responses |
| `CONFIDENCE_API_ENDPOINT` | ❌ | OpenAI endpoint | Confidence check API endpoint |
| `CONFIDENCE_MODEL` | ❌ | gpt-4o | Model for confidence scoring |

## 🎯 Usage Examples

### Natural Conversation
```
User: "What's the best way to approach VCs for Series A?"
Bot: "Focus on demonstrating real traction first..."
```

### Group Dynamics
```
User A: "Anyone know about Y Combinator's latest batch?"
User B: "I heard they're focusing more on AI startups"
Bot: "Actually, this batch has incredible diversity..."
```

### Direct Mentions
```
User: "Hey @Gary-Tan, thoughts on this startup idea?"
Bot: "I'd love to hear more about the problem you're solving..."
```

## 🚨 Important Notes

- **Group Channel Awareness**: The bot understands it's in group conversations and won't respond to every message
- **No Self-Response**: Automatically filters out its own messages to prevent loops
- **Error Handling**: Gracefully handles API failures and network issues
- **Rate Limiting**: Respects Discord's rate limits with proper error handling

## 📝 Logs and Debugging

The bot provides detailed console output:
- Confidence scores for each message evaluation
- Tool execution details
- Error messages with stack traces
- Connection status updates

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

For issues or questions:
1. Check the console logs for error messages
2. Verify your environment variables are set correctly
3. Ensure your Discord bot has the necessary permissions
4. Test your OpenAI API key with a simple request

## 🔮 Future Enhancements

- [ ] Web dashboard for configuration
- [ ] Additional personality profiles
- [ ] Enhanced tool ecosystem
- [ ] Conversation analytics
- [ ] Multi-server support with different configs
- [ ] Voice channel integration
- [ ] Scheduled messaging capabilities 
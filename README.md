# Garry Tan Discord Bot

A sophisticated Discord bot that embodies Garry Tan, the Canadian-American venture capitalist and CEO of Y Combinator. This bot intelligently participates in group conversations, providing startup advice and engaging discussions about entrepreneurship, venture capital, and the startup ecosystem.

## 🚀 Features

### Smart Conversation Intelligence
- **Confidence-based Response System**: Uses AI to determine when to participate in group conversations
- **Auto-trigger on Mentions/Replies**: Automatically responds when mentioned or replied to, bypassing confidence check
- **Context-aware Messaging**: Understands group dynamics and only responds when appropriate
- **Message History Analysis**: Considers conversation context from the last 10 messages
- **Personality-driven Responses**: Maintains consistent character as Garry Tan

### AI-Powered Capabilities
- **Advanced LLM Integration**: Uses OpenAI's GPT models for natural conversation
- **Dual-model Architecture**: Separate models for confidence checking and response generation
- **Tool Integration**: Extensible system for adding new capabilities
- **GIF Search**: Built-in tool for searching and sharing relevant GIFs

### Configurable Personality
- **Customizable Communication Style**: Adjustable speaking patterns and tone
- **Interest-based Responses**: Focuses on Y Combinator, startups, and venture capital
- **Authentic Character**: Maintains Garry Tan's voice and expertise areas

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
messageHistoryLimit: 10  // Adjustable in AGENT_CONFIG - used for response generation
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

```
Discord Message → Confidence Check → Message Processing → Response Generation
                       ↓                    ↓                    ↓
                   AI Analysis      Format History      LLM + Tools
                   (gpt-4o)         (Last 10 msgs)     (gpt-4.1)
```

### Message Processing Flow

1. **Message Reception**: Bot receives all messages but filters out its own
2. **Auto-trigger Check**: If bot is mentioned or replied to, skip confidence check and respond
3. **Confidence Analysis**: AI determines if response is appropriate (0-1 score)
4. **Context Gathering**: Fetches and formats last 10 messages from channel
5. **Response Generation**: Uses personality config and context to generate response
6. **Tool Execution**: Processes any tool calls (e.g., GIF search)
7. **Message Delivery**: Replies to the triggering message

### Intelligent Mention Handling

The bot properly handles Discord mentions:
- `<@123456789>` → `[Username <@123456789>]`
- Bot mentions → `[<@me>]`
- Role mentions → `[RoleName <@&123456789>]`
- Channel mentions → `[#channel-name <#123456789>]`

### Direct Mentions (Auto-trigger)
```
User: "Hey @Garry Tan, thoughts on this startup idea?"
Bot: "I'd love to hear more about the problem you're solving..."
```

### Replies (Auto-trigger)
```
Garry Tan: "What stage are you at?"
User: "We're pre-seed, just built our MVP"
Garry Tan: "That's exciting! How's user feedback been so far?"
```

```
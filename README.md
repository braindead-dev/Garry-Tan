# Garry Tan Discord Bot

Garry Tan (CEO of Y Combinator)'s soul entrapped as a Discord bot. Intelligently engages in conversation when he wants to, without needing to be mentioned. Just like the real thing.

## 📋 Prerequisites

- Node.js (v18 or higher)
- Discord Bot Token
- API Key to some LLM completions api

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

The bot uses a confidence scoring system (0-1) to determine when to respond. Adjust the threshold in `AGENT_CONFIG.confidenceCheck.threshold` (default: 0.7).

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
User: "Is anyone in this channel knowledgable on raising?"
Garry Tan: "What stage are you at?"
User: "We're pre-seed, just built our MVP"
Garry Tan: "That's exciting! How's user feedback been so far?"
```

#### Contributions always open!! Create a PR

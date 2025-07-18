import 'dotenv/config';
import { Client, GatewayIntentBits, Partials } from 'discord.js';
import { runAgent } from './core/agent.js';

/**
 * Validates that required environment variables are present.
 * Throws an error if any required variables are missing.
 */
if (!process.env.DISCORD_TOKEN || !process.env.LLM_API_KEY) {
  throw new Error('Missing DISCORD_TOKEN or LLM_API_KEY in .env file');
}

/**
 * Discord client configuration with necessary intents and partials.
 * 
 * Intents enable the bot to receive specific types of events:
 * - Guilds: Access to guild information
 * - GuildMessages: Read messages in guilds
 * - MessageContent: Access to message content
 * - GuildMembers: Access to member information
 * 
 * Partials allow the bot to work with partial data structures.
 */
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
  ],
  partials: [Partials.Message, Partials.Channel],
});

/**
 * Event handler for when the bot successfully connects to Discord.
 * Logs the bot's tag to confirm successful login.
 */
client.once('ready', () => {
  console.log(`Logged in as ${client.user?.tag}!`);
});

/**
 * Event handler for new messages in Discord channels.
 * 
 * This handler:
 * 1. Filters out messages from this bot to prevent self-responses
 * 2. Shows typing indicator while processing
 * 3. Delegates to the AI agent for processing (agent handles its own filtering)
 * 4. Handles any errors that occur during processing
 * 
 * @param message - The Discord message that was created
 */
client.on('messageCreate', async (message) => {
  // Only filter out messages from this bot to prevent self-responses
  if (message.author.id === client.user!.id) {
    return;
  }

  try {
    await message.channel.sendTyping();
    await runAgent(client, message);
  } catch (error) {
    console.error('An error occurred in the agent:', error);
    await message.reply('I ran into an unexpected error. Please try again.');
  }
});

/**
 * Initiates the bot's connection to Discord using the token from environment variables.
 */
client.login(process.env.DISCORD_TOKEN); 
import 'dotenv/config';
import { Client, GatewayIntentBits, Partials } from 'discord.js';
import { runAgent } from './core/agent.js';
import { AGENT_CONFIG } from './core/config.js';
import { getServiceConfig } from './core/services.js';
import { registerCommands, handleCommand } from './commands/index.js';

/**
 * Validates that required environment variables are present.
 * Throws an error if any required variables are missing.
 */
if (!process.env.DISCORD_TOKEN) {
  throw new Error('Missing DISCORD_TOKEN in .env file');
}

/**
 * Validate that API keys for configured services are present.
 * Throws an error if any required API keys are missing.
 */
try {
  // Check main service API key
  getServiceConfig(AGENT_CONFIG.service);
  
  // Check confidence service API key (only if different from main service)
  if (AGENT_CONFIG.confidenceCheck.service !== AGENT_CONFIG.service) {
    getServiceConfig(AGENT_CONFIG.confidenceCheck.service);
  }
} catch (error) {
  throw new Error(`Service configuration error: ${error instanceof Error ? error.message : error}`);
}

/**
 * Sleep state tracking - when true, bot ignores all messages except mentions
 */
let isAsleep = false;

/**
 * Helper function to update sleep state (for commands)
 */
const setIsAsleep = (value: boolean) => {
  isAsleep = value;
};

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
 * Logs the bot's tag to confirm successful login and registers commands.
 */
client.once('ready', async () => {
  console.log(`Logged in as ${client.user?.tag}!`);
  await registerCommands(client);
});

/**
 * Event handler for slash command interactions.
 */
client.on('interactionCreate', async (interaction) => {
  await handleCommand(interaction, isAsleep, setIsAsleep);
});

/**
 * Event handler for new messages in Discord channels.
 * 
 * This handler:
 * 1. Filters out messages from this bot to prevent self-responses
 * 2. Checks if bot is asleep and handles accordingly
 * 3. Shows typing indicator while processing
 * 4. Delegates to the AI agent for processing (agent handles its own filtering)
 * 5. Handles any errors that occur during processing
 * 
 * @param message - The Discord message that was created
 */
client.on('messageCreate', async (message) => {
  // Only filter out messages from this bot to prevent self-responses
  if (message.author.id === client.user!.id) {
    return;
  }

  // Handle sleep state
  if (isAsleep) {
    // If mentioned while asleep, reply with grumpy message
    if (message.mentions.users.has(client.user!.id)) {
      await message.reply('Gary so sleepy.. go away >_<');
    }
    // Otherwise ignore all messages while asleep
    return;
  }

  try {
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
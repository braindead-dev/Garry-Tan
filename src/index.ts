import 'dotenv/config';
import { Client, GatewayIntentBits, Partials, REST, Routes, SlashCommandBuilder } from 'discord.js';
import { runAgent } from './core/agent.js';

/**
 * Validates that required environment variables are present.
 * Throws an error if any required variables are missing.
 */
if (!process.env.DISCORD_TOKEN) {
  throw new Error('Missing DISCORD_TOKEN in .env file');
}

/**
 * Sleep state tracking - when true, bot ignores all messages except mentions
 */
let isAsleep = false;

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
 * Register slash commands with Discord.
 */
async function registerCommands() {
  const commands = [
    new SlashCommandBuilder()
      .setName('sleep')
      .setDescription('Put Gary to sleep'),
    new SlashCommandBuilder()
      .setName('wake')
      .setDescription('Wake Gary up'),
  ];

  const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN!);

  try {
    console.log('Started refreshing application (/) commands.');

    await rest.put(
      Routes.applicationCommands(client.user!.id),
      { body: commands.map(command => command.toJSON()) },
    );

    console.log('Successfully reloaded application (/) commands.');
  } catch (error) {
    console.error('Error registering commands:', error);
  }
}

/**
 * Event handler for when the bot successfully connects to Discord.
 * Logs the bot's tag to confirm successful login and registers commands.
 */
client.once('ready', async () => {
  console.log(`Logged in as ${client.user?.tag}!`);
  await registerCommands();
});

/**
 * Event handler for slash command interactions.
 */
client.on('interactionCreate', async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  const { commandName } = interaction;

  if (commandName === 'sleep') {
    isAsleep = true;
    await interaction.reply('Gary go sleep now...');
  } else if (commandName === 'wake') {
    isAsleep = false;
    await interaction.reply('☀️ Gary awake!');
  }
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
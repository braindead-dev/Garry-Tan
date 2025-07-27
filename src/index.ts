import 'dotenv/config';
import { Client, Events, GatewayIntentBits, Partials } from 'discord.js';
import { runAgent } from './core/agent.js';
import { AGENT_CONFIG } from './core/config.js';
import { getServiceConfig } from './core/services.js';
import { registerCommands, handleCommand } from './commands/index.js';
import { setupDatabase } from './core/memory/storage/supabase.js';
import { reflectOnMemories } from './core/memory/semantic.js';
import { BABY_MEMORY_CONFIG } from './core/memory/types.js';
import cron from 'node-cron';

async function main() {
  // Validate that required environment variables are present.
  if (!process.env.DISCORD_TOKEN) {
    throw new Error('Missing DISCORD_TOKEN in .env file');
  }

  // Validate that API keys for configured services are present.
  try {
    getServiceConfig(AGENT_CONFIG.service);
    if (AGENT_CONFIG.confidenceCheck.service !== AGENT_CONFIG.service) {
      getServiceConfig(AGENT_CONFIG.confidenceCheck.service);
    }
  } catch (error) {
    throw new Error(`Service configuration error: ${error instanceof Error ? error.message : error}`);
  }

  // Set up the database before doing anything else
  await setupDatabase();
  console.log('Database connection established and schema verified.');

  // Schedule the nightly reflection job
  // This will run every day at 3:00 AM server time
  cron.schedule('0 3 * * *', () => {
    reflectOnMemories(BABY_MEMORY_CONFIG).catch(err => {
        console.error("Error during scheduled reflection job:", err);
    });
  });
  console.log('Nightly reflection job scheduled for 3:00 AM.');

  // Sleep state tracking
  let isAsleep = false;
  const setIsAsleep = (value: boolean) => {
    isAsleep = value;
  };

  const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.MessageContent,
      GatewayIntentBits.GuildMembers,
    ],
    partials: [Partials.Message, Partials.Channel],
  });

  client.once(Events.ClientReady, async readyClient => {
    console.log(`Logged in as ${readyClient.user.tag}!`);
    await registerCommands(readyClient);
  });

  client.on(Events.InteractionCreate, async interaction => {
    await handleCommand(interaction, isAsleep, setIsAsleep);
  });

  client.on(Events.MessageCreate, async message => {
    if (message.author.id === client.user!.id) {
      return;
    }

    if (isAsleep) {
      if (message.mentions.users.has(client.user!.id)) {
        await message.reply(`${AGENT_CONFIG.personality.name.split(' ')[0]} so sleepy.. go away >_<`);
      }
      return;
    }

    try {
      await runAgent(client, message);
    } catch (error) {
      console.error('An error occurred in the agent:', error);
      await message.reply('I ran into an unexpected error. Please try again.');
    }
  });

  // Login to Discord
  await client.login(process.env.DISCORD_TOKEN);
}

main().catch(error => {
  console.error('An error occurred during bot initialization:', error);
  process.exit(1);
}); 
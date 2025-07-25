import { REST, Routes, Client } from 'discord.js';
import { sleepCommand } from './utility/sleep.js';
import { wakeCommand } from './utility/wake.js';

/**
 * Collection of all slash commands
 */
export const commands = [
  sleepCommand,
  wakeCommand,
];

/**
 * Register all slash commands with Discord
 */
export async function registerCommands(client: Client) {
  const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN!);

  try {
    console.log('Started refreshing application (/) commands.');

    await rest.put(
      Routes.applicationCommands(client.user!.id),
      { body: commands.map(command => command.data.toJSON()) },
    );

    console.log('Successfully reloaded application (/) commands.');
  } catch (error) {
    console.error('Error registering commands:', error);
  }
}

/**
 * Handle slash command interactions
 */
export async function handleCommand(interaction: any, isAsleep: boolean, setIsAsleep: (value: boolean) => void) {
  if (!interaction.isChatInputCommand()) return false;

  const command = commands.find(cmd => cmd.data.name === interaction.commandName);
  
  if (!command) return false;

  try {
    await command.execute(interaction, { isAsleep, setIsAsleep });
    return true;
  } catch (error) {
    console.error('Error executing command:', error);
    await interaction.reply({ content: 'There was an error executing this command!', ephemeral: true });
    return true;
  }
} 
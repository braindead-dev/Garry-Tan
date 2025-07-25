import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';

export const wakeCommand = {
  data: new SlashCommandBuilder()
    .setName('wake')
    .setDescription('Wake Gary up'),
  
  async execute(interaction: ChatInputCommandInteraction, context: { isAsleep: boolean, setIsAsleep: (value: boolean) => void }) {
    context.setIsAsleep(false);
    await interaction.reply('☀️ Gary awake!');
  },
}; 
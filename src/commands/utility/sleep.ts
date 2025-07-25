import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';

export const sleepCommand = {
  data: new SlashCommandBuilder()
    .setName('sleep')
    .setDescription('Put Gary to sleep'),
  
  async execute(interaction: ChatInputCommandInteraction, context: { isAsleep: boolean, setIsAsleep: (value: boolean) => void }) {
    context.setIsAsleep(true);
    await interaction.reply('Gary go sleep now...');
  },
}; 
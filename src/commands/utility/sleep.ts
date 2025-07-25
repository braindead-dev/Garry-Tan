import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import { AGENT_CONFIG } from '../../core/config.js';

export const sleepCommand = {
  data: new SlashCommandBuilder()
    .setName('sleep')
    .setDescription(`Put ${AGENT_CONFIG.personality.name.split(' ')[0]} to sleep`),
  
  async execute(interaction: ChatInputCommandInteraction, context: { isAsleep: boolean, setIsAsleep: (value: boolean) => void }) {
    context.setIsAsleep(true);
    await interaction.reply(`${AGENT_CONFIG.personality.name.split(' ')[0]} go sleep now...`);
  },
}; 
import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import { AGENT_CONFIG } from '../../core/config.js';

export const wakeCommand = {
  data: new SlashCommandBuilder()
    .setName('wake')
    .setDescription(`Wake ${AGENT_CONFIG.personality.name.split(' ')[0]} up`),
  
  async execute(interaction: ChatInputCommandInteraction, context: { isAsleep: boolean, setIsAsleep: (value: boolean) => void }) {
    context.setIsAsleep(false);
    await interaction.reply(`☀️ ${AGENT_CONFIG.personality.name.split(' ')[0]} awake!`);
  },
}; 
import { SlashCommandBuilder, EmbedBuilder, ChatInputCommandInteraction } from 'discord.js';
import { getPersona } from '../../core/memory/storage/supabase.js';

export const statusCommand = {
  data: new SlashCommandBuilder()
    .setName('status')
    .setDescription("Displays the agent's current personality and status."),
  
  // The second `context` argument is ignored, but included for compatibility with the command handler
  async execute(interaction: ChatInputCommandInteraction, context: any) {
    try {
      await interaction.deferReply({ ephemeral: true });

      const persona = await getPersona();

      const statusEmbed = new EmbedBuilder()
        .setColor(0x0099FF)
        .setTitle('Agent Status')
        .addFields(
          { name: '📝 Current Description', value: persona.description || 'Not yet defined.' },
          { name: '🗣️ Current Communication Style', value: persona.communication_style || 'Not yet defined.' }
        )
        .setTimestamp();

      await interaction.editReply({ embeds: [statusEmbed] });

    } catch (error) {
      console.error('Error fetching agent status:', error);
      // Ensure a reply is always sent, even on error
      if (interaction.deferred || interaction.replied) {
        await interaction.editReply('There was an error trying to fetch the agent status.');
      } else {
        await interaction.reply({ content: 'There was an error trying to fetch the agent status.', ephemeral: true });
      }
    }
  },
}; 
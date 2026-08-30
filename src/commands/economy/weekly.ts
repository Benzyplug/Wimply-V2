import { ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js';
import type { Command } from '../../types/command.js';
import { createSuccessEmbed } from '../../utils/embeds.js';
import { claimWeekly } from '../../services/economyService.js';

const command: Command = {
  data: new SlashCommandBuilder().setName('weekly').setDescription('Claim your weekly reward'),
  async execute(interaction: ChatInputCommandInteraction) {
    if (!interaction.guildId) {
      await interaction.reply({ content: 'This command must be used in a guild.', ephemeral: true });
      return;
    }

    await interaction.deferReply();

    const result = await claimWeekly(interaction.user.id, interaction.guildId);
    await interaction.editReply({ embeds: [createSuccessEmbed('Weekly Claimed', result.message)] });
  }
};

export default command;

import { ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js';
import type { Command } from '../../types/command.js';
import { createSuccessEmbed } from '../../utils/embeds.js';
import { claimMonthly } from '../../services/economyService.js';

const command: Command = {
  data: new SlashCommandBuilder().setName('monthly').setDescription('Claim your monthly reward'),
  async execute(interaction: ChatInputCommandInteraction) {
    if (!interaction.guildId) {
      await interaction.reply({ content: 'This command must be used in a guild.', ephemeral: true });
      return;
    }

    await interaction.deferReply();

    const result = await claimMonthly(interaction.user.id, interaction.guildId);
    await interaction.editReply({ embeds: [createSuccessEmbed('Monthly Claimed', result.message)] });
  }
};

export default command;

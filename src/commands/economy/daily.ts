import { ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js';
import type { Command } from '../../types/command.js';
import { createSuccessEmbed } from '../../utils/embeds.js';
import { claimDaily } from '../../services/economyService.js';

const command: Command = {
  data: new SlashCommandBuilder().setName('daily').setDescription('Claim your daily reward'),
  async execute(interaction: ChatInputCommandInteraction) {
    if (!interaction.guildId) {
      await interaction.reply({ content: 'This command must be used in a guild.', ephemeral: true });
      return;
    }

    await interaction.deferReply();

    const result = await claimDaily(interaction.user.id, interaction.guildId);
    await interaction.editReply({ embeds: [createSuccessEmbed('Daily Claimed', result.message)] });
  }
};

export default command;

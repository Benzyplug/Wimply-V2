import { ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js';
import type { Command } from '../../types/command.js';
import { createSuccessEmbed } from '../../utils/embeds.js';
import { work } from '../../services/economyService.js';

const command: Command = {
  data: new SlashCommandBuilder().setName('work').setDescription('Work for money'),
  async execute(interaction: ChatInputCommandInteraction) {
    if (!interaction.guildId) {
      await interaction.reply({ content: 'This command must be used in a guild.', ephemeral: true });
      return;
    }

    await interaction.deferReply();

    const result = await work(interaction.user.id, interaction.guildId);
    await interaction.editReply({ embeds: [createSuccessEmbed('Work Reward', result.message)] });
  }
};

export default command;

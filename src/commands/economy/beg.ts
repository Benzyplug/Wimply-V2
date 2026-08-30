import { ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js';
import type { Command } from '../../types/command.js';
import { createSuccessEmbed } from '../../utils/embeds.js';
import { beg } from '../../services/economyService.js';

const command: Command = {
  data: new SlashCommandBuilder().setName('beg').setDescription('Beg for a small amount of coins'),
  async execute(interaction: ChatInputCommandInteraction) {
    if (!interaction.guildId) {
      await interaction.reply({ content: 'This command must be used in a guild.', ephemeral: true });
      return;
    }

    await interaction.deferReply();

    const result = await beg(interaction.user.id, interaction.guildId);
    await interaction.editReply({ embeds: [createSuccessEmbed('Beg Result', result.message)] });
  }
};

export default command;

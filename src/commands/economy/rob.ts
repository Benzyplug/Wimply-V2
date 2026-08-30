import { ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js';
import type { Command } from '../../types/command.js';
import { createSuccessEmbed } from '../../utils/embeds.js';
import { robUser } from '../../services/economyService.js';

const command: Command = {
  data: new SlashCommandBuilder()
    .setName('rob')
    .setDescription('Rob another user for a chance to steal coins')
    .addUserOption((option) =>
      option.setName('user').setDescription('User to rob').setRequired(true)
    ),
  async execute(interaction: ChatInputCommandInteraction) {
    if (!interaction.guildId) {
      await interaction.reply({ content: 'This command must be used in a guild.', ephemeral: true });
      return;
    }

    await interaction.deferReply();

    const target = interaction.options.getUser('user', true);
    const result = await robUser(interaction.user.id, interaction.guildId, target.id);
    await interaction.editReply({ embeds: [createSuccessEmbed('Robbery Result', result.message)] });
  }
};

export default command;

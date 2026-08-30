import { ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js';
import type { Command } from '../../types/command.js';
import { createSuccessEmbed } from '../../utils/embeds.js';
import { transfer } from '../../services/economyService.js';

const command: Command = {
  data: new SlashCommandBuilder()
    .setName('pay')
    .setDescription('Pay another user')
    .addUserOption((option) =>
      option.setName('user').setDescription('User to pay').setRequired(true)
    )
    .addStringOption((option) =>
      option.setName('amount').setDescription('Amount to pay').setRequired(true)
    ),
  async execute(interaction: ChatInputCommandInteraction) {
    if (!interaction.guildId) {
      await interaction.reply({ content: 'This command must be used in a guild.', ephemeral: true });
      return;
    }

    await interaction.deferReply();

    const target = interaction.options.getUser('user', true);
    const amount = interaction.options.getString('amount', true);
    const result = await transfer(interaction.user.id, interaction.guildId, target.id, amount);

    await interaction.editReply({ embeds: [createSuccessEmbed('Payment Complete', result.message)] });
  }
};

export default command;

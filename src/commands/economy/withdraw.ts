import { ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js';
import type { Command } from '../../types/command.js';
import { createSuccessEmbed } from '../../utils/embeds.js';
import { withdrawFromBank, getOrCreateUser } from '../../services/userService.js';
import { parsePositiveAmount, formatCurrency } from '../../utils/format.js';

const command: Command = {
  data: new SlashCommandBuilder()
    .setName('withdraw')
    .setDescription('Withdraw coins from your bank')
    .addStringOption((option) =>
      option.setName('amount').setDescription('Amount to withdraw').setRequired(true)
    ),
  async execute(interaction: ChatInputCommandInteraction) {
    if (!interaction.guildId) {
      await interaction.reply({ content: 'This command must be used in a guild.', ephemeral: true });
      return;
    }

    await interaction.deferReply();

    const amountValue = interaction.options.getString('amount', true);
    const amount = parsePositiveAmount(amountValue);
    const { user, config } = await getOrCreateUser(interaction.user.id, interaction.guildId);

    await withdrawFromBank(user.id, amount);
    await interaction.editReply({ embeds: [createSuccessEmbed('Withdraw Complete', `Withdrew ${formatCurrency(amount, config.currencyEmoji)} from your bank.`)] });
  }
};

export default command;

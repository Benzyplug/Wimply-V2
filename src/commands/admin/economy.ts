import { AppError } from '../../utils/errors.js';
import { ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js';
import type { Command } from '../../types/command.js';
import { createSuccessEmbed } from '../../utils/embeds.js';
import { assertAdmin } from '../../utils/permission.js';
import { getOrCreateUser } from '../../services/userService.js';
import { parsePositiveAmount } from '../../utils/format.js';
import { adjustUserBalance, resetUserEconomy, resetGuildEconomy, setUserBalances } from '../../services/adminService.js';

const command: Command = {
  data: new SlashCommandBuilder()
    .setName('economy')
    .setDescription('Manage user or guild economy data')
    .addSubcommand((sub) =>
      sub
        .setName('set')
        .setDescription('Set user wallet or bank amount')
        .addUserOption((option) => option.setName('user').setDescription('User to update').setRequired(true))
        .addStringOption((option) =>
          option
            .setName('account')
            .setDescription('Wallet or bank')
            .setRequired(true)
            .addChoices({ name: 'wallet', value: 'wallet' }, { name: 'bank', value: 'bank' })
        )
        .addStringOption((option) => option.setName('amount').setDescription('Amount to set').setRequired(true))
    )
    .addSubcommand((sub) =>
      sub
        .setName('add')
        .setDescription('Add money to a user account')
        .addUserOption((option) => option.setName('user').setDescription('User to update').setRequired(true))
        .addStringOption((option) =>
          option
            .setName('account')
            .setDescription('Wallet or bank')
            .setRequired(true)
            .addChoices({ name: 'wallet', value: 'wallet' }, { name: 'bank', value: 'bank' })
        )
        .addStringOption((option) => option.setName('amount').setDescription('Amount to add').setRequired(true))
    )
    .addSubcommand((sub) =>
      sub
        .setName('remove')
        .setDescription('Remove money from a user account')
        .addUserOption((option) => option.setName('user').setDescription('User to update').setRequired(true))
        .addStringOption((option) =>
          option
            .setName('account')
            .setDescription('Wallet or bank')
            .setRequired(true)
            .addChoices({ name: 'wallet', value: 'wallet' }, { name: 'bank', value: 'bank' })
        )
        .addStringOption((option) => option.setName('amount').setDescription('Amount to remove').setRequired(true))
    )
    .addSubcommand((sub) =>
      sub
        .setName('reset-user')
        .setDescription('Reset a user economy profile')
        .addUserOption((option) => option.setName('user').setDescription('User to reset').setRequired(true))
    )
    .addSubcommand((sub) =>
      sub.setName('reset-guild').setDescription('Reset economy data for the entire guild')
    ),
  async execute(interaction: ChatInputCommandInteraction) {
    assertAdmin(interaction);
    if (!interaction.guildId) {
      await interaction.reply({ content: 'This command must be used in a guild.', ephemeral: true });
      return;
    }

    await interaction.deferReply();

    const subcommand = interaction.options.getSubcommand();
    const targetUser = interaction.options.getUser('user');
    const account = interaction.options.getString('account') as 'wallet' | 'bank' | null;
    const amountString = interaction.options.getString('amount');

    if (subcommand === 'reset-guild') {
      await resetGuildEconomy(interaction.guildId);
      await interaction.editReply({ embeds: [createSuccessEmbed('Guild Economy Reset', 'The guild economy has been reset successfully.')] });
      return;
    }

    if (!targetUser) {
      throw new AppError('Target user is required.');
    }

    const { user } = await getOrCreateUser(targetUser.id, interaction.guildId);

    if (subcommand === 'reset-user') {
      await resetUserEconomy(user);
      await interaction.editReply({ embeds: [createSuccessEmbed('User Reset', `Reset economy for ${targetUser.tag}.`)] });
      return;
    }

    if (!account || !amountString) {
      throw new AppError('Account and amount are required.');
    }

    const amount = parsePositiveAmount(amountString);

    if (subcommand === 'set') {
      const wallet = account === 'wallet' ? amount : null;
      const bank = account === 'bank' ? amount : null;
      const updated = await setUserBalances(user, wallet, bank);
      await interaction.editReply({
        embeds: [createSuccessEmbed('Economy Update', `Set ${targetUser.tag}'s ${account} balance to ${updated[account]}.`)]
      });
      return;
    }

    const delta = subcommand === 'remove' ? -amount : amount;
    const walletDelta = account === 'wallet' ? delta : 0n;
    const bankDelta = account === 'bank' ? delta : 0n;

    const updated = await adjustUserBalance(user, walletDelta, bankDelta);
    const operation = subcommand === 'add' ? 'added to' : 'removed from';
    await interaction.editReply({
      embeds: [createSuccessEmbed('Economy Update', `${amount} has been ${operation} ${targetUser.tag}'s ${account}. New ${account} balance: ${updated[account]}.`)]
    });
  }
};

export default command;

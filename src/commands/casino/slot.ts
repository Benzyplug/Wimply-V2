import { ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js';
import { z } from 'zod';
import type { Command } from '../../types/command.js';
import { createDefaultEmbed } from '../../utils/embeds.js';
import { formatCurrency, parsePositiveAmount } from '../../utils/format.js';
import { validateCommandOptions } from '../../utils/commandValidation.js';
import { playSlot } from '../../services/slotService.js';
import { getOrCreateGuildConfig } from '../../services/guildConfigService.js';
import { reactToGameResult } from '../../utils/gameReactions.js';

const slotSchema = z.object({
  amount: z.string().min(1, 'Amount is required')
});

const command: Command = {
  data: new SlashCommandBuilder()
    .setName('slot')
    .setDescription('Play the slot machine')
    .addStringOption((option) =>
      option.setName('amount').setDescription('Amount to bet').setRequired(true)
    ),
  async execute(interaction: ChatInputCommandInteraction) {
    if (!interaction.guildId) {
      await interaction.reply({ content: 'This command must be used in a guild.', ephemeral: true });
      return;
    }

    const payload = {
      amount: interaction.options.getString('amount', true)
    };

    const { amount } = validateCommandOptions(slotSchema, payload);
    const betAmount = parsePositiveAmount(amount);

    await interaction.deferReply();
    const guildConfig = await getOrCreateGuildConfig(interaction.guildId);

    const initialEmbed = createDefaultEmbed()
      .setTitle('Slot Machine')
      .setDescription(`Spinning the reels for ${formatCurrency(betAmount, guildConfig.currencyEmoji)}...`)
      .addFields(
        { name: 'Odds', value: 'Match 3 for a win, 2 matching symbols pay out smaller rewards.', inline: false }
      );

    await interaction.editReply({ embeds: [initialEmbed] });

    const result = await playSlot(interaction.user.id, interaction.guildId, betAmount);
    const resultEmbed = createDefaultEmbed()
      .setTitle(result.jackpot ? 'JACKPOT!' : result.won ? 'Slot Win!' : 'Slot Loss')
      .setDescription(result.message)
      .addFields(
        { name: 'Reels', value: result.reels.join(' '), inline: false },
        { name: 'Payout Multiplier', value: `${result.multiplier}x`, inline: true },
        { name: 'Wallet Change', value: formatCurrency(result.netAmount, guildConfig.currencyEmoji), inline: true },
        { name: 'New Wallet', value: formatCurrency(result.newWallet, guildConfig.currencyEmoji), inline: true }
      );

    const resultMessage = await interaction.editReply({ embeds: [resultEmbed] });
    await reactToGameResult(resultMessage, result.jackpot ? 'SLOT_JACKPOT' : result.won ? 'SLOT_WIN' : 'SLOT_LOSS');
  }
};

export default command;

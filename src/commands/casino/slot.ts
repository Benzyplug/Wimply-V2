import { ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js';
import { z } from 'zod';
import type { Command } from '../../types/command.js';
import { createDefaultEmbed } from '../../utils/embeds.js';
import { formatCurrency, parsePositiveAmount } from '../../utils/format.js';
import { validateCommandOptions } from '../../utils/commandValidation.js';
import { playSlot } from '../../services/slotService.js';
import { getOrCreateGuildConfig } from '../../services/guildConfigService.js';
import { reactToGameResult } from '../../utils/gameReactions.js';

const slotSchema = z.object({ amount: z.string().min(1, 'Amount is required') });
const sleep = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms));

const command: Command = {
  data: new SlashCommandBuilder()
    .setName('slot')
    .setDescription('Play the slot machine')
    .addStringOption(option => option.setName('amount').setDescription('Amount to bet').setRequired(true)),
  async execute(interaction: ChatInputCommandInteraction) {
    if (!interaction.guildId) {
      await interaction.reply({ embeds: [createDefaultEmbed().setTitle('╭─〔 🚫 WIMPLY ERROR 〕─╮').setDescription('〢 This command must be used inside a server.')] });
      return;
    }

    const { amount } = validateCommandOptions(slotSchema, { amount: interaction.options.getString('amount', true) });
    const betAmount = parsePositiveAmount(amount);
    await interaction.deferReply();
    const guildConfig = await getOrCreateGuildConfig(interaction.guildId);

    await interaction.editReply({ embeds: [createDefaultEmbed().setTitle('╭─〔 🎰 WIMPLY SLOTS 〕─╮').setDescription(`〢 Bet: **${formatCurrency(betAmount, guildConfig.currencyEmoji)}**\n〢 🎰 **[ ${'❔'} | ❔ | ❔ ]**\n\n╰─〔 🔄 Spinning the reels… 〕─╯`)] });
    await sleep(550);
    await interaction.editReply({ embeds: [createDefaultEmbed().setTitle('╭─〔 🎰 WIMPLY SLOTS 〕─╮').setDescription(`〢 Bet: **${formatCurrency(betAmount, guildConfig.currencyEmoji)}**\n〢 🎰 **[ ⭐ | 🍊 | ❔ ]**\n\n╰─〔 ⚡ One more spin… 〕─╯`)] });
    await sleep(550);

    const result = await playSlot(interaction.user.id, interaction.guildId, betAmount);
    const resultEmbed = createDefaultEmbed()
      .setTitle(result.jackpot ? '╭─〔 💎 JACKPOT 〕─╮' : result.won ? '╭─〔 🎉 SLOT WIN 〕─╮' : '╭─〔 💥 SLOT LOSS 〕─╮')
      .setDescription(`〢 ${result.message}`)
      .addFields(
        { name: '🎰 Reels', value: result.reels.join(' '), inline: false },
        { name: '📈 Multiplier', value: `${result.multiplier}x`, inline: true },
        { name: '🪙 Wallet Change', value: formatCurrency(result.netAmount, guildConfig.currencyEmoji), inline: true },
        { name: '💰 New Wallet', value: formatCurrency(result.newWallet, guildConfig.currencyEmoji), inline: true }
      );

    const resultMessage = await interaction.editReply({ embeds: [resultEmbed] });
    await reactToGameResult(resultMessage, result.jackpot ? 'SLOT_JACKPOT' : result.won ? 'SLOT_WIN' : 'SLOT_LOSS');
  }
};

export default command;

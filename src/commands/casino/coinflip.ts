import { ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js';
import { z } from 'zod';
import type { Command } from '../../types/command.js';
import { createDefaultEmbed } from '../../utils/embeds.js';
import { formatCurrency, parsePositiveAmount } from '../../utils/format.js';
import { validateCommandOptions } from '../../utils/commandValidation.js';
import { playCoinflip } from '../../services/casinoService.js';
import { getOrCreateGuildConfig } from '../../services/guildConfigService.js';
import { reactToGameResult } from '../../utils/gameReactions.js';

const coinflipSchema = z.object({ amount: z.string().min(1, 'Amount is required'), choice: z.enum(['heads', 'tails']) });
const sleep = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms));

const command: Command = {
  data: new SlashCommandBuilder()
    .setName('coinflip')
    .setDescription('Flip a coin and bet on heads or tails')
    .addStringOption(option => option.setName('amount').setDescription('Amount to bet').setRequired(true))
    .addStringOption(option => option.setName('choice').setDescription('Pick heads or tails').setRequired(true).addChoices({ name: 'Heads', value: 'heads' }, { name: 'Tails', value: 'tails' })),
  async execute(interaction: ChatInputCommandInteraction) {
    if (!interaction.guildId) return;
    const payload = { amount: interaction.options.getString('amount', true), choice: interaction.options.getString('choice', true) };
    const { amount: amountValue, choice } = validateCommandOptions(coinflipSchema, payload);
    const betAmount = parsePositiveAmount(amountValue);
    await interaction.deferReply();
    const guildConfig = await getOrCreateGuildConfig(interaction.guildId);

    await interaction.editReply({ embeds: [createDefaultEmbed().setTitle('╭─〔 🪙 COINFLIP 〕─╮').setDescription(`〢 Bet: **${formatCurrency(betAmount, guildConfig.currencyEmoji)}**\n〢 Pick: **${choice.toUpperCase()}**\n\n🪙\n\n╰─〔 🔄 Flipping… 〕─╯`)] });
    await sleep(450);
    await interaction.editReply({ embeds: [createDefaultEmbed().setTitle('╭─〔 🪙 COINFLIP 〕─╮').setDescription(`〢 Bet: **${formatCurrency(betAmount, guildConfig.currencyEmoji)}**\n〢 Pick: **${choice.toUpperCase()}**\n\n↗️ 🪙 ↘️\n\n╰─〔 ⚡ The coin is in the air… 〕─╯`)] });
    await sleep(450);

    const result = await playCoinflip(interaction.user.id, interaction.guildId, betAmount, choice as 'heads' | 'tails');
    const finalEmbed = createDefaultEmbed()
      .setTitle(result.won ? '╭─〔 🎉 COINFLIP WIN 〕─╮' : '╭─〔 💥 COINFLIP LOSS 〕─╮')
      .setDescription(`〢 ${result.message}`)
      .addFields(
        { name: '🎯 Your Pick', value: choice.toUpperCase(), inline: true },
        { name: '🪙 Flip Result', value: result.outcome.toUpperCase(), inline: true },
        { name: '💸 Wallet Change', value: formatCurrency(result.amount, guildConfig.currencyEmoji), inline: false },
        { name: '💰 New Wallet', value: formatCurrency(result.newWallet, guildConfig.currencyEmoji), inline: true }
      );

    const resultMessage = await interaction.editReply({ embeds: [finalEmbed] });
    await reactToGameResult(resultMessage, result.won ? 'COINFLIP_WIN' : 'COINFLIP_LOSS');
  }
};

export default command;

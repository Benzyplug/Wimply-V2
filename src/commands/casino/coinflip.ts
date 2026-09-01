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
  data: new SlashCommandBuilder().setName('coinflip').setDescription('Flip a coin and bet on heads or tails').addStringOption(o => o.setName('amount').setDescription('Amount to bet').setRequired(true)).addStringOption(o => o.setName('choice').setDescription('Pick heads or tails').setRequired(true).addChoices({ name: 'Heads', value: 'heads' }, { name: 'Tails', value: 'tails' })),
  async execute(interaction: ChatInputCommandInteraction) {
    if (!interaction.guildId) return;
    const { amount: amountValue, choice } = validateCommandOptions(coinflipSchema, { amount: interaction.options.getString('amount', true), choice: interaction.options.getString('choice', true) });
    const betAmount = parsePositiveAmount(amountValue);
    await interaction.deferReply();
    const guildConfig = await getOrCreateGuildConfig(interaction.guildId);
    const betDisplay = formatCurrency(betAmount, guildConfig.currencyEmoji);
    const pick = choice.toUpperCase();
    const result = await playCoinflip(interaction.user.id, interaction.guildId, betAmount, choice as 'heads' | 'tails');
    const frames = ['🪙', '🪙  ↗️', '↘️  🪙', '🪙  ↙️', '↗️  🪙  ↘️', '🔄  🪙  🔄', '↙️  🪙  ↖️', '🪙  ⬆️', '🪙'];
    for (let index = 0; index < frames.length; index++) {
      const progress = Math.round(((index + 1) / frames.length) * 100);
      await interaction.editReply({ embeds: [createDefaultEmbed().setTitle('╭─〔 🪙 WIMPLY COINFLIP 〕─╮').setDescription(`〢 **Bet:** ${betDisplay}\n〢 **Pick:** **${pick}**\n\n### ${frames[index]}\n\n〢 **Flip sequence:** ${'▰'.repeat(Math.max(1, Math.ceil(progress / 10)))}${'▱'.repeat(10 - Math.ceil(progress / 10))} **${progress}%**\n╰─〔 ${index < frames.length - 2 ? 'Coin is in motion…' : index < frames.length - 1 ? 'Locking result…' : 'Result locked'} 〕─╯`)] });
      if (index < frames.length - 1) await sleep(index === frames.length - 2 ? 500 : 250);
    }
    const finalFace = result.outcome === 'heads' ? '🟡 HEADS' : '⚪ TAILS';
    const finalEmbed = createDefaultEmbed().setTitle(result.won ? '╭─〔 🎉 COINFLIP WIN 〕─╮' : '╭─〔 💥 COINFLIP LOSS 〕─╮').setDescription(`〢 ${result.message}\n〢 **The coin landed:** ${finalFace}\n\n╰─〔 🪙 Flip complete 〕─╯`).addFields({ name: '🎯 Your Pick', value: pick, inline: true }, { name: '🪙 Flip Result', value: result.outcome.toUpperCase(), inline: true }, { name: '💸 Wallet Change', value: formatCurrency(result.amount, guildConfig.currencyEmoji), inline: false }, { name: '💰 New Wallet', value: formatCurrency(result.newWallet, guildConfig.currencyEmoji), inline: true });
    const resultMessage = await interaction.editReply({ embeds: [finalEmbed] });
    await reactToGameResult(resultMessage, result.won ? 'COINFLIP_WIN' : 'COINFLIP_LOSS');
  }
};
export default command;

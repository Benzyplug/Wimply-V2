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
const reels = ['7️⃣', '💎', '🔔', '🍊', '🍒', '⭐'];
const randomReels = () => Array.from({ length: 3 }, () => reels[Math.floor(Math.random() * reels.length)]);

const command: Command = {
  data: new SlashCommandBuilder().setName('slot').setDescription('Play the slot machine').addStringOption(o => o.setName('amount').setDescription('Amount to bet').setRequired(true)),
  async execute(interaction: ChatInputCommandInteraction) {
    if (!interaction.guildId) return;
    const { amount } = validateCommandOptions(slotSchema, { amount: interaction.options.getString('amount', true) });
    const betAmount = parsePositiveAmount(amount);
    await interaction.deferReply();
    const guildConfig = await getOrCreateGuildConfig(interaction.guildId);
    const betDisplay = formatCurrency(betAmount, guildConfig.currencyEmoji);
    const result = await playSlot(interaction.user.id, interaction.guildId, betAmount);
    const frames = [1, 2, 3, 4, 5, 6, 7];
    for (const frame of frames) {
      const current = frame === frames.length ? result.reels : randomReels();
      const locked = Math.min(3, Math.max(0, frame - 4));
      await interaction.editReply({ embeds: [createDefaultEmbed().setTitle('╭─〔 🎰 WIMPLY SLOTS 〕─╮').setDescription(`〢 **Bet:** ${betDisplay}\n\n**[ ${current.join(' │ ')} ]**\n\n〢 ${frame < 3 ? '⚡ Powering the reels…' : frame < 5 ? '🔄 Spinning…' : frame < frames.length ? `🎯 Locking reels: ${'●'.repeat(locked)}${'○'.repeat(3 - locked)}` : '✨ Result locked!'}\n〢 **Sequence:** ${'▰'.repeat(frame)}${'▱'.repeat(frames.length - frame)}\n╰─〔 ${frame}/${frames.length} • ${frame < frames.length ? 'Please wait…' : 'Spin complete'} 〕─╯`)] });
      if (frame < frames.length) await sleep(frame === frames.length - 1 ? 450 : 300);
    }
    const resultEmbed = createDefaultEmbed().setTitle(result.jackpot ? '╭─〔 💎 JACKPOT 〕─╮' : result.won ? '╭─〔 🎉 SLOT WIN 〕─╮' : '╭─〔 💥 SLOT LOSS 〕─╮').setDescription(`〢 ${result.message}\n\n╰─〔 🎰 Spin complete 〕─╯`).addFields({ name: '🎰 Reels', value: `**[ ${result.reels.join(' │ ')} ]**`, inline: false }, { name: '📈 Multiplier', value: `${result.multiplier}x`, inline: true }, { name: '🪙 Wallet Change', value: formatCurrency(result.netAmount, guildConfig.currencyEmoji), inline: true }, { name: '💰 New Wallet', value: formatCurrency(result.newWallet, guildConfig.currencyEmoji), inline: true });
    const resultMessage = await interaction.editReply({ embeds: [resultEmbed] });
    await reactToGameResult(resultMessage, result.jackpot ? 'SLOT_JACKPOT' : result.won ? 'SLOT_WIN' : 'SLOT_LOSS');
  }
};
export default command;

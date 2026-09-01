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
    // Resolve once, then animate toward the actual result so the visual never disagrees with the wager.
    const result = await playSlot(interaction.user.id, interaction.guildId, betAmount);
    const frames = [1, 2, 3, 4, 5];
    for (const frame of frames) {
      const current = frame === 5 ? result.reels : randomReels();
      await interaction.editReply({ embeds: [createDefaultEmbed().setTitle('╭─〔 🎰 WIMPLY SLOTS 〕─╮').setDescription(`〢 **Bet:** ${betDisplay}\n〢 **[ ${current.join(' │ ')} ]**\n〢 ${frame < 3 ? '⚡ Reels are starting…' : frame < 5 ? '🔄 Reels are rolling…' : '✨ Result locked!'}\n╰─〔 ${frame}/5 • Please wait… 〕─╯`)] });
      if (frame < 5) await sleep(360);
    }
    const resultEmbed = createDefaultEmbed().setTitle(result.jackpot ? '╭─〔 💎 JACKPOT 〕─╮' : result.won ? '╭─〔 🎉 SLOT WIN 〕─╮' : '╭─〔 💥 SLOT LOSS 〕─╮').setDescription(`〢 ${result.message}\n\n╰─〔 🎰 Spin complete 〕─╯`).addFields({ name: '🎰 Reels', value: `**[ ${result.reels.join(' │ ')} ]**`, inline: false }, { name: '📈 Multiplier', value: `${result.multiplier}x`, inline: true }, { name: '🪙 Wallet Change', value: formatCurrency(result.netAmount, guildConfig.currencyEmoji), inline: true }, { name: '💰 New Wallet', value: formatCurrency(result.newWallet, guildConfig.currencyEmoji), inline: true });
    const resultMessage = await interaction.editReply({ embeds: [resultEmbed] });
    await reactToGameResult(resultMessage, result.jackpot ? 'SLOT_JACKPOT' : result.won ? 'SLOT_WIN' : 'SLOT_LOSS');
  }
};
export default command;

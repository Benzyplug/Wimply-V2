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

function randomReels() {
  return Array.from({ length: 3 }, () => reels[Math.floor(Math.random() * reels.length)]);
}

function spinFrame(frame: number, bet: string) {
  const current = randomReels();
  const lock = frame >= 3 ? '🔒' : '🎰';
  return `╭─〔 🎰 WIMPLY SLOTS 〕─╮\n〢 **Bet:** ${bet}\n〢 ${lock} **[ ${current.join(' │ ')} ]**\n〢 ${frame === 1 ? '⚡ Reels are starting…' : frame === 2 ? '🔄 Reels are rolling…' : frame === 3 ? '🎯 Finalizing the spin…' : '✨ Result locked!'}\n╰─〔 ${frame}/4 • Please wait… 〕─╯`;
}

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
    const betDisplay = formatCurrency(betAmount, guildConfig.currencyEmoji);

    for (let frame = 1; frame <= 4; frame++) {
      await interaction.editReply({ embeds: [createDefaultEmbed().setTitle('╭─〔 🎰 WIMPLY SLOTS 〕─╮').setDescription(spinFrame(frame, betDisplay))] });
      if (frame < 4) await sleep(420);
    }

    const result = await playSlot(interaction.user.id, interaction.guildId, betAmount);
    const resultEmbed = createDefaultEmbed()
      .setTitle(result.jackpot ? '╭─〔 💎 JACKPOT 〕─╮' : result.won ? '╭─〔 🎉 SLOT WIN 〕─╮' : '╭─〔 💥 SLOT LOSS 〕─╮')
      .setDescription(`〢 ${result.message}\n\n╰─〔 🎰 Spin complete 〕─╯`)
      .addFields(
        { name: '🎰 Reels', value: `**[ ${result.reels.join(' │ ')} ]**`, inline: false },
        { name: '📈 Multiplier', value: `${result.multiplier}x`, inline: true },
        { name: '🪙 Wallet Change', value: formatCurrency(result.netAmount, guildConfig.currencyEmoji), inline: true },
        { name: '💰 New Wallet', value: formatCurrency(result.newWallet, guildConfig.currencyEmoji), inline: true }
      );

    const resultMessage = await interaction.editReply({ embeds: [resultEmbed] });
    await reactToGameResult(resultMessage, result.jackpot ? 'SLOT_JACKPOT' : result.won ? 'SLOT_WIN' : 'SLOT_LOSS');
  }
};

export default command;

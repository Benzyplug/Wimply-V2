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
const randomSymbol = () => reels[Math.floor(Math.random() * reels.length)];

function reelColumn(symbol: string, offset: number, spinning: boolean) {
  const strip = Array.from({ length: 5 }, (_, index) => spinning ? (index === 2 ? symbol : reels[(reels.indexOf(symbol) + index + offset) % reels.length]) : symbol);
  return `┌─────┐\n│ ${strip[0]} │\n│ ${strip[1]} │\n│ ${strip[2]} │\n│ ${strip[3]} │\n│ ${strip[4]} │\n└─────┘`;
}

function spinEmbed(betDisplay: string, current: string[], frame: number, locked: number) {
  return createDefaultEmbed()
    .setTitle('╭─〔 🎰 WIMPLY SLOTS 〕─╮')
    .setDescription(`〢 **Bet:** ${betDisplay}\n〢 **Vertical reel spin** ↓\n〢 ${locked ? `🔒 Reel${locked > 1 ? 's' : ''} locked: **${locked}/3**` : '⚡ Starting all reels…'}\n\n${frame === 7 ? '✨ All reels locked!' : '🔄 Reels are spinning…'}`)
    .addFields(
      { name: '🎰 REEL 1', value: reelColumn(current[0], frame, locked >= 1), inline: true },
      { name: '🎰 REEL 2', value: reelColumn(current[1], frame + 2, locked >= 2), inline: true },
      { name: '🎰 REEL 3', value: reelColumn(current[2], frame + 4, locked >= 3), inline: true },
    )
    .setFooter({ text: `〢 Spin ${frame}/7 • ${locked === 3 ? 'Result locked' : 'Spinning down…'}` });
}

const command: Command = {
  data: new SlashCommandBuilder().setName('slot').setDescription('Play the vertical Wimply slot machine').addStringOption(o => o.setName('amount').setDescription('Amount to bet').setRequired(true)),
  async execute(interaction: ChatInputCommandInteraction) {
    if (!interaction.guildId) return;
    const { amount } = validateCommandOptions(slotSchema, { amount: interaction.options.getString('amount', true) });
    const betAmount = parsePositiveAmount(amount);
    await interaction.deferReply();
    const guildConfig = await getOrCreateGuildConfig(interaction.guildId);
    const betDisplay = formatCurrency(betAmount, guildConfig.currencyEmoji);
    const result = await playSlot(interaction.user.id, interaction.guildId, betAmount);
    let current = [randomSymbol(), randomSymbol(), randomSymbol()];
    let message = await interaction.editReply({ embeds: [spinEmbed(betDisplay, current, 1, 0)] });

    for (let frame = 2; frame <= 7; frame++) {
      const locked = Math.max(0, frame - 4);
      current = [0, 1, 2].map(index => index < locked ? result.reels[index] : randomSymbol());
      message = await interaction.editReply({ embeds: [spinEmbed(betDisplay, current, frame, locked)] });
      if (frame < 7) await sleep(360);
    }

    const resultEmbed = createDefaultEmbed()
      .setTitle(result.jackpot ? '╭─〔 💎 JACKPOT 〕─╮' : result.won ? '╭─〔 🎉 SLOT WIN 〕─╮' : '╭─〔 💥 SLOT LOSS 〕─╮')
      .setDescription(`〢 ${result.message}\n\n╰─〔 🎰 Reels locked • Result: ${result.reels.join(' • ')} 〕─╯`)
      .addFields(
        { name: '🎰 REEL 1', value: reelColumn(result.reels[0], 0, false), inline: true },
        { name: '🎰 REEL 2', value: reelColumn(result.reels[1], 0, false), inline: true },
        { name: '🎰 REEL 3', value: reelColumn(result.reels[2], 0, false), inline: true },
        { name: '📈 Multiplier', value: `${result.multiplier}x`, inline: true },
        { name: '🪙 Wallet Change', value: formatCurrency(result.netAmount, guildConfig.currencyEmoji), inline: true },
        { name: '💰 New Wallet', value: formatCurrency(result.newWallet, guildConfig.currencyEmoji), inline: true }
      );
    const resultMessage = await interaction.editReply({ embeds: [resultEmbed] });
    await reactToGameResult(resultMessage, result.jackpot ? 'SLOT_JACKPOT' : result.won ? 'SLOT_WIN' : 'SLOT_LOSS');
  }
};
export default command;

import { ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js';
import type { Command } from '../../types/command.js';
import { createDefaultEmbed } from '../../utils/embeds.js';
import { formatCurrency, parsePositiveAmount } from '../../utils/format.js';
import { validateCommandOptions } from '../../utils/commandValidation.js';
import { playSlot } from '../../services/slotService.js';
import { getOrCreateGuildConfig } from '../../services/guildConfigService.js';
import { playGameSlides } from '../../utils/gameAnimation.js';

const slotSchema = z.object({ amount: z.string().min(1, 'Amount is required') });
const reels = ['7️⃣', '💎', '🔔', '🍊', '🍒', '⭐'];
const randomSymbol = () => reels[Math.floor(Math.random() * reels.length)];

function reelColumn(symbol: string, offset: number, spinning: boolean) {
  const symbolIndex = Math.max(0, reels.indexOf(symbol));
  const strip = Array.from({ length: 5 }, (_, index) => spinning ? reels[(symbolIndex + index + offset) % reels.length] : symbol);
  return `┌───────┐\n│ ${strip[0]} │\n│ ${strip[1]} │\n│ ${strip[2]} │\n│ ${strip[3]} │\n│ ${strip[4]} │\n└───────┘`;
}

function spinEmbed(betDisplay: string, current: string[], frame: number, locked: number) {
  return createDefaultEmbed()
    .setTitle('🎰 WIMPLY SLOTS')
    .setDescription(`💰 **Bet:** ${betDisplay}\n\n${locked ? `🔒 Reels locked: **${locked}/3**` : '⚡ All reels spinning…'}\n\n${locked === 3 ? '💎 RESULT LOCKED' : '🔄 SPINNING…'}`)
    .addFields(
      { name: '🎰 REEL 1', value: reelColumn(current[0], frame * 2, locked >= 1), inline: true },
      { name: '🎰 REEL 2', value: reelColumn(current[1], frame * 3, locked >= 2), inline: true },
      { name: '🎰 REEL 3', value: reelColumn(current[2], frame * 4, locked >= 3), inline: true },
    )
    .setFooter({ text: `🎰 Slide ${frame}/8 • ${locked === 3 ? 'All reels stopped' : 'Rolling…'}` });
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
    const lockOrder = [0, 2, 1];
    const slides = Array.from({ length: 8 }, (_, index) => {
      const frame = index + 1;
      const locked = Math.max(0, Math.min(3, frame - 4));
      current = [0, 1, 2].map(reelIndex => {
        const lockPosition = lockOrder.indexOf(reelIndex);
        return lockPosition !== -1 && lockPosition < locked ? result.reels[reelIndex] : randomSymbol();
      });
      return { content: { embeds: [spinEmbed(betDisplay, [...current], frame, locked)] }, delay: frame === 1 ? 220 : frame === 7 ? 320 : 130 };
    });
    await playGameSlides(slides, async (payload) => { await interaction.editReply(payload); });

    const resultEmbed = createDefaultEmbed()
      .setTitle(result.jackpot ? '💎 SLOTS • JACKPOT' : result.won ? '🎉 SLOTS • WIN' : '💥 SLOTS • LOSS')
      .setDescription(`${result.message}\n\n🎰 **${result.reels.join(' • ')}**`)
      .addFields(
        { name: '🎰 REEL 1', value: reelColumn(result.reels[0], 0, false), inline: true },
        { name: '🎰 REEL 2', value: reelColumn(result.reels[1], 0, false), inline: true },
        { name: '🎰 REEL 3', value: reelColumn(result.reels[2], 0, false), inline: true },
        { name: '📈 Multiplier', value: `${result.multiplier}x`, inline: true },
        { name: '🪙 Wallet Change', value: formatCurrency(result.netAmount, guildConfig.currencyEmoji), inline: true },
        { name: '💰 New Wallet', value: formatCurrency(result.newWallet, guildConfig.currencyEmoji), inline: true }
      );
    await interaction.editReply({ embeds: [resultEmbed] });
  }
};
export default command;

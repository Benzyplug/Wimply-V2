import { ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js';
import { z } from 'zod';
import type { Command } from '../../types/command.js';
import { createDefaultEmbed } from '../../utils/embeds.js';
import { formatCurrency, parsePositiveAmount } from '../../utils/format.js';
import { validateCommandOptions } from '../../utils/commandValidation.js';
import { chargeGame, getGameCurrency, payGame } from '../../services/miniGameService.js';
import { playGameSlides } from '../../utils/gameAnimation.js';

const schema = z.object({ amount: z.string().min(1), snail: z.coerce.number().int().min(1).max(3) });
const tracks = ['🐌', '🐌', '🐌'];

function raceBoard(positions: number[]) {
  return positions.map((position, index) => `${index + 1}. ${'·'.repeat(Math.max(0, position))}${tracks[index]}${'━'.repeat(Math.max(1, 12 - position))}🏁`).join('\n');
}

const command: Command = {
  data: new SlashCommandBuilder()
    .setName('snailgarden')
    .setDescription('Bet on a snail in a tiny animated race')
    .addStringOption(option => option.setName('amount').setDescription('Amount to bet').setRequired(true))
    .addIntegerOption(option => option.setName('snail').setDescription('Pick snail 1, 2 or 3').setRequired(true).setMinValue(1).setMaxValue(3)),
  async execute(interaction: ChatInputCommandInteraction) {
    if (!interaction.guildId) return;
    const payload = { amount: interaction.options.getString('amount', true), snail: interaction.options.getInteger('snail', true) };
    const { amount, snail } = validateCommandOptions(schema, payload);
    const bet = parsePositiveAmount(amount);
    await chargeGame(interaction.user.id, interaction.guildId, bet, 'Snail Garden');
    const currency = await getGameCurrency(interaction.guildId);
    await interaction.deferReply();

    const positions = [0, 0, 0];
    const frames = Array.from({ length: 8 }, (_, frame) => {
      for (let index = 0; index < positions.length; index += 1) positions[index] = Math.min(11, Math.max(positions[index], frame + Math.floor(Math.random() * 3) - 1));
      return [...positions];
    });
    await playGameSlides(frames.map((frame, index) => ({ content: { embeds: [createDefaultEmbed().setTitle(index === 0 ? '🐌 SNAIL GARDEN • READY' : index < 7 ? '🐌 SNAIL GARDEN • RACING' : '🐌 SNAIL GARDEN • FINISH').setDescription(`🎟️ Your pick: **Snail ${snail}**\n💰 Bet: **${formatCurrency(bet, currency.currencyEmoji)}**\n\n${raceBoard(frame)}\n\n${index < 7 ? '🌿 Tiny legs. Big race.' : '🏁 The finish line is here.'}`)] }, delay: index === 0 ? 220 : index === 6 ? 320 : 180 })), async (payload) => { await interaction.editReply(payload); });

    const winner = Math.floor(Math.random() * 3) + 1;
    const won = winner === snail;
    const payout = won ? (bet * 5n) / 2n : 0n;
    if (payout > 0n) await payGame(interaction.user.id, interaction.guildId, payout, 'Snail Garden');
    await interaction.editReply({ embeds: [createDefaultEmbed().setTitle(won ? '🏆 SNAIL GARDEN • VICTORY' : '🐌 SNAIL GARDEN • FINISH').setDescription(`🏁 Winner: **Snail ${winner}**\n🎟️ Your pick: **Snail ${snail}**\n\n${won ? '🎉 **Your snail won the garden race!**' : '💥 **Your snail lost the race.**'}\n\n${won ? `🏆 Payout: **${formatCurrency(payout, currency.currencyEmoji)}**` : `💸 Lost: **${formatCurrency(bet, currency.currencyEmoji)}**`}\n📈 Multiplier: **2.5×**`)] });
  }
};

export default command;

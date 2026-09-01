import { ActionRowBuilder, ButtonBuilder, ButtonStyle, ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js';
import { z } from 'zod';
import type { Command } from '../../types/command.js';
import { createDefaultEmbed } from '../../utils/embeds.js';
import { formatCurrency, parsePositiveAmount } from '../../utils/format.js';
import { validateCommandOptions } from '../../utils/commandValidation.js';
import { chargeGame, createGameSessionId, getGameCurrency, higherLowerGames } from '../../services/miniGameService.js';
const schema = z.object({ amount: z.string().min(1) });
const buttons = (id: string, moves = 0) => new ActionRowBuilder<ButtonBuilder>().addComponents(new ButtonBuilder().setCustomId(`hl:higher:${id}`).setLabel('Higher ⬆️').setStyle(ButtonStyle.Primary), new ButtonBuilder().setCustomId(`hl:lower:${id}`).setLabel('Lower ⬇️').setStyle(ButtonStyle.Secondary), new ButtonBuilder().setCustomId(`hl:cashout:${id}`).setLabel('Cash Out 💰').setStyle(ButtonStyle.Success).setDisabled(moves < 1));
const command: Command = {
  data: new SlashCommandBuilder().setName('higherlower').setDescription('Predict whether the next number is higher or lower').addStringOption(option => option.setName('amount').setDescription('Amount to bet').setRequired(true)),
  async execute(interaction: ChatInputCommandInteraction) {
    if (!interaction.guildId) return;
    const { amount } = validateCommandOptions(schema, { amount: interaction.options.getString('amount', true) });
    const existing = [...higherLowerGames.values()].find(game => game.userId === interaction.user.id && game.guildId === interaction.guildId && game.expiresAt > Date.now());
    if (existing) { const currency = await getGameCurrency(interaction.guildId); await interaction.reply({ embeds: [createDefaultEmbed().setTitle('🎯 HIGHER / LOWER — RESUMED').setDescription(`Your unfinished season is still active.\n\n〢 Current number: **${existing.current}**\n〢 Multiplier: **${existing.multiplier.toFixed(2)}x**\n〢 Moves: **${existing.moves}**\n〢 Current value: **${formatCurrency(existing.bet * BigInt(Math.round(existing.multiplier * 100)) / 100n, currency.currencyEmoji)}**\n\nYour previous progress has been restored automatically.`)], components: [buttons(existing.id, existing.moves)] }); return; }
    const bet = parsePositiveAmount(amount); await chargeGame(interaction.user.id, interaction.guildId, bet, 'Higher/Lower'); const currency = await getGameCurrency(interaction.guildId); const id = createGameSessionId(interaction.user.id); const current = Math.floor(Math.random() * 90) + 5;
    higherLowerGames.set(id, { userId: interaction.user.id, guildId: interaction.guildId, bet, current, multiplier: 1, moves: 0, expiresAt: Date.now() + 5 * 60_000 });
    await interaction.reply({ embeds: [createDefaultEmbed().setTitle('🎯 HIGHER / LOWER').setDescription(`Starting bet: **${formatCurrency(bet, currency.currencyEmoji)}**\nCurrent number: **${current}**\nMultiplier: **1.00x**\nMoves: **0**\n\nPredict the next number.`)], components: [buttons(id)] });
  }
};
export default command;

import { ActionRowBuilder, ButtonBuilder, ButtonStyle, ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js';
import { z } from 'zod';
import type { Command } from '../../types/command.js';
import { createDefaultEmbed } from '../../utils/embeds.js';
import { formatCurrency, parsePositiveAmount } from '../../utils/format.js';
import { validateCommandOptions } from '../../utils/commandValidation.js';
import { chargeGame, createGameSessionId, getGameCurrency, minesGames, randomMines } from '../../services/miniGameService.js';
const schema = z.object({ amount: z.string().min(1), mines: z.number().int().min(1).max(24) });
const size = 25;
export function minesRows(id: string, revealed: Set<number>, mines?: Set<number>) { return Array.from({ length: 5 }, (_, r) => { const row = new ActionRowBuilder<ButtonBuilder>(); for (let c = 0; c < 5; c++) { const i = r * 5 + c; const isMine = mines?.has(i); const isRevealed = revealed.has(i); row.addComponents(new ButtonBuilder().setCustomId(`mines:cell:${id}:${i}`).setLabel(isRevealed ? (isMine ? '💣' : '💎') : '▫️').setStyle(isRevealed ? ButtonStyle.Secondary : ButtonStyle.Primary).setDisabled(Boolean(isRevealed))); } return row; }); }
export function minesCashoutRow(id: string, enabled: boolean) { return [new ActionRowBuilder<ButtonBuilder>().addComponents(new ButtonBuilder().setCustomId(`mines:cashout:${id}`).setLabel('💰 Cash Out').setStyle(ButtonStyle.Success).setDisabled(!enabled))]; }
const command: Command = {
  data: new SlashCommandBuilder().setName('mines').setDescription('Play a 5x5 mines game').addStringOption(option => option.setName('amount').setDescription('Amount to bet').setRequired(true)).addIntegerOption(option => option.setName('mines').setDescription('Number of mines (1-24)').setRequired(false).setMinValue(1).setMaxValue(24)),
  async execute(interaction: ChatInputCommandInteraction) {
    if (!interaction.guildId) return;
    const raw = { amount: interaction.options.getString('amount', true), mines: interaction.options.getInteger('mines') ?? 5 }; const { amount, mines: mineCount } = validateCommandOptions(schema, raw);
    const existing = [...minesGames.values()].find(game => game.userId === interaction.user.id && game.guildId === interaction.guildId && game.expiresAt > Date.now());
    if (existing) { const currency = await getGameCurrency(interaction.guildId); await interaction.reply({ embeds: [createDefaultEmbed().setTitle('💣 MINES — RESUMED').setDescription(`Your unfinished Mines round has been restored.\n\n💰 Bet: **${formatCurrency(existing.bet, currency.currencyEmoji)}**\n💣 Mines: **${existing.mineCount}/25**\n💎 Gems found: **${existing.revealed.size}**\n📈 Multiplier: **${existing.multiplier.toFixed(2)}×**\n💵 Cash-out value: **${formatCurrency(existing.bet * BigInt(Math.round(existing.multiplier * 100)) / 100n, currency.currencyEmoji)}**\n\nContinue on the board below.`)], components: [...minesRows(existing.id, existing.revealed), ...minesCashoutRow(existing.id, existing.revealed.size > 0)] }); return; }
    const bet = parsePositiveAmount(amount); await chargeGame(interaction.user.id, interaction.guildId, bet, 'Mines'); const currency = await getGameCurrency(interaction.guildId); const id = createGameSessionId(interaction.user.id); const revealed = new Set<number>();
    minesGames.set(id, { id, userId: interaction.user.id, guildId: interaction.guildId, bet, mines: randomMines(mineCount, size), revealed, multiplier: 1, mineCount, expiresAt: Date.now() + 10 * 60_000 });
    await interaction.reply({ embeds: [createDefaultEmbed().setTitle('💣 MINES 5×5').setDescription(`💰 Bet: **${formatCurrency(bet, currency.currencyEmoji)}**\n💣 Mines: **${mineCount}/25**\n📈 Multiplier: **1.00×**\n💎 Gems found: **0**\n\nPick a tile. 💎 increases your cash-out value; 💣 ends the round. Cash Out is always kept **outside the board**.`)], components: [...minesRows(id, revealed), ...minesCashoutRow(id, false)] });
  }
};
export default command;

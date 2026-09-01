import { ActionRowBuilder, ButtonBuilder, ButtonStyle, ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js';
import { z } from 'zod';
import type { Command } from '../../types/command.js';
import { createDefaultEmbed } from '../../utils/embeds.js';
import { formatCurrency, parsePositiveAmount } from '../../utils/format.js';
import { validateCommandOptions } from '../../utils/commandValidation.js';
import { chargeGame, createGameSessionId, getGameCurrency, minesGames, minesMultiplier, randomMines } from '../../services/miniGameService.js';
const schema = z.object({ amount: z.string().min(1), mines: z.number().int().min(2).max(20) });
const size = 25;
export function minesRows(id: string, revealed: Set<number>, mines?: Set<number>, cashout = true) { return Array.from({ length: 5 }, (_, r) => { const row = new ActionRowBuilder<ButtonBuilder>(); for (let c = 0; c < 5; c++) { const i = r * 5 + c; const isMine = mines?.has(i); const isRevealed = revealed.has(i); const firstSafe = [...revealed].sort((a,b) => a-b).find(index => !mines?.has(index)); const isCashoutTile = cashout && isRevealed && !isMine && i === firstSafe; row.addComponents(new ButtonBuilder().setCustomId(isCashoutTile ? `mines:cashout:${id}:${i}` : `mines:cell:${id}:${i}`).setLabel(isCashoutTile ? '💰 Cash Out' : isRevealed ? (isMine ? '💣' : '💎') : '▫️').setStyle(isCashoutTile ? ButtonStyle.Success : isRevealed ? ButtonStyle.Secondary : ButtonStyle.Primary).setDisabled(isRevealed && !isCashoutTile)); } return row; }); }
const command: Command = {
  data: new SlashCommandBuilder().setName('mines').setDescription('Play a 5x5 mines game').addStringOption(option => option.setName('amount').setDescription('Amount to bet').setRequired(true)).addIntegerOption(option => option.setName('mines').setDescription('Number of mines (2-20)').setRequired(false).setMinValue(2).setMaxValue(20)),
  async execute(interaction: ChatInputCommandInteraction) {
    if (!interaction.guildId) return;
    const raw = { amount: interaction.options.getString('amount', true), mines: interaction.options.getInteger('mines') ?? 5 }; const { amount, mines: mineCount } = validateCommandOptions(schema, raw);
    const existing = [...minesGames.values()].find(game => game.userId === interaction.user.id && game.guildId === interaction.guildId && game.expiresAt > Date.now());
    if (existing) { const currency = await getGameCurrency(interaction.guildId); await interaction.reply({ embeds: [createDefaultEmbed().setTitle('💣 MINES — RESUMED').setDescription(`Your unfinished Mines season is still active.\n\n〢 Bet: **${formatCurrency(existing.bet, currency.currencyEmoji)}**\n〢 Mines: **${existing.mineCount}/25**\n〢 Gems found: **${existing.revealed.size}**\n〢 Multiplier: **${existing.multiplier.toFixed(2)}x**\n〢 Cash-out value: **${formatCurrency(existing.bet * BigInt(Math.round(existing.multiplier * 100)) / 100n, currency.currencyEmoji)}**\n\nYour previous board and progress have been restored automatically.`)], components: [minesRows(existing.id, existing.revealed, undefined)] }); return; }
    const bet = parsePositiveAmount(amount); await chargeGame(interaction.user.id, interaction.guildId, bet, 'Mines'); const currency = await getGameCurrency(interaction.guildId); const id = createGameSessionId(interaction.user.id); const revealed = new Set<number>();
    minesGames.set(id, { userId: interaction.user.id, guildId: interaction.guildId, bet, mines: randomMines(mineCount, size), revealed, multiplier: 1, mineCount, expiresAt: Date.now() + 10 * 60_000 });
    await interaction.reply({ embeds: [createDefaultEmbed().setTitle('💣 MINES 5×5').setDescription(`Bet: **${formatCurrency(bet, currency.currencyEmoji)}**\nMines: **${mineCount}/25**\nMultiplier: **1.00x**\nNext safe multiplier: **${minesMultiplier(mineCount, 1).toFixed(2)}x**\nGems found: **0**\n\nPick a tile. 💎 raises the payout; 💣 ends the round. After a safe click, the first revealed gem becomes your **💰 Cash Out** control.`)], components: minesRows(id, revealed) });
  }
};
export default command;

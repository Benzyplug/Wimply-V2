import { ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js';
import type { Command } from '../../types/command.js';
import { createDefaultEmbed } from '../../utils/embeds.js';
import { formatCurrency, parsePositiveAmount } from '../../utils/format.js';
import { validateCommandOptions } from '../../utils/commandValidation.js';
import { chargeGame, createGameSessionId, getGameCurrency, minesGames, randomMines } from '../../services/miniGameService.js';
import type { MinesState } from '../../services/miniGameService.js';
import { playGameSlides } from '../../utils/gameAnimation.js';
import { minesRows } from '../../utils/minesComponents.js';
export { minesRows } from '../../utils/minesComponents.js';

const schema = z.object({ amount: z.string().min(1), mines: z.number().int().min(1).max(24) });
const size = 25;

function minesBoard(id: string, revealed: Set<number>, mines?: Set<number>, cashoutEnabled = false) {
  const rows = minesRows(id, revealed, mines);
  const last = rows[rows.length - 1];
  const button = last.components[4];
  if (cashoutEnabled) button.setLabel('💰 CASH OUT').setStyle(3).setCustomId(`mines:cashout:${id}`).setDisabled(false);
  return rows;
}

const command: Command = {
  data: new SlashCommandBuilder().setName('mines').setDescription('Play a 5x5 mines game').addStringOption(o => o.setName('amount').setDescription('Amount to bet').setRequired(true)).addIntegerOption(o => o.setName('mines').setDescription('Number of mines (1-24)').setRequired(true).setMinValue(1).setMaxValue(24)),
  async execute(interaction: ChatInputCommandInteraction) {
    if (!interaction.guildId) return;
    const raw = { amount: interaction.options.getString('amount', true), mines: interaction.options.getInteger('mines', true) };
    const { amount, mines: mineCount } = validateCommandOptions(schema, raw);
    const existing = [...minesGames.values()].find(game => game.userId === interaction.user.id && game.guildId === interaction.guildId && game.expiresAt > Date.now());
    if (existing) {
      const currency = await getGameCurrency(interaction.guildId);
      await interaction.reply({ embeds: [createDefaultEmbed().setTitle('💣 MINES • RESUMED').setDescription(`💰 Bet: **${formatCurrency(existing.bet, currency.currencyEmoji)}**\n💣 Mines: **${existing.mineCount}/25**\n💎 Gems found: **${existing.revealed.size}**\n📈 Multiplier: **${existing.multiplier.toFixed(2)}×**\n\nYour unfinished board is active below.`)], components: [minesBoard(existing.id, existing.revealed, existing.mines, existing.revealed.size > 0)] });
      return;
    }
    const bet = parsePositiveAmount(amount);
    await chargeGame(interaction.user.id, interaction.guildId, bet, 'Mines');
    const currency = await getGameCurrency(interaction.guildId);
    const id = createGameSessionId(interaction.user.id);
    const revealed = new Set<number>();
    const mines = randomMines(mineCount, size);
    const game: MinesState = { id, userId: interaction.user.id, guildId: interaction.guildId, channelId: interaction.channelId ?? interaction.channel?.id, bet, mines, revealed, multiplier: 1, mineCount, expiresAt: Date.now() + 10 * 60_000 };
    minesGames.set(id, game);
    await interaction.deferReply();
    const board = (title: string, description: string, enabled = false) => ({ embeds: [createDefaultEmbed().setTitle(title).setDescription(description)], components: minesBoard(id, revealed, undefined, enabled) });
    await playGameSlides([
      { content: board('💣 MINES • BOARD LOADING', `💰 Bet: **${formatCurrency(bet, currency.currencyEmoji)}**\n💣 Mines hidden: **${mineCount}**\n\n🎲 Planting the minefield…`), delay: 260 },
      { content: board('💣 MINES • FIELD ARMED', `💰 Bet: **${formatCurrency(bet, currency.currencyEmoji)}**\n💣 Mines: **${mineCount}/25**\n📈 Multiplier: **1.00×**\n\n🔒 Choose a tile.`), delay: 320 },
      { content: board('💎 MINES 5×5', `💰 Bet: **${formatCurrency(bet, currency.currencyEmoji)}**\n💣 Mines: **${mineCount}/25**\n💎 Gems found: **0**\n📈 Multiplier: **1.00×**\n\nPick a tile. The fifth button becomes **CASH OUT** after your first safe tile.`), delay: 0 }
    ], async payload => { const edited = await interaction.editReply(payload); if (edited && typeof edited === 'object' && 'id' in edited) game.boardMessageId = String(edited.id); });
  }
};
export default command;

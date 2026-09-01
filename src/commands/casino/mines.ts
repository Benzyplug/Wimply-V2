import { ActionRowBuilder, ButtonBuilder, ButtonStyle, ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js';
import { z } from 'zod';
import type { Command } from '../../types/command.js';
import { createDefaultEmbed } from '../../utils/embeds.js';
import { formatCurrency, parsePositiveAmount } from '../../utils/format.js';
import { validateCommandOptions } from '../../utils/commandValidation.js';
import { chargeGame, createGameSessionId, getGameCurrency, minesGames, minesMultiplier, randomMines } from '../../services/miniGameService.js';

const schema = z.object({ amount: z.string().min(1), mines: z.number().int().min(2).max(20) });
const size = 25;

export function minesRows(id: string, revealed: Set<number>, mines?: Set<number>, cashout = true) {
  const rows = Array.from({ length: 5 }, (_, r) => {
    const row = new ActionRowBuilder<ButtonBuilder>();
    for (let c = 0; c < 5; c++) {
      const i = r * 5 + c;
      const isMine = mines?.has(i);
      row.addComponents(new ButtonBuilder().setCustomId(`mines:cell:${id}:${i}`).setLabel(revealed.has(i) ? (isMine ? '💣' : '💎') : '▫️').setStyle(revealed.has(i) ? ButtonStyle.Secondary : ButtonStyle.Primary).setDisabled(revealed.has(i)));
    }
    return row;
  });
  if (cashout) rows[4].addComponents(new ButtonBuilder().setCustomId(`mines:cashout:${id}`).setLabel('Cash Out 💰').setStyle(ButtonStyle.Success).setDisabled(revealed.size < 1));
  return rows;
}

const command: Command = {
  data: new SlashCommandBuilder()
    .setName('mines')
    .setDescription('Play a 5x5 mines game')
    .addStringOption(option => option.setName('amount').setDescription('Amount to bet').setRequired(true))
    .addIntegerOption(option => option.setName('mines').setDescription('Number of mines (2-20); more mines = higher multiplier').setRequired(false).setMinValue(2).setMaxValue(20)),
  async execute(interaction: ChatInputCommandInteraction) {
    if (!interaction.guildId) return;
    const raw = { amount: interaction.options.getString('amount', true), mines: interaction.options.getInteger('mines') ?? 5 };
    const { amount, mines: mineCount } = validateCommandOptions(schema, raw);
    const bet = parsePositiveAmount(amount);
    await chargeGame(interaction.user.id, interaction.guildId, bet, 'Mines');
    const currency = await getGameCurrency(interaction.guildId);
    const id = createGameSessionId(interaction.user.id);
    const revealed = new Set<number>();
    const nextMultiplier = minesMultiplier(mineCount, 1);
    minesGames.set(id, { userId: interaction.user.id, guildId: interaction.guildId, bet, mines: randomMines(mineCount, size), revealed, multiplier: 1, mineCount, expiresAt: Date.now() + 10 * 60_000 });
    await interaction.reply({
      embeds: [createDefaultEmbed().setTitle('╭─〔 💣 MINES 5×5 〕─╮').setDescription(`〢 Bet: **${formatCurrency(bet, currency.currencyEmoji)}**\n〢 Mines: **${mineCount}/25**\n〢 Current multiplier: **1.00x**\n〢 Next safe multiplier: **${nextMultiplier.toFixed(2)}x**\n〢 Gems found: **0**\n\nPick a tile. 💎 raises the payout; 💣 ends the round. More mines make the board harder and increase the multiplier.\n\n╰─〔 💰 Cash out after at least 1 safe click 〕─╯`)],
      components: minesRows(id, revealed)
    });
  }
};

export default command;

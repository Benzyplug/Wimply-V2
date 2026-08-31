import { ActionRowBuilder, ButtonBuilder, ButtonStyle, ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js';
import { z } from 'zod';
import type { Command } from '../../types/command.js';
import { createDefaultEmbed } from '../../utils/embeds.js';
import { formatCurrency, parsePositiveAmount } from '../../utils/format.js';
import { validateCommandOptions } from '../../utils/commandValidation.js';
import { chargeGame, getGameCurrency, minesGames, randomMines } from '../../services/miniGameService.js';

const schema = z.object({ amount: z.string().min(1) });
const size = 20;
const mineCount = 4;

function boardRows(id: string, revealed: Set<number>, mines?: Set<number>, includeCashout = true) {
  const rows = Array.from({ length: 5 }, (_, r) => {
    const row = new ActionRowBuilder<ButtonBuilder>();
    for (let c = 0; c < 4; c++) {
      const i = r * 4 + c;
      const isMine = mines?.has(i);
      row.addComponents(new ButtonBuilder().setCustomId(`mines:cell:${id}:${i}`).setLabel(revealed.has(i) ? (isMine ? '💣' : '💎') : '▫️').setStyle(revealed.has(i) ? ButtonStyle.Secondary : ButtonStyle.Primary).setDisabled(revealed.has(i)));
    }
    return row;
  });
  if (includeCashout) rows[4].addComponents(new ButtonBuilder().setCustomId(`mines:cashout:${id}`).setLabel('Cash Out 💰').setStyle(ButtonStyle.Success));
  return rows;
}

const command: Command = {
  data: new SlashCommandBuilder()
    .setName('mines')
    .setDescription('Play a 4x5 mines game')
    .addStringOption(option => option.setName('amount').setDescription('Amount to bet').setRequired(true)),
  async execute(interaction: ChatInputCommandInteraction) {
    if (!interaction.guildId) return;
    const { amount } = validateCommandOptions(schema, { amount: interaction.options.getString('amount', true) });
    const bet = parsePositiveAmount(amount);
    await chargeGame(interaction.user.id, interaction.guildId, bet, 'Mines');
    const currency = await getGameCurrency(interaction.guildId);
    const id = `${interaction.guildId}:${interaction.user.id}`;
    const revealed = new Set<number>();
    minesGames.set(id, { userId: interaction.user.id, guildId: interaction.guildId, bet, mines: randomMines(mineCount, size), revealed, multiplier: 1, expiresAt: Date.now() + 10 * 60_000 });
    await interaction.reply({
      embeds: [createDefaultEmbed().setTitle('╭─〔 💣 MINES 〕─╮').setDescription(`〢 Bet: **${formatCurrency(bet, currency.currencyEmoji)}**\n〢 Mines: **${mineCount}**\n〢 Multiplier: **1.00x**\n\nPick a tile. Find 💎 to raise the payout. Hit 💣 and the bet is gone.\n\n╰─〔 💰 Cash out before you get mined 〕─╯`)],
      components: boardRows(id, revealed)
    });
  }
};

export default command;

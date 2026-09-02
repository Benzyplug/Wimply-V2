import { ActionRowBuilder, ButtonBuilder, ButtonStyle, ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js';
import { z } from 'zod';
import type { Command } from '../../types/command.js';
import { createDefaultEmbed } from '../../utils/embeds.js';
import { formatCurrency, parsePositiveAmount } from '../../utils/format.js';
import { validateCommandOptions } from '../../utils/commandValidation.js';
import { chargeGame, createGameSessionId, getGameCurrency, minesGames, randomMines } from '../../services/miniGameService.js';
import { playGameSlides } from '../../utils/gameAnimation.js';

const schema = z.object({ amount: z.string().min(1), mines: z.number().int().min(1).max(24) });
const size = 25;

export function minesRows(id: string, revealed: Set<number>, mines?: Set<number>) {
  return Array.from({ length: 5 }, (_, r) => {
    const row = new ActionRowBuilder<ButtonBuilder>();
    for (let c = 0; c < 5; c++) {
      const i = r * 5 + c;
      const isMine = mines?.has(i);
      const isRevealed = revealed.has(i);
      row.addComponents(new ButtonBuilder().setCustomId(`mines:cell:${id}:${i}`).setLabel(isRevealed ? (isMine ? '💣' : '💎') : '▫️').setStyle(isRevealed ? ButtonStyle.Secondary : ButtonStyle.Primary).setDisabled(Boolean(isRevealed)));
    }
    return row;
  });
}

export function minesCashoutRow(id: string, enabled: boolean) {
  return [new ActionRowBuilder<ButtonBuilder>().addComponents(new ButtonBuilder().setCustomId(`mines:cashout:${id}`).setLabel('💰 Cash Out').setStyle(ButtonStyle.Success).setDisabled(!enabled))];
}

async function syncCashoutMessage(interaction: ChatInputCommandInteraction, id: string, enabled: boolean, fallbackDescription: string) {
  const game = minesGames.get(id);
  if (!game) return;
  if (game.cashoutMessageId && game.channelId) {
    try {
      const channel = await interaction.client.channels.fetch(game.channelId);
      if (channel?.isTextBased() && 'messages' in channel) {
        const message = await channel.messages.fetch(game.cashoutMessageId);
        await message.edit({ components: minesCashoutRow(id, enabled) });
        return;
      }
    } catch {
      game.cashoutMessageId = undefined;
    }
  }
  const sent = await interaction.followUp({
    embeds: [createDefaultEmbed().setTitle('💰 MINES • CASH OUT').setDescription(fallbackDescription)],
    components: minesCashoutRow(id, enabled),
    fetchReply: true
  });
  game.cashoutMessageId = sent.id;
}

const command: Command = {
  data: new SlashCommandBuilder()
    .setName('mines')
    .setDescription('Play a 5x5 mines game')
    .addStringOption(option => option.setName('amount').setDescription('Amount to bet').setRequired(true))
    .addIntegerOption(option => option.setName('mines').setDescription('Number of mines (1-24)').setRequired(true).setMinValue(1).setMaxValue(24)),
  async execute(interaction: ChatInputCommandInteraction) {
    if (!interaction.guildId) return;
    const raw = { amount: interaction.options.getString('amount', true), mines: interaction.options.getInteger('mines', true) };
    const { amount, mines: mineCount } = validateCommandOptions(schema, raw);
    const existing = [...minesGames.values()].find(game => game.userId === interaction.user.id && game.guildId === interaction.guildId && game.expiresAt > Date.now());
    if (existing) {
      const currency = await getGameCurrency(interaction.guildId);
      await interaction.reply({ embeds: [createDefaultEmbed().setTitle('💣 MINES — RESUMED').setDescription(`Your unfinished Mines round has been restored.\n\n💰 Bet: **${formatCurrency(existing.bet, currency.currencyEmoji)}**\n💣 Mines: **${existing.mineCount}/25**\n💎 Gems found: **${existing.revealed.size}**\n📈 Multiplier: **${existing.multiplier.toFixed(2)}×**\n💵 Cash-out value: **${formatCurrency(existing.bet * BigInt(Math.round(existing.multiplier * 100)) / 100n, currency.currencyEmoji)}**\n\nContinue on the board below.`)], components: minesRows(existing.id, existing.revealed, existing.mines) });
      await syncCashoutMessage(interaction, existing.id, existing.revealed.size > 0, `Round resumed. Reveal at least **1 safe tile** before cashing out.\n\n💎 Gems found: **${existing.revealed.size}**\n📈 Current multiplier: **${existing.multiplier.toFixed(2)}×**`);
      return;
    }
    const bet = parsePositiveAmount(amount);
    await chargeGame(interaction.user.id, interaction.guildId, bet, 'Mines');
    const currency = await getGameCurrency(interaction.guildId);
    const id = createGameSessionId(interaction.user.id);
    const revealed = new Set<number>();
    const mines = randomMines(mineCount, size);
    const game = { id, userId: interaction.user.id, guildId: interaction.guildId, channelId: interaction.channelId, bet, mines, revealed, multiplier: 1, mineCount, expiresAt: Date.now() + 10 * 60_000 };
    minesGames.set(id, game);
    await interaction.deferReply();
    const slide = (title: string, description: string, boardRevealed = revealed) => ({ embeds: [createDefaultEmbed().setTitle(title).setDescription(description)], components: minesRows(id, boardRevealed) });
    await playGameSlides([
      { content: slide('💣 MINES • BOARD LOADING', `💰 Bet: **${formatCurrency(bet, currency.currencyEmoji)}**\n💣 Mines hidden: **${mineCount}**\n\n🎲 Planting the minefield…`), delay: 260 },
      { content: slide('💣 MINES • FIELD ARMED', `💰 Bet: **${formatCurrency(bet, currency.currencyEmoji)}**\n💣 Mines: **${mineCount}/25**\n📈 Multiplier: **1.00×**\n\n🔒 The board is armed. Choose carefully.`), delay: 320 },
      { content: slide('💎 MINES 5×5', `💰 Bet: **${formatCurrency(bet, currency.currencyEmoji)}**\n💣 Mines: **${mineCount}/25**\n📈 Multiplier: **1.00×**\n💎 Gems found: **0**\n\nPick a tile. 💎 increases your cash-out value; 💣 ends the round.`), delay: 0 }
    ], async (payload) => {
      const edited = await interaction.editReply(payload);
      if (edited && typeof edited === 'object' && 'id' in edited) game.boardMessageId = String(edited.id);
    });
    await syncCashoutMessage(interaction, id, false, `Reveal at least **1 safe tile** to unlock cash out.\n\n💣 Mines: **${mineCount}/25**\n💎 Gems found: **0**\n📈 Multiplier: **1.00×**`);
  }
};

export default command;

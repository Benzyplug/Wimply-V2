import { AppError } from '../utils/errors.js';
import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, ButtonInteraction } from 'discord.js';
import { getOrCreateUser, adjustBalance } from './userService.js';
import type { TransactionType, GuildConfig } from '@prisma/client';
import { isCooldownActive, getCooldownRemaining, setCooldown } from './cooldownManager.js';
import { formatCurrency } from '../utils/format.js';
import { reactToGameResult, type GameResultKey } from '../utils/gameReactions.js';

const BLACKJACK_PAYOUT_MULTIPLIER = 1.5;
const BLACKJACK_COOLDOWN_MS = 3_000;

const activeGames = new Map<string, BlackjackGame>();

export type BlackjackAction = 'hit' | 'stand' | 'double';

export interface BlackjackGame {
  sessionId: string;
  userId: string;
  dbUserId: string;
  guildId: string;
  config: GuildConfig;
  betAmount: bigint;
  doubled: boolean;
  deck: string[];
  playerCards: string[];
  dealerCards: string[];
  status: 'playing' | 'finished';
  createdAt: Date;
  lastUpdatedAt: Date;
}

export interface BlackjackResult {
  userId: string;
  outcome: 'win' | 'lose' | 'push' | 'blackjack';
  playerValue: number;
  dealerValue: number;
  playerCards: string[];
  dealerCards: string[];
  betAmount: bigint;
  netAmount: bigint;
  tax: bigint;
  message: string;
  newWallet: bigint;
}

const suits = ['♠', '♥', '♦', '♣'];
const ranks = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

function buildDeck() {
  const deck: string[] = [];
  for (const suit of suits) for (const rank of ranks) deck.push(`${rank}${suit}`);
  return deck;
}

function shuffle(deck: string[]) {
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
}

function drawCard(deck: string[]) { return deck.pop() as string; }

function getCardValue(card: string): number {
  const rank = card.slice(0, -1);
  if (rank === 'A') return 1;
  if (['J', 'Q', 'K'].includes(rank)) return 10;
  return Number(rank);
}

function evaluateHand(cards: string[]) {
  let total = 0;
  let aces = 0;
  for (const card of cards) {
    total += getCardValue(card);
    if (card.startsWith('A')) aces += 1;
  }
  let best = total;
  for (let i = 0; i < aces; i++) {
    const candidate = total + 10 * (i + 1);
    if (candidate <= 21) best = candidate;
  }
  return { value: best, isSoft: best !== total };
}

function createSessionId() { return crypto.randomUUID(); }

function formatHand(cards: string[], hideFirst = false): string {
  if (hideFirst) return `🂠 ${cards.slice(1).join(' ')}`;
  return cards.join(' ');
}

function createActionRow(sessionId: string, canDouble: boolean, disabled = false) {
  const hitButton = new ButtonBuilder().setCustomId(`blackjack:${sessionId}:hit`).setLabel('Hit').setStyle(ButtonStyle.Primary).setDisabled(disabled);
  const standButton = new ButtonBuilder().setCustomId(`blackjack:${sessionId}:stand`).setLabel('Stand').setStyle(ButtonStyle.Success).setDisabled(disabled);
  const doubleButton = new ButtonBuilder().setCustomId(`blackjack:${sessionId}:double`).setLabel('Double').setStyle(ButtonStyle.Secondary).setDisabled(disabled || !canDouble);
  return new ActionRowBuilder<ButtonBuilder>().addComponents(hitButton, standButton, doubleButton);
}

function dealerPlays(state: BlackjackGame) {
  while (true) {
    const { value, isSoft } = evaluateHand(state.dealerCards);
    if (value >= 17 && (!isSoft || value > 17)) break;
    state.dealerCards.push(drawCard(state.deck));
  }
}

function getOutcome(state: BlackjackGame): 'win' | 'lose' | 'push' | 'blackjack' {
  const playerValue = evaluateHand(state.playerCards).value;
  const dealerValue = evaluateHand(state.dealerCards).value;
  const playerBlackjack = state.playerCards.length === 2 && playerValue === 21;
  const dealerBlackjack = state.dealerCards.length === 2 && dealerValue === 21;
  const playerBusted = playerValue > 21;
  const dealerBusted = dealerValue > 21;
  if (playerBusted) return 'lose';
  if (playerBlackjack && !dealerBlackjack) return 'blackjack';
  if (dealerBusted) return 'win';
  if (playerValue > dealerValue) return 'win';
  if (playerValue < dealerValue) return 'lose';
  return 'push';
}

export async function createBlackjackGame(userId: string, guildId: string, betAmount: bigint) {
  if (isCooldownActive(userId, 'blackjack')) {
    const remaining = getCooldownRemaining(userId, 'blackjack');
    throw new AppError(`Blackjack is still on cooldown. Try again in ${formatDuration(remaining)}.`);
  }
  for (const game of activeGames.values()) {
    if (game.userId === userId && game.status === 'playing') throw new AppError('You already have an active blackjack session. Finish it before starting a new one.');
  }
  const { user, config } = await getOrCreateUser(userId, guildId);
  if (betAmount <= 0n) throw new AppError('Bet amount must be greater than zero.');
  if (user.wallet < betAmount) throw new AppError('You do not have enough wallet balance for that bet.');
  const deck = buildDeck();
  shuffle(deck);
  const playerCards = [drawCard(deck), drawCard(deck)];
  const dealerCards = [drawCard(deck), drawCard(deck)];
  const sessionId = createSessionId();
  const game: BlackjackGame = { sessionId, userId, dbUserId: user.id, guildId, config, betAmount, doubled: false, deck, playerCards, dealerCards, status: 'playing', createdAt: new Date(), lastUpdatedAt: new Date() };
  activeGames.set(sessionId, game);
  setCooldown(userId, 'blackjack', BLACKJACK_COOLDOWN_MS);
  return { game, config };
}

function getGame(sessionId: string) {
  const game = activeGames.get(sessionId);
  if (!game) throw new AppError('This blackjack session no longer exists or has expired.');
  return game;
}

async function finalizeGame(game: BlackjackGame) {
  dealerPlays(game);
  game.status = 'finished';
  game.lastUpdatedAt = new Date();
  activeGames.delete(game.sessionId);
  const playerValue = evaluateHand(game.playerCards).value;
  const dealerValue = evaluateHand(game.dealerCards).value;
  const result = getOutcome(game);
  const guildConfig = game.config;
  let grossReturn = 0n;
  let netAmount = 0n;
  let message = '';
  if (result === 'lose') {
    netAmount = -game.betAmount;
    message = `❌ You lost ${formatCurrency(game.betAmount, guildConfig.currencyEmoji)}.`;
  } else if (result === 'push') {
    message = `🤝 Push! Your bet of ${formatCurrency(game.betAmount, guildConfig.currencyEmoji)} is returned.`;
  } else {
    grossReturn = result === 'blackjack'
      ? (game.betAmount * 150n) / 100n
      : game.betAmount * 2n;
    netAmount = grossReturn - game.betAmount;
    message = result === 'blackjack'
      ? `🃏 Blackjack! You won ${formatCurrency(netAmount, guildConfig.currencyEmoji)}.`
      : `🎉 You won ${formatCurrency(netAmount, guildConfig.currencyEmoji)}.`;
  }
  const updatedUser = await adjustBalance(game.dbUserId, { walletDelta: netAmount }, {
    source: 'blackjack', amount: netAmount, type: 'BALANCE' as TransactionType, description: `Blackjack ${result}`
  });
  return {
    userId: game.userId, outcome: result, playerValue, dealerValue,
    playerCards: game.playerCards, dealerCards: game.dealerCards,
    betAmount: game.betAmount, netAmount, tax: 0n, message, newWallet: updatedUser.wallet
  };
}

export async function handleBlackjackAction(sessionId: string, action: BlackjackAction, userId: string) {
  const game = getGame(sessionId);
  if (game.userId !== userId) throw new AppError('Only the player who started this game can control it.');
  if (game.status !== 'playing') throw new AppError('This blackjack session has already finished.');
  if (action === 'double') {
    if (game.doubled) throw new AppError('You may only double once.');
    if (game.playerCards.length !== 2) throw new AppError('You can only double on your first move.');
    game.betAmount *= 2n;
    game.doubled = true;
    game.playerCards.push(drawCard(game.deck));
    return finalizeGame(game);
  }
  if (action === 'hit') {
    game.playerCards.push(drawCard(game.deck));
    game.lastUpdatedAt = new Date();
    if (evaluateHand(game.playerCards).value > 21) return finalizeGame(game);
    return null;
  }
  if (action === 'stand') return finalizeGame(game);
  throw new AppError('Unknown blackjack action.');
}

export function buildBlackjackEmbed(game: BlackjackGame, config: { currencyEmoji: string }) {
  const playerValue = evaluateHand(game.playerCards).value;
  return new EmbedBuilder()
    .setTitle('Blackjack')
    .setDescription(`Bet: ${formatCurrency(game.betAmount, config.currencyEmoji)}${game.doubled ? ' • Doubled' : ''}`)
    .addFields(
      { name: 'Your Hand', value: `${formatHand(game.playerCards)} (${playerValue})`, inline: false },
      { name: 'Dealer Hand', value: formatHand(game.dealerCards, true), inline: false }
    )
    .setFooter({ text: 'Hit, Stand, or Double to play.' });
}

export function buildResultEmbed(result: BlackjackResult, config: { currencyEmoji: string }) {
  return new EmbedBuilder()
    .setTitle(result.outcome === 'lose' ? 'Blackjack Loss' : result.outcome === 'push' ? 'Push' : 'Blackjack Win')
    .setDescription(result.message)
    .addFields(
      { name: 'Your Hand', value: `${formatHand(result.playerCards)} (${result.playerValue})`, inline: false },
      { name: 'Dealer Hand', value: `${formatHand(result.dealerCards)} (${result.dealerValue})`, inline: false },
      { name: 'Wallet Change', value: formatCurrency(result.netAmount, config.currencyEmoji), inline: true },
      { name: 'New Wallet', value: formatCurrency(result.newWallet, config.currencyEmoji), inline: true }
    );
}

export async function handleBlackjackButtonInteraction(interaction: ButtonInteraction) {
  const [prefix, sessionId, action] = interaction.customId.split(':');
  if (prefix !== 'blackjack' || !sessionId || !action) throw new AppError('Invalid blackjack button interaction.');
  if (!['hit', 'stand', 'double'].includes(action)) throw new AppError('Invalid blackjack action.');
  const gameBeforeAction = activeGames.get(sessionId);
  const currencyEmoji = gameBeforeAction?.config.currencyEmoji ?? '🪙';
  const result = await handleBlackjackAction(sessionId, action as BlackjackAction, interaction.user.id);
  if (!result) {
    const game = activeGames.get(sessionId);
    if (!game) throw new AppError('Blackjack session expired.');
    await interaction.update({ embeds: [buildBlackjackEmbed(game, { currencyEmoji: game.config.currencyEmoji })], components: [createActionRow(sessionId, !game.doubled, false)] });
    return null;
  }
  await interaction.update({ embeds: [buildResultEmbed(result, { currencyEmoji })], components: [createActionRow(sessionId, false, true)] });
  const reactionKey: GameResultKey = result.outcome === 'blackjack' ? 'BLACKJACK_BLACKJACK' : result.outcome === 'win' ? 'BLACKJACK_WIN' : result.outcome === 'push' ? 'BLACKJACK_PUSH' : 'BLACKJACK_LOSS';
  const resultMessage = await interaction.fetchReply().catch(() => null);
  await reactToGameResult(resultMessage, reactionKey);
  return result;
}

export { createActionRow, activeGames };

function formatDuration(ms: number) {
  const seconds = Math.ceil(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const remainingSeconds = seconds % 60;
  const remainingMinutes = minutes % 60;
  if (hours) return `${hours}h ${remainingMinutes}m ${remainingSeconds}s`;
  if (minutes) return `${remainingMinutes}m ${remainingSeconds}s`;
  return `${seconds}s`;
}

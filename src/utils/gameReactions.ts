import type { Message } from 'discord.js';
import { log } from './logger.js';

export const GAME_RESULT_REACTIONS = {
  BLACKJACK_WIN: '🎉',
  BLACKJACK_BLACKJACK: '🥳',
  BLACKJACK_LOSS: '😔',
  BLACKJACK_PUSH: '🤝',
  COINFLIP_WIN: '🎉',
  COINFLIP_LOSS: '😭',
  DICE_WIN: '🎉',
  DICE_LOSS: '😔',
  SLOT_JACKPOT: '🥳',
  SLOT_WIN: '🎉',
  SLOT_LOSS: '😔',
  HIGHER_LOWER_WIN: '📈',
  HIGHER_LOWER_LOSS: '📉',
  MINES_SAFE: '💎',
  MINES_HIT: '💣',
  MINES_CASHOUT: '💰',
  SNAIL_WIN: '🐌',
  SNAIL_LOSS: '🌱'
} as const;

export type GameResultKey = keyof typeof GAME_RESULT_REACTIONS;

export async function reactToGameResult(message: Message | null | undefined, key: GameResultKey) {
  if (!message) return;

  const emoji = GAME_RESULT_REACTIONS[key];

  try {
    await message.react(emoji);
  } catch (error) {
    log.warn(
      `Failed to react with ${emoji} for result ${key}: ${error instanceof Error ? error.message : String(error)}`,
      'GameReactions'
    );
  }
}

import type { Message } from 'discord.js';
import { log } from './logger.js';

/**
 * Deterministic result -> emoji map for the bot reacting to its own game
 * result messages. No AI/sentiment analysis involved - the game code already
 * knows exactly what happened, so it just picks a key from this list.
 *
 * Add new keys here as more games/results are added; nothing else needs to
 * change to support them.
 */
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
  SLOT_LOSS: '😔'
} as const;

export type GameResultKey = keyof typeof GAME_RESULT_REACTIONS;

/**
 * React to the bot's own result message with the emoji matching `key`.
 * Never throws - a failed reaction (missing permission, deleted message,
 * etc.) should never break the surrounding command.
 */
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

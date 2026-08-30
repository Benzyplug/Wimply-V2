import type { Message } from 'discord.js';
import { getMatchingReactionRules } from '../services/reactionService.js';
import { log } from '../utils/logger.js';

export default {
  name: 'messageCreate',
  once: false,

  async execute(message: Message) {
    if (!message.guildId || message.author.bot || !message.content.trim()) return;

    try {
      const rules = await getMatchingReactionRules(message.guildId, message.channelId, message.content);
      if (rules.length === 0) return;

      for (const rule of rules) {
        try {
          await message.react(rule.emoji);
        } catch (error) {
          log.warn(
            `Failed to react with ${rule.emoji} for rule ${rule.id}: ${error instanceof Error ? error.message : String(error)}`,
            'Reaction'
          );
        }
      }
    } catch (error) {
      log.error('Failed to process automatic message reactions', 'Reaction', error);
    }
  }
};

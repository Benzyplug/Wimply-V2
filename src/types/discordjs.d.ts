import type { MessageCreateOptions, MessagePayload } from 'discord.js';

declare module 'discord.js' {
  interface PartialGroupDMChannel {
    send(options: string | MessagePayload | MessageCreateOptions): Promise<import('discord.js').Message>;
  }
}

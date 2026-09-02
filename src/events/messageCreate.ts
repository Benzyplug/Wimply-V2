import { EmbedBuilder } from 'discord.js';
import type { Message, MessageReplyOptions } from 'discord.js';
import type { Command } from '../types/command.js';
import { reactToMatchingMessage } from '../services/reactionService.js';
import { awardXp, getOrCreateUser } from '../services/userService.js';
import { log } from '../utils/logger.js';
import { handleInteractionError } from '../utils/errorHandler.js';
import { getBotBanner, getWimplyLogo, getWimply404Image, polishPayload, STYLE } from '../utils/presentation.js';

const PREFIXES = ['#', '!'];

const ALIASES: Record<string, string> = {
  hl: 'higherlower', higher: 'higherlower', lower: 'higherlower', sg: 'snailgarden', snail: 'snailgarden',
  bj: 'blackjack', cf: 'coinflip', lb: 'leaderboard', inv: 'inventory', bal: 'balance', p: 'profile', sh: 'shop',
  '8b': 'eightball', r: 'roll', pick: 'choose', f: 'fortune', nw: 'networth', avi: 'aviator', av: 'aviator',
  ach: 'achievements', pbg: 'profilebackground', ccr: 'chickencrossroad', chicken: 'chickencrossroad',
};

const GAMBLE_USAGE: Record<string, string> = {
  mines: '**MINES USAGE**\nYou need a wager and mine count.\nTry: `#mines 1000 5`\nMine count: **1-24**.',
  aviator: '**AVIATOR USAGE**\nYou need a wager.\nTry: `#aviator 1000`',
  blackjack: '**BLACKJACK USAGE**\nYou need a wager.\nTry: `#blackjack 1000`',
  coinflip: '**COINFLIP USAGE**\nYou need a wager and a choice.\nTry: `#coinflip 1000 heads`',
  dice: '**DICE USAGE**\nYou need a wager.\nTry: `#dice 1000`',
  higherlower: '**HIGHER / LOWER USAGE**\nYou need a wager.\nTry: `#hl 1000`',
  slot: '**SLOT USAGE**\nYou need a wager.\nTry: `#slot 1000`',
  snailgarden: '**SNAIL GARDEN USAGE**\nYou need a wager and snail count.\nTry: `#sg 1000 1`',
  chickencrossroad: '**CHICKEN CROSS ROAD USAGE**\nYou need a wager.\nTry: `#ccr 1000`',
};

const xpCooldown = new Map<string, number>();

type PrefixOption = { type: number; name: string; required?: boolean; options?: PrefixOption[] };
type PrefixCommandJson = { name: string; options?: PrefixOption[] };
type PrefixAdapterState = { interaction: Parameters<Command['execute']>[0]; getReply: () => Message | null };

function baseEmbed(title: string, description: string): EmbedBuilder {
  const embed = new EmbedBuilder().setColor(0x5865f2).setTitle(title).setDescription(description).setTimestamp().setFooter({ text: STYLE.brand });
  if (title.toUpperCase().includes('UNKNOWN COMMAND')) embed.setImage(getWimply404Image());
  return embed;
}

function prefixErrorEmbed(message: Message, description: string): EmbedBuilder {
  return baseEmbed(`${getWimplyLogo(message.guild)} COMMAND INPUT`, description).setImage(getBotBanner(message.client.user));
}

function tokenize(input: string): string[] { return input.split(/\s+/).filter(Boolean); }
function isUserToken(value: string | undefined): boolean { return Boolean(value && (/^<@!?\d{15,22}>$/.test(value) || /^\d{15,22}$/.test(value))); }

function resolveCommandShape(command: Command, tokens: string[]) {
  const json = command.data.toJSON() as unknown as PrefixCommandJson;
  let options = json.options ?? [];
  let index = 0;
  let subcommand: string | undefined;
  let subcommandGroup: string | undefined;
  const first = options[0];
  if (first?.type === 2) {
    subcommandGroup = tokens[index]?.toLowerCase(); index += 1;
    const group = first.options?.find(option => option.name === subcommandGroup);
    options = group?.options ?? [];
    subcommand = tokens[index]?.toLowerCase(); index += 1;
    options = options.find(option => option.name === subcommand)?.options ?? [];
  } else if (first?.type === 1) {
    subcommand = tokens[index]?.toLowerCase(); index += 1;
    options = options.find(option => option.name === subcommand)?.options ?? [];
  }
  const values = new Map<string, string>();
  for (const option of options.filter(option => option.type >= 3)) {
    const value = tokens[index];
    if (value === undefined) break;
    if (option.type === 6 && !isUserToken(value)) continue;
    values.set(option.name, value); index += 1;
  }
  return { values, subcommand, subcommandGroup };
}

function resolveUser(message: Message, value?: string) {
  if (!value) return null;
  const mention = value.match(/^<@!?([0-9]+)>$/);
  const id = mention?.[1] ?? value;
  return message.client.users.cache.get(id) ?? message.mentions.users.get(id) ?? null;
}
function resolveChannel(message: Message, value?: string) {
  if (!value || !message.guild) return null;
  const mention = value.match(/^<#([0-9]+)>$/);
  const id = mention?.[1] ?? value;
  return message.guild.channels.cache.get(id) ?? null;
}
function resolveRole(message: Message, value?: string) {
  if (!value || !message.guild) return null;
  const mention = value.match(/^<@&([0-9]+)>$/);
  const id = mention?.[1] ?? value;
  return message.guild.roles.cache.get(id) ?? null;
}

function buildPrefixInteraction(message: Message, command: Command, tokens: string[]): PrefixAdapterState {
  const { values, subcommand, subcommandGroup } = resolveCommandShape(command, tokens);
  const commandName = command.data.toJSON().name;
  let sent: Message | null = null;
  let deferred = false;
  const getValue = (name: string, required = false): string | undefined => {
    const value = values.get(name);
    if (required && value === undefined) {
      const usage = GAMBLE_USAGE[commandName];
      if (usage) throw new Error(`INPUT_USAGE:${usage}`);
      throw new Error(`Missing required argument: **${name}**`);
    }
    return value;
  };
  const options = {
    getString: (name: string, required = false) => { const value = getValue(name, required); if (value === undefined) return null; if (commandName === 'coinflip' && name === 'choice') { const normalized = value.toLowerCase(); if (normalized === 'h' || normalized === 'head' || normalized === 'heads') return 'heads'; if (normalized === 't' || normalized === 'tail' || normalized === 'tails') return 'tails'; } return value; },
    getInteger: (name: string, required = false) => { const value = getValue(name, required); return value === undefined ? null : Number.parseInt(value, 10); },
    getNumber: (name: string, required = false) => { const value = getValue(name, required); return value === undefined ? null : Number.parseFloat(value); },
    getBoolean: (name: string, required = false) => { const value = getValue(name, required); return value === undefined ? null : value.toLowerCase() === 'true'; },
    getUser: (name: string, required = false) => { const user = resolveUser(message, getValue(name, required)); if (required && !user) throw new Error(`Could not find user for **${name}**.`); return user; },
    getChannel: (name: string, required = false) => { const channel = resolveChannel(message, getValue(name, required)); if (required && !channel) throw new Error(`Could not find channel for **${name}**.`); return channel; },
    getRole: (name: string, required = false) => { const role = resolveRole(message, getValue(name, required)); if (required && !role) throw new Error(`Could not find role for **${name}**.`); return role; },
    getMentionable: (name: string, required = false) => { const value = getValue(name, required); return resolveUser(message, value) ?? resolveRole(message, value); },
    getSubcommand: (required = true) => { if (required && !subcommand) throw new Error('Missing required subcommand.'); return subcommand ?? null; },
    getSubcommandGroup: (required = false) => { if (required && !subcommandGroup) throw new Error('Missing required subcommand group.'); return subcommandGroup ?? null; },
  };
  const adapter = {
    user: message.author, member: message.member, guild: message.guild, guildId: message.guildId, channel: message.channel,
    client: message.client, memberPermissions: message.member?.permissions ?? null, options,
    isPrefixCommand: true,
    get replied() { return sent !== null; }, get deferred() { return deferred; },
    isRepliable: () => true, isChatInputCommand: () => true,
    deferReply: async () => { deferred = true; },
    reply: async (payload: string | MessageReplyOptions) => { sent = await message.reply(polishPayload(payload as any, message.client.user) as any); deferred = false; return sent; },
    editReply: async (payload: string | MessageReplyOptions) => { const polished = polishPayload(payload as any, message.client.user) as any; sent = sent ? await sent.edit(polished) : await message.reply(polished); deferred = false; return sent; },
    followUp: async (payload: string | MessageReplyOptions) => { sent = await message.reply(polishPayload(payload as any, message.client.user) as any); return sent; },
    deleteReply: async () => { if (sent) await sent.delete(); },
  };
  return { interaction: adapter as unknown as Parameters<Command['execute']>[0], getReply: () => sent };
}

async function reactToPrefixReply(message: Message, triggerContent: string, reply: Message | null) {
  if (!reply || !message.guildId) return;
  await reactToMatchingMessage(reply, message.guildId, message.channelId, `${triggerContent}\n${reply.embeds.map(embed => `${embed.title ?? ''} ${embed.description ?? ''}`).join(' ')}`);
}

function getHelpText(prefix: string, commands: string[]): string {
  const groups: Array<[string, string[]]> = [
    ['ECONOMY', ['balance','beg','crime','daily','deposit','leaderboard','monthly','networth','pay','rob','weekly','withdraw','work']],
    ['GAMES', ['aviator','blackjack','coinflip','dice','higherlower','mines','slot','snailgarden','chickencrossroad']],
    ['INVENTORY', ['inventory','give','drop','use','shop','buy','sell']],
    ['SOCIAL', ['achievements','aura','choose','eightball','fortune','profile','profilebackground','roll','ship']],
    ['SERVER', ['config','dashboard','economy','item','xp','level']],
    ['WIMPLY', ['bot','owner','ping','help']],
  ];
  return groups.map(([title, names]) => { const available = names.filter(name => commands.includes(name)); if (!available.length) return ''; return `**${title}**\n${available.map(name => `\`${prefix}${name}\`  **/${name}**`).join('\n')}`; }).filter(Boolean).join('\n\n');
}

async function handlePrefix(message: Message): Promise<boolean> {
  const content = message.content.trim();
  const prefix = PREFIXES.find(candidate => content.startsWith(candidate));
  if (!prefix) return false;
  const tokens = tokenize(content.slice(prefix.length).trim());
  const rawName = tokens.shift()?.toLowerCase();
  if (!rawName) return false;
  const name = ALIASES[rawName] ?? rawName;
  if (name === 'help' || name === 'commands') {
    const commands = message.client.commands ? [...message.client.commands.keys()].sort() : [];
    const description = `${getHelpText(prefix, commands)}\n\n**Quick start**\n\`${prefix}balance\`  ·  \`${prefix}daily\`  ·  \`${prefix}work\`\n\`${prefix}pay @user 1000\`  ·  \`${prefix}mines 1000 5\`  ·  \`${prefix}aviator 1000\`  ·  \`${prefix}ccr 1000\``;
    const reply = await message.reply({ embeds: [baseEmbed(`${getWimplyLogo(message.guild)} WIMPLY HELP`, description)] });
    await reactToPrefixReply(message, content, reply); return true;
  }
  const command = message.client.commands?.get(name);
  if (!command) {
    const reply = await message.reply({ embeds: [baseEmbed(`${getWimplyLogo(message.guild)} UNKNOWN COMMAND`, `\`${prefix}${rawName}\` is not a Wimply command.\nRun \`${prefix}help\` to open help.`)] });
    await reactToPrefixReply(message, content, reply); return true;
  }
  let state: PrefixAdapterState | null = null;
  try {
    state = buildPrefixInteraction(message, command, tokens);
    await command.execute(state.interaction);
  } catch (error) {
    const commandName = command.data.toJSON().name;
    const rawMessage = error instanceof Error ? error.message : `Unable to process ${commandName}.`;
    const explicitUsage = rawMessage.startsWith('INPUT_USAGE:') ? rawMessage.slice('INPUT_USAGE:'.length) : undefined;
    const isInputError = Boolean(explicitUsage) || rawMessage.startsWith('Missing required argument:') || rawMessage.startsWith('Could not find ');
    if (isInputError) {
      const reply = await message.reply({ embeds: [prefixErrorEmbed(message, explicitUsage ?? rawMessage)] });
      await reactToPrefixReply(message, content, reply); return true;
    }
    if (state) await handleInteractionError(state.interaction, error);
    else {
      const reply = await message.reply({ embeds: [prefixErrorEmbed(message, `Unable to process **${commandName}**.`)] });
      await reactToPrefixReply(message, content, reply);
    }
    return true;
  }
  await reactToPrefixReply(message, content, state.getReply()); return true;
}

export default {
  name: 'messageCreate',
  once: false,
  async execute(message: Message) {
    if (!message.guildId || message.author.bot || !message.content.trim()) return;
    try {
      await handlePrefix(message);
      const key = `${message.guildId}:${message.author.id}`;
      const now = Date.now();
      if ((xpCooldown.get(key) ?? 0) <= now) {
        xpCooldown.set(key, now + 30_000);
        const before = await getOrCreateUser(message.author.id, message.guildId);
        const oldLevel = before.user.level;
        const updated = await awardXp(message.author.id, message.guildId, before.config.xpPerMessage || 5);
        if (updated && updated.level > oldLevel && before.config.levelUpEnabled) {
          const text = before.config.levelUpMessage.replace(/\{user\}/g, `<@${message.author.id}>`).replace(/\{level\}/g, String(updated.level));
          const notification = baseEmbed(`${getWimplyLogo(message.guild)} LEVEL UP`, text).setImage(getBotBanner(message.client.user));
          await (message.channel as unknown as { send: (payload: { embeds: EmbedBuilder[] }) => Promise<unknown> }).send({ embeds: [notification] });
        }
      }
    } catch (error) {
      log.error('Failed to process message/prefix automation', 'MessageCreate', error);
    }
  },
};

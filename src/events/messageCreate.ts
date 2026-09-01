import { EmbedBuilder, Colors } from 'discord.js';
import type { Message, MessageReplyOptions } from 'discord.js';
import type { Command } from '../types/command.js';
import { reactToMatchingMessage } from '../services/reactionService.js';
import { log } from '../utils/logger.js';
import { handleInteractionError } from '../utils/errorHandler.js';
import { polishPayload, STYLE } from '../utils/presentation.js';

const PREFIXES = ['#', '!'];

type PrefixOption = { type: number; name: string; required?: boolean; options?: PrefixOption[] };
type PrefixCommandJson = { name: string; options?: PrefixOption[] };

type PrefixAdapterState = {
  interaction: Parameters<Command['execute']>[0];
  getReply: () => Message | null;
};

function baseEmbed(title: string, description: string) {
  return new EmbedBuilder().setColor(Colors.Blurple).setTitle(title).setDescription(description).setTimestamp();
}

function tokenize(input: string) {
  const matches = input.match(/"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|\S+/g) ?? [];
  return matches.map(token => (token.startsWith('"') || token.startsWith("'")) ? token.slice(1, -1) : token);
}

function resolveCommandShape(command: Command, tokens: string[]) {
  const json = command.data.toJSON() as unknown as PrefixCommandJson;
  let options = json.options ?? [];
  let index = 0;
  let subcommand: string | undefined;
  let subcommandGroup: string | undefined;
  const first = options[index];

  if (first?.type === 2) {
    subcommandGroup = tokens[index]?.toLowerCase();
    index += 1;
    const group = first.options?.find(option => option.name === subcommandGroup);
    options = group?.options ?? [];
    subcommand = tokens[index]?.toLowerCase();
    index += 1;
    options = options.find(option => option.name === subcommand)?.options ?? [];
  } else if (first?.type === 1) {
    subcommand = tokens[index]?.toLowerCase();
    index += 1;
    options = options.find(option => option.name === subcommand)?.options ?? [];
  }

  const values = new Map<string, string>();
  for (const option of options.filter(option => option.type >= 3)) {
    const value = tokens[index];
    if (value !== undefined) {
      values.set(option.name, value);
      index += 1;
    }
  }
  return { values, subcommand, subcommandGroup };
}

function resolveUser(message: Message, value?: string) {
  if (!value) return null;
  const id = value.match(/^<@!?([0-9]+)>$/)?.[1] ?? value;
  return message.client.users.cache.get(id) ?? message.mentions.users.get(id) ?? null;
}

function resolveChannel(message: Message, value?: string) {
  if (!value || !message.guild) return null;
  const id = value.match(/^<#([0-9]+)>$/)?.[1] ?? value;
  return message.guild.channels.cache.get(id) ?? null;
}

function resolveRole(message: Message, value?: string) {
  if (!value || !message.guild) return null;
  const id = value.match(/^<@&([0-9]+)>$/)?.[1] ?? value;
  return message.guild.roles.cache.get(id) ?? null;
}

function buildPrefixInteraction(message: Message, command: Command, tokens: string[]): PrefixAdapterState {
  const { values, subcommand, subcommandGroup } = resolveCommandShape(command, tokens);
  let sent: Message | null = null;
  let deferred = false;
  const getValue = (name: string, required = false) => {
    const value = values.get(name);
    if (required && value === undefined) throw new Error(`Missing required argument: **${name}**`);
    return value;
  };

  const options = {
    getString: (name: string, required = false) => getValue(name, required) ?? null,
    getInteger: (name: string, required = false) => { const value = getValue(name, required); return value === undefined ? null : Number.parseInt(value, 10); },
    getNumber: (name: string, required = false) => { const value = getValue(name, required); return value === undefined ? null : Number.parseFloat(value); },
    getBoolean: (name: string, required = false) => { const value = getValue(name, required); return value === undefined ? null : value.toLowerCase() === 'true'; },
    getUser: (name: string, required = false) => { const user = resolveUser(message, getValue(name, required)); if (required && !user) throw new Error(`Could not find user for **${name}**.`); return user; },
    getChannel: (name: string, required = false) => { const channel = resolveChannel(message, getValue(name, required)); if (required && !channel) throw new Error(`Could not find channel for **${name}**.`); return channel; },
    getRole: (name: string, required = false) => { const role = resolveRole(message, getValue(name, required)); if (required && !role) throw new Error(`Could not find role for **${name}**.`); return role; },
    getMentionable: (name: string, required = false) => { const value = getValue(name, required); return resolveUser(message, value) ?? resolveRole(message, value); },
    getSubcommand: (required = true) => { if (required && !subcommand) throw new Error('Missing required subcommand.'); return subcommand ?? null; },
    getSubcommandGroup: (required = false) => { if (required && !subcommandGroup) throw new Error('Missing required subcommand group.'); return subcommandGroup ?? null; }
  };

  const adapter = {
    user: message.author,
    member: message.member,
    guild: message.guild,
    guildId: message.guildId,
    channel: message.channel,
    client: message.client,
    memberPermissions: message.member?.permissions ?? null,
    options,
    get replied() { return sent !== null; },
    get deferred() { return deferred; },
    isRepliable: () => true,
    isChatInputCommand: () => true,
    deferReply: async () => { deferred = true; },
    reply: async (payload: string | MessageReplyOptions) => { sent = await message.reply(polishPayload(payload as any, message.client.user) as any); deferred = false; return sent; },
    editReply: async (payload: string | MessageReplyOptions) => { const polished = polishPayload(payload as any, message.client.user) as any; sent = sent ? await sent.edit(polished) : await message.reply(polished); deferred = false; return sent; },
    followUp: async (payload: string | MessageReplyOptions) => { sent = await message.reply(polishPayload(payload as any, message.client.user) as any); return sent; },
    deleteReply: async () => { if (sent) await sent.delete(); }
  };

  return {
    interaction: adapter as unknown as Parameters<Command['execute']>[0],
    getReply: () => sent
  };
}

async function reactToPrefixReply(message: Message, triggerContent: string, reply: Message | null) {
  const guildId = message.guildId;
  if (!reply || !guildId) return;
  await reactToMatchingMessage(reply, guildId, message.channelId, triggerContent);
}

async function handlePrefix(message: Message): Promise<boolean> {
  const content = message.content.trim();
  const prefix = PREFIXES.find(candidate => content.startsWith(candidate));
  if (!prefix) return false;
  const tokens = tokenize(content.slice(prefix.length).trim());
  const name = tokens.shift()?.toLowerCase();
  if (!name) return false;

  if (name === 'help' || name === 'commands') {
    const commands = message.client.commands ? [...message.client.commands.keys()].sort() : [];
    const grouped = commands.length ? commands.map(command => `• \`${prefix}${command}\``).join('\n') : '• No commands loaded.';
    const reply = await message.reply({ embeds: [baseEmbed(STYLE.title('📖', 'Wimply Command Center'), `〢 **Prefix:** \`#\` or \`!\`\n〢 **Slash:** \`/\`\n〢 **Loaded:** **${commands.length}** commands\n\n${grouped}\n\n${STYLE.bottom('⚡', 'Prefix and slash interfaces share the same command logic')}`)] });
    await reactToPrefixReply(message, content, reply);
    return true;
  }

  const command = message.client.commands?.get(name);
  if (!command) {
    const reply = await message.reply({ embeds: [baseEmbed(STYLE.title('❔', 'Unknown Command'), `〢 \`${prefix}${name}\` is not a Wimply command.\n〢 Run \`${prefix}help\` to open the command center.\n\n${STYLE.bottom('🧭', 'Use # for prefix commands')}`)] });
    await reactToPrefixReply(message, content, reply);
    return true;
  }

  const state = buildPrefixInteraction(message, command, tokens);
  try {
    await command.execute(state.interaction);
  } catch (error) {
    await handleInteractionError(state.interaction, error);
  }

  await reactToPrefixReply(message, content, state.getReply());
  return true;
}

export default {
  name: 'messageCreate',
  once: false,
  async execute(message: Message) {
    if (!message.guildId || message.author.bot || !message.content.trim()) return;
    try {
      await handlePrefix(message);
    } catch (error) {
      log.error('Failed to process message/prefix automation', 'MessageCreate', error);
    }
  }
};
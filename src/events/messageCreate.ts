import { EmbedBuilder, Colors } from 'discord.js';
import type { Message } from 'discord.js';
import { getMatchingReactionRules } from '../services/reactionService.js';
import { getOrCreateUser } from '../services/userService.js';
import { getBalance } from '../services/economyService.js';
import { log } from '../utils/logger.js';
import { formatCurrency } from '../utils/format.js';

const PREFIX = '#';
const FOOTER = 'Wimply V2.0 • Built by SHAX ⚡';

function baseEmbed(title: string, description: string) {
  return new EmbedBuilder()
    .setColor(Colors.Blurple)
    .setTitle(title)
    .setDescription(description)
    .setTimestamp()
    .setFooter({ text: FOOTER });
}

async function handlePrefix(message: Message): Promise<boolean> {
  const content = message.content.trim();
  if (!content.startsWith(PREFIX)) return false;

  const [rawName, ...args] = content.slice(PREFIX.length).trim().split(/\s+/);
  const name = rawName?.toLowerCase();
  if (!name) return false;

  if (name === 'help' || name === 'commands') {
    await message.reply({
      embeds: [baseEmbed(
        '╭─〔 📖 WIMPLY PREFIX 〕─╮',
        '〢 Prefix mode is enabled with `#`.' +
        '\n\n**Core**\n`#help` • `#ping` • `#balance` • `#profile` • `#owner`' +
        '\n\n**Slash mode**\nEvery registered slash command remains available with `/`.' +
        '\n\n╰─〔 ⚡ More prefix aliases can be added without changing slash commands 〕─╯'
      )]
    });
    return true;
  }

  if (name === 'ping') {
    const sent = await message.reply({ embeds: [baseEmbed('╭─〔 🏓 PING 〕─╮', '〢 Measuring Wimply latency…')] });
    const latency = sent.createdTimestamp - message.createdTimestamp;
    await sent.edit({ embeds: [baseEmbed('╭─〔 🏓 PONG 〕─╮', `〢 **Latency:** ${latency}ms\n〢 **Gateway:** ${message.client.ws.ping}ms\n〢 **Status:** 🟢 Online`)] });
    return true;
  }

  if (!message.guildId) return true;

  if (name === 'balance' || name === 'bal' || name === 'cash') {
    const target = message.mentions.users.first() ?? message.author;
    const { user, config } = await getBalance(target.id, message.guildId);
    await message.reply({
      embeds: [baseEmbed(
        `╭─〔 🪙 ${target.username.toUpperCase()}'S BALANCE 〕─╮`,
        `〢 **Wallet:** ${formatCurrency(user.wallet, config.currencyEmoji)}\n` +
        `〢 **Bank:** ${formatCurrency(user.bank, config.currencyEmoji)}\n` +
        `〢 **Total:** ${formatCurrency(user.wallet + user.bank, config.currencyEmoji)}\n\n` +
        `╰─〔 ⭐ Level ${user.level} • ${user.xp} XP 〕─╯`
      )]
    });
    return true;
  }

  if (name === 'profile' || name === 'prof') {
    const target = message.mentions.users.first() ?? message.author;
    const { user, config } = await getOrCreateUser(target.id, message.guildId);
    const embed = baseEmbed(
      `╭─〔 👤 ${target.username.toUpperCase()}'S PROFILE 〕─╮`,
      `〢 **Currency:** ${config.currencyEmoji} ${config.currencyName}\n` +
      `〢 **Level:** ${user.level}\n〢 **XP:** ${user.xp}\n` +
      `〢 **Badges:** ${user.badges.length ? user.badges.join(' • ') : 'None'}\n\n` +
      `╰─〔 🪙 ${formatCurrency(user.wallet + user.bank, config.currencyEmoji)} total 〕─╯`
    ).setThumbnail(target.displayAvatarURL({ size: 256 }));
    await message.reply({ embeds: [embed] });
    return true;
  }

  if (name === 'owner') {
    await message.reply({
      embeds: [baseEmbed(
        '╭─〔 👑 WIMPLY OWNER 〕─╮',
        '〢 **Name:** Benzy\n〢 **Alias:** SHAX\n〢 **Role:** Founder & Developer\n\n' +
        '〢 **Stack:** TypeScript • Node.js • Prisma\n〢 **Focus:** Discord bots & automation\n\n' +
        '🔐 **Private demo fields**\n〢 Email: `owner@wimply.example`\n〢 Phone: `+234 800 000 0000`\n\n' +
        '╰─〔 ⚡ Fictional demo details 〕─╯'
      ).setThumbnail(message.client.user?.displayAvatarURL({ size: 256 }) ?? null)]
    });
    return true;
  }

  if (args.length === 0 && message.client.commands?.has(name)) {
    await message.reply({
      embeds: [baseEmbed('╭─〔 💬 PREFIX READY 〕─╮', `〢 \`#${name}\` is recognized. Use \`/${name}\` for the full interactive version.`)]
    });
    return true;
  }

  return false;
}

export default {
  name: 'messageCreate',
  once: false,

  async execute(message: Message) {
    if (!message.guildId || message.author.bot || !message.content.trim()) return;

    try {
      const handled = await handlePrefix(message);
      if (handled) return;

      const rules = await getMatchingReactionRules(message.guildId, message.channelId, message.content);
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
      log.error('Failed to process message/prefix automation', 'MessageCreate', error);
    }
  }
};

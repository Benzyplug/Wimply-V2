import { EmbedBuilder, Colors } from 'discord.js';
import type { ChatInputCommandInteraction, ButtonInteraction } from 'discord.js';
import { AppError } from './errors.js';
import { log } from './logger.js';

const VERSION = 'Wimply V2.1.1';
const BRAND = '╰─〔 ⚡ 〢 Made by ẞ€ÑZ¥ 〢 ⚡ 〕─╯';

function getLogo(interaction: ChatInputCommandInteraction | ButtonInteraction): string {
  return interaction.guild?.emojis.cache.find(emoji => emoji.name === 'Wimply_logo')?.toString() ?? '⚡';
}

function errorEmbed(message: string, banner: string | null, logo: string) {
  const embed = new EmbedBuilder()
    .setColor(Colors.Red)
    .setTitle(`╭─〔 ${logo} WIMPLY ERROR 〕─╮`)
    .setDescription(`〢 **What happened**\n${message}\n\n╭〔 🛠️ Recovery 〕╮\n〢 Check the command arguments and try again.\n〢 Use **/help** or **#help** for the command center.\n╰─〔 ⚡ 〢 Made by ẞ€ÑZ¥ 〢 ⚡ 〕─╯`)
    .setTimestamp()
    .setFooter({ text: VERSION });
  if (banner) embed.setImage(banner);
  return embed;
}

function parseCountdown(message: string): number | null {
  const match = message.match(/Try again in (?:(\d+)h )?(?:(\d+)m )?(?:(\d+)s)?\.?/i);
  if (!match) return null;
  const hours = Number(match[1] ?? 0);
  const minutes = Number(match[2] ?? 0);
  const seconds = Number(match[3] ?? 0);
  const total = ((hours * 60 + minutes) * 60 + seconds) * 1000;
  return total > 0 ? total : null;
}

function formatCountdown(ms: number): string {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (hours) return `${hours}h ${minutes}m ${seconds}s`;
  if (minutes) return `${minutes}m ${seconds}s`;
  return `${seconds}s`;
}

function withCountdown(message: string, remaining: number): string {
  return message.replace(/Try again in (?:(\d+)h )?(?:(\d+)m )?(?:(\d+)s )?\.?/i, `Try again in ${formatCountdown(remaining)}.`);
}

async function keepCountdown(
  interaction: ChatInputCommandInteraction | ButtonInteraction,
  originalMessage: string,
  banner: string | null,
  logo: string,
  initialRemaining: number
) {
  let remaining = initialRemaining;
  while (remaining > 0) {
    await new Promise(resolve => setTimeout(resolve, 1000));
    remaining -= 1000;
    if (remaining <= 0) break;
    try {
      await interaction.editReply({ embeds: [errorEmbed(withCountdown(originalMessage, remaining), banner, logo)] });
    } catch {
      break;
    }
  }
}

export function handleProcessError(error: unknown, source: string) {
  console.error('========== PROCESS ERROR ==========');
  if (error instanceof Error) { console.error(error); log.error(error.message, source, { stack: error.stack }); }
  else { console.error(error); log.error('Unknown process error', source, { error }); }
}

export async function handleInteractionError(interaction: ChatInputCommandInteraction | ButtonInteraction, error: unknown) {
  console.error('========== FULL ERROR ==========');
  const message = error instanceof AppError ? error.message : 'Something went wrong while processing that action. No intentional balance change was made by the error handler.';
  if (error instanceof Error) { console.error(error); log.error(error.message, 'Interaction', { stack: error.stack }); }
  else { console.error(error); log.error('Unknown error', 'Interaction', { error }); }
  try {
    const banner = interaction.client.user.bannerURL({ size: 1024 }) ?? interaction.client.user.displayAvatarURL({ size: 1024 });
    const logo = getLogo(interaction);
    const payload = { embeds: [errorEmbed(message, banner, logo)], ephemeral: true };
    const countdown = parseCountdown(message);
    if (interaction.replied) {
      await interaction.followUp(payload);
      if (countdown) void keepCountdown(interaction, message, banner, logo, countdown);
    } else if (interaction.deferred) {
      await interaction.editReply({ embeds: [errorEmbed(message, banner, logo)] });
      if (countdown) void keepCountdown(interaction, message, banner, logo, countdown);
    } else if (interaction.isRepliable()) {
      await interaction.reply({ ...payload, fetchReply: true });
      if (countdown) void keepCountdown(interaction, message, banner, logo, countdown);
    }
  } catch (replyError) { console.error('Failed to send error reply:', replyError); }
}

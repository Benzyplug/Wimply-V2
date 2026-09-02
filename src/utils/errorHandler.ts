import { EmbedBuilder, Colors } from 'discord.js';
import type { ChatInputCommandInteraction, ButtonInteraction } from 'discord.js';
import { AppError } from './errors.js';
import { log } from './logger.js';
import { getWimplyErrorImage, getWimplyLogo } from './presentation.js';

const BRAND = 'Wimply is created and developed by ẞ€ÑZ¥.';

function collectErrorDetails(error: unknown, depth = 0): string[] {
  if (depth > 5 || error === null || error === undefined) return [];
  if (error instanceof Error) {
    const details = [error.message];
    const nested = (error as Error & { errors?: unknown }).errors;
    if (nested instanceof Map) for (const [key, value] of nested.entries()) details.push(`${String(key)}: ${collectErrorDetails(value, depth + 1).join(' | ')}`);
    else if (Array.isArray(nested)) for (const value of nested) details.push(...collectErrorDetails(value, depth + 1));
    else if (nested && typeof nested === 'object') for (const [key, value] of Object.entries(nested)) details.push(`${key}: ${collectErrorDetails(value, depth + 1).join(' | ')}`);
    return [...new Set(details.filter(Boolean))];
  }
  if (typeof error === 'object') return Object.entries(error as Record<string, unknown>).flatMap(([key, value]) => [key, ...collectErrorDetails(value, depth + 1)]);
  return [String(error)];
}

function formatErrorMessage(error: unknown): string {
  const details = collectErrorDetails(error);
  const primary = details[0] ?? 'Something went wrong while processing that action.';
  const useful = details.filter(detail => detail !== primary && detail.length <= 300).slice(0, 4);
  return useful.length ? `${primary}\n\n**Details**\n${useful.map(detail => `• ${detail}`).join('\n')}` : primary;
}

function errorEmbed(message: string, logo: string) {
  return new EmbedBuilder()
    .setColor(Colors.Red)
    .setTitle(`${logo} WIMPLY ERROR`)
    .setDescription(`**What happened**\n${message}\n\n**Recovery**\n🛠️ Check the command arguments and try again.\n📖 Use **/help** or **#help** for help.`)
    .setImage(getWimplyErrorImage())
    .setTimestamp()
    .setFooter({ text: BRAND });
}

function parseCountdown(message: string): number | null {
  const match = message.match(/Try again in (?:(\d+)h )?(?:(\d+)m )?(?:(\d+)s)?\.?/i);
  if (!match) return null;
  const total = ((Number(match[1] ?? 0) * 60 + Number(match[2] ?? 0)) * 60 + Number(match[3] ?? 0)) * 1000;
  return total > 0 ? total : null;
}

function withDiscordCountdown(message: string, remaining: number) {
  return message.replace(/Try again in (?:(\d+)h )?(?:(\d+)m )?(?:(\d+)s )?\.?/i, `Try again <t:${Math.floor((Date.now() + remaining) / 1000)}:R>.`);
}

export function handleProcessError(error: unknown, source: string) {
  console.error('========== PROCESS ERROR ==========');
  console.error(error);
  log.error(formatErrorMessage(error), source, { stack: error instanceof Error ? error.stack : undefined, error });
}

export async function handleInteractionError(interaction: ChatInputCommandInteraction | ButtonInteraction, error: unknown) {
  console.error('========== FULL ERROR ==========');
  console.error(error);
  const message = error instanceof AppError ? error.message : formatErrorMessage(error);
  log.error(message, 'Interaction', { stack: error instanceof Error ? error.stack : undefined, error });
  try {
    const logo = getWimplyLogo(interaction.guild);
    const countdown = parseCountdown(message);
    const displayedMessage = countdown ? withDiscordCountdown(message, countdown) : message;
    const embed = errorEmbed(displayedMessage, logo);
    const payload = { embeds: [embed], ephemeral: true };
    if (interaction.replied) await interaction.followUp(payload);
    else if (interaction.deferred) await interaction.editReply({ embeds: [embed] });
    else if (interaction.isRepliable()) await interaction.reply(payload);
  } catch (replyError) {
    console.error('Failed to send error reply:', replyError);
    log.error(formatErrorMessage(replyError), 'ErrorHandler', { stack: replyError instanceof Error ? replyError.stack : undefined, error: replyError });
  }
}

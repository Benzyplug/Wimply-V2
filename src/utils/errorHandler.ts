import { EmbedBuilder, Colors } from 'discord.js';
import type { ChatInputCommandInteraction, ButtonInteraction } from 'discord.js';
import { AppError } from './errors.js';
import { log } from './logger.js';

const BRAND = '╰─〔 ⚡ 〢 Made by ẞ€ÑZ¥ 〢 ⚡ 〕─╯';

function getLogo(interaction: ChatInputCommandInteraction | ButtonInteraction): string {
  return interaction.guild?.emojis.cache.find(emoji => emoji.name === 'Wimply_logo')?.toString() ?? '⚡';
}

function errorEmbed(message: string, banner: string | null, logo: string) {
  const embed = new EmbedBuilder()
    .setColor(Colors.Red)
    .setTitle(`${logo} **WIMPLY ERROR**`)
    .setDescription(`**What happened**\n${message}\n\n**Recovery**\n🛠️ Check the command arguments and try again.\n📖 Use **/help** or **#help** for the command center.`)
    .setTimestamp()
    .setFooter({ text: BRAND });
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

function withDiscordCountdown(message: string, remaining: number): string {
  const unixSeconds = Math.floor((Date.now() + remaining) / 1000);
  return message.replace(/Try again in (?:(\d+)h )?(?:(\d+)m )?(?:(\d+)s )?\.?/i, `Try again <t:${unixSeconds}:R>.`);
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
    const countdown = parseCountdown(message);
    const displayedMessage = countdown ? withDiscordCountdown(message, countdown) : message;
    const payload = { embeds: [errorEmbed(displayedMessage, banner, logo)], ephemeral: true };
    if (interaction.replied) await interaction.followUp(payload);
    else if (interaction.deferred) await interaction.editReply({ embeds: [errorEmbed(displayedMessage, banner, logo)] });
    else if (interaction.isRepliable()) await interaction.reply(payload);
  } catch (replyError) { console.error('Failed to send error reply:', replyError); }
}

import { EmbedBuilder, Colors } from 'discord.js';
import type { ChatInputCommandInteraction, ButtonInteraction } from 'discord.js';
import { AppError } from './errors.js';
import { log } from './logger.js';
import { getBotBanner, getWimplyLogo } from './presentation.js';

const BRAND = 'Wimply is created and developed by ẞ€ÑZ¥.';

function errorEmbed(message: string, banner: string | null, logo: string) {
  const embed = new EmbedBuilder()
    .setColor(Colors.Red)
    .setTitle(`${logo} WIMPLY ERROR`)
    .setDescription(`**What happened**\n${message}\n\n**Recovery**\n🛠️ Check the command arguments and try again.\n📖 Use **/help** or **#help** for help.`)
    .setTimestamp()
    .setFooter({ text: BRAND });
  if (banner) embed.setImage(banner);
  return embed;
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
  if (error instanceof Error) {
    console.error(error);
    log.error(error.message, source, { stack: error.stack });
  } else {
    console.error(error);
    log.error('Unknown process error', source, { error });
  }
}

export async function handleInteractionError(interaction: ChatInputCommandInteraction | ButtonInteraction, error: unknown) {
  console.error('========== FULL ERROR ==========');
  const message = error instanceof AppError || error instanceof Error
    ? error.message
    : 'Something went wrong while processing that action. No intentional balance change was made by the error handler.';
  if (error instanceof Error) console.error(error);
  log.error(error instanceof Error ? error.message : 'Unknown error', 'Interaction', { stack: error instanceof Error ? error.stack : undefined, error });
  try {
    const banner = getBotBanner(interaction.client.user);
    const logo = getWimplyLogo(interaction.guild);
    const countdown = parseCountdown(message);
    const displayedMessage = countdown ? withDiscordCountdown(message, countdown) : message;
    const embed = errorEmbed(displayedMessage, banner, logo);
    const payload = { embeds: [embed], ephemeral: true };
    if (interaction.replied) await interaction.followUp(payload);
    else if (interaction.deferred) await interaction.editReply({ embeds: [embed] });
    else if (interaction.isRepliable()) await interaction.reply(payload);
  } catch (replyError) {
    console.error('Failed to send error reply:', replyError);
  }
}

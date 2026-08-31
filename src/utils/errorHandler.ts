import { EmbedBuilder, Colors } from 'discord.js';
import type { ChatInputCommandInteraction, ButtonInteraction } from 'discord.js';
import { AppError } from './errors.js';
import { log } from './logger.js';

function errorEmbed(message: string) {
  return new EmbedBuilder()
    .setColor(Colors.Red)
    .setTitle('╭─〔 🚫 WIMPLY ERROR 〕─╮')
    .setDescription(`〢 ${message}\n\n╰─〔 Try again or check `/help` 〕─╯`)
    .setTimestamp()
    .setFooter({ text: 'Wimply V2.0 • Built by SHAX ⚡' });
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

export async function handleInteractionError(
  interaction: ChatInputCommandInteraction | ButtonInteraction,
  error: unknown
) {
  console.error('========== FULL ERROR ==========');
  const message = error instanceof AppError
    ? error.message
    : 'Something went wrong while processing that action. Your balance was not intentionally changed by the error handler.';

  if (error instanceof Error) {
    console.error(error);
    log.error(error.message, 'Interaction', { stack: error.stack });
  } else {
    console.error(error);
    log.error('Unknown error', 'Interaction', { error });
  }

  try {
    const payload = { embeds: [errorEmbed(message)], ephemeral: true };
    if (interaction.replied) {
      await interaction.followUp(payload);
    } else if (interaction.deferred) {
      await interaction.editReply({ embeds: [errorEmbed(message)] });
    } else if (interaction.isRepliable()) {
      await interaction.reply(payload);
    }
  } catch (replyError) {
    console.error('Failed to send error reply:', replyError);
  }
}

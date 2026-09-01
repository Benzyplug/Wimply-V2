import { EmbedBuilder, Colors } from 'discord.js';
import type { ChatInputCommandInteraction, ButtonInteraction } from 'discord.js';
import { AppError } from './errors.js';
import { log } from './logger.js';

const BRAND_FOOTER = 'Wimply V2.0 • Official Bot';

function errorEmbed(message: string) {
  return new EmbedBuilder()
    .setColor(Colors.Red)
    .setTitle('╭─〔 🚫 WIMPLY ERROR 〕─╮')
    .setDescription(`〢 **What happened**\n${message}\n\n╭〔 🛠️ Recovery 〕╮\n〢 Check the command arguments and try again.\n〢 Use **/help** or **#help** for the command center.\n╰─〔 ⚡ ${BRAND_FOOTER} 〕─╯`)
    .setTimestamp()
    .setFooter({ text: BRAND_FOOTER });
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
    : 'Something went wrong while processing that action. No intentional balance change was made by the error handler.';

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

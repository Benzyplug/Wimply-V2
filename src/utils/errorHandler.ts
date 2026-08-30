import { log } from './logger.js';
import type { ChatInputCommandInteraction, ButtonInteraction } from 'discord.js';
import { AppError } from './errors.js';

export function handleProcessError(error: unknown, source: string) {
  console.error("========== PROCESS ERROR ==========");

  if (error instanceof Error) {
    console.error(error);
    console.error("Message:", error.message);
    console.error("Stack:", error.stack);

    log.error(error.message, source, {
      stack: error.stack,
    });
  } else {
    console.error(error);
    log.error("Unknown process error", source, { error });
  }
}

export async function handleInteractionError(
  interaction: ChatInputCommandInteraction | ButtonInteraction,
  error: unknown
) {
  console.error("========== FULL ERROR ==========");

  if (error instanceof Error) {
    console.error(error);
    console.error("Message:", error.message);
    console.error("Stack:", error.stack);

    log.error(error.message, "Interaction", {
      stack: error.stack,
    });
  } else {
    console.error(error);
    log.error("Unknown error", "Interaction", { error });
  }

  const message =
    error instanceof AppError
      ? error.message
      : "An unexpected error occurred while executing this command.";

  try {
    if (interaction.replied) {
      await interaction.followUp({
        content: message,
        ephemeral: true,
      });
      return;
    }

    if (interaction.deferred) {
      await interaction.editReply({
        content: message,
      });
      return;
    }

    if (interaction.isRepliable()) {
      await interaction.reply({
        content: message,
        ephemeral: true,
      });
    }
  } catch (replyError) {
    console.error("Failed to send error reply:", replyError);
  }
}
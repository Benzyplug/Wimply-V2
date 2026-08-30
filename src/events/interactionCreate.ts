import type { Interaction } from 'discord.js';
import { log } from '../utils/logger.js';
import { handleInteractionError } from '../utils/errorHandler.js';
import { handleBlackjackButtonInteraction } from '../services/blackjackService.js';

export default {
  name: 'interactionCreate',
  once: false,
  async execute(interaction: Interaction) {
    if (interaction.isChatInputCommand()) {
      const command = interaction.client.commands?.get(interaction.commandName);
      if (!command) {
        log.warn(`Command not found: ${interaction.commandName}`, 'Interaction');
        return;
      }

      try {
        await command.execute(interaction);
      } catch (error) {
        await handleInteractionError(interaction, error);
      }

      return;
    }

    if (interaction.isButton()) {
      try {
        await handleBlackjackButtonInteraction(interaction);
      } catch (error) {
        await handleInteractionError(interaction, error);
      }
    }
  }
};

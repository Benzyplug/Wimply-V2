import { ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js';
import { z } from 'zod';
import type { Command } from '../../types/command.js';
import { parsePositiveAmount } from '../../utils/format.js';
import { validateCommandOptions } from '../../utils/commandValidation.js';
import { createBlackjackGame, buildBlackjackEmbed, createActionRow } from '../../services/blackjackService.js';

const blackjackSchema = z.object({
  amount: z.string().min(1, 'Amount is required')
});

const command: Command = {
  data: new SlashCommandBuilder()
    .setName('blackjack')
    .setDescription('Play blackjack against the dealer')
    .addStringOption((option) =>
      option
        .setName('amount')
        .setDescription('Amount to bet')
        .setRequired(true)
    ),
  async execute(interaction: ChatInputCommandInteraction) {
    if (!interaction.guildId) {
      await interaction.reply({ content: 'This command must be used in a guild.', ephemeral: true });
      return;
    }

    const payload = {
      amount: interaction.options.getString('amount', true)
    };

    const { amount } = validateCommandOptions(blackjackSchema, payload);
    const betAmount = parsePositiveAmount(amount);

    await interaction.deferReply();
    const { game, config } = await createBlackjackGame(interaction.user.id, interaction.guildId, betAmount);

    const embed = buildBlackjackEmbed(game, { currencyEmoji: config.currencyEmoji });
    const components = [createActionRow(game.sessionId, true)];

    await interaction.editReply({ embeds: [embed], components });
  }
};

export default command;

import { AppError } from '../../utils/errors.js';
import { ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js';
import { z } from 'zod';
import type { Command } from '../../types/command.js';
import { createDefaultEmbed } from '../../utils/embeds.js';
import { formatCurrency, parsePositiveAmount } from '../../utils/format.js';
import { validateCommandOptions } from '../../utils/commandValidation.js';
import { playDiceRoll } from '../../services/casinoService.js';
import { getOrCreateGuildConfig } from '../../services/guildConfigService.js';
import { reactToGameResult } from '../../utils/gameReactions.js';

const diceSchema = z.object({
  amount: z.string().min(1, 'Amount is required'),
  sides: z.string().optional(),
  target: z.string().min(1, 'Target number is required'),
  multiplier: z.string().optional()
});

const command: Command = {
  data: new SlashCommandBuilder()
    .setName('dice')
    .setDescription('Roll a dice and bet on the exact number')
    .addStringOption((option) =>
      option
        .setName('amount')
        .setDescription('Amount to bet')
        .setRequired(true)
    )
    .addStringOption((option) =>
      option
        .setName('target')
        .setDescription('Number you are betting on')
        .setRequired(true)
    )
    .addStringOption((option) =>
      option
        .setName('sides')
        .setDescription('Number of sides on the dice (default 6)')
        .setRequired(false)
    )
    .addStringOption((option) =>
      option
        .setName('multiplier')
        .setDescription('Optional risk multiplier (1-3)')
        .setRequired(false)
    ),
  async execute(interaction: ChatInputCommandInteraction) {
    if (!interaction.guildId) {
      await interaction.reply({ content: 'This command must be used in a guild.', ephemeral: true });
      return;
    }

    const payload = {
      amount: interaction.options.getString('amount', true),
      sides: interaction.options.getString('sides') ?? '6',
      target: interaction.options.getString('target', true),
      multiplier: interaction.options.getString('multiplier') ?? '1'
    };

    const { amount: amountValue, sides, target, multiplier } = validateCommandOptions(diceSchema, payload);
    const betAmount = parsePositiveAmount(amountValue);
    const sidesValue = Number(sides);
    const targetValue = Number(target);
    const multiplierValue = Number(multiplier);

    if (!Number.isInteger(sidesValue) || sidesValue < 2 || sidesValue > 100) {
      throw new AppError('Sides must be an integer between 2 and 100.');
    }

    if (!Number.isInteger(targetValue) || targetValue < 1 || targetValue > sidesValue) {
      throw new AppError(`Target must be an integer between 1 and ${sidesValue}.`);
    }

    if (!Number.isInteger(multiplierValue) || multiplierValue < 1 || multiplierValue > 3) {
      throw new AppError('Multiplier must be an integer between 1 and 3.');
    }

    await interaction.deferReply();
    const guildConfig = await getOrCreateGuildConfig(interaction.guildId);

    const initialEmbed = createDefaultEmbed()
      .setTitle('Dice Roll')
      .setDescription(
        `Rolling a ${sidesValue}-sided dice for ${formatCurrency(betAmount, guildConfig.currencyEmoji)}...
Bet: **${targetValue}** • Multiplier: **${multiplierValue}x**`
      )
      .addFields(
        { name: 'Status', value: 'Rolling...', inline: true },
        { name: 'Payout', value: `${multiplierValue}x on exact hit`, inline: true }
      );

    await interaction.editReply({ embeds: [initialEmbed] });

    const result = await playDiceRoll(
      interaction.user.id,
      interaction.guildId,
      betAmount,
      sidesValue,
      targetValue,
      multiplierValue
    );

    const finalEmbed = createDefaultEmbed()
      .setTitle(result.won ? 'Dice Win!' : 'Dice Loss')
      .setDescription(result.message)
      .addFields(
        { name: 'Target', value: `${result.target}`, inline: true },
        { name: 'Rolled', value: `${result.roll}`, inline: true },
        { name: 'Multiplier', value: `${result.multiplier}x`, inline: true },
        { name: 'Wallet Change', value: formatCurrency(result.amount, guildConfig.currencyEmoji), inline: false },
        { name: 'New Wallet', value: formatCurrency(result.newWallet, guildConfig.currencyEmoji), inline: true }
      );

    const resultMessage = await interaction.editReply({ embeds: [finalEmbed] });
    await reactToGameResult(resultMessage, result.won ? 'DICE_WIN' : 'DICE_LOSS');
  }
};

export default command;

import { AppError } from '../../utils/errors.js';
import { ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js';
import { z } from 'zod';
import type { Command } from '../../types/command.js';
import { createDefaultEmbed } from '../../utils/embeds.js';
import { formatCurrency, parsePositiveAmount } from '../../utils/format.js';
import { validateCommandOptions } from '../../utils/commandValidation.js';
import { playDiceRoll } from '../../services/casinoService.js';
import { getOrCreateGuildConfig } from '../../services/guildConfigService.js';
import { playGameSlides } from '../../utils/gameAnimation.js';

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
    .addStringOption((option) => option.setName('amount').setDescription('Amount to bet').setRequired(true))
    .addStringOption((option) => option.setName('target').setDescription('Number you are betting on').setRequired(true))
    .addStringOption((option) => option.setName('sides').setDescription('Number of sides on the dice (default 6)').setRequired(false))
    .addStringOption((option) => option.setName('multiplier').setDescription('Optional risk multiplier (1-3)').setRequired(false)),
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
    if (!Number.isInteger(sidesValue) || sidesValue < 2 || sidesValue > 100) throw new AppError('Sides must be an integer between 2 and 100.');
    if (!Number.isInteger(targetValue) || targetValue < 1 || targetValue > sidesValue) throw new AppError(`Target must be an integer between 1 and ${sidesValue}.`);
    if (!Number.isInteger(multiplierValue) || multiplierValue < 1 || multiplierValue > 3) throw new AppError('Multiplier must be an integer between 1 and 3.');
    await interaction.deferReply();
    const guildConfig = await getOrCreateGuildConfig(interaction.guildId);
    const betDisplay = formatCurrency(betAmount, guildConfig.currencyEmoji);
    const result = await playDiceRoll(interaction.user.id, interaction.guildId, betAmount, sidesValue, targetValue, multiplierValue);
    const diceFaces = ['⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];
    const rolling = (frame: number) => diceFaces[frame % diceFaces.length];
    await playGameSlides([
      { content: { embeds: [createDefaultEmbed().setTitle('🎲 DICE • BET LOCKED').setDescription(`💰 Bet: **${betDisplay}**\n🎯 Target: **${targetValue}**\n📈 Multiplier: **${multiplierValue}×**\n\n🎲 Preparing the roll…`)] }, delay: 220 },
      { content: { embeds: [createDefaultEmbed().setTitle('🎲 DICE • ROLLING').setDescription(`💰 Bet: **${betDisplay}**\n🎯 Target: **${targetValue}**\n\n## ${rolling(1)}  ${rolling(2)}  ${rolling(3)}\n\n🎲 The die is rolling…`)] }, delay: 180 },
      { content: { embeds: [createDefaultEmbed().setTitle('🎲 DICE • FINAL SPIN').setDescription(`💰 Bet: **${betDisplay}**\n🎯 Target: **${targetValue}**\n\n## ${rolling(4)}  ${rolling(5)}  ${rolling(0)}\n\n🔒 Locking the result…`)] }, delay: 220 },
      { content: { embeds: [createDefaultEmbed().setTitle('🎲 DICE • REVEAL').setDescription(`💰 Bet: **${betDisplay}**\n🎯 Target: **${targetValue}**\n\n## 🎲 ${result.roll}\n\n${result.roll === result.target ? '🎯 Exact match!' : '❌ Target missed.'}`)] }, delay: 0 }
    ], async (payload) => { await interaction.editReply(payload); });
    const finalEmbed = createDefaultEmbed().setTitle(result.won ? '🎉 DICE • WIN' : '💥 DICE • LOSS').setDescription(result.message).addFields(
      { name: 'Target', value: `${result.target}`, inline: true },
      { name: 'Rolled', value: `${result.roll}`, inline: true },
      { name: 'Multiplier', value: `${result.multiplier}x`, inline: true },
      { name: 'Wallet Change', value: formatCurrency(result.amount, guildConfig.currencyEmoji), inline: false },
      { name: 'New Wallet', value: formatCurrency(result.newWallet, guildConfig.currencyEmoji), inline: true }
    );
    await interaction.editReply({ embeds: [finalEmbed] });
  }
};

export default command;

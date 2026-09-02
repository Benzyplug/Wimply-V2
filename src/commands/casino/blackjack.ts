import { ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js';
import type { Command } from '../../types/command.js';
import { parsePositiveAmount } from '../../utils/format.js';
import { validateCommandOptions } from '../../utils/commandValidation.js';
import { createBlackjackGame, buildBlackjackEmbed, createActionRow } from '../../services/blackjackService.js';
import { playGameSlides } from '../../utils/gameAnimation.js';
import { createDefaultEmbed } from '../../utils/embeds.js';

const blackjackSchema = z.object({ amount: z.string().min(1, 'Amount is required') });
const command: Command = {
  data: new SlashCommandBuilder().setName('blackjack').setDescription('Play blackjack against the dealer').addStringOption(option => option.setName('amount').setDescription('Amount to bet').setRequired(true)),
  async execute(interaction: ChatInputCommandInteraction) {
    if (!interaction.guildId) { await interaction.reply({ content: 'This command must be used in a guild.', ephemeral: true }); return; }
    const { amount } = validateCommandOptions(blackjackSchema, { amount: interaction.options.getString('amount', true) });
    const betAmount = parsePositiveAmount(amount);
    await interaction.deferReply();
    const { game, config, resumed } = await createBlackjackGame(interaction.user.id, interaction.guildId, betAmount);
    const currency = config.currencyEmoji;
    if (resumed) { await interaction.editReply({ embeds: [buildBlackjackEmbed(game, { currencyEmoji: currency }).setTitle('🃏 WIMPLY BLACKJACK • RESUMED')], components: [createActionRow(game.sessionId, !game.doubled)] }); return; }
    await playGameSlides([
      { content: { embeds: [createDefaultEmbed().setTitle('🃏 BLACKJACK • DEALING').setDescription(`💰 Bet locked: **${betAmount.toLocaleString()} ${currency}**\n\n🂠 Shuffling the deck…\n🎴 Dealing your opening hand…`)] }, delay: 300 },
      { content: { embeds: [buildBlackjackEmbed(game, { currencyEmoji: currency }).setTitle('🃏 BLACKJACK • DEALT')], components: [createActionRow(game.sessionId, true)] }, delay: 260 },
      { content: { embeds: [buildBlackjackEmbed(game, { currencyEmoji: currency })], components: [createActionRow(game.sessionId, true)] }, delay: 0 }
    ], async payload => { await interaction.editReply(payload); });
  }
};
export default command;

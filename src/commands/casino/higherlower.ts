import { ActionRowBuilder, ButtonBuilder, ButtonStyle, ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js';
import { z } from 'zod';
import type { Command } from '../../types/command.js';
import { createDefaultEmbed } from '../../utils/embeds.js';
import { formatCurrency, parsePositiveAmount } from '../../utils/format.js';
import { validateCommandOptions } from '../../utils/commandValidation.js';
import { chargeGame, getGameCurrency, higherLowerGames } from '../../services/miniGameService.js';

const schema = z.object({ amount: z.string().min(1) });

const buttons = (id: string) => new ActionRowBuilder<ButtonBuilder>().addComponents(
  new ButtonBuilder().setCustomId(`hl:higher:${id}`).setLabel('Higher ⬆️').setStyle(ButtonStyle.Primary),
  new ButtonBuilder().setCustomId(`hl:lower:${id}`).setLabel('Lower ⬇️').setStyle(ButtonStyle.Secondary),
  new ButtonBuilder().setCustomId(`hl:cashout:${id}`).setLabel('Cash Out 💰').setStyle(ButtonStyle.Success)
);

const command: Command = {
  data: new SlashCommandBuilder()
    .setName('higherlower')
    .setDescription('Predict whether the next number is higher or lower')
    .addStringOption(option => option.setName('amount').setDescription('Amount to bet').setRequired(true)),
  async execute(interaction: ChatInputCommandInteraction) {
    if (!interaction.guildId) return;
    const { amount } = validateCommandOptions(schema, { amount: interaction.options.getString('amount', true) });
    const bet = parsePositiveAmount(amount);
    await chargeGame(interaction.user.id, interaction.guildId, bet, 'Higher/Lower');
    const currency = await getGameCurrency(interaction.guildId);
    const id = `${interaction.guildId}:${interaction.user.id}`;
    higherLowerGames.set(id, { userId: interaction.user.id, guildId: interaction.guildId, bet, current: Math.floor(Math.random() * 90) + 5, expiresAt: Date.now() + 5 * 60_000 });
    await interaction.reply({ embeds: [createDefaultEmbed().setTitle('╭─〔 🎯 HIGHER / LOWER 〕─╮').setDescription(`〢 Starting bet: **${formatCurrency(bet, currency.currencyEmoji)}**\n〢 Current number: **${higherLowerGames.get(id)?.current}**\n\nChoose whether the next number goes **higher** or **lower**.\n\n╰─〔 💰 Cash out whenever you want 〕─╯`)], components: [buttons(id)] });
  }
};

export default command;

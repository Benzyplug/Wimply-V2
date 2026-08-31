import { ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js';
import { z } from 'zod';
import type { Command } from '../../types/command.js';
import { createDefaultEmbed } from '../../utils/embeds.js';
import { formatCurrency, parsePositiveAmount } from '../../utils/format.js';
import { validateCommandOptions } from '../../utils/commandValidation.js';
import { chargeGame, getGameCurrency, payGame } from '../../services/miniGameService.js';

const schema = z.object({ amount: z.string().min(1), snail: z.coerce.number().int().min(1).max(3) });
const sleep = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms));
const tracks = ['🐌━━━━━━', '🐌━━━━━━', '🐌━━━━━━'];

const command: Command = {
  data: new SlashCommandBuilder()
    .setName('snailgarden')
    .setDescription('Bet on a snail in a tiny animated race')
    .addStringOption(option => option.setName('amount').setDescription('Amount to bet').setRequired(true))
    .addIntegerOption(option => option.setName('snail').setDescription('Pick snail 1, 2 or 3').setRequired(true).setMinValue(1).setMaxValue(3)),
  async execute(interaction: ChatInputCommandInteraction) {
    if (!interaction.guildId) return;
    const payload = { amount: interaction.options.getString('amount', true), snail: interaction.options.getInteger('snail', true) };
    const { amount, snail } = validateCommandOptions(schema, payload);
    const bet = parsePositiveAmount(amount);
    await chargeGame(interaction.user.id, interaction.guildId, bet, 'Snail Garden');
    const currency = await getGameCurrency(interaction.guildId);
    await interaction.deferReply();

    for (let frame = 0; frame < 4; frame++) {
      const race = tracks.map((track, index) => `${index + 1}. ${' '.repeat(frame)}${track.replace('━━━━━━', '━'.repeat(Math.max(1, 6 - frame)))} 🏁`).join('\n');
      await interaction.editReply({ embeds: [createDefaultEmbed().setTitle('╭─〔 🐌 SNAIL GARDEN 〕─╮').setDescription(`〢 Your pick: **Snail ${snail}**\n〢 Bet: **${formatCurrency(bet, currency.currencyEmoji)}**\n\n${race}\n\n╰─〔 🌿 The garden is racing… 〕─╯`)] });
      await sleep(450);
    }

    const winner = Math.floor(Math.random() * 3) + 1;
    const won = winner === snail;
    const payout = won ? (bet * 5n) / 2n : 0n;
    if (payout > 0n) await payGame(interaction.user.id, interaction.guildId, payout, 'Snail Garden');
    await interaction.editReply({ embeds: [createDefaultEmbed().setTitle(won ? '╭─〔 🏆 SNAIL VICTORY 〕─╮' : '╭─〔 🐌 SNAIL FINISH 〕─╮').setDescription(`〢 Winner: **Snail ${winner}** 🐌\n〢 Your pick: **Snail ${snail}**\n〢 Result: ${won ? '🎉 **You won!**' : '💥 **Your snail lost.**'}\n〢 ${won ? `Payout: **${formatCurrency(payout, currency.currencyEmoji)}**` : `Lost: **${formatCurrency(bet, currency.currencyEmoji)}**`}\n\n╰─〔 🎟️ Multiplier: 2.5x 〕─╯`)] });
  }
};

export default command;

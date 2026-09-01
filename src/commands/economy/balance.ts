import { AttachmentBuilder, ChatInputCommandInteraction, EmbedBuilder, SlashCommandBuilder } from 'discord.js';
import type { Command } from '../../types/command.js';
import { formatCurrency } from '../../utils/format.js';
import { getBalance } from '../../services/economyService.js';
import { createBalanceCard } from '../../utils/economyCard.js';

const command: Command = {
  data: new SlashCommandBuilder()
    .setName('balance')
    .setDescription('View a user wallet and bank balance')
    .addUserOption(option => option.setName('user').setDescription('User to inspect').setRequired(false)),

  async execute(interaction: ChatInputCommandInteraction) {
    if (!interaction.guildId) {
      await interaction.reply({ content: 'This command must be used in a guild.', ephemeral: true });
      return;
    }
    await interaction.deferReply();
    const target = interaction.options.getUser('user') ?? interaction.user;
    const { user, config } = await getBalance(target.id, interaction.guildId);
    const currency = config.currencyEmoji || '🪙';
    const attachment = new AttachmentBuilder(createBalanceCard(target.username, user.wallet.toLocaleString(), user.bank.toLocaleString(), (user.wallet + user.bank).toLocaleString(), currency, user.level, user.xp), { name: 'wimply-balance.png' });
    const embed = new EmbedBuilder()
      .setColor(0x5865f2)
      .setTitle(`💰 ${target.username}'s Balance`)
      .setDescription(`**Wallet** ${formatCurrency(user.wallet, currency)}  •  **Bank** ${formatCurrency(user.bank, currency)}\n**Net worth** ${formatCurrency(user.wallet + user.bank, currency)}  •  **Level** ${user.level}`)
      .setThumbnail(target.displayAvatarURL({ size: 256 }))
      .setImage('attachment://wimply-balance.png');
    await interaction.editReply({ embeds: [embed], files: [attachment] });
  }
};

export default command;

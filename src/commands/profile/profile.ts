import { ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js';
import type { Command } from '../../types/command.js';
import { createDefaultEmbed } from '../../utils/embeds.js';
import { getOrCreateUser } from '../../services/userService.js';
import { getInventory } from '../../services/inventoryService.js';
import { formatCurrency } from '../../utils/format.js';
import { STYLE } from '../../utils/presentation.js';

const command: Command = {
  data: new SlashCommandBuilder().setName('profile').setDescription('View your economy profile'),
  async execute(interaction: ChatInputCommandInteraction) {
    if (!interaction.guildId) { await interaction.reply({ content: 'This command must be used in a guild.', ephemeral: true }); return; }
    await interaction.deferReply();
    const { user, config } = await getOrCreateUser(interaction.user.id, interaction.guildId);
    const inventory = await getInventory(user);
    const xpForNext = Math.pow(user.level, 2) * 100;
    const previousXp = Math.pow(Math.max(0, user.level - 1), 2) * 100;
    const progress = Math.max(0, Math.min(100, ((user.xp - previousXp) / Math.max(1, xpForNext - previousXp)) * 100));
    const filled = Math.round(progress / 10);
    const embed = createDefaultEmbed()
      .setColor(0x5865f2)
      .setTitle(STYLE.title('👤', `${interaction.user.username}'s Profile`))
      .setDescription(`╭─〔 ✨ LEVEL ${user.level} 〕─╮\n〢 **XP:** ${user.xp.toLocaleString()} / ${xpForNext.toLocaleString()}\n〢 **Progress:** ${'▰'.repeat(filled)}${'▱'.repeat(10 - filled)} **${Math.floor(progress)}%**\n╰─〔 🚀 Keep playing to level up 〕─╯`)
      .setThumbnail(interaction.user.displayAvatarURL({ size: 512 }))
      .addFields(
        { name: '╭ 💰 Wallet', value: formatCurrency(user.wallet, config.currencyEmoji), inline: true },
        { name: '╭ 🏦 Bank', value: formatCurrency(user.bank, config.currencyEmoji), inline: true },
        { name: '╭ 💎 Net Worth', value: formatCurrency(user.wallet + user.bank, config.currencyEmoji), inline: true },
        { name: '╭ 🏅 Badges', value: user.badges.length ? user.badges.map(b => `**${b}**`).join('  •  ') : 'No badges yet — earn some!', inline: false },
        { name: '╭ 🎒 Inventory', value: `**${inventory.length}** unique item${inventory.length === 1 ? '' : 's'}`, inline: true },
        { name: '╭ 📅 Member Since', value: `<t:${Math.floor(user.joinedAt.getTime() / 1000)}:R>`, inline: true },
        { name: '╭ 🪙 Currency', value: `${config.currencyEmoji} **${config.currencyName}**`, inline: true }
      )
      .setFooter({ text: STYLE.brand })
      .setTimestamp();
    await interaction.editReply({ embeds: [embed] });
  }
};
export default command;

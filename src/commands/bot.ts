import { ActionRowBuilder, ButtonBuilder, ButtonStyle, ChatInputCommandInteraction, EmbedBuilder, SlashCommandBuilder, version as discordJsVersion } from 'discord.js';
import type { Command } from '../types/command.js';
import { STYLE } from '../utils/presentation.js';

const command: Command = {
  data: new SlashCommandBuilder().setName('bot').setDescription('View Wimply bot information'),
  async execute(interaction: ChatInputCommandInteraction) {
    const botUser = await interaction.client.user.fetch(true);
    const avatar = botUser.displayAvatarURL({ size: 1024 });
    const banner = botUser.bannerURL({ size: 2048 }) ?? avatar;
    const commands = interaction.client.commands?.size ?? 0;
    const ownerId = process.env.OWNER_DISCORD_ID;
    const owner = ownerId ? `<@${ownerId}>` : 'ẞ€ÑZ¥';
    const uptime = Math.floor(process.uptime());
    const days = Math.floor(uptime / 86400);
    const hours = Math.floor((uptime % 86400) / 3600);
    const minutes = Math.floor((uptime % 3600) / 60);
    const seconds = uptime % 60;
    const embed = new EmbedBuilder()
      .setColor(0x5865f2)
      .setTitle(STYLE.title('🤖', 'Wimply Bot'))
      .setDescription(`╭ **${STYLE.version}**\n〢 **Made by:** **ẞ€ÑZ¥**\n〢 Focused economy, casino, inventory and community experience.`)
      .setThumbnail(avatar)
      .setImage(banner)
      .addFields(
        { name: '╭ ⚙️ Runtime', value: `〢 **Node.js:** ${process.version} 〢 **discord.js:** v${discordJsVersion} 〢 **Uptime:** ${days}d ${hours}h ${minutes}m ${seconds}s`, inline: false },
        { name: '╭ 📊 Bot', value: `〢 **Name:** ${botUser.username} 〢 **Servers:** ${interaction.client.guilds.cache.size} 〢 **Commands:** ${commands} 〢 **Status:** 🟢 Online`, inline: false },
        { name: '╭ 👑 Creator', value: `〢 **ẞ€ÑZ¥**\n〢 Founder & Developer`, inline: true },
        { name: '╭ 🎮 Experience', value: '〢 Economy\n〢 Casino & games\n〢 Inventory & shop\n〢 XP & profiles', inline: true },
        { name: '╭ ⚡ Interfaces', value: '〢 `/command`\n〢 `#command`\n〢 `!command`\n〢 Shorthand aliases', inline: true },
        { name: '╭ 🧩 Version', value: `〢 **${STYLE.version}**\n〢 Current production build.`, inline: false }
      )
      .setFooter({ text: STYLE.brand })
      .setTimestamp();

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder().setCustomId('bot:admin').setLabel('🔐 View Admin Details').setStyle(ButtonStyle.Secondary)
    );
    await interaction.reply({ embeds: [embed], components: [row] });
  }
};
export default command;

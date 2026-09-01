import { ActionRowBuilder, ButtonBuilder, ButtonStyle, ChatInputCommandInteraction, EmbedBuilder, SlashCommandBuilder } from 'discord.js';
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
    const embed = new EmbedBuilder()
      .setColor(0x5865f2)
      .setTitle(STYLE.title('🤖', 'Wimply Bot'))
      .setDescription(`〢 **Wimply V2.1.1**\n〢 Built, maintained and developed by **${owner}**.\n〢 A focused economy, casino, inventory and community bot.`)
      .setThumbnail(avatar)
      .setImage(banner)
      .addFields(
        { name: '╭ 👑 Creator', value: `〢 **ẞ€ÑZ¥**\n〢 Founder & Developer\n〢 Official Wimply creator`, inline: true },
        { name: '╭ 🎮 Experience', value: '〢 Economy & rewards\n〢 Casino & mini-games\n〢 Inventory & shop\n〢 Prefix + slash commands', inline: true },
        { name: '╭ 📊 Live Status', value: `〢 **Bot:** ${botUser.username}\n〢 **Servers:** ${interaction.client.guilds.cache.size}\n〢 **Commands:** ${commands}\n〢 **Status:** 🟢 Online`, inline: true },
        { name: '╭ ⚡ Interfaces', value: '〢 `/command` slash commands\n〢 `#command` and `!command` prefixes\n〢 Shorthand aliases for faster play\n〢 Smart reactions on supported responses', inline: false },
        { name: '╭ 🧩 Version', value: '〢 **Wimply V2.1.1**\n〢 Refined games, presentation, branding and command UX.', inline: false }
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

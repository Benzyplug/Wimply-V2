import { ActionRowBuilder, ButtonBuilder, ButtonStyle, ChatInputCommandInteraction, EmbedBuilder, SlashCommandBuilder, version as discordJsVersion } from 'discord.js';
import type { Command } from '../types/command.js';

function formatUptime(seconds: number) { const days = Math.floor(seconds / 86400); const hours = Math.floor((seconds % 86400) / 3600); const minutes = Math.floor((seconds % 3600) / 60); const secs = Math.floor(seconds % 60); return `${days}d ${hours}h ${minutes}m ${secs}s`; }

const command: Command = {
  data: new SlashCommandBuilder().setName('bot').setDescription('View Wimply bot information'),
  async execute(interaction: ChatInputCommandInteraction) {
    const botUser = await interaction.client.user.fetch(true);
    const avatar = botUser.displayAvatarURL({ size: 1024 });
    const banner = botUser.bannerURL({ size: 2048 }) ?? avatar;
    const commands = interaction.client.commands?.size ?? 0;
    const ownerId = process.env.OWNER_DISCORD_ID;
    const ownerMention = ownerId ? `<@${ownerId}>` : '**Benzy**';
    const embed = new EmbedBuilder()
      .setColor(0x5865f2)
      .setTitle('╭─〔 🤖 WIMPLY BOT 〕─╮')
      .setDescription(`〢 **Wimply V2.0** — official bot identity\n〢 **Owner:** ${ownerMention}\n〢 Built for economy, casino, inventory & community fun.`)
      .setThumbnail(avatar)
      .addFields(
        { name: '╭ 👑 Owner', value: `〢 **Benzy**\n〢 Founder & Developer\n〢 ${ownerId ? 'Official owner mention enabled.' : 'Owner mention can be enabled with OWNER_DISCORD_ID.'}`, inline: true },
        { name: '╭ ⚙️ Runtime', value: `〢 **Node.js:** ${process.version}\n〢 **discord.js:** v${discordJsVersion}\n〢 **Uptime:** ${formatUptime(process.uptime())}`, inline: true },
        { name: '╭ 📊 Bot', value: `〢 **Name:** ${botUser.username}\n〢 **Servers:** ${interaction.client.guilds.cache.size}\n〢 **Commands:** ${commands}\n〢 **Status:** 🟢 Online`, inline: true },
        { name: '╭ 🎰 Core Features', value: '〢 Economy • Casino • Mines • Slots\n〢 Profiles • Inventory • Shop\n〢 Smart reactions • Prefix + slash commands', inline: false },
        { name: '╭ 🔐 More Information', value: '〢 Additional diagnostics are restricted to server administrators.\n〢 The button below is visible to everyone, but only admins can open the private details.', inline: false }
      )
      .setImage(banner)
      .setFooter({ text: 'Wimply V2.0 • Made by Benzy ⚡〢' })
      .setTimestamp();

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder().setCustomId('bot:admin').setLabel('🔐 Admin Details').setStyle(ButtonStyle.Secondary)
    );
    await interaction.reply({ embeds: [embed], components: [row] });
  }
};
export default command;

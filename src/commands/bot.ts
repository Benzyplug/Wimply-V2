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
    const ownerTag = ownerId ? `<@${ownerId}>` : 'ẞ€ÑZ¥';
    const uptime = Math.floor(process.uptime());
    const days = Math.floor(uptime / 86400);
    const hours = Math.floor((uptime % 86400) / 3600);
    const minutes = Math.floor((uptime % 3600) / 60);
    const seconds = uptime % 60;

    const embed = new EmbedBuilder()
      .setColor(0x5865f2)
      .setTitle('🤖 WIMPLY BOT')
      .setDescription(`**${STYLE.version}**\nEconomy • Casino • Inventory • XP • Profiles\n\n👑 **Creator:** **ẞ€ÑZ¥** ${ownerTag}`)
      .setThumbnail(avatar)
      .addFields(
        { name: '⚙️ Runtime', value: `Node.js **${process.version}** • discord.js **v${discordJsVersion}** • Uptime **${days}d ${hours}h ${minutes}m ${seconds}s**`, inline: false },
        { name: '📊 Bot', value: `Servers **${interaction.client.guilds.cache.size}** • Commands **${commands}** • Status 🟢 Online`, inline: false },
        { name: '🎮 Experience', value: 'Economy\nCasino & games\nInventory & shop\nXP & profiles', inline: true },
        { name: '⚡ Interfaces', value: '`/command`\n`#command`\n`!command`\nShorthand aliases', inline: true },
        { name: '🧩 Version', value: `**${STYLE.version}**\nProduction build`, inline: true }
      )
      .setImage(banner)
      .setFooter({ text: STYLE.brand })
      .setTimestamp();

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder().setCustomId('bot:admin').setLabel('🧩 More Info').setStyle(ButtonStyle.Secondary)
    );
    await interaction.reply({ embeds: [embed], components: [row], allowedMentions: { parse: [] } });
  }
};
export default command;

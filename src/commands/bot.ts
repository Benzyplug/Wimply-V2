import { ActionRowBuilder, ButtonBuilder, ButtonStyle, ChatInputCommandInteraction, EmbedBuilder, SlashCommandBuilder, version as discordJsVersion } from 'discord.js';
import type { Command } from '../types/command.js';
import { getBotBanner, getWimplyLogo, STYLE } from '../utils/presentation.js';

const command: Command = {
  data: new SlashCommandBuilder().setName('bot').setDescription('View Wimply bot information'),
  async execute(interaction: ChatInputCommandInteraction) {
    const botUser = await interaction.client.user.fetch(true);
    const avatar = botUser.displayAvatarURL({ size: 1024 });
    const banner = getBotBanner(botUser);
    const commands = interaction.client.commands?.size ?? 0;
    const uptime = Math.floor(process.uptime());
    const days = Math.floor(uptime / 86400);
    const hours = Math.floor((uptime % 86400) / 3600);
    const minutes = Math.floor((uptime % 3600) / 60);
    const seconds = uptime % 60;
    const logo = getWimplyLogo(interaction.guild);
    const embed = new EmbedBuilder()
      .setColor(0x5865f2)
      .setTitle(`${logo} WIMPLY BOT`)
      .setDescription(`**${STYLE.version}**\nEconomy • Casino • Inventory • XP • Profiles\n\nWimply is created and developed by **ẞ€ÑZ¥**.`)
      .setThumbnail(avatar)
      .addFields(
        { name: '〢 Runtime', value: `Node.js **${process.version}**\ndiscord.js **v${discordJsVersion}**\nUptime **${days}d ${hours}h ${minutes}m ${seconds}s**`, inline: true },
        { name: '〢 Bot', value: `Servers **${interaction.client.guilds.cache.size}**\nCommands **${commands}**\nStatus **🔴 Do Not Disturb**`, inline: true },
        { name: '〢 Experience', value: 'Economy\nCasino & games\nInventory & shop\nXP & profiles', inline: true },
        { name: '〢 Interfaces', value: '`/command`\n`#command`\n`!command`\nShorthand aliases', inline: true },
        { name: '〢 Version', value: `**${STYLE.version}**\nProduction build`, inline: true }
      )
      .setImage(banner)
      .setTimestamp();
    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(new ButtonBuilder().setCustomId('bot:admin').setLabel('🧩 More Info').setStyle(ButtonStyle.Secondary));
    await interaction.reply({ embeds: [embed], components: [row], allowedMentions: { parse: [] } });
  }
};

export default command;

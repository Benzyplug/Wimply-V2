import { ChatInputCommandInteraction, EmbedBuilder, SlashCommandBuilder } from 'discord.js';
import type { Command } from '../types/command.js';
import { getBotBanner, getWimplyLogo, STYLE } from '../utils/presentation.js';

const command: Command = {
  data: new SlashCommandBuilder().setName('owner').setDescription('View Wimply creator information'),
  async execute(interaction: ChatInputCommandInteraction) {
    const botUser = await interaction.client.user.fetch(true);
    const avatar = botUser.displayAvatarURL({ size: 1024 });
    const banner = getBotBanner(botUser);
    const logo = getWimplyLogo(interaction.guild);
    const embed = new EmbedBuilder()
      .setColor(0x5865f2)
      .setTitle(`${logo} WIMPLY OWNER`)
      .setDescription('Wimply is created and developed by **ẞ€ÑZ¥**.')
      .setThumbnail(avatar)
      .addFields(
        { name: '〢 Creator', value: '**ẞ€ÑZ¥**\nFounder & Developer\nAge: **17**', inline: true },
        { name: '〢 Nationality', value: '🇳🇬 Nigeria\n🇬🇧 United Kingdom', inline: true },
        { name: '〢 Location', value: 'London, United Kingdom 🇬🇧', inline: true },
        { name: '〢 Development', value: 'Discord bots • automation • economy systems\nTypeScript • Node.js • Prisma', inline: false },
        { name: '〢 Wimply', value: `Created & developed by **ẞ€ÑZ¥**\n**${STYLE.version}**`, inline: false }
      )
      .setImage(banner)
      .setTimestamp();
    await interaction.reply({ embeds: [embed], allowedMentions: { parse: [] } });
  }
};

export default command;

import { ChatInputCommandInteraction, EmbedBuilder, SlashCommandBuilder } from 'discord.js';
import type { Command } from '../types/command.js';
import { STYLE } from '../utils/presentation.js';

const command: Command = {
  data: new SlashCommandBuilder().setName('owner').setDescription('View Wimply creator information'),
  async execute(interaction: ChatInputCommandInteraction) {
    const botUser = await interaction.client.user.fetch(true);
    const avatar = botUser.displayAvatarURL({ size: 1024 });
    const banner = botUser.bannerURL({ size: 2048 }) ?? avatar;
    const ownerId = process.env.OWNER_DISCORD_ID;
    const owner = ownerId ? `<@${ownerId}>` : 'ẞ€ÑZ¥';
    const embed = new EmbedBuilder()
      .setColor(0x5865f2)
      .setTitle('👑 WIMPLY CREATOR')
      .setDescription(`Wimply is created and developed by **ẞ€ÑZ¥** ${owner}.`)
      .setThumbnail(avatar)
      .addFields(
        { name: '👤 Identity', value: '**ẞ€ÑZ¥**\nFounder & Developer\nAge: **17**', inline: true },
        { name: '🌍 Nationality', value: '🇳🇬 Nigeria\n🇬🇧 United Kingdom', inline: true },
        { name: '📍 Location', value: 'London, United Kingdom 🇬🇧', inline: true },
        { name: '🛠️ Development', value: 'TypeScript • Node.js • Prisma\nDiscord bots & automation', inline: false },
        { name: '🎯 Wimply', value: `Founder of Wimply • **${STYLE.version}**`, inline: false }
      )
      .setImage(banner)
      .setFooter({ text: STYLE.brand })
      .setTimestamp();
    await interaction.reply({ embeds: [embed], allowedMentions: { parse: [] } });
  }
};
export default command;

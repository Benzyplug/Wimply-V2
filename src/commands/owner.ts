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
      .setTitle(STYLE.title('👑', 'Wimply Creator'))
      .setDescription(`〢 **Wimply is created and developed by ${owner}.**\n〢 **ẞ€ÑZ¥** is the founder and developer behind the project.`)
      .setThumbnail(avatar)
      .setImage(banner)
      .addFields(
        { name: '╭ 👤 Identity', value: '〢 **Name:** ẞ€ÑZ¥\n〢 **Username:** benzyplug\n〢 **Role:** Founder & Developer\n〢 **Age:** 17', inline: true },
        { name: '╭ 🌍 Nationality', value: '〢 🇳🇬 **Nigeria**\n〢 🇬🇧 **United Kingdom**', inline: true },
        { name: '╭ 📍 Location', value: '〢 **London, United Kingdom 🇬🇧**', inline: true },
        { name: '╭ 🛠️ Development', value: '〢 TypeScript • Node.js • Prisma\n〢 Discord bots & automation', inline: false },
        { name: '╭ 🎯 Wimply', value: '〢 Founder of Wimply and the developer behind the project.\n〢 **Version:** V2.1.1', inline: false }
      )
      .setFooter({ text: STYLE.brand })
      .setTimestamp();
    await interaction.reply({ embeds: [embed] });
  }
};
export default command;

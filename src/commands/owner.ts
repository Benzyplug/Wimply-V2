import { ChatInputCommandInteraction, EmbedBuilder, SlashCommandBuilder } from 'discord.js';
import type { Command } from '../types/command.js';

const command: Command = {
  data: new SlashCommandBuilder().setName('owner').setDescription('View Wimply creator information'),
  async execute(interaction: ChatInputCommandInteraction) {
    const avatar = interaction.client.user.displayAvatarURL({ size: 512 });
    const ownerId = process.env.OWNER_DISCORD_ID;
    const mention = ownerId ? `<@${ownerId}>` : '**Benzy**';
    const embed = new EmbedBuilder()
      .setColor(0x5865f2)
      .setTitle('╭─〔 👑 WIMPLY CREATOR 〕─╮')
      .setDescription(`〢 **Wimply is created and developed by ${mention}.**\n〢 This is the official creator profile.`)
      .setThumbnail(avatar)
      .addFields(
        { name: '╭ 👤 Identity', value: '〢 **Name:** Benzy\n〢 **Username:** benzyplug\n〢 **Role:** Founder & Developer\n〢 **Age:** 17', inline: true },
        { name: '╭ 🌍 Nationality', value: '〢 🇳🇬 **Nigeria**\n〢 🇬🇧 **United Kingdom**', inline: true },
        { name: '╭ 📍 Location', value: '〢 **London, United Kingdom 🇬🇧**', inline: true },
        { name: '╭ 🛠️ Development', value: '〢 TypeScript • Node.js • Prisma\n〢 Discord bots & automation', inline: false },
        { name: '╭ 🎯 Wimply', value: '〢 Founder of Wimply and the developer behind the project.\n〢 **Project:** Wimply V2.0', inline: false }
      )
      .setImage(avatar)
      .setFooter({ text: 'Wimply V2.0 • Made by Benzy ⚡〢' })
      .setTimestamp();
    await interaction.reply({ embeds: [embed] });
  }
};
export default command;

import { ChatInputCommandInteraction, EmbedBuilder, SlashCommandBuilder } from 'discord.js';
import type { Command } from '../types/command.js';

const command: Command = {
  data: new SlashCommandBuilder().setName('owner').setDescription('View Wimply owner information'),
  async execute(interaction: ChatInputCommandInteraction) {
    const avatar = interaction.client.user.displayAvatarURL({ size: 512 });
    const embed = new EmbedBuilder()
      .setColor(0x5865f2)
      .setTitle('╭─〔 👑 WIMPLY OWNER 〕─╮')
      .setDescription('〢 **Meet the creator behind Wimply.**\n〢 Some private details are intentionally fictional for this demo.')
      .setAuthor({ name: 'SHAX • Wimply Founder', iconURL: avatar })
      .setThumbnail(avatar)
      .addFields(
        { name: '╭ 👤 Identity', value: '〢 **Name:** Benzy\n〢 **Alias:** SHAX\n〢 **Role:** Founder & Developer', inline: false },
        { name: '╭ 🛠️ Developer', value: '〢 **Stack:** TypeScript • Node.js • Prisma\n〢 **Focus:** Discord bots & automation', inline: true },
        { name: '╭ 🌍 Location', value: '〢 **Nigeria 🇳🇬**\n〢 **City:** New Avalon *(fictional)*', inline: true },
        { name: '╭ 🎯 Mission', value: '〢 Building Wimply into a polished all-in-one Discord economy experience.', inline: false },
        { name: '╭ 🔐 Private', value: '〢 Email: `owner@wimply.example`\n〢 Phone: `+234 800 000 0000`\n〢 These are **fictional demo details**.', inline: false }
      )
      .setImage(avatar)
      .setFooter({ text: 'Wimply V2.0 • Built by SHAX ⚡' })
      .setTimestamp();
    await interaction.reply({ embeds: [embed] });
  }
};

export default command;

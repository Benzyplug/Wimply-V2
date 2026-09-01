import { ChatInputCommandInteraction, EmbedBuilder, SlashCommandBuilder } from 'discord.js';
import type { Command } from '../types/command.js';

const command: Command = {
  data: new SlashCommandBuilder().setName('owner').setDescription('View accurate Wimply creator information'),
  async execute(interaction: ChatInputCommandInteraction) {
    const avatar = interaction.client.user.displayAvatarURL({ size: 512 });

    const embed = new EmbedBuilder()
      .setColor(0x5865f2)
      .setTitle('╭─〔 👑 WIMPLY CREATOR 〕─╮')
      .setDescription('〢 **Meet the creator behind Wimply.**\n〢 Public creator information is shown below; private contact details are intentionally fictional demo values.')
      .setThumbnail(avatar)
      .addFields(
        {
          name: '╭ 👤 Identity',
          value: '〢 **Name:** Benzy\n〢 **Alias:** SHAX\n〢 **Role:** Founder & Developer',
          inline: false
        },
        {
          name: '╭ 🛠️ Development',
          value: '〢 **Stack:** TypeScript • Node.js • Prisma\n〢 **Focus:** Discord bots & automation',
          inline: true
        },
        {
          name: '╭ 🌍 Nationality',
          value: '〢 🇳🇬 **Nigeria**\n〢 🇬🇧 **United Kingdom**',
          inline: true
        },
        {
          name: '╭ 📍 Location',
          value: '〢 **Country:** Nigeria 🇳🇬\n〢 **City:** New Avalon *(fictional)*',
          inline: false
        },
        {
          name: '╭ 🎯 Mission',
          value: '〢 Building Wimply into a polished all-in-one Discord economy experience.\n〢 **Project:** Wimply V2.0',
          inline: false
        },
        {
          name: '╭ 🔐 Private / Demo',
          value: '〢 **Email:** `owner@wimply.example`\n〢 **Phone:** `+234 800 000 0000`\n〢 These values are fictional and are not real contact information.',
          inline: false
        }
      )
      .setImage(avatar)
      .setFooter({ text: 'Wimply V2.0 • Official Bot' })
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  }
};

export default command;

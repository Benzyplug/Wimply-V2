import { ChatInputCommandInteraction, EmbedBuilder, SlashCommandBuilder, version as discordJsVersion } from 'discord.js';
import type { Command } from '../types/command.js';
import { prisma } from '../services/database.js';

function formatUptime(seconds: number) {
  const days = Math.floor(seconds / 86_400);
  const hours = Math.floor((seconds % 86_400) / 3_600);
  const minutes = Math.floor((seconds % 3_600) / 60);
  const secs = Math.floor(seconds % 60);
  return `${days}d ${hours}h ${minutes}m ${secs}s`;
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 ** 3) return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
  return `${(bytes / 1024 ** 3).toFixed(2)} GB`;
}

const command: Command = {
  data: new SlashCommandBuilder().setName('bot').setDescription('View live Wimply bot information'),
  async execute(interaction: ChatInputCommandInteraction) {
    const botUser = await interaction.client.user.fetch(true);
    const avatar = botUser.displayAvatarURL({ size: 1024 });
    const banner = botUser.bannerURL({ size: 2048 }) ?? null;
    const applicationId = interaction.client.application?.id ?? botUser.id;
    const guildCount = interaction.client.guilds.cache.size;
    const cachedMemberTotal = interaction.client.guilds.cache.reduce((total, guild) => total + guild.memberCount, 0);
    const commandCount = interaction.client.commands?.size ?? 0;
    const uptime = formatUptime(process.uptime());
    const memory = process.memoryUsage();
    const latency = interaction.client.ws.ping;

    let databaseStatus = '🟢 Online';
    try {
      await prisma.$queryRaw`SELECT 1`;
    } catch {
      databaseStatus = '🔴 Unavailable';
    }

    const createdAt = botUser.createdAt.toLocaleString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });

    const embed = new EmbedBuilder()
      .setColor(0x5865f2)
      .setTitle('╭─〔 🤖 WIMPLY BOT 〕─╮')
      .setDescription(`〢 **Wimply V2.0** — live bot diagnostics & identity\n〢 **Status:** 🟢 Online • **Latency:** ${latency}ms`)
      .setThumbnail(avatar)
      .addFields(
        {
          name: '╭ 🤖 Bot Identity',
          value: `〢 **Name:** ${botUser.username}\n〢 **ID:** \`${botUser.id}\`\n〢 **Application ID:** \`${applicationId}\`\n〢 **Created:** ${createdAt}`,
          inline: false
        },
        {
          name: '╭ ⚙️ Runtime',
          value: `〢 **Node.js:** ${process.version}\n〢 **discord.js:** v${discordJsVersion}\n〢 **Uptime:** ${uptime}\n〢 **Memory:** ${formatBytes(memory.rss)}`,
          inline: true
        },
        {
          name: '╭ 📊 Scale',
          value: `〢 **Servers:** ${guildCount.toLocaleString()}\n〢 **Cached members:** ${cachedMemberTotal.toLocaleString()}\n〢 **Commands:** ${commandCount.toLocaleString()}`,
          inline: true
        },
        {
          name: '╭ 🗄️ Infrastructure',
          value: `〢 **Database:** ${databaseStatus}\n〢 **ORM:** Prisma\n〢 **Deployment:** DeployHatch\n〢 **Prefix:** \`#\``,
          inline: true
        },
        {
          name: '╭ 🎰 Features',
          value: '〢 Economy • Gambling • Profiles • Inventory\n〢 Mod tools • Automation • Prefix commands\n〢 Animated games • Smart reactions • Styled embeds',
          inline: false
        },
        {
          name: '╭ 🔗 Command Interfaces',
          value: '〢 Slash: `/bot`\n〢 Prefix: `#bot`\n〢 Command center: `/help` or `#help`',
          inline: false
        }
      )
      .setFooter({ text: 'Wimply V2.0 • Official Bot' })
      .setTimestamp();

    if (banner) embed.setImage(banner);
    else embed.setImage(avatar);

    await interaction.reply({ embeds: [embed] });
  }
};

export default command;

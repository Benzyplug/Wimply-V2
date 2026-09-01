import { AppError } from '../../utils/errors.js';
import { ChatInputCommandInteraction, ChannelType, SlashCommandBuilder } from 'discord.js';
import type { Command } from '../../types/command.js';
import { createSuccessEmbed } from '../../utils/embeds.js';
import { assertAdmin } from '../../utils/permission.js';
import { setGuildConfig } from '../../services/adminService.js';
import { addReactionRule, clearReactionRules, deleteReactionRule, getReactionRules } from '../../services/reactionService.js';

const command: Command = {
  data: new SlashCommandBuilder()
    .setName('config')
    .setDescription('Update server economy and automation settings')
    .addSubcommand((sub) =>
      sub.setName('currency').setDescription('Set currency display settings')
        .addStringOption((option) => option.setName('name').setDescription('Currency name').setRequired(true))
        .addStringOption((option) => option.setName('emoji').setDescription('Currency emoji').setRequired(true))
    )
    .addSubcommand((sub) =>
      sub.setName('cooldown').setDescription('Update an economy cooldown in hours')
        .addStringOption((option) => option.setName('type').setDescription('Cooldown type').setRequired(true)
          .addChoices(
            { name: 'daily', value: 'dailyCooldown' }, { name: 'weekly', value: 'weeklyCooldown' },
            { name: 'monthly', value: 'monthlyCooldown' }, { name: 'work', value: 'workCooldown' },
            { name: 'crime', value: 'crimeCooldown' }, { name: 'rob', value: 'robCooldown' }, { name: 'beg', value: 'begCooldown' }
          ))
        .addIntegerOption((option) => option.setName('hours').setDescription('Cooldown in hours').setRequired(true))
    )
    .addSubcommand((sub) =>
      sub.setName('interest').setDescription('Set the bank interest rate')
        .addNumberOption((option) => option.setName('rate').setDescription('Interest rate as a decimal').setRequired(true))
    )
    .addSubcommandGroup((group) =>
      group.setName('reaction').setDescription('Configure automatic message reactions')
        .addSubcommand((sub) =>
          sub.setName('add').setDescription('Add an automatic reaction rule')
            .addStringOption((option) => option.setName('trigger').setDescription('Text that should trigger the reaction').setRequired(true).setMaxLength(100))
            .addStringOption((option) => option.setName('emoji').setDescription('Emoji Wimply should react with').setRequired(true).setMaxLength(100))
            .addChannelOption((option) => option.setName('channel').setDescription('Channel where this rule applies').setRequired(true).addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement))
        )
        .addSubcommand((sub) => sub.setName('list').setDescription("List this server's reaction rules"))
        .addSubcommand((sub) => sub.setName('remove').setDescription('Remove a reaction rule by ID').addStringOption((option) => option.setName('id').setDescription('Reaction rule ID').setRequired(true)))
        .addSubcommand((sub) => sub.setName('clear').setDescription('Remove every reaction rule in this server'))
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    assertAdmin(interaction);
    if (!interaction.guildId) {
      await interaction.reply({ embeds: [createSuccessEmbed('Server Only', 'This command must be used in a guild.')] });
      return;
    }

    await interaction.deferReply({ ephemeral: true });
    const group = interaction.options.getSubcommandGroup(false);
    const subcommand = interaction.options.getSubcommand();

    if (group === 'reaction') {
      if (subcommand === 'add') {
        const trigger = interaction.options.getString('trigger', true).trim();
        const emoji = interaction.options.getString('emoji', true).trim();
        const channel = interaction.options.getChannel('channel', true);
        if (!trigger) throw new AppError('Trigger cannot be empty.');
        if (!emoji) throw new AppError('Emoji cannot be empty.');
        const rule = await addReactionRule(interaction.guildId, { trigger, emoji, channelId: channel.id });
        await interaction.editReply({ embeds: [createSuccessEmbed('Reaction Rule Added', `╭〔 🤖 AUTOMATION 〕╮\n〢 **ID:** \`${rule.id}\`\n〢 **Trigger:** ${trigger}\n〢 **Emoji:** ${emoji}\n〢 **Channel:** <#${channel.id}>`)] });
        return;
      }

      if (subcommand === 'list') {
        const rules = await getReactionRules(interaction.guildId);
        if (!rules.length) {
          await interaction.editReply({ embeds: [createSuccessEmbed('Reaction Rules', '〢 No automation rules are configured yet.')] });
          return;
        }
        await interaction.editReply({ embeds: [createSuccessEmbed('Reaction Rules', rules.map((rule) => `〢 \`${rule.id}\` • ${rule.emoji} • **${rule.trigger}** • <#${rule.channelId}>`).join('\n'))] });
        return;
      }

      if (subcommand === 'remove') {
        const id = interaction.options.getString('id', true).trim();
        const deleted = await deleteReactionRule(interaction.guildId, id);
        if (!deleted) throw new AppError(`Reaction rule \`${id}\` was not found.`);
        await interaction.editReply({ embeds: [createSuccessEmbed('Reaction Rule Removed', `〢 Removed rule \`${id}\`.\n╰─〔 🤖 Automation updated 〕─╯`)] });
        return;
      }

      if (subcommand === 'clear') {
        const count = await clearReactionRules(interaction.guildId);
        await interaction.editReply({ embeds: [createSuccessEmbed('Reaction Rules Cleared', `〢 Removed **${count}** automation rule(s).\n╰─〔 🤖 Automation reset 〕─╯`)] });
        return;
      }
    }

    const type = interaction.options.getString('type');
    const name = interaction.options.getString('name');
    const emoji = interaction.options.getString('emoji');
    const hours = interaction.options.getInteger('hours');
    const rate = interaction.options.getNumber('rate');
    const updates: Record<string, string | number> = {};

    if (subcommand === 'currency') {
      if (!name || !emoji) throw new AppError('Currency name and emoji are required.');
      updates.currencyName = name;
      updates.currencyEmoji = emoji;
    } else if (subcommand === 'cooldown') {
      if (!type || hours === null || hours < 0) throw new AppError('Choose a valid cooldown and a non-negative number of hours.');
      updates[type] = hours;
    } else if (subcommand === 'interest') {
      if (rate === null || rate < 0) throw new AppError('Interest rate must be zero or greater.');
      updates.interestRate = rate;
    }

    const config = await setGuildConfig(interaction.guildId, updates as any);
    await interaction.editReply({ embeds: [createSuccessEmbed('Server Configuration Updated', `╭〔 ⚙️ CONFIG 〕╮\n〢 **Currency:** ${config.currencyEmoji} ${config.currencyName}\n〢 **Interest:** ${(config.interestRate * 100).toFixed(2)}%\n\n╰─〔 ✨ Wimply settings saved 〕─╯`)] });
  }
};

export default command;

import { AppError } from '../../utils/errors.js';
import {
  ChatInputCommandInteraction,
  ChannelType,
  SlashCommandBuilder
} from 'discord.js';
import type { Command } from '../../types/command.js';
import { createSuccessEmbed } from '../../utils/embeds.js';
import { assertAdmin } from '../../utils/permission.js';
import { setGuildConfig } from '../../services/adminService.js';
import {
  addReactionRule,
  clearReactionRules,
  deleteReactionRule,
  getReactionRules
} from '../../services/reactionService.js';

const command: Command = {
  data: new SlashCommandBuilder()
    .setName('config')
    .setDescription('Update server economy and reaction settings')

    .addSubcommand((sub) =>
      sub
        .setName('currency')
        .setDescription('Set currency display settings')
        .addStringOption((option) =>
          option
            .setName('name')
            .setDescription('Currency name')
            .setRequired(true)
        )
        .addStringOption((option) =>
          option
            .setName('emoji')
            .setDescription('Currency emoji')
            .setRequired(true)
        )
    )

    .addSubcommand((sub) =>
      sub
        .setName('cooldown')
        .setDescription('Update an economy cooldown in hours')
        .addStringOption((option) =>
          option
            .setName('type')
            .setDescription('Cooldown type')
            .setRequired(true)
            .addChoices(
              { name: 'daily', value: 'dailyCooldown' },
              { name: 'weekly', value: 'weeklyCooldown' },
              { name: 'monthly', value: 'monthlyCooldown' },
              { name: 'work', value: 'workCooldown' },
              { name: 'crime', value: 'crimeCooldown' },
              { name: 'rob', value: 'robCooldown' },
              { name: 'beg', value: 'begCooldown' }
            )
        )
        .addIntegerOption((option) =>
          option
            .setName('hours')
            .setDescription('Cooldown in hours')
            .setRequired(true)
        )
    )

    .addSubcommand((sub) =>
      sub
        .setName('tax')
        .setDescription('Set the transaction tax percentage')
        .addIntegerOption((option) =>
          option
            .setName('percent')
            .setDescription('Tax percent')
            .setRequired(true)
        )
    )

    .addSubcommand((sub) =>
      sub
        .setName('interest')
        .setDescription('Set the bank interest rate')
        .addNumberOption((option) =>
          option
            .setName('rate')
            .setDescription('Interest rate as a decimal')
            .setRequired(true)
        )
    )

    .addSubcommandGroup((group) =>
      group
        .setName('reaction')
        .setDescription('Configure automatic message reactions')

        .addSubcommand((sub) =>
          sub
            .setName('add')
            .setDescription('Add an automatic reaction rule')
            .addStringOption((option) =>
              option
                .setName('trigger')
                .setDescription('Text that should trigger the reaction')
                .setRequired(true)
                .setMaxLength(100)
            )
            .addStringOption((option) =>
              option
                .setName('emoji')
                .setDescription('Emoji Wimply should react with')
                .setRequired(true)
                .setMaxLength(100)
            )
            .addChannelOption((option) =>
              option
                .setName('channel')
                .setDescription('Channel where this rule applies')
                .setRequired(true)
                .addChannelTypes(
                  ChannelType.GuildText,
                  ChannelType.GuildAnnouncement
                )
            )
        )

        .addSubcommand((sub) =>
          sub
            .setName('list')
            .setDescription("List this server's reaction rules")
        )

        .addSubcommand((sub) =>
          sub
            .setName('remove')
            .setDescription('Remove a reaction rule by ID')
            .addStringOption((option) =>
              option
                .setName('id')
                .setDescription('Reaction rule ID')
                .setRequired(true)
            )
        )

        .addSubcommand((sub) =>
          sub
            .setName('clear')
            .setDescription('Remove every reaction rule in this server')
        )
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    assertAdmin(interaction);

    if (!interaction.guildId) {
      await interaction.reply({
        content: 'This command must be used in a guild.',
        ephemeral: true
      });
      return;
    }

    await interaction.deferReply({ ephemeral: true });

    const group = interaction.options.getSubcommandGroup(false);
    const subcommand = interaction.options.getSubcommand();

    // ==============================
    // REACTION CONFIGURATION
    // ==============================

    if (group === 'reaction') {
      if (subcommand === 'add') {
        const trigger = interaction.options
          .getString('trigger', true)
          .trim();

        const emoji = interaction.options
          .getString('emoji', true)
          .trim();

        const channel = interaction.options.getChannel('channel', true);

        if (!trigger) {
          throw new AppError('Trigger cannot be empty.');
        }

        if (!emoji) {
          throw new AppError('Emoji cannot be empty.');
        }

        const rule = await addReactionRule(interaction.guildId, {
          trigger,
          emoji,
          channelId: channel.id
        });

        await interaction.editReply({
          embeds: [
            createSuccessEmbed(
              'Reaction Rule Added',
              `**ID:** \`${rule.id}\`\n` +
                `**Trigger:** ${trigger}\n` +
                `**Emoji:** ${emoji}\n` +
                `**Channel:** <#${channel.id}>`
            )
          ]
        });

        return;
      }

      if (subcommand === 'list') {
        const rules = await getReactionRules(interaction.guildId);

        if (rules.length === 0) {
          await interaction.editReply(
            'No reaction rules are configured for this server.'
          );
          return;
        }

        const lines = rules.map(
          (rule) =>
            `\`${rule.id}\` • ${rule.emoji} • **${rule.trigger}** • <#${rule.channelId}>`
        );

        await interaction.editReply({
          embeds: [
            createSuccessEmbed('Reaction Rules', lines.join('\n'))
          ]
        });

        return;
      }

      if (subcommand === 'remove') {
        const id = interaction.options
          .getString('id', true)
          .trim();

        const deleted = await deleteReactionRule(
          interaction.guildId,
          id
        );

        if (!deleted) {
          throw new AppError(
            'Reaction rule not found. Use `/config reaction list` to see rule IDs.'
          );
        }

        await interaction.editReply({
          embeds: [
            createSuccessEmbed(
              'Reaction Rule Removed',
              `Removed reaction rule \`${id}\`.`
            )
          ]
        });

        return;
      }

      if (subcommand === 'clear') {
        const count = await clearReactionRules(
          interaction.guildId
        );

        await interaction.editReply({
          embeds: [
            createSuccessEmbed(
              'Reaction Rules Cleared',
              `Removed **${count}** reaction rule(s).`
            )
          ]
        });

        return;
      }
    }

    // ==============================
    // ECONOMY CONFIGURATION
    // ==============================

    const type = interaction.options.getString('type');
    const name = interaction.options.getString('name');
    const emoji = interaction.options.getString('emoji');
    const hours = interaction.options.getInteger('hours');
    const percent = interaction.options.getInteger('percent');
    const rate = interaction.options.getNumber('rate');

    const updates: Partial<{
      currencyName: string;
      currencyEmoji: string;
      dailyCooldown: number;
      weeklyCooldown: number;
      monthlyCooldown: number;
      workCooldown: number;
      crimeCooldown: number;
      robCooldown: number;
      begCooldown: number;
      taxPercent: number;
      interestRate: number;
    }> = {};

    if (subcommand === 'currency') {
      if (!name || !emoji) {
        throw new AppError(
          'Currency name and emoji are required.'
        );
      }

      updates.currencyName = name;
      updates.currencyEmoji = emoji;
    }

    if (subcommand === 'cooldown') {
      if (!type || hours === null) {
        throw new AppError(
          'Cooldown type and hours are required.'
        );
      }

      const cooldownKey = type as
        | 'dailyCooldown'
        | 'weeklyCooldown'
        | 'monthlyCooldown'
        | 'workCooldown'
        | 'crimeCooldown'
        | 'robCooldown'
        | 'begCooldown';

      updates[cooldownKey] = hours;
    }

    if (subcommand === 'tax') {
      if (percent === null) {
        throw new AppError(
          'Tax percentage is required.'
        );
      }

      updates.taxPercent = percent;
    }

    if (subcommand === 'interest') {
      if (rate === null) {
        throw new AppError(
          'Interest rate is required.'
        );
      }

      updates.interestRate = rate;
    }

    const config = await setGuildConfig(
      interaction.guildId,
      updates as any
    );

    await interaction.editReply({
      embeds: [
        createSuccessEmbed(
          'Server Configuration Updated',
          `Updated settings for ${config.currencyName}.`
        )
      ]
    });
  }
};

export default command;
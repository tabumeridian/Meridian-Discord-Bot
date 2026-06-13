import {
  ActionRowBuilder,
  PermissionFlagsBits,
  SlashCommandBuilder,
  type ButtonBuilder
} from "discord.js";
import { createMeridianLogoAttachment } from "../../utils/branding.js";
import type { SlashCommand } from "../types.js";
import {
  createRulesVerificationButton,
  createRulesVerificationEmbed
} from "../../components/rulesVerification.js";

export const setupRulesPanelCommand: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName("setup-rules-panel")
    .setDescription("Post the Meridian rules verification panel in this channel.")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .setDMPermission(false),
  async execute(interaction) {
    if (!interaction.inCachedGuild()) {
      await interaction.reply({
        content: "This command can only be used in a server.",
        ephemeral: true
      });
      return;
    }

    if (!interaction.memberPermissions.has(PermissionFlagsBits.Administrator)) {
      await interaction.reply({
        content: "Only administrators can use this command.",
        ephemeral: true
      });
      return;
    }

    if (!interaction.channel?.isSendable()) {
      await interaction.reply({
        content: "I cannot post a rules panel in this channel.",
        ephemeral: true
      });
      return;
    }

    await interaction.deferReply({ ephemeral: true });

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(createRulesVerificationButton());

    await interaction.channel.send({
      embeds: [createRulesVerificationEmbed()],
      components: [row],
      files: [createMeridianLogoAttachment()]
    });

    await interaction.editReply("Rules verification panel posted.");
  }
};

import { PermissionFlagsBits, SlashCommandBuilder } from "discord.js";
import {
  createRoleSelectorActionRow,
  createRoleSelectorEmbed
} from "../../components/roleSelector.js";
import { createMeridianLogoAttachment } from "../../utils/branding.js";
import type { SlashCommand } from "../types.js";

export const setupRoleSelectorCommand: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName("setup-role-selector")
    .setDescription("Post the Meridian optional notification role selector.")
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
        content: "I cannot post the role selector in this channel.",
        ephemeral: true
      });
      return;
    }

    await interaction.deferReply({ ephemeral: true });

    await interaction.channel.send({
      embeds: [createRoleSelectorEmbed()],
      components: [createRoleSelectorActionRow()],
      files: [createMeridianLogoAttachment()]
    });

    await interaction.editReply("Role selector posted.");
  }
};

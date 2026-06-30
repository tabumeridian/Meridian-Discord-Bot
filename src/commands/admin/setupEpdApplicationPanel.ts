import { PermissionFlagsBits, SlashCommandBuilder } from "discord.js";
import {
  createEpdApplicationPanelActionRow,
  createEpdApplicationPanelEmbed
} from "../../components/applications.js";
import { createMeridianLogoAttachment } from "../../utils/branding.js";
import type { SlashCommand } from "../types.js";

export const setupEpdApplicationPanelCommand: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName("setup-epd-application-panel")
    .setDescription("Post the Everon Police Department application panel in this channel.")
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
        content: "I cannot post the EPD application panel in this channel.",
        ephemeral: true
      });
      return;
    }

    await interaction.deferReply({ ephemeral: true });

    await interaction.channel.send({
      embeds: [createEpdApplicationPanelEmbed()],
      components: [createEpdApplicationPanelActionRow()],
      files: [createMeridianLogoAttachment()]
    });

    await interaction.editReply("EPD application panel posted.");
  }
};

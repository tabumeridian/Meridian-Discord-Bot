import { PermissionFlagsBits, SlashCommandBuilder } from "discord.js";
import { createAnnouncementModal } from "../../components/announcement.js";
import type { SlashCommand } from "../types.js";

export const announcementCommand: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName("announcement")
    .setDescription("Create a branded Meridian announcement embed.")
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

    if (!interaction.channelId) {
      await interaction.reply({
        content: "I could not determine where to post the announcement.",
        ephemeral: true
      });
      return;
    }

    await interaction.showModal(createAnnouncementModal(interaction.channelId));
  }
};

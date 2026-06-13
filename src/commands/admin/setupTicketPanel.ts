import { PermissionFlagsBits, SlashCommandBuilder } from "discord.js";
import {
  createTicketPanelActionRow,
  createTicketPanelEmbed
} from "../../components/tickets.js";
import { createMeridianLogoAttachment } from "../../utils/branding.js";
import type { SlashCommand } from "../types.js";

export const setupTicketPanelCommand: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName("setup-ticket-panel")
    .setDescription("Post the Meridian ticket panel in this channel.")
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
        content: "I cannot post the ticket panel in this channel.",
        ephemeral: true
      });
      return;
    }

    await interaction.deferReply({ ephemeral: true });

    await interaction.channel.send({
      embeds: [createTicketPanelEmbed()],
      components: [createTicketPanelActionRow()],
      files: [createMeridianLogoAttachment()]
    });

    await interaction.editReply("Ticket panel posted.");
  }
};

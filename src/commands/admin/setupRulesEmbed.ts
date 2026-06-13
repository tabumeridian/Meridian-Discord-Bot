import { PermissionFlagsBits, SlashCommandBuilder } from "discord.js";
import { createCommunityRulesEmbed } from "../../components/rulesEmbed.js";
import { createMeridianEmbedPayload } from "../../utils/branding.js";
import type { SlashCommand } from "../types.js";

export const setupRulesEmbedCommand: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName("setup-rules-embed")
    .setDescription("Post the Meridian community rules embed in this channel.")
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
        content: "I cannot post the rules embed in this channel.",
        ephemeral: true
      });
      return;
    }

    await interaction.deferReply({ ephemeral: true });

    await interaction.channel.send(createMeridianEmbedPayload(createCommunityRulesEmbed()));

    await interaction.editReply("Rules embed posted.");
  }
};

import {
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  MessageFlags,
  PermissionsBitField,
  type ButtonInteraction
} from "discord.js";
import { config } from "../config/env.js";
import { logger } from "../logger.js";
import { applyMeridianBranding } from "../utils/branding.js";
import { sendAuditLog } from "../utils/auditLog.js";

export const rulesVerificationButtonId = "rules-verification:enter-meridian";

export function createRulesVerificationEmbed(): EmbedBuilder {
  return applyMeridianBranding(new EmbedBuilder())
    .setTitle("Welcome to Meridian Network")
    .setDescription(
      [
        "Before accessing the community, please take a moment to review our rules.",
        "",
        "By clicking **Enter Meridian**, you confirm that:",
        "",
        "\u2022 You have read and understand the server rules.",
        "\u2022 You agree to follow all community guidelines.",
        "\u2022 You understand that violations may result in administrative action.",
        "",
        "Thank you for helping us build a positive and enjoyable community.",
        "",
        "Click the button below to begin your journey in Meridian."
      ].join("\n")
    );
}

export function createRulesVerificationButton(): ButtonBuilder {
  return new ButtonBuilder()
    .setCustomId(rulesVerificationButtonId)
    .setLabel("Enter Meridian")
    .setStyle(ButtonStyle.Primary);
}

async function writeAuditLog(interaction: ButtonInteraction): Promise<void> {
  if (!interaction.guild) {
    return;
  }

  await sendAuditLog(
    interaction.guild,
    `${interaction.user.tag} (${interaction.user.id}) verified through the rules panel.`
  );
}

export async function handleRulesVerificationButton(interaction: ButtonInteraction): Promise<void> {
  if (!interaction.inCachedGuild()) {
    await interaction.reply({
      content: "Rules verification is only available inside the Meridian server.",
      flags: MessageFlags.Ephemeral
    });
    return;
  }

  if (!config.civilianRoleId) {
    logger.warn("CIVILIAN_ROLE_ID is not configured");
    await interaction.reply({
      content: "Verification is not configured yet. Please contact an administrator.",
      flags: MessageFlags.Ephemeral
    });
    return;
  }

  const role = await interaction.guild.roles.fetch(config.civilianRoleId);

  if (!role) {
    logger.warn(`Configured Meridian role ${config.civilianRoleId} was not found`);
    await interaction.reply({
      content: "The Meridian role could not be found. Please contact an administrator.",
      flags: MessageFlags.Ephemeral
    });
    return;
  }

  const member = await interaction.guild.members.fetch(interaction.user.id);

  if (member.roles.cache.has(role.id)) {
    await interaction.reply({
      content: "You are already verified.",
      flags: MessageFlags.Ephemeral
    });
    return;
  }

  const botMember = interaction.guild.members.me ?? await interaction.guild.members.fetchMe();

  if (!botMember.permissions.has(PermissionsBitField.Flags.ManageRoles)) {
    logger.warn("Bot is missing Manage Roles permission for rules verification");
    await interaction.reply({
      content: "I do not have permission to assign roles. Please contact an administrator.",
      flags: MessageFlags.Ephemeral
    });
    return;
  }

  if (role.comparePositionTo(botMember.roles.highest) >= 0) {
    logger.warn(`Configured Meridian role ${role.id} is not below the bot's highest role`);
    await interaction.reply({
      content: "I cannot assign the Meridian role because it is not below my highest role.",
      flags: MessageFlags.Ephemeral
    });
    return;
  }

  await member.roles.add(role, "Accepted Meridian rules verification panel");

  await interaction.reply({
    content: "Welcome to Meridian. You now have access to the community.",
    flags: MessageFlags.Ephemeral
  });

  await writeAuditLog(interaction);
}

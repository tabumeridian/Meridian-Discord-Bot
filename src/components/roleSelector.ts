import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  MessageFlags,
  PermissionsBitField,
  type ButtonInteraction
} from "discord.js";
import { logger } from "../logger.js";
import { applyMeridianBranding } from "../utils/branding.js";
import { sendAuditLog } from "../utils/auditLog.js";

const roleSelectorButtonPrefix = "role-selector:";

interface RoleSelectorOption {
  key: string;
  label: string;
  roleId: string;
  description: string;
}

export const roleSelectorOptions: readonly RoleSelectorOption[] = [
  {
    key: "event-pings",
    label: "Event Pings",
    roleId: "1514919170116948130",
    description: "\uD83C\uDF89 Event Pings \u2014 Get notified for community events."
  },
  {
    key: "server-updates",
    label: "Server Updates",
    roleId: "1514919211141435462",
    description: "\uD83D\uDCE2 Server Updates \u2014 Get notified for important server updates."
  },
  {
    key: "sneak-peeks",
    label: "Sneak Peeks",
    roleId: "1514919287838740541",
    description: "\uD83D\uDC40 Sneak Peeks \u2014 Get notified for previews, teasers, and development looks."
  }
];

export function isRoleSelectorButtonId(customId: string): boolean {
  return customId.startsWith(roleSelectorButtonPrefix);
}

function createRoleSelectorButtonId(option: RoleSelectorOption): string {
  return `${roleSelectorButtonPrefix}${option.key}`;
}

function getRoleSelectorOption(customId: string): RoleSelectorOption | undefined {
  const key = customId.slice(roleSelectorButtonPrefix.length);
  return roleSelectorOptions.find((option) => option.key === key);
}

export function createRoleSelectorEmbed(): EmbedBuilder {
  return applyMeridianBranding(new EmbedBuilder())
    .setTitle("Meridian Roles")
    .setDescription(
      [
        "Choose which optional notification roles you want to receive.",
        "",
        "Click a button below to toggle that role on or off.",
        "",
        "**Available Roles:**",
        ...roleSelectorOptions.map((option) => option.description)
      ].join("\n")
    );
}

export function createRoleSelectorActionRow(): ActionRowBuilder<ButtonBuilder> {
  const row = new ActionRowBuilder<ButtonBuilder>();

  for (const option of roleSelectorOptions) {
    row.addComponents(
      new ButtonBuilder()
        .setCustomId(createRoleSelectorButtonId(option))
        .setLabel(option.label)
        .setStyle(ButtonStyle.Primary)
    );
  }

  return row;
}

export async function handleRoleSelectorButton(interaction: ButtonInteraction): Promise<void> {
  if (!interaction.inCachedGuild()) {
    await interaction.reply({
      content: "Role selection is only available inside the Meridian server.",
      flags: MessageFlags.Ephemeral
    });
    return;
  }

  const option = getRoleSelectorOption(interaction.customId);

  if (!option) {
    logger.warn(`Unknown role selector button ID: ${interaction.customId}`);
    await interaction.reply({
      content: "That role selector option is no longer available.",
      flags: MessageFlags.Ephemeral
    });
    return;
  }

  const role = await interaction.guild.roles.fetch(option.roleId).catch((error: unknown) => {
    logger.warn(`Could not fetch optional role ${option.roleId}`, error);
    return null;
  });

  if (!role) {
    await interaction.reply({
      content: `The ${option.label} role could not be found. Please contact an administrator.`,
      flags: MessageFlags.Ephemeral
    });
    return;
  }

  const member = await interaction.guild.members.fetch(interaction.user.id);
  const botMember = interaction.guild.members.me ?? await interaction.guild.members.fetchMe();

  if (!botMember.permissions.has(PermissionsBitField.Flags.ManageRoles)) {
    logger.warn("Bot is missing Manage Roles permission for role selector");
    await interaction.reply({
      content: "I do not have permission to manage roles. Please contact an administrator.",
      flags: MessageFlags.Ephemeral
    });
    return;
  }

  if (role.comparePositionTo(botMember.roles.highest) >= 0) {
    logger.warn(`Optional role ${role.id} is not below the bot's highest role`);
    await interaction.reply({
      content: `I cannot manage the ${option.label} role because it is not below my highest role.`,
      flags: MessageFlags.Ephemeral
    });
    return;
  }

  const memberHasRole = member.roles.cache.has(role.id);
  const action = memberHasRole ? "removed" : "added";

  try {
    if (memberHasRole) {
      await member.roles.remove(role, "Toggled optional notification role");
    } else {
      await member.roles.add(role, "Toggled optional notification role");
    }
  } catch (error) {
    logger.error(`Failed to ${action === "added" ? "add" : "remove"} optional role ${role.id}`, error);
    await interaction.reply({
      content: `I could not update the ${option.label} role. Please contact an administrator.`,
      flags: MessageFlags.Ephemeral
    });
    return;
  }

  await interaction.reply({
    content: `${action === "added" ? "Added" : "Removed"} the ${option.label} role.`,
    flags: MessageFlags.Ephemeral
  });

  await sendAuditLog(
    interaction.guild,
    `${interaction.user.tag} (${interaction.user.id}) ${action} optional role ${option.label} (${role.id}).`
  );
}

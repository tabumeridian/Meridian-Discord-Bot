import {
  ActionRowBuilder,
  ChannelType,
  EmbedBuilder,
  MessageFlags,
  ModalBuilder,
  PermissionFlagsBits,
  TextInputBuilder,
  TextInputStyle,
  type GuildBasedChannel,
  type ModalSubmitInteraction
} from "discord.js";
import { logger } from "../logger.js";
import { applyMeridianBranding, createMeridianEmbedPayload } from "../utils/branding.js";

const announcementModalPrefix = "announcement:create:";
const announcementTitleInputId = "announcement:title";
const announcementMessageInputId = "announcement:message";

type SendableAnnouncementChannel = GuildBasedChannel & {
  send(options: ReturnType<typeof createMeridianEmbedPayload> & { allowedMentions: { parse: [] } }): Promise<unknown>;
};

function canSendAnnouncement(channel: GuildBasedChannel): channel is SendableAnnouncementChannel {
  return (
    "send" in channel &&
    (
      channel.type === ChannelType.GuildText ||
      channel.type === ChannelType.GuildAnnouncement
    )
  );
}

export function isAnnouncementModalId(customId: string): boolean {
  return customId.startsWith(announcementModalPrefix);
}

function getAnnouncementTargetChannelId(customId: string): string | undefined {
  const channelId = customId.slice(announcementModalPrefix.length);
  return channelId || undefined;
}

export function createAnnouncementModal(channelId: string): ModalBuilder {
  const titleInput = new TextInputBuilder()
    .setCustomId(announcementTitleInputId)
    .setLabel("Title")
    .setStyle(TextInputStyle.Short)
    .setRequired(true)
    .setMaxLength(256);

  const messageInput = new TextInputBuilder()
    .setCustomId(announcementMessageInputId)
    .setLabel("Message")
    .setStyle(TextInputStyle.Paragraph)
    .setRequired(true)
    .setMaxLength(4000);

  return new ModalBuilder()
    .setCustomId(`${announcementModalPrefix}${channelId}`)
    .setTitle("Create Announcement")
    .addComponents(
      new ActionRowBuilder<TextInputBuilder>().addComponents(titleInput),
      new ActionRowBuilder<TextInputBuilder>().addComponents(messageInput)
    );
}

export async function handleAnnouncementModal(interaction: ModalSubmitInteraction): Promise<void> {
  if (!interaction.inCachedGuild()) {
    await interaction.reply({
      content: "Announcements can only be posted inside the Meridian server.",
      flags: MessageFlags.Ephemeral
    });
    return;
  }

  if (!interaction.memberPermissions.has(PermissionFlagsBits.Administrator)) {
    await interaction.reply({
      content: "Only administrators can post announcements.",
      flags: MessageFlags.Ephemeral
    });
    return;
  }

  const channelId = getAnnouncementTargetChannelId(interaction.customId);

  if (!channelId) {
    logger.warn(`Announcement modal submitted with invalid custom ID: ${interaction.customId}`);
    await interaction.reply({
      content: "This announcement form is no longer valid. Please run /announcement again.",
      flags: MessageFlags.Ephemeral
    });
    return;
  }

  const channel = await interaction.guild.channels.fetch(channelId).catch((error: unknown) => {
    logger.warn(`Could not fetch announcement channel ${channelId}`, error);
    return null;
  });

  if (!channel || !canSendAnnouncement(channel)) {
    await interaction.reply({
      content: "I cannot post the announcement in the original channel.",
      flags: MessageFlags.Ephemeral
    });
    return;
  }

  const title = interaction.fields.getTextInputValue(announcementTitleInputId).trim();
  const message = interaction.fields.getTextInputValue(announcementMessageInputId).trim();

  if (!title || !message) {
    await interaction.reply({
      content: "Announcement title and message are required.",
      flags: MessageFlags.Ephemeral
    });
    return;
  }

  const embed = applyMeridianBranding(new EmbedBuilder())
    .setTitle(title)
    .setDescription(message);

  await channel.send({
    ...createMeridianEmbedPayload(embed),
    allowedMentions: { parse: [] }
  }).catch(async (error: unknown) => {
    logger.error("Failed to post announcement", error);
    await interaction.reply({
      content: "I could not post that announcement. Please try again.",
      flags: MessageFlags.Ephemeral
    });
  });

  if (!interaction.replied) {
    await interaction.reply({
      content: "Announcement posted.",
      flags: MessageFlags.Ephemeral
    });
  }
}

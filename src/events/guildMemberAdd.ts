import {
  ChannelType,
  EmbedBuilder,
  Events,
  type AttachmentBuilder,
  type GuildBasedChannel,
  type GuildMember
} from "discord.js";
import { config } from "../config/env.js";
import { logger } from "../logger.js";
import { applyMeridianBranding, createMeridianLogoAttachment } from "../utils/branding.js";

type SendableWelcomeChannel = GuildBasedChannel & {
  send(options: { content?: string; embeds: EmbedBuilder[]; files: AttachmentBuilder[] }): Promise<unknown>;
};

function canSendWelcome(channel: GuildBasedChannel): channel is SendableWelcomeChannel {
  return (
    "send" in channel &&
    (
      channel.type === ChannelType.GuildText ||
      channel.type === ChannelType.GuildAnnouncement
    )
  );
}

function createWelcomeEmbed(member: GuildMember): EmbedBuilder {
  return applyMeridianBranding(new EmbedBuilder())
    .setThumbnail(member.user.displayAvatarURL({ size: 256 }))
    .setDescription(
      [
        `Hello ${member},`,
        "",
        "Welcome to **Meridian**, a next-generation Arma Reforger Life experience inspired by the golden era of Arma Life.",
        "",
        "Whether you plan to build an enterprise, enforce the law, run with a rebel gang, or dominate the island's economy, your story begins here."
      ].join("\n")
    );
}

export const guildMemberAddEvent = {
  name: Events.GuildMemberAdd,
  once: false,
  async execute(member: GuildMember): Promise<void> {
    if (!config.welcomeChannelId) {
      logger.warn("WELCOME_CHANNEL_ID is not configured; skipping welcome message");
      return;
    }

    const channel = await member.guild.channels.fetch(config.welcomeChannelId).catch((error: unknown) => {
      logger.warn(`Could not fetch welcome channel ${config.welcomeChannelId}`, error);
      return null;
    });

    if (!channel || !canSendWelcome(channel)) {
      logger.warn(`Welcome channel ${config.welcomeChannelId} is missing or is not sendable`);
      return;
    }

    await channel.send({
      embeds: [createWelcomeEmbed(member)],
      files: [createMeridianLogoAttachment()]
    }).catch((error: unknown) => {
      logger.error(`Failed to send welcome message for ${member.user.tag} (${member.id})`, error);
    });
  }
};

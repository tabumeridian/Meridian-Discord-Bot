import { ChannelType, type Guild, type GuildBasedChannel } from "discord.js";
import { config } from "../config/env.js";
import { logger } from "../logger.js";

type SendableGuildChannel = GuildBasedChannel & {
  send(options: { content: string }): Promise<unknown>;
};

function canSendAuditLog(channel: GuildBasedChannel): channel is SendableGuildChannel {
  return (
    "send" in channel &&
    (
      channel.type === ChannelType.GuildText ||
      channel.type === ChannelType.GuildAnnouncement ||
      channel.type === ChannelType.PublicThread ||
      channel.type === ChannelType.PrivateThread
    )
  );
}

export async function sendAuditLog(guild: Guild, content: string): Promise<void> {
  if (!config.auditLogChannelId) {
    return;
  }

  const channel = await guild.channels.fetch(config.auditLogChannelId).catch((error: unknown) => {
    logger.warn(`Could not fetch audit log channel ${config.auditLogChannelId}`, error);
    return null;
  });

  if (!channel || !canSendAuditLog(channel)) {
    logger.warn(`Audit log channel ${config.auditLogChannelId} is missing or is not sendable`);
    return;
  }

  await channel.send({ content }).catch((error: unknown) => {
    logger.warn("Failed to write audit log message", error);
  });
}

import { AttachmentBuilder, type APIEmbed, type EmbedBuilder } from "discord.js";
import { resolve } from "node:path";

export const meridianBrandColor = 0x206694;
export const meridianFooterText = "Meridian Network";
export const meridianLogoFilename = "meridian-logo.png";
export const meridianLogoAttachmentUrl = `attachment://${meridianLogoFilename}`;

export function applyMeridianBranding(embed: EmbedBuilder): EmbedBuilder {
  return embed
    .setColor(meridianBrandColor)
    .setFooter({
      text: meridianFooterText,
      iconURL: meridianLogoAttachmentUrl
    });
}

export function createMeridianLogoAttachment(): AttachmentBuilder {
  return new AttachmentBuilder(resolve("assets", meridianLogoFilename), {
    name: meridianLogoFilename
  });
}

export function createMeridianEmbedPayload(embed: EmbedBuilder): { embeds: APIEmbed[]; files: AttachmentBuilder[] } {
  return {
    embeds: [embed.toJSON()],
    files: [createMeridianLogoAttachment()]
  };
}

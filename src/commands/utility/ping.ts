import { SlashCommandBuilder } from "discord.js";
import type { SlashCommand } from "../types.js";

export const pingCommand: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName("ping")
    .setDescription("Check whether the Meridian bot is online."),
  async execute(interaction) {
    const websocketPing = interaction.client.ws.ping;
    const sentAt = Date.now();

    await interaction.reply({
      content: `Pong. API latency: ${Date.now() - sentAt}ms. WebSocket latency: ${websocketPing}ms.`
    });
  }
};

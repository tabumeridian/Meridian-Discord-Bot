import { SlashCommandBuilder } from "discord.js";
import { claimTicket } from "../../components/tickets.js";
import type { SlashCommand } from "../types.js";

export const claimCommand: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName("claim")
    .setDescription("Claim the current ticket.")
    .setDMPermission(false),
  async execute(interaction) {
    await claimTicket(interaction);
  }
};

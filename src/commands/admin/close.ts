import { SlashCommandBuilder } from "discord.js";
import { closeTicket } from "../../components/tickets.js";
import type { SlashCommand } from "../types.js";

export const closeCommand: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName("close")
    .setDescription("Close the current ticket.")
    .setDMPermission(false),
  async execute(interaction) {
    await closeTicket(interaction);
  }
};

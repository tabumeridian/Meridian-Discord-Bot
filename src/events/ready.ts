import { Events, type Client } from "discord.js";
import { logger } from "../logger.js";

export const readyEvent = {
  name: Events.ClientReady,
  once: true,
  execute(client: Client<true>): void {
    logger.info(`Logged in as ${client.user.tag}`);
  }
};

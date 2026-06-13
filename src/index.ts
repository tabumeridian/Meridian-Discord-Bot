import { Client, GatewayIntentBits } from "discord.js";
import { config } from "./config/env.js";
import "./database/index.js";
import { loadCommands } from "./loaders/commands.js";
import { registerEvents } from "./loaders/events.js";
import { logger } from "./logger.js";

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers]
});

const commands = loadCommands();
registerEvents(client, commands);

process.on("unhandledRejection", (reason) => {
  logger.error("Unhandled promise rejection", reason);
});

process.on("uncaughtException", (error) => {
  logger.error("Uncaught exception", error);
  process.exitCode = 1;
});

logger.info("Starting Meridian Discord bot");

await client.login(config.discordToken);

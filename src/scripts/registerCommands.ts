import { REST, Routes } from "discord.js";
import { config } from "../config/env.js";
import { loadCommands } from "../loaders/commands.js";
import { logger } from "../logger.js";

type RegistrationScope = "guild" | "global";

function readScope(): RegistrationScope {
  const scope = process.argv[2];

  if (scope === "guild" || scope === "global") {
    return scope;
  }

  throw new Error("Usage: tsx src/scripts/registerCommands.ts <guild|global>");
}

const scope = readScope();
const commands = loadCommands().map((command) => command.data.toJSON());
const rest = new REST({ version: "10" }).setToken(config.discordToken);

logger.info(`Registering ${commands.length} slash command(s) for ${scope} scope`);

if (scope === "guild") {
  if (!config.discordDevGuildId) {
    throw new Error("DISCORD_DEV_GUILD_ID is required for guild command registration");
  }

  await rest.put(
    Routes.applicationGuildCommands(config.discordClientId, config.discordDevGuildId),
    { body: commands }
  );

  logger.info(`Registered guild slash commands for guild ${config.discordDevGuildId}`);
} else {
  await rest.put(
    Routes.applicationCommands(config.discordClientId),
    { body: commands }
  );

  logger.info("Registered global slash commands");
}

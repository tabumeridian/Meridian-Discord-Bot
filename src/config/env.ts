import "dotenv/config";

export interface Config {
  discordToken: string;
  discordClientId: string;
  discordDevGuildId?: string;
  civilianRoleId?: string;
  auditLogChannelId?: string;
  welcomeChannelId?: string;
  ticketLogChannelId?: string;
  supportRoleId?: string;
  moderatorRoleId?: string;
  adminRoleId?: string;
  databasePath: string;
  logLevel: "debug" | "info" | "warn" | "error";
}

function readRequired(name: string): string {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

function readLogLevel(): Config["logLevel"] {
  const value = process.env.LOG_LEVEL?.toLowerCase();

  if (value === "debug" || value === "info" || value === "warn" || value === "error") {
    return value;
  }

  return "info";
}

export const config: Config = {
  discordToken: readRequired("DISCORD_TOKEN"),
  discordClientId: readRequired("DISCORD_CLIENT_ID"),
  discordDevGuildId: process.env.DISCORD_DEV_GUILD_ID || undefined,
  civilianRoleId: process.env.CIVILIAN_ROLE_ID || undefined,
  auditLogChannelId: process.env.AUDIT_LOG_CHANNEL_ID || undefined,
  welcomeChannelId: process.env.WELCOME_CHANNEL_ID || undefined,
  ticketLogChannelId: process.env.TICKET_LOG_CHANNEL_ID || undefined,
  supportRoleId: process.env.SUPPORT_ROLE_ID || undefined,
  moderatorRoleId: process.env.MODERATOR_ROLE_ID || undefined,
  adminRoleId: process.env.ADMIN_ROLE_ID || undefined,
  databasePath: process.env.DATABASE_PATH || "./data/meridian.sqlite",
  logLevel: readLogLevel()
};

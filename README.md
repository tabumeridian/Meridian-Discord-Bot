# Meridian Discord Bot

TypeScript Discord bot foundation for the Meridian Arma Reforger Life community.

This project is intentionally only the stable foundation: slash commands, event loading, `.env` config, SQLite persistence, logging, and safe command error handling.

## Requirements

- Node.js `22.12.0` or newer
- npm
- A Discord application and bot created in the Discord Developer Portal

## Setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Copy the environment template:

   ```bash
   cp .env.example .env
   ```

   On PowerShell:

   ```powershell
   Copy-Item .env.example .env
   ```

3. Fill in `.env`:

   ```env
   DISCORD_TOKEN=your_bot_token
   DISCORD_CLIENT_ID=your_application_client_id
   DISCORD_DEV_GUILD_ID=your_development_server_id
   CIVILIAN_ROLE_ID=your_verified_role_id
   AUDIT_LOG_CHANNEL_ID=your_audit_log_channel_id
   WELCOME_CHANNEL_ID=your_welcome_channel_id
   TICKET_LOG_CHANNEL_ID=your_ticket_log_channel_id
   SUPPORT_ROLE_ID=your_support_role_id
   MODERATOR_ROLE_ID=your_moderator_role_id
   ADMIN_ROLE_ID=your_admin_role_id
   DATABASE_PATH=./data/meridian.sqlite
   LOG_LEVEL=info
   ```

   Keep `DISCORD_TOKEN` private. Do not paste it into chat and do not commit `.env`.

## Discord Developer Portal Values

- `DISCORD_TOKEN`: Developer Portal -> your application -> Bot -> Token
- `DISCORD_CLIENT_ID`: Developer Portal -> your application -> General Information -> Application ID
- `DISCORD_DEV_GUILD_ID`: Right-click your Discord test server -> Copy Server ID
- `CIVILIAN_ROLE_ID`: Right-click the Meridian access role -> Copy Role ID
- `AUDIT_LOG_CHANNEL_ID`: Right-click the audit log channel -> Copy Channel ID
- `WELCOME_CHANNEL_ID`: Right-click the welcome channel -> Copy Channel ID
- `TICKET_LOG_CHANNEL_ID`: Right-click the ticket log channel -> Copy Channel ID
- `SUPPORT_ROLE_ID`: Right-click the Support role -> Copy Role ID
- `MODERATOR_ROLE_ID`: Right-click the Moderator role -> Copy Role ID
- `ADMIN_ROLE_ID`: Right-click the Admin role -> Copy Role ID

Developer Mode must be enabled in Discord to copy IDs.

For welcome messages, enable the Server Members Intent in the Discord Developer Portal under Bot -> Privileged Gateway Intents.

## Invite The Bot

In the Developer Portal, use OAuth2 URL Generator:

- Scopes: `bot`, `applications.commands`
- Bot permissions: start with the minimum permissions your early commands need

For this foundation, `/ping` only requires slash command access.

## Register Slash Commands

Register commands to a development guild for fast iteration:

```bash
npm run register:guild
```

Register commands globally when ready:

```bash
npm run register:global
```

Global commands can take time to appear across Discord.

## Run The Bot

Development:

```bash
npm run dev
```

Production-style local run:

```bash
npm run build
npm start
```

## Current Commands

- `/ping`: confirms the bot is alive and reports latency.
- `/setup-rules-panel`: admin-only command that posts the Meridian rules verification panel.
- `/setup-rules-embed`: admin-only command that posts the Meridian community rules embed.
- `/setup-role-selector`: admin-only command that posts optional notification role buttons.
- `/announcement`: admin-only command that opens a modal to post a branded announcement embed.
- `/setup-application-panel`: admin-only command that posts Staff and Development application buttons.
- `/setup-ticket-panel`: admin-only command that posts the ticket category selector.
- `/claim`: staff-only fallback command for claiming the current ticket.
- `/close`: staff-or-creator fallback command for closing the current ticket.

## Applications

Run `/setup-application-panel` in the channel where members should apply. The panel opens Discord modals for Staff and Development applications.

Application submissions are sent to:

- Staff Applications: `1515111083377950720`
- Development Applications: `1515111113606430902`

The bot must be able to view and send messages in both application log channels.

## Rules Verification Panel

Run `/setup-rules-panel` in the channel where members should verify. The bot posts a rules embed with an `Enter Meridian` button.

When a member clicks the button, the bot:

- Assigns the role configured by `CIVILIAN_ROLE_ID`
- Replies ephemerally if the member is already verified
- Replies ephemerally after successful verification
- Writes to `AUDIT_LOG_CHANNEL_ID` when that channel is configured and sendable

The bot must have `Manage Roles`, and the configured Meridian role must be below the bot's highest role.

## Tickets

Run `/setup-ticket-panel` in the support channel where members should open tickets. Members select a category, complete a modal, and receive a private ticket channel.

Ticket categories:

- Report a Player
- Compensation
- Unban Request
- Complaint
- Bug
- Partnership
- Other

Ticket permissions use `SUPPORT_ROLE_ID`, `MODERATOR_ROLE_ID`, and `ADMIN_ROLE_ID`. Admin always keeps access. Staff can claim tickets with the `Claim Ticket` button or `/claim`, and staff or the ticket creator can close tickets with the `Close Ticket` button or `/close`.

Closed tickets send a compact summary to `TICKET_LOG_CHANNEL_ID`, are marked closed in SQLite, and are deleted after a short delay.

## Welcome Messages

When `WELCOME_CHANNEL_ID` is configured and the Server Members Intent is enabled, the bot posts a Meridian-styled welcome embed when a member joins. The message mentions the member, shows their avatar as the embed thumbnail, and includes the Meridian Network footer branding.

## Project Layout

```text
src/
  commands/
    types.ts
    utility/
      ping.ts
  config/
    env.ts
  database/
    index.ts
  events/
    interactionCreate.ts
    ready.ts
  loaders/
    commands.ts
    events.ts
  scripts/
    registerCommands.ts
  index.ts
  logger.ts
```

## Notes

- This bot uses slash commands only.
- Tokens, guild IDs, channel IDs, and role IDs must come from environment variables or future persistence/config systems.
- Moderation, economy, and game-server integrations are intentionally not included yet.

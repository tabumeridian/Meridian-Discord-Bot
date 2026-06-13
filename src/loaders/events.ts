import type { Client, ClientEvents, Collection } from "discord.js";
import type { SlashCommand } from "../commands/types.js";
import { guildMemberAddEvent } from "../events/guildMemberAdd.js";
import { readyEvent } from "../events/ready.js";
import { createInteractionCreateEvent } from "../events/interactionCreate.js";

interface BotEvent {
  name: keyof ClientEvents;
  once: boolean;
  execute(...args: unknown[]): Promise<void> | void;
}

export function registerEvents(client: Client, commands: Collection<string, SlashCommand>): void {
  const events: BotEvent[] = [
    readyEvent as BotEvent,
    guildMemberAddEvent as BotEvent,
    createInteractionCreateEvent(commands) as BotEvent
  ];

  for (const event of events) {
    const execute = (...args: unknown[]) => void event.execute(...args);

    if (event.once) {
      client.once(event.name, execute);
      continue;
    }

    client.on(event.name, execute);
  }
}

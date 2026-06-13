import { Collection } from "discord.js";
import { announcementCommand } from "../commands/admin/announcement.js";
import { claimCommand } from "../commands/admin/claim.js";
import { closeCommand } from "../commands/admin/close.js";
import { setupApplicationPanelCommand } from "../commands/admin/setupApplicationPanel.js";
import { setupRoleSelectorCommand } from "../commands/admin/setupRoleSelector.js";
import { setupRulesEmbedCommand } from "../commands/admin/setupRulesEmbed.js";
import { setupRulesPanelCommand } from "../commands/admin/setupRulesPanel.js";
import { setupTicketPanelCommand } from "../commands/admin/setupTicketPanel.js";
import { pingCommand } from "../commands/utility/ping.js";
import type { SlashCommand } from "../commands/types.js";

export function loadCommands(): Collection<string, SlashCommand> {
  const commands = new Collection<string, SlashCommand>();

  for (const command of [
    pingCommand,
    setupRulesPanelCommand,
    setupRulesEmbedCommand,
    setupRoleSelectorCommand,
    setupApplicationPanelCommand,
    setupTicketPanelCommand,
    announcementCommand,
    claimCommand,
    closeCommand
  ]) {
    commands.set(command.data.name, command);
  }

  return commands;
}

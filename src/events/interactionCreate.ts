import { Events, MessageFlags, type BaseInteraction, type Collection } from "discord.js";
import type { SlashCommand } from "../commands/types.js";
import { handleAnnouncementModal, isAnnouncementModalId } from "../components/announcement.js";
import {
  handleApplicationButton,
  handleApplicationModal,
  isApplicationButtonId,
  isApplicationModalId
} from "../components/applications.js";
import { handleRoleSelectorButton, isRoleSelectorButtonId } from "../components/roleSelector.js";
import { handleRulesVerificationButton, rulesVerificationButtonId } from "../components/rulesVerification.js";
import {
  handleTicketButton,
  handleTicketCloseModal,
  handleTicketModal,
  handleTicketSelectMenu,
  isTicketButtonId,
  isTicketCloseModalId,
  isTicketModalId,
  isTicketSelectMenuId
} from "../components/tickets.js";
import { logger } from "../logger.js";

const commandErrorMessage = "Something went wrong while running that command.";

async function replyWithCommandError(interaction: BaseInteraction): Promise<void> {
  if (!interaction.isRepliable()) {
    return;
  }

  try {
    if (interaction.replied) {
      await interaction.followUp({
        content: commandErrorMessage,
        flags: MessageFlags.Ephemeral
      });
      return;
    }

    if (interaction.deferred) {
      await interaction.editReply(commandErrorMessage);
      return;
    }

    await interaction.reply({
      content: commandErrorMessage,
      flags: MessageFlags.Ephemeral
    });
  } catch (error) {
    logger.warn("Could not send interaction error response", error);
  }
}

export function createInteractionCreateEvent(commands: Collection<string, SlashCommand>) {
  return {
    name: Events.InteractionCreate,
    once: false,
    async execute(interaction: BaseInteraction): Promise<void> {
      if (interaction.isButton() && interaction.customId === rulesVerificationButtonId) {
        try {
          await handleRulesVerificationButton(interaction);
        } catch (error) {
          logger.error("Rules verification button failed", error);
          await replyWithCommandError(interaction);
        }
        return;
      }

      if (interaction.isButton() && isRoleSelectorButtonId(interaction.customId)) {
        try {
          await handleRoleSelectorButton(interaction);
        } catch (error) {
          logger.error("Role selector button failed", error);
          await replyWithCommandError(interaction);
        }
        return;
      }

      if (interaction.isButton() && isApplicationButtonId(interaction.customId)) {
        try {
          await handleApplicationButton(interaction);
        } catch (error) {
          logger.error("Application button failed", error);
          await replyWithCommandError(interaction);
        }
        return;
      }

      if (interaction.isButton() && isTicketButtonId(interaction.customId)) {
        try {
          await handleTicketButton(interaction);
        } catch (error) {
          logger.error("Ticket button failed", error);
          await replyWithCommandError(interaction);
        }
        return;
      }

      if (interaction.isStringSelectMenu() && isTicketSelectMenuId(interaction.customId)) {
        try {
          await handleTicketSelectMenu(interaction);
        } catch (error) {
          logger.error("Ticket select menu failed", error);
          await replyWithCommandError(interaction);
        }
        return;
      }

      if (interaction.isModalSubmit() && isAnnouncementModalId(interaction.customId)) {
        try {
          await handleAnnouncementModal(interaction);
        } catch (error) {
          logger.error("Announcement modal failed", error);
          await replyWithCommandError(interaction);
        }
        return;
      }

      if (interaction.isModalSubmit() && isApplicationModalId(interaction.customId)) {
        try {
          await handleApplicationModal(interaction);
        } catch (error) {
          logger.error("Application modal failed", error);
          await replyWithCommandError(interaction);
        }
        return;
      }

      if (interaction.isModalSubmit() && isTicketModalId(interaction.customId)) {
        try {
          await handleTicketModal(interaction);
        } catch (error) {
          logger.error("Ticket modal failed", error);
          await replyWithCommandError(interaction);
        }
        return;
      }

      if (interaction.isModalSubmit() && isTicketCloseModalId(interaction.customId)) {
        try {
          await handleTicketCloseModal(interaction);
        } catch (error) {
          logger.error("Ticket close modal failed", error);
          await replyWithCommandError(interaction);
        }
        return;
      }

      if (!interaction.isChatInputCommand()) {
        return;
      }

      const command = commands.get(interaction.commandName);

      if (!command) {
        logger.warn(`No command handler found for /${interaction.commandName}`);
        return;
      }

      try {
        await command.execute(interaction);
      } catch (error) {
        logger.error(`Command /${interaction.commandName} failed`, error);
        await replyWithCommandError(interaction);
      }
    }
  };
}

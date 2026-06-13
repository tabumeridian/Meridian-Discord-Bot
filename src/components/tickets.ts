import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  EmbedBuilder,
  MessageFlags,
  ModalBuilder,
  PermissionFlagsBits,
  StringSelectMenuBuilder,
  TextInputBuilder,
  TextInputStyle,
  type AttachmentBuilder,
  type ButtonInteraction,
  type ChatInputCommandInteraction,
  type GuildBasedChannel,
  type GuildMember,
  type ModalSubmitInteraction,
  type StringSelectMenuInteraction,
  type TextChannel
} from "discord.js";
import { config } from "../config/env.js";
import { db } from "../database/index.js";
import { logger } from "../logger.js";
import {
  createMeridianLogoAttachment,
  meridianBrandColor,
  meridianLogoAttachmentUrl
} from "../utils/branding.js";

const ticketSelectId = "ticket:create";
const ticketModalPrefix = "ticket:submit:";
const ticketCloseModalPrefix = "ticket:close-submit:";
const ticketCloseOutcomeInputId = "ticket-close-outcome";
const ticketClaimButtonId = "ticket:claim";
const ticketCloseButtonId = "ticket:close";
const fieldValueLimit = 1024;
const channelNameLimit = 90;
const deleteDelayMs = 5000;

type TicketCategoryKey = "report-player" | "compensation" | "unban-request" | "complaint" | "bug" | "partnership" | "other";

interface TicketQuestion {
  id: string;
  label: string;
}

interface TicketCategory {
  key: TicketCategoryKey;
  label: string;
  modalTitle: string;
  questions: readonly TicketQuestion[];
}

interface TicketRow {
  id: number;
  guild_id: string;
  channel_id: string;
  creator_id: string;
  category_key: TicketCategoryKey;
  status: "open" | "closed";
  claimed_by: string | null;
  summary_message_id: string | null;
  created_at: number;
  closed_at: number | null;
}

interface TicketAnswerRow {
  question_label: string;
  answer: string;
  sort_order: number;
}

type SendableTicketLogChannel = GuildBasedChannel & {
  send(options: { embeds: EmbedBuilder[]; files: AttachmentBuilder[]; allowedMentions: { parse: [] } }): Promise<unknown>;
};

export const ticketCategories: Record<TicketCategoryKey, TicketCategory> = {
  "report-player": {
    key: "report-player",
    label: "Report a Player",
    modalTitle: "Report a Player",
    questions: [
      { id: "ign", label: "Your in-game name" },
      { id: "reported-player", label: "Reported player name, if known" },
      { id: "reason", label: "Rule broken / report reason" },
      { id: "situation", label: "Explain the situation" },
      { id: "evidence", label: "Evidence link / clip" }
    ]
  },
  compensation: {
    key: "compensation",
    label: "Compensation",
    modalTitle: "Compensation",
    questions: [
      { id: "ign", label: "Your in-game name" },
      { id: "loss", label: "What did you lose?" },
      { id: "value", label: "Estimated value" },
      { id: "cause", label: "What caused the loss?" },
      { id: "evidence", label: "Evidence link / clip" }
    ]
  },
  "unban-request": {
    key: "unban-request",
    label: "Unban Request",
    modalTitle: "Unban Request",
    questions: [
      { id: "ign", label: "Your in-game name" },
      { id: "ban-reason", label: "Ban reason, if known" },
      { id: "banned-by", label: "Who banned you, if known" },
      { id: "review-reason", label: "Why should the ban be reviewed?" },
      { id: "context", label: "Evidence / extra context" }
    ]
  },
  complaint: {
    key: "complaint",
    label: "Complaint",
    modalTitle: "Complaint",
    questions: [
      { id: "ign", label: "Your in-game name" },
      { id: "subject", label: "Who is the complaint about?" },
      { id: "what-happened", label: "What happened?" },
      { id: "when", label: "When did it happen?" },
      { id: "evidence", label: "Evidence link, if any" }
    ]
  },
  bug: {
    key: "bug",
    label: "Bug",
    modalTitle: "Bug Report",
    questions: [
      { id: "ign", label: "Your in-game name" },
      { id: "summary", label: "Bug summary" },
      { id: "steps", label: "Steps to reproduce" },
      { id: "expected", label: "What should have happened?" },
      { id: "evidence", label: "Clip / screenshot link, if any" }
    ]
  },
  partnership: {
    key: "partnership",
    label: "Partnership",
    modalTitle: "Partnership",
    questions: [
      { id: "organization", label: "Organization / community name" },
      { id: "role", label: "Your role" },
      { id: "request", label: "What partnership are you requesting?" },
      { id: "benefit", label: "Why would this benefit Meridian?" },
      { id: "contact", label: "Contact info / links" }
    ]
  },
  other: {
    key: "other",
    label: "Other",
    modalTitle: "Other",
    questions: [
      { id: "ign", label: "Your in-game name" },
      { id: "topic", label: "Topic" },
      { id: "issue", label: "Explain your issue" },
      { id: "help-needed", label: "What help do you need?" },
      { id: "extra", label: "Extra links / evidence" }
    ]
  }
};

const insertTicket = db.prepare(`
  INSERT INTO tickets (guild_id, channel_id, creator_id, category_key, status, created_at)
  VALUES (?, ?, ?, ?, 'open', ?)
`);

const updateTicketSummaryMessage = db.prepare(`
  UPDATE tickets
  SET summary_message_id = ?
  WHERE id = ?
`);

const updateTicketClaim = db.prepare(`
  UPDATE tickets
  SET claimed_by = ?
  WHERE id = ?
`);

const updateTicketClosed = db.prepare(`
  UPDATE tickets
  SET status = 'closed', closed_at = ?
  WHERE id = ?
`);

const insertTicketAnswer = db.prepare(`
  INSERT INTO ticket_answers (ticket_id, question_label, answer, sort_order)
  VALUES (?, ?, ?, ?)
`);

const getOpenTicketByChannel = db.prepare(`
  SELECT *
  FROM tickets
  WHERE channel_id = ? AND status = 'open'
`);

const getTicketAnswers = db.prepare(`
  SELECT question_label, answer, sort_order
  FROM ticket_answers
  WHERE ticket_id = ?
  ORDER BY sort_order ASC
`);

function getRequiredTicketConfig(): { supportRoleId: string; moderatorRoleId: string; adminRoleId: string } | undefined {
  if (!config.supportRoleId || !config.moderatorRoleId || !config.adminRoleId) {
    return undefined;
  }

  return {
    supportRoleId: config.supportRoleId,
    moderatorRoleId: config.moderatorRoleId,
    adminRoleId: config.adminRoleId
  };
}

function canSendTicketLog(channel: GuildBasedChannel): channel is SendableTicketLogChannel {
  return (
    "send" in channel &&
    (
      channel.type === ChannelType.GuildText ||
      channel.type === ChannelType.GuildAnnouncement
    )
  );
}

function getCategory(key: string): TicketCategory | undefined {
  return ticketCategories[key as TicketCategoryKey];
}

function getOpenTicket(channelId: string): TicketRow | undefined {
  return getOpenTicketByChannel.get(channelId) as TicketRow | undefined;
}

function truncateFieldValue(value: string): string {
  if (!value) {
    return "No answer provided.";
  }

  if (value.length <= fieldValueLimit) {
    return value;
  }

  return `${value.slice(0, fieldValueLimit - 15)}... [truncated]`;
}

function sanitizeChannelName(value: string): string {
  const sanitized = value
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 32);

  return sanitized || "user";
}

function buildTicketChannelName(category: TicketCategory, member: GuildMember): string {
  return `ticket-${category.key}-${sanitizeChannelName(member.user.username)}`.slice(0, channelNameLimit);
}

function buildTicketModalId(category: TicketCategory, parentId: string | null): string {
  return `${ticketModalPrefix}${category.key}:${parentId ?? "root"}`;
}

function parseTicketModalId(customId: string): { categoryKey: string; parentId: string | null } | undefined {
  const raw = customId.slice(ticketModalPrefix.length);
  const [categoryKey, parentId] = raw.split(":");

  if (!categoryKey) {
    return undefined;
  }

  return {
    categoryKey,
    parentId: parentId && parentId !== "root" ? parentId : null
  };
}

function isStaffMember(member: GuildMember): boolean {
  if (member.permissions.has(PermissionFlagsBits.Administrator)) {
    return true;
  }

  const ticketConfig = getRequiredTicketConfig();

  if (!ticketConfig) {
    return false;
  }

  return (
    member.roles.cache.has(ticketConfig.supportRoleId) ||
    member.roles.cache.has(ticketConfig.moderatorRoleId) ||
    member.roles.cache.has(ticketConfig.adminRoleId)
  );
}

function buildTicketSummaryEmbed(ticket: TicketRow, category: TicketCategory, answers: TicketAnswerRow[]): EmbedBuilder {
  return new EmbedBuilder()
    .setColor(meridianBrandColor)
    .setTitle(`${category.label} Ticket`)
    .setDescription(
      [
        `Opened by: <@${ticket.creator_id}>`,
        `Claimed by: ${ticket.claimed_by ? `<@${ticket.claimed_by}>` : "Unclaimed"}`,
        `Created: <t:${ticket.created_at}:F>`
      ].join("\n")
    )
    .addFields(
      ...answers.map((answer) => ({
        name: answer.question_label,
        value: truncateFieldValue(answer.answer),
        inline: false
      }))
    )
    .setFooter({
      text: "Meridian Network",
      iconURL: meridianLogoAttachmentUrl
    });
}

function buildTicketControls(): ActionRowBuilder<ButtonBuilder> {
  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(ticketClaimButtonId)
      .setLabel("Claim Ticket")
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId(ticketCloseButtonId)
      .setLabel("Close Ticket")
      .setStyle(ButtonStyle.Danger)
  );
}

async function sendTicketLogFromInteraction(interaction: ModalSubmitInteraction | ButtonInteraction | ChatInputCommandInteraction, embed: EmbedBuilder): Promise<void> {
  if (!config.ticketLogChannelId || !interaction.guild) {
    return;
  }

  const channel = await interaction.guild.channels.fetch(config.ticketLogChannelId).catch((error: unknown) => {
    logger.warn(`Could not fetch ticket log channel ${config.ticketLogChannelId}`, error);
    return null;
  });

  if (!channel || !canSendTicketLog(channel)) {
    logger.warn(`Ticket log channel ${config.ticketLogChannelId} is missing or is not sendable`);
    return;
  }

  await channel.send({
    embeds: [embed],
    files: [createMeridianLogoAttachment()],
    allowedMentions: { parse: [] }
  }).catch((error: unknown) => {
    logger.warn("Failed to send ticket log message", error);
  });
}

function buildTicketOpenedLog(ticket: TicketRow, category: TicketCategory, channelId: string): EmbedBuilder {
  return new EmbedBuilder()
    .setColor(meridianBrandColor)
    .setTitle("Ticket Opened")
    .setDescription(
      [
        `Ticket: <#${channelId}>`,
        `Category: ${category.label}`,
        `Creator: <@${ticket.creator_id}> (${ticket.creator_id})`,
        `Created: <t:${ticket.created_at}:F>`
      ].join("\n")
    )
    .setFooter({
      text: "Meridian Network",
      iconURL: meridianLogoAttachmentUrl
    });
}

function buildTicketClosedLog(ticket: TicketRow, outcome: string, closedById: string, closedAt: number): EmbedBuilder {
  const category = getCategory(ticket.category_key);

  return new EmbedBuilder()
    .setColor(meridianBrandColor)
    .setTitle("Ticket Closed")
    .setDescription(
      [
        `Ticket ID: ${ticket.id}`,
        `Channel ID: ${ticket.channel_id}`,
        `Category: ${category?.label ?? ticket.category_key}`,
        `Creator: <@${ticket.creator_id}> (${ticket.creator_id})`,
        `Claimed by: ${ticket.claimed_by ? `<@${ticket.claimed_by}> (${ticket.claimed_by})` : "Unclaimed"}`,
        `Closed by: <@${closedById}> (${closedById})`,
        `Created: <t:${ticket.created_at}:F>`,
        `Closed: <t:${closedAt}:F>`
      ].join("\n")
    )
    .addFields({
      name: "Outcome",
      value: truncateFieldValue(outcome),
      inline: false
    })
    .setFooter({
      text: "Meridian Network",
      iconURL: meridianLogoAttachmentUrl
    });
}

export function isTicketSelectMenuId(customId: string): boolean {
  return customId === ticketSelectId;
}

export function isTicketModalId(customId: string): boolean {
  return customId.startsWith(ticketModalPrefix);
}

export function isTicketCloseModalId(customId: string): boolean {
  return customId.startsWith(ticketCloseModalPrefix);
}

export function isTicketButtonId(customId: string): boolean {
  return customId === ticketClaimButtonId || customId === ticketCloseButtonId;
}

export function createTicketPanelEmbed(): EmbedBuilder {
  return new EmbedBuilder()
    .setColor(meridianBrandColor)
    .setTitle("Meridian Help Center")
    .setDescription(
      [
        "Need support? Select the category that best fits your issue below.",
        "Our team will review your ticket as soon as possible."
      ].join("\n")
    )
    .setFooter({
      text: "Meridian Network",
      iconURL: meridianLogoAttachmentUrl
    });
}

export function createTicketPanelActionRow(): ActionRowBuilder<StringSelectMenuBuilder> {
  return new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId(ticketSelectId)
      .setPlaceholder("Select a ticket category")
      .addOptions(
        ...Object.values(ticketCategories).map((category) => ({
          label: category.label,
          value: category.key
        }))
      )
  );
}

export async function handleTicketSelectMenu(interaction: StringSelectMenuInteraction): Promise<void> {
  if (!interaction.inCachedGuild()) {
    await interaction.reply({
      content: "Tickets can only be opened inside the Meridian server.",
      flags: MessageFlags.Ephemeral
    });
    return;
  }

  const category = getCategory(interaction.values[0] ?? "");

  if (!category) {
    await interaction.reply({
      content: "That ticket category is not available.",
      flags: MessageFlags.Ephemeral
    });
    return;
  }

  const parentId = interaction.channel && "parentId" in interaction.channel ? interaction.channel.parentId : null;
  const rows = category.questions.map((question) => {
    const input = new TextInputBuilder()
      .setCustomId(question.id)
      .setLabel(question.label)
      .setStyle(TextInputStyle.Paragraph)
      .setRequired(true)
      .setMaxLength(1000);

    return new ActionRowBuilder<TextInputBuilder>().addComponents(input);
  });

  const modal = new ModalBuilder()
    .setCustomId(buildTicketModalId(category, parentId))
    .setTitle(category.modalTitle)
    .addComponents(...rows);

  await interaction.showModal(modal);
}

export async function handleTicketModal(interaction: ModalSubmitInteraction): Promise<void> {
  if (!interaction.inCachedGuild()) {
    await interaction.reply({
      content: "Tickets can only be opened inside the Meridian server.",
      flags: MessageFlags.Ephemeral
    });
    return;
  }

  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  const ticketConfig = getRequiredTicketConfig();

  if (!ticketConfig) {
    await interaction.editReply("Ticket roles are not configured. Please contact an administrator.");
    return;
  }

  const parsed = parseTicketModalId(interaction.customId);
  const category = parsed ? getCategory(parsed.categoryKey) : undefined;

  if (!parsed || !category) {
    await interaction.editReply("This ticket form is no longer available. Please try again.");
    return;
  }

  const supportRole = await interaction.guild.roles.fetch(ticketConfig.supportRoleId);
  const moderatorRole = await interaction.guild.roles.fetch(ticketConfig.moderatorRoleId);
  const adminRole = await interaction.guild.roles.fetch(ticketConfig.adminRoleId);

  if (!supportRole || !moderatorRole || !adminRole) {
    await interaction.editReply("One or more ticket staff roles could not be found. Please contact an administrator.");
    return;
  }

  const botMember = interaction.guild.members.me ?? await interaction.guild.members.fetchMe();
  const createdAt = Math.floor(Date.now() / 1000);
  const channelName = buildTicketChannelName(category, interaction.member);
  const answers = category.questions.map((question, index) => ({
    questionLabel: question.label,
    answer: interaction.fields.getTextInputValue(question.id).trim(),
    sortOrder: index
  }));

  let ticketChannel: TextChannel;

  try {
    ticketChannel = await interaction.guild.channels.create({
      name: channelName,
      type: ChannelType.GuildText,
      parent: parsed.parentId ?? undefined,
      permissionOverwrites: [
        {
          id: interaction.guild.roles.everyone.id,
          deny: [PermissionFlagsBits.ViewChannel]
        },
        {
          id: interaction.user.id,
          allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory]
        },
        {
          id: ticketConfig.supportRoleId,
          allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory]
        },
        {
          id: ticketConfig.moderatorRoleId,
          allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory]
        },
        {
          id: ticketConfig.adminRoleId,
          allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory]
        },
        {
          id: botMember.id,
          allow: [
            PermissionFlagsBits.ViewChannel,
            PermissionFlagsBits.SendMessages,
            PermissionFlagsBits.ManageChannels,
            PermissionFlagsBits.ReadMessageHistory
          ]
        }
      ],
      reason: `Ticket opened by ${interaction.user.tag} (${interaction.user.id})`
    });
  } catch (error) {
    logger.error(`Failed to create ticket channel for ${interaction.user.tag} (${interaction.user.id})`, error);
    await interaction.editReply("I could not create your ticket channel. Please contact an administrator.");
    return;
  }

  const insertResult = insertTicket.run(
    interaction.guild.id,
    ticketChannel.id,
    interaction.user.id,
    category.key,
    createdAt
  );
  const ticketId = Number(insertResult.lastInsertRowid);

  for (const answer of answers) {
    insertTicketAnswer.run(ticketId, answer.questionLabel, answer.answer, answer.sortOrder);
  }

  const ticket = getOpenTicket(ticketChannel.id);

  if (!ticket) {
    await interaction.editReply("Ticket channel was created, but the ticket record could not be loaded.");
    return;
  }

  const answerRows = getTicketAnswers.all(ticket.id) as TicketAnswerRow[];
  const summaryMessage = await ticketChannel.send({
    content: `${interaction.user} ${supportRole} ${moderatorRole} ${adminRole}`,
    embeds: [buildTicketSummaryEmbed(ticket, category, answerRows)],
    components: [buildTicketControls()],
    files: [createMeridianLogoAttachment()],
    allowedMentions: {
      users: [interaction.user.id],
      roles: [ticketConfig.supportRoleId, ticketConfig.moderatorRoleId, ticketConfig.adminRoleId]
    }
  });

  updateTicketSummaryMessage.run(summaryMessage.id, ticket.id);

  await interaction.editReply(`Your ticket has been created: ${ticketChannel}`);

  await sendTicketLogFromInteraction(
    interaction,
    buildTicketOpenedLog(ticket, category, ticketChannel.id)
  );
}

export async function claimTicket(interaction: ButtonInteraction | ChatInputCommandInteraction): Promise<void> {
  if (!interaction.inCachedGuild()) {
    await interaction.reply({
      content: "Tickets can only be managed inside the Meridian server.",
      flags: MessageFlags.Ephemeral
    });
    return;
  }

  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  const ticket = getOpenTicket(interaction.channelId);

  if (!ticket) {
    await interaction.editReply("This is not an active ticket channel.");
    return;
  }

  if (!isStaffMember(interaction.member)) {
    await interaction.editReply("Only Support, Moderator, or Admin can claim tickets.");
    return;
  }

  if (ticket.claimed_by) {
    await interaction.editReply(`This ticket is already claimed by <@${ticket.claimed_by}>.`);
    return;
  }

  const ticketConfig = getRequiredTicketConfig();

  if (!ticketConfig) {
    await interaction.editReply("Ticket roles are not configured. Please contact an administrator.");
    return;
  }

  const channel = interaction.channel;

  if (!channel || channel.type !== ChannelType.GuildText) {
    await interaction.editReply("This ticket channel could not be managed.");
    return;
  }

  await channel.permissionOverwrites.edit(ticketConfig.supportRoleId, {
    ViewChannel: false,
    SendMessages: false,
    ReadMessageHistory: false
  });
  await channel.permissionOverwrites.edit(ticketConfig.moderatorRoleId, {
    ViewChannel: false,
    SendMessages: false,
    ReadMessageHistory: false
  });
  await channel.permissionOverwrites.edit(interaction.user.id, {
    ViewChannel: true,
    SendMessages: true,
    ReadMessageHistory: true
  });
  await channel.permissionOverwrites.edit(ticketConfig.adminRoleId, {
    ViewChannel: true,
    SendMessages: true,
    ReadMessageHistory: true
  });

  updateTicketClaim.run(interaction.user.id, ticket.id);

  const updatedTicket = getOpenTicket(interaction.channelId);
  const category = getCategory(ticket.category_key);
  const answers = getTicketAnswers.all(ticket.id) as TicketAnswerRow[];

  if (updatedTicket && category && ticket.summary_message_id) {
    const summaryMessage = await channel.messages.fetch(ticket.summary_message_id).catch(() => null);

    if (summaryMessage) {
      await summaryMessage.edit({
        embeds: [buildTicketSummaryEmbed(updatedTicket, category, answers)],
        components: [buildTicketControls()]
      });
    }
  }

  await interaction.editReply("Ticket claimed.");
}

export async function closeTicket(interaction: ButtonInteraction | ChatInputCommandInteraction): Promise<void> {
  if (!interaction.inCachedGuild()) {
    await interaction.reply({
      content: "Tickets can only be managed inside the Meridian server.",
      flags: MessageFlags.Ephemeral
    });
    return;
  }

  const ticket = getOpenTicket(interaction.channelId);

  if (!ticket) {
    await interaction.reply({
      content: "This is not an active ticket channel.",
      flags: MessageFlags.Ephemeral
    });
    return;
  }

  const canClose = ticket.creator_id === interaction.user.id || isStaffMember(interaction.member);

  if (!canClose) {
    await interaction.reply({
      content: "Only the ticket creator or staff can close this ticket.",
      flags: MessageFlags.Ephemeral
    });
    return;
  }

  const outcomeInput = new TextInputBuilder()
    .setCustomId(ticketCloseOutcomeInputId)
    .setLabel("Describe the outcome")
    .setStyle(TextInputStyle.Paragraph)
    .setRequired(true)
    .setMaxLength(1000);

  const modal = new ModalBuilder()
    .setCustomId(`${ticketCloseModalPrefix}${interaction.channelId}`)
    .setTitle("Close Ticket")
    .addComponents(new ActionRowBuilder<TextInputBuilder>().addComponents(outcomeInput));

  await interaction.showModal(modal);
}

export async function handleTicketCloseModal(interaction: ModalSubmitInteraction): Promise<void> {
  if (!interaction.inCachedGuild()) {
    await interaction.reply({
      content: "Tickets can only be managed inside the Meridian server.",
      flags: MessageFlags.Ephemeral
    });
    return;
  }

  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  const channelId = interaction.customId.slice(ticketCloseModalPrefix.length);

  if (!channelId) {
    await interaction.editReply("This close form is no longer valid. Please try again.");
    return;
  }

  const ticket = getOpenTicket(channelId);

  if (!ticket) {
    await interaction.editReply("This ticket is no longer active or has already been closed.");
    return;
  }

  const canClose = ticket.creator_id === interaction.user.id || isStaffMember(interaction.member);

  if (!canClose) {
    await interaction.editReply("Only the ticket creator or staff can close this ticket.");
    return;
  }

  const outcome = interaction.fields.getTextInputValue(ticketCloseOutcomeInputId).trim();

  if (!outcome) {
    await interaction.editReply("A close outcome is required.");
    return;
  }

  const closedAt = Math.floor(Date.now() / 1000);

  updateTicketClosed.run(closedAt, ticket.id);

  await sendTicketLogFromInteraction(
    interaction,
    buildTicketClosedLog(ticket, outcome, interaction.user.id, closedAt)
  );

  await interaction.editReply("Ticket closed. This channel will be deleted shortly.");

  const channel = await interaction.guild.channels.fetch(ticket.channel_id).catch((error: unknown) => {
    logger.warn(`Could not fetch ticket channel ${ticket.channel_id} for deletion`, error);
    return null;
  });

  if (channel && channel.type === ChannelType.GuildText) {
    setTimeout(() => {
      void channel.delete(`Ticket closed by ${interaction.user.tag} (${interaction.user.id})`).catch((error: unknown) => {
        logger.warn(`Failed to delete closed ticket channel ${channel.id}`, error);
      });
    }, deleteDelayMs);
  }
}

export async function handleTicketButton(interaction: ButtonInteraction): Promise<void> {
  if (interaction.customId === ticketClaimButtonId) {
    await claimTicket(interaction);
    return;
  }

  if (interaction.customId === ticketCloseButtonId) {
    await closeTicket(interaction);
  }
}

import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  EmbedBuilder,
  MessageFlags,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  type AttachmentBuilder,
  type ButtonInteraction,
  type GuildBasedChannel,
  type ModalSubmitInteraction
} from "discord.js";
import { db } from "../database/index.js";
import { logger } from "../logger.js";
import {
  createMeridianLogoAttachment,
  meridianBrandColor,
  meridianLogoAttachmentUrl
} from "../utils/branding.js";

const applicationButtonPrefix = "application:open:";
const applicationModalPrefix = "application:submit:";
const fieldValueLimit = 1024;
const applicationCooldownSeconds = 24 * 60 * 60;

type ApplicationType = "staff" | "development";

interface ApplicationQuestion {
  id: string;
  label: string;
  logLabel: string;
  style: TextInputStyle;
  placeholder?: string;
}

interface ApplicationFlow {
  type: ApplicationType;
  buttonLabel: string;
  buttonEmoji: string;
  modalTitle: string;
  logTitle: string;
  logChannelId: string;
  successMessage: string;
  questions: readonly ApplicationQuestion[];
}

type SendableApplicationLogChannel = GuildBasedChannel & {
  send(options: { embeds: EmbedBuilder[]; files: AttachmentBuilder[]; allowedMentions: { parse: [] } }): Promise<unknown>;
};

interface ApplicationSubmissionRow {
  submitted_at: number;
}

const getLastApplicationSubmission = db.prepare(`
  SELECT submitted_at
  FROM application_submissions
  WHERE user_id = ? AND application_type = ?
`);

const upsertApplicationSubmission = db.prepare(`
  INSERT INTO application_submissions (user_id, application_type, submitted_at)
  VALUES (?, ?, ?)
  ON CONFLICT(user_id, application_type)
  DO UPDATE SET submitted_at = excluded.submitted_at
`);

export const applicationFlows: Record<ApplicationType, ApplicationFlow> = {
  staff: {
    type: "staff",
    buttonLabel: "Staff Application",
    buttonEmoji: "\uD83D\uDEE1\uFE0F",
    modalTitle: "Staff Application",
    logTitle: "New Staff Application",
    logChannelId: "1515111083377950720",
    successMessage: "Your staff application has been submitted. Thank you for applying to Meridian.",
    questions: [
      {
        id: "age-timezone",
        label: "Age / Timezone",
        logLabel: "Age / Timezone",
        style: TextInputStyle.Short
      },
      {
        id: "previous-experience",
        label: "Previous Staff Experience",
        logLabel: "Previous Staff Experience",
        style: TextInputStyle.Paragraph
      },
      {
        id: "staff-reason",
        label: "Why join Meridian staff?",
        logLabel: "Why do you want to join the Meridian staff team?",
        style: TextInputStyle.Paragraph
      },
      {
        id: "availability",
        label: "Weekly availability",
        logLabel: "Weekly availability",
        style: TextInputStyle.Paragraph
      }
    ]
  },
  development: {
    type: "development",
    buttonLabel: "Development Application",
    buttonEmoji: "\uD83D\uDCBB",
    modalTitle: "Development Application",
    logTitle: "New Development Application",
    logChannelId: "1515111113606430902",
    successMessage: "Your development application has been submitted. Thank you for applying to Meridian.",
    questions: [
      {
        id: "age-timezone",
        label: "Age / Timezone",
        logLabel: "Age / Timezone",
        style: TextInputStyle.Short
      },
      {
        id: "role",
        label: "Role you are applying for",
        logLabel: "Role you are applying for",
        style: TextInputStyle.Short,
        placeholder: "Programmer, Mod Developer, UI Designer, Graphic Designer, Map Designer, QA Tester, Other"
      },
      {
        id: "experience",
        label: "Experience / portfolio links",
        logLabel: "Previous experience / portfolio links",
        style: TextInputStyle.Paragraph
      },
      {
        id: "availability",
        label: "Weekly availability",
        logLabel: "Weekly availability",
        style: TextInputStyle.Paragraph
      }
    ]
  }
};

function canSendApplicationLog(channel: GuildBasedChannel): channel is SendableApplicationLogChannel {
  return (
    "send" in channel &&
    (
      channel.type === ChannelType.GuildText ||
      channel.type === ChannelType.GuildAnnouncement
    )
  );
}

function getApplicationFlow(type: string): ApplicationFlow | undefined {
  if (type === "staff" || type === "development") {
    return applicationFlows[type];
  }

  return undefined;
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

function getLastSubmission(userId: string, applicationType: ApplicationType): number | undefined {
  const row = getLastApplicationSubmission.get(userId, applicationType) as ApplicationSubmissionRow | undefined;
  return row?.submitted_at;
}

function formatRemainingCooldown(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.ceil((seconds % 3600) / 60);

  if (hours <= 0) {
    return `${minutes} minute${minutes === 1 ? "" : "s"}`;
  }

  if (minutes <= 0 || minutes === 60) {
    return `${hours + (minutes === 60 ? 1 : 0)} hour${hours + (minutes === 60 ? 1 : 0) === 1 ? "" : "s"}`;
  }

  return `${hours} hour${hours === 1 ? "" : "s"} and ${minutes} minute${minutes === 1 ? "" : "s"}`;
}

function getCooldownRemainingSeconds(userId: string, applicationType: ApplicationType, now: number): number {
  const lastSubmission = getLastSubmission(userId, applicationType);

  if (!lastSubmission) {
    return 0;
  }

  return Math.max(0, (lastSubmission + applicationCooldownSeconds) - now);
}

function recordApplicationSubmission(userId: string, applicationType: ApplicationType, submittedAt: number): void {
  upsertApplicationSubmission.run(userId, applicationType, submittedAt);
}

export function isApplicationButtonId(customId: string): boolean {
  return customId.startsWith(applicationButtonPrefix);
}

export function isApplicationModalId(customId: string): boolean {
  return customId.startsWith(applicationModalPrefix);
}

function createApplicationButtonId(flow: ApplicationFlow): string {
  return `${applicationButtonPrefix}${flow.type}`;
}

function createApplicationModalId(flow: ApplicationFlow): string {
  return `${applicationModalPrefix}${flow.type}`;
}

export function createApplicationPanelEmbed(): EmbedBuilder {
  return new EmbedBuilder()
    .setColor(meridianBrandColor)
    .setTitle("Meridian Applications")
    .setDescription(
      [
        "Interested in helping Meridian Network grow?",
        "",
        "Use the buttons below to submit an application for the correct team.",
        "",
        "Staff applications are for moderation, support, community assistance, and event support.",
        "",
        "Development applications are for scripting, modding, UI, design, mapping, QA, and technical contribution."
      ].join("\n")
    )
    .setFooter({
      text: "Meridian Network",
      iconURL: meridianLogoAttachmentUrl
    });
}

export function createApplicationPanelActionRow(): ActionRowBuilder<ButtonBuilder> {
  const row = new ActionRowBuilder<ButtonBuilder>();

  for (const flow of Object.values(applicationFlows)) {
    row.addComponents(
      new ButtonBuilder()
        .setCustomId(createApplicationButtonId(flow))
        .setLabel(flow.buttonLabel)
        .setEmoji(flow.buttonEmoji)
        .setStyle(ButtonStyle.Primary)
    );
  }

  return row;
}

export function createApplicationModal(flow: ApplicationFlow): ModalBuilder {
  const rows = flow.questions.map((question) => {
    const input = new TextInputBuilder()
      .setCustomId(question.id)
      .setLabel(question.label)
      .setStyle(question.style)
      .setRequired(true)
      .setMaxLength(1000);

    if (question.placeholder) {
      input.setPlaceholder(question.placeholder);
    }

    return new ActionRowBuilder<TextInputBuilder>().addComponents(input);
  });

  return new ModalBuilder()
    .setCustomId(createApplicationModalId(flow))
    .setTitle(flow.modalTitle)
    .addComponents(...rows);
}

export async function handleApplicationButton(interaction: ButtonInteraction): Promise<void> {
  if (!interaction.inCachedGuild()) {
    await interaction.reply({
      content: "Applications can only be submitted inside the Meridian server.",
      flags: MessageFlags.Ephemeral
    });
    return;
  }

  const type = interaction.customId.slice(applicationButtonPrefix.length);
  const flow = getApplicationFlow(type);

  if (!flow) {
    logger.warn(`Unknown application button ID: ${interaction.customId}`);
    await interaction.reply({
      content: "That application is no longer available.",
      flags: MessageFlags.Ephemeral
    });
    return;
  }

  await interaction.showModal(createApplicationModal(flow));
}

export async function handleApplicationModal(interaction: ModalSubmitInteraction): Promise<void> {
  if (!interaction.inCachedGuild()) {
    await interaction.reply({
      content: "Applications can only be submitted inside the Meridian server.",
      flags: MessageFlags.Ephemeral
    });
    return;
  }

  const type = interaction.customId.slice(applicationModalPrefix.length);
  const flow = getApplicationFlow(type);

  if (!flow) {
    logger.warn(`Unknown application modal ID: ${interaction.customId}`);
    await interaction.reply({
      content: "This application form is no longer available. Please try again.",
      flags: MessageFlags.Ephemeral
    });
    return;
  }

  await interaction.deferReply({
    flags: MessageFlags.Ephemeral
  });

  const submittedTimestamp = Math.floor(Date.now() / 1000);
  const cooldownRemainingSeconds = getCooldownRemainingSeconds(
    interaction.user.id,
    flow.type,
    submittedTimestamp
  );

  if (cooldownRemainingSeconds > 0) {
    await interaction.editReply(
      `You can submit another ${flow.modalTitle} in ${formatRemainingCooldown(cooldownRemainingSeconds)}.`
    );
    return;
  }

  const channel = await interaction.guild.channels.fetch(flow.logChannelId).catch((error: unknown) => {
    logger.warn(`Could not fetch ${flow.type} application log channel ${flow.logChannelId}`, error);
    return null;
  });

  if (!channel || !canSendApplicationLog(channel)) {
    await interaction.editReply("Your application could not be submitted because the application log channel is not available.");
    return;
  }

  const embed = new EmbedBuilder()
    .setColor(meridianBrandColor)
    .setTitle(flow.logTitle)
    .addFields(
      { name: "Applicant", value: `${interaction.user}`, inline: true },
      { name: "Username", value: interaction.user.tag, inline: true },
      { name: "Discord ID", value: interaction.user.id, inline: true },
      { name: "Submitted", value: `<t:${submittedTimestamp}:F>`, inline: false },
      ...flow.questions.map((question) => ({
        name: question.logLabel,
        value: truncateFieldValue(interaction.fields.getTextInputValue(question.id).trim()),
        inline: false
      }))
    )
    .setFooter({
      text: "Meridian Network Applications",
      iconURL: meridianLogoAttachmentUrl
    });

  let applicationWasSent = false;

  await channel.send({
    embeds: [embed],
    files: [createMeridianLogoAttachment()],
    allowedMentions: { parse: [] }
  }).then(() => {
    applicationWasSent = true;
  }).catch(async (error: unknown) => {
    logger.error(`Failed to submit ${flow.type} application for ${interaction.user.tag} (${interaction.user.id})`, error);
    await interaction.editReply("Your application could not be submitted. Please try again or contact an administrator.");
  });

  if (!applicationWasSent) {
    return;
  }

  try {
    recordApplicationSubmission(interaction.user.id, flow.type, submittedTimestamp);
  } catch (error) {
    logger.error(`Failed to record ${flow.type} application cooldown for ${interaction.user.tag} (${interaction.user.id})`, error);
  }

  await interaction.editReply(flow.successMessage);
}

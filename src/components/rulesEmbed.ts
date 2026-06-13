import { EmbedBuilder } from "discord.js";
import { applyMeridianBranding } from "../utils/branding.js";

function createQuotedSection(title: string, rules: string[]): string {
  return [
    `**${title}**`,
    ...rules.map((rule) => `> ${rule}`)
  ].join("\n");
}

export function createCommunityRulesEmbed(): EmbedBuilder {
  const sections = [
    createQuotedSection("1. Community Conduct", [
      "**1.1 Respect Others** \u2014 Harassment, racism, sexism, homophobia, discrimination, and hateful behavior are prohibited.",
      "**1.2 No Toxic Behavior** \u2014 Excessive toxicity, trolling, baiting, or intentionally disrupting the community is not allowed.",
      "**1.3 No NSFW Content** \u2014 Sexual, graphic, or otherwise inappropriate content is prohibited.",
      "**1.4 No Spam** \u2014 Do not spam messages, emotes, reactions, mentions, advertisements, or support requests.",
      "**1.5 Appropriate Names** \u2014 Names, avatars, and gang tags must not contain offensive, extremist, hateful, or misleading content."
    ]),
    createQuotedSection("2. Advertising & Promotion", [
      "**2.1 No Unauthorized Advertising** \u2014 Advertising other communities, servers, websites, products, or services without staff approval is prohibited.",
      "**2.2 No Recruitment** \u2014 Recruiting members for competing communities, servers, or projects is not allowed."
    ]),
    createQuotedSection("3. Support & Staff", [
      "**3.1 Use Tickets** \u2014 Reports, appeals, compensation requests, complaints, and support issues must use the proper ticket system.",
      "**3.2 Respect Staff** \u2014 Do not harass, insult, threaten, or repeatedly contact staff over decisions.",
      "**3.3 Staff Decisions** \u2014 Staff decisions may be appealed properly. Final senior administration decisions are binding."
    ]),
    createQuotedSection("4. Cheating & Exploiting", [
      "**4.1 No Cheating** \u2014 Cheats, hacks, exploits, unauthorized software, or unfair advantages are strictly prohibited.",
      "**4.2 No Exploit Abuse** \u2014 Bugs, glitches, or unintended mechanics must be reported, not abused.",
      "**4.3 No Duplication** \u2014 Duplicating items, currency, or assets by any method is prohibited."
    ]),
    createQuotedSection("5. Streaming & Content", [
      "**5.1 Follow Rules** \u2014 Streamers and content creators must follow all community and server rules.",
      "**5.2 No Stream Sniping** \u2014 Using stream information to target or disrupt players is prohibited."
    ]),
    createQuotedSection("6. Penalties", [
      "**6.1 Administrative Action** \u2014 Violations may result in warnings, mutes, kicks, temporary bans, permanent bans, or other action.",
      "**6.2 Case-by-Case Review** \u2014 Punishments may vary based on severity, history, and intent.",
      "**6.3 Repeat Offenders** \u2014 Repeated violations may result in harsher punishments."
    ]),
    createQuotedSection("7. Final Provisions", [
      "**7.1 Discord Terms** \u2014 All users must follow Discord Terms of Service and Community Guidelines.",
      "**7.2 Common Sense Clause** \u2014 Staff may act against harmful behavior even if it is not specifically listed.",
      "**7.3 Rule Acceptance** \u2014 By joining or participating in Meridian, you agree to follow all community rules and policies."
    ])
  ];

  return applyMeridianBranding(new EmbedBuilder())
    .setTitle("Meridian Community Rules")
    .setDescription(
      [
        "Welcome to Meridian Network. These rules apply to all Meridian Discord, community, and server spaces.",
        ...sections
      ].join("\n\n")
    );
}

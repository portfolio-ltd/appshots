import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";
import type { AppInfo } from "./constants";

/**
 * Writes headline/subheading copy and picks a template for a set of screenshots.
 *
 * Without an API key this uses a free, deterministic local heuristic. With the
 * user's own Anthropic key (BYOK) it calls Claude straight from the browser —
 * the key goes only to api.anthropic.com.
 */

// Keep in sync with TEMPLATE_PRESETS ids in lib/constants.ts.
export const TEMPLATE_IDS = [
  "night-glow", "violet-lilac", "soft-daylight",
  "midnight-launch", "ocean-calm", "sunset-energy", "forest-fresh",
  "paper-minimal", "slate-editorial", "grape-bold", "blush-playful",
] as const;

export type TemplateId = (typeof TEMPLATE_IDS)[number];

export interface ShotCopy {
  headline: string;
  subheading: string;
}

export interface AutoDesignResult {
  templateId: TemplateId;
  shots: ShotCopy[];
  source: "ai" | "local";
}

/** Cheap, fast model — short copywriting, billed to the user's own key. */
export const AUTODESIGN_MODEL = "claude-haiku-5-5";

const HEADLINE_MAX = 40;
const SUBHEADING_MAX = 70;

// ── Local fallback ──────────────────────────────────────────────────────────

const CATEGORY_TEMPLATES: Record<string, TemplateId[]> = {
  bold: ["midnight-launch", "grape-bold"],
  professional: ["ocean-calm", "slate-editorial"],
  playful: ["sunset-energy", "blush-playful"],
  clean: ["forest-fresh", "paper-minimal"],
};

const CATEGORY_MOOD: Record<string, keyof typeof CATEGORY_TEMPLATES> = {
  "Games": "bold", "Entertainment": "bold", "Photo & Video": "bold", "Graphics & Design": "bold",
  "Photography": "bold", "Video Players & Editors": "bold", "Comics": "bold",
  "Finance": "professional", "Business": "professional", "Productivity": "professional",
  "Developer Tools": "professional", "Utilities": "professional", "Tools": "professional",
  "News": "professional", "News & Magazines": "professional", "Medical": "professional",
  "Health & Fitness": "playful", "Sports": "playful", "Food & Drink": "playful",
  "Social Networking": "playful", "Social": "playful", "Music": "playful", "Music & Audio": "playful",
  "Dating": "playful", "Travel": "playful", "Travel & Local": "playful", "Parenting": "playful",
};

const HEADLINES = [
  "Meet {name}",
  "Everything in one place",
  "Built for the way you work",
  "Simple. Fast. Yours.",
  "Do more in less time",
  "Designed around you",
  "Stay on top of it all",
  "Ready when you are",
  "Your new favourite app",
  "Get started in seconds",
];

const SUBHEADINGS = [
  "Fast, simple, and built for everyday life.",
  "All the essentials, none of the clutter.",
  "Thoughtful details in every screen.",
  "Works beautifully on every device.",
  "Download free today.",
];

/** The prompt shows line breaks as "\\n"; accept them written out literally too, and collapse blank lines. */
export function normaliseHeadline(s: string): string {
  return s.replace(/\\n/g, "\n").replace(/[ \t]*\n[ \t]*/g, "\n").replace(/\n{2,}/g, "\n").trim();
}

function clip(s: string, max: number) {
  const t = s.trim();
  if (t.length <= max) return t;
  const cut = t.slice(0, max - 1);
  const space = cut.lastIndexOf(" ");
  return `${space > max * 0.6 ? cut.slice(0, space) : cut}…`;
}

export function localAutoDesign(app: AppInfo, count: number, seed = 0): AutoDesignResult {
  const mood = CATEGORY_MOOD[app.categoryPrimary] ?? "clean";
  const options = CATEGORY_TEMPLATES[mood];
  const templateId = options[seed % options.length];
  const name = app.name.trim() || "your app";

  const shots = Array.from({ length: count }, (_, i) => {
    const headline = HEADLINES[(i + seed) % HEADLINES.length].replace("{name}", name);
    // Lead with the developer's own words where we have them.
    const subheading = i === 0 && app.descriptionShort.trim()
      ? app.descriptionShort
      : app.subtitle.trim() && i === 1
        ? app.subtitle
        : SUBHEADINGS[(i + seed) % SUBHEADINGS.length];
    return { headline: clip(headline, HEADLINE_MAX), subheading: clip(subheading, SUBHEADING_MAX) };
  });

  return { templateId, shots, source: "local" };
}

// ── Claude (BYOK) ───────────────────────────────────────────────────────────

const ResultSchema = z.object({
  template_id: z.enum(TEMPLATE_IDS),
  screenshots: z.array(
    z.object({
      headline: z.string(),
      subheading: z.string(),
    }),
  ),
});

export interface AiOptions {
  /** One JPEG (base64, no data: prefix) per screen position; null where none. */
  screens?: (string | null)[];
  /** Extra context the user pastes: README, feature list, release notes. */
  notes?: string;
}

export async function aiAutoDesign(
  app: AppInfo,
  count: number,
  apiKey: string,
  { screens = [], notes = "" }: AiOptions = {},
): Promise<AutoDesignResult> {
  const client = new Anthropic({ apiKey, dangerouslyAllowBrowser: true });
  const seeing = screens.some(Boolean);

  const brief = [
    `Write App Store / Google Play screenshot captions for an app called "${app.name}".`,
    app.subtitle && `Subtitle: ${app.subtitle}`,
    app.descriptionShort && `Short description: ${app.descriptionShort}`,
    app.descriptionFull && `Full description: ${app.descriptionFull.slice(0, 1500)}`,
    app.categoryPrimary && `Category: ${app.categoryPrimary}`,
    notes.trim() && `More context from the developer (README, feature list or notes):\n${notes.trim().slice(0, 6000)}`,
    "",
    seeing
      ? `The ${count} screenshots are attached in order. Write one caption per screenshot about what that screen shows.`
      : `Write exactly ${count} captions, one per screenshot.`,
    "Order them the way a new user discovers the app: the first sells the core benefit, the rest each highlight a different feature.",
    `Headline: at most ${HEADLINE_MAX} characters, benefit-led, sentence case. Split it into two short lines with a line break (\\n) where it reads naturally, e.g. "Tap once.\\nKeep the chain." or "Every rupee,\\nsorted."`,
    `Subheading: one sentence of at most ${SUBHEADING_MAX} characters adding a concrete detail from the screen or the descriptions.`,
    "Only claim what the screenshots or descriptions support: no rankings, awards, prices or invented numbers.",
    `Also pick the template that best fits the app's tone from: ${TEMPLATE_IDS.join(", ")}.`,
  ].filter(Boolean).join("\n");

  const content: Anthropic.ContentBlockParam[] = [];
  screens.slice(0, count).forEach((data, i) => {
    if (!data) return;
    content.push({ type: "text", text: `Screenshot ${i + 1}:` });
    content.push({ type: "image", source: { type: "base64", media_type: "image/jpeg", data } });
  });
  content.push({ type: "text", text: brief });

  const response = await client.messages.parse({
    model: AUTODESIGN_MODEL,
    max_tokens: 2000,
    messages: [{ role: "user", content }],
    output_config: { effort: "low", format: zodOutputFormat(ResultSchema) },
  });

  const parsed = response.parsed_output;
  if (!parsed || parsed.screenshots.length === 0) {
    throw new Error(response.stop_reason === "refusal" ? "Claude declined this request." : "Claude returned no captions.");
  }

  const shots = Array.from({ length: count }, (_, i) => {
    const s = parsed.screenshots[i % parsed.screenshots.length];
    return { headline: clip(normaliseHeadline(s.headline), HEADLINE_MAX), subheading: clip(s.subheading, SUBHEADING_MAX) };
  });
  return { templateId: parsed.template_id, shots, source: "ai" };
}

/** Human-readable reason for a failed BYOK call. */
export function describeAiError(e: unknown): string {
  if (e instanceof Anthropic.AuthenticationError) return "That API key was rejected — check it and try again.";
  if (e instanceof Anthropic.PermissionDeniedError) return "This API key can't use the model — check your Anthropic Console settings.";
  if (e instanceof Anthropic.RateLimitError) return "Rate limited by the Anthropic API — wait a moment and retry.";
  if (e instanceof Anthropic.APIConnectionError) return "Couldn't reach the Anthropic API — check your connection.";
  if (e instanceof Anthropic.APIError) return `Anthropic API error ${e.status ?? ""}: ${e.message}`;
  return e instanceof Error ? e.message : String(e);
}

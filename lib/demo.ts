import { TEMPLATE_PRESETS, templateStyle, type AppInfo } from "./constants";
import { saveShots } from "./files";
import { clearDraft, designKey, saveAppInfo, saveDesigns, type DesignMap } from "./persist";
import { BASE_PATH } from "./site";

/**
 * A complete sample project built from real captures of Notchday, a habit
 * tracker, so people can try the editor before taking their own screenshots.
 */

export const DEMO_APP: AppInfo = {
  name: "Notchday",
  subtitle: "Build habits. Track progress.",
  descriptionShort: "A habit tracker with streaks, stats and gentle reminders. No account, no subscription.",
  descriptionFull:
    "Track daily, weekly and monthly habits with one tap. See your streaks on a heatmap, get insights into momentum and consistency, and keep everything on your device.",
  categoryPrimary: "Productivity",
  categorySecondary: "Health & Fitness",
  stores: ["app-store"],
  deviceIds: ["ios-iphone-6.9", "ios-iphone-6.3"],
};

export const DEMO_TEMPLATE = "night-glow";

export const DEMO_SHOTS = [
  { file: "notchday-today.jpg", headline: "Tap once.\nKeep the chain.", subheading: "Every habit you're building, on one screen." },
  { file: "notchday-streaks.jpg", headline: "Months of progress,\nat a glance.", subheading: "The days you showed up, and the ones you didn't." },
  { file: "notchday-detail.jpg", headline: "Every day\ncounts.", subheading: "Streaks, best runs and a full history for each habit." },
  { file: "notchday-stats.jpg", headline: "Know what's\nworking.", subheading: "Momentum, consistency, best days and more." },
  { file: "notchday-add.jpg", headline: "Daily. Weekly.\nMonthly.", subheading: "Each habit on its own schedule. Days off don't break streaks." },
  { file: "notchday-light.jpg", headline: "No account.\nNo subscription.", subheading: "Your data stays on your device. Light or dark." },
];

export function exampleUrl(file: string) {
  return `${BASE_PATH}/examples/${file}`;
}

export async function fetchExample(file: string): Promise<File> {
  const res = await fetch(exampleUrl(file));
  if (!res.ok) throw new Error(`Couldn't load the sample screenshot ${file}`);
  return new File([await res.blob()], file, { type: "image/jpeg" });
}

/** Replaces the current draft with the sample project. */
export async function loadDemo(): Promise<void> {
  const files = await Promise.all(DEMO_SHOTS.map((s) => fetchExample(s.file)));
  await clearDraft();
  saveAppInfo(DEMO_APP);
  const template = TEMPLATE_PRESETS.find((t) => t.id === DEMO_TEMPLATE)!;
  const designs: DesignMap = {};
  for (const deviceId of DEMO_APP.deviceIds) {
    await saveShots(deviceId, files);
    DEMO_SHOTS.forEach((s, i) => {
      designs[designKey(deviceId, i)] = { ...templateStyle(template, i), headline: s.headline, subheading: s.subheading };
    });
  }
  saveDesigns(designs);
}

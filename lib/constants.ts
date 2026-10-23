import { BASE_PATH } from "./site";

// ─── Store categories ──────────────────────────────────────────────────────────

export const IOS_CATEGORIES = [
  "Books", "Business", "Developer Tools", "Education", "Entertainment",
  "Finance", "Food & Drink", "Games", "Graphics & Design", "Health & Fitness",
  "Lifestyle", "Magazines & Newspapers", "Medical", "Music", "Navigation",
  "News", "Photo & Video", "Productivity", "Reference", "Shopping",
  "Social Networking", "Sports", "Travel", "Utilities", "Weather",
] as const;

export const ANDROID_CATEGORIES = [
  "Art & Design", "Auto & Vehicles", "Beauty", "Books & Reference", "Business",
  "Comics", "Communication", "Dating", "Education", "Entertainment",
  "Events", "Finance", "Food & Drink", "Health & Fitness", "House & Home",
  "Libraries & Demo", "Lifestyle", "Maps & Navigation", "Medical", "Music & Audio",
  "News & Magazines", "Parenting", "Personalization", "Photography", "Productivity",
  "Shopping", "Social", "Sports", "Tools", "Travel & Local",
  "Video Players & Editors", "Weather",
] as const;

// ─── Devices & store output specs ──────────────────────────────────────────────

export type Store = "app-store" | "play-store";
export type Orientation = "portrait" | "landscape";

/** Which device chrome the renderer draws around the screenshot. */
export type FrameKind =
  | "iphone"
  | "ipad"
  | "watch"
  | "android-phone"
  | "android-tablet"
  | "laptop"
  | "none";

export interface DeviceSpec {
  id: string;
  label: string;
  store: Store;
  /** Folder name inside the exported ZIP, e.g. `app-store/iphone-6.9/`. */
  slug: string;
  minCount: number;
  maxCount: number;
  /** Store-enforced per-file limit; exports above it are re-encoded as JPEG. */
  maxFileMB: number | null;
  /** Exported canvas size in portrait. Landscape swaps width and height. */
  output: { width: number; height: number };
  frame: FrameKind;
  defaultOrientation: Orientation;
  allowLandscape: boolean;
  /** Human-readable accepted sizes, shown in the UI. */
  acceptedDimensions: string;
}

export const DEVICE_SPECS: DeviceSpec[] = [
  // ── Google Play ─────────────────────────────────────────────────────────────
  {
    id: "play-phone", label: "Phone", store: "play-store", slug: "phone",
    minCount: 2, maxCount: 8, maxFileMB: 8,
    output: { width: 1080, height: 1920 }, frame: "android-phone",
    defaultOrientation: "portrait", allowLandscape: true,
    acceptedDimensions: "16:9 or 9:16, 320–3840 px per side",
  },
  {
    id: "play-tablet-7", label: "7\" Tablet", store: "play-store", slug: "tablet-7",
    minCount: 0, maxCount: 8, maxFileMB: 8,
    output: { width: 1080, height: 1920 }, frame: "android-tablet",
    defaultOrientation: "portrait", allowLandscape: true,
    acceptedDimensions: "16:9 or 9:16, 320–3840 px per side",
  },
  {
    id: "play-tablet-10", label: "10\" Tablet", store: "play-store", slug: "tablet-10",
    minCount: 0, maxCount: 8, maxFileMB: 8,
    output: { width: 1440, height: 2560 }, frame: "android-tablet",
    defaultOrientation: "portrait", allowLandscape: true,
    acceptedDimensions: "16:9 or 9:16, 1080–7680 px per side",
  },
  {
    id: "play-chromebook", label: "Chromebook", store: "play-store", slug: "chromebook",
    minCount: 4, maxCount: 8, maxFileMB: 8,
    output: { width: 1080, height: 1920 }, frame: "laptop",
    defaultOrientation: "landscape", allowLandscape: true,
    acceptedDimensions: "16:9 or 9:16, 1080–7680 px per side",
  },
  {
    id: "play-xr", label: "Android XR", store: "play-store", slug: "xr",
    minCount: 4, maxCount: 8, maxFileMB: 15,
    output: { width: 1080, height: 1920 }, frame: "none",
    defaultOrientation: "landscape", allowLandscape: true,
    acceptedDimensions: "16:9 or 9:16, 720–7680 px per side",
  },
  // ── App Store ───────────────────────────────────────────────────────────────
  {
    id: "ios-iphone-6.9", label: "iPhone 6.9\"", store: "app-store", slug: "iphone-6.9",
    minCount: 1, maxCount: 10, maxFileMB: null,
    output: { width: 1320, height: 2868 }, frame: "iphone",
    defaultOrientation: "portrait", allowLandscape: true,
    acceptedDimensions: "1320×2868, 1290×2796, 1260×2736 (or landscape)",
  },
  {
    id: "ios-iphone-6.5", label: "iPhone 6.5\"", store: "app-store", slug: "iphone-6.5",
    minCount: 1, maxCount: 10, maxFileMB: null,
    output: { width: 1284, height: 2778 }, frame: "iphone",
    defaultOrientation: "portrait", allowLandscape: true,
    acceptedDimensions: "1284×2778, 1242×2688 (or landscape)",
  },
  {
    id: "ios-iphone-6.3", label: "iPhone 6.3\"", store: "app-store", slug: "iphone-6.3",
    minCount: 1, maxCount: 10, maxFileMB: null,
    output: { width: 1206, height: 2622 }, frame: "iphone",
    defaultOrientation: "portrait", allowLandscape: true,
    acceptedDimensions: "1206×2622, 1179×2556 (or landscape)",
  },
  {
    id: "ios-iphone-6.1", label: "iPhone 6.1\"", store: "app-store", slug: "iphone-6.1",
    minCount: 1, maxCount: 10, maxFileMB: null,
    output: { width: 1170, height: 2532 }, frame: "iphone",
    defaultOrientation: "portrait", allowLandscape: true,
    acceptedDimensions: "1170×2532, 1125×2436, 1080×2340 (or landscape)",
  },
  {
    id: "ios-ipad-13", label: "iPad 13\"", store: "app-store", slug: "ipad-13",
    minCount: 1, maxCount: 10, maxFileMB: null,
    output: { width: 2064, height: 2752 }, frame: "ipad",
    defaultOrientation: "portrait", allowLandscape: true,
    acceptedDimensions: "2064×2752, 2048×2732 (or landscape)",
  },
  {
    id: "ios-ipad-11", label: "iPad 11\"", store: "app-store", slug: "ipad-11",
    minCount: 1, maxCount: 10, maxFileMB: null,
    output: { width: 1668, height: 2388 }, frame: "ipad",
    defaultOrientation: "portrait", allowLandscape: true,
    acceptedDimensions: "1668×2420, 1668×2388, 1640×2360 (or landscape)",
  },
  {
    id: "ios-ipad-mini", label: "iPad Mini", store: "app-store", slug: "ipad-mini",
    minCount: 1, maxCount: 10, maxFileMB: null,
    output: { width: 1536, height: 2048 }, frame: "ipad",
    defaultOrientation: "portrait", allowLandscape: true,
    acceptedDimensions: "1536×2048, 1536×2008, 768×1024 (or landscape)",
  },
  {
    id: "ios-watch", label: "Apple Watch", store: "app-store", slug: "watch",
    minCount: 1, maxCount: 10, maxFileMB: null,
    output: { width: 422, height: 514 }, frame: "watch",
    defaultOrientation: "portrait", allowLandscape: false,
    acceptedDimensions: "422×514, 416×496, 396×484, 368×448",
  },
];

export const PLAY_DEVICES = DEVICE_SPECS.filter((d) => d.store === "play-store");
export const IOS_DEVICES = DEVICE_SPECS.filter((d) => d.store === "app-store");

export function getDevice(id: string): DeviceSpec | undefined {
  return DEVICE_SPECS.find((d) => d.id === id);
}

export function outputSize(spec: DeviceSpec, orientation: Orientation) {
  const { width, height } = spec.output;
  return orientation === "landscape" && spec.allowLandscape
    ? { width: height, height: width }
    : { width, height };
}

// ─── App info (step 1) ─────────────────────────────────────────────────────────

export interface AppInfo {
  name: string;
  subtitle: string;
  descriptionShort: string;
  descriptionFull: string;
  categoryPrimary: string;
  categorySecondary: string;
  stores: Store[];
  deviceIds: string[];
}

// ─── Design config (one per screenshot) ────────────────────────────────────────

export type FontId = "sans" | "display" | "serif" | "rounded" | "mono";

/**
 * - `frame`: screenshot inside a drawn device, text above/below it.
 * - `flat`: screenshot as a rounded card with a shadow, no device chrome.
 * - `fullbleed`: screenshot fills the canvas, text on a gradient scrim.
 */
export type DeviceStyle = "frame" | "flat" | "fullbleed";

export interface DesignConfig {
  bgColor: string;
  /** Second gradient stop. Equal to `bgColor` for a solid background. */
  bgColor2: string;
  gradientAngle: number;     // degrees, 0 = top → bottom
  headline: string;
  subheading: string;
  fontId: FontId;
  /** Font sizes in px on a 1290px-wide canvas; scaled to the real output width. */
  fontSize: number;
  subSize: number;
  fontColor: string;
  textAlign: "left" | "center" | "right";
  textPosition: "top" | "bottom";
  deviceStyle: DeviceStyle;
  /** Device size relative to the space left after the text; > 100 bleeds off the edge. */
  deviceScale: number;       // 60–130 (%)
  tilt: number;              // degrees, -20 to 20
  /** `null` uses the device's default orientation. */
  orientation: Orientation | null;
  overlays: OverlayItem[];
}

export interface OverlayItem {
  id: string;
  kind: "upload" | "builtin";
  /** Static asset path or data URI for built-ins. Uploads are resolved from IndexedDB by `id`. */
  src: string;
  x: number;        // centre, % of canvas width
  y: number;        // centre, % of canvas height
  scale: number;    // 0.1–3, relative to 22% of the canvas's shorter side
  rotation: number; // degrees
  opacity: number;  // 0–1
  zIndex: number;
  /** Set on generated overlays so re-running a template replaces instead of stacking them. */
  tag?: "accent" | "step";
}

export const DEFAULT_DESIGN: DesignConfig = {
  bgColor: "#1a1a2e",
  bgColor2: "#3a2a6e",
  gradientAngle: 160,
  headline: "",
  subheading: "",
  fontId: "display",
  fontSize: 120,
  subSize: 56,
  fontColor: "#ffffff",
  textAlign: "center",
  textPosition: "top",
  deviceStyle: "frame",
  deviceScale: 100,
  tilt: 0,
  orientation: null,
  overlays: [],
};

/** Per-device defaults applied before the user's own edits. */
export function deviceDefaults(spec: DeviceSpec): Partial<DesignConfig> {
  if (spec.frame === "watch") return { deviceStyle: "fullbleed", headline: "", subheading: "" };
  if (spec.frame === "none") return { deviceStyle: "flat" };
  return {};
}

// ─── Overlays ──────────────────────────────────────────────────────────────────

export interface BuiltinOverlay {
  id: string;
  label: string;
  src: string;
}

export const BUILTIN_OVERLAYS: BuiltinOverlay[] = [
  { id: "star", label: "Star", src: `${BASE_PATH}/overlays/star.svg` },
  { id: "sparkle", label: "Sparkle", src: `${BASE_PATH}/overlays/sparkle.svg` },
  { id: "heart", label: "Heart", src: `${BASE_PATH}/overlays/heart.svg` },
  { id: "checkmark", label: "Checkmark", src: `${BASE_PATH}/overlays/checkmark.svg` },
  { id: "arrow", label: "Arrow", src: `${BASE_PATH}/overlays/arrow.svg` },
  { id: "new-badge", label: "New badge", src: `${BASE_PATH}/overlays/new-badge.svg` },
];

/** Inline SVG step-number badge used by Story mode. */
export function numberBadgeDataUri(n: number): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="240" height="240" viewBox="0 0 60 60"><circle cx="30" cy="30" r="28" fill="#111827" stroke="#ffffff" stroke-width="2"/><text x="30" y="39" font-family="system-ui, sans-serif" font-size="24" font-weight="700" fill="#ffffff" text-anchor="middle">${n}</text></svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

export function newOverlayId(): string {
  return `ov_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

// ─── Presets ───────────────────────────────────────────────────────────────────

export const FONT_OPTIONS: { id: FontId; label: string }[] = [
  { id: "display", label: "Display" },
  { id: "sans", label: "Sans" },
  { id: "serif", label: "Serif" },
  { id: "rounded", label: "Rounded" },
  { id: "mono", label: "Mono" },
];

export const THEME_PRESETS = [
  { name: "Midnight", bgColor: "#0f0c29", bgColor2: "#302b63", fontColor: "#ffffff" },
  { name: "Ocean",    bgColor: "#0f3460", bgColor2: "#16a3b8", fontColor: "#f0fdff" },
  { name: "Sunset",   bgColor: "#f25c54", bgColor2: "#f7b267", fontColor: "#ffffff" },
  { name: "Forest",   bgColor: "#134e3a", bgColor2: "#2d9d6f", fontColor: "#ecfdf5" },
  { name: "Paper",    bgColor: "#f8fafc", bgColor2: "#e2e8f0", fontColor: "#0f172a" },
  { name: "Slate",    bgColor: "#1e293b", bgColor2: "#1e293b", fontColor: "#f1f5f9" },
  { name: "Grape",    bgColor: "#4c1d95", bgColor2: "#a21caf", fontColor: "#faf5ff" },
  { name: "Blush",    bgColor: "#ffe4e6", bgColor2: "#fbcfe8", fontColor: "#881337" },
] as const;

export type TemplateCategory = "minimal" | "bold" | "clean" | "playful" | "professional";

export interface Template {
  id: string;
  label: string;
  category: TemplateCategory;
  config: Partial<DesignConfig>;
  /** BuiltinOverlay id added as a small accent when the template is applied. */
  accentOverlayId?: string;
}

// Keep ids in sync with TEMPLATE_IDS in lib/autodesign.ts.
export const TEMPLATE_PRESETS: Template[] = [
  {
    id: "midnight-launch", label: "Midnight Launch", category: "bold",
    config: {
      bgColor: "#0f0c29", bgColor2: "#302b63", gradientAngle: 160, fontColor: "#ffffff",
      fontId: "display", fontSize: 128, subSize: 56, textAlign: "center",
      textPosition: "top", deviceStyle: "frame", deviceScale: 108, tilt: 0,
    },
    accentOverlayId: "sparkle",
  },
  {
    id: "ocean-calm", label: "Ocean Calm", category: "professional",
    config: {
      bgColor: "#0f3460", bgColor2: "#16a3b8", gradientAngle: 180, fontColor: "#f0fdff",
      fontId: "sans", fontSize: 112, subSize: 52, textAlign: "left",
      textPosition: "top", deviceStyle: "frame", deviceScale: 100, tilt: 0,
    },
  },
  {
    id: "sunset-energy", label: "Sunset Energy", category: "playful",
    config: {
      bgColor: "#f25c54", bgColor2: "#f7b267", gradientAngle: 150, fontColor: "#ffffff",
      fontId: "rounded", fontSize: 124, subSize: 56, textAlign: "center",
      textPosition: "top", deviceStyle: "frame", deviceScale: 104, tilt: 6,
    },
    accentOverlayId: "star",
  },
  {
    id: "forest-fresh", label: "Forest Fresh", category: "clean",
    config: {
      bgColor: "#134e3a", bgColor2: "#2d9d6f", gradientAngle: 0, fontColor: "#ecfdf5",
      fontId: "sans", fontSize: 108, subSize: 50, textAlign: "center",
      textPosition: "bottom", deviceStyle: "frame", deviceScale: 100, tilt: 0,
    },
  },
  {
    id: "paper-minimal", label: "Paper Minimal", category: "minimal",
    config: {
      bgColor: "#f8fafc", bgColor2: "#e2e8f0", gradientAngle: 180, fontColor: "#0f172a",
      fontId: "sans", fontSize: 104, subSize: 48, textAlign: "left",
      textPosition: "top", deviceStyle: "flat", deviceScale: 100, tilt: 0,
    },
  },
  {
    id: "slate-editorial", label: "Slate Editorial", category: "professional",
    config: {
      bgColor: "#1e293b", bgColor2: "#1e293b", gradientAngle: 180, fontColor: "#f1f5f9",
      fontId: "serif", fontSize: 116, subSize: 52, textAlign: "center",
      textPosition: "top", deviceStyle: "frame", deviceScale: 100, tilt: 0,
    },
  },
  {
    id: "grape-bold", label: "Grape Bold", category: "bold",
    config: {
      bgColor: "#4c1d95", bgColor2: "#a21caf", gradientAngle: 135, fontColor: "#faf5ff",
      fontId: "display", fontSize: 132, subSize: 56, textAlign: "center",
      textPosition: "top", deviceStyle: "frame", deviceScale: 112, tilt: -5,
    },
    accentOverlayId: "new-badge",
  },
  {
    id: "blush-playful", label: "Blush Playful", category: "playful",
    config: {
      bgColor: "#ffe4e6", bgColor2: "#fbcfe8", gradientAngle: 160, fontColor: "#881337",
      fontId: "rounded", fontSize: 120, subSize: 54, textAlign: "center",
      textPosition: "top", deviceStyle: "flat", deviceScale: 100, tilt: 4,
    },
    accentOverlayId: "heart",
  },
];

export const EMOJI_SHORTCUTS = [
  "🚀", "⭐", "✨", "🎉", "💡", "🔥", "❤️", "💪",
  "📱", "🎯", "✅", "🌟", "🎨", "⚡", "🔒", "🎁",
  "🌈", "💎", "🏆", "🎶", "🌍", "💬", "📊", "🔑",
] as const;

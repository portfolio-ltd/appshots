import {
  DEFAULT_DESIGN,
  DEVICE_SPECS,
  TEMPLATE_PRESETS,
  deviceDefaults,
  getDevice,
  templateStyle,
  type DesignConfig,
  type DeviceSpec,
} from "../../lib/constants";

/** One screen of the app, captioned once and rendered for every device. */
export interface ShotConfig {
  /** Fills `{key}` in each device's file pattern, and names the output file. */
  key: string;
  headline?: string;
  subheading?: string;
  /** Style changes for this screenshot only. */
  style?: Partial<DesignConfig>;
}

export interface DeviceConfig {
  /** Path to the raw captures, relative to the config file, with `{key}` for the shot key. */
  files: string;
  /** Style changes for this device only. */
  style?: Partial<DesignConfig>;
  /** Caption overrides for single-image devices such as the Play feature graphic. */
  headline?: string;
  subheading?: string;
}

export interface AppShotsConfig {
  /** Output folder, relative to the config file. Default: "appshots-out". */
  out?: string;
  /** Template id from `appshots templates`. */
  template?: string;
  /** Style changes applied to every screenshot, on top of the template. */
  style?: Partial<DesignConfig>;
  /** Device id (from `appshots devices`) → file pattern or device settings. */
  devices: Record<string, string | DeviceConfig>;
  shots: ShotConfig[];
}

export interface RenderJob {
  spec: DeviceSpec;
  shot: ShotConfig;
  index: number;
  /** Raw capture path, relative to the config file. */
  file: string;
  design: DesignConfig;
}

const STYLE_KEYS = new Set(Object.keys(DEFAULT_DESIGN).filter((k) => !["headline", "subheading", "overlays"].includes(k)));

/** Problems with a config, in plain words. Empty when it is valid. */
export function validateConfig(raw: unknown): string[] {
  const errors: string[] = [];
  if (!raw || typeof raw !== "object") return ["The config must be a JSON object."];
  const c = raw as Partial<AppShotsConfig>;

  if (c.template !== undefined && !TEMPLATE_PRESETS.some((t) => t.id === c.template)) {
    errors.push(`Unknown template "${c.template}". Run "appshots templates" to list them.`);
  }
  if (!c.devices || typeof c.devices !== "object" || Object.keys(c.devices).length === 0) {
    errors.push('"devices" must map at least one device id to a file pattern.');
  } else {
    for (const [id, d] of Object.entries(c.devices)) {
      if (!getDevice(id)) errors.push(`Unknown device "${id}". Run "appshots devices" to list them.`);
      const files = typeof d === "string" ? d : d?.files;
      if (typeof files !== "string" || !files) errors.push(`Device "${id}" needs a file pattern, e.g. "raw/phone-{key}.png".`);
      if (typeof d === "object" && d) checkStyle(d.style, `devices.${id}.style`, errors);
    }
  }
  if (!Array.isArray(c.shots) || c.shots.length === 0) {
    errors.push('"shots" must list at least one screenshot.');
  } else {
    const seen = new Set<string>();
    c.shots.forEach((s, i) => {
      if (!s || typeof s.key !== "string" || !s.key) errors.push(`shots[${i}] needs a "key".`);
      else if (seen.has(s.key)) errors.push(`shots[${i}] repeats the key "${s.key}".`);
      else seen.add(s.key);
      checkStyle(s?.style, `shots[${i}].style`, errors);
    });
  }
  checkStyle(c.style, "style", errors);
  return errors;
}

function checkStyle(style: unknown, where: string, errors: string[]) {
  if (style === undefined) return;
  if (!style || typeof style !== "object") {
    errors.push(`"${where}" must be an object.`);
    return;
  }
  for (const k of Object.keys(style)) {
    if (!STYLE_KEYS.has(k)) errors.push(`Unknown style option "${k}" in ${where}. Options: ${[...STYLE_KEYS].join(", ")}.`);
  }
}

/** Every image to render, in export order. Assumes a valid config. */
export function planJobs(config: AppShotsConfig, onlyDevices?: string[]): RenderJob[] {
  const template = TEMPLATE_PRESETS.find((t) => t.id === config.template);
  const jobs: RenderJob[] = [];

  for (const spec of DEVICE_SPECS) {
    const entry = config.devices[spec.id];
    if (!entry || (onlyDevices?.length && !onlyDevices.includes(spec.id))) continue;
    const device: DeviceConfig = typeof entry === "string" ? { files: entry } : entry;
    // Stores that want the bare UI (TV, Wear OS, Watch…) get no template or caption.
    const bare = spec.uiOnly || spec.frame === "watch";

    config.shots.slice(0, spec.maxCount).forEach((shot, index) => {
      const single = spec.maxCount === 1;
      const design: DesignConfig = {
        ...DEFAULT_DESIGN,
        ...(bare ? {} : template ? templateStyle(template, index) : {}),
        ...deviceDefaults(spec),
        ...(bare ? {} : config.style),
        ...(bare ? {} : shot.style),
        ...device.style,
        headline: bare ? "" : (single ? device.headline : undefined) ?? shot.headline ?? "",
        subheading: bare ? "" : (single ? device.subheading : undefined) ?? shot.subheading ?? "",
        overlays: [],
      };
      jobs.push({ spec, shot, index, file: device.files.replaceAll("{key}", shot.key), design });
    });
  }
  return jobs;
}

export const SAMPLE_CONFIG: AppShotsConfig = {
  out: "appshots-out",
  template: "night-glow",
  devices: {
    "ios-iphone-6.9": "raw/phone-{key}.png",
    "ios-ipad-13": "raw/ipad-{key}.png",
  },
  shots: [
    { key: "home", headline: "Tap once.\nKeep the chain.", subheading: "Every habit you're building, on one screen." },
    { key: "stats", headline: "Know what's\nworking.", subheading: "Momentum, consistency and best days." },
  ],
};

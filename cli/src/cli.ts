import { createCanvas, GlobalFonts, loadImage } from "@napi-rs/canvas";
import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";
import { DEVICE_SPECS, TEMPLATE_PRESETS, outputSize, type FontId } from "../../lib/constants";
import { renderDesign, type RenderFonts } from "../../lib/render/draw";
import { SAMPLE_CONFIG, planJobs, validateConfig, type AppShotsConfig, type RenderJob } from "./config";

const VERSION = "1.0.0";
const require = createRequire(import.meta.url);

// ── Fonts: the same five OFL families the web app uses ─────────────────────────

const FONT_FILES: Record<FontId, { pkg: string; file: string; weights: [number, number] }> = {
  display: { pkg: "@fontsource/plus-jakarta-sans", file: "plus-jakarta-sans", weights: [800, 500] },
  sans: { pkg: "@fontsource/inter", file: "inter", weights: [700, 500] },
  serif: { pkg: "@fontsource/playfair-display", file: "playfair-display", weights: [700, 500] },
  rounded: { pkg: "@fontsource/nunito", file: "nunito", weights: [800, 600] },
  mono: { pkg: "@fontsource/jetbrains-mono", file: "jetbrains-mono", weights: [700, 500] },
};

const registered = new Map<FontId, RenderFonts>();

function fontsFor(id: FontId): RenderFonts {
  const cached = registered.get(id);
  if (cached) return cached;
  const f = FONT_FILES[id] ?? FONT_FILES.display;
  const family = `AppShots ${id}`;
  const dir = path.join(path.dirname(require.resolve(`${f.pkg}/package.json`)), "files");
  for (const weight of f.weights) {
    for (const subset of ["latin", "latin-ext"]) {
      const file = path.join(dir, `${f.file}-${subset}-${weight}-normal.woff2`);
      if (existsSync(file)) GlobalFonts.registerFromPath(file, family);
    }
  }
  const fonts = { family: `"${family}"`, headlineWeight: f.weights[0], subWeight: f.weights[1] };
  registered.set(id, fonts);
  return fonts;
}

// ── Rendering ──────────────────────────────────────────────────────────────────

async function renderJob(job: RenderJob, baseDir: string, outDir: string): Promise<string> {
  const { spec, design } = job;
  const { width, height } = outputSize(spec, design.orientation ?? spec.defaultOrientation);
  const image = await loadImage(path.resolve(baseDir, job.file));
  const canvas = createCanvas(width, height);
  // @napi-rs/canvas implements the browser's 2D context API the renderer is written against.
  const ctx = canvas.getContext("2d") as unknown as CanvasRenderingContext2D;

  renderDesign(ctx, width, height, design, spec.frame, {
    screenshot: image as unknown as CanvasImageSource,
    screenshotSize: { width: image.width, height: image.height },
    overlays: new Map(),
    fonts: fontsFor(design.fontId),
  });

  let data: Buffer = canvas.toBuffer("image/png");
  let ext = "png";
  // Same rule as the web app: over the store's file limit, fall back to JPEG.
  if (spec.maxFileMB && data.length > spec.maxFileMB * 1024 * 1024) {
    for (const quality of [92, 85, 75]) {
      data = canvas.toBuffer("image/jpeg", quality);
      ext = "jpg";
      if (data.length <= spec.maxFileMB * 1024 * 1024) break;
    }
  }

  const rel = path.join(spec.store, spec.slug, `${String(job.index + 1).padStart(2, "0")}-${job.shot.key}.${ext}`);
  const dest = path.join(outDir, rel);
  await mkdir(path.dirname(dest), { recursive: true });
  await writeFile(dest, data);
  return `${rel}  ${width}×${height}`;
}

// ── Commands ───────────────────────────────────────────────────────────────────

interface Flags {
  config: string;
  out?: string;
  devices: string[];
}

function parseFlags(args: string[]): Flags {
  const flags: Flags = { config: "appshots.json", devices: [] };
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === "--config" || a === "-c") flags.config = args[++i] ?? fail(`${a} needs a path.`);
    else if (a === "--out" || a === "-o") flags.out = args[++i] ?? fail(`${a} needs a folder.`);
    else if (a === "--device" || a === "-d") flags.devices.push(args[++i] ?? fail(`${a} needs a device id.`));
    else if (!a.startsWith("-") && flags.config === "appshots.json") flags.config = a;
    else fail(`Unknown option "${a}". Run "appshots help".`);
  }
  return flags;
}

function fail(message: string): never {
  console.error(`appshots: ${message}`);
  process.exit(1);
}

async function render(args: string[]) {
  const flags = parseFlags(args);
  const configPath = path.resolve(flags.config);
  if (!existsSync(configPath)) fail(`No config at ${flags.config}. Run "appshots init" to create one.`);

  let config: AppShotsConfig;
  try {
    config = JSON.parse(await readFile(configPath, "utf8"));
  } catch (e) {
    fail(`${flags.config} is not valid JSON: ${(e as Error).message}`);
  }
  const problems = validateConfig(config);
  if (problems.length) fail(`${flags.config} has ${problems.length} problem${problems.length > 1 ? "s" : ""}:\n  - ${problems.join("\n  - ")}`);

  const baseDir = path.dirname(configPath);
  const outDir = path.resolve(baseDir, flags.out ?? config.out ?? "appshots-out");
  const jobs = planJobs(config, flags.devices);
  if (jobs.length === 0) fail("Nothing to render. Check --device against the devices in your config.");

  let done = 0;
  const missing: string[] = [];
  const perDevice = new Map<string, number>();
  for (const job of jobs) {
    if (!existsSync(path.resolve(baseDir, job.file))) {
      missing.push(job.file);
      continue;
    }
    console.log(`  ${await renderJob(job, baseDir, outDir)}`);
    perDevice.set(job.spec.id, (perDevice.get(job.spec.id) ?? 0) + 1);
    done++;
  }

  for (const file of missing) console.warn(`  skipped: ${file} not found`);
  for (const spec of DEVICE_SPECS) {
    const n = perDevice.get(spec.id);
    if (n !== undefined && n < spec.minCount) {
      console.warn(`  note: ${spec.label} has ${n} screenshot${n === 1 ? "" : "s"}; the store asks for at least ${spec.minCount}.`);
    }
  }
  if (done === 0) fail("No screenshots were rendered: none of the raw files exist.");
  const shown = path.relative(process.cwd(), outDir);
  console.log(`\n${done} screenshot${done === 1 ? "" : "s"} written to ${shown && !shown.startsWith("..") ? shown : outDir}`);
  if (missing.length) process.exitCode = 1;
}

async function init(args: string[]) {
  const target = path.resolve(args[0] ?? "appshots.json");
  if (existsSync(target)) fail(`${path.basename(target)} already exists.`);
  await writeFile(target, `${JSON.stringify(SAMPLE_CONFIG, null, 2)}\n`);
  console.log(`Created ${path.relative(process.cwd(), target)}. Put your raw captures where "devices" points, then run "appshots render".`);
}

function listDevices() {
  for (const store of ["app-store", "play-store"] as const) {
    console.log(store === "app-store" ? "App Store" : "\nGoogle Play");
    for (const d of DEVICE_SPECS.filter((s) => s.store === store)) {
      const { width, height } = d.output;
      const count = d.maxCount === 1 ? "1 image" : `${d.minCount}–${d.maxCount} images`;
      console.log(`  ${d.id.padEnd(24)} ${`${width}×${height}`.padEnd(11)} ${count.padEnd(12)} ${d.label}`);
    }
  }
}

function listTemplates() {
  for (const t of TEMPLATE_PRESETS) {
    console.log(`  ${t.id.padEnd(18)} ${t.label}${t.variants ? `  (${t.variants.length} colours, one per screenshot)` : ""}`);
  }
}

const HELP = `appshots ${VERSION} — store-ready App Store and Google Play screenshots

Usage
  appshots init [file]          Create a sample appshots.json
  appshots render [file]        Render every screenshot in the config
  appshots devices              List device ids and their export sizes
  appshots templates            List template ids

Render options
  -c, --config <file>           Config file (default: appshots.json)
  -o, --out <folder>            Output folder (overrides "out" in the config)
  -d, --device <id>             Only this device; repeat for several

The web editor, with live preview: https://appshots.portfolio.ltd
`;

const [command, ...rest] = process.argv.slice(2);
switch (command) {
  case "render": await render(rest); break;
  case "init": await init(rest); break;
  case "devices": listDevices(); break;
  case "templates": listTemplates(); break;
  case "-v": case "--version": case "version": console.log(VERSION); break;
  case undefined: case "help": case "-h": case "--help": console.log(HELP); break;
  default: fail(`Unknown command "${command}". Run "appshots help".`);
}

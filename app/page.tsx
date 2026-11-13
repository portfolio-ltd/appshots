"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { DesignCanvas } from "@/components/DesignCanvas";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useExampleFile } from "@/hooks/useExampleFile";
import { useHydrated } from "@/hooks/useHydrated";
import { DEFAULT_DESIGN, TEMPLATE_PRESETS, templateStyle, type DesignConfig } from "@/lib/constants";
import { loadDemo } from "@/lib/demo";
import { hasDraft, loadAppInfo } from "@/lib/persist";
import { REPO_URL, SITE_NAME } from "@/lib/site";

/** Real captures from two indie apps, each rendered live with a built-in template. */
const SAMPLES: { file: string; deviceId: string; config: DesignConfig }[] = [
  {
    file: "notchday-today.jpg",
    deviceId: "ios-iphone-6.9",
    config: sample("night-glow", 0, "Tap once.\nKeep the chain.", "Every habit you're building, on one screen."),
  },
  {
    file: "localspend-insights.jpg",
    deviceId: "ios-iphone-6.3",
    config: sample("violet-lilac", 1, "See where\nit all went", "Budgets, categories and trends at a glance."),
  },
  {
    file: "notchday-light.jpg",
    deviceId: "ios-iphone-6.9",
    config: sample("soft-daylight", 1, "No account.\nNo subscription.", "Your data stays on your device."),
  },
];

function sample(templateId: string, index: number, headline: string, subheading: string): DesignConfig {
  const t = TEMPLATE_PRESETS.find((x) => x.id === templateId)!;
  return { ...DEFAULT_DESIGN, ...templateStyle(t, index), headline, subheading };
}

function Sample({ file, deviceId, config }: (typeof SAMPLES)[number]) {
  const image = useExampleFile(file);
  return <DesignCanvas deviceId={deviceId} config={config} file={image} renderHeight={720} className="w-full h-auto rounded-xl shadow-xl" />;
}

const FEATURES = [
  {
    title: "Exact store sizes",
    body: "Every export matches an accepted App Store or Google Play resolution, with per-store count checks and file-size limits.",
  },
  {
    title: "Real device frames",
    body: "iPhone and iPhone Duo, iPad, Android phones and tablets, Chromebook and Apple Watch, with tilt, gradients, stickers and full-bleed layouts.",
  },
  {
    title: "Private by design",
    body: "Screenshots never leave your browser. There's no account, no upload and no server. Drafts are stored locally on your device.",
  },
  {
    title: "AI captions, optional",
    body: "Captions for the whole set in one click. Built-in suggestions need no setup; with your own Anthropic key, Claude reads each screen and writes to it.",
  },
];

export default function HomePage() {
  const hydrated = useHydrated();
  const draftName = hydrated && hasDraft() ? loadAppInfo()?.name : null;
  const router = useRouter();
  const [demoState, setDemoState] = useState<"idle" | "loading" | "error">("idle");

  async function tryDemo() {
    if (draftName && !window.confirm(`Replace your draft "${draftName}" with the sample project?`)) return;
    setDemoState("loading");
    try {
      await loadDemo();
      router.push("/customise");
    } catch {
      setDemoState("error");
    }
  }

  return (
    <main className="min-h-screen bg-background">
      <header className="max-w-6xl mx-auto px-4 py-5 flex items-center justify-between">
        <span className="font-heading text-lg font-extrabold text-primary tracking-tight">{SITE_NAME}</span>
        <a href={REPO_URL} target="_blank" rel="noopener noreferrer" className="text-sm text-muted-foreground hover:text-foreground">
          Star on GitHub
        </a>
      </header>

      <section className="max-w-6xl mx-auto px-4 pt-10 pb-16 grid lg:grid-cols-[1fr_1.1fr] gap-12 items-center">
        <div className="space-y-6">
          <p className="inline-block text-xs font-semibold uppercase tracking-widest text-primary bg-primary/10 rounded-full px-3 py-1">
            Free &amp; open source
          </p>
          <h1 className="text-4xl sm:text-5xl font-extrabold">
            Store-ready screenshots, made in your browser.
          </h1>
          <p className="text-lg text-muted-foreground max-w-xl">
            Drop in raw simulator screenshots and get polished App Store and Google Play images:
            device frames, headlines and the exact sizes each store accepts, in one ZIP.
          </p>
          <div className="flex flex-wrap gap-3">
            <Button asChild size="lg" className="px-8 shadow-lg shadow-primary/20">
              <Link href="/onboarding">{draftName ? "Start a new app" : "Get started"}</Link>
            </Button>
            {draftName ? (
              <Button asChild size="lg" variant="outline">
                <Link href="/customise">Continue “{draftName}”</Link>
              </Button>
            ) : (
              <Button size="lg" variant="outline" onClick={tryDemo} disabled={demoState === "loading"}>
                {demoState === "loading" ? "Loading sample…" : "Try with sample screenshots"}
              </Button>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            No sign-up. Nothing is uploaded.
            {draftName && (
              <>
                {" "}
                <button type="button" onClick={tryDemo} className="underline hover:text-foreground">Try the sample project</button>
              </>
            )}
            {demoState === "error" && <span className="text-destructive"> Couldn&apos;t load the sample. Check your connection.</span>}
          </p>
        </div>

        <figure className="space-y-3">
          <div className="grid grid-cols-3 gap-3 items-end" aria-hidden>
            {SAMPLES.map((s) => <Sample key={s.file} {...s} />)}
          </div>
          <figcaption className="text-xs text-muted-foreground text-center">
            Real screens from Notchday and LocalSpend, rendered live in this page with the Night Glow, Violet &amp; Lilac and Soft Daylight templates.
          </figcaption>
        </figure>
      </section>

      <section className="border-t bg-muted/30">
        <div className="max-w-6xl mx-auto px-4 py-14 grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {FEATURES.map((f) => (
            <div key={f.title} className="space-y-2">
              <h2 className="text-base font-semibold">{f.title}</h2>
              <p className="text-sm text-muted-foreground">{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="max-w-6xl mx-auto px-4 py-8 text-xs text-muted-foreground flex flex-wrap justify-between gap-2">
        <span>{SITE_NAME} is licensed under AGPL-3.0.</span>
        <a href={REPO_URL} target="_blank" rel="noopener noreferrer" className="hover:text-foreground">
          Source code &amp; issues
        </a>
      </footer>
    </main>
  );
}

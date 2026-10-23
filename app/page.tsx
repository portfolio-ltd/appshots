"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { DesignCanvas } from "@/components/DesignCanvas";
import { useHydrated } from "@/hooks/useHydrated";
import { DEFAULT_DESIGN, TEMPLATE_PRESETS, type DesignConfig } from "@/lib/constants";
import { hasDraft, loadAppInfo } from "@/lib/persist";
import { REPO_URL, SITE_NAME } from "@/lib/site";

const SAMPLES: { deviceId: string; config: DesignConfig }[] = [
  {
    deviceId: "ios-iphone-6.9",
    config: {
      ...DEFAULT_DESIGN,
      ...TEMPLATE_PRESETS.find((t) => t.id === "midnight-launch")!.config,
      headline: "Plan your week in minutes",
      subheading: "Everything you need, beautifully organised.",
    },
  },
  {
    deviceId: "play-phone",
    config: {
      ...DEFAULT_DESIGN,
      ...TEMPLATE_PRESETS.find((t) => t.id === "sunset-energy")!.config,
      headline: "Track every workout",
      subheading: "Streaks, stats and gentle reminders.",
    },
  },
  {
    deviceId: "ios-ipad-13",
    config: {
      ...DEFAULT_DESIGN,
      ...TEMPLATE_PRESETS.find((t) => t.id === "paper-minimal")!.config,
      headline: "Made for the big screen",
      subheading: "Split view, keyboard shortcuts, Apple Pencil.",
    },
  },
];

const FEATURES = [
  {
    title: "Exact store sizes",
    body: "Every export matches an accepted App Store or Google Play resolution, with per-store count checks and file-size limits.",
  },
  {
    title: "Real device frames",
    body: "iPhone, iPad, Android phones and tablets, Chromebook and Apple Watch, with tilt, gradients, stickers and full-bleed layouts.",
  },
  {
    title: "Private by design",
    body: "Screenshots never leave your browser. There's no account, no upload and no server. Drafts are stored locally on your device.",
  },
  {
    title: "AI captions, optional",
    body: "Write captions for the whole set in one click. It works offline with built-in suggestions, or with your own Anthropic API key.",
  },
];

export default function HomePage() {
  const hydrated = useHydrated();
  const draftName = hydrated && hasDraft() ? loadAppInfo()?.name : null;

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
            {draftName && (
              <Button asChild size="lg" variant="outline">
                <Link href="/customise">Continue “{draftName}”</Link>
              </Button>
            )}
          </div>
          <p className="text-xs text-muted-foreground">No sign-up. Nothing is uploaded.</p>
        </div>

        <div className="grid grid-cols-[1fr_1fr_1.25fr] gap-3 items-end" aria-hidden>
          {SAMPLES.map((s) => (
            <DesignCanvas
              key={s.deviceId}
              deviceId={s.deviceId}
              config={s.config}
              file={null}
              renderHeight={640}
              className="w-full h-auto rounded-xl shadow-xl"
            />
          ))}
        </div>
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

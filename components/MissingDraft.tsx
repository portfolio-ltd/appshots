"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";

/** Shown when a step is opened without a draft (e.g. a fresh browser). */
export function MissingDraft() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center gap-4 p-8 text-center">
      <p className="text-muted-foreground">Start by telling us about your app.</p>
      <Button asChild size="lg">
        <Link href="/onboarding">Go to app info</Link>
      </Button>
    </main>
  );
}

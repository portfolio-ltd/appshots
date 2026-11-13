"use client";

import { useEffect, useState } from "react";
import { fetchExample } from "@/lib/demo";

/** A bundled example screenshot as a File, or null while it loads. */
export function useExampleFile(file: string): File | null {
  const [loaded, setLoaded] = useState<{ name: string; file: File } | null>(null);

  useEffect(() => {
    let live = true;
    fetchExample(file).then((f) => { if (live) setLoaded({ name: file, file: f }); }).catch(() => undefined);
    return () => { live = false; };
  }, [file]);

  return loaded?.name === file ? loaded.file : null;
}

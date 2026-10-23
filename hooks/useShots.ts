"use client";

import { useCallback, useEffect, useState } from "react";
import { loadShots, saveShots } from "@/lib/files";

/** Uploaded screenshots per device, backed by IndexedDB. `null` while loading. */
export function useShots(deviceIds: string[]) {
  const [shots, setShotsState] = useState<Record<string, File[]> | null>(null);
  const key = deviceIds.join(",");

  useEffect(() => {
    let live = true;
    const ids = key ? key.split(",") : [];
    Promise.all(ids.map(async (id) => [id, await loadShots(id)] as const)).then((entries) => {
      if (live) setShotsState(Object.fromEntries(entries));
    });
    return () => { live = false; };
  }, [key]);

  const setShots = useCallback((deviceId: string, files: File[]) => {
    setShotsState((prev) => ({ ...(prev ?? {}), [deviceId]: files }));
    saveShots(deviceId, files).catch(() => undefined);
  }, []);

  return { shots, setShots };
}

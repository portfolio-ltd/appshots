"use client";

import { useEffect, useState } from "react";

/** Thumbnail for a local File; owns (and revokes) its object URL. */
export function FileThumb({ file, className, alt = "" }: { file: File; className?: string; alt?: string }) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    const u = URL.createObjectURL(file);
    // Deferred so the effect doesn't set state synchronously.
    const t = setTimeout(() => setUrl(u), 0);
    return () => {
      clearTimeout(t);
      URL.revokeObjectURL(u);
    };
  }, [file]);

  if (!url) return <div className={`${className ?? ""} bg-muted animate-pulse`} />;
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={url} alt={alt} className={className} />;
}

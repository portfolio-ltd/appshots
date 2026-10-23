import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Fully static: everything runs in the browser, so `next build` emits a
  // plain `out/` folder you can host anywhere (Vercel, Netlify, GitHub Pages…).
  output: "export",
  // Set NEXT_PUBLIC_BASE_PATH=/repo-name when hosting under a sub-path (e.g. GitHub Pages).
  basePath: process.env.NEXT_PUBLIC_BASE_PATH || undefined,
};

export default nextConfig;

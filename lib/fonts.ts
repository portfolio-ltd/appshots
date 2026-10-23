import { Inter, JetBrains_Mono, Nunito, Playfair_Display, Plus_Jakarta_Sans } from "next/font/google";
import type { FontId } from "./constants";
import type { RenderFonts } from "./render/draw";

// All five are SIL Open Font License fonts, self-hosted by next/font at build
// time — exported screenshots look identical on every machine.

export const inter = Inter({ variable: "--font-inter", subsets: ["latin", "latin-ext"], display: "swap" });
export const jakarta = Plus_Jakarta_Sans({ variable: "--font-jakarta", subsets: ["latin", "latin-ext"], display: "swap" });
export const playfair = Playfair_Display({ variable: "--font-playfair", subsets: ["latin", "latin-ext"], display: "swap" });
export const nunito = Nunito({ variable: "--font-nunito", subsets: ["latin", "latin-ext"], display: "swap" });
export const jetbrainsMono = JetBrains_Mono({ variable: "--font-mono", subsets: ["latin", "latin-ext"], display: "swap" });

export const fontVariables = [inter, jakarta, playfair, nunito, jetbrainsMono].map((f) => f.variable).join(" ");

const RENDER_FONTS: Record<FontId, RenderFonts> = {
  display: { family: jakarta.style.fontFamily, headlineWeight: 800, subWeight: 500 },
  sans: { family: inter.style.fontFamily, headlineWeight: 700, subWeight: 500 },
  serif: { family: playfair.style.fontFamily, headlineWeight: 700, subWeight: 500 },
  rounded: { family: nunito.style.fontFamily, headlineWeight: 800, subWeight: 600 },
  mono: { family: jetbrainsMono.style.fontFamily, headlineWeight: 700, subWeight: 500 },
};

export function renderFonts(id: FontId): RenderFonts {
  return RENDER_FONTS[id] ?? RENDER_FONTS.display;
}

/** Canvas text silently falls back to a system font if the web font isn't loaded yet. */
export async function ensureFontsLoaded(id: FontId): Promise<void> {
  if (typeof document === "undefined" || !document.fonts) return;
  const f = renderFonts(id);
  await Promise.all([
    document.fonts.load(`${f.headlineWeight} 64px ${f.family}`),
    document.fonts.load(`${f.subWeight} 32px ${f.family}`),
  ]).catch(() => undefined);
}

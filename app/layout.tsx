import type { Metadata } from "next";
import { fontVariables } from "@/lib/fonts";
import { SITE_NAME, SITE_URL } from "@/lib/site";
import "./globals.css";

const title = "AppShots — Store-ready screenshots in your browser";
const description =
  "Free, open-source generator for App Store and Google Play screenshots. Device frames, headlines and exact store sizes, rendered entirely in your browser.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title,
  description,
  alternates: { canonical: "/" },
  // Share images come from app/opengraph-image.png and app/twitter-image.png.
  openGraph: { type: "website", siteName: SITE_NAME, url: "/", title, description },
  twitter: { card: "summary_large_image", title, description },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${fontVariables} h-full antialiased`}>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}

import type { Metadata, Viewport } from "next";
import { Cormorant_Garamond, Jost } from "next/font/google";
import { Toaster } from "sonner";
import { env } from "@/lib/env";
import "./globals.css";

// Self-hosted at build time by next/font: no layout shift, no third-party requests.
// Variable fonts: one file per family/style instead of one per weight.
// Only the display serif (used by the hero headline) is preloaded so fonts
// never compete with the LCP image; Jost swaps in with metric-matched fallbacks.
const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-cormorant",
});
// Italic is used sparingly (taglines, excerpts) — loaded on demand, not preloaded.
const cormorantItalic = Cormorant_Garamond({
  subsets: ["latin"],
  style: "italic",
  display: "swap",
  preload: false,
  variable: "--font-cormorant-italic",
});
const jost = Jost({
  subsets: ["latin"],
  display: "swap",
  preload: false,
  adjustFontFallback: true,
  variable: "--font-jost",
});

export const metadata: Metadata = {
  metadataBase: new URL(env.siteUrl),
  title: {
    default: "seicase — Premium Leather Bags & Accessories | Carry What You Love",
    template: "%s | seicase",
  },
  description:
    "Timeless leather. Thoughtful design. Handcrafted leather handbags, purses, wallets and accessories from Chennai. Free shipping above ₹2000 and easy 15-day returns.",
  applicationName: "seicase",
  keywords: ["leather bags", "leather handbags India", "leather tote", "leather wallet", "Chennai leather", "premium bags"],
  openGraph: {
    type: "website",
    siteName: "seicase",
    locale: "en_IN",
    images: [{ url: "/og-image.jpg", width: 1200, height: 630, alt: "seicase — Carry What You Love" }],
  },
  twitter: { card: "summary_large_image", images: ["/og-image.jpg"] },
  alternates: { canonical: "/" },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: "#F6EEE7",
  colorScheme: "light",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en-IN" className={`${cormorant.variable} ${cormorantItalic.variable} ${jost.variable}`}>
      <body className="min-h-dvh">
        {children}
        <Toaster
          position="bottom-center"
          toastOptions={{
            style: {
              background: "#1F1A17",
              color: "#F6EEE7",
              border: "none",
              borderRadius: "10px",
              fontFamily: "var(--font-jost)",
            },
          }}
        />
      </body>
    </html>
  );
}

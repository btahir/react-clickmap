import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

const SITE_URL = "https://react-clickmap.vercel.app";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "react-clickmap — Privacy-First Heatmaps for React",
    template: "%s | react-clickmap",
  },
  description:
    "Self-hosted, open-source heatmap analytics for React. Track clicks, rage clicks, scroll depth, and attention — zero cookies, no third-party scripts, fully GDPR-ready.",
  openGraph: {
    type: "website",
    locale: "en_US",
    url: SITE_URL,
    siteName: "react-clickmap",
    title: "react-clickmap — Privacy-First Heatmaps for React",
    description:
      "Self-hosted, open-source heatmap analytics for React. Track clicks, rage clicks, scroll depth, and attention — zero cookies, no third-party scripts, fully GDPR-ready.",
    images: [
      {
        url: "/og.png",
        width: 1200,
        height: 630,
        alt: "react-clickmap — Privacy-first heatmaps for React",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "react-clickmap — Privacy-First Heatmaps for React",
    description:
      "Self-hosted, open-source heatmap analytics for React. Track clicks, rage clicks, scroll depth, and attention — zero cookies, no third-party scripts, fully GDPR-ready.",
    images: ["/og.png"],
  },
  icons: {
    icon: "/favicon.ico",
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

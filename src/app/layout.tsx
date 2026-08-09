import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { cookies } from "next/headers";
import { ThemeProvider } from "@/components/theme-provider";
import { ThemeStyles } from "@/components/themes/theme-styles";
import { AppSplash } from "@/components/app-splash";
import { ThemeSync } from "@/components/theme-sync";
import "@blocknote/core/style.css";
import "@blocknote/mantine/style.css";
import "@defensestation/blocknote-math/styles.css";
import "./globals.css";
import "katex/dist/katex.min.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const THEME_SLUG = /^[a-z0-9-]+$/;

export const metadata: Metadata = {
  title: {
    default: "Baculet — Învață pentru BAC",
    template: "%s · Baculet",
  },
  description:
    "Toate resursele de care ai nevoie ca să treci Bacalaureatul din România: materii, lecții, teste grilă și subiecte oficiale.",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [{ url: "/favicon.svg", type: "image/svg+xml" }],
    apple: [
      {
        url: "/icons/apple-touch-icon.png",
        sizes: "180x180",
        type: "image/png",
      },
    ],
  },
  appleWebApp: {
    capable: true,
    title: "Baculet",
    statusBarStyle: "black-translucent",
  },
  other: {
    // iOS < 16.4 ignoră `mobile-web-app-capable` (generat de Next.js) și
    // cere varianta cu prefix `apple-` pentru modul standalone.
    "apple-mobile-web-app-capable": "yes",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  let themeSlug = "default";
  try {
    const value = (await cookies()).get("baculet-theme")?.value;
    if (value && THEME_SLUG.test(value)) themeSlug = value;
  } catch {
    themeSlug = "default";
  }

  return (
    <html
      lang="ro"
      suppressHydrationWarning
      data-theme={themeSlug}
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <ThemeStyles />
      </head>
      <body className="min-h-full">
        <AppSplash />
        <ThemeSync />
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}

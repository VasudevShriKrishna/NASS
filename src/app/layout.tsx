import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Playfair_Display } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { ThemeProvider } from "@/components/theme-provider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  display: "swap",
});

export const viewport: Viewport = {
  themeColor: "#090A0E",
  width: "device-width",
  initialScale: 1,
};

export const metadata: Metadata = {
  metadataBase: new URL("https://mycorps.vercel.app"),
  title: {
    default: "NASS · Board Executive Control Tower",
    template: "%s · NASS Board Executive Control Tower",
  },
  description:
    "NASS Board Executive Control Tower — Freight Traceability, Decision Management & Operations Assistant: Bahrain-first maritime freight visibility, evidence-before-assertion, verified outcomes only.",
  applicationName: "NASS Control Tower",
  keywords: [
    "NASS",
    "Bahrain",
    "freight traceability",
    "control tower",
    "closed-loop",
    "exceptions",
    "BOL intelligence",
    "maritime",
    "supply chain",
  ],
  authors: [{ name: "NASS Corporation" }],
  creator: "NASS Corporation",
  publisher: "NASS Corporation",
  alternates: {
    canonical: "https://mycorps.vercel.app",
  },
  openGraph: {
    title: "NASS · Board Executive Control Tower",
    description:
      "NASS Board Executive Control Tower — Freight Traceability, Decision Management & Operations Assistant: Bahrain-first maritime freight visibility, evidence-before-assertion, verified outcomes only.",
    url: "https://mycorps.vercel.app",
    siteName: "NASS Board Executive Control Tower",
    images: [
      {
        url: "https://mycorps.vercel.app/og-image.jpg",
        secureUrl: "https://mycorps.vercel.app/og-image.jpg",
        width: 1200,
        height: 630,
        alt: "NASS Board Executive Control Tower",
        type: "image/jpeg",
      },
      {
        url: "https://mycorps.vercel.app/thumbnail.jpg",
        secureUrl: "https://mycorps.vercel.app/thumbnail.jpg",
        width: 600,
        height: 600,
        alt: "NASS Board Executive Control Tower",
        type: "image/jpeg",
      },
      {
        url: "https://mycorps.vercel.app/og-image.png",
        secureUrl: "https://mycorps.vercel.app/og-image.png",
        width: 1200,
        height: 630,
        alt: "NASS Board Executive Control Tower",
        type: "image/png",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "NASS · Board Executive Control Tower",
    description:
      "NASS Board Executive Control Tower — Bahrain-first maritime freight visibility, BOL intelligence, verified outcomes only.",
    images: ["https://mycorps.vercel.app/og-image.jpg"],
    creator: "@nass_corporation",
  },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/icon.png", sizes: "512x512", type: "image/png" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon.svg", type: "image/svg+xml" },
    ],
    shortcut: "/favicon.ico",
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
      { url: "/apple-touch-icon.svg", type: "image/svg+xml" },
    ],
  },
  manifest: "/site.webmanifest",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="image_src" href="https://mycorps.vercel.app/og-image.jpg" />
        <meta property="og:image" content="https://mycorps.vercel.app/og-image.jpg" />
        <meta property="og:image:secure_url" content="https://mycorps.vercel.app/og-image.jpg" />
        <meta property="og:image:type" content="image/jpeg" />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta property="og:image" content="https://mycorps.vercel.app/thumbnail.jpg" />
        <meta property="og:image:secure_url" content="https://mycorps.vercel.app/thumbnail.jpg" />
        <meta property="og:image:type" content="image/jpeg" />
        <meta property="og:image:width" content="600" />
        <meta property="og:image:height" content="600" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${playfair.variable} font-sans antialiased bg-background text-foreground`}
      >
        <ThemeProvider>{children}</ThemeProvider>
        <Toaster />
      </body>
    </html>
  );
}

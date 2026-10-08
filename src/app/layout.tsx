import type { Metadata, Viewport } from "next";
import { Suspense } from "react";
import { Inter, Barlow_Condensed } from "next/font/google";
import "./globals.css";
import { BusyIndicator } from "@/components/BusyIndicator";
import { UpdateChecker } from "@/components/UpdateChecker";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const barlowCondensed = Barlow_Condensed({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-barlow-condensed",
});

export const metadata: Metadata = {
  title: "Trail AC2000 — Chronométrage",
  description: "Chronométrage de course par QR code",
  manifest: "/manifest.json",
};

export const viewport: Viewport = {
  themeColor: "#0B1410",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr" className={`${inter.variable} ${barlowCondensed.variable}`}>
      <body className="font-body min-h-screen bg-bg text-ink antialiased">
        {children}
        <Suspense fallback={null}>
          <BusyIndicator />
        </Suspense>
        <UpdateChecker />
      </body>
    </html>
  );
}

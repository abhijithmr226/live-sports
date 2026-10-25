import type { Metadata } from "next";
import { Suspense } from "react";
import "./globals.css";
import AppShell from "@/components/AppShell";

export const metadata: Metadata = {
  title: "OBS Studio Web | Live Sports Broadcast & Relay Engine",
  description: "Authentic, high-density OBS Studio web interface for live sports relays, YouTube Live broadcasts, and multi-format streaming.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full bg-[#111318] text-slate-100 antialiased">
      <body className="min-h-full flex bg-[#111318]">
        <Suspense fallback={<div className="min-h-screen w-full bg-[#111318]" />}>
          <AppShell>
            {children}
          </AppShell>
        </Suspense>
      </body>
    </html>
  );
}

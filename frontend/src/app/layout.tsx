import type { Metadata } from "next";
import { Suspense } from "react";
import "./globals.css";
import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";

export const metadata: Metadata = {
  title: "CloudCast Sports Studio | Live Broadcast & HLS Relay Platform",
  description: "Professional sports live-streaming management platform. Relay HLS/M3U8 feeds to YouTube Live and RTMP destinations with cloud worker persistence.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full bg-[#080D1A] text-slate-100 antialiased">
      <body className="min-h-full flex bg-[#080D1A]">
        <Suspense fallback={<div className="w-64 bg-[#0A101D] border-r border-[#19263D] shrink-0" />}>
          <Sidebar />
        </Suspense>
        <div className="flex-1 flex flex-col min-w-0 min-h-screen bg-[#080D1A]">
          <Header />
          <main className="flex-1 p-6 overflow-y-auto">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}

'use client';

import { Suspense } from 'react';
import { usePathname } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import MobileNav from '@/components/MobileNav';

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  // On the main OBS Studio Deck ('/'), provide edge-to-edge full window layout
  // with zero sidebar clutter, zero top headers, authentic OBS Studio interface.
  const isOBSDeck = pathname === '/';

  if (isOBSDeck) {
    return (
      <div className="min-h-screen w-full bg-[#111318] text-slate-100 flex flex-col overflow-x-hidden antialiased select-none font-sans">
        {children}
      </div>
    );
  }

  return (
    <div className="min-h-full flex bg-[#080D1A] text-slate-100 antialiased w-full">
      <Suspense fallback={<div className="hidden md:flex w-64 bg-[#0A101D] border-r border-[#19263D] shrink-0" />}>
        <Sidebar />
      </Suspense>
      <div className="flex-1 flex flex-col min-w-0 min-h-screen bg-[#080D1A]">
        <Header />
        <main className="flex-1 p-4 sm:p-6 pb-24 sm:pb-24 md:pb-6 overflow-y-auto">
          {children}
        </main>
      </div>
      <Suspense fallback={null}>
        <MobileNav />
      </Suspense>
    </div>
  );
}

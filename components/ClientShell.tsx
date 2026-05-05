"use client";

import FXController from "@/components/FXController";
import HUD from "@/components/HUD";
import QueryProvider from "@/components/QueryProvider";
import ScrollIndicator from "@/components/ScrollIndicator";
import Sidebar from "@/components/Sidebar";
import SmoothScroll from "@/components/SmoothScroll";
import Ticker from "@/components/Ticker";

type ClientShellProps = {
  children: React.ReactNode;
};

export default function ClientShell({ children }: ClientShellProps) {
  return (
    <QueryProvider>
      <SmoothScroll>
        <FXController />
        <Sidebar />
        <HUD />
        <ScrollIndicator />
        <Ticker />
        <main className="relative z-20 min-h-screen md:pl-[220px]">{children}</main>
      </SmoothScroll>
    </QueryProvider>
  );
}

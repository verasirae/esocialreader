"use client";

import React from "react";
import { Sidebar } from "@/components/Sidebar";
import { TopBar } from "@/components/TopBar";
import { useModals } from "@/lib/contexts/ModalContext";
import { cn } from "@/lib/utils";

interface AppLayoutProps {
  children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const { isSidebarCollapsed, isMobileMenuOpen, setIsMobileMenuOpen } = useModals();

  return (
    <div className="flex min-h-screen bg-background text-on-surface">
      {/* Sidebar Component */}
      <Sidebar />

      {/* Mobile Drawer Overlay Backdrop */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-45 lg:hidden transition-opacity duration-300"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Scaffold Layout */}
      <div
        className={cn(
          "flex flex-col flex-1 min-w-0 transition-all duration-300 ease-in-out",
          // Layout spacing adjustments based on sidebar collapse on desktop
          isSidebarCollapsed ? "lg:pl-20" : "lg:pl-64",
          // Sidebar is off-canvas or floating on mobile/tablet, so pl-0
          "pl-0"
        )}
      >
        <TopBar />
        <main className="p-4 md:p-6 lg:p-margin-page flex-1 overflow-x-hidden">
          {children}
        </main>
      </div>
    </div>
  );
}

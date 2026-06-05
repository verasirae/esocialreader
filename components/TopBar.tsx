"use client";

import React from "react";
import { Bell, Settings, HelpCircle, Menu } from "lucide-react";
import { useModals } from "@/lib/contexts/ModalContext";

export function TopBar() {
  const { isMobileMenuOpen, setIsMobileMenuOpen } = useModals();

  return (
    <header className="h-16 w-full sticky top-0 z-40 bg-white border-b border-outline-variant flex items-center justify-between px-4 md:px-6 lg:px-margin-page select-none">
      <div className="flex items-center gap-3">
        {/* Mobile Hamburger menu toggle button */}
        <button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="lg:hidden p-2 hover:bg-surface-container rounded-sm transition-colors text-secondary hover:text-on-surface"
          aria-label="Toggle Sidebar Menu"
        >
          <Menu size={20} />
        </button>

        {/* System branding text (collapsible on small mobile screens to prevent overflow) */}
        <span className="text-sm md:text-base lg:text-lg font-black text-primary tracking-tight truncate max-w-[150px] sm:max-w-xs md:max-w-none">
          Tax Compliance System
        </span>
        
        <div className="hidden sm:block h-6 w-[1px] bg-outline-variant"></div>
        <span className="hidden sm:inline text-xs md:text-sm font-bold text-secondary uppercase tracking-tight">
          S-5002Compliance Portal
        </span>
      </div>

      <div className="flex items-center gap-3 md:gap-6">
        {/* Support links hidden on smaller tablets/mobile */}
        <div className="hidden md:flex gap-6 text-xs font-bold text-secondary uppercase tracking-tight">
          <span className="hover:text-primary cursor-pointer transition-colors">Support</span>
          <span className="hover:text-primary cursor-pointer transition-colors">Status</span>
        </div>

        {/* Action icons */}
        <div className="flex items-center gap-1">
          <button className="p-2 hover:bg-surface-container rounded-full transition-colors text-on-surface-variant relative">
            <Bell size={18} />
            <span className="absolute top-2 right-2 w-2 h-2 bg-error rounded-full border-2 border-white"></span>
          </button>
          <button className="p-2 hover:bg-surface-container rounded-full transition-colors text-on-surface-variant">
            <Settings size={18} />
          </button>
          <button className="p-2 hover:bg-surface-container rounded-full transition-colors text-on-surface-variant">
            <HelpCircle size={18} />
          </button>
        </div>
      </div>
    </header>
  );
}

"use client";

import React from "react";
import { Bell, Settings, HelpCircle, Search } from "lucide-react";

export function TopBar() {
  return (
    <header className="h-16 w-full sticky top-0 z-40 bg-white border-b border-outline-variant flex items-center justify-between px-margin-page">
      <div className="flex items-center gap-4">
        <span className="text-xl font-bold text-primary tracking-tight">Tax Compliance System</span>
        <div className="h-6 w-[1px] bg-outline-variant"></div>
        <span className="text-sm font-medium text-secondary">Plano de Saúde (S-5002)</span>
      </div>

      <div className="flex items-center gap-8">
        <div className="hidden md:flex gap-6 text-xs font-semibold text-secondary uppercase tracking-tight">
          <span className="hover:text-primary cursor-pointer transition-colors">Support</span>
          <span className="hover:text-primary cursor-pointer transition-colors">System Status</span>
        </div>

        <div className="flex items-center gap-2">
          <button className="p-2 hover:bg-surface-container rounded-full transition-colors text-on-surface-variant relative">
            <Bell size={20} />
            <span className="absolute top-2 right-2 w-2 h-2 bg-error rounded-full border-2 border-white"></span>
          </button>
          <button className="p-2 hover:bg-surface-container rounded-full transition-colors text-on-surface-variant">
            <Settings size={20} />
          </button>
          <button className="p-2 hover:bg-surface-container rounded-full transition-colors text-on-surface-variant">
            <HelpCircle size={20} />
          </button>
        </div>
      </div>
    </header>
  );
}

"use client";

import React, { useState } from "react";
import { Bell, Settings, HelpCircle, Menu, ShieldAlert, ArrowLeftRight, Loader2 } from "lucide-react";
import { useModals } from "@/lib/contexts/ModalContext";
import { useAuth } from "@/lib/contexts/AuthContext";

export function TopBar() {
  const { isMobileMenuOpen, setIsMobileMenuOpen } = useModals();
  const { user, refreshUser } = useAuth();
  const [unimpersonating, setUnimpersonating] = useState(false);

  const handleUnimpersonate = async () => {
    setUnimpersonating(true);
    try {
      const res = await fetch("/api/governanca", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "unimpersonate" })
      });
      if (res.ok) {
        await refreshUser();
        window.location.href = "/governanca";
      } else {
        const errorData = await res.json();
        alert(errorData.error || "Erro ao desfazer impersonificação");
      }
    } catch (e) {
      console.error(e);
      alert("Erro ao conectar com o servidor.");
    } finally {
      setUnimpersonating(false);
    }
  };

  return (
    <header className="h-16 w-full sticky top-0 z-40 bg-white border-b border-outline-variant flex flex-col justify-center select-none">
      <div className="flex items-center justify-between px-4 md:px-6 lg:px-margin-page h-full">
        <div className="flex items-center gap-3">
          {/* Mobile Hamburger menu toggle button */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="lg:hidden p-2 hover:bg-surface-container rounded-sm transition-colors text-secondary hover:text-on-surface"
            aria-label="Toggle Sidebar Menu"
          >
            <Menu size={20} />
          </button>

          {/* System branding text */}
          <span className="text-sm md:text-base lg:text-lg font-black text-primary tracking-tight truncate max-w-[150px] sm:max-w-xs md:max-w-none">
            Tax Compliance System
          </span>
          
          <div className="hidden sm:block h-6 w-[1px] bg-outline-variant"></div>
          <span className="hidden sm:inline text-xs md:text-sm font-bold text-secondary uppercase tracking-tight">
            S-5002 Compliance Portal
          </span>

          {/* Impersonation Indicator Panel */}
          {user?.impersonator && (
            <div className="ml-4 flex items-center gap-2 px-3 py-1 bg-amber-50 rounded-sm border border-amber-200 text-amber-805 animate-pulse">
              <ShieldAlert size={14} className="text-amber-620 text-amber-600" />
              <div className="text-[11px] font-bold text-amber-850 text-amber-800">
                Impersonando: <span className="underline font-black">{user.nome}</span>
              </div>
              <button
                disabled={unimpersonating}
                onClick={handleUnimpersonate}
                className="ml-2 text-[10px] bg-amber-600 text-white font-black uppercase tracking-wider px-2 py-0.5 rounded-xs hover:bg-amber-700 active:scale-95 transition-all flex items-center gap-1"
                title="Voltar para sua conta original"
              >
                {unimpersonating ? (
                  <Loader2 size={10} className="animate-spin" />
                ) : (
                  <ArrowLeftRight size={10} />
                )}
                Retornar
              </button>
            </div>
          )}
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
      </div>
    </header>
  );
}

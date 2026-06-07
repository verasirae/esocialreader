"use client";

import React from "react";
import { Sidebar } from "@/components/Sidebar";
import { TopBar } from "@/components/TopBar";
import { useModals } from "@/lib/contexts/ModalContext";
import { cn, isPathBlocked } from "@/lib/utils";
import { useAuth } from "@/lib/contexts/AuthContext";
import { usePathname } from "next/navigation";
import { ShieldAlert, ArrowLeft, Lock, FileX } from "lucide-react";
import Link from "next/link";

interface AppLayoutProps {
  children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const { isSidebarCollapsed, isMobileMenuOpen, setIsMobileMenuOpen } = useModals();
  const { user } = useAuth();
  const pathname = usePathname();

  const blockCheck = isPathBlocked(pathname, user);

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
          {blockCheck.blocked ? (
            <div className="min-h-[70vh] flex items-center justify-center p-4">
              <div className="max-w-xl w-full bg-white border border-red-100 shadow-xl rounded-sm p-8 flex flex-col items-center text-center animate-fadeIn">
                <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center mb-6 ring-8 ring-red-50/50">
                  <ShieldAlert className="text-red-650" size={32} />
                </div>

                <h2 className="text-sm font-black text-[#1B365D] uppercase tracking-widest mb-2">
                  Acesso Restrito / Módulo Bloqueado
                </h2>
                
                <p className="text-xs text-on-surface font-semibold mb-6">
                  {blockCheck.moduleLabel.toUpperCase()}
                </p>

                <div className="bg-[#FAF9FC] border border-outline-variant/50 rounded-sm p-4 text-left w-full mb-8 text-xs text-secondary leading-relaxed font-medium">
                  Prezado(a) <strong className="text-primary font-bold">{user?.nome}</strong>, seu login de segurança possui políticas de governança ativas que restringem ou suspendem o acesso ao módulo <strong className="text-primary font-bold">{blockCheck.moduleLabel}</strong>.
                  <div className="mt-3 pt-3 border-t border-outline-variant/40 flex items-center gap-2 text-[10px] font-black uppercase text-secondary tracking-wider">
                    <Lock size={12} className="text-secondary/60" />
                    Tipo de Restrição: {blockCheck.type === "geral" ? "Bloqueio de Módulos Gerais" : "Bloqueio de Módulo Individual"}
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-3 w-full justify-center">
                  <Link
                    href="/"
                    className="flex items-center justify-center gap-2 border border-[#1B365D] text-[#1B365D] hover:bg-indigo-50 font-bold text-xs uppercase tracking-wider py-3 px-6 rounded-sm active:scale-95 transition-all flex-1"
                  >
                    <ArrowLeft size={14} />
                    Voltar ao Início
                  </Link>
                  <button
                    onClick={() => alert("Uma solicitação formal de liberação de módulo foi enviada para análise da equipe de segurança e governança de dados.")}
                    className="bg-[#1B365D] hover:bg-[#152a49] text-white font-bold text-xs uppercase tracking-wider py-3 px-6 rounded-sm active:scale-95 transition-all flex-1 shadow-md shadow-indigo-950/10"
                  >
                    Solicitar Liberação
                  </button>
                </div>
              </div>
            </div>
          ) : (
            children
          )}
        </main>
      </div>
    </div>
  );
}

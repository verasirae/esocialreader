"use client";

import React, { Suspense, useState } from "react";
import { Sidebar } from "@/components/Sidebar";
import { TopBar } from "@/components/TopBar";
import { useModals } from "@/lib/contexts/ModalContext";
import { cn, isPathBlocked } from "@/lib/utils";
import { useAuth } from "@/lib/contexts/AuthContext";
import { useEmpresa } from "@/lib/contexts/EmpresaContext";
import { usePathname } from "next/navigation";
import { ShieldAlert, ArrowLeft, Lock, FileX, Building, Search, Plus, LogOut, ArrowRight, Shield } from "lucide-react";
import Link from "next/link";

interface AppLayoutProps {
  children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const { isSidebarCollapsed, isMobileMenuOpen, setIsMobileMenuOpen, openRegisterEmpresaModal } = useModals();
  const { user, logout } = useAuth();
  const { activeEmpresa, empresas, setEmpresa, isLoading: isEmpresaLoading } = useEmpresa();
  const pathname = usePathname();
  const [searchQuery, setSearchQuery] = useState("");

  const blockCheck = isPathBlocked(pathname, user);

  // If company context is loading, show a professional loading indicator
  if (isEmpresaLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#f0f2f5]">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin text-primary rounded-full h-8 w-8 border-b-2 border-[#1B365D]" />
          <span className="text-[10px] font-black text-secondary uppercase tracking-[0.2em]">Carregando Organizações...</span>
        </div>
      </div>
    );
  }

  // If user is logged in, but no company is selected, show the mandatory selector screen
  if (user && !activeEmpresa) {
    const filtered = empresas.filter((emp) => {
      const q = searchQuery.toLowerCase();
      return (
        (emp.razaoSocial || "").toLowerCase().includes(q) ||
        (emp.nomeFantasia || "").toLowerCase().includes(q) ||
        (emp.cnpjRaiz || "").toLowerCase().includes(q) ||
        (emp.cnpjCompleto || "").toLowerCase().includes(q)
      );
    });

    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-[#f0f2f5] p-4">
        <div className="w-full max-w-2xl bg-white rounded-lg shadow-2xl overflow-hidden border border-outline-variant flex flex-col md:max-h-[85vh]">
          {/* Header */}
          <div className="bg-[#1B365D] text-white p-6 md:p-8 shrink-0 flex justify-between items-center">
            <div>
              <div className="flex items-center gap-2">
                <Shield size={20} className="stroke-[2.5]" />
                <h1 className="text-lg md:text-xl font-black uppercase tracking-tight">Compliance Portal</h1>
              </div>
              <p className="text-white/70 text-xs mt-1 font-semibold">
                Olá, {user.nome}. Por favor, selecione uma empresa para iniciar seu expediente de auditoria.
              </p>
            </div>
            <button
              onClick={logout}
              className="p-2 hover:bg-white/10 rounded-full text-white/80 hover:text-white transition-all active:scale-95"
              title="Fazer Logout"
            >
              <LogOut size={18} />
            </button>
          </div>

          {/* Search Input */}
          <div className="p-4 border-b border-outline-variant bg-neutral-50 shrink-0">
            <div className="relative">
              <Search size={16} className="absolute left-3 top-3 text-secondary" />
              <input
                type="text"
                placeholder="Filtrar por Razão Social, Nome Fantasia ou CNPJ..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-white text-xs font-semibold rounded border border-outline-variant outline-none focus:border-[#1B365D] shadow-inner"
              />
            </div>
          </div>

          {/* Companies list */}
          <div className="flex-1 overflow-y-auto p-6 space-y-3 min-h-[250px]">
            {filtered.length === 0 ? (
              <div className="text-center py-12 flex flex-col items-center gap-2">
                <Building size={32} className="text-secondary/40" />
                <p className="text-xs text-secondary font-semibold">Nenhuma empresa ou empregador cadastrado com esse termo.</p>
                {(user?.perfil === "superAdmin" || user?.perfil === "Admin" || user?.perfil?.toUpperCase() === "SUPER_ADMIN" || user?.perfil?.toUpperCase() === "ADMIN") && (
                  <button
                    onClick={openRegisterEmpresaModal}
                    className="mt-2 flex items-center gap-1 text-[10px] bg-[#1B365D] hover:bg-[#152a49] text-white font-black uppercase tracking-wider py-2 px-4 rounded transition-all shadow-md active:scale-95"
                  >
                    <Plus size={12} />
                    Cadastrar Primeira Empresa
                  </button>
                )}
              </div>
            ) : (
              filtered.map((emp) => (
                <button
                  key={emp.id}
                  onClick={() => setEmpresa(emp)}
                  className="w-full text-left p-4 rounded-md border border-outline-variant hover:border-[#1B365D] hover:bg-[#1B365D]/5 transition-all flex justify-between items-center cursor-pointer group active:scale-[0.99]"
                >
                  <div className="flex items-center gap-3.5 pr-2">
                    <div className="w-9 h-9 rounded bg-[#1B365D]/5 text-[#1B365D] flex items-center justify-center shrink-0 border border-[#1B365D]/10">
                      <Building size={16} />
                    </div>
                    <div>
                      <h4 className="text-xs font-black text-neutral-900 group-hover:text-[#1B365D] transition-colors line-clamp-1">
                        {emp.razaoSocial || "Razão Social Não Informada"}
                      </h4>
                      {emp.nomeFantasia && (
                        <p className="text-[10px] text-secondary font-semibold line-clamp-1 mt-0.5">{emp.nomeFantasia}</p>
                      )}
                      <div className="flex items-center gap-2 mt-1.5 text-[9px] text-secondary font-mono font-bold uppercase tracking-wider">
                        <span>CNPJ Raiz: {emp.cnpjRaiz}</span>
                        {emp.cnpjCompleto && (
                          <>
                            <span className="text-neutral-300">•</span>
                            <span>CNPJ Completo: {emp.cnpjCompleto}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="w-6 h-6 rounded-full bg-neutral-50 border border-outline-variant flex items-center justify-center text-secondary group-hover:bg-[#1B365D] group-hover:text-white group-hover:border-[#1B365D] transition-all">
                    <ArrowRight size={12} className="stroke-[2.5]" />
                  </div>
                </button>
              ))
            )}
          </div>

          {/* Footer */}
          <div className="p-4 bg-neutral-50 border-t border-outline-variant flex justify-between items-center shrink-0 text-[10px] font-mono font-bold text-secondary uppercase">
            <span>Sessão: {user.nome} ({user.perfil})</span>
            {(user?.perfil === "superAdmin" || user?.perfil === "Admin" || user?.perfil?.toUpperCase() === "SUPER_ADMIN" || user?.perfil?.toUpperCase() === "ADMIN") && empresas.length > 0 && (
              <button
                onClick={openRegisterEmpresaModal}
                className="flex items-center gap-1 text-[10px] bg-[#1B365D] hover:bg-[#152a49] text-white font-black uppercase tracking-wider py-1.5 px-3 rounded transition-all active:scale-95"
              >
                <Plus size={12} />
                Nova Empresa
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-background text-on-surface">
      {/* Sidebar Component */}
      <Suspense fallback={<div className="w-64 bg-white border-r border-outline-variant"></div>}>
        <Sidebar />
      </Suspense>

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

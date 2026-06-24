"use client";

import React, { useState, useEffect } from "react";
import { Bell, Settings, Menu, ShieldAlert, ArrowLeftRight, Loader2, UserCog, Building, Search, X, Plus } from "lucide-react";
import { useModals } from "@/lib/contexts/ModalContext";
import { useAuth } from "@/lib/contexts/AuthContext";
import { useEmpresa } from "@/lib/contexts/EmpresaContext";
import Link from "next/link";

export function TopBar() {
  const { isMobileMenuOpen, setIsMobileMenuOpen, openRegisterEmpresaModal } = useModals();
  const { user, refreshUser } = useAuth();
  const { activeEmpresa, empresas, setEmpresa } = useEmpresa();
  const [unimpersonating, setUnimpersonating] = useState(false);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [notifLoading, setNotifLoading] = useState(false);
  const [isCompanyModalOpen, setIsCompanyModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [stats, setStats] = useState({
    unlinkedCpfsCount: 0,
    unlinkedCnpjsCount: 0,
    pendingErrorsCount: 0
  });

  const filteredCompanies = empresas.filter((emp) => {
    const q = searchQuery.toLowerCase();
    return (
      (emp.razaoSocial || "").toLowerCase().includes(q) ||
      (emp.nomeFantasia || "").toLowerCase().includes(q) ||
      (emp.cnpjRaiz || "").toLowerCase().includes(q) ||
      (emp.cnpjCompleto || "").toLowerCase().includes(q)
    );
  });

  const fetchPendencies = async () => {
    try {
      const res = await fetch("/api/fiscal/pendencies");
      if (res.ok) {
        const data = await res.json();
        setStats({
          unlinkedCpfsCount: data.stats?.unlinkedCpfs || 0,
          unlinkedCnpjsCount: data.stats?.unlinkedCnpjs || 0,
          pendingErrorsCount: data.errors?.length || 0
        });
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchPendencies();
    const intId = setInterval(fetchPendencies, 30000);
    return () => clearInterval(intId);
  }, []);

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
          <span className="text-sm md:text-base lg:text-lg font-black text-primary tracking-tight truncate max-w-[120px] sm:max-w-xs md:max-w-none">
            Tax Compliance System
          </span>
          
          <div className="hidden sm:block h-6 w-[1px] bg-outline-variant"></div>
          
          {/* Active Company Selector Button */}
          {activeEmpresa ? (
            <button
              onClick={() => setIsCompanyModalOpen(true)}
              className="flex items-center gap-2 px-3 py-1.5 bg-[#1B365D]/5 hover:bg-[#1B365D]/10 border border-[#1B365D]/15 rounded-md text-xs font-black text-[#1B365D] uppercase tracking-wide cursor-pointer transition-all active:scale-95"
              title="Clique para alternar de empresa/empregador"
            >
              <Building size={14} className="text-[#1B365D]" />
              <span className="truncate max-w-[140px] sm:max-w-[200px]">
                {activeEmpresa.razaoSocial || activeEmpresa.nomeFantasia || "Sem Nome"}
              </span>
              <span className="text-[9px] text-secondary font-mono font-bold hidden md:inline border-l border-[#1B365D]/20 pl-2">
                CNPJ Raiz: {activeEmpresa.cnpjRaiz}
              </span>
            </button>
          ) : (
            <button
              onClick={() => setIsCompanyModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-md text-xs font-black text-rose-700 uppercase tracking-wide cursor-pointer transition-all active:scale-95 animate-pulse"
            >
              <Building size={14} />
              Selecionar Empresa
            </button>
          )}

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
            {/* Notifications Menu */}
            <div className="relative">
              <button 
                onClick={() => setIsNotifOpen(!isNotifOpen)}
                className="p-2 hover:bg-surface-container rounded-full transition-colors text-on-surface-variant relative select-none"
                title="Notificações e Avisos"
              >
                <Bell size={18} />
                {(stats.unlinkedCpfsCount > 0 || stats.unlinkedCnpjsCount > 0 || stats.pendingErrorsCount > 0) && (
                  <span className="absolute top-2 right-2 w-2 h-2 bg-error rounded-full border-2 border-white"></span>
                )}
              </button>

              {isNotifOpen && (
                <div className="absolute right-0 top-12 w-80 bg-white border border-outline-variant shadow-xl rounded-sm p-4 z-50 text-left animate-fadeIn">
                  <div className="flex justify-between items-center border-b border-outline-variant pb-2 mb-3">
                    <span className="text-[10px] font-black text-secondary tracking-widest uppercase flex items-center gap-1.5">
                      <Bell size={12} className="text-[#1B365D]" />
                      Central de Notificações
                    </span>
                    {(stats.unlinkedCpfsCount > 0 || stats.unlinkedCnpjsCount > 0 || stats.pendingErrorsCount > 0) ? (
                      <span className="text-[7.5px] bg-red-50 text-red-650 border border-red-250/30 px-1.5 py-0.5 rounded-xs font-black uppercase">
                        Atenção
                      </span>
                    ) : (
                      <span className="text-[7.5px] bg-emerald-50 text-emerald-700 border border-emerald-200/50 px-1.5 py-0.5 rounded-xs font-black uppercase">
                        Regular
                      </span>
                    )}
                  </div>

                  {notifLoading ? (
                    <div className="py-6 flex justify-center items-center">
                      <Loader2 size={16} className="animate-spin text-secondary" />
                    </div>
                  ) : (stats.unlinkedCpfsCount === 0 && stats.unlinkedCnpjsCount === 0 && stats.pendingErrorsCount === 0) ? (
                    <div className="py-6 text-center text-xs text-secondary font-medium">
                      Não há nenhuma pendência ou alerta cadastral ativa no momento.
                    </div>
                  ) : (
                    <div className="flex flex-col gap-3 max-h-[300px] overflow-y-auto pr-1 no-scrollbar text-on-surface">
                      {/* Alerta de CPFs Pendentes */}
                      {stats.unlinkedCpfsCount > 0 && (
                        <div className="flex flex-col gap-1 border-l-2 border-red-600 bg-red-50/30 p-2 text-[11px] leading-relaxed">
                          <span className="text-[9px] font-black uppercase tracking-wider text-red-700 flex items-center gap-1">
                            <ShieldAlert size={10} />
                            Trabalhadores Não Identificados
                          </span>
                          <p className="text-[10.5px] text-secondary font-semibold leading-normal">
                            Existem {stats.unlinkedCpfsCount} CPFs S-5002 sem cadastro correspondente no sistema de Trabalhadores.
                          </p>
                        </div>
                      )}

                      {/* Alerta de CNPJs Pendentes */}
                      {stats.unlinkedCnpjsCount > 0 && (
                        <div className="flex flex-col gap-1 border-l-2 border-red-600 bg-red-50/30 p-2 text-[11px] leading-relaxed">
                          <span className="text-[9px] font-black uppercase tracking-wider text-red-700 flex items-center gap-1">
                            <ShieldAlert size={10} />
                            Empregadores Não Identificados
                          </span>
                          <p className="text-[10.5px] text-secondary font-semibold leading-normal">
                            Existem {stats.unlinkedCnpjsCount} CNPJs S-5002 não vinculados a empresas cadastradas no sistema.
                          </p>
                        </div>
                      )}

                      {/* Alerta de Erros */}
                      {stats.pendingErrorsCount > 0 && (
                        <div className="flex flex-col gap-1 border-l-2 border-amber-600 bg-amber-50/30 p-2 text-[11px] leading-relaxed">
                          <span className="text-[9px] font-black uppercase tracking-wider text-amber-700 flex items-center gap-1">
                            <ShieldAlert size={10} />
                            Erros de Processamento
                          </span>
                          <p className="text-[10.5px] text-secondary font-semibold leading-normal">
                            Existem {stats.pendingErrorsCount} erros de regência fiscal ou processamento pendentes de auditoria.
                          </p>
                        </div>
                      )}

                      <Link
                        href="/pendencias"
                        onClick={() => setIsNotifOpen(false)}
                        className="w-full mt-2 py-2 bg-[#1B365D] hover:bg-[#152a49] text-white font-bold text-[10px] uppercase text-center rounded-sm transition-all shadow-xs"
                      >
                        Resolver Pendências
                      </Link>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Configurações */}
            <Link 
              href="/settings"
              className="p-2 hover:bg-surface-container rounded-full transition-colors text-on-surface-variant flex items-center justify-center font-bold text-xs"
              title="Configurações"
            >
              <Settings size={18} />
            </Link>

            {/* Perfil do Usuário */}
            <Link 
              href="/profile"
              className="p-2 hover:bg-surface-container rounded-full transition-colors text-on-surface-variant flex items-center justify-center font-bold text-xs"
              title="Perfil do Usuário"
            >
              <UserCog size={18} />
            </Link>
          </div>
        </div>
      </div>

      {/* Modal de Seleção de Empresa */}
      {isCompanyModalOpen && (
        <div className="fixed inset-0 bg-black/55 z-50 flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-lg border border-outline-variant shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[85vh]">
            {/* Header */}
            <div className="flex justify-between items-center bg-[#1B365D] text-white p-5">
              <div className="flex items-center gap-2">
                <Building size={18} />
                <h3 className="text-sm font-black uppercase tracking-wider">Selecionar Empresa Ativa</h3>
              </div>
              <button 
                onClick={() => setIsCompanyModalOpen(false)}
                className="text-white/80 hover:text-white transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Search Input */}
            <div className="p-4 border-b border-outline-variant bg-neutral-50">
              <div className="relative">
                <Search size={16} className="absolute left-3 top-2.5 text-secondary" />
                <input
                  type="text"
                  placeholder="Buscar por Razão Social, Nome Fantasia ou CNPJ..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-white text-xs font-semibold rounded border border-outline-variant outline-none focus:border-[#1B365D]"
                />
              </div>
            </div>

            {/* Company List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2 max-h-[400px]">
              {filteredCompanies.length === 0 ? (
                <div className="text-center py-8 text-xs text-secondary font-medium">
                  Nenhuma empresa encontrada com a busca.
                </div>
              ) : (
                filteredCompanies.map((emp) => {
                  const isCurrent = activeEmpresa?.id === emp.id;
                  return (
                    <button
                      key={emp.id}
                      onClick={() => {
                        setEmpresa(emp);
                        setIsCompanyModalOpen(false);
                      }}
                      className={`w-full text-left p-3 rounded border transition-all flex justify-between items-center cursor-pointer ${
                        isCurrent 
                          ? "bg-[#1B365D]/5 border-[#1B365D] ring-1 ring-[#1B365D]" 
                          : "border-outline-variant hover:bg-neutral-50"
                      }`}
                    >
                      <div className="flex flex-col gap-0.5">
                        <span className="text-xs font-bold text-neutral-900 line-clamp-1">
                          {emp.razaoSocial || "Razão Social Não Informada"}
                        </span>
                        {emp.nomeFantasia && (
                          <span className="text-[10px] text-secondary font-medium line-clamp-1">
                            {emp.nomeFantasia}
                          </span>
                        )}
                        <span className="text-[9px] font-mono font-semibold text-secondary mt-1">
                          CNPJ Raiz: {emp.cnpjRaiz} {emp.cnpjCompleto ? `• Completo: ${emp.cnpjCompleto}` : ""}
                        </span>
                      </div>
                      {isCurrent && (
                        <span className="text-[9px] font-black uppercase text-[#1B365D] bg-[#1B365D]/10 px-2 py-0.5 rounded-sm">
                          Ativa
                        </span>
                      )}
                    </button>
                  );
                })
              )}
            </div>

            {/* Footer / Register Option */}
            {(user?.perfil === "superAdmin" || user?.perfil === "Admin" || user?.perfil?.toUpperCase() === "SUPER_ADMIN" || user?.perfil?.toUpperCase() === "ADMIN") && (
              <div className="p-4 bg-neutral-50 border-t border-outline-variant flex justify-end">
                <button
                  onClick={() => {
                    setIsCompanyModalOpen(false);
                    openRegisterEmpresaModal();
                  }}
                  className="flex items-center gap-1.5 text-[10px] font-bold bg-[#1B365D] text-white hover:bg-[#152a49] py-2 px-4 rounded transition-all active:scale-95 shadow-md shadow-indigo-950/10"
                >
                  <Plus size={12} />
                  Cadastrar Nova Empresa
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
}

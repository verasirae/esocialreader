"use client";

import React from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { 
  Grid2X2, 
  Building2, 
  Users, 
  Stethoscope, 
  FileText, 
  ShieldCheck, 
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Plus, 
  UserPlus, 
  ShieldPlus,
  X,
  LogOut,
  Database,
  Scale,
  Lock,
  Calendar,
  Download
} from "lucide-react";
import { cn, isPathBlocked } from "@/lib/utils";
import { useModals } from "@/lib/contexts/ModalContext";
import { useAuth } from "@/lib/contexts/AuthContext";

const menuItems = [
  { icon: Grid2X2, label: "Dashboard", href: "/" },
  { icon: Building2, label: "Empregadores", href: "/empregadores" },
  { icon: Users, label: "Trabalhadores", href: "/trabalhadores" },
  { icon: Stethoscope, label: "Operadoras de Saúde", href: "/operadoras" },
  { icon: ShieldCheck, label: "Consolidação Fiscal", href: "/consolidacao" },
  { icon: FileText, label: "EFD-REINF", href: "/reinf" },
  { icon: AlertTriangle, label: "Pendências", href: "/pendencias" },
  { icon: ShieldCheck, label: "Auditoria S-5002", href: "/esocial" },
  { icon: Download, label: "Automação S-5002", href: "/esocial-automacao" },
  { icon: FileText, label: "DIRF Digital", href: "/consolidacao?dirf=true" },
  { icon: Scale, label: "Códigos de Receita", href: "/codigos-receita" },
  { icon: Calendar, label: "Períodos Fiscais", href: "/periodos" },
];

export function Sidebar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { user, logout } = useAuth();
  const { 
    openRegisterEmpresaModal, 
    openRegisterTrabalhadorModal, 
    openRegisterOperadoraModal,
    isSidebarCollapsed,
    setIsSidebarCollapsed,
    isMobileMenuOpen,
    setIsMobileMenuOpen
  } = useModals();

  return (
    <aside 
      className={cn(
        "h-screen fixed left-0 top-0 bg-white border-r border-outline-variant flex flex-col z-50 transition-all duration-300 ease-in-out",
        // Width on Desktop
        isSidebarCollapsed ? "lg:w-20" : "lg:w-64",
        // Width & behavior on Mobile (slide-in menu with screen overlay)
        isMobileMenuOpen ? "translate-x-0 w-64" : "-translate-x-full lg:translate-x-0",
        "w-64" // default
      )}
    >
      {/* Sidebar Header */}
      <div className={cn(
        "py-6 border-b border-outline-variant flex items-center justify-between",
        isSidebarCollapsed ? "px-4 justify-center lg:px-2" : "px-6"
      )}>
        {/* Brand Logo & Initials */}
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="p-1.5 bg-primary/5 rounded text-primary shrink-0">
            <ShieldCheck size={28} className="text-secondary stroke-[2]" />
          </div>
          
          {(!isSidebarCollapsed || isMobileMenuOpen) && (
            <div className="transition-opacity duration-300 whitespace-nowrap">
              <h1 className="text-sm font-black text-primary tracking-tight leading-none">Compliance Portal</h1>
              <p className="text-[9px] font-black text-secondary uppercase tracking-[0.05em] mt-0.5 opacity-80">Tax & Audit</p>
            </div>
          )}
        </div>

        {/* Mobile close button / Desktop collapse toggle button */}
        <div className="flex items-center gap-1">
          {/* Mobile close button */}
          <button 
            onClick={() => setIsMobileMenuOpen(false)}
            className="lg:hidden p-1.5 hover:bg-surface-container rounded-sm text-secondary transition-colors"
          >
            <X size={18} />
          </button>

          {/* Desktop Collapse Toggle */}
          <button
            onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            className="hidden lg:flex p-1.5 hover:bg-surface-container rounded-sm text-secondary transition-colors"
            title={isSidebarCollapsed ? "Expandir Menu" : "Recolher Menu"}
          >
            {isSidebarCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
          </button>
        </div>
      </div>

      {/* Navigation list */}
      <nav className="flex-1 overflow-y-auto py-4 space-y-1">
        {(() => {
          const displayMenuItems = [...menuItems];
          const isSuperOrAdmin = user?.perfil === "SUPER_ADMIN" || user?.perfil === "superAdmin" || user?.perfil === "ADMIN" || user?.perfil === "Admin";
          
          if (isSuperOrAdmin) {
            displayMenuItems.push({
              icon: ShieldPlus, // Shield with a plus as governance
              label: "Governança & Acessos",
              href: "/governanca"
            });
          }

          if (user?.perfil === "SUPER_ADMIN" || user?.perfil === "superAdmin") {
            displayMenuItems.push({
              icon: Database,
              label: "Consultas Especiais",
              href: "/consultas"
            });
          }
          return displayMenuItems.map((item) => {
            const isDirfItem = item.href.includes("?dirf=true");
            const cleanHref = item.href.split("?")[0];
            const isActive = isDirfItem 
              ? (pathname === cleanHref && searchParams.get("dirf") === "true")
              : (item.label === "Consolidação Fiscal" 
                  ? (pathname === cleanHref && searchParams.get("dirf") !== "true")
                  : (pathname === cleanHref));
            const blockedInfo = isPathBlocked(item.href, user);
            const isBlocked = blockedInfo.blocked;

            if (isBlocked) {
              return null;
            }

            return (
              <Link
                key={`${item.label}-${item.href}`}
                href={item.href}
                onClick={() => setIsMobileMenuOpen(false)}
                className={cn(
                  "sidebar-item flex items-center transition-all duration-200 justify-between",
                  isSidebarCollapsed ? "lg:px-0 lg:justify-center lg:gap-0" : "px-6 gap-3",
                  isActive && "sidebar-item-active",
                  isBlocked && "opacity-60 hover:bg-red-50/10"
                )}
                title={isSidebarCollapsed ? `${item.label} ${isBlocked ? '(Bloqueado)' : ''}` : undefined}
              >
                <div className="flex items-center gap-3 overflow-hidden">
                  {isBlocked ? (
                    <Lock size={18} className="shrink-0 text-red-650" />
                  ) : (
                    <item.icon size={20} className="shrink-0" strokeWidth={isActive ? 2.5 : 2} />
                  )}
                  
                  {(!isSidebarCollapsed || isMobileMenuOpen) && (
                    <span className={cn(
                      isActive && "font-bold", 
                      "text-sm truncate transition-opacity duration-300",
                      isBlocked && "text-secondary font-medium line-through"
                    )}>
                      {item.label}
                    </span>
                  )}
                </div>

                {isBlocked && (!isSidebarCollapsed || isMobileMenuOpen) && (
                  <span className="text-[8px] bg-red-50 text-red-650 border border-red-200/40 rounded-full px-1.5 py-0.5 font-bold uppercase shrink-0">
                    Bloq
                  </span>
                )}
              </Link>
            );
          });
        })()}

        {/* Quick Actions (Operações Rápidas) */}
        <div className={cn(
          "mt-6 space-y-3",
          isSidebarCollapsed ? "lg:px-2" : "px-6"
        )}>
          {(!isSidebarCollapsed || isMobileMenuOpen) && (
            <p className="text-[10px] font-black text-secondary uppercase tracking-[0.2em] mb-4">
              Operações Rápidas
            </p>
          )}

          {/* Nova Empresa */}
          <button 
            onClick={() => {
              openRegisterEmpresaModal();
              setIsMobileMenuOpen(false);
            }}
            className={cn(
              "flex items-center bg-primary text-white font-bold shadow-md shadow-primary/20 hover:opacity-90 transition-all active:scale-[0.98]",
              isSidebarCollapsed ? "lg:w-12 lg:h-12 lg:justify-center lg:p-0 rounded-full mx-auto" : "w-full gap-3 px-4 py-3 rounded-sm text-xs"
            )}
            title="Novo Empregador"
          >
            <Plus size={18} className="shrink-0" />
            {(!isSidebarCollapsed || isMobileMenuOpen) && <span>Novo Empregador</span>}
          </button>

          {/* Novo Trabalhador */}
          <button 
            onClick={() => {
              openRegisterTrabalhadorModal();
              setIsMobileMenuOpen(false);
            }}
            className={cn(
              "flex items-center border border-primary text-primary font-bold hover:bg-primary/5 transition-all active:scale-[0.98]",
              isSidebarCollapsed ? "lg:w-12 lg:h-12 lg:justify-center lg:p-0 rounded-full mx-auto" : "w-full gap-3 px-4 py-3 rounded-sm text-xs"
            )}
            title="Novo Trabalhador"
          >
            <UserPlus size={18} className="shrink-0" />
            {(!isSidebarCollapsed || isMobileMenuOpen) && <span>Novo Trabalhador</span>}
          </button>

          {/* Novo Plano de Saúde */}
          <button 
            onClick={() => {
              openRegisterOperadoraModal();
              setIsMobileMenuOpen(false);
            }}
            className={cn(
              "flex items-center border border-secondary/30 text-secondary font-bold hover:bg-surface transition-all active:scale-[0.98]",
              isSidebarCollapsed ? "lg:w-12 lg:h-12 lg:justify-center lg:p-0 rounded-full mx-auto" : "w-full gap-3 px-4 py-3 rounded-sm text-xs"
            )}
            title="Plano de Saúde"
          >
            <ShieldPlus size={18} className="shrink-0" />
            {(!isSidebarCollapsed || isMobileMenuOpen) && <span>Plano de Saúde</span>}
          </button>
        </div>
      </nav>

      {/* Sidebar Footer */}
      <div className={cn(
        "mt-auto border-t border-outline-variant bg-white",
        isSidebarCollapsed ? "lg:py-4" : "py-4"
      )}>
        {/* User profile info */}
        <div className={cn(
          "border-t border-outline-variant",
          isSidebarCollapsed ? "lg:pt-4 lg:px-2" : "pt-4 px-4"
        )}>
          <div className="flex flex-col gap-3">
            <div className={cn(
              "flex items-center gap-3",
              isSidebarCollapsed && "lg:justify-center"
            )}>
              <div className="w-9 h-9 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 flex items-center justify-center font-bold text-xs shadow-sm shrink-0">
                {user?.nome ? user.nome.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase() : "US"}
              </div>
              {(!isSidebarCollapsed || isMobileMenuOpen) && (
                <div className="truncate flex-1 min-w-0">
                  <p className="text-[11px] font-bold text-on-surface leading-tight truncate">{user?.nome || "Usuário"}</p>
                  <p className="text-[10px] text-secondary font-semibold leading-none mt-1 uppercase tracking-wider">{user?.perfil || "user"}</p>
                </div>
              )}
            </div>

            {/* Logout button */}
            {(!isSidebarCollapsed || isMobileMenuOpen) ? (
              <button
                onClick={logout}
                className="w-full flex items-center gap-2 px-3 py-2 text-xs font-bold text-red-650 hover:text-red-750 hover:bg-red-50/50 border border-red-100 rounded-sm transition-all text-red-600 font-medium"
              >
                <LogOut size={14} />
                EFETUAR LOGOUT
              </button>
            ) : (
              <button
                onClick={logout}
                className="w-9 h-9 mx-auto flex items-center justify-center text-red-600 hover:bg-red-50 rounded-full transition-all border border-transparent hover:border-red-100"
                title="Sair do Sistema"
              >
                <LogOut size={16} />
              </button>
            )}
          </div>
        </div>
      </div>
    </aside>
  );
}

"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  Grid2X2, 
  Building2, 
  Users, 
  Stethoscope, 
  FileText, 
  History, 
  ShieldCheck, 
  UserCog, 
  Settings, 
  HelpCircle
 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useModals } from "@/lib/contexts/ModalContext";
import { Plus, UserPlus, ShieldPlus } from "lucide-react";

const menuItems = [
  { icon: Grid2X2, label: "Dashboard", href: "/" },
  { icon: FileText, label: "Auditoria e Tabelas", href: "/esocial" },
  { icon: Stethoscope, label: "Operadoras de Saúde", href: "/health-operators" },
  { icon: FileText, label: "Informe de Rendimentos", href: "/reports" },
  { icon: History, label: "Histórico de XML", href: "/history" },
  { icon: ShieldCheck, label: "Auditoria Fiscal", href: "/audit" },
];

const footerItems = [
  { icon: UserCog, label: "Perfil do Usuário", href: "/profile" },
  { icon: Settings, label: "Configurações", href: "/settings" },
  { icon: HelpCircle, label: "Centro de Ajuda", href: "/help" },
];

export function Sidebar() {
  const pathname = usePathname();
  const { openRegisterEmpresaModal, openRegisterTrabalhadorModal, openRegisterOperadoraModal } = useModals();

  return (
    <aside className="w-64 h-screen fixed left-0 top-0 bg-white border-r border-outline-variant flex flex-col z-50">
      <div className="px-6 py-8">
        <h1 className="text-xl font-bold text-primary tracking-tight leading-tight">Compliance Portal</h1>
        <p className="text-[11px] font-bold text-secondary uppercase tracking-[0.05em] mt-1 opacity-80">Tax & Audit Division</p>
      </div>

      <nav className="flex-1 overflow-y-auto py-2">
        {menuItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "sidebar-item",
                isActive && "sidebar-item-active"
              )}
            >
              <item.icon size={20} strokeWidth={isActive ? 2.5 : 2} />
              <span className={cn(isActive && "font-bold")}>{item.label}</span>
            </Link>
          );
        })}

        <div className="mt-8 px-6 space-y-3">
          <p className="text-[10px] font-black text-secondary uppercase tracking-[0.2em] mb-4">Operações Rápidas</p>
          
          <button 
            onClick={() => openRegisterEmpresaModal()}
            className="w-full flex items-center gap-3 px-4 py-3 bg-primary text-white rounded-sm text-xs font-bold shadow-md shadow-primary/20 hover:opacity-90 transition-all active:scale-[0.98]"
          >
            <Plus size={16} />
            <span>Novo Empregador</span>
          </button>
 
          <button 
            onClick={() => openRegisterTrabalhadorModal()}
            className="w-full flex items-center gap-3 px-4 py-3 border border-primary text-primary rounded-sm text-xs font-bold hover:bg-primary/5 transition-all active:scale-[0.98]"
          >
            <UserPlus size={16} />
            <span>Novo Trabalhador</span>
          </button>
 
          <button 
            onClick={() => openRegisterOperadoraModal()}
            className="w-full flex items-center gap-3 px-4 py-3 border border-secondary/30 text-secondary rounded-sm text-xs font-bold hover:bg-surface transition-all active:scale-[0.98]"
          >
            <ShieldPlus size={16} />
            <span>Plano de Saúde</span>
          </button>
        </div>
      </nav>

      <div className="mt-auto px-2 pb-6 border-t border-outline-variant pt-4 bg-white">
        <div className="flex flex-col gap-1 mb-6">
          {footerItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="sidebar-item"
            >
              <item.icon size={20} />
              <span>{item.label}</span>
            </Link>
          ))}
        </div>

        <div className="px-4 pt-6 border-t border-outline-variant">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-primary-container flex items-center justify-center text-on-primary font-bold text-xs shadow-sm shadow-primary/20">
              JD
            </div>
            <div>
              <p className="text-[11px] font-bold text-on-surface leading-tight">Analista Fiscal</p>
              <p className="text-[10px] text-secondary font-medium">ID: 4829-X</p>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}

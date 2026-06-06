"use client";

import React, { useState, useEffect } from "react";
import { Plus, ChevronDown, Edit3, Check } from "lucide-react";
import { useModals } from "@/lib/contexts/ModalContext";
import LoadingSpinner from "./LoadingSpinner";

export function RegisterEmpresaModal() {
  const { isRegisterEmpresaModalOpen, closeRegisterEmpresaModal, editingEmpresa } = useModals();
  const [isLoading, setIsLoading] = useState(false);
  const [empresaForm, setEmpresaForm] = useState({ 
    cnpjCompleto: "",
    razaoSocial: "",
    nomeFantasia: ""
  });

  useEffect(() => {
    if (editingEmpresa) {
      setEmpresaForm({
        cnpjCompleto: editingEmpresa.cnpjCompleto || editingEmpresa.cnpjRaiz || "",
        razaoSocial: editingEmpresa.razaoSocial || "",
        nomeFantasia: editingEmpresa.nomeFantasia || ""
      });
    } else {
      setEmpresaForm({ cnpjCompleto: "", razaoSocial: "", nomeFantasia: "" });
    }
  }, [editingEmpresa, isRegisterEmpresaModalOpen]);

  if (!isRegisterEmpresaModalOpen) return null;

  const handleEmpresaSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const res = await fetch("/api/esocial/empresas/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(empresaForm),
      });
      
      const contentType = res.headers.get("content-type");
      let data;
      if (contentType && contentType.includes("application/json")) {
        data = await res.json();
      } else {
        const text = await res.text();
        throw new Error("Resposta inesperada do servidor: " + (text.substring(0, 100) || "Sem conteúdo"));
      }

      if (res.ok) {
        alert(editingEmpresa ? "Empregador atualizado com sucesso!" : "Empregador cadastrado com sucesso!");
        closeRegisterEmpresaModal();
        setEmpresaForm({ cnpjCompleto: "", razaoSocial: "", nomeFantasia: "" });
        // Trigger a custom event to notify listeners that a new empresa was added/updated
        window.dispatchEvent(new CustomEvent("empresa-added"));
      } else {
        throw new Error(data.error || "Erro ao salvar");
      }
    } catch (err: any) {
      alert("Erro: " + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white w-full max-w-[500px] flex flex-col rounded-sm shadow-2xl border border-outline-variant overflow-hidden min-h-[400px]">
        <div className="p-6 border-b border-outline-variant flex justify-between items-center bg-surface-container/10">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-primary rounded-sm flex items-center justify-center text-white">
              {editingEmpresa ? <Edit3 size={16} /> : <Plus size={16} />}
            </div>
            <div>
              <h3 className="font-extrabold text-on-surface text-lg tracking-tight">
                {editingEmpresa ? "Editar Empregador" : "Cadastrar Empregador"}
              </h3>
              <p className="text-[10px] font-black text-secondary uppercase tracking-widest">
                {editingEmpresa ? "Alteração de dados cadastrais" : "Inclusão manual de base de dados"}
              </p>
            </div>
          </div>
          <button 
            onClick={closeRegisterEmpresaModal}
            className="text-secondary hover:text-on-surface transition-colors"
          >
            <ChevronDown className="rotate-90" />
          </button>
        </div>
        
        <form onSubmit={handleEmpresaSubmit} className="p-8 space-y-6">
          <div className="space-y-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-black text-secondary uppercase tracking-widest">CNPJ Completo (Apenas números)</label>
              <input 
                type="text" 
                required
                disabled={!!editingEmpresa}
                placeholder="Ex: 00000000000191"
                className="w-full px-4 py-3 bg-surface border border-outline-variant rounded-sm text-sm font-bold text-on-surface focus:ring-2 focus:ring-primary outline-none transition-all disabled:opacity-50"
                value={empresaForm.cnpjCompleto}
                onChange={(e) => setEmpresaForm({ ...empresaForm, cnpjCompleto: e.target.value.replace(/\D/g, "").substring(0, 14) })}
              />
              <p className="text-[9px] text-secondary font-medium">
                {editingEmpresa ? "O CNPJ não pode ser alterado." : "O CNPJ Raiz (8 primeiros dígitos) será extraído automaticamente."}
              </p>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-black text-secondary uppercase tracking-widest">Razão Social</label>
              <input 
                type="text" 
                required
                placeholder="Ex: Empresa Exemplo LTDA"
                className="w-full px-4 py-3 bg-surface border border-outline-variant rounded-sm text-sm font-bold text-on-surface focus:ring-2 focus:ring-primary outline-none transition-all"
                value={empresaForm.razaoSocial}
                onChange={(e) => setEmpresaForm({ ...empresaForm, razaoSocial: e.target.value })}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-black text-secondary uppercase tracking-widest">Nome Fantasia</label>
              <input 
                type="text" 
                placeholder="Ex: Nome Fantasia"
                className="w-full px-4 py-3 bg-surface border border-outline-variant rounded-sm text-sm font-bold text-on-surface focus:ring-2 focus:ring-primary outline-none transition-all"
                value={empresaForm.nomeFantasia}
                onChange={(e) => setEmpresaForm({ ...empresaForm, nomeFantasia: e.target.value })}
              />
            </div>
          </div>

          <div className="pt-4 flex gap-4">
            <button 
              type="button"
              className="flex-1 px-4 py-3 border border-outline-variant rounded-sm text-sm font-bold text-secondary hover:bg-surface transition-all"
              onClick={closeRegisterEmpresaModal}
            >
              Cancelar
            </button>
            <button 
              type="submit"
              className="flex-1 bg-primary text-white py-3 rounded-sm text-sm font-bold flex items-center justify-center gap-2 hover:opacity-90 transition-all disabled:opacity-50"
              disabled={isLoading}
            >
              {isLoading ? <LoadingSpinner size="xs" /> : (editingEmpresa ? <Check size={16} /> : <Plus size={16} />)}
              <span>{editingEmpresa ? "Salvar Alterações" : "Salvar Empregador"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

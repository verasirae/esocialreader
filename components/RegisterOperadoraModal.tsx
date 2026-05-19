"use client";

import React, { useState, useEffect } from "react";
import { Shield, Loader2, ChevronDown, Check, Edit3 } from "lucide-react";
import { useModals } from "@/lib/contexts/ModalContext";

export function RegisterOperadoraModal() {
  const { isRegisterOperadoraModalOpen, closeRegisterOperadoraModal, editingOperadora } = useModals();
  const [isLoading, setIsLoading] = useState(false);
  const [operadoraForm, setOperadoraForm] = useState({ 
    cnpj: "",
    registroAns: "",
    nome: "",
    tipo: "medica"
  });

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    if (errorMessage || successMessage) {
      const timer = setTimeout(() => {
        setErrorMessage(null);
        setSuccessMessage(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [errorMessage, successMessage]);

  useEffect(() => {
    if (editingOperadora) {
      setOperadoraForm({
        cnpj: editingOperadora.cnpj || "",
        registroAns: editingOperadora.registroAns || "",
        nome: editingOperadora.nome || "",
        tipo: editingOperadora.tipo || "medica"
      });
    } else {
      setOperadoraForm({ cnpj: "", registroAns: "", nome: "", tipo: "medica" });
    }
    setErrorMessage(null);
    setSuccessMessage(null);
  }, [editingOperadora, isRegisterOperadoraModalOpen]);

  if (!isRegisterOperadoraModalOpen) return null;

  const handleOperadoraSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      console.log("Enviando dados da operadora:", operadoraForm);
      const res = await fetch("/api/esocial/operadoras/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(operadoraForm),
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
        setSuccessMessage(editingOperadora ? "Operadora atualizada!" : "Operadora cadastrada!");
        setTimeout(() => {
          closeRegisterOperadoraModal();
          setOperadoraForm({ cnpj: "", registroAns: "", nome: "", tipo: "medica" });
          window.dispatchEvent(new CustomEvent("operadora-added"));
        }, 1500);
      } else {
        throw new Error(data.details || data.error || "Erro ao salvar");
      }
    } catch (err: any) {
      console.error("Erro no submit da operadora:", err);
      setErrorMessage(err.message || "Erro desconhecido");
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
              {editingOperadora ? <Edit3 size={16} /> : <Shield size={16} />}
            </div>
            <div>
              <h3 className="font-extrabold text-on-surface text-lg tracking-tight">
                {editingOperadora ? "Editar Operadora" : "Cadastrar Operadora"}
              </h3>
              <p className="text-[10px] font-black text-secondary uppercase tracking-widest">
                {editingOperadora ? "Alteração de dados da operadora" : "Plano de Saúde / Odontológico"}
              </p>
            </div>
          </div>
          <button 
            onClick={closeRegisterOperadoraModal}
            className="text-secondary hover:text-on-surface transition-colors"
          >
            <ChevronDown className="rotate-90" />
          </button>
        </div>
        
        <form onSubmit={handleOperadoraSubmit} className="p-8 space-y-6">
          {errorMessage && (
            <div className="p-3 bg-error/10 border border-error/20 rounded-sm text-error text-xs font-bold">
              {errorMessage}
            </div>
          )}
          {successMessage && (
            <div className="p-3 bg-primary/10 border border-primary/20 rounded-sm text-primary text-xs font-bold">
              {successMessage}
            </div>
          )}
          <div className="space-y-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-black text-secondary uppercase tracking-widest">CNPJ (14 dígitos)</label>
              <input 
                type="text" 
                required
                disabled={!!editingOperadora}
                placeholder="Ex: 12345678000100"
                className="w-full px-4 py-3 bg-surface border border-outline-variant rounded-sm text-sm font-bold text-on-surface focus:ring-2 focus:ring-primary outline-none transition-all disabled:opacity-50"
                value={operadoraForm.cnpj}
                onChange={(e) => setOperadoraForm({ ...operadoraForm, cnpj: e.target.value.replace(/\D/g, "").substring(0, 14) })}
              />
              {editingOperadora && <p className="text-[9px] text-secondary font-medium">O CNPJ não pode ser alterado.</p>}
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-black text-secondary uppercase tracking-widest">Registro ANS</label>
              <input 
                type="text" 
                placeholder="Ex: 123456"
                className="w-full px-4 py-3 bg-surface border border-outline-variant rounded-sm text-sm font-bold text-on-surface focus:ring-2 focus:ring-primary outline-none transition-all"
                value={operadoraForm.registroAns}
                onChange={(e) => setOperadoraForm({ ...operadoraForm, registroAns: e.target.value.substring(0, 10) })}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-black text-secondary uppercase tracking-widest">Nome da Operadora</label>
              <input 
                type="text" 
                placeholder="Ex: Unimed"
                className="w-full px-4 py-3 bg-surface border border-outline-variant rounded-sm text-sm font-bold text-on-surface focus:ring-2 focus:ring-primary outline-none transition-all"
                value={operadoraForm.nome}
                onChange={(e) => setOperadoraForm({ ...operadoraForm, nome: e.target.value })}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-black text-secondary uppercase tracking-widest">Tipo de Serviço</label>
              <div className="relative">
                <select 
                  required
                  className="w-full px-4 py-3 bg-surface border border-outline-variant rounded-sm text-sm font-bold text-on-surface focus:ring-2 focus:ring-primary outline-none transition-all appearance-none"
                  value={operadoraForm.tipo}
                  onChange={(e) => setOperadoraForm({ ...operadoraForm, tipo: e.target.value })}
                >
                  <option value="medica">Médica</option>
                  <option value="odonto">Odontológica</option>
                  <option value="ambos">Ambos</option>
                </select>
                <ChevronDown size={16} className="absolute right-4 top-3.5 text-secondary pointer-events-none" />
              </div>
            </div>
          </div>

          <div className="pt-4 flex gap-4">
            <button 
              type="button"
              className="flex-1 px-4 py-3 border border-outline-variant rounded-sm text-sm font-bold text-secondary hover:bg-surface transition-all"
              onClick={closeRegisterOperadoraModal}
            >
              Cancelar
            </button>
            <button 
              type="submit"
              className="flex-1 bg-primary text-white py-3 rounded-sm text-sm font-bold flex items-center justify-center gap-2 hover:opacity-90 transition-all disabled:opacity-50"
              disabled={isLoading}
            >
              {isLoading ? <Loader2 size={16} className="animate-spin" /> : (editingOperadora ? <Check size={16} /> : <Check size={16} />)}
              <span>{editingOperadora ? "Salvar Alterações" : "Salvar Operadora"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

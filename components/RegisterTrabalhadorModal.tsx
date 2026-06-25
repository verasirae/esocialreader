"use client";

import React, { useState, useEffect } from "react";
import { UserPlus, ChevronDown, Check, FileUp, Download, Edit3 } from "lucide-react";
import { useModals } from "@/lib/contexts/ModalContext";
import { useEmpresa } from "@/lib/contexts/EmpresaContext";
import * as XLSX from "xlsx";
import LoadingSpinner from "./LoadingSpinner";

export function RegisterTrabalhadorModal() {
  const { isRegisterTrabalhadorModalOpen, closeRegisterTrabalhadorModal, editingTrabalhador } = useModals();
  const { activeEmpresa } = useEmpresa();
  const [isLoading, setIsLoading] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [empresas, setEmpresas] = useState<any[]>([]);
  const [trabalhadorForm, setTrabalhadorForm] = useState({ 
    cpf: "",
    nome: "",
    cnpjEmpregador: "",
    nis: "",
    matricula: "",
    categoriaEsocial: "",
    dtAdmissao: "",
    dtDesligamento: "",
    ativo: "true"
  });

  useEffect(() => {
    if (isRegisterTrabalhadorModalOpen) {
      fetchEmpresas();
    }
  }, [isRegisterTrabalhadorModalOpen]);

  useEffect(() => {
    if (editingTrabalhador) {
      // Find CNPJ of the worker's company
      const matchedEmp = empresas.find(e => e.id === editingTrabalhador.empresaId);
      const cnpj = matchedEmp ? (matchedEmp.cnpjCompleto || matchedEmp.cnpjRaiz) : "";

      setTrabalhadorForm({
        cpf: editingTrabalhador.cpf || "",
        nome: editingTrabalhador.nome || "",
        cnpjEmpregador: cnpj || "",
        nis: editingTrabalhador.nis || "",
        matricula: editingTrabalhador.matricula || "",
        categoriaEsocial: editingTrabalhador.categoriaEsocial || "",
        dtAdmissao: editingTrabalhador.dtAdmissao ? new Date(editingTrabalhador.dtAdmissao).toISOString().split("T")[0] : "",
        dtDesligamento: editingTrabalhador.dtDesligamento ? new Date(editingTrabalhador.dtDesligamento).toISOString().split("T")[0] : "",
        ativo: editingTrabalhador.ativo !== undefined ? String(editingTrabalhador.ativo) : "true"
      });
    } else {
      // New worker: prefill CNPJ Empregador with active company's CNPJ
      const activeCnpj = activeEmpresa ? (activeEmpresa.cnpjCompleto || activeEmpresa.cnpjRaiz) : "";
      setTrabalhadorForm({ 
        cpf: "", 
        nome: "", 
        cnpjEmpregador: activeCnpj || "",
        nis: "",
        matricula: "",
        categoriaEsocial: "",
        dtAdmissao: "",
        dtDesligamento: "",
        ativo: "true"
      });
    }
  }, [editingTrabalhador, isRegisterTrabalhadorModalOpen, empresas, activeEmpresa]);

  const fetchEmpresas = async () => {
    try {
      const res = await fetch("/api/esocial/empresas?pageSize=100");
      const contentType = res.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        const data = await res.json();
        if (data.data) {
          setEmpresas(data.data);
        }
      } else {
        console.warn("Retorno não-JSON ao buscar empresas.");
      }
    } catch (err) {
      console.error("Erro ao carregar empresas:", err);
    }
  };

  if (!isRegisterTrabalhadorModalOpen) return null;

  const handleExcelImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    const formData = new FormData();
    formData.append("file", file);
    formData.append("activeEmpresaId", activeEmpresa?.id || "");

    try {
      const res = await fetch("/api/esocial/trabalhadores/import-excel", {
        method: "POST",
        body: formData,
      });
      
      const contentType = res.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        const data = await res.json();
        if (data.success) {
          alert(`Importação concluída! Processados: ${data.processed}, Erros: ${data.errors}`);
          window.dispatchEvent(new CustomEvent("trabalhador-added"));
          closeRegisterTrabalhadorModal();
        } else {
          throw new Error(data.error || "Erro na importação");
        }
      } else {
        const text = await res.text();
        throw new Error("O servidor retornou uma resposta inesperada: " + (text.substring(0, 100) || "Sem conteúdo"));
      }
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsImporting(false);
      // Reset input
      e.target.value = "";
    }
  };

  const downloadTemplate = () => {
    const activeCnpj = activeEmpresa ? (activeEmpresa.cnpjCompleto || activeEmpresa.cnpjRaiz) : "12345678000100";
    const template = [
      { 
        CPF: "12345678901", 
        Nome: "Jose da Silva", 
        CNPJ_Empregador: activeCnpj,
        NIS: "12345678901",
        Matricula: "MAT001",
        Categoria_eSocial: "101",
        Data_Admissao: "2024-01-15",
        Data_Desligamento: "",
        Ativo: "Sim"
      },
      { 
        CPF: "98765432100", 
        Nome: "Maria Oliveira", 
        CNPJ_Empregador: activeCnpj,
        NIS: "",
        Matricula: "MAT002",
        Categoria_eSocial: "101",
        Data_Admissao: "2023-06-20",
        Data_Desligamento: "",
        Ativo: "Sim"
      },
    ];
    
    const ws = XLSX.utils.json_to_sheet(template);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Modelo");
    XLSX.writeFile(wb, "modelo_trabalhadores.xlsx");
  };

  const handleTrabalhadorSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const res = await fetch("/api/esocial/trabalhadores/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(trabalhadorForm),
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
        alert(editingTrabalhador ? "Trabalhador atualizado com sucesso!" : "Trabalhador cadastrado com sucesso!");
        closeRegisterTrabalhadorModal();
        setTrabalhadorForm({ 
          cpf: "", 
          nome: "", 
          cnpjEmpregador: "",
          nis: "",
          matricula: "",
          categoriaEsocial: "",
          dtAdmissao: "",
          dtDesligamento: "",
          ativo: "true"
        });
        // Evento para atualizar listas se necessário
        window.dispatchEvent(new CustomEvent("trabalhador-added"));
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
      <div className="bg-white w-full max-w-[650px] flex flex-col rounded-sm shadow-2xl border border-outline-variant overflow-hidden max-h-[90vh]">
        <div className="p-6 border-b border-outline-variant flex justify-between items-center bg-surface-container/10">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-primary rounded-sm flex items-center justify-center text-white">
              {editingTrabalhador ? <Edit3 size={16} /> : <UserPlus size={16} />}
            </div>
            <div>
              <h3 className="font-extrabold text-on-surface text-lg tracking-tight">
                {editingTrabalhador ? "Editar Trabalhador" : "Cadastrar Trabalhador"}
              </h3>
              <p className="text-[10px] font-black text-secondary uppercase tracking-widest">
                {editingTrabalhador ? "Alteração de dados do empregado" : "Inclusão de empregado"}
              </p>
            </div>
          </div>
          <button 
            onClick={closeRegisterTrabalhadorModal}
            className="text-secondary hover:text-on-surface transition-colors"
          >
            <ChevronDown className="rotate-90" />
          </button>
        </div>
        
        <form onSubmit={handleTrabalhadorSubmit} className="flex-1 overflow-y-auto p-8 space-y-6">
          {!editingTrabalhador && (
            <div className="p-4 bg-primary/5 border border-primary/20 rounded-sm space-y-3">
              <div className="flex justify-between items-center">
                <h4 className="text-[10px] font-black text-primary uppercase tracking-widest">Importação em Lote</h4>
                <button 
                  type="button"
                  onClick={downloadTemplate}
                  className="flex items-center gap-1.5 text-[9px] font-black text-secondary uppercase tracking-widest hover:text-primary transition-colors"
                >
                  <Download size={12} />
                  <span>Baixar Modelo</span>
                </button>
              </div>
              <div className="relative">
                 <input 
                   type="file" 
                   accept=".xlsx, .xls"
                   onChange={handleExcelImport}
                   className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                   disabled={isImporting}
                 />
                 <div className="w-full h-20 border-2 border-dashed border-primary/30 rounded-sm flex flex-col items-center justify-center gap-1 hover:bg-primary/10 transition-all">
                    {isImporting ? (
                      <LoadingSpinner size="sm" />
                    ) : (
                      <>
                        <FileUp size={24} className="text-primary opacity-60" />
                        <span className="text-[10px] font-bold text-primary">Clique ou arraste o arquivo .XLSX</span>
                      </>
                    )}
                 </div>
              </div>
            </div>
          )}

          {!editingTrabalhador && (
            <div className="flex items-center gap-4 py-2">
              <div className="h-px flex-1 bg-outline-variant"></div>
              <span className="text-[10px] font-black text-secondary uppercase tracking-widest">Ou Cadastro Manual</span>
              <div className="h-px flex-1 bg-outline-variant"></div>
            </div>
          )}

          <div className="space-y-4">
            <h4 className="text-xs font-extrabold text-on-surface border-b border-outline-variant pb-2 uppercase tracking-wide">Dados Obrigatórios</h4>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5 col-span-1 sm:col-span-2">
                <label className="text-[10px] font-black text-secondary uppercase tracking-widest">Nome Completo *</label>
                <input 
                  type="text" 
                  required
                  placeholder="Ex: João da Silva"
                  className="w-full px-4 py-3 bg-surface border border-outline-variant rounded-sm text-sm font-bold text-on-surface focus:ring-2 focus:ring-primary outline-none transition-all"
                  value={trabalhadorForm.nome}
                  onChange={(e) => setTrabalhadorForm({ ...trabalhadorForm, nome: e.target.value })}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-black text-secondary uppercase tracking-widest">CPF (Apenas números) *</label>
                <input 
                  type="text" 
                  required
                  disabled={!!editingTrabalhador}
                  placeholder="Ex: 12345678901"
                  className="w-full px-4 py-3 bg-surface border border-outline-variant rounded-sm text-sm font-bold text-on-surface focus:ring-2 focus:ring-primary outline-none transition-all disabled:opacity-50"
                  value={trabalhadorForm.cpf}
                  onChange={(e) => setTrabalhadorForm({ ...trabalhadorForm, cpf: e.target.value.replace(/\D/g, "").substring(0, 11) })}
                />
                {editingTrabalhador && <p className="text-[9px] text-secondary font-medium">O CPF não pode ser alterado.</p>}
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-black text-secondary uppercase tracking-widest">CNPJ Empregador (Apenas números) *</label>
                <input 
                  type="text" 
                  required
                  placeholder="Ex: 12345678000199"
                  className="w-full px-4 py-3 bg-surface border border-outline-variant rounded-sm text-sm font-bold text-on-surface focus:ring-2 focus:ring-primary outline-none transition-all"
                  value={trabalhadorForm.cnpjEmpregador}
                  onChange={(e) => setTrabalhadorForm({ ...trabalhadorForm, cnpjEmpregador: e.target.value.replace(/\D/g, "").substring(0, 14) })}
                />
              </div>
            </div>

            <h4 className="text-xs font-extrabold text-on-surface border-b border-outline-variant pt-4 pb-2 uppercase tracking-wide">Dados Opcionais</h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-black text-secondary uppercase tracking-widest">NIS (PIS/PASEP/NIT)</label>
                <input 
                  type="text" 
                  placeholder="Ex: 12345678901"
                  className="w-full px-4 py-3 bg-surface border border-outline-variant rounded-sm text-sm font-bold text-on-surface focus:ring-2 focus:ring-primary outline-none transition-all"
                  value={trabalhadorForm.nis}
                  onChange={(e) => setTrabalhadorForm({ ...trabalhadorForm, nis: e.target.value.replace(/\D/g, "").substring(0, 11) })}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-black text-secondary uppercase tracking-widest">Matrícula</label>
                <input 
                  type="text" 
                  placeholder="Ex: MAT0001"
                  className="w-full px-4 py-3 bg-surface border border-outline-variant rounded-sm text-sm font-bold text-on-surface focus:ring-2 focus:ring-primary outline-none transition-all"
                  value={trabalhadorForm.matricula}
                  onChange={(e) => setTrabalhadorForm({ ...trabalhadorForm, matricula: e.target.value })}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-black text-secondary uppercase tracking-widest">Categoria eSocial</label>
                <input 
                  type="text" 
                  placeholder="Ex: 101"
                  className="w-full px-4 py-3 bg-surface border border-outline-variant rounded-sm text-sm font-bold text-on-surface focus:ring-2 focus:ring-primary outline-none transition-all"
                  value={trabalhadorForm.categoriaEsocial}
                  onChange={(e) => setTrabalhadorForm({ ...trabalhadorForm, categoriaEsocial: e.target.value })}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-black text-secondary uppercase tracking-widest">Ativo</label>
                <div className="relative">
                  <select 
                    className="w-full px-4 py-3 bg-surface border border-outline-variant rounded-sm text-sm font-bold text-on-surface focus:ring-2 focus:ring-primary outline-none transition-all appearance-none"
                    value={trabalhadorForm.ativo}
                    onChange={(e) => setTrabalhadorForm({ ...trabalhadorForm, ativo: e.target.value })}
                  >
                    <option value="true">Sim</option>
                    <option value="false">Não</option>
                  </select>
                  <ChevronDown size={16} className="absolute right-4 top-3.5 text-secondary pointer-events-none" />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-black text-secondary uppercase tracking-widest">Data de Admissão</label>
                <input 
                  type="date" 
                  className="w-full px-4 py-3 bg-surface border border-outline-variant rounded-sm text-sm font-bold text-on-surface focus:ring-2 focus:ring-primary outline-none transition-all"
                  value={trabalhadorForm.dtAdmissao}
                  onChange={(e) => setTrabalhadorForm({ ...trabalhadorForm, dtAdmissao: e.target.value })}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-black text-secondary uppercase tracking-widest">Data de Desligamento</label>
                <input 
                  type="date" 
                  className="w-full px-4 py-3 bg-surface border border-outline-variant rounded-sm text-sm font-bold text-on-surface focus:ring-2 focus:ring-primary outline-none transition-all"
                  value={trabalhadorForm.dtDesligamento}
                  onChange={(e) => setTrabalhadorForm({ ...trabalhadorForm, dtDesligamento: e.target.value })}
                />
              </div>
            </div>
          </div>

          <div className="pt-4 flex gap-4 border-t border-outline-variant">
            <button 
              type="button"
              className="flex-1 px-4 py-3 border border-outline-variant rounded-sm text-sm font-bold text-secondary hover:bg-surface transition-all"
              onClick={closeRegisterTrabalhadorModal}
            >
              Cancelar
            </button>
            <button 
              type="submit"
              className="flex-1 bg-primary text-white py-3 rounded-sm text-sm font-bold flex items-center justify-center gap-2 hover:opacity-90 transition-all disabled:opacity-50"
              disabled={isLoading}
            >
              {isLoading ? <LoadingSpinner size="xs" /> : <Check size={16} />}
              <span>{editingTrabalhador ? "Salvar Alterações" : "Salvar Trabalhador"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

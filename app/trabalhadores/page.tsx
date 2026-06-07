"use client";

import React, { useState, useEffect } from "react";
import { 
  Plus, 
  Search, 
  Eye, 
  Pencil, 
  Users, 
  Loader2,
  FileText,
  ChevronDown,
  Download
} from "lucide-react";
import { useModals } from "@/lib/contexts/ModalContext";
import { safeJsonFetch } from "@/lib/utils";
import LoadingSpinner from "@/components/LoadingSpinner";
import { gerarInformePDF } from "@/lib/pdf-generator";

export default function TrabalhadoresPage() {
  const [trabalhadoresData, setTrabalhadoresData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  const { openRegisterTrabalhadorModal } = useModals();

  const [isDataModalOpen, setIsDataModalOpen] = useState(false);
  const [selectedRowDetail, setSelectedRowDetail] = useState<any>(null);
  const [fechamentosList, setFechamentosList] = useState<any[]>([]);

  useEffect(() => {
    fetchTrabalhadoresData(currentPage, searchTerm);
  }, [currentPage, searchTerm]);

  useEffect(() => {
    // Buscar consolidacoes/fechamentos para renderizar opcao de baixar informe de rendimentos
    const fetchFechamentos = async () => {
      try {
        const res = await fetch("/api/esocial/s5002/fechamentos/list");
        if (res.ok) {
          const data = await res.json();
          setFechamentosList(data);
        }
      } catch (err) {
        console.error("Erro ao buscar fechamentos do eSocial:", err);
      }
    };
    fetchFechamentos();
  }, []);

  useEffect(() => {
    const handleRefresh = () => fetchTrabalhadoresData(1, "");
    window.addEventListener("trabalhador-added", handleRefresh);
    return () => window.removeEventListener("trabalhador-added", handleRefresh);
  }, []);

  const fetchTrabalhadoresData = async (page: number, search: string) => {
    setIsLoading(true);
    try {
      const result = await safeJsonFetch(`/api/esocial/trabalhadores?page=${page}&search=${search}`);
      if (result && result.data) {
        setTrabalhadoresData(result.data);
        setTotalItems(result.total);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const openDetails = (row: any) => {
    setSelectedRowDetail(row);
    setIsDataModalOpen(true);
  };

  const renderDataModal = () => {
    if (!isDataModalOpen || !selectedRowDetail) return null;

    const f = fechamentosList.find((c: any) => c.trabalhador?.cpf === selectedRowDetail.cpf);

    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
        <div className="bg-white w-full max-w-2xl rounded-sm shadow-2xl flex flex-col max-h-[80vh] overflow-hidden border border-outline-variant">
          <div className="p-6 border-b border-outline-variant flex justify-between items-center bg-surface-container/10">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-primary rounded-sm flex items-center justify-center text-white">
                <FileText size={16} />
              </div>
              <div>
                <h3 className="font-extrabold text-on-surface text-lg tracking-tight">Detalhes do Trabalhador</h3>
                <p className="text-[10px] font-black text-secondary uppercase tracking-widest">Nome: {selectedRowDetail.nome}</p>
              </div>
            </div>
            <button 
              onClick={() => setIsDataModalOpen(false)}
              className="w-10 h-10 rounded-full hover:bg-surface-container text-secondary flex items-center justify-center transition-all"
            >
              <ChevronDown className="rotate-90" />
            </button>
          </div>
          
          <div className="flex-1 overflow-y-auto p-8 space-y-6">
            <div className="grid grid-cols-2 gap-x-8 gap-y-6">
              {Object.entries(selectedRowDetail).map(([key, value]) => {
                if (key === "id" || key === "_count" || key === "eventos" || key === "fechamentos") return null;
                const displayValue = value instanceof Date ? value.toLocaleDateString() : 
                                     (typeof value === "string" && !isNaN(Date.parse(value)) && value.includes("-")) ? new Date(value as string).toLocaleDateString() :
                                     String(value || "-");
                
                return (
                  <div key={key} className="flex flex-col gap-1 border-b border-outline-variant/30 pb-2">
                    <span className="text-[10px] font-black text-outline uppercase tracking-widest">{key}</span>
                    <span className="text-sm font-bold text-on-surface break-words">{displayValue}</span>
                  </div>
                );
              })}
            </div>
          </div>
          
          <div className="p-6 border-t border-outline-variant bg-surface-container/5 flex gap-4">
            <button 
              className="flex-1 btn-primary py-3"
              onClick={() => setIsDataModalOpen(false)}
            >
              Fechar Detalhamento
            </button>
            {f && (
              <button 
                className="btn-outline px-6 bg-white border-secondary/20 text-secondary hover:bg-secondary/5 flex items-center justify-center gap-2 font-bold animate-in fade-in duration-300"
                onClick={() => {
                  try {
                    const doc = gerarInformePDF(f);
                    const nameClean = f.trabalhador?.nome?.toLowerCase()
                      .normalize("NFD")
                      .replace(/[\u0300-\u036f]/g, "")
                      .replace(/\s+/g, "-") || "beneficiario";
                    doc.save(`informe-rendimentos-${nameClean}-${f.ano || 2026}.pdf`);
                  } catch (error) {
                    console.error("Erro ao gerar PDF:", error);
                    alert("Ocorreu um erro ao gerar o PDF.");
                  }
                }}
              >
                <Download size={14} className="text-secondary" />
                Informe ({f.ano})
              </button>
            )}
            <button 
              className="btn-outline px-6 bg-white border-primary/20 text-primary hover:bg-primary/5 flex items-center justify-center gap-2"
              onClick={() => {
                openRegisterTrabalhadorModal(selectedRowDetail);
                setIsDataModalOpen(false);
              }}
            >
              <Pencil size={14} />
              Editar Trabalhador
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <main className="p-8 space-y-8">
      <div className="flex justify-between items-end">
        <div>
          <p className="text-[10px] font-black text-primary uppercase tracking-[0.2em] mb-2">Módulo Governamental</p>
          <h1 className="text-3xl font-black text-on-surface tracking-tighter leading-none italic uppercase">
            Gestão de Trabalhadores
          </h1>
        </div>
      </div>

      <div className="card flex flex-col">
        <div className="px-lg py-6 border-b border-outline-variant flex justify-between items-center bg-white">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-primary/10 rounded-sm flex items-center justify-center text-primary">
              <Users size={20} />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-on-surface tracking-tight">Base de Trabalhadores</h2>
              <p className="text-[11px] text-secondary font-medium">Listagem consolidada de CPFs e nomes importados</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-primary" size={14} />
              <input 
                type="text"
                placeholder="Buscar por Nome ou CPF..."
                className="pl-10 pr-4 py-2 bg-surface border border-outline-variant rounded-sm text-xs focus:ring-1 focus:ring-primary outline-none transition-all w-64"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <button 
              className="btn-primary flex items-center gap-2 py-2"
              onClick={() => openRegisterTrabalhadorModal()}
            >
              <Plus size={14} />
              <span>Novo Trabalhador</span>
            </button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface text-[10px] font-black text-secondary uppercase tracking-widest">
                <th className="px-lg py-4 border-b border-outline-variant">CPF</th>
                <th className="px-lg py-4 border-b border-outline-variant">Nome Completo</th>
                <th className="px-lg py-4 border-b border-outline-variant text-center">Eventos Associados</th>
                <th className="px-lg py-4 border-b border-outline-variant text-center">Última Atividade</th>
                <th className="px-lg py-4 border-b border-outline-variant text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="px-lg py-20 text-center"><LoadingSpinner size="md" className="inline-block" /></td>
                </tr>
              ) : trabalhadoresData.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-lg py-32 text-center text-xs text-secondary italic font-bold">Nenhum trabalhador encontrado.</td>
                </tr>
              ) : (
                trabalhadoresData.map((trab: any) => (
                  <tr key={trab.id} className="hover:bg-surface-container/30 transition-all">
                    <td className="px-lg py-5 text-sm font-black text-primary">{trab.cpf}</td>
                    <td className="px-lg py-5 text-sm font-bold text-on-surface uppercase">{trab.nome}</td>
                    <td className="px-lg py-5 text-sm font-black text-on-surface text-center tabular-nums">
                      {trab._count?.eventos || 0}
                    </td>
                    <td className="px-lg py-5 text-sm text-secondary text-center">
                      {new Date(trab.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-lg py-5 text-right flex justify-end gap-2">
                       <button className="p-2 hover:bg-white border border-outline-variant rounded transition-all" onClick={() => openDetails(trab)} title="Ver detalhes">
                          <Eye size={14} className="text-secondary" />
                       </button>
                       <button className="p-2 hover:bg-white border border-primary/20 rounded transition-all" onClick={() => openRegisterTrabalhadorModal(trab)} title="Editar">
                          <Pencil size={14} className="text-primary" />
                       </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
      {renderDataModal()}
    </main>
  );
}

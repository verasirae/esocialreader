"use client";

import React, { useState, useEffect } from "react";
import { 
  Search, 
  Eye, 
  ShieldCheck, 
  Loader2,
  FileText,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Calendar,
  Hash,
  Scale,
  X,
  AlertCircle,
  Pencil
} from "lucide-react";
import { safeJsonFetch } from "@/lib/utils";

// Interface correspondente ao modelo RfbCodigoReceita
interface RfbCodigoReceita {
  id: string;
  codigo: string;
  denominacao: string;
  baseLegal: string[];
  dtCriacao: string | null;
  dtExtincao: string | null;
  ativo: boolean;
}

interface ApiResponse {
  data: RfbCodigoReceita[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export default function CodigosReceitaPage() {
  const [data, setData] = useState<RfbCodigoReceita[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("ativos"); // default para ativos para focar em dados válidos
  const [currentPage, setCurrentPage] = useState(1);
  const [limit, setLimit] = useState(15);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedRowDetail, setSelectedRowDetail] = useState<RfbCodigoReceita | null>(null);

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedRowEdit, setSelectedRowEdit] = useState<RfbCodigoReceita | null>(null);
  const [editCodigo, setEditCodigo] = useState("");
  const [editDenominacao, setEditDenominacao] = useState("");
  const [editBaseLegalText, setEditBaseLegalText] = useState("");
  const [editDtCriacao, setEditDtCriacao] = useState("");
  const [editDtExtincao, setEditDtExtincao] = useState("");
  const [editAtivo, setEditAtivo] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);

  // Debounce para a busca textual para evitar disparos excessivos à API
  const [debouncedSearch, setDebouncedSearch] = useState("");

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setCurrentPage(1); // Reiniciar para a página 1 ao efetuar nova busca
    }, 400); // 400ms

    return () => clearTimeout(handler);
  }, [searchTerm]);

  // Sempre que mudar paginação, busca debouncada ou filtros de status, recarrega
  useEffect(() => {
    fetchCodigosReceita(currentPage, debouncedSearch, statusFilter, limit);
  }, [currentPage, debouncedSearch, statusFilter, limit]);

  const fetchCodigosReceita = async (
    page: number, 
    search: string, 
    status: string, 
    itemsPerPage: number
  ) => {
    setIsLoading(true);
    try {
      const url = `/api/fiscal/codigos-receita?page=${page}&limit=${itemsPerPage}&search=${encodeURIComponent(search)}&status=${status}`;
      const result = await safeJsonFetch<ApiResponse>(url);
      if (result) {
        setData(result.data || []);
        if (result.pagination) {
          setTotalItems(result.pagination.total);
          setTotalPages(result.pagination.totalPages);
        }
      } else {
        setData([]);
        setTotalItems(0);
        setTotalPages(0);
      }
    } catch (err) {
      console.error("Erro ao carregar códigos de receita RFB:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const openDetails = (row: RfbCodigoReceita) => {
    setSelectedRowDetail(row);
    setIsDetailModalOpen(true);
  };

  const openEdit = (row: RfbCodigoReceita) => {
    setSelectedRowEdit(row);
    setEditCodigo(row.codigo || "");
    setEditDenominacao(row.denominacao || "");
    setEditBaseLegalText(row.baseLegal ? row.baseLegal.join("; ") : "");
    setEditDtCriacao(row.dtCriacao ? new Date(row.dtCriacao).toISOString().split("T")[0] : "");
    setEditDtExtincao(row.dtExtincao ? new Date(row.dtExtincao).toISOString().split("T")[0] : "");
    setEditAtivo(row.ativo);
    setSaveError(null);
    setSaveSuccess(null);
    setIsEditModalOpen(true);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editCodigo || !editDenominacao) {
      setSaveError("Código e Denominação são obrigatórios.");
      return;
    }

    setIsSaving(true);
    setSaveError(null);
    setSaveSuccess(null);

    try {
      const parsedBases = editBaseLegalText
        ? editBaseLegalText.split(/[;,]/).map(b => b.trim()).filter(b => b.length > 0)
        : [];

      // Converte as datas respeitando formato UTC simples ou null
      let parsedDtCriacaoStr: string | null = null;
      if (editDtCriacao) {
        // Para evitar shifting de fuso horário, adicione a hora do meio dia
        parsedDtCriacaoStr = new Date(`${editDtCriacao}T12:00:00Z`).toISOString();
      }

      let parsedDtExtincaoStr: string | null = null;
      if (editDtExtincao) {
        parsedDtExtincaoStr = new Date(`${editDtExtincao}T12:00:00Z`).toISOString();
      }

      const res = await fetch("/api/fiscal/codigos-receita", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: selectedRowEdit?.id,
          codigo: editCodigo,
          denominacao: editDenominacao,
          baseLegal: parsedBases,
          dtCriacao: parsedDtCriacaoStr,
          dtExtincao: parsedDtExtincaoStr,
          ativo: editAtivo,
        }),
      });

      const responseData = await res.json();

      if (!res.ok) {
        throw new Error(responseData.error || "Ocorreu um erro ao salvar o registro.");
      }

      setSaveSuccess("Código de receita federal atualizado com sucesso!");
      
      // Atualiza o estado local na lista para refletir as alterações instantaneamente
      setData(prev => prev.map(item => item.id === selectedRowEdit?.id ? responseData.data : item));
      
      // Fecha o modal após 1.2 segundos
      setTimeout(() => {
        setIsEditModalOpen(false);
      }, 1200);
    } catch (err: any) {
      setSaveError(err.message || "Falha na conexão com o servidor.");
    } finally {
      setIsSaving(false);
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "-";
    try {
      const date = new Date(dateStr);
      // Evita problemas de fuso horário voltando a data em 1 dia se necessário, mas para visualização simples o formato UTC/Local bastará:
      return date.toLocaleDateString("pt-BR", { timeZone: "UTC" });
    } catch (e) {
      return dateStr;
    }
  };

  const renderDetailModal = () => {
    if (!isDetailModalOpen || !selectedRowDetail) return null;

    return (
      <div id="detail-modal" className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
        <div className="bg-white w-full max-w-2xl rounded-sm shadow-2xl flex flex-col max-h-[85vh] overflow-hidden border border-outline-variant">
          {/* Header */}
          <div className="p-6 border-b border-outline-variant flex justify-between items-center bg-surface-container/10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-[#1B365D]/5 rounded-sm flex items-center justify-center text-[#1B365D]">
                <FileText size={20} />
              </div>
              <div>
                <h3 className="font-extrabold text-on-surface text-lg tracking-tight uppercase">Código de Receita Detalhado</h3>
                <p className="text-[10px] font-black text-secondary tracking-widest uppercase">RFB Arrecadação e Subsídios</p>
              </div>
            </div>
            <button 
              onClick={() => setIsDetailModalOpen(false)}
              className="w-10 h-10 rounded-full hover:bg-surface-container text-secondary flex items-center justify-center transition-all"
              id="close-modal-btn"
            >
              <X size={20} />
            </button>
          </div>
          
          {/* Content */}
          <div className="flex-1 overflow-y-auto p-8 space-y-6">
            <div className="bg-surface-container-low p-5 rounded-sm border border-outline-variant/50 flex items-start gap-4 mb-4">
              <div className="text-3xl font-black text-[#1B365D] font-mono bg-white px-3 py-1 border border-outline-variant rounded-sm shadow-sm shrink-0">
                {selectedRowDetail.codigo}
              </div>
              <div className="space-y-1.5 flex-1 min-w-0">
                <h4 className="text-xs font-black text-secondary uppercase tracking-widest flex items-center gap-1">
                  Denominação Principal
                </h4>
                <p className="text-base font-bold text-on-surface leading-snug break-words uppercase">
                  {selectedRowDetail.denominacao}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Situação Cadastral */}
              <div className="flex flex-col gap-1 border-b border-outline-variant/30 pb-3">
                <span className="text-[10px] font-black text-outline uppercase tracking-widest flex items-center gap-1">
                  <ShieldCheck size={12} className="text-secondary" /> Situação Operacional
                </span>
                <div className="mt-1">
                  {selectedRowDetail.ativo ? (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200">
                      ● Ativo / Vigente
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-rose-50 text-rose-700 border border-rose-200">
                      ● Desativado / Extinto
                    </span>
                  )}
                </div>
              </div>

              {/* ID Interno */}
              <div className="flex flex-col gap-1 border-b border-outline-variant/30 pb-3">
                <span className="text-[10px] font-black text-outline uppercase tracking-widest flex items-center gap-1">
                  <Hash size={12} className="text-secondary" /> Identificador Serial
                </span>
                <span className="text-sm font-bold text-on-surface font-mono mt-1 break-all">
                  {selectedRowDetail.id}
                </span>
              </div>

              {/* Data de Criação */}
              <div className="flex flex-col gap-1 border-b border-outline-variant/30 pb-3">
                <span className="text-[10px] font-black text-outline uppercase tracking-widest flex items-center gap-1">
                  <Calendar size={12} className="text-secondary" /> Data de Instituição/Criação
                </span>
                <span className="text-sm font-bold text-on-surface mt-1">
                  {formatDate(selectedRowDetail.dtCriacao)}
                </span>
              </div>

              {/* Data de Extinção */}
              <div className="flex flex-col gap-1 border-b border-outline-variant/30 pb-3">
                <span className="text-[10px] font-black text-outline uppercase tracking-widest flex items-center gap-1">
                  <Calendar size={12} className="text-secondary" /> Data de Extinção / Baixa
                </span>
                <span className="text-sm font-bold text-on-surface mt-1">
                  {formatDate(selectedRowDetail.dtExtincao)}
                </span>
              </div>
            </div>

            {/* Bases Legais */}
            <div className="space-y-3">
              <span className="text-[10px] font-black text-outline uppercase tracking-widest flex items-center gap-1">
                <Scale size={14} className="text-secondary" /> Bases Legais e Normas Regulamentadoras
              </span>
              
              {selectedRowDetail.baseLegal && selectedRowDetail.baseLegal.length > 0 ? (
                <div className="space-y-2">
                  {selectedRowDetail.baseLegal.map((base, idx) => (
                    <div 
                      key={idx} 
                      className="p-3 bg-alice-blue text-xs font-bold text-primary flex items-start gap-2.5 border-l-4 border-[#1B365D] bg-[#1B365D]/5 rounded-r-sm"
                    >
                      <Scale size={14} className="shrink-0 mt-0.5" />
                      <span className="leading-normal break-words uppercase">{base}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-4 bg-surface-container-low rounded-sm border border-outline-variant/60 text-xs text-secondary flex items-center gap-2">
                  <AlertCircle size={14} />
                  <span>Nenhum diploma legal específico cadastrado para esta rubrica.</span>
                </div>
              )}
            </div>
          </div>
          
          {/* Footer */}
          <div className="p-6 border-t border-outline-variant bg-surface-container/10 flex">
            <button 
              className="flex-1 btn-primary py-3"
              onClick={() => setIsDetailModalOpen(false)}
              id="close-modal-footer-btn"
            >
              Fechar Detalhamento
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderEditModal = () => {
    if (!isEditModalOpen || !selectedRowEdit) return null;

    return (
      <div id="edit-modal" className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
        <form onSubmit={handleSaveEdit} className="bg-white w-full max-w-2xl rounded-sm shadow-2xl flex flex-col max-h-[90vh] overflow-hidden border border-outline-variant">
          {/* Header */}
          <div className="p-6 border-b border-outline-variant flex justify-between items-center bg-surface-container/10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary/5 rounded-sm flex items-center justify-center text-primary">
                <Pencil size={20} />
              </div>
              <div>
                <h3 className="font-extrabold text-on-surface text-lg tracking-tight uppercase">Editar Código de Receita</h3>
                <p className="text-[10px] font-black text-secondary tracking-widest uppercase">Atualizar cadastro oficial da RFB</p>
              </div>
            </div>
            <button 
              type="button"
              onClick={() => setIsEditModalOpen(false)}
              className="w-10 h-10 rounded-full hover:bg-surface-container text-secondary flex items-center justify-center transition-all"
              id="close-edit-modal-btn"
            >
              <X size={20} />
            </button>
          </div>
          
          {/* Content */}
          <div className="flex-1 overflow-y-auto p-8 space-y-6">
            {saveError && (
              <div className="p-4 bg-rose-50 text-rose-800 rounded-sm border border-rose-200 text-xs font-bold flex items-start gap-2.5">
                <AlertCircle size={16} className="shrink-0 mt-0.5" />
                <span>{saveError}</span>
              </div>
            )}
            
            {saveSuccess && (
              <div className="p-4 bg-emerald-50 text-emerald-800 rounded-sm border border-emerald-200 text-xs font-bold flex items-start gap-2.5">
                <ShieldCheck size={16} className="shrink-0 mt-0.5" />
                <span>{saveSuccess}</span>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Código */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-black text-secondary uppercase tracking-widest">
                  Código de Receita <span className="text-rose-500">*</span>
                </label>
                <input 
                  type="text"
                  required
                  value={editCodigo}
                  onChange={(e) => setEditCodigo(e.target.value)}
                  className="px-4 py-2 bg-surface border border-outline-variant rounded-sm text-xs focus:ring-1 focus:ring-primary outline-none font-mono font-bold"
                  placeholder="Ex: 0561"
                />
              </div>

              {/* Situação */}
              <div className="flex flex-col gap-1.5 md:col-span-2">
                <label className="text-[10px] font-black text-secondary uppercase tracking-widest">
                  Situação Operacional
                </label>
                <div className="flex gap-4 mt-1">
                  <label className="flex items-center gap-2 text-xs font-bold text-on-surface cursor-pointer">
                    <input 
                      type="radio" 
                      name="editAtivo" 
                      checked={editAtivo === true}
                      onChange={() => setEditAtivo(true)}
                      className="text-primary focus:ring-primary"
                    />
                    <span>Ativo / Vigente</span>
                  </label>
                  <label className="flex items-center gap-2 text-xs font-bold text-on-surface cursor-pointer">
                    <input 
                      type="radio" 
                      name="editAtivo" 
                      checked={editAtivo === false}
                      onChange={() => setEditAtivo(false)}
                      className="text-rose-600 focus:ring-rose-500"
                    />
                    <span>Inativo / Extinto</span>
                  </label>
                </div>
              </div>
            </div>

            {/* Denominação */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-black text-secondary uppercase tracking-widest">
                Denominação Principal <span className="text-rose-500">*</span>
              </label>
              <textarea 
                required
                rows={3}
                value={editDenominacao}
                onChange={(e) => setEditDenominacao(e.target.value)}
                className="px-4 py-2 bg-surface border border-outline-variant rounded-sm text-xs focus:ring-1 focus:ring-primary outline-none font-medium min-h-[80px]"
                placeholder="Insira a descrição ou denominação do imposto, taxa ou contribuição..."
              />
            </div>

            {/* Bases Legais */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-black text-secondary uppercase tracking-widest">
                Bases Legais e Normas Regulamentadoras
              </label>
              <textarea 
                rows={2}
                value={editBaseLegalText}
                onChange={(e) => setEditBaseLegalText(e.target.value)}
                className="px-4 py-2 bg-surface border border-outline-variant rounded-sm text-xs focus:ring-1 focus:ring-primary outline-none font-medium text-secondary"
                placeholder="Insira as normas e portarias separadas por ponto-e-vírgula (;)"
              />
              <span className="text-[10px] text-outline font-medium">Use ponto-e-vírgula (;) para separar múltiplas bases legais (ex: IN RFB 999; Lei 12.345)</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Data de Criação */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-black text-secondary uppercase tracking-widest">
                  Data de Instituição/Criação
                </label>
                <div className="relative">
                  <input 
                    type="date"
                    value={editDtCriacao}
                    onChange={(e) => setEditDtCriacao(e.target.value)}
                    className="pl-4 pr-10 py-2 bg-surface border border-outline-variant rounded-sm text-xs focus:ring-1 focus:ring-primary outline-none w-full"
                  />
                </div>
              </div>

              {/* Data de Extinção */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-black text-secondary uppercase tracking-widest">
                  Data de Extinção / Baixa
                </label>
                <div className="relative">
                  <input 
                    type="date"
                    value={editDtExtincao}
                    onChange={(e) => setEditDtExtincao(e.target.value)}
                    className="pl-4 pr-10 py-2 bg-surface border border-outline-variant rounded-sm text-xs focus:ring-1 focus:ring-primary outline-none w-full"
                  />
                </div>
              </div>
            </div>
          </div>
          
          {/* Footer */}
          <div className="p-6 border-t border-outline-variant bg-surface-container/10 flex gap-3">
            <button 
              type="button"
              disabled={isSaving}
              className="flex-1 px-4 py-3 border border-outline-variant rounded bg-white hover:bg-surface-container transition-all text-xs font-bold text-secondary uppercase tracking-wider"
              onClick={() => setIsEditModalOpen(false)}
            >
              Cancelar
            </button>
            <button 
              type="submit"
              disabled={isSaving}
              className="flex-1 btn-primary py-3 text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2"
            >
              {isSaving ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  Salvando...
                </>
              ) : (
                "Salvar Alterações"
              )}
            </button>
          </div>
        </form>
      </div>
    );
  };

  return (
    <main className="p-8 space-y-8">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <p className="text-[10px] font-black text-[#1B365D] uppercase tracking-[0.2em] mb-2">
            Módulo Governamental & Auditoria
          </p>
          <h1 className="text-3xl font-black text-on-surface tracking-tighter leading-none italic uppercase flex items-center gap-2">
            Catálogo Códigos de Receita RFB
          </h1>
        </div>
      </div>

      <div className="card flex flex-col">
        {/* Filter Toolbar */}
        <div className="px-lg py-6 border-b border-outline-variant flex flex-col xl:flex-row xl:justify-between xl:items-center gap-4 bg-white">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-[#1B365D]/10 rounded-sm flex items-center justify-center text-[#1B365D]">
              <ShieldCheck size={20} />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-on-surface tracking-tight uppercase">Catálogo Auxiliar da Receita Federal</h2>
              <p className="text-[11px] text-secondary font-medium">Lista de códigos de recolhimento vigentes e baixados da administração tributária nacional</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Search Input */}
            <div className="relative flex-1 min-w-[240px] md:flex-initial">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-primary/50" size={14} />
              <input 
                type="text"
                placeholder="Buscar por código ou denominação..."
                className="pl-10 pr-4 py-2 bg-surface border border-outline-variant rounded-sm text-xs focus:ring-1 focus:ring-primary outline-none transition-all w-full md:w-80 font-medium"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                id="rfb-search-input"
              />
            </div>

            {/* Status Filter Select */}
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black text-secondary tracking-widest uppercase whitespace-nowrap">Situação:</span>
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="px-3 py-2 bg-surface text-xs font-bold text-on-surface border border-outline-variant rounded-sm focus:outline-none"
                id="rfb-status-select"
              >
                <option value="ativos">Vigentes (Ativos)</option>
                <option value="inativos">Baixados (Inativos)</option>
                <option value="todos">Todos</option>
              </select>
            </div>

            {/* Rows Limit Select */}
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black text-secondary tracking-widest uppercase whitespace-nowrap">Exibir:</span>
              <select
                value={limit}
                onChange={(e) => {
                  setLimit(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="px-3 py-2 bg-surface text-xs font-bold text-on-surface border border-outline-variant rounded-sm focus:outline-none"
                id="rfb-limit-select"
              >
                <option value={15}>15 por pág.</option>
                <option value={30}>30 por pág.</option>
                <option value={50}>50 por pág.</option>
                <option value={100}>100 por pág.</option>
              </select>
            </div>
          </div>
        </div>

        {/* Data Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface text-[10px] font-black text-secondary uppercase tracking-widest border-b border-outline-variant">
                <th className="px-lg py-4 border-b border-outline-variant w-28">Código</th>
                <th className="px-lg py-4 border-b border-outline-variant">Denominação</th>
                <th className="px-lg py-4 border-b border-outline-variant hidden md:table-cell w-[30%]">Base Legal</th>
                <th className="px-lg py-4 border-b border-outline-variant text-center w-28">Situação</th>
                <th className="px-lg py-4 border-b border-outline-variant text-right w-24">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="px-lg py-20 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <Loader2 size={32} className="animate-spin text-primary opacity-40" />
                      <span className="text-xs text-secondary font-bold">Consultando banco de dados...</span>
                    </div>
                  </td>
                </tr>
              ) : data.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-lg py-32 text-center text-xs text-secondary italic font-bold">
                    Nenhum código de receita federal encontrado na busca atual.
                  </td>
                </tr>
              ) : (
                data.map((row) => (
                  <tr key={row.id} className="hover:bg-surface-container/30 transition-all">
                    {/* Código de Receita */}
                    <td className="px-lg py-4 first-letter:">
                      <span className="text-sm font-black text-[#1B365D] font-mono bg-[#1B365D]/5 px-2.5 py-1 border border-outline-variant/50 rounded-sm inline-block">
                        {row.codigo}
                      </span>
                    </td>
                    {/* Denominação */}
                    <td className="px-lg py-4 text-xs font-bold text-on-surface max-w-md uppercase leading-relaxed">
                      {row.denominacao}
                    </td>
                    {/* Base Legal */}
                    <td className="px-lg py-4 text-xs text-secondary font-medium hidden md:table-cell max-w-[200px] truncate uppercase">
                      {row.baseLegal && row.baseLegal.length > 0 ? (
                        <span title={row.baseLegal.join(" | ")}>
                          {row.baseLegal[0]} {row.baseLegal.length > 1 ? `(+${row.baseLegal.length - 1})` : ""}
                        </span>
                      ) : (
                        "-"
                      )}
                    </td>
                    {/* Situação */}
                    <td className="px-lg py-4 text-center">
                      {row.ativo ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] uppercase font-black tracking-wide bg-emerald-50 text-emerald-700 border border-emerald-200">
                          Ativo
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] uppercase font-black tracking-wide bg-rose-50 text-rose-700 border border-rose-200">
                          Inativo
                        </span>
                      )}
                    </td>
                    {/* Ações */}
                    <td className="px-lg py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button 
                          className="p-2 hover:bg-white border border-outline-variant rounded transition-all flex items-center justify-center" 
                          onClick={() => openDetails(row)} 
                          title="Visualizar Informações Completas"
                          id={`view-details-${row.codigo}`}
                        >
                          <Eye size={14} className="text-secondary" />
                        </button>
                        <button 
                          className="p-2 hover:bg-white border hover:text-primary hover:border-primary/50 border-outline-variant rounded transition-all flex items-center justify-center" 
                          onClick={() => openEdit(row)} 
                          title="Editar Código de Receita"
                          id={`edit-record-${row.codigo}`}
                        >
                          <Pencil size={14} className="text-secondary hover:text-primary" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Panel */}
        {!isLoading && totalPages > 1 && (
          <div className="px-lg py-4 border-t border-outline-variant bg-surface-container/5 flex flex-col sm:flex-row justify-between items-center gap-4">
            <span className="text-xs text-secondary font-bold">
              Mostrando <span className="text-on-surface font-black">{data.length}</span> de <span className="text-on-surface font-black">{totalItems}</span> códigos cadastrados.
            </span>
            
            <div className="flex items-center gap-2">
              {/* Previous page button */}
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                className="p-2 border border-outline-variant rounded bg-white hover:bg-surface-container disabled:opacity-40 disabled:hover:bg-white transition-all flex items-center justify-center shrink-0 cursor-pointer"
                id="prev-page-btn"
                title="Página Anterior"
              >
                <ChevronLeft size={16} />
              </button>
              
              <span className="text-xs text-secondary font-bold px-3">
                Página <span className="text-on-surface font-black">{currentPage}</span> de <span className="text-on-surface font-black">{totalPages}</span>
              </span>

              {/* Next page button */}
              <button
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                className="p-2 border border-outline-variant rounded bg-white hover:bg-surface-container disabled:opacity-40 disabled:hover:bg-white transition-all flex items-center justify-center shrink-0 cursor-pointer"
                id="next-page-btn"
                title="Próxima Página"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>
      {renderDetailModal()}
      {renderEditModal()}
    </main>
  );
}

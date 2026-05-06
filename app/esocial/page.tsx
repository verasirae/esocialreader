"use client";

import React, { useState, useEffect } from "react";
import { 
  Search, 
  Download, 
  Plus, 
  Users, 
  BookOpen, 
  ShieldCheck, 
  Settings2, 
  ChevronDown, 
  Eye, 
  Pencil,
  History, 
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  CloudUpload,
  Loader2,
  FileText
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useModals } from "@/lib/contexts/ModalContext";

const tableCards = [
  { id: "01", icon: Users, label: "Tabela 01", sub: "Categorias de Trabalhadores", type: "OFICIAL", lastUpdate: "12/05/2024" },
  { id: "03", icon: BookOpen, label: "Tabela 03", sub: "Natureza de Rubricas", type: "OFICIAL", lastUpdate: "10/06/2024", active: true },
  { id: "05", icon: FileText, label: "Tabela 05", sub: "Tipos de Inscrição", type: "OFICIAL", lastUpdate: "10/06/2024" },
  { id: "21", icon: ShieldCheck, label: "Tabela 21", sub: "Código de Incidência Tributária", type: "OFICIAL", lastUpdate: "15/01/2024" },
  { id: "25", icon: BookOpen, label: "Tabela 25", sub: "Tipos de Benefícios", type: "OFICIAL", lastUpdate: "15/01/2024" },
  { id: "78", icon: ShieldCheck, label: "Tabela 78", sub: "Tipos de Dependentes", type: "OFICIAL", lastUpdate: "15/01/2024" },
  { id: "80", icon: Settings2, label: "Tabela 80", sub: "Naturezas Jurídicas", type: "OFICIAL", lastUpdate: "15/01/2024" },
  { id: "54", icon: Settings2, label: "Tabela 54", sub: "Regras de Validação", type: "CONFIG", lastUpdate: "02/06/2024" },
];

export default function EsocialTablesPage() {
  const [activeTab, setActiveTab] = useState("Auditoria S-5002");
  const [selectedTable, setSelectedTable] = useState("03");
  const [tableData, setTableData] = useState<any[]>([]);
  const [auditData, setAuditData] = useState<any[]>([]);
  const [empresasData, setEmpresasData] = useState<any[]>([]);
  const [trabalhadoresData, setTrabalhadoresData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [stats, setStats] = useState<any>(null);
  const [groupFilter, setGroupFilter] = useState("");

  const { openRegisterEmpresaModal, openRegisterTrabalhadorModal } = useModals();

  const [isDataModalOpen, setIsDataModalOpen] = useState(false);
  const [selectedRowDetail, setSelectedRowDetail] = useState<any>(null);

  useEffect(() => {
    fetchStats();
  }, []);

  useEffect(() => {
    const handleEmpresaRefresh = () => {
      fetchStats();
      if (activeTab === "Empregadores") {
        fetchEmpresasData(1, "");
      }
    };
    const handleTrabalhadorRefresh = () => {
      fetchStats();
      if (activeTab === "Trabalhadores") {
        fetchTrabalhadoresData(1, "");
      }
    };
    window.addEventListener("empresa-added", handleEmpresaRefresh);
    window.addEventListener("trabalhador-added", handleTrabalhadorRefresh);
    return () => {
      window.removeEventListener("empresa-added", handleEmpresaRefresh);
      window.removeEventListener("trabalhador-added", handleTrabalhadorRefresh);
    };
  }, [activeTab]);

  useEffect(() => {
    if (activeTab === "Auditoria S-5002") {
      fetchAuditData(currentPage, searchTerm);
    } else if (activeTab === "Empregadores") {
      fetchEmpresasData(currentPage, searchTerm);
    } else if (activeTab === "Trabalhadores") {
      fetchTrabalhadoresData(currentPage, searchTerm);
    } else {
      fetchTableData(currentPage, searchTerm, groupFilter);
    }
  }, [selectedTable, searchTerm, groupFilter, activeTab, currentPage]);

  const fetchStats = async () => {
    try {
      const res = await fetch("/api/esocial/stats");
      if (!res.ok) throw new Error("Erro ao carregar estatísticas");
      const data = await res.json();
      setStats(data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchAuditData = async (page: number, search: string) => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/esocial/s5002/list?page=${page}&search=${search}`);
      if (!res.ok) throw new Error("Erro ao carregar auditorias");
      const result = await res.json();
      if (result.data) {
        setAuditData(result.data);
        setTotalItems(result.total);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchTableData = async (page: number, search: string, group: string = "") => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/esocial/tables/${selectedTable}?page=${page}&search=${search}&group=${group}`);
      if (!res.ok) throw new Error("Erro ao carregar dados da tabela");
      const result = await res.json();
      if (result.data) {
        setTableData(result.data);
        setTotalItems(result.total);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchEmpresasData = async (page: number, search: string) => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/esocial/empresas?page=${page}&search=${search}`);
      if (!res.ok) throw new Error("Erro ao carregar empresas");
      const result = await res.json();
      if (result.data) {
        setEmpresasData(result.data);
        setTotalItems(result.total);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchTrabalhadoresData = async (page: number, search: string) => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/esocial/trabalhadores?page=${page}&search=${search}`);
      if (!res.ok) throw new Error("Erro ao carregar trabalhadores");
      const result = await res.json();
      if (result.data) {
        setTrabalhadoresData(result.data);
        setTotalItems(result.total);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleS5002Upload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    setIsUploading(true);
    const formData = new FormData();
    for (let i = 0; i < files.length; i++) {
      formData.append("files", files[i]);
    }

    try {
      const res = await fetch("/api/esocial/s5002/import", {
        method: "POST",
        body: formData,
      });
      
      const contentType = res.headers.get("content-type");
      let data;
      if (contentType && contentType.includes("application/json")) {
        data = await res.json();
      } else {
        const text = await res.text();
        throw new Error("Resposta inesperada do servidor: " + (text.substring(0, 100) || "Sem conteúdo"));
      }

      if (data.success) {
        alert(`Auditoria Concluída! Processados: ${data.processed}, Erros: ${data.errors}`);
        fetchAuditData(1, searchTerm);
        fetchStats();
        setActiveTab("Auditoria S-5002");
      } else {
        throw new Error(data.error || "Erro na importação");
      }
    } catch (err: any) {
      alert("Erro ao auditar arquivos: " + err.message);
    } finally {
      setIsUploading(false);
      if (e.target) e.target.value = "";
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, tableId: string = "54") => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setIsUploading(true);
    const formData = new FormData();
    formData.append("file", file);
    formData.append("tableId", tableId);

    try {
      const res = await fetch("/api/esocial/import", {
        method: "POST",
        body: formData,
      });
      
      const contentType = res.headers.get("content-type");
      let data;
      if (contentType && contentType.includes("application/json")) {
        data = await res.json();
      } else {
        const text = await res.text();
        throw new Error("Resposta inesperada do servidor: " + (text.substring(0, 100) || "Sem conteúdo"));
      }

      if (data.success) {
        alert(`Sucesso! Processados: ${data.processed}, Erros: ${data.errors}`);
        fetchTableData(currentPage, searchTerm);
        fetchStats();
      } else {
        throw new Error(data.error || "Erro na importação");
      }
    } catch (err: any) {
      alert("Erro ao importar arquivo: " + err.message);
    } finally {
      setIsUploading(false);
      if (e.target) e.target.value = "";
    }
  };

  const openDetails = (row: any) => {
    setSelectedRowDetail(row);
    setIsDataModalOpen(true);
  };

  const getStatusBadge = (row: any) => {
    // Logic based on real data now
    if (row.codIncIrrf === "11" || row.incidenciaExclusivaEmpregado === "S") return <span className="px-3 py-1 bg-emerald-50 text-emerald-600 text-[9px] font-bold uppercase rounded-full">Incidente</span>;
    if (row.codIncIrrf === "70" || row.codIncIrrf === "74") return <span className="px-3 py-1 bg-blue-50 text-blue-600 text-[9px] font-bold uppercase rounded-full">Isento</span>;
    if (row.tipoRubrica === "2") return <span className="px-3 py-1 bg-amber-50 text-amber-600 text-[9px] font-bold uppercase rounded-full">Dedução</span>;
    return <span className="px-3 py-1 bg-neutral-100 text-neutral-500 text-[9px] font-bold uppercase rounded-full">Informativa</span>;
  };

  const renderDataModal = () => {
    if (!isDataModalOpen || !selectedRowDetail) return null;

    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
        <div className="bg-white w-full max-w-2xl rounded-sm shadow-2xl flex flex-col max-h-[80vh] overflow-hidden border border-outline-variant">
          <div className="p-6 border-b border-outline-variant flex justify-between items-center bg-surface-container/10">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-primary rounded-sm flex items-center justify-center text-white">
                <FileText size={16} />
              </div>
              <div>
                <h3 className="font-extrabold text-on-surface text-lg tracking-tight">Detalhes do Registro</h3>
                <p className="text-[10px] font-black text-secondary uppercase tracking-widest">Código: {selectedRowDetail.codigo || selectedRowDetail.codRubrica}</p>
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
                if (key === "id") return null;
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
            {(activeTab === "Empregadores" || activeTab === "Trabalhadores") && (
              <button 
                className="btn-outline px-6 bg-white border-primary/20 text-primary hover:bg-primary/5 flex items-center justify-center gap-2"
                onClick={() => {
                  if (activeTab === "Empregadores") openRegisterEmpresaModal(selectedRowDetail);
                  if (activeTab === "Trabalhadores") openRegisterTrabalhadorModal(selectedRowDetail);
                  setIsDataModalOpen(false);
                }}
              >
                <Pencil size={14} />
                Editar Registro
              </button>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderContent = () => {
    if (activeTab === "Empregadores") {
      return (
        <div className="card flex flex-col">
          <div className="px-lg py-6 border-b border-outline-variant flex justify-between items-center bg-white">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-primary/10 rounded-sm flex items-center justify-center text-primary">
                <Settings2 size={20} />
              </div>
              <div>
                <h2 className="text-base font-extrabold text-on-surface tracking-tight">Base de Empregadores</h2>
                <p className="text-[11px] text-secondary font-medium">Gestão de CNPJs e filiais identificadas nos eventos</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-primary" size={14} />
                <input 
                  type="text"
                  placeholder="Buscar por CNPJ..."
                  className="pl-10 pr-4 py-2 bg-surface border border-outline-variant rounded-sm text-xs focus:ring-1 focus:ring-primary outline-none transition-all w-64"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <button 
                className="btn-primary flex items-center gap-2 py-2"
                onClick={() => openRegisterEmpresaModal()}
              >
                <Plus size={14} />
                <span>Novo Empregador</span>
              </button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-surface text-[10px] font-black text-secondary uppercase tracking-widest">
                  <th className="px-lg py-4 border-b border-outline-variant">CNPJ Raiz</th>
                  <th className="px-lg py-4 border-b border-outline-variant">Razão Social</th>
                  <th className="px-lg py-4 border-b border-outline-variant">CNPJ Completo</th>
                  <th className="px-lg py-4 border-b border-outline-variant text-center">Eventos Processados</th>
                  <th className="px-lg py-4 border-b border-outline-variant text-center">Data Cadastro</th>
                  <th className="px-lg py-4 border-b border-outline-variant text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant">
                {isLoading ? (
                  <tr>
                    <td colSpan={6} className="px-lg py-20 text-center"><Loader2 size={32} className="animate-spin text-primary inline-block opacity-20" /></td>
                  </tr>
                ) : empresasData.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-lg py-32 text-center text-xs text-secondary italic font-bold">Nenhuma empresa encontrada.</td>
                  </tr>
                ) : (
                  empresasData.map((empresa: any) => (
                    <tr key={empresa.id} className="hover:bg-surface-container/30 transition-all">
                      <td className="px-lg py-5 text-sm font-black text-primary">{empresa.cnpjRaiz}</td>
                      <td className="px-lg py-5 text-sm font-bold text-on-surface uppercase">{empresa.razaoSocial}</td>
                      <td className="px-lg py-5 text-sm text-secondary font-medium">{empresa.cnpjCompleto}</td>
                      <td className="px-lg py-5 text-sm font-black text-on-surface text-center tabular-nums">
                        {empresa._count?.eventos || 0}
                      </td>
                      <td className="px-lg py-5 text-sm text-secondary text-center">
                        {new Date(empresa.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-lg py-5 text-right flex justify-end gap-2">
                         <button className="p-2 hover:bg-white border border-outline-variant rounded transition-all" onClick={() => openDetails(empresa)} title="Ver detalhes">
                            <Eye size={14} className="text-secondary" />
                         </button>
                         <button className="p-2 hover:bg-white border border-primary/20 rounded transition-all" onClick={() => openRegisterEmpresaModal(empresa)} title="Editar">
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
      );
    }

    if (activeTab === "Trabalhadores") {
      return (
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
                    <td colSpan={5} className="px-lg py-20 text-center"><Loader2 size={32} className="animate-spin text-primary inline-block opacity-20" /></td>
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
      );
    }

    if (activeTab === "Auditoria S-5002") {
      return (
        <div className="card flex flex-col">
          <div className="px-lg py-6 border-b border-outline-variant flex justify-between items-center bg-white">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-primary/10 rounded-sm flex items-center justify-center text-primary">
                <ShieldCheck size={20} />
              </div>
              <div>
                <h2 className="text-base font-extrabold text-on-surface tracking-tight">Painel de Auditoria S-5002</h2>
                <p className="text-[11px] text-secondary font-medium italic">Cruzamento de base calculada vs base XML informada</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-primary" size={14} />
                <input 
                  type="text"
                  placeholder="Buscar CPF ou CNPJ..."
                  className="pl-10 pr-4 py-2 bg-surface border border-outline-variant rounded-sm text-xs focus:ring-1 focus:ring-primary outline-none transition-all w-64"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <button 
                className="btn-primary flex items-center gap-2 py-2"
                onClick={() => document.getElementById("s5002-upload")?.click()}
              >
                <CloudUpload size={14} />
                <span>Auditar XMLs</span>
                <input id="s5002-upload" type="file" multiple className="hidden" accept=".xml" onChange={handleS5002Upload} />
              </button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-surface text-[10px] font-black text-secondary uppercase tracking-widest">
                  <th className="px-lg py-4 border-b border-outline-variant">Competência</th>
                  <th className="px-lg py-4 border-b border-outline-variant">CPF / Trabalhador</th>
                  <th className="px-lg py-4 border-b border-outline-variant text-center">B. Cálc. Sistema</th>
                  <th className="px-lg py-4 border-b border-outline-variant text-center">B. Cálc. XML</th>
                  <th className="px-lg py-4 border-b border-outline-variant text-center">Divergência</th>
                  <th className="px-lg py-4 border-b border-outline-variant text-center">Status Auditoria</th>
                  <th className="px-lg py-4 border-b border-outline-variant text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant">
                {isLoading ? (
                  <tr>
                    <td colSpan={7} className="px-lg py-20 text-center"><Loader2 size={32} className="animate-spin text-primary inline-block opacity-20" /></td>
                  </tr>
                ) : auditData.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-lg py-32 text-center text-xs text-secondary italic font-bold uppercase tracking-widest opacity-40">Nenhum evento auditado ainda. Importe arquivos XML S-5002.</td>
                  </tr>
                ) : (
                  auditData.map((event: any) => (
                    <tr key={event.id} className="hover:bg-surface-container/30 transition-all group">
                      <td className="px-lg py-5 text-sm font-bold text-on-surface">
                        {new Date(event.competencia).toLocaleDateString('pt-BR', { month: '2-digit', year: 'numeric' })}
                      </td>
                      <td className="px-lg py-5">
                         <div className="flex flex-col">
                           <span className="text-sm font-bold text-primary">{event.trabalhador.cpf}</span>
                           <span className="text-[10px] text-secondary font-black uppercase tracking-tight">{event.trabalhador.nome}</span>
                         </div>
                      </td>
                      <td className="px-lg py-5 text-sm font-black text-on-surface text-center tabular-nums">
                        R$ {Number(event.audit.calcBase).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-lg py-5 text-sm font-black text-on-surface text-center tabular-nums">
                        R$ {Number(event.audit.xmlBase).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </td>
                      <td className={cn(
                        "px-lg py-5 text-sm font-black text-center tabular-nums",
                        event.audit.status === "Divergente" ? "text-error" : "text-emerald-600"
                      )}>
                        R$ {Number(event.audit.diff).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-lg py-5 text-center">
                         <span className={cn(
                           "px-3 py-1 text-[9px] font-bold uppercase rounded-full",
                           event.audit.status === "Regular" ? "bg-emerald-50 text-emerald-600" : "bg-error/10 text-error"
                         )}>
                           {event.audit.status}
                         </span>
                         {event.audit.healthPlanError && (
                           <span className="block mt-1 text-[8px] font-black text-error uppercase tracking-tighter">Erro de Plano de Saúde</span>
                         )}
                      </td>
                      <td className="px-lg py-5 text-right">
                         <button 
                           className="p-2 bg-surface hover:bg-white border border-outline-variant rounded transition-all opacity-0 group-hover:opacity-100 shadow-sm"
                           onClick={() => openDetails(event)}
                         >
                            <Eye size={14} className="text-primary" />
                         </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      );
    }

    if (activeTab === "Histórico") {
      return (
        <div className="card flex flex-col">
          <div className="px-lg py-6 border-b border-outline-variant flex justify-between items-center bg-white">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-surface-container rounded-sm flex items-center justify-center text-primary-container">
                <History size={20} />
              </div>
              <div>
                <h2 className="text-base font-extrabold text-on-surface tracking-tight">Histórico de Importações</h2>
                <p className="text-[11px] text-secondary font-medium">Logs detalhados de processamento de tabelas CSV</p>
              </div>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-surface text-[10px] font-black text-secondary uppercase tracking-widest">
                  <th className="px-lg py-4 border-b border-outline-variant">Data/Hora</th>
                  <th className="px-lg py-4 border-b border-outline-variant">Arquivo</th>
                  <th className="px-lg py-4 border-b border-outline-variant">Tabela</th>
                  <th className="px-lg py-4 border-b border-outline-variant text-center">Processados</th>
                  <th className="px-lg py-4 border-b border-outline-variant text-center">Erros</th>
                  <th className="px-lg py-4 border-b border-outline-variant text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant">
                {stats?.logs?.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-lg py-20 text-center text-xs text-secondary italic">Nenhum log encontrado.</td>
                  </tr>
                ) : (
                  stats?.logs?.map((log: any) => (
                    <tr key={log.id} className="hover:bg-surface-container/30 transition-all">
                      <td className="px-lg py-5 text-sm text-on-surface">{new Date(log.createdAt).toLocaleString()}</td>
                      <td className="px-lg py-5 text-sm font-bold text-primary">{log.fileName}</td>
                      <td className="px-lg py-5 text-sm text-secondary">Tabela {log.tableId}</td>
                      <td className="px-lg py-5 text-sm text-center font-bold text-emerald-600">{log.processed}</td>
                      <td className="px-lg py-5 text-sm text-center font-bold text-error">{log.errors}</td>
                      <td className="px-lg py-5 text-right">
                        <span className={cn(
                          "px-3 py-1 text-[9px] font-bold uppercase rounded-full",
                          log.status === "Sucesso" ? "bg-emerald-50 text-emerald-600" : "bg-amber-50 text-amber-600"
                        )}>
                          {log.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      );
    }

    if (activeTab === "Relatórios") {
      return (
        <div className="grid grid-cols-2 gap-8">
          <div className="card p-10 flex flex-col gap-6">
            <h3 className="text-xl font-black text-on-surface tracking-tight italic flex items-center gap-2">
              <TrendingUp className="text-emerald-600" size={24} />
              Resumo da Base de Dados
            </h3>
            <div className="grid grid-cols-2 gap-4">
               <div className="p-6 bg-primary/5 rounded-sm border border-primary/10 flex flex-col gap-2">
                  <span className="text-[10px] font-black text-secondary uppercase tracking-[0.2em]">Total Empregadores</span>
                  <span className="text-3xl font-black text-primary tabular-nums">{(stats?.empresasTotal || 0).toLocaleString()}</span>
               </div>
               <div className="p-6 bg-primary/5 rounded-sm border border-primary/10 flex flex-col gap-2">
                  <span className="text-[10px] font-black text-secondary uppercase tracking-[0.2em]">Total Trabalhadores</span>
                  <span className="text-3xl font-black text-primary tabular-nums">{(stats?.trabalhadoresTotal || 0).toLocaleString()}</span>
               </div>
            </div>
            <div className="space-y-4">
              {tableCards.map(card => (
                <div key={card.id} className="flex justify-between items-center p-4 bg-surface rounded-sm border border-outline-variant">
                  <div className="flex items-center gap-3">
                    <card.icon size={18} className="text-primary" />
                    <span className="text-sm font-bold text-on-surface">{card.label}</span>
                  </div>
                  <span className="text-sm font-black text-primary">
                    {stats?.tabelas?.[`t${card.id}`] || 0} reg.
                  </span>
                </div>
              ))}
            </div>
          </div>
          <div className="card p-20 flex flex-col items-center justify-center text-center gap-4 opacity-70 border-dashed border-2">
             <ShieldCheck size={48} className="text-primary-container mb-2" />
             <h2 className="text-lg font-bold text-on-surface">Auditoria de Consistência</h2>
             <p className="max-w-xs text-xs text-secondary font-medium">O motor de auditoria não detectou inconsistências críticas nas tabelas importadas até o momento.</p>
          </div>
        </div>
      );
    }

    return (
      <>
        {/* Table Structure Cards */}
        <div className="grid grid-cols-4 gap-6">
          {tableCards.map((card) => {
            const isSelected = selectedTable === card.id;
            const count = stats?.tabelas?.[`t${card.id}`] || 0;
            return (
              <div 
                key={card.id}
                onClick={() => setSelectedTable(card.id)}
                className={cn(
                  "card p-6 flex flex-col gap-4 cursor-pointer transition-all relative overflow-hidden group hover:shadow-lg hover:border-primary/30",
                  isSelected ? "border-primary border-2 ring-1 ring-primary/20" : ""
                )}
              >
                {isSelected && (
                  <div className="absolute top-0 right-0 px-3 py-1 bg-primary text-white text-[9px] font-black uppercase tracking-tighter rounded-bl-lg">
                    Ativo
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <div className="p-2 bg-surface-container rounded-sm text-primary-container group-hover:bg-primary/5 transition-colors">
                    <card.icon size={24} strokeWidth={2} />
                  </div>
                  <span className="text-[10px] font-black text-outline uppercase tracking-widest">{card.type}</span>
                </div>
                <div>
                    <h3 className="font-extrabold text-on-surface text-base">{card.label}</h3>
                    <p className="text-xs text-secondary font-medium leading-tight">{card.sub}</p>
                    <p className="text-[10px] font-bold text-primary mt-2 uppercase tracking-wide">{count} registros</p>
                </div>
                <div className="pt-4 border-t border-outline-variant flex items-center gap-2 text-secondary">
                    <History size={12} className="opacity-60" />
                    <span className="text-[10px] font-medium italic">Atualizado em {card.lastUpdate}</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Detail Section */}
        <section className="card flex flex-col">
          <div className="px-lg py-6 border-b border-outline-variant flex justify-between items-center bg-white">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-surface-container rounded-sm flex items-center justify-center text-primary-container">
                <FileText size={20} />
              </div>
              <div>
                <h2 className="text-base font-extrabold text-on-surface tracking-tight">Detalhamento: {tableCards.find(c => c.id === selectedTable)?.sub || `Tabela ${selectedTable}`}</h2>
                <p className="text-[11px] text-secondary font-medium">Exibindo {tableData.length} registros (tamanho da página: 10) de um total de {totalItems}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {selectedTable === "01" && (
                <div className="relative group">
                  <select 
                    className="appearance-none px-4 py-2 bg-surface border border-outline-variant rounded-sm text-xs font-bold text-on-surface hover:bg-surface-container transition-all pr-10 outline-none focus:ring-1 focus:ring-primary cursor-pointer"
                    value={groupFilter}
                    onChange={(e) => setGroupFilter(e.target.value)}
                  >
                    <option value="">Filtrar p/ Grupo</option>
                    <option value="1">Grupo 1</option>
                    <option value="2">Grupo 2</option>
                    <option value="3">Grupo 3</option>
                    <option value="4">Grupo 4</option>
                  </select>
                  <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-outline pointer-events-none" />
                </div>
              )}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-primary" size={14} />
                <input 
                  type="text"
                  placeholder="Buscar..."
                  className="pl-10 pr-4 py-2 bg-surface border border-outline-variant rounded-sm text-xs focus:ring-1 focus:ring-primary outline-none transition-all w-48"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-surface text-[10px] font-black text-secondary uppercase tracking-widest">
                  <th className="px-lg py-4 border-b border-outline-variant">Código</th>
                  {selectedTable === "54" ? (
                    <>
                      <th className="px-lg py-4 border-b border-outline-variant">Nome Rubrica</th>
                      <th className="px-lg py-4 border-b border-outline-variant text-center">Nat. Rubrica</th>
                      <th className="px-lg py-4 border-b border-outline-variant text-center">Inc. IRRF</th>
                      <th className="px-lg py-4 border-b border-outline-variant text-center">Inc. CP</th>
                      <th className="px-lg py-4 border-b border-outline-variant text-center">Inc. FGTS</th>
                    </>
                  ) : selectedTable === "01" ? (
                    <>
                      <th className="px-lg py-4 border-b border-outline-variant">Descrição</th>
                      <th className="px-lg py-4 border-b border-outline-variant text-center">Grupo</th>
                      <th className="px-lg py-4 border-b border-outline-variant text-center">Alíq. FGTS</th>
                    </>
                  ) : selectedTable === "03" ? (
                    <>
                      <th className="px-lg py-4 border-b border-outline-variant">Nome Natureza</th>
                      <th className="px-lg py-4 border-b border-outline-variant text-center">Inc. Excl. Emp.</th>
                    </>
                  ) : (
                    <th className="px-lg py-4 border-b border-outline-variant">Descrição</th>
                  )}
                  <th className="px-lg py-4 border-b border-outline-variant text-center">Início Validade</th>
                  <th className="px-lg py-4 border-b border-outline-variant text-center">Fim Validade</th>
                  <th className="px-lg py-4 border-b border-outline-variant text-center">Status Tributário</th>
                  <th className="px-lg py-4 border-b border-outline-variant text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant">
                {isLoading ? (
                  <tr>
                    <td colSpan={selectedTable === "54" ? 10 : 6} className="px-lg py-20 text-center">
                      <div className="flex flex-col items-center gap-3">
                        <Loader2 size={32} className="animate-spin text-primary opacity-20" />
                        <p className="text-xs font-bold text-secondary uppercase tracking-widest">Carregando dados...</p>
                      </div>
                    </td>
                  </tr>
                ) : tableData.length === 0 ? (
                  <tr>
                    <td colSpan={selectedTable === "54" ? 10 : 6} className="px-lg py-20 text-center">
                      <p className="text-xs text-secondary font-bold uppercase tracking-widest italic opacity-60">Nenhum registro encontrado</p>
                    </td>
                  </tr>
                ) : (
                  tableData.map((row) => (
                    <tr key={row.id} className="hover:bg-surface-container/30 transition-all group">
                      <td className="px-lg py-5 text-sm font-bold text-primary">{row.codigo || row.codRubrica}</td>
                      
                      {selectedTable === "54" ? (
                        <>
                          <td className="px-lg py-5 text-sm font-bold text-on-surface leading-tight max-w-xs truncate" title={row.nomeRubrica}>
                            {row.nomeRubrica || "-"}
                          </td>
                          <td className="px-lg py-5 text-sm text-secondary font-bold text-center">
                            {row.natRubrica || "-"}
                          </td>
                          <td className="px-lg py-5 text-sm text-secondary font-bold text-center">
                            {row.codIncIrrf || "-"}
                          </td>
                          <td className="px-lg py-5 text-sm text-secondary font-bold text-center">
                            {row.codIncCp || "-"}
                          </td>
                          <td className="px-lg py-5 text-sm text-secondary font-bold text-center">
                            {row.codIncFgts || "-"}
                          </td>
                        </>
                      ) : selectedTable === "01" ? (
                        <>
                          <td className="px-lg py-5 text-sm font-bold text-on-surface leading-tight max-w-xs truncate">
                            {row.descricao}
                          </td>
                          <td className="px-lg py-5 text-sm text-secondary font-bold text-center">
                            {row.grupo || "-"}
                          </td>
                          <td className="px-lg py-5 text-sm text-secondary font-bold text-center">
                            {row.aliqFgts || "0%"}
                          </td>
                        </>
                      ) : selectedTable === "03" ? (
                        <>
                          <td className="px-lg py-5 text-sm font-bold text-on-surface leading-tight max-w-xs truncate">
                            {row.nome || "-"}
                          </td>
                          <td className="px-lg py-5 text-sm text-secondary font-bold text-center">
                            {row.incidenciaExclusivaEmpregado || "N"}
                          </td>
                        </>
                      ) : (
                        <td className="px-lg py-5 text-sm font-bold text-on-surface leading-tight max-w-md">
                          {row.descricao || "-"}
                        </td>
                      )}

                      <td className="px-lg py-5 text-sm text-secondary font-medium text-center">
                        {row.dtInicio ? new Date(row.dtInicio).toLocaleDateString() : "-"}
                      </td>
                      <td className="px-lg py-5 text-sm text-secondary font-medium text-center">
                        {row.dtFim && new Date(row.dtFim).getFullYear() > 1970 ? new Date(row.dtFim).toLocaleDateString() : "-"}
                      </td>
                      <td className="px-lg py-5 text-center">
                        {getStatusBadge(row)}
                      </td>
                      <td className="px-lg py-5 text-right">
                         <button 
                          className="p-2 bg-surface hover:bg-white border border-outline-variant rounded transition-all opacity-0 group-hover:opacity-100 shadow-sm"
                          title="Ver detalhes técnicos"
                          onClick={() => openDetails(row)}
                        >
                            <Eye size={14} className="text-primary" />
                         </button>
                         <button 
                           className="p-2 bg-surface hover:bg-white border border-outline-variant rounded transition-all opacity-0 group-hover:opacity-100 shadow-sm"
                           title="Editar Registro"
                           onClick={() => {
                             setSelectedRowDetail(row);
                             setIsDataModalOpen(true);
                           }}
                         >
                            <Settings2 size={14} className="text-secondary" />
                         </button>
                         <button 
                           className="p-2 bg-surface hover:bg-white border border-outline-variant rounded transition-all opacity-0 group-hover:opacity-100 shadow-sm"
                           title="Excluir Registro"
                           onClick={() => alert("Ação de exclusão restrita a administradores.")}
                         >
                            <Plus size={14} className="text-error rotate-45" />
                         </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="px-lg py-8 border-t border-outline-variant bg-surface-container/10 flex items-center justify-between">
            <p className="text-[11px] text-secondary font-bold italic">
              Mostrando {tableData.length > 0 ? (currentPage - 1) * 10 + 1 : 0}-{Math.min(currentPage * 10, totalItems)} de {totalItems} registros
            </p>
            <div className="flex items-center gap-2">
               <button 
                className="w-10 h-10 rounded border border-outline-variant flex items-center justify-center hover:bg-white text-secondary transition-all disabled:opacity-30"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
               >
                  <ChevronLeft size={20} />
               </button>
               <div className="flex items-center gap-1">
                 {[...Array(Math.min(5, Math.ceil(totalItems / 10)))].map((_, i) => {
                   const pageNum = i + 1;
                   return (
                     <button 
                       key={pageNum}
                       onClick={() => setCurrentPage(pageNum)}
                       className={cn(
                        "w-10 h-10 rounded font-bold flex items-center justify-center transition-all",
                        currentPage === pageNum ? "bg-primary text-white shadow-md" : "border border-outline-variant hover:bg-white text-secondary"
                       )}
                     >
                       {pageNum}
                     </button>
                   );
                 })}
               </div>
               <button 
                className="w-10 h-10 rounded border border-outline-variant flex items-center justify-center hover:bg-white text-secondary transition-all disabled:opacity-30"
                disabled={currentPage >= Math.ceil(totalItems / 10)}
                onClick={() => setCurrentPage(prev => Math.min(Math.ceil(totalItems / 10), prev + 1))}
               >
                  <ChevronRight size={20} />
               </button>
            </div>
          </div>
        </section>

        {/* Footer Stats & Upload */}
        <div className="grid grid-cols-12 gap-8 items-stretch pt-4">
          {/* Progress Display */}
          <div className="col-span-8 card p-10 flex flex-col gap-10">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-emerald-50 rounded-sm text-emerald-600">
                  <TrendingUp size={24} />
                </div>
                <div>
                  <h3 className="text-xl font-extrabold text-on-surface tracking-tight italic">Impacto no Motor de Interpretação</h3>
                  <p className="text-[10px] font-black text-emerald-600 uppercase tracking-[0.2em] mt-1">Status: Saudável</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-10">
              <div className="flex flex-col gap-4">
                <span className="text-[10px] font-black text-secondary uppercase tracking-widest">S-5002 Auditados</span>
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-black text-on-surface tabular-nums leading-none">
                    {(stats?.s5002Total || 0).toLocaleString()}
                  </span>
                </div>
                <div className="w-full h-1.5 bg-surface-container rounded-full overflow-hidden">
                  <div className="h-full bg-primary w-full rounded-full"></div>
                </div>
              </div>

              <div className="flex flex-col gap-4">
                <span className="text-[10px] font-black text-secondary uppercase tracking-widest">Divergências IRRF</span>
                <div className="flex items-baseline gap-2">
                  <span className={cn(
                    "text-4xl font-black tabular-nums leading-none",
                    (stats?.divergenciasIrrf || 0) > 0 ? "text-error" : "text-emerald-600"
                  )}>
                    {String(stats?.divergenciasIrrf || 0).padStart(2, '0')}
                  </span>
                </div>
                <div className="w-full h-1.5 bg-surface-container rounded-full overflow-hidden">
                  <div className={cn(
                    "h-full rounded-full",
                    (stats?.divergenciasIrrf || 0) > 0 ? "bg-error w-[15%]" : "bg-emerald-500 w-0"
                  )}></div>
                </div>
              </div>

              <div className="flex flex-col gap-4">
                <span className="text-[10px] font-black text-secondary uppercase tracking-widest flex items-center gap-2">
                  Processamento Batch (24h)
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
                </span>
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-black text-emerald-600 tabular-nums leading-none">
                    {(stats?.batchTotal || 0).toLocaleString()}
                  </span>
                  <span className="text-[10px] font-bold text-secondary uppercase">Registros</span>
                </div>
                <div className="w-full h-1.5 bg-surface-container rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500 w-full rounded-full"></div>
                </div>
              </div>
            </div>
          </div>

          {/* Rapid Update / Dropzone */}
          <div className="col-span-4 bg-[#1B365D] rounded-sm p-1 shadow-2xl relative group overflow-hidden">
            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
            <div className="relative h-full flex flex-col p-8 bg-[#1B365D]/90 z-10">
                <h3 className="text-white text-xl font-extrabold tracking-tight italic mb-2">Atualização Rápida</h3>
                <p className="text-on-primary-container text-[11px] font-medium leading-relaxed mb-10">
                  Arraste o arquivo CSV de rubricas atualizado para processar imediatamente pelo motor fiscal.
                </p>

                <div 
                  className="flex-1 border-2 border-dashed border-white/20 rounded-sm flex flex-col items-center justify-center text-center gap-4 hover:bg-white/5 transition-all cursor-pointer group/drop"
                  onClick={() => document.getElementById("footer-upload")?.click()}
                >
                    <div className="p-4 bg-white/10 rounded-full text-white group-hover/drop:scale-110 transition-transform">
                      {isUploading ? <Loader2 size={32} className="animate-spin" /> : <CloudUpload size={32} />}
                    </div>
                    <div>
                      <p className="text-white font-bold text-xs uppercase tracking-widest">Soltar CSV aqui</p>
                      <p className="text-white/40 text-[9px] font-black uppercase mt-1">Ou clique para buscar</p>
                    </div>
                    <input id="footer-upload" type="file" className="hidden" onChange={(e) => handleFileUpload(e, "54")} />
                </div>
            </div>
          </div>
        </div>
      </>
    );
  };

  return (
    <div className="flex flex-col gap-8 -mt-margin-page -mx-margin-page p-margin-page h-full bg-[#FAF9FC]">
      {renderDataModal()}
      {/* Top Header Section */}
      <div className="flex items-center justify-between border-b border-outline-variant bg-white px-8 -mx-8 -mt-8 py-6 h-auto min-h-24 sticky top-0 z-30 shadow-sm transition-all">
        <div className="flex items-center gap-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-outline" size={16} />
            <input 
              type="text" 
              placeholder="Buscar código ou rubrica..." 
              className="bg-surface pl-10 pr-4 py-2 w-80 text-sm outline-none focus:ring-1 focus:ring-primary rounded-sm transition-all"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <nav className="flex items-center h-full">
          {["Auditoria S-5002", "Empregadores", "Trabalhadores", "Tabelas", "Histórico", "Relatórios"].map((tab) => (
            <button
              key={tab}
              onClick={() => {
                setActiveTab(tab);
                setCurrentPage(1);
              }}
              className={cn(
                "px-6 h-full text-sm font-semibold relative transition-colors",
                activeTab === tab ? "text-primary after:absolute after:bottom-0 after:left-0 after:right-0 after:h-1 after:bg-primary" : "text-secondary hover:text-on-surface"
              )}
            >
              {tab}
            </button>
          ))}
        </nav>

        <div className="flex items-center gap-4">
           <div className="w-8 h-8 rounded-full bg-primary-container text-white flex items-center justify-center font-bold text-xs">JD</div>
        </div>
      </div>

      {/* Main Content Title */}
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-3xl font-extrabold text-on-surface tracking-tight">Tabelas eSocial</h1>
          <p className="text-sm text-secondary font-medium mt-1">Consulte as tabelas oficiais e parametrize o motor de interpretação de tributos.</p>
        </div>
        <div className="flex gap-3">
          <button 
            className="btn-outline flex items-center gap-2 bg-white" 
            onClick={() => window.open(`/api/esocial/export?tableId=${selectedTable}`, "_blank")}
          >
            <Download size={16} />
            <span>Exportar Tudo</span>
          </button>
          <button className="btn-primary flex items-center gap-2" onClick={() => document.getElementById("header-upload")?.click()}>
            <Plus size={16} />
            <span>Importar CSV</span>
            <input id="header-upload" type="file" className="hidden" onChange={(e) => handleFileUpload(e, selectedTable)} />
          </button>
        </div>
      </div>

      {renderContent()}
      {renderDataModal()}

      {/* System Footer */}
      <footer className="mt-8 border-t border-outline-variant pt-8 pb-4 flex items-center justify-between text-[10px] font-black text-outline uppercase tracking-widest">
         <div className="flex items-center gap-4">
            <span className="text-primary-container">FISCALHUB ENTERPRISE</span>
            <span className="text-secondary opacity-40">© 2024 eSocial Audit IR</span>
         </div>
         <div className="flex items-center gap-8">
            <span className="hover:text-primary transition-colors cursor-pointer">Termos de Uso</span>
            <span className="hover:text-primary transition-colors cursor-pointer">Privacidade</span>
            <div className="w-[1px] h-3 bg-outline-variant"></div>
            <div className="flex items-center gap-2 text-emerald-600">
               <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
               <span>Servidor: Produção AWS-SA-1</span>
            </div>
         </div>
      </footer>
    </div>
  );
}

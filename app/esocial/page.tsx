"use client";

import React, { useState, useEffect, Suspense } from "react";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer 
} from "recharts";
import { motion } from "motion/react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
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
  FileText,
  AlertCircle,
  X,
  CheckCheck,
  Calendar
} from "lucide-react";
import { cn, safeJsonFetch } from "@/lib/utils";
import { useModals } from "@/lib/contexts/ModalContext";
import LoadingSpinner from "@/components/LoadingSpinner";
import { gerarInformePDF } from "@/lib/pdf-generator";

const tableCards = [
  { id: "01", icon: Users, label: "Tabela 01", sub: "Categorias de Trabalhadores - eSocial", type: "OFICIAL", lastUpdate: "12/05/2024" },
  { id: "02", icon: ShieldCheck, label: "Tabela 02", sub: "Financiamento da Aposentadoria Especial e Redução do Tempo de Contribuição", type: "OFICIAL", lastUpdate: "10/06/2026" },
  { id: "03", icon: BookOpen, label: "Tabela 03", sub: "Tabela de Natureza das Rubricas da Folha de Pagamento - eSocial", type: "OFICIAL", lastUpdate: "10/06/2024", active: true },
  { id: "04", icon: FileText, label: "Tabela 04", sub: "Códigos e Alíquotas de FPAS/Terceiros", type: "OFICIAL", lastUpdate: "10/06/2026" },
  { id: "05", icon: FileText, label: "Tabela 05", sub: "Tipos de Inscrição - eSocial", type: "OFICIAL", lastUpdate: "10/06/2024" },
  { id: "06", icon: BookOpen, label: "Tabela 06", sub: "Tabela de Países do eSocial", type: "OFICIAL", lastUpdate: "10/06/2026" },
  { id: "08", icon: ShieldCheck, label: "Tabela 08", sub: "Classificação Tributária", type: "OFICIAL", lastUpdate: "10/06/2026" },
  { id: "09", icon: FileText, label: "Tabela 09", sub: "Tipos de Arquivo", type: "OFICIAL", lastUpdate: "10/06/2026" },
  { id: "21", icon: ShieldCheck, label: "Tabela 21", sub: "Códigos de Incidência Tributária da Rubrica para IRRF", type: "OFICIAL", lastUpdate: "15/01/2024" },
  { id: "25", icon: BookOpen, label: "Tabela 25", sub: "Tipos de Dependente - eSocial", type: "OFICIAL", lastUpdate: "15/01/2024" },
  { id: "54", icon: Settings2, label: "Tabela 54", sub: "Tabela de Rubricas do eSocial", type: "CONFIG", lastUpdate: "02/06/2024" },
  { id: "78", icon: ShieldCheck, label: "Tabela 78", sub: "Tabela de Código de Receita - Totalizadores - eSocial", type: "OFICIAL", lastUpdate: "15/01/2024" },
  { id: "80", icon: Settings2, label: "Tabela 80", sub: "Tabela de Tipo de Valor de Imposto de Renda - Totalizadores - eSocial", type: "OFICIAL", lastUpdate: "15/01/2024" },
];

export default function EsocialTablesPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center p-20"><LoadingSpinner /></div>}>
      <EsocialTablesContent />
    </Suspense>
  );
}

function EsocialTablesContent() {
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState("Auditoria S-5002");

  const tabMetadata: Record<string, { title: string; subtitle: string }> = {
    "Auditoria S-5002": {
      title: "Auditoria S-5002",
      subtitle: "Audite as bases de cálculo e IRRF contra os registros oficiais do governo.",
    },
    "Conferência DIRF": {
      title: "Conferência Anual DIRF",
      subtitle: "Verifique os acumulados mensais consolidados por trabalhador e dependente para a DIRF.",
    },
    "Consolidação Anual": {
      title: "Consolidação Anual S-5002",
      subtitle: "Gere e consolide os lastros para os informes de rendimentos anuais.",
    },
    "Divergências Fiscais": {
      title: "Divergências Fiscais",
      subtitle: "Monitore e saneie inconsistências de cálculos e cadastros identificadas pelo motor fiscal.",
    },
    "Importar XML": {
      title: "Importação de XML S-5002",
      subtitle: "Envie novos lotes de arquivos S-5002 para auditorar e consolidar as bases.",
    },
    "Tabelas": {
      title: "Tabelas eSocial",
      subtitle: "Consulte as tabelas oficiais e parametrize o motor de interpretação de tributos.",
    },
    "Histórico": {
      title: "Histórico de Processamentos",
      subtitle: "Consulte os logs de importação, retificações e fechamentos executados no sistema.",
    },
    "Relatórios": {
      title: "Relatórios Fiscais",
      subtitle: "Exporte relatórios consolidados e analíticos do portal de compliance do eSocial.",
    },
    "Automação S-5002": {
      title: "Automação eSocial S-5002 & Certificados A1",
      subtitle: "Configure certificados digitais A1 por empresa e sincronize eventos S-5002 automaticamente do eSocial.",
    },
  };
  
  // Novas variáveis para Conferência
  const [conferenciaData, setConferenciaData] = useState<any[]>([]);
  const [dependentesConferencia, setDependentesConferencia] = useState<any[]>([]);
  const [selectedTrabalhador, setSelectedTrabalhador] = useState("");
  const [selectedAno, setSelectedAno] = useState(new Date().getFullYear().toString());
  const [periodosDisponiveis, setPeriodosDisponiveis] = useState<any[]>([]);

  // Variáveis originais restauradas
  const [selectedTable, setSelectedTable] = useState("03");
  const [trabalhadoresList, setTrabalhadoresList] = useState<any[]>([]);
  const [tableData, setTableData] = useState<any[]>([]);
  const [auditData, setAuditData] = useState<any[]>([]);
  const [fechamentosData, setFechamentosData] = useState<any[]>([]);
  const [selectedPeriodo, setSelectedPeriodo] = useState<string>("");
  const [isConsolidating, setIsConsolidating] = useState(false);
  const [empresasData, setEmpresasData] = useState<any[]>([]);
  const [trabalhadoresData, setTrabalhadoresData] = useState<any[]>([]);
  const [operadorasData, setOperadorasData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [importFiles, setImportFiles] = useState<File[]>([]);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadResults, setUploadResults] = useState<{ processed: number; errors: number; errorDetails?: any[] } | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [stats, setStats] = useState<any>(null);
  const [groupFilter, setGroupFilter] = useState("");
  const [isParamsProcessed, setIsParamsProcessed] = useState(false);

  const [isSyncing, setIsSyncing] = useState(false);
  const [syncCounts, setSyncCounts] = useState({
    pendingCount: 0,
    processingCount: 0,
    processedCount: 0,
    errorCount: 0
  });

  // ── AUTOMAÇÃO E CERTIFICADOS ESTADO ───────────────────────────
  const [empresasSelect, setEmpresasSelect] = useState<any[]>([]);
  const [selectedEmpresaId, setSelectedEmpresaId] = useState("");
  const [certificadoAtivo, setCertificadoAtivo] = useState<any>(null);
  const [isCarregandoCerts, setIsCarregandoCerts] = useState(false);
  const [certFile, setCertFile] = useState<File | null>(null);
  const [certSenha, setCertSenha] = useState("");
  const [certAmbiente, setCertAmbiente] = useState<"producao" | "producao_restrita">("producao");
  const [certNome, setCertNome] = useState("");
  const [isSalvandoCert, setIsSalvandoCert] = useState(false);
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [sincAnoMes, setSincAnoMes] = useState(new Date().toISOString().substring(0, 7)); // "AAAA-MM"
  const [isSincronizandoActive, setIsSincronizandoActive] = useState(false);
  const [sincMessage, setSincMessage] = useState("");
  const [sincResultado, setSincResultado] = useState<any>(null);
  const [logsSincronizacoes, setLogsSincronizacoes] = useState<any[]>([]);

  // Carrega empresas quando entra na aba Automação
  useEffect(() => {
    if (activeTab === "Automação S-5002") {
      fetchEmpresasSelect();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  // Carrega certificado e logs quando seleciona uma nova empresa
  useEffect(() => {
    if (activeTab === "Automação S-5002" && selectedEmpresaId) {
      fetchCertificadoAtivo(selectedEmpresaId);
      fetchHistoricoSincs(selectedEmpresaId);
    } else {
      setCertificadoAtivo(null);
      setLogsSincronizacoes([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, selectedEmpresaId]);

  const fetchEmpresasSelect = async () => {
    try {
      const resp = await safeJsonFetch("/api/esocial/empresas?page=1&search=");
      if (resp && resp.data) {
        setEmpresasSelect(resp.data);
        if (resp.data.length > 0 && !selectedEmpresaId) {
          setSelectedEmpresaId(resp.data[0].id);
        }
      }
    } catch (e) {
      console.error("Erro ao carregar empresas para select:", e);
    }
  };

  const fetchCertificadoAtivo = async (empresaId: string) => {
    setIsCarregandoCerts(true);
    try {
      const resp = await safeJsonFetch(`/api/certificados?empresaId=${empresaId}`);
      if (Array.isArray(resp) && resp.length > 0) {
        setCertificadoAtivo(resp[0]); // sempre pega o mais recente ativo
      } else {
        setCertificadoAtivo(null);
      }
    } catch (e) {
      console.error("Erro ao obter certificado ativo:", e);
      setCertificadoAtivo(null);
    } finally {
      setIsCarregandoCerts(false);
    }
  };

  const fetchHistoricoSincs = async (empresaId?: string) => {
    try {
      const url = empresaId ? `/api/esocial/sincronizar?empresaId=${empresaId}` : "/api/esocial/sincronizar";
      const resp = await safeJsonFetch(url);
      if (Array.isArray(resp)) {
        setLogsSincronizacoes(resp);
      }
    } catch (e) {
      console.error("Erro ao carregar histórico:", e);
    }
  };

  const handleUploadCertificado = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmpresaId || !certFile || !certSenha) {
      alert("Por favor selecione a empresa, o arquivo do certificado e digite a senha.");
      return;
    }
    setIsSalvandoCert(true);
    try {
      const formData = new FormData();
      formData.append("arquivo", certFile);
      formData.append("senha", certSenha);
      formData.append("empresaId", selectedEmpresaId);
      formData.append("ambiente", certAmbiente);
      formData.append("nome", certNome || certFile.name);

      const res = await fetch("/api/certificados", {
        method: "POST",
        body: formData
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro no upload");

      setCertFile(null);
      setCertSenha("");
      setCertNome("");
      setShowUploadForm(false);
      fetchCertificadoAtivo(selectedEmpresaId);
      alert("Certificado cadastrado e ativado com sucesso!");
    } catch (e: any) {
      alert("Falha no upload do certificado: " + e.message);
    } finally {
      setIsSalvandoCert(false);
    }
  };

  const handleSubmeterSincronizacao = async () => {
    if (!selectedEmpresaId) return;
    setIsSincronizandoActive(true);
    setSincMessage("Iniciando comunicação segura TLS com o eSocial...");
    setSincResultado(null);

    try {
      const res = await fetch("/api/esocial/sincronizar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ empresaId: selectedEmpresaId, perApur: sincAnoMes })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro na sincronização");

      setSincResultado(data);
      setSincMessage("Sincronização concluída com sucesso!");
      fetchHistoricoSincs(selectedEmpresaId);
    } catch (e: any) {
      setSincMessage("");
      alert("Erro durante sincronização: " + e.message);
    } finally {
      setIsSincronizandoActive(false);
    }
  };

  const checkSyncStatus = async () => {
    try {
      const data = await safeJsonFetch("/api/esocial/s5002/import/status");
      if (data && data.success) {
        setIsSyncing(data.isSyncing);
        setSyncCounts({
          pendingCount: data.pendingCount,
          processingCount: data.processingCount,
          processedCount: data.processedCount,
          errorCount: data.errorCount
        });
        return data.isSyncing;
      }
    } catch (err) {
      console.error("[checkSyncStatus] Failed to check sync status:", err);
    }
    return false;
  };

  useEffect(() => {
    checkSyncStatus();
  }, []);

  useEffect(() => {
    let intervalId: any = null;

    if (isSyncing) {
      intervalId = setInterval(async () => {
        const stillSyncing = await checkSyncStatus();
        if (!stillSyncing) {
          fetchStats();
          fetchPeriodos();
          fetchTrabalhadoresList();
          fetchAuditData(currentPage, searchTerm);
          clearInterval(intervalId);
        }
      }, 1500);
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSyncing, currentPage, searchTerm]);

  const { openRegisterEmpresaModal, openRegisterTrabalhadorModal, openRegisterOperadoraModal } = useModals();

  const [isDataModalOpen, setIsDataModalOpen] = useState(false);
  const [selectedRowDetail, setSelectedRowDetail] = useState<any>(null);

  useEffect(() => {
    const tabParam = searchParams.get("tab");
    const anoParam = searchParams.get("ano");

    if (tabParam) setActiveTab(tabParam);
    if (anoParam) setSelectedAno(anoParam);
    
    setIsParamsProcessed(true);
  }, [searchParams]);

  useEffect(() => {
    if (!isParamsProcessed) return;
    fetchStats();
    fetchPeriodos();
    fetchTrabalhadoresList();
  }, [isParamsProcessed]);

  const fetchTrabalhadoresList = async () => {
    try {
      const data = await safeJsonFetch("/api/esocial/trabalhadores?limit=1000");
      if (data && data.data) setTrabalhadoresList(data.data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchPeriodos = async () => {
    try {
      const data = await safeJsonFetch("/api/esocial/periodos");
      if (data) setPeriodosDisponiveis(data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchConferencia = async () => {
    if (!selectedTrabalhador || !selectedAno) return;
    setIsLoading(true);
    try {
      const data = await safeJsonFetch(`/api/esocial/s5002/conferencia?trabalhadorId=${selectedTrabalhador}&ano=${selectedAno}`);
      if (data) {
        setConferenciaData(data.resumo || []);
        setDependentesConferencia(data.dependentes || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === "Conferência DIRF") {
      fetchConferencia();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTrabalhador, selectedAno, activeTab]);

  const handleRefreshAudit = async () => {
    setIsLoading(true);
    const data = await safeJsonFetch("/api/esocial/s5002/audit-refresh", { method: "POST" });
    if (data && data.success) {
      alert("Auditoria atualizada com sucesso!");
      fetchAuditData(currentPage, searchTerm);
    } else {
      alert("Falha ao atualizar auditoria.");
    }
    setIsLoading(false);
  };

  const fetchStats = async () => {
    const data = await safeJsonFetch("/api/esocial/stats");
    if (data) setStats(data);
  };

  const fetchAuditData = async (page: number, search: string) => {
    setIsLoading(true);
    const result = await safeJsonFetch(`/api/esocial/s5002/list?page=${page}&search=${encodeURIComponent(search)}&ano=${selectedAno}`);
    if (result && result.data) {
      setAuditData(result.data);
      setTotalItems(result.total);
    }
    setIsLoading(false);
  };

  const fetchFechamentos = async () => {
    setIsLoading(true);
    const data = await safeJsonFetch("/api/esocial/s5002/fechamentos/list");
    if (data) setFechamentosData(data);
    setIsLoading(false);
  };

  const handleConsolidation = async () => {
    if (!selectedPeriodo) {
      alert("Selecione um período fiscal primeiro.");
      return;
    }
    
    setIsConsolidating(true);
    const data = await safeJsonFetch("/api/esocial/s5002/consolidate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ 
        ano: selectedPeriodo.split('-')[0],
        empresaId: stats?.empresasData?.[0]?.id || "" // Fallback if no specific selection
      })
    });
    
    if (data && data.success) {
      alert(`Consolidação concluída para ${data.processed} trabalhadores.`);
      fetchFechamentos();
      fetchStats();
    } else {
      alert("Erro na consolidação: " + (data?.error || "Erro desconhecido"));
    }
    setIsConsolidating(false);
  };

  const fetchTableData = async (page: number, search: string, group: string = "") => {
    setIsLoading(true);
    const result = await safeJsonFetch(`/api/esocial/tables/${selectedTable}?page=${page}&search=${encodeURIComponent(search)}&group=${group}`);
    if (result && result.data) {
      setTableData(result.data);
      setTotalItems(result.total);
    }
    setIsLoading(false);
  };

  const handleS5002Upload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    setIsUploading(true);
    let successFiles = 0;
    let errorFiles = 0;

    try {
      for (const file of Array.from(files)) {
        const formData = new FormData();
        formData.append("files", file);
        try {
          const data = await safeJsonFetch("/api/esocial/s5002/import", {
            method: "POST",
            body: formData,
          });
          if (data && data.success) {
            successFiles++;
          } else {
            errorFiles++;
          }
        } catch (err) {
          errorFiles++;
        }
      }
      
      alert(`Processamento de Upload Concluído!\nSucesso: ${successFiles}\nErros: ${errorFiles}`);
      await checkSyncStatus();
      fetchAuditData(1, searchTerm);
      fetchStats();
    } catch (err: any) {
      alert("Falha na Auditoração: " + err.message);
    } finally {
      setIsUploading(false);
      await checkSyncStatus();
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
      const data = await safeJsonFetch("/api/esocial/import", {
        method: "POST",
        body: formData,
      });
      
      if (data && data.success) {
        alert(`Sucesso! Processados: ${data.processed}, Erros: ${data.errors}`);
        fetchTableData(currentPage, searchTerm);
        fetchStats();
      } else {
        alert("Erro ao importar arquivo: " + (data?.error || "Falha na resposta"));
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
            {(activeTab === "Auditoria S-5002") && (
              <button 
                className="btn-outline px-6 bg-white border-primary/20 text-primary hover:bg-primary/5 flex items-center justify-center gap-2"
                onClick={() => {
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


  const [divergenciasData, setDivergenciasData] = useState<any[]>([]);
  const [divergenciasStats, setDivergenciasStats] = useState<any>(null);
  const [severidadeFilter, setSeveridadeFilter] = useState("");
  const [tipoFilter, setTipoFilter] = useState("");

  useEffect(() => {
    if (activeTab === "Auditoria S-5002") {
      fetchAuditData(currentPage, searchTerm);
    } else if (activeTab === "Consolidação Anual") {
      fetchFechamentos();
    } else if (activeTab === "Divergências Fiscais") {
      fetchDivergencias(severidadeFilter, tipoFilter);
    } else if (activeTab === "Importar XML") {
      // No initial data fetch needed
    } else {
      fetchTableData(currentPage, searchTerm, groupFilter);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, currentPage, searchTerm, groupFilter, severidadeFilter, tipoFilter, selectedTable, selectedAno]);

  const fetchDivergencias = async (sev: string = "", tip: string = "") => {
    setIsLoading(true);
    try {
      const encodedSearch = encodeURIComponent(searchTerm || "");
      let url = `/api/esocial/divergencias?resolved=false&search=${encodedSearch}`;
      if (sev) url += `&severidade=${sev}`;
      if (tip) url += `&tipo=${tip}`;
      
      const [data, statsData] = await Promise.all([
        safeJsonFetch(url),
        safeJsonFetch("/api/esocial/divergencias/stats")
      ]);
      
      setDivergenciasData(Array.isArray(data) ? data : []);
      setDivergenciasStats(statsData);
    } catch (err) {
      console.error("Erro ao buscar divergências:", err);
      setDivergenciasData([]);
    } finally {
      setIsLoading(false);
    }
  };

  const resolveDivergencia = async (id: string, resolvido: boolean) => {
     try {
       await safeJsonFetch("/api/esocial/divergencias", {
         method: "PATCH",
         headers: { "Content-Type": "application/json" },
         body: JSON.stringify({ id, resolvido })
       });
       fetchDivergencias(severidadeFilter, tipoFilter);
       fetchStats();
     } catch (err) {
       console.error(err);
     }
  };

  const [selectedFechamento, setSelectedFechamento] = useState<any>(null);
  const [showInformeModal, setShowInformeModal] = useState(false);

  const handleDownloadInforme = (f: any) => {
    if (!f) return;
    try {
      const doc = gerarInformePDF(f);
      const nameClean = f.trabalhador?.nome?.toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/\s+/g, "-") || "beneficiario";
      doc.save(`informe-rendimentos-${nameClean}-${f.ano}.pdf`);
    } catch (error) {
      console.error("Erro ao gerar PDF:", error);
      alert("Ocorreu um erro ao gerar o PDF do comprovante de rendimentos.");
    }
  };

  const renderInformeModal = () => {
    if (!selectedFechamento) return null;
    const f = selectedFechamento;

    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-on-surface/60 backdrop-blur-sm p-4">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          className="bg-white w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-sm shadow-2xl flex flex-col"
        >
          <div className="p-8 border-b border-outline-variant flex justify-between items-start bg-surface/30">
            <div className="flex flex-col gap-2">
              <span className="text-[10px] font-black text-secondary uppercase tracking-[0.2em]">Comprovante de Rendimentos Pagos e de Retenção de Imposto de Renda na Fonte</span>
              <h3 className="text-xl font-extrabold text-on-surface">Ano-calendário de {f.ano}</h3>
            </div>
            <button onClick={() => setShowInformeModal(false)} className="p-2 hover:bg-surface-variant rounded-full transition-all">
              <X size={20} />
            </button>
          </div>

          <div className="p-8 space-y-8">
            {/* Quadrante 1: Fonte Pagadora */}
            <section className="space-y-4">
              <h4 className="text-[11px] font-black text-secondary uppercase tracking-widest border-b border-outline-variant pb-2">01. Fonte Pagadora (Pessoa Jurídica)</h4>
              <div className="grid grid-cols-3 gap-6">
                <div>
                  <p className="text-[10px] text-secondary font-bold uppercase mb-1">CNPJ</p>
                  <p className="text-sm font-black text-on-surface">{f.empresa.cnpjRaiz}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-[10px] text-secondary font-bold uppercase mb-1">Nome Empresarial</p>
                  <p className="text-sm font-black text-on-surface">{f.empresa.razaoSocial}</p>
                </div>
              </div>
            </section>

            {/* Quadrante 2: Pessoa Física Beneficiária */}
            <section className="space-y-4">
              <h4 className="text-[11px] font-black text-secondary uppercase tracking-widest border-b border-outline-variant pb-2">02. Pessoa Física Beneficiária dos Rendimentos</h4>
              <div className="grid grid-cols-3 gap-6">
                <div>
                  <p className="text-[10px] text-secondary font-bold uppercase mb-1">CPF</p>
                  <p className="text-sm font-black text-on-surface">{f.trabalhador.cpf}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-[10px] text-secondary font-bold uppercase mb-1">Nome Completo</p>
                  <p className="text-sm font-black text-on-surface">{f.trabalhador.nome}</p>
                </div>
              </div>
            </section>

            {/* Quadrante 3: Rendimentos Tributáveis */}
            <section className="space-y-4">
              <h4 className="text-[11px] font-black text-secondary uppercase tracking-widest border-b border-outline-variant pb-2">03. Rendimentos Tributáveis, Deduções e Imposto Retido na Fonte</h4>
              <div className="space-y-2 border border-outline-variant rounded-sm overflow-hidden">
                <div className="flex justify-between p-3 bg-surface/50 border-b border-outline-variant italic">
                  <span className="text-xs font-bold">Natureza do Rendimento</span>
                  <span className="text-xs font-black">Valores em Reais (R$)</span>
                </div>
                {[
                  { label: "Total de Rendimentos (inclusive férias)", val: f.totalRendTrib },
                  { label: "Contribuição Previdenciária Oficial", val: f.totalPrevOficial },
                  { label: "Pensão Alimentícia", val: f.totalPensao },
                  { label: "Imposto sobre a Renda Retido na Fonte", val: f.totalIrrf },
                ].map((item, i) => (
                  <div key={i} className="flex justify-between p-3 border-b border-outline-variant last:border-0 hover:bg-surface/20 transition-all">
                    <span className="text-xs font-medium text-secondary">{item.label}</span>
                    <span className="text-xs font-black text-on-surface">R$ {Number(item.val).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                  </div>
                ))}
              </div>
            </section>

             {/* Quadrante 4: Rendimentos Isentos */}
             <section className="space-y-4">
              <h4 className="text-[11px] font-black text-secondary uppercase tracking-widest border-b border-outline-variant pb-2">04. Rendimentos Isentos e Não Tributáveis</h4>
              <div className="space-y-2 border border-outline-variant rounded-sm overflow-hidden">
                <div className="flex justify-between p-3 border-b border-outline-variant hover:bg-surface/20 transition-all">
                  <span className="text-xs font-medium text-secondary">Indenizações por rescisão de contrato de trabalho</span>
                  <span className="text-xs font-black text-on-surface">R$ {Number(f.totalIndenizacaoRescisao).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between p-3 hover:bg-surface/20 transition-all">
                  <span className="text-xs font-medium text-secondary">Outros Rendimentos Isentos</span>
                  <span className="text-xs font-black text-on-surface">R$ {(Number(f.totalRendIsentos) - Number(f.totalIndenizacaoRescisao)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                </div>
              </div>
            </section>
          </div>

          <div className="p-8 border-t border-outline-variant bg-surface/30 flex justify-between gap-4">
            <p className="text-[10px] text-secondary font-medium leading-relaxed italic max-w-sm">
              * Este documento foi gerado automaticamente através da consolidação dos eventos S-5002 transmitidos ao eSocial.
            </p>
            <div className="flex gap-4">
              <button 
                onClick={() => handleDownloadInforme(f)}
                className="btn-outline flex items-center gap-2 py-2.5 px-6"
              >
                <Download size={14} />
                <span>Baixar PDF</span>
              </button>
              <button onClick={() => setShowInformeModal(false)} className="btn-primary py-2.5 px-8">Fechar</button>
            </div>
          </div>
        </motion.div>
      </div>
    );
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const validFiles = Array.from(e.target.files).filter(file => {
        const isValidExt = file.name.toLowerCase().endsWith('.xml');
        const isValidSize = file.size <= 10 * 1024 * 1024; // 10MB
        return isValidExt && isValidSize;
      });
      setImportFiles(prev => [...prev, ...validFiles]);
      setUploadResults(null);
    }
  };

  const removeFile = (index: number) => {
    setImportFiles(prev => prev.filter((_, i) => i !== index));
  };

  const processUpload = async () => {
    if (importFiles.length === 0) return;
    setIsUploading(true);
    setUploadProgress(0);
    
    let processed = 0;
    let errors = 0;
    const errorDetails: any[] = [];

    for (let i = 0; i < importFiles.length; i++) {
      const file = importFiles[i];
      const formData = new FormData();
      formData.append("files", file);

      try {
        const data = await safeJsonFetch("/api/esocial/s5002/import", {
          method: "POST",
          body: formData,
        });
        
        if (data && data.success) {
          processed += data.processed || 0;
          errors += data.errors || 0;
          if (data.errorDetails) errorDetails.push(...data.errorDetails);
        } else {
          errors++;
          errorDetails.push({ fileName: file.name, error: data?.error || "Erro desconhecido" });
        }
      } catch (err: any) {
        errors++;
        errorDetails.push({ fileName: file.name, error: err.message });
      }
      
      setUploadProgress(Math.round(((i + 1) / importFiles.length) * 100));
    }

    setUploadResults({ 
      processed, 
      errors, 
      errorDetails 
    });
    setImportFiles([]);
    fetchStats();
    fetchAuditData(1, "");
    setIsUploading(false);
  };

  const renderContent = () => {
    if (activeTab === "Conferência DIRF") {
      return (
        <div className="flex flex-col gap-6">
          <div className="card bg-white p-6 flex flex-col gap-6 border border-outline-variant shadow-sm">
            <div className="flex justify-between items-center bg-surface-container/10 p-4 rounded-sm border border-outline-variant/50">
              <div className="flex items-center gap-6">
                <div className="flex flex-col gap-2">
                  <label className="text-[10px] font-black text-secondary uppercase tracking-[0.2em]">Trabalhador</label>
                  <select 
                    className="bg-white border border-outline-variant rounded-sm py-2 px-3 text-xs font-bold w-72 focus:ring-1 focus:ring-primary outline-none"
                    value={selectedTrabalhador}
                    onChange={(e) => setSelectedTrabalhador(e.target.value)}
                  >
                    <option value="">Selecione um trabalhador...</option>
                    {trabalhadoresList.map(t => (
                      <option key={t.id} value={t.id}>{t.cpf} - {t.nome}</option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-[10px] font-black text-secondary uppercase tracking-[0.2em]">Ano Calendário</label>
                  <select 
                    className="bg-white border border-outline-variant rounded-sm py-2 px-3 text-xs font-bold w-32 focus:ring-1 focus:ring-primary outline-none"
                    value={selectedAno}
                    onChange={(e) => setSelectedAno(e.target.value)}
                  >
                    {Array.isArray(periodosDisponiveis) && Array.from(new Set(
                      periodosDisponiveis.map(p => p?.anoCalendario).filter(v => v !== undefined && v !== null)
                    )).map(ano => (
                      <option key={ano} value={ano.toString()}>{ano}</option>
                    ))}
                  </select>
                </div>
              </div>
              <button 
                onClick={fetchConferencia}
                disabled={isLoading || !selectedTrabalhador}
                className="btn-primary px-6 py-2 flex items-center gap-2"
              >
                {isLoading ? <LoadingSpinner size="xs" /> : <TrendingUp size={16} />}
                <span className="text-xs font-bold uppercase tracking-widest">Atualizar Tabela</span>
              </button>
            </div>

            {!selectedTrabalhador ? (
              <div className="flex flex-col items-center justify-center py-24 gap-4 bg-surface/30 border border-outline-variant rounded-sm border-dashed">
                <Users className="text-secondary opacity-20" size={48} />
                <p className="text-sm font-black text-secondary uppercase tracking-widest">Selecione um trabalhador para visualizar a conferência anual</p>
              </div>
            ) : isLoading ? (
              <div className="flex items-center justify-center py-24">
                <LoadingSpinner size="lg" />
              </div>
            ) : (
              <div className="overflow-x-auto border border-outline-variant rounded-sm">
                <table className="w-full text-left border-collapse bg-white">
                  <thead>
                    <tr className="bg-surface text-[10px] font-black text-secondary uppercase tracking-widest border-b border-outline-variant">
                      <th className="px-4 py-3 sticky left-0 bg-surface z-10 border-r border-outline-variant w-[280px]">Classificação</th>
                      <th className="px-4 py-3 text-center border-r border-outline-variant w-16">tpInfoIR</th>
                      {['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez', 'Total'].map(m => (
                        <th key={m} className={cn("px-3 py-3 text-right tabular-nums", m === 'Total' ? "bg-surface-container/30 font-black" : "font-medium")}>{m}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-outline-variant">
                    {/* Seção: Informações do Trabalhador */}
                    <tr className="bg-surface-container/20">
                      <td colSpan={15} className="px-4 py-2 text-[10px] font-black text-primary uppercase tracking-[0.2em]">Informações do Trabalhador</td>
                    </tr>
                    {Array.isArray(conferenciaData) && conferenciaData.map((row, idx) => (
                      <tr key={idx} className="hover:bg-surface-container/10 transition-all text-[11px]">
                        <td className="px-4 py-3 sticky left-0 bg-white group-hover:bg-surface-container/10 z-10 border-r border-outline-variant font-bold text-on-surface truncate max-w-[280px]" title={row.label}>
                          {row.label}
                        </td>
                        <td className="px-4 py-3 text-center border-r border-outline-variant font-black text-secondary/60">
                          {row.tpInfoIR === "28" || row.tpInfoIR === "29" ? "" : row.tpInfoIR}
                        </td>
                        {Array.isArray(row.months) && row.months.map((val: number, mIdx: number) => (
                          <td key={mIdx} className="px-3 py-3 text-right tabular-nums font-medium text-secondary">
                            {val > 0 ? val.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) : "-"}
                          </td>
                        ))}
                        <td className="px-3 py-3 text-right tabular-nums font-black text-on-surface bg-surface-container/10">
                          {row.total > 0 ? row.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) : "-"}
                        </td>
                      </tr>
                    ))}
                    
                    {/* Seção: Informações de Dependentes */}
                    <tr className="bg-surface-container/20 border-t-2 border-outline-variant">
                      <td colSpan={15} className="px-4 py-2 text-[10px] font-black text-primary uppercase tracking-[0.2em]">Informações para cada Dependente ligado ao trabalhador</td>
                    </tr>
                    {dependentesConferencia.length === 0 ? (
                      <tr className="text-[11px] italic text-secondary/50">
                        <td colSpan={15} className="px-4 py-8 text-center bg-surface/20">Não há dependentes vinculados aos blocos infoIRComplem processados para este período.</td>
                      </tr>
                    ) : (
                      dependentesConferencia.map((dep, dIdx) => (
                        <React.Fragment key={dIdx}>
                          {/* Cabeçalho do Dependente */}
                          <tr className="bg-surface/50 border-t border-outline-variant">
                            <td colSpan={15} className="px-4 py-2 text-[9px] font-black text-secondary uppercase bg-surface-container/5">
                              Dependente: {dep.nome}
                            </td>
                          </tr>
                          {Object.entries(dep.fields || {}).map(([fieldName, data]: [string, any], fIdx) => (
                            <tr key={fIdx} className="hover:bg-surface-container/10 transition-all text-[11px] border-b border-outline-variant/30">
                              <td className="px-6 py-2 sticky left-0 bg-white group-hover:bg-surface-container/10 z-10 border-r border-outline-variant font-medium text-secondary truncate max-w-[280px]">
                                {fieldName}
                              </td>
                              <td className="px-4 py-2 text-center border-r border-outline-variant font-black text-secondary/20 italic">
                                -
                              </td>
                              {Array.isArray(data?.months) && data.months.map((val: number, mIdx: number) => (
                                <td key={mIdx} className="px-3 py-2 text-right tabular-nums font-medium text-secondary/80">
                                  {val > 0 ? val.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) : "-"}
                                </td>
                              ))}
                              <td className="px-3 py-2 text-right tabular-nums font-black text-on-surface bg-surface-container/5">
                                {data?.total > 0 ? data.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) : "-"}
                              </td>
                            </tr>
                          ))}
                        </React.Fragment>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      );
    }

    if (activeTab === "Automação S-5002") {
      return (
        <div className="flex flex-col gap-8 max-w-5xl mx-auto w-full py-8">
          {/* Cabeçalho de Seleção de Empresa */}
          <div className="card bg-white p-6 border border-outline-variant shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6 rounded-sm">
            <div className="flex flex-col gap-1.5 flex-1">
              <label className="text-[10px] font-black text-secondary uppercase tracking-[0.2em] font-mono">Selecione a Empresa de Trabalho</label>
              <select
                className="bg-surface border border-outline-variant rounded-sm py-2 px-3 text-xs font-bold w-full md:w-96 focus:ring-1 focus:ring-primary outline-none"
                value={selectedEmpresaId}
                onChange={(e) => setSelectedEmpresaId(e.target.value)}
              >
                <option value="">Selecione uma empresa...</option>
                {empresasSelect.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.cnpjRaiz} - {emp.razaoSocial || emp.nomeFantasia}
                  </option>
                ))}
              </select>
            </div>
            
            <div className="flex gap-3 shrink-0">
              <button
                onClick={() => setShowUploadForm(!showUploadForm)}
                className="btn-outline px-4 py-2 text-xs font-bold bg-white border border-outline-variant text-primary hover:bg-neutral-50 rounded-sm flex items-center gap-2"
              >
                {certificadoAtivo ? "Trocar Certificado Digital" : "Cadastrar Certificado Digital"}
              </button>
            </div>
          </div>

          {/* Form de Cadastro do Certificado (Drop-down/Collapse) */}
          {showUploadForm && (
            <form onSubmit={handleUploadCertificado} className="card bg-white p-6 border border-outline-variant shadow-sm flex flex-col gap-4 rounded-sm animate-fadeIn">
              <div className="flex items-center justify-between border-b border-outline-variant pb-3 mb-2">
                <h3 className="text-sm font-bold text-on-surface uppercase tracking-wider font-mono">Upload de Certificado Digital A1 (.pfx / .p12)</h3>
                <button type="button" onClick={() => setShowUploadForm(false)} className="text-secondary hover:text-on-surface">
                  <X size={18} />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-secondary uppercase font-mono">Identificador / Nome Amigável</label>
                  <input
                    type="text"
                    placeholder="Ex: Certificado Matriz 2026"
                    className="bg-surface border border-outline-variant rounded-sm py-2 px-3 text-xs outline-none focus:ring-1 focus:ring-primary"
                    value={certNome}
                    onChange={(e) => setCertNome(e.target.value)}
                    required
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-secondary uppercase font-mono">Senha do Certificado (Passphrase)</label>
                  <input
                    type="password"
                    placeholder="Digite a senha de exportação"
                    className="bg-surface border border-outline-variant rounded-sm py-2 px-3 text-xs outline-none focus:ring-1 focus:ring-primary"
                    value={certSenha}
                    onChange={(e) => setCertSenha(e.target.value)}
                    required
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-secondary uppercase font-mono">Arquivo .pfx / .p12</label>
                  <input
                    type="file"
                    accept=".pfx,.p12"
                    className="bg-surface border border-outline-variant rounded-sm py-1.5 px-3 text-xs file:mr-4 file:py-1 file:px-2 file:rounded-xs file:border-0 file:text-[10px] file:font-bold file:bg-neutral-200 file:text-on-surface hover:file:bg-neutral-300"
                    onChange={(e) => setCertFile(e.target.files ? e.target.files[0] : null)}
                    required
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-secondary uppercase font-mono">Ambiente eSocial</label>
                  <select
                    className="bg-surface border border-outline-variant rounded-sm py-2.5 px-3 text-xs focus:ring-1 focus:ring-primary outline-none"
                    value={certAmbiente}
                    onChange={(e) => setCertAmbiente(e.target.value as any)}
                  >
                    <option value="producao">Produção Oficial</option>
                    <option value="producao_restrita">Produção Restrita (Testes)</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-2 border-t border-outline-variant pt-4">
                <button
                  type="button"
                  onClick={() => setShowUploadForm(false)}
                  className="btn-outline px-4 py-2 text-xs font-bold bg-white border border-outline-variant text-secondary hover:bg-neutral-50 rounded-sm"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSalvandoCert}
                  className="btn-primary px-4 py-2 text-xs font-bold text-white bg-primary hover:bg-primary/90 rounded-sm disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isSalvandoCert && <Loader2 className="animate-spin" size={14} />}
                  <span>Salvar e Instalar Certificado</span>
                </button>
              </div>
            </form>
          )}

          {/* Duas colunas: Detalhes do Certificado vs. Trigger da Sincronização */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Esquerda: Status do Certificado */}
            <div className="card bg-white p-6 border border-outline-variant shadow-sm flex flex-col gap-4 rounded-sm">
              <h3 className="text-xs font-black text-secondary uppercase tracking-[0.15em] font-mono border-b border-outline-variant pb-2">Status do Certificado Digital</h3>
              {isCarregandoCerts ? (
                <div className="flex items-center justify-center py-10">
                  <Loader2 className="animate-spin text-primary" size={24} />
                </div>
              ) : certificadoAtivo ? (
                <div className="flex flex-col gap-3">
                  <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-200 p-3 rounded-sm">
                    <div className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center text-white shrink-0">
                      <CheckCheck size={16} />
                    </div>
                    <div className="flex flex-col leading-tight">
                      <span className="text-xs font-bold text-emerald-800">Certificado Instalado e Ativo</span>
                      <span className="text-[10px] text-emerald-600 font-mono font-bold">Ambiente: {certificadoAtivo.ambiente === "producao" ? "PRODUÇÃO" : "PRODUÇÃO RESTRITA"}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-y-3 gap-x-2 text-xs mt-1 border-t border-dashed border-outline-variant/60 pt-3">
                    <div className="flex flex-col font-mono block min-w-0">
                      <span className="text-[10px] text-secondary lowercase">nome do arquivo / alias</span>
                      <span className="font-bold text-on-surface truncate block" title={certificadoAtivo.nome}>{certificadoAtivo.nome}</span>
                    </div>
                    <div className="flex flex-col font-mono block min-w-0">
                      <span className="text-[10px] text-secondary lowercase">vencimento</span>
                      <span className={`font-bold block ${new Date(certificadoAtivo.validade).getTime() < Date.now() ? "text-red-600" : "text-on-surface"}`}>
                        {new Date(certificadoAtivo.validade).toLocaleDateString("pt-BR")}
                      </span>
                    </div>
                    <div className="flex flex-col font-mono col-span-2 block min-w-0">
                      <span className="text-[10px] text-secondary lowercase">fingerprint sha1</span>
                      <span className="font-bold text-on-surface hover:text-primary transition-colors text-[10px] select-all tracking-wider truncate block" title={certificadoAtivo.fingerprint}>{certificadoAtivo.fingerprint || "-"}</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center text-center py-8 px-4 bg-neutral-50/50 rounded-sm border border-dashed border-outline-variant">
                  <AlertCircle className="text-amber-500 mb-2" size={32} />
                  <span className="text-xs font-bold text-on-surface">Sem Certificado Ativo</span>
                  <p className="text-[10px] text-secondary mt-1 max-w-xs">
                    Cada empresa do grupo exige o upload de seu próprio certificado A1 (.pfx) com a senha de exportação correspondente para realizar chamadas soap seguras mTLS ao eSocial.
                  </p>
                </div>
              )}
            </div>

            {/* Direita: Trigger da Sincronização */}
            <div className="card bg-white p-6 border border-outline-variant shadow-sm flex flex-col gap-4 rounded-sm">
              <h3 className="text-xs font-black text-secondary uppercase tracking-[0.15em] font-mono border-b border-outline-variant pb-2">Download Automático S-5002</h3>
              
              <div className="flex flex-col gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-secondary uppercase font-mono">Período de Apuração (Mês/Ano)</label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-outline" size={14} />
                    <input
                      type="month"
                      className="bg-surface pl-9 pr-3 py-2 w-full text-xs font-bold outline-none focus:ring-1 focus:ring-primary rounded-sm border border-outline-variant"
                      value={sincAnoMes}
                      onChange={(e) => setSincAnoMes(e.target.value)}
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-2 mt-2">
                  <button
                    type="button"
                    onClick={handleSubmeterSincronizacao}
                    disabled={isSincronizandoActive || !certificadoAtivo}
                    className="btn-primary w-full py-3 text-xs font-bold text-white bg-primary hover:bg-primary/95 rounded-sm disabled:opacity-50 disabled:bg-neutral-200 disabled:text-neutral-500 flex items-center justify-center gap-2"
                  >
                    {isSincronizandoActive ? <Loader2 className="animate-spin" size={16} /> : <Download size={16} />}
                    <span>{isSincronizandoActive ? "Sincronizando com eSocial..." : "Sincronizar Eventos S-5002"}</span>
                  </button>
                  
                  {!certificadoAtivo && (
                    <span className="text-[9px] text-red-500 font-bold font-mono text-center">Requer Certificado Digital cadastrado e ativo.</span>
                  )}
                </div>

                {isSincronizandoActive && (
                  <div className="flex flex-col gap-2 mt-2 p-3 bg-primary/5 rounded-sm border border-primary/20 animate-pulse">
                    <span className="text-[10px] font-mono font-bold text-primary">{sincMessage}</span>
                  </div>
                )}

                {sincResultado && (
                  <div className="flex flex-col p-3 bg-emerald-50 border border-emerald-200 rounded-sm text-xs mt-2 font-mono gap-1 animate-fadeIn">
                    <div className="flex items-center gap-1.5 text-emerald-800 font-bold mb-1">
                      <CheckCheck size={14} />
                      <span>Sincronização Concluída</span>
                    </div>
                    <div className="grid grid-cols-2 gap-1 text-[10px]">
                      <span>Baixados: <strong className="text-emerald-700">{sincResultado.baixados}</strong></span>
                      <span>Erros: <strong className={sincResultado.erros > 0 ? "text-red-700 font-bold" : "text-emerald-700"}>{sincResultado.erros}</strong></span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Seção Inferior: Histórico de Sincronizações */}
          <div className="card bg-white border border-outline-variant shadow-sm rounded-sm flex flex-col">
            <div className="px-6 py-4 border-b border-outline-variant flex justify-between items-center bg-white rounded-t-sm">
              <h3 className="text-xs font-black text-secondary uppercase tracking-[0.15em] font-mono">Histórico de Sincronizações do Web Service</h3>
              <button
                type="button"
                onClick={() => fetchHistoricoSincs(selectedEmpresaId)}
                className="btn-outline px-3 py-1 text-[10px] font-bold bg-white border border-outline-variant hover:bg-neutral-50 flex items-center gap-1"
              >
                <History size={12} />
                <span>Atualizar Lista</span>
              </button>
            </div>

            {logsSincronizacoes.length === 0 ? (
              <div className="p-12 text-center text-xs text-secondary font-medium font-mono italic">
                Nenhuma sincronização realizada para esta empresa.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left text-xs text-on-surface">
                  <thead>
                    <tr className="bg-surface border-b border-outline-variant text-[10px] font-bold text-secondary uppercase font-mono">
                      <th className="px-4 py-3">Período</th>
                      <th className="px-4 py-3">Iniciado Em</th>
                      <th className="px-4 py-3">Concluído Em</th>
                      <th className="px-4 py-3">Total Solicitado</th>
                      <th className="px-4 py-3">Baixados</th>
                      <th className="px-4 py-3">Erros</th>
                      <th className="px-4 py-3 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-outline-variant/60 font-mono">
                    {logsSincronizacoes.map((item) => (
                      <tr key={item.id} className="hover:bg-surface/50 transition-colors">
                        <td className="px-4 py-3 font-bold text-primary">{item.perApur}</td>
                        <td className="px-4 py-3 text-secondary">{new Date(item.iniciadoEm).toLocaleString("pt-BR")}</td>
                        <td className="px-4 py-3 text-secondary">
                          {item.concluidoEm ? new Date(item.concluidoEm).toLocaleString("pt-BR") : "-"}
                        </td>
                        <td className="px-4 py-3 font-bold">{item.totalIdentificadores}</td>
                        <td className="px-4 py-3 text-emerald-600 font-bold">{item.totalBaixados}</td>
                        <td className="px-4 py-3 text-red-500 font-bold">{item.totalErros}</td>
                        <td className="px-4 py-3 text-center">
                          <span className={cn(
                            "inline-block rounded-xs px-2.5 py-1 text-[9px] font-black uppercase tracking-wider",
                            item.status === "concluido" && "bg-emerald-100 text-emerald-800",
                            item.status === "executando" && "bg-amber-100 text-amber-800 animate-pulse",
                            item.status === "erro" && "bg-red-100 text-red-800"
                          )}>
                            {item.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      );
    }

    if (activeTab === "Importar XML") {
      return (
        <div className="flex flex-col gap-8 max-w-5xl mx-auto w-full py-8">
          <div className="flex flex-col gap-2">
            <h2 className="text-2xl font-black text-on-surface tracking-tight">Importação de Eventos eSocial</h2>
            <p className="text-sm text-secondary font-medium italic">Envie arquivos S-5002 (evtIrrfTot) originais do governo para auditoria.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="md:col-span-2 space-y-6">
              <div 
                className={cn(
                  "border-2 border-dashed rounded-sm p-12 transition-all flex flex-col items-center justify-center gap-4 bg-white shadow-sm",
                  importFiles.length > 0 ? "border-primary/50 bg-primary/5" : "border-outline-variant hover:border-primary/30"
                )}
              >
                <div className="w-16 h-16 bg-surface rounded-full flex items-center justify-center text-primary/40">
                  <CloudUpload size={32} />
                </div>
                <div className="text-center group">
                  <label className="cursor-pointer">
                    <span className="text-sm font-black text-primary hover:underline">Clique para selecionar</span>
                    <span className="text-sm font-bold text-secondary italic"> ou arraste arquivos XML aqui</span>
                    <input 
                      type="file" 
                      multiple 
                      accept=".xml" 
                      className="hidden" 
                      onChange={handleFileChange}
                      disabled={isUploading}
                    />
                  </label>
                  <p className="text-[10px] text-secondary font-black uppercase tracking-widest mt-2">Apenas .xml até 10MB por arquivo</p>
                </div>
              </div>

              {importFiles.length > 0 && (
                <div className="card bg-white p-0 overflow-hidden border border-outline-variant">
                  <div className="px-6 py-4 border-b border-outline-variant bg-surface/50 flex justify-between items-center">
                    <span className="text-[10px] font-black text-on-surface uppercase tracking-widest">Fila de Importação ({importFiles.length})</span>
                    <button 
                      onClick={() => setImportFiles([])}
                      className="text-[10px] font-black text-error uppercase hover:underline"
                    >
                      Limpar Tudo
                    </button>
                  </div>
                  <div className="max-h-[300px] overflow-y-auto divide-y divide-outline-variant">
                    {importFiles.map((file, idx) => (
                      <div key={idx} className="px-6 py-3 flex items-center justify-between hover:bg-surface/30 transition-all group">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-surface rounded flex items-center justify-center text-secondary">
                            <FileText size={16} />
                          </div>
                          <div className="flex flex-col">
                            <span className="text-xs font-bold text-on-surface truncate max-w-[200px]">{file.name}</span>
                            <span className="text-[9px] text-secondary font-black opacity-60">{(file.size / 1024).toFixed(1)} KB</span>
                          </div>
                        </div>
                        <button 
                          onClick={() => removeFile(idx)}
                          className="p-1.5 text-secondary hover:text-error opacity-0 group-hover:opacity-100 transition-all"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                  <div className="p-6 bg-surface/30 border-t border-outline-variant">
                    <button 
                      disabled={isUploading}
                      onClick={processUpload}
                      className="btn-primary w-full py-3 flex items-center justify-center gap-3"
                    >
                      {isUploading ? (
                        <>
                          <LoadingSpinner size="sm" className="opacity-80" />
                          <span className="font-black uppercase tracking-widest text-xs">Processando XMLs...</span>
                        </>
                      ) : (
                        <>
                          <CloudUpload size={18} />
                          <span className="font-black uppercase tracking-widest text-xs">Iniciar Importação</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}

              {uploadResults && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={cn(
                    "p-6 rounded-sm border flex items-center gap-4",
                    uploadResults.errors > 0 ? "bg-amber-50 border-amber-200 text-amber-800" : "bg-emerald-50 border-emerald-200 text-emerald-800"
                  )}
                >
                  <div className={cn(
                    "w-12 h-12 rounded-full flex items-center justify-center",
                    uploadResults.errors > 0 ? "bg-amber-200" : "bg-emerald-200"
                  )}>
                    {uploadResults.errors > 0 ? <AlertCircle size={24} /> : <CheckCheck size={24} />}
                  </div>
                  <div className="flex-1">
                    <h4 className="text-sm font-black uppercase tracking-tight">Resultado do Processamento</h4>
                    <p className="text-xs font-bold opacity-80 italic">
                      {uploadResults.processed} arquivos importados com sucesso. {uploadResults.errors} falhas/duplicados detectados.
                    </p>
                    {uploadResults.errorDetails && uploadResults.errorDetails.length > 0 && (
                      <div className="mt-4 space-y-2 border-t border-amber-200 pt-4">
                        <div className="flex justify-between items-center mb-2">
                          <p className="text-[10px] font-black uppercase tracking-widest text-amber-900 border-none">Detalhamento dos Erros:</p>
                          {uploadResults.errorDetails.some(e => e.error.includes("Período Fiscal")) && (
                            <Link 
                              href="/periodos" 
                              className="text-[9px] font-black uppercase bg-amber-900 text-white px-2 py-1 rounded-sm hover:bg-black transition-all flex items-center gap-1"
                            >
                              <Calendar size={10} />
                              Cadastrar Período
                            </Link>
                          )}
                        </div>
                        <div className="max-h-40 overflow-y-auto space-y-1 pr-2">
                          {uploadResults.errorDetails.map((err, idx) => (
                            <div key={idx} className="text-[10px] bg-white/50 p-2 rounded-sm border border-amber-200/50">
                              <span className="font-black text-amber-950">{err.fileName}:</span>{" "}
                              <span className="font-medium text-amber-800">{err.error}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </div>

            <div className="space-y-6">
              <div className="card bg-on-surface text-white p-8">
                <h4 className="text-[10px] font-black text-white/50 uppercase tracking-[0.2em] mb-6">Regras de Validação</h4>
                <div className="space-y-6">
                  <div className="flex gap-4">
                    <div className="w-8 h-8 rounded bg-white/10 flex items-center justify-center shrink-0">
                      <span className="text-xs font-black">01</span>
                    </div>
                    <div>
                      <p className="text-xs font-black mb-1">Namespace Oficial</p>
                      <p className="text-[10px] text-white/60 font-medium italic leading-relaxed">Apenas eventos S-5002 autenticados com o schema evtIrrfTot são processados.</p>
                    </div>
                  </div>
                  <div className="flex gap-4">
                    <div className="w-8 h-8 rounded bg-white/10 flex items-center justify-center shrink-0">
                      <span className="text-xs font-black">02</span>
                    </div>
                    <div>
                      <p className="text-xs font-black mb-1">Integridade Fiscal</p>
                      <p className="text-[10px] text-white/60 font-medium italic leading-relaxed">O sistema cruza NRRECIBO e HASH para evitar duplicidade de lançamentos no período.</p>
                    </div>
                  </div>
                  <div className="flex gap-4">
                    <div className="w-8 h-8 rounded bg-white/10 flex items-center justify-center shrink-0">
                      <span className="text-xs font-black">03</span>
                    </div>
                    <div>
                      <p className="text-xs font-black mb-1">Consolidação Automática</p>
                      <p className="text-[10px] text-white/60 font-medium italic leading-relaxed">Após o upload, os dados ficam disponíveis para auditoria e fechamento anual.</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-surface border border-outline-variant p-6 rounded-sm">
                <p className="text-[10px] text-secondary font-black uppercase tracking-widest mb-2">Suporte a Lote</p>
                <p className="text-[11px] text-secondary font-medium leading-relaxed italic">
                  Você pode selecionar centenas de arquivos simultaneamente. O processamento ocorre em background garantindo a performance da ferramenta.
                </p>
              </div>
            </div>
          </div>
        </div>
      );
    }

    if (activeTab === "Divergências Fiscais") {
      return (
        <div className="flex flex-col gap-8">
          {/* Dashboard Superior */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div 
              className={cn(
                "card bg-white p-6 border-l-4 border-error flex flex-col gap-2 cursor-pointer transition-all hover:shadow-lg",
                severidadeFilter === "CRITICA" && "bg-error/5 ring-1 ring-error/20"
              )}
              onClick={() => setSeveridadeFilter(severidadeFilter === "CRITICA" ? "" : "CRITICA")}
            >
              <span className="text-[10px] font-black text-secondary uppercase tracking-widest">Riscos Críticos</span>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-black text-on-surface">{divergenciasStats?.bySeverity?.CRITICA || 0}</span>
                <span className="text-xs font-bold text-error italic">Bloqueantes</span>
              </div>
              <p className="text-[10px] text-secondary font-medium leading-relaxed italic mt-2">Divergências que impedem a consolidação DIRF.</p>
            </div>

            <div 
              className={cn(
                "card bg-white p-6 border-l-4 border-amber-500 flex flex-col gap-2 cursor-pointer transition-all hover:shadow-lg",
                tipoFilter === "PENSAO_DIVERGENTE" && "bg-amber-50 ring-1 ring-amber-200"
              )}
              onClick={() => setTipoFilter(tipoFilter === "PENSAO_DIVERGENTE" ? "" : "PENSAO_DIVERGENTE")}
            >
              <span className="text-[10px] font-black text-secondary uppercase tracking-widest">Análise de Pensão</span>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-black text-on-surface">{divergenciasStats?.byType?.PENSAO_DIVERGENTE || 0}</span>
                <span className="text-xs font-bold text-amber-600 italic">Alertas</span>
              </div>
              <p className="text-[10px] text-secondary font-medium leading-relaxed italic mt-2">Conflitos entre detalhes de dependentes e total IRRF.</p>
            </div>

            <div className="card bg-on-surface text-white p-6 flex flex-col gap-2">
              <span className="text-[10px] font-black text-white/50 uppercase tracking-widest">Ajustes Retroativos 2026</span>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-black">{divergenciasStats?.retroAdjustments || 0}</span>
                <span className="text-xs font-bold text-primary italic">Processados</span>
              </div>
              <p className="text-[10px] text-white/40 font-medium leading-relaxed italic mt-2">Retificações ano-base 2025 enviadas em 2026-01.</p>
            </div>

            <div className="card bg-primary text-white p-6 flex flex-col gap-2">
              <span className="text-[10px] font-black text-white/50 uppercase tracking-widest">Índice de Saúde Fiscal</span>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-black">
                  {divergenciasStats?.total > 0 ? Math.max(0, 100 - (divergenciasStats?.total * 2)).toFixed(0) : 100}%
                </span>
              </div>
              <div className="w-full h-1.5 bg-white/20 rounded-full mt-2 overflow-hidden">
                <div 
                  className="h-full bg-white transition-all duration-1000" 
                  style={{ width: `${divergenciasStats?.total > 0 ? Math.max(0, 100 - (divergenciasStats?.total * 2)) : 100}%` }}
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2 card bg-white p-6 flex flex-col gap-4">
               <div className="flex justify-between items-center px-2">
                 <h3 className="text-[10px] font-black text-secondary uppercase tracking-widest">Tendência de Inconsistências (Competência)</h3>
                 <span className="text-[9px] font-bold text-primary italic">Consolidado por Mês</span>
               </div>
               <div className="flex items-end gap-3 h-32 px-2 pb-2 border-b border-outline-variant/30">
                 {divergenciasStats?.timeline?.map((t: any, i: number) => (
                   <div key={i} className="flex-1 flex flex-col items-center gap-2 group cursor-help">
                      <div className="w-full bg-surface-container relative rounded-t-sm transition-all group-hover:bg-primary/20" style={{ height: `${Math.min(100, (t.count / 5) * 100)}%` }}>
                        <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-on-surface text-white text-[9px] font-bold px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-all">
                          {t.count}
                        </div>
                      </div>
                      <span className="text-[8px] font-bold text-secondary uppercase rotate-45 origin-left whitespace-nowrap mt-1">
                        {t.competencia.includes("-") ? 
                          `${t.competencia.split("-")[1]}/${t.competencia.split("-")[0]}` : 
                          t.competencia}
                      </span>
                   </div>
                 ))}
                 {(!divergenciasStats?.timeline || divergenciasStats.timeline.length === 0) && (
                   <div className="w-full h-full flex items-center justify-center text-[10px] text-secondary font-black uppercase opacity-20 italic">Sem dados históricos</div>
                 )}
               </div>
            </div>

            <div className="card bg-white p-6 flex flex-col gap-4">
              <h3 className="text-[10px] font-black text-secondary uppercase tracking-widest">Top Erros por Categoria</h3>
              <div className="space-y-3">
                {Object.entries(divergenciasStats?.byType || {}).sort((a: any, b: any) => b[1] - a[1]).slice(0, 5).map(([type, count]: any, i) => (
                  <div key={i} className="flex justify-between items-center text-[10px] font-bold">
                    <span className="text-secondary uppercase truncate w-32">{type.replace(/_/g, " ")}</span>
                    <div className="flex items-center gap-2 flex-1 ml-4">
                      <div className="h-1.5 bg-surface-container flex-1 rounded-full overflow-hidden">
                         <div className="h-full bg-primary" style={{ width: `${(count / (divergenciasStats?.total || 1)) * 100}%` }} />
                      </div>
                      <span className="text-on-surface w-4 text-right">{count}</span>
                    </div>
                  </div>
                ))}
                {Object.keys(divergenciasStats?.byType || {}).length === 0 && (
                   <p className="text-[10px] text-secondary italic font-bold uppercase opacity-30 text-center py-8">Nenhum dado</p>
                )}
              </div>
            </div>
          </div>

          <div className="card flex flex-col">
            <div className="px-lg py-6 border-b border-outline-variant flex justify-between items-center bg-white">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-error/10 rounded-sm flex items-center justify-center text-error">
                  <AlertCircle size={20} />
                </div>
                <div className="flex flex-col">
                  <h2 className="text-base font-extrabold text-on-surface tracking-tight">Registro Cronológico de Inconsistências</h2>
                  <div className="flex items-center gap-2 mt-1">
                    <p className="text-[11px] text-secondary font-medium italic">Fila de resolução para fechamento de exercício</p>
                    {(severidadeFilter || tipoFilter) && (
                      <button 
                        onClick={() => { setSeveridadeFilter(""); setTipoFilter(""); }}
                        className="text-[9px] font-black text-primary uppercase bg-primary/5 px-2 py-0.5 rounded border border-primary/10 hover:bg-primary/10 transition-all"
                      >
                        Limpar Filtros
                      </button>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="relative">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary" />
                  <input 
                    type="text" 
                    placeholder="Filtrar por nome ou CPF..."
                    className="pl-9 pr-4 py-1.5 bg-surface border border-outline-variant rounded-sm text-[10px] font-bold uppercase tracking-widest w-64 focus:ring-1 focus:ring-primary outline-none transition-all"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <select 
                    className="px-3 py-1.5 bg-surface border border-outline-variant rounded-sm text-[10px] font-bold uppercase tracking-widest"
                    value={severidadeFilter}
                    onChange={(e) => setSeveridadeFilter(e.target.value)}
                  >
                    <option value="">Severidade (Todas)</option>
                    <option value="CRITICA">Crítica</option>
                    <option value="ALTA">Alta</option>
                    <option value="MEDIA">Média</option>
                    <option value="BAIXA">Baixa</option>
                  </select>
                  <select 
                    className="px-3 py-1.5 bg-surface border border-outline-variant rounded-sm text-[10px] font-bold uppercase tracking-widest"
                    value={tipoFilter}
                    onChange={(e) => setTipoFilter(e.target.value)}
                  >
                    <option value="">Tipo (Todos)</option>
                    <option value="PENSAO_DIVERGENTE">Pensão Divergente</option>
                    <option value="PLANO_SAUDE_DIVERGENTE">Plano de Saúde</option>
                    <option value="BASE_IRRF_DIVERGENTE">Base IRRF</option>
                    <option value="CPF_NAO_CADASTRADO">CPF não cadastrado</option>
                    <option value="EMPRESA_NAO_CADASTRADA">Empresa não cadastrada</option>
                  </select>
                </div>
                <div className="h-8 w-[1px] bg-outline-variant" />
                <button 
                  onClick={() => fetchDivergencias(severidadeFilter, tipoFilter)}
                  className="p-2 hover:bg-surface-container rounded-full transition-all text-secondary"
                  title="Atualizar Dados"
                >
                  <History size={18} className={isLoading ? "animate-spin" : ""} />
                </button>
              </div>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-surface text-[10px] font-black text-secondary uppercase tracking-widest">
                    <th className="px-lg py-4 border-b border-outline-variant">Identificação</th>
                    <th className="px-lg py-4 border-b border-outline-variant">Tipo / Severidade</th>
                    <th className="px-lg py-4 border-b border-outline-variant w-1/3">Descrição da Inconsistência</th>
                    <th className="px-lg py-4 border-b border-outline-variant">Data Detecção</th>
                    <th className="px-lg py-4 border-b border-outline-variant text-right">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant">
                  {isLoading ? (
                    <tr>
                      <td colSpan={5} className="px-lg py-20 text-center"><LoadingSpinner size="md" className="inline-block" /></td>
                    </tr>
                  ) : divergenciasData.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-lg py-32 text-center text-xs text-secondary italic font-bold uppercase tracking-widest opacity-40">Nenhuma inconsistência pendente. Sistema saudável.</td>
                    </tr>
                  ) : (
                    divergenciasData.map((d: any) => (
                      <tr key={d.id} className="hover:bg-surface-container/30 transition-all">
                        <td className="px-lg py-5">
                           <div className="flex flex-col">
                             <span className="text-sm font-bold text-on-surface">
                               {d.fechamento?.trabalhador?.nome || d.trabalhador?.nome || d.descricao?.split('(')[1]?.split(')')[0] || "Trabalhador não identificado"}
                             </span>
                             <span className="text-[10px] text-secondary font-black uppercase tracking-tight">
                                {d.fechamento ? (
                                  <>CPF: {d.fechamento.trabalhador?.cpf} | {d.fechamento.empresa?.razaoSocial}</>
                                ) : d.trabalhador ? (
                                  <>CPF: {d.trabalhador.cpf} | {d.empresa?.razaoSocial || "Empresa não identificada"}</>
                                ) : (
                                  <>Inconsistência de Cadastro Detectada</>
                                )}
                             </span>
                           </div>
                        </td>
                        <td className="px-lg py-5">
                           <div className="flex flex-col gap-1.5">
                              <span className="text-[10px] font-bold text-on-surface">{d.tipo}</span>
                              <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase w-fit ${
                                d.severidade === 'CRITICA' ? 'bg-error text-white' :
                                d.severidade === 'ALTA' ? 'bg-orange-500 text-white' :
                                'bg-amber-100 text-amber-700'
                              }`}>
                                Severidade: {d.severidade}
                              </span>
                           </div>
                        </td>
                        <td className="px-lg py-5 text-xs font-medium text-secondary leading-relaxed bg-surface/10 italic">
                          {d.dtEmissao ? `Emissão: ${new Date(d.dtEmissao).toLocaleDateString()} | ` : ''}{d.descricao}
                        </td>
                        <td className="px-lg py-5 text-[11px] font-bold text-secondary">
                          {new Date(d.createdAt).toLocaleDateString('pt-BR')}
                        </td>
                        <td className="px-lg py-5 text-right">
                           <button 
                             onClick={() => resolveDivergencia(d.id, true)}
                             className="p-2.5 bg-emerald-50 text-emerald-600 border border-emerald-100 rounded-sm hover:bg-emerald-600 hover:text-white transition-all shadow-sm"
                             title="Marcar como Resolvido"
                           >
                              <CheckCheck size={16} />
                           </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      );
    }

    if (activeTab === "Consolidação Anual") {
      return (
        <div className="card flex flex-col">
          <div className="px-lg py-6 border-b border-outline-variant flex justify-between items-center bg-white">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-emerald-100 rounded-sm flex items-center justify-center text-emerald-700">
                <TrendingUp size={20} />
              </div>
              <div>
                <h2 className="text-base font-extrabold text-on-surface tracking-tight">Consolidação Fiscal Anual</h2>
                <p className="text-[11px] text-secondary font-medium italic">Base consolidada para DIRF e Informe de Rendimentos</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <select 
                className="px-4 py-2 bg-surface border border-outline-variant rounded-sm text-xs font-bold"
                value={selectedPeriodo}
                onChange={(e) => setSelectedPeriodo(e.target.value)}
              >
                <option value="">Selecionar Período</option>
                {Array.isArray(stats?.periodos) && Array.from(new Set(
                  stats.periodos.map((p: any) => p?.anoCalendario).filter((ano: any) => ano !== undefined && ano !== null)
                )).map((ano: any) => (
                  <option key={ano} value={`${ano}-01`}>{ano}</option>
                ))}
              </select>
              <button 
                className="btn-primary flex items-center gap-2 py-2 px-6"
                disabled={isConsolidating || !selectedPeriodo}
                onClick={handleConsolidation}
              >
                {isConsolidating ? <LoadingSpinner size="xs" /> : <Settings2 size={14} />}
                <span>Processar Consolidação</span>
              </button>
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-surface text-[10px] font-black text-secondary uppercase tracking-widest">
                  <th className="px-lg py-4 border-b border-outline-variant">Empresa / Trabalhador</th>
                  <th className="px-lg py-4 border-b border-outline-variant">Exercício</th>
                  <th className="px-lg py-4 border-b border-outline-variant text-center">Rend. Tributáveis</th>
                  <th className="px-lg py-4 border-b border-outline-variant text-center">IRRF Retido</th>
                  <th className="px-lg py-4 border-b border-outline-variant text-center">Saúde / Deduções</th>
                  <th className="px-lg py-4 border-b border-outline-variant text-center">Divergências</th>
                  <th className="px-lg py-4 border-b border-outline-variant text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant">
                {isLoading ? (
                  <tr>
                    <td colSpan={7} className="px-lg py-20 text-center"><LoadingSpinner size="md" className="inline-block" /></td>
                  </tr>
                ) : fechamentosData.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-lg py-32 text-center text-xs text-secondary italic font-bold uppercase tracking-widest opacity-40">Nenhum fechamento anual realizado. Selecione um período e processe.</td>
                  </tr>
                ) : (
                  fechamentosData.map((f: any) => (
                    <tr key={f.id} className="hover:bg-surface-container/30 transition-all group">
                      <td className="px-lg py-5">
                         <div className="flex flex-col">
                           <span className="text-sm font-bold text-on-surface">{f.trabalhador?.nome || "N/A"}</span>
                           <span className="text-[10px] text-secondary font-black uppercase tracking-tight">{f.empresa?.razaoSocial || "N/A"} ({f.trabalhador?.cpf || "N/A"})</span>
                         </div>
                      </td>
                      <td className="px-lg py-5 text-sm font-bold text-on-surface">{f.ano}</td>
                      <td className="px-lg py-5 text-sm font-black text-on-surface text-center tabular-nums">
                        R$ {Number(f.totalRendTrib).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-lg py-5 text-sm font-black text-on-surface text-center tabular-nums">
                        R$ {Number(f.totalIrrf).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-lg py-5 text-sm font-black text-on-surface text-center tabular-nums">
                        R$ {Number(f.totalPlanoSaude).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-lg py-5 text-center">
                         {(f.divergencias?.length || 0) > 0 ? (
                           <span className="px-3 py-1 bg-error/10 text-error text-[9px] font-bold uppercase rounded-full">
                             {f.divergencias?.length} Divergências
                           </span>
                         ) : (
                           <span className="px-3 py-1 bg-emerald-50 text-emerald-600 text-[9px] font-bold uppercase rounded-full">
                             Consolidado
                           </span>
                         )}
                      </td>
                      <td className="px-lg py-5 text-right">
                         <div className="flex justify-end gap-2 text-right">
                           <button 
                             onClick={() => {
                               setSelectedFechamento(f);
                               setShowInformeModal(true);
                             }}
                             className="p-2 bg-surface hover:bg-white border border-outline-variant rounded transition-all shadow-sm"
                           >
                              <Eye size={14} className="text-primary" />
                           </button>
                            <button 
                              onClick={() => handleDownloadInforme(f)}
                              title="Baixar Comprovante PDF"
                              className="p-2 bg-surface hover:bg-white border border-outline-variant rounded transition-all shadow-sm"
                            >
                              <Download size={14} className="text-secondary" />
                           </button>
                         </div>
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
            <div className="flex flex-col">
              <h2 className="text-base font-extrabold text-on-surface tracking-tight">Painel de Auditoria S-5002</h2>
              <p className="text-[11px] text-secondary font-medium italic">
                A auditoria de XMLs S-5002 realiza o cruzamento dos dados oficiais do governo (bases de cálculo e valores retidos) 
                com os registros do sistema, garantindo a integridade da DIRF e identificando divergências fiscais.
              </p>
            </div>
            <div className="flex items-center gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-primary" size={14} />
                <input 
                  type="text"
                  placeholder="Buscar CPF ou CNPJ..."
                  className="pl-10 pr-4 py-2 bg-surface border border-outline-variant rounded-sm text-xs focus:ring-1 focus:ring-primary outline-none transition-all w-64 uppercase font-bold tracking-tighter"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <button 
                className="btn-outline flex items-center gap-2 py-2 px-4 bg-white border-primary/20 text-primary hover:bg-primary/5 transition-all text-xs font-bold"
                onClick={handleRefreshAudit}
                disabled={isLoading || isUploading}
              >
                <History size={14} className={isLoading ? "animate-spin" : ""} />
                <span>Atualizar Auditoria</span>
              </button>
              <button 
                type="button"
                className="btn-primary flex items-center gap-2 py-2 px-6 shadow-lg shadow-primary/20 text-xs font-bold disabled:opacity-50"
                onClick={() => document.getElementById("s5002-upload")?.click()}
                disabled={isUploading}
              >
                <CloudUpload size={14} />
                <span>{isUploading ? "Aguarde..." : "Importar Novos XMLs"}</span>
              </button>
              <input id="s5002-upload" type="file" multiple className="hidden" accept=".xml" onChange={handleS5002Upload} />
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
                    <td colSpan={7} className="px-lg py-20 text-center"><LoadingSpinner size="md" className="inline-block" /></td>
                  </tr>
                ) : auditData.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-lg py-32 text-center text-xs text-secondary italic font-bold uppercase tracking-widest opacity-40">Nenhum evento auditado ainda. Importe arquivos XML S-5002.</td>
                  </tr>
                ) : (
                  auditData.map((event: any) => (
                    <tr key={event.id} className="hover:bg-surface-container/30 transition-all group">
                      <td className="px-lg py-5 text-sm font-bold text-on-surface">
                        {event.perApur && event.perApur.includes("-") ? 
                          `${event.perApur.split("-")[1]}/${event.perApur.split("-")[0]}` : 
                          (event.competencia && event.competencia.includes("-") ? 
                            `${event.competencia.split("-")[1]}/${event.competencia.split("-")[0]}` : 
                            (event.perApur || event.competencia || "N/A")
                          )
                        }
                      </td>
                      <td className="px-lg py-5">
                         <div className="flex flex-col">
                           <span className="text-sm font-bold text-primary">{event.trabalhador?.cpf || "N/A"}</span>
                           <span className="text-[10px] text-secondary font-black uppercase tracking-tight">{event.trabalhador?.nome || "N/A"}</span>
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
                         
                         {event.audit.isRetificacaoRetroativa && (
                           <span className="block mt-1 text-[8px] font-black text-amber-600 border border-amber-200 bg-amber-50 px-1 rounded uppercase tracking-tighter">Retificado (DIRF 2026)</span>
                         )}

                         {event.audit.healthPlanError && (
                           <span className="block mt-1 text-[8px] font-black text-error border border-error/20 bg-error/5 px-1 rounded uppercase tracking-tighter">Erro Plano Saúde</span>
                         )}

                         {event.audit.pensionError && (
                           <span className="block mt-1 text-[8px] font-black text-error border border-error/20 bg-error/5 px-1 rounded uppercase tracking-tighter">Erro de Pensão</span>
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
        {/* Progress Overlay */}
        {isUploading && (
          <div className="fixed inset-0 z-[10000] bg-black/40 backdrop-blur-sm flex flex-col items-center justify-center gap-4">
            <div className="bg-white p-8 rounded-sm shadow-2xl flex flex-col items-center gap-4 max-w-xs w-full">
              <LoadingSpinner size="lg" />
              <div className="text-center">
                <p className="text-sm font-black text-on-surface uppercase tracking-widest">Processando Auditoria...</p>
                <p className="text-[10px] text-secondary font-medium italic mt-1">Isso pode levar alguns minutos dependendo do volume de arquivos.</p>
              </div>
              <div className="w-full bg-surface-container rounded-full h-1.5 mt-2 overflow-hidden">
                <motion.div 
                  className="bg-primary h-full rounded-full" 
                  initial={{ width: 0 }}
                  animate={{ width: "100%" }}
                  transition={{ duration: 15, repeat: Infinity }}
                />
              </div>
            </div>
          </div>
        )}

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
                        <LoadingSpinner size="md" />
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
                      {isUploading ? <LoadingSpinner size="lg" /> : <CloudUpload size={32} />}
                    </div>
                    <div>
                      <p className="text-white font-bold text-xs uppercase tracking-widest">Soltar CSV aqui</p>
                      <p className="text-white/40 text-[9px] font-black uppercase mt-1">Ou clique para buscar</p>
                    </div>
                </div>
                <input id="footer-upload" type="file" className="hidden" onChange={(e) => handleFileUpload(e, "54")} />
            </div>
          </div>
        </div>
      </>
    );
  };

  return (
    <div className="flex flex-col gap-8 -mt-margin-page -mx-margin-page p-margin-page h-full bg-[#FAF9FC]">
      {renderDataModal()}
      {showInformeModal && renderInformeModal()}
      
      {isSyncing && (
        <div className="card bg-white border-l-4 border-primary p-6 animate-pulse shadow-sm rounded-lg flex flex-col gap-2 -mx-2 mt-2">
           <div className="flex justify-between items-center">
              <span className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-[#6c5ecf]">
                <LoadingSpinner size="xs" />
                Sincronizando Consolidação e Calculando Alíquotas ({syncCounts.pendingCount + syncCounts.processingCount} lote(s) pendente(s))
              </span>
              <span className="text-[9px] font-black p-1 bg-[#6c5ecf]/10 rounded text-[#6c5ecf] animate-pulse">Sincronizando Fila S-5002</span>
           </div>
           <p className="text-[11px] text-secondary">
             O sistema está integrando os proventos consolidados, gerando lastros e recalculando os filtros de consulta das DIRFs de forma segura dos lotes XMLs recém-carregados. Esta página atualizará gradualmente seus relatórios e consultas.
           </p>
        </div>
      )}

      {/* Top Header Section */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 border border-outline-variant bg-white px-6 py-4 xl:py-6 h-auto sticky top-0 z-30 shadow-sm transition-all rounded-sm">
        <div className="flex items-center gap-1 w-full xl:w-auto">
          <div className="relative w-full xl:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-outline" size={16} />
            <input 
              type="text" 
              placeholder="Buscar código ou rubrica..." 
              className="bg-surface pl-10 pr-4 py-2 w-full text-sm outline-none focus:ring-1 focus:ring-primary rounded-sm transition-all"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <nav className="flex items-center gap-1 overflow-x-auto whitespace-nowrap max-w-full w-full xl:w-auto py-1 xl:py-0 scrollbar-none scroll-smooth">
          {["Auditoria S-5002", "Conferência DIRF", "Consolidação Anual", "Divergências Fiscais", "Importar XML", "Automação S-5002", "Tabelas", "Histórico", "Relatórios"].map((tab) => (
            <button
              key={tab}
              onClick={() => {
                setActiveTab(tab);
                setCurrentPage(1);
              }}
              className={cn(
                "px-4 xl:px-6 py-2.5 text-sm font-semibold relative transition-all rounded-sm shrink-0",
                activeTab === tab ? "text-primary bg-primary/5 font-extrabold after:absolute after:bottom-0 after:left-2 after:right-2 after:h-0.5 after:bg-primary" : "text-secondary hover:text-on-surface hover:bg-surface/50"
              )}
            >
              {tab}
            </button>
          ))}
        </nav>
      </div>

      {/* Main Content Title */}
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-3xl font-extrabold text-on-surface tracking-tight">
            {tabMetadata[activeTab]?.title || "Tabelas eSocial"}
          </h1>
          <p className="text-sm text-secondary font-medium mt-1">
            {tabMetadata[activeTab]?.subtitle || "Consulte as tabelas oficiais e parametrize o motor de interpretação de tributos."}
          </p>
        </div>
        {activeTab === "Tabelas" && (
          <div className="flex gap-3">
            <button 
              className="btn-outline flex items-center gap-2 bg-white" 
              onClick={() => window.open(`/api/esocial/export?tableId=${selectedTable}`, "_blank")}
            >
              <Download size={16} />
              <span>Exportar Tudo</span>
            </button>
            <button type="button" className="btn-primary flex items-center gap-2" onClick={() => document.getElementById("header-upload")?.click()}>
              <Plus size={16} />
              <span>Importar CSV</span>
            </button>
            <input id="header-upload" type="file" className="hidden" onChange={(e) => handleFileUpload(e, selectedTable)} />
          </div>
        )}
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

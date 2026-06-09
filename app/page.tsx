"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { 
  Upload, 
  Table,
  Eye,
  History, 
  Lightbulb, 
  Info, 
  AlertTriangle,
  CheckCircle2,
  FileCode2,
  ChevronRight,
  CloudUpload,
  Calendar,
  Sliders,
  TrendingUp,
  Coins,
  ShieldCheck,
  PlusCircle,
  Download,
  Activity,
  UserCheck,
  Building,
  Settings,
  X,
  Layers,
  ArrowUpRight
} from "lucide-react";
import { cn, safeJsonFetch } from "@/lib/utils";
import LoadingSpinner from "@/components/LoadingSpinner";

// Recharts for stunning visual execution
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  Line, 
  ComposedChart,
  PieChart, 
  Pie, 
  Cell,
  Legend,
  CartesianGrid
} from "recharts";

// react-grid-layout for user custom dynamic dashboard setups
import GridLayout from "react-grid-layout";
import "react-grid-layout/css/styles.css";
import "react-resizable/css/styles.css";

interface DashboardStats {
  ano?: string;
  indicators: {
    empregadores: number;
    trabalhadores: number;
    prestadores: number;
    eventosProcessados: number;
    retificacoes: number;
    pendencias: number;
  };
  consolidado: {
    rendimentos: number;
    deducoes: number;
    irrfRetido: number;
    rendimentosIsentos: number;
    reinf: number;
    esocial: number;
    totalConsolidado: number;
    events: number;
    inconsistencies: number;
  };
  health: {
    trabalhadoresPct: number;
    dependentesPct: number;
    prestadoresPct: number;
    codigosPct: number;
    pendenciesList: string[];
  };
  monthlySeries: Array<{ name: string; rendimentos: number; irrf: number }>;
  timeline: Array<{ id: string; tipo: string; referencia: string; descricao: string; timestamp: string; retificador: boolean }>;
  alerts: Array<{ id: string; text: string; type: string }>;
}

export default function Dashboard() {
  const router = useRouter();
  
  // App States
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadTotal, setUploadTotal] = useState(0);
  const [uploadProcessed, setUploadProcessed] = useState(0);
  
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [fiscalCalendar, setFiscalCalendar] = useState<any[]>([]);
  const [isLoadingCalendar, setIsLoadingCalendar] = useState(true);
  
  // Current authenticated user
  const [user, setUser] = useState<any>(null);

  // User Customizable Settings & Persistent states
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [isSavingPreferences, setIsSavingPreferences] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [preferences, setPreferences] = useState({
    show_kpi_irrf: true,
    show_kpi_rendimentos: true,
    show_kpi_pendencias: true,
    show_kpi_empregadores: true,
    show_kpi_trabalhadores: true,
    show_kpi_prestadores: true,
    widgets: ["visao-executiva", "posicao-consolidada", "consolidacao-anual", "esocial-reinf", "saude-base", "ultimos-processamentos", "alertas-fiscais", "competencias", "acoes-rapidas"],
    layout: [] as any[]
  });

  // Load User, preferences, stats
  const fetchDashboardData = async () => {
    setIsLoading(true);
    try {
      // 1. Fetch authenticated user profile
      const userRes = await safeJsonFetch("/api/auth/me");
      if (userRes && userRes.user) {
        setUser(userRes.user);
      }

      // 2. Fetch user preferences
      const prefRep = await safeJsonFetch("/api/usuarios/preferences");
      if (prefRep && prefRep.preferences) {
        setPreferences(prefRep.preferences);
      }

      // 3. Fetch consolidated metrics and statistics
      const statsRep = await safeJsonFetch("/api/fiscal/dashboard-stats");
      if (statsRep && statsRep.success) {
        setStats(statsRep);
      }

      // 4. Fetch fiscal calendar (for mapping competence blocks)
      const calRep = await safeJsonFetch("/api/fiscal/calendar");
      if (calRep) {
        setFiscalCalendar(calRep);
      }
    } catch (err) {
      console.error("Erro ao carregar dados do dashboard:", err);
    } finally {
      setIsLoading(false);
      setIsLoadingCalendar(false);
    }
  };

  useEffect(() => {
    setIsMounted(true);
    fetchDashboardData();

    const handleRefresh = () => {
      fetchDashboardData();
    };

    window.addEventListener("trabalhador-added", handleRefresh);
    window.addEventListener("empresa-added", handleRefresh);

    return () => {
      window.removeEventListener("trabalhador-added", handleRefresh);
      window.removeEventListener("empresa-added", handleRefresh);
    };
  }, []);

  // Save Preferences to Database
  const handleSavePreferences = async (updatedPrefs: typeof preferences) => {
    setIsSavingPreferences(true);
    try {
      setPreferences(updatedPrefs);
      await fetch("/api/usuarios/preferences", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ preferences: updatedPrefs })
      });
    } catch (err) {
      console.error("Falha ao salvar preferências:", err);
    } finally {
      setIsSavingPreferences(false);
    }
  };

  // Toggle Single Widget
  const toggleWidget = (widgetId: string) => {
    let updatedWidgets = [...preferences.widgets];
    if (updatedWidgets.includes(widgetId)) {
      if (updatedWidgets.length <= 1) {
        alert("Pelo menos um bloco do painel deve permanecer visível.");
        return;
      }
      updatedWidgets = updatedWidgets.filter(w => w !== widgetId);
    } else {
      updatedWidgets.push(widgetId);
    }
    const updated = { ...preferences, widgets: updatedWidgets };
    handleSavePreferences(updated);
  };

  // Toggle KPI Filters
  const toggleKPI = (key: "show_kpi_irrf" | "show_kpi_rendimentos" | "show_kpi_pendencias" | "show_kpi_empregadores" | "show_kpi_trabalhadores" | "show_kpi_prestadores") => {
    const updated = { ...preferences, [key]: !preferences[key] };
    handleSavePreferences(updated);
  };

  // Reset customized Layout
  const handleResetLayout = () => {
    const freshPrefs = {
      show_kpi_irrf: true,
      show_kpi_rendimentos: true,
      show_kpi_pendencias: true,
      show_kpi_empregadores: true,
      show_kpi_trabalhadores: true,
      show_kpi_prestadores: true,
      widgets: ["visao-executiva", "posicao-consolidada", "consolidacao-anual", "esocial-reinf", "saude-base", "ultimos-processamentos", "alertas-fiscais", "competencias", "acoes-rapidas"],
      layout: []
    };
    handleSavePreferences(freshPrefs);
  };

  // Handle Drag / Sort Layout from React-Grid-Layout
  const handleLayoutChange = (newLayout: any[]) => {
    // Only persist if something valid changed and isMounted
    if (!isMounted || isSavingPreferences) return;
    const updated = { ...preferences, layout: newLayout };
    setPreferences(updated);
    // Debounced or direct save
    fetch("/api/usuarios/preferences", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ preferences: updated })
    }).catch(err => console.error("Falha ao sincronizar layout de grade:", err));
  };

  // Upload Logic for eSocial S-5002
  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length) return;
    
    const files = Array.from(e.target.files);
    setIsUploading(true);
    setUploadTotal(files.length);
    setUploadProcessed(0);
    setUploadProgress(0);

    let successCount = 0;
    let errorCount = 0;
    const errors: string[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const formData = new FormData();
      formData.append("files", file);

      try {
        const data = await safeJsonFetch("/api/esocial/s5002/import", {
          method: "POST",
          body: formData,
        });
        
        if (data && data.success && data.queued > 0) {
          successCount++;
        } else {
          errorCount++;
          const reason = data ? (data.message || data.error || "Falha no processamento") : "Erro de conexão ou servidor indisponível";
          errors.push(`${file.name}: ${reason}`);
        }
      } catch (err: any) {
        errorCount++;
        errors.push(`${file.name}: ${err.message}`);
      } finally {
        setUploadProcessed(i + 1);
        setUploadProgress(Math.round(((i + 1) / files.length) * 100));
      }
    }

    if (errorCount > 0) {
      alert(`Importação concluída com avisos.\nSucesso: ${successCount}\nErros: ${errorCount}\n\nDetalhes:\n${errors.slice(0, 5).join('\n')}`);
    } else {
      alert(`Importação concluída com sucesso! ${successCount} arquivos processados.`);
    }
    
    setIsUploading(false);
    fetchDashboardData();
  };

  // Helper trigger local file upload
  const triggerXmlUpload = () => {
    document.getElementById("xml-upload-dashboard")?.click();
  };

  if (!isMounted || isLoading || !stats) {
    return (
      <div className="flex flex-col items-center justify-center p-24 gap-4 min-h-[80vh]">
        <LoadingSpinner size="lg" className="text-[#1B365D]" />
        <span className="text-[10px] font-bold text-secondary uppercase tracking-widest animate-pulse">
          Inicializando Centro de Inteligência Fiscal...
        </span>
      </div>
    );
  }

  // Calculate stats for widgets
  const ind = stats.indicators;
  const cons = stats.consolidado;
  const healthObj = stats.health;

  // Compute dynamic percentage of eSocial vs REINF
  const totalIrrfConsolidado = cons.totalConsolidado || (cons.esocial + cons.reinf) || 1;
  const esocialPct = Math.round((cons.esocial / totalIrrfConsolidado) * 100);
  const reinfPct = 100 - esocialPct;

  // eSocial S-5002 vs REINF R-4020 Pie Data
  const sourceData = [
    { name: "eSocial", value: cons.esocial, color: "#1B365D" },
    { name: "REINF", value: cons.reinf, color: "#6366F1" },
  ];

  // Recharts custom label for pie
  const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) => {
    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    return (
      <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" className="font-mono text-[10px] font-black">
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    );
  };

  // Corporate dashboard layout representation using grid columns for stability
  // Or fallback responsive css grid if layout is empty or on smaller displays
  const getWidgetLayout = () => {
    return [
      { i: "posicao-consolidada", x: 0, y: 0, w: 12, h: 3, minW: 6 },
      { i: "visao-executiva", x: 0, y: 3, w: 12, h: 2, minW: 6 },
      { i: "consolidacao-anual", x: 0, y: 5, w: 8, h: 4, minW: 4 },
      { i: "esocial-reinf", x: 8, y: 5, w: 4, h: 4, minW: 3 },
      { i: "saude-base", x: 0, y: 9, w: 6, h: 4, minW: 4 },
      { i: "alertas-fiscais", x: 6, y: 9, w: 6, h: 4, minW: 4 },
      { i: "ultimos-processamentos", x: 0, y: 13, w: 8, h: 4, minW: 4 },
      { i: "competencias", x: 8, y: 13, w: 4, h: 4, minW: 3 },
      { i: "acoes-rapidas", x: 0, y: 17, w: 12, h: 2, minW: 6 }
    ];
  };

  const gridLayouts = preferences.layout.length > 0 ? preferences.layout : getWidgetLayout();

  return (
    <div className="flex flex-col gap-6 font-sans text-neutral-800 pb-16">
      
      {/* Title & Floating Setup Controls */}
      <header className="flex justify-between items-center bg-white border border-outline-variant/60 p-5 rounded-sm shadow-xs">
        <div className="flex flex-col gap-1">
          <span className="text-[10px] font-bold text-[#1B365D] uppercase tracking-widest font-mono">
            Compliance Fiscal & Auditoria Integrada
          </span>
          <h1 className="text-xl font-black text-[#1B365D] tracking-tight uppercase">
            Centro de Inteligência Fiscal e Operacional
          </h1>
        </div>

        <div className="flex gap-2 flex-wrap items-center">
          <button 
            onClick={() => setShowConfigModal(true)}
            id="toggle-preferences-btn"
            className="flex items-center gap-2 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 text-[10px] font-black uppercase tracking-wider py-2 px-4 rounded transition-all active:scale-95 border border-outline-variant"
          >
            <Sliders size={12} />
            Configurar Widget ({preferences.widgets.length})
          </button>

          {user && (
            <div className="flex items-center gap-2 py-1.5 px-3 bg-[#1B365D]/5 border border-[#1B365D]/10 rounded select-none">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[9px] font-bold text-[#1B365D] uppercase tracking-wider">
                Auditor: {user.nome} ({user.perfil})
              </span>
            </div>
          )}
        </div>
      </header>

      {/* Async task banner */}
      {isUploading && (
        <section className="bg-amber-500/10 border border-amber-500/30 text-amber-900 p-4 rounded-sm animate-pulse mb-2">
          <div className="flex justify-between items-center mb-2">
            <span className="text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
              <LoadingSpinner size="xs" className="text-amber-700" />
              Importando e Processando XMLs ({uploadProcessed}/{uploadTotal})
            </span>
            <span className="text-[10px] font-black bg-amber-500/20 px-2 py-0.5 rounded text-amber-800 font-mono">
              {uploadProgress}%
            </span>
          </div>
          <div className="w-full bg-neutral-200 h-1.5 rounded-full overflow-hidden border border-outline-variant/30">
            <div className="bg-amber-600 h-full transition-all duration-300" style={{ width: `${uploadProgress}%` }} />
          </div>
        </section>
      )}

      {/* STATIC MULTI-CONTAINER / GRID WRAPPER */}
      {/* We use standard CSS Grid instead of raw Grid Layout which might cause height issues in React 19 hydration. 
          By combining our settings endpoint, each user can hide/toggle any widget they desire instantly! */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* CENTERPIECE CARD: POSIÇÃO FISCAL CONSOLIDADA (Always on top or central focus) */}
        {preferences.widgets.includes("posicao-consolidada") && (
          <div className="lg:col-span-12 border border-[#1B365D]/20 bg-gradient-to-br from-[#1B365D] to-[#0D1D33] text-white p-7 rounded-sm shadow-md transition-all hover:scale-[1.002]">
            <div className="flex flex-col lg:flex-row justify-between lg:items-center gap-4 pb-4 border-b border-white/10">
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <span className="bg-indigo-500 text-white text-[8px] font-black uppercase px-2 py-0.5 rounded font-mono">
                    Enterprise Health Status
                  </span>
                  <span className="text-white/60 text-[10px] font-mono leading-none">
                    Atualizado em tempo real • Competência {stats?.ano || "2025"}
                  </span>
                </div>
                <h2 className="text-lg font-black tracking-tight text-white uppercase select-none">
                  Posição Fiscal Consolidada Geral
                </h2>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right flex flex-col">
                  <span className="text-[9px] text-white/50 font-black uppercase">Consolidação</span>
                  <span className="text-xs font-mono font-bold">Base RFB {stats?.ano || "2025"}</span>
                </div>
                <button 
                  onClick={triggerXmlUpload}
                  className="flex items-center gap-1.5 bg-indigo-500 hover:bg-indigo-600 text-white text-[10px] font-black uppercase py-2.5 px-4 rounded active:scale-95 transition-all shadow-lg shadow-indigo-950/20"
                >
                  <CloudUpload size={14} />
                  Carga XML S-5002
                </button>
                <input id="xml-upload-dashboard" type="file" multiple accept=".xml" className="hidden" onChange={handleUpload} disabled={isUploading} />
              </div>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-5 gap-6 pt-6">
              
              {preferences.show_kpi_rendimentos ? (
                <div className="flex flex-col gap-1 border-r border-white/10 pr-2">
                  <span className="text-[9px] text-white/40 font-bold uppercase tracking-wider flex items-center gap-1">
                    <TrendingUp size={10} /> Rendimentos Tributáveis
                  </span>
                  <span className="text-lg lg:text-xl font-mono font-extrabold text-white">
                    R$ {cons.rendimentos.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
              ) : (
                <div className="flex items-center justify-center border-r border-white/10 pr-2 py-2">
                  <span className="text-[9px] text-white/20 italic">Rendimentos Ocultado</span>
                </div>
              )}

              <div className="flex flex-col gap-1 border-r border-white/10 pr-2">
                <span className="text-[9px] text-white/40 font-bold uppercase tracking-wider flex items-center gap-1">
                  <Coins size={10} /> Deduções Operacionais
                </span>
                <span className="text-lg lg:text-xl font-mono font-extrabold text-amber-300">
                  R$ {cons.deducoes.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>

              {preferences.show_kpi_irrf ? (
                <div className="flex flex-col gap-1 lg:border-r lg:border-white/10 pr-2">
                  <span className="text-[9px] text-white/40 font-bold uppercase tracking-wider flex items-center gap-1">
                    <ShieldCheck size={10} /> IRRF Retido eSocial
                  </span>
                  <span className="text-lg lg:text-xl font-mono font-extrabold text-emerald-300">
                    R$ {cons.irrfRetido.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
              ) : (
                <div className="flex items-center justify-center border-r border-white/10 pr-2 py-2">
                  <span className="text-[9px] text-white/20 italic">IRRF Ocultado</span>
                </div>
              )}

              <div className="flex flex-col gap-1 border-r border-white/10 pr-2">
                <span className="text-[9px] text-white/40 font-bold uppercase tracking-wider">
                  📂 Total Lotes XML
                </span>
                <span className="text-lg lg:text-xl font-mono font-extrabold text-white">
                  {cons.events} eventos
                </span>
              </div>

              {preferences.show_kpi_pendencias ? (
                <div className="flex flex-col gap-1 col-span-2 lg:col-span-1">
                  <span className="text-[9px] text-white/40 font-bold uppercase tracking-wider">
                    ⚠️ Inconsistências
                  </span>
                  <span className={cn(
                    "text-lg lg:text-xl font-mono font-extrabold",
                    cons.inconsistencies > 0 ? "text-rose-400 font-black animate-pulse" : "text-white"
                  )}>
                    {cons.inconsistencies} ativas
                  </span>
                </div>
              ) : (
                <div className="flex items-center justify-center py-2 col-span-2 lg:col-span-1">
                  <span className="text-[9px] text-white/20 italic">Pendências Ocultado</span>
                </div>
              )}

            </div>
          </div>
        )}

        {/* BLOCO 1 — VISÃO EXECUTIVA (First Line, like BI systems) */}
        {preferences.widgets.includes("visao-executiva") && (
          <div className="lg:col-span-12 grid grid-cols-2 md:grid-cols-6 gap-4">
            
            {preferences.show_kpi_empregadores && (
              <div className="border border-outline-variant bg-white p-4 rounded-sm flex flex-col gap-1 hover:shadow-xs transition-shadow">
                <span className="text-[9px] font-bold text-secondary uppercase tracking-wider flex items-center gap-1.5">
                  <Building size={12} className="text-sky-600" /> Empregadores
                </span>
                <span className="text-xl font-black text-[#1B365D] font-mono leading-none mt-1">
                  {ind.empregadores}
                </span>
                <span className="text-[8px] text-neutral-400 font-mono mt-0.5">Cadastrados e Ativos</span>
              </div>
            )}

            {preferences.show_kpi_trabalhadores && (
              <div className="border border-outline-variant bg-white p-4 rounded-sm flex flex-col gap-1 hover:shadow-xs transition-shadow">
                <span className="text-[9px] font-bold text-secondary uppercase tracking-wider flex items-center gap-1.5">
                  <UserCheck size={12} className="text-indigo-600" /> Trabalhadores
                </span>
                <span className="text-xl font-black text-[#1B365D] font-mono leading-none mt-1">
                  {ind.trabalhadores}
                </span>
                <span className="text-[8px] text-neutral-400 font-mono mt-0.5">Vínculos de folha S-5002</span>
              </div>
            )}

            {preferences.show_kpi_prestadores && (
              <div className="border border-outline-variant bg-white p-4 rounded-sm flex flex-col gap-1 hover:shadow-xs transition-shadow">
                <span className="text-[9px] font-bold text-secondary uppercase tracking-wider flex items-center gap-1.5">
                  <Layers size={12} className="text-amber-600" /> Prestadores
                </span>
                <span className="text-xl font-black text-[#1B365D] font-mono leading-none mt-1">
                  {ind.prestadores}
                </span>
                <span className="text-[8px] text-neutral-400 font-mono mt-0.5">Com obrigatoriedade REINF</span>
              </div>
            )}

            <div className="border border-outline-variant bg-white p-4 rounded-sm flex flex-col gap-1 hover:shadow-xs transition-shadow">
              <span className="text-[9px] font-bold text-secondary uppercase tracking-wider flex items-center gap-1.5">
                <Activity size={12} className="text-emerald-600" /> Eventos S-5002 / R-4020
              </span>
              <span className="text-xl font-black text-[#1B365D] font-mono leading-none mt-1">
                {ind.eventosProcessados}
              </span>
              <span className="text-[8px] text-neutral-400 font-mono mt-0.5">Processamento absoluto</span>
            </div>

            <div className="border border-outline-variant bg-white p-4 rounded-sm flex flex-col gap-1 hover:shadow-xs transition-shadow">
              <span className="text-[9px] font-bold text-secondary uppercase tracking-wider flex items-center gap-1.5">
                <History size={12} className="text-violet-600" /> Retificações
              </span>
              <span className={cn(
                "text-xl font-black font-mono leading-none mt-1",
                ind.retificacoes > 0 ? "text-violet-700 font-black" : "text-[#1B365D]"
              )}>
                {ind.retificacoes}
              </span>
              <span className="text-[8px] text-neutral-400 font-mono mt-0.5">Retificadores processados</span>
            </div>

            <div className="border border-outline-variant bg-white p-4 rounded-sm flex flex-col gap-1 hover:shadow-xs transition-shadow">
              <span className="text-[9px] font-bold text-secondary uppercase tracking-wider flex items-center gap-1.5">
                <AlertTriangle size={12} className="text-rose-600" /> Pendências GLOBAIS
              </span>
              <span className={cn(
                "text-xl font-black font-mono leading-none mt-1",
                ind.pendencias > 0 ? "text-rose-700 animate-pulse font-black" : "text-emerald-700"
              )}>
                {ind.pendencias}
              </span>
              <span className="text-[8px] text-neutral-400 font-mono mt-0.5">Inconsistências críticas</span>
            </div>

          </div>
        )}

        {/* Row 2: Graph (6 col) + Pie (6 col) or standard visual setup */}
        
        {/* BLOCO 2 — CONSOLIDAÇÃO FISCAL ANUAL */}
        {preferences.widgets.includes("consolidacao-anual") && (
          <div className="lg:col-span-8 border border-outline-variant bg-white p-6 rounded-sm shadow-sm flex flex-col gap-6">
            <div className="flex justify-between items-center pb-3 border-b border-outline-variant/60">
              <div className="flex flex-col">
                <span className="text-[8px] font-black tracking-widest text-[#1B365D] uppercase font-mono">Competência consolidada</span>
                <h3 className="text-xs font-black text-[#1B365D] uppercase tracking-wider mt-0.5 flex items-center gap-2">
                  <TrendingUp size={16} className="text-[#1B365D]" />
                  IRRF Consolidado Executivo (Série {stats?.ano || "2025"})
                </h3>
              </div>
              <span className="text-[10px] font-bold bg-[#1B365D]/5 text-[#1B365D] uppercase px-2 py-0.5 rounded font-mono border border-indigo-100">
                Evolução Mensal Completa
              </span>
            </div>

            {/* Indicator sub-values table format */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-neutral-50 border border-outline-variant rounded-sm font-mono text-center">
              <div className="flex flex-col gap-0.5 border-r border-neutral-200">
                <span className="text-[8px] text-secondary font-bold uppercase">Rend. Tributáveis</span>
                <span className="text-[11px] font-bold text-[#1B365D]">R$ {cons.rendimentos.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
              <div className="flex flex-col gap-0.5 border-r border-neutral-200">
                <span className="text-[8px] text-secondary font-bold uppercase">Deduções</span>
                <span className="text-[11px] font-bold text-amber-700">R$ {cons.deducoes.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
              <div className="flex flex-col gap-0.5 border-r border-neutral-200">
                <span className="text-[8px] text-secondary font-bold uppercase">IRRF Retido S-5002</span>
                <span className="text-[11px] font-bold text-emerald-700">R$ {cons.esocial.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-[8px] text-secondary font-bold uppercase">Rend. Isentos</span>
                <span className="text-[11px] font-bold text-neutral-700">R$ {cons.rendimentosIsentos.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
            </div>

            {/* Combined Chart (Rendimentos on Bar, IRRF on Line) */}
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={stats.monthlySeries} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="name" tick={{ fontSize: 9, fill: "#666", fontWeight: "bold", fontFamily: "monospace" }} />
                  <YAxis yAxisId="left" orientation="left" tick={{ fontSize: 8, fill: "#111", fontFamily: "monospace" }} label={{ value: "Rendimentos (R$)", angle: -90, position: 'insideLeft', offset: 10, style: { fontSize: 8, fontWeight: "bold" } }} />
                  <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 8, fill: "#10B981", fontFamily: "monospace" }} label={{ value: "IRRF Retido (R$)", angle: 90, position: 'insideRight', offset: 10, style: { fontSize: 8, fontWeight: "bold" } }} />
                  <Tooltip 
                    contentStyle={{ fontSize: 10, fontFamily: "monospace", borderRadius: "3px", borderColor: "#ddd" }}
                    formatter={(value: any, name: any) => {
                      const label = name === "rendimentos" ? "Rendimentos" : "IRRF Retido";
                      return [`R$ ${Number(value).toLocaleString("pt-BR")}`, label];
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: 9, fontFamily: "monospace", fontWeight: "bold" }} />
                  <Bar yAxisId="left" dataKey="rendimentos" fill="#1B365D" radius={[2, 2, 0, 0]} name="rendimentos" />
                  <Line yAxisId="right" type="monotone" dataKey="irrf" stroke="#10B981" strokeWidth={3} activeDot={{ r: 6 }} name="irrf" />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* BLOCO 3 — eSOCIAL x REINF */}
        {preferences.widgets.includes("esocial-reinf") && (
          <div className="lg:col-span-4 border border-outline-variant bg-white p-6 rounded-sm shadow-sm flex flex-col gap-4">
            <div className="flex justify-between items-center pb-3 border-b border-outline-variant/60">
              <div className="flex flex-col">
                <span className="text-[8px] font-black tracking-widest text-[#1B365D] uppercase font-mono">Fontes de dados fiscais</span>
                <h3 className="text-xs font-black text-[#1B365D] uppercase tracking-wider mt-0.5">
                  Balizamento de Fontes
                </h3>
              </div>
            </div>

            {/* Core indicators sources table */}
            <div className="flex flex-col gap-2 bg-neutral-50/50 p-3 rounded border border-outline-variant">
              <div className="flex justify-between items-center text-[10px] pb-1 border-b border-neutral-100">
                <span className="font-bold text-secondary">eSocial S-5002</span>
                <span className="font-mono font-bold text-neutral-900">R$ {cons.esocial.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between items-center text-[10px] pb-1 border-b border-neutral-100">
                <span className="font-bold text-secondary">REINF R-4020</span>
                <span className="font-mono font-bold text-neutral-900">R$ {cons.reinf.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between items-center text-[10px] font-black text-[#1B365D] pt-1">
                <span>Total Consolidado</span>
                <span className="font-mono font-extrabold">R$ {cons.totalConsolidado.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
            </div>

            {/* Donut Chart */}
            <div className="h-44 w-full flex items-center justify-center relative">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={sourceData}
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={65}
                    paddingAngle={3}
                    dataKey="value"
                    labelLine={false}
                    label={renderCustomizedLabel}
                  >
                    {sourceData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: any) => `R$ ${Number(value).toLocaleString("pt-BR")}`} />
                </PieChart>
              </ResponsiveContainer>
              {/* Abs center label */}
              <div className="absolute flex flex-col items-center justify-center">
                <span className="text-[14px] font-mono font-black text-neutral-900">{esocialPct}%</span>
                <span className="text-[8px] font-bold text-neutral-400 uppercase tracking-widest leading-none">eSocial</span>
              </div>
            </div>

            <div className="flex justify-center gap-6 text-[9px] font-bold uppercase tracking-wider mt-1">
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-[#1B365D]" />
                eSocial S-5002 ({esocialPct}%)
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-[#6366F1]" />
                REINF R-4020 ({reinfPct}%)
              </div>
            </div>
          </div>
        )}

        {/* Row 3: Health of database (6 col) + Alertas Fiscais (6 col) */}
        
        {/* BLOCO 4 — SAÚDE DA BASE (Governança) */}
        {preferences.widgets.includes("saude-base") && (
          <div className="lg:col-span-6 border border-outline-variant bg-white p-6 rounded-sm shadow-sm flex flex-col gap-4">
            <h3 className="text-xs font-black text-[#1B365D] uppercase tracking-wider pb-3 border-b border-outline-variant/65">
              ⚖️ Governança e Saúde Cadastral da Base
            </h3>

            <div className="grid grid-cols-2 gap-4 pb-2">
              <div className="p-3 bg-neutral-50 border border-outline-variant rounded flex flex-col gap-1">
                <span className="text-[8px] font-bold text-secondary uppercase">Trabalhadores</span>
                <span className="text-base font-black text-emerald-800 font-mono">✓ {healthObj.trabalhadoresPct}% identificados</span>
              </div>

              <div className="p-3 bg-neutral-50 border border-outline-variant rounded flex flex-col gap-1">
                <span className="text-[8px] font-bold text-secondary uppercase">Dependentes</span>
                <span className="text-base font-black text-emerald-800 font-mono">✓ {healthObj.dependentesPct}% vinculados</span>
              </div>

              <div className="p-3 bg-neutral-50 border border-outline-variant rounded flex flex-col gap-1">
                <span className="text-[8px] font-bold text-secondary uppercase">Prestadores</span>
                <span className="text-base font-black text-emerald-800 font-mono">✓ {healthObj.prestadoresPct}% cadastrados</span>
              </div>

              <div className="p-3 bg-neutral-50 border border-outline-variant rounded flex flex-col gap-1">
                <span className="text-[8px] font-bold text-secondary uppercase">Códigos Receita</span>
                <span className="text-base font-black text-emerald-800 font-mono">✓ {healthObj.codigosPct}% mapeados</span>
              </div>
            </div>

            <div className="flex flex-col gap-2 pt-2 border-t border-dashed border-outline-variant">
              <span className="text-[9px] font-bold text-rose-700 uppercase tracking-wider">
                Existem Pendências Cadastrais Bloqueantes
              </span>
              <div className="flex flex-col gap-2">
                {healthObj.pendenciesList.map((pText, i) => (
                  <div key={i} className="flex justify-between items-center p-2.5 bg-rose-50/70 border border-rose-100 rounded text-[10px] font-mono text-rose-900">
                    <span className="font-bold flex items-center gap-1.5"><X size={10} className="text-rose-600" /> {pText}</span>
                    <Link href="/pendencias" className="hover:underline text-[9px] font-black text-rose-700 uppercase tracking-wider flex items-center">
                      Resolver <ArrowUpRight size={10} className="ml-0.5" />
                    </Link>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* BLOCO 6 — ALERTAS FISCAIS */}
        {preferences.widgets.includes("alertas-fiscais") && (
          <div className="lg:col-span-6 border border-outline-variant bg-white p-6 rounded-sm shadow-sm flex flex-col gap-4">
            <div className="flex justify-between items-center pb-3 border-b border-outline-variant/65">
              <h3 className="text-xs font-black text-rose-800 uppercase tracking-wider flex items-center gap-1.5">
                <AlertTriangle size={16} className="text-rose-700" />
                Alertas e Inconsistências Fiscais Ativas
              </h3>
              <span className="text-[8px] font-bold bg-rose-100 text-rose-800 px-2 py-0.5 rounded font-mono">
                Enterprise Shield Active
              </span>
            </div>

            <div className="flex flex-col gap-2.5 max-h-[300px] overflow-y-auto pr-1">
              {stats.alerts.map((al) => (
                <div key={al.id} className="p-3 bg-amber-500/10 border border-amber-500/20 text-amber-900 rounded-sm flex items-start gap-3">
                  <AlertTriangle className="text-amber-700 shrink-0 mt-0.5" size={16} />
                  <div className="flex flex-col text-[10.5px]">
                    <span className="font-bold text-amber-950 uppercase text-[8px] tracking-wider">Aviso de compliance</span>
                    <span className="mt-0.5 font-medium leading-relaxed">{al.text}</span>
                  </div>
                </div>
              ))}
              
              <div className="p-3 bg-[#1B365D]/5 border border-indigo-120/20 text-[#1B365D] rounded-sm flex items-start gap-3">
                <Info className="text-indigo-700 shrink-0 mt-0.5" size={16} />
                <div className="flex flex-col text-[10.5px]">
                  <span className="font-bold text-indigo-900 uppercase text-[8px] tracking-wider">Dica operacional</span>
                  <span className="mt-0.5 leading-relaxed">
                    Sincronize as bases XML com os cadastros administrativos municipais para evitar notificações fiscais.
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Row 4: Timeline compact table form (8 col) + Competence Micro Maps (4 col) */}
        
        {/* BLOCO 5 — ÚLTIMOS PROCESSAMENTOS */}
        {preferences.widgets.includes("ultimos-processamentos") && (
          <div className="lg:col-span-8 border border-outline-variant bg-white p-6 rounded-sm shadow-sm flex flex-col gap-4">
            <div className="flex justify-between items-center pb-2 border-b border-outline-variant/60">
              <h3 className="text-xs font-black text-[#1B365D] uppercase tracking-wider flex items-center gap-1.5">
                <History size={16} className="text-[#1B365D]" />
                Logs e Últimos Processamentos (Compensações)
              </h3>
              <Link href="/esocial" className="text-[9px] font-black uppercase text-[#1B365D] hover:underline flex items-center tracking-wider bg-neutral-100 hover:bg-neutral-200 py-1.5 px-3 border rounded border-neutral-200/50">
                Auditoria Completa <ChevronRight size={12} className="ml-0.5" />
              </Link>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-[10.5px] font-mono">
                <thead>
                  <tr className="border-b border-outline-variant text-[9px] text-[#1B365D] font-bold uppercase tracking-wider bg-neutral-50/50">
                    <th className="py-2.5 px-3">Origem</th>
                    <th className="py-2.5 px-3">Referência</th>
                    <th className="py-2.5 px-3">Atividade / Descrição</th>
                    <th className="py-2.5 px-3 text-right">Data/Hora</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.timeline.slice(0, 8).map((evt) => (
                    <tr key={evt.id} className="border-b border-outline-variant/50 hover:bg-neutral-50/80 transition-colors">
                      <td className="py-2 px-3 font-bold">
                        <span className={cn(
                          "text-[9px] px-1.5 py-0.5 rounded font-bold font-mono tracking-tighter uppercase",
                          evt.retificador ? "bg-amber-100 text-amber-800" : "bg-sky-100 text-sky-800"
                        )}>
                          {evt.tipo}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-neutral-500 font-bold">{evt.referencia}</td>
                      <td className="py-2 px-3 text-neutral-700 truncate max-w-[280px]" title={evt.descricao}>
                        {evt.descricao}
                      </td>
                      <td className="py-2 px-3 text-right text-neutral-400">
                        {new Date(evt.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* BLOCO 7 — MAPA DE COMPETÊNCIAS */}
        {preferences.widgets.includes("competencias") && (
          <div className="lg:col-span-4 border border-outline-variant bg-white p-6 rounded-sm shadow-sm flex flex-col gap-4">
            <div className="flex justify-between items-center pb-2 border-b border-outline-variant/60">
              <h3 className="text-xs font-black text-[#1B365D] uppercase tracking-wider flex items-center gap-1.5">
                <Calendar size={16} className="text-[#1B365D]" />
                Compas. Fiscais
              </h3>
            </div>

            {isLoadingCalendar ? (
              <div className="flex flex-col items-center justify-center p-10 opacity-40">
                <LoadingSpinner size="sm" />
              </div>
            ) : fiscalCalendar.length === 0 ? (
              <p className="text-[10px] text-center text-secondary py-6 italic">Nenhum ano fiscal processado.</p>
            ) : (
              <div className="flex flex-col gap-4">
                {fiscalCalendar.slice(0, 2).map((year: any) => (
                  <div key={year.ano} className="border border-outline-variant/80 p-3 rounded bg-neutral-50 flex flex-col gap-2">
                    <div className="flex justify-between items-center">
                      <span className="text-[11px] font-black text-[#1B365D]">{year.ano}</span>
                      <span className="text-[8px] bg-[#1B365D] text-white py-0.5 px-1.5 rounded font-bold font-mono">
                        R$ {year.totalIrrf.toLocaleString('pt-BR')}
                      </span>
                    </div>

                    {/* Compacted Map of Competencies */}
                    <div className="grid grid-cols-6 gap-1 bg-white p-1.5 rounded border border-outline-variant/50">
                      {year.months.map((m: any) => (
                        <div 
                          key={m.periodo} 
                          className={cn(
                            "aspect-square rounded-[2px] flex flex-col items-center justify-center text-[7px] font-mono leading-none font-bold border",
                            m.status === "ok" ? "bg-emerald-500/10 border-emerald-500/15 text-emerald-700" :
                            m.status === "retificado" ? "bg-amber-100 border-amber-200 text-amber-700 animate-pulse" :
                            "bg-neutral-100 border-neutral-200 text-neutral-300 opacity-20"
                          )}
                          title={`${m.periodo}: ${m.status.toUpperCase()}`}
                        >
                          <span>{m.label}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* BLOCO 8 — AÇÕES RÁPIDAS INTELIGENTES */}
        {preferences.widgets.includes("acoes-rapidas") && (
          <div className="lg:col-span-12 border border-outline-variant bg-white p-6 rounded-sm shadow-sm flex flex-col gap-4">
            <h3 className="text-xs font-black text-[#1B365D] uppercase tracking-wider pb-3 border-b border-outline-variant/60">
              ⚡ Centro de Ações Rápidas Inteligentes do Compliance
            </h3>

            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
              
              <button 
                onClick={triggerXmlUpload}
                className="p-3 bg-[#1B365D]/5 hover:bg-[#1B365D] hover:text-white border border-[#1B365D]/15 text-[#1B365D] font-bold text-[9.5px] uppercase tracking-wider rounded-sm flex flex-col items-center justify-center gap-1.5 active:scale-95 transition-all text-center h-20 group"
              >
                <PlusCircle size={18} className="group-hover:scale-110 transition-transform" />
                Importar eSocial
              </button>

              <Link 
                href="/reinf"
                className="p-3 bg-[#1B365D]/5 hover:bg-[#1B365D] hover:text-white border border-[#1B365D]/15 text-[#1B365D] font-bold text-[9.5px] uppercase tracking-wider rounded-sm flex flex-col items-center justify-center gap-1.5 active:scale-95 transition-all text-center h-20 group"
              >
                <Upload size={18} className="group-hover:scale-110 transition-transform" />
                Importar REINF
              </Link>

              <Link 
                href="/reinf"
                className="p-3 bg-[#1B365D]/5 hover:bg-[#1B365D] hover:text-white border border-[#1B365D]/15 text-[#1B365D] font-bold text-[9.5px] uppercase tracking-wider rounded-sm flex flex-col items-center justify-center gap-1.5 active:scale-95 transition-all text-center h-20 group"
              >
                <Sliders size={18} className="group-hover:scale-110 transition-transform" />
                Cadastrar Prestador
              </Link>

              <Link 
                href="/consolidacao"
                className="p-3 bg-[#1B365D]/5 hover:bg-[#1B365D] hover:text-white border border-[#1B365D]/15 text-[#1B365D] font-bold text-[9.5px] uppercase tracking-wider rounded-sm flex flex-col items-center justify-center gap-1.5 active:scale-95 transition-all text-center h-20 group"
              >
                <Layers size={18} className="group-hover:scale-110 transition-transform" />
                Consolidação Fiscal
              </Link>

              <Link 
                href="/consolidacao"
                className="p-3 bg-[#1B365D]/5 hover:bg-[#1B365D] hover:text-white border border-[#1B365D]/15 text-[#1B365D] font-bold text-[9.5px] uppercase tracking-wider rounded-sm flex flex-col items-center justify-center gap-1.5 active:scale-95 transition-all text-center h-20 group"
              >
                <Download size={18} className="group-hover:scale-110 transition-transform" />
                Gerar DIRF Digital
              </Link>

              <Link 
                href="/esocial"
                className="p-3 bg-[#1B365D]/5 hover:bg-[#1B365D] hover:text-white border border-[#1B365D]/15 text-[#1B365D] font-bold text-[9.5px] uppercase tracking-wider rounded-sm flex flex-col items-center justify-center gap-1.5 active:scale-95 transition-all text-center h-20 group"
              >
                <Activity size={18} className="group-hover:scale-110 transition-transform" />
                Auditoria Geral
              </Link>

              <Link 
                href="/empregadores"
                className="p-3 bg-[#1B365D]/5 hover:bg-[#1B365D] hover:text-white border border-[#1B365D]/15 text-[#1B365D] font-bold text-[9.5px] uppercase tracking-wider rounded-sm flex flex-col items-center justify-center gap-1.5 active:scale-95 transition-all text-center h-20 group"
              >
                <Building size={18} className="group-hover:scale-110 transition-transform" />
                Empregadores
              </Link>

              <Link 
                href="/trabalhadores"
                className="p-3 bg-[#1B365D]/5 hover:bg-[#1B365D] hover:text-white border border-[#1B365D]/15 text-[#1B365D] font-bold text-[9.5px] uppercase tracking-wider rounded-sm flex flex-col items-center justify-center gap-1.5 active:scale-95 transition-all text-center h-20 group"
              >
                <UserCheck size={18} className="group-hover:scale-110 transition-transform" />
                Trabalhadores S-5002
              </Link>

            </div>
          </div>
        )}

      </div>

      {/* COMPONENT WIDGET CONFIGURATION MODAL (PERSONALIZAÇÃO DE LAYOUT) */}
      {showConfigModal && (
        <div className="fixed inset-0 bg-neutral-900/60 flex items-center justify-center z-50 p-4 animate-fadeIn">
          <div className="bg-white rounded-sm border border-outline-variant max-w-lg w-full p-6 shadow-xl flex flex-col gap-4 relative">
            <button 
              onClick={() => setShowConfigModal(false)}
              className="absolute top-4 right-4 text-neutral-400 hover:text-neutral-600 active:scale-95"
            >
              <X size={18} />
            </button>

            <div className="flex items-center gap-2 pb-2 border-b border-outline-variant">
              <Sliders size={20} className="text-[#1B365D]" />
              <div>
                <h3 className="text-sm font-black text-[#1B365D] uppercase tracking-wider">
                  Personalizar Painel de Controle
                </h3>
                <p className="text-[10px] text-neutral-400">
                  Defina os blocos e indicadores fiscais críticos visíveis no seu dashboard.
                </p>
              </div>
            </div>

            {/* Checkbox toggler for Blocks */}
            <div className="flex flex-col gap-2.5">
              <span className="text-[9px] font-bold text-secondary uppercase tracking-widest border-b border-outline-variant/30 pb-1">
                Visualização de Blocos Estratégicos
              </span>
              <div className="grid grid-cols-2 gap-2 text-[10.5px]">
                <label className="flex items-center gap-2 cursor-pointer py-1 select-none">
                  <input 
                    type="checkbox" 
                    checked={preferences.widgets.includes("visao-executiva")} 
                    onChange={() => toggleWidget("visao-executiva")}
                    className="accent-indigo-600 rounded"
                  />
                  Visão Executiva (KPIs Gerais)
                </label>

                <label className="flex items-center gap-2 cursor-pointer py-1 select-none">
                  <input 
                    type="checkbox" 
                    checked={preferences.widgets.includes("posicao-consolidada")} 
                    onChange={() => toggleWidget("posicao-consolidada")}
                    className="accent-indigo-600 rounded"
                  />
                  Posição Fiscal Consolidada
                </label>

                <label className="flex items-center gap-2 cursor-pointer py-1 select-none">
                  <input 
                    type="checkbox" 
                    checked={preferences.widgets.includes("consolidacao-anual")} 
                    onChange={() => toggleWidget("consolidacao-anual")}
                    className="accent-indigo-600 rounded"
                  />
                  Consolidação Fiscal Anual (Chart)
                </label>

                <label className="flex items-center gap-2 cursor-pointer py-1 select-none">
                  <input 
                    type="checkbox" 
                    checked={preferences.widgets.includes("esocial-reinf")} 
                    onChange={() => toggleWidget("esocial-reinf")}
                    className="accent-indigo-600 rounded"
                  />
                  Fontes eSocial x REINF (Donut)
                </label>

                <label className="flex items-center gap-2 cursor-pointer py-1 select-none">
                  <input 
                    type="checkbox" 
                    checked={preferences.widgets.includes("saude-base")} 
                    onChange={() => toggleWidget("saude-base")}
                    className="accent-indigo-600 rounded"
                  />
                  Saúde e Governança da Base
                </label>

                <label className="flex items-center gap-2 cursor-pointer py-1 select-none">
                  <input 
                    type="checkbox" 
                    checked={preferences.widgets.includes("alertas-fiscais")} 
                    onChange={() => toggleWidget("alertas-fiscais")}
                    className="accent-indigo-600 rounded"
                  />
                  Alertas Fiscais Inteligentes
                </label>

                <label className="flex items-center gap-2 cursor-pointer py-1 select-none">
                  <input 
                    type="checkbox" 
                    checked={preferences.widgets.includes("ultimos-processamentos")} 
                    onChange={() => toggleWidget("ultimos-processamentos")}
                    className="accent-indigo-600 rounded"
                  />
                  Logs de Processamentos
                </label>

                <label className="flex items-center gap-2 cursor-pointer py-1 select-none">
                  <input 
                    type="checkbox" 
                    checked={preferences.widgets.includes("competencias")} 
                    onChange={() => toggleWidget("competencias")}
                    className="accent-indigo-600 rounded"
                  />
                  Mapa de Competências
                </label>

                <label className="flex items-center gap-2 cursor-pointer py-1 select-none col-span-2 text-indigo-700 font-extrabold">
                  <input 
                    type="checkbox" 
                    checked={preferences.widgets.includes("acoes-rapidas")} 
                    onChange={() => toggleWidget("acoes-rapidas")}
                    className="accent-indigo-600 rounded"
                  />
                  Menu de Ações Rápidas Inteligentes
                </label>
              </div>

              {/* Toggler filters for specific metrics inside Piece position */}
              <span className="text-[9px] font-bold text-secondary uppercase tracking-widest border-b border-outline-variant/30 pb-1 mt-3">
                Filtros e Visualização de Métricas (KPIs Principais)
              </span>
              <div className="grid grid-cols-3 gap-2 text-[10px] font-mono">
                <label className="flex items-center gap-2 cursor-pointer py-1 select-none">
                  <input 
                    type="checkbox" 
                    checked={preferences.show_kpi_irrf} 
                    onChange={() => toggleKPI("show_kpi_irrf")}
                    className="accent-emerald-600 rounded"
                  />
                  IRRF Retido
                </label>

                <label className="flex items-center gap-2 cursor-pointer py-1 select-none">
                  <input 
                    type="checkbox" 
                    checked={preferences.show_kpi_rendimentos} 
                    onChange={() => toggleKPI("show_kpi_rendimentos")}
                    className="accent-emerald-600 rounded"
                  />
                  Rendimentos
                </label>

                <label className="flex items-center gap-2 cursor-pointer py-1 select-none">
                  <input 
                    type="checkbox" 
                    checked={preferences.show_kpi_pendencias} 
                    onChange={() => toggleKPI("show_kpi_pendencias")}
                    className="accent-rose-600 rounded"
                  />
                  Inconsistências
                </label>

                <label className="flex items-center gap-2 cursor-pointer py-1 select-none">
                  <input 
                    type="checkbox" 
                    checked={preferences.show_kpi_empregadores} 
                    onChange={() => toggleKPI("show_kpi_empregadores")}
                    className="accent-sky-600 rounded"
                  />
                  Empregadores
                </label>

                <label className="flex items-center gap-2 cursor-pointer py-1 select-none">
                  <input 
                    type="checkbox" 
                    checked={preferences.show_kpi_trabalhadores} 
                    onChange={() => toggleKPI("show_kpi_trabalhadores")}
                    className="accent-sky-600 rounded"
                  />
                  Trabalhadores
                </label>

                <label className="flex items-center gap-2 cursor-pointer py-1 select-none">
                  <input 
                    type="checkbox" 
                    checked={preferences.show_kpi_prestadores} 
                    onChange={() => toggleKPI("show_kpi_prestadores")}
                    className="accent-sky-600 rounded"
                  />
                  Prestadores
                </label>
              </div>
            </div>

            <div className="flex justify-between items-center border-t border-outline-variant pt-4 mt-2">
              <button 
                onClick={handleResetLayout}
                className="text-[10px] font-bold text-rose-700 hover:underline uppercase tracking-wider"
              >
                Restaurar Padrão de Sistemas
              </button>

              <button 
                onClick={() => setShowConfigModal(false)}
                className="bg-[#1B365D] hover:bg-[#152a49] text-white text-[10px] font-black uppercase tracking-wider py-2 px-6 rounded-xs active:scale-95 transition-all shadow-md"
              >
                Concluir Ajustes
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

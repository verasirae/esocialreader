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
  Mail, 
  AlertTriangle,
  CheckCircle2,
  FileCode2,
  ChevronRight,
  Loader2,
  Download,
  Search,
  CloudUpload,
  Calendar
} from "lucide-react";
import { cn, safeJsonFetch } from "@/lib/utils";

export default function Dashboard() {
  const router = useRouter();
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadTotal, setUploadTotal] = useState(0);
  const [uploadProcessed, setUploadProcessed] = useState(0);
  const [fiscalCalendar, setFiscalCalendar] = useState<any[]>([]);
  const [isLoadingCalendar, setIsLoadingCalendar] = useState(true);
  const [summaryStats, setSummaryStats] = useState({
    totalEvents: 0,
    totalWorkers: 0,
    totalErrors: 0,
    pendingWorkers: 0,
    pendingErrors: 0,
    unlinkedCpfs: 0,
    unlinkedCnpjs: 0
  });
  const [pendencies, setPendencies] = useState<{unlinkedCpfs: any[], unlinkedCnpjs: any[]}>({
    unlinkedCpfs: [],
    unlinkedCnpjs: []
  });
  const [history, setHistory] = useState<any[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);

  useEffect(() => {
    fetchFiscalCalendar();
    fetchSummaryStats();
    fetchHistory();

    const handleRefresh = () => {
      fetchFiscalCalendar();
      fetchSummaryStats();
      fetchHistory();
    };

    window.addEventListener("trabalhador-added", handleRefresh);
    window.addEventListener("empresa-added", handleRefresh);

    return () => {
      window.removeEventListener("trabalhador-added", handleRefresh);
      window.removeEventListener("empresa-added", handleRefresh);
    };
  }, []);

  const fetchHistory = async () => {
    const data = await safeJsonFetch("/api/fiscal/history");
    if (data) {
      setHistory(data);
    }
    setIsLoadingHistory(false);
  };

  const fetchFiscalCalendar = async () => {
    const data = await safeJsonFetch("/api/fiscal/calendar");
    if (data) {
      setFiscalCalendar(data);
    }
    setIsLoadingCalendar(false);
  };

  const fetchSummaryStats = async () => {
    const data = await safeJsonFetch("/api/fiscal/pendencies");
    if (data) {
      setSummaryStats({
        totalEvents: data.stats?.events || 0,
        totalWorkers: data.stats?.workers || 0,
        totalErrors: data.stats?.errors || 0,
        pendingWorkers: data.workers.length,
        pendingErrors: data.errors.length,
        unlinkedCpfs: data.stats?.unlinkedCpfs || 0,
        unlinkedCnpjs: data.stats?.unlinkedCnpjs || 0
      });
      setPendencies({
        unlinkedCpfs: data.unlinkedCpfs || [],
        unlinkedCnpjs: data.unlinkedCnpjs || []
      });
    }
  };

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
      }

      setUploadProcessed(i + 1);
      setUploadProgress(Math.round(((i + 1) / files.length) * 100));
    }

    if (errorCount > 0) {
      alert(`Importação concluída com avisos.\nSucesso: ${successCount}\nErros: ${errorCount}\n\nDetalhes:\n${errors.slice(0, 5).join('\n')}`);
    } else {
      alert(`Importação concluída com sucesso! ${successCount} arquivos processados.`);
    }
    
    setIsUploading(false);
    fetchFiscalCalendar();
    fetchSummaryStats();
    fetchHistory();
  };

  return (
    <div className="flex flex-col gap-lg">
      {/* Header com Sumário Rápido de Upload */}
      {isUploading && (
        <section className="card p-lg bg-surface-container border-b-2 border-primary mb-4 p-6">
           <div className="flex justify-between items-center mb-2">
              <span className="text-[10px] font-black uppercase tracking-widest text-primary">Importando XMLs ({uploadProcessed}/{uploadTotal})</span>
              <span className="text-[10px] font-black">{uploadProgress}%</span>
           </div>
           <div className="w-full bg-surface-container-high h-2 rounded-full overflow-hidden border border-outline-variant">
              <div 
                className="bg-primary h-full transition-all duration-300" 
                style={{ width: `${uploadProgress}%` }}
              />
           </div>
        </section>
      )}

      <section className="grid grid-cols-4 gap-md">
        <div className="card p-lg flex flex-col gap-xs border-l-4 border-primary">
          <span className="text-[10px] font-bold text-secondary uppercase tracking-wider">Trabalhadores Identificados</span>
          <span className="text-2xl font-black text-on-surface">{summaryStats.totalWorkers}</span>
        </div>
        <div className="card p-lg flex flex-col gap-xs border-l-4 border-tertiary">
          <span className="text-[10px] font-bold text-secondary uppercase tracking-wider">Eventos S-5002 Ativos</span>
          <span className="text-2xl font-black text-on-surface">{summaryStats.totalEvents}</span>
        </div>
        <div className="card p-lg flex flex-col gap-xs border-l-4 border-error">
          <span className="text-[10px] font-bold text-secondary uppercase tracking-wider">Erros de Processamento</span>
          <span className="text-2xl font-black text-error">{summaryStats.totalErrors}</span>
        </div>
        <div 
          className={cn(
            "card p-lg bg-primary-container text-on-primary-container flex flex-col items-center justify-center transition-all border-none",
            isUploading ? "opacity-60 cursor-not-allowed" : "cursor-pointer hover:brightness-110"
          )}
          onClick={() => !isUploading && document.getElementById("xml-upload-main")?.click()}
        >
          <div className="flex items-center gap-2 font-bold text-xs uppercase tracking-widest">
            {isUploading ? <Loader2 className="animate-spin" size={16} /> : <CloudUpload size={18} />}
            {isUploading ? "Processando..." : "Importar XMLs"}
          </div>
          <input id="xml-upload-main" type="file" multiple accept=".xml" className="hidden" onChange={handleUpload} disabled={isUploading} />
        </div>
      </section>

      {/* Ações Rápidas */}
      <section className={cn("flex gap-md transition-all", isUploading && "opacity-50 pointer-events-none grayscale-[0.5]")}>
        <Link 
          href="/esocial/tabelas" 
          className="card p-md flex items-center gap-4 hover:bg-surface-container transition-all border-none bg-surface-container/30 px-6 py-4"
        >
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
            <Table size={20} />
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] font-black uppercase tracking-widest text-secondary">Tabelas eSocial</span>
            <span className="text-xs font-bold">Importar Referências CSV</span>
          </div>
        </Link>

        <Link 
          href="/esocial/tabelas/visualizar" 
          className="card p-md flex items-center gap-4 hover:bg-surface-container transition-all border-none bg-surface-container/30 px-6 py-4"
        >
          <div className="w-10 h-10 rounded-full bg-secondary/10 flex items-center justify-center text-secondary">
            <Eye size={20} />
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] font-black uppercase tracking-widest text-secondary">Tabelas eSocial</span>
            <span className="text-xs font-bold">Visualizar Dados</span>
          </div>
        </Link>
      </section>

      {/* Grid de Anos Fiscais */}
      <section className={cn("flex flex-col gap-md transition-all", isUploading && "opacity-80 pointer-events-none")}>
        <h2 className="text-lg font-black text-primary-container tracking-tight">Anos Fiscais Encontrados</h2>
        
        {isLoadingCalendar ? (
          <div className="flex flex-col items-center justify-center p-20 gap-4 opacity-50">
             <Loader2 size={40} className="animate-spin text-primary" />
             <p className="text-xs font-bold uppercase tracking-widest">Sincronizando Consolidação Fiscal...</p>
          </div>
        ) : fiscalCalendar.length === 0 ? (
          <div className="card p-20 flex flex-col items-center justify-center text-center gap-4 bg-surface-container/30">
            <div className="w-16 h-16 rounded-full bg-surface-container-high flex items-center justify-center border border-outline-variant">
              <FileCode2 size={32} className="text-secondary opacity-30" />
            </div>
            <div>
              <p className="text-sm font-bold text-on-surface">Nenhum Ano Fiscal Detectado</p>
              <p className="text-[11px] text-secondary mt-1">O sistema deriva os anos fiscais automaticamente a partir dos XMLs S-5002 importados.</p>
            </div>
            <button 
              className="btn-primary mt-6 text-[10px]"
              onClick={() => !isUploading && document.getElementById("xml-upload-main")?.click()}
              disabled={isUploading}
            >
               Começar Importação
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-lg">
            {fiscalCalendar.map((year: any) => (
              <div key={year.ano} className="card overflow-hidden group hover:shadow-xl transition-all">
                <div className="p-lg bg-white border-b border-outline-variant flex justify-between items-center">
                  <div>
                    <span className="text-3xl font-black text-primary-container pr-2">{year.ano}</span>
                    <span className="text-[10px] font-bold text-secondary uppercase bg-surface-container px-2 py-0.5 rounded tracking-tighter">
                      Consolidação Fiscal
                    </span>
                  </div>
                    <Link 
                      href={`/consolidacao?ano=${year.ano}`}
                      className="p-2 bg-primary/5 text-primary rounded-full hover:bg-primary hover:text-white transition-all group-hover:scale-110"
                    >
                      <ChevronRight size={20} />
                    </Link>
                </div>

                <div className="px-lg py-md grid grid-cols-2 gap-md bg-surface/50 font-mono">
                  <div className="flex flex-col">
                    <span className="text-[9px] text-secondary font-bold uppercase">Rendimentos</span>
                    <span className="text-sm font-black">R$ {year.totalRendimentos.toLocaleString('pt-BR')}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[9px] text-secondary font-bold uppercase">IRRF Retido</span>
                    <span className="text-sm font-black text-error">R$ {year.totalIrrf.toLocaleString('pt-BR')}</span>
                  </div>
                </div>

                <div className="p-md grid grid-cols-6 gap-1 bg-white">
                   {year.months.map((m: any) => (
                      <div 
                        key={m.periodo} 
                        className={cn(
                          "aspect-square rounded-[2px] flex flex-col items-center justify-center gap-0.5 border transition-all hover:brightness-95",
                          m.status === "ok" ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-700" :
                          m.status === "retificado" ? "bg-warning/10 border-warning/20 text-warning-container" :
                          "bg-surface-container border-outline-variant text-secondary opacity-30"
                        )}
                        title={`${m.periodo}: ${m.status.toUpperCase()}`}
                      >
                         <span className="text-[8px] font-black">{m.label}</span>
                         {m.status === "ok" && <CheckCircle2 size={8} />}
                         {m.status === "retificado" && <History size={8} />}
                      </div>
                   ))}
                </div>

                <div className="p-lg flex justify-between items-center border-t border-outline-variant">
                   <div className="flex flex-col">
                     <span className="text-[10px] font-bold text-secondary">{year.totalTrabalhadores} Trabalhadores</span>
                     <span className="text-[9px] text-secondary opacity-60">Última atualização: hoje</span>
                   </div>
                   <Link 
                      href={`/consolidacao?ano=${year.ano}`}
                      className="px-3 py-1.5 bg-surface-container-high rounded-full border border-outline-variant text-[10px] font-bold hover:bg-white transition-all"
                   >
                      Abrir Detalhes
                   </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Sección Informativa (Timeline Audit) */}
      <section className="grid grid-cols-12 gap-lg mt-lg">
         <div className="col-span-8 flex flex-col gap-md">
            <div className="flex justify-between items-center">
              <h3 className="text-[10px] font-black text-secondary uppercase tracking-widest flex items-center gap-2">
                <History size={14} />
                Timeline de Processamento e Auditoria
              </h3>
              <Link 
                href="/esocial/audit" 
                className={cn(
                  "text-[9px] font-bold text-primary hover:underline uppercase tracking-wider",
                  isUploading && "pointer-events-none opacity-50"
                )}
              >
                Ver Log Completo
              </Link>
            </div>
            <div className="card h-[400px] flex flex-col p-md bg-surface/30 border-none shadow-inner overflow-hidden">
               <div className="flex-1 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-outline-variant">
                  {isLoadingHistory ? (
                    <div className="h-full flex items-center justify-center opacity-50">
                       <Loader2 className="animate-spin" size={24} />
                    </div>
                  ) : history.length === 0 ? (
                    <div className="h-full flex items-center justify-center italic text-xs opacity-30">
                       Fluxo de Auditoria será populado após processamento...
                    </div>
                  ) : (
                    <div className="flex flex-col">
                       {history.map((item, idx) => (
                         <div key={item.id} className="flex gap-3 relative group py-1.5 hover:bg-surface-container/20 rounded px-2 transition-colors">
                           {idx !== history.length - 1 && (
                             <div className="absolute left-[13px] top-6 bottom-[-6px] w-[1px] bg-outline-variant/30" />
                           )}
                           <div className={cn(
                             "w-4 h-4 rounded-full flex items-center justify-center z-10 shrink-0 mt-1",
                             item.acao === 'retificacao' ? "bg-warning-container text-on-warning-container" :
                             item.acao === 'erro' ? "bg-error-container text-on-error-container" :
                             "bg-primary-container text-on-primary-container"
                           )}>
                             {item.acao === 'retificacao' ? <History size={8} /> : 
                              item.acao === 'upload' ? <CloudUpload size={8} /> :
                              item.acao === 'consolidacao' ? <Calendar size={8} /> :
                              <CheckCircle2 size={8} />}
                           </div>
                           <div className="flex flex-col flex-1 gap-0.5">
                             <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <span className={cn(
                                    "text-[8px] font-black uppercase tracking-tighter px-1.5 py-0.5 rounded",
                                    item.acao === 'retificacao' ? "bg-warning/10 text-warning" :
                                    item.acao === 'upload' ? "bg-info/10 text-info" :
                                    "bg-success/10 text-success"
                                  )}>
                                    {item.acao}
                                  </span>
                                  <p className="text-[10px] font-bold text-on-surface truncate max-w-[400px]">
                                    {item.descricao}
                                  </p>
                                </div>
                                <span className="text-[8px] text-outline font-mono">
                                  {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                             </div>
                             {item.evento && (
                               <div className="text-[8px] text-secondary/70 flex gap-2 overflow-hidden items-center mt-0.5">
                                 <span className="bg-surface-container-high px-1 rounded-sm border border-outline-variant/10">ID: {item.evento.eventoId.substring(0, 8)}...</span>
                                 <span>{item.evento.tpEvento}</span>
                                 <span>•</span>
                                 <span>Ref: {item.evento.perApur}</span>
                                 <span className="truncate">• {item.evento.trabalhador?.nome}</span>
                               </div>
                             )}
                           </div>
                         </div>
                       ))}
                    </div>
                  )}
               </div>
            </div>
         </div>
         <div className={cn("col-span-4 flex flex-col gap-lg transition-all", isUploading && "opacity-50 pointer-events-none")}>
          <div className="bg-error/5 border border-error/20 p-6 rounded-sm">
             <div className="flex items-center gap-2 text-error mb-4">
                <AlertTriangle size={20} />
                <h4 className="text-[11px] font-black uppercase tracking-widest">Pendências Cadastrais</h4>
             </div>
             <div className="flex flex-col gap-4 mb-6">
                {summaryStats.unlinkedCpfs > 0 && (
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] font-bold text-error uppercase">Trabalhadores Não Identificados</span>
                    <div className="flex flex-col gap-1 bg-white/50 p-2 rounded border border-error/10">
                      {pendencies.unlinkedCpfs.slice(0, 3).map((p: any) => (
                        <div key={p.cpfBenef} className="flex justify-between items-center text-[10px] font-mono">
                          <span>CPF: {p.cpfBenef}</span>
                          <span className="opacity-60">{p._count._all} eventos</span>
                        </div>
                      ))}
                      {summaryStats.unlinkedCpfs > 3 && <span className="text-[9px] italic opacity-50">+ {summaryStats.unlinkedCpfs - 3} outros</span>}
                    </div>
                  </div>
                )}
                
                {summaryStats.unlinkedCnpjs > 0 && (
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] font-bold text-error uppercase">Empregadores Não Identificados</span>
                    <div className="flex flex-col gap-1 bg-white/50 p-2 rounded border border-error/10">
                      {pendencies.unlinkedCnpjs.slice(0, 3).map((p: any) => (
                        <div key={p.cnpjRaiz} className="flex justify-between items-center text-[10px] font-mono">
                          <span>CNPJ Raiz: {p.cnpjRaiz}</span>
                          <span className="opacity-60">{p._count._all} eventos</span>
                        </div>
                      ))}
                      {summaryStats.unlinkedCnpjs > 3 && <span className="text-[9px] italic opacity-50">+ {summaryStats.unlinkedCnpjs - 3} outros</span>}
                    </div>
                  </div>
                )}

                {summaryStats.pendingErrors > 0 && (
                  <p className="text-[11px] text-error leading-relaxed font-medium">
                    Existem {summaryStats.pendingErrors} erros de processamento fiscal ativos.
                  </p>
                )}
             </div>
             <button 
               onClick={() => router.push("/pendencias")}
               disabled={isUploading || (summaryStats.unlinkedCpfs === 0 && summaryStats.unlinkedCnpjs === 0 && summaryStats.pendingErrors === 0)}
               className="w-full py-2.5 bg-error text-white font-bold text-[10px] uppercase rounded-sm shadow-md shadow-error/20 hover:brightness-110 disabled:opacity-30 disabled:cursor-not-allowed disabled:grayscale transition-all active:scale-[0.98]"
             >
                Cadastrar Entidades
             </button>
          </div>
         </div>
      </section>
    </div>
  );
}

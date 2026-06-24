"use client";

import React, { useState, useEffect } from "react";
import { 
  Download, 
  Calendar, 
  Loader2, 
  CheckCheck, 
  AlertCircle, 
  History, 
  Key, 
  ArrowRight,
  ExternalLink 
} from "lucide-react";
import Link from "next/link";
import { cn, safeJsonFetch } from "@/lib/utils";
import { useEmpresa } from "@/lib/contexts/EmpresaContext";
import LoadingSpinner from "@/components/LoadingSpinner";

export default function EsocialAutomacaoPage() {
  const { activeEmpresaId, activeEmpresa } = useEmpresa();
  
  // State variables
  const [certificadoAtivo, setCertificadoAtivo] = useState<any>(null);
  const [isCarregandoCerts, setIsCarregandoCerts] = useState(false);
  const [sincAnoMes, setSincAnoMes] = useState(new Date().toISOString().substring(0, 7)); // "YYYY-MM"
  const [isSincronizandoActive, setIsSincronizandoActive] = useState(false);
  const [sincMessage, setSincMessage] = useState("");
  const [sincResultado, setSincResultado] = useState<any>(null);
  const [logsSincronizacoes, setLogsSincronizacoes] = useState<any[]>([]);

  // Load certificate and logs when activeEmpresaId changes
  useEffect(() => {
    if (activeEmpresaId) {
      fetchCertificadoAtivo(activeEmpresaId);
      fetchHistoricoSincs(activeEmpresaId);
    } else {
      setCertificadoAtivo(null);
      setLogsSincronizacoes([]);
    }
    setSincResultado(null);
    setSincMessage("");
  }, [activeEmpresaId]);

  const fetchCertificadoAtivo = async (empId: string) => {
    setIsCarregandoCerts(true);
    try {
      const resp = await fetch(`/api/certificados?empresaId=${empId}`);
      if (resp.ok) {
        const data = await resp.json();
        if (Array.isArray(data) && data.length > 0) {
          setCertificadoAtivo(data[0]);
        } else {
          setCertificadoAtivo(null);
        }
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

  const fetchHistoricoSincs = async (empId: string) => {
    try {
      const resp = await safeJsonFetch(`/api/esocial/sincronizar?empresaId=${empId}`);
      if (Array.isArray(resp)) {
        setLogsSincronizacoes(resp);
      }
    } catch (e) {
      console.error("Erro ao carregar histórico:", e);
    }
  };

  const handleSubmeterSincronizacao = async () => {
    if (!activeEmpresaId) return;
    setIsSincronizandoActive(true);
    setSincMessage("Iniciando comunicação segura mTLS com os webservices do eSocial...");
    setSincResultado(null);

    try {
      const res = await fetch("/api/esocial/sincronizar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ empresaId: activeEmpresaId, perApur: sincAnoMes })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro na sincronização");

      setSincResultado(data);
      setSincMessage("Sincronização concluída com sucesso!");
    } catch (e: any) {
      setSincMessage("");
      alert("Erro durante sincronização: " + e.message);
    } finally {
      setIsSincronizandoActive(false);
      fetchHistoricoSincs(activeEmpresaId);
    }
  };

  return (
    <div className="flex flex-col gap-6 w-full pb-10">
      {/* Title Header */}
      <div className="flex flex-col gap-1.5 border-b border-outline-variant pb-6">
        <h2 className="text-xl md:text-2xl font-black text-primary tracking-tight">Automação eSocial S-5002</h2>
        <p className="text-xs text-secondary font-medium leading-normal">
          Sincronize e baixe automaticamente os eventos consolidados de fechamento de folha S-5002 diretamente do eSocial via webservice.
        </p>
      </div>

      {/* Active Company Banner */}
      <div className="card p-4 bg-white border border-outline-variant/60 rounded-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex flex-col gap-0.5">
          <span className="text-[10px] uppercase font-black tracking-wider text-secondary">Empresa em Foco</span>
          {activeEmpresa ? (
            <span className="text-sm font-bold text-primary">
              {activeEmpresa.razaoSocial || activeEmpresa.nomeFantasia} ({activeEmpresa.cnpjRaiz})
            </span>
          ) : (
            <span className="text-sm font-bold text-red-600">Nenhuma empresa selecionada</span>
          )}
        </div>
        <div className="text-xs text-secondary/70 font-semibold italic">
          Os dados abaixo são isolados para o empregador ativo acima.
        </div>
      </div>

      {!activeEmpresaId ? (
        <div className="card p-10 bg-white flex flex-col items-center justify-center text-center gap-4 border border-outline-variant max-w-xl mx-auto mt-6">
          <AlertCircle className="text-amber-500" size={40} />
          <div className="space-y-1">
            <h4 className="text-sm font-black text-[#1B365D] uppercase tracking-wide">Selecione uma Empresa Ativa</h4>
            <p className="text-xs text-secondary leading-normal">
              Para acessar o painel de Automação do eSocial S-5002, selecione uma empresa de trabalho no seletor do cabeçalho do sistema.
            </p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          
          {/* Main Controls Panel (Left side) */}
          <div className="lg:col-span-2 flex flex-col gap-6">
            
            {/* Trigger Sync Card */}
            <div className="card bg-white p-6 border border-outline-variant shadow-sm flex flex-col gap-5 rounded-sm">
              <h3 className="text-xs font-black text-primary uppercase tracking-widest flex items-center gap-2 pb-3 border-b border-outline-variant/50">
                <Download size={16} />
                Download Automático de Eventos
              </h3>

              <div className="flex flex-col sm:flex-row items-end gap-4 bg-[#FAF9FC] p-4 border border-outline-variant/40 rounded-sm">
                <div className="flex flex-col gap-1.5 flex-1 w-full">
                  <label className="text-[10px] font-bold text-secondary uppercase font-mono">Período de Apuração (Mês/Ano)</label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-outline" size={14} />
                    <input
                      type="month"
                      className="bg-white pl-9 pr-3 py-2 w-full text-xs font-bold outline-none focus:ring-1 focus:ring-primary rounded-sm border border-outline-variant shadow-sm"
                      value={sincAnoMes}
                      onChange={(e) => setSincAnoMes(e.target.value)}
                    />
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleSubmeterSincronizacao}
                  disabled={isSincronizandoActive || !certificadoAtivo}
                  className="bg-primary hover:opacity-95 disabled:bg-neutral-200 disabled:text-neutral-500 text-white font-bold text-xs uppercase tracking-wider px-6 py-2.5 rounded-sm active:scale-[0.99] transition-all flex items-center justify-center gap-2 w-full sm:w-auto h-9.5 shadow-md shrink-0"
                >
                  {isSincronizandoActive ? <Loader2 className="animate-spin" size={15} /> : <Download size={15} />}
                  <span>{isSincronizandoActive ? "Sincronizando..." : "Sincronizar S-5002"}</span>
                </button>
              </div>

              {isSincronizandoActive && (
                <div className="flex flex-col gap-2 p-3 bg-primary/5 rounded-sm border border-primary/20 animate-pulse">
                  <span className="text-[10px] font-mono font-bold text-primary">{sincMessage}</span>
                </div>
              )}

              {sincResultado && (
                <div className="flex flex-col p-4 bg-emerald-50 border border-emerald-200 rounded-sm text-xs font-mono gap-1.5 animate-fadeIn">
                  <div className="flex items-center gap-1.5 text-emerald-800 font-bold mb-1">
                    <CheckCheck size={15} />
                    <span>Download Concluído</span>
                  </div>
                  <p className="text-[11px] text-emerald-700 font-sans font-medium mb-1">
                    Os eventos oficiais de fechamento foram integrados e processados com sucesso pelo motor de conformidade.
                  </p>
                  <div className="grid grid-cols-2 gap-2 text-[10px] border-t border-emerald-200/50 pt-2 mt-1">
                    <span>Eventos Baixados: <strong className="text-emerald-800">{sincResultado.baixados}</strong></span>
                    <span>Erros de Estrutura: <strong className={sincResultado.erros > 0 ? "text-red-700 font-bold" : "text-emerald-800"}>{sincResultado.erros}</strong></span>
                  </div>
                </div>
              )}
            </div>

            {/* Sync History Logs List */}
            <div className="card bg-white border border-outline-variant shadow-sm rounded-sm flex flex-col">
              <div className="px-6 py-4 border-b border-outline-variant flex justify-between items-center bg-white rounded-t-sm">
                <h3 className="text-xs font-black text-secondary uppercase tracking-[0.15em] font-mono flex items-center gap-2">
                  <History size={15} />
                  Registro de Sincronizações Web Service
                </h3>
                <button
                  type="button"
                  onClick={() => fetchHistoricoSincs(activeEmpresaId)}
                  className="btn-outline px-3 py-1 text-[10px] font-bold bg-white border border-outline-variant hover:bg-neutral-50 flex items-center gap-1 rounded-sm transition-all"
                >
                  <History size={12} />
                  <span>Atualizar</span>
                </button>
              </div>

              {logsSincronizacoes.length === 0 ? (
                <div className="p-16 text-center text-xs text-secondary font-medium font-mono italic">
                  Nenhuma sincronização registrada para esta empresa.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="tabela-sincronizacao-webservice w-full border-collapse text-left text-xs text-on-surface">
                    <thead>
                      <tr className="bg-[#FAF9FC] border-b border-outline-variant text-[10px] font-bold text-secondary uppercase font-mono">
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
                        <React.Fragment key={item.id}>
                          <tr className="hover:bg-neutral-50/50 transition-colors">
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
                          {item.status === "erro" && (
                            <tr className="bg-red-50/30">
                              <td colSpan={7} className="px-4 py-2 border-b border-outline-variant/60 text-[11px] text-red-600 font-sans">
                                <div className="flex items-center gap-2">
                                  <AlertCircle size={14} className="shrink-0 text-red-500" />
                                  <span className="font-bold">Motivo do Erro:</span>
                                  <span className="font-mono">{item.mensagemErro || "Falha na validação do certificado A1 ou mTLS de conexão."}</span>
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

          </div>

          {/* Sidebar Panel: Certificate Status (Right side) */}
          <div className="flex flex-col gap-6">
            <div className="card bg-white p-6 border border-outline-variant shadow-sm flex flex-col gap-4 rounded-sm">
              <h3 className="text-xs font-black text-secondary uppercase tracking-[0.15em] font-mono border-b border-outline-variant pb-2 flex items-center gap-2">
                <Key size={15} />
                Certificado Requerido
              </h3>
              
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
                      <span className="text-xs font-bold text-emerald-800">Certificado Instalado</span>
                      <span className="text-[10px] text-emerald-600 font-mono font-bold">Acesso Homologado</span>
                    </div>
                  </div>

                  <div className="space-y-2 text-xs border-t border-dashed border-outline-variant/60 pt-3 mt-1 font-sans">
                    <div className="flex flex-col min-w-0">
                      <span className="text-[9px] text-secondary font-mono font-bold uppercase tracking-wider">Identificador</span>
                      <span className="font-bold text-on-surface truncate" title={certificadoAtivo.nome || "-"}>{certificadoAtivo.nome || "-"}</span>
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="text-[9px] text-secondary font-mono font-bold uppercase tracking-wider">Vencimento</span>
                      <span className={`font-bold ${certificadoAtivo.validade && !isNaN(new Date(certificadoAtivo.validade).getTime()) && new Date(certificadoAtivo.validade).getTime() < Date.now() ? "text-red-600" : "text-on-surface"}`}>
                        {certificadoAtivo.validade && !isNaN(new Date(certificadoAtivo.validade).getTime())
                          ? new Date(certificadoAtivo.validade).toLocaleDateString("pt-BR")
                          : "-"}
                      </span>
                    </div>
                  </div>

                  <Link
                    href="/settings?tab=certificado"
                    className="mt-3 text-xs font-bold text-primary hover:underline flex items-center gap-1.5 justify-center border border-outline-variant py-2 bg-neutral-50/50 hover:bg-neutral-50 rounded-sm"
                  >
                    <span>Configurar Certificados</span>
                    <ExternalLink size={13} />
                  </Link>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center text-center py-6 px-3 bg-neutral-50/55 rounded-sm border border-dashed border-outline-variant/70 gap-3">
                  <AlertCircle className="text-amber-500" size={28} />
                  <div>
                    <span className="text-xs font-bold text-on-surface block">Nenhum Certificado Ativo</span>
                    <p className="text-[10px] text-secondary mt-1 leading-normal">
                      É necessário que a empresa tenha um certificado A1 instalado no módulo de configurações para sincronizar com o eSocial.
                    </p>
                  </div>
                  
                  <Link
                    href="/settings"
                    className="w-full bg-primary hover:bg-primary/95 text-white text-[10px] font-black uppercase tracking-wider py-2.5 rounded-sm flex items-center justify-center gap-1.5 shadow-sm mt-1"
                  >
                    <span>Instalar Certificado</span>
                    <ArrowRight size={12} />
                  </Link>
                </div>
              )}
            </div>

            {/* Instruction Help Card */}
            <div className="card p-5 bg-white flex flex-col gap-3 border border-outline-variant/65">
              <h4 className="text-[10px] font-black text-primary uppercase tracking-[0.2em] font-mono border-b pb-1.5">Conectividade eSocial</h4>
              <p className="text-[10px] text-secondary leading-relaxed font-semibold">
                O sincronizador utiliza o webservice nacional do eSocial enviando lotes de consultas assinados por certificado digital da empresa sob o protocolo TLS 1.3 de forma criptografada ponta-a-ponta.
              </p>
            </div>
          </div>

        </div>
      )}
    </div>
  );
}

"use client";

import React, { useState, useEffect } from "react";
import { 
  AlertTriangle, 
  UserPlus, 
  Building2, 
  RefreshCcw, 
  ChevronRight,
  Loader2,
  CheckCircle2,
  UserCheck,
  Building
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useModals } from "@/lib/contexts/ModalContext";

export default function PendenciasPage() {
  const { openRegisterTrabalhadorModal, openRegisterEmpresaModal } = useModals();
  const [pendencies, setPendencies] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    fetchPendencies();
    
    // Listen for additions to refresh the list
    window.addEventListener("trabalhador-added", fetchPendencies);
    window.addEventListener("empresa-added", fetchPendencies);
    
    return () => {
      window.removeEventListener("trabalhador-added", fetchPendencies);
      window.removeEventListener("empresa-added", fetchPendencies);
    };
  }, []);

  const fetchPendencies = async () => {
    try {
      const res = await fetch("/api/fiscal/pendencies");
      if (res.ok) {
        const data = await res.json();
        setPendencies(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleReprocess = async () => {
    setIsProcessing(true);
    // Simular reprocessamento massivo
    await new Promise(r => setTimeout(r, 2000));
    alert("Reprocessamento agendado para o motor fiscal.");
    setIsProcessing(false);
    fetchPendencies();
  };

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="animate-spin text-primary" size={40} />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-lg pb-20">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-black text-primary-container tracking-tight">Pendências Operacionais</h1>
          <p className="text-xs text-secondary mt-1 tracking-tight">Identificação de inconsistências e registros órfãos no motor eSocial.</p>
        </div>
        <button 
          onClick={handleReprocess}
          disabled={isProcessing}
          className="btn-primary flex items-center gap-2 text-[10px] bg-tertiary"
        >
          {isProcessing ? <Loader2 size={14} className="animate-spin" /> : <RefreshCcw size={14} />}
          Reprocessar Tudo
        </button>
      </div>

      <div className="grid grid-cols-12 gap-lg">
        <div className="col-span-8 flex flex-col gap-md">
          {/* CPFs do XML não cadastrados no Banco */}
          {(pendencies?.unlinkedCpfs?.length > 0) && (
            <section className="card p-0 overflow-hidden border-2 border-primary/20 shadow-lg shadow-primary/5">
              <div className="p-lg border-b border-outline-variant flex justify-between items-center bg-primary/5">
                 <div className="flex items-center gap-2">
                   <UserCheck size={18} className="text-primary" />
                   <h2 className="text-sm font-black text-on-surface uppercase tracking-tight">Novos Trabalhadores Detectados (XML)</h2>
                 </div>
                 <span className="bg-primary text-white px-2 py-0.5 rounded text-[10px] font-black uppercase">
                    {pendencies.unlinkedCpfs.length} PENDENTES
                 </span>
              </div>
              <div className="p-lg grid grid-cols-1 gap-md">
                 <div className="bg-on-surface-variant/5 p-3 rounded-sm text-[10px] text-secondary italic mb-2">
                   Estes CPFs foram encontrados nos arquivos XML S-5002, mas não possuem cadastro no sistema. O eSocial não fornece nomes, apenas o CPF.
                 </div>
                 {pendencies.unlinkedCpfs.map((p: any) => (
                    <div key={p.cpfBenef} className="p-4 border border-outline-variant rounded-sm flex justify-between items-center bg-white hover:border-primary transition-all">
                       <div className="flex gap-8 items-center">
                          <div className="flex flex-col">
                            <span className="text-[10px] font-black text-secondary uppercase">CPF</span>
                            <span className="text-sm font-black text-primary font-mono">{p.cpfBenef}</span>
                          </div>
                          <div className="flex flex-col">
                            <span className="text-[10px] font-black text-secondary uppercase">Eventos Órfãos</span>
                            <span className="text-xs font-bold text-on-surface">{p._count._all} registros</span>
                          </div>
                       </div>
                       <button 
                         onClick={() => openRegisterTrabalhadorModal({ cpf: p.cpfBenef })}
                         className="btn-primary py-2 px-4 text-[10px] flex items-center gap-2"
                       >
                          <UserPlus size={14} />
                          Cadastrar Entidade
                       </button>
                    </div>
                 ))}
              </div>
            </section>
          )}

          {/* CNPJs do XML não cadastrados no Banco */}
          {(pendencies?.unlinkedCnpjs?.length > 0) && (
            <section className="card p-0 overflow-hidden border-2 border-emerald-500/20 shadow-lg shadow-emerald-500/5">
              <div className="p-lg border-b border-outline-variant flex justify-between items-center bg-emerald-50">
                 <div className="flex items-center gap-2">
                   <Building size={18} className="text-emerald-700" />
                   <h2 className="text-sm font-black text-on-surface uppercase tracking-tight">Novos Empregadores Detectados (XML)</h2>
                 </div>
                 <span className="bg-emerald-600 text-white px-2 py-0.5 rounded text-[10px] font-black uppercase">
                    {pendencies.unlinkedCnpjs.length} PENDENTES
                 </span>
              </div>
              <div className="p-lg grid grid-cols-1 gap-md">
                 <div className="bg-emerald-500/5 p-3 rounded-sm text-[10px] text-secondary italic mb-2">
                   Estes CNPJs Raiz foram encontrados nos arquivos XML S-5002, mas a empresa não está cadastrada.
                 </div>
                 {pendencies.unlinkedCnpjs.map((p: any) => (
                    <div key={p.cnpjRaiz} className="p-4 border border-outline-variant rounded-sm flex justify-between items-center bg-white hover:border-emerald-500 transition-all">
                       <div className="flex gap-8 items-center">
                          <div className="flex flex-col">
                            <span className="text-[10px] font-black text-secondary uppercase tracking-tighter">CNPJ RAIZ</span>
                            <span className="text-sm font-black text-emerald-700 font-mono">{p.cnpjRaiz}</span>
                          </div>
                          <div className="flex flex-col">
                            <span className="text-[10px] font-black text-secondary uppercase">Volume eSocial</span>
                            <span className="text-xs font-bold text-on-surface">{p._count._all} eventos vinculados</span>
                          </div>
                       </div>
                       <button 
                         onClick={() => openRegisterEmpresaModal({ cnpjRaiz: p.cnpjRaiz })}
                         className="bg-emerald-600 text-white font-bold py-2 px-4 rounded-sm text-[10px] hover:brightness-110 flex items-center gap-2 transition-all uppercase tracking-widest"
                       >
                          <Building2 size={14} />
                          Cadastrar Empresa
                       </button>
                    </div>
                 ))}
              </div>
            </section>
          )}

          {/* Trabalhadores sem identificação (Completar cadastro) */}
          <section className="card p-0 overflow-hidden">
            <div className="p-lg border-b border-outline-variant flex justify-between items-center bg-white">
               <div className="flex items-center gap-2">
                 <UserPlus size={18} className="text-secondary" />
                 <h2 className="text-sm font-bold text-on-surface">Dados Incompletos: Trabalhadores</h2>
               </div>
               <span className="bg-surface-container px-2 py-0.5 rounded text-[10px] font-bold text-secondary">
                  {pendencies?.workers.length || 0} ENCONTRADOS
               </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead className="bg-surface-container-high text-[10px] font-bold text-secondary uppercase">
                  <tr>
                    <th className="px-6 py-4">CPF / Documento</th>
                    <th className="px-6 py-4">Empresa Vinculada</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4 text-right">Ação</th>
                  </tr>
                </thead>
                <tbody className="bg-white">
                  {pendencies?.workers.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-6 py-10 text-center text-xs italic text-secondary opacity-50">
                        Nenhum trabalhador com pendência de nome.
                      </td>
                    </tr>
                  ) : (
                    pendencies?.workers.map((w: any) => (
                      <tr key={w.id} className="border-t border-outline-variant hover:bg-surface-container/20">
                        <td className="px-6 py-4 font-mono text-xs font-bold text-primary">{w.cpf}</td>
                        <td className="px-6 py-4">
                           <div className="flex flex-col">
                              <span className="text-[11px] font-bold text-on-surface">{w.empresa.razaoSocial || "Empresa s/ Razão"}</span>
                              <span className="text-[9px] text-secondary">{w.empresa.cnpjRaiz}</span>
                           </div>
                        </td>
                        <td className="px-6 py-4">
                           <span className="px-2 py-0.5 bg-error/10 text-error text-[10px] font-bold rounded-full uppercase">S/ Identificação</span>
                        </td>
                        <td className="px-6 py-4 text-right">
                           <button 
                             onClick={() => openRegisterTrabalhadorModal(w)}
                             className="text-primary hover:underline text-[10px] font-bold uppercase flex items-center justify-end gap-1 ml-auto"
                           >
                              Vincular Nome <ChevronRight size={12} />
                           </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>

          {/* Empresas sem identificação (Completar cadastro) */}
          <section className="card p-0 overflow-hidden">
             <div className="p-lg border-b border-outline-variant flex justify-between items-center bg-white">
               <div className="flex items-center gap-2">
                 <Building2 size={18} className="text-secondary" />
                 <h2 className="text-sm font-bold text-on-surface">Dados Incompletos: Empresas</h2>
               </div>
               <span className="bg-surface-container px-2 py-0.5 rounded text-[10px] font-bold text-secondary">
                  {pendencies?.empresas.length || 0} ENCONTRADOS
               </span>
            </div>
            <div className="p-lg grid grid-cols-2 gap-md">
               {pendencies?.empresas.map((e: any) => (
                  <div key={e.id} className="p-4 border border-outline-variant rounded-sm flex justify-between items-center bg-white hover:border-primary transition-all group">
                     <div className="flex flex-col">
                        <span className="text-[10px] font-bold text-secondary uppercase tracking-widest">CNPJ RAIZ</span>
                        <span className="text-sm font-black text-primary">{e.cnpjRaiz}</span>
                     </div>
                     <button 
                       onClick={() => openRegisterEmpresaModal(e)}
                       className="p-2 rounded-full border border-outline-variant group-hover:bg-primary group-hover:text-white group-hover:border-primary transition-all"
                     >
                        <ChevronRight size={16} />
                     </button>
                  </div>
               ))}
               {pendencies?.empresas.length === 0 && (
                  <p className="col-span-2 text-center text-xs italic text-secondary py-6 opacity-50">Nenhuma empresa com pendência.</p>
               )}
            </div>
          </section>
        </div>

        {/* Sidebar de Erros */}
        <div className="col-span-4 flex flex-col gap-lg">
           <section className="card p-lg bg-on-error-container/5 border-l-4 border-error">
              <div className="flex items-center gap-2 text-error mb-4">
                 <AlertTriangle size={18} />
                 <h3 className="text-[10px] font-black uppercase tracking-widest">Falhas Críticas de Processamento</h3>
              </div>
              <div className="space-y-3">
                 {pendencies?.errors.map((err: any) => (
                    <div key={err.id} className="p-3 bg-white border border-error/20 rounded-sm">
                       <span className="text-[9px] font-bold text-error uppercase">{err.tpEvento} • {err.perApur}</span>
                       <p className="text-[10px] font-mono mt-1 text-on-surface-variant truncate">{err.eventoId}</p>
                       <button className="mt-2 text-[9px] font-bold uppercase text-secondary hover:text-primary transition-all">Ver Detalhes do Erro</button>
                    </div>
                 ))}
                 {pendencies?.errors.length === 0 && (
                    <div className="flex flex-col items-center py-6 opacity-30 text-center">
                       <CheckCircle2 size={32} className="text-emerald-500 mb-2" />
                       <p className="text-[10px] font-bold uppercase">Nenhum Erro Ativo</p>
                    </div>
                 )}
              </div>
           </section>

           <div className="card p-lg bg-surface-container-high border-none">
              <h4 className="text-[11px] font-black text-on-surface uppercase mb-4 tracking-widest">Resumo de Qualidade</h4>
              <div className="flex flex-col gap-4">
                 <div className="flex justify-between items-center text-[11px]">
                    <span className="text-secondary font-medium">Cobertura de Nomes</span>
                    <span className="font-bold">92%</span>
                 </div>
                 <div className="w-full h-1 bg-surface rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500 w-[92%]"></div>
                 </div>
                 <div className="flex justify-between items-center text-[11px]">
                    <span className="text-secondary font-medium">Vínculos de Empresa</span>
                    <span className="font-bold">100%</span>
                 </div>
                 <div className="w-full h-1 bg-surface rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500 w-[100%]"></div>
                 </div>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
}

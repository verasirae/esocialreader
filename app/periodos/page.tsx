"use client";

import React, { useState, useEffect } from "react";
import { motion } from "motion/react";
import { 
  Calendar, 
  Plus, 
  Search, 
  Trash2, 
  AlertCircle,
  Loader2,
  ChevronLeft,
  X,
  CheckCircle2
} from "lucide-react";
import { cn, safeJsonFetch } from "@/lib/utils";
import Link from "next/link";

export default function PeriodosFiscaisPage() {
  const [periodos, setPeriodos] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Form state
  const [newAno, setNewAno] = useState(new Date().getFullYear().toString());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchPeriodos();
  }, []);

  const fetchPeriodos = async () => {
    setIsLoading(true);
    const data = await safeJsonFetch("/api/esocial/periodos");
    if (data) {
      setPeriodos(data);
    }
    setIsLoading(false);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError("");

    try {
      const data = await safeJsonFetch("/api/esocial/periodos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          anoCalendario: newAno,
          dtInicio: `${newAno}-01-01`,
          dtFim: `${newAno}-12-31`
        })
      });

      if (!data) {
        throw new Error("Erro ao criar período (Resposta vazia)");
      }
      
      if (data.error) {
        throw new Error(data.error);
      }

      setIsModalOpen(false);
      fetchPeriodos();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredPeriodos = periodos.filter(p => 
    p.anoCalendario.toString().includes(searchTerm)
  );

  return (
    <div className="flex flex-col gap-8 max-w-6xl mx-auto w-full py-8">
      {/* Header */}
      <div className="flex justify-between items-end">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2 text-secondary">
            <Link href="/esocial" className="hover:text-primary transition-colors">
              <ChevronLeft size={16} />
            </Link>
            <span className="text-[10px] font-black uppercase tracking-widest">Configurações Fiscais</span>
          </div>
          <h1 className="text-3xl font-black text-on-surface tracking-tight">Períodos Fiscais</h1>
          <p className="text-sm text-secondary font-medium italic">Gerencie os anos-calendário habilitados para importação e auditoria S-5002.</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="btn-primary flex items-center gap-2 px-6 py-3"
        >
          <Plus size={18} />
          <span className="font-bold">Novo Período</span>
        </button>
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-4 bg-white p-4 rounded-sm border border-outline-variant shadow-sm">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-secondary opacity-40" size={18} />
          <input 
            type="text" 
            placeholder="Pesquisar por ano..."
            className="w-full bg-surface-container border-none rounded-sm py-3 pl-12 pr-4 text-sm font-bold placeholder:font-medium placeholder:text-secondary/50 focus:ring-2 focus:ring-primary/20 transition-all"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Grid */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <Loader2 className="animate-spin text-primary" size={40} />
          <span className="text-sm font-black text-secondary uppercase tracking-widest">Carregando períodos...</span>
        </div>
      ) : filteredPeriodos.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredPeriodos.map((periodo) => (
            <motion.div 
              key={periodo.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="card bg-white p-6 border border-outline-variant hover:border-primary/30 transition-all group"
            >
              <div className="flex justify-between items-start mb-6">
                <div className="w-12 h-12 bg-primary/10 rounded-sm flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-all">
                  <Calendar size={24} />
                </div>
                <span className="px-3 py-1 bg-emerald-50 text-emerald-600 text-[10px] font-black uppercase rounded-full">Ativo</span>
              </div>
              
              <div className="space-y-4">
                <div>
                  <h3 className="text-2xl font-black text-on-surface">{periodo.anoCalendario}</h3>
                  <p className="text-[10px] font-black text-secondary uppercase tracking-widest mt-1">Ano-Calendário</p>
                </div>
                
                <div className="grid grid-cols-2 gap-4 pt-4 border-t border-outline-variant/50">
                  <div>
                    <p className="text-[9px] font-black text-secondary uppercase opacity-60">Início</p>
                    <p className="text-xs font-bold">{new Date(periodo.dtInicio).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}</p>
                  </div>
                  <div>
                    <p className="text-[9px] font-black text-secondary uppercase opacity-60">Fim</p>
                    <p className="text-xs font-bold">{new Date(periodo.dtFim).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}</p>
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-outline-variant/50 flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all">
                <button className="p-2 text-secondary hover:text-error transition-colors">
                  <Trash2 size={16} />
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-20 gap-4 bg-white border border-outline-variant rounded-sm border-dashed">
          <AlertCircle className="text-secondary opacity-20" size={48} />
          <div className="text-center">
            <p className="text-sm font-black text-secondary uppercase tracking-widest">Nenhum período encontrado</p>
            <p className="text-xs text-secondary font-medium italic mt-1">Cadastre um novo período para prosseguir.</p>
          </div>
        </div>
      )}

      {/* Modal Cadastro */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="bg-white w-full max-w-[500px] flex flex-col rounded-sm shadow-2xl border border-outline-variant overflow-hidden min-h-[400px]"
          >
            <div className="p-6 border-b border-outline-variant flex justify-between items-center bg-surface-container/10">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-primary rounded-sm flex items-center justify-center text-white shadow-sm">
                  <Plus size={18} />
                </div>
                <h3 className="font-extrabold text-on-surface text-lg tracking-tight">Novo Período Fiscal</h3>
              </div>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="w-10 h-10 rounded-full hover:bg-surface-container text-secondary flex items-center justify-center transition-all"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreate} className="p-8 space-y-6 flex-1 flex flex-col">
              {error && (
                <div className="p-4 bg-error/5 border border-error/20 rounded-sm flex items-center gap-3 text-error">
                  <AlertCircle size={18} />
                  <span className="text-xs font-bold">{error}</span>
                </div>
              )}

              <div className="space-y-3">
                <label className="text-[10px] font-black text-secondary uppercase tracking-[0.2em]">Ano Calendário</label>
                <input 
                  type="number" 
                  value={newAno}
                  onChange={(e) => setNewAno(e.target.value)}
                  className="w-full bg-surface-container border border-outline-variant rounded-sm py-4 px-4 text-sm font-black focus:ring-2 focus:ring-primary/20 transition-all text-on-surface"
                  placeholder="EX: 2025"
                  required
                />
              </div>

              <div className="p-4 bg-surface rounded-sm border border-outline-variant/30 italic">
                <p className="text-[10px] text-secondary font-medium leading-relaxed">
                  Ao cadastrar o ano, o sistema definirá automaticamente o período de 01/01 a 31/12 correspondente para todas as apurações do eSocial.
                </p>
              </div>

              <div className="flex gap-4 pt-4 mt-auto">
                <button 
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 btn-outline py-4 font-bold border-outline-variant"
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 btn-primary py-4 font-bold flex items-center justify-center gap-2 border-none shadow-lg shadow-primary/20"
                >
                  {isSubmitting ? <Loader2 size={18} className="animate-spin" /> : <><CheckCircle2 size={18} /> Cadastrar</>}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
}

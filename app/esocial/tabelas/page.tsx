"use client";

import React, { useState } from "react";
import { 
  Table, 
  Upload, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  FileSpreadsheet,
  ChevronLeft,
  CloudUpload
} from "lucide-react";
import Link from "next/link";
import { cn, fetchWithRetry } from "@/lib/utils";

const TABLES = [
  { id: "01", name: "Tabela 01 - Categorias de Trabalhadores - eSocial" },
  { id: "03", name: "Tabela 03 - Tabela de Natureza das Rubricas da Folha de Pagamento - eSocial" },
  { id: "05", name: "Tabela 05 - Tipos de Inscrição - eSocial" },
  { id: "21", name: "Tabela 21 - Códigos de Incidência Tributária da Rubrica para IRRF" },
  { id: "25", name: "Tabela 25 - Tipos de Dependente - eSocial" },
  { id: "54", name: "Tabela 54 - Tabela de Rubricas do eSocial" },
  { id: "78", name: "Tabela 78 - Tabela de Código de Receita - Totalizadores - eSocial" },
  { id: "80", name: "Tabela 80 - Tabela de Tipo de Valor de Imposto de Renda - Totalizadores - eSocial" },
];

export default function TablesImportPage() {
  const [selectedTable, setSelectedTable] = useState(TABLES[0].id);
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<{ processed: number, errors: number } | null>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setProgress(0);
    setStatus({ processed: 0, errors: 0 });

    const reader = new FileReader();
    reader.onload = async (event) => {
      const csvData = event.target?.result as string;
      const allLines = csvData.split("\n").filter(l => l.trim().length > 0);
      const chunkSize = 50;
      let totalProcessed = 0;
      let totalErrors = 0;

      for (let i = 0; i < allLines.length; i += chunkSize) {
        const chunk = allLines.slice(i, i + chunkSize);
        
        try {
          const res = await fetchWithRetry("/api/esocial/tables/import", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ tableId: selectedTable, lines: chunk }),
          });

          if (!res.ok) {
            const err = await res.json().catch(() => ({ error: "Erro desconhecido no servidor" }));
            throw new Error(err.error || "Erro ao importar chunk");
          }

          const data = await res.json();
          totalProcessed += data.processed;
          totalErrors += data.errors;
          
          const currentProgress = Math.min(100, Math.round(((i + chunk.length) / allLines.length) * 100));
          setProgress(currentProgress);
          setStatus({ processed: totalProcessed, errors: totalErrors });
        } catch (err: any) {
          console.error("Erro no fetch do chunk:", err);
          if (err.message.includes("Failed to fetch")) {
            console.warn("Erro de rede persistente detectado.");
          }
          totalErrors += chunk.length;
          setStatus({ processed: totalProcessed, errors: totalErrors });
        }
      }

      setIsUploading(false);
    };

    reader.readAsText(file);
  };

  return (
    <div className="flex flex-col gap-lg max-w-4xl mx-auto py-10">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Link href="/" className="p-2 hover:bg-surface-container rounded-full transition-all">
            <ChevronLeft size={24} />
          </Link>
          <div>
            <h1 className="text-3xl font-black text-on-surface tracking-tight">Importação de Tabelas eSocial</h1>
            <p className="text-secondary text-sm">Atualize as referências oficiais do sistema via arquivos CSV (|)</p>
          </div>
        </div>
        
        <Link 
          href="/esocial/tabelas/visualizar" 
          className={cn(
            "flex items-center gap-2 px-6 py-3 bg-secondary text-on-secondary rounded-full font-black text-[10px] uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-lg shadow-secondary/20",
            isUploading && "opacity-50 pointer-events-none"
          )}
        >
          Visualizar Tabelas
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-md">
        {/* Lado Esquerdo: Seleção e Upload */}
        <div className="card p-xl flex flex-col gap-lg">
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-secondary">Selecione a Tabela</label>
            <select 
              className="w-full p-3 bg-surface border border-outline-variant rounded-sm font-bold text-sm focus:ring-2 focus:ring-primary outline-none disabled:opacity-50 disabled:cursor-not-allowed"
              value={selectedTable}
              onChange={(e) => setSelectedTable(e.target.value)}
              disabled={isUploading}
            >
              {TABLES.map(t => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </div>

          <div 
            className={cn(
              "border-2 border-dashed border-outline-variant rounded-lg p-10 flex flex-col items-center justify-center gap-4 transition-all hover:bg-primary/5 hover:border-primary cursor-pointer",
              isUploading && "pointer-events-none opacity-50"
            )}
            onClick={() => document.getElementById("table-upload")?.click()}
          >
            <div className="w-16 h-16 rounded-full bg-surface-container-high flex items-center justify-center">
              {isUploading ? <Loader2 className="animate-spin text-primary" size={32} /> : <FileSpreadsheet className="text-secondary" size={32} />}
            </div>
            <div className="text-center">
              <p className="text-sm font-black text-on-surface">Clique para selecionar o CSV</p>
              <p className="text-[11px] text-secondary mt-1">Formato: Colunas separadas por pipe (|)</p>
            </div>
          </div>
          <input 
            id="table-upload" 
            type="file" 
            accept=".csv,.txt" 
            className="hidden" 
            onChange={handleFileChange} 
          />

          {isUploading && (
            <div className="flex flex-col gap-2">
              <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-wider text-primary">
                <span>Processando dados...</span>
                <span>{progress}%</span>
              </div>
              <div className="w-full bg-surface-container-high h-1.5 rounded-full overflow-hidden">
                <div className="bg-primary h-full transition-all duration-500" style={{ width: `${progress}%` }} />
              </div>
            </div>
          )}

          {status && (
            <div className={cn(
              "p-4 rounded-sm flex items-start gap-3",
              status.errors === 0 ? "bg-emerald-50 text-emerald-900 border border-emerald-200" : "bg-warning/10 text-warning-container border border-warning/20"
            )}>
              {status.errors === 0 ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
              <div className="flex flex-col">
                <span className="text-xs font-black uppercase tracking-tight">Importação Finalizada</span>
                <span className="text-[11px]">Sucesso: <strong>{status.processed}</strong> linhas | Erros: <strong>{status.errors}</strong></span>
              </div>
            </div>
          )}
        </div>

        {/* Lado Direito: Instruções/Dicas */}
        <div className="flex flex-col gap-md">
          <div className="card p-lg bg-surface-container/50 border-none">
             <h3 className="text-xs font-black uppercase tracking-widest text-secondary flex items-center gap-2 mb-4">
                <AlertCircle size={14} />
                Regras de Formatação
             </h3>
             <ul className="flex flex-col gap-3">
                <li className="flex gap-3 text-[11px] leading-relaxed">
                   <div className="w-1 h-1 rounded-full bg-primary mt-1.5 shrink-0" />
                   <span>O separador deve ser obrigatoriamente o caractere **|** (pipe).</span>
                </li>
                <li className="flex gap-3 text-[11px] leading-relaxed">
                   <div className="w-1 h-1 rounded-full bg-primary mt-1.5 shrink-0" />
                   <span>As datas devem estar no formato ISO (AAAA-MM-DD) ou outro reconhecido pelo sistema.</span>
                </li>
                <li className="flex gap-3 text-[11px] leading-relaxed">
                   <div className="w-1 h-1 rounded-full bg-primary mt-1.5 shrink-0" />
                   <span>O sistema utiliza o par (Código + Data de Início) como chave única para evitar duplicidades.</span>
                </li>
             </ul>
          </div>

          <div className="card p-lg border-primary/20 bg-primary/5">
             <h3 className="text-xs font-black uppercase tracking-widest text-primary flex items-center gap-2 mb-2">
                <CloudUpload size={14} />
                Dica de Manutenção
             </h3>
             <p className="text-[11px] text-on-surface-variant leading-relaxed">
                Manter estas tabelas atualizadas é fundamental para a correta validação das rubricas (S-5002) e para a geração de relatórios de conformidade.
             </p>
          </div>
        </div>
      </div>
    </div>
  );
}

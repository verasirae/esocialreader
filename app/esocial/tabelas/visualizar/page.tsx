"use client";

import React, { useState, useEffect, useCallback } from "react";
import { 
  Table as TableIcon,
  Search,
  ChevronLeft,
  ChevronRight,
  Download,
  Filter,
  Loader2,
  ArrowLeft
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

const TABLES = [
  { id: "01", name: "Tabela 01", fullName: "Categorias de Trabalhadores - eSocial" },
  { id: "03", name: "Tabela 03", fullName: "Tabela de Natureza das Rubricas da Folha de Pagamento - eSocial" },
  { id: "05", name: "Tabela 05", fullName: "Tipos de Inscrição - eSocial" },
  { id: "21", name: "Tabela 21", fullName: "Códigos de Incidência Tributária da Rubrica para IRRF" },
  { id: "25", name: "Tabela 25", fullName: "Tipos de Dependente - eSocial" },
  { id: "54", name: "Tabela 54", fullName: "Tabela de Rubricas do eSocial" },
  { id: "78", name: "Tabela 78", fullName: "Tabela de Código de Receita - Totalizadores - eSocial" },
  { id: "80", name: "Tabela 80", fullName: "Tabela de Tipo de Valor de Imposto de Renda - Totalizadores - eSocial" },
];

export default function TablesViewPage() {
  const [activeTable, setActiveTable] = useState(TABLES[0].id);
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, pageSize: 50, total: 0, totalPages: 0 });
  const [searchTerm, setSearchTerm] = useState("");

  const fetchData = useCallback(async (tableId: string, page: number) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/esocial/tables?tableId=${tableId}&page=${page}&pageSize=50`);
      if (!res.ok) throw new Error("Erro ao carregar dados");
      const json = await res.json();
      setData(json.data);
      setPagination(json.pagination);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData(activeTable, 1);
  }, [activeTable, fetchData]);

  const handlePageChange = (newPage: number) => {
    if (newPage < 1 || newPage > pagination.totalPages) return;
    fetchData(activeTable, newPage);
  };

  const currentTableInfo = TABLES.find(t => t.id === activeTable);

  return (
    <div className="flex h-screen bg-surface overflow-hidden">
      {/* Sidebar de Tabelas */}
      <aside className="w-80 border-r border-outline-variant bg-surface-container-low flex flex-col">
        <div className="p-6 border-b border-outline-variant">
           <Link href="/esocial/tabelas" className="flex items-center gap-2 text-secondary hover:text-primary transition-colors text-xs font-bold mb-4">
              <ArrowLeft size={14} /> Voltar para Importação
           </Link>
           <h2 className="text-xl font-black tracking-tight flex items-center gap-2">
              <TableIcon size={20} className="text-primary" />
              Tabelas eSocial
           </h2>
           <p className="text-[10px] text-secondary mt-1 font-bold uppercase tracking-widest">Visualização de Referências</p>
        </div>

        <div className="flex-1 overflow-y-auto p-2">
           {TABLES.map(table => (
              <button
                key={table.id}
                onClick={() => setActiveTable(table.id)}
                className={cn(
                  "w-full text-left p-4 rounded-lg flex flex-col gap-1 transition-all group",
                  activeTable === table.id 
                    ? "bg-primary text-on-primary shadow-lg shadow-primary/20" 
                    : "hover:bg-surface-container-high"
                )}
              >
                <div className="flex justify-between items-center">
                   <span className={cn("text-[10px] font-black uppercase tracking-widest", activeTable === table.id ? "text-white opacity-80" : "text-primary")}>
                      {table.name}
                   </span>
                   {activeTable === table.id && <div className="w-1.5 h-1.5 rounded-full bg-on-primary animate-pulse" />}
                </div>
                <span className="text-xs font-bold leading-tight">{table.fullName}</span>
              </button>
           ))}
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col bg-surface overflow-hidden">
        {/* Toolbar */}
        <header className="p-6 border-b border-outline-variant flex justify-between items-center bg-surface/50 backdrop-blur-sm z-10">
           <div className="flex flex-col">
              <h1 className="text-2xl font-black tracking-tight">{currentTableInfo?.fullName}</h1>
              <span className="text-[10px] font-black text-secondary tracking-widest uppercase mt-1">
                 Total de {pagination.total} registros encontrados
              </span>
           </div>

           <div className="flex items-center gap-3">
              <div className="relative">
                 <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary" size={16} />
                 <input 
                   type="text" 
                   placeholder="Pesquisar..." 
                   className="pl-10 pr-4 py-2 bg-surface-container-high border border-outline-variant rounded-full text-sm font-medium outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all w-64"
                   value={searchTerm}
                   onChange={(e) => setSearchTerm(e.target.value)}
                 />
              </div>
              <button 
                onClick={() => window.open(`/api/esocial/export?tableId=${activeTable}`, "_blank")}
                className="p-2 border border-outline-variant rounded-full hover:bg-surface-container transition-all"
              >
                <Download size={18} />
              </button>
           </div>
        </header>

        {/* Table Area */}
        <div className="flex-1 overflow-auto p-6 scrollbar-hide">
           {loading ? (
             <div className="h-full flex flex-col items-center justify-center gap-4 animate-fade-in">
                <div className="relative">
                   <Loader2 className="animate-spin text-primary" size={48} />
                   <div className="absolute inset-0 flex items-center justify-center text-[10px] font-black">
                      {activeTable}
                   </div>
                </div>
                <p className="text-xs font-black uppercase tracking-widest text-secondary">Carregando dados da tabela...</p>
             </div>
           ) : (
             <div className="card border-none bg-surface-container-low/50 overflow-hidden shadow-sm">
                <table className="w-full text-left border-collapse">
                   <thead className="bg-surface-container border-b border-outline-variant sticky top-0 bg-white z-20">
                      <tr>
                         <th className="p-4 text-[10px] font-black uppercase tracking-widest text-secondary border-r border-outline-variant/30">Cód.</th>
                         <th className="p-4 text-[10px] font-black uppercase tracking-widest text-secondary">Descrição / Nome</th>
                         <th className="p-4 text-[10px] font-black uppercase tracking-widest text-secondary">Início</th>
                         <th className="p-4 text-[10px] font-black uppercase tracking-widest text-secondary">Fim</th>
                         {activeTable === "01" && <th className="p-4 text-[10px] font-black uppercase tracking-widest text-secondary">Aliq. FGTS</th>}
                         {activeTable === "54" && <th className="p-4 text-[10px] font-black uppercase tracking-widest text-secondary">Nat. Rubr.</th>}
                      </tr>
                   </thead>
                   <tbody className="divide-y divide-outline-variant/30">
                      {data.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="p-20 text-center">
                             <TableIcon className="mx-auto text-outline-variant mb-4" size={48} />
                             <p className="text-sm font-black text-secondary uppercase tracking-widest">Nenhum dado encontrado</p>
                             <Link href="/esocial/tabelas" className="text-xs text-primary font-bold mt-2 inline-block underline underline-offset-4">Clique aqui para importar</Link>
                          </td>
                        </tr>
                      ) : data.filter(row => {
                        const val = Object.values(row).join(" ").toLowerCase();
                        return val.includes(searchTerm.toLowerCase());
                      }).map((row, idx) => (
                        <tr key={idx} className="hover:bg-surface-container transition-colors group">
                           <td className="p-4 font-mono text-xs font-bold text-primary border-r border-outline-variant/30 group-hover:bg-primary/5">
                              {row.codigo || row.codRubrica}
                           </td>
                           <td className="p-4 text-xs font-medium max-w-md">
                              {row.descricao || row.nome || row.nomeRubrica}
                           </td>
                           <td className="p-4 text-[11px] font-bold text-secondary">
                              {row.dtInicio ? format(new Date(row.dtInicio), 'dd/MM/yyyy') : '-'}
                           </td>
                           <td className="p-4 text-[11px] font-bold text-secondary">
                              {row.dtFim ? format(new Date(row.dtFim), 'dd/MM/yyyy') : '-'}
                           </td>
                           {activeTable === "01" && <td className="p-4 text-[11px] font-bold">{row.aliqFgts}%</td>}
                           {activeTable === "54" && <td className="p-4 text-[11px] font-bold">{row.natRubrica}</td>}
                        </tr>
                      ))}
                   </tbody>
                </table>
             </div>
           )}
        </div>

        {/* Pagination */}
        {!loading && data.length > 0 && (
          <footer className="p-4 border-t border-outline-variant bg-surface-container-low flex justify-between items-center shadow-xl">
             <div className="text-[10px] font-black text-secondary tracking-widest uppercase">
                Página {pagination.page} de {pagination.totalPages}
             </div>
             <div className="flex items-center gap-2">
                <button 
                  onClick={() => handlePageChange(pagination.page - 1)}
                  disabled={pagination.page === 1}
                  className="p-2 rounded-full border border-outline-variant hover:bg-surface-container disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                >
                  <ChevronLeft size={20} />
                </button>
                <button 
                  onClick={() => handlePageChange(pagination.page + 1)}
                  disabled={pagination.page === pagination.totalPages}
                  className="p-2 rounded-full border border-outline-variant hover:bg-surface-container disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                >
                  <ChevronRight size={20} />
                </button>
             </div>
          </footer>
        )}
      </main>
    </div>
  );
}

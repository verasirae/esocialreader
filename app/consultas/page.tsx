"use client";

import React, { useState, useEffect, useRef } from "react";
import { 
  Database, 
  Terminal, 
  Play, 
  Save, 
  Trash2, 
  Star, 
  Search, 
  Plus, 
  Download, 
  FileText, 
  AlertCircle, 
  Clock, 
  Layers, 
  CheckCircle2, 
  X,
  History,
  Check,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  ChevronDown
} from "lucide-react";
import { useAuth } from "@/lib/contexts/AuthContext";
import { buildSql, FiltroVisual, BuilderConfig, Operador } from "@/lib/consulta/sql-builder";

// Available tables schema for Visual Builder
const AVAILABLE_TABLES = [
  {
    name: "empresa",
    label: "Empregadores / Empresas",
    columns: ["id", "cnpj_raiz", "cnpj_completo", "razao_social", "nome_fantasia", "ambiente_esocial", "created_at"]
  },
  {
    name: "trabalhador",
    label: "Trabalhadores",
    columns: ["id", "empresa_id", "cpf", "nis", "matricula", "nome", "categoria_esocial", "ativo", "dt_admissao", "dt_desligamento", "created_at"]
  },
  {
    name: "prestador_servico",
    label: "Prestadores de Serviço",
    columns: ["id", "empresa_id", "cnpj", "cnpj_raiz", "razao_social", "nome_fantasia", "tipo_servico", "codigo_servico", "email", "telefone", "ativo", "created_at"]
  },
  {
    name: "operadora_saude",
    label: "Operadoras de Saúde",
    columns: ["id", "cnpj", "registro_ans", "nome", "tipo", "created_at"]
  },
  {
    name: "s5002_consolidado_periodo",
    label: "Consolidado eSocial (S-5002)",
    columns: ["id", "empresa_id", "trabalhador_id", "periodo", "versao", "ativo", "vlr_rend_trib", "vlr_rend_trib_13", "vlr_prev_oficial", "vlr_prev_oficial_13", "vlr_pensao", "vlr_plano_saude", "vlr_dependentes", "vlr_irrf", "created_at"]
  },
  {
    name: "divergencia_fiscal",
    label: "Divergências eSocial",
    columns: ["id", "evento_id", "tipo", "descricao", "severidade", "resolvido", "created_at"]
  },
  {
    name: "reinf_divergencia",
    label: "Divergências REINF",
    columns: ["id", "evento_id", "tipo", "descricao", "severidade", "resolvido", "created_at"]
  },
  {
    name: "usuario",
    label: "Usuários do Portal",
    columns: ["id", "email", "nome", "perfil", "ativo", "created_at"]
  }
];

// Handy SQL snippets for quick copy-pasting
const SQL_SNIPPETS = [
  {
    label: "Listar todos Trabalhadores ativos",
    sql: "SELECT id, cpf, nome, matricula, dt_admissao \nFROM \"trabalhador\" \nWHERE ativo = true \nORDER BY nome ASC \nLIMIT 100;"
  },
  {
    label: "Sumarizar base de cálculo e IRRF por Empresa",
    sql: "SELECT e.razao_social, SUM(c.vlr_rend_trib) as total_rendimentos, SUM(c.vlr_irrf) as total_ir_retido \nFROM \"s5002_consolidado_periodo\" c \nJOIN \"empresa\" e ON c.empresa_id = e.id \nWHERE c.ativo = true \nGROUP BY e.razao_social \nORDER BY total_rendimentos DESC;"
  },
  {
    label: "Buscar divergências críticas não resolvidas",
    sql: "SELECT id, tipo, descricao, severidade, created_at \nFROM \"divergencia_fiscal\" \nWHERE resolvido = false AND severidade IN ('ALTA', 'CRITICA') \nORDER BY created_at DESC;"
  },
  {
    label: "Operadoras de Saúde cadastradas",
    sql: "SELECT cnpj, nome, registro_ans, tipo \nFROM \"operadora_saude\" \nORDER BY nome ASC;"
  }
];

export default function ConsultasEspeciaisPage() {
  const { user } = useAuth();

  // Active query details
  const [sqlInput, setSqlInput] = useState<string>("SELECT * FROM \"empresa\" LIMIT 50;");
  const [selectedQueryId, setSelectedQueryId] = useState<string | null>(null);
  const [queryTitle, setQueryTitle] = useState<string>("");
  const [queryDesc, setQueryDesc] = useState<string>("");

  // Editor mode tabs
  const [activeWorkspaceTab, setActiveWorkspaceTab] = useState<"editor" | "builder">("editor");

  // Visual Builder State
  const [selectedTable, setSelectedTable] = useState<string>("empresa");
  const [selectedColumns, setSelectedColumns] = useState<string[]>([]);
  const [builderFilters, setBuilderFilters] = useState<FiltroVisual[]>([]);
  const [builderSortCol, setBuilderSortCol] = useState<string>("");
  const [builderSortDir, setBuilderSortDir] = useState<"ASC" | "DESC">("ASC");
  const [builderLimit, setBuilderLimit] = useState<number>(100);

  // Saved Queries Catalog
  const [catalogQueries, setCatalogQueries] = useState<any[]>([]);
  const [isLoadingCatalog, setIsLoadingCatalog] = useState<boolean>(true);
  const [catalogSearch, setCatalogSearch] = useState<string>("");

  // Server execution results
  const [executionResult, setExecutionResult] = useState<any | null>(null);
  const [isExecuting, setIsExecuting] = useState<boolean>(false);
  const [executionError, setExecutionError] = useState<string | null>(null);

  // Save Query Modal/Form fields
  const [showSaveModal, setShowSaveModal] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveSuccessMessage, setSaveSuccessMessage] = useState<string | null>(null);
  const [saveErrorMessage, setSaveErrorMessage] = useState<string | null>(null);

  // Pagination & Filtering inside results
  const [resultsFilter, setResultsFilter] = useState<string>("");
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [rowsPerPage, setRowsPerPage] = useState<number>(50);

  // Audit Logs Tab/Panel
  const [showAuditLogs, setShowAuditLogs] = useState<boolean>(false);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [isLoadingAudit, setIsLoadingAudit] = useState<boolean>(false);

  // Load queries catalog from API
  const fetchCatalog = async () => {
    setIsLoadingCatalog(true);
    try {
      const url = catalogSearch 
        ? `/api/consultas-especiais?search=${encodeURIComponent(catalogSearch)}`
        : `/api/consultas-especiais`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setCatalogQueries(data);
      } else {
        console.error("Erro ao carregar catálogo:", res.statusText);
      }
    } catch (err) {
      console.error("Erro de conexão ao carregar catálogo:", err);
    } finally {
      setIsLoadingCatalog(false);
    }
  };

  // Load audit history logs
  const fetchAuditLogs = async () => {
    setIsLoadingAudit(true);
    try {
      const res = await fetch(`/api/consultas-especiais/geral/historico`);
      if (res.ok) {
        const data = await res.json();
        setAuditLogs(data);
      }
    } catch (err) {
      console.error("Erro ao carregar auditoria:", err);
    } finally {
      setIsLoadingAudit(false);
    }
  };

  useEffect(() => {
    if (user?.perfil === "superAdmin") {
      fetchCatalog();
    }
  }, [catalogSearch, user]);

  // Handle auto-generation of SQL from Visual Builder settings
  useEffect(() => {
    if (activeWorkspaceTab === "builder") {
      const config: BuilderConfig = {
        tabela: selectedTable,
        colunas: selectedColumns,
        filtros: builderFilters,
        limite: builderLimit,
        joins: []
      };

      if (builderSortCol) {
        config.ordenacao = [{ coluna: builderSortCol, direcao: builderSortDir }];
      }

      // Automatically join with 'empresa' when focusing dependent tables
      if (selectedTable === "trabalhador" && selectedColumns.includes("id")) {
        // Option to add auto join
      }

      const compiledSql = buildSql(config);
      setSqlInput(compiledSql);
    }
  }, [selectedTable, selectedColumns, builderFilters, builderSortCol, builderSortDir, builderLimit, activeWorkspaceTab]);

  // Reset visual builder options when switching active tables
  const handleTableChange = (tableName: string) => {
    setSelectedTable(tableName);
    setSelectedColumns([]);
    setBuilderFilters([]);
    setBuilderSortCol("");
    setBuilderSortDir("ASC");
  };

  // Safe checks for SuperAdmin
  if (!user || user.perfil !== "superAdmin") {
    return (
      <div id="unauthorized-container" className="max-w-xl mx-auto my-12 bg-white rounded-sm border border-outline-variant p-10 text-center shadow-lg">
        <div className="mx-auto w-16 h-16 rounded-sm bg-error/5 flex items-center justify-center text-error mb-6">
          <AlertCircle size={36} />
        </div>
        <h1 className="text-xl font-black text-[#1B365D] uppercase tracking-wide mb-3">Acesso Restrito</h1>
        <p className="text-sm text-secondary leading-relaxed mb-6">
          O <strong>Módulo de Consultas Especiais SQL</strong> está disponível em regime de auditoria restrita exclusivamente à liderança técnica e usuários corporativos com perfil <strong>SuperAdmin</strong>.
        </p>
        <div className="p-4 bg-surface-container-low rounded-sm text-left border border-outline-variant mb-6 text-xs text-secondary space-y-2">
          <div className="flex items-center gap-2 text-primary font-bold">
            <ShieldCheck size={14} /> Diretiva de Segurança Física (Cortex)
          </div>
          <p>Toda execução de queries ad-hoc é auditada e persistida cronologicamente com metadados de credencial para logs de controle interno.</p>
        </div>
      </div>
    );
  }

  // Reload selected query into work spaces
  const loadQueryToWorkspace = (q: any) => {
    setSelectedQueryId(q.id);
    setQueryTitle(q.titulo);
    setQueryDesc(q.descricao || "");
    setSqlInput(q.sqlTexto);
    if (q.tipo === "visual" && q.parametros) {
      try {
        const params = typeof q.parametros === "string" ? JSON.parse(q.parametros) : q.parametros;
        if (params.tabela) setSelectedTable(params.tabela);
        if (params.colunas) setSelectedColumns(params.colunas);
        if (params.filtros) setBuilderFilters(params.filtros);
        if (params.limite) setBuilderLimit(params.limite);
        if (params.ordenacao && params.ordenacao[0]) {
          setBuilderSortCol(params.ordenacao[0].coluna);
          setBuilderSortDir(params.ordenacao[0].direcao);
        }
        setActiveWorkspaceTab("builder");
      } catch (e) {
        console.error("Erro ao carregar parâmetros visuais:", e);
        setActiveWorkspaceTab("editor");
      }
    } else {
      setActiveWorkspaceTab("editor");
    }
    // Clear results
    setExecutionResult(null);
    setExecutionError(null);
  };

  // Set workspace to clear template
  const initNewQueryWorkspace = () => {
    setSelectedQueryId(null);
    setQueryTitle("");
    setQueryDesc("");
    setSqlInput("SELECT * FROM \"empresa\" LIMIT 50;");
    setSelectedTable("empresa");
    setSelectedColumns([]);
    setBuilderFilters([]);
    setBuilderSortCol("");
    setBuilderSortDir("ASC");
    setBuilderLimit(100);
    setActiveWorkspaceTab("editor");
    setExecutionResult(null);
    setExecutionError(null);
  };

  // Core execution trigger
  const handleExecuteSql = async () => {
    setIsExecuting(true);
    setExecutionError(null);
    setExecutionResult(null);
    setCurrentPage(1); // reset view

    try {
      const resp = await fetch("/api/consultas-especiais/executar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          sql: sqlInput, 
          consultaId: selectedQueryId 
        }),
      });

      const contentType = resp.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        const data = await resp.json();
        if (resp.ok) {
          setExecutionResult(data);
        } else {
          setExecutionError(data.error || "Ocorreu um erro ao processar a requisição.");
        }
      } else {
        const rawText = await resp.text();
        if (resp.status === 403 || resp.status === 401) {
          setExecutionError("Acesso não autorizado ou sessão expirada no servidor.");
        } else {
          setExecutionError(`Erro retornado pelo servidor (${resp.status}): ${rawText.slice(0, 200)}`);
        }
      }
    } catch (err: any) {
      console.error(err);
      setExecutionError(`Falha de rede ou conexão com o servidor: ${err.message || err}`);
    } finally {
      setIsExecuting(false);
    }
  };

  // Perform soft delete on query
  const handleDeleteQuery = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Tem certeza que deseja remover esta consulta salva?")) return;

    try {
      const res = await fetch(`/api/consultas-especiais/${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        if (selectedQueryId === id) {
          initNewQueryWorkspace();
        }
        fetchCatalog();
      } else {
        alert("Erro ao remover consulta.");
      }
    } catch (err) {
      console.error(err);
      alert("Conexão falhou ao solicitar deleção.");
    }
  };

  // Star / Favorite toggle
  const handleToggleFavorite = async (q: any, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const res = await fetch(`/api/consultas-especiais/${q.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ favorito: !q.favorito }),
      });
      if (res.ok) {
        fetchCatalog();
        if (selectedQueryId === q.id) {
          setQueryTitle(q.titulo);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Save Query action handler (POST or PUT)
  const handleSaveQuerySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveErrorMessage(null);
    setSaveSuccessMessage(null);

    const payload = {
      titulo: queryTitle,
      descricao: queryDesc,
      tipo: activeWorkspaceTab === "builder" ? "visual" : "sql_livre",
      sqlTexto: sqlInput,
      parametros: activeWorkspaceTab === "builder" ? {
        tabela: selectedTable,
        colunas: selectedColumns,
        filtros: builderFilters,
        ordenacao: builderSortCol ? [{ coluna: builderSortCol, direcao: builderSortDir }] : [],
        limite: builderLimit
      } : null
    };

    try {
      let resp;
      if (selectedQueryId) {
        // Is updating (PUT)
        resp = await fetch(`/api/consultas-especiais/${selectedQueryId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } else {
        // Is creating new (POST)
        resp = await fetch(`/api/consultas-especiais`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }

      if (resp.ok) {
        const savedData = await resp.json();
        setSaveSuccessMessage(`Consulta "${queryTitle}" persistida com sucesso!`);
        setSelectedQueryId(savedData.id);
        fetchCatalog();
        setTimeout(() => setShowSaveModal(false), 2000);
      } else {
        const errData = await resp.json();
        setSaveErrorMessage(errData.error || "Houve erro ao processar persistência no servidor.");
      }
    } catch (err: any) {
      setSaveErrorMessage(`Falha na conexão: ${err.message || err}`);
    } finally {
      setIsSaving(false);
    }
  };

  // Visual builder helper: append custom filters
  const addFilterRow = () => {
    const defaultCol = AVAILABLE_TABLES.find(t => t.name === selectedTable)?.columns[0] || "";
    setBuilderFilters([...builderFilters, {
      tabela: selectedTable,
      coluna: defaultCol,
      operador: "=",
      valor: ""
    }]);
  };

  // Visual builder helper: remove filter row
  const removeFilterRow = (index: number) => {
    const updated = [...builderFilters];
    updated.splice(index, 1);
    setBuilderFilters(updated);
  };

  // Visual builder helper: modify dynamic filter row
  const updateFilterRow = (index: number, fields: Partial<FiltroVisual>) => {
    const updated = [...builderFilters];
    updated[index] = { ...updated[index], ...fields };
    setBuilderFilters(updated);
  };

  // Visual builder helper: columns checkboxes
  const toggleColumnSelection = (col: string) => {
    if (selectedColumns.includes(col)) {
      setSelectedColumns(selectedColumns.filter(c => c !== col));
    } else {
      setSelectedColumns([...selectedColumns, col]);
    }
  };

  // Utility to export table results to CSV
  const handleExportToCSV = () => {
    if (!executionResult?.dados || executionResult.dados.length === 0) return;
    const data = executionResult.dados;
    const headers = Object.keys(data[0]);
    const csvRows = data.map((row: any) => 
      headers.map(fieldName => {
        const val = row[fieldName];
        const stringVal = val === null || val === undefined ? "" : String(val);
        // Escape quotes
        const escaped = stringVal.replace(/"/g, '""');
        if (escaped.includes(",") || escaped.includes('"') || escaped.includes("\n")) {
          return `"${escaped}"`;
        }
        return escaped;
      }).join(",")
    );

    // Prefix \uFEFF for proper UTF-8 BOM representation in Excel Portuguese locales
    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" + [headers.join(","), ...csvRows].join("\n");
    const encodedUri = encodeURI(csvContent);
    const downloadLink = document.createElement("a");
    downloadLink.setAttribute("href", encodedUri);
    downloadLink.setAttribute("download", `consulta_audit_${selectedQueryId || "adhoc"}_${Date.now()}.csv`);
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
  };

  // Filter client side rows based on search
  const columnsOfResult = executionResult && executionResult.dados.length > 0 
    ? Object.keys(executionResult.dados[0]) 
    : [];

  const filteredRows = executionResult?.dados 
    ? executionResult.dados.filter((row: any) => {
        if (!resultsFilter) return true;
        const normFilter = resultsFilter.toLowerCase();
        return columnsOfResult.some(col => {
          const val = row[col];
          return val !== null && val !== undefined && String(val).toLowerCase().includes(normFilter);
        });
      })
    : [];

  const totalPages = Math.ceil(filteredRows.length / rowsPerPage);
  const currentRowsData = filteredRows.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage);

  return (
    <div className="space-y-6">
      {/* Upper header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white border border-outline-variant p-6 rounded-sm shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-sm bg-[#1B365D]/5 text-[#1B365D] flex items-center justify-center">
              <Database size={22} className="stroke-[2]" />
            </div>
            <div>
              <h1 className="text-xl font-black text-[#1B365D] uppercase tracking-wide">Consultas Especiais SQL</h1>
              <p className="text-xs text-secondary font-medium">Buscador fiscal estruturado e compilador de queries na base auditada</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setShowAuditLogs(!showAuditLogs);
              if (!showAuditLogs) fetchAuditLogs();
            }}
            className={`px-4 py-2.5 rounded-sm border border-outline-variant text-xs font-black uppercase tracking-wide flex items-center gap-2 transition-colors ${
              showAuditLogs ? "bg-secondary text-white" : "bg-white text-secondary hover:bg-surface-container"
            }`}
          >
            <History size={16} />
            {showAuditLogs ? "Voltar ao Editor" : "Histórico de Auditoria"}
          </button>

          <button
            onClick={initNewQueryWorkspace}
            className="px-4 py-2.5 bg-[#1B365D]/5 text-[#1B365D] hover:bg-[#1B365D]/10 rounded-sm text-xs font-black uppercase tracking-wide flex items-center gap-2 transition-colors"
          >
            <Plus size={16} />
            Nova Consulta
          </button>
        </div>
      </div>

      {showAuditLogs ? (
        /* History logs dashboard */
        <div className="bg-white border border-outline-variant rounded-sm p-6 shadow-sm space-y-4">
          <div className="flex justify-between items-center pb-3 border-b border-light">
            <div className="flex items-center gap-2">
              <Terminal size={18} className="text-secondary" />
              <h2 className="text-sm font-black text-[#1B365D] uppercase tracking-wider">Histórico Geral de Auditoria de Queries</h2>
            </div>
            <button
              onClick={fetchAuditLogs}
              className="text-xs text-secondary font-bold hover:underline grayscale-50"
            >
              Atualizar Logs
            </button>
          </div>

          {isLoadingAudit ? (
            <div className="py-20 flex justify-center items-center">
              <div className="animate-spin text-[#1B365D] rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          ) : auditLogs.length === 0 ? (
            <div className="py-12 bg-surface-container-low rounded-sm text-center text-xs text-secondary">
              Nenhuma query executada ainda neste container.
            </div>
          ) : (
            <div className="overflow-x-auto border border-outline-variant rounded-sm">
              <table className="w-full text-xs text-left">
                <thead className="bg-[#1B365D]/5 text-secondary font-black border-b border-outline-variant uppercase text-[10px] tracking-wider">
                  <tr>
                    <th className="p-4">Timestamp</th>
                    <th className="p-4">Consulta / SQL</th>
                    <th className="p-4">Registros</th>
                    <th className="p-4">Duração</th>
                    <th className="p-4">Status</th>
                    <th className="p-4">Auditoria</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant font-mono">
                  {auditLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-surface-container-low transition-colors">
                      <td className="p-4 whitespace-nowrap text-secondary text-[11px]">
                        {new Date(log.createdAt).toLocaleString("pt-BR")}
                      </td>
                      <td className="p-4 max-w-sm">
                        <div className="font-bold text-[#1B365D] truncate">
                          {log.consulta?.titulo || "Query Ad-hoc Direta"}
                        </div>
                        <div className="text-[10px] text-secondary truncate mt-0.5 max-w-[340px]" title={log.sqlExecutado}>
                          {log.sqlExecutado}
                        </div>
                      </td>
                      <td className="p-4 font-bold">{log.totalLinhas} rows</td>
                      <td className="p-4 text-secondary">{log.duracaoMs}ms</td>
                      <td className="p-4">
                        <span className={`inline-flex px-2 py-0.5 rounded text-[10px] uppercase font-black tracking-wide ${
                          log.status === "sucesso" ? "bg-emerald-50 text-emerald-700 border border-emerald-200" :
                          log.status === "bloqueado" ? "bg-amber-50 text-amber-700 border border-amber-200" :
                          "bg-rose-50 text-rose-700 border border-rose-200"
                        }`}>
                          {log.status}
                        </span>
                      </td>
                      <td className="p-4 text-[10px] text-secondary">
                        UID: {log.executadoPor?.slice(-8) || "N/D"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : (
        /* Core workspace split */
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Query catalog sidebar */}
          <div className="lg:col-span-1 bg-white border border-outline-variant p-5 rounded-sm shadow-sm flex flex-col h-[calc(100vh-180px)] min-h-[500px]">
            <div className="relative mb-4">
              <Search className="absolute left-3.5 top-3 text-secondary" size={16} />
              <input
                type="text"
                placeholder="Pesquisar consultas..."
                value={catalogSearch}
                onChange={(e) => setCatalogSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 rounded-sm text-xs bg-surface-container-low placeholder-secondary border border-outline-variant focus:outline-none focus:border-secondary transition-colors"
                id="search-queries"
              />
            </div>

            <div className="flex-1 overflow-y-auto space-y-4">
              {/* Starred Queries */}
              <div>
                <h3 className="text-[10px] font-black text-secondary uppercase tracking-[0.1em] mb-2 px-1">Favoritas ⭐</h3>
                <div className="space-y-1">
                  {isLoadingCatalog ? (
                    <div className="p-3 text-[11px] text-secondary">Carregando catálogo...</div>
                  ) : catalogQueries.filter(q => q.favorito).length === 0 ? (
                    <div className="p-3 bg-surface-container-low rounded-sm text-[11px] text-secondary text-center leading-relaxed">
                      Nenhuma consulta favoritada. Clique na estrela ao lado de uma consulta para fixá-la aqui.
                    </div>
                  ) : (
                    catalogQueries.filter(q => q.favorito).map((q) => (
                      <div 
                        key={q.id}
                        onClick={() => loadQueryToWorkspace(q)}
                        className={`group flex items-center justify-between p-3 rounded-sm cursor-pointer text-left transition-all ${
                          selectedQueryId === q.id 
                            ? "bg-[#1B365D] text-white" 
                            : "bg-surface-container-low hover:bg-surface-container hover:text-primary text-secondary"
                        }`}
                      >
                        <div className="truncate flex-1 min-w-0 pr-1">
                          <h4 className="text-xs font-bold truncate">{q.titulo}</h4>
                          <span className={`text-[9px] uppercase font-bold tracking-wide mt-0.5 inline-block ${
                            selectedQueryId === q.id ? "text-blue-100" : "text-blue-600"
                          }`}>
                            {q.tipo === "visual" ? "Visual Mod" : "SQL Livre"}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100">
                          <button
                            onClick={(e) => handleToggleFavorite(q, e)}
                            className="p-1 hover:bg-black/10 rounded"
                            title="Desfavoritar"
                          >
                            <Star size={13} fill="#EAB308" className="text-amber-500" />
                          </button>
                          <button
                            onClick={(e) => handleDeleteQuery(q.id, e)}
                            className="p-1 hover:bg-black/10 rounded text-error"
                            title="Remover"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Standard Queries */}
              <div>
                <h3 className="text-[10px] font-black text-secondary uppercase tracking-[0.1em] mb-2 px-1">Recentes e Salvas</h3>
                <div className="space-y-1">
                  {isLoadingCatalog ? null : catalogQueries.filter(q => !q.favorito).length === 0 ? (
                    <div className="p-3 bg-surface-container-low rounded-sm text-[11px] text-secondary text-center">
                      Nenhuma consulta disponível.
                    </div>
                  ) : (
                    catalogQueries.filter(q => !q.favorito).map((q) => (
                      <div 
                        key={q.id}
                        onClick={() => loadQueryToWorkspace(q)}
                        className={`group flex items-center justify-between p-3 rounded-sm cursor-pointer text-left transition-all ${
                          selectedQueryId === q.id 
                            ? "bg-[#1B365D] text-white" 
                            : "bg-surface-container-low hover:bg-surface-container text-secondary hover:text-primary"
                        }`}
                      >
                        <div className="truncate flex-1 min-w-0 pr-1">
                          <h4 className="text-xs font-bold truncate">{q.titulo}</h4>
                          <span className="text-[9px] uppercase font-bold text-secondary tracking-wide mt-0.5 inline-block">
                            {q.tipo === "visual" ? "Visual Builder" : "SQL Livre"}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={(e) => handleToggleFavorite(q, e)}
                            className="p-1 hover:bg-black/10 rounded"
                            title="Favoritar"
                          >
                            <Star size={13} className="text-secondary" />
                          </button>
                          <button
                            onClick={(e) => handleDeleteQuery(q.id, e)}
                            className="p-1 hover:bg-black/10 rounded text-error"
                            title="Remover"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Quick helper info */}
            <div className="mt-4 p-3 bg-surface-container-low border border-outline-variant/30 rounded-sm text-[11px] text-secondary leading-normal">
              <p className="font-bold flex items-center gap-1 text-primary mb-1">
                <ShieldCheck size={11} /> Auditoria Ativa
              </p>
              Qualquer comando executado passa por filtros de sanitização contra DDL destrutivo.
            </div>
          </div>

          {/* Editor + Results Workspaces */}
          <div className="lg:col-span-3 space-y-6">
            {/* Editor Workspace tab wrapper */}
            <div className="bg-white border border-outline-variant rounded-sm shadow-sm p-6 space-y-4">
              {/* Workspace mode toolbar */}
              <div className="flex justify-between items-center bg-surface-container-low p-2 rounded-sm">
                <div className="flex gap-1.5">
                  <button
                    onClick={() => setActiveWorkspaceTab("editor")}
                    className={`px-4 py-2 rounded-sm text-xs font-black uppercase tracking-wide flex items-center gap-2 transition-all ${
                      activeWorkspaceTab === "editor" 
                        ? "bg-white text-[#1B365D] shadow-sm" 
                        : "text-secondary hover:bg-white/50"
                    }`}
                  >
                    <Terminal size={14} />
                    Editor SQL Livre
                  </button>
                  <button
                    onClick={() => setActiveWorkspaceTab("builder")}
                    className={`px-4 py-2 rounded-sm text-xs font-black uppercase tracking-wide flex items-center gap-2 transition-all ${
                      activeWorkspaceTab === "builder" 
                        ? "bg-white text-[#1B365D] shadow-sm" 
                        : "text-secondary hover:bg-white/50"
                    }`}
                  >
                    <Layers size={14} />
                    Builder Visual
                  </button>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => setShowSaveModal(true)}
                    className="px-4 py-2 bg-white hover:bg-surface-container border border-outline-variant text-[11px] font-black uppercase tracking-wide rounded-sm text-secondary flex items-center gap-2 transition-colors"
                  >
                    <Save size={13} />
                    {selectedQueryId ? "Atualizar" : "Salvar Como"}
                  </button>
                  
                  <button
                    onClick={handleExecuteSql}
                    disabled={isExecuting || !sqlInput.trim()}
                    className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-300 text-white text-[11px] font-black uppercase tracking-wide rounded-sm flex items-center gap-2 transition-colors cursor-pointer"
                  >
                    {isExecuting ? (
                      <div className="animate-spin text-white rounded-full h-3 w-3 border-b-2 border-white" />
                    ) : (
                      <Play size={13} fill="currentColor" />
                    )}
                    Executar SQL
                  </button>
                </div>
              </div>

              {activeWorkspaceTab === "editor" ? (
                /* Freeform Textarea Code Editor Split with Quick Snippets side rail */
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="md:col-span-3 space-y-3">
                    {/* Alerta de comando modificador/destrutivo */}
                    {/^\s*(DROP|TRUNCATE|DELETE|UPDATE|INSERT|ALTER|CREATE)/i.test(sqlInput) && (
                      <div className="p-3 bg-amber-50 border border-amber-200 text-amber-800 text-xs rounded-sm font-bold flex items-start gap-2 shadow-sm animate-fade-in">
                        <AlertCircle size={16} className="shrink-0 mt-0.5" />
                        <span>⚠️ Este comando modifica dados. Certifique-se antes de executar.</span>
                      </div>
                    )}
                    <div className="relative border border-outline-variant rounded-sm overflow-hidden font-mono text-sm leading-relaxed">
                      {/* Editor top header */}
                      <div className="bg-surface-container-low px-4 py-2 border-b border-outline-variant text-[10px] text-secondary font-black tracking-wider uppercase flex justify-between">
                        <span>Terminal Buffer (Sessão com Controle de Auditoria)</span>
                        <span>SQL Mode</span>
                      </div>
                      <textarea
                        value={sqlInput}
                        onChange={(e) => setSqlInput(e.target.value)}
                        rows={10}
                        spellCheck="false"
                        className="w-full p-4 focus:outline-none bg-[#FAFAFA] font-mono text-xs text-secondary leading-normal"
                        placeholder="SELECT * FROM table ..."
                        id="sql-textarea"
                      />
                    </div>
                  </div>

                  {/* Standard Snippets helper rail */}
                  <div className="md:col-span-1 space-y-2 border-l border-light pl-4">
                    <h3 className="text-[10px] font-black text-secondary uppercase tracking-[0.15em]">Snippets Rápidos</h3>
                    <div className="space-y-2">
                      {SQL_SNIPPETS.map((snip, index) => (
                        <div
                          key={index}
                          onClick={() => setSqlInput(snip.sql)}
                          className="p-2 border border-outline-variant/60 rounded-sm hover:border-secondary hover:bg-surface-container-low cursor-pointer transition-colors"
                        >
                          <h4 className="text-[10px] font-black text-[#1B365D] uppercase mt-0.5">{snip.label}</h4>
                          <p className="text-[9px] text-secondary font-mono truncate mt-1">
                            {snip.sql.replace(/\n/g, " ")}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                /* Builder Visual Form Panel */
                <div className="space-y-5 bg-[#FAFAFA] border border-outline-variant rounded-sm p-5 text-left">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Table Select Column */}
                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase text-secondary tracking-wide">1. Selecionar Tabela Alvo</label>
                      <select
                        value={selectedTable}
                        onChange={(e) => handleTableChange(e.target.value)}
                        className="w-full px-3 py-2 rounded-sm text-xs bg-white border border-outline-variant focus:outline-none focus:border-secondary"
                        id="builder-table-select"
                      >
                        {AVAILABLE_TABLES.map(t => (
                          <option key={t.name} value={t.name}>{t.label}</option>
                        ))}
                      </select>
                    </div>

                    {/* Sorting column select */}
                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase text-secondary tracking-wide">3. Ordenar Resultado Por</label>
                      <div className="flex gap-2">
                        <select
                          value={builderSortCol}
                          onChange={(e) => setBuilderSortCol(e.target.value)}
                          className="flex-1 px-3 py-2 rounded-sm text-xs bg-white border border-outline-variant focus:outline-none focus:border-secondary"
                          id="builder-sort-select"
                        >
                          <option value="">Sem Ordenação específica</option>
                          {AVAILABLE_TABLES.find(t => t.name === selectedTable)?.columns.map(c => (
                            <option key={c} value={c}>{c}</option>
                          ))}
                        </select>
                        {builderSortCol && (
                          <select
                            value={builderSortDir}
                            onChange={(e) => setBuilderSortDir(e.target.value as any)}
                            className="px-3 py-2 rounded-sm text-xs bg-white border border-outline-variant focus:outline-none"
                          >
                            <option value="ASC">ASC</option>
                            <option value="DESC">DESC</option>
                          </select>
                        )}
                      </div>
                    </div>

                    {/* Limit Rows setup */}
                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase text-secondary tracking-wide">4. Limitar Linhas Retornadas</label>
                      <input
                        type="number"
                        min={1}
                        max={2000}
                        value={builderLimit}
                        onChange={(e) => setBuilderLimit(Number(e.target.value))}
                        className="w-full px-3 py-2 rounded-sm text-xs bg-white border border-outline-variant focus:outline-none"
                        id="builder-limit-input"
                      />
                    </div>
                  </div>

                  {/* Columns Selection Checkboxes */}
                  <div className="space-y-1.5 border-t border-outline-variant pt-4">
                    <label className="text-[10px] font-black uppercase text-secondary tracking-wide">2. Colunas Filtradas no Retorno (Se vazio, retorna todas *)</label>
                    <div className="flex flex-wrap gap-2 py-1">
                      {AVAILABLE_TABLES.find(t => t.name === selectedTable)?.columns.map(col => {
                        const isChecked = selectedColumns.includes(col);
                        return (
                          <button
                            key={col}
                            onClick={() => toggleColumnSelection(col)}
                            className={`px-3 py-1 rounded-full text-[10px] font-mono border transition-all ${
                              isChecked 
                                ? "bg-[#1B365D] text-white border-transparent" 
                                : "bg-white hover:bg-surface-container text-secondary border-outline-variant"
                            }`}
                          >
                            {col}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Conditions List panel */}
                  <div className="space-y-3 border-t border-outline-variant pt-4">
                    <div className="flex justify-between items-center">
                      <label className="text-[10px] font-black uppercase text-secondary tracking-wide">Filtros e Parâmetros de Seleção (Cláusula WHERE)</label>
                      <button
                        onClick={addFilterRow}
                        className="px-3 py-1 bg-[#1B365D]/5 hover:bg-[#1B365D]/10 text-[#1B365D] text-[10px] font-black uppercase tracking-wide rounded-sm flex items-center gap-1 transition-colors"
                      >
                        <Plus size={12} />
                        Adicionar Condição
                      </button>
                    </div>

                    {builderFilters.length === 0 ? (
                      <div className="p-4 bg-white rounded-sm text-xs text-secondary text-center border border-outline-variant/60 leading-normal">
                        Nenhum critério de pesquisa ativo no momento. Todos os dados da tabela serão listados (adequado para exportação direta ou análise ampla).
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {builderFilters.map((filtro, index) => (
                          <div key={index} className="flex gap-2 items-center bg-white p-2 rounded-sm border border-outline-variant">
                            {/* Column select */}
                            <select
                              value={filtro.coluna}
                              onChange={(e) => updateFilterRow(index, { coluna: e.target.value })}
                              className="px-3 py-1.5 rounded-sm text-xs border border-outline-variant max-w-[200px]"
                            >
                              {AVAILABLE_TABLES.find(t => t.name === selectedTable)?.columns.map(c => (
                                <option key={c} value={c}>{c}</option>
                              ))}
                            </select>

                            {/* Operator select */}
                            <select
                              value={filtro.operador}
                              onChange={(e) => updateFilterRow(index, { operador: e.target.value as Operador })}
                              className="px-2 py-1.5 rounded-sm text-xs border border-outline-variant font-mono"
                            >
                              <option value="=">=</option>
                              <option value="!=">!=</option>
                              <option value=">">&gt;</option>
                              <option value=">=">&gt;=</option>
                              <option value="<">&lt;</option>
                              <option value="<=">&lt;=</option>
                              <option value="LIKE">LIKE (Contém)</option>
                              <option value="ILIKE">ILIKE (Contém ignorando caixa)</option>
                              <option value="IS NULL">NULO (Sem valor)</option>
                              <option value="IS NOT NULL">NÃO NULO (Preenchido)</option>
                              <option value="IN">IN (Lista separada por vírgula)</option>
                              <option value="BETWEEN">Intervalo (De...Até)</option>
                            </select>

                            {/* Value input (hidden if IS NULL) */}
                            {filtro.operador !== "IS NULL" && filtro.operador !== "IS NOT NULL" && (
                              <input
                                type="text"
                                value={Array.isArray(filtro.valor) ? filtro.valor.join(",") : filtro.valor || ""}
                                onChange={(e) => updateFilterRow(index, { 
                                  valor: filtro.operador === "IN" 
                                    ? e.target.value.split(",") 
                                    : filtro.operador === "BETWEEN" 
                                      ? e.target.value.split(",")
                                      : e.target.value 
                                })}
                                placeholder={
                                  filtro.operador === "IN" ? "valor1,valor2,valor3" :
                                  filtro.operador === "BETWEEN" ? "dataDe,dataAte" :
                                  "Digitar valor..."
                                }
                                className="flex-1 px-3 py-1.5 rounded-lg text-xs border border-outline-variant"
                              />
                            )}

                            {/* Delete button */}
                            <button
                              onClick={() => removeFilterRow(index)}
                              className="p-1.5 text-secondary hover:text-error hover:bg-surface-container rounded-lg"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Error panel presentation */}
            {executionError && (
              <div className="bg-rose-50 border border-rose-200 text-rose-700 p-5 rounded-sm text-xs flex gap-3 text-left">
                <AlertCircle size={18} className="shrink-0 mt-0.5 text-rose-600" />
                <div className="space-y-1">
                  <h4 className="font-black uppercase tracking-wide">Falha na Compilação ou Execução</h4>
                  <p className="font-mono leading-relaxed">{executionError}</p>
                </div>
              </div>
            )}

            {/* Execution results grid representation */}
            <div className="bg-white border border-outline-variant rounded-sm p-6 shadow-sm min-h-[300px]">
              {isExecuting ? (
                /* Query loading indicator */
                <div className="py-20 flex flex-col justify-center items-center gap-4">
                  <div className="animate-spin text-[#1B365D] rounded-full h-10 w-10 border-b-2 border-primary" />
                  <span className="text-[10px] font-black text-secondary tracking-widest uppercase">Executando instrução no banco...</span>
                </div>
              ) : !executionResult ? (
                /* Empty state instructions card */
                <div className="py-16 text-center text-secondary max-w-sm mx-auto space-y-4">
                  <div className="mx-auto w-12 h-12 bg-surface-container-low text-[#1B365D]/70 rounded-full flex items-center justify-center">
                    <Database size={24} />
                  </div>
                  <div className="space-y-1.5">
                    <h3 className="text-sm font-black text-[#1B365D] uppercase tracking-wider">Aguardando Execução</h3>
                    <p className="text-xs leading-relaxed text-secondary/80">Configure o Builder Visual ou redija seu script SELECT na área acima e acione o botão para consultar logs e registros históricos.</p>
                  </div>
                </div>
              ) : (
                /* Populated results pane */
                <div className="space-y-5 text-left flex-1">
                  {/* Results diagnostics header */}
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-[#FAF9FC] p-4 rounded-sm border border-light gap-4">
                    <div className="flex flex-wrap items-center gap-4 text-xs font-bold text-secondary">
                      <span className="flex items-center gap-1.5 text-[#1B365D]">
                        <CheckCircle2 size={15} className="text-emerald-500" /> 
                        Status: <strong className="uppercase">Sucesso</strong>
                      </span>
                      <span className="flex items-center gap-1.5 border-l border-light pl-4">
                        <Clock size={15} /> 
                        Tempo: <strong>{executionResult.duracaoMs} ms</strong>
                      </span>
                      <span className="flex items-center gap-1.5 border-l border-light pl-4">
                        <Layers size={15} /> 
                        Lidos: <strong>{executionResult.totalLinhas} linhas</strong>
                      </span>
                      {executionResult.truncado && (
                        <span className="inline-flex px-2 py-0.5 rounded text-[10px] uppercase font-black bg-amber-50 text-amber-700 border border-amber-200 ml-2 animate-pulse">
                          Resultados truncados (Exibe as primeiras 2000 linhas)
                        </span>
                      )}
                    </div>

                    <div className="flex gap-2 w-full md:w-auto">
                      {/* Search across result set rows */}
                      <div className="relative flex-1 md:w-48 lg:w-64">
                        <Search className="absolute left-3 top-2.5 text-secondary" size={13} />
                        <input
                          type="text"
                          placeholder="Filtrar resultados..."
                          value={resultsFilter}
                          onChange={(e) => {
                            setResultsFilter(e.target.value);
                            setCurrentPage(1);
                          }}
                          className="w-full pl-8 pr-4 py-1.5 rounded-sm text-xs bg-white border border-outline-variant font-medium placeholder-secondary focus:outline-none"
                          id="results-filter"
                        />
                      </div>

                      <button
                        onClick={handleExportToCSV}
                        className="px-4 py-2 bg-secondary text-white hover:bg-secondary/90 text-[11px] font-black uppercase tracking-wide rounded-sm flex items-center gap-1.5 transition-colors"
                      >
                        <Download size={13} />
                        Exportar CSV
                      </button>
                    </div>
                  </div>

                  {executionResult.dados.length === 0 ? (
                    <div className="py-12 bg-[#FAFAFA] border border-outline-variant/60 rounded-sm text-center text-xs text-secondary">
                      Nenhum registro encontrado para os critérios estipulados na consulta.
                    </div>
                  ) : (
                    /* Dynamic data grid table */
                    <div className="space-y-4">
                      <div className="overflow-x-auto border border-outline-variant rounded-sm">
                        <table className="w-full text-xs text-left">
                          <thead className="bg-[#1B365D]/5 text-secondary font-black border-b border-light uppercase text-[10px] tracking-wider">
                            <tr>
                              {columnsOfResult.map(col => (
                                <th key={col} className="p-3.5 whitespace-nowrap">{col}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-light font-mono font-medium">
                            {currentRowsData.map((row: any, rIdx: number) => (
                              <tr key={rIdx} className="hover:bg-[#FAF9FC] transition-colors">
                                {columnsOfResult.map(col => {
                                  const val = row[col];
                                  let printedVal = "";
                                  if (val === null || val === undefined) {
                                    printedVal = "NULL";
                                  } else if (typeof val === "object") {
                                    printedVal = JSON.stringify(val);
                                  } else {
                                    printedVal = String(val);
                                  }
                                  return (
                                    <td key={col} className={`p-3 text-[11px] max-w-[280px] truncate ${
                                      val === null ? "text-secondary/40 italic" : "text-secondary"
                                    }`} title={printedVal}>
                                      {printedVal}
                                    </td>
                                  );
                                })}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      {/* Front-end table pagination controls */}
                      {totalPages > 1 && (
                        <div className="flex justify-between items-center text-xs text-secondary pt-2 px-1">
                          <span>
                            Exibindo de <strong>{((currentPage - 1) * rowsPerPage) + 1}</strong> a <strong>{Math.min(currentPage * rowsPerPage, filteredRows.length)}</strong> de <strong>{filteredRows.length}</strong> registros filtrados
                          </span>
                          
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                              disabled={currentPage === 1}
                              className="p-1.5 rounded-sm border border-outline-variant text-secondary hover:bg-[#FAF9FC] disabled:opacity-40"
                            >
                              <ChevronLeft size={16} />
                            </button>
                            <span className="font-semibold text-primary px-2">
                              Página {currentPage} de {totalPages}
                            </span>
                            <button
                              onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                              disabled={currentPage === totalPages}
                              className="p-1.5 rounded-sm border border-outline-variant text-secondary hover:bg-[#FAF9FC] disabled:opacity-40"
                            >
                              <ChevronRight size={16} />
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Save query details overlay Modal Dialog */}
      {showSaveModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-outline-variant rounded-sm p-6 max-w-md w-full shadow-2xl relative text-left space-y-4 animate-in fade-in zoom-in duration-200">
            <button
              onClick={() => setShowSaveModal(false)}
              className="absolute right-4 top-4 text-secondary hover:text-primary"
            >
              <X size={18} />
            </button>

            <h2 className="text-sm font-black uppercase text-[#1B365D] tracking-wider border-b border-light pb-2">
              {selectedQueryId ? "Editar Metadados da Consulta" : "Persistir Nova Consulta Especial"}
            </h2>

            <form onSubmit={handleSaveQuerySubmit} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-secondary tracking-wide">Título da Consulta</label>
                <input
                  type="text"
                  required
                  value={queryTitle}
                  onChange={(e) => setQueryTitle(e.target.value)}
                  placeholder="Ex: Auditoria de Base de Cálculo de IRRF"
                  className="w-full px-3.5 py-2.5 rounded-sm text-xs bg-surface-container-low border border-outline-variant focus:outline-none"
                  id="query-title-input"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-secondary tracking-wide">Descrição (Finalidade da Consulta)</label>
                <textarea
                  value={queryDesc}
                  onChange={(e) => setQueryDesc(e.target.value)}
                  placeholder="Ex: Relatório para reconciliação anual de valores eSocial vs REINF."
                  rows={3}
                  className="w-full px-3.5 py-2.5 rounded-sm text-xs bg-surface-container-low border border-outline-variant focus:outline-none"
                  id="query-desc-input"
                />
              </div>

              {saveSuccessMessage && (
                <div className="p-3 bg-emerald-50 text-emerald-700 text-xs rounded-sm border border-emerald-200">
                  <Check className="text-emerald-500 shrink-0" size={14} />
                  {saveSuccessMessage}
                </div>
              )}

              {saveErrorMessage && (
                <div className="p-3 bg-rose-50 text-rose-700 text-xs rounded-sm border border-rose-200">
                  <AlertCircle className="text-rose-500 shrink-0" size={14} />
                  {saveErrorMessage}
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowSaveModal(false)}
                  className="px-4 py-2 hover:bg-surface-container text-xs font-black uppercase tracking-wide rounded-sm text-secondary"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSaving || !queryTitle}
                  className="px-5 py-2 bg-[#1B365D] hover:bg-[#152a4a] text-white text-xs font-black uppercase tracking-wide rounded-sm flex items-center gap-1.5 cursor-pointer"
                  id="save-query-btn"
                >
                  {isSaving ? "Persistindo..." : "Salvar Consulta"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

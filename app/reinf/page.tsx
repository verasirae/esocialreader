"use client";

import React, { useState, useEffect } from "react";
import { 
  Building2, 
  Search, 
  Table, 
  History, 
  AlertTriangle, 
  ShieldCheck, 
  Plus, 
  CheckCircle2, 
  Info, 
  Loader2, 
  ChevronDown, 
  ChevronUp, 
  FileCode2, 
  Check, 
  RefreshCw, 
  X,
  CloudUpload,
  Mail,
  Phone,
  HelpCircle
} from "lucide-react";
import LoadingSpinner from "@/components/LoadingSpinner";
import { cn, safeJsonFetch } from "@/lib/utils";

interface Prestador {
  id: string;
  empresaId: string;
  cnpj: string;
  cnpjRaiz: string;
  razaoSocial: string;
  nomeFantasia?: string;
  tipoServico?: string;
  codigoServico?: string;
  email?: string;
  telefone?: string;
  ativo: boolean;
  createdAt: string;
}

interface ReinfEvento {
  id: string;
  idEvento: string;
  tpEvento: string;
  perApur: string;
  nrProtEntr?: string;
  nrRecArqBase?: string;
  dhRecepcao?: string;
  dhProcess?: string;
  cnpjRaiz?: string;
  status: string;
  processadoEm?: string;
  r2099?: {
    indExistInfo?: number;
    identEscritDCTF?: string;
    retencoesTomador: Array<{
      id: string;
      cnpjPrestador: string;
      vlrTotalBaseRet: string;
      prestador?: Prestador;
      codigosReceita: Array<{
        id: string;
        crTom: string;
        vlrCRTom: string;
        vlrCRTomSusp: string;
      }>;
    }>;
  };
  r4020?: {
    cnpjEstab: string;
    registros: Array<{
      id: string;
      cnpjBenef: string;
      prestador?: Prestador;
      retencoescrMen: Array<{
        id: string;
        crMen: string;
        vlrBaseCRMen: string;
        vlrCRMenInf: string;
        natRend?: string;
        vlrCRMenSusp: string;
      }>;
    }>;
  };
  divergencias: Array<{
    id: string;
    tipo: string;
    descricao: string;
    severidade: string;
    resolvido: boolean;
  }>;
}

interface Divergencia {
  id: string;
  tipo: string;
  descricao: string;
  severidade: string;
  resolvido: boolean;
  createdAt: string;
  evento?: {
    idEvento: string;
    tpEvento: string;
    perApur: string;
    empresa?: {
      razaoSocial: string;
    };
  };
}

interface Empresa {
  id: string;
  cnpjRaiz: string;
  cnpjCompleto?: string;
  razaoSocial?: string;
  nomeFantasia?: string;
}

export default function ReinfPage() {
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [selectedEmpresaId, setSelectedEmpresaId] = useState<string>("");
  const [activeTab, setActiveTab] = useState<string>("prestadores");
  
  // Data States
  const [prestadores, setPrestadores] = useState<Prestador[]>([]);
  const [eventos, setEventos] = useState<ReinfEvento[]>([]);
  const [divergencias, setDivergencias] = useState<Divergencia[]>([]);
  
  // Loading & UI control
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isLoadingData, setIsLoadingData] = useState<boolean>(false);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  
  // Filter States
  const [searchPrestador, setSearchPrestador] = useState<string>("");
  const [searchEvent, setSearchEvent] = useState<string>("");
  
  // Modal / Add Form State
  const [isFormOpen, setIsFormOpen] = useState<boolean>(false);
  const [formError, setFormError] = useState<string>("");
  const [formSuccess, setFormSuccess] = useState<string>("");
  const [formData, setFormData] = useState({
    cnpj: "",
    razaoSocial: "",
    nomeFantasia: "",
    tipoServico: "",
    codigoServico: "06", // REINF tbl 06 CSLL/PIS/COFINS por padrão
    email: "",
    telefone: ""
  });

  // Expanded row tracking for events list
  const [expandedEventId, setExpandedEventId] = useState<string | null>(null);

  // Load Companies initially
  useEffect(() => {
    async function loadEmpresas() {
      setIsLoading(true);
      const res = await safeJsonFetch<{ data: Empresa[] }>("/api/esocial/empresas?page=1&take=100");
      if (res && res.data && res.data.length > 0) {
        setEmpresas(res.data);
        setSelectedEmpresaId(res.data[0].id);
      } else {
        setIsLoading(false);
      }
    }
    loadEmpresas();
  }, []);

  // Reload data when active company or active tab changes
  useEffect(() => {
    if (selectedEmpresaId) {
      fetchTabData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedEmpresaId, activeTab]);

  const fetchTabData = async () => {
    setIsLoadingData(true);
    try {
      if (activeTab === "prestadores") {
        const url = `/api/prestadores?empresaId=${selectedEmpresaId}&search=${encodeURIComponent(searchPrestador)}`;
        const res = await safeJsonFetch<{ data: Prestador[] }>(url);
        if (res && res.data) {
          setPrestadores(res.data);
        }
      } else if (activeTab === "import") {
        const url = `/api/reinf/eventos?empresaId=${selectedEmpresaId}&perApur=${encodeURIComponent(searchEvent)}`;
        const res = await safeJsonFetch<{ data: ReinfEvento[] }>(url);
        if (res && res.data) {
          setEventos(res.data);
        }
      } else if (activeTab === "divergencias") {
        const url = `/api/reinf/divergencias?empresaId=${selectedEmpresaId}&resolvido=false`;
        const res = await safeJsonFetch<Divergencia[]>(url);
        if (res) {
          setDivergencias(res);
        }
      }
    } catch (err) {
      console.error("Erro ao buscar dados:", err);
    } finally {
      setIsLoading(false);
      setIsLoadingData(false);
    }
  };

  const handleCreatePrestador = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    setFormSuccess("");

    if (!formData.cnpj || !formData.razaoSocial) {
      setFormError("CNPJ e Razão Social são obrigatórios.");
      return;
    }

    try {
      const resp = await safeJsonFetch<any>("/api/prestadores", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          empresaId: selectedEmpresaId,
          cnpj: formData.cnpj.replace(/\D/g, ""),
          razaoSocial: formData.razaoSocial,
          nomeFantasia: formData.nomeFantasia || undefined,
          tipoServico: formData.tipoServico || undefined,
          codigoServico: formData.codigoServico || undefined,
          email: formData.email || undefined,
          telefone: formData.telefone || undefined
        })
      });

      if (resp && !resp.error) {
        setFormSuccess("Prestador cadastrado com sucesso! Vinculações retroativas processadas.");
        setFormData({
          cnpj: "",
          razaoSocial: "",
          nomeFantasia: "",
          tipoServico: "",
          codigoServico: "06",
          email: "",
          telefone: ""
        });
        setTimeout(() => {
          setIsFormOpen(false);
          setFormSuccess("");
          fetchTabData();
        }, 1500);
      } else {
        setFormError(resp?.error || "Erro ao salvar prestador.");
      }
    } catch (err: any) {
      setFormError("Preenchimento incorreto ou erro de conexão.");
    }
  };

  const uploadFiles = async (files: File[]) => {
    setIsUploading(true);
    setUploadProgress(10);

    const formDataUpload = new FormData();
    files.forEach(file => {
      formDataUpload.append("files", file);
    });
    formDataUpload.append("empresaId", selectedEmpresaId);

    setUploadProgress(40);

    try {
      const res = await safeJsonFetch<any>("/api/reinf/import", {
        method: "POST",
        body: formDataUpload
      });

      setUploadProgress(80);

      if (res && res.success) {
        alert(res.message || "XML REINF importado de forma unificada com sucesso!");
        setUploadProgress(100);
        setTimeout(() => {
          setIsUploading(false);
          setUploadProgress(0);
          fetchTabData();
        }, 1000);
      } else {
        alert(res?.message || "Ocorreram erros na validação do XML.");
        setIsUploading(false);
        setUploadProgress(0);
      }
    } catch (err: any) {
      alert("Falha de conexão com a API de importação.");
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const handleUploadXml = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length) return;
    const files = Array.from(e.target.files);
    await uploadFiles(files);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (!e.dataTransfer.files?.length) return;
    const files = Array.from(e.dataTransfer.files).filter(file => file.name.endsWith(".xml"));
    if (!files.length) {
      alert("Por favor, selecione apenas arquivos com formato XML (.xml).");
      return;
    }
    await uploadFiles(files);
  };

  const handleResolveFromDivergencia = (cnpj: string, razao?: string) => {
    setFormData(prev => ({
      ...prev,
      cnpj: cnpj,
      razaoSocial: razao || ""
    }));
    setIsFormOpen(true);
    setActiveTab("prestadores");
  };

  // Format Helpers
  const formatCNPJ = (val: string) => {
    const clean = val.replace(/\D/g, "");
    if (clean.length <= 14) {
      return clean
        .replace(/^(\d{2})(\d)/, "$1.$2")
        .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
        .replace(/\.(\d{3})(\d)/, ".$1/$2")
        .replace(/(\d{4})(\d)/, "$1-$2");
    }
    return clean;
  };

  const getCompanyDetails = () => {
    return empresas.find(e => e.id === selectedEmpresaId);
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-32 h-[50vh] gap-4">
        <LoadingSpinner size="lg" />
        <p className="text-sm font-bold uppercase tracking-widest text-secondary">Carregando ambiente fiscal...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-lg pb-12">
      {/* HEADER SECTION */}
      <section className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 border border-outline-variant rounded-sm shadow-sm">
        <div className="space-y-1">
          <p className="text-[10px] font-black uppercase tracking-widest text-indigo-600 flex items-center gap-1.5">
            <ShieldCheck size={12} />
            Módulo EFD-REINF & Auditoria Digital
          </p>
          <h1 className="text-2xl font-bold tracking-tight text-on-surface">Escrituração de Serviços Tomados</h1>
          <p className="text-xs text-secondary">
            Processamento de arquivos XML de retorno do evento <code className="bg-surface px-1 font-mono text-indigo-600 rounded">R-2099 / R-4020</code> e governança cadastral de prestadores PJ.
          </p>
        </div>

        {/* Company Selection Dropdown */}
        <div className="flex items-center gap-3 w-full md:w-auto">
          <label className="text-xs font-bold text-secondary uppercase shrink-0">Contribuinte:</label>
          <select 
            className="input-field py-1.5 focus:ring-indigo-500 border-indigo-600/30 font-medium text-xs bg-indigo-50/10 min-w-[240px]"
            value={selectedEmpresaId} 
            onChange={(e) => setSelectedEmpresaId(e.target.value)}
          >
            {empresas.map((emp) => (
              <option key={emp.id} value={emp.id}>
                {emp.razaoSocial} ({emp.cnpjRaiz})
              </option>
            ))}
          </select>
        </div>
      </section>

      {/* TABS CONTROLS */}
      <section className="flex border-b border-outline-variant bg-white px-2 pt-2 rounded-sm shadow-sm">
        <button 
          onClick={() => setActiveTab("prestadores")}
          className={cn(
            "px-6 py-3 text-xs font-bold uppercase tracking-wider transition-all border-b-2",
            activeTab === "prestadores" 
              ? "border-indigo-600 text-indigo-600" 
              : "border-transparent text-secondary hover:text-on-surface"
          )}
        >
          Cadastro de Prestadores
        </button>
        <button 
          onClick={() => setActiveTab("import")}
          className={cn(
            "px-6 py-3 text-xs font-bold uppercase tracking-wider transition-all border-b-2 flex items-center gap-2",
            activeTab === "import" 
              ? "border-indigo-600 text-indigo-600" 
              : "border-transparent text-secondary hover:text-on-surface"
          )}
        >
          Importação XML REINF
        </button>
        <button 
          onClick={() => setActiveTab("divergencias")}
          className={cn(
            "px-6 py-3 text-xs font-bold uppercase tracking-wider transition-all border-b-2 flex items-center gap-2",
            activeTab === "divergencias" 
              ? "border-indigo-600 text-indigo-600" 
              : "border-transparent text-secondary hover:text-on-surface"
          )}
        >
          Auditoria de Inconsistências
          {divergencias.length > 0 && activeTab !== "divergencias" && (
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
          )}
        </button>
      </section>

      {/* CORE WORKSPACE DETAILS */}
      <div className="grid grid-cols-1 gap-md">
        
        {/* PRESTADORES TAB */}
        {activeTab === "prestadores" && (
          <div className="flex flex-col gap-lg">
            
            {/* Action Bar */}
            <div className="flex flex-col md:flex-row justify-between items-center gap-md bg-white p-4 border border-outline-variant rounded-sm">
              <div className="relative w-full md:w-96">
                <Search className="absolute left-3 top-2.5 text-secondary" size={16} />
                <input 
                  type="text" 
                  placeholder="Buscar prestador por CNPJ ou nome..." 
                  className="input-field pl-10 w-full"
                  value={searchPrestador}
                  onChange={(e) => setSearchPrestador(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && fetchTabData()}
                />
              </div>

              <div className="flex items-center gap-2 w-full md:w-auto justify-end">
                <button 
                  className="btn-outline flex items-center gap-2" 
                  onClick={fetchTabData}
                  disabled={isLoadingData}
                >
                  <RefreshCw size={14} className={cn(isLoadingData && "animate-spin")} />
                  <span>Atualizar</span>
                </button>
                <button 
                  className="btn-primary bg-indigo-600 focus:bg-indigo-700 flex items-center gap-2"
                  onClick={() => setIsFormOpen(true)}
                >
                  <Plus size={16} />
                  <span>Novo Prestador</span>
                </button>
              </div>
            </div>

            {/* List results */}
            {isLoadingData ? (
              <div className="flex justify-center items-center p-20 bg-white border border-outline-variant">
                <LoadingSpinner size="sm" className="mr-2" />
                <span className="text-xs font-semibold text-secondary uppercase">Processando base...</span>
              </div>
            ) : prestadores.length === 0 ? (
              <div className="card p-16 flex flex-col items-center justify-center text-center gap-4 bg-white">
                <div className="w-12 h-12 bg-indigo-50 flex items-center justify-center rounded-full text-indigo-500">
                  <Building2 size={24} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-on-surface">Nenhum Prestador Registrado</h3>
                  <p className="text-xs text-secondary mt-1 max-w-md">
                    O relacionamento com fornecedores na REINF necessita do cadastro prévio para reconciliar os CNPJs importados no arquivo R-4020 de pagamentos e R-2099 de fechamento.
                  </p>
                </div>
                <button 
                  onClick={() => setIsFormOpen(true)}
                  className="btn-primary bg-indigo-600 mt-2"
                >
                  Cadastrar Prestador
                </button>
              </div>
            ) : (
              <div className="bg-white border border-outline-variant rounded-sm overflow-hidden shadow-sm">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-surface-container border-b border-outline-variant font-mono text-[9px] text-secondary uppercase tracking-wider">
                      <th className="px-6 py-3">CNPJ</th>
                      <th className="px-6 py-3">Razão Social</th>
                      <th className="px-6 py-3">Nome Fantasia</th>
                      <th className="px-6 py-3">Tipo de Serviço / REINF</th>
                      <th className="px-6 py-3">Status</th>
                      <th className="px-6 py-3 text-right">Cadastrado em</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-outline-variant text-xs">
                    {prestadores.map((prestador) => (
                      <tr key={prestador.id} className="hover:bg-surface/50 transition-colors">
                        <td className="px-6 py-4 font-mono font-bold text-indigo-600">
                          {formatCNPJ(prestador.cnpj)}
                        </td>
                        <td className="px-6 py-4 font-bold text-on-surface">
                          {prestador.razaoSocial}
                        </td>
                        <td className="px-6 py-4 text-secondary">
                          {prestador.nomeFantasia || "—"}
                        </td>
                        <td className="px-6 py-4 text-secondary">
                          <span className="font-semibold text-on-surface">Tbl {prestador.codigoServico || "06"}</span>
                          {prestador.tipoServico && ` - ${prestador.tipoServico}`}
                        </td>
                        <td className="px-6 py-4">
                          <span className={cn(
                            "px-2 py-0.5 rounded text-[10px] font-bold uppercase",
                            prestador.ativo ? "bg-emerald-50 text-emerald-700" : "bg-neutral-100 text-neutral-600"
                          )}>
                            {prestador.ativo ? "Ativo" : "Inativo"}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right text-secondary font-mono">
                          {new Date(prestador.createdAt).toLocaleDateString("pt-BR")}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* REINF XML IMPORT TAB */}
        {activeTab === "import" && (
          <div className="flex flex-col gap-lg">
            
            {/* Dropzone & Processor Engine */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-md">
              
              {/* Uploader Card */}
              <div 
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={cn(
                  "card p-6 bg-white flex flex-col justify-center items-center text-center gap-4 relative group transition-all duration-200 border-2",
                  isDragging ? "border-dashed border-indigo-500 bg-indigo-55/10 scale-[1.01]" : "border-transparent"
                )}
              >
                {isUploading ? (
                  <div className="w-full flex flex-col items-center gap-4 py-8">
                    <LoadingSpinner size="md" />
                    <div className="w-full max-w-[200px]">
                      <div className="flex justify-between items-center text-[10px] font-black uppercase text-secondary mb-1">
                        <span>Carregando XML</span>
                        <span>{uploadProgress}%</span>
                      </div>
                      <div className="w-full bg-surface-container h-1.5 rounded-full overflow-hidden">
                        <div className="bg-indigo-600 h-full transition-all duration-300" style={{ width: `${uploadProgress}%` }} />
                      </div>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="w-12 h-12 bg-indigo-50 text-indigo-600 flex items-center justify-center rounded-full">
                      <CloudUpload size={24} />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-on-surface uppercase tracking-wider">Upload de XML REINF (R-2099 / R-4020)</h4>
                      <p className="text-[10px] text-secondary mt-1">Arraste e solte ou selecione arquivos de pagamentos (R-4020) ou fechamento (R-2099).</p>
                    </div>
                    <button 
                      onClick={() => document.getElementById("reinf-xml-uploader")?.click()}
                      className="btn-primary bg-indigo-600 text-[10px] uppercase font-bold py-1.5"
                    >
                      Selecionar Arquivos
                    </button>
                    <input 
                      id="reinf-xml-uploader" 
                      type="file" 
                      accept=".xml" 
                      multiple 
                      className="hidden" 
                      onChange={handleUploadXml} 
                    />
                  </>
                )}
              </div>

              {/* Informative technical card */}
              <div className="col-span-2 card p-6 bg-indigo-50/20 border border-indigo-100 flex flex-col justify-between">
                <div className="space-y-2">
                  <span className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-indigo-600">
                    <Info size={12} />
                    Funcionamento das Contribuições Previdenciárias e Retenções PJ
                  </span>
                  <p className="text-xs text-secondary leading-relaxed">
                    O REINF centraliza retenções federais. A importação inteligente suporta tanto os eventos analíticos <code className="bg-surface px-1.5 py-0.5 rounded text-indigo-600 font-mono text-[10px]">R-4020 (Pagamentos PJ)</code> contendo as retenções fiscais atômicas (CRMen) por prestador, quanto as totalizações oficiais <code className="bg-surface px-1.5 py-0.5 rounded text-indigo-600 font-mono text-[10px]">R-2099 (Fechamento)</code>.
                  </p>
                </div>
                <div className="flex items-center gap-4 bg-white p-3 rounded-sm border border-indigo-100/50 mt-4">
                  <div className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center text-xs font-bold">
                    <Check size={16} />
                  </div>
                  <p className="text-[10px] text-secondary">
                    <span className="font-bold text-on-surface block">Reconciliação Retroativa Integrada:</span>
                    Se um XML com prestador não cadastrado for importado, uma divergência é aberta. Ao realizar o cadastro do prestador, as pendências são linkadas automaticamente de forma retroativa.
                  </p>
                </div>
              </div>

            </div>

            {/* XML Events List & expandable Details */}
            <div className="bg-white border border-outline-variant rounded-sm shadow-sm overflow-hidden">
              <div className="p-4 bg-surface-container border-b border-outline-variant flex justify-between items-center">
                <h3 className="text-xs font-black uppercase tracking-wider text-secondary">Eventos Base REINF Processados</h3>
                <div className="relative">
                  <Search className="absolute left-2.5 top-1.5 text-secondary" size={14} />
                  <input 
                    type="text" 
                    placeholder="Filtrar por período (ex: 2025-01)..." 
                    className="input-field pl-8 py-1 text-xs w-48"
                    value={searchEvent}
                    onChange={(e) => setSearchEvent(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && fetchTabData()}
                  />
                </div>
              </div>

              {isLoadingData ? (
                <div className="p-20 flex justify-center items-center">
                  <LoadingSpinner size="sm" />
                </div>
              ) : eventos.length === 0 ? (
                <div className="p-16 text-center italic text-xs text-secondary">
                  Nenhum evento catalogado ainda. Realize a importação acima.
                </div>
              ) : (
                <div className="divide-y divide-outline-variant">
                  {eventos.map((evt) => {
                    const isExpanded = expandedEventId === evt.id;
                    const isR4020 = evt.tpEvento === "R-4020";
                    const rtomList = evt.r2099?.retencoesTomador || [];
                    const r4020Registros = evt.r4020?.registros || [];

                    let totalRetidoGroup = 0;
                    if (isR4020) {
                      totalRetidoGroup = r4020Registros.reduce((acc, reg) => {
                        const sumCR = reg.retencoescrMen.reduce((a, b) => a + parseFloat(b.vlrCRMenInf), 0);
                        return acc + sumCR;
                      }, 0);
                    } else {
                      totalRetidoGroup = rtomList.reduce((acc, rtom) => {
                        const sumCR = rtom.codigosReceita.reduce((a, b) => a + parseFloat(b.vlrCRTom), 0);
                        return acc + sumCR;
                      }, 0);
                    }

                    return (
                      <div key={evt.id} className="flex flex-col">
                        <div 
                          className="p-4 flex flex-col md:flex-row justify-between items-stretch md:items-center gap-4 hover:bg-surface/30 cursor-pointer transition-colors"
                          onClick={() => setExpandedEventId(isExpanded ? null : evt.id)}
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 bg-indigo-50 flex items-center justify-center text-indigo-600 rounded">
                              <FileCode2 size={18} />
                            </div>
                            <div className="space-y-0.5">
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-xs bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded">Período: {evt.perApur}</span>
                                <span className="font-mono text-[9px] bg-indigo-100/50 text-indigo-800 px-1.5 py-0.2 rounded font-bold">{evt.tpEvento}</span>
                                <span className="text-[10px] font-mono text-secondary">ID: {evt.idEvento.substring(0, 16)}...</span>
                              </div>
                              <p className="text-[10px] text-secondary">Processado em: {evt.processadoEm ? new Date(evt.processadoEm).toLocaleString("pt-BR") : "—"}</p>
                            </div>
                          </div>

                          <div className="flex items-center gap-6 justify-between md:justify-end">
                            <div className="text-right">
                              <p className="text-[10px] font-bold text-secondary uppercase tracking-tight">Retenção Estimada ({isR4020 ? 'CRMen' : 'CSRF'})</p>
                              <p className="text-sm font-black text-indigo-600">R$ {totalRetidoGroup.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                            </div>
                            
                            <div className="flex items-center gap-2">
                              <span className={cn(
                               "px-2.5 py-0.5 rounded text-[9px] font-bold uppercase",
                                evt.divergencias.length > 0 ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-700"
                              )}>
                                {evt.divergencias.length > 0 ? `${evt.divergencias.length} Inconsistências` : "Conforme"}
                              </span>
                              {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                            </div>
                          </div>
                        </div>

                        {/* Expandable detailed Tomadores panel */}
                        {isExpanded && (
                          <div className="bg-slate-50/50 p-6 border-t border-dotted border-outline-variant">
                            {isR4020 ? (
                              <>
                                <div className="mb-4">
                                  <h4 className="text-[11px] font-black uppercase text-secondary tracking-wider mb-1">
                                    Relação de Beneficiários e Retenções R-4020 ({r4020Registros.length} localizados)
                                  </h4>
                                  <p className="text-[10px] text-secondary">
                                    Detalhamento de retenções na fonte (IRRF / CSRF) por CRMen para cada prestador de serviço PJ. Estabelecimento Tomador: <span className="font-mono font-bold text-on-surface">{formatCNPJ(evt.r4020?.cnpjEstab || "")}</span>
                                  </p>
                                </div>

                                {r4020Registros.length === 0 ? (
                                  <p className="text-xs italic text-secondary">Nenhuma retenção detalhada por beneficiário neste arquivo.</p>
                                ) : (
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {r4020Registros.map((reg) => {
                                      const hasPrestador = !!reg.prestador;

                                      return (
                                        <div key={reg.id} className={cn(
                                          "p-4 bg-white border rounded-sm flex justify-between items-center gap-4 hover:shadow-md transition-shadow",
                                          hasPrestador ? "border-outline-variant" : "border-red-200 bg-red-50/5"
                                        )}>
                                          <div className="space-y-1 w-full">
                                            <div className="flex items-center gap-2">
                                              <span className="font-mono font-bold text-xs text-on-surface">{formatCNPJ(reg.cnpjBenef)}</span>
                                              <span className={cn(
                                                "text-[8px] font-bold px-1.5 py-0.2 rounded uppercase",
                                                hasPrestador ? "bg-emerald-50 text-emerald-800" : "bg-red-50 text-red-600 animate-pulse"
                                              )}>
                                                {hasPrestador ? "Vinculado" : "Pendente"}
                                              </span>
                                            </div>
                                            <p className="text-[11px] font-bold text-on-surface">
                                              {reg.prestador?.razaoSocial || "PRESTADOR NÃO CADASTRADO"}
                                            </p>
                                            <div className="flex flex-col gap-1.5 pt-1.5">
                                              {reg.retencoescrMen.map(cr => (
                                                <div key={cr.id} className="flex flex-wrap items-center gap-2 text-[10px] bg-slate-50 border border-slate-100 p-1.5 rounded">
                                                  <span className="font-mono font-bold text-indigo-600 bg-indigo-50 px-1 py-0.5 rounded">CRMen {cr.crMen}</span>
                                                  {cr.natRend && <span className="text-[9px] bg-neutral-100 text-neutral-600 px-1 rounded">NatRend {cr.natRend}</span>}
                                                  <span className="text-secondary">Base: R$ {parseFloat(cr.vlrBaseCRMen).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
                                                  <span className="font-semibold text-on-surface">Retido: R$ {parseFloat(cr.vlrCRMenInf).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
                                                  {parseFloat(cr.vlrCRMenSusp) > 0 && (
                                                    <span className="text-amber-600 font-mono">Susp: R$ {parseFloat(cr.vlrCRMenSusp).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
                                                  )}
                                                </div>
                                              ))}
                                            </div>
                                          </div>

                                          {!hasPrestador && (
                                            <button 
                                              title="Cadastrar prestador para vincular automaticamente"
                                              className="p-1.5 bg-red-500 hover:bg-red-600 text-white rounded hover:scale-105 active:scale-95 transition-all text-[9.5px] font-bold uppercase shrink-0"
                                              onClick={() => handleResolveFromDivergencia(reg.cnpjBenef)}
                                            >
                                              Cadastrar
                                            </button>
                                          )}
                                        </div>
                                      );
                                    })}
                                  </div>
                                )}
                              </>
                            ) : (
                              <>
                                <div className="mb-4">
                                  <h4 className="text-[11px] font-black uppercase text-secondary tracking-wider mb-1">Relação de Tomadores / Fornecedores ({rtomList.length} localizados)</h4>
                                  <p className="text-[10px] text-secondary">Detalhamento dos recolhimentos de PIS/COFINS/CSLL referentes a este lote.</p>
                                </div>

                                {rtomList.length === 0 ? (
                                  <p className="text-xs italic text-secondary">Nenhuma retenção detalhada por tomador neste arquivo.</p>
                                ) : (
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {rtomList.map((rtom) => {
                                      // Calcular retencao total do tomador específico
                                      const hasPrestador = !!rtom.prestador;

                                      return (
                                        <div key={rtom.id} className={cn(
                                          "p-4 bg-white border rounded-sm flex justify-between items-center gap-4 hover:shadow-md transition-shadow",
                                          hasPrestador ? "border-outline-variant" : "border-red-200 bg-red-50/5"
                                        )}>
                                          <div className="space-y-1">
                                            <div className="flex items-center gap-2">
                                              <span className="font-mono font-bold text-xs text-on-surface">{formatCNPJ(rtom.cnpjPrestador)}</span>
                                              <span className={cn(
                                                "text-[8px] font-bold px-1.5 py-0.2 rounded uppercase",
                                                hasPrestador ? "bg-emerald-50 text-emerald-800" : "bg-red-50 text-red-600 animate-pulse"
                                              )}>
                                                {hasPrestador ? "Vinculado" : "Pendente"}
                                              </span>
                                            </div>
                                            <p className="text-[11px] font-bold text-on-surface">
                                              {rtom.prestador?.razaoSocial || "PRESTADOR NÃO CADASTRADO"}
                                            </p>
                                            <div className="flex gap-4 text-[9px] font-mono text-secondary pt-1">
                                              <span>Base Calc: R$ {parseFloat(rtom.vlrTotalBaseRet).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
                                              {rtom.codigosReceita.map(cr => (
                                                <span key={cr.id} className="bg-indigo-50/30 px-1 py-0.2 rounded">CR {cr.crTom}: R$ {parseFloat(cr.vlrCRTom).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
                                              ))}
                                            </div>
                                          </div>

                                          {!hasPrestador && (
                                            <button 
                                              title="Cadastrar prestador para vincular automaticamente"
                                              className="p-1.5 bg-red-500 hover:bg-red-600 text-white rounded hover:scale-105 active:scale-95 transition-all text-[9.5px] font-bold uppercase shrink-0"
                                              onClick={() => handleResolveFromDivergencia(rtom.cnpjPrestador)}
                                            >
                                              Cadastrar
                                            </button>
                                          )}
                                        </div>
                                      );
                                    })}
                                  </div>
                                )}
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* AUDITORIA FISCAL / DIVERGÊNCIAS TAB */}
        {activeTab === "divergencias" && (
          <div className="flex flex-col gap-lg">
            
            <div className="bg-white border border-outline-variant rounded-sm p-6 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-on-surface flex items-center gap-2">
                  <AlertTriangle className="text-red-500 animate-bounce" size={18} />
                  Ambiente de Incidentes e Não-Conformidades
                </h3>
                <p className="text-xs text-secondary">Discrepâncias geradas automaticamente cruzando a base de dados cadastrados com as totalizações e pagamentos do governo.</p>
              </div>
              <button 
                onClick={fetchTabData} 
                className="btn-outline flex items-center gap-2 py-1.5 text-xs"
                disabled={isLoadingData}
              >
                <RefreshCw size={12} className={cn(isLoadingData && "animate-spin")} />
                <span>Recarregar Notificações</span>
              </button>
            </div>

            {isLoadingData ? (
              <div className="p-20 text-center text-xs font-mono">Processando reconciliações...</div>
            ) : divergencias.length === 0 ? (
              <div className="card p-16 flex flex-col items-center justify-center text-center opacity-70">
                <ShieldCheck size={40} className="text-emerald-500" />
                <h4 className="text-sm font-bold text-on-surface mt-4">Nenhuma Inconformidade Ativa</h4>
                <p className="text-[11px] text-secondary mt-1">Ótimo! Todas as informações da REINF estão integradas com o sistema.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-md">
                {divergencias.map((div) => {
                  const isHigh = div.severidade === "ALTA" || div.severidade === "CRITICA";
                  
                  // Extrair CNPJ se houver na descrição
                  const cnpjMatch = div.descricao.match(/CNPJ: (\d+)/);
                  const parsedCnpj = cnpjMatch ? cnpjMatch[1] : "";

                  return (
                    <div key={div.id} className={cn(
                      "card p-5 border-l-4 overflow-hidden flex flex-col justify-between hover:shadow-lg transition-all",
                      isHigh ? "border-l-red-500 bg-red-50/5" : "border-l-amber-500 bg-amber-50/5"
                    )}>
                      <div>
                        <div className="flex justify-between items-center mb-3">
                          <span className={cn(
                            "px-2 py-0.5 rounded text-[9px] font-black tracking-tight uppercase",
                            isHigh ? "bg-red-100 text-red-800" : "bg-amber-100 text-amber-800"
                          )}>
                            {div.severidade} : {div.tipo}
                          </span>
                          <span className="text-[9px] font-mono text-secondary">
                            Ref: {div.evento?.perApur || "—"}
                          </span>
                        </div>

                        <p className="text-xs font-bold text-on-surface mb-2">{div.descricao}</p>
                        
                        <div className="text-[10px] text-secondary font-mono border-t border-dashed border-outline-variant pt-2 mt-2 leading-relaxed">
                          <span className="block font-semibold">Evento Base:</span>
                          <span className="truncate block opacity-80">{div.evento?.idEvento || "—"}</span>
                        </div>
                      </div>

                      {(div.tipo === "PRESTADOR_NAO_IDENTIFICADO" || div.tipo === "PRESTADOR_NAO_CADASTRADO") && parsedCnpj && (
                        <div className="mt-4 pt-3 border-t border-outline-variant flex justify-end">
                          <button 
                            className="px-4 py-1.5 bg-indigo-600 text-white hover:bg-indigo-700 font-bold text-[10px] rounded uppercase flex items-center gap-1 hover:shadow-sm"
                            onClick={() => handleResolveFromDivergencia(parsedCnpj)}
                          >
                            <Plus size={12} />
                            Cadastrar Prestador
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

          </div>
        )}

      </div>

      {/* FORM DRAWER/MODAL FOR PRESTADOR REGISTRATION */}
      {isFormOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex justify-end z-[1000] transition-all">
          <div className="w-full max-w-md bg-white h-screen overflow-y-auto p-8 shadow-2xl flex flex-col justify-between">
            
            <div className="space-y-6">
              
              {/* Drawer Header */}
              <div className="flex justify-between items-center border-b border-outline-variant pb-4">
                <div>
                  <span className="text-[10px] font-black uppercase text-indigo-600 tracking-wider">Governança Fiscal</span>
                  <h2 className="text-lg font-black text-on-surface">Cadastrar Prestador</h2>
                </div>
                <button 
                  onClick={() => setIsFormOpen(false)}
                  className="p-1 hover:bg-surface rounded-full text-secondary hover:text-on-surface"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Form errors / success messages */}
              {formError && (
                <div className="p-3 bg-red-50 text-red-700 text-xs font-semibold rounded border border-red-200 flex items-center gap-2">
                  <AlertTriangle size={14} className="shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              {formSuccess && (
                <div className="p-3 bg-emerald-50 text-emerald-700 text-xs font-semibold rounded border border-emerald-200 flex items-center gap-2">
                  <CheckCircle2 size={14} className="shrink-0" />
                  <span>{formSuccess}</span>
                </div>
              )}

              {/* Main Inputs Form */}
              <form onSubmit={handleCreatePrestador} id="prestador-register-form" className="space-y-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-secondary uppercase">CNPJ Completo (14 dígitos)*</label>
                  <input 
                    type="text" 
                    placeholder="00.000.000/0000-00" 
                    required
                    className="input-field"
                    value={formData.cnpj}
                    onChange={(e) => {
                      const clean = e.target.value.replace(/\D/g, "");
                      if (clean.length <= 14) {
                        setFormData(prev => ({ ...prev, cnpj: formatCNPJ(clean) }));
                      }
                    }}
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-secondary uppercase">Razão Social*</label>
                  <input 
                    type="text" 
                    placeholder="Empresa Fornecedora de Limpeza S/A" 
                    required
                    className="input-field font-semibold"
                    value={formData.razaoSocial}
                    onChange={(e) => setFormData(prev => ({ ...prev, razaoSocial: e.target.value }))}
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-secondary uppercase">Nome Fantasia / Apelido</label>
                  <input 
                    type="text" 
                    placeholder="ServLimpe Fornecedores" 
                    className="input-field"
                    value={formData.nomeFantasia}
                    onChange={(e) => setFormData(prev => ({ ...prev, nomeFantasia: e.target.value }))}
                  />
                </div>

                <div className="grid grid-cols-2 gap-md">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold text-secondary uppercase">Código de Serviço REINF</label>
                    <select 
                      className="input-field"
                      value={formData.codigoServico}
                      onChange={(e) => setFormData(prev => ({ ...prev, codigoServico: e.target.value }))}
                    >
                      <option value="06">06 - Serviços Terceirização</option>
                      <option value="17">17 - TI / Consultoria</option>
                      <option value="25">25 - Construção Civil</option>
                    </select>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold text-secondary uppercase">Área Free Text</label>
                    <input 
                      type="text" 
                      placeholder="TI, Portaria, etc..." 
                      className="input-field"
                      value={formData.tipoServico}
                      onChange={(e) => setFormData(prev => ({ ...prev, tipoServico: e.target.value }))}
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-1.5 pt-2 border-t border-dotted border-outline-variant">
                  <span className="text-[9px] font-black uppercase text-secondary tracking-wider flex items-center gap-1.5 mb-2">
                    <Info size={10} />
                    Contatos do Fornecedor (Opcional)
                  </span>
                  <div className="grid grid-cols-2 gap-md">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[9px] font-bold text-secondary uppercase">E-mail</label>
                      <input 
                        type="email" 
                        placeholder="contato@emp.com" 
                        className="input-field text-xs px-2 py-1.5"
                        value={formData.email}
                        onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[9px] font-bold text-secondary uppercase">Telefone</label>
                      <input 
                        type="text" 
                        placeholder="(11) 99999-9999" 
                        className="input-field text-xs px-2 py-1.5"
                        value={formData.telefone}
                        onChange={(e) => setFormData(prev => ({ ...prev, telefone: e.target.value }))}
                      />
                    </div>
                  </div>
                </div>
              </form>

            </div>

            <div className="flex gap-md pt-6 border-t border-outline-variant mt-10">
              <button 
                type="button" 
                className="btn-outline flex-1 py-3 text-xs uppercase cursor-pointer"
                onClick={() => setIsFormOpen(false)}
              >
                Cancelar
              </button>
              <button 
                type="submit" 
                form="prestador-register-form"
                className="btn-primary flex-1 py-3 bg-indigo-600 text-xs font-bold uppercase cursor-pointer text-center flex justify-center items-center"
              >
                Gravar e Conciliar
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}

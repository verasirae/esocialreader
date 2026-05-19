"use client";

import React, { useState, useEffect, Suspense, useMemo, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { 
  ShieldCheck, 
  Search, 
  FileDown, 
  ChevronRight,
  Loader2,
  CalendarDays,
  Home,
  Info,
  Clock,
  CheckCircle2,
  AlertCircle
} from "lucide-react";
import { cn, safeJsonFetch } from "@/lib/utils";
import { motion, AnimatePresence } from "motion/react";

export default function ConsolidacaoFiscalPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center p-20"><Loader2 className="animate-spin text-primary" /></div>}>
      <ConsolidacaoFiscalContent />
    </Suspense>
  );
}

function ConsolidacaoFiscalContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [empresa, setEmpresa] = useState<any>(null);
  const [yearsData, setYearsData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [selectedYear, setSelectedYear] = useState<string | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null); // null means "Anual"
  const [activeTab, setActiveTab] = useState("Beneficiários");
  const [isBeneficiariosDetailed, setIsBeneficiariosDetailed] = useState(false);
  const [isRendimentosDetailed, setIsRendimentosDetailed] = useState(false);
  const [isCompensacaoDetailed, setIsCompensacaoDetailed] = useState(false);
  const [isExigibilidadeDetailed, setIsExigibilidadeDetailed] = useState(false);
  const [isFundosDetailed, setIsFundosDetailed] = useState(false);
  const [isRemessaDetailed, setIsRemessaDetailed] = useState(false);
  const [isSociedadesDetailed, setIsSociedadesDetailed] = useState(false);
  const [trabalhadoresList, setTrabalhadoresList] = useState<any[]>([]);
  const [isLoadingTrabalhadores, setIsLoadingTrabalhadores] = useState(false);
  const [rendimentosData, setRendimentosData] = useState<any>(null);
  const [isLoadingRendimentos, setIsLoadingRendimentos] = useState(false);

  const fetchTrabalhadores = useCallback(async () => {
    setIsLoadingTrabalhadores(true);
    let url = `/api/fiscal/consolidado/trabalhadores?ano=${selectedYear}`;
    if (selectedMonth) url += `&mes=${selectedMonth}`;
    if (empresa?.id) url += `&empresaId=${empresa.id}`;

    const data = await safeJsonFetch(url);
    if (data) setTrabalhadoresList(data);
    else setTrabalhadoresList([]);
    setIsLoadingTrabalhadores(false);
  }, [selectedYear, selectedMonth, empresa?.id]);

  const fetchRendimentos = useCallback(async () => {
    setIsLoadingRendimentos(true);
    let url = `/api/fiscal/consolidado/rendimentos?ano=${selectedYear}`;
    if (selectedMonth) url += `&mes=${selectedMonth}`;
    if (empresa?.id) url += `&empresaId=${empresa.id}`;

    const data = await safeJsonFetch(url);
    if (data) setRendimentosData(data);
    else setRendimentosData(null);
    setIsLoadingRendimentos(false);
  }, [selectedYear, selectedMonth, empresa?.id]);

  useEffect(() => {
    if (activeTab === "Detalhamento por trabalhador" && selectedYear) {
      fetchTrabalhadores();
    }
    if (activeTab === "Rendimentos e retenções" && selectedYear) {
      fetchRendimentos();
    }
  }, [activeTab, selectedYear, fetchTrabalhadores, fetchRendimentos]);

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    setIsLoading(true);
    const [yearsResult, empresaResult] = await Promise.all([
      safeJsonFetch("/api/fiscal/calendar"),
      safeJsonFetch("/api/esocial/empresas?page=1")
    ]);

    if (yearsResult) setYearsData(yearsResult);
    if (empresaResult?.data?.length > 0) setEmpresa(empresaResult.data[0]);
    
    setIsLoading(false);
  };

  // Sync with URL
  useEffect(() => {
    const ano = searchParams.get("ano");
    const mes = searchParams.get("mes");
    if (ano) setSelectedYear(ano);
    if (mes) setSelectedMonth(mes);
    else setSelectedMonth(null);
  }, [searchParams]);

  const handleYearSelect = (year: string) => {
    setSelectedYear(year);
    setSelectedMonth(null);
    router.push(`/consolidacao?ano=${year}`);
  };

  const handleMonthSelect = (month: string | null) => {
    setSelectedMonth(month);
    if (month) {
      router.push(`/consolidacao?ano=${selectedYear}&mes=${month}`);
    } else {
      router.push(`/consolidacao?ano=${selectedYear}`);
    }
  };

  const handleBackToYears = () => {
    setSelectedYear(null);
    setSelectedMonth(null);
    router.push("/consolidacao");
  };

  const currentYearData = useMemo(() => {
    return yearsData.find(y => y.ano.toString() === selectedYear);
  }, [yearsData, selectedYear]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-20 gap-4">
        <Loader2 className="animate-spin text-primary w-12 h-12" />
        <p className="text-secondary font-medium animate-pulse text-sm">Carregando demonstrativos consolidados...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 min-h-screen w-full overflow-x-hidden pb-10">
      <div className="w-full max-w-7xl mx-auto px-4 lg:px-8">
        <AnimatePresence mode="wait">
          {!selectedYear ? (
            <YearSelectionView 
              key="year-selection"
              empresa={empresa} 
              years={yearsData} 
              onSelectYear={handleYearSelect} 
            />
          ) : (
            <DetailedConsolidationView 
              key="detailed-view"
              empresa={empresa}
              selectedYear={selectedYear}
              selectedMonth={selectedMonth}
              yearData={currentYearData}
              activeTab={activeTab}
              setActiveTab={setActiveTab}
              onSelectMonth={handleMonthSelect}
              isBeneficiariosDetailed={isBeneficiariosDetailed}
              setIsBeneficiariosDetailed={setIsBeneficiariosDetailed}
              isRendimentosDetailed={isRendimentosDetailed}
              setIsRendimentosDetailed={setIsRendimentosDetailed}
              isCompensacaoDetailed={isCompensacaoDetailed}
              setIsCompensacaoDetailed={setIsCompensacaoDetailed}
              isExigibilidadeDetailed={isExigibilidadeDetailed}
              setIsExigibilidadeDetailed={setIsExigibilidadeDetailed}
              isFundosDetailed={isFundosDetailed}
              setIsFundosDetailed={setIsFundosDetailed}
              isRemessaDetailed={isRemessaDetailed}
              setIsRemessaDetailed={setIsRemessaDetailed}
              isSociedadesDetailed={isSociedadesDetailed}
              setIsSociedadesDetailed={setIsSociedadesDetailed}
              trabalhadoresList={trabalhadoresList}
              isLoadingTrabalhadores={isLoadingTrabalhadores}
              rendimentosData={rendimentosData}
              isLoadingRendimentos={isLoadingRendimentos}
              onBack={handleBackToYears}
            />
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

// --- Components ---

function YearSelectionView({ empresa, years, onSelectYear }: any) {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="flex flex-col gap-6"
    >
      <div className="bg-white border border-outline-variant p-6 rounded-sm shadow-sm">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h1 className="text-lg font-bold text-on-surface tracking-tight">Imposto sobre a Renda Retido na Fonte - IRRF</h1>
            <p className="text-secondary text-xs">Demonstrativo Consolidado</p>
          </div>
          <div className="text-[10px] text-secondary">Versão 1.0.2</div>
        </div>

        <div className="grid grid-cols-2 gap-4 mt-6 text-xs">
          <div>
            <span className="text-secondary font-medium uppercase tracking-wider block mb-1 text-[10px]">CNPJ</span>
            <span className="font-bold text-on-surface">{empresa?.cnpjCompleto || empresa?.cnpjRaiz || "---"}</span>
          </div>
          <div>
            <span className="text-secondary font-medium uppercase tracking-wider block mb-1 text-[10px]">Nome Empresarial</span>
            <span className="font-bold text-on-surface uppercase">{empresa?.razaoSocial || "---"}</span>
          </div>
        </div>
      </div>

      <div className="bg-white border border-outline-variant p-0 rounded-sm shadow-sm overflow-hidden">
        <div className="bg-surface-container-low px-6 py-4 border-b border-outline-variant flex items-center gap-2">
          <CalendarDays size={18} className="text-primary" />
          <h2 className="text-sm font-bold text-on-surface">Demonstrativos</h2>
        </div>
        <div className="p-6 flex flex-col gap-3">
          {years.length === 0 ? (
            <div className="text-center py-10 text-secondary italic text-sm">
              Nenhum dado consolidado disponível.
            </div>
          ) : (
            years.map((y: any) => (
              <button 
                key={y.ano}
                id={`year-btn-${y.ano}`}
                onClick={() => onSelectYear(y.ano.toString())}
                className="w-full text-left px-6 py-3 border border-primary text-primary rounded-full hover:bg-primary/5 transition-all font-bold text-sm flex items-center justify-between group"
              >
                <span>{y.ano}</span>
                <ChevronRight size={18} className="opacity-0 group-hover:opacity-100 transition-all transform translate-x-[-10px] group-hover:translate-x-0" />
              </button>
            ))
          )}
        </div>
      </div>
    </motion.div>
  );
}

function DetailedConsolidationView({ 
  empresa, 
  selectedYear, 
  selectedMonth, 
  yearData, 
  activeTab, 
  setActiveTab, 
  onSelectMonth,
  isBeneficiariosDetailed,
  setIsBeneficiariosDetailed,
  isRendimentosDetailed,
  setIsRendimentosDetailed,
  isCompensacaoDetailed,
  setIsCompensacaoDetailed,
  isExigibilidadeDetailed,
  setIsExigibilidadeDetailed,
  isFundosDetailed,
  setIsFundosDetailed,
  isRemessaDetailed,
  setIsRemessaDetailed,
  isSociedadesDetailed,
  setIsSociedadesDetailed,
  trabalhadoresList,
  isLoadingTrabalhadores,
  rendimentosData,
  isLoadingRendimentos,
  onBack 
}: any) {
  const months = [
    { id: "01", label: "JAN" },
    { id: "02", label: "FEV" },
    { id: "03", label: "MAR" },
    { id: "04", label: "ABR" },
    { id: "05", label: "MAI" },
    { id: "06", label: "JUN" },
    { id: "07", label: "JUL" },
    { id: "08", label: "AGO" },
    { id: "09", label: "SET" },
    { id: "10", label: "OUT" },
    { id: "11", label: "NOV" },
    { id: "12", label: "DEZ" },
  ];

  const currentMonthLabel = selectedMonth ? months.find(m => m.id === selectedMonth)?.label : null;

  const audits = useMemo(() => {
    const list = [];
    
    // 1. Auditoria de Beneficiários (Divergência Total)
    const pfCount = yearData?.totalTrabalhadores || 0;
    const pfSistema = yearData?.totalTrabalhadoresSistema || 0;
    
    if (pfSistema > 0 && pfCount !== pfSistema) {
      const diff = pfSistema - pfCount;
      if (diff > 0) {
        list.push({
          id: "beneficiarios-missing",
          tab: "Beneficiários",
          severity: "error",
          title: "Trabalhadores sem importação",
          message: `Existem ${diff} trabalhadores cadastrados no sistema que não possuem nenhum arquivo XML importado para o ano de ${selectedYear}. Esta situação é crítica para o demonstrativo anual.`
        });
      } else {
        list.push({
          id: "beneficiarios-divergence",
          tab: "Beneficiários",
          severity: "error",
          title: "Divergência na quantidade de beneficiários",
          message: `A quantidade de trabalhadores vinculados ao demonstrativo (${pfCount}) diverge da quantidade cadastrada no sistema (${pfSistema}).`
        });
      }
    }
    
    // 2. Auditoria de Períodos de Apuração (Global)
    const allMonths = ["01", "02", "03", "04", "05", "06", "07", "08", "09", "10", "11", "12"];
    const importedMonths = yearData?.months?.filter((m: any) => m.status !== "vazio").map((m: any) => m.periodo.split("-")[1]) || [];
    const missingMonthsCodes = allMonths.filter(m => !importedMonths.includes(m));

    if (missingMonthsCodes.length > 0) {
      const monthNames = missingMonthsCodes.map(m => months.find(mo => mo.id === m)?.label).join(", ");
      list.push({
        id: "missing-periods-global",
        tab: "Períodos",
        severity: "warning",
        title: "Períodos de apuração faltantes",
        message: `Não foram encontrados arquivos XML importados para os seguintes meses: ${monthNames}. Lembre-se que cada trabalhador deve ter os 12 meses apurados, exceto em casos de início ou término de contrato no meio do ano.`
      });
    }

    // 3. Auditoria de Detalhamento por Trabalhador (Incompletude)
    // Se tivéssemos a lista de trabalhadores com meses faltantes no yearData, listaríamos aqui.
    // Como a fiscal/calendar sugere um resumo, vamos adicionar um alerta genérico se pfCount > 0
    if (pfCount > 0 && missingMonthsCodes.length > 0) {
      list.push({
        id: "worker-periods-alert",
        tab: "Beneficiários",
        severity: "warning",
        title: "Auditoria de períodos por trabalhador",
        message: "Devido à ausência de alguns meses de apuração no ano, os trabalhadores listados podem apresentar demonstrativos incompletos."
      });
    }
    
    return list;
  }, [yearData, selectedYear, months]);

  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="flex flex-col gap-6"
    >
      {/* Breadcrumbs */}
      <div className="flex items-center gap-2 text-[10px] text-secondary font-medium uppercase tracking-wider">
        <button onClick={onBack} className="hover:text-primary flex items-center gap-1">
          <Home size={12} />
        </button>
        <ChevronRight size={10} />
        <button onClick={onBack} className="hover:text-primary underline">Demonstrativos</button>
        <ChevronRight size={10} />
        <span className={cn("text-on-surface font-bold", (isBeneficiariosDetailed || isRendimentosDetailed || isCompensacaoDetailed || isExigibilidadeDetailed || isFundosDetailed || isRemessaDetailed || isSociedadesDetailed) && "underline cursor-pointer")} onClick={() => { setIsBeneficiariosDetailed(false); setIsRendimentosDetailed(false); setIsCompensacaoDetailed(false); setIsExigibilidadeDetailed(false); setIsFundosDetailed(false); setIsRemessaDetailed(false); setIsSociedadesDetailed(false); }}>{selectedYear}</span>
        {currentMonthLabel && (
          <>
            <ChevronRight size={10} />
            <span className={cn("text-on-surface font-bold", (isBeneficiariosDetailed || isRendimentosDetailed || isCompensacaoDetailed || isExigibilidadeDetailed || isFundosDetailed || isRemessaDetailed || isSociedadesDetailed) && "underline cursor-pointer")} onClick={() => { setIsBeneficiariosDetailed(false); setIsRendimentosDetailed(false); setIsCompensacaoDetailed(false); setIsExigibilidadeDetailed(false); setIsFundosDetailed(false); setIsRemessaDetailed(false); setIsSociedadesDetailed(false); }}>{currentMonthLabel}</span>
          </>
        )}
        {isBeneficiariosDetailed && (
          <>
            <ChevronRight size={10} />
            <span className="text-on-surface font-bold">Beneficiários</span>
          </>
        )}
        {isRendimentosDetailed && (
          <>
            <ChevronRight size={10} />
            <span className="text-on-surface font-bold text-ellipsis overflow-hidden whitespace-nowrap max-w-[100px] lg:max-w-none">Rendimentos, deduções e r..</span>
          </>
        )}
        {isCompensacaoDetailed && (
          <>
            <ChevronRight size={10} />
            <span className="text-on-surface font-bold text-ellipsis overflow-hidden whitespace-nowrap max-w-[100px] lg:max-w-none">Compensação do imposto po..</span>
          </>
        )}
        {isExigibilidadeDetailed && (
          <>
            <ChevronRight size={10} />
            <span className="text-on-surface font-bold text-ellipsis overflow-hidden whitespace-nowrap max-w-[100px] lg:max-w-none">Tributação com exigibilid..</span>
          </>
        )}
        {isFundosDetailed && (
          <>
            <ChevronRight size={10} />
            <span className="text-on-surface font-bold text-ellipsis overflow-hidden whitespace-nowrap max-w-[100px] lg:max-w-none">Fundos ou clubes de inves..</span>
          </>
        )}
        {isRemessaDetailed && (
          <>
            <ChevronRight size={10} />
            <span className="text-on-surface font-bold text-ellipsis overflow-hidden whitespace-nowrap max-w-[100px] lg:max-w-none">Pagamentos a residentes o..</span>
          </>
        )}
        {isSociedadesDetailed && (
          <>
            <ChevronRight size={10} />
            <span className="text-on-surface font-bold text-ellipsis overflow-hidden whitespace-nowrap max-w-[100px] lg:max-w-none">Sociedades em conta de pa..</span>
          </>
        )}
      </div>

      <div className="bg-white border border-outline-variant p-6 rounded-sm shadow-sm">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h1 className="text-lg font-bold text-on-surface tracking-tight">Imposto sobre a Renda Retido na Fonte - IRRF - {selectedYear}</h1>
            <p className="text-secondary text-xs">Demonstrativo Consolidado</p>
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-5 gap-6 text-[10px] mb-6">
          <div className="col-span-1">
             <span className="text-secondary font-medium uppercase tracking-wider block mb-1">CNPJ</span>
             <span className="font-bold text-on-surface text-xs">{empresa?.cnpjCompleto || empresa?.cnpjRaiz || "---"}</span>
          </div>
          <div className="col-span-1 lg:col-span-4">
             <span className="text-secondary font-medium uppercase tracking-wider block mb-1">Nome Empresarial</span>
             <span className="font-bold text-on-surface uppercase text-xs">{empresa?.razaoSocial || "---"}</span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4 border-t border-outline-variant text-[10px]">
           <div className="flex items-center gap-2">
              <span className="text-secondary font-medium uppercase mr-2">eSocial:</span>
              <span className="font-bold text-on-surface">12/05/2026 14:30</span>
           </div>
           <div className="flex items-center gap-2">
              <span className="text-secondary font-medium uppercase mr-2">EFD-Reinf:</span>
              <span className="font-bold text-on-surface">12/05/2026 14:35</span>
           </div>
           <div className="flex items-center gap-2">
              <span className="text-secondary font-medium uppercase mr-2">Situação em:</span>
              <span className="font-bold text-on-surface">12/05/2026 15:00</span>
           </div>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white border border-outline-variant p-6 rounded-sm shadow-sm">
        <h3 className="text-xs font-bold text-on-surface mb-4 uppercase tracking-wider">Filtros disponíveis</h3>
        <div className="flex flex-wrap gap-2">
          <button 
            id={`filter-year-${selectedYear}`}
            onClick={() => onSelectMonth(null)}
            className={cn(
              "px-6 py-2 rounded-full border text-xs font-bold transition-all",
              !selectedMonth ? "bg-primary text-white border-primary" : "border-primary text-primary hover:bg-primary/5"
            )}
          >
            {selectedYear}
          </button>
          {months.map(m => {
            const monthStatus = yearData?.months?.find((item: any) => item.periodo.endsWith(`-${m.id}`));
            const hasData = monthStatus?.status !== "vazio";

            return (
              <button 
                key={m.id}
                id={`filter-month-${m.id}`}
                onClick={() => onSelectMonth(m.id)}
                disabled={!hasData}
                className={cn(
                  "px-6 py-2 rounded-full border text-xs font-bold transition-all",
                  selectedMonth === m.id ? "bg-primary text-white border-primary" : "border-primary text-primary hover:bg-primary/5",
                  !hasData && "opacity-30 border-secondary text-secondary cursor-not-allowed hover:bg-transparent"
                )}
              >
                {m.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Conteúdo Principal */}
      <div className="bg-white border border-outline-variant p-0 rounded-sm shadow-sm overflow-hidden">
        {!isBeneficiariosDetailed ? (
          <>
            <div className="p-6 pb-0">
              <h2 className="text-sm font-bold text-on-surface mb-4">{selectedMonth ? `Demonstrativo Mensal - ${currentMonthLabel} ${selectedYear}` : `Demonstrativo Anual ${selectedYear}`}</h2>
              
              {/* Tabs */}
              <div className="flex gap-6 border-b border-outline-variant overflow-x-auto scrollbar-hide">
                {[
                  "Beneficiários", 
                  "Detalhamento por trabalhador",
                  "Rendimentos e retenções", 
                  "Compensação judicial", 
                  "Exigibilidade suspensa", 
                  "Fundos de investimentos", 
                  "Processos judiciais", 
                  "Remessa ao exterior",
                  "Sociedades em conta de participação",
                  "Plano de saúde"
                ].map((tab) => (
                  <button 
                    key={tab}
                    id={`tab-${tab.replace(/\s+/g, '-').toLowerCase()}`}
                    onClick={() => setActiveTab(tab)}
                    className={cn(
                      "pb-4 text-xs font-medium whitespace-nowrap border-b-2 transition-all",
                      activeTab === tab ? "border-primary text-primary font-bold" : "border-transparent text-secondary hover:text-on-surface"
                    )}
                  >
                    {tab}
                  </button>
                ))}
              </div>
            </div>

            <div className="p-6">
              {activeTab === "Rendimentos e retenções" ? (
                !isRendimentosDetailed ? (
                  <RendimentosSummaryTab data={rendimentosData} isLoading={isLoadingRendimentos} onShowDetail={() => setIsRendimentosDetailed(true)} />
                ) : (
                  <RendimentosTab data={rendimentosData} selectedMonth={selectedMonth} onBack={() => setIsRendimentosDetailed(false)} />
                )
              ) : activeTab === "Beneficiários" ? (
                <BeneficiariosTab data={yearData} onShowDetail={() => setIsBeneficiariosDetailed(true)} onShowWorkers={() => setActiveTab("Detalhamento por trabalhador")} />
              ) : activeTab === "Detalhamento por trabalhador" ? (
                <TrabalhadoresTab 
                  data={trabalhadoresList} 
                  isLoading={isLoadingTrabalhadores} 
                  selectedYear={selectedYear} 
                  selectedMonth={selectedMonth} 
                />
              ) : activeTab === "Compensação judicial" ? (
                !isCompensacaoDetailed ? (
                  <CompensacaoTab data={yearData} onShowDetail={() => setIsCompensacaoDetailed(true)} />
                ) : (
                  <CompensacaoDetailedView onBack={() => setIsCompensacaoDetailed(false)} />
                )
              ) : activeTab === "Exigibilidade suspensa" ? (
                !isExigibilidadeDetailed ? (
                  <ExigibilidadeTab data={yearData} onShowDetail={() => setIsExigibilidadeDetailed(true)} />
                ) : (
                  <ExigibilidadeDetailedView onBack={() => setIsExigibilidadeDetailed(false)} />
                )
              ) : activeTab === "Fundos de investimentos" ? (
                !isFundosDetailed ? (
                  <FundosTab data={yearData} onShowDetail={() => setIsFundosDetailed(true)} />
                ) : (
                  <FundosDetailedView onBack={() => setIsFundosDetailed(false)} />
                )
              ) : activeTab === "Processos judiciais" ? (
                <ProcessosJudiciaisTab data={yearData} />
              ) : activeTab === "Remessa ao exterior" ? (
                !isRemessaDetailed ? (
                  <RemessaTab data={yearData} onShowDetail={() => setIsRemessaDetailed(true)} />
                ) : (
                  <RemessaDetailedView onBack={() => setIsRemessaDetailed(false)} />
                )
              ) : activeTab === "Sociedades em conta de participação" ? (
                !isSociedadesDetailed ? (
                  <SociedadesTab data={yearData} onShowDetail={() => setIsSociedadesDetailed(true)} />
                ) : (
                  <SociedadesDetailedView onBack={() => setIsSociedadesDetailed(false)} />
                )
              ) : activeTab === "Plano de saúde" ? (
                <PlanoSaudeTab data={yearData} />
              ) : (
                <div className="py-20 text-center flex flex-col items-center gap-4">
                  <Info className="text-secondary opacity-20 w-12 h-12" />
                  <p className="text-secondary text-xs italic">Não há dados consolidados para esta categoria no momento.</p>
                </div>
              )}
            </div>
            
            <div className="p-6 pt-0">
              <div className="border-t border-outline-variant pt-6">
                <h3 className="text-sm font-bold text-on-surface mb-6 flex items-center gap-2">
                  Painel de críticas
                  {audits.length > 0 && <span className="bg-error text-white text-[9px] px-1.5 py-0.5 rounded-full">{audits.length}</span>}
                </h3>
                
                {audits.length > 0 ? (
                  <div className="flex flex-col gap-3">
                    {audits.map((audit) => (
                      <div 
                        key={audit.id}
                        className={cn(
                          "p-4 rounded-sm border flex items-start gap-3",
                          audit.severity === "error" ? "bg-error/5 border-error/20" : "bg-warning/5 border-warning/20"
                        )}
                      >
                        <AlertCircle size={16} className={cn("mt-0.5", audit.severity === "error" ? "text-error" : "text-warning")} />
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-2">
                            <span className="text-[11px] font-bold text-on-surface">{audit.title}</span>
                            <span className="bg-outline-variant text-secondary text-[8px] px-1 rounded uppercase font-black uppercase tracking-widest">{audit.tab}</span>
                          </div>
                          <p className="text-[10px] text-secondary leading-relaxed">{audit.message}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-10 text-secondary text-xs">
                    Não foram encontradas divergências no processamento dos eventos enviados.
                  </div>
                )}
              </div>
            </div>
          </>
        ) : (
          <BeneficiariosDetailedView data={yearData} onBack={() => setIsBeneficiariosDetailed(false)} />
        )}
      </div>
    </motion.div>
  );
}

function RendimentosTab({ data, selectedMonth, onBack }: any) {
  const values = useMemo(() => {
    if (!data) return null;

    const findVal = (codes: string | string[]) => {
      const codeList = Array.isArray(codes) ? codes : [codes];
      const items = data.infoIRBreakdown?.filter((i: any) => 
        codeList.some(c => i.tpInfoIR === c || i.tpInfoIR.startsWith(c))
      );
      return items?.reduce((acc: number, curr: any) => acc + Number(curr._sum.valor), 0) || 0;
    };

    const rendTributaveis = findVal("11");
    
    // Deduções
    const prevOficial = findVal(["31", "32"]);
    const prevPrivada = findVal(["43", "53"]);
    const fapi = findVal("47");
    const funpresp = findVal("48");
    const entePatrocinador = findVal("51");
    const prevComplTotal = prevPrivada + fapi + funpresp + entePatrocinador;
    
    const dependentes = findVal("41");
    const pensao = findVal("42");
    const simplificado = findVal("14");
    
    const totalDeducoes = prevOficial + prevComplTotal + dependentes + pensao + simplificado;

    const isentos = {
      parcelaIsenta65: findVal("70"),
      diarias: findVal("61"),
      ajudaCusto: findVal("62"),
      indenizacaoPdv: findVal("63"),
      abonoPecuniario: findVal("64"),
      lucrosDividendos: findVal("67"),
      valoresMe: findVal("71"),
      complementacao89: findVal("72"),
      resgateMolestia: findVal("73"),
      pensaoMolestia: findVal("74"),
      jurosMora: findVal("75"),
      bolsaResidente: 0,
      outros: findVal(["79", "7900"]),
      auxilioMoradia: findVal("80"),
    };

    const totalIsento = Object.values(isentos).reduce((acc, curr) => acc + curr, 0);

    return {
      rendimentosTributaveis: rendTributaveis,
      deducoes: {
        total: totalDeducoes,
        previdenciaOficial: prevOficial,
        previdenciaComplementar: prevComplTotal,
        privada: prevPrivada,
        fapi: fapi,
        funpresp: funpresp,
        entePublico: entePatrocinador,
        dependentes: dependentes,
        pensao: pensao,
        simplificado: simplificado,
      },
      impostoRetido: Number(data.totals?.vlrIrrf || 0),
      rendimentosIsentos: {
        total: totalIsento,
        ...isentos
      }
    };
  }, [data]);

  const CurrencyRow = ({ label, value, indent = 0, isBold = false }: any) => (
    <div 
      className={cn(
        "flex justify-between items-center py-2 border-b border-outline-variant/30 text-[11px] group hover:bg-surface-container/20 transition-all",
        indent === 1 ? "pl-10" : indent === 2 ? "pl-16" : indent === 3 ? "pl-22" : "pl-4"
      )}
    >
      <span className={cn(isBold ? "font-bold text-on-surface" : "text-secondary font-medium")}>{label}</span>
      <span className="font-mono font-bold text-on-surface pr-6">
        {Number(value).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
      </span>
    </div>
  );

  if (!values) {
    return (
      <div className="py-20 flex flex-col items-center justify-center gap-3">
        <Loader2 className="animate-spin text-primary" />
        <span className="text-secondary text-[10px]">Carregando detalhamento...</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="bg-surface-container-low px-4 py-3 rounded-t-sm border border-outline-variant flex items-center justify-between">
        <button 
          onClick={onBack}
          className="text-xs font-bold text-primary flex items-center gap-2 hover:underline group"
        >
          Rendimentos, deduções e retenções
          <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />
        </button>
      </div>
      
      <div className="border-x border-b border-outline-variant overflow-hidden bg-white">
        <CurrencyRow label="Rendimentos tributáveis" value={values.rendimentosTributaveis} isBold />
        
        <CurrencyRow label="Deduções" value={values.deducoes.total} isBold />
        <CurrencyRow label="Previdência oficial" value={values.deducoes.previdenciaOficial} indent={1} />
        <CurrencyRow label="Previdência complementar" value={values.deducoes.previdenciaComplementar} indent={1} />
        <CurrencyRow label="Previdência privada" value={values.deducoes.privada} indent={2} />
        <CurrencyRow label="FAPI" value={values.deducoes.fapi} indent={2} />
        <CurrencyRow label="FUNPRESP" value={values.deducoes.funpresp} indent={2} />
        <CurrencyRow label="Ente público patrocinador" value={values.deducoes.entePublico} indent={2} />
        <CurrencyRow label="Dependentes" value={values.deducoes.dependentes} indent={1} />
        <CurrencyRow label="Pensão alimentícia" value={values.deducoes.pensao} indent={1} />
        <CurrencyRow label="Desconto simplificado mensal" value={values.deducoes.simplificado} indent={1} />

        <CurrencyRow label="Imposto retido" value={values.impostoRetido} isBold />

        <CurrencyRow label="Rendimentos isentos" value={values.rendimentosIsentos.total} isBold />
        <CurrencyRow label="Parcela isenta aposentadoria acima de 65 anos" value={values.rendimentosIsentos.parcelaIsenta65} indent={1} />
        <CurrencyRow label="Diárias" value={values.rendimentosIsentos.diarias} indent={1} />
        <CurrencyRow label="Ajuda de custo" value={values.rendimentosIsentos.ajudaCusto} indent={1} />
        <CurrencyRow label="Indenização e rescisão de contrato (PDV)" value={values.rendimentosIsentos.indenizacaoPdv} indent={1} />
        <CurrencyRow label="Abono pecuniário" value={values.rendimentosIsentos.abonoPecuniario} indent={1} />
        <CurrencyRow label="Lucros e dividendos pagos a partir de 1996" value={values.rendimentosIsentos.lucrosDividendos} indent={1} />
        <CurrencyRow label="Valores pagos a titular ou sócio de ME ou EPP" value={values.rendimentosIsentos.valoresMe} indent={1} />
        <CurrencyRow label="Complementação de aposentadoria - contribuição de 1989 a 1995 - IN 1.343/2013" value={values.rendimentosIsentos.complementacao89} indent={1} />
        <CurrencyRow label="Resgate de previdência complementar por portador de moléstia grave" value={values.rendimentosIsentos.resgateMolestia} indent={1} />
        <CurrencyRow label="Pensão, aposentadoria ou reforma por moléstia grave" value={values.rendimentosIsentos.pensaoMolestia} indent={1} />
        <CurrencyRow label="Juros de mora pagos, devidos pelo atraso no pagamento de remuneração" value={values.rendimentosIsentos.jurosMora} indent={1} />
        <CurrencyRow label="Bolsa de estudo recebida por médico residente" value={values.rendimentosIsentos.bolsaResidente} indent={1} />
        <CurrencyRow label="Outros" value={values.rendimentosIsentos.outros} indent={1} />
        <CurrencyRow label="Auxílio moradia" value={values.rendimentosIsentos.auxilioMoradia} indent={1} />

        <CurrencyRow label="Despesas com ação judicial" value={0} isBold />
      </div>
    </div>
  );
}

function RendimentosSummaryTab({ data, isLoading, onShowDetail }: any) {
  const summaryRows = useMemo(() => {
    if (!data?.crBreakdown) return [];
    
    const codeLabels: any = {
      "0561": "0561 - Rendimentos do Trabalho Assalariado",
      "0581": "0581 - Rendimentos do Trabalho Assalariado",
      "0588": "0588 - Trabalho sem vínculo empregatício",
      "1708": "1708 - Serviços profissionais prestados por PJ",
      "5952": "5952 - Retenções de Contribuições (CSLL, PIS, COFINS)",
      "595207": "5952-07 - Retenções de Contribuições (PJ a PJ)",
      "056107": "0561-07 - Rendimentos do Trabalho Assalariado Pais/Mãe",
      "056108": "0561-08 - IRRF - Trabalho assalariado no país e no exterior",
    };

    return data.crBreakdown.map((item: any) => ({
      code: codeLabels[item.crMen] || `${item.crMen} - Outros rendimentos`,
      tributavel: Number(item._sum.vlrRendTrib || 0) + Number(item._sum.vlrRendTrib13 || 0),
      deducoes: Number(item._sum.vlrPrevOficial || 0) + Number(item._sum.vlrPrevOficial13 || 0),
      irrf: Number(item._sum.vlrCRMen || 0) + Number(item._sum.vlrCR13Men || 0),
      isento: 0, 
      acao: 0
    }));
  }, [data]);

  const total = useMemo(() => {
    return summaryRows.reduce((acc: any, row: any) => ({
      tributavel: acc.tributavel + row.tributavel,
      deducoes: acc.deducoes + row.deducoes,
      irrf: acc.irrf + row.irrf,
      isento: acc.isento + row.isento,
      acao: acc.acao + row.acao,
    }), { tributavel: 0, deducoes: 0, irrf: 0, isento: 0, acao: 0 });
  }, [summaryRows]);

  const format = (v: number) => v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  if (isLoading) {
    return (
      <div className="py-20 flex flex-col items-center justify-center gap-3">
        <Loader2 className="animate-spin text-primary" />
        <span className="text-secondary text-[10px]">Carregando detalhamento de rendimentos...</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="bg-surface-container-low px-4 py-3 rounded-t-sm border border-outline-variant flex flex-col gap-1">
        <button 
          onClick={onShowDetail}
          className="text-xs font-bold text-primary flex items-center gap-2 hover:underline group w-fit"
        >
          Rendimentos, deduções e retenções
          <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />
        </button>
        <span className="text-[10px] text-secondary font-medium">Detalhamento por código de receita</span>
      </div>
      
      <div className="border border-outline-variant overflow-x-auto bg-white">
        <table className="w-full text-left border-collapse min-w-[1000px]">
          <thead>
            <tr className="bg-surface-container-lowest border-b border-outline-variant text-[10px] uppercase font-bold text-secondary tracking-widest">
              <th className="py-3 px-4">Código de receita</th>
              <th className="py-3 px-4 text-right">Rendimento tributável</th>
              <th className="py-3 px-4 text-right">Deduções</th>
              <th className="py-3 px-4 text-right">Imposto retido</th>
              <th className="py-3 px-4 text-right">Rendimentos isentos</th>
              <th className="py-3 px-4 text-right">Despesas com ação judicial</th>
            </tr>
          </thead>
          <tbody className="text-[11px]">
            {summaryRows.map((row: any, idx: number) => (
              <tr key={idx} className="border-b border-outline-variant/30 hover:bg-surface-container/20 transition-all font-medium text-secondary">
                <td className="py-2 px-4">{row.code}</td>
                <td className="py-2 px-4 text-right font-mono font-bold text-on-surface">{format(row.tributavel)}</td>
                <td className="py-2 px-4 text-right font-mono font-bold text-on-surface">{format(row.deducoes)}</td>
                <td className="py-2 px-4 text-right font-mono font-bold text-on-surface">{format(row.irrf)}</td>
                <td className="py-2 px-4 text-right font-mono font-bold text-on-surface">{format(row.isento)}</td>
                <td className="py-2 px-4 text-right font-mono font-bold text-on-surface">{format(row.acao)}</td>
              </tr>
            ))}
            <tr className="bg-surface-container-low/30 font-bold text-on-surface">
              <td className="py-3 px-4">Total</td>
              <td className="py-3 px-4 text-right font-mono">{format(total.tributavel)}</td>
              <td className="py-3 px-4 text-right font-mono">{format(total.deducoes)}</td>
              <td className="py-3 px-4 text-right font-mono">{format(total.irrf)}</td>
              <td className="py-3 px-4 text-right font-mono">{format(total.isento)}</td>
              <td className="py-3 px-4 text-right font-mono">{format(total.acao)}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

function BeneficiariosTab({ data, onShowDetail, onShowWorkers }: any) {
  const pfCount = data?.totalTrabalhadores || 0;
  const pjCount = data?.totalPessoaJuridica || 0; // Por enquanto PJ não consolidado anualmente no serviço

  const pfSistema = data?.totalTrabalhadoresSistema || 0;
  const isDivergent = pfCount !== pfSistema;

  const Row = ({ label, value, note }: any) => (
    <div className="flex justify-between items-center py-2 border-b border-outline-variant/30 text-[11px] hover:bg-surface-container/20 transition-all pl-6 group">
      <div className="flex flex-col">
        <span className="text-secondary font-medium">{label}</span>
        {note && <span className={cn("text-[9px] font-bold mt-0.5", isDivergent ? "text-error" : "text-success")}>{note}</span>}
      </div>
      <div className="flex items-center gap-3 pr-6">
        {note && isDivergent && <AlertCircle size={12} className="text-error animate-pulse" />}
        <span className="font-mono font-bold text-on-surface">{value}</span>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <div className="bg-surface-container-low px-4 py-3 rounded-t-sm border border-outline-variant flex items-center justify-between">
          <button 
            onClick={onShowDetail}
            className="text-xs font-bold text-primary flex items-center gap-2 hover:underline group"
          >
            Beneficiários
            <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />
          </button>
        </div>
        
        <div className="border-x border-b border-outline-variant bg-white">
          <Row 
            label="Pessoa física" 
            value={pfCount} 
            note={pfSistema > 0 ? `Auditado: ${pfSistema} trabalhadores no sistema` : null}
          />
          <Row label="Pessoa jurídica" value={pjCount} />
        </div>

        {isDivergent && pfSistema > 0 && (
          <div className="px-6 py-2 bg-error/5 border border-error/20 rounded-sm flex items-center gap-2 mt-1">
            <AlertCircle size={12} className="text-error flex-shrink-0" />
            <p className="text-[10px] text-error font-medium">Atenção: A quantidade de trabalhadores vinculados ao demonstrativo ({pfCount}) diverge da quantidade cadastrada no sistema ({pfSistema}).</p>
          </div>
        )}
      </div>

      <div className="bg-primary/5 p-6 rounded-sm border border-primary/20 flex items-center justify-between">
        <div>
          <h4 className="text-xs font-bold text-primary mb-1">Detalhamento por Trabalhador</h4>
          <p className="text-[10px] text-secondary">Visualize rendimentos, deduções e retenções detalhadas por cada beneficiário individual.</p>
        </div>
        <button 
          onClick={onShowWorkers}
          className="bg-primary text-white text-[10px] font-bold px-6 py-2 rounded-full hover:bg-primary/90 transition-all"
        >
          ACESSAR LISTAGEM
        </button>
      </div>
    </div>
  );
}

function BeneficiariosDetailedView({ data, onBack }: any) {
  const pfCount = data?.totalTrabalhadores || 0;
  const pjCount = data?.totalPessoaJuridica || 0;
  const total = pfCount + pjCount;

  const detailedData = [
    { label: "Declarante", value: total, bold: true, children: [
      { label: "Pessoa física", value: pfCount },
      { label: "Pessoa jurídica", value: pjCount },
      { label: "Rendimentos recebidos acumuladamente", value: 0 },
    ]},
    { label: "Fundos ou clubes de investimento", value: 0, bold: true, children: [
      { label: "Pessoa física", value: 0 },
      { label: "Pessoa jurídica", value: 0 },
    ]},
    { label: "Processos da justiça", value: 0, bold: true, children: [
      { label: "Federal", value: 0, children: [
        { label: "Pessoa física", value: 0 },
        { label: "Pessoa jurídica", value: 0 },
      ]},
      { label: "Trabalho", value: 0, children: [
        { label: "Pessoa física", value: 0 },
        { label: "Pessoa jurídica", value: 0 },
      ]},
      { label: "Estadual/Distrito Federal", value: 0, children: [
        { label: "Pessoa física", value: 0 },
        { label: "Pessoa jurídica", value: 0 },
      ]},
      { label: "Rendimentos recebidos acumuladamente", value: 0 },
    ]},
    { label: "Pagamentos a residentes ou domiciliados no exterior", value: 0, bold: true, children: [
      { label: "Pessoa física", value: 0 },
      { label: "Pessoa jurídica", value: 0 },
    ]},
    { label: "Sociedade em conta de participação", value: 0, bold: true, children: [
      { label: "Pessoa física", value: 0 },
      { label: "Pessoa jurídica", value: 0 },
    ]},
    { label: "Rendimentos pagos a entidades imunes/isentas - IN RFB 1.234/2012", value: 0, bold: true, children: [
      { label: "Rendimento imune (art. 4º, inciso III)", value: 0 },
      { label: "Rendimento isento (art. 4º, inciso IV)", value: 0 },
    ]},
  ];

  const TableHeader = () => (
    <div className="grid grid-cols-12 gap-4 py-3 px-6 bg-surface-container-low border-b border-outline-variant text-[10px] uppercase font-bold text-secondary tracking-widest">
      <div className="col-span-6">Tipo de beneficiário</div>
      <div className="col-span-3 text-right">Quantidade</div>
      <div className="col-span-3 text-right">Beneficiários/Código</div>
    </div>
  );

  const RecursiveRow = ({ node, depth = 0 }: any) => (
    <>
      <div 
        className={cn(
          "grid grid-cols-12 gap-4 py-2 px-6 border-b border-outline-variant/30 text-[11px] group hover:bg-surface-container/20 transition-all",
          depth > 0 && `bg-surface-container-lowest/30`
        )}
      >
        <div className="col-span-6 flex items-center" style={{ paddingLeft: `${depth * 1.5}rem` }}>
          <span className={cn(node.bold ? "font-bold text-on-surface" : "text-secondary font-medium")}>
            {node.label}
          </span>
        </div>
        <div className="col-span-3 text-right font-mono text-on-surface font-bold pr-4">
          {node.value || 0}
        </div>
        <div className="col-span-3 text-right font-mono text-on-surface font-bold pr-4">
          {node.value || 0}
        </div>
      </div>
      {node.children && node.children.map((child: any, idx: number) => (
        <RecursiveRow key={idx} node={child} depth={depth + 1} />
      ))}
    </>
  );

  return (
    <motion.div 
      initial={{ opacity: 0 }} 
      animate={{ opacity: 1 }}
      className="p-0"
    >
      <div className="p-6">
        <button 
          onClick={onBack}
          className="text-sm font-bold text-primary flex items-center gap-2 hover:underline mb-8 group"
        >
          <ChevronRight size={14} className="rotate-180 group-hover:-translate-x-1 transition-transform" />
          Quantidade de beneficiários
        </button>

        <div className="border border-outline-variant rounded-sm overflow-hidden bg-white">
          <TableHeader />
          {detailedData.map((node, idx) => (
            <RecursiveRow key={idx} node={node} />
          ))}
        </div>
      </div>
    </motion.div>
  );
}

function CompensacaoTab({ data, onShowDetail }: any) {
  const Row = ({ label, value }: any) => (
    <div className="flex justify-between items-center py-2 border-b border-outline-variant/30 text-[11px] hover:bg-surface-container/20 transition-all pl-6">
      <span className="text-secondary font-medium">{label}</span>
      <span className="font-mono font-bold text-on-surface pr-6">
        {Number(value).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
      </span>
    </div>
  );

  return (
    <div className="flex flex-col gap-2">
      <div className="bg-surface-container-low px-4 py-3 rounded-t-sm border border-outline-variant flex items-center justify-between">
        <button 
          onClick={onShowDetail}
          className="text-xs font-bold text-primary flex items-center gap-2 hover:underline group"
        >
          Compensação do imposto por decisão judicial
          <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />
        </button>
      </div>
      
      <div className="border-x border-b border-outline-variant bg-white">
        <Row label="Ano-calendário" value={0} />
        <Row label="Anos anteriores" value={0} />
      </div>
    </div>
  );
}

function CompensacaoDetailedView({ onBack }: any) {
  const format = (v: number) => v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <motion.div 
      initial={{ opacity: 0 }} 
      animate={{ opacity: 1 }}
      className="p-0 flex flex-col gap-2"
    >
      <div className="bg-surface-container-low px-4 py-3 rounded-t-sm border border-outline-variant flex items-center justify-between">
        <button 
          onClick={onBack}
          className="text-xs font-bold text-primary flex items-center gap-2 hover:underline group"
        >
          Compensação do imposto por decisão judicial
          <ChevronRight size={14} className="rotate-180 group-hover:-translate-x-1 transition-transform" />
        </button>
      </div>

      <div className="border border-outline-variant rounded-sm overflow-x-auto bg-white">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-surface-container-lowest border-b border-outline-variant text-[10px] uppercase font-bold text-secondary tracking-widest">
              <th className="py-3 px-6">Código de receita</th>
              <th className="py-3 px-6 text-right">Anos anteriores</th>
              <th className="py-3 px-6 text-right">Ano-calendário</th>
            </tr>
          </thead>
          <tbody className="text-[11px]">
            <tr className="bg-surface-container-low/30 font-bold text-on-surface">
              <td className="py-3 px-6">Total</td>
              <td className="py-3 px-6 text-right font-mono">{format(0)}</td>
              <td className="py-3 px-6 text-right font-mono">{format(0)}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </motion.div>
  );
}

function ExigibilidadeTab({ data, onShowDetail }: any) {
  const Row = ({ label, value, indent = 0, isBold = false }: any) => (
    <div 
      className={cn(
        "flex justify-between items-center py-2 border-b border-outline-variant/30 text-[11px] group hover:bg-surface-container/20 transition-all",
        indent === 1 ? "pl-6" : indent === 2 ? "pl-12" : "pl-6"
      )}
    >
      <span className={cn(isBold ? "font-bold text-on-surface" : "text-secondary font-medium")}>{label}</span>
      <span className="font-mono font-bold text-on-surface pr-6">
        {Number(value).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
      </span>
    </div>
  );

  return (
    <div className="flex flex-col gap-2">
      <div className="bg-surface-container-low px-4 py-3 rounded-t-sm border border-outline-variant flex items-center justify-between">
        <button 
          onClick={onShowDetail}
          className="text-xs font-bold text-primary flex items-center gap-2 hover:underline group"
        >
          Tributação com exigibilidade suspensa
          <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />
        </button>
      </div>
      
      <div className="border-x border-b border-outline-variant bg-white">
        <Row label="Rendimentos tributáveis" value={0} isBold />
        <div className="bg-surface-container-lowest/50">
          <Row label="Deduções" value={0} isBold />
          <Row label="Previdência oficial" value={0} indent={1} />
          <Row label="Previdência complementar" value={0} indent={1} />
          <Row label="Previdência privada" value={0} indent={2} />
          <Row label="FAPI" value={0} indent={2} />
          <Row label="FUNPRESP" value={0} indent={2} />
          <Row label="Ente público patrocinador" value={0} indent={2} />
          <Row label="Dependentes" value={0} indent={1} />
          <Row label="Pensão alimentícia" value={0} indent={1} />
          <Row label="Desconto simplificado mensal" value={0} indent={1} />
        </div>
        <Row label="Imposto não retido" value={0} isBold />
        <Row label="Depósito judicial" value={0} isBold />
      </div>
    </div>
  );
}

function ExigibilidadeDetailedView({ onBack }: any) {
  const format = (v: number) => v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <motion.div 
      initial={{ opacity: 0 }} 
      animate={{ opacity: 1 }}
      className="p-0 flex flex-col gap-2"
    >
      <div className="bg-surface-container-low px-4 py-3 rounded-t-sm border border-outline-variant flex flex-col gap-1">
        <button 
          onClick={onBack}
          className="text-xs font-bold text-primary flex items-center gap-2 hover:underline group w-fit"
        >
          Tributação com exigibilidade suspensa
          <ChevronRight size={14} className="rotate-180 group-hover:-translate-x-1 transition-transform" />
        </button>
        <span className="text-[10px] text-secondary font-medium">Detalhamento por código de receita</span>
      </div>

      <div className="border border-outline-variant rounded-sm overflow-x-auto bg-white">
        <table className="w-full text-left border-collapse min-w-[800px]">
          <thead>
            <tr className="bg-surface-container-lowest border-b border-outline-variant text-[10px] uppercase font-bold text-secondary tracking-widest">
              <th className="py-3 px-6">Código de receita</th>
              <th className="py-3 px-6 text-right">Rendimento tributável</th>
              <th className="py-3 px-6 text-right">Deduções</th>
              <th className="py-3 px-6 text-right">IRRF</th>
              <th className="py-3 px-6 text-right">Depósito judicial</th>
            </tr>
          </thead>
          <tbody className="text-[11px]">
            <tr className="bg-surface-container-low/30 font-bold text-on-surface">
              <td className="py-3 px-6">Total</td>
              <td className="py-3 px-6 text-right font-mono">{format(0)}</td>
              <td className="py-3 px-6 text-right font-mono">{format(0)}</td>
              <td className="py-3 px-6 text-right font-mono">{format(0)}</td>
              <td className="py-3 px-6 text-right font-mono">{format(0)}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </motion.div>
  );
}

function FundosTab({ data, onShowDetail }: any) {
  const Row = ({ label, value }: any) => (
    <div className="flex justify-between items-center py-2 border-b border-outline-variant/30 text-[11px] hover:bg-surface-container/20 transition-all pl-6">
      <span className="text-secondary font-medium">{label}</span>
      <span className="font-mono font-bold text-on-surface pr-6">
        {label.includes("Relação") ? value : Number(value).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
      </span>
    </div>
  );

  return (
    <div className="flex flex-col gap-2">
      <div className="bg-surface-container-low px-4 py-3 rounded-t-sm border border-outline-variant flex items-center justify-between">
        <button 
          onClick={onShowDetail}
          className="text-xs font-bold text-primary flex items-center gap-2 hover:underline group"
        >
          Fundos ou clubes de investimentos
          <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />
        </button>
      </div>
      
      <div className="border-x border-b border-outline-variant bg-white">
        <Row label="Rendimentos tributáveis" value={0} />
        <Row label="Imposto retido" value={0} />
        <Row label="Relação dos fundos/clubes de investimentos" value={0} />
      </div>
    </div>
  );
}

function FundosDetailedView({ onBack }: any) {
  const format = (v: number) => v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <motion.div 
      initial={{ opacity: 0 }} 
      animate={{ opacity: 1 }}
      className="p-0 flex flex-col gap-2"
    >
      <div className="bg-surface-container-low px-4 py-3 rounded-t-sm border border-outline-variant flex flex-col gap-1">
        <button 
          onClick={onBack}
          className="text-xs font-bold text-primary flex items-center gap-2 hover:underline group w-fit"
        >
          Fundos ou clubes de investimentos
          <ChevronRight size={14} className="rotate-180 group-hover:-translate-x-1 transition-transform" />
        </button>
        <span className="text-[10px] text-secondary font-medium">Detalhamento por código de receita</span>
      </div>

      <div className="border border-outline-variant rounded-sm overflow-x-auto bg-white">
        <table className="w-full text-left border-collapse min-w-[800px]">
          <thead>
            <tr className="bg-surface-container-lowest border-b border-outline-variant text-[10px] uppercase font-bold text-secondary tracking-widest">
              <th className="py-3 px-6">Código de receita</th>
              <th className="py-3 px-6 text-right">Rendimento tributável</th>
              <th className="py-3 px-6 text-right">Imposto retido</th>
            </tr>
          </thead>
          <tbody className="text-[11px]">
            <tr className="bg-surface-container-low/30 font-bold text-on-surface">
              <td className="py-3 px-6">Total</td>
              <td className="py-3 px-6 text-right font-mono">{format(0)}</td>
              <td className="py-3 px-6 text-right font-mono">{format(0)}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </motion.div>
  );
}

function ProcessosJudiciaisTab({ data }: any) {
  const SectionHeader = ({ title }: { title: string }) => (
    <div className="bg-surface-container-lowest px-6 py-3 border-y border-outline-variant mt-6 first:mt-0">
      <h3 className="text-xs font-bold text-on-surface uppercase tracking-wider">{title}</h3>
    </div>
  );

  const Row = ({ label, value, indent = 0, isBold = false }: any) => (
    <div 
      className={cn(
        "flex justify-between items-center py-2 border-b border-outline-variant/30 text-[11px] group hover:bg-surface-container/20 transition-all pl-6",
        indent === 1 ? "pl-12" : indent === 2 ? "pl-16" : ""
      )}
    >
      <span className={cn(isBold ? "font-bold text-on-surface" : "text-secondary font-medium")}>{label}</span>
      <span className="font-mono font-bold text-on-surface pr-6">
        {typeof value === "number" ? value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : value}
      </span>
    </div>
  );

  const CourtSection = ({ title }: { title: string }) => (
    <div className="flex flex-col">
      <SectionHeader title={title} />
      <div className="bg-white">
        <Row label="Quantidade de processos" value={0} />
        <Row label="Quantidade de beneficiários" value={0} />
        <Row label="Rendimentos tributáveis" value={0} isBold />
        <div className="bg-surface-container-lowest/30">
          <Row label="Deduções" value={0} isBold />
          <Row label="Previdência oficial" value={0} indent={1} />
          {title.includes("ESTADUAL") && <Row label="Previdência complementar" value={0} indent={1} />}
          {title.includes("ESTADUAL") && <Row label="Previdência privada" value={0} indent={2} />}
          {title.includes("ESTADUAL") && <Row label="FAPI" value={0} indent={2} />}
          {title.includes("ESTADUAL") && <Row label="FUNPRESP" value={0} indent={2} />}
          {title.includes("ESTADUAL") && <Row label="Ente público patrocinador" value={0} indent={2} />}
          <Row label="Dependentes" value={0} indent={1} />
          <Row label="Pensão alimentícia" value={0} indent={1} />
        </div>
        <Row label="Imposto retido" value={0} isBold />
        <div className="bg-surface-container-lowest/30">
          <Row label="Compensação judicial" value={0} isBold />
          <Row label="Ano-calendário" value={0} indent={1} />
          <Row label="Anos anteriores" value={0} indent={1} />
        </div>
        <div className="bg-surface-container-lowest/30">
          <Row label="Tributação com exigibilidade suspensa" value={0} isBold />
          <Row label="Rendimento" value={0} indent={1} />
          <Row label="Previdência oficial" value={0} indent={1} />
          {title.includes("ESTADUAL") && <Row label="Previdência complementar" value={0} indent={1} />}
          {title.includes("ESTADUAL") && <Row label="Previdência privada" value={0} indent={2} />}
          {title.includes("ESTADUAL") && <Row label="FAPI" value={0} indent={2} />}
          {title.includes("ESTADUAL") && <Row label="FUNPRESP" value={0} indent={2} />}
          {title.includes("ESTADUAL") && <Row label="Ente público patrocinador" value={0} indent={2} />}
          <Row label="Dependentes" value={0} indent={1} />
          <Row label="Pensão alimentícia" value={0} indent={1} />
          <Row label="IRRF" value={0} indent={1} />
          <Row label="Depósito judicial" value={0} indent={1} />
        </div>
        <Row label="Rendimentos/verbas não tributáveis / sem retenção" value={0} isBold />
        {!title.includes("TRABALHO") && (
          <>
            <Row label="Pensão, aposentadoria ou reforma por moléstia grave" value={0} indent={1} />
            <Row label="Rendimentos pagos sem retenção de IR na fonte - Lei nº 10.833/2003" value={0} indent={1} />
          </>
        )}
        <Row label="Juros de mora pagos, devidos pelo atraso no pagamento de remuneração" value={0} indent={1} />
      </div>
    </div>
  );

  return (
    <div className="flex flex-col gap-2">
      <div className="bg-surface-container-low px-6 py-3 rounded-t-sm border border-outline-variant flex items-center justify-between">
        <h2 className="text-xs font-bold text-on-surface uppercase tracking-wider">Processos da justiça</h2>
      </div>

      <div className="border-x border-b border-outline-variant bg-white pb-6">
        <CourtSection title="Justiça federal" />
        <CourtSection title="Justiça do trabalho" />
        <CourtSection title="Justiça estadual e do Distrito Federal" />
        
        <SectionHeader title="Rendimentos recebidos acumuladamente" />
        <div className="bg-white">
          <Row label="Quantidade de processos" value={0} />
          <Row label="Quantidade de beneficiários" value={0} />
          <Row label="Rendimentos tributáveis" value={0} isBold />
          <div className="bg-surface-container-lowest/30">
            <Row label="Deduções" value={0} isBold />
            <Row label="Previdência oficial" value={0} indent={1} />
            <Row label="Pensão alimentícia" value={0} indent={1} />
          </div>
          <Row label="Imposto retido" value={0} isBold />
          <Row label="Despesas com ação judicial" value={0} isBold />
          <Row label="Rendimentos/verbas não tributáveis" value={0} isBold />
          <Row label="Pensão, aposentadoria ou reforma por moléstia grave" value={0} indent={1} />
          <Row label="Parcela isenta aposentadoria acima de 65 anos" value={0} indent={1} />
          <Row label="Juros de mora pagos, devidos pelo atraso no pagamento de remuneração" value={0} indent={1} />
        </div>

        <div className="mt-8 px-6 text-[10px] text-secondary font-medium uppercase tracking-wider">
          Relação dos processos: 0
        </div>
      </div>
    </div>
  );
}

function RemessaTab({ data, onShowDetail }: any) {
  const Row = ({ label, value }: any) => (
    <div className="flex justify-between items-center py-2 border-b border-outline-variant/30 text-[11px] hover:bg-surface-container/20 transition-all pl-6">
      <span className="text-secondary font-medium">{label}</span>
      <span className="font-mono font-bold text-on-surface pr-6">
        {Number(value).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
      </span>
    </div>
  );

  return (
    <div className="flex flex-col gap-2">
      <div className="bg-surface-container-low px-4 py-3 rounded-t-sm border border-outline-variant flex items-center justify-between">
        <button 
          onClick={onShowDetail}
          className="text-xs font-bold text-primary flex items-center gap-2 hover:underline group"
        >
          Pagamentos a residentes ou domiciliados no exterior
          <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />
        </button>
      </div>
      
      <div className="border-x border-b border-outline-variant bg-white">
        <Row label="Rendimentos pagos" value={0} />
        <Row label="Imposto retido" value={0} />
      </div>
    </div>
  );
}

function RemessaDetailedView({ onBack }: any) {
  const format = (v: number) => v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <motion.div 
      initial={{ opacity: 0 }} 
      animate={{ opacity: 1 }}
      className="p-0 flex flex-col gap-2"
    >
      <div className="bg-surface-container-low px-4 py-3 rounded-t-sm border border-outline-variant flex flex-col gap-1">
        <button 
          onClick={onBack}
          className="text-xs font-bold text-primary flex items-center gap-2 hover:underline group w-fit"
        >
          Pagamentos a residentes ou domiciliados no exterior
          <ChevronRight size={14} className="rotate-180 group-hover:-translate-x-1 transition-transform" />
        </button>
        <span className="text-[10px] text-secondary font-medium">Detalhamento por código de receita</span>
      </div>

      <div className="border border-outline-variant rounded-sm overflow-x-auto bg-white">
        <table className="w-full text-left border-collapse min-w-[800px]">
          <thead>
            <tr className="bg-surface-container-lowest border-b border-outline-variant text-[10px] uppercase font-bold text-secondary tracking-widest">
              <th className="py-3 px-6">Código de receita</th>
              <th className="py-3 px-6 text-right">Rendimentos pagos</th>
              <th className="py-3 px-6 text-right">Imposto retido</th>
            </tr>
          </thead>
          <tbody className="text-[11px]">
            <tr className="bg-surface-container-low/30 font-bold text-on-surface">
              <td className="py-3 px-6">Total</td>
              <td className="py-3 px-6 text-right font-mono">{format(0)}</td>
              <td className="py-3 px-6 text-right font-mono">{format(0)}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </motion.div>
  );
}

function SociedadesTab({ data, onShowDetail }: any) {
  const Row = ({ label, value }: any) => (
    <div className="flex justify-between items-center py-2 border-b border-outline-variant/30 text-[11px] hover:bg-surface-container/20 transition-all pl-6">
      <span className="text-secondary font-medium">{label}</span>
      <span className="font-mono font-bold text-on-surface pr-6">
        {typeof value === "number" && !label.includes("Relação") && !label.includes("Sociedades") && !label.includes("Sócios") 
          ? value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) 
          : value}
      </span>
    </div>
  );

  return (
    <div className="flex flex-col gap-2">
      <div className="bg-surface-container-low px-4 py-3 rounded-t-sm border border-outline-variant flex items-center justify-between">
        <button 
          onClick={onShowDetail}
          className="text-xs font-bold text-primary flex items-center gap-2 hover:underline group"
        >
          Sociedades em conta de participação
          <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />
        </button>
      </div>
      
      <div className="border-x border-b border-outline-variant bg-white">
        <Row label="Sociedades" value={0} />
        <Row label="Sócios participantes" value={0} />
        <Row label="Lucros e dividendos pagos" value={0} />
        <Row label="Relação das sociedades em conta de participação:" value={0} />
      </div>
    </div>
  );
}

function SociedadesDetailedView({ onBack }: any) {
  const format = (v: number) => v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <motion.div 
      initial={{ opacity: 0 }} 
      animate={{ opacity: 1 }}
      className="p-0 flex flex-col gap-2"
    >
      <div className="bg-surface-container-low px-4 py-3 rounded-t-sm border border-outline-variant flex flex-col gap-1">
        <button 
          onClick={onBack}
          className="text-xs font-bold text-primary flex items-center gap-2 hover:underline group w-fit"
        >
          Sociedades em conta de participação
          <ChevronRight size={14} className="rotate-180 group-hover:-translate-x-1 transition-transform" />
        </button>
      </div>

      <div className="border border-outline-variant rounded-sm overflow-x-auto bg-white">
        <table className="w-full text-left border-collapse min-w-[800px]">
          <thead>
            <tr className="bg-surface-container-lowest border-b border-outline-variant text-[10px] uppercase font-bold text-secondary tracking-widest">
              <th className="py-3 px-6">CNPJ</th>
              <th className="py-3 px-6">Nome empresarial</th>
              <th className="py-3 px-6 text-right">Lucros e dividendos pagos</th>
              <th className="py-3 px-6 text-right">Sócios</th>
            </tr>
          </thead>
          <tbody className="text-[11px]">
            <tr className="bg-surface-container-low/30 font-bold text-on-surface">
              <td className="py-3 px-6">Total</td>
              <td className="py-3 px-6"></td>
              <td className="py-3 px-6 text-right font-mono">{format(0)}</td>
              <td className="py-3 px-6 text-right font-mono">{0}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </motion.div>
  );
}

function PlanoSaudeTab({ data }: any) {
  const Row = ({ label, value }: any) => (
    <div className="flex justify-between items-center py-2 border-b border-outline-variant/30 text-[11px] hover:bg-surface-container/20 transition-all pl-6">
      <span className="text-secondary font-medium">{label}</span>
      <span className="font-mono font-bold text-on-surface pr-6">
        {typeof value === "number" && !label.includes("Quantidade") && !label.includes("Relação")
          ? value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) 
          : value}
      </span>
    </div>
  );

  return (
    <div className="flex flex-col gap-2">
      <div className="bg-surface-container-low px-6 py-3 rounded-t-sm border border-outline-variant flex items-center justify-between">
        <h2 className="text-xs font-bold text-on-surface tracking-wider">Plano de assistência à saúde – coletivo empresarial</h2>
      </div>
      
      <div className="border-x border-b border-outline-variant bg-white pb-6">
        <Row label="Quantidade de titulares" value={166} />
        <Row label="Quantidade de dependentes" value={227} />
        <Row label="Valores pagos por titulares" value={139150.84} />
        <Row label="Valores de reembolso dos titulares" value={0} />
        <Row label="Valores pagos por dependentes" value={128572.38} />
        <Row label="Valores de reembolso dos dependentes" value={0} />
        
        <div className="mt-8 px-6 text-[11px] flex justify-between items-center group hover:bg-surface-container/20 transition-all py-2 border-b border-outline-variant/30">
          <span className="text-secondary font-medium">Relação das operadoras de saúde:</span>
          <span className="font-mono font-bold text-on-surface pr-6">3</span>
        </div>
      </div>
    </div>
  );
}

function TrabalhadoresTab({ data, isLoading, selectedYear, selectedMonth }: any) {
  const format = (v: any) => Number(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <Loader2 className="animate-spin text-primary w-8 h-8" />
        <p className="text-secondary text-xs italic">Carregando detalhamento por trabalhador...</p>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="py-20 text-center flex flex-col items-center gap-4">
        <Info className="text-secondary opacity-20 w-12 h-12" />
        <p className="text-secondary text-xs italic">Nenhum dado detalhado encontrado para este período.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 w-full overflow-hidden">
      <div className="bg-surface-container-low px-4 py-3 rounded-t-sm border border-outline-variant flex flex-col gap-1">
        <h2 className="text-xs font-bold text-on-surface uppercase tracking-wider">Listagem de Beneficiários e Rendimentos</h2>
        <span className="text-[10px] text-secondary font-medium">Dados consolidados individuais - {selectedMonth ? `${selectedMonth}/${selectedYear}` : `Ano ${selectedYear}`}</span>
      </div>

      <div className="border border-outline-variant rounded-sm overflow-x-auto bg-white max-w-full scrollbar-thin">
        <table className="w-full text-left border-collapse min-w-[1000px] table-fixed">
          <thead>
            <tr className="bg-surface-container-lowest border-b border-outline-variant text-[10px] uppercase font-bold text-secondary tracking-widest">
              <th className="py-3 px-6 sticky left-0 bg-surface-container-lowest z-20 border-r border-outline-variant/30 text-left w-[280px]">Beneficiário</th>
              <th className="py-3 px-4 text-right w-[140px]">Rend. Tributável</th>
              <th className="py-3 px-4 text-right w-[120px]">Prev. Oficial</th>
              <th className="py-3 px-4 text-right w-[120px]">Dedução Dep.</th>
              <th className="py-3 px-4 text-right w-[120px]">Pensão Alim.</th>
              <th className="py-3 px-4 text-right w-[120px]">Plano Saúde</th>
              <th className="py-3 px-6 text-right w-[140px]">IRRF Retido</th>
            </tr>
          </thead>
          <tbody className="text-[11px]">
            {data.map((item: any, idx: number) => {
              // Processar dados dos dependentes para este trabalhador
              const dependentesMap = new Map<string, any>();
              let totalPlanoSaudeDep = 0;

              // Extrair do evento de origem
              const pas = item.eventoOrigem?.s5002?.periodosAnteriores || [];
              pas.forEach((pa: any) => {
                // Info CR (Deduções e Pensões)
                pa.infoCR?.forEach((icr: any) => {
                  icr.deducoesDependente?.forEach((dd: any) => {
                    const key = dd.dependenteId || dd.cpfDep || "unknown";
                    const existing = dependentesMap.get(key) || { nome: dd.dependente?.nome || "DEPENDENTE", cpf: dd.cpfDep, dedDep: 0, pensao: 0, planoSaude: 0 };
                    existing.dedDep += Number(dd.vlrDedDep || 0);
                    dependentesMap.set(key, existing);
                  });
                  icr.pensoes?.forEach((p: any) => {
                    const key = p.dependenteId || p.cpfDep || "unknown";
                    const existing = dependentesMap.get(key) || { nome: p.dependente?.nome || "DEPENDENTE", cpf: p.cpfDep, dedDep: 0, pensao: 0, planoSaude: 0 };
                    existing.pensao += Number(p.vlrDedPenAlim || 0);
                    dependentesMap.set(key, existing);
                  });
                });

                // Planos de Saúde
                pa.planosSaude?.forEach((ps: any) => {
                  ps.dependentes?.forEach((dps: any) => {
                    const key = dps.dependenteId || dps.cpfDep || "unknown";
                    const val = Number(dps.vlrSaudeDep || 0);
                    const existing = dependentesMap.get(key) || { nome: dps.dependente?.nome || "DEPENDENTE", cpf: dps.cpfDep, dedDep: 0, pensao: 0, planoSaude: 0 };
                    existing.planoSaude += val;
                    totalPlanoSaudeDep += val;
                    dependentesMap.set(key, existing);
                  });
                });
              });

              const depsList = Array.from(dependentesMap.values());
              const vlrPlanoSaudeTitular = Math.max(0, Number(item.vlrPlanoSaude || 0) - totalPlanoSaudeDep);

              return (
                <React.Fragment key={idx}>
                  {/* Linha do Trabalhador */}
                  <tr className="border-b border-outline-variant/30 hover:bg-surface-container/10 transition-all font-medium text-secondary group bg-surface-container-lowest/30">
                    <td className="py-3 px-6 sticky left-0 bg-white group-hover:bg-surface-container-lowest z-10 border-r border-outline-variant/30">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-[10px]">
                          TR
                        </div>
                        <div className="flex flex-col">
                          <span className="text-on-surface font-bold uppercase truncate max-w-[200px]">{item.trabalhador?.nome || "BENEFICIÁRIO"}</span>
                          <span className="text-[9px] font-mono">{item.trabalhador?.cpf || item.eventoOrigem?.cpfBenef || "---"}</span>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-on-surface">{format(item.vlrRendTrib)}</td>
                    <td className="py-3 px-4 text-right font-mono text-on-surface">{format(item.vlrPrevOficial)}</td>
                    <td className="py-3 px-4 text-right font-mono text-secondary opacity-50">---</td>
                    <td className="py-3 px-4 text-right font-mono text-secondary opacity-50">---</td>
                    <td className="py-3 px-4 text-right font-mono text-on-surface">{format(vlrPlanoSaudeTitular)}</td>
                    <td className="py-3 px-6 text-right font-mono font-bold text-primary">{format(item.vlrIrrf)}</td>
                  </tr>

                  {/* Linhas dos Dependentes */}
                  {depsList.map((dep, dIdx) => (
                    <tr key={`${idx}-dep-${dIdx}`} className="border-b border-outline-variant/10 hover:bg-surface-container/5 transition-all text-secondary italic bg-surface-container-lowest/5">
                      <td className="py-2 px-6 pl-10 sticky left-0 bg-white group-hover:bg-surface-container-lowest z-10 border-r border-outline-variant/30">
                        <div className="flex flex-col pl-4 border-l-2 border-primary/20">
                          <span className="text-[10px] font-bold uppercase truncate max-w-[180px] flex items-center gap-2">
                             {dep.nome}
                          </span>
                          <span className="text-[8px] font-mono">CPF: {dep.cpf || "---"}</span>
                        </div>
                      </td>
                      <td className="py-2 px-4 text-right font-mono text-secondary/30">---</td>
                      <td className="py-2 px-4 text-right font-mono text-secondary/30">---</td>
                      <td className="py-2 px-4 text-right font-mono text-on-surface font-semibold">{format(dep.dedDep)}</td>
                      <td className="py-2 px-4 text-right font-mono text-on-surface font-semibold">{format(dep.pensao)}</td>
                      <td className="py-2 px-4 text-right font-mono text-on-surface font-semibold">{format(dep.planoSaude)}</td>
                      <td className="py-2 px-6 text-right font-mono text-secondary/30">---</td>
                    </tr>
                  ))}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}


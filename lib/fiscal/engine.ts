import { prisma } from "@/lib/prisma";
import { FiscalClassificationRegistry, FiscalNature } from "./classification";
export { FiscalNature };

export enum StatusFiscal {
  ATIVO = "ATIVO",
  SUBSTITUIDO = "SUBSTITUIDO",
  RETIFICADO = "RETIFICADO",
  DUPLICADO = "DUPLICADO",
  EXCLUIDO = "EXCLUIDO",
  RETIFICADO_COMPLEMENTAR = "RETIFICADO_COMPLEMENTAR"
}

export interface FiscalVersionHistory {
  origem: string;
  recibo: string;
  versao: string;
  substituidoPor?: string;
  regraAplicada: string;
  timestamp: string;
}

export interface AuditEntry {
  trabalhador: string;
  cpf: string;
  perApur: string; // Keeps competence for backwards compatibility
  origemTabela: string;
  origemId: string;
  categoriaFiscal: string;
  fiscalNature: FiscalNature;
  codigoOficial: string;
  descricaoOficial: string;
  cr: string;
  valor: number;
  metadata: Record<string, any>;
  // Backwards compatibility aliases
  tpCR: string;
  tpInfoIR: string;
  origem: string;
  // Audit Explainability Fields
  grupo?: "ANALITICO" | "CONSOLIDADO";
  regraAplicada?: string;
  motivoInclusao?: string;
  motivoExclusao?: string;
  houveDeduplicacao?: boolean;
  valorOriginal?: number;
  incluido?: boolean; // For backwards compatibility
  // New S-5002 Advanced Governance Fields
  ativoFiscal?: boolean;
  statusFiscal?: StatusFiscal;
  perFiscal?: string;
  perApurEvento?: string;
  historicoFiscal?: FiscalVersionHistory[];
  valorCompoeBase?: boolean;
}

export interface FiscalDivergencia {
  tipo: string;
  descricao: string;
  severidade: "BAIXA" | "MEDIA" | "ALTA" | "CRITICA";
}

export class FiscalEngine {
  private static readonly defaultTpInfoIR: Record<string, { label: string; nature: FiscalNature }> = 
    Object.fromEntries(
      FiscalClassificationRegistry.map((item) => [
        item.tpInfoIR,
        { label: item.label, nature: item.nature }
      ])
    );

  private static defaultCR: Record<string, string> = {
    "0561": "IRRF - Rendimentos do Trabalho Assalariado no País e no Exterior (Mensal)",
    "056107": "IRRF - Rendimentos de Trabalho Assalariado (Mensal - Tabela Progressiva)",
    "056108": "IRRF - Rendimentos de Trabalho Assalariado (13º salário progressivo)",
    "0588": "IRRF - Rendimentos do Trabalho Sem Vínculo Empregatício",
    "3562": "IRRF - Participação dos Trabalhadores in Lucros ou Resultados (PLR)",
    "1889": "IRRF - Rendimentos Acumulados - Art. 12-A da Lei nº 7.713/1988",
  };

  /**
   * Resolve o período fiscal real do eSocial.
   */
  public static resolvePeriodoFiscalReal(perApurEvento: string, perRefAjuste?: string | null): string {
    if (perRefAjuste) {
      return perRefAjuste;
    }
    return perApurEvento;
  }

  /**
   * Classifica unicamente o tpInfoIR estendendo com Tabela 80.
   */
  public static async classifyInfoIR(tpInfoIR: string): Promise<{ label: string; nature: FiscalNature }> {
    const dbMatch = await prisma.esocialTabela80.findFirst({
      where: { codigo: tpInfoIR }
    });

    const fallback = this.defaultTpInfoIR[tpInfoIR] || {
      label: `Outros Rendimentos/Informações (${tpInfoIR})`,
      nature: FiscalNature.OUTROS
    };

    return {
      label: dbMatch?.descricao || fallback.label,
      nature: fallback.nature
    };
  }

  /**
   * Classifica o CR usando Tabela 78.
   */
  public static async classifyTotApur(crMen: string): Promise<{ label: string; nature: FiscalNature }> {
    const dbMatch = await prisma.esocialTabela78.findFirst({
      where: { codigo: crMen }
    });

    const label = dbMatch?.descricao || this.defaultCR[crMen] || `Código de Receita ${crMen}`;
    return {
      label,
      nature: FiscalNature.IRRF_RETIDO
    };
  }

  /**
   * Classifica dedução por dependente de acordo com tpRend resolvendo descrições do registro mestre de forma dinâmica.
   */
  public static classifyDeducao(tpRend?: string): { label: string; nature: FiscalNature } {
    const matched = tpRend ? this.defaultTpInfoIR[tpRend] : null;
    const streamLabel = matched ? ` (${matched.label})` : "";
    return {
      label: `Dedução por Dependente${streamLabel}`,
      nature: FiscalNature.DEPENDENTE
    };
  }

  /**
   * Classifica plano de saúde de acordo com CNPJ e operadora, resolvendo descrições do registro mestre de forma dinâmica.
   */
  public static classifyPlanoSaude(cnpj?: string, nomeOperadora?: string | null, cpfDep?: string | null, tpRend: string = "67"): { label: string; nature: FiscalNature } {
    const matched = this.defaultTpInfoIR[tpRend];
    const baseLabel = matched?.label || "Plano privado coletivo de assistência à saúde";
    const nameStr = nomeOperadora ? ` - ${nomeOperadora}` : "";
    const depStr = cpfDep ? `, CPF Dep: ${cpfDep}` : "";
    const typeStr = cpfDep ? "Dependente" : "Titular";
    return {
      label: `${baseLabel} - ${typeStr} (CNPJ Operadora: ${cnpj || "---"}${nameStr}${depStr})`,
      nature: matched?.nature || FiscalNature.PLANO_SAUDE
    };
  }

  /**
   * Classifica pensão de acordo com tpRend ou parâmetros, resolvendo descrições do registro mestre de forma dinâmica.
   */
  public static classifyPensao(tpRend?: string): { label: string; nature: FiscalNature } {
    let target = tpRend;
    if (tpRend === "11") target = "51";
    else if (tpRend === "12") target = "52";
    else if (tpRend === "13") target = "53";
    else if (tpRend === "14") target = "54";
    else if (tpRend === "15") target = "55";

    const matched = target ? this.defaultTpInfoIR[target] : null;
    return {
      label: matched?.label || "Dedução por Pensão Alimentícia",
      nature: FiscalNature.PENSAO
    };
  }

  /**
   * Resolve o evento eSocial vigente respeitando Ativo e Retificações
   */
  public static async resolveEventoFiscalVigente(empresaId: string, perApurPattern: string | any) {
    const activeEvents = await prisma.esocialEvento.findMany({
      where: {
        empresaId,
        perApur: perApurPattern,
        ativo: true,
        substituidoPorId: null,
        tpEvento: "S-5002"
      },
      select: {
        id: true,
        nrRecibo: true,
        indRetif: true,
        nrReciboOrig: true,
        trabalhadorId: true,
        perApur: true
      }
    });

    const uniqueMap = new Map<string, typeof activeEvents[0]>();
    
    // Group active events by worker and período
    const groups = new Map<string, typeof activeEvents>();
    for (const evt of activeEvents) {
      const key = `${evt.trabalhadorId}_${evt.perApur}`;
      const list = groups.get(key) || [];
      list.push(evt);
      groups.set(key, list);
    }

    for (const [key, list] of groups.entries()) {
      if (list.length === 1) {
        uniqueMap.set(key, list[0]);
        continue;
      }

      // If we have multiple, prefer the document that has no successor in the current set (no other event links to its nrRecibo as nrReciboOrig)
      let winner = list[0];
      for (const candidate of list) {
        const hasSuccessor = list.some(other => other.nrReciboOrig && other.nrReciboOrig === candidate.nrRecibo);
        if (!hasSuccessor) {
          if (!winner || (candidate.indRetif || 0) > (winner.indRetif || 0)) {
            winner = candidate;
          }
        }
      }
      uniqueMap.set(key, winner);
    }

    return Array.from(uniqueMap.values());
  }

  private static isDocumentalRetification(older: AuditEntry, newer: AuditEntry): boolean {
    const olderRecibo = older.metadata?.nrRecibo || older.metadata?.recibo;
    const newerReciboOrig = newer.metadata?.nrReciboOrig;
    const newerIndRetif = Number(newer.metadata?.indRetif || 0);

    if (!olderRecibo || !newerReciboOrig) {
      return false;
    }

    // eSocial: indRetif > 1 indicates retification
    const hasRetifFlag = newerIndRetif > 1;
    const hasDocumentLineage = newerReciboOrig === olderRecibo;

    // Check if they represent the same core identity
    const sameCore = 
      older.cpf === newer.cpf &&
      older.perFiscal === newer.perFiscal &&
      older.fiscalNature === newer.fiscalNature &&
      older.codigoOficial === newer.codigoOficial &&
      older.cr === newer.cr &&
      (older.metadata?.ideDmDev === newer.metadata?.ideDmDev) &&
      (older.metadata?.cpfDep === newer.metadata?.cpfDep) &&
      older.origemTabela === newer.origemTabela;

    return hasRetifFlag && hasDocumentLineage && sameCore;
  }

  private static isComplementaryPerAntRetification(older: AuditEntry, newer: AuditEntry): boolean {
    const newerPerApurEvento = newer.perApurEvento || "";
    const newerPerFiscal = newer.perFiscal || "";
    const newerPerRefAjuste = newer.metadata?.perRefAjuste || newer.metadata?.perRef;
    const newerNrRec1210Orig = newer.metadata?.nrRec1210Orig;

    if (newerPerApurEvento === newerPerFiscal) {
      return false;
    }
    if (!newerPerRefAjuste || !newerNrRec1210Orig) {
      return false;
    }

    const olderRecibo = older.metadata?.nrRecibo || older.metadata?.recibo;
    if (!olderRecibo || olderRecibo !== newerNrRec1210Orig) {
      return false;
    }

    // Check same core identity granularly
    const sameCore = 
      older.cpf === newer.cpf &&
      older.perFiscal === newer.perFiscal &&
      older.fiscalNature === newer.fiscalNature &&
      older.codigoOficial === newer.codigoOficial &&
      older.cr === newer.cr &&
      (older.metadata?.ideDmDev === newer.metadata?.ideDmDev) &&
      (older.metadata?.cpfDep === newer.metadata?.cpfDep) &&
      (older.metadata?.tpRendOriginal === newer.metadata?.tpRendOriginal) &&
      older.origemTabela === newer.origemTabela;

    return sameCore;
  }

  /**
   * Resolve a sobreposição de retificações complementares (Janeiro do ano seguinte ou subsequente).
   */
  public static resolveRetificacaoFiscal(candidates: AuditEntry[]): void {
    const documentGroups = new Map<string, AuditEntry>();
    for (const entry of candidates) {
      const cpf = entry.cpf || "";
      const perFiscal = entry.perFiscal || "";
      const fiscalNature = entry.fiscalNature || "";
      const codigoOficial = entry.codigoOficial || "";
      const cr = entry.cr || "";
      const ideDmDev = entry.metadata?.ideDmDev || "";
      const cpfBeneficiario = entry.metadata?.cpfDep || "";
      const origemTabela = entry.origemTabela || "";
      const nrRecibo = entry.metadata?.nrRecibo || entry.metadata?.recibo || "";
      const nrReciboOrig = entry.metadata?.nrReciboOrig || "";
      const indRetif = String(entry.metadata?.indRetif ?? "");
      const eventoId = entry.metadata?.eventoId || "";

      // complementaryResolutionKey
      const compKey = `${cpf}_${perFiscal}_${fiscalNature}_${codigoOficial}_${cr}_${ideDmDev}_${cpfBeneficiario}_${origemTabela}_${nrRecibo}_${nrReciboOrig}_${indRetif}_${eventoId}`;
      documentGroups.set(compKey, entry);
    }

    const uniqueEntries = Array.from(documentGroups.values());

    for (const entry of candidates) {
      // Find successor representing a real documental retification
      const successor = uniqueEntries.find(candidate => 
        this.isDocumentalRetification(entry, candidate)
      );

      if (successor) {
        entry.ativoFiscal = false;
        entry.incluido = false;
        entry.statusFiscal = StatusFiscal.SUBSTITUIDO;
        entry.regraAplicada = "Retificação Complementar Resolvida (Substituído)";
        entry.motivoExclusao = `Substituído pela retificação complementar posterior do recibo ${successor.metadata?.nrRecibo || successor.metadata?.recibo} (IndRetif: ${successor.metadata?.indRetif}).`;

        if (!successor.historicoFiscal) {
          successor.historicoFiscal = [];
        }
        successor.historicoFiscal.push({
          origem: entry.origem || entry.origemTabela,
          recibo: entry.metadata?.recibo || "SUBSTITUIDO",
          versao: String(entry.metadata?.versao || "0"),
          substituidoPor: successor.metadata?.recibo || "NOVO",
          regraAplicada: "Retificação de Granularidade por Sobreposição Documental",
          timestamp: new Date().toISOString()
        });
      } else {
        entry.ativoFiscal = true;
        entry.incluido = true;
        
        // Check if there is a predecessor (replaces some other document)
        const hasPredecessor = uniqueEntries.some(candidate => 
          this.isDocumentalRetification(candidate, entry)
        );
        
        if (hasPredecessor) {
          entry.statusFiscal = StatusFiscal.RETIFICADO;
          entry.regraAplicada = "Retificação Complementar Resolvida (Ativa)";
          entry.motivoInclusao = `Ajuste complementar do recibo de origem ativo.`;
        } else {
          entry.statusFiscal = StatusFiscal.ATIVO;
        }
      }
    }
  }

  private static getBusinessKey(entry: AuditEntry): string {
    const cpf = entry.cpf || "";
    const perFiscal = entry.perFiscal || "";
    const nature = entry.fiscalNature || "";
    const cpfDep = entry.metadata?.cpfDep || "";
    const tpRend = entry.metadata?.tpRendOriginal || entry.codigoOficial || entry.tpInfoIR || "";
    const cnpjOper = entry.metadata?.cnpjOper || "";
    const regANS = entry.metadata?.regANS || "";
    const origemTabela = entry.origemTabela || "";
    return `${cpf}_${perFiscal}_${nature}_${cpfDep}_${tpRend}_${cnpjOper}_${regANS}_${origemTabela}`;
  }

  /**
   * Pipeline de governança para Retificação Complementar perAnt (Tipo B)
   */
  public static resolveComplementaryPerAntRetification(candidates: AuditEntry[], allS5002Eventos?: any[]): void {
    const adjustedReceipts = new Set<string>();
    const adjustedPeriodsForWorker = new Set<string>(); // "cpf-perFiscal"

    const infoIRComplemTables = new Set([
      "s5002_periodo_ded_dep",
      "s5002_periodo_pensao",
      "s5002_periodo_plano_saude",
      "s5002_periodo_plano_saude_dep"
    ]);

    for (const entry of candidates) {
      if (entry.perApurEvento !== entry.perFiscal && infoIRComplemTables.has(entry.origemTabela || "")) {
        if (entry.metadata?.nrRec1210Orig) {
          adjustedReceipts.add(entry.metadata.nrRec1210Orig);
        }
        if (entry.cpf && entry.perFiscal) {
          adjustedPeriodsForWorker.add(`${entry.cpf}-${entry.perFiscal}`);
        }
      }
    }

    // Capture adjusted periods and receipts directly from the database event models to ensure that even empty adjustment periods 
    // (periods where everything was removed, e.g. no pension/dependent/health anymore) are correctly resolved and deactivate original details.
    if (allS5002Eventos) {
      for (const evt of allS5002Eventos) {
        const perApurEvento = evt.perApur;
        const workerCpf = evt.trabalhador?.cpf;
        if (!workerCpf) continue;

        for (const pa of evt.periodosAnteriores || []) {
          const perFiscal = pa.perRefAjuste;
          if (perApurEvento !== perFiscal) {
            if (pa.nrRec1210Orig) {
              adjustedReceipts.add(pa.nrRec1210Orig);
            }
            adjustedPeriodsForWorker.add(`${workerCpf}-${perFiscal}`);
          }
        }
      }
    }

    // Process each adjusted worker and period granularly (hybrid: absence / succession / identity)
    for (const workerPeriodKey of adjustedPeriodsForWorker) {
      const [workerCpf, perFiscal] = workerPeriodKey.split("-");

      // Filter candidates for this specific worker and perFiscal which belong to infoIRComplem
      const groupEntries = candidates.filter(e => 
        e.cpf === workerCpf && 
        e.perFiscal === perFiscal &&
        infoIRComplemTables.has(e.origemTabela || "")
      );

      const originals = groupEntries.filter(e => e.perApurEvento === e.perFiscal);
      const retros = groupEntries.filter(e => e.perApurEvento !== e.perFiscal);

      // Map retros by business key
      const retrosByBizKey = new Map<string, AuditEntry>();
      for (const retro of retros) {
        retrosByBizKey.set(this.getBusinessKey(retro), retro);
      }

      // Loop through originals to detect those that are absent or altered/identical
      for (const orig of originals) {
        const bizKey = this.getBusinessKey(orig);
        const retroItem = retrosByBizKey.get(bizKey);

        if (!retroItem) {
          // A) AUSÊNCIA: Not present in the adjustment block
          orig.ativoFiscal = true;
          orig.incluido = true;
          orig.valorCompoeBase = false;
          orig.statusFiscal = StatusFiscal.ATIVO;
          orig.regraAplicada = "Precedência Complementar perAnt (Ausência)";
          orig.motivoInclusao = "Dedução revogada por ausência no XML complementar perAnt.";

          if (!orig.historicoFiscal) {
            orig.historicoFiscal = [];
          }
          orig.historicoFiscal.push({
            origem: orig.origem || orig.origemTabela,
            recibo: orig.metadata?.nrRecibo || orig.metadata?.recibo,
            versao: String(orig.metadata?.versao || "0"),
            regraAplicada: "Revogado por Ausência no Ajuste de Período Anterior (<perAnt>)",
            timestamp: new Date().toISOString()
          });
        } else {
          // B) PRESENT IN BOTH: Identical or Altered
          const isIdentical = orig.valor === retroItem.valor;
          orig.ativoFiscal = true;
          orig.incluido = true;
          orig.valorCompoeBase = false; // Original always inactive in favor of adjustment
          orig.statusFiscal = StatusFiscal.ATIVO;
          orig.regraAplicada = isIdentical 
            ? "Precedência Complementar perAnt (Identico)" 
            : "Precedência Complementar perAnt (Alterado)";
          orig.motivoInclusao = isIdentical
            ? "Lastro documental preservado de forma inativa pela prevalência do ajuste complementar idêntico."
            : "Lastro documental preservado de forma inativa devido à alteração de valor/composição.";

          if (!orig.historicoFiscal) {
            orig.historicoFiscal = [];
          }
          orig.historicoFiscal.push({
            origem: orig.origem || orig.origemTabela,
            recibo: orig.metadata?.nrRecibo || orig.metadata?.recibo,
            versao: String(orig.metadata?.versao || "0"),
            regraAplicada: isIdentical 
              ? "Sobreposto por Ajuste Idêntico de Período Anterior" 
              : "Sobreposto por Ajuste Alterado de Período Anterior",
            timestamp: new Date().toISOString()
          });
        }
      }

      // Loop through retros: they are always active in favor of the adjustment
      for (const retro of retros) {
        retro.ativoFiscal = true;
        retro.incluido = true;
        retro.valorCompoeBase = true;
        retro.statusFiscal = StatusFiscal.RETIFICADO_COMPLEMENTAR;
        retro.regraAplicada = "Retificação Complementar Resolvida (Ativa)";
        retro.motivoInclusao = "Ajuste complementar do recibo de origem ativo.";
      }
    }
  }

  /**
   * Identifica mudanças jurídicas semânticas, como alteração de beneficiários ou exclusões
   * sem variação necessariamente numérica.
   */
  public static resolveSemanticRetification(candidates: AuditEntry[]): void {
    const workerGroups = new Map<string, AuditEntry[]>();
    for (const entry of candidates) {
      const key = `${entry.cpf}_${entry.perFiscal}`;
      const list = workerGroups.get(key) || [];
      list.push(entry);
      workerGroups.set(key, list);
    }

    for (const [_, entries] of workerGroups.entries()) {
      // Compara se o grupo analítico possui transição de dependente para pensionista, etc.
      const dependents = entries.filter(e => e.fiscalNature === FiscalNature.DEPENDENTE);
      const pensions = entries.filter(e => e.fiscalNature === FiscalNature.PENSAO);

      for (const dep of dependents) {
        if (!dep.ativoFiscal && dep.statusFiscal === StatusFiscal.SUBSTITUIDO) {
          // Verifica se o mesmo CPF de dependente agora aparece como pensão em um evento ativo
          const cpfDep = dep.metadata?.cpfDep;
          if (cpfDep) {
            const correspondingPension = pensions.find(p => p.ativoFiscal && p.metadata?.cpfDep === cpfDep);
            if (correspondingPension) {
              dep.regraAplicada = "Resolução Semântica - Transição de Dependente para Pensionista";
              dep.motivoExclusao = `Substituição jurídica: o dependente CPF ${cpfDep} foi convertido em alimentando pensionista.`;
              correspondingPension.regraAplicada = "Resolução Semântica - Transição de Dependente para Pensionista (Ativo)";
              correspondingPension.motivoInclusao = `Inclusão fiscal: beneficiário CPF ${cpfDep} agora qualificado como alimentando.`;
            }
          }
        }
      }
    }
  }

  /**
   * Aplica o algoritmo de Precedência Normativa:
   * Detalhes Analíticos (Nível 1/2) de alta fidelidade > Consolidado Declarado (Nível 3)
   */
  public static resolvePrecedenciaFiscal(candidates: AuditEntry[]): void {
    const levelNatures = new Set([FiscalNature.DEPENDENTE, FiscalNature.PENSAO, FiscalNature.PLANO_SAUDE]);

    // 1. Identificar para quais trabalhadores + períodos + naturezas existem registros ANALÍTICOS ativos
    const hasAnaliticoMap = new Set<string>();
    for (const entry of candidates) {
      if (entry.grupo === "ANALITICO" && entry.ativoFiscal !== false && levelNatures.has(entry.fiscalNature)) {
        const key = `${entry.cpf}_${entry.perFiscal}_${entry.fiscalNature}`;
        hasAnaliticoMap.add(key);
      }
    }

    // 2. Aplicar precedência de maior fidelidade: se houver registros ANALÍTICOS para o escopo (trabalhador/competência/natureza),
    // eles são priorizados como composição ativa (valorCompoeBase = true). O respectivo CONSOLIDADO passa a ser
    // meramente informativo/declarativo para coexistência e trilha de auditoria (valorCompoeBase = false).
    // Se NÃO houver registros analíticos, o CONSOLIDADO é a fonte primária de base (valorCompoeBase = true).
    for (const entry of candidates) {
      if (levelNatures.has(entry.fiscalNature)) {
        const key = `${entry.cpf}_${entry.perFiscal}_${entry.fiscalNature}`;
        const hasAnaliticoInScope = hasAnaliticoMap.has(key);

        if (entry.grupo === "CONSOLIDADO") {
          if (hasAnaliticoInScope) {
            entry.valorCompoeBase = false; // Detalhes ganham!
            entry.regraAplicada = "Precedência Normativa - Lastro de Detalhes Analíticos";
            entry.motivoInclusao = "Coexiste como lastro declarativo do montante analítico detalhado.";
          } else {
            entry.valorCompoeBase = true;
          }
        } else if (entry.grupo === "ANALITICO" && entry.ativoFiscal !== false) {
          if (entry.valorCompoeBase !== false) {
            entry.valorCompoeBase = true;
            entry.regraAplicada = "Precedência Normativa - Preferência Granular Ativa";
            entry.motivoInclusao = "Utilizado como fonte de composição primária de alta fidelidade.";
          }
        }
      }
    }

    // 3. E quanto a múltiplas retificações ou múltiplos períodos no próprio grupo ANALÍTICO?
    // Ex: Se temos múltiplos registros analíticos para o mesmo dependente/período/CPF,
    // o ajuste analítico retroativo/complementar (Level 1) prevalece financeiramente sobre o analítico corrente (Level 2).
    const workerGroups = new Map<string, AuditEntry[]>();
    for (const entry of candidates) {
      if (entry.grupo === "ANALITICO" && entry.ativoFiscal !== false && levelNatures.has(entry.fiscalNature)) {
        const cpfDep = entry.metadata?.cpfDep || "";
        const tpRendOriginal = entry.metadata?.tpRendOriginal || "";
        const cr = entry.cr || "";
        const origemTabela = entry.origemTabela || "";
        const key = `${entry.cpf}_${entry.perFiscal}_${entry.fiscalNature}_${cpfDep}_${tpRendOriginal}_${cr}_${origemTabela}`;
        const list = workerGroups.get(key) || [];
        list.push(entry);
        workerGroups.set(key, list);
      }
    }

    for (const [key, entries] of workerGroups.entries()) {
      const activeEntries = entries.filter(e => e.ativoFiscal !== false);
      if (activeEntries.length <= 1) continue;

      const hasLevel1 = activeEntries.some(e => e.perApurEvento !== e.perFiscal);
      if (hasLevel1) {
        for (const entry of activeEntries) {
          if (entry.perApurEvento === entry.perFiscal) {
            entry.valorCompoeBase = false;
            entry.regraAplicada = "Precedência Normativa - Prevalece Ajuste Analítico Retroativo";
            entry.motivoInclusao = "Mantido como lastro, com preferência financeira aos detalhes da retificação retroativa (Nível 1).";
          } else {
            entry.valorCompoeBase = true;
            entry.regraAplicada = "Precedência Normativa - Ajuste Analítico Ativo";
            entry.motivoInclusao = "Utilizado como fonte de valor atualizado vindo de ajuste retificador retroativo.";
          }
        }
      }
    }
  }

  /**
   * Deduplicação Fiscal Inteligente com Chaves por Natureza.
   */
  public static resolveDeduplicacaoNatureza(candidates: AuditEntry[]): void {
    const seenKeys = new Set<string>();

    for (const entry of candidates) {
      if (entry.ativoFiscal === false) continue; // Skip already excluded/substituted records
      if (entry.valorCompoeBase === false) continue; // Skip preserved lastro entries to prevent deduplication with actively accounted ones

      let dupKey = "";
      const cpfBenef = entry.cpf;
      const perFiscal = entry.perFiscal || entry.perApur;
      const nature = entry.fiscalNature;

      if (nature === FiscalNature.DEPENDENTE) {
        const cpfDep = entry.metadata?.cpfDep || "TITULAR";
        const tpRend = entry.metadata?.tpRendOriginal || entry.tpInfoIR || "11";
        dupKey = `DEP_${cpfBenef}_${perFiscal}_${cpfDep}_${tpRend}_${nature}`;

      } else if (nature === FiscalNature.PENSAO) {
        const cpfAlimentando = entry.metadata?.cpfDep || "ALIMENTANDO";
        const tpRend = entry.metadata?.tpRendOriginal || entry.tpInfoIR || "11";
        const ideDmDev = entry.metadata?.ideDmDev || "NO_DM";
        if (entry.grupo === "CONSOLIDADO") {
          dupKey = `PEN_${cpfBenef}_${perFiscal}_CONSOLIDADO_${ideDmDev}_${tpRend}_${nature}`;
        } else {
          dupKey = `PEN_${cpfBenef}_${perFiscal}_${cpfAlimentando}_${tpRend}_${nature}`;
        }

      } else if (nature === FiscalNature.PLANO_SAUDE) {
        const cnpjOper = entry.metadata?.cnpjOper || "NO_CNPJ";
        const regANS = entry.metadata?.regANS || "NO_ANS";
        const isDep = entry.origemTabela === "s5002_periodo_plano_saude_dep";
        const cpfDep = entry.metadata?.cpfDep || "TITULAR";
        dupKey = `SAUDE_${cpfBenef}_${perFiscal}_${cnpjOper}_${regANS}_${isDep ? "DEP_" + cpfDep : "TIT"}`;

      } else if (nature === FiscalNature.IRRF_RETIDO) {
        const cr = entry.cr || entry.tpCR || "";
        dupKey = `IRRF_${cpfBenef}_${perFiscal}_${cr}_${nature}`;

      } else {
        // Naturezas genéricas (Rendimentos tributáveis, Isentos, Outros)
        const code = entry.codigoOficial || entry.tpInfoIR || "";
        const valStr = entry.valorOriginal?.toFixed(2) || "0.00";
        const ideDmDev = entry.metadata?.ideDmDev || "NO_DM";
        dupKey = `GEN_${cpfBenef}_${perFiscal}_${code}_${nature}_${entry.origemTabela}_${ideDmDev}_${valStr}`;
      }

      if (seenKeys.has(dupKey)) {
        entry.ativoFiscal = false;
        entry.incluido = false;
        entry.statusFiscal = StatusFiscal.DUPLICADO;
        entry.houveDeduplicacao = true;
        entry.regraAplicada = "Deduplicação de Natureza Fiscal Exclusiva";
        entry.motivoExclusao = "Chave fiscal idêntica detectada. Registro rejeitado para evitar contagem dupla.";
      } else {
        seenKeys.add(dupKey);
      }
    }
  }

  /**
   * Constrói a trilha de auditoria fiscal robusta e 100% categorizada
   */
  public static async buildAuditTrail(empresaId: string, ano: string, mes?: string, trabalhadorId?: string | null): Promise<AuditEntry[]> {
    // 1. Resolver eventos vigentes para o período
    let perApurPattern: string | any = mes ? `${ano}-${mes}` : { startsWith: ano };
    const vigenteEvents = await this.resolveEventoFiscalVigente(empresaId, perApurPattern);
    
    // Adicionar eventos complementares do ano subsequente (ex: 2026-01 retificando 2025)
    // Para capturar ajustes retroativos perAnt
    const targetYearNum = parseInt(ano);
    const nextYearString = String(targetYearNum + 1);
    const complementarEvents = await this.resolveEventoFiscalVigente(empresaId, { startsWith: nextYearString });
    
    const allEvents = [...vigenteEvents, ...complementarEvents];
    const vigenteIds = Array.from(new Set(allEvents.map(e => e.id)));

    if (vigenteIds.length === 0) {
      return [];
    }

    // 2. Carregar os eventos S-5002 consolidados e analíticos
    const s5002Eventos = await prisma.s5002Evento.findMany({
      where: {
        eventoId: { in: vigenteIds },
        trabalhadorId: trabalhadorId || undefined,
      },
      include: {
        evento: {
          select: { id: true, nrRecibo: true, indRetif: true, nrReciboOrig: true, createdAt: true }
        },
        trabalhador: {
          select: { nome: true, cpf: true }
        },
        demonstrativos: {
          include: { totais: true, infoIR: true }
        },
        periodosAnteriores: {
          include: {
            dependentes: true,
            infoCR: {
              include: { deducoesDependente: true, pensoes: true }
            },
            planosSaude: {
              include: { dependentes: true, operadora: true }
            }
          }
        }
      }
    });

    const candidates: AuditEntry[] = [];

    // Carregamos tabelas de apoio eSocial
    const tab80 = await prisma.esocialTabela80.findMany();
    const tab78 = await prisma.esocialTabela78.findMany();
    const tab25 = await prisma.esocialTabela25.findMany();

    const tab80Map = new Map(tab80.map(t => [t.codigo, t.descricao]));
    const tab78Map = new Map(tab78.map(t => [t.codigo, t.descricao]));
    const tab25Map = new Map(tab25.map(t => [t.codigo, t.descricao]));

    for (const evt of s5002Eventos) {
      const workerName = evt.trabalhador?.nome || "TRABALHADOR INDEFINIDO";
      const workerCpf = evt.trabalhador?.cpf || "---";
      const perApurEvento = evt.perApur;
      const xmlRecibo = evt.evento?.nrRecibo || "SEM RECIBO";
      const xmlVersao = String(evt.evento?.indRetif || "0");
      const xmlTimestamp = evt.evento?.createdAt?.toISOString() || new Date().toISOString();

      // For cada demonstrativo
      for (const dm of evt.demonstrativos) {
        const perRef = dm.perRef;
        const perFiscal = this.resolvePeriodoFiscalReal(perApurEvento, perRef);

        const isSemVinculo = dm.codCateg?.startsWith("7") || false;
        let resolvedCr = dm.totais.find(t => t.crMen)?.crMen;
        if (resolvedCr) {
          if (!isSemVinculo && resolvedCr.startsWith("0588")) {
            resolvedCr = "056107";
          } else if (isSemVinculo && resolvedCr.startsWith("0561")) {
            resolvedCr = "058806";
          }
        } else {
          resolvedCr = isSemVinculo ? "058806" : "056107";
        }

        // InfoIR
        for (const ir of dm.infoIR) {
          const fallback = this.defaultTpInfoIR[ir.tpInfoIR] || {
            label: `Outros Rendimentos/Informações (${ir.tpInfoIR})`,
            nature: FiscalNature.OUTROS
          };

          candidates.push({
            trabalhador: workerName,
            cpf: workerCpf,
            perApur: perFiscal, // Keep backwards compatibility
            origemTabela: "s5002_info_ir",
            origemId: ir.id,
            categoriaFiscal: "Informações do Imposto de Renda S-5002",
            fiscalNature: fallback.nature,
            codigoOficial: ir.tpInfoIR,
            descricaoOficial: tab80Map.get(ir.tpInfoIR) || fallback.label,
            cr: resolvedCr,
            valor: Number(ir.valor),
            metadata: { 
              ideDmDev: dm.ideDmDev, 
              perRef,
              recibo: xmlRecibo,
              nrRecibo: xmlRecibo,
              nrReciboOrig: evt.evento?.nrReciboOrig || "",
              indRetif: evt.evento?.indRetif || 0,
              eventoId: evt.evento?.id || ""
            },
            tpCR: resolvedCr,
            tpInfoIR: ir.tpInfoIR,
            origem: "s5002_info_ir",
            grupo: "CONSOLIDADO",
            ativoFiscal: true,
            statusFiscal: StatusFiscal.ATIVO,
            perFiscal,
            perApurEvento,
            incluido: true,
            valorOriginal: Number(ir.valor),
            regraAplicada: "Valor Declarado eSocial",
            motivoInclusao: "Valor consolidado declarado no InfoIR.",
            historicoFiscal: [{
              origem: "S-5002 InfoIR",
              recibo: xmlRecibo,
              versao: xmlVersao,
              regraAplicada: "Valor Declarado eSocial",
              timestamp: xmlTimestamp
            }]
          });
        }

        // Totais / IRRF Retido
        for (const tot of dm.totais) {
          const rawCR = tot.crMen || resolvedCr;
          const label = tab78Map.get(rawCR) || this.defaultCR[rawCR] || `Código de Receita ${rawCR}`;

          if (Number(tot.vlrCRMen) > 0) {
            candidates.push({
              trabalhador: workerName,
              cpf: workerCpf,
              perApur: perFiscal,
              origemTabela: "s5002_tot_apur_men",
              origemId: tot.id,
              categoriaFiscal: "Imposto Retido Mensal",
              fiscalNature: FiscalNature.IRRF_RETIDO,
              codigoOficial: "IRRF_MENSAL",
              descricaoOficial: `${label} - Valor Mensal`,
              cr: rawCR,
              valor: Number(tot.vlrCRMen),
              metadata: { 
                ideDmDev: dm.ideDmDev, 
                perRef,
                recibo: xmlRecibo,
                nrRecibo: xmlRecibo,
                nrReciboOrig: evt.evento?.nrReciboOrig || "",
                indRetif: evt.evento?.indRetif || 0,
                eventoId: evt.evento?.id || ""
              },
              tpCR: rawCR,
              tpInfoIR: "IRRF",
              origem: "s5002_tot_apur_men",
              grupo: "CONSOLIDADO",
              ativoFiscal: true,
              statusFiscal: StatusFiscal.ATIVO,
              perFiscal,
              perApurEvento,
              incluido: true,
              valorOriginal: Number(tot.vlrCRMen),
              regraAplicada: "Totalizador Mensal Oficial (totApurMen)",
              motivoInclusao: "Imposto de Renda Retido a Recolher (Mensal).",
              historicoFiscal: [{
                origem: "S-5002 totApurMen",
                recibo: xmlRecibo,
                versao: xmlVersao,
                regraAplicada: "Totalizador Mensal Oficial (totApurMen)",
                timestamp: xmlTimestamp
              }]
            });
          }

          if (Number(tot.vlrCR13Men) > 0) {
            candidates.push({
              trabalhador: workerName,
              cpf: workerCpf,
              perApur: perFiscal,
              origemTabela: "s5002_tot_apur_men",
              origemId: tot.id,
              categoriaFiscal: "Imposto Retido 13º Salário",
              fiscalNature: FiscalNature.IRRF_RETIDO,
              codigoOficial: "IRRF_13",
              descricaoOficial: `${label} - Valor de 13º Salário`,
              cr: rawCR,
              valor: Number(tot.vlrCR13Men),
              metadata: { 
                ideDmDev: dm.ideDmDev, 
                perRef,
                recibo: xmlRecibo,
                nrRecibo: xmlRecibo,
                nrReciboOrig: evt.evento?.nrReciboOrig || "",
                indRetif: evt.evento?.indRetif || 0,
                eventoId: evt.evento?.id || ""
              },
              tpCR: rawCR,
              tpInfoIR: "IRRF_13",
              origem: "s5002_tot_apur_men",
              grupo: "CONSOLIDADO",
              ativoFiscal: true,
              statusFiscal: StatusFiscal.ATIVO,
              perFiscal,
              perApurEvento,
              incluido: true,
              valorOriginal: Number(tot.vlrCR13Men),
              regraAplicada: "Totalizador Mensal Oficial (totApurMen)",
              motivoInclusao: "Imposto de Renda Retido a Recolher (13º Salário).",
              historicoFiscal: [{
                origem: "S-5002 totApurMen 13º",
                recibo: xmlRecibo,
                versao: xmlVersao,
                regraAplicada: "Totalizador Mensal Oficial (totApurMen)",
                timestamp: xmlTimestamp
              }]
            });
          }
        }
      }

      // Períodos Anteriores (Deduções / Saúde / Pensionistas)
      for (const pa of evt.periodosAnteriores) {
        const perFiscal = this.resolvePeriodoFiscalReal(perApurEvento, pa.perRefAjuste);

        const isSemVinculo = evt.demonstrativos[0]?.codCateg?.startsWith("7") || false;
        const defaultCrCode = isSemVinculo ? "058806" : "056107";

        for (const icr of pa.infoCR) {
          let crCode = icr.tpCR || (evt.demonstrativos[0]?.totais[0]?.crMen) || defaultCrCode;
          if (!isSemVinculo && crCode.startsWith("0588")) {
            crCode = "056107";
          } else if (isSemVinculo && crCode.startsWith("0561")) {
            crCode = "058806";
          }

          // Deduções Dependente
          for (const dd of icr.deducoesDependente) {
            const debClassified = FiscalEngine.classifyDeducao(dd.tpRend);
            candidates.push({
              trabalhador: workerName,
              cpf: workerCpf,
              perApur: perFiscal,
              origemTabela: "s5002_periodo_ded_dep",
              origemId: dd.id,
              categoriaFiscal: "Dedução por Dependente",
              fiscalNature: debClassified.nature,
              codigoOficial: dd.tpRend,
              descricaoOficial: `${debClassified.label} (CPF Dep: ${dd.cpfDep || "---"})`,
              cr: crCode,
              valor: Number(dd.vlrDedDep),
              metadata: { 
                perRefAjuste: pa.perRefAjuste, 
                cpfDep: dd.cpfDep, 
                tpRendOriginal: dd.tpRend,
                recibo: xmlRecibo,
                nrRecibo: xmlRecibo,
                nrReciboOrig: evt.evento?.nrReciboOrig || "",
                indRetif: evt.evento?.indRetif || 0,
                eventoId: evt.evento?.id || "",
                nrRec1210Orig: pa.nrRec1210Orig || ""
              },
              tpCR: crCode,
              tpInfoIR: dd.tpRend,
              origem: "s5002_periodo_ded_dep",
              grupo: "ANALITICO",
              ativoFiscal: true,
              statusFiscal: StatusFiscal.ATIVO,
              perFiscal,
              perApurEvento,
              incluido: true,
              valorOriginal: Number(dd.vlrDedDep),
              regraAplicada: "Detalhamento de Período Anterior (<dedDepen>)",
              motivoInclusao: "Detalhamento de dependente individual.",
              historicoFiscal: [{
                origem: "S-5002 dedDepen",
                recibo: xmlRecibo,
                versao: xmlVersao,
                regraAplicada: "Detalhamento de Período Anterior (<dedDepen>)",
                timestamp: xmlTimestamp
              }]
            });
          }

          // Pensões alimentícias
          for (const pen of icr.pensoes) {
            const penClassified = FiscalEngine.classifyPensao(pen.tpRend);
            let targetTpInfoIR = pen.tpRend;
            if (pen.tpRend === "11") targetTpInfoIR = "51";
            else if (pen.tpRend === "12") targetTpInfoIR = "52";
            else if (pen.tpRend === "13") targetTpInfoIR = "53";
            else if (pen.tpRend === "14") targetTpInfoIR = "54";
            else if (pen.tpRend === "15") targetTpInfoIR = "55";

            candidates.push({
              trabalhador: workerName,
              cpf: workerCpf,
              perApur: perFiscal,
              origemTabela: "s5002_periodo_pensao",
              origemId: pen.id,
              categoriaFiscal: "Dedução por Pensão Alimentícia",
              fiscalNature: penClassified.nature,
              codigoOficial: targetTpInfoIR,
              descricaoOficial: `${penClassified.label} (CPF Benef: ${pen.cpfDep || "---"})`,
              cr: crCode,
              valor: Number(pen.vlrDedPenAlim),
              metadata: { 
                perRefAjuste: pa.perRefAjuste, 
                cpfDep: pen.cpfDep, 
                tpRendOriginal: pen.tpRend,
                recibo: xmlRecibo,
                nrRecibo: xmlRecibo,
                nrReciboOrig: evt.evento?.nrReciboOrig || "",
                indRetif: evt.evento?.indRetif || 0,
                eventoId: evt.evento?.id || "",
                nrRec1210Orig: pa.nrRec1210Orig || ""
              },
              tpCR: crCode,
              tpInfoIR: targetTpInfoIR,
              origem: "s5002_periodo_pensao",
              grupo: "ANALITICO",
              ativoFiscal: true,
              statusFiscal: StatusFiscal.ATIVO,
              perFiscal,
              perApurEvento,
              incluido: true,
              valorOriginal: Number(pen.vlrDedPenAlim),
              regraAplicada: "Detalhamento de Período Anterior (<penAlim>)",
              motivoInclusao: "Dedução por pensão alimentícia detalhada por beneficiário.",
              historicoFiscal: [{
                origem: "S-5002 penAlim",
                recibo: xmlRecibo,
                versao: xmlVersao,
                regraAplicada: "Detalhamento de Período Anterior (<penAlim>)",
                timestamp: xmlTimestamp
              }]
            });
          }
        }

        // Planos de Saúde
        for (const ps of pa.planosSaude) {
          const regAns = ps.regANS ? ` (ANS: ${ps.regANS})` : "";

          // Titular
          if (Number(ps.vlrSaudeTit) > 0) {
            const planT = FiscalEngine.classifyPlanoSaude(ps.cnpjOper, ps.operadora?.nome);
            candidates.push({
              trabalhador: workerName,
              cpf: workerCpf,
              perApur: perFiscal,
              origemTabela: "s5002_periodo_plano_saude",
              origemId: ps.id,
              categoriaFiscal: "Dedução Saúde - Titular",
              fiscalNature: planT.nature,
              codigoOficial: "67",
              descricaoOficial: planT.label + regAns,
              cr: defaultCrCode,
              valor: Number(ps.vlrSaudeTit),
              metadata: { 
                perRefAjuste: pa.perRefAjuste, 
                cnpjOper: ps.cnpjOper, 
                regANS: ps.regANS,
                recibo: xmlRecibo,
                nrRecibo: xmlRecibo,
                nrReciboOrig: evt.evento?.nrReciboOrig || "",
                indRetif: evt.evento?.indRetif || 0,
                eventoId: evt.evento?.id || "",
                nrRec1210Orig: pa.nrRec1210Orig || ""
              },
              tpCR: defaultCrCode,
              tpInfoIR: "67",
              origem: "s5002_periodo_plano_saude",
              grupo: "ANALITICO",
              ativoFiscal: true,
              statusFiscal: StatusFiscal.ATIVO,
              perFiscal,
              perApurEvento,
              incluido: true,
              valorOriginal: Number(ps.vlrSaudeTit),
              regraAplicada: "Detalhamento de Período Anterior (<planSaude>)",
              motivoInclusao: "Despesa com plano de saúde titular.",
              historicoFiscal: [{
                origem: "S-5002 planSaude Titular",
                recibo: xmlRecibo,
                versao: xmlVersao,
                regraAplicada: "Detalhamento de Período Anterior (<planSaude>)",
                timestamp: xmlTimestamp
              }]
            });
          }

          // Dependentes de Saúde
          for (const dep of ps.dependentes) {
            if (Number(dep.vlrSaudeDep) > 0) {
              const planD = FiscalEngine.classifyPlanoSaude(ps.cnpjOper, ps.operadora?.nome, dep.cpfDep);
              candidates.push({
                trabalhador: workerName,
                cpf: workerCpf,
                perApur: perFiscal,
                origemTabela: "s5002_periodo_plano_saude_dep",
                origemId: dep.id,
                categoriaFiscal: "Dedução Saúde - Dependente",
                fiscalNature: planD.nature,
                codigoOficial: "67",
                descricaoOficial: planD.label + regAns,
                cr: defaultCrCode,
                valor: Number(dep.vlrSaudeDep),
                metadata: { 
                  perRefAjuste: pa.perRefAjuste, 
                  cnpjOper: ps.cnpjOper, 
                  regANS: ps.regANS, 
                  cpfDep: dep.cpfDep,
                  recibo: xmlRecibo,
                  nrRecibo: xmlRecibo,
                  nrReciboOrig: evt.evento?.nrReciboOrig || "",
                  indRetif: evt.evento?.indRetif || 0,
                  eventoId: evt.evento?.id || "",
                  nrRec1210Orig: pa.nrRec1210Orig || ""
                },
                tpCR: defaultCrCode,
                tpInfoIR: "67",
                origem: "s5002_periodo_plano_saude_dep",
                grupo: "ANALITICO",
                ativoFiscal: true,
                statusFiscal: StatusFiscal.ATIVO,
                perFiscal,
                perApurEvento,
                incluido: true,
                valorOriginal: Number(dep.vlrSaudeDep),
                regraAplicada: "Detalhamento de Período Anterior (<planSaude><infoDepSau>)",
                motivoInclusao: "Despesa com plano de saúde dependente.",
                historicoFiscal: [{
                  origem: "S-5002 planSaude Dependente",
                  recibo: xmlRecibo,
                  versao: xmlVersao,
                  regraAplicada: "Detalhamento de Período Anterior (<planSaude><infoDepSau>)",
                  timestamp: xmlTimestamp
                }]
              });
            }
          }
        }
      }
    }

    // Filtra pelo período fiscal solicitado (ano e mes se houver)
    const filteredCandidates = candidates.filter(e => {
      if (mes) {
        return e.perFiscal === `${ano}-${mes}`;
      } else {
        return e.perFiscal?.startsWith(ano);
      }
    });

    // Default valorCompoeBase to true
    for (const e of filteredCandidates) {
      if (e.valorCompoeBase === undefined) {
        e.valorCompoeBase = true;
      }
    }

    // Executar pipelines de governança e retificação fiscal de ponta a ponta
    this.resolveRetificacaoFiscal(filteredCandidates);
    this.resolveComplementaryPerAntRetification(filteredCandidates, s5002Eventos);
    this.resolveSemanticRetification(filteredCandidates);
    this.resolvePrecedenciaFiscal(filteredCandidates);
    this.resolveDeduplicacaoNatureza(filteredCandidates);

    return filteredCandidates;
  }

  /**
   * Realiza validação integral de inconsistências e desvios tributários gerando divergências auditáveis.
   */
  public static async validateFiscalIntegrity(
    empresaId: string, 
    ano: string, 
    auditEntries: AuditEntry[]
  ): Promise<FiscalDivergencia[]> {
    const divergencias: FiscalDivergencia[] = [];

    // 1. Somar todos os rendimentos tributáveis (códigos 11, 12, 13, 14, 15)
    // O filtro genérico já abrange todos estes que tenham a natureza REND_TRIBUTAVEL
    const totalTributavel = auditEntries
      .filter(e => e.fiscalNature === FiscalNature.REND_TRIBUTAVEL && e.ativoFiscal !== false)
      .reduce((acc, curr) => acc + curr.valor, 0);

    const totalRetido = auditEntries
      .filter(e => e.fiscalNature === FiscalNature.IRRF_RETIDO && e.ativoFiscal !== false)
      .reduce((acc, curr) => acc + curr.valor, 0);

    if (totalTributavel > 50000 && totalRetido === 0) {
      divergencias.push({
        tipo: "FISCAL_WARNING",
        descricao: `Rendimentos tributáveis significativos (R$ ${totalTributavel.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}) sem histórico correspondente de imposto retido (IRRF).`,
        severidade: "MEDIA"
      });
    }

    // 2. Validar se algum trabalhador possui duplicidade de imposto retido por período
    const keyMap = new Map<string, number>();
    auditEntries
      .filter(e => e.fiscalNature === FiscalNature.IRRF_RETIDO && e.ativoFiscal !== false)
      .forEach(e => {
        const key = `${e.cpf}_${e.perFiscal}_${e.cr}`;
        keyMap.set(key, (keyMap.get(key) || 0) + e.valor);
      });

    for (const [key, val] of keyMap.entries()) {
      if (val > 100000) {
        const [cpf, perFiscal] = key.split("_");
        divergencias.push({
          tipo: "FISCAL_ALERT",
          descricao: `Retenção de IRRF fora do limite progressivo normal detectada para o trabalhador CPF ${cpf} no período ${perFiscal} (Total R$ ${val.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}). Verificar retificação duplicada.`,
          severidade: "ALTA"
        });
      }
    }

    // 3. Detecção de "RETIFICAÇÃO NÃO APLICADA"
    // Quando temos registro de período anterior (perApurEvento !== perFiscal) indicando retificação complementar,
    // mas o registro original do mesmo sujeito e período ainda permanece ativo.
    const workerPeriodsWithCompl = new Set<string>();
    for (const e of auditEntries) {
      if (e.perApurEvento !== e.perFiscal && e.ativoFiscal !== false) {
        workerPeriodsWithCompl.add(`${e.cpf}_${e.perFiscal}_${e.fiscalNature}`);
      }
    }

    for (const e of auditEntries) {
      if (e.perApurEvento === e.perFiscal && e.ativoFiscal !== false && e.valorCompoeBase !== false) {
        const key = `${e.cpf}_${e.perFiscal}_${e.fiscalNature}`;
        if (workerPeriodsWithCompl.has(key)) {
          divergencias.push({
            tipo: "RETIFICACAO_NAO_APLICADA",
            descricao: `Retificação complementar detectada para o período de ajuste ${e.perFiscal} (${e.descricaoOficial}), mas o registro correspondente original de competência do trabalhador CPF ${e.cpf} continua ativo de forma inadequada.`,
            severidade: "ALTA"
          });
        }
      }
    }

    // 4. Validar contra o Consolidado Oficial
    const consolidadoDb = await prisma.s5002ConsolidadoPeriodo.aggregate({
      where: {
        empresaId,
        periodo: { startsWith: ano },
        ativo: true
      },
      _sum: {
        vlrRendTrib: true,
        vlrRendTrib13: true,
        vlrIrrf: true
      }
    });

    const sumConsolidadoTributavel = Number(consolidadoDb._sum.vlrRendTrib || 0) + Number(consolidadoDb._sum.vlrRendTrib13 || 0);
    const sumConsolidadoIrrf = Number(consolidadoDb._sum.vlrIrrf || 0);

    const auditTributavelSum = auditEntries
      .filter(e => e.fiscalNature === FiscalNature.REND_TRIBUTAVEL && e.ativoFiscal !== false && e.valorCompoeBase !== false)
      .reduce((acc, curr) => acc + curr.valor, 0);

    const auditIrrfSum = auditEntries
      .filter(e => e.fiscalNature === FiscalNature.IRRF_RETIDO && e.ativoFiscal !== false && e.valorCompoeBase !== false)
      .reduce((acc, curr) => acc + curr.valor, 0);

    const diffTributavel = Math.abs(sumConsolidadoTributavel - auditTributavelSum);
    const diffIrrf = Math.abs(sumConsolidadoIrrf - auditIrrfSum);

    if (diffTributavel > 1.00) {
      divergencias.push({
        tipo: "CONSOLIDADO_DIVERGENCE",
        descricao: `Divergência financeira entre o consolidado do S-5002 (R$ ${sumConsolidadoTributavel.toLocaleString("pt-BR")}) e a trilha de auditoria detalhada via InfoIR (R$ ${auditTributavelSum.toLocaleString("pt-BR")}). Diferença: R$ ${diffTributavel.toLocaleString("pt-BR")}.`,
        severidade: "CRITICA"
      });
    }

    if (diffIrrf > 1.00) {
      divergencias.push({
        tipo: "CONSOLIDADO_DIVERGENCE_IRRF",
        descricao: `Divergência financeira de IRRF entre o consolidado do S-5002 (R$ ${sumConsolidadoIrrf.toLocaleString("pt-BR")}) e a trilha de auditoria detalhada via InfoIR (R$ ${auditIrrfSum.toLocaleString("pt-BR")}). Diferença: R$ ${diffIrrf.toLocaleString("pt-BR")}.`,
        severidade: "CRITICA"
      });
    }

    return divergencias;
  }
}

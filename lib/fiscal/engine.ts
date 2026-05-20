import { prisma } from "@/lib/prisma";

export enum FiscalNature {
  REND_TRIBUTAVEL = "REND_TRIBUTAVEL",
  PREVIDENCIA_OFICIAL = "PREVIDENCIA_OFICIAL",
  PREVIDENCIA_COMPLEMENTAR = "PREVIDENCIA_COMPLEMENTAR",
  DEPENDENTE = "DEPENDENTE",
  PENSAO = "PENSAO",
  PLANO_SAUDE = "PLANO_SAUDE",
  SIMPLIFICADO = "SIMPLIFICADO",
  IRRF_RETIDO = "IRRF_RETIDO",
  ISENTO = "ISENTO",
  EXCLUSIVO = "EXCLUSIVO",
  OUTROS = "OUTROS"
}

export interface AuditEntry {
  trabalhador: string;
  cpf: string;
  perApur: string;
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
  incluido?: boolean;
}

export interface FiscalDivergencia {
  tipo: string;
  descricao: string;
  severidade: "BAIXA" | "MEDIA" | "ALTA" | "CRITICA";
}

export class FiscalEngine {
  private static defaultTpInfoIR: Record<string, { label: string; nature: FiscalNature }> = {
    // 1x/1xx: Rendimentos tributáveis
    "11": { label: "Rendimento tributável - Remuneração mensal", nature: FiscalNature.REND_TRIBUTAVEL },
    "12": { label: "Rendimento tributável - 13º salário", nature: FiscalNature.REND_TRIBUTAVEL },
    "13": { label: "Rendimento tributável - Férias", nature: FiscalNature.REND_TRIBUTAVEL },
    "14": { label: "Rendimento tributável - PLR", nature: FiscalNature.REND_TRIBUTAVEL },
    "15": { label: "Rendimento tributável - RRA", nature: FiscalNature.REND_TRIBUTAVEL },

    // 3x/3xx: Retenções (mapped to OUTROS to prevent double count, since we get IRRF_RETIDO from totApurMen)
    "31": { label: "Retenção - Remuneração mensal", nature: FiscalNature.OUTROS },
    "32": { label: "Retenção - 13º salário", nature: FiscalNature.OUTROS },
    "33": { label: "Retenção - Férias", nature: FiscalNature.OUTROS },
    "34": { label: "Retenção - PLR", nature: FiscalNature.OUTROS },
    "35": { label: "Retenção - RRA", nature: FiscalNature.OUTROS },

    // 4x/4xx: Deduções - Previdência Oficial
    "41": { label: "Dedução PSO - Remuneração mensal", nature: FiscalNature.PREVIDENCIA_OFICIAL },
    "42": { label: "Dedução PSO - 13º salário", nature: FiscalNature.PREVIDENCIA_OFICIAL },
    "43": { label: "Dedução PSO - Férias", nature: FiscalNature.PREVIDENCIA_OFICIAL },
    "44": { label: "Dedução PSO - RRA", nature: FiscalNature.PREVIDENCIA_OFICIAL },

    // 4x/4xx: Previdência Privada / FAPI / FUNPRESP
    "46": { label: "Previdência privada - Salário mensal", nature: FiscalNature.PREVIDENCIA_COMPLEMENTAR },
    "47": { label: "Previdência privada - 13º salário", nature: FiscalNature.PREVIDENCIA_COMPLEMENTAR },
    "48": { label: "FUNPRESP", nature: FiscalNature.PREVIDENCIA_COMPLEMENTAR },
    "61": { label: "FAPI - Remuneração mensal", nature: FiscalNature.PREVIDENCIA_COMPLEMENTAR },
    "62": { label: "FAPI - 13º salário", nature: FiscalNature.PREVIDENCIA_COMPLEMENTAR },
    "63": { label: "Fundação de previdência complementar - Remuneração mensal", nature: FiscalNature.PREVIDENCIA_COMPLEMENTAR },
    "64": { label: "Fundação de previdência complementar - 13º salário", nature: FiscalNature.PREVIDENCIA_COMPLEMENTAR },

    // 5x/5xx: Pensão Alimentícia
    "51": { label: "Pensão alimentícia - Remuneração mensal", nature: FiscalNature.PENSAO },
    "52": { label: "Pensão alimentícia - 13º salário", nature: FiscalNature.PENSAO },
    "53": { label: "Pensão alimentícia - Férias", nature: FiscalNature.PENSAO },
    "54": { label: "Pensão alimentícia - PLR", nature: FiscalNature.PENSAO },
    "55": { label: "Pensão alimentícia - RRA", nature: FiscalNature.PENSAO },

    // 6x/6xx: Assistência à Saúde (Plano de Saúde)
    "67": { label: "Plano privado coletivo de assistência à saúde", nature: FiscalNature.PLANO_SAUDE },

    // 7x/7xx: Isenções
    "70": { label: "Parcela isenta 65 anos - Remuneração mensal", nature: FiscalNature.ISENTO },
    "71": { label: "Parcela isenta 65 anos - 13º salário", nature: FiscalNature.ISENTO },
    "72": { label: "Diárias", nature: FiscalNature.ISENTO },
    "73": { label: "Ajuda de custo", nature: FiscalNature.ISENTO },
    "74": { label: "Indenização e rescisão de contrato (PDV)", nature: FiscalNature.ISENTO },
    "75": { label: "Abono pecuniário", nature: FiscalNature.ISENTO },
    "76": { label: "Rendimento moléstia grave - Remuneração mensal", nature: FiscalNature.ISENTO },
    "77": { label: "Rendimento moléstia grave - 13º salário", nature: FiscalNature.ISENTO },
    "78": { label: "Valores pagos a titular ou sócio de ME ou EPP", nature: FiscalNature.ISENTO },
    "79": { label: "Outras isenções", nature: FiscalNature.ISENTO },
    "700": { label: "Auxílio moradia", nature: FiscalNature.ISENTO },
    "701": { label: "Parte não tributável prestação serviço transporte", nature: FiscalNature.ISENTO },
    "7900": { label: "Verba transitante de natureza diversa", nature: FiscalNature.OUTROS },
    "7950": { label: "Rendimento não tributável", nature: FiscalNature.ISENTO },
    "7956": { label: "Valores pagos a sócio/titular ME/EPP", nature: FiscalNature.ISENTO },
  };

  private static defaultCR: Record<string, string> = {
    "0561": "IRRF - Rendimentos do Trabalho Assalariado no País e no Exterior (Mensal)",
    "056107": "IRRF - Rendimentos de Trabalho Assalariado (Mensal - Tabela Progressiva)",
    "056108": "IRRF - Rendimentos de Trabalho Assalariado (13º salário progressivo)",
    "0588": "IRRF - Rendimentos do Trabalho Sem Vínculo Empregatício",
    "3562": "IRRF - Participação dos Trabalhadores em Lucros ou Resultados (PLR)",
    "1889": "IRRF - Rendimentos Acumulados - Art. 12-A da Lei nº 7.713/1988",
  };

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
   * Classifica dedução por dependente usando Tabela 25.
   */
  public static async classifyDeducao(codigoDep: string | null): Promise<{ label: string; nature: FiscalNature }> {
    if (!codigoDep) {
      return { label: "Dedução de Dependente", nature: FiscalNature.DEPENDENTE };
    }
    const dbMatch = await prisma.esocialTabela25.findFirst({
      where: { codigo: codigoDep }
    });
    return {
      label: dbMatch ? `Dependente - ${dbMatch.descricao}` : `Dependente (Tipo ${codigoDep})`,
      nature: FiscalNature.DEPENDENTE
    };
  }

  /**
   * Classifica plano de saúde de acordo com CNPJ e operadora.
   */
  public static classifyPlanoSaude(cnpj?: string, nomeOperadora?: string | null, cpfDep?: string | null): { label: string; nature: FiscalNature } {
    const nameStr = nomeOperadora ? ` - ${nomeOperadora}` : "";
    const depStr = cpfDep ? `, CPF Dep: ${cpfDep}` : "";
    const typeStr = cpfDep ? "Dependente" : "Titular";
    return {
      label: `Plano de Saúde Individual - ${typeStr} (CNPJ Operadora: ${cnpj || "---"}${nameStr}${depStr})`,
      nature: FiscalNature.PLANO_SAUDE
    };
  }

  /**
   * Classifica pensão de acordo com tpRend ou parâmetros.
   */
  public static classifyPensao(tpRend?: string): { label: string; nature: FiscalNature } {
    return {
      label: "Dedução por Pensão Alimentícia",
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

    // Se houver mais de um evento ativo para um mesmo trabalhador e período (o que pode ocorrer em imports concorrentes),
    // garantimos a resolução pelo mais recente indRetif ou recibo de retificação.
    const uniqueMap = new Map<string, typeof activeEvents[0]>();
    for (const evt of activeEvents) {
      const key = `${evt.trabalhadorId}_${evt.perApur}`;
      const existing = uniqueMap.get(key);
      if (!existing || (evt.indRetif || 0) > (existing.indRetif || 0)) {
        uniqueMap.set(key, evt);
      }
    }

    return Array.from(uniqueMap.values());
  }

  /**
   * Constrói a trilha de auditoria fiscal robusta e 100% categorizada
   */
  public static async buildAuditTrail(empresaId: string, ano: string, mes?: string, trabalhadorId?: string | null): Promise<AuditEntry[]> {
    const perApurPattern = mes ? `${ano}-${mes}` : { startsWith: ano };
    const vigenteEvents = await this.resolveEventoFiscalVigente(empresaId, perApurPattern);
    const vigenteIds = vigenteEvents.map(e => e.id);

    if (vigenteIds.length === 0) {
      return [];
    }

    // Busca s5002 vinculada com includes corretos recomendados pela diretriz
    const dmDevs = await prisma.s5002DmDev.findMany({
      where: {
        s5002Evento: {
          eventoId: { in: vigenteIds },
          trabalhadorId: trabalhadorId || undefined,
        }
      },
      include: {
        totais: true,
        infoIR: true,
        s5002Evento: {
          include: {
            trabalhador: {
              select: { nome: true, cpf: true }
            },
            periodosAnteriores: {
              include: {
                infoCR: {
                  include: {
                    deducoesDependente: true,
                    pensoes: true
                  }
                },
                planosSaude: {
                  include: {
                    dependentes: true,
                    operadora: true
                  }
                }
              }
            }
          }
        }
      }
    });

    const candidates: AuditEntry[] = [];

    // Carregamos em memória para evitar N+1 queries nas tabelas eSocial
    const tab80 = await prisma.esocialTabela80.findMany();
    const tab78 = await prisma.esocialTabela78.findMany();
    const tab25 = await prisma.esocialTabela25.findMany();

    const tab80Map = new Map(tab80.map(t => [t.codigo, t.descricao]));
    const tab78Map = new Map(tab78.map(t => [t.codigo, t.descricao]));
    const tab25Map = new Map(tab25.map(t => [t.codigo, t.descricao]));

    for (const dm of dmDevs) {
      const worker = dm.s5002Evento.trabalhador;
      const workerName = worker?.nome || "TRABALHADOR INDEFINIDO";
      const workerCpf = worker?.cpf || "---";

      // Determinamos o CR base do demonstrativo (6 dígitos)
      const resolvedCr = dm.totais.find(t => t.crMen)?.crMen || 
                         (dm.codCateg?.startsWith("7") ? "058806" : "056107");

      // 1. Processamento de S5002InfoIR (Dados fiscais bases)
      for (const ir of dm.infoIR) {
        const fallbackRule = this.defaultTpInfoIR[ir.tpInfoIR] || {
          label: `Outros Rendimentos/Informações (${ir.tpInfoIR})`,
          nature: FiscalNature.OUTROS
        };
        const tpCRMatch = dm.totais.find(t => t.crMen)?.crMen || resolvedCr;

        candidates.push({
          trabalhador: workerName,
          cpf: workerCpf,
          perApur: dm.perRef, // Competence period
          origemTabela: "s5002_info_ir",
          origemId: ir.id,
          categoriaFiscal: "Informações do Imposto de Renda S-5002",
          fiscalNature: fallbackRule.nature,
          codigoOficial: ir.tpInfoIR,
          descricaoOficial: tab80Map.get(ir.tpInfoIR) || fallbackRule.label,
          cr: tpCRMatch,
          valor: Number(ir.valor),
          metadata: { ideDmDev: dm.ideDmDev, perRef: dm.perRef },
          tpCR: tpCRMatch,
          tpInfoIR: ir.tpInfoIR,
          origem: "s5002_info_ir",
          grupo: "CONSOLIDADO",
          incluido: true,
          motivoInclusao: "Valor consolidado declarado no InfoIR.",
          motivoExclusao: "",
          houveDeduplicacao: false,
          valorOriginal: Number(ir.valor),
          regraAplicada: "Valor Declarado eSocial"
        });
      }

      // 2. Processamento do S5002TotApurMen (Imposto Retido total)
      for (const tot of dm.totais) {
        const rawCR = tot.crMen || resolvedCr;
        const label = tab78Map.get(rawCR) || this.defaultCR[rawCR] || `Código de Receita ${rawCR}`;

        if (Number(tot.vlrCRMen) > 0) {
          candidates.push({
            trabalhador: workerName,
            cpf: workerCpf,
            perApur: dm.perRef,
            origemTabela: "s5002_tot_apur_men",
            origemId: tot.id,
            categoriaFiscal: "Imposto Retido Mensal",
            fiscalNature: FiscalNature.IRRF_RETIDO,
            codigoOficial: "IRRF_MENSAL",
            descricaoOficial: `${label} - Valor Mensal`,
            cr: rawCR,
            valor: Number(tot.vlrCRMen),
            metadata: { ideDmDev: dm.ideDmDev, perRef: dm.perRef },
            tpCR: rawCR,
            tpInfoIR: "IRRF",
            origem: "s5002_tot_apur_men",
            grupo: "CONSOLIDADO",
            incluido: true,
            motivoInclusao: "Imposto de Renda Retido a Recolher (Mensal).",
            motivoExclusao: "",
            houveDeduplicacao: false,
            valorOriginal: Number(tot.vlrCRMen),
            regraAplicada: "Totalizador Mensal Oficial (totApurMen)"
          });
        }

        if (Number(tot.vlrCR13Men) > 0) {
          candidates.push({
            trabalhador: workerName,
            cpf: workerCpf,
            perApur: dm.perRef,
            origemTabela: "s5002_tot_apur_men",
            origemId: tot.id,
            categoriaFiscal: "Imposto Retido 13º Salário",
            fiscalNature: FiscalNature.IRRF_RETIDO,
            codigoOficial: "IRRF_13",
            descricaoOficial: `${label} - Valor de 13º Salário`,
            cr: rawCR,
            valor: Number(tot.vlrCR13Men),
            metadata: { ideDmDev: dm.ideDmDev, perRef: dm.perRef },
            tpCR: rawCR,
            tpInfoIR: "IRRF_13",
            origem: "s5002_tot_apur_men",
            grupo: "CONSOLIDADO",
            incluido: true,
            motivoInclusao: "Imposto de Renda Retido a Recolher (13º Salário).",
            motivoExclusao: "",
            houveDeduplicacao: false,
            valorOriginal: Number(tot.vlrCR13Men),
            regraAplicada: "Totalizador Mensal Oficial (totApurMen)"
          });
        }
      }

      // 3. Processamento de Períodos Anteriores / Deduções / Pensão / Planos de Saúde
      for (const pa of dm.s5002Evento.periodosAnteriores) {
        // A. Deduções de Dependentes (s5002_periodo_ded_dep)
        for (const icr of pa.infoCR) {
          const crCode = icr.tpCR || resolvedCr;
          for (const dd of icr.deducoesDependente) {
            const depLabel = tab25Map.get(dd.tpRend) || "Dedução Regulamentar de Dependente";
            candidates.push({
              trabalhador: workerName,
              cpf: workerCpf,
              perApur: pa.perRefAjuste, // target period of adjustment
              origemTabela: "s5002_periodo_ded_dep",
              origemId: dd.id,
              categoriaFiscal: "Dedução por Dependente",
              fiscalNature: FiscalNature.DEPENDENTE,
              codigoOficial: "41",
              descricaoOficial: `${depLabel} (CPF Dep: ${dd.cpfDep || "---"})`,
              cr: crCode,
              valor: Number(dd.vlrDedDep),
              metadata: { perRefAjuste: pa.perRefAjuste, cpfDep: dd.cpfDep, tpRendOriginal: dd.tpRend },
              tpCR: crCode,
              tpInfoIR: "41",
              origem: "s5002_periodo_ded_dep",
              grupo: "ANALITICO",
              incluido: true,
              motivoInclusao: "Detalhamento de dependente individual.",
              motivoExclusao: "",
              houveDeduplicacao: false,
              valorOriginal: Number(dd.vlrDedDep),
              regraAplicada: "Detalhamento de Período Anterior (<dedDepen>)"
            });
          }

          // B. Pensões Alimentícias (s5002_periodo_pensao)
          for (const pen of icr.pensoes) {
            const penClassified = FiscalEngine.classifyPensao(pen.tpRend);
            candidates.push({
              trabalhador: workerName,
              cpf: workerCpf,
              perApur: pa.perRefAjuste,
              origemTabela: "s5002_periodo_pensao",
              origemId: pen.id,
              categoriaFiscal: "Dedução por Pensão Alimentícia",
              fiscalNature: penClassified.nature,
              codigoOficial: "42",
              descricaoOficial: `${penClassified.label} (CPF Benef: ${pen.cpfDep || "---"})`,
              cr: crCode,
              valor: Number(pen.vlrDedPenAlim),
              metadata: { perRefAjuste: pa.perRefAjuste, cpfDep: pen.cpfDep, tpRendOriginal: pen.tpRend },
              tpCR: crCode,
              tpInfoIR: "42",
              origem: "s5002_periodo_pensao",
              grupo: "ANALITICO",
              incluido: true,
              motivoInclusao: "Dedução por pensão alimentícia detalhada por beneficiário.",
              motivoExclusao: "",
              houveDeduplicacao: false,
              valorOriginal: Number(pen.vlrDedPenAlim),
              regraAplicada: "Detalhamento de Período Anterior (<penAlim>)"
            });
          }
        }

        // C. Planos de Saúde (Titulares e Dependentes)
        for (const ps of pa.planosSaude) {
          const regAns = ps.regANS ? ` (ANS: ${ps.regANS})` : "";
          
          if (Number(ps.vlrSaudeTit) > 0) {
            const planT = FiscalEngine.classifyPlanoSaude(ps.cnpjOper, ps.operadora?.nome);
            candidates.push({
              trabalhador: workerName,
              cpf: workerCpf,
              perApur: pa.perRefAjuste,
              origemTabela: "s5002_periodo_plano_saude",
              origemId: ps.id,
              categoriaFiscal: "Dedução Saúde - Titular",
              fiscalNature: planT.nature,
              codigoOficial: "67",
              descricaoOficial: planT.label + regAns,
              cr: resolvedCr,
              valor: Number(ps.vlrSaudeTit),
              metadata: { perRefAjuste: pa.perRefAjuste, cnpjOper: ps.cnpjOper },
              tpCR: resolvedCr,
              tpInfoIR: "67",
              origem: "s5002_periodo_plano_saude",
              grupo: "ANALITICO",
              incluido: true,
              motivoInclusao: "Despesa com plano de saúde titular.",
              motivoExclusao: "",
              houveDeduplicacao: false,
              valorOriginal: Number(ps.vlrSaudeTit),
              regraAplicada: "Detalhamento de Período Anterior (<planSaude>)"
            });
          }

          for (const dep of ps.dependentes) {
            if (Number(dep.vlrSaudeDep) > 0) {
              const planD = FiscalEngine.classifyPlanoSaude(ps.cnpjOper, ps.operadora?.nome, dep.cpfDep);
              candidates.push({
                trabalhador: workerName,
                cpf: workerCpf,
                perApur: pa.perRefAjuste,
                origemTabela: "s5002_periodo_plano_saude_dep",
                origemId: dep.id,
                categoriaFiscal: "Dedução Saúde - Dependente",
                fiscalNature: planD.nature,
                codigoOficial: "67",
                descricaoOficial: planD.label + regAns,
                cr: resolvedCr,
                valor: Number(dep.vlrSaudeDep),
                metadata: { perRefAjuste: pa.perRefAjuste, cnpjOper: ps.cnpjOper, cpfDep: dep.cpfDep },
                tpCR: resolvedCr,
                tpInfoIR: "67",
                origem: "s5002_periodo_plano_saude_dep",
                grupo: "ANALITICO",
                incluido: true,
                motivoInclusao: "Despesa com plano de saúde dependente.",
                motivoExclusao: "",
                houveDeduplicacao: false,
                valorOriginal: Number(dep.vlrSaudeDep),
                regraAplicada: "Detalhamento de Período Anterior (<planSaude><infoDepSau>)"
              });
            }
          }
        }
      }
    }

    // Filtra pelo período solicitado antes de deduplicação e precedência para garantir governança precisa
    const filteredCandidates = candidates.filter(e => {
      if (mes) {
        return e.perApur === `${ano}-${mes}`;
      } else {
        return e.perApur.startsWith(ano);
      }
    });

    // 2. Mecanismo de Deduplicação Fiscal (Rule 2)
    const seenKeys = new Set<string>();
    for (const entry of filteredCandidates) {
      const dupKey = `${entry.cpf}_${entry.perApur}_${entry.tpCR}_${entry.tpInfoIR}_${entry.origemTabela}_${entry.codigoOficial}_${entry.valorOriginal?.toFixed(2)}`;

      if (seenKeys.has(dupKey)) {
        entry.incluido = false;
        entry.houveDeduplicacao = true;
        entry.regraAplicada = "Deduplicação por Chave Mínima";
        entry.motivoExclusao = "Duplicidade de registro idêntico evitada pelo motor fiscal.";
        entry.valor = 0; // Zera valor ativo para impedir double counting
      } else {
        seenKeys.add(dupKey);
      }
    }

    // 3. Regras de Precedência (Rule 5)
    const cpfPerGroups = new Map<string, AuditEntry[]>();
    for (const entry of filteredCandidates) {
      const gKey = `${entry.cpf}_${entry.perApur}`;
      const list = cpfPerGroups.get(gKey) || [];
      list.push(entry);
      cpfPerGroups.set(gKey, list);
    }

    // Processa precedence por trabalhador e competência
    for (const [gKey, groupEntries] of cpfPerGroups.entries()) {
      const hasConsolidadoPensao = groupEntries.some(e => 
        e.incluido && 
        e.grupo === "CONSOLIDADO" && 
        e.fiscalNature === FiscalNature.PENSAO && 
        e.valorOriginal! > 0
      );

      const hasConsolidadoSaude = groupEntries.some(e => 
        e.incluido && 
        e.grupo === "CONSOLIDADO" && 
        e.fiscalNature === FiscalNature.PLANO_SAUDE && 
        e.valorOriginal! > 0
      );

      const hasConsolidadoDependente = groupEntries.some(e => 
        e.incluido && 
        e.grupo === "CONSOLIDADO" && 
        e.fiscalNature === FiscalNature.DEPENDENTE && 
        e.valorOriginal! > 0
      );

      for (const entry of groupEntries) {
        if (!entry.incluido) continue;

        if (entry.grupo === "ANALITICO") {
          if (entry.fiscalNature === FiscalNature.PENSAO && hasConsolidadoPensao) {
            entry.incluido = false;
            entry.regraAplicada = "Precedência do Consolidado (Pensão)";
            entry.motivoExclusao = "Pensão alimentícia já representada no consolidado (InfoIR códigos 51-55).";
            entry.valor = 0;
          } else if (entry.fiscalNature === FiscalNature.PLANO_SAUDE && hasConsolidadoSaude) {
            entry.incluido = false;
            entry.regraAplicada = "Precedência do Consolidado (Saúde)";
            entry.motivoExclusao = "Plano de saúde individual já consolidado no InfoIR (código 67).";
            entry.valor = 0;
          } else if (entry.fiscalNature === FiscalNature.DEPENDENTE && hasConsolidadoDependente) {
            entry.incluido = false;
            entry.regraAplicada = "Precedência do Consolidado (Dependentes)";
            entry.motivoExclusao = "Dedução de dependentes já declarada no consolidado (InfoIR).";
            entry.valor = 0;
          }
        }
      }
    }

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

    // 1. Validar se há rendimentos tributáveis sem imposto retidado
    const totalTributavel = auditEntries
      .filter(e => e.fiscalNature === FiscalNature.REND_TRIBUTAVEL && e.incluido !== false)
      .reduce((acc, curr) => acc + curr.valor, 0);

    const totalRetido = auditEntries
      .filter(e => e.fiscalNature === FiscalNature.IRRF_RETIDO && e.incluido !== false)
      .reduce((acc, curr) => acc + curr.valor, 0);

    if (totalTributavel > 50000 && totalRetido === 0) {
      divergencias.push({
        tipo: "FISCAL_WARNING",
        descricao: `Rendimentos tributáveis significativos (R$ ${totalTributavel.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}) sem histórico correspondente de imposto retidado (IRRF).`,
        severidade: "MEDIA"
      });
    }

    // 2. Validar se algum trabalhador possui duplicidade de imposto retido por período
    const keyMap = new Map<string, number>();
    auditEntries
      .filter(e => e.fiscalNature === FiscalNature.IRRF_RETIDO && e.incluido !== false)
      .forEach(e => {
        const key = `${e.cpf}_${e.perApur}_${e.cr}`;
        keyMap.set(key, (keyMap.get(key) || 0) + e.valor);
      });

    for (const [key, val] of keyMap.entries()) {
      if (val > 100000) {
        const [cpf, perApur] = key.split("_");
        divergencias.push({
          tipo: "FISCAL_ALERT",
          descricao: `Retenção de IRRF fora do limite progressivo normal detectada para o trabalhador CPF ${cpf} no período ${perApur} (Total R$ ${val.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}). Verificar retificação duplicada.`,
          severidade: "ALTA"
        });
      }
    }

    // 3. Validar se há divergência com tabelas consolidadas oficiais do período
    const consolidadoDb = await prisma.s5002ConsolidadoPeriodo.aggregate({
      where: {
        empresaId,
        periodo: { startsWith: ano },
        ativo: true
      },
      _sum: {
        vlrRendTrib: true,
        vlrIrrf: true
      }
    });

    const sumConsolidadoTributavel = Number(consolidadoDb._sum.vlrRendTrib || 0);
    const sumConsolidadoIrrf = Number(consolidadoDb._sum.vlrIrrf || 0);

    // Soma do nosso audit trail
    const auditTributavelSum = auditEntries
      .filter(e => e.fiscalNature === FiscalNature.REND_TRIBUTAVEL && e.codigoOficial === "11" && e.incluido !== false)
      .reduce((acc, curr) => acc + curr.valor, 0);

    const auditIrrfSum = auditEntries
      .filter(e => e.fiscalNature === FiscalNature.IRRF_RETIDO && e.incluido !== false)
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

    return divergencias;
  }
}

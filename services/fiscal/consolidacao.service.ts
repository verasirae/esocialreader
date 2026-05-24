import { prisma } from "@/lib/prisma";
import { Decimal } from "@prisma/client/runtime/library";
import { FiscalEngine, FiscalNature } from "@/lib/fiscal/engine";

export class ConsolidacaoFiscalService {
  /**
   * Consolida os dados fiscais de um trabalhador em um determinado período (Mensal).
   * O modelo é acumulativo de eventos ativos para aquele período de referência.
   */
  async consolidarTrabalhadorPeriodo(trabalhadorId: string | null, periodo: string, cpfBenef?: string, cnpjRaiz?: string) {
    // 1. Buscar todos os DMDEV (demonstrativos) ativos que referenciam este período
    const dmDevs = await prisma.s5002DmDev.findMany({
      where: {
        perRef: periodo,
        s5002Evento: {
          trabalhadorId: trabalhadorId || undefined,
          empresa: !trabalhadorId && cnpjRaiz ? { cnpjRaiz } : undefined,
          evento: {
            cpfBenef: !trabalhadorId && cpfBenef ? cpfBenef : undefined,
            ativo: true,
            tpEvento: "S-5002"
          }
        }
      },
      include: {
        s5002Evento: {
          include: { evento: true }
        },
        totais: true
      }
    });

    // 2. Buscar períodos anteriores/ajustes ativos que referenciam este período (perRefAjuste)
    const periodosAnt = await prisma.s5002PeriodoAnterior.findMany({
      where: {
        perRefAjuste: periodo,
        s5002Evento: {
          trabalhadorId: trabalhadorId || undefined,
          empresa: !trabalhadorId && cnpjRaiz ? { cnpjRaiz } : undefined,
          evento: {
            cpfBenef: !trabalhadorId && cpfBenef ? cpfBenef : undefined,
            ativo: true
          }
        }
      },
      include: {
        s5002Evento: {
          include: { evento: true }
        },
        infoCR: {
          include: {
            pensoes: true,
            deducoesDependente: true
          }
        },
        planosSaude: {
          include: {
            dependentes: true
          }
        }
      }
    });

    if (dmDevs.length === 0 && periodosAnt.length === 0) {
      console.log(`[Consolidacao] Nenhum dado S-5002 encontrado para ${trabalhadorId || cpfBenef} em ${periodo}`);
      return null;
    }

    // Resolve o ID da empresa para rodar a trilha de auditoria
    let empresaId = dmDevs[0]?.s5002Evento?.empresaId || periodosAnt[0]?.s5002Evento?.empresaId;
    if (!empresaId && trabalhadorId) {
      const tr = await prisma.trabalhador.findUnique({ where: { id: trabalhadorId } });
      empresaId = tr?.empresaId || "";
    }
    if (!empresaId) {
      const raiz = cnpjRaiz || dmDevs[0]?.s5002Evento?.evento?.cnpjRaiz || periodosAnt[0]?.s5002Evento?.evento?.cnpjRaiz;
      if (raiz) {
        const emp = await prisma.empresa.findUnique({ where: { cnpjRaiz: raiz } });
        empresaId = emp?.id || "";
      }
    }

    if (!empresaId) throw new Error(`Empresa não identificada para o processamento (${trabalhadorId || cpfBenef})`);

    const [ano, mes] = periodo.split("-");
    const auditEntries = await FiscalEngine.buildAuditTrail(empresaId, ano, mes, trabalhadorId);
    const activeEntries = auditEntries.filter(e => e.incluido !== false && e.valorCompoeBase !== false);

    let totalRendTrib = new Decimal(0);
    let totalRendTrib13 = new Decimal(0);
    let totalIrrf = new Decimal(0);
    let totalIrrf13 = new Decimal(0);
    let totalPrev = new Decimal(0);
    let totalPrev13 = new Decimal(0);
    let totalPensao = new Decimal(0);
    let totalPlanoSaude = new Decimal(0);
    let totalDependentes = new Decimal(0);

    for (const e of activeEntries) {
      if (e.fiscalNature === FiscalNature.REND_TRIBUTAVEL) {
        if (e.codigoOficial === "12") {
          totalRendTrib13 = totalRendTrib13.plus(e.valor);
        } else {
          totalRendTrib = totalRendTrib.plus(e.valor);
        }
      } else if (e.fiscalNature === FiscalNature.PREVIDENCIA_OFICIAL) {
        if (e.codigoOficial === "42") {
          totalPrev13 = totalPrev13.plus(e.valor);
        } else {
          totalPrev = totalPrev.plus(e.valor);
        }
      } else if (e.fiscalNature === FiscalNature.IRRF_RETIDO) {
        if (e.codigoOficial === "IRRF_13") {
          totalIrrf13 = totalIrrf13.plus(e.valor);
        } else {
          totalIrrf = totalIrrf.plus(e.valor);
        }
      } else if (e.fiscalNature === FiscalNature.PENSAO) {
        totalPensao = totalPensao.plus(e.valor);
      } else if (e.fiscalNature === FiscalNature.PLANO_SAUDE) {
        totalPlanoSaude = totalPlanoSaude.plus(e.valor);
      } else if (e.fiscalNature === FiscalNature.DEPENDENTE) {
        totalDependentes = totalDependentes.plus(e.valor);
      }
    }
    
    let eventoOrigemId = dmDevs[0]?.s5002Evento?.eventoId || periodosAnt[0]?.s5002Evento?.eventoId || "";
    let resolvedCpf = cpfBenef || dmDevs[0]?.s5002Evento?.evento?.cpfBenef || periodosAnt[0]?.s5002Evento?.evento?.cpfBenef || "";

    if (!eventoOrigemId) return null;

    return await prisma.$transaction(async (tx) => {
      // Inativar versões anteriores do mesmo trabalhador/periodo ou CPF/periodo
      if (trabalhadorId) {
        await tx.s5002ConsolidadoPeriodo.updateMany({
          where: { trabalhadorId, periodo, ativo: true },
          data: { ativo: false }
        });
      } else if (resolvedCpf) {
        await tx.s5002ConsolidadoPeriodo.updateMany({
          where: { 
            eventoOrigem: { cpfBenef: resolvedCpf }, 
            periodo, 
            ativo: true,
            trabalhadorId: null
          },
          data: { ativo: false }
        });
      }

      const last = await tx.s5002ConsolidadoPeriodo.findFirst({
        where: trabalhadorId ? { trabalhadorId, periodo } : { eventoOrigem: { cpfBenef: resolvedCpf }, periodo, trabalhadorId: null },
        orderBy: { versao: "desc" }
      });

      const nextVersao = (last?.versao || 0) + 1;

      // Criar nova versão consolidada
      let empresaId = dmDevs[0]?.s5002Evento?.empresaId || periodosAnt[0]?.s5002Evento?.empresaId;
      
      if (!empresaId && trabalhadorId) {
        const tr = await tx.trabalhador.findUnique({ where: { id: trabalhadorId } });
        empresaId = tr?.empresaId || "";
      }

      if (!empresaId) {
        const raiz = cnpjRaiz || dmDevs[0]?.s5002Evento?.evento?.cnpjRaiz || periodosAnt[0]?.s5002Evento?.evento?.cnpjRaiz;
        if (raiz) {
          const emp = await tx.empresa.findUnique({ where: { cnpjRaiz: raiz } });
          empresaId = emp?.id || "";
        }
      }

      if (!empresaId) throw new Error(`Empresa não identificada para o processamento (${trabalhadorId || resolvedCpf})`);

      const hashKey = trabalhadorId || resolvedCpf;

      try {
        return await tx.s5002ConsolidadoPeriodo.create({
          data: {
            empresaId,
            trabalhadorId,
            periodo,
            vlrRendTrib: totalRendTrib,
            vlrRendTrib13: totalRendTrib13,
            vlrPrevOficial: totalPrev,
            vlrPrevOficial13: totalPrev13,
            vlrPensao: totalPensao,
            vlrPlanoSaude: totalPlanoSaude,
            vlrDependentes: totalDependentes,
            vlrIrrf: totalIrrf.plus(totalIrrf13),
            eventoOrigemId,
            hashConsolidacao: `CONS_${hashKey}_${periodo}_V${nextVersao}_${Date.now()}`,
            versao: nextVersao,
            ativo: true,
            origemRetificacao: dmDevs.some(d => d.s5002Evento.evento.indRetif === 2) || periodosAnt.some(pa => pa.s5002Evento.perApur !== pa.perRefAjuste)
          }
        });
      } catch (createErr: any) {
        // Se falhar por duplicidade de versão (race condition), tentamos novamente em outra thread ou ignoramos pois a próxima tentativa resolverá
        if (createErr.code === "P2002") {
          console.warn(`[Consolidacao] Race condition detectada para V${nextVersao}. Pulando pois o processamento concorrente já criou.`);
          return null;
        }
        throw createErr;
      }
    }, {
      timeout: 60000 // 60 segundos
    });
  }

  /**
   * Consolida o ano-base (DIRF Digital).
   * Derivado das consolidações mensais ATIVAS.
   */
  async consolidarAnoBase(trabalhadorId: string | null, ano: number, cpfBenef?: string, cnpjRaiz?: string) {
    const periodos = await prisma.s5002ConsolidadoPeriodo.findMany({
      where: {
        trabalhadorId: trabalhadorId || null,
        eventoOrigem: !trabalhadorId ? { cpfBenef } : undefined,
        periodo: { startsWith: String(ano) },
        ativo: true
      }
    });

    let rendAnual = new Decimal(0);
    let rendAnual13 = new Decimal(0);
    let irrfAnual = new Decimal(0);
    let prevAnual = new Decimal(0);
    let prevAnual13 = new Decimal(0);
    let pensaoAnual = new Decimal(0);
    let planoSaudeAnual = new Decimal(0);
    let dependentesAnual = new Decimal(0);
    let empresaId = "";

    for (const p of periodos) {
      rendAnual = rendAnual.plus(p.vlrRendTrib);
      rendAnual13 = rendAnual13.plus(p.vlrRendTrib13);
      irrfAnual = irrfAnual.plus(p.vlrIrrf);
      prevAnual = prevAnual.plus(p.vlrPrevOficial);
      prevAnual13 = prevAnual13.plus(p.vlrPrevOficial13);
      pensaoAnual = pensaoAnual.plus(p.vlrPensao || 0);
      planoSaudeAnual = planoSaudeAnual.plus(p.vlrPlanoSaude || 0);
      dependentesAnual = dependentesAnual.plus(p.vlrDependentes || 0);
      empresaId = p.empresaId;
    }

    if (!empresaId && periodos.length === 0) {
      if (trabalhadorId) {
        const emp = await prisma.trabalhador.findUnique({ where: { id: trabalhadorId }});
        empresaId = emp?.empresaId || "";
      } else if (cnpjRaiz) {
        const emp = await prisma.empresa.findUnique({ where: { cnpjRaiz }});
        empresaId = emp?.id || "";
      }
    }

    if (trabalhadorId) {
      return await prisma.s5002ConsolidadoAnual.upsert({
        where: { trabalhadorId_ano: { trabalhadorId, ano } },
        update: {
          vlrRendTrib: rendAnual,
          vlrRendTrib13: rendAnual13,
          vlrIrrf: irrfAnual,
          vlrPrevOficial: prevAnual.plus(prevAnual13),
          vlrPensao: pensaoAnual,
          vlrPlanoSaude: planoSaudeAnual,
          vlrDependentes: dependentesAnual,
          updatedAt: new Date(),
          ultimaReprocessamento: new Date()
        },
        create: {
          empresaId,
          trabalhadorId,
          ano,
          vlrRendTrib: rendAnual,
          vlrRendTrib13: rendAnual13,
          vlrIrrf: irrfAnual,
          vlrPrevOficial: prevAnual.plus(prevAnual13),
          vlrPensao: pensaoAnual,
          vlrPlanoSaude: planoSaudeAnual,
          vlrDependentes: dependentesAnual,
          ultimaReprocessamento: new Date()
        }
      });
    } else {
       return null;
    }
  }
}

export const consolidacaoFiscalService = new ConsolidacaoFiscalService();

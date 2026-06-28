import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getActiveEmpresaId } from "@/lib/auth-server";

export async function GET(req: NextRequest) {
  try {
    const empresaId = await getActiveEmpresaId(req);
    if (!empresaId) {
      return NextResponse.json({ error: "Empresa ativa não selecionada no contexto" }, { status: 400 });
    }

    const activeEmpresa = await prisma.empresa.findUnique({
      where: { id: empresaId },
      select: { cnpjRaiz: true }
    });
    const activeCnpjRaiz = activeEmpresa?.cnpjRaiz || "";

    // Fetch actual counts from database
    const totalEmpresas = 1;
    const totalTrabalhadores = await prisma.trabalhador.count({ where: { empresaId } });
    const totalPrestadores = await prisma.prestadorServico.count({ where: { empresaId } });
    
    const totalEsocialEvents = await prisma.esocialEvento.count({ where: { empresaId, ativo: true } });
    const totalReinfEvents = await prisma.reinfEvento.count({ where: { empresaId, ativo: true } });
    const totalEvents = totalEsocialEvents + totalReinfEvents;

    // Count retifications
    const esocialRetifCount = await prisma.esocialEvento.count({
      where: { empresaId, ativo: true, indRetif: { gt: 1 } }
    });
    const reinfRetifCount = await prisma.reinfEvento.count({
      where: { empresaId, ativo: true, indRetif: { gt: 1 } }
    });
    const totalRetif = esocialRetifCount + reinfRetifCount;

    // Count active errors / inconsistencies
    const esocialErrors = await prisma.esocialEvento.count({ where: { empresaId, status: "erro" } });
    const reinfErrors = await prisma.reinfEvento.count({ where: { empresaId, status: "erro" } });
    
    // Count unlinked elements
    const unlinkedCpfs = await prisma.esocialEvento.groupBy({
      by: ['cpfBenef'],
      where: { empresaId, trabalhadorId: null, cpfBenef: { not: null } },
      _count: { _all: true }
    });
    const unlinkedCnpjs = await prisma.esocialEvento.groupBy({
      by: ['cnpjRaiz'],
      where: { empresaId: null, cnpjRaiz: activeCnpjRaiz },
      _count: { _all: true }
    });
    const totalInconsistencies = esocialErrors + reinfErrors + unlinkedCpfs.length + unlinkedCnpjs.length;

    // Dynamic target year resolution based on record density
    const esocialPeriods = await prisma.s5002ConsolidadoPeriodo.findMany({
      where: { empresaId, ativo: true },
      select: { periodo: true }
    });

    let targetYear = "2025";
    if (esocialPeriods.length > 0) {
      const yearCounts: Record<string, number> = {};
      for (const p of esocialPeriods) {
        const year = p.periodo.substring(0, 4);
        if (/^\d{4}$/.test(year)) {
          yearCounts[year] = (yearCounts[year] || 0) + 1;
        }
      }
      
      let maxYear = "2025";
      let maxCount = 0;
      for (const [y, count] of Object.entries(yearCounts)) {
        if (count > maxCount) {
          maxCount = count;
          maxYear = y;
        }
      }
      targetYear = maxYear;
    } else {
      const latestEsocial = await prisma.esocialEvento.findFirst({
        where: { empresaId, ativo: true },
        orderBy: { perApur: "desc" },
        select: { perApur: true }
      });
      const latestReinf = await prisma.reinfEvento.findFirst({
        where: { empresaId, ativo: true },
        orderBy: { perApur: "desc" },
        select: { perApur: true }
      });

      const yearsFound: string[] = [];
      if (latestEsocial?.perApur) {
        const y = latestEsocial.perApur.substring(0, 4);
        if (/^\d{4}$/.test(y)) yearsFound.push(y);
      }
      if (latestReinf?.perApur) {
        const y = latestReinf.perApur.substring(0, 4);
        if (/^\d{4}$/.test(y)) yearsFound.push(y);
      }
      if (yearsFound.length > 0) {
        yearsFound.sort();
        targetYear = yearsFound[yearsFound.length - 1];
      } else {
        targetYear = String(new Date().getFullYear());
      }
    }

    // Sum consolidated amounts from database
    const esocialSums = await prisma.s5002ConsolidadoAnual.aggregate({
      where: { empresaId },
      _sum: {
        vlrRendTrib: true,
        vlrIrrf: true,
        vlrPensao: true,
        vlrDependentes: true,
        vlrPlanoSaude: true
      }
    });

    // Sum REINF S-4020 amounts directly
    const reinfSums = await prisma.reinfR4020CRMen.aggregate({
      where: { r4020: { r4020Evento: { empresaId, evento: { ativo: true } } } },
      _sum: {
        vlrCRMenInf: true,
        vlrBaseCRMen: true
      }
    });

    // Sum S5002InfoIR dynamically for standard non-taxable / exempt income (rendimentos isentos)
    const isentoCodes = ["70", "71", "72", "73", "74", "75", "76", "77", "78", "79", "700", "701", "7950", "7956"];
    const isentosSumObj = await prisma.s5002InfoIR.aggregate({
      where: {
        dmDev: {
          s5002Evento: {
            empresaId,
            evento: {
              ativo: true
            }
          }
        },
        tpInfoIR: { in: isentoCodes }
      },
      _sum: {
        valor: true
      }
    });

    // Determine values strictly from active database values
    const rendimentos = Number(esocialSums._sum.vlrRendTrib || 0);
    const deducoes = Number(esocialSums._sum.vlrPensao || 0) + Number(esocialSums._sum.vlrPlanoSaude || 0) + Number(esocialSums._sum.vlrDependentes || 0);
    const irrfEsocial = Number(esocialSums._sum.vlrIrrf || 0);
    const irrfReinf = Number(reinfSums._sum.vlrCRMenInf || 0);
    const rendimentosIsentos = Number(isentosSumObj._sum.valor || 0);
    const totalConsolidado = irrfEsocial + irrfReinf;

    // Fetch active monthly periods and build the monthlySeries dynamically
    const activeMonthlyPeriods = await prisma.s5002ConsolidadoPeriodo.findMany({
      where: { empresaId, ativo: true, periodo: { startsWith: `${targetYear}-` } },
      select: {
        periodo: true,
        vlrRendTrib: true,
        vlrIrrf: true
      }
    });

    const activeReinfRecords = await prisma.reinfR4020CRMen.findMany({
      where: { r4020: { r4020Evento: { empresaId, perApur: { startsWith: `${targetYear}-` }, evento: { ativo: true } } } },
      select: {
        vlrCRMenInf: true,
        r4020: {
          select: {
            r4020Evento: {
              select: {
                perApur: true
              }
            }
          }
        }
      }
    });

    const monthNames = ["JAN", "FEV", "MAR", "ABR", "MAI", "JUN", "JUL", "AGO", "SET", "OUT", "NOV", "DEZ"];
    const monthlySeries = monthNames.map((name, i) => {
      const periodKey = `${targetYear}-${(i + 1).toString().padStart(2, "0")}`;
      
      const esocialMatch = activeMonthlyPeriods.filter(p => p.periodo === periodKey);
      const rendSum = esocialMatch.reduce((sum, p) => sum + Number(p.vlrRendTrib), 0);
      const irrfEsocialSum = esocialMatch.reduce((sum, p) => sum + Number(p.vlrIrrf), 0);

      const reinfMatch = activeReinfRecords.filter(r => r.r4020?.r4020Evento?.perApur === periodKey);
      const irrfReinfSum = reinfMatch.reduce((sum, r) => sum + Number(r.vlrCRMenInf), 0);

      return {
        name,
        rendimentos: Math.round(rendSum * 100) / 100,
        irrf: Math.round((irrfEsocialSum + irrfReinfSum) * 100) / 100
      };
    });

    // Compute active timeline of events (latest 20)
    const esocialEvents = await prisma.esocialEvento.findMany({
      where: { empresaId, ativo: true },
      take: 20,
      orderBy: { createdAt: "desc" },
      include: {
        empresa: { select: { razaoSocial: true } },
        trabalhador: { select: { nome: true } }
      }
    });

    const reinfEventsObj = await prisma.reinfEvento.findMany({
      where: { empresaId, ativo: true },
      take: 20,
      orderBy: { createdAt: "desc" },
      include: {
        empresa: { select: { razaoSocial: true } },
        r4020: {
          include: {
            registros: {
              include: {
                prestador: { select: { razaoSocial: true } }
              },
              take: 1
            }
          }
        }
      }
    });

    const mergedTimeline = [
      ...esocialEvents.map(e => {
        let label = `Evento ${e.tpEvento} processado no eSocial com status ${e.status}`;
        const name = e.trabalhador?.nome || (e.cpfBenef ? `CPF: ${e.cpfBenef}` : undefined);
        if (name) {
          if (e.status === "erro") {
            label = `Rejeição de fechamento de ${name} [S-5002]`;
          } else if (e.indRetif && e.indRetif > 1) {
            label = `Retificação de folha consolidada: ${name} [S-5002]`;
          } else {
            label = `Fechamento de folha integrado: ${name} [S-5002]`;
          }
        }
        return {
          id: e.id,
          tipo: `eSocial ${e.tpEvento}`,
          referencia: e.perApur,
          descricao: label,
          timestamp: e.createdAt,
          retificador: e.indRetif && e.indRetif > 1
        };
      }),
      ...reinfEventsObj.map(e => {
        const prestadorNome = e.r4020?.registros?.[0]?.prestador?.razaoSocial || e.r4020?.registros?.[0]?.cnpjBenef;
        let label = `Evento ${e.tpEvento} processado na REINF com status ${e.status}`;
        if (prestadorNome) {
          if (e.status === "erro") {
            label = `Rejeição de retenção de ${prestadorNome} [R-4020]`;
          } else if (e.indRetif && e.indRetif > 1) {
            label = `Retificação de serviços tomados: ${prestadorNome} [R-4020]`;
          } else {
            label = `Fechamento de retenções integrado: ${prestadorNome} [R-4020]`;
          }
        } else if (e.tpEvento === "R-2099") {
          label = `Fechamento anual de informações da REINF [R-2099]`;
        }
        return {
          id: e.id,
          tipo: `REINF ${e.tpEvento}`,
          referencia: e.perApur,
          descricao: label,
          timestamp: e.createdAt,
          retificador: e.indRetif && e.indRetif > 1
        };
      })
    ]
    .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
    .slice(0, 20);

    // Fiscal Alerts (BLOCO 6)
    const alerts = [];
    if (unlinkedCpfs.length > 0) {
      alerts.push({ id: "a1", text: `${unlinkedCpfs.length} Trabalhador(es) encontrado(s) no S-5002 sem cadastro analítico ativo no sistema.`, type: "warning" });
    }
    
    if (totalRetif > 0) {
      alerts.push({ id: "a3", text: `${totalRetif} Evento(s) retificador(es) alterou(aram) a base de cálculo histórico-social anteriormente consolidada.`, type: "info" });
    }

    if (esocialErrors + reinfErrors > 0) {
      alerts.push({ id: "a2", text: `Existem ${esocialErrors + reinfErrors} evento(s) com erros críticos de consistência de validação ou de estrutura.`, type: "danger" });
    }

    // Buscar certificados digitais ativos para verificar expiração
    const activeCertificados = await prisma.certificadoDigital.findMany({
      where: { ativo: true },
      include: {
        empresa: {
          select: {
            razaoSocial: true,
            nomeFantasia: true,
          }
        }
      }
    });

    const now = new Date();
    const expiringCertificates = activeCertificados.map(cert => {
      const validadeDate = new Date(cert.validade);
      const diffTime = validadeDate.getTime() - now.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return {
        id: cert.id,
        nome: cert.nome,
        validade: cert.validade.toISOString(),
        empresaNome: cert.empresa.razaoSocial || cert.empresa.nomeFantasia || "Empresa Desconhecida",
        empresaId: cert.empresaId,
        diasRestantes: diffDays,
      };
    }).filter(cert => cert.diasRestantes <= 30);

    return NextResponse.json({
      success: true,
      indicators: {
        empregadores: totalEmpresas,
        trabalhadores: totalTrabalhadores,
        prestadores: totalPrestadores,
        eventosProcessados: totalEvents,
        retificacoes: totalRetif,
        pendencias: totalInconsistencies,
      },
      consolidado: {
        rendimentos,
        deducoes,
        irrfRetido: irrfEsocial,
        rendimentosIsentos,
        reinf: irrfReinf,
        esocial: irrfEsocial,
        totalConsolidado,
        events: totalEvents,
        inconsistencies: totalInconsistencies
      },
      health: {
        trabalhadoresPct: totalTrabalhadores > 0 ? 100 : 0,
        dependentesPct: deducoes > 0 ? 100 : 0,
        prestadoresPct: totalPrestadores > 0 ? 100 : 0,
        codigosPct: 100,
        pendenciesList: unlinkedCpfs.length > 0 ? [
          `${unlinkedCpfs.length} Trabalhador(es) com CPF não cadastrado na base analítica`,
          ...((esocialErrors + reinfErrors) > 0 ? [`${esocialErrors + reinfErrors} Evento(s) com status de erro no processamento`] : [])
        ] : [
          "Nenhuma inconsistência cadastral de trabalhadores ativa"
        ]
      },
      ano: targetYear,
      monthlySeries,
      timeline: mergedTimeline,
      alerts: alerts,
      expiringCertificates
    });

  } catch (err: any) {
    console.error("Erro no GET de estatísticas do dashboard:", err);
    return NextResponse.json({ error: "Erro interno", message: err.message }, { status: 500 });
  }
}

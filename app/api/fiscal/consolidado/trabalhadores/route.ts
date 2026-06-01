import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { FiscalEngine } from "@/lib/fiscal/engine";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const ano = searchParams.get("ano");
  const mes = searchParams.get("mes");
  const empresaId = searchParams.get("empresaId");

  if (!ano) {
    return NextResponse.json({ error: "Ano é obrigatório" }, { status: 400 });
  }

  try {
    // Se não passar empresaId, pegamos a primeira empresa ativa para simplificar o preview
    let targetEmpresaId = empresaId;
    if (!targetEmpresaId) {
      const emp = await prisma.empresa.findFirst();
      targetEmpresaId = emp?.id || "";
    }

    if (mes) {
      const periodo = `${ano}-${mes}`;
      const results = await prisma.s5002ConsolidadoPeriodo.findMany({
        where: {
          empresaId: targetEmpresaId,
          periodo,
          ativo: true
        },
        include: {
          trabalhador: true,
          eventoOrigem: {
            include: {
              s5002: {
                include: {
                  periodosAnteriores: {
                    where: { perRefAjuste: periodo },
                    include: {
                      infoCR: {
                        include: {
                          pensoes: {
                            include: {
                              dependente: true
                            }
                          },
                          deducoesDependente: {
                            include: {
                              dependente: true
                            }
                          }
                        }
                      },
                      planosSaude: {
                        include: {
                          dependentes: {
                            include: {
                              dependente: true
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        },
        orderBy: {
          trabalhador: {
            nome: "asc"
          }
        }
      });

      // Obter trilha de auditoria para filtrar e computar registros detalhados consistentes
      const auditTrail = await FiscalEngine.buildAuditTrail(targetEmpresaId, ano, mes);

      const mappedResults = results.map((item: any) => {
        const workerCpf = item.trabalhador?.cpf || item.eventoOrigem?.cpfBenef;
        const workerEntries = auditTrail.filter((e: any) => 
          e.cpf && e.cpf === workerCpf &&
          e.incluido !== false && 
          e.ativoFiscal !== false && 
          e.valorCompoeBase !== false
        );

        // Somar os totais para este trabalhador do rastro da auditoria ativa
        const totalPensao = workerEntries
          .filter((e: any) => e.fiscalNature === "PENSAO")
          .reduce((acc: number, curr: any) => acc + Number(curr.valor || 0), 0);

        const totalDependentes = workerEntries
          .filter((e: any) => e.fiscalNature === "DEPENDENTE")
          .reduce((acc: number, curr: any) => acc + Number(curr.valor || 0), 0);

        const totalPlanoSaude = workerEntries
          .filter((e: any) => e.fiscalNature === "PLANO_SAUDE")
          .reduce((acc: number, curr: any) => acc + Number(curr.valor || 0), 0);

        // Extrair nomes reais dos dependentes mapeados no banco
        const nameMap = new Map<string, string>();
        item.eventoOrigem?.s5002?.periodosAnteriores?.forEach((pa: any) => {
          pa.infoCR?.forEach((icr: any) => {
            icr.deducoesDependente?.forEach((dd: any) => {
              if (dd.cpfDep && dd.dependente?.nome) {
                nameMap.set(dd.cpfDep, dd.dependente.nome);
              }
            });
            icr.pensoes?.forEach((p: any) => {
              if (p.cpfDep && p.dependente?.nome) {
                nameMap.set(p.cpfDep, p.dependente.nome);
              }
            });
          });
          pa.planosSaude?.forEach((ps: any) => {
            ps.dependentes?.forEach((dps: any) => {
              if (dps.cpfDep && dps.dependente?.nome) {
                nameMap.set(dps.cpfDep, dps.dependente.nome);
              }
            });
          });
        });

        // Agrupar e somar os valores unificados por dependente
        const dependentesMap = new Map<string, { nome: string, cpf: string, dedDep: number, pensao: number, planoSaude: number }>();

        workerEntries.forEach((entry: any) => {
          const cpfDep = entry.metadata?.cpfDep;
          if (!cpfDep) return;

          const existing = dependentesMap.get(cpfDep) || {
            nome: nameMap.get(cpfDep) || entry.descricaoOficial?.replace(/^Dedução de Dependente:\s*/, "")?.replace(/^Pensão Alimentícia - Beneficiário:\s*/, "") || "DEPENDENTE",
            cpf: cpfDep,
            dedDep: 0,
            pensao: 0,
            planoSaude: 0
          };

          const value = Number(entry.valor || 0);
          if (entry.fiscalNature === "DEPENDENTE") {
            existing.dedDep += value;
          } else if (entry.fiscalNature === "PENSAO") {
            existing.pensao += value;
          } else if (entry.fiscalNature === "PLANO_SAUDE") {
            existing.planoSaude += value;
          }

          dependentesMap.set(cpfDep, existing);
        });

        return {
          ...item,
          vlrPensao: totalPensao,
          vlrDependentes: totalDependentes,
          vlrPlanoSaude: totalPlanoSaude,
          dependentes: Array.from(dependentesMap.values())
        };
      });

      return NextResponse.json(mappedResults);
    } else {
      const results = await prisma.s5002ConsolidadoAnual.findMany({
        where: {
          empresaId: targetEmpresaId,
          ano: parseInt(ano)
        },
        include: {
          trabalhador: {
            include: {
              s5002Eventos: {
                where: { perApur: { startsWith: String(ano) } },
                include: {
                  evento: {
                    include: {
                      s5002: {
                        include: {
                          periodosAnteriores: {
                            where: { perRefAjuste: { startsWith: String(ano) } },
                            include: {
                              infoCR: {
                                include: {
                                  pensoes: { include: { dependente: true } },
                                  deducoesDependente: { include: { dependente: true } }
                                }
                              },
                              planosSaude: {
                                include: {
                                  dependentes: { include: { dependente: true } }
                                }
                              }
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        },
        orderBy: {
          trabalhador: {
            nome: "asc"
          }
        }
      });
      
      // Obter trilha de auditoria para o ano completo
      const auditTrail = await FiscalEngine.buildAuditTrail(targetEmpresaId, ano);

      const mappedResults = results.map(item => {
        const workerCpf = item.trabalhador?.cpf;
        const workerEntries = auditTrail.filter((e: any) => 
          e.cpf && e.cpf === workerCpf &&
          e.incluido !== false && 
          e.ativoFiscal !== false && 
          e.valorCompoeBase !== false
        );

        // Somar os totais para este trabalhador
        const totalPensao = workerEntries
          .filter((e: any) => e.fiscalNature === "PENSAO")
          .reduce((acc: number, curr: any) => acc + Number(curr.valor || 0), 0);

        const totalDependentes = workerEntries
          .filter((e: any) => e.fiscalNature === "DEPENDENTE")
          .reduce((acc: number, curr: any) => acc + Number(curr.valor || 0), 0);

        const totalPlanoSaude = workerEntries
          .filter((e: any) => e.fiscalNature === "PLANO_SAUDE")
          .reduce((acc: number, curr: any) => acc + Number(curr.valor || 0), 0);

        // Extrair nomes reais dos dependentes
        const nameMap = new Map<string, string>();
        item.trabalhador?.s5002Eventos?.forEach((evt: any) => {
          evt.evento?.s5002?.periodosAnteriores?.forEach((pa: any) => {
            pa.infoCR?.forEach((icr: any) => {
              icr.deducoesDependente?.forEach((dd: any) => {
                if (dd.cpfDep && dd.dependente?.nome) {
                  nameMap.set(dd.cpfDep, dd.dependente.nome);
                }
              });
              icr.pensoes?.forEach((p: any) => {
                if (p.cpfDep && p.dependente?.nome) {
                  nameMap.set(p.cpfDep, p.dependente.nome);
                }
              });
            });
            pa.planosSaude?.forEach((ps: any) => {
              ps.dependentes?.forEach((dps: any) => {
                if (dps.cpfDep && dps.dependente?.nome) {
                  nameMap.set(dps.cpfDep, dps.dependente.nome);
                }
              });
            });
          });
        });

        // Agrupar por dependente
        const dependentesMap = new Map<string, { nome: string, cpf: string, dedDep: number, pensao: number, planoSaude: number }>();

        workerEntries.forEach((entry: any) => {
          const cpfDep = entry.metadata?.cpfDep;
          if (!cpfDep) return;

          const existing = dependentesMap.get(cpfDep) || {
            nome: nameMap.get(cpfDep) || entry.descricaoOficial?.replace(/^Dedução de Dependente:\s*/, "")?.replace(/^Pensão Alimentícia - Beneficiário:\s*/, "") || "DEPENDENTE",
            cpf: cpfDep,
            dedDep: 0,
            pensao: 0,
            planoSaude: 0
          };

          const value = Number(entry.valor || 0);
          if (entry.fiscalNature === "DEPENDENTE") {
            existing.dedDep += value;
          } else if (entry.fiscalNature === "PENSAO") {
            existing.pensao += value;
          } else if (entry.fiscalNature === "PLANO_SAUDE") {
            existing.planoSaude += value;
          }

          dependentesMap.set(cpfDep, existing);
        });

        return {
          ...item,
          vlrPensao: totalPensao,
          vlrDependentes: totalDependentes,
          vlrPlanoSaude: totalPlanoSaude,
          dependentes: Array.from(dependentesMap.values())
        };
      });

      return NextResponse.json(mappedResults);
    }
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Erro ao buscar detalhamento por trabalhador" }, { status: 500 });
  }
}

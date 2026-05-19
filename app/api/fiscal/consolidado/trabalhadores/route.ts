import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

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
      return NextResponse.json(results);
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
      
      // Mapear os eventos para o formato que o frontend espera (emulando a estrutura do mensal)
      const mappedResults = results.map(item => ({
        ...item,
        eventoOrigem: {
          s5002: {
            // Consolidar todos os periodosAnteriores do ano
            periodosAnteriores: item.trabalhador?.s5002Eventos.flatMap(evt => 
              evt.evento.s5002?.periodosAnteriores || []
            ) || []
          }
        }
      }));

      return NextResponse.json(mappedResults);
    }
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Erro ao buscar detalhamento por trabalhador" }, { status: 500 });
  }
}

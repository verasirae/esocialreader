import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { safeJson } from "@/lib/api-utils";

export async function GET(req: NextRequest) {
  try {
    const { getActiveEmpresaId } = await import("@/lib/auth-server");
    const empresaId = await getActiveEmpresaId(req);

    const { searchParams } = new URL(req.url);
    const trabalhadorId = searchParams.get("trabalhadorId");
    const ano = searchParams.get("ano");

    if (!trabalhadorId || !ano) {
      return NextResponse.json({ error: "Parâmetros insuficientes" }, { status: 400 });
    }

    const events = await prisma.esocialEvento.findMany({
      where: {
        trabalhadorId,
        ...(empresaId ? { empresaId } : {}),
        perApur: { startsWith: ano },
        ativo: true,
        tpEvento: "S-5002"
      },
      include: {
        s5002: {
          include: {
            demonstrativos: {
              include: { infoIR: true, totais: true }
            },
            periodosAnteriores: {
              include: {
                dependentes: { include: { dependente: true } },
                infoCR: {
                   include: {
                     deducoesDependente: { include: { dependente: true } },
                     pensoes: { include: { dependente: true } }
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
      },
      orderBy: { perApur: 'asc' }
    });

    const tpInfoLabels: Record<string, string> = {
      "11": "Remuneração mensal",
      "12": "13º salário",
      "13": "Férias",
      "31": "IRRF (Remuneração mensal)",
      "32": "IRRF (13º salário)",
      "41": "Previdência Social Oficial - PSO - Remuneração mensal",
      "51": "Pensão alimentícia - Remuneração mensal",
      "28": "Plano privado coletivo de assistência à saúde (Assistência Médica)",
      "29": "Plano privado coletivo de assistência à saúde (Assistência Odontológica)",
      "7900": "Isenções - Outras",
    };

    const resumo: Record<string, any> = {};
    const dependentes: Record<string, any> = {};

    events.forEach(evt => {
      const mes = parseInt(evt.perApur.split('-')[1]) - 1; // 0-11
      if (mes < 0 || mes > 11) return;

      const s5002 = evt.s5002;
      if (!s5002) return;

      // 1. Processar Demonstrativos (InfoIR)
      s5002.demonstrativos.forEach(dm => {
        // Filtro crucial: apenas processar o valor se for referente ao mês da apuração do evento
        // ou se estivermos consolidando o período de referência correto.
        if (dm.perRef !== evt.perApur) return;

        dm.infoIR.forEach(ir => {
          const tp = ir.tpInfoIR;
          if (!resumo[tp]) {
            resumo[tp] = { 
              tpInfoIR: tp, 
              label: tpInfoLabels[tp] || `Código ${tp}`, 
              months: Array(12).fill(0), 
              total: 0 
            };
          }
          const val = Number(ir.valor);
          resumo[tp].months[mes] += val;
          resumo[tp].total += val;
        });
      });

      // 2. Processar Períodos Anteriores / InfoIRComplem
      s5002.periodosAnteriores.forEach(pa => {
        // Saúde
        pa.planosSaude.forEach(ps => {
          // Simplificação: 28 para Médica
          const tp = "28";
          if (!resumo[tp]) {
            resumo[tp] = { tpInfoIR: tp, label: tpInfoLabels[tp], months: Array(12).fill(0), total: 0 };
          }
          const vlrTit = Number(ps.vlrSaudeTit);
          resumo[tp].months[mes] += vlrTit;
          resumo[tp].total += vlrTit;

          ps.dependentes.forEach(ds => {
            const depId = ds.dependenteId || `unidentified-${ds.cpfDep}`;
            if (!dependentes[depId]) {
              dependentes[depId] = { 
                id: ds.dependenteId, 
                nome: ds.dependente?.nome || `Dependente não identificado [${ds.cpfDep}]`, 
                fields: { 
                  "Assistência Médica": { months: Array(12).fill(0), total: 0 } 
                } 
              };
            }
            const val = Number(ds.vlrSaudeDep);
            dependentes[depId].fields["Assistência Médica"].months[mes] += val;
            dependentes[depId].fields["Assistência Médica"].total += val;
          });
        });

        // Pensões
        pa.infoCR.forEach(cr => {
          cr.pensoes.forEach(p => {
             const depId = p.dependenteId || `unidentified-${p.cpfDep}`;
             if (!dependentes[depId]) {
               dependentes[depId] = { 
                 id: p.dependenteId, 
                 nome: p.dependente?.nome || `Dependente não identificado [${p.cpfDep}]`, 
                 fields: {} 
               };
             }
             const label = `Pensão Alimentícia (CR ${cr.tpCR})`;
             if (!dependentes[depId].fields[label]) {
               dependentes[depId].fields[label] = { months: Array(12).fill(0), total: 0 };
             }
             const val = Number(p.vlrDedPenAlim);
             dependentes[depId].fields[label].months[mes] += val;
             dependentes[depId].fields[label].total += val;
          });
        });
      });
    });

    return safeJson({
      resumo: Object.values(resumo).sort((a: any, b: any) => a.tpInfoIR.localeCompare(b.tpInfoIR)),
      dependentes: Object.values(dependentes)
    });
  } catch (error: any) {
    console.error("Erro na conferência refatorada:", error);
    return safeJson({ error: "Erro interno na conferência", details: error.message }, 500);
  }
}

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
    let targetEmpresaId = empresaId;
    if (!targetEmpresaId) {
      const emp = await prisma.empresa.findFirst();
      targetEmpresaId = emp?.id || "";
    }

    const whereBase: any = {
      empresaId: targetEmpresaId,
    };

    if (mes) {
      whereBase.periodo = `${ano}-${mes}`;
    } else {
      whereBase.periodo = { startsWith: ano };
    }

    // 1. Breakdown by Revenue Code (crMen) from S5002TotApurMen
    const crBreakdown = await prisma.s5002TotApurMen.groupBy({
      by: ["crMen"],
      where: {
        dmDev: {
          s5002Evento: {
            evento: {
              empresaId: targetEmpresaId,
              perApur: mes ? `${ano}-${mes}` : { startsWith: ano },
              ativo: true
            }
          }
        }
      },
      _sum: {
        vlrRendTrib: true,
        vlrRendTrib13: true,
        vlrPrevOficial: true,
        vlrPrevOficial13: true,
        vlrCRMen: true,
        vlrCR13Men: true,
      }
    });

    // 2. Breakdown by Type of Info IR (tpInfoIR) from S5002InfoIR
    const infoIRBreakdown = await prisma.s5002InfoIR.groupBy({
      by: ["tpInfoIR"],
      where: {
        dmDev: {
          s5002Evento: {
            evento: {
              empresaId: targetEmpresaId,
              perApur: mes ? `${ano}-${mes}` : { startsWith: ano },
              ativo: true
            }
          }
        }
      },
      _sum: {
        valor: true
      }
    });

    // 3. Totals from Consolidated Table (for consistency)
    const totalsAnual = await prisma.s5002ConsolidadoAnual.aggregate({
      where: {
        empresaId: targetEmpresaId,
        ano: parseInt(ano)
      },
      _sum: {
        vlrRendTrib: true,
        vlrRendTrib13: true,
        vlrPrevOficial: true,
        vlrPensao: true,
        vlrPlanoSaude: true,
        vlrDependentes: true,
        vlrIrrf: true
      }
    });

    return NextResponse.json({
      crBreakdown,
      infoIRBreakdown,
      totals: totalsAnual._sum
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Erro ao buscar rendimentos" }, { status: 500 });
  }
}

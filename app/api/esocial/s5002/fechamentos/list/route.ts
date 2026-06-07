import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { safeJson } from "@/lib/api-utils";

export async function GET(req: NextRequest) {
  try {
    const consolidacoes = await prisma.s5002ConsolidadoAnual.findMany({
      include: {
        empresa: {
          select: { razaoSocial: true, cnpjRaiz: true }
        },
        trabalhador: {
          select: { nome: true, cpf: true }
        }
      },
      orderBy: { updatedAt: "desc" }
    });

    const mapped = consolidacoes.map((c) => ({
      ...c,
      totalRendTrib: Number(c.vlrRendTrib || 0),
      totalRendTrib13: Number(c.vlrRendTrib13 || 0),
      totalPrevOficial: Number(c.vlrPrevOficial || 0),
      totalPensao: Number(c.vlrPensao || 0),
      totalIrrf: Number(c.vlrIrrf || 0),
      totalPlanoSaude: Number(c.vlrPlanoSaude || 0),
      totalDependentes: Number(c.vlrDependentes || 0),
      totalIndenizacaoRescisao: 0,
      totalRendIsentos: 0,
    }));

    return safeJson(mapped);
  } catch (error) {
    console.error("Erro ao listar consolidacoes:", error);
    return safeJson({ error: "Erro interno" }, 500);
  }
}

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    // 1. Get all unique years from ConsolidadoAnual
    const years = await prisma.s5002ConsolidadoAnual.findMany({
      select: { ano: true },
      distinct: ["ano"],
      orderBy: { ano: "desc" }
    });

    // 2. Get some stats per year
    const yearStats = await Promise.all(years.map(async (y) => {
      // Get the first empresaId for statistics (assuming one company per report for now)
      const firstConsolidado = await prisma.s5002ConsolidadoAnual.findFirst({
        where: { ano: y.ano }
      });
      const targetEmpresaId = firstConsolidado?.empresaId;

      const stats = await prisma.s5002ConsolidadoAnual.aggregate({
        where: { ano: y.ano },
        _sum: {
          vlrRendTrib: true,
          vlrIrrf: true,
          vlrPlanoSaude: true
        },
        _count: {
          trabalhadorId: true
        }
      });

      // Count unique workers in the system for the same empresa
      let totalTrabalhadoresSistema = 0;
      if (targetEmpresaId) {
        totalTrabalhadoresSistema = await prisma.trabalhador.count({
          where: { empresaId: targetEmpresaId, ativo: true }
        });
      }

      // Count PJ beneficiaries (those with null trabalhadorId and 14-digit identifier in eventoOrigem)
      const pjConsolidacoes = await prisma.s5002ConsolidadoPeriodo.findMany({
        where: {
          periodo: { startsWith: String(y.ano) },
          ativo: true,
          trabalhadorId: null
        },
        select: {
          eventoOrigem: {
            select: { cpfBenef: true }
          }
        }
      });
      const uniquePJ = new Set(pjConsolidacoes.map(c => c.eventoOrigem?.cpfBenef).filter(id => id?.length === 14));
      const totalPessoaJuridica = uniquePJ.size;

      // Find monthly status for this year
      const monthlyConsolidations = await prisma.s5002ConsolidadoPeriodo.findMany({
        where: { 
          periodo: { startsWith: String(y.ano) },
          ativo: true
        },
        select: {
          periodo: true,
          origemRetificacao: true,
          processadoEm: true
        }
      });

      // Group by month to see status
      const months = Array.from({ length: 12 }, (_, i) => {
        const p = `${y.ano}-${String(i + 1).padStart(2, "0")}`;
        const consolidations = monthlyConsolidations.filter(m => m.periodo === p);
        
        let status = "vazio";
        if (consolidations.length > 0) {
          status = consolidations.some(c => c.origemRetificacao) ? "retificado" : "ok";
        }

        return {
          periodo: p,
          status,
          label: new Intl.DateTimeFormat('pt-BR', { month: 'short' }).format(new Date(y.ano, i)).toUpperCase().replace(".", "")
        };
      });

      return {
        ano: y.ano,
        totalTrabalhadores: stats._count.trabalhadorId,
        totalTrabalhadoresSistema,
        totalPessoaJuridica,
        totalRendimentos: stats._sum.vlrRendTrib || 0,
        totalIrrf: stats._sum.vlrIrrf || 0,
        months
      };
    }));

    return NextResponse.json(yearStats);
  } catch (error) {
    console.error("Erro ao buscar calendário fiscal:", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}

import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { safeJson } from "@/lib/api-utils";

export async function GET(req: NextRequest) {
  try {
    const divergencias = await prisma.divergenciaFiscal.findMany({
      where: { resolvido: false },
      include: {
        evento: {
          select: {
            perApur: true,
            trabalhador: {
              select: { nome: true }
            }
          }
        }
      }
    });

    // Stats por severidade
    const bySeverity = {
      CRITICA: divergencias.filter(d => d.severidade === "CRITICA").length,
      ALTA: divergencias.filter(d => d.severidade === "ALTA").length,
      MEDIA: divergencias.filter(d => d.severidade === "MEDIA").length,
      BAIXA: divergencias.filter(d => d.severidade === "BAIXA").length,
    };

    // Stats por tipo
    const types = divergencias.reduce((acc: any, curr) => {
      acc[curr.tipo] = (acc[curr.tipo] || 0) + 1;
      return acc;
    }, {});

    // Agrupamento por competência (Timeline)
    const timeline = divergencias.reduce((acc: any, curr) => {
      const per = curr.evento?.perApur || "N/A";
      acc[per] = (acc[per] || 0) + 1;
      return acc;
    }, {});

    const timelineArray = Object.entries(timeline)
      .map(([competencia, count]) => ({ competencia, count }))
      .sort((a, b) => a.competencia.localeCompare(b.competencia));

    // Contagem de Ajustes Retroativos (Ex: perApur < 2026-01 mas criado recentemente)
    const retroAdjustmentsCount = await prisma.esocialEvento.count({
      where: {
        perApur: { lt: "2026-01" },
        createdAt: { gte: new Date("2026-01-01") }
      }
    });

    return safeJson({
      total: divergencias.length,
      bySeverity,
      byType: types,
      timeline: timelineArray,
      retroAdjustments: retroAdjustmentsCount,
      updatedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error("Erro ao gerar stats de divergências refatoradas:", error);
    return safeJson({ error: "Erro interno" }, 500);
  }
}

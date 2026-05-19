import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { safeJson } from "@/lib/api-utils";

export async function GET(req: NextRequest) {
  try {
    const [t01, t03, t05, t21, t25, t54, t78, t80, logs, s5002Count, empresasCount, trabalhadoresCount, operadorasCount, fechamentosCount, divergenciasFiscaisCount, eventosComPeriodo] = await Promise.all([
      prisma.esocialTabela01.count(),
      prisma.esocialTabela03.count(),
      prisma.esocialTabela05.count(),
      prisma.esocialTabela21.count(),
      prisma.esocialTabela25.count(),
      prisma.esocialTabela54.count(),
      prisma.esocialTabela78.count(),
      prisma.esocialTabela80.count(),
      prisma.esocialImportLog.findMany({
        orderBy: { createdAt: "desc" },
        take: 20
      }),
      prisma.esocialEvento.count({ where: { tpEvento: "S-5002" } }),
      prisma.empresa.count(),
      prisma.trabalhador.count(),
      prisma.operadoraSaude.count(),
      prisma.s5002ConsolidadoAnual.count(),
      prisma.divergenciaFiscal.count({ where: { resolvido: false } }),
      prisma.esocialEvento.findMany({
        select: { perApur: true },
        distinct: ['perApur'],
        orderBy: { perApur: 'desc' },
        take: 12
      })
    ]);

    const periodos = eventosComPeriodo.map(e => ({
      id: e.perApur,
      anoCalendario: parseInt(e.perApur.split('-')[0]),
      mes: parseInt(e.perApur.split('-')[1]),
      label: e.perApur
    }));

    // Processamento Batch (Últimas 24h)
    const twentyFourHoursAgo = new Date();
    twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);
    
    const batchStats = await prisma.esocialImportLog.aggregate({
      where: {
        createdAt: { gte: twentyFourHoursAgo }
      },
      _sum: {
        processed: true
      }
    });

    const responseData = {
      rubricasMapeadas: t54,
      divergenciasIrrf: divergenciasFiscaisCount || 0,
      batchTotal: batchStats._sum.processed || 0,
      s5002Total: s5002Count,
      empresasTotal: empresasCount,
      trabalhadoresTotal: trabalhadoresCount,
      operadorasTotal: operadorasCount,
      fechamentosTotal: fechamentosCount,
      periodos,
      tabelas: {
        t01, t03, t05, t21, t25, t54, t78, t80
      },
      logs
    };

    return safeJson(responseData);
  } catch (error) {
    console.error("Erro ao buscar estatísticas eSocial:", error);
    return safeJson({ error: "Erro interno" }, 500);
  }
}

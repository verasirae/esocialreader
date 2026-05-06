import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { safeJson } from "@/lib/api-utils";

export async function GET(req: NextRequest) {
  try {
    const [t01, t03, t05, t21, t25, t54, t78, t80, logs, s5002Count, empresasCount, trabalhadoresCount] = await Promise.all([
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
      prisma.s5002.count(),
      prisma.empresa.count(),
      prisma.trabalhador.count()
    ]);

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

    // Auditoria (Divergências)
    const auditResults = await prisma.s5002Totais.findMany({
      select: {
        vlrRendTrib: true,
        vlrPrevOficial: true,
        vlrIrrf: true
      }
    });

    const divergenciasIrrf = auditResults.filter(t => {
       const basePropria = Number(t.vlrRendTrib) - Number(t.vlrPrevOficial);
       return Number(t.vlrIrrf) > 0 && basePropria <= 0;
    }).length;

    const responseData = {
      rubricasMapeadas: t54,
      divergenciasIrrf: divergenciasIrrf || 0,
      batchTotal: batchStats._sum.processed || 0,
      s5002Total: s5002Count,
      empresasTotal: empresasCount,
      trabalhadoresTotal: trabalhadoresCount,
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

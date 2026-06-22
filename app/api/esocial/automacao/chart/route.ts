import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-server";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const empresaId = searchParams.get("empresaId");

  try {
    const result = await prisma.esocialSincronizacao.groupBy({
      by: ["perApur"],
      where: {
        status: "concluido",
        ...(empresaId ? { empresaId } : {}),
      },
      _sum: {
        totalBaixados: true,
      },
      orderBy: {
        perApur: "asc",
      },
    });

    const chartData = result.map((item) => ({
      periodo: item.perApur,
      totalBaixados: item._sum.totalBaixados || 0,
    }));

    return NextResponse.json(chartData);
  } catch (error: any) {
    console.error("Erro ao buscar dados do gráfico:", error);
    return NextResponse.json({ error: error.message || "Erro interno" }, { status: 500 });
  }
}

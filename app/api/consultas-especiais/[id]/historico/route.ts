// app/api/consultas-especiais/[id]/historico/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-server";

// GET - Retorna o histórico de execuções para uma consulta específica ou geral
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const sessionUser = await getCurrentUser();
    if (!sessionUser || (sessionUser.perfil !== "SUPER_ADMIN" && sessionUser.perfil !== "superAdmin")) {
      return NextResponse.json(
        { error: "Acesso não autorizado." },
        { status: 401 }
      );
    }

    const { id } = await params;

    const execucoes = await prisma.consultaExecucao.findMany({
      where: id !== "geral" ? { consultaId: id } : undefined,
      orderBy: { createdAt: "desc" },
      take: 100, // Limita aos últimos 100 logs para performance
      include: {
        consulta: {
          select: {
            titulo: true,
            tipo: true,
          }
        }
      }
    });

    return NextResponse.json(execucoes);
  } catch (error: any) {
    console.error("Erro ao obter histórico de execuções:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor ao obter histórico." },
      { status: 500 }
    );
  }
}

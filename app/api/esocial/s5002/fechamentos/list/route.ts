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

    return safeJson(consolidacoes);
  } catch (error) {
    console.error("Erro ao listar consolidacoes:", error);
    return safeJson({ error: "Erro interno" }, 500);
  }
}

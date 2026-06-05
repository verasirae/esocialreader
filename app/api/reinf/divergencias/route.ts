import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { safeJson } from "@/lib/api-utils";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const empresaId = searchParams.get("empresaId") || "";
    const resolvido = searchParams.get("resolvido");

    const where: any = {};
    if (resolvido !== null) {
      where.resolvido = resolvido === "true";
    }
    if (empresaId) {
      where.evento = {
        empresaId
      };
    }

    const divergencias = await prisma.reinfDivergencia.findMany({
      where,
      include: {
        evento: {
          select: {
            idEvento: true,
            tpEvento: true,
            perApur: true,
            empresa: true
          }
        }
      },
      orderBy: { createdAt: "desc" }
    });

    return safeJson(divergencias);
  } catch (error: any) {
    console.error("Erro ao listar divergências REINF:", error);
    return safeJson({ error: "Erro ao listar divergências REINF" }, 500);
  }
}

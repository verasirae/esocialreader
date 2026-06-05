import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { safeJson } from "@/lib/api-utils";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const empresaId = searchParams.get("empresaId") || "";
    const perApur = searchParams.get("perApur") || "";
    const page = parseInt(searchParams.get("page") || "1");
    const pageSize = parseInt(searchParams.get("pageSize") || "10");
    const skip = (page - 1) * pageSize;

    const where: any = {};
    if (empresaId) {
      where.empresaId = empresaId;
    }
    if (perApur) {
      where.perApur = perApur;
    }

    const eventos = await prisma.reinfEvento.findMany({
      where,
      include: {
        r2099: {
          include: {
            retencoesTomador: {
              include: {
                prestador: true,
                codigosReceita: true
              }
            }
          }
        },
        r4020: {
          include: {
            registros: {
              include: {
                prestador: true,
                retencoescrMen: true
              }
            }
          }
        },
        divergencias: true,
        lote: true
      },
      orderBy: { perApur: "desc" },
      skip,
      take: pageSize
    });

    const total = await prisma.reinfEvento.count({ where });

    return safeJson({
      data: eventos,
      total,
      page,
      totalPages: Math.ceil(total / pageSize)
    });
  } catch (error: any) {
    console.error("Erro ao listar eventos REINF:", error);
    return safeJson({ error: "Erro ao listar eventos REINF" }, 500);
  }
}

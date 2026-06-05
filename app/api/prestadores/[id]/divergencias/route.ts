import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { safeJson } from "@/lib/api-utils";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const prestador = await prisma.prestadorServico.findUnique({
      where: { id }
    });

    if (!prestador) {
      return safeJson({ error: "Prestador não encontrado" }, 404);
    }

    // Busca divergências associadas a este prestador (pelo CNPJ ou prestadorId)
    const divergencias = await prisma.reinfDivergencia.findMany({
      where: {
        OR: [
          {
            descricao: { contains: prestador.cnpj }
          },
          {
            evento: {
              r2099: {
                retencoesTomador: {
                  some: {
                    OR: [
                      { prestadorId: prestador.id },
                      { cnpjPrestador: prestador.cnpj }
                    ]
                  }
                }
              }
            }
          }
        ]
      },
      include: {
        evento: {
          select: {
            idEvento: true,
            tpEvento: true,
            perApur: true,
            nrRecArqBase: true
          }
        }
      },
      orderBy: { createdAt: "desc" }
    });

    return safeJson(divergencias);
  } catch (error: any) {
    console.error("Erro ao buscar divergências do prestador:", error);
    return safeJson({ error: "Erro ao buscar divergências do prestador" }, 500);
  }
}

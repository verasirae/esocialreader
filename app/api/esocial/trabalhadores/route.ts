import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getActiveEmpresaId } from "@/lib/auth-server";

export async function GET(req: NextRequest) {
  try {
    const empresaId = await getActiveEmpresaId(req);
    if (!empresaId) {
      return NextResponse.json({ data: [], total: 0, page: 1, totalPages: 0 });
    }

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1");
    const search = searchParams.get("search") || "";
    const takeParam = searchParams.get("take") || searchParams.get("limit") || "10";
    const perApur = searchParams.get("perApur") || "";

    const isAll = takeParam === "all";
    const pageSize = isAll ? undefined : parseInt(takeParam);
    const skip = isAll ? undefined : (page - 1) * (pageSize || 10);

    let dateFilter: any[] = [];
    if (perApur && perApur.includes("-")) {
      const [yearStr, monthStr] = perApur.split("-");
      const year = parseInt(yearStr, 10);
      const month = parseInt(monthStr, 10);
      
      if (!isNaN(year) && !isNaN(month)) {
        const firstDay = new Date(Date.UTC(year, month - 1, 1));
        const lastDay = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));
        
        dateFilter = [
          {
            OR: [
              { dtAdmissao: null },
              { dtAdmissao: { lte: lastDay } }
            ]
          },
          {
            OR: [
              { dtDesligamento: null },
              { dtDesligamento: { gte: firstDay } }
            ]
          }
        ];
      }
    }

    const where: any = {
      empresaId,
      OR: [
        { cpf: { contains: search } },
        { nome: { contains: search, mode: "insensitive" } },
      ]
    };

    if (dateFilter.length > 0) {
      where.AND = dateFilter;
    }

    const trabalhadores = await prisma.trabalhador.findMany({
      where,
      include: {
        _count: {
          select: { eventos: true }
        }
      },
      orderBy: { nome: "asc" },
      skip,
      take: pageSize,
    });

    const total = await prisma.trabalhador.count({
      where
    });

    return NextResponse.json({
      data: trabalhadores,
      total,
      page,
      totalPages: isAll ? 1 : Math.ceil(total / (pageSize || 10))
    });
  } catch (error) {
    return NextResponse.json({ error: "Erro ao buscar trabalhadores" }, { status: 500 });
  }
}

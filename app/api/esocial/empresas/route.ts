import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { safeJson } from "@/lib/api-utils";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1");
    const search = searchParams.get("search") || "";
    const pageSizeParam = searchParams.get("pageSize");
    const pageSize = pageSizeParam ? parseInt(pageSizeParam) : 10;
    const skip = pageSizeParam === "all" ? undefined : (page - 1) * pageSize;
    const take = pageSizeParam === "all" ? undefined : pageSize;

    const empresas = await prisma.empresa.findMany({
      where: {
        OR: [
          { cnpjRaiz: { contains: search } },
          { cnpjCompleto: { contains: search } },
          { razaoSocial: { contains: search, mode: 'insensitive' } },
          { nomeFantasia: { contains: search, mode: 'insensitive' } },
        ]
      },
      include: {
        _count: {
          select: { eventos: true }
        }
      },
      orderBy: { cnpjRaiz: "asc" },
      skip,
      take,
    });

    const total = await prisma.empresa.count({
      where: {
        OR: [
          { cnpjRaiz: { contains: search } },
          { cnpjCompleto: { contains: search } },
          { razaoSocial: { contains: search, mode: 'insensitive' } },
          { nomeFantasia: { contains: search, mode: 'insensitive' } },
        ]
      }
    });

    return safeJson({
      data: empresas,
      total,
      page,
      totalPages: Math.ceil(total / pageSize)
    });
  } catch (error) {
    console.error("Erro ao buscar empresas:", error);
    return safeJson({ error: "Erro ao buscar empresas" }, 500);
  }
}

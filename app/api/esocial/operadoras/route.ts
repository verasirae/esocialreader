import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { safeJson } from "@/lib/api-utils";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1");
    const pageSize = parseInt(searchParams.get("pageSize") || "10");
    const search = searchParams.get("search") || "";

    const skip = (page - 1) * pageSize;

    const where = search ? {
      OR: [
        { cnpj: { contains: search } },
        { nome: { contains: search, mode: "insensitive" as any } },
        { registroAns: { contains: search } }
      ]
    } : {};

    const [total, data] = await Promise.all([
      prisma.operadoraSaude.count({ where }),
      prisma.operadoraSaude.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: pageSize,
      })
    ]);

    return safeJson({
      success: true,
      data,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize)
    });
  } catch (error: any) {
    console.error("Erro ao listar operadoras:", error);
    return safeJson({ error: "Erro ao listar operadoras", details: error.message }, 500);
  }
}

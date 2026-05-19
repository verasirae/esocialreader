import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { safeJson } from "@/lib/api-utils";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const resolved = searchParams.get("resolved") === "true";
    const severidade = searchParams.get("severidade");
    const tipo = searchParams.get("tipo");
    const search = searchParams.get("search");

    const where: any = { resolvido: resolved };
    if (severidade) where.severidade = severidade;
    if (tipo) where.tipo = tipo;
    
    if (search) {
      where.OR = [
        { evento: { trabalhador: { nome: { contains: search, mode: "insensitive" } } } },
        { evento: { trabalhador: { cpf: { contains: search } } } },
        { descricao: { contains: search, mode: "insensitive" } }
      ];
    }

    const divergencias = await prisma.divergenciaFiscal.findMany({
      where,
      include: {
        evento: {
          include: {
            trabalhador: true,
            empresa: true
          }
        }
      },
      orderBy: { createdAt: "desc" }
    });

    return safeJson(divergencias);
  } catch (error) {
    console.error("Erro ao listar divergências refatoradas:", error);
    return safeJson({ error: "Erro interno" }, 500);
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { id, resolvido } = await req.json();
    const updated = await prisma.divergenciaFiscal.update({
      where: { id },
      data: { resolvido }
    });
    return safeJson(updated);
  } catch (error) {
    return safeJson({ error: "Erro ao atualizar divergência" }, 500);
  }
}

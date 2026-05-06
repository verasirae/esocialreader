import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1");
    const search = searchParams.get("search") || "";
    const pageSize = 10;
    const skip = (page - 1) * pageSize;

    const trabalhadores = await prisma.trabalhador.findMany({
      where: {
        OR: [
          { cpf: { contains: search } },
          { nome: { contains: search, mode: "insensitive" } },
        ]
      },
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
      where: {
        OR: [
          { cpf: { contains: search } },
          { nome: { contains: search, mode: "insensitive" } },
        ]
      }
    });

    return NextResponse.json({
      data: trabalhadores,
      total,
      page,
      totalPages: Math.ceil(total / pageSize)
    });
  } catch (error) {
    return NextResponse.json({ error: "Erro ao buscar trabalhadores" }, { status: 500 });
  }
}

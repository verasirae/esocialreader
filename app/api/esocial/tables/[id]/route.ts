import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search") || "";
    const group = searchParams.get("group") || "";
    const page = parseInt(searchParams.get("page") || "1");
    const pageSize = 10;
    const skip = (page - 1) * pageSize;

    let data: any[] = [];
    let total = 0;

    switch (id) {
      case "01":
        const whereClause01: any = {
          OR: [
            { codigo: { contains: search, mode: "insensitive" } },
            { descricao: { contains: search, mode: "insensitive" } },
          ],
        };
        if (group) {
          whereClause01.grupo = group;
        }

        total = await prisma.esocialTabela01.count({
          where: whereClause01,
        });
        data = await prisma.esocialTabela01.findMany({
          where: whereClause01,
          orderBy: { codigo: "asc" },
          skip,
          take: pageSize,
        });
        break;
      case "03":
        total = await prisma.esocialTabela03.count({
          where: {
            OR: [
              { codigo: { contains: search, mode: "insensitive" } },
              { nome: { contains: search, mode: "insensitive" } },
            ],
          },
        });
        data = await prisma.esocialTabela03.findMany({
          where: {
            OR: [
              { codigo: { contains: search, mode: "insensitive" } },
              { nome: { contains: search, mode: "insensitive" } },
            ],
          },
          orderBy: { codigo: "asc" },
          skip,
          take: pageSize,
        });
        break;
      case "05":
        total = await prisma.esocialTabela05.count({
          where: {
            OR: [
              { codigo: { contains: search, mode: "insensitive" } },
              { descricao: { contains: search, mode: "insensitive" } },
            ],
          },
        });
        data = await prisma.esocialTabela05.findMany({
          where: {
            OR: [
              { codigo: { contains: search, mode: "insensitive" } },
              { descricao: { contains: search, mode: "insensitive" } },
            ],
          },
          orderBy: { codigo: "asc" },
          skip,
          take: pageSize,
        });
        break;
      case "21":
        total = await prisma.esocialTabela21.count({
          where: {
            OR: [
              { codigo: { contains: search, mode: "insensitive" } },
              { descricao: { contains: search, mode: "insensitive" } },
            ],
          },
        });
        data = await prisma.esocialTabela21.findMany({
          where: {
            OR: [
              { codigo: { contains: search, mode: "insensitive" } },
              { descricao: { contains: search, mode: "insensitive" } },
            ],
          },
          orderBy: { codigo: "asc" },
          skip,
          take: pageSize,
        });
        break;
      case "25":
        total = await prisma.esocialTabela25.count({
          where: {
            OR: [
              { codigo: { contains: search, mode: "insensitive" } },
              { descricao: { contains: search, mode: "insensitive" } },
            ],
          },
        });
        data = await prisma.esocialTabela25.findMany({
          where: {
            OR: [
              { codigo: { contains: search, mode: "insensitive" } },
              { descricao: { contains: search, mode: "insensitive" } },
            ],
          },
          orderBy: { codigo: "asc" },
          skip,
          take: pageSize,
        });
        break;
      case "78":
        total = await prisma.esocialTabela78.count({
          where: {
            OR: [
              { codigo: { contains: search, mode: "insensitive" } },
              { descricao: { contains: search, mode: "insensitive" } },
            ],
          },
        });
        data = await prisma.esocialTabela78.findMany({
          where: {
            OR: [
              { codigo: { contains: search, mode: "insensitive" } },
              { descricao: { contains: search, mode: "insensitive" } },
            ],
          },
          orderBy: { codigo: "asc" },
          skip,
          take: pageSize,
        });
        break;
      case "80":
        total = await prisma.esocialTabela80.count({
          where: {
            OR: [
              { codigo: { contains: search, mode: "insensitive" } },
              { descricao: { contains: search, mode: "insensitive" } },
            ],
          },
        });
        data = await prisma.esocialTabela80.findMany({
          where: {
            OR: [
              { codigo: { contains: search, mode: "insensitive" } },
              { descricao: { contains: search, mode: "insensitive" } },
            ],
          },
          orderBy: { codigo: "asc" },
          skip,
          take: pageSize,
        });
        break;
      case "54":
        total = await prisma.esocialTabela54.count({
          where: {
            OR: [
              { codRubrica: { contains: search, mode: "insensitive" } },
              { nomeRubrica: { contains: search, mode: "insensitive" } },
            ],
          },
        });
        data = await prisma.esocialTabela54.findMany({
          where: {
            OR: [
              { codRubrica: { contains: search, mode: "insensitive" } },
              { nomeRubrica: { contains: search, mode: "insensitive" } },
            ],
          },
          orderBy: { codRubrica: "asc" },
          skip,
          take: pageSize,
        });
        break;
      default:
        return NextResponse.json({ error: "Tabela não encontrada" }, { status: 404 });
    }

    const serializedData = JSON.parse(JSON.stringify(data));

    return NextResponse.json({
      data: serializedData,
      total,
      page,
      pageSize,
    });
  } catch (error: any) {
    console.error("Erro ao buscar dados da tabela:", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const tableId = searchParams.get("tableId");
    const page = parseInt(searchParams.get("page") || "1");
    const pageSize = parseInt(searchParams.get("pageSize") || "50");

    if (!tableId) {
      return NextResponse.json({ error: "tableId é obrigatório" }, { status: 400 });
    }

    const skip = (page - 1) * pageSize;

    let data: any[] = [];
    let total = 0;

    switch (tableId) {
      case "01":
        [data, total] = await Promise.all([
          prisma.esocialTabela01.findMany({ skip, take: pageSize, orderBy: { codigo: "asc" } }),
          prisma.esocialTabela01.count()
        ]);
        break;
      case "03":
        [data, total] = await Promise.all([
          prisma.esocialTabela03.findMany({ skip, take: pageSize, orderBy: { codigo: "asc" } }),
          prisma.esocialTabela03.count()
        ]);
        break;
      case "05":
        [data, total] = await Promise.all([
          prisma.esocialTabela05.findMany({ skip, take: pageSize, orderBy: { codigo: "asc" } }),
          prisma.esocialTabela05.count()
        ]);
        break;
      case "21":
        [data, total] = await Promise.all([
          prisma.esocialTabela21.findMany({ skip, take: pageSize, orderBy: { codigo: "asc" } }),
          prisma.esocialTabela21.count()
        ]);
        break;
      case "25":
        [data, total] = await Promise.all([
          prisma.esocialTabela25.findMany({ skip, take: pageSize, orderBy: { codigo: "asc" } }),
          prisma.esocialTabela25.count()
        ]);
        break;
      case "54":
        [data, total] = await Promise.all([
          prisma.esocialTabela54.findMany({ skip, take: pageSize, orderBy: { codRubrica: "asc" } }),
          prisma.esocialTabela54.count()
        ]);
        break;
      case "78":
        [data, total] = await Promise.all([
          prisma.esocialTabela78.findMany({ skip, take: pageSize, orderBy: { codigo: "asc" } }),
          prisma.esocialTabela78.count()
        ]);
        break;
      case "80":
        [data, total] = await Promise.all([
          prisma.esocialTabela80.findMany({ skip, take: pageSize, orderBy: { codigo: "asc" } }),
          prisma.esocialTabela80.count()
        ]);
        break;
      default:
        return NextResponse.json({ error: "Tabela não suportada" }, { status: 400 });
    }

    return NextResponse.json({
      data,
      pagination: {
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize)
      }
    });
  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

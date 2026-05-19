import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    // Buscar todos os períodos únicos presentes nos eventos eSocial
    const eventos = await prisma.esocialEvento.findMany({
      select: { perApur: true },
      distinct: ['perApur'],
      orderBy: { perApur: 'desc' }
    });

    const periodos = eventos.map(e => ({
      id: e.perApur,
      anoCalendario: parseInt(e.perApur.split('-')[0]),
      mes: parseInt(e.perApur.split('-')[1]),
      label: e.perApur
    }));

    return NextResponse.json(periodos);
  } catch (error) {
    console.error("Erro ao buscar períodos fiscais:", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  // Como removemos o PeriodoFiscal do banco, a criação manual não é mais necessária 
  // pois os períodos são derivados dos XMLs importados.
  return NextResponse.json({ message: "Os períodos são criados automaticamente via importação de XML." });
}

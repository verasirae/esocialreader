import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const data = await req.json();
    const { idEvento, cnpjOperadora, regAns, valor } = data;

    if (!idEvento || !cnpjOperadora || !valor) {
      return NextResponse.json({ error: "Campos obrigatórios ausentes" }, { status: 400 });
    }

    const s5002 = await prisma.s5002.findFirst({
      where: {
        OR: [
          { id: idEvento },
          { nrRecibo: idEvento }
        ]
      }
    });

    if (!s5002) {
      return NextResponse.json({ 
        error: "Evento S-5002 não encontrado. Importe o XML primeiro." 
      }, { status: 404 });
    }

    const benefit = await prisma.s5002PlanoSaude.create({
      data: {
        s5002Id: s5002.id,
        cnpjOperadora,
        registroAns: regAns,
        vlrTitular: parseFloat(valor),
      }
    });

    // Serialize Decimals for JSON response
    const serializedBenefit = JSON.parse(JSON.stringify(benefit, (key, value) =>
      typeof value === 'object' && value !== null && value.constructor.name === 'Decimal'
        ? value.toString()
        : value
    ));

    return NextResponse.json({ success: true, data: serializedBenefit });
  } catch (error: any) {
    console.error("Erro ao salvar benefício:", error);
    return NextResponse.json({ 
      error: "Erro interno ao salvar benefício", 
      details: error.message || "Erro desconhecido" 
    }, { status: 500 });
  }
}

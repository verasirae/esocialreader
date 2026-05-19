import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const data = await req.json();
    const { idEvento, cnpjOperadora, regAns, valor } = data;

    if (!idEvento || !cnpjOperadora || !valor) {
      return NextResponse.json({ error: "Campos obrigatórios ausentes" }, { status: 400 });
    }

    const evento = await prisma.esocialEvento.findFirst({
      where: {
        OR: [
          { id: idEvento },
          { nrRecibo: idEvento },
          { eventoId: idEvento }
        ]
      },
      include: { s5002: true }
    });

    if (!evento || !evento.s5002) {
      return NextResponse.json({ 
        error: "Evento S-5002 não encontrado. Importe o XML primeiro." 
      }, { status: 404 });
    }

    // No novo schema, planos de saúde estão sob S5002PeriodoAnterior
    // Criamos um registro de período anterior como container se não existir para o próprio perApur
    let periodoAnterior = await prisma.s5002PeriodoAnterior.findFirst({
      where: {
        s5002EventoId: evento.s5002.id,
        perRefAjuste: evento.perApur
      }
    });

    if (!periodoAnterior) {
      periodoAnterior = await prisma.s5002PeriodoAnterior.create({
        data: {
          s5002EventoId: evento.s5002.id,
          perRefAjuste: evento.perApur
        }
      });
    }

    const benefit = await prisma.s5002PeriodoPlanoSaude.create({
      data: {
        periodoAnteriorId: periodoAnterior.id,
        cnpjOper: cnpjOperadora.replace(/\D/g, ""),
        regANS: regAns,
        vlrSaudeTit: parseFloat(valor),
      }
    });

    // Serializar Decimais
    const serializedBenefit = JSON.parse(JSON.stringify(benefit, (key, value) => {
       if (typeof value === 'object' && value !== null && value.constructor && value.constructor.name === 'Decimal') {
         return value.toString();
       }
       return value;
    }));

    return NextResponse.json({ success: true, data: serializedBenefit });
  } catch (error: any) {
    console.error("Erro ao salvar benefício refatorado:", error);
    return NextResponse.json({ 
      error: "Erro interno ao salvar benefício", 
      details: error.message 
    }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const { cnpjRaiz, razaoSocial, ambienteEsocial } = await req.json();

    const empresa = await prisma.$transaction(async (tx) => {
      // 1. Criar Empresa
      const e = await tx.empresa.create({
        data: {
          cnpjRaiz,
          razaoSocial,
          ambienteEsocial: ambienteEsocial || "producao"
        }
      });

      // 2. Relacionar Lotes pendentes
      await tx.esocialLote.updateMany({
        where: {
          empresaId: null,
          hashArquivo: {
            // Se tivermos um campo para CNPJ no lote no futuro, usamos. 
            // Por enquanto, o Lote é vinculado ao EsocialEvento.
          }
        } as any,
        data: {
          empresaId: e.id
        }
      });

      // 3. Relacionar Eventos pendentes pelo CNPJ Raiz
      await tx.esocialEvento.updateMany({
        where: {
          cnpjRaiz: cnpjRaiz,
          empresaId: null
        },
        data: {
          empresaId: e.id
        }
      });

      // 4. Relacionar S5002 pendentes
      await tx.s5002Evento.updateMany({
        where: {
          empresaId: null,
          evento: {
            cnpjRaiz: cnpjRaiz
          }
        },
        data: {
          empresaId: e.id
        }
      });

      return e;
    });

    return NextResponse.json(empresa);
  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { normalizeCpf } from "@/lib/normalization";

export async function POST(req: Request) {
  try {
    const { empresaId, cpf, nome, nis, matricula } = await req.json();
    const cpfNorm = normalizeCpf(cpf);

    const trabalhador = await prisma.$transaction(async (tx) => {
      // 1. Criar Trabalhador
      const t = await tx.trabalhador.create({
        data: {
          empresaId,
          cpf: cpfNorm,
          nome,
          nis,
          matricula,
          ativo: true
        }
      });

      // 2. Relacionar eventos do eSocial pendentes
      await tx.esocialEvento.updateMany({
        where: {
          cpfBenef: cpfNorm,
          trabalhadorId: null,
          empresaId: empresaId // Só vincula se for da mesma empresa
        },
        data: {
          trabalhadorId: t.id
        }
      });

      // 3. Relacionar eventos S5002 pendentes
      await tx.s5002Evento.updateMany({
        where: {
          trabalhadorId: null,
          empresaId: empresaId,
          evento: {
            cpfBenef: cpfNorm
          }
        },
        data: {
          trabalhadorId: t.id
        }
      });

      // 4. Relacionar consolidados pendentes
      await tx.s5002ConsolidadoPeriodo.updateMany({
        where: {
          trabalhadorId: "", // Prisma string relation might be tricky if schema was changed
          eventoOrigem: {
             cpfBenef: cpfNorm
          }
        } as any,
        data: {
          trabalhadorId: t.id
        }
      });

      return t;
    });

    return NextResponse.json(trabalhador);
  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

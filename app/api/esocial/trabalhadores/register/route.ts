import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { safeJson } from "@/lib/api-utils";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { cpf, nome, empresaId } = body;

    if (!cpf || cpf.length !== 11) {
      return safeJson({ error: "CPF inválido (deve conter 11 dígitos)" }, 400);
    }

    if (!nome) {
      return safeJson({ error: "Nome é obrigatório" }, 400);
    }

    if (!empresaId) {
      return safeJson({ error: "Empresa é obrigatória" }, 400);
    }

    const trabalhador = await prisma.trabalhador.upsert({
      where: { cpf },
      update: { 
        nome,
        empresaId
      },
      create: { 
        cpf,
        nome,
        empresaId
      }
    });

    return safeJson({ success: true, data: trabalhador });
  } catch (error) {
    console.error("Erro ao cadastrar trabalhador:", error);
    return safeJson({ error: "Erro ao cadastrar trabalhador" }, 500);
  }
}

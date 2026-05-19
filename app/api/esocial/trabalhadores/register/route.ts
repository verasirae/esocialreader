import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { safeJson } from "@/lib/api-utils";
import { s5002ProcessorService } from "@/services/esocial/s5002-processor.service";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const cpfRaw = String(body.cpf || "").replace(/\D/g, "");
    const cpf = cpfRaw.padStart(11, "0");
    const { nome, empresaId } = body;

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
      where: { 
        empresaId_cpf: {
          empresaId,
          cpf
        }
      },
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

    // Re-processar eventos que estavam pendentes por falta deste cadastro
    await s5002ProcessorService.reprocessPending({ cpfBenef: cpf });

    return safeJson({ success: true, data: trabalhador });
  } catch (error) {
    console.error("Erro ao cadastrar trabalhador:", error);
    return safeJson({ error: "Erro ao cadastrar trabalhador" }, 500);
  }
}

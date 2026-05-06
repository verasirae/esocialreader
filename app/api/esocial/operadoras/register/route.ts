import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { safeJson } from "@/lib/api-utils";
import { TipoOperadora } from "@prisma/client";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { cnpj, registroAns, nome, tipo } = body;

    const cleanCnpj = String(cnpj || "").replace(/\D/g, "");

    if (cleanCnpj.length !== 14) {
      return safeJson({ error: "CNPJ inválido (deve conter 14 dígitos)" }, 400);
    }

    if (!tipo || !Object.values(TipoOperadora).includes(tipo as any)) {
      return safeJson({ error: "Tipo de operadora inválido" }, 400);
    }

    const operadora = await prisma.operadoraSaude.upsert({
      where: { cnpj: cleanCnpj },
      update: { 
        registroAns,
        nome,
        tipo: tipo as TipoOperadora
      },
      create: { 
        cnpj: cleanCnpj,
        registroAns,
        nome,
        tipo: tipo as TipoOperadora
      }
    });

    return safeJson({ success: true, data: operadora });
  } catch (error) {
    console.error("Erro ao cadastrar operadora de saúde:", error);
    return safeJson({ error: "Erro ao cadastrar operadora" }, 500);
  }
}

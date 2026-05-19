import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { safeJson } from "@/lib/api-utils";
import { TipoOperadora } from "@prisma/client";

export async function POST(req: NextRequest) {
  console.log("Recebendo requisição para cadastrar/atualizar operadora...");
  try {
    const body = await req.json();
    console.log("Corpo da requisição:", body);
    const { cnpj, registroAns, nome, tipo } = body;

    const cleanCnpj = String(cnpj || "").replace(/\D/g, "");
    console.log("CNPJ limpo:", cleanCnpj);

    if (cleanCnpj.length !== 14) {
      console.log("CNPJ inválido:", cleanCnpj);
      return safeJson({ error: "CNPJ inválido (deve conter 14 dígitos)" }, 400);
    }

    if (!tipo || !Object.values(TipoOperadora).includes(tipo as any)) {
      console.log("Tipo inválido:", tipo);
      return safeJson({ error: "Tipo de operadora inválido" }, 400);
    }

    console.log("Iniciando upsert no Prisma...");
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

    console.log("Operação Prisma concluída com sucesso:", operadora.id);
    return safeJson({ success: true, data: operadora });
  } catch (error: any) {
    console.error("Erro ao cadastrar operadora de saúde:", error);
    return safeJson({ 
      error: "Erro ao cadastrar operadora", 
      details: error?.message || String(error) 
    }, 500);
  }
}

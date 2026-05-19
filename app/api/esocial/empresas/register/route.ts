import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { s5002ProcessorService } from "@/services/esocial/s5002-processor.service";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const cnpjCompletoRaw = String(body.cnpjCompleto || "").replace(/\D/g, "");
    const cnpjCompleto = cnpjCompletoRaw.padStart(14, "0");
    const { razaoSocial, nomeFantasia } = body;

    if (!cnpjCompleto || cnpjCompleto.length < 8) {
      return NextResponse.json({ error: "CNPJ inválido" }, { status: 400 });
    }

    const cnpjRaiz = cnpjCompleto.substring(0, 8);

    const empresa = await prisma.empresa.upsert({
      where: { cnpjRaiz },
      update: { 
        cnpjCompleto,
        razaoSocial,
        nomeFantasia
      },
      create: { 
        cnpjRaiz,
        cnpjCompleto,
        razaoSocial,
        nomeFantasia
      }
    });

    // Re-processar eventos que estavam pendentes por falta deste cadastro
    await s5002ProcessorService.reprocessPending({ cnpjRaiz });

    return NextResponse.json(empresa);
  } catch (error) {
    console.error("Erro ao cadastrar empresa:", error);
    return NextResponse.json({ error: "Erro interno no servidor" }, { status: 500 });
  }
}

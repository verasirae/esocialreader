import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    // 1. CPFs em eventos sem trabalhador master vinculado
    const unlinkedCpfs = await prisma.esocialEvento.groupBy({
      by: ['cpfBenef'],
      where: {
        trabalhadorId: null,
        cpfBenef: { not: null }
      },
      _count: { _all: true }
    });

    // 2. CNPJs em eventos sem empresa master vinculada
    const unlinkedCnpjs = await prisma.esocialEvento.groupBy({
      by: ['cnpjRaiz'],
      where: {
        empresaId: null,
        cnpjRaiz: { not: null }
      },
      _count: { _all: true }
    });

    // 3. Workers with incomplete data (existing)
    const workerPendencies = await prisma.trabalhador.findMany({
      where: {
        OR: [{ nome: null }, { nome: "Não informado" }, { nome: "" }]
      },
      select: { id: true, cpf: true, empresa: { select: { razaoSocial: true, cnpjRaiz: true } } },
      take: 10
    });

    // 4. Empresas with incomplete data (existing)
    const empresaPendencies = await prisma.empresa.findMany({
      where: {
        OR: [{ razaoSocial: null }, { razaoSocial: "" }]
      },
      select: { id: true, cnpjRaiz: true },
      take: 10
    });

    // 5. Processing Errors
    const processingErrors = await prisma.esocialEvento.findMany({
      where: { status: "erro" },
      take: 10
    });

    const totalStats = {
      workers: await prisma.trabalhador.count(),
      events: await prisma.esocialEvento.count({ where: { ativo: true } }),
      errors: await prisma.esocialEvento.count({ where: { status: "erro" } }),
      unlinkedCpfs: unlinkedCpfs.length,
      unlinkedCnpjs: unlinkedCnpjs.length
    };

    return NextResponse.json({
      unlinkedCpfs,
      unlinkedCnpjs,
      workers: workerPendencies,
      empresas: empresaPendencies,
      errors: processingErrors,
      totalPendencies: unlinkedCpfs.length + unlinkedCnpjs.length + workerPendencies.length + empresaPendencies.length + processingErrors.length,
      stats: totalStats
    });
  } catch (error: any) {
    console.error("Erro ao buscar pendências:", error);
    return NextResponse.json({ 
      error: "Erro interno", 
      message: error.message || String(error),
      stack: error.stack 
    }, { status: 500 });
  }
}

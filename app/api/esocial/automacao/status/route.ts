import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-server";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  try {
    const empresas = await prisma.empresa.findMany({
      orderBy: { cnpjRaiz: "asc" },
    });

    const statusList = await Promise.all(
      empresas.map(async (emp) => {
        const cert = await prisma.certificadoDigital.findFirst({
          where: { empresaId: emp.id, ativo: true },
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            nome: true,
            validade: true,
            fingerprint: true,
            ambiente: true,
          }
        });

        const lastSinc = await prisma.esocialSincronizacao.findFirst({
          where: { empresaId: emp.id },
          orderBy: { iniciadoEm: "desc" },
          select: {
            id: true,
            perApur: true,
            status: true,
            iniciadoEm: true,
            concluidoEm: true,
            totalBaixados: true,
            totalErros: true,
          }
        });

        return {
          id: emp.id,
          razaoSocial: emp.razaoSocial,
          nomeFantasia: emp.nomeFantasia,
          cnpjRaiz: emp.cnpjRaiz,
          cnpjCompleto: emp.cnpjCompleto,
          certificado: cert,
          ultimaSincronizacao: lastSinc,
        };
      })
    );

    return NextResponse.json(statusList);
  } catch (error: any) {
    console.error("Erro no status de automacao:", error);
    return NextResponse.json({ error: error.message || "Erro interno" }, { status: 500 });
  }
}

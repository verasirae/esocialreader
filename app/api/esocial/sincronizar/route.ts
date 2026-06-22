import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth-server";
import { sincronizacaoService } from "@/lib/esocial/sincronizacao.service";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const { empresaId, perApur } = await req.json();
  if (!empresaId || !perApur) {
    return NextResponse.json({ error: "empresaId e perApur são obrigatórios." }, { status: 400 });
  }

  // Resolve cnpjRaiz e certificado ativo
  const empresa = await prisma.empresa.findUnique({ where: { id: empresaId } });
  if (!empresa) return NextResponse.json({ error: "Empresa não encontrada." }, { status: 404 });

  const cert = await prisma.certificadoDigital.findFirst({
    where:   { empresaId, ativo: true },
    orderBy: { createdAt: "desc" },
  });
  if (!cert) return NextResponse.json({ error: "Nenhum certificado digital ativo cadastrado para esta empresa." }, { status: 400 });

  // Verifica se já há sincronização em execução
  const emExecucao = await prisma.esocialSincronizacao.findFirst({
    where: { empresaId, perApur, status: "executando" },
  });
  if (emExecucao) {
    return NextResponse.json({ error: "Já existe uma sincronização em execução para este período." }, { status: 409 });
  }

  try {
    const resultado = await sincronizacaoService.sincronizarS5002({
      empresaId,
      cnpjRaiz:      empresa.cnpjRaiz,
      perApur,
      certificadoId: cert.id,
    });

    return NextResponse.json({ success: true, ...resultado });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Erro na sincronização" }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const empresaId = searchParams.get("empresaId");

  try {
    const sincs = await prisma.esocialSincronizacao.findMany({
      where:   empresaId ? { empresaId } : {},
      orderBy: { iniciadoEm: "desc" },
      take:    50,
      include: { 
        empresa: { select: { id: true, razaoSocial: true, cnpjRaiz: true } },
        certificado: { select: { nome: true, ambiente: true } }
      },
    });

    return NextResponse.json(sincs);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

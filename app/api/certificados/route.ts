import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth-server";
import { salvarCertificado } from "@/lib/esocial/certificado.service";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const perfilUpper = user.perfil.toUpperCase();
  if (perfilUpper !== "SUPER_ADMIN" && perfilUpper !== "ADMIN") {
    return NextResponse.json({ error: "Acesso negado. Apenas Administradores podem gerenciar certificados." }, { status: 403 });
  }

  try {
    const formData = await req.formData();
    const file     = formData.get("arquivo") as File;
    const senha    = formData.get("senha")   as string;
    const empresaId = formData.get("empresaId") as string;
    const ambiente  = (formData.get("ambiente") as string) || "producao";
    const nome     = formData.get("nome") as string;

    if (!file || !senha || !empresaId) {
      return NextResponse.json({ error: "ID da Empresa, arquivo .pfx e senha são obrigatórios." }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    const certId = await salvarCertificado({
      empresaId,
      nome:      nome || file.name,
      pfxBuffer: buffer,
      senha,
      ambiente:  ambiente as "producao" | "producao_restrita",
    });

    return NextResponse.json({ success: true, certId });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Erro no processamento do certificado." }, { status: 400 });
  }
}

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const empresaId = searchParams.get("empresaId");
  if (!empresaId) {
    return NextResponse.json({ error: "empresaId é obrigatório." }, { status: 400 });
  }

  try {
    const certs = await prisma.certificadoDigital.findMany({
      where:  { empresaId, ativo: true },
      select: { 
        id: true, 
        nome: true, 
        validade: true, 
        fingerprint: true, 
        ambiente: true, 
        nrInscCert: true,
        createdAt: true 
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(certs);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

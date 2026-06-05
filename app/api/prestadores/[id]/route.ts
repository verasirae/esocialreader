import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { safeJson } from "@/lib/api-utils";
import { normalizeCnpj, normalizeCnpjRaiz } from "@/lib/normalization";
import { reinfRepository } from "@/repositories/reinf.repository";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const prestador = await prisma.prestadorServico.findUnique({
      where: { id }
    });

    if (!prestador) {
      return safeJson({ error: "Prestador não encontrado" }, 404);
    }

    return safeJson(prestador);
  } catch (error: any) {
    console.error("Erro ao buscar prestador:", error);
    return safeJson({ error: "Erro ao buscar prestador" }, 500);
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { cnpj, razaoSocial, nomeFantasia, tipoServico, codigoServico, email, telefone, ativo } = body;

    const current = await prisma.prestadorServico.findUnique({
      where: { id }
    });

    if (!current) {
      return safeJson({ error: "Prestador não encontrado" }, 404);
    }

    const dataToUpdate: any = {};
    if (cnpj !== undefined) {
      const normalizedCnpj = normalizeCnpj(cnpj);
      dataToUpdate.cnpj = normalizedCnpj;
      dataToUpdate.cnpjRaiz = normalizeCnpjRaiz(normalizedCnpj);
    }
    if (razaoSocial !== undefined) dataToUpdate.razaoSocial = razaoSocial;
    if (nomeFantasia !== undefined) dataToUpdate.nomeFantasia = nomeFantasia;
    if (tipoServico !== undefined) dataToUpdate.tipoServico = tipoServico;
    if (codigoServico !== undefined) dataToUpdate.codigoServico = codigoServico;
    if (email !== undefined) dataToUpdate.email = email;
    if (telefone !== undefined) dataToUpdate.telefone = telefone;
    if (ativo !== undefined) dataToUpdate.ativo = ativo;

    const updated = await prisma.prestadorServico.update({
      where: { id },
      data: dataToUpdate
    });

    // Se mudou de CNPJ ou reativou, roda reconciliação
    if (dataToUpdate.cnpj) {
      await reinfRepository.reconciliarPrestador(updated.empresaId, updated.cnpj, updated.id);
    }

    return safeJson(updated);
  } catch (error: any) {
    console.error("Erro ao atualizar prestador:", error);
    if (error.code === 'P2002') {
      return safeJson({ error: "Já existe outro prestador cadastrado com este CNPJ para esta empresa." }, 400);
    }
    return safeJson({ error: "Erro ao atualizar prestador" }, 500);
  }
}

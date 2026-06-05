import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { safeJson } from "@/lib/api-utils";
import { normalizeCnpj, normalizeCnpjRaiz } from "@/lib/normalization";
import { reinfRepository } from "@/repositories/reinf.repository";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const empresaId = searchParams.get("empresaId") || "";
    const search = searchParams.get("search") || "";
    const page = parseInt(searchParams.get("page") || "1");
    const pageSize = parseInt(searchParams.get("pageSize") || "10");
    const skip = (page - 1) * pageSize;

    const where: any = {};
    if (empresaId) {
      where.empresaId = empresaId;
    }
    if (search) {
      const cleanSearch = search.replace(/\D/g, "");
      where.OR = [
        { cnpj: { contains: search } },
        { cnpjRaiz: { contains: search } },
        { razaoSocial: { contains: search, mode: "insensitive" } },
        { nomeFantasia: { contains: search, mode: "insensitive" } }
      ];
      if (cleanSearch) {
        where.OR.push({ cnpj: { contains: cleanSearch } });
      }
    }

    const prestadores = await prisma.prestadorServico.findMany({
      where,
      orderBy: { razaoSocial: "asc" },
      skip,
      take: pageSize
    });

    const total = await prisma.prestadorServico.count({ where });

    return safeJson({
      data: prestadores,
      total,
      page,
      totalPages: Math.ceil(total / pageSize)
    });
  } catch (error: any) {
    console.error("Erro ao listar prestadores:", error);
    return safeJson({ error: "Erro ao listar prestadores" }, 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { empresaId, cnpj, razaoSocial, nomeFantasia, tipoServico, codigoServico, email, telefone } = body;

    if (!empresaId || !cnpj || !razaoSocial) {
      return safeJson({ error: "Campos obrigatórios ausentes: empresaId, cnpj, razaoSocial" }, 400);
    }

    const normalizedCnpj = normalizeCnpj(cnpj);
    const cnpjRaiz = normalizeCnpjRaiz(normalizedCnpj);

    const prestador = await prisma.prestadorServico.upsert({
      where: {
        empresaId_cnpj: {
          empresaId,
          cnpj: normalizedCnpj
        }
      },
      update: {
        razaoSocial,
        nomeFantasia,
        tipoServico,
        codigoServico,
        email,
        telefone,
        ativo: true
      },
      create: {
        empresaId,
        cnpj: normalizedCnpj,
        cnpjRaiz,
        razaoSocial,
        nomeFantasia,
        tipoServico,
        codigoServico,
        email,
        telefone,
        ativo: true
      }
    });

    // Reprocessa pendências do prestador vinculando registros ReinfRTom e ReinfR4020 retroativamente, e resolvendo divergencias
    await reinfRepository.reconciliarPrestador(empresaId, normalizedCnpj, prestador.id);

    return safeJson(prestador, 201);
  } catch (error: any) {
    console.error("Erro ao cadastrar prestador:", error);
    if (error.code === 'P2002') {
      return safeJson({ error: "Já existe um prestador cadastrado com este CNPJ para esta empresa." }, 400);
    }
    return safeJson({ error: "Erro ao cadastrar prestador" }, 500);
  }
}

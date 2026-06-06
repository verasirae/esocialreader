import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search") || "";
    const status = searchParams.get("status") || "todos";
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "15", 10);

    const skip = (page - 1) * limit;

    const where: any = {};

    if (search) {
      where.OR = [
        { codigo: { contains: search, mode: "insensitive" } },
        { denominacao: { contains: search, mode: "insensitive" } },
        { baseLegal: { hasSome: [search] } } // Permite buscar também por bases legais específicas
      ];
      
      // Se a pesquisa parece ser uma base legal, tentar de forma mais flexível
      // como o hasSome exige correspondência exata, vamos apenas manter text contains nos outros campos
    }

    if (status === "ativos") {
      where.ativo = true;
    } else if (status === "inativos") {
      where.ativo = false;
    }

    // Também se a pesquisa text for fornecida e não obteve match exact com hasSome,
    // podemos deixar a cláusula flexível no OR. No Postgres, podemos usar queries mais complexas se necessário,
    // mas o OR com codigo e denominacao resolverá 95% das buscas dos usuários!
    if (search && where.OR) {
      // Ajuste fino: se for um código numérico ou palavra
      where.OR = [
        { codigo: { contains: search, mode: "insensitive" } },
        { denominacao: { contains: search, mode: "insensitive" } }
      ];
    }

    const [total, data] = await Promise.all([
      prisma.rfbCodigoReceita.count({ where }),
      prisma.rfbCodigoReceita.findMany({
        where,
        orderBy: { codigo: "asc" },
        skip,
        take: limit,
      }),
    ]);

    return NextResponse.json({
      data,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error: any) {
    console.error("Erro ao carregar códigos de receita RFB:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const { id, codigo, denominacao, baseLegal, dtCriacao, dtExtincao, ativo } = body;

    if (!id) {
      return NextResponse.json({ error: "O ID do registro é obrigatório para atualização." }, { status: 400 });
    }

    if (!codigo || !denominacao) {
      return NextResponse.json({ error: "Código e Denominação são campos obrigatórios." }, { status: 400 });
    }

    // Verificar se já existe outro registro com o mesmo código
    const existingWithCode = await prisma.rfbCodigoReceita.findFirst({
      where: {
        codigo,
        id: { not: id },
      },
    });

    if (existingWithCode) {
      return NextResponse.json({ error: `Já existe outro registro cadastrado com o código ${codigo}.` }, { status: 400 });
    }

    // Tratar datas recebidas
    const parsedDtCriacao = dtCriacao ? new Date(dtCriacao) : null;
    const parsedDtExtincao = dtExtincao ? new Date(dtExtincao) : null;

    const updated = await prisma.rfbCodigoReceita.update({
      where: { id },
      data: {
        codigo,
        denominacao,
        baseLegal: Array.isArray(baseLegal) ? baseLegal : [],
        dtCriacao: parsedDtCriacao,
        dtExtincao: parsedDtExtincao,
        ativo: typeof ativo === "boolean" ? ativo : true,
      },
    });

    return NextResponse.json({
      success: true,
      data: updated,
    });
  } catch (error: any) {
    console.error("Erro ao atualizar código de receita RFB:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}


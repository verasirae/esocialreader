// app/api/consultas-especiais/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-server";

// GET - Lista todas as consultas especiais salvas e ativas
export async function GET(req: NextRequest) {
  try {
    const sessionUser = await getCurrentUser();
    if (!sessionUser || sessionUser.perfil !== "superAdmin") {
      return NextResponse.json(
        { error: "Acesso não autorizado." },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search") || "";

    const queries = await prisma.consultaEspecial.findMany({
      where: {
        ativo: true,
        OR: search
          ? [
              { titulo: { contains: search, mode: "insensitive" } },
              { descricao: { contains: search, mode: "insensitive" } },
            ]
          : undefined,
      },
      orderBy: [
        { favorito: "desc" },
        { createdAt: "desc" },
      ],
    });

    return NextResponse.json(queries);
  } catch (error: any) {
    console.error("Erro ao listar consultas especiais:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor ao obter consultas especiais." },
      { status: 500 }
    );
  }
}

// POST - Salva uma nova consulta especial
export async function POST(req: NextRequest) {
  try {
    const sessionUser = await getCurrentUser();
    if (!sessionUser || sessionUser.perfil !== "superAdmin") {
      return NextResponse.json(
        { error: "Acesso não autorizado." },
        { status: 401 }
      );
    }

    const { titulo, descricao, tipo, sqlTexto, parametros, favorito } = await req.json();

    if (!titulo || !sqlTexto) {
      return NextResponse.json(
        { error: "Os campos 'titulo' e 'sqlTexto' são obrigatórios." },
        { status: 400 }
      );
    }

    const newQuery = await prisma.consultaEspecial.create({
      data: {
        titulo,
        descricao: descricao || null,
        tipo: tipo || "sql_livre",
        sqlTexto,
        parametros: parametros || null,
        criadoPor: sessionUser.id,
        ativo: true,
        favorito: !!favorito,
      },
    });

    return NextResponse.json(newQuery, { status: 201 });
  } catch (error: any) {
    console.error("Erro ao criar consulta especial:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor ao salvar consulta especial." },
      { status: 500 }
    );
  }
}

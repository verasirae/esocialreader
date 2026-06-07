// app/api/consultas-especiais/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-server";

// GET - Busca uma consulta especial específica
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const sessionUser = await getCurrentUser();
    if (!sessionUser || (sessionUser.perfil !== "SUPER_ADMIN" && sessionUser.perfil !== "superAdmin")) {
      return NextResponse.json(
        { error: "Acesso não autorizado." },
        { status: 401 }
      );
    }

    const { id } = await params;

    const query = await prisma.consultaEspecial.findUnique({
      where: { id },
    });

    if (!query || !query.ativo) {
      return NextResponse.json(
        { error: "Consulta especial não encontrada ou inativa." },
        { status: 404 }
      );
    }

    return NextResponse.json(query);
  } catch (error: any) {
    console.error("Erro ao obter consulta especial:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor ao obter consulta especial." },
      { status: 500 }
    );
  }
}

// PUT - Atualiza uma consulta especial
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const sessionUser = await getCurrentUser();
    if (!sessionUser || (sessionUser.perfil !== "SUPER_ADMIN" && sessionUser.perfil !== "superAdmin")) {
      return NextResponse.json(
        { error: "Acesso não autorizado." },
        { status: 401 }
      );
    }

    const { id } = await params;
    const { titulo, descricao, sqlTexto, tipo, parametros, favorito, ativo } = await req.json();

    // Verifica se a consulta existe
    const existing = await prisma.consultaEspecial.findUnique({
      where: { id },
    });

    if (!existing || !existing.ativo) {
      return NextResponse.json(
        { error: "Consulta especial não encontrada ou excluída." },
        { status: 404 }
      );
    }

    const updated = await prisma.consultaEspecial.update({
      where: { id },
      data: {
        titulo: titulo !== undefined ? titulo : existing.titulo,
        descricao: descricao !== undefined ? descricao : existing.descricao,
        sqlTexto: sqlTexto !== undefined ? sqlTexto : existing.sqlTexto,
        tipo: tipo !== undefined ? tipo : existing.tipo,
        parametros: parametros !== undefined ? parametros : existing.parametros,
        favorito: favorito !== undefined ? !!favorito : existing.favorito,
        ativo: ativo !== undefined ? !!ativo : existing.ativo,
      },
    });

    return NextResponse.json(updated);
  } catch (error: any) {
    console.error("Erro ao atualizar consulta especial:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor ao atualizar consulta especial." },
      { status: 500 }
    );
  }
}

// DELETE - Soft delete (desativa a consulta)
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const sessionUser = await getCurrentUser();
    if (!sessionUser || (sessionUser.perfil !== "SUPER_ADMIN" && sessionUser.perfil !== "superAdmin")) {
      return NextResponse.json(
        { error: "Acesso não autorizado." },
        { status: 401 }
      );
    }

    const { id } = await params;

    const existing = await prisma.consultaEspecial.findUnique({
      where: { id },
    });

    if (!existing || !existing.ativo) {
      return NextResponse.json(
        { error: "Consulta especial não encontrada ou já excluída." },
        { status: 404 }
      );
    }

    await prisma.consultaEspecial.update({
      where: { id },
      data: { ativo: false },
    });

    return NextResponse.json({ success: true, message: "Consulta removida com sucesso." });
  } catch (error: any) {
    console.error("Erro ao deletar consulta especial:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor ao remover consulta especial." },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, hashPassword } from "@/lib/auth-server";

async function checkAdminPermission() {
  const currentUser = await getCurrentUser();
  if (!currentUser) return null;
  if (currentUser.perfil === "superAdmin" || currentUser.perfil === "Admin") {
    return currentUser;
  }
  return null;
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const adminUser = await checkAdminPermission();
    if (!adminUser) {
      return NextResponse.json(
        { error: "Acesso não autorizado." },
        { status: 403 }
      );
    }

    const { id } = await params;
    const body = await req.json();
    const { nome, perfil, ativo, resetPassword } = body;

    // Check if targeting self for certain changes
    if (adminUser.id === id) {
      if (ativo === false) {
        return NextResponse.json(
          { error: "Você não pode desativar o seu próprio usuário." },
          { status: 400 }
        );
      }
      if (perfil && perfil !== adminUser.perfil) {
        return NextResponse.json(
          { error: "Você não pode alterar o seu próprio perfil de acesso." },
          { status: 400 }
        );
      }
    }

    // Fetch the target user first
    const target = await prisma.usuario.findUnique({ where: { id } });
    if (!target) {
      return NextResponse.json({ error: "Usuário não encontrado." }, { status: 404 });
    }

    // Protection constraints
    if (adminUser.perfil === "Admin" && target.perfil === "superAdmin") {
      return NextResponse.json(
        { error: "Um Administrador não pode alterar dados de um SuperAdmin." },
        { status: 403 }
      );
    }
    if (adminUser.perfil === "Admin" && perfil === "superAdmin") {
      return NextResponse.json(
        { error: "Apenas SuperAdmins podem promover usuários para SuperAdmin." },
        { status: 403 }
      );
    }

    const updateData: any = {};
    if (nome !== undefined) updateData.nome = nome;
    if (perfil !== undefined) updateData.perfil = perfil;
    if (ativo !== undefined) updateData.ativo = ativo;
    if (resetPassword) {
      updateData.senha = hashPassword("senha123");
    }

    const updated = await prisma.usuario.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        email: true,
        nome: true,
        perfil: true,
        ativo: true,
        createdAt: true,
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Erro ao atualizar usuário:", error);
    return NextResponse.json(
      { error: "Erro interno ao atualizar usuário." },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const adminUser = await checkAdminPermission();
    if (!adminUser) {
      return NextResponse.json(
        { error: "Acesso não autorizado." },
        { status: 403 }
      );
    }

    const { id } = await params;

    if (adminUser.id === id) {
      return NextResponse.json(
        { error: "Você não pode excluir a si mesmo." },
        { status: 400 }
      );
    }

    const target = await prisma.usuario.findUnique({ where: { id } });
    if (!target) {
      return NextResponse.json({ error: "Usuário não encontrado." }, { status: 404 });
    }

    // Protection constraints
    if (adminUser.perfil === "Admin" && target.perfil === "superAdmin") {
      return NextResponse.json(
        { error: "Um Administrador não pode excluir um SuperAdmin." },
        { status: 403 }
      );
    }

    await prisma.usuario.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Erro ao excluir usuário:", error);
    return NextResponse.json(
      { error: "Erro interno ao excluir usuário." },
      { status: 500 }
    );
  }
}

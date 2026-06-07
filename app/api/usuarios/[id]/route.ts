import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, hashPassword } from "@/lib/auth-server";

async function checkAdminPermission() {
  const currentUser = await getCurrentUser();
  if (!currentUser) return null;
  if (
    currentUser.perfil === "SUPER_ADMIN" ||
    currentUser.perfil === "ADMIN" ||
    currentUser.perfil === "superAdmin" ||
    currentUser.perfil === "Admin"
  ) {
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
    const { nome, perfil, ativo, resetPassword, bloqueadoGerais, modulosBloqueados } = body;

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

    // Protection constraints: Admin cannot alter a SuperAdmin
    const isAdmin = adminUser.perfil === "ADMIN" || adminUser.perfil === "Admin";
    const isTargetSuper = target.perfil === "SUPER_ADMIN" || target.perfil === "superAdmin";
    const isNewPerfilSuper = perfil === "SUPER_ADMIN" || perfil === "superAdmin";

    if (isAdmin && isTargetSuper) {
      return NextResponse.json(
        { error: "Um Administrador não pode alterar dados de um SuperAdmin." },
        { status: 403 }
      );
    }
    if (isAdmin && isNewPerfilSuper) {
      return NextResponse.json(
        { error: "Apenas SuperAdmins podem promover usuários para SuperAdmin." },
        { status: 403 }
      );
    }

    const updateData: any = {};
    if (nome !== undefined) updateData.nome = nome;
    if (perfil !== undefined) updateData.perfil = perfil;
    if (ativo !== undefined) updateData.ativo = ativo;
    if (bloqueadoGerais !== undefined) updateData.bloqueadoGerais = bloqueadoGerais;
    if (modulosBloqueados !== undefined) updateData.modulosBloqueados = modulosBloqueados;
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
        bloqueadoGerais: true,
        modulosBloqueados: true,
        createdAt: true,
      },
    });

    // Logging updated user actions for full traceability
    try {
      let logDesc = `Editou o usuário: ${updated.nome} (${updated.email})`;
      const actionsList: string[] = [];
      if (nome !== undefined && target.nome !== nome) actionsList.push(`Nome de '${target.nome}' para '${nome}'`);
      if (perfil !== undefined && target.perfil !== perfil) actionsList.push(`Perfil de '${target.perfil}' para '${perfil}'`);
      if (ativo !== undefined && target.ativo !== ativo) actionsList.push(ativo ? "Reativado" : "Suspenso");
      if (resetPassword) actionsList.push("Senha resetada para padrão");
      
      if (actionsList.length > 0) {
        logDesc += ` [${actionsList.join("; ")}]`;
      }

      await prisma.governancaLog.create({
        data: {
          usuarioId: adminUser.id,
          usuarioNome: adminUser.nome,
          perfil: adminUser.perfil,
          acao: "USER_UPDATE",
          descricao: logDesc,
          detalhes: { targetUserId: id, updates: { nome, perfil, ativo, resetPassword } }
        }
      });
    } catch (logErr) {
      console.error("Erro ao registrar log de atualização de usuário:", logErr);
    }

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

    // Protection constraints: Admin cannot delete a SuperAdmin
    const isAdmin = adminUser.perfil === "ADMIN" || adminUser.perfil === "Admin";
    const isTargetSuper = target.perfil === "SUPER_ADMIN" || target.perfil === "superAdmin";

    if (isAdmin && isTargetSuper) {
      return NextResponse.json(
        { error: "Um Administrador não pode excluir um SuperAdmin." },
        { status: 403 }
      );
    }

    // Logging deletion before physical removal to preserve name and email
    try {
      await prisma.governancaLog.create({
        data: {
          usuarioId: adminUser.id,
          usuarioNome: adminUser.nome,
          perfil: adminUser.perfil,
          acao: "USER_DELETE",
          descricao: `Excluiu permanentemente o usuário: ${target.nome} (${target.email})`,
          detalhes: { targetUserId: id, email: target.email }
        }
      });
    } catch (logErr) {
      console.error("Erro ao registrar log de exclusão de usuário:", logErr);
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

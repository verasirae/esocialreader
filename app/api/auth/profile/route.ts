import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, hashPassword, setSessionCookie } from "@/lib/auth-server";

export const dynamic = "force-dynamic";

export async function PUT(req: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json(
        { error: "Acesso não autorizado. Sessão expirada ou usuário não autenticado." },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { nome, email, senhaAtual, novaSenha } = body;

    if (!nome) {
      return NextResponse.json(
        { error: "O campo Nome é obrigatório." },
        { status: 400 }
      );
    }

    if (!email) {
      return NextResponse.json(
        { error: "O campo E-mail é obrigatório." },
        { status: 400 }
      );
    }

    const cleanEmail = email.toLowerCase().trim();

    // Buscar o registro atual completo do banco de dados (para validar senha e unicidade)
    const userDb = await prisma.usuario.findUnique({
      where: { id: currentUser.id },
    });

    if (!userDb) {
      return NextResponse.json(
        { error: "Usuário não encontrado na base de dados." },
        { status: 404 }
      );
    }

    // Verificar se o email foi alterado e se já existe em outro usuário
    if (cleanEmail !== userDb.email) {
      const existing = await prisma.usuario.findFirst({
        where: {
          email: cleanEmail,
          id: { not: currentUser.id },
        },
      });

      if (existing) {
        return NextResponse.json(
          { error: "Este endereço de e-mail já está sendo utilizado por outro usuário." },
          { status: 400 }
        );
      }
    }

    const updateData: any = {
      nome,
      email: cleanEmail,
    };

    // Alteração de senha, se fornecida
    if (novaSenha) {
      if (!senhaAtual) {
        return NextResponse.json(
          { error: "Para definir uma nova senha, você precisa informar sua senha atual." },
          { status: 400 }
        );
      }

      // Validar a senha atual hashada
      const hashedCurrent = hashPassword(senhaAtual);
      if (hashedCurrent !== userDb.senha) {
        return NextResponse.json(
          { error: "A senha atual informada está incorreta." },
          { status: 400 }
        );
      }

      if (novaSenha.length < 6) {
        return NextResponse.json(
          { error: "A nova senha deve possuir pelo menos 6 caracteres." },
          { status: 400 }
        );
      }

      updateData.senha = hashPassword(novaSenha);
    }

    // Atualizar no banco
    const updatedUser = await prisma.usuario.update({
      where: { id: currentUser.id },
      data: updateData,
    });

    // Criar novo objeto de sessão para atualizar o cookie criptografado
    const updatedSession = {
      id: updatedUser.id,
      email: updatedUser.email,
      nome: updatedUser.nome,
      perfil: updatedUser.perfil as any,
    };

    await setSessionCookie(updatedSession);

    return NextResponse.json({
      success: true,
      message: "Perfil atualizado com sucesso!",
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        nome: updatedUser.nome,
        perfil: updatedUser.perfil,
        ativo: updatedUser.ativo,
      },
    });
  } catch (error: any) {
    console.error("Erro ao atualizar perfil do usuário:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor ao processar atualização e salvar dados." },
      { status: 500 }
    );
  }
}

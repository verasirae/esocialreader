import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, hashPassword } from "@/lib/auth-server";

export const dynamic = "force-dynamic";

// Helper to check if requester is SuperAdmin or Admin
async function checkAdminPermission() {
  const currentUser = await getCurrentUser();
  if (!currentUser) return null;

  // Securing against impersonator privilege retention:
  // If the user's active session is impersonated, they are currently simulated as a lower privileged user
  // and are not allowed to perform admin functions.
  if (currentUser.impersonator) {
    return null;
  }

  const perfilUpper = currentUser.perfil.toUpperCase();
  if (
    perfilUpper === "SUPER_ADMIN" ||
    perfilUpper === "ADMIN"
  ) {
    return currentUser;
  }
  return null;
}

export async function GET(req: NextRequest) {
  try {
    const adminUser = await checkAdminPermission();
    if (!adminUser) {
      return NextResponse.json(
        { error: "Acesso não autorizado. Apenas administradores podem gerenciar usuários." },
        { status: 403 }
      );
    }

    // List all users ordered by creation date
    const users = await prisma.usuario.findMany({
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
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(users);
  } catch (error) {
    console.error("Erro ao obter usuários:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor ao listar usuários." },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const adminUser = await checkAdminPermission();
    if (!adminUser) {
      return NextResponse.json(
        { error: "Acesso não autorizado. Apenas administradores podem gerenciar usuários." },
        { status: 403 }
      );
    }

    const { email, nome, perfil, bloqueadoGeraisState, modulosBloqueadosState } = await req.json();

    if (!email || !nome || !perfil) {
      return NextResponse.json(
        { error: "Preencha todos os campos obrigatórios (nome, e-mail e perfil)." },
        { status: 400 }
      );
    }

    const cleanEmail = email.toLowerCase().trim();

    // Check if user already exists
    const existing = await prisma.usuario.findUnique({
      where: { email: cleanEmail },
    });

    if (existing) {
      return NextResponse.json(
        { error: "Já existe um usuário cadastrado com este e-mail." },
        { status: 400 }
      );
    }

    // Role hierarchies protection: Admin cannot create a superAdmin / SUPER_ADMIN
    const isAdmin = adminUser.perfil === "ADMIN" || adminUser.perfil === "Admin";
    const isTargetSuper = perfil === "SUPER_ADMIN" || perfil === "superAdmin";
    if (isAdmin && isTargetSuper) {
      return NextResponse.json(
        { error: "Um Administrador não pode cadastrar um usuário com perfil SuperAdmin." },
        { status: 403 }
      );
    }

    // Password padrão "senha123"
    const defaultPasswordHashed = hashPassword("senha123");

    const newUser = await prisma.usuario.create({
      data: {
        email: cleanEmail,
        nome,
        senha: defaultPasswordHashed,
        perfil,
        ativo: true,
        bloqueadoGerais: !!bloqueadoGeraisState,
        modulosBloqueados: modulosBloqueadosState || "",
      },
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

    // Logging action for full traceability
    try {
      await prisma.governancaLog.create({
        data: {
          usuarioId: adminUser.id,
          usuarioNome: adminUser.nome,
          perfil: adminUser.perfil,
          acao: "USER_CREATE",
          descricao: `Criou novo usuário: ${nome} (${cleanEmail}) com perfil ${perfil}`,
          detalhes: { targetUserId: newUser.id, email: cleanEmail, perfil }
        }
      });
    } catch (logErr) {
      console.error("Erro ao registrar log de criação de usuário:", logErr);
    }

    return NextResponse.json(newUser, { status: 201 });
  } catch (error) {
    console.error("Erro ao cadastrar usuário:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor ao cadastrar usuário." },
      { status: 500 }
    );
  }
}

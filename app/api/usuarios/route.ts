import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, hashPassword } from "@/lib/auth-server";

// Helper to check if requester is SuperAdmin or Admin
async function checkAdminPermission() {
  const currentUser = await getCurrentUser();
  if (!currentUser) return null;
  if (currentUser.perfil === "superAdmin" || currentUser.perfil === "Admin") {
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

    const { email, nome, perfil } = await req.json();

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

    // Role hierarchies protection: Admin cannot create a superAdmin
    if (adminUser.perfil === "Admin" && perfil === "superAdmin") {
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
      },
      select: {
        id: true,
        email: true,
        nome: true,
        perfil: true,
        ativo: true,
        createdAt: true,
      },
    });

    return NextResponse.json(newUser, { status: 201 });
  } catch (error) {
    console.error("Erro ao cadastrar usuário:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor ao cadastrar usuário." },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword, setSessionCookie } from "@/lib/auth-server";

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: "E-mail e senha são obrigatórios" },
        { status: 400 }
      );
    }

    const cleanEmail = email.toLowerCase().trim();

    // 1. Check if there are any users in the database. If not, auto-seed the SuperAdmin
    const userCount = await prisma.usuario.count();
    if (userCount === 0) {
      await prisma.usuario.create({
        data: {
          email: "admin@compliance.com",
          nome: "Admin Compliance",
          senha: hashPassword("senha123"),
          perfil: "SUPER_ADMIN",
          ativo: true,
        },
      });
    }

    // 2. Fetch user
    let user = await prisma.usuario.findUnique({
      where: { email: cleanEmail },
    });

    if (!user) {
      return NextResponse.json(
        { error: "Credenciais inválidas" },
        { status: 401 }
      );
    }

    // Automatically migrate legacy profiles to the new ones
    if (user.perfil === "superAdmin" || user.perfil === "Admin" || user.perfil === "user") {
      let newPerfil = "OPERADOR";
      if (user.perfil === "superAdmin") newPerfil = "SUPER_ADMIN";
      else if (user.perfil === "Admin") newPerfil = "ADMIN";
      
      user = await prisma.usuario.update({
        where: { id: user.id },
        data: { perfil: newPerfil },
      });
    }

    if (!user.ativo) {
      return NextResponse.json(
        { error: "Este usuário está inativo. Entre em contato com o administrador." },
        { status: 403 }
      );
    }

    // 3. Verify password
    const hashed = hashPassword(password);
    if (user.senha !== hashed) {
      return NextResponse.json(
        { error: "Credenciais inválidas" },
        { status: 401 }
      );
    }

    // 4. Create and set session cookie
    const sessionUser = {
      id: user.id,
      email: user.email,
      nome: user.nome,
      perfil: user.perfil as any,
    };

    await setSessionCookie(sessionUser);

    return NextResponse.json({
      success: true,
      user: sessionUser,
    });
  } catch (error) {
    console.error("Erro no login:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor ao realizar login" },
      { status: 500 }
    );
  }
}

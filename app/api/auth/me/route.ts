import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth-server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const sessionUser = await getCurrentUser();
    if (!sessionUser) {
      return NextResponse.json({ user: null });
    }

    // Load latest status and details from database for safety
    const dbUser = await prisma.usuario.findUnique({
      where: { id: sessionUser.id },
      select: {
        id: true,
        email: true,
        nome: true,
        perfil: true,
        ativo: true,
        bloqueadoGerais: true,
        modulosBloqueados: true,
      },
    });

    if (!dbUser || !dbUser.ativo) {
      return NextResponse.json({ user: null, blocked: true }, { status: 403 });
    }

    return NextResponse.json({
      user: {
        ...sessionUser,
        perfil: dbUser.perfil as any,
        bloqueadoGerais: dbUser.bloqueadoGerais,
        modulosBloqueados: dbUser.modulosBloqueados || "",
      },
    });
  } catch (error) {
    console.error("Error in /api/auth/me:", error);
    return NextResponse.json({ user: null });
  }
}

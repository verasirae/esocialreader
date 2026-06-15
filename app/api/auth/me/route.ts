import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth-server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

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

    // Fetch profile-specific permissions from PerfilPermissao if any
    let permissions: Record<string, boolean> = {};
    if (dbUser.perfil.toUpperCase() === "SUPER_ADMIN" || dbUser.perfil.toUpperCase() === "ADMIN") {
      permissions = {
        visualizarDashboard: true,
        importarXml: true,
        reprocessarEventos: true,
        excluirDados: true,
        configurarIntegracoes: true,
        consultarLogs: true,
        gerenciarEmpresas: true,
      };
    } else {
      try {
        const profilePerm = await prisma.perfilPermissao.findUnique({
          where: { nomePerfil: dbUser.perfil.toUpperCase() }
        });
        if (profilePerm && profilePerm.permissoes) {
          permissions = profilePerm.permissoes as Record<string, boolean>;
        }
      } catch (err) {
        console.error("Erro ao buscar permissões do perfil:", err);
      }
    }

    return NextResponse.json({
      user: {
        ...sessionUser,
        perfil: dbUser.perfil as any,
        bloqueadoGerais: dbUser.bloqueadoGerais,
        modulosBloqueados: dbUser.modulosBloqueados || "",
        permissoes: permissions,
      },
    });
  } catch (error) {
    console.error("Error in /api/auth/me:", error);
    return NextResponse.json({ user: null });
  }
}

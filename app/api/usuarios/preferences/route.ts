import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth-server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({
        preferences: {
          show_kpi_irrf: true,
          show_kpi_rendimentos: true,
          show_kpi_pendencias: true,
          show_kpi_empregadores: true,
          show_kpi_trabalhadores: true,
          show_kpi_prestadores: true,
          widgets: ["visao-executiva", "posicao-consolidada", "consolidacao-anual", "esocial-reinf", "saude-base", "ultimos-processamentos", "alertas-fiscais", "competencias", "acoes-rapidas"],
          layout: []
        }
      });
    }

    const key = `dashboard_pref_${user.id}`;
    const prefRow = await prisma.configGlobal.findUnique({
      where: { chave: key }
    });

    if (prefRow) {
      try {
        const preferences = JSON.parse(prefRow.valor);
        return NextResponse.json({ preferences });
      } catch (e) {
        console.error("Erro ao fazer parse das preferências salvas:", e);
      }
    }

    // Default corporate setup
    return NextResponse.json({
      preferences: {
        show_kpi_irrf: true,
        show_kpi_rendimentos: true,
        show_kpi_pendencias: true,
        show_kpi_empregadores: true,
        show_kpi_trabalhadores: true,
        show_kpi_prestadores: true,
        widgets: ["visao-executiva", "posicao-consolidada", "consolidacao-anual", "esocial-reinf", "saude-base", "ultimos-processamentos", "alertas-fiscais", "competencias", "acoes-rapidas"],
        layout: []
      }
    });

  } catch (err: any) {
    console.error("Erro no GET de preferências do dashboard:", err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const body = await req.json();
    const { preferences } = body;

    if (!preferences) {
      return NextResponse.json({ error: "Preferências ausentes" }, { status: 400 });
    }

    const key = `dashboard_pref_${user.id}`;
    
    await prisma.configGlobal.upsert({
      where: { chave: key },
      update: {
        valor: JSON.stringify(preferences),
        descricao: `Preferências personalizadas do dashboard do usuário ${user.nome} (${user.email})`
      },
      create: {
        chave: key,
        valor: JSON.stringify(preferences),
        descricao: `Preferências personalizadas do dashboard do usuário ${user.nome} (${user.email})`
      }
    });

    return NextResponse.json({ success: true, preferences });

  } catch (err: any) {
    console.error("Erro no POST de preferências do dashboard:", err);
    return NextResponse.json({ error: "Erro interno", message: err.message }, { status: 500 });
  }
}

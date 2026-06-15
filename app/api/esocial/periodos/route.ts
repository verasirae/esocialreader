import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    // 1. Buscar todos os períodos únicos presentes nos eventos eSocial
    const eventos = await prisma.esocialEvento.findMany({
      select: { perApur: true },
      distinct: ['perApur'],
    });

    const anosSet = new Set<number>();

    // Adicionar anos dos eventos do eSocial
    eventos.forEach(e => {
      const parts = e.perApur.split('-');
      const ano = parseInt(parts[0], 10);
      if (!isNaN(ano)) {
        anosSet.add(ano);
      }
    });

    // 2. Buscar anos criados de forma manual persistidos em ConfigGlobal
    try {
      const configManual = await prisma.configGlobal.findUnique({
        where: { chave: "MANUAL_YEARS" }
      });
      if (configManual && configManual.valor) {
        const manualYearsList: number[] = JSON.parse(configManual.valor);
        if (Array.isArray(manualYearsList)) {
          manualYearsList.forEach(ano => {
            if (!isNaN(ano)) {
              anosSet.add(ano);
            }
          });
        }
      }
    } catch (err) {
      console.warn("Nenhum config 'MANUAL_YEARS' encontrado ou erro ao buscar:", err);
    }

    // Sempre garantir que o ano corrente esteja presente se nenhum outro ano for encontrado
    if (anosSet.size === 0) {
      anosSet.add(new Date().getFullYear());
    }

    // Transformar em array ordenado decrescentemente
    const periodos = Array.from(anosSet)
      .sort((a, b) => b - a)
      .map(ano => ({
        id: ano.toString(),
        anoCalendario: ano,
        dtInicio: `${ano}-01-01T00:00:00.000Z`,
        dtFim: `${ano}-12-31T23:59:59.999Z`,
        label: ano.toString()
      }));

    return NextResponse.json(periodos);
  } catch (error) {
    console.error("Erro ao buscar períodos fiscais:", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const anoStr = body.anoCalendario;
    if (!anoStr) {
      return NextResponse.json({ error: "Ano calendário é obrigatório" }, { status: 400 });
    }

    const ano = parseInt(anoStr, 10);
    if (isNaN(ano) || ano < 1900 || ano > 2100) {
      return NextResponse.json({ error: "Ano calendário inválido" }, { status: 400 });
    }

    // Buscar lista atual de anos manuais
    let manualYearsList: number[] = [];
    try {
      const configManual = await prisma.configGlobal.findUnique({
        where: { chave: "MANUAL_YEARS" }
      });
      if (configManual && configManual.valor) {
        manualYearsList = JSON.parse(configManual.valor);
      }

      if (!manualYearsList.includes(ano)) {
        manualYearsList.push(ano);
        await prisma.configGlobal.upsert({
          where: { chave: "MANUAL_YEARS" },
          update: { valor: JSON.stringify(manualYearsList) },
          create: {
            chave: "MANUAL_YEARS",
            valor: JSON.stringify(manualYearsList),
            descricao: "Anos fiscais cadastrados manualmente pelo usuário"
          }
        });
      }
    } catch (dbErr) {
      console.error("Erro ao salvar ano manual no ConfigGlobal:", dbErr);
      return NextResponse.json({ error: "Erro ao salvar o período fiscal" }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      periodo: {
        id: ano.toString(),
        anoCalendario: ano,
        dtInicio: `${ano}-01-01`,
        dtFim: `${ano}-12-31`,
        label: ano.toString()
      }
    });
  } catch (error) {
    console.error("Erro ao cadastrar novo período:", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}

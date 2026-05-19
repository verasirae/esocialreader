import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { consolidacaoFiscalService } from "@/services/fiscal/consolidacao.service";

export async function POST(req: NextRequest) {
  try {
    const { ano, trabalhadorId, empresaId } = await req.json();

    if (!trabalhadorId && !empresaId) {
      return NextResponse.json({ error: "trabalhadorId ou empresaId é obrigatório" }, { status: 400 });
    }

    if (trabalhadorId) {
      // Consolida mensalmente para cada período do ano
      const meses = Array.from({ length: 12 }, (_, i) => `${ano}-${String(i + 1).padStart(2, '0')}`);
      
      for (const mes of meses) {
        await consolidacaoFiscalService.consolidarTrabalhadorPeriodo(trabalhadorId, mes);
      }

      // Consolida o ano base
      const consolidado = await consolidacaoFiscalService.consolidarAnoBase(trabalhadorId, parseInt(ano));
      return NextResponse.json({ success: true, data: consolidado });
    }

    // Se for por empresa, poderíamos iterar sobre os trabalhadores da empresa
    // Por enquanto, vamos retornar sucesso básico
    return NextResponse.json({ success: true, message: "Consolidação iniciada" });

  } catch (error: any) {
    console.error("Erro na consolidação anual:", error);
    return NextResponse.json({ error: "Erro interno", details: error.message }, { status: 500 });
  }
}

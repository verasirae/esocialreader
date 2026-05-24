import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { FiscalEngine, FiscalNature } from "@/lib/fiscal/engine";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const ano = searchParams.get("ano");
  const mes = searchParams.get("mes");
  const empresaId = searchParams.get("empresaId");

  if (!ano) {
    return NextResponse.json({ error: "Ano é obrigatório" }, { status: 400 });
  }

  try {
    let targetEmpresaId = empresaId;
    if (!targetEmpresaId) {
      const emp = await prisma.empresa.findFirst();
      targetEmpresaId = emp?.id || "";
    }

    if (!targetEmpresaId) {
      return NextResponse.json({ error: "Nenhuma empresa cadastrada ou informada." }, { status: 404 });
    }

    // 1. Build Single Source of Truth Audit Trail utilizing the FiscalEngine
    const auditEntries = await FiscalEngine.buildAuditTrail(targetEmpresaId, ano, mes || undefined);

    // 2. Filter for PLANO_SAUDE entries where ativoFiscal is not false & included is not false & valorCompoeBase is not false
    const planoSaudeEntries = auditEntries.filter(
      (entry) => entry.fiscalNature === FiscalNature.PLANO_SAUDE && entry.ativoFiscal !== false && entry.incluido !== false && entry.valorCompoeBase !== false
    );

    // 3. Compute stats
    const uniqueTitularesSet = new Set<string>();
    const uniqueDependentesSet = new Set<string>();
    let valoresTitulares = 0;
    let valoresDependentes = 0;
    const uniqueOperadorasSet = new Set<string>();

    planoSaudeEntries.forEach((entry) => {
      // Collect uniquely identified operadora
      const cnpjOper = entry.metadata?.cnpjOper || "";
      if (cnpjOper) {
        uniqueOperadorasSet.add(cnpjOper);
      }

      if (entry.categoriaFiscal === "Dedução Saúde - Titular") {
        uniqueTitularesSet.add(entry.cpf);
        valoresTitulares += entry.valor;
      } else if (entry.categoriaFiscal === "Dedução Saúde - Dependente") {
        const cpfDep = entry.metadata?.cpfDep || "unknown";
        uniqueDependentesSet.add(cpfDep);
        valoresDependentes += entry.valor;
      }
    });

    const result = {
      quantidadeTitulares: uniqueTitularesSet.size,
      quantidadeDependentes: uniqueDependentesSet.size,
      valoresTitulares,
      valoresReembolsoTitulares: 0,
      valoresDependentes,
      valoresReembolsoDependentes: 0,
      operadorasCount: uniqueOperadorasSet.size,
    };

    return NextResponse.json(result);
  } catch (err) {
    console.error("[GET Plano Saude API] Error:", err);
    return NextResponse.json({ error: "Erro ao buscar dados do plano de saúde" }, { status: 500 });
  }
}

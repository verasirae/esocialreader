import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { FiscalEngine, FiscalNature, AuditEntry } from "@/lib/fiscal/engine";
import { fiscalCache } from "@/lib/fiscal/cache";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const ano = searchParams.get("ano");
  const mes = searchParams.get("mes");
  const empresaId = searchParams.get("empresaId");
  const forceRefresh = searchParams.get("refresh") === "true";

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

    // Check fiscalCache
    const cacheKey = `${targetEmpresaId}_${ano}_${mes || "all"}`;
    if (!forceRefresh) {
      const cached = fiscalCache.get(cacheKey);
      if (cached) {
        return NextResponse.json(cached);
      }
    }

    // 1. Build Single Source of Truth Audit Trail utilizing the FiscalEngine
    const [auditEntries, auditEntriesReinf] = await Promise.all([
      FiscalEngine.buildAuditTrail(targetEmpresaId, ano, mes || undefined),
      FiscalEngine.buildAuditTrailReinf(targetEmpresaId, ano, mes || undefined)
    ]);

    // 2. Compute crBreakdown and infoIRBreakdown dynamically from the audit trail
    // This guarantees absolute consistency between raw listings and chart aggregations!
    const crBreakdownMap = new Map<string, {
      crMen: string;
      _sum: {
        vlrRendTrib: number;
        vlrRendTrib13: number;
        vlrPrevOficial: number;
        vlrPrevOficial13: number;
        vlrCRMen: number;
        vlrCR13Men: number;
      };
    }>();

    const infoIRBreakdownMap = new Map<string, {
      tpInfoIR: string;
      _sum: {
        valor: number;
      };
    }>();

    auditEntries.forEach((entry: AuditEntry) => {
      if (entry.incluido === false || entry.ativoFiscal === false || entry.valorCompoeBase === false) {
        return;
      }
      // Process crBreakdown
      const cr = entry.cr || "---";
      const existingCR = crBreakdownMap.get(cr) || {
        crMen: cr,
        _sum: {
          vlrRendTrib: 0,
          vlrRendTrib13: 0,
          vlrPrevOficial: 0,
          vlrPrevOficial13: 0,
          vlrCRMen: 0,
          vlrCR13Men: 0,
        }
      };

      if (entry.fiscalNature === FiscalNature.REND_TRIBUTAVEL) {
        if (entry.codigoOficial === "12") {
          existingCR._sum.vlrRendTrib13 += entry.valor;
        } else {
          existingCR._sum.vlrRendTrib += entry.valor;
        }
      } else if (entry.fiscalNature === FiscalNature.PREVIDENCIA_OFICIAL) {
        if (entry.codigoOficial === "42") {
          existingCR._sum.vlrPrevOficial13 += entry.valor;
        } else {
          existingCR._sum.vlrPrevOficial += entry.valor;
        }
      } else if (entry.fiscalNature === FiscalNature.IRRF_RETIDO) {
        if (entry.codigoOficial === "IRRF_13") {
          existingCR._sum.vlrCR13Men += entry.valor;
        } else {
          existingCR._sum.vlrCRMen += entry.valor;
        }
      }

      crBreakdownMap.set(cr, existingCR);

      // Process infoIRBreakdown
      if (entry.origemTabela === "s5002_info_ir") {
        const infoCode = entry.codigoOficial;
        const existingInfo = infoIRBreakdownMap.get(infoCode) || {
          tpInfoIR: infoCode,
          _sum: { valor: 0 }
        };
        existingInfo._sum.valor += entry.valor;
        infoIRBreakdownMap.set(infoCode, existingInfo);
      }
    });

    // --- REINF R-4020: agrega ao mesmo crBreakdownMap ---
    auditEntriesReinf.forEach((entry: AuditEntry) => {
      if (entry.incluido === false || entry.ativoFiscal === false || entry.valorCompoeBase === false) {
        return;
      }

      const cr = entry.cr || "---";
      const existingCR = crBreakdownMap.get(cr) || {
        crMen: cr,
        _sum: {
          vlrRendTrib: 0,
          vlrRendTrib13: 0,
          vlrPrevOficial: 0,
          vlrPrevOficial13: 0,
          vlrCRMen: 0,
          vlrCR13Men: 0,
        }
      };

      if (entry.fiscalNature === FiscalNature.REND_TRIBUTAVEL) {
        existingCR._sum.vlrRendTrib += entry.valor;
      } else if (entry.fiscalNature === FiscalNature.IRRF_RETIDO) {
        existingCR._sum.vlrCRMen += entry.valor;
      }

      crBreakdownMap.set(cr, existingCR);
    });

    const crBreakdown = Array.from(crBreakdownMap.values()).map(v => ({
      crMen: v.crMen,
      _sum: {
        vlrRendTrib: v._sum.vlrRendTrib,
        vlrRendTrib13: v._sum.vlrRendTrib13,
        vlrPrevOficial: v._sum.vlrPrevOficial,
        vlrPrevOficial13: v._sum.vlrPrevOficial13,
        vlrCRMen: v._sum.vlrCRMen,
        vlrCR13Men: v._sum.vlrCR13Men,
      }
    }));

    const infoIRBreakdown = Array.from(infoIRBreakdownMap.values()).map(v => ({
      tpInfoIR: v.tpInfoIR,
      _sum: {
        valor: v._sum.valor
      }
    }));

    // 3. Keep aggregates of the annual consolidations
    const totalsAnual = await prisma.s5002ConsolidadoAnual.aggregate({
      where: {
        empresaId: targetEmpresaId,
        ano: parseInt(ano)
      },
      _sum: {
        vlrRendTrib: true,
        vlrRendTrib13: true,
        vlrPrevOficial: true,
        vlrPensao: true,
        vlrPlanoSaude: true,
        vlrDependentes: true,
        vlrIrrf: true
      }
    });

    // 4. Validate Fiscal Integrity & Persist Divergences
    const fiscalWarnings = await FiscalEngine.validateFiscalIntegrity(targetEmpresaId, ano, auditEntries);
    
    // Clear old warnings for this scope (simulated by deleting un-resolved FISCAL warnings to avoid flooding)
    await prisma.divergenciaFiscal.deleteMany({
      where: {
        resolvido: false,
        tipo: { in: ["FISCAL_WARNING", "FISCAL_ALERT", "CONSOLIDADO_DIVERGENCE"] }
      }
    });

    // Save active discrepancies
    for (const d of fiscalWarnings) {
      await prisma.divergenciaFiscal.create({
        data: {
          tipo: d.tipo,
          descricao: d.descricao,
          severidade: d.severidade,
          resolvido: false
        }
      });
    }

    // Mapa de descrições para uso direto no frontend (evita lookup por código no client)
    const codigosEmUso = new Set<string>();
    [...auditEntries, ...auditEntriesReinf].forEach(e => {
      const cr = (e.cr || e.tpCR || "").replace(/\D/g, "").substring(0, 4);
      if (/^\d{4}$/.test(cr)) codigosEmUso.add(cr);
    });

    const tabelaCodigos = await prisma.rfbCodigoReceita.findMany({
      where: { codigo: { in: Array.from(codigosEmUso) } },
      select: { codigo: true, denominacao: true }
    });

    const codigosReceita = Object.fromEntries(
      tabelaCodigos.map(t => [t.codigo, t.denominacao])
    );

    const responseData = {
      crBreakdown,
      infoIRBreakdown,
      auditEntries,
      auditEntriesReinf,      // ← novo
      codigosReceita,          // ← novo: { "0561": "Rendimentos do trabalho...", "1708": "..." }
      divergencias: fiscalWarnings,
      totals: totalsAnual._sum
    };
    
    fiscalCache.set(cacheKey, responseData);

    return NextResponse.json(responseData);
  } catch (err) {
    console.error("[GET Rendimentos API] Error:", err);
    return NextResponse.json({ error: "Erro ao buscar rendimentos" }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { safeJson } from "@/lib/api-utils";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1");
    const search = searchParams.get("search") || "";
    const pageSize = 10;
    const skip = (page - 1) * pageSize;

    const events = await prisma.s5002.findMany({
      where: {
        OR: [
          { trabalhador: { cpf: { contains: search } } },
          { empresa: { cnpjRaiz: { contains: search } } },
        ]
      },
      include: {
        trabalhador: true,
        empresa: true,
        demonstrativos: {
          include: {
            infoIris: true
          }
        },
        totais: true,
        planosSaude: {
          include: {
            beneficarios: true
          }
        }
      },
      orderBy: { competencia: "desc" },
      skip,
      take: pageSize,
    });

    const total = await prisma.s5002.count({
      where: {
        OR: [
          { trabalhador: { cpf: { contains: search } } },
          { empresa: { cnpjRaiz: { contains: search } } },
        ]
      }
    });

    // Enriquecer com lógica de auditoria em tempo real para a listagem
    const auditedEvents = events.map(event => {
      let calcBase = 0;
      let xmlBase = 0;
      let hasHealthPlanInconsistencies = false;
      
      // Regra: Base IR = Trad (11,12,13) - Ded (41-44, 46-47, 51-55, 67)
      event.demonstrativos.forEach(dm => {
        dm.infoIris.forEach(ir => {
          const valor = Number(ir.valor);
          if (["11", "12", "13"].includes(ir.tpInfoIR)) {
            calcBase += valor;
          } else if (["41", "42", "43", "44", "46", "47", "51", "52", "53", "54", "55", "67"].includes(ir.tpInfoIR)) {
            calcBase -= valor;
          }
        });
      });

      // XML Base (Trazendo do Totais)
      const totalRec = event.totais.find(t => t.codReceita === "056107" || t.codReceita === "058806");
      xmlBase = Number(totalRec?.vlrRendTrib || 0);

      // Validação Plano de Saúde
      const hasPlanDetails = event.planosSaude.length > 0;
      const hasPlanInfoIR = event.demonstrativos.some(dm => dm.infoIris.some(ir => ir.tpInfoIR === "67"));
      if (hasPlanDetails && !hasPlanInfoIR) hasHealthPlanInconsistencies = true;

      return {
        ...event,
        audit: {
          calcBase,
          xmlBase,
          diff: Math.abs(calcBase - xmlBase),
          status: Math.abs(calcBase - xmlBase) < 0.01 ? "Regular" : "Divergente",
          healthPlanError: hasHealthPlanInconsistencies
        }
      };
    });

    return safeJson({
      data: auditedEvents,
      total,
      page,
      totalPages: Math.ceil(total / pageSize)
    });

  } catch (error) {
    console.error("Erro ao listar auditorias:", error);
    return safeJson({ error: "Erro ao carregar dados" }, 500);
  }
}

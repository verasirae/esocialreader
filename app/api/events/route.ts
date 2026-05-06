import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const events = await prisma.s5002.findMany({
      include: {
        trabalhador: true,
        demonstrativos: {
          include: {
            infoIris: true
          }
        },
        totais: true,
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 20,
    });
    
    // Enrich with audit logic for the legacy dashboard
    const auditedEvents = events.map(event => {
      let calcBase = 0;
      let xmlBase = 0;
      
      // Calculate base from infoIris
      event.demonstrativos.forEach(dm => {
        dm.infoIris.forEach(ir => {
          const valor = Number(ir.valor);
          // 11, 12, 13 are taxable
          if (["11", "12", "13"].includes(ir.tpInfoIR)) {
            calcBase += valor;
          } else if (["41", "42", "43", "44", "46", "47", "51", "52", "53", "54", "55", "67"].includes(ir.tpInfoIR)) {
            calcBase -= valor;
          }
        });
      });

      // XML Base from Totais (codReceita 056107 or 058806)
      const totalRec = event.totais.find(t => t.codReceita === "056107" || t.codReceita === "058806");
      xmlBase = Number(totalRec?.vlrRendTrib || 0);

      return {
        ...event,
        // Mock the old baseIR structure for the UI to not break
        baseIR: {
          baseCalculada: calcBase,
          baseXml: xmlBase,
          divergencia: Math.abs(calcBase - xmlBase) > 0.01
        }
      };
    });

    // Safely transform Decimals to strings for JSON serialization
    const serializedEvents = JSON.parse(JSON.stringify(auditedEvents, (key, value) =>
      typeof value === 'object' && value !== null && value.constructor.name === 'Decimal'
        ? value.toString()
        : value
    ));

    return NextResponse.json(serializedEvents);
  } catch (error: any) {
    console.error("Erro ao buscar eventos [PRISMA ERROR]:", error);
    return NextResponse.json({ 
      error: "Erro ao buscar eventos", 
      code: error.code,
      details: error.message || "Erro desconhecido",
    }, { status: 500 });
  }
}

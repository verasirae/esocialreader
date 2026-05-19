import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { safeJson } from "@/lib/api-utils";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1");
    const search = searchParams.get("search") || "";
    const ano = searchParams.get("ano") || "";
    const pageSize = 10;
    const skip = (page - 1) * pageSize;

    const where: any = {
      tpEvento: "S-5002",
      ...(ano ? { perApur: { startsWith: ano } } : {}),
      OR: [
        { trabalhador: { cpf: { contains: search } } },
        { empresa: { cnpjRaiz: { contains: search } } },
      ]
    };

    const events = await prisma.esocialEvento.findMany({
      where,
      include: {
        trabalhador: true,
        empresa: true,
        s5002: {
          include: {
            demonstrativos: {
              include: {
                infoIR: true,
                totais: true
              }
            }
          }
        },
        divergencias: true
      },
      orderBy: { perApur: "desc" },
      skip,
      take: pageSize,
    });

    const total = await prisma.esocialEvento.count({ where });

    // Enriquecer com lógica de auditoria vindo das divergências persistidas
    const auditedEvents = events.map(event => {
      const s5002 = event.s5002;
      let calcBase = 0;
      let xmlBase = 0;
      
      if (s5002) {
        s5002.demonstrativos.forEach(dm => {
          // Filtro crucial: apenas processar o valor se for referente ao mês da apuração do evento
          if (dm.perRef !== event.perApur) return;

          dm.infoIR.forEach(ir => {
            const valor = Number(ir.valor || 0);
            if (["11", "12", "13"].includes(ir.tpInfoIR)) {
              calcBase += valor;
            } else if (["41", "42", "43", "44", "46", "47", "51", "52", "53", "54", "55", "67"].includes(ir.tpInfoIR)) {
              calcBase -= valor;
            }
          });

          dm.totais.forEach(tot => {
            xmlBase += Number(tot.vlrRendTrib || 0) + Number(tot.vlrRendTrib13 || 0);
          });
        });
      }

      return {
        ...event,
        audit: {
          calcBase,
          xmlBase,
          diff: Math.abs(calcBase - xmlBase),
          status: event.divergencias.length === 0 ? "Regular" : "Divergente",
          divergencias: event.divergencias
        }
      };
    });

    return safeJson({
      data: auditedEvents,
      total,
      page,
      totalPages: Math.ceil(total / pageSize)
    });

  } catch (error: any) {
    console.error("Erro ao listar auditorias [PRISMA ERROR]:", error);
    return safeJson({ 
      error: "Erro ao carregar dados",
      message: error.message
    }, 500);
  }
}

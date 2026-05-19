import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { safeJson } from "@/lib/api-utils";

export async function GET() {
  try {
    // Buscar eventos ativos
    const events = await prisma.esocialEvento.findMany({
      where: {
        ativo: true,
        tpEvento: "S-5002"
      },
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
        }
      },
      orderBy: {
        perApur: "desc",
      },
      take: 50,
    });
    
    // Enriquecer com lógica de auditoria baseada no novo schema
    const auditedEvents = events.map(evt => {
      let calcBase = 0;
      let xmlBase = 0;
      
      const s5002 = evt.s5002;
      const trabalhador = evt.trabalhador || { cpf: "N/A", nome: "Não encontrado" };
      
      if (s5002 && s5002.demonstrativos) {
        s5002.demonstrativos.forEach(dm => {
          if (dm.infoIR) {
            dm.infoIR.forEach(ir => {
              const valor = Number(ir.valor || 0);
              const tp = ir.tpInfoIR;
              if (["11", "12", "13"].includes(tp)) {
                calcBase += valor;
              } else if (["41", "42", "43", "44", "46", "47", "51", "52", "53", "54", "55", "67"].includes(tp)) {
                calcBase -= valor;
              }
            });
          }

          if (dm.totais) {
            dm.totais.forEach(tot => {
              xmlBase += Number(tot.vlrRendTrib || 0) + Number(tot.vlrRendTrib13 || 0);
            });
          }
        });
      }

      return {
        ...evt,
        trabalhador, // Garantir que trabalhador exista para o frontend
        competencia: evt.perApur,
        baseIR: {
          baseCalculada: calcBase,
          baseXml: xmlBase,
          divergencia: Math.abs(calcBase - xmlBase) > 0.01
        }
      };
    });

    return safeJson(auditedEvents);
  } catch (error: any) {
    console.error("Erro ao buscar eventos refatorados:", error);
    
    // Extrair mais detalhes da falha do Prisma se disponíveis
    const errorDetails = {
      message: error.message,
      code: error.code,
      meta: error.meta,
      clientVersion: error.clientVersion
    };

    return safeJson({ 
      error: "Erro ao buscar eventos", 
      details: errorDetails
    }, 500);
  }
}

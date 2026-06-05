import { prisma } from "@/lib/prisma";
import { ReinfR2099ParserResult } from "@/dto/reinf-r2099.dto";
import { StatusProcessamento } from "@prisma/client";
import { normalizeCnpj } from "@/lib/normalization";

export class ReinfRepository {
  async saveR2099(
    empresaIdBase: string,
    parsedData: ReinfR2099ParserResult,
    loteId?: string
  ) {
    return await prisma.$transaction(async (tx) => {
      // 1. Resolve empresa pelo cnpjRaiz
      const empresa = await tx.empresa.findUnique({
        where: { cnpjRaiz: parsedData.cnpjRaiz }
      });
      const resolvedEmpresaId = empresa?.id || null;

      // 2. Idempotência — evita duplicidade pelo idEvento
      const existing = await tx.reinfEvento.findUnique({
        where: { idEvento: parsedData.idEvento }
      });
      if (existing) return existing;

      // 3. Cria o evento base
      const evento = await tx.reinfEvento.create({
        data: {
          empresaId: resolvedEmpresaId,
          loteId,
          idEvento: parsedData.idEvento,
          tpEvento: `R-${parsedData.tpEvento}`,
          perApur: parsedData.perApur,
          nrRecArqBase: parsedData.nrRecArqBase,
          dhRecepcao: parsedData.dhRecepcao,
          dhProcess: parsedData.dhProcess,
          cnpjRaiz: parsedData.cnpjRaiz,
          ativo: true,
          status: resolvedEmpresaId
            ? StatusProcessamento.processado
            : StatusProcessamento.pendente,
          processadoEm: new Date()
        }
      });

      if (!resolvedEmpresaId) {
        await tx.reinfDivergencia.create({
          data: {
            eventoId: evento.id,
            tipo: "PENDENCIA_CADASTRAL",
            descricao: `EMPRESA NÃO IDENTIFICADA - CNPJ RAIZ: ${parsedData.cnpjRaiz}`,
            severidade: "ALTA"
          }
        });
      }

      // 4. Cria o R2099
      const r2099 = await tx.reinfR2099.create({
        data: {
          eventoId: evento.id,
          empresaId: resolvedEmpresaId,
          perApur: parsedData.perApur,
          indExistInfo: parsedData.indExistInfo,
          identEscritDCTF: parsedData.identEscritDCTF
        }
      });

      // 5. Para cada RTom, cruza com PrestadorServico e persiste
      for (const rtom of parsedData.retencoesPorPrestador) {
        // Tenta resolver o prestador pelo CNPJ completo, com fallback para raiz
        let prestador = resolvedEmpresaId
          ? await tx.prestadorServico.findUnique({
              where: {
                empresaId_cnpj: {
                  empresaId: resolvedEmpresaId,
                  cnpj: rtom.cnpjPrestador
                }
              }
            })
          : null;

        const rTomRecord = await tx.reinfRTom.create({
          data: {
            r2099Id: r2099.id,
            prestadorId: prestador?.id || null,
            cnpjPrestador: rtom.cnpjPrestador,
            vlrTotalBaseRet: rtom.vlrTotalBaseRet,
            codigosReceita: {
              create: rtom.codigosReceita.map(cr => ({
                crTom: cr.crTom,
                vlrCRTom: cr.vlrCRTom,
                vlrCRTomSusp: cr.vlrCRTomSusp
              }))
            }
          }
        });

        // Gera divergência se prestador não identificado
        if (!prestador && resolvedEmpresaId) {
          await tx.reinfDivergencia.create({
            data: {
              eventoId: evento.id,
              tipo: "PRESTADOR_NAO_IDENTIFICADO",
              descricao: `PRESTADOR NÃO CADASTRADO - CNPJ: ${rtom.cnpjPrestador} | Base: R$ ${rtom.vlrTotalBaseRet.toFixed(2).replace(".", ",")}`,
              severidade: "MEDIA"
            }
          });
        }
      }

      // 6. Histórico
      await tx.reinfEventoHistorico.create({
        data: {
          eventoId: evento.id,
          acao: "parse",
          descricao: `R-2099 processado. Período: ${parsedData.perApur}. Prestadores: ${parsedData.retencoesPorPrestador.length}.`
        }
      });

      return evento;
    }, { timeout: 30000 });
  }

  async reconciliarPrestador(empresaId: string, cnpj: string, prestadorId: string) {
    // 1. Reconcilia no R-2099 (ReinfRTom)
    await prisma.reinfRTom.updateMany({
      where: {
        cnpjPrestador: cnpj,
        prestadorId: null,
        r2099: {
          empresaId
        }
      },
      data: { prestadorId }
    });

    // 2. Reconcilia no R-4020 (ReinfR4020)
    await prisma.reinfR4020.updateMany({
      where: {
        cnpjBenef: cnpj,
        prestadorId: null,
        r4020Evento: {
          empresaId
        }
      },
      data: { prestadorId }
    });

    // 3. Marca as divergências de "PRESTADOR_NAO_IDENTIFICADO" como resolvidas
    await prisma.reinfDivergencia.updateMany({
      where: {
        tipo: "PRESTADOR_NAO_IDENTIFICADO",
        descricao: {
          contains: cnpj
        },
        evento: {
          empresaId
        }
      },
      data: {
        resolvido: true
      }
    });

    return true;
  }
}

export const reinfRepository = new ReinfRepository();

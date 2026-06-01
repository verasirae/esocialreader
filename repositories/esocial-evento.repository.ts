import { prisma } from "@/lib/prisma";
import { S5002ParserResult } from "@/dto/s5002.dto";
import { StatusProcessamento, TipoAcaoHistorico } from "@prisma/client";
import { normalizeCpf } from "@/lib/normalization";

export class EsocialEventoRepository {
  /**
   * Registra um novo evento e trata a lógica de retificação/substituição.
   */
  async saveS5002(empresaIdBase: string, parsedData: S5002ParserResult, xmlPath?: string, xmlHash?: string, loteId?: string, forceTrabalhadorId?: string) {
    const cpfNormalized = normalizeCpf(parsedData.trabalhador.cpfBenef);

    try {
      return await prisma.$transaction(async (tx) => {
        // 1. Resolver Empresa
        const empresa = parsedData.cnpjRaiz ? await tx.empresa.findUnique({
          where: { cnpjRaiz: parsedData.cnpjRaiz }
        }) : null;

        const resolvedEmpresaId = empresa?.id || null;
        
        // 2. Resolver Trabalhador
        let resolvedTrabalhadorId = forceTrabalhadorId || null;
        
        if (!resolvedTrabalhadorId && resolvedEmpresaId && parsedData.trabalhador.cpfBenef) {
          const trabajador = await tx.trabalhador.findUnique({
            where: {
              empresaId_cpf: {
                empresaId: resolvedEmpresaId,
                cpf: cpfNormalized
              }
            }
          });
          resolvedTrabalhadorId = trabajador?.id || null;
        }

        // 3. Verificar duplicidade e tratar retificação de forma atômica
        const existing = await tx.esocialEvento.findUnique({
          where: { eventoId: parsedData.eventoId }
        });

        if (existing) {
          // Se já existe, atualiza vínculos ou dados correspondentes se necessário/mudados (auto-cura de nrRecibo/nrReciboOrig histórico)
          const needsRelationUpdate = (!existing.empresaId && resolvedEmpresaId) || (!existing.trabalhadorId && resolvedTrabalhadorId);
          const needsReceiptUpdate = (existing.nrRecibo !== parsedData.nrRecibo) || (parsedData.nrReciboOrig && existing.nrReciboOrig !== parsedData.nrReciboOrig);

          if (needsRelationUpdate || needsReceiptUpdate) {
            return await tx.esocialEvento.update({
              where: { id: existing.id },
              data: {
                empresaId: existing.empresaId || resolvedEmpresaId,
                trabalhadorId: existing.trabalhadorId || resolvedTrabalhadorId,
                nrRecibo: parsedData.nrRecibo || existing.nrRecibo,
                nrReciboOrig: parsedData.nrReciboOrig || existing.nrReciboOrig,
                status: (existing.empresaId || resolvedEmpresaId) && (existing.trabalhadorId || resolvedTrabalhadorId) 
                  ? StatusProcessamento.processado 
                  : StatusProcessamento.pendente
              }
            });
          }
          return existing; 
        }

        // 4. Lógica de Retificação (nrReciboOrig)
        let substituidoId: string | undefined;
        if (parsedData.indRetif === 2 && parsedData.nrReciboOrig) {
          const original = await tx.esocialEvento.findFirst({
            where: {
              cnpjRaiz: parsedData.cnpjRaiz,
              cpfBenef: cpfNormalized,
              nrRecibo: parsedData.nrReciboOrig,
              ativo: true
            },
            orderBy: { createdAt: 'desc' }
          });

          if (original) {
            substituidoId = original.id;
            await tx.esocialEvento.update({
              where: { id: original.id },
              data: { 
                ativo: false,
                invalidadoEm: new Date(),
                status: StatusProcessamento.substituido
              }
            });

            await tx.esocialEventoHistorico.create({
              data: {
                eventoId: original.id,
                acao: TipoAcaoHistorico.substituicao,
                descricao: `Evento substituído pela retificação ${parsedData.nrRecibo}`,
                payloadDepois: { nrReciboRetif: parsedData.nrRecibo } as any
              }
            });
          }
        }

        // 5. Criar o novo evento
        const evento = await tx.esocialEvento.create({
          data: {
            empresaId: resolvedEmpresaId,
            loteId,
            trabalhadorId: resolvedTrabalhadorId,
            cnpjRaiz: parsedData.cnpjRaiz,
            cpfBenef: cpfNormalized,
            eventoId: parsedData.eventoId,
            tpEvento: parsedData.tpEvento,
            perApur: parsedData.perApur,
            indRetif: parsedData.indRetif,
            nrRecibo: parsedData.nrRecibo,
            nrReciboOrig: parsedData.nrReciboOrig,
            xmlHash: xmlHash || "",
            xmlPath: xmlPath,
            ativo: true,
            status: (resolvedEmpresaId && resolvedTrabalhadorId) ? StatusProcessamento.processado : StatusProcessamento.pendente,
            processadoEm: new Date()
          }
        });

        // 5a. Registrar Divergências
        if (!resolvedEmpresaId && parsedData.cnpjRaiz) {
          await tx.divergenciaFiscal.create({
            data: {
              eventoId: evento.id,
              tipo: "PENDENCIA_CADASTRAL",
              descricao: `EMPREGADOR NÃO IDENTIFICADO - CNPJ RAIZ: ${parsedData.cnpjRaiz}`,
              severidade: "ALTA"
            }
          });
        }

        if (!resolvedTrabalhadorId && parsedData.trabalhador.cpfBenef) {
          await tx.divergenciaFiscal.create({
            data: {
              eventoId: evento.id,
              tipo: "PENDENCIA_CADASTRAL",
              descricao: `TRABALHADOR NÃO IDENTIFICADO - CPF: ${parsedData.trabalhador.cpfBenef}`,
              severidade: "ALTA"
            }
          });
        }

        if (substituidoId) {
          await tx.esocialEvento.update({
            where: { id: substituidoId },
            data: { substituidoPorId: evento.id }
          });
        }

        await tx.esocialEventoHistorico.create({
          data: {
            eventoId: evento.id,
            acao: parsedData.indRetif === 2 ? TipoAcaoHistorico.retificacao : TipoAcaoHistorico.parse,
            descricao: parsedData.indRetif === 2 ? "Evento retificado processado" : "Evento original processado"
          }
        });

        return evento;
      }, {
        timeout: 60000 // 60 segundos
      });
    } catch (err: any) {
      console.error("[EsocialEventoRepository] Erro ao salvar evento:", err);
      if (err.code) console.error("[EsocialEventoRepository] Codigo Prisma:", err.code);
      throw err;
    }
  }
}

export const esocialEventoRepository = new EsocialEventoRepository();

import { prisma } from "@/lib/prisma";
import { ReinfR4020ParserResult } from "@/dto/reinf-r4020.dto";
import { StatusProcessamento } from "@prisma/client";

export class ReinfR4020Repository {
  async save(parsedData: ReinfR4020ParserResult, loteId?: string) {
    return await prisma.$transaction(async (tx) => {
      // 1. Resolve empresa
      const empresa = await tx.empresa.findUnique({
        where: { cnpjRaiz: parsedData.cnpjRaiz }
      });
      const resolvedEmpresaId = empresa?.id || null;

      // 2. Idempotência
      const existing = await tx.reinfEvento.findUnique({
        where: { idEvento: parsedData.idEvento }
      });
      if (existing) return existing;

      // 3. Evento base
      const evento = await tx.reinfEvento.create({
        data: {
          empresaId: resolvedEmpresaId,
          loteId,
          idEvento: parsedData.idEvento,
          tpEvento: "R-4020",
          perApur: parsedData.perApur,
          nrRecArqBase: parsedData.nrRecArqBase,
          dhRecepcao: parsedData.dhRecepcao,
          dhProcess: parsedData.dhProcess,
          cnpjRaiz: parsedData.cnpjRaiz,
          formatoXml: parsedData.formatoXml,
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
        return evento;
      }

      // 4. Cabeçalho R-4020
      const r4020Evento = await tx.reinfR4020Evento.create({
        data: {
          eventoId: evento.id,
          empresaId: resolvedEmpresaId,
          perApur: parsedData.perApur,
          cnpjEstab: parsedData.cnpjEstab
        }
      });

      // 5. Registros por beneficiário
      for (const benef of parsedData.beneficiarios) {
        // Cruzamento com cadastro de prestadores
        const prestador = await tx.prestadorServico.findUnique({
          where: {
            empresaId_cnpj: {
              empresaId: resolvedEmpresaId,
              cnpj: benef.cnpjBenef
            }
          }
        });

        const r4020 = await tx.reinfR4020.create({
          data: {
            r4020EventoId: r4020Evento.id,
            prestadorId: prestador?.id || null,
            cnpjBenef: benef.cnpjBenef
          }
        });

        // Divergência se prestador não cadastrado
        if (!prestador) {
          const totalBase = benef.totApurMen
            .reduce((acc, cr) => acc + cr.vlrBaseCRMen, 0);
          const totalRetido = benef.totApurMen
            .reduce((acc, cr) => acc + cr.vlrCRMenInf, 0);

          await tx.reinfDivergencia.create({
            data: {
              eventoId: evento.id,
              tipo: "PRESTADOR_NAO_IDENTIFICADO",
              descricao: `PRESTADOR NÃO CADASTRADO - CNPJ: ${benef.cnpjBenef} | Período: ${parsedData.perApur} | Base: R$ ${totalBase.toFixed(2).replace(".", ",")} | Retido: R$ ${totalRetido.toFixed(2).replace(".", ",")}`,
              severidade: "MEDIA"
            }
          });
        }

        // 6. Retenções por CRMen — nível atômico fiscal
        for (const cr of benef.totApurMen) {
          if (!cr.crMen) continue; // Nunca persiste CRMen vazio

          await tx.reinfR4020CRMen.create({
            data: {
              r4020Id: r4020.id,
              crMen: cr.crMen,          // Persistido exato do XML
              vlrBaseCRMen: cr.vlrBaseCRMen,
              vlrCRMenInf: cr.vlrCRMenInf,
              natRend: cr.natRend || null,
              vlrCRMenSusp: cr.vlrCRMenSusp ?? 0
            }
          });
        }
      }

      // 7. Histórico
      const totalPrestadores = parsedData.beneficiarios.length;
      const totalCRMen = parsedData.beneficiarios
        .reduce((acc, b) => acc + b.totApurMen.length, 0);

      await tx.reinfEventoHistorico.create({
        data: {
          eventoId: evento.id,
          acao: "parse",
          descricao: `R-4020 (${parsedData.formatoXml}) processado. Período: ${parsedData.perApur} | Estab: ${parsedData.cnpjEstab} | Prestadores: ${totalPrestadores} | Registros CRMen: ${totalCRMen}`
        }
      });

      return evento;
    }, { timeout: 30000 });
  }

  /**
   * Reconcilia prestadores cadastrados após importação:
   * vincula ReinfR4020 que estavam com prestadorId=null.
   */
  async reconciliarPrestador(
    empresaId: string,
    cnpj: string,
    prestadorId: string
  ) {
    return await prisma.reinfR4020.updateMany({
      where: {
        cnpjBenef: cnpj,
        prestadorId: null,
        r4020Evento: { empresaId }
      },
      data: { prestadorId }
    });
  }
}

export const reinfR4020Repository = new ReinfR4020Repository();

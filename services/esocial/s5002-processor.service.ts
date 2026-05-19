import { s5002Parser } from "@/services/parser/s5002-parser.service";
import { esocialEventoRepository } from "@/repositories/esocial-evento.repository";
import { s5002Repository } from "@/repositories/s5002.repository";
import { consolidacaoFiscalService } from "@/services/fiscal/consolidacao.service";
import { prisma } from "@/lib/prisma";
import { StatusProcessamento } from "@prisma/client";

export class S5002ProcessorService {
  async process(data: { 
    xmlContent: string; 
    empresaId: string; 
    trabalhadorId?: string; // ID já resolvido na importação
    xmlPath: string; 
    xmlHash: string; 
    loteId?: string 
  }) {
    const { xmlContent, empresaId, trabalhadorId, xmlPath, xmlHash, loteId } = data;

    try {
      console.log(`[Processor] Iniciando processamento de evento S-5002`);

      // 1. Parse XML
      const parsedData = s5002Parser.parse(xmlContent);

      // 2. Persistir Evento Base e tratar retificações
      const evento = await esocialEventoRepository.saveS5002(
        empresaId,
        parsedData,
        xmlPath,
        xmlHash,
        loteId,
        trabalhadorId // Passar o ID resolvido se houver
      );

      // 3. Persistir Detalhes S5002 (Sempre salvamos os detalhes para permitir re-processamento sem XML)
      await s5002Repository.saveDetails(evento.id, parsedData);

      // 2.1. Bloqueio Arquitetural OBRIGATÓRIO: Se o evento estiver PENDENTE por falta de cadastro,
      // interrompemos a CONSOLIDAÇÃO até que a pendência seja sanada.
      if (evento.status === StatusProcessamento.pendente) {
        console.log(`[Processor] Evento ${evento.eventoId} marcado como PENDENTE. Detalhes salvos, aguardando cadastro para consolidar.`);
        if (loteId) {
          await prisma.esocialLote.update({
            where: { id: loteId },
            data: { 
              status: StatusProcessamento.pendente,
              processadoEm: new Date()
            }
          });
        }
        return { success: false, status: "PENDENTE", eventoId: evento.eventoId };
      }

      // 4. Consolidar Período Principal
      await consolidacaoFiscalService.consolidarTrabalhadorPeriodo(
        evento.trabalhadorId,
        evento.perApur,
        evento.cpfBenef || undefined,
        evento.cnpjRaiz || undefined
      );

      // 4.1. Se houver períodos anteriores (retroativos), consolidar cada um deles
      if (parsedData.infoIRComplem?.perAnt) {
        for (const p of parsedData.infoIRComplem.perAnt) {
          console.log(`[Processor] Detectado retroativo para ${p.perRefAjuste}. Re-consolidando...`);
          await consolidacaoFiscalService.consolidarTrabalhadorPeriodo(
            evento.trabalhadorId,
            p.perRefAjuste,
            evento.cpfBenef || undefined,
            evento.cnpjRaiz || undefined
          );
        }
      }

      // 5. Consolidar Ano-Base
      const ano = parseInt(evento.perApur.split("-")[0]);
      await consolidacaoFiscalService.consolidarAnoBase(
        evento.trabalhadorId, 
        ano,
        evento.cpfBenef || undefined,
        evento.cnpjRaiz || undefined
      );

      // 6. Atualizar status do Lote se fornecido
      if (loteId) {
        await prisma.esocialLote.update({
          where: { id: loteId },
          data: { 
            status: StatusProcessamento.processado,
            processadoEm: new Date()
          }
        });
      }

      // Se processou retroativos de outros anos, consolidar esses anos também
      if (parsedData.infoIRComplem?.perAnt) {
        const anosProcessados = new Set<number>();
        anosProcessados.add(ano);

        for (const p of parsedData.infoIRComplem.perAnt) {
          const anoRetro = parseInt(p.perRefAjuste.split("-")[0]);
          if (!anosProcessados.has(anoRetro)) {
            await consolidacaoFiscalService.consolidarAnoBase(
              evento.trabalhadorId, 
              anoRetro,
              evento.cpfBenef || undefined,
              evento.cnpjRaiz || undefined
            );
            anosProcessados.add(anoRetro);
          }
        }
      }

      console.log(`[Processor] Sucesso ao processar evento ${evento.eventoId}`);
      return { success: true, eventoId: evento.eventoId };
    } catch (error: any) {
      console.error(`[Processor] Erro no processamento:`, error);
      if (error.code) console.error(`[Processor] Codigo Prisma:`, error.code);
      if (error.meta) console.error(`[Processor] Meta Prisma:`, error.meta);
      
      if (loteId) {
        await prisma.esocialLote.update({
          where: { id: loteId },
          data: { 
            status: StatusProcessamento.erro
          }
        }).catch(err => console.error("[Processor] Falha ao marcar erro no lote:", err));
      }

      throw error;
    }
  }

  /**
   * Re-processa eventos que ficaram pendentes por falta de cadastro (trabalhador ou empresa).
   * Agora que a entidade foi cadastrada, podemos concluir o processamento lógico.
   */
  async reprocessPending(filter: { cpfBenef?: string; cnpjRaiz?: string }) {
    const { cpfBenef, cnpjRaiz } = filter;
    
    const pendingEvents = await prisma.esocialEvento.findMany({
      where: {
        status: StatusProcessamento.pendente,
        OR: [
          cpfBenef ? { cpfBenef } : null,
          cnpjRaiz ? { cnpjRaiz } : null
        ].filter(Boolean) as any
      },
      include: {
        s5002: true
      }
    });

    if (pendingEvents.length === 0) return;

    for (const evento of pendingEvents) {
      try {
        let eId = evento.empresaId;
        if (!eId && evento.cnpjRaiz) {
          const emp = await prisma.empresa.findUnique({ where: { cnpjRaiz: evento.cnpjRaiz } });
          eId = emp?.id || null;
        }

        let tId = evento.trabalhadorId;
        if (!tId && eId && evento.cpfBenef) {
          const trab = await prisma.trabalhador.findUnique({
            where: { empresaId_cpf: { empresaId: eId, cpf: evento.cpfBenef } }
          });
          tId = trab?.id || null;
        }

        if (tId && eId) {
          await prisma.$transaction([
            prisma.esocialEvento.update({
              where: { id: evento.id },
              data: {
                trabalhadorId: tId,
                empresaId: eId,
                status: StatusProcessamento.processado,
                processadoEm: new Date(),
              }
            }),
            prisma.esocialEventoHistorico.create({
              data: {
                eventoId: evento.id,
                acao: "reprocessamento",
                descricao: `Vínculo manual estabelecido. Cadastro OK.`
              }
            })
          ]);

          if (evento.s5002) {
            await prisma.s5002Evento.update({
              where: { id: evento.s5002.id },
              data: { trabalhadorId: tId, empresaId: eId }
            });
          }

          // Disparar consolidações
          await consolidacaoFiscalService.consolidarTrabalhadorPeriodo(tId, evento.perApur, evento.cpfBenef || undefined, evento.cnpjRaiz || undefined);
          
          const ano = parseInt(evento.perApur.split("-")[0]);
          await consolidacaoFiscalService.consolidarAnoBase(tId, ano, evento.cpfBenef || undefined, evento.cnpjRaiz || undefined);
        }
      } catch (err) {
        console.error(`Erro ao reprocessar evento ${evento.id}:`, err);
      }
    }
  }
}

export const s5002ProcessorService = new S5002ProcessorService();

import { prisma } from "@/lib/prisma";
import { consultarIdentificadoresS5002, downloadEventosPorId } from "./esocial-client";
import { s5002ProcessorService } from "@/services/esocial/s5002-processor.service";
import crypto from "crypto";

const LOTE_SIZE = 50; // limite do webservice

export class SincronizacaoService {
  /**
   * Executa a sincronização completa de S-5002 para uma empresa e período.
   * Lida com paginação automática (dhUltimoEvtRetornado) e processa cada XML
   * baixado pelo pipeline existente do s5002ProcessorService.
   */
  async sincronizarS5002(params: {
    empresaId:  string;
    cnpjRaiz:   string;
    perApur:    string;   // "AAAA-MM"
    certificadoId: string;
    trabalhadorIds?: string[];
  }): Promise<{ baixados: number; erros: number; sincId: string }> {

    // Verifica restrição de dias 1-7 do mês
    const diaAtual = new Date().getDate();
    if (diaAtual >= 1 && diaAtual <= 7) {
      throw new Error("Restrição do eSocial: consultas não são permitidas entre os dias 1 e 7 de cada mês.");
    }

    // Obtém CPFs dos trabalhadores se houver seleção
    let targetCpfs: string[] | undefined = undefined;
    if (params.trabalhadorIds && params.trabalhadorIds.length > 0) {
      const trabalhadores = await prisma.trabalhador.findMany({
        where: { id: { in: params.trabalhadorIds } },
        select: { cpf: true }
      });
      targetCpfs = trabalhadores.map(t => t.cpf.replace(/[^0-9]/g, ""));
    }

    // Cria registro de sincronização
    const sinc = await prisma.esocialSincronizacao.create({
      data: {
        empresaId:    params.empresaId,
        certificadoId: params.certificadoId,
        perApur:      params.perApur,
        status:       "executando",
      },
    });

    let baixados = 0;
    let erros    = 0;
    const logDetalhado: any[] = [];
    try {
      // ── FASE 1: Coleta todos os identificadores com paginação ──────────────
      const todosIds: string[] = [];
      let   dhCursor: string | undefined = undefined;
      let   totalEsperado = 0;

      try {
        do {
          const resultado = await consultarIdentificadoresS5002({
            empresaId:   params.empresaId,
            cnpjRaiz:    params.cnpjRaiz,
            perApur:     params.perApur,
            dtIni:       dhCursor,
          });

          totalEsperado = resultado.qtdeTotEvtsConsulta;
          todosIds.push(...resultado.identificadores.map(i => i.id));

          logDetalhado.push({
            fase:    "consulta_ids",
            retorno: resultado.qtdeTotEvtsConsulta,
            pagina:  todosIds.length,
          });

          // Paginação: se retornou 50 e há mais, continua
          if (resultado.identificadores.length < LOTE_SIZE) break;
          dhCursor = resultado.dhUltimoEvtRetornado || undefined;

        } while (dhCursor);
      } catch (soapError: any) {
        // Falha real de comunicação — registra e lança para o handler principal
        logDetalhado.push({ fase: "consulta_ids", erro: soapError.message });
        throw new Error(`Falha na comunicação com o webservice do eSocial: ${soapError.message}`);
      }

      // Atualiza total identificado
      await prisma.esocialSincronizacao.update({
        where: { id: sinc.id },
        data:  { totalIdentificadores: todosIds.length },
      });

      // ── FASE 2: Download em lotes de 50 ───────────────────────────────────
      for (let i = 0; i < todosIds.length; i += LOTE_SIZE) {
        const lote = todosIds.slice(i, i + LOTE_SIZE);

        const eventos = await downloadEventosPorId({
          empresaId:  params.empresaId,
          cnpjRaiz:   params.cnpjRaiz,
          ids:        lote,
        });

        for (const evt of eventos) {
          if (evt.cdResposta !== "201" || !evt.xmlEvento) {
            erros++;
            logDetalhado.push({ id: evt.id, erro: `cdResposta=${evt.cdResposta}` });
            continue;
          }

          if (targetCpfs) {
            const cpfMatch = evt.xmlEvento.match(/<[a-zA-Z0-9:]*cpfBenef[^>]*>(.*?)<\/[a-zA-Z0-9:]*cpfBenef>/i);
            const cpfBenef = cpfMatch ? cpfMatch[1].replace(/[^0-9]/g, "") : "";
            if (!cpfBenef || !targetCpfs.includes(cpfBenef)) {
              // Ignora este evento pois não pertence aos trabalhadores selecionados
              continue;
            }
          }

          try {
            // xmlEvento já contém o <eSocial> interno correto, extraído pelo esocial-client
            await s5002ProcessorService.process({
              xmlContent:  evt.xmlEvento,
              empresaId:   params.empresaId,
              xmlHash:     Buffer.from(evt.id).toString("base64").substring(0, 32),
              xmlPath:     `esocial_auto/${params.cnpjRaiz}/${params.perApur}/${evt.nrRec}.xml`,
            });
            baixados++;
          } catch (e: any) {
            erros++;
            logDetalhado.push({ id: evt.id, nrRec: evt.nrRec, erro: e.message });
          }
        }

        // Atualiza progresso em tempo real
        await prisma.esocialSincronizacao.update({
          where: { id: sinc.id },
          data:  { totalBaixados: baixados, totalErros: erros },
        });
      }

      // ── Finaliza sincronização ────────────────────────────────────────────
      await prisma.esocialSincronizacao.update({
        where: { id: sinc.id },
        data:  {
          status:       "concluido",
          totalBaixados: baixados,
          totalErros:   erros,
          logDetalhado: JSON.parse(JSON.stringify(logDetalhado)),
          concluidoEm:  new Date(),
        },
      });

      // Atualiza controle de download da empresa
      await prisma.esocialDownloadControle.upsert({
        where:  { cnpjRaiz: params.cnpjRaiz },
        update: { perApur: params.perApur, status: "ATIVO" },
        create: {
          cnpjRaiz:     params.cnpjRaiz,
          perApur:      params.perApur,
          status:       "ATIVO",
          totalBaixado: baixados,
        },
      });

      return { baixados, erros, sincId: sinc.id };
    } catch (err: any) {
      await prisma.esocialSincronizacao.update({
        where: { id: sinc.id },
        data:  {
          status:      "erro",
          mensagemErro: err.message,
          logDetalhado: JSON.parse(JSON.stringify(logDetalhado)),
          concluidoEm: new Date(),
        },
      });
      throw err;
    }
  }
}

export const sincronizacaoService = new SincronizacaoService();

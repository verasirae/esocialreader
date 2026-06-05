import { reinfR4020ParserService } from "@/services/parser/reinf-r4020-parser.service";
import { reinfR2099ParserService } from "@/services/parser/reinf-r2099-parser.service";
import { reinfR4020Repository } from "@/repositories/reinf-r4020.repository";
import { reinfRepository } from "@/repositories/reinf.repository"; // R-2099
import { prisma } from "@/lib/prisma";
import { StatusProcessamento } from "@prisma/client";

// Detecta o tipo de evento pelo XML sem parsear tudo
function detectTpEvento(xmlContent: string): string {
  const match = xmlContent.match(/<tpEv>(\d+)<\/tpEv>/);
  return match?.[1] || "";
}

export class ReinfProcessorService {
  async process(data: {
    xmlContent: string;
    empresaId: string;
    loteId?: string;
    xmlHash: string;
  }) {
    const { xmlContent, empresaId, loteId, xmlHash } = data;

    try {
      const tpEvento = detectTpEvento(xmlContent);

      if (tpEvento === "4020") {
        const parsed = reinfR4020ParserService.parse(xmlContent);
        const evento = await reinfR4020Repository.save(parsed, loteId);
        await this.atualizarLote(loteId, StatusProcessamento.processado);
        return { success: true, eventoId: evento.id, tpEvento: "R-4020" };
      }

      if (tpEvento === "2099") {
        const parsed = reinfR2099ParserService.parse(xmlContent);
        const evento = await reinfRepository.saveR2099(empresaId, parsed, loteId);
        await this.atualizarLote(loteId, StatusProcessamento.processado);
        return { success: true, eventoId: evento.id, tpEvento: "R-2099" };
      }

      throw new Error(`[ReinfProcessor] Tipo de evento não suportado: tpEv=${tpEvento}`);
    } catch (error: any) {
      console.error("[ReinfProcessor] Erro:", error);
      await this.atualizarLote(loteId, StatusProcessamento.erro).catch(() => {});
      throw error;
    }
  }

  private async atualizarLote(loteId: string | undefined, status: StatusProcessamento) {
    if (!loteId) return;
    await prisma.reinfLote.update({
      where: { id: loteId },
      data: { status, processadoEm: new Date() }
    });
  }
}

export const reinfProcessorService = new ReinfProcessorService();

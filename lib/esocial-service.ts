import { prisma } from "./prisma";
import { FiscalClassificationRegistry, FiscalNature } from "./fiscal/classification";

export class EsocialService {
  /**
   * Converte código de rubrica para descrição amigável usando a Tabela 03
   */
  static async getRubricaInfo(codigo: string) {
    const rubrica = await prisma.esocialTabela03.findFirst({
      where: { codigo },
      orderBy: { dtInicio: "desc" }
    });

    if (!rubrica) return null;

    return {
      descricao: rubrica.descricao,
      nome: rubrica.nome,
      incidenciaExclusivaEmpregado: rubrica.incidenciaExclusivaEmpregado,
    };
  }

  /**
   * Converte código de incidência IRRF para descrição amigável usando a Tabela 21
   */
  static async getIncidenciaIrrfInfo(codigo: string) {
    const incidencia = await prisma.esocialTabela21.findFirst({
      where: { codigo },
      orderBy: { dtInicio: "desc" }
    });

    if (!incidencia) return null;

    // Direct match against our centralized FiscalClassificationRegistry
    const match = FiscalClassificationRegistry.find(r => r.tpInfoIR === codigo);
    let tipoFiscal = "Outros";
    if (match) {
      if (match.nature === FiscalNature.REND_TRIBUTAVEL) {
        tipoFiscal = "Rendimento Tributável";
      } else if (match.nature === FiscalNature.ISENTO) {
        tipoFiscal = "Isento";
      } else {
        tipoFiscal = match.label;
      }
    }

    return {
      descricao: incidencia.descricao,
      tipoFiscal,
    };
  }

  /**
   * Busca regras de rubricas da Tabela 54
   */
  static async getRegrasRubrica(codRubrica: string) {
    return await prisma.esocialTabela54.findMany({
      where: { codRubrica }
    });
  }
}

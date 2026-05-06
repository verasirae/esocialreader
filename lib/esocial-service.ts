import { prisma } from "./prisma";

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

    // Lógica de enriquecimento específica conforme regras de negócio citadas
    // Exemplo: 11 -> Rendimento tributável
    let tipoFiscal = "Outros";
    if (codigo === "11") tipoFiscal = "Rendimento Tributável";
    if (codigo === "74") tipoFiscal = "Isento (Rescisão)";

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

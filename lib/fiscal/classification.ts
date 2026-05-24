export enum FiscalNature {
  REND_TRIBUTAVEL = "REND_TRIBUTAVEL",
  PREVIDENCIA_OFICIAL = "PREVIDENCIA_OFICIAL",
  PREVIDENCIA_COMPLEMENTAR = "PREVIDENCIA_COMPLEMENTAR",
  DEPENDENTE = "DEPENDENTE",
  PENSAO = "PENSAO",
  PLANO_SAUDE = "PLANO_SAUDE",
  SIMPLIFICADO = "SIMPLIFICADO",
  IRRF_RETIDO = "IRRF_RETIDO",
  ISENTO = "ISENTO",
  EXCLUSIVO = "EXCLUSIVO",
  OUTROS = "OUTROS"
}

export type FiscalGroup = 
  | "RENDIMENTOS_TRIBUTAVEIS"
  | "PREVIDENCIA_OFICIAL"
  | "PREVIDENCIA_COMPLEMENTAR"
  | "DEPENDENTES"
  | "PENSAO_ALIMENTICIA"
  | "PLANO_SAUDE"
  | "SIMPLIFICADO"
  | "IMPOSTO_RETIDO"
  | "ISENTOS"
  | "OUTROS";

export interface FiscalClassificationDefinition {
  tpInfoIR: string;
  label: string;
  nature: FiscalNature;
  group: FiscalGroup;
}

export const FiscalClassificationRegistry: FiscalClassificationDefinition[] = [
  // 11, 12, 13, 14, 15 -> RENDIMENTOS_TRIBUTAVEIS
  { tpInfoIR: "11", label: "Rendimento tributável - Remuneração mensal", nature: FiscalNature.REND_TRIBUTAVEL, group: "RENDIMENTOS_TRIBUTAVEIS" },
  { tpInfoIR: "12", label: "Rendimento tributável - 13º salário", nature: FiscalNature.REND_TRIBUTAVEL, group: "RENDIMENTOS_TRIBUTAVEIS" },
  { tpInfoIR: "13", label: "Rendimento tributável - Férias", nature: FiscalNature.REND_TRIBUTAVEL, group: "RENDIMENTOS_TRIBUTAVEIS" },
  { tpInfoIR: "14", label: "Rendimento tributável - PLR", nature: FiscalNature.REND_TRIBUTAVEL, group: "RENDIMENTOS_TRIBUTAVEIS" },
  { tpInfoIR: "15", label: "Rendimento tributável - RRA", nature: FiscalNature.REND_TRIBUTAVEL, group: "RENDIMENTOS_TRIBUTAVEIS" },

  // 31, 32, 33, 34, 35 -> RETENCOES / IMPOSTO_RETIDO (NÃO previdência)
  { tpInfoIR: "31", label: "Retenção - Remuneração mensal", nature: FiscalNature.IRRF_RETIDO, group: "IMPOSTO_RETIDO" },
  { tpInfoIR: "32", label: "Retenção - 13º salário", nature: FiscalNature.IRRF_RETIDO, group: "IMPOSTO_RETIDO" },
  { tpInfoIR: "33", label: "Retenção - Férias", nature: FiscalNature.IRRF_RETIDO, group: "IMPOSTO_RETIDO" },
  { tpInfoIR: "34", label: "Retenção - PLR", nature: FiscalNature.IRRF_RETIDO, group: "IMPOSTO_RETIDO" },
  { tpInfoIR: "35", label: "Retenção - RRA", nature: FiscalNature.IRRF_RETIDO, group: "IMPOSTO_RETIDO" },

  // 41, 42, 43, 44 -> PREVIDENCIA_OFICIAL
  { tpInfoIR: "41", label: "Dedução PSO - Remuneração mensal", nature: FiscalNature.PREVIDENCIA_OFICIAL, group: "PREVIDENCIA_OFICIAL" },
  { tpInfoIR: "42", label: "Dedução PSO - 13º salário", nature: FiscalNature.PREVIDENCIA_OFICIAL, group: "PREVIDENCIA_OFICIAL" },
  { tpInfoIR: "43", label: "Dedução PSO - Férias", nature: FiscalNature.PREVIDENCIA_OFICIAL, group: "PREVIDENCIA_OFICIAL" },
  { tpInfoIR: "44", label: "Dedução PSO - RRA", nature: FiscalNature.PREVIDENCIA_OFICIAL, group: "PREVIDENCIA_OFICIAL" },

  // 46, 47, 48, 61, 62, 63, 64 -> PREVIDENCIA_COMPLEMENTAR
  { tpInfoIR: "46", label: "Previdência privada - Salário mensal", nature: FiscalNature.PREVIDENCIA_COMPLEMENTAR, group: "PREVIDENCIA_COMPLEMENTAR" },
  { tpInfoIR: "47", label: "Previdência privada - 13º salário", nature: FiscalNature.PREVIDENCIA_COMPLEMENTAR, group: "PREVIDENCIA_COMPLEMENTAR" },
  { tpInfoIR: "48", label: "FUNPRESP", nature: FiscalNature.PREVIDENCIA_COMPLEMENTAR, group: "PREVIDENCIA_COMPLEMENTAR" },
  { tpInfoIR: "61", label: "FAPI - Remuneração mensal", nature: FiscalNature.PREVIDENCIA_COMPLEMENTAR, group: "PREVIDENCIA_COMPLEMENTAR" },
  { tpInfoIR: "62", label: "FAPI - 13º salário", nature: FiscalNature.PREVIDENCIA_COMPLEMENTAR, group: "PREVIDENCIA_COMPLEMENTAR" },
  { tpInfoIR: "63", label: "Fundação de previdência complementar - Remuneração mensal", nature: FiscalNature.PREVIDENCIA_COMPLEMENTAR, group: "PREVIDENCIA_COMPLEMENTAR" },
  { tpInfoIR: "64", label: "Fundação de previdência complementar - 13º salário", nature: FiscalNature.PREVIDENCIA_COMPLEMENTAR, group: "PREVIDENCIA_COMPLEMENTAR" },

  // 51, 52, 53, 54, 55 -> PENSAO_ALIMENTICIA
  { tpInfoIR: "51", label: "Pensão alimentícia - Remuneração mensal", nature: FiscalNature.PENSAO, group: "PENSAO_ALIMENTICIA" },
  { tpInfoIR: "52", label: "Pensão alimentícia - 13º salário", nature: FiscalNature.PENSAO, group: "PENSAO_ALIMENTICIA" },
  { tpInfoIR: "53", label: "Pensão alimentícia - Férias", nature: FiscalNature.PENSAO, group: "PENSAO_ALIMENTICIA" },
  { tpInfoIR: "54", label: "Pensão alimentícia - PLR", nature: FiscalNature.PENSAO, group: "PENSAO_ALIMENTICIA" },
  { tpInfoIR: "55", label: "Pensão alimentícia - RRA", nature: FiscalNature.PENSAO, group: "PENSAO_ALIMENTICIA" },

  // 67 -> PLANO_SAUDE
  { tpInfoIR: "67", label: "Plano privado coletivo de assistência à saúde", nature: FiscalNature.PLANO_SAUDE, group: "PLANO_SAUDE" },

  // 70, 71, 72, 73, 74, 75, 76, 77, 78, 79, 700, 7950, 7956 -> ISENTOS
  { tpInfoIR: "70", label: "Parcela isenta 65 anos - Remuneração mensal", nature: FiscalNature.ISENTO, group: "ISENTOS" },
  { tpInfoIR: "71", label: "Parcela isenta 65 anos - 13º salário", nature: FiscalNature.ISENTO, group: "ISENTOS" },
  { tpInfoIR: "72", label: "Diárias", nature: FiscalNature.ISENTO, group: "ISENTOS" },
  { tpInfoIR: "73", label: "Ajuda de custo", nature: FiscalNature.ISENTO, group: "ISENTOS" },
  { tpInfoIR: "74", label: "Indenização e rescisão de contrato (PDV)", nature: FiscalNature.ISENTO, group: "ISENTOS" },
  { tpInfoIR: "75", label: "Abono pecuniário", nature: FiscalNature.ISENTO, group: "ISENTOS" },
  { tpInfoIR: "76", label: "Rendimento moléstia grave - Remuneração mensal", nature: FiscalNature.ISENTO, group: "ISENTOS" },
  { tpInfoIR: "77", label: "Rendimento moléstia grave - 13º salário", nature: FiscalNature.ISENTO, group: "ISENTOS" },
  { tpInfoIR: "78", label: "Valores pagos a titular ou sócio de ME ou EPP", nature: FiscalNature.ISENTO, group: "ISENTOS" },
  { tpInfoIR: "79", label: "Outras isenções", nature: FiscalNature.ISENTO, group: "ISENTOS" },
  { tpInfoIR: "700", label: "Auxílio moradia", nature: FiscalNature.ISENTO, group: "ISENTOS" },
  { tpInfoIR: "701", label: "Parte não tributável prestação serviço transporte", nature: FiscalNature.ISENTO, group: "ISENTOS" },
  { tpInfoIR: "7950", label: "Rendimento não tributável", nature: FiscalNature.ISENTO, group: "ISENTOS" },
  { tpInfoIR: "7956", label: "Valores pagos a sócio/titular ME/EPP", nature: FiscalNature.ISENTO, group: "ISENTOS" },

  // 7900 -> OUTROS
  { tpInfoIR: "7900", label: "Verba transitante de natureza diversa", nature: FiscalNature.OUTROS, group: "OUTROS" }
];

export interface ClassificationRule {
  tpInfoIR: string[];
  group: FiscalGroup;
  label: string;
}

// Derive grouping rules dynamically from our single source of truth
export const FISCAL_RULES: ClassificationRule[] = Array.from(
  new Set(FiscalClassificationRegistry.map(r => r.group))
).map(group => {
  const matching = FiscalClassificationRegistry.filter(r => r.group === group);
  return {
    group,
    tpInfoIR: matching.map(r => r.tpInfoIR),
    label: matching[0].label
  };
});

export function classifyTpInfoIR(tpInfoIR: string): FiscalGroup | "OUTROS" {
  const match = FiscalClassificationRegistry.find(r => r.tpInfoIR === tpInfoIR);
  return match ? match.group : "OUTROS";
}

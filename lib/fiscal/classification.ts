
export type FiscalGroup = 
  | "RENDIMENTOS_TRIBUTAVEIS"
  | "PREVIDENCIA_OFICIAL"
  | "PREVIDENCIA_COMPLEMENTAR"
  | "DEPENDENTES"
  | "PENSAO_ALIMENTICIA"
  | "PLANO_SAUDE"
  | "SIMPLIFICADO"
  | "IMPOSTO_RETIDO"
  | "ISENTO_65_ANOS"
  | "DIARIAS"
  | "AJUDA_CUSTO"
  | "INDENIZACAO_PDV"
  | "ABONO_PECUNIARIO"
  | "LUCROS_DIVIDENDOS"
  | "VALORES_ME_EPP"
  | "COMPLEMENTACAO_89_95"
  | "RESGATE_MOLESTIA_GRAVE"
  | "PENSAO_MOLESTIA_GRAVE"
  | "JUROS_MORA"
  | "BOLSA_RESIDENTE"
  | "AUXILIO_MORADIA"
  | "OUTROS_ISENTOS"
  | "ACAO_JUDICIAL_DESPESA";

export interface ClassificationRule {
  tpInfoIR: string[];
  group: FiscalGroup;
  label: string;
}

export const FISCAL_RULES: ClassificationRule[] = [
  { tpInfoIR: ["11", "12"], group: "RENDIMENTOS_TRIBUTAVEIS", label: "Rendimentos Tributáveis" },
  { tpInfoIR: ["31", "32"], group: "PREVIDENCIA_OFICIAL", label: "Previdência Oficial" },
  { tpInfoIR: ["43", "44", "46", "47", "48", "51", "53"], group: "PREVIDENCIA_COMPLEMENTAR", label: "Previdência Complementar" },
  { tpInfoIR: ["41"], group: "DEPENDENTES", label: "Dependentes" },
  { tpInfoIR: ["42"], group: "PENSAO_ALIMENTICIA", label: "Pensão Alimentícia" },
  { tpInfoIR: ["14"], group: "SIMPLIFICADO", label: "Desconto Simplificado Mensal" },
  { tpInfoIR: ["70"], group: "ISENTO_65_ANOS", label: "Parcela isenta aposentadoria acima de 65 anos" },
  { tpInfoIR: ["61"], group: "DIARIAS", label: "Diárias" },
  { tpInfoIR: ["62"], group: "AJUDA_CUSTO", label: "Ajuda de custo" },
  { tpInfoIR: ["63"], group: "INDENIZACAO_PDV", label: "Indenização e rescisão de contrato (PDV)" },
  { tpInfoIR: ["64"], group: "ABONO_PECUNIARIO", label: "Abono pecuniário" },
  { tpInfoIR: ["67"], group: "LUCROS_DIVIDENDOS", label: "Lucros e dividendos pagos a partir de 1996" },
  { tpInfoIR: ["71"], group: "VALORES_ME_EPP", label: "Valores pagos a titular ou sócio de ME ou EPP" },
  { tpInfoIR: ["72"], group: "COMPLEMENTACAO_89_95", label: "Complementação de aposentadoria - contribuição de 1989 a 1995" },
  { tpInfoIR: ["73"], group: "RESGATE_MOLESTIA_GRAVE", label: "Resgate de previdência complementar por portador de moléstia grave" },
  { tpInfoIR: ["74"], group: "PENSAO_MOLESTIA_GRAVE", label: "Pensão, aposentadoria ou reforma por moléstia grave" },
  { tpInfoIR: ["75"], group: "JUROS_MORA", label: "Juros de mora pagos pelo atraso" },
  { tpInfoIR: ["80"], group: "AUXILIO_MORADIA", label: "Auxílio moradia" },
  { tpInfoIR: ["79", "7900"], group: "OUTROS_ISENTOS", label: "Outros isentos" },
];

export function classifyTpInfoIR(tpInfoIR: string): FiscalGroup | "OUTROS" {
  const rule = FISCAL_RULES.find(r => r.tpInfoIR.includes(tpInfoIR));
  return rule ? rule.group : "OUTROS";
}

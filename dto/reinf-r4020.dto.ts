export interface ReinfR4020CRMenData {
  crMen: string;           // Persistir exato — nunca alterar
  vlrBaseCRMen: number;
  vlrCRMenInf: number;
  natRend?: string;
  vlrCRMenSusp?: number;
}

export interface ReinfR4020BenefData {
  cnpjBenef: string;       // 14 dígitos normalizados
  totApurMen: ReinfR4020CRMenData[];
}

export interface ReinfR4020ParserResult {
  // Identificação
  idEvento: string;
  tpEvento: string;        // "4020"
  perApur: string;
  nrRecArqBase: string;
  dhRecepcao: Date;
  dhProcess: Date;
  formatoXml: "evtRet" | "evtPgtos";

  // Contribuinte
  cnpjRaiz: string;        // 8 dígitos

  // Estabelecimento tomador (ideEstab.nrInsc — CNPJ completo)
  cnpjEstab: string;

  // Beneficiários/prestadores com suas retenções
  beneficiarios: ReinfR4020BenefData[];
}

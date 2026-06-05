export interface ReinfCRTomData {
  crTom: string;
  vlrCRTom: number;
  vlrCRTomSusp: number;
}

export interface ReinfRTomData {
  cnpjPrestador: string; // normalizado, 14 dígitos sem máscara
  vlrTotalBaseRet: number;
  codigosReceita: ReinfCRTomData[];
}

export interface ReinfR2099ParserResult {
  // Identificação do evento
  idEvento: string;
  tpEvento: string;           // "2099"
  perApur: string;            // "2025-01"
  nrProtEntr: string;
  nrRecArqBase: string;
  dhRecepcao: Date;
  dhProcess: Date;

  // Contribuinte (tomador/empresa)
  cnpjRaiz: string;           // 8 dígitos

  // Totalização
  indExistInfo: number;
  identEscritDCTF?: string;

  // Retenções por prestador
  retencoesPorPrestador: ReinfRTomData[];
}

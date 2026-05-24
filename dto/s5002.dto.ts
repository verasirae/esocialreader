import { Decimal } from "@prisma/client/runtime/library";

export interface S5002ParserResult {
  eventoId: string;
  perApur: string;
  tpEvento: string;
  cnpjRaiz: string;
  indRetif: number;
  nrRecibo: string;
  nrReciboOrig?: string;
  trabalhador: {
    cpfBenef: string;
    nomeBenef?: string;
  };
  demonstrativos: S5002DmDevDTO[];
  infoIRComplem?: S5002InfoIRComplemDTO;
  infoIRComplemList?: S5002InfoIRComplemBlockDTO[];
  totInfoIR?: S5002TotInfoIRDTO[];
}

export interface S5002DmDevDTO {
  ideDmDev: string;
  perRef: string;
  dtPgto?: string;
  tpPgto?: number;
  codCateg?: string;
  infoIR: {
    tpInfoIR: string;
    valor: number;
  }[];
  totApurMen?: {
    crMen: string;
    vlrRendTrib: number;
    vlrRendTrib13: number;
    vlrPrevOficial: number;
    vlrPrevOficial13: number;
    vlrCRMen: number;
    vlrCR13Men: number;
  }[];
}

export interface S5002InfoIRComplemDTO {
  perAnt?: {
    perRefAjuste: string;
    nrRec1210Orig?: string;
  }[];
  ideDep?: {
    cpfDep: string;
    dtNascto?: string;
    nomeDep?: string;
    depIRRF?: string;
    tpDep?: string;
  }[];
  infoIrCr?: {
    tpCR: string;
    dedDepen?: {
      tpRend: string;
      cpfDep: string;
      vlrDedDep: number;
    }[];
    penAlim?: {
      tpRend: string;
      cpfDep: string;
      vlrDedPenAlim: number;
    }[];
    vlrIR?: number;
  }[];
  planSaude?: {
    cnpjOper: string;
    regANS?: string;
    vlrSaudeTit: number;
    infoDepSau?: {
      cpfDep: string;
      vlrSaudeDep: number;
    }[];
  }[];
}

export interface S5002TotInfoIRDTO {
  consolidApurMen: {
    crMen: string;
    vlrRendTrib: number;
    vlrPrevOficial: number;
    vlrCRMen: number;
  }[];
}

export interface S5002InfoIRComplemBlockDTO {
  perAnt?: {
    perRefAjuste: string;
    nrRec1210Orig?: string;
  };
  ideDep?: {
    cpfDep: string;
    dtNascto?: string;
    nomeDep?: string;
    depIRRF?: string;
    tpDep?: string;
  }[];
  infoIrCr?: {
    tpCR: string;
    dedDepen?: {
      tpRend: string;
      cpfDep: string;
      vlrDedDep: number;
    }[];
    penAlim?: {
      tpRend: string;
      cpfDep: string;
      vlrDedPenAlim: number;
    }[];
    vlrIR?: number;
  }[];
  planSaude?: {
    cnpjOper: string;
    regANS?: string;
    vlrSaudeTit: number;
    infoDepSau?: {
      cpfDep: string;
      vlrSaudeDep: number;
    }[];
  }[];
}


import { XMLParser } from "fast-xml-parser";
import { S5002ParserResult } from "@/dto/s5002.dto";
import { normalizeCpf, normalizeCnpj, normalizeDocumento, normalizeCnpjRaiz } from "@/lib/normalization";

export class S5002ParserService {
  private parser: XMLParser;

  constructor() {
    this.parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: "",
      removeNSPrefix: true,
      parseAttributeValue: false, 
      parseTagValue: false, // Garantir que não converta para número e preserve zeros à esquerda
      trimValues: true,
    });
  }

  public parse(xmlContent: string): S5002ParserResult {
    const jsonObj = this.parser.parse(xmlContent);
    
    // Caminho base no S-5002
    const evt = jsonObj?.eSocial?.retornoEventoCompleto?.evento?.eSocial?.evtIrrfBenef || 
                jsonObj?.eSocial?.evtIrrfBenef;

    if (!evt) {
      throw new Error("Estrutura S-5002 inválida ou não encontrada no XML");
    }

    const { ideEvento, ideTrabalhador, ideEmpregador } = evt;

    // Extraímos o CNPJ Raiz (8 primeiros dígitos se for CNPJ 14 ou o valor se for 8)
    const cnpjRaiz = normalizeCnpjRaiz(ideEmpregador?.nrInsc);

    const result: S5002ParserResult = {
      eventoId: String(evt.Id || ""),
      perApur: String(ideEvento.perApur),
      tpEvento: "S-5002",
      cnpjRaiz,
      indRetif: Number(ideEvento.indRetif) || 1,
      nrRecibo: String(ideEvento.nrRecibo || ""),
      nrReciboOrig: ideEvento.nrReciboOrig ? String(ideEvento.nrReciboOrig) : undefined,
      trabalhador: {
        cpfBenef: normalizeCpf(ideTrabalhador.cpfBenef),
        nomeBenef: String(ideTrabalhador.nmBenef),
      },
      demonstrativos: this.parseDemonstrativos(ideTrabalhador.dmDev),
      infoIRComplem: this.parseInfoIRComplem(ideTrabalhador.infoIRComplem),
      totInfoIR: this.parseTotInfoIR(evt.totInfoIR),
    };

    return result;
  }

  private parseDemonstrativos(dmDev: any): any[] {
    const items = this.ensureArray(dmDev);
    return items.map((dm) => ({
      ideDmDev: String(dm.ideDmDev || ""),
      perRef: String(dm.perRef || ""),
      dtPgto: dm.dtPgto,
      tpPgto: dm.tpPgto ? Number(dm.tpPgto) : undefined, // Schema diz Int?
      codCateg: dm.codCateg ? String(dm.codCateg) : undefined,
      infoIR: this.ensureArray(dm.infoIR).map((ir: any) => ({
        tpInfoIR: String(ir.tpInfoIR || ""),
        valor: this.parseDecimal(ir.valor),
      })),
      totApurMen: this.ensureArray(dm.totApurMen).map((tot: any) => ({
        crMen: tot.CRMen ? String(tot.CRMen) : undefined,
        vlrRendTrib: this.parseDecimal(tot.vlrRendTrib),
        vlrRendTrib13: this.parseDecimal(tot.vlrRendTrib13),
        vlrPrevOficial: this.parseDecimal(tot.vlrPrevOficial),
        vlrPrevOficial13: this.parseDecimal(tot.vlrPrevOficial13),
        vlrCRMen: this.parseDecimal(tot.vlrCRMen),
        vlrCR13Men: this.parseDecimal(tot.vlrCR13Men),
      })),
    }));
  }

  private parseInfoIRComplem(infoIRComplem: any): any {
    if (!infoIRComplem) return undefined;

    return {
      perAnt: this.ensureArray(infoIRComplem.perAnt).map((p) => ({
        perRefAjuste: String(p.perRefAjuste || ""),
        nrRec1210Orig: p.nrRec1210Orig ? String(p.nrRec1210Orig) : undefined,
      })),
      ideDep: this.ensureArray(infoIRComplem.ideDep).map((dep: any) => ({
        cpfDep: normalizeCpf(dep.cpfDep),
        dtNascto: dep.dtNascto,
        nomeDep: String(dep.nmDep || dep.nomeDep || dep.nome || ""),
        depIRRF: String(dep.depIRRF || ""),
        tpDep: dep.tpDep ? String(dep.tpDep) : undefined,
      })),
      infoIrCr: this.ensureArray(infoIRComplem.infoIrCr || infoIRComplem.infoIRCR).map((cr: any) => ({
        tpCR: String(cr.tpCR || ""),
        dedDepen: this.ensureArray(cr.dedDepen).map((dd: any) => ({
          tpRend: String(dd.tpRend || ""),
          cpfDep: normalizeCpf(dd.cpfDep),
          vlrDedDep: this.parseDecimal(dd.vlrDedDep),
        })),
        penAlim: this.ensureArray(cr.penAlim).map((pa: any) => ({
          tpRend: String(pa.tpRend || ""),
          cpfDep: normalizeCpf(pa.cpfDep),
          vlrDedPenAlim: this.parseDecimal(pa.vlrDedPenAlim),
        })),
        vlrIR: this.parseDecimal(cr.vlrIR),
      })),
      planSaude: this.ensureArray(infoIRComplem.planSaude).map((plan: any) => ({
        cnpjOper: normalizeCnpj(plan.cnpjOper),
        regANS: plan.regANS ? String(plan.regANS) : undefined,
        vlrSaudeTit: this.parseDecimal(plan.vlrSaudeTit),
        infoDepSau: this.ensureArray(plan.infoDepSau).map((ids: any) => ({
          cpfDep: normalizeCpf(ids.cpfDep),
          vlrSaudeDep: this.parseDecimal(ids.vlrSaudeDep),
        })),
      })),
    };
  }

  private parseTotInfoIR(totInfoIR: any): any[] {
    const items = this.ensureArray(totInfoIR);
    return items.map((tot) => ({
      consolidApurMen: this.ensureArray(tot.consolidApurMen).map((cam: any) => ({
        crMen: cam.CRMen ? String(cam.CRMen) : undefined,
        vlrRendTrib: this.parseDecimal(cam.vlrRendTrib),
        vlrPrevOficial: this.parseDecimal(cam.vlrPrevOficial),
        vlrCRMen: this.parseDecimal(cam.vlrCRMen),
      })),
    }));
  }

  private ensureArray(val: any): any[] {
    if (val === undefined || val === null) return [];
    return Array.isArray(val) ? val : [val];
  }

  private parseDecimal(val: any): number {
    if (val === undefined || val === null) return 0;
    const n = Number(val);
    return isNaN(n) ? 0 : n;
  }
}

export const s5002Parser = new S5002ParserService();

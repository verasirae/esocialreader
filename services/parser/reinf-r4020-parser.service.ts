import { XMLParser } from "fast-xml-parser";
import { ReinfR4020ParserResult, ReinfR4020BenefData, ReinfR4020CRMenData } from "@/dto/reinf-r4020.dto";

function parseBRDecimal(value: string | number | undefined): number {
  if (value === undefined || value === null) return 0;
  return parseFloat(String(value).replace(/\./g, "").replace(",", ".")) || 0;
}

export class ReinfR4020ParserService {
  private parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "@_",
    parseTagValue: true,
    trimValues: true,
    isArray: (tagName) => [
      "ideEstab", "totApurMen", "infoIR", "evtPgtos"
    ].includes(tagName)
  });

  parse(xmlContent: string): ReinfR4020ParserResult {
    const parsed = this.parser.parse(xmlContent);

    // Normaliza namespace
    const root = parsed?.Reinf ?? parsed?.["reinf:Reinf"] ?? parsed;

    // Detecta formato: evtRet (recibo) ou evtPgtos (original)
    const isRecibo = !!root?.evtRet;
    const evt = isRecibo ? root.evtRet : root?.evtPgtos;

    if (!evt) {
      throw new Error("[ReinfR4020Parser] Estrutura XML inválida: evtRet/evtPgtos não encontrado");
    }

    const ideEvento = evt.ideEvento;
    const ideContri = evt.ideContri;
    const infoRecEv = evt.infoRecEv;

    if (!ideEvento || !ideContri || !infoRecEv) {
      throw new Error("[ReinfR4020Parser] Blocos obrigatórios ausentes (ideEvento/ideContri/infoRecEv)");
    }

    const cnpjRaiz = String(ideContri.nrInsc || "").replace(/\D/g, "").substring(0, 8).padStart(8, "0");

    // ─── Formato RECIBO (evtRet) ─────────────────────────────────────────────
    if (isRecibo) {
      return this.parseEvtRet(evt, ideEvento, ideContri, infoRecEv, cnpjRaiz);
    }

    // ─── Formato ORIGINAL (evtPgtos) ─────────────────────────────────────────
    return this.parseEvtPgtos(evt, ideEvento, ideContri, infoRecEv, cnpjRaiz);
  }

  /**
   * Parseia o recibo de retorno (evtRet) do R-4020.
   * Estrutura: infoTotal → ideEstab[] → nrInscBenef + totApurMen[]
   */
  private parseEvtRet(
    evt: any, ideEvento: any, ideContri: any, infoRecEv: any, cnpjRaiz: string
  ): ReinfR4020ParserResult {
    const infoTotal = evt.infoTotal;
    if (!infoTotal) throw new Error("[ReinfR4020Parser] infoTotal ausente no evtRet");

    const ideEstabRaw = infoTotal.ideEstab;
    const ideEstabArray = Array.isArray(ideEstabRaw) ? ideEstabRaw : ideEstabRaw ? [ideEstabRaw] : [];

    if (ideEstabArray.length === 0) throw new Error("[ReinfR4020Parser] ideEstab não encontrado");

    // Usa o primeiro ideEstab para cnpjEstab (em geral há apenas um por recibo)
    const primeiroEstab = ideEstabArray[0];
    const cnpjEstab = String(primeiroEstab.nrInsc || "").replace(/\D/g, "").padStart(14, "0");

    const beneficiarios: ReinfR4020BenefData[] = [];

    for (const estab of ideEstabArray) {
      const cnpjBenef = String(estab.nrInscBenef || "").replace(/\D/g, "").padStart(14, "0");
      if (!cnpjBenef || cnpjBenef === "00000000000000") continue;

      const totApurRaw = estab.totApurMen;
      const totApurArray = Array.isArray(totApurRaw) ? totApurRaw : totApurRaw ? [totApurRaw] : [];

      const crMenList: ReinfR4020CRMenData[] = totApurArray.map((tot: any) => ({
        crMen: String(tot.CRMen || tot.crMen || ""),
        vlrBaseCRMen: parseBRDecimal(tot.vlrBaseCRMen),
        vlrCRMenInf: parseBRDecimal(tot.totApurTribMen?.vlrCRMenInf ?? 0),
        natRend: tot.natRend ? String(tot.natRend) : undefined,
        vlrCRMenSusp: parseBRDecimal(tot.totApurTribMen?.vlrCRMenSusp ?? 0)
      }));

      beneficiarios.push({ cnpjBenef, totApurMen: crMenList });
    }

    return {
      idEvento: String(evt["@_id"] || infoRecEv.idEv || ""),
      tpEvento: String(infoRecEv.tpEv || "4020"),
      perApur: String(ideEvento.perApur || ""),
      nrRecArqBase: String(infoRecEv.nrRecArqBase || ""),
      dhRecepcao: new Date(infoRecEv.dhRecepcao),
      dhProcess: new Date(infoRecEv.dhProcess),
      formatoXml: "evtRet",
      cnpjRaiz,
      cnpjEstab,
      beneficiarios
    };
  }

  /**
   * Parseia o evento original (evtPgtos) do R-4020.
   * Estrutura: ideEstab[] → nrInscBenef + infoIR[] → CRMen
   * Reservado para quando o contribuinte enviar o XML analítico original.
   */
  private parseEvtPgtos(
    evt: any, ideEvento: any, ideContri: any, infoRecEv: any, cnpjRaiz: string
  ): ReinfR4020ParserResult {
    const ideEstabRaw = evt.ideEstab;
    const ideEstabArray = Array.isArray(ideEstabRaw) ? ideEstabRaw : ideEstabRaw ? [ideEstabRaw] : [];

    const primeiroEstab = ideEstabArray[0] || {};
    const cnpjEstab = String(primeiroEstab.nrInsc || ideContri.nrInsc || "")
      .replace(/\D/g, "").padStart(14, "0");

    const beneficiarios: ReinfR4020BenefData[] = [];

    for (const estab of ideEstabArray) {
      const cnpjBenef = String(estab.cnpjBenef || estab.nrInscBenef || "")
        .replace(/\D/g, "").padStart(14, "0");
      if (!cnpjBenef || cnpjBenef === "00000000000000") continue;

      // No evtPgtos original, as retenções ficam em infoIR dentro de ideEstab
      const infoIRRaw = estab.infoIR;
      const infoIRArray = Array.isArray(infoIRRaw) ? infoIRRaw : infoIRRaw ? [infoIRRaw] : [];

      const crMenList: ReinfR4020CRMenData[] = infoIRArray.map((ir: any) => ({
        crMen: String(ir.CRMen || ir.crMen || ""),
        vlrBaseCRMen: parseBRDecimal(ir.vlrBaseIR ?? ir.vlrBaseAgreg ?? 0),
        vlrCRMenInf: parseBRDecimal(ir.vlrIR ?? ir.vlrRet ?? 0),
        natRend: ir.natRend ? String(ir.natRend) : undefined,
        vlrCRMenSusp: parseBRDecimal(ir.vlrSusp ?? 0)
      }));

      beneficiarios.push({ cnpjBenef, totApurMen: crMenList });
    }

    return {
      idEvento: String(evt["@_id"] || infoRecEv.idEv || ""),
      tpEvento: "4020",
      perApur: String(ideEvento.perApur || ""),
      nrRecArqBase: String(infoRecEv.nrRecArqBase || ""),
      dhRecepcao: new Date(infoRecEv.dhRecepcao),
      dhProcess: new Date(infoRecEv.dhProcess),
      formatoXml: "evtPgtos",
      cnpjRaiz,
      cnpjEstab,
      beneficiarios
    };
  }
}

export const reinfR4020ParserService = new ReinfR4020ParserService();

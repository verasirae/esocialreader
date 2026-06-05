import { XMLParser } from "fast-xml-parser";
import { ReinfR2099ParserResult, ReinfRTomData } from "@/dto/reinf-r2099.dto";
import { normalizeCnpj } from "@/lib/normalization";

// Converte valor monetário brasileiro ("28814,09" ou "28814.09") → number
function parseBRDecimal(value: string | number | undefined): number {
  if (value === undefined || value === null) return 0;
  const str = String(value).replace(/\./g, "").replace(",", ".");
  return parseFloat(str) || 0;
}

export class ReinfR2099ParserService {
  private parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "@_",
    parseTagValue: true,
    trimValues: true,
    isArray: (tagName) => ["RTom", "infoCRTom"].includes(tagName)
  });

  parse(xmlContent: string): ReinfR2099ParserResult {
    const parsed = this.parser.parse(xmlContent);

    // Navega até a raiz do evento
    const root = parsed?.Reinf ?? parsed?.["reinf:Reinf"] ?? parsed;
    const evt = root?.evtTotalContrib;

    if (!evt) throw new Error("[ReinfR2099Parser] evtTotalContrib não encontrado no XML");

    const ideEvento = evt.ideEvento;
    const ideContri = evt.ideContri;
    const infoRecEv = evt.infoRecEv;
    const infoTotal = evt.infoTotalContrib;

    if (!ideEvento || !ideContri || !infoRecEv || !infoTotal) {
      throw new Error("[ReinfR2099Parser] Estrutura XML inválida: blocos obrigatórios ausentes");
    }

    // Extrai CNPJ raiz do contribuinte (tomador)
    const cnpjRaiz = String(ideContri.nrInsc || "").padStart(8, "0").substring(0, 8);

    // Normaliza RTom — pode ser array ou objeto único
    const rTomRaw = infoTotal.RTom;
    const rTomArray = Array.isArray(rTomRaw)
      ? rTomRaw
      : rTomRaw ? [rTomRaw] : [];

    const retencoesPorPrestador: ReinfRTomData[] = rTomArray.map((rtom: any) => {
      const cnpjRaw = String(rtom.cnpjPrestador || "").replace(/\D/g, "");
      const cnpjNorm = cnpjRaw.padStart(14, "0");

      const crRaw = rtom.infoCRTom;
      const crArray = Array.isArray(crRaw) ? crRaw : crRaw ? [crRaw] : [];

      return {
        cnpjPrestador: cnpjNorm,
        vlrTotalBaseRet: parseBRDecimal(rtom.vlrTotalBaseRet),
        codigosReceita: crArray.map((cr: any) => ({
          crTom: String(cr.CRTom || cr.crTom || ""),
          vlrCRTom: parseBRDecimal(cr.vlrCRTom),
          vlrCRTomSusp: parseBRDecimal(cr.vlrCRTomSusp)
        }))
      };
    });

    return {
      idEvento: String(evt["@_id"] || evt.id || infoRecEv.idEv || ""),
      tpEvento: String(infoRecEv.tpEv || "2099"),
      perApur: String(ideEvento.perApur || ""),
      nrProtEntr: String(infoRecEv.nrProtEntr || ""),
      nrRecArqBase: String(infoRecEv.nrRecArqBase || ""),
      dhRecepcao: new Date(infoRecEv.dhRecepcao),
      dhProcess: new Date(infoRecEv.dhProcess),
      cnpjRaiz,
      indExistInfo: Number(infoTotal.indExistInfo ?? 1),
      identEscritDCTF: infoTotal.identEscritDCTF
        ? String(infoTotal.identEscritDCTF)
        : undefined,
      retencoesPorPrestador
    };
  }
}

export const reinfR2099ParserService = new ReinfR2099ParserService();

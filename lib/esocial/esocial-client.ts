import https from "https";
import { lerCertificado, pfxParaPem } from "./certificado.service";

// URLs dos webservices por ambiente
const WS_URLS = {
  producao: {
    consultaIdentificadores: "https://webservices.esocial.gov.br/servicos/empregador/consultaIdentificadoresEventos/WsConsultaIdentificadoresEventos.svc",
    solicitarDownload:       "https://webservices.esocial.gov.br/servicos/empregador/download/solicitacaoDownloadEvtsPorId/WsSolicitacaoDownload.svc",
  },
  producao_restrita: {
    consultaIdentificadores: "https://webservices.producaorestrita.esocial.gov.br/servicos/empregador/consultaIdentificadoresEventos/WsConsultaIdentificadoresEventos.svc",
    solicitarDownload:       "https://webservices.producaorestrita.esocial.gov.br/servicos/empregador/download/solicitacaoDownloadEvtsPorId/WsSolicitacaoDownload.svc",
  },
};

// Cache em memória dos PEMs por empresaId para evitar conversão a cada chamada
const pemCache = new Map<string, { cert: Buffer; key: Buffer; expiresAt: number }>();

async function buildTlsAgent(empresaId: string, pfxBuffer: Buffer, senha: string): Promise<https.Agent> {
  const cacheKey = empresaId;
  const cached   = pemCache.get(cacheKey);

  // Cache de 30 minutos
  if (cached && cached.expiresAt > Date.now()) {
    return new https.Agent({
      cert:               cached.cert,
      key:                cached.key,
      rejectUnauthorized: false,
    });
  }

  // Converte PFX → PEM via OpenSSL CLI (suporta AES-256 ICP-Brasil)
  const { cert, key } = pfxParaPem(pfxBuffer, senha);

  pemCache.set(cacheKey, {
    cert,
    key,
    expiresAt: Date.now() + 30 * 60 * 1000,
  });

  return new https.Agent({
    cert,
    key,
    rejectUnauthorized: false,
  });
}

// Faz a chamada SOAP usando o módulo nativo https para suportar autenticação mútua mTLS
async function chamadaSoap(
  urlStr:    string,
  action:    string,
  body:      string,
  empresaId: string,
  pfxBuffer: Buffer,
  senha:     string
): Promise<string> {
  const envelope = `<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope
  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
  xmlns:xsd="http://www.w3.org/2001/XMLSchema"
  xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
  <soap:Header/>
  <soap:Body>${body}</soap:Body>
</soap:Envelope>`;

  const url   = new URL(urlStr);
  const agent = await buildTlsAgent(empresaId, pfxBuffer, senha);

  const options: https.RequestOptions = {
    method: "POST",
    host:   url.hostname,
    path:   url.pathname,
    port:   url.port || 443,
    agent,
    headers: {
      "Content-Type":   "application/soap+xml; charset=utf-8",
      "SOAPAction":      action,
      "Content-Length":  Buffer.byteLength(envelope),
    },
  };

  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let data = "";
      res.setEncoding("utf8");
      res.on("data", (chunk) => {
        data += chunk;
      });
      res.on("end", () => {
        if (res.statusCode && res.statusCode >= 400) {
          reject(new Error(`Erro SOAP: HTTP ${res.statusCode} - ${data}`));
        } else {
          resolve(data);
        }
      });
    });

    req.on("error", (err) => {
      reject(err);
    });

    req.write(envelope);
    req.end();
  });
}

// ─── Consulta identificadores de eventos S-5002 ───────────────────────────────

export interface IdentificadorEvento {
  nrRec:        string;
  id:           string;
  dhEvt:        string;
}

export async function consultarIdentificadoresS5002(params: {
  empresaId:   string;
  cnpjRaiz:    string;      // 8 dígitos
  perApur:     string;      // "AAAA-MM"
  dtIni?:      string;      // ISO — para paginação
}): Promise<{
  identificadores:         IdentificadorEvento[];
  dhUltimoEvtRetornado:    string | null;
  qtdeTotEvtsConsulta:     number;
}> {
  const certData = await lerCertificado(params.empresaId);
  if (!certData) throw new Error("Certificado digital não encontrado para esta empresa.");

  const ambiente = certData.ambiente as "producao" | "producao_restrita";
  const url      = WS_URLS[ambiente].consultaIdentificadores;

  const xmlBody = `
<ConsultarIdentificadoresEventosEmpregador
  xmlns="http://www.esocial.gov.br/schema/consulta/identificadores-eventos/empregador/v1_1_0">
  <eSocial xmlns="http://www.esocial.gov.br/schema/consulta/identificadores-eventos/empregador/v1_1_0">
    <consultaIdentificadoresEvts>
      <ideEmpregador>
        <tpInsc>1</tpInsc>
        <nrInsc>${params.cnpjRaiz}</nrInsc>
      </ideEmpregador>
      <consultaEvtsEmpregador>
        <tpEvt>S-5002</tpEvt>
        <perApur>${params.perApur}</perApur>
        ${params.dtIni ? `<dtIni>${params.dtIni}</dtIni>` : ""}
      </consultaEvtsEmpregador>
    </consultaIdentificadoresEvts>
  </eSocial>
</ConsultarIdentificadoresEventosEmpregador>`;

  const respXml = await chamadaSoap(
    url,
    "ConsultarIdentificadoresEventosEmpregador",
    xmlBody,
    params.empresaId,
    certData.pfxBuffer,
    certData.senha
  );

  return parseIdentificadoresResponse(respXml);
}

// ─── Download de eventos por ID ───────────────────────────────────────────────

export interface EventoDownloadado {
  id:         string;
  nrRec:      string;
  xmlEvento:  string;
  xmlRecibo:  string;
  cdResposta: string;
}

export async function downloadEventosPorId(params: {
  empresaId:  string;
  cnpjRaiz:   string;
  ids:        string[];     // máximo 50 por chamada
}): Promise<EventoDownloadado[]> {
  const certData = await lerCertificado(params.empresaId);
  if (!certData) throw new Error("Certificado digital não encontrado para esta empresa.");

  const ambiente = certData.ambiente as "producao" | "producao_restrita";
  const url      = WS_URLS[ambiente].solicitarDownload;

  const idsXml = params.ids
    .map(id => `<id>${id}</id>`)
    .join("\n");

  const xmlBody = `
<SolicitarDownloadEventosPorId
  xmlns="http://www.esocial.gov.br/schema/download/solicitacao/id/v1_1_0">
  <eSocial xmlns="http://www.esocial.gov.br/schema/download/solicitacao/id/v1_1_0">
    <download>
      <ideEmpregador>
        <tpInsc>1</tpInsc>
        <nrInsc>${params.cnpjRaiz}</nrInsc>
      </ideEmpregador>
      <solicDownloadEvtsPorId>
        ${idsXml}
      </solicDownloadEvtsPorId>
    </download>
  </eSocial>
</SolicitarDownloadEventosPorId>`;

  const respXml = await chamadaSoap(
    url,
    "SolicitarDownloadEventosPorId",
    xmlBody,
    params.empresaId,
    certData.pfxBuffer,
    certData.senha
  );

  return parseDownloadResponse(respXml);
}

// ─── Parsers de resposta XML ──────────────────────────────────────────────────

function parseIdentificadoresResponse(xml: string): {
  identificadores:      IdentificadorEvento[];
  dhUltimoEvtRetornado: string | null;
  qtdeTotEvtsConsulta:  number;
} {
  const qtdeMatch = xml.match(/<[a-zA-Z0-9:]*qtdeTotEvtsConsulta>(\d+)<\/[a-zA-Z0-9:]*qtdeTotEvtsConsulta>/);
  const dhMatch   = xml.match(/<[a-zA-Z0-9:]*dhUltimoEvtRetornado>(.*?)<\/[a-zA-Z0-9:]*dhUltimoEvtRetornado>/);

  const qtde = qtdeMatch ? parseInt(qtdeMatch[1], 10) : 0;
  const dh   = dhMatch   ? dhMatch[1]             : null;

  const identificadores: IdentificadorEvento[] = [];
  const regexEvt = /<[a-zA-Z0-9:]*identificadorEvt>([\s\S]*?)<\/[a-zA-Z0-9:]*identificadorEvt>/gi;
  let match;

  while ((match = regexEvt.exec(xml)) !== null) {
    const bloco   = match[1];
    const nrRec   = bloco.match(/<[a-zA-Z0-9:]*nrRec>(.*?)<\/[a-zA-Z0-9:]*nrRec>/)?.[1]   || "";
    const id      = bloco.match(/<[a-zA-Z0-9:]*id>(.*?)<\/[a-zA-Z0-9:]*id>/)?.[1]          || "";
    const dhEvt   = bloco.match(/<[a-zA-Z0-9:]*dhEvt>(.*?)<\/[a-zA-Z0-9:]*dhEvt>/)?.[1]    || "";
    identificadores.push({ nrRec, id, dhEvt });
  }

  return { identificadores, dhUltimoEvtRetornado: dh, qtdeTotEvtsConsulta: qtde };
}

function parseDownloadResponse(xml: string): EventoDownloadado[] {
  const eventos: EventoDownloadado[] = [];
  const regexArq = /<[a-zA-Z0-9:]*arquivo>([\s\S]*?)<\/[a-zA-Z0-9:]*arquivo>/gi;
  let match;

  while ((match = regexArq.exec(xml)) !== null) {
    const bloco = match[1];
    const cdResposta = bloco.match(/<[a-zA-Z0-9:]*cdResposta>(.*?)<\/[a-zA-Z0-9:]*cdResposta>/)?.[1] || "";
    const id = bloco.match(/<[a-zA-Z0-9:]*Id>(.*?)<\/[a-zA-Z0-9:]*Id>/i)?.[1] || "";
    const nrRec = bloco.match(/<[a-zA-Z0-9:]*nrRec>(.*?)<\/[a-zA-Z0-9:]*nrRec>/)?.[1] || "";

    // O retorno do webservice encapsula o evento em dois níveis de <eSocial>:
    //   <eSocial xmlns="retornoEventoCompleto"> → <retornoEventoCompleto> → <evento> → <eSocial xmlns="evtIrrfBenef">
    // O parser S-5002 espera o <eSocial> interno (namespace evtIrrfBenef), não o wrapper externo.
    let xmlEvento = "";
    let xmlRecibo = "";

    const evtMatch = bloco.match(/<[a-zA-Z0-9:]*evt[^>]*>([\s\S]*?)<\/[a-zA-Z0-9:]*evt>/gi);
    if (evtMatch && evtMatch[0]) {
      // Dentro do bloco <evt>, localiza o <eSocial> interno do evento real
      const innerEsocial = evtMatch[0].match(
        /<eSocial[^>]+xmlns="http:\/\/www\.esocial\.gov\.br\/schema\/evt\/[^"]*"[\s\S]*?<\/eSocial>/i
      );
      xmlEvento = innerEsocial ? innerEsocial[0] : evtMatch[0];
    }

    const recMatch = bloco.match(/<[a-zA-Z0-9:]*rec[^>]*>([\s\S]*?)<\/[a-zA-Z0-9:]*rec>/gi);
    xmlRecibo = recMatch ? recMatch[0] : "";

    eventos.push({ id, nrRec, xmlEvento, xmlRecibo, cdResposta });
  }

  return eventos;
}

import { prisma } from "@/lib/prisma";
import { FiscalEngine, FiscalNature, AuditEntry } from "./engine";

export interface LinhaRendimentoCR {
  codigoReceita: string;           // "0561", "1708", "5952"
  descricao: string;               // vem da tabela rfb_codigo_receita
  rendimentoTributavel: number;
  deducoes: number;
  impostoRetido: number;
  rendimentosIsentos: number;
  despesasAcaoJudicial: number;
  fontes: ("S-5002" | "R-4020")[]; // rastreabilidade da origem
}

export interface RendimentosAgregadosDTO {
  linhas: LinhaRendimentoCR[];
  totais: Omit<LinhaRendimentoCR, "codigoReceita" | "descricao" | "fontes">;
}

/**
 * Normaliza CRMen de 6 dígitos para Código de Receita de 4 dígitos.
 * Ex: 170806 → 1708 | 056107 → 0561 | 595201 → 5952
 */
function normalizarCodigoReceita(cr: string): string {
  const limpo = cr.replace(/\D/g, "");
  return limpo.substring(0, 4);
}

function criarLinhaZerada(): Omit<LinhaRendimentoCR, "codigoReceita" | "descricao" | "fontes"> {
  return {
    rendimentoTributavel: 0,
    deducoes: 0,
    impostoRetido: 0,
    rendimentosIsentos: 0,
    despesasAcaoJudicial: 0,
  };
}

export async function buildRendimentosAgregados(
  empresaId: string,
  ano: string,
  mes?: string
): Promise<RendimentosAgregadosDTO> {

  // ── 1. Busca as duas trilhas em paralelo ────────────────────────────────────
  const [entriesS5002, entriesReinf] = await Promise.all([
    FiscalEngine.buildAuditTrail(empresaId, ano, mes),
    FiscalEngine.buildAuditTrailReinf(empresaId, ano, mes)
  ]);

  // Filtra apenas entradas ativas e que compõem base
  const ativasS5002  = entriesS5002.filter(e => e.incluido !== false && e.valorCompoeBase !== false);
  const ativasReinf  = entriesReinf.filter(e => e.incluido !== false && e.valorCompoeBase !== false);

  // ── 2. Mapa de agregação: chave = código de receita normalizado (4 dígitos) ─
  const mapa = new Map<string, LinhaRendimentoCR>();

  function obterOuCriar(cr: string, fonte: "S-5002" | "R-4020"): LinhaRendimentoCR {
    const codigo = normalizarCodigoReceita(cr);
    if (!mapa.has(codigo)) {
      mapa.set(codigo, {
        codigoReceita: codigo,
        descricao: "",          // preenchida em seguida pelo lookup na tabela
        ...criarLinhaZerada(),
        fontes: []
      });
    }
    const linha = mapa.get(codigo)!;
    if (!linha.fontes.includes(fonte)) linha.fontes.push(fonte);
    return linha;
  }

  // ── 3. Agrega S-5002 ────────────────────────────────────────────────────────
  for (const e of ativasS5002) {
    const cr = e.cr || e.tpCR || "";
    if (!cr) continue;

    const linha = obterOuCriar(cr, "S-5002");

    switch (e.fiscalNature) {
      case FiscalNature.REND_TRIBUTAVEL:
        linha.rendimentoTributavel += e.valor;
        break;
      case FiscalNature.IRRF_RETIDO:
        linha.impostoRetido += e.valor;
        break;
      case FiscalNature.ISENTO:
        linha.rendimentosIsentos += e.valor;
        break;
      case FiscalNature.PREVIDENCIA_OFICIAL:
      case FiscalNature.PREVIDENCIA_COMPLEMENTAR:
      case FiscalNature.DEPENDENTE:
      case FiscalNature.PENSAO:
      case FiscalNature.PLANO_SAUDE:
        linha.deducoes += e.valor;
        break;
    }
  }

  // ── 4. Agrega R-4020 ────────────────────────────────────────────────────────
  for (const e of ativasReinf) {
    const cr = e.cr || "";
    if (!cr) continue;

    const linha = obterOuCriar(cr, "R-4020");

    // "tipoValor: suspensao" vai para despesas judiciais
    if (e.metadata?.tipoValor === "suspensao") {
      linha.despesasAcaoJudicial += e.valor;
      continue;
    }

    switch (e.fiscalNature) {
      case FiscalNature.REND_TRIBUTAVEL:
        linha.rendimentoTributavel += e.valor;
        break;
      case FiscalNature.IRRF_RETIDO:
        linha.impostoRetido += e.valor;
        break;
      case FiscalNature.ISENTO:
        linha.rendimentosIsentos += e.valor;
        break;
    }
  }

  // ── 5. Enriquece com descrição da tabela rfb_codigo_receita ─────────────────
  const codigos = Array.from(mapa.keys());

  const tabelaCodigos = await prisma.rfbCodigoReceita.findMany({
    where: { codigo: { in: codigos } },
    select: { codigo: true, denominacao: true }
  });

  const descricaoMap = new Map(tabelaCodigos.map(t => [t.codigo, t.denominacao]));

  for (const [codigo, linha] of mapa.entries()) {
    linha.descricao = descricaoMap.get(codigo) ?? `Código de Receita ${codigo}`;
  }

  // ── 6. Ordena por código e calcula totais ───────────────────────────────────
  const linhas = Array.from(mapa.values()).sort((a, b) =>
    a.codigoReceita.localeCompare(b.codigoReceita)
  );

  const totais = linhas.reduce(
    (acc, l) => ({
      rendimentoTributavel:  acc.rendimentoTributavel  + l.rendimentoTributavel,
      deducoes:              acc.deducoes              + l.deducoes,
      impostoRetido:         acc.impostoRetido         + l.impostoRetido,
      rendimentosIsentos:    acc.rendimentosIsentos    + l.rendimentosIsentos,
      despesasAcaoJudicial:  acc.despesasAcaoJudicial  + l.despesasAcaoJudicial,
    }),
    criarLinhaZerada()
  );

  return { linhas, totais };
}

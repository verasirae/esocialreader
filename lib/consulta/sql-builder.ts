// lib/consulta/sql-builder.ts

export type Operador =
  | "="
  | "!="
  | ">"
  | ">="
  | "<"
  | "<="
  | "LIKE"
  | "ILIKE"
  | "IN"
  | "IS NULL"
  | "IS NOT NULL"
  | "BETWEEN";

export interface FiltroVisual {
  tabela: string;
  coluna: string;
  operador: Operador;
  valor?: string | string[];    // string[] para IN e BETWEEN
}

export interface OrdenacaoVisual {
  coluna: string;
  direcao: "ASC" | "DESC";
}

export interface JoinConfig {
  tipo: "INNER" | "LEFT" | "RIGHT";
  tabela: string;
  on: string;                   // ex: "trabalhador.empresa_id = empresa.id"
}

export interface BuilderConfig {
  tabela: string;
  colunas: string[];            // [] = SELECT *
  filtros: FiltroVisual[];
  ordenacao?: OrdenacaoVisual[];
  limite?: number;
  joins?: JoinConfig[];
}

export function buildSql(config: BuilderConfig): string {
  const cols = config.colunas.length > 0
    ? config.colunas.map(c => `"${config.tabela}"."${c}"`).join(", ")
    : "*";

  let sql = `SELECT ${cols}\nFROM "${config.tabela}"`;

  for (const join of config.joins || []) {
    sql += `\n${join.tipo} JOIN "${join.tabela}" ON ${join.on}`;
  }

  const condicoes = config.filtros
    .filter(f => f.operador !== "IS NULL" && f.operador !== "IS NOT NULL"
      ? f.valor !== undefined && f.valor !== "" && (Array.isArray(f.valor) ? f.valor.length > 0 : true)
      : true
    )
    .map(f => buildCondicao(f));

  if (condicoes.length > 0) {
    sql += `\nWHERE ${condicoes.join("\n  AND ")}`;
  }

  if (config.ordenacao && config.ordenacao.length > 0) {
    const ord = config.ordenacao
      .map(o => `"${config.tabela}"."${o.coluna}" ${o.direcao}`)
      .join(", ");
    sql += `\nORDER BY ${ord}`;
  }

  const limite = Math.min(config.limite || 500, 2000);
  sql += `\nLIMIT ${limite}`;

  return sql;
}

function buildCondicao(f: FiltroVisual): string {
  const col = `"${f.tabela}"."${f.coluna}"`;

  switch (f.operador) {
    case "IS NULL":
      return `${col} IS NULL`;
    case "IS NOT NULL":
      return `${col} IS NOT NULL`;
    case "IN": {
      const arrayValores = Array.isArray(f.valor) ? f.valor : [f.valor!];
      const valores = arrayValores
        .map(v => `'${String(v).replace(/'/g, "''")}'`)
        .join(", ");
      return `${col} IN (${valores})`;
    }
    case "BETWEEN": {
      const arr = Array.isArray(f.valor) ? f.valor : [f.valor!, ""];
      const de = arr[0] || "";
      const ate = arr[1] || "";
      return `${col} BETWEEN '${String(de).replace(/'/g, "''")}' AND '${String(ate).replace(/'/g, "''")}'`;
    }
    case "LIKE":
    case "ILIKE":
      return `${col} ${f.operador} '%${String(f.valor).replace(/'/g, "''")}%'`;
    default: {
      const v = String(f.valor).replace(/'/g, "''");
      return `${col} ${f.operador} '${v}'`;
    }
  }
}

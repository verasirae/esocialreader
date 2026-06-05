// lib/consulta/sql-guard.ts

// Padrões que nunca podem ser executados por essa rota
const BLOCKED_PATTERNS = [
  /\bDROP\b/i,
  /\bTRUNCATE\b/i,
  /\bDELETE\b/i,
  /\bUPDATE\b/i,
  /\bINSERT\b/i,
  /\bALTER\b/i,
  /\bCREATE\b/i,
  /\bGRANT\b/i,
  /\bREVOKE\b/i,
  /\bEXECUTE\b/i,
  /\bCALL\b/i,
  /pg_sleep/i,
  /pg_read_file/i,
  /pg_ls_dir/i,
  /COPY\s+.*\s+(TO|FROM)/i,
  /--.*;\s*$/m,      // comentário mascarando múltiplos statements
];

// Tabelas que nunca devem ser expostas
const BLOCKED_TABLES = [
  "certificado_digital",
  "usuario",
  "session",
  "account",
  "consulta_especial",
  "consulta_execucao",
];

export interface SqlGuardResult {
  permitido: boolean;
  motivo?: string;
}

export function validarSql(sql: string): SqlGuardResult {
  const sqlNorm = sql.trim();

  // Verifica se a instrução começa com SELECT o qual é obrigatório
  if (!sqlNorm.toUpperCase().startsWith("SELECT")) {
    return { permitido: false, motivo: "Apenas instruções SELECT de consulta são permitidas." };
  }

  for (const pattern of BLOCKED_PATTERNS) {
    if (pattern.test(sqlNorm)) {
      return {
        permitido: false,
        motivo: `Instrução bloqueada por diretiva de segurança corporativa (SQL Guard): ${pattern.source}`
      };
    }
  }

  for (const tabela of BLOCKED_TABLES) {
    const re = new RegExp(`\\b${tabela}\\b`, "i");
    if (re.test(sqlNorm)) {
      return {
        permitido: false,
        motivo: `Acesso à tabela protegida "${tabela}" não é permitido por esta rota.`
      };
    }
  }

  return { permitido: true };
}

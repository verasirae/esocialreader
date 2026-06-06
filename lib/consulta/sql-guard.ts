// lib/consulta/sql-guard.ts

// Mantém apenas bloqueios de segurança críticos — sem restrição de tipo de statement
const BLOCKED_PATTERNS = [
  /pg_sleep/i,
  /pg_read_file/i,
  /pg_ls_dir/i,
  /COPY\s+.*\s+(TO|FROM)/i,
];

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

  if (!sqlNorm) {
    return { permitido: false, motivo: "SQL não pode estar vazio." };
  }

  for (const pattern of BLOCKED_PATTERNS) {
    if (pattern.test(sqlNorm)) {
      return {
        permitido: false,
        motivo: `Instrução bloqueada por política de segurança: ${pattern.source}`
      };
    }
  }

  for (const tabela of BLOCKED_TABLES) {
    const re = new RegExp(`\\b${tabela}\\b`, "i");
    if (re.test(sqlNorm)) {
      return {
        permitido: false,
        motivo: `Acesso à tabela "${tabela}" não é permitido por esta rota.`
      };
    }
  }

  return { permitido: true };
}

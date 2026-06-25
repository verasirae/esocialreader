import crypto from "crypto";
import fs from "fs";
import path from "path";
import { execSync } from "child_process";
import { prisma } from "@/lib/prisma";

const CERT_SECRET = process.env.JWT_SECRET || "compliance_portal_secret_key_1234567890";
const CERT_DIR    = process.env.CERT_STORAGE_PATH || "./storage/certificados";

// Garante que o diretório existe
function ensureCertDir() {
  if (!fs.existsSync(CERT_DIR)) {
    fs.mkdirSync(CERT_DIR, { recursive: true });
  }
}

// Criptografa a senha do certificado com AES-256
export function criptografarSenha(senha: string): string {
  const iv  = crypto.randomBytes(16);
  const key = crypto.createHash("sha256").update(CERT_SECRET).digest();
  const cipher = crypto.createCipheriv("aes-256-cbc", key, iv);
  let enc = cipher.update(senha, "utf8", "hex");
  enc += cipher.final("hex");
  return iv.toString("hex") + ":" + enc;
}

// Descriptografa a senha do certificado
export function descriptografarSenha(senhaCriptografada: string): string {
  try {
    const [ivHex, encHex] = senhaCriptografada.split(":");
    if (!ivHex || !encHex) return "";
    const iv  = Buffer.from(ivHex, "hex");
    const key = crypto.createHash("sha256").update(CERT_SECRET).digest();
    const decipher = crypto.createDecipheriv("aes-256-cbc", key, iv);
    let dec = decipher.update(encHex, "hex", "utf8");
    dec += decipher.final("utf8");
    return dec;
  } catch (error) {
    console.error("Erro ao descriptografar senha do certificado:", error);
    return "";
  }
}

// ─── Extração de metadados via OpenSSL nativo ─────────────────────────────────
// Usa o módulo crypto nativo do Node.js (OpenSSL) em vez de node-forge.
// Suporta PFX modernos com AES-256-CBC + SHA-256 (padrão ICP-Brasil A1).

function extrairMetadados(
  pfxBuffer: Buffer,
  senha: string
): { validade: Date; fingerprint: string } {
  try {
    return extrairMetadadosNativo(pfxBuffer, senha);
  } catch (err) {
    console.warn("[CertificadoService] Não foi possível extrair metadados do PFX. Usando fallback.", err);
    return {
      validade:    new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      fingerprint: "",
    };
  }
}

function extrairMetadadosNativo(
  pfxBuffer: Buffer,
  senha: string
): { validade: Date; fingerprint: string } {
  // Usa arquivos temporários com OpenSSL CLI — disponível em qualquer ambiente Linux/Node
  const tmpDir      = require("os").tmpdir();
  const tmpPfx      = path.join(tmpDir, `cert_${Date.now()}.pfx`);
  const tmpPem      = path.join(tmpDir, `cert_${Date.now()}.pem`);

  try {
    fs.writeFileSync(tmpPfx, pfxBuffer);

    // Extrai o certificado do PFX para PEM via OpenSSL
    // Usando env:CERT_PWD para evitar qualquer problema de escape de caracteres na senha
    execSync(
      `openssl pkcs12 -in "${tmpPfx}" -nokeys -passin env:CERT_PWD -out "${tmpPem}" -legacy 2>/dev/null || ` +
      `openssl pkcs12 -in "${tmpPfx}" -nokeys -passin env:CERT_PWD -out "${tmpPem}" 2>/dev/null`,
      {
        stdio: "pipe",
        env: { ...process.env, CERT_PWD: senha }
      }
    );

    // Extrai a data de validade
    const validadeRaw = execSync(
      `openssl x509 -in "${tmpPem}" -noout -enddate 2>/dev/null`,
      { stdio: "pipe" }
    ).toString().trim();
    // Formato: "notAfter=Jun 22 00:00:00 2027 GMT"
    const dateStr = validadeRaw.replace("notAfter=", "").trim();
    const validade = new Date(dateStr);

    // Extrai o fingerprint SHA-1
    const fingerprintRaw = execSync(
      `openssl x509 -in "${tmpPem}" -noout -fingerprint -sha1 2>/dev/null`,
      { stdio: "pipe" }
    ).toString().trim();
    // Formato: "SHA1 Fingerprint=AA:BB:CC:..."
    const fingerprint = fingerprintRaw.split("=")[1] || "";

    return { validade, fingerprint };
  } finally {
    // Limpa arquivos temporários sempre
    try { fs.unlinkSync(tmpPfx); } catch {}
    try { fs.unlinkSync(tmpPem); } catch {}
  }
}

// Salva o arquivo .pfx no storage e persiste no banco
export async function salvarCertificado(params: {
  empresaId:   string;
  nome:        string;
  pfxBuffer:   Buffer;
  senha:       string;
  nrInscCert?: string;
  ambiente:    "producao" | "producao_restrita";
}): Promise<string> {
  ensureCertDir();

  // Extrai validade e fingerprint do certificado PFX
  const { validade, fingerprint } = extrairMetadados(params.pfxBuffer, params.senha);

  // Salva o arquivo com nome único
  const nomeArquivo = `cert_${params.empresaId}_${Date.now()}.pfx`;
  const storagePath = path.join(CERT_DIR, nomeArquivo);
  fs.writeFileSync(storagePath, params.pfxBuffer);

  // Desativa certificados anteriores da empresa
  await prisma.certificadoDigital.updateMany({
    where: { empresaId: params.empresaId, ativo: true },
    data:  { ativo: false },
  });

  // Persiste no banco
  const cert = await prisma.certificadoDigital.create({
    data: {
      empresaId:          params.empresaId,
      nome:               params.nome,
      validade,
      fingerprint,
      nrInscCert:         params.nrInscCert || null,
      senhaCriptografada: criptografarSenha(params.senha),
      storagePath,
      ambiente:           params.ambiente,
      ativo:              true,
    },
  });

  return cert.id;
}

// Lê o PFX do disco e retorna buffer + senha descriptografada
export async function lerCertificado(empresaId: string): Promise<{
  pfxBuffer: Buffer;
  senha:     string;
  nrInsc:    string;
  ambiente:  string;
} | null> {
  const cert = await prisma.certificadoDigital.findFirst({
    where:   { empresaId, ativo: true },
    orderBy: { createdAt: "desc" },
  });

  if (!cert) return null;

  if (!fs.existsSync(cert.storagePath)) {
    throw new Error(`Arquivo de certificado não encontrado: ${cert.storagePath}`);
  }

  return {
    pfxBuffer: fs.readFileSync(cert.storagePath),
    senha:     descriptografarSenha(cert.senhaCriptografada),
    nrInsc:    cert.nrInscCert || "",
    ambiente:  cert.ambiente,
  };
}

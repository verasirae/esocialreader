import crypto from "crypto";
import fs from "fs";
import path from "path";
import os from "os";
import { execSync } from "child_process";
import { prisma } from "@/lib/prisma";

const CERT_SECRET = process.env.JWT_SECRET || "compliance_portal_secret_key_1234567890";
const CERT_DIR = process.env.CERT_STORAGE_PATH
  ? path.resolve(process.env.CERT_STORAGE_PATH)
  : path.resolve(process.cwd(), "storage", "certificados");

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
  const tmpDir = require("os").tmpdir();
  const ts     = Date.now();
  const tmpPfx = path.join(tmpDir, `cert_${ts}.pfx`);
  const tmpPem = path.join(tmpDir, `cert_${ts}.pem`);

  try {
    fs.writeFileSync(tmpPfx, pfxBuffer);

    // Tenta as três variações em ordem de compatibilidade:
    // 1. Moderno (OpenSSL 3, AES-256)
    // 2. Legado (3DES/RC2)
    // 3. Sem verificação de MAC (alguns certificados ICP-Brasil com SHA-256 MAC)
    const tentativas = [
      `openssl pkcs12 -in "${tmpPfx}" -nokeys -passin env:CERT_PWD -out "${tmpPem}" 2>/dev/null`,
      `openssl pkcs12 -in "${tmpPfx}" -nokeys -passin env:CERT_PWD -out "${tmpPem}" -legacy 2>/dev/null`,
      `openssl pkcs12 -in "${tmpPfx}" -nokeys -passin env:CERT_PWD -out "${tmpPem}" -nomacver 2>/dev/null`,
      `openssl pkcs12 -in "${tmpPfx}" -nokeys -passin env:CERT_PWD -out "${tmpPem}" -legacy -nomacver 2>/dev/null`,
    ];

    let extraido = false;
    const env = { ...process.env, CERT_PWD: senha };

    for (const cmd of tentativas) {
      try {
        execSync(cmd, { stdio: "pipe", env });
        if (fs.existsSync(tmpPem) && fs.statSync(tmpPem).size > 0) {
          extraido = true;
          break;
        }
      } catch {
        // Tenta próxima variação
      }
    }

    if (!extraido) {
      throw new Error("Nenhuma variação do OpenSSL conseguiu extrair o certificado.");
    }

    // Extrai validade
    const validadeRaw = execSync(
      `openssl x509 -in "${tmpPem}" -noout -enddate 2>/dev/null`,
      { stdio: "pipe", env }
    ).toString().trim().replace("notAfter=", "").trim();

    // Extrai fingerprint
    const fingerprintRaw = execSync(
      `openssl x509 -in "${tmpPem}" -noout -fingerprint -sha1 2>/dev/null`,
      { stdio: "pipe", env }
    ).toString().trim();

    return {
      validade:    new Date(validadeRaw),
      fingerprint: fingerprintRaw.split("=")[1] || "",
    };
  } finally {
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
  console.log("[CertificadoService] cwd:", process.cwd());
  console.log("[CertificadoService] CERT_DIR:", CERT_DIR);
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

  // Resolve o caminho — suporta tanto absoluto (novo) quanto relativo (legado)
  const certPath = path.isAbsolute(cert.storagePath)
    ? cert.storagePath
    : path.resolve(process.cwd(), cert.storagePath);

  if (!fs.existsSync(certPath)) {
    throw new Error(`Arquivo de certificado não encontrado: ${certPath}`);
  }

  // Atualiza o caminho no banco para absoluto se ainda era relativo (auto-migração)
  if (!path.isAbsolute(cert.storagePath)) {
    await prisma.certificadoDigital.update({
      where: { id: cert.id },
      data:  { storagePath: certPath },
    });
  }

  return {
    pfxBuffer: fs.readFileSync(certPath),
    senha:     descriptografarSenha(cert.senhaCriptografada),
    nrInsc:    cert.nrInscCert || "",
    ambiente:  cert.ambiente,
  };
}

/**
 * Converte PFX → cert PEM + key PEM via OpenSSL CLI.
 * Necessário porque o Node.js built-in TLS não suporta
 * PFX com AES-256 (padrão ICP-Brasil A1 moderno).
 */
export function pfxParaPem(pfxBuffer: Buffer, senha: string): {
  cert: Buffer;
  key:  Buffer;
} {
  const tmpDir = os.tmpdir();
  const ts     = Date.now();
  const tmpPfx  = path.join(tmpDir, `tls_${ts}.pfx`);
  const tmpCert = path.join(tmpDir, `tls_${ts}_cert.pem`);
  const tmpKey  = path.join(tmpDir, `tls_${ts}_key.pem`);

  try {
    fs.writeFileSync(tmpPfx, pfxBuffer);
    const env = { ...process.env, CERT_PWD: senha };

    // Extrai certificado (cadeia completa)
    const cmdsCert = [
      `openssl pkcs12 -in "${tmpPfx}" -nokeys -passin env:CERT_PWD -out "${tmpCert}" 2>/dev/null`,
      `openssl pkcs12 -in "${tmpPfx}" -nokeys -passin env:CERT_PWD -out "${tmpCert}" -legacy 2>/dev/null`,
      `openssl pkcs12 -in "${tmpPfx}" -nokeys -passin env:CERT_PWD -out "${tmpCert}" -nomacver 2>/dev/null`,
      `openssl pkcs12 -in "${tmpPfx}" -nokeys -passin env:CERT_PWD -out "${tmpCert}" -legacy -nomacver 2>/dev/null`,
    ];

    // Extrai chave privada (sem senha no PEM de saída)
    const cmdsKey = [
      `openssl pkcs12 -in "${tmpPfx}" -nocerts -nodes -passin env:CERT_PWD -out "${tmpKey}" 2>/dev/null`,
      `openssl pkcs12 -in "${tmpPfx}" -nocerts -nodes -passin env:CERT_PWD -out "${tmpKey}" -legacy 2>/dev/null`,
      `openssl pkcs12 -in "${tmpPfx}" -nocerts -nodes -passin env:CERT_PWD -out "${tmpKey}" -nomacver 2>/dev/null`,
      `openssl pkcs12 -in "${tmpPfx}" -nocerts -nodes -passin env:CERT_PWD -out "${tmpKey}" -legacy -nomacver 2>/dev/null`,
    ];

    let certOk = false;
    for (const cmd of cmdsCert) {
      try {
        execSync(cmd, { stdio: "pipe", env });
        if (fs.existsSync(tmpCert) && fs.statSync(tmpCert).size > 0) {
          certOk = true;
          break;
        }
      } catch {}
    }

    let keyOk = false;
    for (const cmd of cmdsKey) {
      try {
        execSync(cmd, { stdio: "pipe", env });
        if (fs.existsSync(tmpKey) && fs.statSync(tmpKey).size > 0) {
          keyOk = true;
          break;
        }
      } catch {}
    }

    if (!certOk || !keyOk) {
      throw new Error(
        `OpenSSL não conseguiu extrair ${!certOk ? "certificado" : "chave privada"} do PFX. ` +
        `Verifique se a senha está correta e se o arquivo é um PFX/P12 válido.`
      );
    }

    return {
      cert: fs.readFileSync(tmpCert),
      key:  fs.readFileSync(tmpKey),
    };
  } finally {
    try { fs.unlinkSync(tmpPfx);  } catch {}
    try { fs.unlinkSync(tmpCert); } catch {}
    try { fs.unlinkSync(tmpKey);  } catch {}
  }
}


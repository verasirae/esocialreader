import crypto from "crypto";
import fs from "fs";
import path from "path";
import { prisma } from "@/lib/prisma";
import * as forge from "node-forge";

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

// Extrai validade e fingerprint do PFX usando forge
function extrairMetadados(pfxBuffer: Buffer, senha: string): {
  validade:    Date;
  fingerprint: string;
} {
  try {
    const p12Asn1 = forge.asn1.fromDer(pfxBuffer.toString("binary"));
    const p12   = forge.pkcs12.pkcs12FromAsn1(p12Asn1, senha);

    const bags = p12.getBags({ bagType: forge.pki.oids.certBag });
    const certBag = bags[forge.pki.oids.certBag];
    const cert = certBag && certBag[0] ? certBag[0].cert : null;

    if (!cert) throw new Error("Certificado não encontrado no PFX");

    const validade    = new Date(cert.validity.notAfter);
    
    // Calculates fingerprint
    const certAsn1 = forge.pki.certificateToAsn1(cert);
    const certDer = forge.asn1.toDer(certAsn1).getBytes();
    const md = forge.md.sha1.create();
    md.update(certDer);
    const hex = md.digest().toHex().toUpperCase();
    const fingerprint = (hex.match(/.{2}/g) || []).join(":");

    return { validade, fingerprint };
  } catch (error) {
    console.error("Erro ao extrair metadados do certificado A1:", error);
    // Fallback de 1 ano
    return { validade: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), fingerprint: "" };
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
      empresaId:         params.empresaId,
      nome:              params.nome,
      validade,
      fingerprint,
      nrInscCert:        params.nrInscCert || null,
      senhaCriptografada: criptografarSenha(params.senha),
      storagePath,
      ambiente:          params.ambiente,
      ativo:             true,
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

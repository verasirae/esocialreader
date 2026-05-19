import forge from "node-forge";
import fs from "fs";

export interface CertificadoData {
  cert: string;
  key: string;
  fingerprint: string;
  validade: Date;
  subject: string;
}

export class CertificadoService {
  /**
   * Extrai certificado e chave privada de um arquivo PFX/P12.
   */
  public extractFromPfx(pfxBuffer: Buffer, password: string): CertificadoData {
    const p12Asn1 = forge.asn1.fromDer(pfxBuffer.toString("binary"));
    const p12 = forge.pkcs12.pkcs12FromAsn1(p12Asn1, password);

    // Extrair chave privada
    const keyBags = p12.getBags({ bagType: forge.pki.oids.pkcs8ShroudedKeyBag });
    const pkey = (keyBags[forge.pki.oids.pkcs8ShroudedKeyBag] || [])[0].key;

    // Extrair certificados
    const certBags = p12.getBags({ bagType: forge.pki.oids.certBag });
    const certs = (certBags[forge.pki.oids.certBag] || []).map((bag: any) => bag.cert);

    const mainCert = certs[0];

    if (!mainCert || !pkey) {
      throw new Error("Não foi possível extrair o certificado ou a chave privada do arquivo PFX.");
    }

    const certPem = forge.pki.certificateToPem(mainCert);
    const keyPem = forge.pki.privateKeyToPem(pkey);

    // Calcular fingerprint (SHA1)
    const md = forge.md.sha1.create();
    md.update(forge.asn1.toDer(forge.pki.certificateToAsn1(mainCert)).getBytes());
    const fingerprint = md.digest().toHex().match(/.{2}/g)?.join(":") || "";

    return {
      cert: certPem,
      key: keyPem,
      fingerprint,
      validade: mainCert.validity.notAfter,
      subject: mainCert.subject.getField("CN")?.value || "",
    };
  }
}

export const certificadoService = new CertificadoService();

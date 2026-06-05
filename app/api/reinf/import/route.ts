import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";
import { storageService } from "@/services/storage/supabase-storage.service";
import { reinfR2099ParserService } from "@/services/parser/reinf-r2099-parser.service";
import { reinfR4020ParserService } from "@/services/parser/reinf-r4020-parser.service";
import { reinfProcessorService } from "@/services/esocial/reinf-processor.service";
import { StatusProcessamento } from "@prisma/client";

function detectTpEvento(xmlContent: string): string {
  const match = xmlContent.match(/<tpEv>(\d+)<\/tpEv>/);
  return match?.[1] || "";
}

export async function POST(req: NextRequest) {
  try {
    const contentType = req.headers.get("content-type") || "";
    if (!contentType.includes("multipart/form-data")) {
      return NextResponse.json({ error: "Content-Type deve ser multipart/form-data" }, { status: 400 });
    }

    const formData = await req.formData();
    const files = formData.getAll("files") as File[];
    const empresaIdHint = formData.get("empresaId") as string;

    if (!files || files.length === 0) {
      return NextResponse.json({ error: "Nenhum arquivo enviado" }, { status: 400 });
    }

    let queuedCount = 0;
    let errorCount = 0;
    const errors: string[] = [];
    const processedEvents: any[] = [];
    let lastTpEvento = "R-2099";

    for (const file of files) {
      try {
        const xmlContent = await file.text();
        const tpEvento = detectTpEvento(xmlContent);
        lastTpEvento = tpEvento === "4020" ? "R-4020" : "R-2099";

        let cnpjRaiz = "";
        let perApur = "";
        let totalPrestadores = 0;

        if (tpEvento === "4020") {
          const parsed = reinfR4020ParserService.parse(xmlContent);
          cnpjRaiz = parsed.cnpjRaiz;
          perApur = parsed.perApur;
          totalPrestadores = parsed.beneficiarios.length;
        } else {
          // Default to R-2099 for backward compatibility
          const parsed = reinfR2099ParserService.parse(xmlContent);
          cnpjRaiz = parsed.cnpjRaiz;
          perApur = parsed.perApur;
          totalPrestadores = parsed.retencoesPorPrestador?.length || 0;
        }

        if (!cnpjRaiz) {
          errorCount++;
          errors.push(`${file.name}: CNPJ Raiz do contribuinte não localizado no XML`);
          continue;
        }

        // Tenta encontrar a empresa pelo CNPJ Raiz
        const empresa = await prisma.empresa.findUnique({
          where: { cnpjRaiz }
        });

        const hash = crypto.createHash("sha256").update(xmlContent).digest("hex");
        const storagePath = `xml/reinf/${cnpjRaiz}/${hash}.xml`;

        // Upload físico do XML
        try {
          await storageService.uploadXml(storagePath, xmlContent);
        } catch (e) {
          // Ignora se já implementado ou se bucket opcional
        }

        // 2. Criação do Lote REINF
        const lote = await prisma.reinfLote.create({
          data: {
            empresaId: empresa?.id || empresaIdHint || null,
            hashArquivo: hash,
            nomeArquivo: file.name,
            storagePath,
            status: StatusProcessamento.pendente,
            totalEventos: 1
          }
        });

        // 3. Execução assíncrona do processador
        setTimeout(async () => {
          try {
            await reinfProcessorService.process({
              xmlContent,
              empresaId: empresa?.id || empresaIdHint || "",
              loteId: lote.id,
              xmlHash: hash
            });
          } catch (procErr: any) {
            console.error(`[ReinfImport-Deferred] Erro no processamento de ${file.name}:`, procErr);
          }
        }, 0);

        queuedCount++;
        processedEvents.push({
          fileName: file.name,
          cnpjRaiz,
          perApur,
          totalPrestadores
        });
      } catch (err: any) {
        console.error(`Erro ao importar arquivo REINF ${file.name}:`, err);
        errorCount++;
        errors.push(`${file.name}: ${err.message}`);
      }
    }

    // Registra log geral de importação
    try {
      await prisma.esocialImportLog.create({
        data: {
          tableId: lastTpEvento,
          fileName: files.length === 1 ? files[0].name : `${files.length} arquivos XML REINF`,
          processed: queuedCount,
          errors: errorCount,
          status: errorCount === 0 ? "Sucesso" : queuedCount > 0 ? "Concluído com avisos" : "Falha",
        }
      });
    } catch (logErr) {
      console.error("[ReinfImport] Falha ao gravar log:", logErr);
    }

    const allFailed = files.length > 0 && queuedCount === 0;

    return NextResponse.json({
      success: !allFailed,
      total: files.length,
      queued: queuedCount,
      errors: errorCount,
      detailErrors: errors,
      processedEvents,
      message: allFailed 
        ? `Falha total na importação REINF: ${errorCount} erros.`
        : `Importação processada: ${queuedCount} arquivos enfileirados para processamento, ${errorCount} erros.`
    });
  } catch (error: any) {
    console.error("Erro na rota de importação REINF:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

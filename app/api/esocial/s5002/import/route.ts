import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";
import { fiscalCache } from "@/lib/fiscal/cache";
import { storageService } from "@/services/storage/supabase-storage.service";
import { queueService } from "@/services/esocial/queue.service";
import { s5002Parser } from "@/services/parser/s5002-parser.service";
import { StatusProcessamento, EsocialAmbiente } from "@prisma/client";

export async function POST(req: NextRequest) {
  try {
    const contentType = req.headers.get("content-type") || "";
    if (!contentType.includes("multipart/form-data")) {
      return NextResponse.json({ error: "Content-Type deve ser multipart/form-data" }, { status: 400 });
    }

    const formData = await req.formData();
    const files = formData.getAll("files") as File[];
    const cnpjRaizHint = formData.get("cnpjRaiz") as string;

    if (!files || files.length === 0) {
      return NextResponse.json({ error: "Nenhum arquivo enviado" }, { status: 400 });
    }

    let queuedCount = 0;
    let errorCount = 0;
    const errors: string[] = [];

    for (const file of files) {
      try {
        const xmlContent = await file.text();
        
        // Extrair cnpjRaiz do XML
        const parsedX = s5002Parser.parse(xmlContent);
        const cnpjRaiz = cnpjRaizHint || parsedX.cnpjRaiz;
        const cpfBenef = parsedX.trabalhador.cpfBenef;

        if (!cnpjRaiz) {
          console.error(`Arquivo ${file.name} sem CNPJ identificado.`);
          errorCount++;
          errors.push(`${file.name}: CNPJ não identificado no XML`);
          continue;
        }

        const empresa = await prisma.empresa.findUnique({
          where: { cnpjRaiz }
        });

        // REQUISITO: Se a empresa não estiver no sistema, bloqueia importação
        if (!empresa) {
          errorCount++;
          errors.push(`${file.name}: Empresa ${cnpjRaiz} não cadastrada. Cadastre a empresa antes de importar S-5002.`);
          continue;
        }

        // REQUISITO: Se o trabalhador não estiver no sistema, bloqueia importação
        const trabalhador = await prisma.trabalhador.findUnique({
          where: { empresaId_cpf: { empresaId: empresa.id, cpf: cpfBenef } }
        });

        if (!trabalhador) {
          errorCount++;
          errors.push(`${file.name}: Trabalhador ${cpfBenef} não identificado na empresa ${empresa.razaoSocial}. Cadastre o trabalhador antes de importar S-5002.`);
          continue;
        }

        const hash = crypto.createHash("sha256").update(xmlContent).digest("hex");

        // 1. Garantir Registro de Storage (Deduplicação física)
        const storagePath = `xml/original/${cnpjRaiz}/${hash}.xml`;
        const storageRecord = await prisma.esocialXmlStorage.upsert({
          where: { hashArquivo: hash },
          update: {},
          create: {
            hashArquivo: hash,
            storagePath: storagePath
          }
        });

        // Garantir que o arquivo físico existe
        try {
          await storageService.uploadXml(storagePath, xmlContent);
        } catch (e) {
          // Ignora se já existir
        }

        // 2. Registrar Lote (Histórico Operacional)
        const resolvedEmpresaId = empresa.id;
        const resolvedTrabalhadorId = trabalhador.id;

        const lote = await prisma.esocialLote.create({
          data: {
            empresaId: resolvedEmpresaId,
            storageId: storageRecord.id,
            hashArquivo: hash,
            nomeArquivo: file.name,
            storagePath: storageRecord.storagePath,
            status: StatusProcessamento.pendente,
            totalEventos: 1
          }
        });

        // Invalidate cache for immediate responsive updates
        fiscalCache.invalidate(resolvedEmpresaId);

        // 3. Adicionar na Fila para Processamento Lógico (Assíncrono via setTimeout)
        setTimeout(async () => {
          try {
            await queueService.addJob("s5002-process", {
              xmlContent,
              empresaId: resolvedEmpresaId,
              trabalhadorId: resolvedTrabalhadorId,
              loteId: lote.id,
              xmlPath: storageRecord.storagePath,
              xmlHash: hash
            });
          } catch (jobErr) {
            console.error(`[Import-Deferred] Erro ao processar job para ${file.name}:`, jobErr);
          }
        }, 0);

        queuedCount++;
      } catch (err: any) {
        console.error(`Erro ao enfileirar arquivo ${file.name}:`, err);
        if (err.name === "PrismaClientValidationError") {
          console.error(`DETALHE VALIDACAO PRISMA em ${file.name}:`, err.message);
        }
        errorCount++;
        errors.push(`${file.name}: ${err.message}`);
      }
    }

    const allFailed = files.length > 0 && queuedCount === 0;

    // Registrar Log no Histórico Centralizado
    try {
      await prisma.esocialImportLog.create({
        data: {
          tableId: "S-5002",
          fileName: files.length === 1 ? files[0].name : `${files.length} arquivos XML`,
          processed: queuedCount,
          errors: errorCount,
          status: errorCount === 0 ? "Sucesso" : queuedCount > 0 ? "Concluído com avisos" : "Falha",
        }
      });
    } catch (logErr) {
      console.error("[S5002-Import] Falha ao registrar log:", logErr);
    }

    return NextResponse.json({ 
      success: !allFailed, 
      total: files.length,
      queued: queuedCount,
      errors: errorCount,
      detailErrors: errors,
      message: allFailed 
        ? `Falha total na importação: ${errorCount} erros encontrados.`
        : `Importação processada: ${queuedCount} arquivos enfileirados, ${errorCount} erros.`
    });

  } catch (error: any) {
    console.error("Erro na rota de importação refatorada:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

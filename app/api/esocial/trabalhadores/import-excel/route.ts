import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { safeJson } from "@/lib/api-utils";
import * as XLSX from "xlsx";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return safeJson({ error: "Nenhum arquivo enviado" }, 400);
    }

    const bytes = await file.arrayBuffer();
    const workbook = XLSX.read(bytes, { type: "buffer" });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet) as any[];

    let processed = 0;
    let errors = 0;

    for (const row of data) {
      try {
        // Mapeamento flexível de colunas
        const cpfRaw = String(row.CPF || row.cpf || "").replace(/\D/g, "");
        const cpf = cpfRaw.padStart(11, "0");
        const nome = String(row.Nome || row.nome || row.NOME || "");
        const cnpjEmpregadorRaw = String(row.CNPJ_Empregador || row.cnpj_empregador || row.CNPJ || "");
        const cnpjEmpregador = cnpjEmpregadorRaw.replace(/\D/g, "").padStart(14, "0");

        if (!cpf || cpf.length !== 11 || !nome) {
          errors++;
          continue;
        }

        let empresaId: string | undefined = undefined;

        if (cnpjEmpregador) {
          const cnpjRaiz = cnpjEmpregador.substring(0, 8);
          const empresa = await prisma.empresa.findFirst({
            where: {
              OR: [
                { cnpjRaiz: cnpjRaiz },
                { cnpjCompleto: cnpjEmpregador }
              ]
            }
          });

          if (empresa) {
            empresaId = empresa.id;
          } else {
            // Se a empresa não existe, opcionalmente poderíamos criar, 
            // mas por segurança vamos apenas ignorar ou registrar erro se não achar
            // Por enquanto, vamos criar uma empresa básica se tiver o CNPJ
            if (cnpjEmpregador.length >= 8) {
               const newEmpresa = await prisma.empresa.create({
                 data: {
                   cnpjRaiz,
                   cnpjCompleto: cnpjEmpregador.length >= 14 ? cnpjEmpregador : null,
                   razaoSocial: "Empresa Importada " + cnpjRaiz
                 }
               });
               empresaId = newEmpresa.id;
            }
          }
        }

        if (empresaId) {
          await prisma.trabalhador.upsert({
            where: { 
              empresaId_cpf: {
                empresaId,
                cpf
              }
            },
            update: { 
              nome,
              empresaId
            },
            create: { 
              cpf,
              nome,
              empresaId
            }
          });
          processed++;
        } else {
          errors++;
        }
      } catch (err) {
        console.error("Erro na linha:", row, err);
        errors++;
      }
    }

    // Registrar Log no Histórico Centralizado
    try {
      await prisma.esocialImportLog.create({
        data: {
          tableId: "Trabalhadores",
          fileName: file.name,
          processed,
          errors,
          status: errors === 0 ? "Sucesso" : processed > 0 ? "Concluído com avisos" : "Falha",
        }
      });
    } catch (logErr) {
      console.error("[Excel-Import] Falha ao registrar log:", logErr);
    }

    return safeJson({ success: true, processed, errors });
  } catch (error) {
    console.error("Erro ao importar Excel:", error);
    return safeJson({ error: "Erro ao processar o arquivo" }, 500);
  }
}

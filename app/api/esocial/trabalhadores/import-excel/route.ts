import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { safeJson } from "@/lib/api-utils";
import { getActiveEmpresaId } from "@/lib/auth-server";
import * as XLSX from "xlsx";

function parseExcelDate(val: any): Date | null {
  if (!val) return null;
  // If it's a number, it could be an Excel serial date
  if (typeof val === "number") {
    // Excel base date is 1899-12-30
    const date = new Date((val - 25569) * 86400 * 1000);
    if (!isNaN(date.getTime())) return date;
  }
  const parsed = new Date(val);
  if (!isNaN(parsed.getTime())) return parsed;

  if (typeof val === "string") {
    const parts = val.trim().split("/");
    if (parts.length === 3) {
      const d = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10) - 1;
      const y = parseInt(parts[2], 10);
      const dObj = new Date(y, m, d);
      if (!isNaN(dObj.getTime())) return dObj;
    }
  }
  return null;
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;
    const activeEmpresaId = await getActiveEmpresaId(req);

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
        const nome = String(row.Nome || row.nome || row.NOME || "").trim();
        const cnpjEmpregadorRaw = String(row.CNPJ_Empregador || row.cnpj_empregador || row.CNPJ || "");
        const cleanCnpj = cnpjEmpregadorRaw.replace(/\D/g, "");

        if (!cpf || cpf.length !== 11 || !nome) {
          errors++;
          continue;
        }

        // Parse optional worker fields
        const nis = row.NIS || row.nis || row.Nis || null ? String(row.NIS || row.nis || row.Nis).trim() : null;
        const matricula = row.Matricula || row.matricula || row.MATRICULA || null ? String(row.Matricula || row.matricula || row.MATRICULA).trim() : null;
        const categoriaEsocial = row.Categoria_eSocial || row.categoria_esocial || row.Categoria || null ? String(row.Categoria_eSocial || row.categoria_esocial || row.Categoria).trim() : null;
        
        const dtAdmissao = parseExcelDate(row.Data_Admissao || row.data_admissao || row.dt_admissao || row.Admissao);
        const dtDesligamento = parseExcelDate(row.Data_Desligamento || row.data_desligamento || row.dt_desligamento || row.Desligamento);

        let ativo = true;
        const rawAtivo = row.Ativo || row.ativo || row.ATIVO;
        if (rawAtivo !== undefined) {
          const s = String(rawAtivo).toLowerCase().trim();
          if (s === "não" || s === "nao" || s === "false" || s === "0" || s === "n" || s === "inativo") {
            ativo = false;
          }
        }

        let empresaId: string | undefined = undefined;

        // Se informou CNPJ na planilha, tentar resolver a empresa correspondente
        if (cleanCnpj) {
          let cnpjRaiz = "";
          let cnpjCompleto: string | null = null;

          if (cleanCnpj.length >= 8) {
            cnpjRaiz = cleanCnpj.substring(0, 8);
            if (cleanCnpj.length >= 14) {
              cnpjCompleto = cleanCnpj.substring(0, 14);
            }
          }

          if (cnpjRaiz) {
            const empresa = await prisma.empresa.findFirst({
              where: {
                OR: [
                  { cnpjRaiz: cnpjRaiz },
                  ...(cnpjCompleto ? [{ cnpjCompleto: cnpjCompleto }] : [])
                ]
              }
            });

            if (empresa) {
              empresaId = empresa.id;
            } else {
              // Se a empresa de fato não existe no sistema e tem CNPJ válido, criamos
              if (cnpjRaiz !== "00000000" && cnpjRaiz.length === 8) {
                 const newEmpresa = await prisma.empresa.create({
                   data: {
                     cnpjRaiz,
                     cnpjCompleto: cnpjCompleto,
                     razaoSocial: "Empresa Importada " + cnpjRaiz,
                     ambienteEsocial: "producao"
                   }
                 });
                 empresaId = newEmpresa.id;
              }
            }
          }
        }

        // Se não encontrou empresa pelo CNPJ informado ou o CNPJ não foi fornecido,
        // associamos à empresa ativa atual logada no sistema.
        if (!empresaId && activeEmpresaId) {
          empresaId = activeEmpresaId;
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
              nis: nis || undefined,
              matricula: matricula || undefined,
              categoriaEsocial: categoriaEsocial || undefined,
              dtAdmissao: dtAdmissao || undefined,
              dtDesligamento: dtDesligamento || undefined,
              ativo: ativo,
              empresaId
            },
            create: { 
              cpf,
              nome,
              nis,
              matricula,
              categoriaEsocial,
              dtAdmissao,
              dtDesligamento,
              ativo,
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

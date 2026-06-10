import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Helper to parse dates in DDMMYYYY format
function parseESocialDate(val: string): Date | null {
  if (!val || val.trim() === "" || val.toLowerCase() === "null") return null;
  
  const clean = val.replace(/\D/g, "");
  if (clean.length === 8) {
    // DDMMYYYY
    const day = parseInt(clean.substring(0, 2));
    const month = parseInt(clean.substring(2, 4)) - 1; // 0-indexed
    const year = parseInt(clean.substring(4, 8));
    return new Date(year, month, day);
  }
  
  // Fallback for ISO or other formats
  const d = new Date(val);
  return isNaN(d.getTime()) ? null : d;
}

export async function POST(req: Request) {
  try {
    const formData = await req.json();
    const { tableId, lines } = formData;

    if (!tableId || !lines || !Array.isArray(lines)) {
      return NextResponse.json({ error: "Parâmetros ausentes." }, { status: 400 });
    }

    let processed = 0;
    let errorsCount = 0;

    for (const line of lines) {
      if (!line.trim()) continue;
      
      const parts = line.split("|").map((p: string) => p.trim());
      const firstPartUpper = parts[0]?.toUpperCase();
      const thirdPartUpper = parts[2]?.toUpperCase();

      // Skip common header strings
      if (
        line.toUpperCase().includes("CODIGO|") ||
        line.toUpperCase().includes("DESCRICAO|") ||
        firstPartUpper === "CODFPAS" ||
        firstPartUpper === "COD_RUBRICA" ||
        thirdPartUpper === "DTINICIO" ||
        thirdPartUpper === "DT_INICIO"
      ) {
         continue;
      }
      try {
        await processLine(tableId, parts);
        processed++;
      } catch (err) {
        console.error(`Erro ao processar linha: ${line}`, err);
        errorsCount++;
      }
    }

    // Registrar Log no Banco
    try {
      await prisma.esocialImportLog.create({
        data: {
          tableId,
          fileName: `Importação Manual - ${tableId}`, // Poderia passar o nome real se viesse no payload
          processed,
          errors: errorsCount,
          status: errorsCount === 0 ? "Sucesso" : processed > 0 ? "Concluído com avisos" : "Falha"
        }
      });
    } catch (logErr) {
      console.error("Erro ao salvar log de importação:", logErr);
    }

    return NextResponse.json({ success: true, processed, errors: errorsCount });
  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

async function processLine(tableId: string, parts: string[]) {
  const dtInicio = parseESocialDate(parts[2]);
  if (!dtInicio) throw new Error("Data de início inválida");

  switch (tableId) {
    case "01":
      // Tabela 01 - Categorias: codigo|descricao|dtInicio|dtFim|grupo|aliqFgts|obriga|aliqFgtsCo|cp|econsignado
      return prisma.esocialTabela01.upsert({
        where: { codigo_dtInicio: { codigo: parts[0], dtInicio: dtInicio } },
        update: { 
          descricao: parts[1], 
          dtFim: parseESocialDate(parts[3]), 
          grupo: parts[4], 
          aliqFgts: parts[5]?.replace(",", "."), 
          obriga: parts[6], 
          aliqFgtsCo: parts[7]?.replace(",", "."), 
          cp: parts[8], 
          econsignado: parts[9] 
        },
        create: { 
          codigo: parts[0], 
          descricao: parts[1], 
          dtInicio: dtInicio, 
          dtFim: parseESocialDate(parts[3]), 
          grupo: parts[4], 
          aliqFgts: parts[5]?.replace(",", "."), 
          obriga: parts[6], 
          aliqFgtsCo: parts[7]?.replace(",", "."), 
          cp: parts[8], 
          econsignado: parts[9] 
        }
      });
    case "03":
      // Tabela 03 - Natureza Rubricas: codigo|nome|dtInicio|dtFim|descricao|inc_excl_emp
      return prisma.esocialTabela03.upsert({
        where: { codigo_dtInicio: { codigo: parts[0], dtInicio: dtInicio } },
        update: { nome: parts[1], dtFim: parseESocialDate(parts[3]), descricao: parts[4], incidenciaExclusivaEmpregado: parts[5] },
        create: { codigo: parts[0], nome: parts[1], dtInicio: dtInicio, dtFim: parseESocialDate(parts[3]), descricao: parts[4], incidenciaExclusivaEmpregado: parts[5] }
      });
    case "05":
      // Tabela 05 - Tipos Logradouro: codigo|descricao|dtInicio|dtFim
      return prisma.esocialTabela05.upsert({
        where: { codigo_dtInicio: { codigo: parts[0], dtInicio: dtInicio } },
        update: { descricao: parts[1], dtFim: parseESocialDate(parts[3]) },
        create: { codigo: parts[0], descricao: parts[1], dtInicio: dtInicio, dtFim: parseESocialDate(parts[3]) }
      });
    case "21":
      return prisma.esocialTabela21.upsert({
        where: { codigo_dtInicio: { codigo: parts[0], dtInicio: dtInicio } },
        update: { descricao: parts[1], dtFim: parseESocialDate(parts[3]) },
        create: { codigo: parts[0], descricao: parts[1], dtInicio: dtInicio, dtFim: parseESocialDate(parts[3]) }
      });
    case "25":
      return prisma.esocialTabela25.upsert({
        where: { codigo_dtInicio: { codigo: parts[0], dtInicio: dtInicio } },
        update: { descricao: parts[1], dtFim: parseESocialDate(parts[3]) },
        create: { codigo: parts[0], descricao: parts[1], dtInicio: dtInicio, dtFim: parseESocialDate(parts[3]) }
      });
    case "54":
      return prisma.esocialTabela54.upsert({
        where: { codRubrica_dtInicio: { codRubrica: parts[0], dtInicio: dtInicio } },
        update: { 
          nomeRubrica: parts[1], dtFim: parseESocialDate(parts[3]),
          natRubrica: parts[4], tipoRubrica: parts[5], codIncCp: parts[6], codIncIrrf: parts[7],
          codIncFgts: parts[8], codIncSind: parts[9], repDsr: parts[10], rep13: parts[11],
          repFerias: parts[12], repResc: parts[13], repAfast: parts[14], fatorRubr: parts[15],
          localAplic: parts[16], domestica: parts[17], se: parts[18], geral: parts[19],
          descricao: parts[20], nota: parts[21], ordRescDom: parts[22], perAdicRub: parts[23],
          ordRemDom: parts[24], repSfDom: parts[25], perFolRes: parts[26], perEditRub: parts[27],
          perExcRub: parts[28], filCatRub: parts[29], grupRendDom: parts[30], codIncCprp: parts[31],
          codIncPisPasep: parts[32], rdConsignado: parts[33]
        },
        create: { 
          codRubrica: parts[0], nomeRubrica: parts[1], dtInicio: dtInicio, dtFim: parseESocialDate(parts[3]),
          natRubrica: parts[4], tipoRubrica: parts[5], codIncCp: parts[6], codIncIrrf: parts[7],
          codIncFgts: parts[8], codIncSind: parts[9], repDsr: parts[10], rep13: parts[11],
          repFerias: parts[12], repResc: parts[13], repAfast: parts[14], fatorRubr: parts[15],
          localAplic: parts[16], domestica: parts[17], se: parts[18], geral: parts[19],
          descricao: parts[20], nota: parts[21], ordRescDom: parts[22], perAdicRub: parts[23],
          ordRemDom: parts[24], repSfDom: parts[25], perFolRes: parts[26], perEditRub: parts[27],
          perExcRub: parts[28], filCatRub: parts[29], grupRendDom: parts[30], codIncCprp: parts[31],
          codIncPisPasep: parts[32], rdConsignado: parts[33]
        }
      });
    case "78":
      return prisma.esocialTabela78.upsert({
        where: { codigo_dtInicio: { codigo: parts[0], dtInicio: dtInicio } },
        update: { descricao: parts[1], dtFim: parseESocialDate(parts[3]) },
        create: { codigo: parts[0], descricao: parts[1], dtInicio: dtInicio, dtFim: parseESocialDate(parts[3]) }
      });
    case "80":
      return prisma.esocialTabela80.upsert({
        where: { codigo_dtInicio: { codigo: parts[0], dtInicio: dtInicio } },
        update: { descricao: parts[1], dtFim: parseESocialDate(parts[3]) },
        create: { codigo: parts[0], descricao: parts[1], dtInicio: dtInicio, dtFim: parseESocialDate(parts[3]) }
      });
    case "02":
      return prisma.esocialTabela02.upsert({
        where: { codigo_dtInicio: { codigo: parts[0], dtInicio: dtInicio } },
        update: { descricao: parts[1], dtFim: parseESocialDate(parts[3]) },
        create: { codigo: parts[0], descricao: parts[1], dtInicio: dtInicio, dtFim: parseESocialDate(parts[3]) }
      });
    case "04":
      return prisma.esocialTabela04.upsert({
        where: {
          codFpas_indCoop_dtInicio_classTrib_codTerc: {
            codFpas: parts[0],
            indCoop: parts[1] || "",
            dtInicio: dtInicio,
            classTrib: parts[4] || "",
            codTerc: parts[5] || ""
          }
        },
        update: {
          dtFim: parseESocialDate(parts[3]),
          aliqTerc: parts[6] ? parts[6].replace(",", ".") : null
        },
        create: {
          codFpas: parts[0],
          indCoop: parts[1] || "",
          dtInicio: dtInicio,
          dtFim: parseESocialDate(parts[3]),
          classTrib: parts[4] || "",
          codTerc: parts[5] || "",
          aliqTerc: parts[6] ? parts[6].replace(",", ".") : null
        }
      });
    case "06":
      return prisma.esocialTabela06.upsert({
        where: { codigo_dtInicio: { codigo: parts[0], dtInicio: dtInicio } },
        update: { descricao: parts[1], dtFim: parseESocialDate(parts[3]) },
        create: { codigo: parts[0], descricao: parts[1], dtInicio: dtInicio, dtFim: parseESocialDate(parts[3]) }
      });
    case "08":
      return prisma.esocialTabela08.upsert({
        where: { codigo_dtInicio: { codigo: parts[0], dtInicio: dtInicio } },
        update: { descricao: parts[1], dtFim: parseESocialDate(parts[3]), tpInsc: parts[4] || null },
        create: { codigo: parts[0], descricao: parts[1], dtInicio: dtInicio, dtFim: parseESocialDate(parts[3]), tpInsc: parts[4] || null }
      });
    case "09":
      return prisma.esocialTabela09.upsert({
        where: { codigo_dtInicio: { codigo: parts[0], dtInicio: dtInicio } },
        update: {
          descricao: parts[1] || null,
          dtFim: parseESocialDate(parts[3]),
          idTpEvento: parts[4] || null,
          tagTpEvent: parts[5] || null,
          identific: parts[6] || null,
          indChDupl: parts[7] || null,
          indExcl: parts[8] || null,
          classTrib: parts[9] || null,
          nClassTri: parts[10] || null,
          obrigWebDom: parts[11] || null,
          obrigLr: parts[12] || null,
          obrigOrgp: parts[13] || null,
          obrigGrupo2: parts[14] || null,
          obrigDefaultPf: parts[15] || null,
          obrigDefaultPj: parts[16] || null,
        },
        create: {
          codigo: parts[0],
          descricao: parts[1] || null,
          dtInicio: dtInicio,
          dtFim: parseESocialDate(parts[3]),
          idTpEvento: parts[4] || null,
          tagTpEvent: parts[5] || null,
          identific: parts[6] || null,
          indChDupl: parts[7] || null,
          indExcl: parts[8] || null,
          classTrib: parts[9] || null,
          nClassTri: parts[10] || null,
          obrigWebDom: parts[11] || null,
          obrigLr: parts[12] || null,
          obrigOrgp: parts[13] || null,
          obrigGrupo2: parts[14] || null,
          obrigDefaultPf: parts[15] || null,
          obrigDefaultPj: parts[16] || null,
        }
      });
    default:
      throw new Error(`Tabela ${tableId} não suportada.`);
  }
}

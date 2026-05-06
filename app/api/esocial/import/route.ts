import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;
    const tableId = formData.get("tableId") as string;

    if (!file || !tableId) {
      return NextResponse.json({ error: "Arquivo e ID da tabela são obrigatórios" }, { status: 400 });
    }

    const content = await file.text();
    const lines = content.split("\n").filter(line => line.trim() !== "");
    
    if (lines.length === 0) {
      return NextResponse.json({ error: "Arquivo vazio" }, { status: 400 });
    }

    const firstLine = lines[0].toLowerCase();
    
    // Validação de cabeçalho (Safety Check)
    const expectedHeaders: Record<string, string[]> = {
      "01": ["codigo", "descricao", "inicio"],
      "03": ["codigo", "nome", "inicio"],
      "05": ["codigo", "descricao", "inicio"],
      "21": ["codigo", "descricao", "inicio"],
      "25": ["codigo", "descricao", "inicio"],
      "54": ["codrubrica", "nomerubrica", "natrubrica"],
      "78": ["codigo", "descricao", "inicio"],
      "80": ["codigo", "descricao", "inicio"]
    };

    const sanitizeHeader = (h: string) => h.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, "");
    
    const expected = expectedHeaders[tableId];
    if (expected) {
      const sanitizedFirstLine = sanitizeHeader(firstLine);
      const match = expected.every(h => sanitizedFirstLine.includes(sanitizeHeader(h)));
      
      // Stricter check: Tabela 01 shouldn't have "nome" and Tabela 03 should have "nome"
      // Normalized search for "nome"
      const hasNome = sanitizedFirstLine.includes("nome");
      const crossMatch = (tableId === "01" && hasNome) || (tableId === "03" && !hasNome);

      if (!match || crossMatch) {
        return NextResponse.json({ 
          error: `O arquivo parece não ser da Tabela ${tableId}. Cabeçalho esperado deve conter campos específicos desta tabela (ex: ${expected.join(", ")}).` 
        }, { status: 400 });
      }
    }

    const dataRows = lines.slice(1); 
    let processed = 0;
    let errors = 0;

    for (const row of dataRows) {
      const columns = row.split("|").length > 1 ? row.split("|").map(col => col.trim()) : row.split(";").map(col => col.trim());
      if (columns.length < 2) continue;

      try {
        // Log individual rows if needed for debugging
        // console.log(`Processando linha da tabela ${tableId}: ${columns.join("|")}`);
        
        switch (tableId) {
          case "01":
            if (columns.length < 5) throw new Error("Colunas insuficientes para Tabela 01");
            await prisma.esocialTabela01.upsert({
              where: { 
                codigo_dtInicio: {
                  codigo: columns[0],
                  dtInicio: parseDate(columns[2], true) as Date
                }
              },
              update: { 
                descricao: columns[1], 
                dtFim: parseDate(columns[3]),
                grupo: columns[4],
                aliqFgts: columns[5] || "",
                obriga: columns[6] || "",
                aliqFgtsCo: columns[7] || "",
                cp: columns[8] || "",
                econsignado: columns[9] || ""
              },
              create: { 
                codigo: columns[0], 
                descricao: columns[1], 
                dtInicio: parseDate(columns[2], true) as Date, 
                dtFim: parseDate(columns[3]),
                grupo: columns[4],
                aliqFgts: columns[5] || "",
                obriga: columns[6] || "",
                aliqFgtsCo: columns[7] || "",
                cp: columns[8] || "",
                econsignado: columns[9] || ""
              }
            });
            break;
          case "03":
            if (columns.length < 3) throw new Error("Colunas insuficientes para Tabela 03");
            await prisma.esocialTabela03.upsert({
              where: { 
                codigo_dtInicio: {
                  codigo: columns[0],
                  dtInicio: parseDate(columns[2], true) as Date
                }
              },
              update: { 
                nome: columns[1], 
                dtFim: parseDate(columns[3]),
                descricao: columns[4] || "",
                incidenciaExclusivaEmpregado: columns[5] || ""
              },
              create: { 
                codigo: columns[0], 
                nome: columns[1], 
                dtInicio: parseDate(columns[2], true) as Date, 
                dtFim: parseDate(columns[3]),
                descricao: columns[4] || "",
                incidenciaExclusivaEmpregado: columns[5] || ""
              }
            });
            break;
          case "05":
            if (columns.length < 3) throw new Error("Colunas insuficientes para Tabela 05");
            await prisma.esocialTabela05.upsert({
              where: { 
                codigo_dtInicio: {
                  codigo: columns[0],
                  dtInicio: parseDate(columns[2], true) as Date
                }
              },
              update: { descricao: columns[1], dtFim: parseDate(columns[3]) },
              create: { codigo: columns[0], descricao: columns[1], dtInicio: parseDate(columns[2], true) as Date, dtFim: parseDate(columns[3]) }
            });
            break;
          case "21":
            if (columns.length < 3) throw new Error("Colunas insuficientes para Tabela 21");
            await prisma.esocialTabela21.upsert({
              where: { 
                codigo_dtInicio: {
                  codigo: columns[0],
                  dtInicio: parseDate(columns[2], true) as Date
                }
              },
              update: { descricao: columns[1], dtFim: parseDate(columns[3]) },
              create: { codigo: columns[0], descricao: columns[1], dtInicio: parseDate(columns[2], true) as Date, dtFim: parseDate(columns[3]) }
            });
            break;
          case "25":
            if (columns.length < 3) throw new Error("Colunas insuficientes para Tabela 25");
            await prisma.esocialTabela25.upsert({
              where: { 
                codigo_dtInicio: {
                  codigo: columns[0],
                  dtInicio: parseDate(columns[2], true) as Date
                }
              },
              update: { descricao: columns[1], dtFim: parseDate(columns[3]) },
              create: { codigo: columns[0], descricao: columns[1], dtInicio: parseDate(columns[2], true) as Date, dtFim: parseDate(columns[3]) }
            });
            break;
          case "54":
            if (columns.length < 10) throw new Error("Colunas insuficientes para Tabela 54");
            await prisma.esocialTabela54.upsert({
              where: {
                codRubrica_dtInicio: {
                  codRubrica: columns[0],
                  dtInicio: parseDate(columns[2], true) as Date
                }
              },
              update: {
                nomeRubrica: columns[1],
                dtFim: parseDate(columns[3]),
                natRubrica: columns[4],
                tipoRubrica: columns[5],
                codIncCp: columns[6],
                codIncIrrf: columns[7],
                codIncFgts: columns[8],
                codIncSind: columns[9],
                repDsr: columns[10],
                rep13: columns[11],
                repFerias: columns[12],
                repResc: columns[13],
                repAfast: columns[14],
                fatorRubr: columns[15],
                localAplic: columns[16],
                domestica: columns[17],
                se: columns[18],
                geral: columns[19],
                descricao: columns[20],
                nota: columns[21],
                ordRescDom: columns[22],
                perAdicRub: columns[23],
                ordRemDom: columns[24],
                repSfDom: columns[25],
                perFolRes: columns[26],
                perEditRub: columns[27],
                perExcRub: columns[28],
                filCatRub: columns[29],
                grupRendDom: columns[30],
                codIncCprp: columns[31],
                codIncPisPasep: columns[32],
                rdConsignado: columns[33],
              },
              create: {
                codRubrica: columns[0],
                nomeRubrica: columns[1],
                dtInicio: parseDate(columns[2], true) as Date,
                dtFim: parseDate(columns[3]),
                natRubrica: columns[4],
                tipoRubrica: columns[5],
                codIncCp: columns[6],
                codIncIrrf: columns[7],
                codIncFgts: columns[8],
                codIncSind: columns[9],
                repDsr: columns[10],
                rep13: columns[11],
                repFerias: columns[12],
                repResc: columns[13],
                repAfast: columns[14],
                fatorRubr: columns[15],
                localAplic: columns[16],
                domestica: columns[17],
                se: columns[18],
                geral: columns[19],
                descricao: columns[20],
                nota: columns[21],
                ordRescDom: columns[22],
                perAdicRub: columns[23],
                ordRemDom: columns[24],
                repSfDom: columns[25],
                perFolRes: columns[26],
                perEditRub: columns[27],
                perExcRub: columns[28],
                filCatRub: columns[29],
                grupRendDom: columns[30],
                codIncCprp: columns[31],
                codIncPisPasep: columns[32],
                rdConsignado: columns[33],
              }
            });
            break;
          case "78":
            if (columns.length < 3) throw new Error("Colunas insuficientes para Tabela 78");
            await prisma.esocialTabela78.upsert({
              where: { 
                codigo_dtInicio: {
                  codigo: columns[0],
                  dtInicio: parseDate(columns[2], true) as Date
                }
              },
              update: { descricao: columns[1], dtFim: parseDate(columns[3]) },
              create: { codigo: columns[0], descricao: columns[1], dtInicio: parseDate(columns[2], true) as Date, dtFim: parseDate(columns[3]) }
            });
            break;
          case "80":
            if (columns.length < 3) throw new Error("Colunas insuficientes para Tabela 80");
            await prisma.esocialTabela80.upsert({
              where: { 
                codigo_dtInicio: {
                  codigo: columns[0],
                  dtInicio: parseDate(columns[2], true) as Date
                }
              },
              update: { descricao: columns[1], dtFim: parseDate(columns[3]) },
              create: { codigo: columns[0], descricao: columns[1], dtInicio: parseDate(columns[2], true) as Date, dtFim: parseDate(columns[3]) }
            });
            break;
        }
        processed++;
      } catch (e) {
        console.error(`Erro ao processar linha da tabela ${tableId}:`, e);
        errors++;
      }
    }

    // Registrar Log
    try {
      await prisma.esocialImportLog.create({
        data: {
          tableId,
          fileName: file.name,
          processed,
          errors,
          status: errors === 0 ? "Sucesso" : processed > 0 ? "Concluído com avisos" : "Falha",
        }
      });
    } catch (logError) {
      console.error("Falha ao salvar log de importação:", logError);
    }

    return NextResponse.json({ success: true, processed, errors });

  } catch (error) {
    console.error("Erro na importação eSocial:", error);
    return NextResponse.json({ error: "Erro interno no servidor" }, { status: 500 });
  }
}

function parseDate(dateStr: string, isRequired: boolean = false): Date | null {
  if (!dateStr || dateStr.toLowerCase() === "null" || dateStr.trim() === "") {
    return isRequired ? new Date(0) : null;
  }
  
  const clean = dateStr.trim();

  // Tentar DD/MM/YYYY
  if (clean.includes("/")) {
    const [d, m, y] = clean.split("/");
    return new Date(`${y}-${m}-${d}`);
  }

  // Tentar DDMMYYYY
  if (clean.length === 8 && /^\d+$/.test(clean)) {
    const d = clean.substring(0, 2);
    const m = clean.substring(2, 4);
    const y = clean.substring(4, 8);
    return new Date(`${y}-${m}-${d}`);
  }
  
  const date = new Date(clean);
  if (isNaN(date.getTime())) {
    return isRequired ? new Date(0) : null;
  }
  return date;
}

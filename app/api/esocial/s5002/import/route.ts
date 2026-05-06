import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { XMLParser } from "fast-xml-parser";
import crypto from "crypto";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const files = formData.getAll("files") as File[];

    if (!files || files.length === 0) {
      return NextResponse.json({ error: "Nenhum arquivo enviado" }, { status: 400 });
    }

    const parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: "@_",
    });

    let processed = 0;
    let errors = 0;

    for (const file of files) {
      try {
        const xmlText = await file.text();
        const hash = crypto.createHash("md5").update(xmlText).digest("hex");

        // Verificar se já foi importado
        const existing = await prisma.s5002.findUnique({ where: { xmlHash: hash } });
        if (existing) continue;

        const jsonObj = parser.parse(xmlText);
        const s5002Data = jsonObj?.eSocial?.evtIrrfTot;

        if (!s5002Data) {
          console.error("Estrutura S-5002 não encontrada no XML");
          errors++;
          continue;
        }

        const ideEmpregador = s5002Data.ideEmpregador;
        const ideTrabalhador = s5002Data.ideTrabalhador;
        const infoIrrf = s5002Data.infoIrrf;
        const perApur = s5002Data.ideEvento?.perApur;

        // 1. Upsert Empresa (CNPJ Raiz)
        const empresa = await prisma.empresa.upsert({
          where: { cnpjRaiz: ideEmpregador.nrInsc.substring(0, 8) },
          update: { cnpjCompleto: ideEmpregador.nrInsc },
          create: { 
            cnpjRaiz: ideEmpregador.nrInsc.substring(0, 8),
            cnpjCompleto: ideEmpregador.nrInsc
          }
        });

        // 2. Upsert Trabalhador
        const trabalhador = await prisma.trabalhador.upsert({
          where: { cpf: ideTrabalhador.cpfTrab },
          update: {
            empresaId: empresa.id
          },
          create: { 
            cpf: ideTrabalhador.cpfTrab,
            nome: "Trabalhador " + ideTrabalhador.cpfTrab.substring(0, 3), // Nome placeholder se não houver
            empresaId: empresa.id
          }
        });

        // 3. Criar Evento S5002
        // Converter perApur (YYYY-MM) para Data
        const [year, month] = perApur.split("-");
        const competencia = new Date(parseInt(year), parseInt(month) - 1, 1);

        const evento = await prisma.s5002.create({
          data: {
            empresaId: empresa.id,
            trabalhadorId: trabalhador.id,
            competencia,
            nrRecibo: s5002Data.ideEvento?.nrRecibo || hash.substring(0, 20),
            xmlHash: hash,
          }
        });

        // 4. Processar dmDev (Demonstrativos)
        const dmDevs = Array.isArray(infoIrrf?.dmDev) ? infoIrrf.dmDev : infoIrrf?.dmDev ? [infoIrrf.dmDev] : [];
        
        for (const dm of dmDevs) {
          const dmRecord = await prisma.s5002DmDev.create({
            data: {
              s5002Id: evento.id,
              ideDmDev: dm.ideDmDev,
              dtPgto: dm.dtPgto ? new Date(dm.dtPgto) : null,
              tpPgto: dm.tpPgto ? parseInt(dm.tpPgto) : null,
            }
          });

          // Processar infoIR dentro de dmDev
          const infoIRs = Array.isArray(dm.infoIR) ? dm.infoIR : dm.infoIR ? [dm.infoIR] : [];
          for (const ir of infoIRs) {
            await prisma.s5002InfoIR.create({
              data: {
                dmDevId: dmRecord.id,
                tpInfoIR: ir.tpInfoIR,
                valor: ir.vlrBase || 0,
              }
            });
          }
        }

        // 5. Processar Totais (CR)
        const totais = Array.isArray(infoIrrf?.totRec) ? infoIrrf.totRec : infoIrrf?.totRec ? [infoIrrf.totRec] : [];
        for (const tot of totais) {
          await prisma.s5002Totais.create({
            data: {
              s5002Id: evento.id,
              codReceita: tot.codReceit,
              vlrRendTrib: tot.vlrRendTrib || 0,
              vlrRendTrib13: tot.vlrRendTrib13 || 0,
              vlrPrevOficial: tot.vlrPrevOficial || 0,
              vlrIrrf: tot.vlrIrrf || 0,
              vlrIsento: tot.vlrIsento || 0,
            }
          });
        }

        // 6. Planos de Saúde e Dependentes (Simplificado p/ este exemplo)
        // Auditoria estaria aqui...
        
        processed++;
      } catch (fileErr) {
        console.error("Erro ao importar arquivo:", file.name, fileErr);
        errors++;
      }
    }

    // Registrar log global de importação XML
    await prisma.esocialImportLog.create({
      data: {
        tableId: "S5002",
        fileName: `Lote-${new Date().getTime()}`,
        processed,
        errors,
        status: errors === 0 ? "Sucesso" : "Concluído com avisos",
      }
    });

    return NextResponse.json({ success: true, processed, errors });
  } catch (error) {
    console.error("Erro na rota de importação S5002:", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}

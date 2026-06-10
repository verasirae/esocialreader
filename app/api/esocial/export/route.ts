import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const tableId = searchParams.get("tableId") || "54";

    let data: any[] = [];
    let csvHeader = "";

    switch (tableId) {
      case "01":
        csvHeader = "CODIGO|DESCRICAO|DTINICIO|DTFIM|GRUPO|ALIQ_FGTS|OBRIGA|ALIQ_FGTS_CO|CP|ECONSIGNADO\n";
        data = await prisma.esocialTabela01.findMany();
        break;
      case "03":
        csvHeader = "CODIGO|NOME|DTINICIO|DTFIM|DESCRICAO|INCIDENCIAEXCLUSIVAEMPREGADO\n";
        data = await prisma.esocialTabela03.findMany();
        break;
      case "05":
        csvHeader = "CODIGO|DESCRICAO|DTINICIO|DTFIM\n";
        data = await prisma.esocialTabela05.findMany();
        break;
      case "21":
        csvHeader = "CODIGO|DESCRICAO|DTINICIO|DTFIM\n";
        data = await prisma.esocialTabela21.findMany();
        break;
      case "25":
        csvHeader = "CODIGO|DESCRICAO|DTINICIO|DTFIM\n";
        data = await prisma.esocialTabela25.findMany();
        break;
      case "54":
        csvHeader = "cod_rubrica|nome_rubrica|dt_inicio|dt_fim|nat_rubrica|tipo_rubrica|cod_inc_cp|cod_inc_irrf|cod_inc_fgts|cod_inc_sind|rep_dsr|rep_13|rep_ferias|rep_resc|rep_afast|fator_rubr|local_aplic|domestica|se|geral|descricao|nota|ord_resc_dom|per_adic_rub|ord_rem_dom|rep_sf_dom|per_fol_res|per_edit_rub|per_exc_rub|fil_cat_rub|grup_rend_dom|cod_inc_cprp|cod_inc_pis_pasep|rd_consignado\n";
        data = await prisma.esocialTabela54.findMany();
        break;
      case "78":
        csvHeader = "CODIGO|DESCRICAO|DTINICIO|DTFIM\n";
        data = await prisma.esocialTabela78.findMany();
        break;
      case "80":
        csvHeader = "CODIGO|DESCRICAO|DTINICIO|DTFIM\n";
        data = await prisma.esocialTabela80.findMany();
        break;
      case "02":
        csvHeader = "CODIGO|DESCRICAO|DTINICIO|DTFIM\n";
        data = await prisma.esocialTabela02.findMany();
        break;
      case "04":
        csvHeader = "CODFPAS|INDCOOP|DtInicio|DtFim|CLASSTRIB|CODTERC|ALIQTERC\n";
        data = await prisma.esocialTabela04.findMany();
        break;
      case "06":
        csvHeader = "CODIGO|DESCRICAO|DTINICIO|DTFIM\n";
        data = await prisma.esocialTabela06.findMany();
        break;
      case "08":
        csvHeader = "CODIGO|DESCRICAO|DTINICIO|DTFIM|TPInsc\n";
        data = await prisma.esocialTabela08.findMany();
        break;
      case "09":
        csvHeader = "CODIGO|DESCRICAO|DTINICIO|DTFIM|IDTPEVENTO|TAGTPEVENT|IDENTIFIC|INDCHDUPL|INDEXCL|CLASSTRIB|NCLASSTRI|OBRIG_WEB_DOM|OBRIG_LR|OBRIG_ORGP|OBRIG_GRUPO_2|OBRIG_DEFAULT_PF|OBRIG_DEFAULT_PJ\n";
        data = await prisma.esocialTabela09.findMany();
        break;
    }

    const csvRows = data.map(row => {
      // Basic escaping and joining
      return Object.values(row)
        .slice(1) // skip ID
        .map(val => {
          if (val instanceof Date) return val.toLocaleDateString('pt-BR');
          return String(val || "");
        })
        .join("|");
    });

    const csvContent = csvHeader + csvRows.join("\n");

    return new NextResponse(csvContent, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename=esocial_tabela_${tableId}.csv`,
      },
    });
  } catch (error) {
    console.error("Erro ao exportar tabela:", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}

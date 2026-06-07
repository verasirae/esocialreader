import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export function formatCNPJ(cnpj: string | null | undefined): string {
  if (!cnpj) return "";
  const clean = cnpj.replace(/\D/g, "");
  if (clean.length !== 14) return cnpj;
  return clean.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5");
}

export function formatCPF(cpf: string | null | undefined): string {
  if (!cpf) return "";
  const clean = cpf.replace(/\D/g, "");
  if (clean.length !== 11) return cpf;
  return clean.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, "$1.$2.$3-$4");
}

export function formatCurrency(value: number | null | undefined): string {
  if (value === null || value === undefined) return "R$ 0,00";
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

export function gerarInformePDF(f: any): jsPDF {
  const doc = new jsPDF("p", "mm", "a4");
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 10;
  const contentWidth = pageWidth - 2 * margin;
  let y = 10;

  const borderColor: [number, number, number] = [0, 0, 0];
  const headerBg: [number, number, number] = [230, 230, 230];
  const white: [number, number, number] = [255, 255, 255];

  // ── Helper: draw header on page ──
  const drawPageHeader = () => {
    // Outer border box for header
    const headerH = 26;
    doc.setDrawColor(...borderColor);
    doc.setLineWidth(0.3);
    doc.rect(margin, y, contentWidth, headerH);

    // Left text block
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(0, 0, 0);
    doc.text("Ministério da Fazenda", margin + 5, y + 6);
    doc.text("Secretaria da Receita Federal do Brasil", margin + 5, y + 11);
    doc.setFontSize(8);
    doc.text("Imposto sobre a Renda da Pessoa Física", margin + 5, y + 16);

    // Vertical line separator
    const sepX = margin + contentWidth * 0.55;
    doc.line(sepX, y, sepX, y + headerH);

    // Right text block
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    const rightX = sepX + (contentWidth * 0.45) / 2;
    doc.text("Comprovante de Rendimentos Pagos e de", rightX, y + 8, { align: "center" });
    doc.text("Imposto sobre a Renda Retido na Fonte", rightX, y + 13, { align: "center" });
    doc.setFont("helvetica", "bold");
    doc.text(`Ano-calendário de ${f?.ano || new Date().getFullYear()}`, rightX, y + 20, { align: "center" });

    y += headerH + 1;

    // Disclaimer box
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.5);
    const disclaimer = "Verifique as condições e o prazo para a apresentação da Declaração do Imposto sobre a Renda da Pessoa Física para este ano-calendário no sítio da Secretaria da Receita Federal do Brasil na Internet, no endereço <www.receita.fazenda.gov.br>.";
    doc.rect(margin, y, contentWidth, 10);
    doc.text(disclaimer, margin + 2, y + 4, { maxWidth: contentWidth - 4 });
    y += 11;
  };

  const sectionHeader = (title: string) => {
    if (y > 265) { doc.addPage(); y = 10; drawPageHeader(); }
    doc.setFillColor(...headerBg);
    doc.setDrawColor(...borderColor);
    doc.setLineWidth(0.3);
    doc.rect(margin, y, contentWidth, 6, "FD");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(0, 0, 0);
    doc.text(title, margin + 2, y + 4.2);
    y += 6;
  };

  const makeFieldTable = (rows: string[][], colWidths?: number[]) => {
    if (y > 265) { doc.addPage(); y = 10; drawPageHeader(); }
    const cw = colWidths || [contentWidth * 0.35, contentWidth * 0.65];
    autoTable(doc, {
      startY: y, margin: { left: margin, right: margin }, head: [], body: rows, theme: "grid",
      styles: { fontSize: 7, cellPadding: { top: 1.5, bottom: 1.5, left: 2, right: 2 }, textColor: [0, 0, 0], lineColor: borderColor, lineWidth: 0.2, fillColor: white },
      columnStyles: Object.fromEntries(cw.map((w, i) => [i, { cellWidth: w }])),
    });
    y = (doc as any).lastAutoTable.finalY;
  };

  const makeValueTable = (rows: [string, string][], headerRight = "Valores em reais") => {
    if (y > 260) { doc.addPage(); y = 10; drawPageHeader(); }
    const descW = contentWidth * 0.82;
    const valW = contentWidth * 0.18;
    autoTable(doc, {
      startY: y, margin: { left: margin, right: margin },
      head: [], body: rows, theme: "grid",
      styles: { fontSize: 7, cellPadding: { top: 1.8, bottom: 1.8, left: 2, right: 2 }, textColor: [0, 0, 0], lineColor: borderColor, lineWidth: 0.2, fillColor: white },
      columnStyles: {
        0: { cellWidth: descW, font: "helvetica" },
        1: { cellWidth: valW, halign: "right", font: "helvetica" },
      }
    });
    y = (doc as any).lastAutoTable.finalY;
  };

  const fmtCur = (v: number | null | undefined) => {
    if (!v) return "0,00";
    return new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(v);
  };

  // PAGE 1
  drawPageHeader();

  // === 1. Fonte Pagadora ===
  sectionHeader("1. Fonte Pagadora Pessoa Jurídica");
  makeFieldTable([
    ["CNPJ", "Nome empresarial"],
    [formatCNPJ(f?.empresa?.cnpjRaiz || f?.empresa?.cnpjCompleto), f?.empresa?.razaoSocial || ""],
  ], [contentWidth * 0.35, contentWidth * 0.65]);

  // === 2. Pessoa Física ===
  sectionHeader("2. Pessoa Física Beneficiária dos Rendimentos");
  makeFieldTable([
    ["CPF", "Nome completo"],
    [formatCPF(f?.trabalhador?.cpf), f?.trabalhador?.nome || ""],
  ], [contentWidth * 0.35, contentWidth * 0.65]);

  // Natureza do rendimento
  autoTable(doc, {
    startY: y, margin: { left: margin, right: margin }, head: [], theme: "grid",
    body: [["Natureza do rendimento", "Rendimento do Trabalho Assalariado"]],
    styles: { fontSize: 7, cellPadding: { top: 1.5, bottom: 1.5, left: 2, right: 2 }, textColor: [0, 0, 0], lineColor: borderColor, lineWidth: 0.2, fillColor: white },
    columnStyles: { 0: { cellWidth: contentWidth * 0.35 }, 1: { cellWidth: contentWidth * 0.65 } },
  });
  y = (doc as any).lastAutoTable.finalY;

  // === 3. Rendimentos Tributáveis ===
  sectionHeader("3. Rendimentos Tributáveis, Deduções e Imposto sobre a Renda Retido na Fonte");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(6.5);
  doc.text("Valores em reais", margin + contentWidth - 2, y + 3, { align: "right" });
  y += 4;

  makeValueTable([
    ["1. Total dos Rendimentos (inclusive férias)", fmtCur(f?.totalRendTrib)],
    ["2. Contribuição Previdenciária Oficial", fmtCur(f?.totalPrevOficial)],
    ["3. Contribuições a entidades de previdência complementar", fmtCur(0)],
    ["4. Pensão Alimentícia", fmtCur(f?.totalPensao)],
    ["5. Imposto sobre a renda retido na fonte (IRRF)", fmtCur(f?.totalIrrf)],
  ]);

  // === 4. Rendimentos Isentos ===
  sectionHeader("4. Rendimentos Isentos e Não Tributáveis");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(6.5);
  doc.text("Valores em reais", margin + contentWidth - 2, y + 3, { align: "right" });
  y += 4;

  const totalIndenResc = f?.totalIndenizacaoRescisao || f?.totalIndenizacaoRescisao === 0 ? f.totalIndenizacaoRescisao : 0;
  const isentosVal = f?.totalRendIsentos || 0;
  const outrosIsentos = Math.max(0, isentosVal - totalIndenResc);

  makeValueTable([
    ["1. Parcela Isenta dos proventos de aposentadoria (65 anos ou mais)", fmtCur(0)],
    ["2. Diárias e Ajudas de Custo", fmtCur(0)],
    ["3. Pensão e proventos de aposentadoria por moléstia grave", fmtCur(0)],
    ["4. Lucro e dividendo, apurados a partir de 1996 pagos ou distribuídos", fmtCur(0)],
    ["5. Valores pagos ao titular ou sócio da microempresa ou empresa de pequeno porte", fmtCur(0)],
    ["6. Indenizações por rescisão de contrato de trabalho, inclusive a título de PDV", fmtCur(totalIndenResc)],
    ["7. Outros Rendimentos Isentos", fmtCur(outrosIsentos)],
  ]);

  // === 5. Tributação Exclusiva ===
  sectionHeader("5. Rendimentos sujeitos à Tributação Exclusiva (rendimento líquido)");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(6.5);
  doc.text("Valores em reais", margin + contentWidth - 2, y + 3, { align: "right" });
  y += 4;

  makeValueTable([
    ["1. Décimo Terceiro Salário", fmtCur(f?.totalRendTrib13)],
    ["2. Imposto sobre a renda retido na fonte sobre 13º salário", fmtCur(0)],
    ["3. Outros", fmtCur(0)],
  ]);

  // === 6. Rendimentos Acumulados ===
  sectionHeader("6. Rendimentos recebidos Acumuladamente - Art. 12-A da Lei n° 7.713, de 1988 (sujeito à tributação exclusiva)");

  // Process/months row
  autoTable(doc, {
    startY: y, margin: { left: margin, right: margin }, head: [], theme: "grid",
    body: [["6.1 Número do processo:   0", "Quantidade de meses:   0"]],
    styles: { fontSize: 7, cellPadding: { top: 2, bottom: 2, left: 2, right: 2 }, textColor: [0, 0, 0], lineColor: borderColor, lineWidth: 0.2, fillColor: white },
    columnStyles: { 0: { cellWidth: contentWidth * 0.5 }, 1: { cellWidth: contentWidth * 0.5 } },
  });
  y = (doc as any).lastAutoTable.finalY;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(6.5);
  doc.text("Valores em reais", margin + contentWidth - 2, y + 3, { align: "right" });
  y += 4;

  makeValueTable([
    ["1. Total dos rendimentos tributáveis (inclusive férias e décimo terceiro salário)", fmtCur(0)],
    ["2. Exclusão: Despesas com a ação judicial", fmtCur(0)],
    ["3. Dedução: Contribuição previdenciária oficial", fmtCur(0)],
    ["4. Dedução: Pensão alimentícia", fmtCur(0)],
    ["5. Imposto sobre a renda retido na fonte", fmtCur(0)],
  ]);

  // PAGE 2 — Sections 7 & 8
  doc.addPage();
  y = 10;
  drawPageHeader();

  // === 7. Informações Complementares ===
  sectionHeader("7. Informações Complementares");

  const section7StartY = y;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.text("Anotações de auditoria e complementaridade fiscal:", margin + 2, y + 4);
  y += 7;

  if (f?.totalPlanoSaude > 0) {
    doc.text(`- Pagamento a plano de saúde corporativo (titular/dependentes) valor anual de: ${formatCurrency(f.totalPlanoSaude)}`, margin + 2, y + 3);
    y += 5;
  }
  if (f?.totalPensao > 0) {
    doc.text(`- Desconto de Pensão Alimentícia anual judicial com valor total de: ${formatCurrency(f.totalPensao)}`, margin + 2, y + 3);
    y += 5;
  }
  
  doc.text("- Comprovante gerado com base nas transmissões oficiais dos eventos de fechamento do eSocial.", margin + 2, y + 3);
  y += 5;

  const section7EndY = Math.max(y + 5, section7StartY + 25);
  doc.setDrawColor(...borderColor);
  doc.setLineWidth(0.3);
  doc.rect(margin, section7StartY, contentWidth, section7EndY - section7StartY);
  y = section7EndY + 2;

  // === 8. Responsável pelas informações ===
  sectionHeader("8. Responsável pelas informações");

  autoTable(doc, {
    startY: y, margin: { left: margin, right: margin }, head: [], theme: "grid",
    body: [
      ["NOME DO EMISSOR / EMPREGADOR", "DATA", "ASSINATURA E CARIMBO"],
      [f?.empresa?.razaoSocial || "", new Date().toLocaleDateString("pt-BR"), ""],
    ],
    styles: { fontSize: 7, cellPadding: { top: 2.5, bottom: 2.5, left: 2, right: 2 }, textColor: [0, 0, 0], lineColor: borderColor, lineWidth: 0.2, fillColor: white },
    columnStyles: {
      0: { cellWidth: contentWidth * 0.4 },
      1: { cellWidth: contentWidth * 0.3 },
      2: { cellWidth: contentWidth * 0.3 },
    },
  });
  y = (doc as any).lastAutoTable.finalY + 4;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.5);
  doc.text("Documento eletrônico em conformidade com as Instruções Normativas RFB em vigor.", margin, y);

  return doc;
}

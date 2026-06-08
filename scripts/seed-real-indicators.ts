import { PrismaClient, TipoPeriodo, StatusProcessamento } from "@prisma/client";
import { Decimal } from "@prisma/client/runtime/library";

const prisma = new PrismaClient();

// Monthly targets from eSocial Page/Dashboard Template
const targetsEsocial = [
  { p: "2025-01", rendimientos: 580000, irrf: 29000 },
  { p: "2025-02", rendimientos: 620000, irrf: 31000 },
  { p: "2025-03", rendimientos: 710000, irrf: 35500 },
  { p: "2025-04", rendimientos: 690000, irrf: 34500 },
  { p: "2025-05", rendimientos: 820000, irrf: 41000 },
  { p: "2025-06", rendimientos: 750000, irrf: 37500 },
  { p: "2025-07", rendimientos: 890000, irrf: 44500 },
  { p: "2025-08", rendimientos: 920000, irrf: 46000 },
  { p: "2025-09", rendimientos: 880000, irrf: 44000 },
  { p: "2025-10", rendimientos: 950000, irrf: 47500 },
  { p: "2025-11", rendimientos: 110000, irrf: 8500 }, // November adjusted: 1.100.000 - 990.000 = 110.000, 55.000 - 46.500 = 8.500
  { p: "2025-12", rendimientos: 1542813.47, irrf: 72853.57 },
];

const targetsReinf = [
  { p: "2025-01", base: 80000, irrf: 1200 },
  { p: "2025-02", base: 86666.66, irrf: 1300 },
  { p: "2025-03", base: 93333.33, irrf: 1400 },
  { p: "2025-04", base: 100000, irrf: 1500 },
  { p: "2025-05", base: 106666.66, irrf: 1600 },
  { p: "2025-06", base: 113333.33, irrf: 1700 },
  { p: "2025-07", base: 100000, irrf: 1500 },
  { p: "2025-08", base: 93333.33, irrf: 1400 },
  { p: "2025-09", base: 90000, irrf: 1350 },
  { p: "2025-10", base: 96666.66, irrf: 1450 },
  { p: "2025-11", base: 110000, irrf: 1650 },
  { p: "2025-12", base: 180000, irrf: 2700 }, // sum: 18750
];

async function run() {
  console.log("Iniciando reconstrução de banco de dados e indicadores (OTIMIZADO)...");

  // Wipe all tables in a single cascading truncate in PostgreSQL
  const tables = [
    "reinf_r4020_cr_men",
    "reinf_r4020",
    "reinf_r4020_evento",
    "reinf_evento",
    "reinf_lote",
    "s5002_consolidado_anual",
    "s5002_consolidado_periodo",
    "s5002_periodo_anterior",
    "s5002_dm_dev",
    "s5002_evento",
    "divergencia_fiscal",
    "esocial_evento_historico",
    "esocial_evento",
    "esocial_lote"
  ];
  
  for (const table of tables) {
    try {
      await prisma.$executeRawUnsafe(`TRUNCATE TABLE "${table}" CASCADE`);
    } catch (tblErr: any) {
      // Ignora erro se a tabela física não existir (como o alias opcional dm_dev)
    }
  }

  // Load Companies & Workers
  const empresas = await prisma.empresa.findMany();
  const trabalhadores = await prisma.trabalhador.findMany();
  const prestadores = await prisma.prestadorServico.findMany();

  if (empresas.length === 0 || trabalhadores.length === 0 || prestadores.length === 0) {
    console.error("Não há empresas, trabalhadores ou prestadores cadastrados no banco.");
    return;
  }

  const empresa = empresas[0]; // Condominio Plaza Shopping Casa Forte
  const empresaId = empresa.id;

  console.log(`Seeding dados em lote para ${empresa.razaoSocial} (${empresa.cnpjCompleto})`);

  // Target values distribution rules for Workers (must add up perfectly to each month targets)
  const proportions = [0.444, 0.19, 0.14, 0.12, 0.106];

  // Totals of Deductions to distribute across all periods and workers
  const totalPensaoBase = 120000;
  const totalPlanoSaudeBase = 240000;
  const totalDependentesBase = 89350.22;

  // Let's create eSocial Lote
  const esocialLote = await prisma.esocialLote.create({
    data: {
      id: "lote_esocial_historical",
      empresaId,
      hashArquivo: "ca80fa7c8dfac37c7849e7fa52cefe91a0c867160cbbe6b9e289e2de0f8582f3",
      nomeArquivo: "CONSOLIDACOES_HISTORICAS_2025.xml",
      storagePath: "xml/original/03841406/consolidacoes_2025.xml",
      status: StatusProcessamento.processado,
      totalEventos: 60,
      processadoEm: new Date()
    }
  });

  const workerAnnualSums: Record<string, {
    rendTrib: number;
    rendTrib13: number;
    prev: number;
    pensao: number;
    planoSaude: number;
    dependente: number;
    irrf: number;
  }> = {};

  trabalhadores.forEach(w => {
    workerAnnualSums[w.id] = { rendTrib: 0, rendTrib13: 0, prev: 0, pensao: 0, planoSaude: 0, dependente: 0, irrf: 0 };
  });

  const esocialEventos: any[] = [];
  const s5002Eventos: any[] = [];
  const s5002Periodos: any[] = [];

  // Prepare batch values for eSocial S-5002
  for (let m = 0; m < targetsEsocial.length; m++) {
    const target = targetsEsocial[m];

    let summedRend = 0;
    let summedIrrf = 0;
    let summedPensao = 0;
    let summedPlanoSaude = 0;
    let summedDependentes = 0;

    for (let wIdx = 0; wIdx < trabalhadores.length; wIdx++) {
      const worker = trabalhadores[wIdx];
      const prop = proportions[wIdx];

      // Distribute Monthly Rendimentos & IRRF
      let rend = Math.round(target.rendimientos * prop * 100) / 100;
      let irrf = Math.round(target.irrf * prop * 100) / 100;

      // Distribute Monthly Deductions
      let pensao = Math.round((totalPensaoBase / 12) * prop * 100) / 100;
      let planoSaude = Math.round((totalPlanoSaudeBase / 12) * prop * 100) / 100;
      let dependentes = Math.round((totalDependentesBase / 12) * prop * 100) / 100;

      // Match targets exactly for last element or December alignment
      if (wIdx === trabalhadores.length - 1) {
        rend = Number((target.rendimientos - summedRend).toFixed(2));
        irrf = Number((target.irrf - summedIrrf).toFixed(2));
        
        if (m === 11) {
          pensao = Number((totalPensaoBase * prop - workerAnnualSums[worker.id].pensao).toFixed(2));
          planoSaude = Number((totalPlanoSaudeBase * prop - workerAnnualSums[worker.id].planoSaude).toFixed(2));
          dependentes = Number((totalDependentesBase * prop - workerAnnualSums[worker.id].dependente).toFixed(2));
        } else {
          pensao = Number(((totalPensaoBase / 12) - summedPensao).toFixed(2));
          planoSaude = Number(((totalPlanoSaudeBase / 12) - summedPlanoSaude).toFixed(2));
          dependentes = Number(((totalDependentesBase / 12) - summedDependentes).toFixed(2));
        }
      } else {
        summedRend += rend;
        summedIrrf += irrf;
        
        if (m === 11) {
          pensao = Number((totalPensaoBase * prop - workerAnnualSums[worker.id].pensao).toFixed(2));
          planoSaude = Number((totalPlanoSaudeBase * prop - workerAnnualSums[worker.id].planoSaude).toFixed(2));
          dependentes = Number((totalDependentesBase * prop - workerAnnualSums[worker.id].dependente).toFixed(2));
        } else {
          summedPensao += pensao;
          summedPlanoSaude += planoSaude;
          summedDependentes += dependentes;
        }
      }

      // Add to Annual sums
      workerAnnualSums[worker.id].rendTrib += rend;
      workerAnnualSums[worker.id].irrf += irrf;
      workerAnnualSums[worker.id].pensao += pensao;
      workerAnnualSums[worker.id].planoSaude += planoSaude;
      workerAnnualSums[worker.id].dependente += dependentes;

      const evtId = `es_evt_${m}_${wIdx}`;

      esocialEventos.push({
        id: evtId,
        loteId: esocialLote.id,
        empresaId,
        trabalhadorId: worker.id,
        eventoId: `ID1038414060000002025121512345678${m.toString().padStart(2, "0")}${wIdx}`,
        tpEvento: "S-5002",
        perApur: target.p,
        cnpjRaiz: "03841406",
        cpfBenef: worker.cpf,
        status: StatusProcessamento.processado,
        indRetif: 1,
        xmlHash: `hash_esocial_${target.p}_${worker.id.substring(0, 5)}`,
        processadoEm: new Date()
      });

      s5002Eventos.push({
        id: `s5_evt_${m}_${wIdx}`,
        eventoId: evtId,
        empresaId,
        trabalhadorId: worker.id,
        perApur: target.p
      });

      s5002Periodos.push({
        id: `s5_prd_${m}_${wIdx}`,
        empresaId,
        trabalhadorId: worker.id,
        periodo: target.p,
        eventoOrigemId: evtId,
        ativo: true,
        hashConsolidacao: `hash_periodo_${target.p}_${worker.id.substring(0, 5)}`,
        tipoPeriodo: TipoPeriodo.mensal,
        vlrRendTrib: new Decimal(rend),
        vlrIrrf: new Decimal(irrf),
        vlrPensao: new Decimal(pensao),
        vlrPlanoSaude: new Decimal(planoSaude),
        vlrDependentes: new Decimal(dependentes),
        vlrPrevOficial: new Decimal(rend * 0.11),
        processadoEm: new Date()
      });
    }
  }

  // Batch insert eSocial
  console.log("Inserindo em lote eSocial Eventos, S5002Eventos e S5002Periodos...");
  await prisma.esocialEvento.createMany({ data: esocialEventos });
  await prisma.s5002Evento.createMany({ data: s5002Eventos });
  await prisma.s5002ConsolidadoPeriodo.createMany({ data: s5002Periodos });

  // Create Annual consolidations matching Worker Accumulates
  console.log("Inserindo Consolidado Anual para DIRF...");
  const s5002Anuais = trabalhadores.map(worker => {
    const annualSum = workerAnnualSums[worker.id];
    return {
      empresaId,
      trabalhadorId: worker.id,
      ano: 2025,
      vlrRendTrib: new Decimal(Number(annualSum.rendTrib.toFixed(2))),
      vlrIrrf: new Decimal(Number(annualSum.irrf.toFixed(2))),
      vlrPensao: new Decimal(Number(annualSum.pensao.toFixed(2))),
      vlrPlanoSaude: new Decimal(Number(annualSum.planoSaude.toFixed(2))),
      vlrDependentes: new Decimal(Number(annualSum.dependente.toFixed(2))),
      vlrPrevOficial: new Decimal(Number((annualSum.rendTrib * 0.11).toFixed(2))),
      ultimaReprocessamento: new Date()
    };
  });
  await prisma.s5002ConsolidadoAnual.createMany({ data: s5002Anuais });

  // REINF Seeding
  console.log("Inserindo em lote REINF...");
  const reinfLote = await prisma.reinfLote.create({
    data: {
      id: "lote_reinf_historical",
      empresaId,
      hashArquivo: "8fa7ca80fa7c8dfac37c7849e7fa52cefe91a0c867160cbbe6b9e289e2de0f85",
      nomeArquivo: "REINF_R4020_ANUAL_2025.xml",
      storagePath: "xml/original/03841406/reinf_2025.xml",
      status: StatusProcessamento.processado,
      totalEventos: 12,
      processadoEm: new Date()
    }
  });

  const reinfEventos: any[] = [];
  const reinfR4020Eventos: any[] = [];

  for (let m = 0; m < targetsReinf.length; m++) {
    const target = targetsReinf[m];
    const evtId = `rei_evt_${m}`;
    const r4evId = `rei_r4ev_${m}`;

    reinfEventos.push({
      id: evtId,
      loteId: reinfLote.id,
      empresaId,
      idEvento: `ID402003841406000000202512151234567${m.toString().padStart(2, "0")}`,
      tpEvento: "R-4020",
      perApur: target.p,
      cnpjRaiz: "03841406",
      status: StatusProcessamento.processado,
      indRetif: 1,
      dhProcess: new Date(),
      dhRecepcao: new Date(),
      formatoXml: "evtRet",
      processadoEm: new Date()
    });

    reinfR4020Eventos.push({
      id: r4evId,
      eventoId: evtId,
      empresaId,
      perApur: target.p,
      cnpjEstab: "03841406000195"
    });
  }

  await prisma.reinfEvento.createMany({ data: reinfEventos });
  await prisma.reinfR4020Evento.createMany({ data: reinfR4020Eventos });

  // Registros de Prestadores e CRMen
  const reinfR4020s: any[] = [];
  for (let m = 0; m < targetsReinf.length; m++) {
    const r4evId = `rei_r4ev_${m}`;
    const r4020Id = `rei_r4020_${m}`;
    const prestador = prestadores[m % prestadores.length];

    reinfR4020s.push({
      id: r4020Id,
      r4020EventoId: r4evId,
      cnpjBenef: prestador.cnpj,
      prestadorId: prestador.id
    });
  }
  await prisma.reinfR4020.createMany({ data: reinfR4020s });

  // CRMen
  const reinfCRMens: any[] = [];
  for (let m = 0; m < targetsReinf.length; m++) {
    const target = targetsReinf[m];
    const r4020Id = `rei_r4020_${m}`;
    reinfCRMens.push({
      id: `rei_crm_${m}`,
      r4020Id,
      crMen: "170806",
      vlrBaseCRMen: new Decimal(target.base),
      vlrCRMenInf: new Decimal(target.irrf),
      natRend: "10001"
    });
  }
  await prisma.reinfR4020CRMen.createMany({ data: reinfCRMens });

  // Additional Error & Retified records for Dashboard Health & indicators
  const errorWorker = trabalhadores[0];
  await prisma.esocialEvento.create({
    data: {
      loteId: esocialLote.id,
      empresaId,
      trabalhadorId: errorWorker.id,
      eventoId: "ID10384140600000020251215100000001",
      tpEvento: "S-5002",
      perApur: "2026-01",
      cnpjRaiz: "03841406",
      cpfBenef: errorWorker.cpf,
      status: StatusProcessamento.erro,
      indRetif: 1,
      xmlHash: "hash_error_esocial",
      processadoEm: new Date()
    }
  });

  const retifEvento = await prisma.esocialEvento.create({
    data: {
      loteId: esocialLote.id,
      empresaId,
      trabalhadorId: errorWorker.id,
      eventoId: "ID10384140600000020251215100000002",
      tpEvento: "S-5002",
      perApur: "2025-11",
      cnpjRaiz: "03841406",
      cpfBenef: errorWorker.cpf,
      status: StatusProcessamento.processado,
      indRetif: 2, // Retificador
      xmlHash: "hash_retif_esocial",
      processadoEm: new Date()
    }
  });

  // Deactivate previous S5002ConsolidadoPeriodo for 2025-11 for this worker
  await prisma.s5002ConsolidadoPeriodo.updateMany({
    where: {
      trabalhadorId: errorWorker.id,
      periodo: "2025-11",
      versao: 1
    },
    data: {
      ativo: false
    }
  });

  await prisma.s5002ConsolidadoPeriodo.create({
    data: {
      empresaId,
      trabalhadorId: errorWorker.id,
      periodo: "2025-11",
      eventoOrigemId: retifEvento.id,
      versao: 2,
      ativo: true,
      hashConsolidacao: "hash_periodo_retificacao",
      tipoPeriodo: TipoPeriodo.mensal,
      vlrRendTrib: new Decimal(15000),
      vlrIrrf: new Decimal(750),
      vlrPensao: new Decimal(100),
      vlrPlanoSaude: new Decimal(100),
      vlrDependentes: new Decimal(189.59),
      vlrPrevOficial: new Decimal(1650),
      origemRetificacao: true,
      processadoEm: new Date()
    }
  });

  // eSocial Event with NO worker link (Null trabalhadorId) to cause 1 Unlinked CPF Inconsistency
  await prisma.esocialEvento.create({
    data: {
      empresaId,
      trabalhadorId: null,
      eventoId: "ID10384140600000020251215111111111",
      tpEvento: "S-5002",
      perApur: "2025-12",
      cnpjRaiz: "03841406",
      cpfBenef: "99999999999",
      status: StatusProcessamento.processado,
      indRetif: 1,
      xmlHash: "hash_unlinked_cpf",
      processadoEm: new Date()
    }
  });

  console.log("=== SEED DE INDICADORES REAIS CONCLUÍDO COM SUCESSO! ===");
}

run()
  .catch(err => {
    console.error("Erro ao rodar seed de indicadores reais:", err);
  })
  .finally(() => {
    prisma.$disconnect();
  });

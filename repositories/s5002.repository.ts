import { prisma } from "@/lib/prisma";
import { S5002ParserResult } from "@/dto/s5002.dto";
import { TipoOperadora } from "@prisma/client";
import { normalizeCpf, normalizeCnpj } from "@/lib/normalization";

export class S5002Repository {
  async saveDetails(eventoId: string, parsedData: S5002ParserResult) {
    try {
      return await prisma.$transaction(async (tx) => {
        // Get core evento
        const esocialEvento = await tx.esocialEvento.findUnique({
          where: { id: eventoId }
        });

        if (!esocialEvento) throw new Error("Evento eSocial não encontrado");

        // 1. Safe cascade deletion of existing detail records for this event to satisfy foreign key constraints
        const oldEvents = await tx.s5002Evento.findMany({
          where: { eventoId: esocialEvento.id },
          select: { id: true }
        });
        const oldEventIds = oldEvents.map(e => e.id);

        if (oldEventIds.length > 0) {
          // A. Delete S5002DmDev sub-records and their children
          const oldDmDevs = await tx.s5002DmDev.findMany({
            where: { s5002EventoId: { in: oldEventIds } },
            select: { id: true }
          });
          const oldDmDevIds = oldDmDevs.map(d => d.id);

          if (oldDmDevIds.length > 0) {
            await tx.s5002InfoIR.deleteMany({
              where: { dmDevId: { in: oldDmDevIds } }
            });
            await tx.s5002TotApurMen.deleteMany({
              where: { dmDevId: { in: oldDmDevIds } }
            });
            await tx.s5002DmDev.deleteMany({
              where: { id: { in: oldDmDevIds } }
            });
          }

          // B. Delete S5002PeriodoAnterior sub-records and their children
          const oldPeriodos = await tx.s5002PeriodoAnterior.findMany({
            where: { s5002EventoId: { in: oldEventIds } },
            select: { id: true }
          });
          const oldPeriodoIds = oldPeriodos.map(p => p.id);

          if (oldPeriodoIds.length > 0) {
            // Delete dependentes
            await tx.s5002PeriodoDependente.deleteMany({
              where: { periodoAnteriorId: { in: oldPeriodoIds } }
            });

            // Delete planosSaude sub-records then planosSaude
            const oldPlanos = await tx.s5002PeriodoPlanoSaude.findMany({
              where: { periodoAnteriorId: { in: oldPeriodoIds } },
              select: { id: true }
            });
            const oldPlanoIds = oldPlanos.map(ps => ps.id);
            if (oldPlanoIds.length > 0) {
              await tx.s5002PeriodoPlanoSaudeDep.deleteMany({
                where: { planoSaudeId: { in: oldPlanoIds } }
              });
              await tx.s5002PeriodoPlanoSaude.deleteMany({
                where: { id: { in: oldPlanoIds } }
              });
            }

            // Delete infoCR sub-records then infoCR
            const oldInfoCRs = await tx.s5002PeriodoInfoCR.findMany({
              where: { periodoAnteriorId: { in: oldPeriodoIds } },
              select: { id: true }
            });
            const oldInfoCRIds = oldInfoCRs.map(icr => icr.id);
            if (oldInfoCRIds.length > 0) {
              await tx.s5002PeriodoDedDep.deleteMany({
                where: { infoCRId: { in: oldInfoCRIds } }
              });
              await tx.s5002PeriodoPensao.deleteMany({
                where: { infoCRId: { in: oldInfoCRIds } }
              });
              await tx.s5002PeriodoInfoCR.deleteMany({
                where: { id: { in: oldInfoCRIds } }
              });
            }

            // Finally delete PeriodoAnterior
            await tx.s5002PeriodoAnterior.deleteMany({
              where: { id: { in: oldPeriodoIds } }
            });
          }

          // C. Delete S5002Evento matching old event IDs
          await tx.s5002Evento.deleteMany({
            where: { id: { in: oldEventIds } }
          });
        }

        // 2. Prepare Demonstrativos using nested create
        const demonstrativosData = parsedData.demonstrativos.map(dm => ({
          ideDmDev: String(dm.ideDmDev),
          perRef: String(dm.perRef),
          dtPgto: dm.dtPgto ? new Date(dm.dtPgto) : null,
          tpPgto: dm.tpPgto,
          codCateg: dm.codCateg ? String(dm.codCateg) : null,
          infoIR: {
            create: dm.infoIR.map(ir => ({
              tpInfoIR: ir.tpInfoIR,
              valor: ir.valor
            }))
          },
          totais: {
            create: (dm.totApurMen || []).map(tot => ({
              crMen: tot.crMen,
              vlrRendTrib: tot.vlrRendTrib,
              vlrRendTrib13: tot.vlrRendTrib13,
              vlrPrevOficial: tot.vlrPrevOficial,
              vlrPrevOficial13: tot.vlrPrevOficial13,
              vlrCRMen: tot.vlrCRMen,
              vlrCR13Men: tot.vlrCR13Men
            }))
          }
        }));

        const s5002 = await tx.s5002Evento.create({
          data: {
            eventoId: esocialEvento.id,
            empresaId: esocialEvento.empresaId,
            trabalhadorId: esocialEvento.trabalhadorId,
            perApur: esocialEvento.perApur,
            demonstrativos: {
              create: demonstrativosData
            }
          }
        }).catch(err => {
          if (err.code === "P2002") {
            console.warn(`[S5002Repository] Concorrência ao criar detalhes S5002 para ${esocialEvento.id}. Tentando re-processamento manual...`);
            // Se falhou por P2002, significa que outro processo criou logo após nosso deleteMany.
            // Poderíamos tentar um find/update aqui, mas skip é razoável já que o outro processo já garantiu os dados.
            throw new Error(`Concorrência detectada: Detalhes já salvos por outro processo.`);
          }
          throw err;
        });

        // 3. Process Information IR Complementary (perAnt, plans, dependents, etc.)
        const blocks = parsedData.infoIRComplemList && parsedData.infoIRComplemList.length > 0
          ? parsedData.infoIRComplemList
          : (parsedData.infoIRComplem ? [parsedData.infoIRComplem] : []);

        const previousPeriods =
          parsedData.indRetif === 2
            ? await tx.s5002PeriodoAnterior.findMany({
                where: {
                  s5002Evento: {
                    evento: {
                      nrRecibo: {
                        in: blocks
                          .flatMap(b => {
                            if (!b.perAnt) return [];
                            return Array.isArray(b.perAnt) ? b.perAnt : [b.perAnt];
                          })
                          .map(p => p.nrRec1210Orig)
                          .filter(Boolean) as string[]
                      }
                    }
                  }
                },
                include: {
                  infoCR: {
                    include: {
                      deducoesDependente: true
                    }
                  }
                }
              })
            : [];

        if (blocks.length > 0) {
          // 3a. Sincronizar DependenteMaster
          if (esocialEvento.trabalhadorId) {
            const allDepsMap = new Map<string, { cpf: string, nome?: string, dtNascto?: string, tpDep?: string, depIRRF?: string }>();
            
            for (const block of blocks) {
              if (block.ideDep) {
                block.ideDep.forEach(d => {
                  const cpf = normalizeCpf(d.cpfDep);
                  allDepsMap.set(cpf, { cpf, nome: d.nomeDep, dtNascto: d.dtNascto, tpDep: d.tpDep, depIRRF: d.depIRRF });
                });
              }

              if (block.infoIrCr) {
                block.infoIrCr.forEach(cr => {
                  cr.dedDepen?.forEach(dd => {
                    const cpf = normalizeCpf(dd.cpfDep);
                    if (!allDepsMap.has(cpf)) allDepsMap.set(cpf, { cpf });
                  });
                  cr.penAlim?.forEach(pa => {
                    const cpf = normalizeCpf(pa.cpfDep);
                    if (!allDepsMap.has(cpf)) allDepsMap.set(cpf, { cpf });
                  });
                });
              }

              if (block.planSaude) {
                block.planSaude.forEach(ps => {
                  ps.infoDepSau?.forEach(ids => {
                    const cpf = normalizeCpf(ids.cpfDep);
                    if (!allDepsMap.has(cpf)) allDepsMap.set(cpf, { cpf });
                  });
                });
              }
            }

            for (const [cpf, info] of Array.from(allDepsMap.entries())) {
              await tx.dependenteMaster.upsert({
                where: {
                  trabalhadorId_cpf: {
                    trabalhadorId: esocialEvento.trabalhadorId,
                    cpf
                  }
                },
                update: {
                  nome: info.nome || "Dependente identificado no S-5002",
                  tpDependente: info.tpDep || undefined,
                  deduzIrrf: info.depIRRF === "S",
                  dtNascimento: info.dtNascto ? new Date(info.dtNascto) : undefined,
                  ativo: true
                },
                create: {
                  trabalhadorId: esocialEvento.trabalhadorId,
                  cpf,
                  nome: info.nome || "Dependente identificado no S-5002",
                  tpDependente: info.tpDep,
                  deduzIrrf: info.depIRRF === "S",
                  dtNascimento: info.dtNascto ? new Date(info.dtNascto) : undefined,
                  ativo: true
                }
              });
            }
          }

          // Busca todos os dependentes masters e operadoras de uma vez para mapeamento síncrono em memória, evitando queries paralelas ou timeouts na transação
          const depMasters = esocialEvento.trabalhadorId
            ? await tx.dependenteMaster.findMany({
                where: { trabalhadorId: esocialEvento.trabalhadorId }
              })
            : [];
          const depMasterMap = new Map(depMasters.map(dm => [dm.cpf, dm.id]));

          const operadoras = await tx.operadoraSaude.findMany();
          const operadorasMap = new Map(operadoras.map(op => [op.cnpj, op.id]));

          // 3b. Criar registros de período anterior para cada bloco individualmente
          for (const block of blocks) {
            const perAnt = block.perAnt;
            const isRetro = !!perAnt;
            const perRefAjuste = isRetro
              ? (Array.isArray(perAnt) ? perAnt[0]?.perRefAjuste : perAnt.perRefAjuste)
              : esocialEvento.perApur;
            const nrRec1210Orig = isRetro
              ? (Array.isArray(perAnt) ? perAnt[0]?.nrRec1210Orig : perAnt.nrRec1210Orig)
              : null;

            // Coleta dependentes
            const resolvedDeps = (block.ideDep || []).map(dep => {
              const cpfDepNorm = normalizeCpf(dep.cpfDep);
              const depMasterId = depMasterMap.get(cpfDepNorm) || null;
              return {
                dependenteId: depMasterId,
                cpfDep: cpfDepNorm,
                depIRRF: dep.depIRRF === "S",
                tpDep: dep.tpDep
              };
            });

            // Coleta InfoIrCr (Deduções e Pensões)
            const resolvedCRs: any[] = (block.infoIrCr || []).map(cr => {
              const deducoesDep = (cr.dedDepen || []).map(dd => {
                const cpfDepNorm = normalizeCpf(dd.cpfDep);
                const depMasterId = depMasterMap.get(cpfDepNorm) || null;
                return {
                  dependenteId: depMasterId,
                  cpfDep: cpfDepNorm,
                  tpRend: dd.tpRend,
                  vlrDedDep: dd.vlrDedDep
                };
              });

              const pensoes = (cr.penAlim || []).map(pa => {
                const cpfDepNorm = normalizeCpf(pa.cpfDep);
                const depMasterId = depMasterMap.get(cpfDepNorm) || null;
                return {
                  dependenteId: depMasterId,
                  cpfDep: cpfDepNorm,
                  tpRend: pa.tpRend,
                  vlrDedPenAlim: pa.vlrDedPenAlim
                };
              });

              return {
                tpCR: String(cr.tpCR),
                deducoesDependente: { create: deducoesDep },
                pensoes: { create: pensoes }
              };
            });

            const deducoesAtuais = new Set(
              resolvedCRs.flatMap(cr =>
                cr.deducoesDependente.create.map(
                  (d: any) => `${d.cpfDep}_${d.tpRend}`
                )
              )
            );

            const originalPeriod = previousPeriods.find(
              p => p.nrRec1210Orig === nrRec1210Orig
            );

            for (const infoCR of originalPeriod?.infoCR || []) {
              for (const ded of infoCR.deducoesDependente) {
                const key = `${ded.cpfDep}_${ded.tpRend}`;
                if (!deducoesAtuais.has(key)) {
                  let resolvedCR = resolvedCRs.find(rcr => rcr.tpCR === String(infoCR.tpCR));
                  if (!resolvedCR) {
                    resolvedCR = {
                      tpCR: String(infoCR.tpCR),
                      deducoesDependente: { create: [] },
                      pensoes: { create: [] }
                    };
                    resolvedCRs.push(resolvedCR);
                  }
                  
                  const cpfDepNorm = normalizeCpf(ded.cpfDep || "");
                  const depMasterId = depMasterMap.get(cpfDepNorm) || null;
                  resolvedCR.deducoesDependente.create.push({
                    dependenteId: depMasterId,
                    cpfDep: cpfDepNorm,
                    tpRend: ded.tpRend,
                    vlrDedDep: 0,
                    excluidoRetificacao: true
                  });
                }
              }
            }

            // Coleta Planos Saude
            const resolvedPlans = (block.planSaude || []).map(plan => {
              const cnpjOperNorm = normalizeCnpj(plan.cnpjOper);
              if (!cnpjOperNorm) return null;

              const operadoraId = operadorasMap.get(cnpjOperNorm) || null;

              const dependentesPlano = (plan.infoDepSau || []).map(ids => {
                const cpfDepNorm = normalizeCpf(ids.cpfDep);
                const depMasterId = depMasterMap.get(cpfDepNorm) || null;
                return {
                  dependenteId: depMasterId,
                  cpfDep: cpfDepNorm,
                  vlrSaudeDep: ids.vlrSaudeDep
                };
              });

              return {
                operadoraId,
                cnpjOper: cnpjOperNorm,
                regANS: plan.regANS,
                vlrSaudeTit: plan.vlrSaudeTit,
                dependentes: { create: dependentesPlano }
              };
            }).filter(p => p !== null) as any[];

            await tx.s5002PeriodoAnterior.create({
              data: {
                s5002EventoId: s5002.id,
                perRefAjuste: String(perRefAjuste),
                nrRec1210Orig: nrRec1210Orig ? String(nrRec1210Orig) : null,
                dependentes: { create: resolvedDeps },
                infoCR: { create: resolvedCRs },
                planosSaude: { create: resolvedPlans }
              }
            });

            if (isRetro && nrRec1210Orig) {
              // Monta lista de deduções ajustadas para comparação
              const adjustedDedDepFlat = (block.infoIrCr || []).flatMap(cr =>
                (cr.dedDepen || []).map(dd => ({
                  cpfDep: normalizeCpf(dd.cpfDep),
                  tpRend: dd.tpRend,
                  vlrDedDep: Number(dd.vlrDedDep)
                }))
              );

              // Monta lista de dependentes com status depIRRF do bloco ajustado
              const adjustedDepsFlat = (block.ideDep || []).map(dep => ({
                cpfDep: normalizeCpf(dep.cpfDep),
                depIRRF: dep.depIRRF === "S",
                tpDep: dep.tpDep
              }));

              await this.syncOriginalEventAnalytics(
                tx,
                nrRec1210Orig,
                String(perRefAjuste),
                adjustedDepsFlat,
                adjustedDedDepFlat
              );
            }
          }
        }

        // 4. Alimentar esocial_download_controle
        if (esocialEvento.cnpjRaiz) {
          await tx.esocialDownloadControle.upsert({
            where: { cnpjRaiz: esocialEvento.cnpjRaiz },
            update: { 
              perApur: esocialEvento.perApur,
              status: "ATIVO"
            },
            create: {
              cnpjRaiz: esocialEvento.cnpjRaiz,
              perApur: esocialEvento.perApur,
              status: "ATIVO",
              totalBaixado: 1
            }
          });
        }

        return s5002;
      }, {
        timeout: 60000 // 60 segundos - aumentado para processamento via after
      });
    } catch (err: any) {
      console.error("[S5002Repository] Erro ao salvar detalhes:", err);
      if (err.code) console.error("[S5002Repository] Codigo Prisma:", err.code);
      if (err.meta) console.error("[S5002Repository] Meta Prisma:", err.meta);
      if (err.name === "PrismaClientValidationError") {
        console.error("[S5002Repository] DETALHE VALIDACAO PRISMA:", err.message);
      }
      throw err;
    }
  }

  /**
   * Sincroniza os registros analíticos dos eventos ORIGINAIS cujos períodos
   * foram ajustados pelo bloco <perAnt> do XML de ajuste/retificação.
   *
   * Regra fiscal:
   *  - O XML de ajuste é SUBSTITUTIVO TOTAL para o período referenciado.
   *  - Dependentes ausentes no bloco ajustado → dep_irrf = false
   *  - Dependentes ausentes em dedDepen → vlr_ded_dep deve ser zerado (ou marcado)
   *  - Dependentes presentes → atualiza com os novos valores
   */
  private async syncOriginalEventAnalytics(
    tx: any,
    nrRec1210Orig: string,
    perRefAjuste: string,
    adjustedDeps: Array<{ cpfDep: string; depIRRF: boolean; tpDep?: string }>,
    adjustedDedDep: Array<{ cpfDep: string; tpRend: string; vlrDedDep: number }>
  ) {
    // 1. Localiza o evento original pelo nrRecibo
    const originalEvento = await tx.esocialEvento.findFirst({
      where: { nrRecibo: nrRec1210Orig },
      include: { s5002: true }
    });

    if (!originalEvento?.s5002) return;

    // 2. Localiza o S5002PeriodoAnterior do evento original para este perRefAjuste
    const originalPeriodos = await tx.s5002PeriodoAnterior.findMany({
      where: {
        s5002EventoId: originalEvento.s5002.id,
        perRefAjuste: perRefAjuste
      },
      include: {
        dependentes: true,
        infoCR: {
          include: {
            deducoesDependente: true
          }
        }
      }
    });

    if (originalPeriodos.length === 0) return;

    // 3. Monta sets de CPFs que continuam deduzindo no ajuste
    const cpfsQueDeduzemNoAjuste = new Set(
      adjustedDedDep.map(d => d.cpfDep)
    );

    const cpfsComDepIRRFNoAjuste = new Set(
      adjustedDeps.filter(d => d.depIRRF).map(d => d.cpfDep)
    );

    for (const periodo of originalPeriodos) {
      // 4. Atualiza dep_irrf nos S5002PeriodoDependente originais
      for (const dep of periodo.dependentes) {
        if (!dep.cpfDep) continue;
        const novoDepIRRF = cpfsComDepIRRFNoAjuste.has(dep.cpfDep);
        if (dep.depIRRF !== novoDepIRRF) {
          await tx.s5002PeriodoDependente.update({
            where: { id: dep.id },
            data: { depIRRF: novoDepIRRF }
          });
        }
      }

      // 5. Atualiza/zera vlr_ded_dep nos S5002PeriodoDedDep originais
      for (const infoCR of periodo.infoCR) {
        for (const ded of infoCR.deducoesDependente) {
          if (!ded.cpfDep) continue;

          const ajuste = adjustedDedDep.find(
            a => a.cpfDep === ded.cpfDep && a.tpRend === ded.tpRend
          );

          if (!ajuste) {
            // CPF saiu completamente do dedDepen → zera
            await tx.s5002PeriodoDedDep.update({
              where: { id: ded.id },
              data: {
                vlrDedDep: 0,
                excluidoRetificacao: true
              }
            });
          } else if (Number(ded.vlrDedDep) !== ajuste.vlrDedDep) {
            // Valor mudou → atualiza
            await tx.s5002PeriodoDedDep.update({
              where: { id: ded.id },
              data: { vlrDedDep: ajuste.vlrDedDep }
            });
          }
        }
      }
    }
  }
}

export const s5002Repository = new S5002Repository();

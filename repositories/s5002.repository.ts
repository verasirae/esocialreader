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

        // 1. Create S5002Evento root (Idempotent: remove old details if re-processing same event)
        await tx.s5002Evento.deleteMany({
          where: { eventoId: esocialEvento.id }
        });

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
        if (parsedData.infoIRComplem) {
          const comp = parsedData.infoIRComplem;
          
          // 3a. Sincronizar DependenteMaster
          if (esocialEvento.trabalhadorId) {
            const allDepsMap = new Map<string, { cpf: string, nome?: string, dtNascto?: string, tpDep?: string, depIRRF?: string }>();
            
            if (comp.ideDep) {
              comp.ideDep.forEach(d => {
                const cpf = normalizeCpf(d.cpfDep);
                allDepsMap.set(cpf, { cpf, nome: d.nomeDep, dtNascto: d.dtNascto, tpDep: d.tpDep, depIRRF: d.depIRRF });
              });
            }

            if (comp.infoIrCr) {
              comp.infoIrCr.forEach(cr => {
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

            if (comp.planSaude) {
              comp.planSaude.forEach(ps => {
                ps.infoDepSau?.forEach(ids => {
                  const cpf = normalizeCpf(ids.cpfDep);
                  if (!allDepsMap.has(cpf)) allDepsMap.set(cpf, { cpf });
                });
              });
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

          // 3b. Criar registros de período anterior para cada perAnt
          const periodosRefs = comp.perAnt && comp.perAnt.length > 0 
            ? comp.perAnt 
            : [{ perRefAjuste: esocialEvento.perApur, nrRec1210Orig: undefined }];

          for (const pRef of periodosRefs) {
            // Coleta dependentes
            const dependentesParaPeriodo = (comp.ideDep || []).map(async dep => {
              const cpfDepNorm = normalizeCpf(dep.cpfDep);
              let depMasterId: string | null = null;
              if (esocialEvento.trabalhadorId) {
                const dm = await tx.dependenteMaster.findUnique({
                  where: { trabalhadorId_cpf: { trabalhadorId: esocialEvento.trabalhadorId, cpf: cpfDepNorm } }
                });
                depMasterId = dm?.id || null;
              }
              return {
                dependenteId: depMasterId,
                cpfDep: cpfDepNorm,
                depIRRF: dep.depIRRF === "S",
                tpDep: dep.tpDep
              };
            });

            // Coleta InfoIrCr
            const infoCRParaPeriodo = (comp.infoIrCr || []).map(async cr => {
              const deducoesDep = await Promise.all((cr.dedDepen || []).map(async dd => {
                const cpfDepNorm = normalizeCpf(dd.cpfDep);
                let depMasterId: string | null = null;
                if (esocialEvento.trabalhadorId) {
                  const dm = await tx.dependenteMaster.findUnique({
                    where: { trabalhadorId_cpf: { trabalhadorId: esocialEvento.trabalhadorId, cpf: cpfDepNorm } }
                  });
                  depMasterId = dm?.id || null;
                }
                return {
                  dependenteId: depMasterId,
                  cpfDep: cpfDepNorm,
                  tpRend: dd.tpRend,
                  vlrDedDep: dd.vlrDedDep
                };
              }));

              const pensoes = await Promise.all((cr.penAlim || []).map(async pa => {
                const cpfDepNorm = normalizeCpf(pa.cpfDep);
                let depMasterId: string | null = null;
                if (esocialEvento.trabalhadorId) {
                  const dm = await tx.dependenteMaster.findUnique({
                    where: { trabalhadorId_cpf: { trabalhadorId: esocialEvento.trabalhadorId, cpf: cpfDepNorm } }
                  });
                  depMasterId = dm?.id || null;
                }
                return {
                  dependenteId: depMasterId,
                  cpfDep: cpfDepNorm,
                  tpRend: pa.tpRend,
                  vlrDedPenAlim: pa.vlrDedPenAlim
                };
              }));

              return {
                tpCR: String(cr.tpCR),
                deducoesDependente: { create: deducoesDep },
                pensoes: { create: pensoes }
              };
            });

            // Coleta Planos Saude
            const planosSaudeParaPeriodo = (comp.planSaude || []).map(async plan => {
              const cnpjOperNorm = normalizeCnpj(plan.cnpjOper);
              if (!cnpjOperNorm) return null;

              const operadora = await tx.operadoraSaude.findUnique({
                where: { cnpj: cnpjOperNorm }
              });

              const dependentesPlano = await Promise.all((plan.infoDepSau || []).map(async ids => {
                const cpfDepNorm = normalizeCpf(ids.cpfDep);
                let depMasterId: string | null = null;
                if (esocialEvento.trabalhadorId) {
                  const dm = await tx.dependenteMaster.findUnique({
                    where: { trabalhadorId_cpf: { trabalhadorId: esocialEvento.trabalhadorId, cpf: cpfDepNorm } }
                  });
                  depMasterId = dm?.id || null;
                }
                return {
                  dependenteId: depMasterId,
                  cpfDep: cpfDepNorm,
                  vlrSaudeDep: ids.vlrSaudeDep
                };
              }));

              return {
                operadoraId: operadora?.id || null,
                cnpjOper: cnpjOperNorm,
                regANS: plan.regANS,
                vlrSaudeTit: plan.vlrSaudeTit,
                dependentes: { create: dependentesPlano }
              };
            });

            const resolvedDeps = await Promise.all(dependentesParaPeriodo);
            const resolvedCRs = await Promise.all(infoCRParaPeriodo);
            const resolvedPlans = (await Promise.all(planosSaudeParaPeriodo)).filter(p => p !== null) as any[];

            await tx.s5002PeriodoAnterior.create({
              data: {
                s5002EventoId: s5002.id,
                perRefAjuste: String(pRef.perRefAjuste),
                nrRec1210Orig: pRef.nrRec1210Orig ? String(pRef.nrRec1210Orig) : null,
                dependentes: { create: resolvedDeps },
                infoCR: { create: resolvedCRs },
                planosSaude: { create: resolvedPlans }
              }
            });
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
}

export const s5002Repository = new S5002Repository();

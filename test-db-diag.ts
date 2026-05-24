import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("=== DIAGNÓSTICO S5002PeriodoInfoCR ===");
  const infoCRs = await prisma.s5002PeriodoInfoCR.findMany({
    include: {
      periodoAnterior: {
        include: {
          s5002Evento: {
            include: {
              trabalhador: true
            }
          }
        }
      }
    }
  });

  console.log(`Encontrados ${infoCRs.length} registros em s5002_periodo_info_cr:`);
  for (const icr of infoCRs) {
    console.log(`- ID: ${icr.id}, tpCR: ${icr.tpCR}, Trabalhador: ${icr.periodoAnterior?.s5002Evento?.trabalhador?.nome}, Competência/PerRefAjuste: ${icr.periodoAnterior?.s5002Evento?.perApur}/${icr.periodoAnterior?.perRefAjuste}`);
  }
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });

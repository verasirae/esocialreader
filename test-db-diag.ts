import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("=== DIAGNÓSTICO DOS CÓDIGOS DE TABELA 80 ===");
  const t80 = await prisma.esocialTabela80.findMany({
    orderBy: { codigo: "asc" }
  });
  console.log(`EsocialTabela80 possui ${t80.length} registros:`);
  t80.forEach(t => {
    console.log(`- ${t.codigo}: ${t.descricao}`);
  });
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });

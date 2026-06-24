import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("=== DIAGNÓSTICO EMPRESAS ===");
  const emps = await prisma.empresa.findMany();
  console.log("JSON Output:", JSON.stringify(emps, null, 2));
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });

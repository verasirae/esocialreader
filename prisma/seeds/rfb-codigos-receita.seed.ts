import { PrismaClient } from "@prisma/client";
import { chunk1 } from "./chunk1";
import { chunk2 } from "./chunk2";
import { chunk3 } from "./chunk3";
import { chunk4 } from "./chunk4";
import { chunk5 } from "./chunk5";
import { chunk6 } from "./chunk6";
import { chunk7 } from "./chunk7";
import { chunk8 } from "./chunk8";

const prisma = new PrismaClient();

async function main() {
  console.log("=== INICIANDO SEED DE CÓDIGOS DE RECEITA RFB (OTIMIZADO) ===");

  console.log("Limpando registros existentes para evitar divergências e dados duplicados/desatualizados...");
  await prisma.rfbCodigoReceita.deleteMany();
  console.log("Tabela limpa com sucesso!");

  const allChunks = [
    { name: "Chunk 1", data: chunk1 },
    { name: "Chunk 2", data: chunk2 },
    { name: "Chunk 3", data: chunk3 },
    { name: "Chunk 4", data: chunk4 },
    { name: "Chunk 5", data: chunk5 },
    { name: "Chunk 6", data: chunk6 },
    { name: "Chunk 7", data: chunk7 },
    { name: "Chunk 8", data: chunk8 },
  ];

  let totalInserted = 0;

  for (const chunk of allChunks) {
    console.log(`\nInserindo ${chunk.name} (${chunk.data.length} registros)...`);
    
    // Converte datas se necessário e passa para createMany com skipDuplicates
    const formattedData = chunk.data.map(item => ({
      ...item,
      dtCriacao: item.dtCriacao ? new Date(item.dtCriacao) : null,
      dtExtincao: item.dtExtincao ? new Date(item.dtExtincao) : null
    }));

    const result = await prisma.rfbCodigoReceita.createMany({
      data: formattedData,
      skipDuplicates: true,
    });

    totalInserted += result.count;
    console.log(`Concluído ! Novos registros adicionados: ${result.count}`);
  }

  // Se quisermos também atualizar registros que mudaram, podemos fazer opcionalmente.
  // Mas como este é o primeiro seed do banco de dados, o skipDuplicates já garantirá a consistência de forma super-rápida.

  const finalCount = await prisma.rfbCodigoReceita.count();
  console.log(`\n=== SEED CONCLUÍDO COM SUCESSO! Total atual no Banco de Dados: ${finalCount} ===`);
}

main()
  .catch((e) => {
    console.error("Erro durante execução do seed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

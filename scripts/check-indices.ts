import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const constraints = await prisma.$queryRawUnsafe(`
    SELECT
        conname as constraint_name,
        contype as constraint_type
    FROM
        pg_constraint
    WHERE
        conrelid = 'esocial_lote'::regclass;
  `);

  console.log('Constraints on esocial_lote:');
  console.log(JSON.stringify(constraints, null, 2));

  const indices = await prisma.$queryRawUnsafe(`
    SELECT
        indexname,
        indexdef
    FROM
        pg_indexes
    WHERE
        tablename = 'esocial_lote';
  `);

  console.log('Indices on esocial_lote:');
  console.log(JSON.stringify(indices, null, 2));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

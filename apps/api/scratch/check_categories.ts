import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const categories = await prisma.category.findMany({
    select: {
      id: true,
      name: true,
      locationId: true
    }
  });

  console.log('Categories:', JSON.stringify(categories, null, 2));

  const names = categories.map(c => c.name);
  const duplicates = names.filter((name, index) => names.indexOf(name) !== index);
  console.log('Duplicate names:', duplicates);
}

main().catch(console.error).finally(() => prisma.$disconnect());

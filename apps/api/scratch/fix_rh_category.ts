import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const course = await prisma.course.update({
    where: { id: '8aa7f67b-7b8b-40e3-a272-97b0a87da3f1' },
    data: {
      categoryId: '16561bc8-5098-4f0d-8685-e9c163ce6474'
    }
  });

  console.log('Fixed course category for:', course.title);
}

main().catch(console.error).finally(() => prisma.$disconnect());

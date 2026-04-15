const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const progress = await prisma.progress.findMany({
    where: { 
      quizAnswers: { not: null }
    },
    take: 5
  });
  console.log('Progress records with quizAnswers:', JSON.stringify(progress, null, 2));
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());

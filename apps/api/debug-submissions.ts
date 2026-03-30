import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const submissions = await prisma.essaySubmission.findMany({
    include: {
      user: { select: { name: true } },
      lesson: { select: { title: true } }
    }
  });
  console.log('--- Submissions Found ---');
  console.log(JSON.stringify(submissions, null, 2));
}

main()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });

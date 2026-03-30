import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const courses = await prisma.course.findMany({
    take: 1
  });
  console.log('--- Courses DB Query Result ---');
  console.log(courses.length ? 'Success' : 'Empty');
}

main()
  .catch(e => {
      console.error('--- DB Error ---');
      console.error(e)
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

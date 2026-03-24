
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function findInstructor() {
    const instructors = await prisma.user.findMany({
        where: { role: 'INSTRUCTOR' },
        select: { id: true, name: true, email: true }
    });
    console.log(JSON.stringify(instructors, null, 2));
    await prisma.$disconnect();
}
findInstructor();


const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function listUsers() {
    const users = await prisma.user.findMany({
        select: { id: true, name: true, role: true, email: true }
    });
    console.log('START_JSON');
    console.log(JSON.stringify(users, null, 2));
    console.log('END_JSON');
    await prisma.$disconnect();
}
listUsers();

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const categories = [
    { name: 'Tecnologia', icon: 'LucideCpu' },
    { name: 'Inglês', icon: 'LucideLanguages' },
    { name: 'Recursos Humanos', icon: 'LucideUsers' },
    { name: 'Finanças', icon: 'LucideWallet' },
    { name: 'Psicologia', icon: 'LucideBrain' },
    { name: 'Direito', icon: 'LucideScale' },
    { name: 'Palestras', icon: 'LucideMic2' },
];

async function main() {
    console.log('Seeding categories...');
    for (const cat of categories) {
        await prisma.category.upsert({
            where: { name: cat.name },
            update: { icon: cat.icon },
            create: { name: cat.name, icon: cat.icon },
        });
    }
    // Seed Users
    const users = [
        { email: 'admin@brilha.com', name: 'Admin User', role: 'ADMIN' },
        { email: 'instrutor@brilha.com', name: 'Instrutor User', role: 'INSTRUCTOR' },
        { email: 'aluno@brilha.com', name: 'Aluno User', role: 'STUDENT' },
    ];

    console.log('Seeding users...');
    for (const u of users) {
        await prisma.user.upsert({
            where: { email: u.email },
            update: {
                role: u.role as any, // Force update the role
            },
            create: {
                email: u.email,
                name: u.name,
                role: u.role as any,
                provider: 'local',
                providerId: `local-${u.email}`,
            },
        });
    }

    console.log('Seeding finished.');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });

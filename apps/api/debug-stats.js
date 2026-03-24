
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function debugStats() {
    try {
        const email = 'thomasmfontes7@gmail.com';
        console.log(`Checking stats for instructor email: ${email}`);

        const instructor = await prisma.user.findUnique({ where: { email } });
        if (!instructor) {
            console.log('Instructor not found!');
            return;
        }
        const instructorId = instructor.id;
        console.log(`Instructor found: ${instructor.name} (${instructor.role}) ID: ${instructorId}`);

        const now = new Date();
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

        const courses = await prisma.course.findMany({ where: { instructorId } });
        console.log(`Courses owned by instructor: ${courses.length}`);
        courses.forEach(c => console.log(` - ${c.title} (${c.id})`));

        const enrollments = await prisma.enrollment.findMany({
            where: { course: { instructorId } },
            include: { course: true, user: true }
        });
        console.log(`Total enrollments found: ${enrollments.length}`);
        enrollments.forEach(e => console.log(` - Student: ${e.user?.name} | Course: ${e.course?.title}`));

        const progress = await prisma.progress.findMany({
            where: { isCompleted: true, lesson: { module: { course: { instructorId } } } },
            include: { lesson: { select: { duration: true, title: true } } }
        });
        console.log(`Total completed lessons found: ${progress.length}`);

        console.log('Running aggregated queries...');
        const [
            totalStudentsCount,
            totalProgressEntries,
            totalCoursesCount,
            lastMonthStudents,
            prevMonthStudents,
            lastMonthProgress,
            prevMonthProgress
        ] = await Promise.all([
            prisma.enrollment.count({ where: { course: { instructorId } } }),
            prisma.progress.findMany({
                where: { isCompleted: true, lesson: { module: { course: { instructorId } } } },
                include: { lesson: { select: { duration: true } } }
            }),
            prisma.course.count({ where: { instructorId } }),
            prisma.enrollment.count({
                where: { course: { instructorId }, enrolledAt: { gte: thirtyDaysAgo } }
            }),
            prisma.enrollment.count({
                where: { course: { instructorId }, enrolledAt: { gte: sixtyDaysAgo, lt: thirtyDaysAgo } }
            }),
            prisma.progress.findMany({
                where: { isCompleted: true, updatedAt: { gte: thirtyDaysAgo }, lesson: { module: { course: { instructorId } } } },
                include: { lesson: { select: { duration: true } } }
            }),
            prisma.progress.findMany({
                where: { isCompleted: true, updatedAt: { gte: sixtyDaysAgo, lt: thirtyDaysAgo }, lesson: { module: { course: { instructorId } } } },
                include: { lesson: { select: { duration: true } } }
            })
        ]);

        console.log('Results:');
        console.log({
            totalStudentsCount,
            totalProgressItems: totalProgressEntries.length,
            totalCoursesCount,
            lastMonthStudents,
            prevMonthStudents,
            lastMonthProgressItems: lastMonthProgress.length,
            prevMonthProgressItems: prevMonthProgress.length
        });

    } catch (error) {
        console.error('Debug failed:', error);
    } finally {
        await prisma.$disconnect();
    }
}

debugStats();

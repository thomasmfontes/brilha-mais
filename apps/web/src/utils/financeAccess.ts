export function isFinanceCategoryName(name?: string | null): boolean {
    const norm = (name || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .trim()
        .toLowerCase();
    return (
        norm.includes('financ') ||
        norm.includes('investiment') ||
        norm.includes('economia')
    );
}

export function canEditFinancePortfolios(user: any): boolean {
    if (!user) return false;
    const role = String(user.role || '').toUpperCase();
    if (role === 'SUPER_ADMIN' || role === 'ADMIN') {
        return true;
    }
    if (role === 'INSTRUCTOR') {
        return (user.assignedAreas || []).some((area: any) =>
            isFinanceCategoryName(area?.category?.name),
        );
    }
    return false;
}

export function hasFinanceAreaAccess(user: any): boolean {
    if (!user) return false;
    const role = String(user.role || '').toUpperCase();

    if (role === 'SUPER_ADMIN' || role === 'ADMIN') {
        return true;
    }

    if (role === 'INSTRUCTOR') {
        return (user.assignedAreas || []).some((area: any) =>
            isFinanceCategoryName(area?.category?.name),
        );
    }

    if (role === 'STUDENT') {
        const hasDirectArea = (user.studentAreas || []).some((area: any) =>
            isFinanceCategoryName(area?.category?.name),
        );
        const hasTurmaArea = (user.turmas || []).some((turma: any) =>
            (turma?.areas || []).some((area: any) =>
                isFinanceCategoryName(area?.category?.name),
            ),
        );
        const hasEnrollment = (user.enrollments || []).some(
            (enrollment: any) =>
                isFinanceCategoryName(enrollment?.course?.category?.name) ||
                isFinanceCategoryName(enrollment?.course?.title),
        );
        return hasDirectArea || hasTurmaArea || hasEnrollment;
    }

    return false;
}

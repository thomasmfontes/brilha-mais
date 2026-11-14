export function isTechCategoryName(name?: string | null): boolean {
  const norm = (name || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();
  return norm.includes('tecnologia');
}

export function hasTechAreaAccess(user: any): boolean {
  if (!user) return false;
  const role = String(user.role || '').toUpperCase();

  if (role === 'SUPER_ADMIN' || role === 'ADMIN') {
    return true;
  }

  if (role === 'INSTRUCTOR') {
    return (user.assignedAreas || []).some((area: any) =>
      isTechCategoryName(area?.category?.name),
    );
  }

  if (role === 'STUDENT') {
    const hasDirectArea = (user.studentAreas || []).some((area: any) =>
      isTechCategoryName(area?.category?.name),
    );
    const hasTurmaArea = (user.turmas || []).some((turma: any) =>
      (turma?.areas || []).some((area: any) =>
        isTechCategoryName(area?.category?.name),
      ),
    );
    return hasDirectArea || hasTurmaArea;
  }

  return false;
}

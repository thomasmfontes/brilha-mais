export type ConditionOperator = 'EQUALS' | 'NOT_EQUALS' | 'INCLUDES';

export interface FormCondition {
  fieldKey: string;
  operator: ConditionOperator;
  value: string;
}

export interface AnswerEntry {
  value: string | string[] | null | undefined;
  otherText?: string;
}

export type FormAvailability = 'OPEN' | 'INACTIVE' | 'NOT_STARTED' | 'CLOSED';

export function slugifyFormTitle(input: string): string {
  const normalized = (input || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
  return normalized || 'formulario';
}

export function evaluateCondition(
  condition: FormCondition | null | undefined,
  answers: Record<string, AnswerEntry>,
): boolean {
  if (!condition || !condition.fieldKey) {
    return true;
  }

  const target = answers?.[condition.fieldKey];
  const rawVal = target?.value;
  const expected = String(condition.value ?? '').trim();

  if (Array.isArray(rawVal)) {
    const normalizedItems = rawVal.map((item) => String(item).trim());
    switch (condition.operator) {
      case 'NOT_EQUALS':
        return !normalizedItems.includes(expected);
      case 'INCLUDES':
      case 'EQUALS':
      default:
        return normalizedItems.includes(expected);
    }
  }

  const current = String(rawVal ?? '').trim();
  switch (condition.operator) {
    case 'NOT_EQUALS':
      return current !== expected;
    case 'INCLUDES':
      return current.toLowerCase().includes(expected.toLowerCase());
    case 'EQUALS':
    default:
      return current === expected;
  }
}

export function isValidCpfDigits(cpfDigits: string): boolean {
  const digits = (cpfDigits || '').replace(/\D/g, '');
  if (digits.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(digits)) return false;

  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += Number(digits[i]) * (10 - i);
  }
  let remainder = (sum * 10) % 11;
  if (remainder === 10) remainder = 0;
  if (remainder !== Number(digits[9])) return false;

  sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += Number(digits[i]) * (11 - i);
  }
  remainder = (sum * 10) % 11;
  if (remainder === 10) remainder = 0;
  return remainder === Number(digits[10]);
}

export function computeFormAvailability(
  form: { isActive: boolean; opensAt?: Date | null; closesAt?: Date | null },
  now: Date = new Date(),
): FormAvailability {
  if (!form.isActive) return 'INACTIVE';
  if (form.opensAt && now < new Date(form.opensAt)) return 'NOT_STARTED';
  if (form.closesAt && now > new Date(form.closesAt)) return 'CLOSED';
  return 'OPEN';
}

export type FormFieldType =
    | 'SHORT_TEXT'
    | 'LONG_TEXT'
    | 'EMAIL'
    | 'PHONE'
    | 'CPF'
    | 'NUMBER'
    | 'DATE'
    | 'SINGLE_CHOICE'
    | 'MULTIPLE_CHOICE'
    | 'SELECT'
    | 'INFO_BLOCK';

export type FormTriageStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export type FormAvailability = 'OPEN' | 'INACTIVE' | 'NOT_STARTED' | 'CLOSED';

export type ConditionOperator = 'EQUALS' | 'NOT_EQUALS' | 'INCLUDES';

export interface FormCondition {
    fieldKey: string;
    operator: ConditionOperator;
    value: string;
}

export interface AnswerEntry {
    value: string | string[];
    otherText?: string;
    labelSnapshot?: string;
}

export interface FormFieldModel {
    id?: string;
    key: string;
    type: FormFieldType;
    label: string;
    description?: string | null;
    placeholder?: string | null;
    order: number;
    required: boolean;
    allowOther?: boolean;
    semanticKey?: string | null;
    options?: string[] | null;
    condition?: FormCondition | null;
    validation?: { layout?: 'half' | 'full'; [key: string]: any } | null;
}

export interface FormSectionModel {
    id?: string;
    tempId?: string;
    title: string;
    description?: string | null;
    order: number;
    condition?: FormCondition | null;
    fields: FormFieldModel[];
}

export interface FormModel {
    id: string;
    slug: string;
    title: string;
    description?: string | null;
    coverImageUrl?: string | null;
    mobileCoverImageUrl?: string | null;
    isActive: boolean;
    opensAt?: string | null;
    closesAt?: string | null;
    showOnLandingPage: boolean;
    enforceSingleSubmission: boolean;
    confirmationTitle?: string | null;
    confirmationMessage?: string | null;
    locationId?: string | null;
    location?: { id: string; name: string; slug?: string } | null;
    availabilityStatus?: FormAvailability;
    sections: FormSectionModel[];
    createdAt?: string;
    updatedAt?: string;
    _count?: {
        sections?: number;
        fields?: number;
        submissions: number;
    };
    statusCounts?: Record<FormTriageStatus, number>;
}

export interface FormSubmissionModel {
    id: string;
    formId: string;
    answers: Record<string, AnswerEntry>;
    respondentName?: string | null;
    respondentEmail?: string | null;
    respondentPhone?: string | null;
    respondentCpf?: string | null;
    status: FormTriageStatus;
    adminNotes?: string | null;
    reviewedBy?: { id: string; name: string | null; email: string } | null;
    reviewedAt?: string | null;
    enrolledUser?: { id: string; name: string | null; email: string } | null;
    enrolledTurma?: { id: string; name: string } | null;
    enrolledAt?: string | null;
    createdAt: string;
    updatedAt: string;
}

export const FIELD_TYPE_LABELS: Record<FormFieldType, string> = {
    SHORT_TEXT: 'Texto curto',
    LONG_TEXT: 'Parágrafo',
    EMAIL: 'E-mail',
    PHONE: 'Telefone',
    CPF: 'CPF',
    NUMBER: 'Número',
    DATE: 'Data',
    SINGLE_CHOICE: 'Múltipla escolha (Radio)',
    MULTIPLE_CHOICE: 'Caixas de seleção (Checkbox)',
    SELECT: 'Lista suspensa (Dropdown)',
    INFO_BLOCK: 'Bloco informativo',
};

export const TRIAGE_STATUS_META: Record<
    FormTriageStatus,
    { label: string; badgeClass: string; dotClass: string }
> = {
    PENDING: {
        label: 'Pendente',
        badgeClass: 'bg-zinc-100 text-zinc-700 border-zinc-200/80',
        dotClass: 'bg-zinc-400',
    },
    APPROVED: {
        label: 'Aprovado',
        badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200/80',
        dotClass: 'bg-emerald-500',
    },
    REJECTED: {
        label: 'Recusado',
        badgeClass: 'bg-red-50 text-red-700 border-red-200/80',
        dotClass: 'bg-red-500',
    },
};

export function evaluateConditionClient(
    condition: FormCondition | null | undefined,
    answers: Record<string, AnswerEntry>,
): boolean {
    if (!condition || !condition.fieldKey) return true;
    const target = answers?.[condition.fieldKey];
    const rawVal = target?.value;
    const expected = String(condition.value ?? '').trim();

    if (Array.isArray(rawVal)) {
        const items = rawVal.map((item) => String(item).trim());
        switch (condition.operator) {
            case 'NOT_EQUALS':
                return !items.includes(expected);
            case 'INCLUDES':
            case 'EQUALS':
            default:
                return items.includes(expected);
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

export function slugifyClient(input: string): string {
    return (input || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 80);
}

export function formatAnswerPreview(entry?: AnswerEntry, type?: FormFieldType): string {
    if (!entry) return '—';
    const val = entry.value;
    const other = entry.otherText?.trim();

    if (Array.isArray(val)) {
        if (val.length === 0) return '—';
        return val
            .map((v) => (v === '__OTHER__' ? (other ? `Outro: ${other}` : 'Outro') : v))
            .join(', ');
    }

    if (val === '__OTHER__') {
        return other ? `Outro: ${other}` : 'Outro';
    }

    if (type === 'DATE' && typeof val === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(val)) {
        const [y, m, d] = val.split('-');
        return `${d}/${m}/${y}`;
    }

    return val ? String(val) : '—';
}

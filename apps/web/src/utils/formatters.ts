/**
 * Formata um número de telefone com a máscara brasileira:
 * - 11 dígitos: (11) 98765-4321
 * - 10 dígitos: (11) 3456-7890
 */
export function formatPhoneMask(value: string | undefined | null): string {
    if (!value) return '';
    let digits = value.replace(/\D/g, '');

    // Remove DDI +55 se colado junto com DDD e número
    if (digits.startsWith('55') && digits.length > 11) {
        digits = digits.slice(2);
    }
    digits = digits.slice(0, 11);

    if (digits.length === 0) return '';
    if (digits.length <= 2) return `(${digits}`;
    if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
    if (digits.length <= 10) {
        return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
    }
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7, 11)}`;
}

/**
 * Formata um CNPJ com a máscara brasileira:
 * 00.000.000/0000-00
 */
export function formatCnpjMask(value: string | undefined | null): string {
    if (!value) return '';
    const digits = value.replace(/\D/g, '').slice(0, 14);
    if (digits.length === 0) return '';
    if (digits.length <= 2) return digits;
    if (digits.length <= 5) return `${digits.slice(0, 2)}.${digits.slice(2)}`;
    if (digits.length <= 8) return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5)}`;
    if (digits.length <= 12) return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8)}`;
    return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12, 14)}`;
}

/**
 * Formata um CPF com a máscara brasileira:
 * 000.000.000-00
 */
export function formatCpfMask(value: string | undefined | null): string {
    if (!value) return '';
    const digits = value.replace(/\D/g, '').slice(0, 11);
    if (digits.length <= 3) return digits;
    if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
    if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
    return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9, 11)}`;
}

/**
 * Valida dígitos verificadores de um CPF brasileiro.
 */
export function isValidCpf(value: string | undefined | null): boolean {
    const digits = (value || '').replace(/\D/g, '');
    if (digits.length !== 11 || /^(\d)\1{10}$/.test(digits)) return false;

    let sum = 0;
    for (let i = 0; i < 9; i++) sum += Number(digits[i]) * (10 - i);
    let rem = (sum * 10) % 11;
    if (rem === 10) rem = 0;
    if (rem !== Number(digits[9])) return false;

    sum = 0;
    for (let i = 0; i < 10; i++) sum += Number(digits[i]) * (11 - i);
    rem = (sum * 10) % 11;
    if (rem === 10) rem = 0;
    return rem === Number(digits[10]);
}


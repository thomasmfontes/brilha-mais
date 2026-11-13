import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
    AlertCircle,
    Calendar,
    ChevronDown,
    Loader2,
    MapPin,
    RotateCcw,
    Send,
} from 'lucide-react';
import {
    AnswerEntry,
    FormFieldModel,
    FormModel,
    evaluateConditionClient,
} from '../../utils/formTypes';
import { formatCpfMask, formatPhoneMask, isValidCpf } from '../../utils/formatters';
import { RichTextRenderer } from './RichTextRenderer';
import { ConfirmModal } from '../ConfirmModal';
import logo from '../../assets/logo.png';

interface DynamicFormRendererProps {
    form: FormModel;
    previewMode?: boolean;
    forceMobileLayout?: boolean;
    onSubmitAnswers: (answers: Record<string, AnswerEntry>) => Promise<void>;
    isSubmitting?: boolean;
    submitError?: string | null;
}

function getMaxWordLength(text: string): number {
    return text
        .trim()
        .split(/\s+/)
        .reduce((max, word) => Math.max(max, word.length), 0);
}

function isHalfWidthField(field: FormFieldModel): boolean {
    if (field.type === 'INFO_BLOCK' || field.type === 'LONG_TEXT') {
        return false;
    }

    if (field.type === 'SINGLE_CHOICE' || field.type === 'MULTIPLE_CHOICE') {
        const opts = Array.isArray(field.options) ? field.options : [];
        const canFitHalf =
            !field.allowOther &&
            opts.length === 2 &&
            opts.every(
                (o) => o.trim().length <= 8 && getMaxWordLength(o) <= 8,
            );
        if (!canFitHalf) return false;
    }

    const layout = field.validation?.layout;
    if (layout === 'half') return true;
    if (layout === 'full') return false;

    if (
        field.type === 'DATE' ||
        field.type === 'PHONE' ||
        field.type === 'EMAIL' ||
        field.type === 'CPF' ||
        field.type === 'NUMBER' ||
        field.type === 'SELECT'
    ) {
        return true;
    }

    if (field.type === 'SHORT_TEXT') {
        const isName =
            field.semanticKey === 'NAME' ||
            field.key.toLowerCase().includes('nome');
        return !isName;
    }

    return false;
}

function computeDesktopHalfColFlags(fields: FormFieldModel[]): boolean[] {
    const flags = fields.map((f) => isHalfWidthField(f));
    let i = 0;
    while (i < flags.length) {
        if (flags[i]) {
            if (i + 1 < flags.length && flags[i + 1]) {
                i += 2;
            } else {
                // Unpaired half-width field expands to full row so no empty 50% gap remains
                flags[i] = false;
                i += 1;
            }
        } else {
            i += 1;
        }
    }
    return flags;
}

function SelectionCheckIndicator({
    checked,
    shape = 'circle',
}: {
    checked: boolean;
    shape?: 'circle' | 'square';
}) {
    const isCircle = shape === 'circle';
    return (
        <span
            className={`relative h-5 w-5 shrink-0 inline-flex items-center justify-center ${
                isCircle ? 'rounded-full' : 'rounded-[6px]'
            } transition-colors duration-150 ${
                checked
                    ? 'animate-check-container'
                    : 'border-[1.5px] border-zinc-300 bg-white group-hover:border-zinc-400'
            }`}
        >
            {checked && (
                <svg
                    viewBox="0 0 20 20"
                    fill="none"
                    className="h-5 w-5 overflow-visible"
                    aria-hidden="true"
                >
                    {isCircle ? (
                        <circle
                            cx="10"
                            cy="10"
                            r="9.25"
                            pathLength={1}
                            className="fill-[#F19B0A] stroke-[#F19B0A] stroke-[1.5] animate-check-ring"
                            style={{
                                transformOrigin: 'center',
                                transform: 'rotate(-90deg)',
                            }}
                        />
                    ) : (
                        <rect
                            x="0.75"
                            y="0.75"
                            width="18.5"
                            height="18.5"
                            rx="5.25"
                            pathLength={1}
                            className="fill-[#F19B0A] stroke-[#F19B0A] stroke-[1.5] animate-check-ring"
                        />
                    )}
                    <path
                        d="M5.75 10.35L8.6 13.2L14.45 7"
                        pathLength={1}
                        stroke="white"
                        strokeWidth={2.15}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="animate-check-stroke"
                    />
                </svg>
            )}
        </span>
    );
}

export interface FormBrandHeaderProps {
    embedded?: boolean;
    linkHome?: boolean;
}

export function FormBrandHeader({
    embedded = false,
    linkHome = true,
}: FormBrandHeaderProps) {
    const brandContent = (
        <>
            <img
                src={logo}
                alt="Brilha Mais"
                className={
                    embedded
                        ? 'h-9 w-auto object-contain shrink-0'
                        : 'h-10 sm:h-11 w-auto object-contain shrink-0'
                }
            />
            <span className="h-4 w-px bg-zinc-200 shrink-0" />
            <div className="min-w-0 leading-tight">
                <p className="text-xs font-semibold text-zinc-900 truncate">
                    Portal de Inscrições
                </p>
                <p className="text-[11px] text-zinc-500 hidden sm:block truncate">
                    Processo seletivo oficial
                </p>
            </div>
        </>
    );

    if (embedded) {
        return (
            <div className="shrink-0 bg-white/95 backdrop-blur-md border-b border-zinc-200/80 px-4 sm:px-6 h-14 flex items-center">
                {linkHome ? (
                    <Link
                        to="/"
                        aria-label="Brilha Mais - Página Inicial"
                        className="inline-flex items-center gap-2.5 min-w-0 hover:opacity-90 transition-opacity"
                    >
                        {brandContent}
                    </Link>
                ) : (
                    <div className="inline-flex items-center gap-2.5 min-w-0">
                        {brandContent}
                    </div>
                )}
            </div>
        );
    }

    return (
        <>
            <header className="fixed top-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-b border-zinc-200/70">
                <div className="max-w-3xl mx-auto px-3.5 sm:px-4 h-16 flex items-center">
                    {linkHome ? (
                        <Link
                            to="/"
                            aria-label="Brilha Mais - Página Inicial"
                            className="inline-flex items-center gap-2.5 min-w-0 hover:opacity-90 transition-opacity"
                        >
                            {brandContent}
                        </Link>
                    ) : (
                        <div className="inline-flex items-center gap-2.5 min-w-0">
                            {brandContent}
                        </div>
                    )}
                </div>
            </header>
            <div className="h-16 shrink-0" aria-hidden="true" />
        </>
    );
}

export function DynamicFormRenderer({
    form,
    previewMode = false,
    forceMobileLayout = false,
    onSubmitAnswers,
    isSubmitting = false,
    submitError = null,
}: DynamicFormRendererProps) {
    const draftKey = `brilha_form_draft_${form.slug}`;

    const [answers, setAnswers] = useState<Record<string, AnswerEntry>>(() => {
        if (previewMode) return {};
        try {
            const raw = localStorage.getItem(draftKey);
            return raw ? JSON.parse(raw) : {};
        } catch {
            return {};
        }
    });

    const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
    const [isClearModalOpen, setIsClearModalOpen] = useState(false);

    useEffect(() => {
        if (previewMode) return;
        try {
            localStorage.setItem(draftKey, JSON.stringify(answers));
        } catch {
            // Ignore storage quota errors
        }
    }, [answers, draftKey, previewMode]);

    const visibleBlocks = useMemo(() => {
        const sortedSections = [...(form.sections || [])].sort(
            (a, b) => a.order - b.order,
        );
        return sortedSections
            .filter((sec) => evaluateConditionClient(sec.condition, answers))
            .map((sec) => {
                const visibleFields = [...(sec.fields || [])]
                    .sort((a, b) => a.order - b.order)
                    .filter((field) =>
                        evaluateConditionClient(field.condition, answers),
                    );
                return {
                    ...sec,
                    visibleFields,
                };
            })
            .filter(
                (sec) =>
                    sec.visibleFields.length > 0 || Boolean(sec.description?.trim()),
            );
    }, [form.sections, answers]);

    const hasAnyRequiredField = useMemo(
        () =>
            visibleBlocks.some((block) =>
                block.visibleFields.some(
                    (f) => f.type !== 'INFO_BLOCK' && f.required,
                ),
            ),
        [visibleBlocks],
    );

    const setFieldValue = (
        fieldKey: string,
        value: string | string[],
        otherText?: string,
    ) => {
        setAnswers((prev) => ({
            ...prev,
            [fieldKey]: {
                value,
                otherText:
                    otherText !== undefined ? otherText : prev[fieldKey]?.otherText,
            },
        }));
        if (fieldErrors[fieldKey]) {
            setFieldErrors((prev) => {
                const next = { ...prev };
                delete next[fieldKey];
                return next;
            });
        }
    };

    const setFieldOtherText = (fieldKey: string, otherText: string) => {
        setAnswers((prev) => ({
            ...prev,
            [fieldKey]: {
                value: prev[fieldKey]?.value ?? '__OTHER__',
                otherText,
            },
        }));
        if (fieldErrors[fieldKey]) {
            setFieldErrors((prev) => {
                const next = { ...prev };
                delete next[fieldKey];
                return next;
            });
        }
    };

    const validateField = (field: FormFieldModel): string | null => {
        if (field.type === 'INFO_BLOCK') return null;

        const entry = answers[field.key] || { value: '' };
        const otherText = (entry.otherText || '').trim();

        if (field.type === 'MULTIPLE_CHOICE') {
            const arr = Array.isArray(entry.value) ? entry.value : [];
            if (field.required && arr.length === 0) {
                return 'Esta pergunta é obrigatória.';
            }
            if (arr.includes('__OTHER__') && !otherText) {
                return 'Por favor, preencha o campo "Outro".';
            }
            return null;
        }

        const strVal = typeof entry.value === 'string' ? entry.value.trim() : '';
        if (field.required && !strVal) {
            return 'Esta pergunta é obrigatória.';
        }
        if (!strVal) return null;

        if (field.type === 'EMAIL') {
            if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(strVal)) {
                return 'Informe um endereço de e-mail válido.';
            }
        } else if (field.type === 'PHONE') {
            const digits = strVal.replace(/\D/g, '');
            if (digits.length < 10 || digits.length > 11) {
                return 'Informe um telefone válido com DDD.';
            }
        } else if (field.type === 'CPF') {
            if (!isValidCpf(strVal)) {
                return 'Informe um CPF válido.';
            }
        } else if (field.type === 'NUMBER') {
            if (Number.isNaN(Number(strVal))) {
                return 'Informe um valor numérico válido.';
            }
        } else if (field.type === 'DATE') {
            if (Number.isNaN(Date.parse(strVal))) {
                return 'Informe uma data válida.';
            }
        } else if (field.type === 'SINGLE_CHOICE') {
            if (strVal === '__OTHER__' && !otherText) {
                return 'Por favor, preencha o campo "Outro".';
            }
        }

        return null;
    };

    const validateAllVisibleFields = (): boolean => {
        const errors: Record<string, string> = {};
        let firstInvalidKey: string | null = null;

        for (const block of visibleBlocks) {
            for (const field of block.visibleFields) {
                const err = validateField(field);
                if (err) {
                    errors[field.key] = err;
                    if (!firstInvalidKey) firstInvalidKey = field.key;
                }
            }
        }

        setFieldErrors(errors);

        if (firstInvalidKey) {
            const el = document.getElementById(`form-field-${firstInvalidKey}`);
            if (el) {
                el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
            return false;
        }
        return true;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (!validateAllVisibleFields()) return;
        await onSubmitAnswers(answers);
    };

    const handleClearForm = () => {
        setAnswers({});
        setFieldErrors({});
        if (!previewMode) {
            try {
                localStorage.removeItem(draftKey);
            } catch {}
        }
        setIsClearModalOpen(false);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
    const resolveMediaUrl = (raw?: string | null) => {
        if (!raw) return null;
        return raw.startsWith('http') ? raw : `${apiUrl}${raw}`;
    };
    const desktopCoverUrl = resolveMediaUrl(form.coverImageUrl);
    const mobileCoverUrl = resolveMediaUrl(form.mobileCoverImageUrl);
    const effectiveDesktopCoverUrl = desktopCoverUrl || mobileCoverUrl;
    const effectiveMobileCoverUrl = mobileCoverUrl || desktopCoverUrl;
    const hasCoverBanner = Boolean(effectiveDesktopCoverUrl || effectiveMobileCoverUrl);

    const pendingErrorCount = Object.keys(fieldErrors).length;
    const controlTextClass = forceMobileLayout ? 'text-base' : 'text-base sm:text-sm';
    const inputHeightClass = forceMobileLayout ? 'h-12' : 'h-12 sm:h-11';
    const optionMinHeightClass = forceMobileLayout
        ? 'min-h-[48px]'
        : 'min-h-[48px] sm:min-h-[42px]';

    return (
        <form
            onSubmit={handleSubmit}
            noValidate
            className={forceMobileLayout ? 'space-y-4' : 'space-y-4 sm:space-y-6'}
        >
            {/* Unified Institutional Brilha Mais Header Card */}
            <header className="bg-white border border-zinc-200/80 rounded-2xl shadow-sm overflow-hidden">
                {hasCoverBanner ? (
                    forceMobileLayout ? (
                        <div className="relative w-full aspect-[16/9] bg-zinc-100 overflow-hidden border-b border-zinc-100">
                            <img
                                src={effectiveMobileCoverUrl!}
                                alt={form.title}
                                className="w-full h-full object-cover"
                            />
                            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/25 via-black/5 to-transparent" />
                        </div>
                    ) : previewMode ? (
                        <div className="relative w-full aspect-[2.25/1] bg-zinc-100 overflow-hidden border-b border-zinc-100">
                            <img
                                src={effectiveDesktopCoverUrl!}
                                alt={form.title}
                                className="w-full h-full object-cover"
                            />
                            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/25 via-black/5 to-transparent" />
                        </div>
                    ) : (
                        <div className="relative w-full aspect-[16/9] sm:aspect-[2.25/1] bg-zinc-100 overflow-hidden border-b border-zinc-100">
                            <picture className="block w-full h-full">
                                <source
                                    media="(min-width: 640px)"
                                    srcSet={effectiveDesktopCoverUrl!}
                                />
                                <img
                                    src={effectiveMobileCoverUrl!}
                                    alt={form.title}
                                    className="w-full h-full object-cover"
                                />
                            </picture>
                            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/25 via-black/5 to-transparent" />
                        </div>
                    )
                ) : (
                    <div
                        className={`${
                            forceMobileLayout
                                ? 'px-5 py-4'
                                : 'px-5 sm:px-8 py-4 sm:py-5'
                        } bg-gradient-to-b from-amber-50/70 to-white border-b border-amber-100/80 flex items-center justify-between gap-3`}
                    >
                        <div className="flex items-center gap-3 min-w-0">
                            <div className="w-11 h-11 rounded-xl bg-white border border-amber-200/80 shadow-sm p-1.5 flex items-center justify-center shrink-0">
                                <img
                                    src={logo}
                                    alt="Brilha Mais"
                                    className="w-full h-full object-contain"
                                />
                            </div>
                            <div className="min-w-0">
                                <p className="text-sm font-semibold text-zinc-900 truncate">
                                    Projeto Brilha Mais
                                </p>
                                <p className="text-xs text-zinc-500 truncate">
                                    Formação humana, ética e profissional
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                <div
                    className={
                        forceMobileLayout
                            ? 'p-5 space-y-3.5'
                            : 'p-5 sm:p-8 space-y-4'
                    }
                >
                    {form.location?.name && (
                        <div className="flex flex-wrap items-center gap-2">
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-zinc-50 border border-zinc-200/80 text-xs font-medium text-zinc-700">
                                <MapPin className="h-3.5 w-3.5 text-[#F19B0A] shrink-0" />
                                <span>Polo {form.location.name}</span>
                            </span>
                        </div>
                    )}

                    <h1
                        className={`${
                            forceMobileLayout
                                ? 'text-[22px] leading-[1.22]'
                                : 'text-[22px] sm:text-3xl leading-[1.22] sm:leading-tight'
                        } font-bold tracking-tight text-zinc-950 break-words`}
                    >
                        {form.title}
                    </h1>

                    {form.description && (
                        <RichTextRenderer
                            content={form.description}
                            className={
                                forceMobileLayout
                                    ? 'text-sm text-zinc-600'
                                    : 'text-sm sm:text-[15px] text-zinc-600'
                            }
                        />
                    )}
                </div>

                {hasAnyRequiredField && (
                    <div
                        className={`${
                            forceMobileLayout ? 'px-5 py-3' : 'px-5 sm:px-8 py-3'
                        } bg-zinc-50/70 border-t border-zinc-100 flex items-center gap-1.5 text-xs text-zinc-500`}
                    >
                        <span className="text-red-500 font-semibold">*</span>
                        <span>Campos obrigatórios para análise vocacional</span>
                    </div>
                )}
            </header>

            {/* Submit Server Error */}
            {submitError && (
                <div className="bg-red-50 border border-red-200/90 rounded-2xl p-4 flex items-start gap-3 text-red-800">
                    <AlertCircle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
                    <div className="text-sm leading-relaxed">{submitError}</div>
                </div>
            )}

            {/* Continuous Thematic Blocks */}
            {visibleBlocks.map((block, blockIdx) => {
                const desktopHalfFlags = forceMobileLayout
                    ? block.visibleFields.map(() => false)
                    : computeDesktopHalfColFlags(block.visibleFields);

                return (
                <section
                    key={block.id || block.tempId || block.title || blockIdx}
                    className={`bg-white border border-zinc-200/80 rounded-2xl shadow-sm overflow-hidden${
                        block.condition?.fieldKey ? ' animate-field-reveal' : ''
                    }`}
                >
                    {/* Block Header */}
                    <div
                        className={`${
                            forceMobileLayout
                                ? 'px-5 py-4'
                                : 'px-5 sm:px-8 py-4 sm:py-5'
                        } border-b border-zinc-100 bg-zinc-50/50 flex items-start gap-3 sm:gap-3.5`}
                    >
                        <span className="w-7 h-7 rounded-lg bg-amber-50 border border-amber-200/70 text-[#D98B08] text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                            {String(blockIdx + 1).padStart(2, '0')}
                        </span>
                        <div className="space-y-1 min-w-0">
                            <h2 className="text-base sm:text-lg font-bold tracking-tight text-zinc-900 break-words">
                                {block.title}
                            </h2>
                            {block.description && (
                                <RichTextRenderer
                                    content={block.description}
                                    className="text-xs sm:text-sm text-zinc-500"
                                />
                            )}
                        </div>
                    </div>

                    {/* Block Fields Grid */}
                    {block.visibleFields.length > 0 && (
                        <div
                            className={
                                forceMobileLayout
                                    ? 'p-5 grid grid-cols-1 gap-y-5'
                                    : 'p-5 sm:p-8 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-5 sm:gap-y-6'
                            }
                        >
                            {block.visibleFields.map((field, fieldIdx) => {
                                const entry = answers[field.key] || { value: '' };
                                const error = fieldErrors[field.key];
                                const options = Array.isArray(field.options)
                                    ? field.options
                                    : [];
                                const isConditional = Boolean(
                                    field.condition?.fieldKey,
                                );
                                const halfCol = desktopHalfFlags[fieldIdx];
                                const colSpanClass = forceMobileLayout
                                    ? 'col-span-1'
                                    : halfCol
                                      ? 'col-span-1'
                                      : 'sm:col-span-2';

                                if (field.type === 'INFO_BLOCK') {
                                    return (
                                        <div
                                            key={field.key}
                                            id={`form-field-${field.key}`}
                                            className={`${forceMobileLayout ? 'col-span-1' : 'sm:col-span-2'} scroll-mt-20 rounded-xl bg-zinc-50/80 border border-zinc-200/70 p-4 space-y-1.5`}
                                        >
                                            <h3 className="text-sm font-semibold text-zinc-900 break-words">
                                                {field.label}
                                            </h3>
                                            {field.description && (
                                                <RichTextRenderer
                                                    content={field.description}
                                                />
                                            )}
                                        </div>
                                    );
                                }

                                const isCompactTwoChoiceMobile =
                                    field.type === 'SINGLE_CHOICE' &&
                                    !field.allowOther &&
                                    options.length === 2 &&
                                    options.every(
                                        (o) =>
                                            o.trim().length <= 10 &&
                                            getMaxWordLength(o) <= 9,
                                    );

                                const isThreeColDesktopSingleChoice =
                                    field.type === 'SINGLE_CHOICE' &&
                                    !forceMobileLayout &&
                                    !halfCol &&
                                    !field.allowOther &&
                                    options.length === 3 &&
                                    options.every(
                                        (o) =>
                                            o.trim().length <= 16 &&
                                            getMaxWordLength(o) <= 13,
                                    );

                                const isTwoColDesktopSingleChoice =
                                    field.type === 'SINGLE_CHOICE' &&
                                    !forceMobileLayout &&
                                    !halfCol &&
                                    !isCompactTwoChoiceMobile &&
                                    !isThreeColDesktopSingleChoice &&
                                    ((options.length === 2 &&
                                        !field.allowOther &&
                                        options.every(
                                            (o) =>
                                                o.trim().length <= 32 &&
                                                getMaxWordLength(o) <= 18,
                                        )) ||
                                        (options.length >= 4 &&
                                            options.every(
                                                (o) =>
                                                    o.trim().length <= 28 &&
                                                    getMaxWordLength(o) <= 16,
                                            )));

                                const isTwoColMultiChoice =
                                    field.type === 'MULTIPLE_CHOICE' &&
                                    !forceMobileLayout &&
                                    !halfCol &&
                                    !field.allowOther &&
                                    options.length === 2 &&
                                    options.every(
                                        (o) =>
                                            o.trim().length <= 32 &&
                                            getMaxWordLength(o) <= 18,
                                    );

                                const wrapperClasses = `${colSpanClass} min-w-0 scroll-mt-20 space-y-2${
                                    isConditional ? ' animate-field-reveal' : ''
                                }`;

                                return (
                                    <div
                                        key={field.key}
                                        id={`form-field-${field.key}`}
                                        className={wrapperClasses}
                                    >
                                        <div className="space-y-1">
                                            <label className="block text-sm font-semibold text-zinc-900 leading-snug break-words">
                                                {field.label}
                                                {field.required && (
                                                    <span className="text-red-500 ml-1">
                                                        *
                                                    </span>
                                                )}
                                            </label>
                                            {field.description && (
                                                <RichTextRenderer
                                                    content={field.description}
                                                    className="text-xs text-zinc-500"
                                                />
                                            )}
                                        </div>

                                        {/* SHORT_TEXT / EMAIL / PHONE / CPF / NUMBER */}
                                        {(field.type === 'SHORT_TEXT' ||
                                            field.type === 'EMAIL' ||
                                            field.type === 'PHONE' ||
                                            field.type === 'CPF' ||
                                            field.type === 'NUMBER') && (
                                            <input
                                                type={
                                                    field.type === 'EMAIL'
                                                        ? 'email'
                                                        : field.type === 'NUMBER'
                                                          ? 'number'
                                                          : field.type === 'PHONE'
                                                            ? 'tel'
                                                            : 'text'
                                                }
                                                inputMode={
                                                    field.type === 'PHONE'
                                                        ? 'tel'
                                                        : field.type === 'CPF'
                                                          ? 'numeric'
                                                          : field.type === 'NUMBER'
                                                            ? 'decimal'
                                                            : field.type === 'EMAIL'
                                                              ? 'email'
                                                              : undefined
                                                }
                                                autoComplete={
                                                    field.type === 'EMAIL'
                                                        ? 'email'
                                                        : field.type === 'PHONE'
                                                          ? 'tel'
                                                          : undefined
                                                }
                                                maxLength={
                                                    field.type === 'CPF'
                                                        ? 14
                                                        : undefined
                                                }
                                                value={
                                                    typeof entry.value === 'string'
                                                        ? entry.value
                                                        : ''
                                                }
                                                onChange={(e) => {
                                                    let next = e.target.value;
                                                    if (field.type === 'PHONE') {
                                                        next = formatPhoneMask(next);
                                                    } else if (field.type === 'CPF') {
                                                        next = formatCpfMask(next);
                                                    }
                                                    setFieldValue(field.key, next);
                                                }}
                                                placeholder={
                                                    field.placeholder ||
                                                    (field.type === 'PHONE'
                                                        ? '(11) 99999-9999'
                                                        : field.type === 'CPF'
                                                          ? '000.000.000-00'
                                                          : 'Sua resposta')
                                                }
                                                className={`w-full min-w-0 max-w-full ${inputHeightClass} rounded-xl border px-3.5 ${controlTextClass} text-zinc-900 placeholder:text-zinc-400 placeholder:truncate focus:bg-white focus:outline-none focus:ring-2 transition-all ${
                                                    error
                                                        ? 'border-red-300 bg-red-50/20 focus:border-red-500 focus:ring-red-500/15'
                                                        : 'border-zinc-200/90 bg-zinc-50/40 focus:border-[#F19B0A] focus:ring-[#F19B0A]/15'
                                                }`}
                                            />
                                        )}

                                        {/* DATE */}
                                        {field.type === 'DATE' && (
                                            <div className="relative w-full min-w-0 max-w-full">
                                                <input
                                                    type="date"
                                                    value={
                                                        typeof entry.value ===
                                                        'string'
                                                            ? entry.value
                                                            : ''
                                                    }
                                                    onChange={(e) =>
                                                        setFieldValue(
                                                            field.key,
                                                            e.target.value,
                                                        )
                                                    }
                                                    className={`form-date-input w-full min-w-0 max-w-full ${inputHeightClass} rounded-xl border pl-3.5 pr-10 ${controlTextClass} text-zinc-900 focus:bg-white focus:outline-none focus:ring-2 transition-all ${
                                                        error
                                                            ? 'border-red-300 bg-red-50/20 focus:border-red-500 focus:ring-red-500/15'
                                                            : 'border-zinc-200/90 bg-zinc-50/40 focus:border-[#F19B0A] focus:ring-[#F19B0A]/15'
                                                    }`}
                                                />
                                                <Calendar className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
                                            </div>
                                        )}

                                        {/* LONG_TEXT */}
                                        {field.type === 'LONG_TEXT' && (
                                            <textarea
                                                rows={4}
                                                value={
                                                    typeof entry.value === 'string'
                                                        ? entry.value
                                                        : ''
                                                }
                                                onChange={(e) =>
                                                    setFieldValue(
                                                        field.key,
                                                        e.target.value,
                                                    )
                                                }
                                                placeholder={
                                                    field.placeholder ||
                                                    'Sua resposta'
                                                }
                                                className={`w-full min-w-0 max-w-full overflow-x-hidden rounded-xl border px-3.5 py-3 sm:py-2.5 ${controlTextClass} text-zinc-900 placeholder:text-zinc-400 focus:bg-white focus:outline-none focus:ring-2 transition-all resize-y ${
                                                    error
                                                        ? 'border-red-300 bg-red-50/20 focus:border-red-500 focus:ring-red-500/15'
                                                        : 'border-zinc-200/90 bg-zinc-50/40 focus:border-[#F19B0A] focus:ring-[#F19B0A]/15'
                                                }`}
                                            />
                                        )}

                                        {/* SELECT (Dropdown) */}
                                        {field.type === 'SELECT' && (
                                            <div className="relative w-full min-w-0 max-w-full">
                                                <select
                                                    value={
                                                        typeof entry.value ===
                                                        'string'
                                                            ? entry.value
                                                            : ''
                                                    }
                                                    onChange={(e) =>
                                                        setFieldValue(
                                                            field.key,
                                                            e.target.value,
                                                        )
                                                    }
                                                    className={`w-full min-w-0 max-w-full appearance-none ${inputHeightClass} rounded-xl border pl-3.5 pr-10 ${controlTextClass} text-zinc-900 focus:bg-white focus:outline-none focus:ring-2 transition-all ${
                                                        error
                                                            ? 'border-red-300 bg-red-50/20 focus:border-red-500 focus:ring-red-500/15'
                                                            : 'border-zinc-200/90 bg-zinc-50/40 focus:border-[#F19B0A] focus:ring-[#F19B0A]/15'
                                                    }`}
                                                >
                                                    <option value="">
                                                        Selecione uma opção...
                                                    </option>
                                                    {options.map((opt) => (
                                                        <option
                                                            key={opt}
                                                            value={opt}
                                                        >
                                                            {opt}
                                                        </option>
                                                    ))}
                                                </select>
                                                <ChevronDown className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
                                            </div>
                                        )}

                                        {/* SINGLE_CHOICE */}
                                        {field.type === 'SINGLE_CHOICE' && (
                                            <div
                                                className={
                                                    isCompactTwoChoiceMobile
                                                        ? 'grid grid-cols-2 gap-2.5 pt-0.5'
                                                        : isThreeColDesktopSingleChoice
                                                          ? 'grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-0.5'
                                                          : isTwoColDesktopSingleChoice
                                                            ? 'grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-0.5'
                                                            : 'space-y-2.5 pt-0.5'
                                                }
                                            >
                                                {options.map((opt) => {
                                                    const selected =
                                                        entry.value === opt;
                                                    return (
                                                        <label
                                                            key={opt}
                                                            className={`group flex items-center gap-3 px-3.5 py-2.5 ${optionMinHeightClass} rounded-xl border cursor-pointer transition-all ${
                                                                selected
                                                                    ? 'border-[#F19B0A] bg-amber-50/60 text-zinc-950 shadow-sm'
                                                                    : error
                                                                      ? 'border-red-200 bg-white hover:bg-zinc-50/70 text-zinc-700'
                                                                      : 'border-zinc-200/80 bg-zinc-50/30 hover:border-zinc-300 hover:bg-zinc-50/80 text-zinc-700'
                                                            }`}
                                                        >
                                                            <input
                                                                type="radio"
                                                                name={`field-${field.key}`}
                                                                value={opt}
                                                                checked={selected}
                                                                onChange={() =>
                                                                    setFieldValue(
                                                                        field.key,
                                                                        opt,
                                                                        '',
                                                                    )
                                                                }
                                                                className="sr-only"
                                                            />
                                                            <SelectionCheckIndicator
                                                                checked={selected}
                                                                shape="circle"
                                                            />
                                                            <span className="text-sm font-medium leading-snug flex-1 whitespace-normal">
                                                                {opt}
                                                            </span>
                                                        </label>
                                                    );
                                                })}

                                                {field.allowOther && (
                                                    <div
                                                        className={`rounded-xl border transition-all ${
                                                            isTwoColDesktopSingleChoice
                                                                ? 'sm:col-span-2'
                                                                : ''
                                                        } ${
                                                            entry.value ===
                                                            '__OTHER__'
                                                                ? 'border-[#F19B0A] bg-amber-50/60'
                                                                : error
                                                                  ? 'border-red-200 bg-white'
                                                                  : 'border-zinc-200/80 bg-zinc-50/30 hover:border-zinc-300'
                                                        }`}
                                                    >
                                                        <label
                                                            className={`group flex items-center gap-3 px-3.5 py-2.5 ${optionMinHeightClass} cursor-pointer`}
                                                        >
                                                            <input
                                                                type="radio"
                                                                name={`field-${field.key}`}
                                                                value="__OTHER__"
                                                                checked={
                                                                    entry.value ===
                                                                    '__OTHER__'
                                                                }
                                                                onChange={() =>
                                                                    setFieldValue(
                                                                        field.key,
                                                                        '__OTHER__',
                                                                    )
                                                                }
                                                                className="sr-only"
                                                            />
                                                            <SelectionCheckIndicator
                                                                checked={
                                                                    entry.value ===
                                                                    '__OTHER__'
                                                                }
                                                                shape="circle"
                                                            />
                                                            <span className="text-sm font-medium text-zinc-700 shrink-0">
                                                                Outro:
                                                            </span>
                                                            <input
                                                                type="text"
                                                                value={
                                                                    entry.otherText ||
                                                                    ''
                                                                }
                                                                onFocus={() => {
                                                                    if (
                                                                        entry.value !==
                                                                        '__OTHER__'
                                                                    ) {
                                                                        setFieldValue(
                                                                            field.key,
                                                                            '__OTHER__',
                                                                        );
                                                                    }
                                                                }}
                                                                onChange={(e) => {
                                                                    if (
                                                                        entry.value !==
                                                                        '__OTHER__'
                                                                    ) {
                                                                        setFieldValue(
                                                                            field.key,
                                                                            '__OTHER__',
                                                                            e.target
                                                                                .value,
                                                                        );
                                                                    } else {
                                                                        setFieldOtherText(
                                                                            field.key,
                                                                            e.target
                                                                                .value,
                                                                        );
                                                                    }
                                                                }}
                                                                placeholder="Especifique aqui..."
                                                                className={`flex-1 min-w-0 bg-transparent border-b border-zinc-300 focus:border-[#F19B0A] focus:outline-none ${controlTextClass} text-zinc-900 py-0.5 px-1`}
                                                            />
                                                        </label>
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        {/* MULTIPLE_CHOICE (Checkbox) */}
                                        {field.type === 'MULTIPLE_CHOICE' && (
                                            <div
                                                className={
                                                    isTwoColMultiChoice
                                                        ? 'grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-0.5'
                                                        : 'space-y-2.5 pt-0.5'
                                                }
                                            >
                                                {options.map((opt) => {
                                                    const arr = Array.isArray(
                                                        entry.value,
                                                    )
                                                        ? entry.value
                                                        : [];
                                                    const checked =
                                                        arr.includes(opt);
                                                    return (
                                                        <label
                                                            key={opt}
                                                            className={`group flex items-center gap-3 px-3.5 py-2.5 ${optionMinHeightClass} rounded-xl border cursor-pointer transition-all ${
                                                                checked
                                                                    ? 'border-[#F19B0A] bg-amber-50/60 text-zinc-950 shadow-sm'
                                                                    : error
                                                                      ? 'border-red-200 bg-white hover:bg-zinc-50/70 text-zinc-700'
                                                                      : 'border-zinc-200/80 bg-zinc-50/30 hover:border-zinc-300 hover:bg-zinc-50/80 text-zinc-700'
                                                            }`}
                                                        >
                                                            <input
                                                                type="checkbox"
                                                                checked={checked}
                                                                onChange={() => {
                                                                    const next =
                                                                        checked
                                                                            ? arr.filter(
                                                                                  (
                                                                                      v,
                                                                                  ) =>
                                                                                      v !==
                                                                                      opt,
                                                                              )
                                                                            : [
                                                                                  ...arr,
                                                                                  opt,
                                                                              ];
                                                                    setFieldValue(
                                                                        field.key,
                                                                        next,
                                                                    );
                                                                }}
                                                                className="sr-only"
                                                            />
                                                            <SelectionCheckIndicator
                                                                checked={checked}
                                                                shape="square"
                                                            />
                                                            <span className="text-sm font-medium leading-snug flex-1 whitespace-normal">
                                                                {opt}
                                                            </span>
                                                        </label>
                                                    );
                                                })}

                                                {field.allowOther &&
                                                    (() => {
                                                        const arr = Array.isArray(
                                                            entry.value,
                                                        )
                                                            ? entry.value
                                                            : [];
                                                        const otherChecked =
                                                            arr.includes(
                                                                '__OTHER__',
                                                            );
                                                        return (
                                                            <div
                                                                className={`rounded-xl border transition-all ${
                                                                    otherChecked
                                                                        ? 'border-[#F19B0A] bg-amber-50/60'
                                                                        : error
                                                                          ? 'border-red-200 bg-white'
                                                                          : 'border-zinc-200/80 bg-zinc-50/30 hover:border-zinc-300'
                                                                }`}
                                                            >
                                                                <label
                                                                    className={`group flex items-center gap-3 px-3.5 py-2.5 ${optionMinHeightClass} cursor-pointer`}
                                                                >
                                                                    <input
                                                                        type="checkbox"
                                                                        checked={
                                                                            otherChecked
                                                                        }
                                                                        onChange={() => {
                                                                            const next =
                                                                                otherChecked
                                                                                    ? arr.filter(
                                                                                          (
                                                                                              v,
                                                                                          ) =>
                                                                                              v !==
                                                                                              '__OTHER__',
                                                                                      )
                                                                                    : [
                                                                                          ...arr,
                                                                                          '__OTHER__',
                                                                                      ];
                                                                            setFieldValue(
                                                                                field.key,
                                                                                next,
                                                                            );
                                                                        }}
                                                                        className="sr-only"
                                                                    />
                                                                    <SelectionCheckIndicator
                                                                        checked={
                                                                            otherChecked
                                                                        }
                                                                        shape="square"
                                                                    />
                                                                    <span className="text-sm font-medium text-zinc-700 shrink-0">
                                                                        Outro:
                                                                    </span>
                                                                    <input
                                                                        type="text"
                                                                        value={
                                                                            entry.otherText ||
                                                                            ''
                                                                        }
                                                                        onFocus={() => {
                                                                            if (
                                                                                !otherChecked
                                                                            ) {
                                                                                setFieldValue(
                                                                                    field.key,
                                                                                    [
                                                                                        ...arr,
                                                                                        '__OTHER__',
                                                                                    ],
                                                                                );
                                                                            }
                                                                        }}
                                                                        onChange={(
                                                                            e,
                                                                        ) => {
                                                                            if (
                                                                                !otherChecked
                                                                            ) {
                                                                                setFieldValue(
                                                                                    field.key,
                                                                                    [
                                                                                        ...arr,
                                                                                        '__OTHER__',
                                                                                    ],
                                                                                    e
                                                                                        .target
                                                                                        .value,
                                                                                );
                                                                            } else {
                                                                                setFieldOtherText(
                                                                                    field.key,
                                                                                    e
                                                                                        .target
                                                                                        .value,
                                                                                );
                                                                            }
                                                                        }}
                                                                        placeholder="Especifique aqui..."
                                                                        className={`flex-1 min-w-0 bg-transparent border-b border-zinc-300 focus:border-[#F19B0A] focus:outline-none ${controlTextClass} text-zinc-900 py-0.5 px-1`}
                                                                    />
                                                                </label>
                                                            </div>
                                                        );
                                                    })()}
                                            </div>
                                        )}

                                        {error && (
                                            <p className="flex items-center gap-1.5 text-xs font-medium text-red-600 pt-0.5">
                                                <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                                                <span>{error}</span>
                                            </p>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </section>
                );
            })}

            {/* Single-Page Submit Bar */}
            <div className="bg-white border border-zinc-200/80 rounded-2xl p-5 sm:p-6 shadow-sm space-y-4">
                {pendingErrorCount > 0 && (
                    <div className="rounded-xl bg-red-50 border border-red-200/80 px-4 py-2.5 flex items-center gap-2 text-xs font-medium text-red-700">
                        <AlertCircle className="h-4 w-4 text-red-600 shrink-0" />
                        <span>
                            Há {pendingErrorCount}{' '}
                            {pendingErrorCount === 1
                                ? 'campo pendente ou inválido'
                                : 'campos pendentes ou inválidos'}{' '}
                            na ficha. Revise os itens destacados acima.
                        </span>
                    </div>
                )}

                <div
                    className={
                        forceMobileLayout
                            ? 'flex flex-col-reverse gap-3'
                            : 'flex flex-col-reverse sm:flex-row sm:items-center justify-between gap-4'
                    }
                >
                    <button
                        type="button"
                        onClick={() => setIsClearModalOpen(true)}
                        disabled={isSubmitting}
                        className={`text-xs font-medium text-zinc-500 hover:text-zinc-900 inline-flex items-center justify-center gap-1.5 ${
                            forceMobileLayout
                                ? 'self-center px-3 py-2'
                                : 'self-center sm:self-center px-3 py-2 sm:px-2.5 sm:py-1.5'
                        } rounded-lg hover:bg-zinc-100 transition-colors cursor-pointer`}
                    >
                        <RotateCcw className="h-3.5 w-3.5" />
                        <span>Limpar ficha</span>
                    </button>

                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className={`${
                            forceMobileLayout
                                ? 'w-full h-12'
                                : 'w-full sm:w-auto h-12 sm:h-11'
                        } px-7 rounded-xl bg-[#F19B0A] hover:bg-[#D98B08] text-white text-sm font-semibold inline-flex items-center justify-center gap-2 active:scale-[0.98] transition-all shadow-sm disabled:opacity-60 cursor-pointer`}
                    >
                        {isSubmitting ? (
                            <>
                                <Loader2 className="h-4 w-4 animate-spin" />
                                <span>Enviando inscrição...</span>
                            </>
                        ) : (
                            <>
                                <Send className="h-4 w-4" />
                                <span>
                                    {previewMode
                                        ? 'Simular envio da ficha'
                                        : 'Enviar inscrição'}
                                </span>
                            </>
                        )}
                    </button>
                </div>
            </div>

            <ConfirmModal
                isOpen={isClearModalOpen}
                onClose={() => setIsClearModalOpen(false)}
                onConfirm={handleClearForm}
                title="Limpar ficha de inscrição?"
                description="Todas as respostas preenchidas nesta ficha serão apagadas."
                confirmText="Limpar tudo"
                cancelText="Cancelar"
                variant="warning"
            />
        </form>
    );
}

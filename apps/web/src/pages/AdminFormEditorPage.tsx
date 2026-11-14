import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
    DragDropContext,
    Droppable,
    Draggable,
    DraggableStateSnapshot,
    DropResult,
} from '@hello-pangea/dnd';
import {
    ArrowLeft,
    CheckCircle2,
    ChevronDown,
    ChevronUp,
    Copy,
    ExternalLink,
    Eye,
    GitBranch,
    GripVertical,
    ImagePlus,
    Loader2,
    Monitor,
    Plus,
    Save,
    Settings,
    SlidersHorizontal,
    Smartphone,
    Trash2,
    X,
    Check,
    Globe,
    Calendar,
    HelpCircle,
    Sliders,
    Layers,
    Clock,
    FileText,
    Sparkles,
} from 'lucide-react';
import { jwtDecode } from 'jwt-decode';
import toast from 'react-hot-toast';
import api from '../utils/api';
import { compressImage } from '../utils/image';
import {
    ConditionOperator,
    FIELD_TYPE_LABELS,
    FormCondition,
    FormFieldModel,
    FormFieldType,
    FormModel,
    FormSectionModel,
    slugifyClient,
} from '../utils/formTypes';
import { RichTextInput, RichTextRenderer } from '../components/forms/RichTextRenderer';
import { DynamicFormRenderer, FormBrandHeader } from '../components/forms/DynamicFormRenderer';
import { PortalModal } from '../components/PortalModal';
import LoadingSpinner from '../components/LoadingSpinner';
import Tooltip from '../components/Tooltip';
import logo from '../assets/logo.png';

const formMetaSchema = z.object({
    title: z.string().trim().min(2, 'Informe o título do formulário.').max(200),
    slug: z.string().trim().max(140).optional(),
    description: z.string().max(5000).optional().nullable(),
    coverImageUrl: z.string().max(1000).optional().nullable(),
    mobileCoverImageUrl: z.string().max(1000).optional().nullable(),
    isActive: z.boolean(),
    opensAt: z.string().optional().nullable(),
    closesAt: z.string().optional().nullable(),
    showOnLandingPage: z.boolean(),
    enforceSingleSubmission: z.boolean(),
    confirmationTitle: z.string().max(200).optional().nullable(),
    confirmationMessage: z.string().max(4000).optional().nullable(),
    locationId: z.string().optional().nullable(),
});

type FormMetaValues = z.infer<typeof formMetaSchema>;

interface LocationOption {
    id: string;
    name: string;
    slug: string;
}

const CHOICE_TYPES: FormFieldType[] = [
    'SINGLE_CHOICE',
    'MULTIPLE_CHOICE',
    'SELECT',
];

function createEmptyField(order: number): FormFieldModel {
    const uid = Math.random().toString(36).slice(2, 7);
    return {
        key: `pergunta_${uid}`,
        type: 'SHORT_TEXT',
        label: 'Nova pergunta',
        description: '',
        placeholder: '',
        order,
        required: true,
        allowOther: false,
        semanticKey: null,
        options: [],
        condition: null,
        validation: null,
    };
}

function createEmptySection(order: number): FormSectionModel {
    return {
        tempId: `sec_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        title: `Bloco ${order + 1}`,
        description: '',
        order,
        condition: null,
        fields: [createEmptyField(0)],
    };
}

function toDatetimeLocalValue(iso?: string | null): string {
    if (!iso) return '';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '';
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// Clean draggable card style ensuring smooth native @hello-pangea/dnd drop animation
function getDraggableCardStyle(
    style: React.CSSProperties | undefined,
    snapshot: DraggableStateSnapshot,
): React.CSSProperties | undefined {
    if (!snapshot.isDragging) {
        return style;
    }
    return {
        ...style,
        zIndex: 9999,
    };
}

export default function AdminFormEditorPage() {
    const { id } = useParams<{ id: string }>();
    const isEditing = Boolean(id);
    const navigate = useNavigate();

    const [userRole, setUserRole] = useState<'ADMIN' | 'SUPER_ADMIN' | string>('ADMIN');
    const [locations, setLocations] = useState<LocationOption[]>([]);
    const [loading, setLoading] = useState(isEditing);
    const [saving, setSaving] = useState(false);
    const [uploadingCoverTarget, setUploadingCoverTarget] = useState<'desktop' | 'mobile' | null>(null);
    const [activeTab, setActiveTab] = useState<'builder' | 'settings'>('builder');
    const [isPreviewOpen, setIsPreviewOpen] = useState(false);
    const [previewDevice, setPreviewDevice] = useState<'desktop' | 'mobile'>('desktop');
    const [previewScreen, setPreviewScreen] = useState<'form' | 'confirmation'>('form');
    const previewScrollRef = useRef<HTMLDivElement>(null);

    const [sections, setSections] = useState<FormSectionModel[]>(() => [
        createEmptySection(0),
    ]);
    const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});
    const [expandedFieldKeys, setExpandedFieldKeys] = useState<Record<string, boolean>>({});

    const desktopCoverInputRef = useRef<HTMLInputElement>(null);
    const mobileCoverInputRef = useRef<HTMLInputElement>(null);

    const {
        register,
        control,
        handleSubmit,
        reset,
        watch,
        setValue,
        formState: { errors },
    } = useForm<FormMetaValues>({
        resolver: zodResolver(formMetaSchema),
        defaultValues: {
            title: '',
            slug: '',
            description: '',
            coverImageUrl: '',
            mobileCoverImageUrl: '',
            isActive: true,
            opensAt: '',
            closesAt: '',
            showOnLandingPage: false,
            enforceSingleSubmission: true,
            confirmationTitle: 'Inscrição recebida com sucesso!',
            confirmationMessage: '',
            locationId: '',
        },
    });

    const watchedValues = watch();

    useEffect(() => {
        try {
            const token = localStorage.getItem('auth_token');
            if (token) {
                const decoded: any = jwtDecode(token);
                if (decoded?.role) {
                    setUserRole(String(decoded.role).toUpperCase());
                }
            }
        } catch {}
    }, []);

    useEffect(() => {
        api.get('/locations')
            .then((res) => setLocations(res.data || []))
            .catch(() => {});
    }, []);

    useEffect(() => {
        if (!id) return;
        let cancelled = false;
        setLoading(true);
        api.get(`/forms/${id}`)
            .then((res) => {
                if (cancelled) return;
                const f: FormModel = res.data;
                reset({
                    title: f.title || '',
                    slug: f.slug || '',
                    description: f.description || '',
                    coverImageUrl: f.coverImageUrl || '',
                    mobileCoverImageUrl: f.mobileCoverImageUrl || '',
                    isActive: f.isActive ?? true,
                    opensAt: toDatetimeLocalValue(f.opensAt),
                    closesAt: toDatetimeLocalValue(f.closesAt),
                    showOnLandingPage: f.showOnLandingPage ?? false,
                    enforceSingleSubmission: f.enforceSingleSubmission ?? true,
                    confirmationTitle:
                        f.confirmationTitle || 'Inscrição recebida com sucesso!',
                    confirmationMessage: f.confirmationMessage || '',
                    locationId: f.locationId || '',
                });
                const loadedSections = (f.sections || []).map((sec, idx) => ({
                    ...sec,
                    tempId: sec.id || `sec_${idx}`,
                    fields: (sec.fields || []).map((fld, fIdx) => ({
                        ...fld,
                        order: fIdx,
                        options: Array.isArray(fld.options) ? fld.options : [],
                    })),
                }));
                setSections(
                    loadedSections.length > 0 ? loadedSections : [createEmptySection(0)],
                );
            })
            .catch((err) => {
                toast.error(
                    err.response?.data?.message || 'Erro ao carregar formulário.',
                );
                navigate('/admin/formularios');
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });
        return () => {
            cancelled = true;
        };
    }, [id, reset, navigate]);

    const getSectionKey = (sec: FormSectionModel, idx: number) =>
        sec.id || sec.tempId || `idx-${idx}`;

    const allChoiceFields = useMemo(() => {
        return sections.flatMap((sec) =>
            sec.fields.filter((f) => CHOICE_TYPES.includes(f.type)),
        );
    }, [sections]);

    const handleCoverUpload = async (
        target: 'desktop' | 'mobile',
        e: React.ChangeEvent<HTMLInputElement>,
    ) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (!file.type.startsWith('image/')) {
            toast.error('Selecione uma imagem válida.');
            return;
        }
        setUploadingCoverTarget(target);
        try {
            const compressed =
                target === 'desktop'
                    ? await compressImage(file, 1920, 1080, 0.88)
                    : await compressImage(file, 1200, 1200, 0.88);
            const formData = new FormData();
            formData.append(
                'file',
                compressed,
                target === 'desktop' ? 'cover-desktop.jpg' : 'cover-mobile.jpg',
            );

            const res = await api.post('/upload', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            if (target === 'desktop') {
                setValue('coverImageUrl', res.data.url, { shouldDirty: true });
                toast.success('Banner Desktop enviado!');
            } else {
                setValue('mobileCoverImageUrl', res.data.url, { shouldDirty: true });
                toast.success('Banner Mobile enviado!');
            }
        } catch (err: any) {
            toast.error(err.response?.data?.message || 'Erro ao enviar imagem.');
        } finally {
            setUploadingCoverTarget(null);
            if (target === 'desktop' && desktopCoverInputRef.current) {
                desktopCoverInputRef.current.value = '';
            }
            if (target === 'mobile' && mobileCoverInputRef.current) {
                mobileCoverInputRef.current.value = '';
            }
        }
    };

    const handleDragEnd = (result: DropResult) => {
        const { source, destination, type } = result;
        if (!destination) return;
        if (
            source.droppableId === destination.droppableId &&
            source.index === destination.index
        ) {
            return;
        }

        if (type === 'SECTION') {
            setSections((prev) => {
                const next = [...prev];
                const [moved] = next.splice(source.index, 1);
                next.splice(destination.index, 0, moved);
                return next.map((s, i) => ({ ...s, order: i }));
            });
            return;
        }

        if (type === 'FIELD') {
            const srcSecKey = source.droppableId.replace('fields-', '');
            const dstSecKey = destination.droppableId.replace('fields-', '');

            setSections((prev) => {
                const next = prev.map((s) => ({ ...s, fields: [...s.fields] }));
                const srcIdx = next.findIndex(
                    (s, i) => getSectionKey(s, i) === srcSecKey,
                );
                const dstIdx = next.findIndex(
                    (s, i) => getSectionKey(s, i) === dstSecKey,
                );
                if (srcIdx === -1 || dstIdx === -1) return prev;

                const [movedField] = next[srcIdx].fields.splice(source.index, 1);
                next[dstIdx].fields.splice(destination.index, 0, movedField);

                return next.map((sec) => ({
                    ...sec,
                    fields: sec.fields.map((f, idx) => ({ ...f, order: idx })),
                }));
            });
        }
    };

    const updateSection = (
        secIdx: number,
        patch: Partial<FormSectionModel>,
    ) => {
        setSections((prev) =>
            prev.map((sec, idx) => (idx === secIdx ? { ...sec, ...patch } : sec)),
        );
    };

    const addSection = () => {
        setSections((prev) => [...prev, createEmptySection(prev.length)]);
    };

    const removeSection = (secIdx: number) => {
        if (sections.length <= 1) {
            toast.error('A ficha deve ter pelo menos um bloco.');
            return;
        }
        setSections((prev) =>
            prev
                .filter((_, idx) => idx !== secIdx)
                .map((s, i) => ({ ...s, order: i })),
        );
    };

    const addFieldToSection = (secIdx: number) => {
        const newField = createEmptyField(sections[secIdx].fields.length);
        setSections((prev) =>
            prev.map((sec, idx) =>
                idx === secIdx
                    ? { ...sec, fields: [...sec.fields, newField] }
                    : sec,
            ),
        );
        setExpandedFieldKeys((prev) => ({ ...prev, [newField.key]: true }));
    };

    const updateField = (
        secIdx: number,
        fieldIdx: number,
        patch: Partial<FormFieldModel>,
    ) => {
        setSections((prev) =>
            prev.map((sec, sIdx) => {
                if (sIdx !== secIdx) return sec;
                return {
                    ...sec,
                    fields: sec.fields.map((f, fIdx) =>
                        fIdx === fieldIdx ? { ...f, ...patch } : f,
                    ),
                };
            }),
        );
    };

    const duplicateField = (secIdx: number, fieldIdx: number) => {
        const source = sections[secIdx].fields[fieldIdx];
        const newKey = `${source.key}_copia_${Math.random().toString(36).slice(2, 5)}`;
        const cloned: FormFieldModel = {
            ...source,
            id: undefined,
            key: newKey,
            label: `${source.label} (Cópia)`,
        };
        setSections((prev) =>
            prev.map((sec, idx) => {
                if (idx !== secIdx) return sec;
                const copy = [...sec.fields];
                copy.splice(fieldIdx + 1, 0, cloned);
                return {
                    ...sec,
                    fields: copy.map((f, i) => ({ ...f, order: i })),
                };
            }),
        );
        setExpandedFieldKeys((prev) => ({ ...prev, [newKey]: true }));
    };

    const removeField = (secIdx: number, fieldIdx: number) => {
        setSections((prev) =>
            prev.map((sec, idx) =>
                idx === secIdx
                    ? {
                          ...sec,
                          fields: sec.fields
                              .filter((_, fIdx) => fIdx !== fieldIdx)
                              .map((f, i) => ({ ...f, order: i })),
                      }
                    : sec,
            ),
        );
    };

    const onSubmit = async (meta: FormMetaValues) => {
        for (let sIdx = 0; sIdx < sections.length; sIdx++) {
            const sec = sections[sIdx];
            if (!sec.title.trim()) {
                toast.error(`Informe o título do Bloco ${sIdx + 1}.`);
                setActiveTab('builder');
                return;
            }
            for (const f of sec.fields) {
                if (!f.label.trim()) {
                    toast.error(`Informe o enunciado de todas as perguntas no bloco "${sec.title}".`);
                    setActiveTab('builder');
                    return;
                }
                if (
                    CHOICE_TYPES.includes(f.type) &&
                    (!f.options || f.options.filter((o) => o.trim()).length === 0) &&
                    !f.allowOther
                ) {
                    toast.error(`Adicione pelo menos uma opção na pergunta "${f.label}".`);
                    setActiveTab('builder');
                    return;
                }
            }
        }

        setSaving(true);
        try {
            const payload = {
                ...meta,
                coverImageUrl: meta.coverImageUrl?.trim() || null,
                mobileCoverImageUrl: meta.mobileCoverImageUrl?.trim() || null,
                slug: meta.slug?.trim() || slugifyClient(meta.title),
                opensAt: meta.opensAt ? new Date(meta.opensAt).toISOString() : null,
                closesAt: meta.closesAt ? new Date(meta.closesAt).toISOString() : null,
                locationId: meta.locationId || null,
                sections: sections.map((sec, sIdx) => ({
                    id: sec.id,
                    tempId: sec.tempId,
                    title: sec.title.trim(),
                    description: sec.description || null,
                    order: sIdx,
                    condition: sec.condition?.fieldKey ? sec.condition : null,
                    fields: sec.fields.map((f, fIdx) => ({
                        id: f.id,
                        key: f.key,
                        type: f.type,
                        label: f.label.trim(),
                        description: f.description || null,
                        placeholder: f.placeholder || null,
                        order: fIdx,
                        required: f.type === 'INFO_BLOCK' ? false : Boolean(f.required),
                        allowOther: Boolean(f.allowOther),
                        semanticKey: f.semanticKey || null,
                        options: CHOICE_TYPES.includes(f.type)
                            ? (f.options || []).map((o) => o.trim()).filter(Boolean)
                            : null,
                        condition: f.condition?.fieldKey ? f.condition : null,
                        validation: f.validation || null,
                    })),
                })),
            };

            if (isEditing && id) {
                await api.put(`/forms/${id}`, payload);
                toast.success('Formulário salvo com sucesso!');
            } else {
                const res = await api.post('/forms', payload);
                toast.success('Formulário criado com sucesso!');
                navigate(`/admin/formularios/${res.data.id}/editar`, { replace: true });
            }
        } catch (err: any) {
            const msg =
                err.response?.data?.message || 'Erro ao salvar formulário.';
            toast.error(Array.isArray(msg) ? msg.join(' ') : msg);
        } finally {
            setSaving(false);
        }
    };

    const previewFormModel: FormModel = useMemo(
        () => ({
            id: id || 'preview',
            slug: watchedValues.slug || slugifyClient(watchedValues.title || 'preview'),
            title: watchedValues.title || 'Título do formulário',
            description: watchedValues.description || '',
            coverImageUrl: watchedValues.coverImageUrl || null,
            mobileCoverImageUrl: watchedValues.mobileCoverImageUrl || null,
            isActive: watchedValues.isActive,
            showOnLandingPage: watchedValues.showOnLandingPage,
            enforceSingleSubmission: watchedValues.enforceSingleSubmission,
            location: locations.find((l) => l.id === watchedValues.locationId) || null,
            sections,
        }),
        [id, watchedValues, locations, sections],
    );

    if (loading) {
        return (
            <div className="py-20 flex justify-center">
                <LoadingSpinner />
            </div>
        );
    }

    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
    const resolveCoverUrl = (raw?: string | null) => {
        if (!raw) return null;
        return raw.startsWith('http') ? raw : `${apiUrl}${raw}`;
    };
    const resolvedDesktopCover = resolveCoverUrl(watchedValues.coverImageUrl);
    const resolvedMobileCover = resolveCoverUrl(watchedValues.mobileCoverImageUrl);

    const statusBadge = (
        <span
            className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-medium border shrink-0 ${
                watchedValues.isActive
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200/80'
                    : 'bg-slate-100 text-slate-600 border-slate-200/80'
            }`}
        >
            <span className={`h-1.5 w-1.5 rounded-full ${watchedValues.isActive ? 'bg-emerald-500' : 'bg-slate-400'}`} />
            {watchedValues.isActive ? 'Ativo' : 'Rascunho'}
        </span>
    );

    const pageTitle = isEditing ? watchedValues.title || 'Editar Formulário' : 'Novo Formulário';

    return (
        <>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 sm:space-y-8 w-full pb-10">
            {/* Header */}
            <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
                {/* Mobile Header (< sm) */}
                <div className="sm:hidden space-y-2.5 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                        <Link
                            to="/admin/formularios"
                            className="inline-flex items-center gap-1.5 h-8 px-2.5 rounded-lg border border-slate-200/80 bg-white active:bg-slate-50 text-xs font-medium text-slate-600 shadow-2xs"
                        >
                            <ArrowLeft className="h-3.5 w-3.5" />
                            <span>Formulários</span>
                        </Link>
                        {statusBadge}
                    </div>
                    <div className="space-y-1">
                        <h1 className="text-xl font-bold tracking-tight text-slate-900 leading-snug line-clamp-2">
                            {pageTitle}
                        </h1>
                        <p className="text-xs text-slate-500 leading-relaxed">
                            Organize os blocos temáticos da ficha única, edite os campos e defina regras condicionais inline.
                        </p>
                    </div>
                </div>

                {/* Desktop Header (>= sm) */}
                <div className="hidden sm:flex items-start gap-3.5 min-w-0">
                    <Link
                        to="/admin/formularios"
                        className="h-10 w-10 rounded-xl border border-slate-200/80 bg-white hover:bg-slate-50 flex items-center justify-center text-slate-600 hover:text-slate-900 transition-colors shrink-0 mt-0.5 shadow-2xs"
                        title="Voltar aos Formulários"
                    >
                        <ArrowLeft className="h-4 w-4" />
                    </Link>
                    <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2.5">
                            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 truncate">
                                {pageTitle}
                            </h1>
                            {statusBadge}
                        </div>
                        <p className="text-sm text-slate-500 mt-1">
                            Organize os blocos temáticos da ficha única, edite os campos e defina regras condicionais inline.
                        </p>
                    </div>
                </div>

                <div className="grid grid-cols-2 sm:flex items-center gap-2.5 sm:gap-2 w-full sm:w-auto shrink-0">
                    <button
                        type="button"
                        onClick={() => {
                            setPreviewDevice(window.innerWidth < 640 ? 'mobile' : 'desktop');
                            setPreviewScreen('form');
                            setIsPreviewOpen(true);
                        }}
                        className="h-10 px-4 rounded-xl border border-slate-200/80 bg-white hover:bg-slate-50 text-xs font-medium text-slate-700 inline-flex items-center justify-center gap-2 transition-all shadow-2xs cursor-pointer"
                    >
                        <Eye className="h-4 w-4 text-slate-500 shrink-0" />
                        <span>Pré-visualizar</span>
                    </button>

                    <button
                        type="submit"
                        disabled={saving}
                        className="h-10 px-4 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-medium text-xs transition-all active:scale-[0.98] shadow-xs inline-flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer"
                    >
                        {saving ? <Loader2 className="h-4 w-4 animate-spin shrink-0" /> : <Save className="h-4 w-4 shrink-0" />}
                        <span>{saving ? 'Salvando...' : 'Salvar Formulário'}</span>
                    </button>
                </div>
            </div>

            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
                className="space-y-6"
            >
                {/* Segmented Tab Switcher */}
                <div className="grid grid-cols-2 sm:inline-flex w-full sm:w-auto p-1 bg-slate-100 rounded-xl border border-slate-200/60">
                    <button
                        type="button"
                        onClick={() => setActiveTab('builder')}
                        className={`px-2.5 sm:px-3.5 py-2 sm:py-1.5 rounded-lg text-xs transition-all flex items-center justify-center gap-1.5 sm:gap-2 cursor-pointer min-w-0 ${
                            activeTab === 'builder'
                                ? 'bg-white text-slate-900 font-semibold shadow-2xs'
                                : 'text-slate-600 hover:text-slate-900 font-medium'
                        }`}
                    >
                        <SlidersHorizontal className="h-3.5 w-3.5 text-amber-600 shrink-0" />
                        <span className="sm:hidden truncate">Estrutura & Campos</span>
                        <span className="hidden sm:inline whitespace-nowrap">Estrutura da Ficha & Campos</span>
                    </button>
                    <button
                        type="button"
                        onClick={() => setActiveTab('settings')}
                        className={`px-2.5 sm:px-3.5 py-2 sm:py-1.5 rounded-lg text-xs transition-all flex items-center justify-center gap-1.5 sm:gap-2 cursor-pointer min-w-0 ${
                            activeTab === 'settings'
                                ? 'bg-white text-slate-900 font-semibold shadow-2xs'
                                : 'text-slate-600 hover:text-slate-900 font-medium'
                        }`}
                    >
                        <Settings className="h-3.5 w-3.5 text-amber-600 shrink-0" />
                        <span className="sm:hidden truncate">Configurações</span>
                        <span className="hidden sm:inline whitespace-nowrap">Configurações & Regras</span>
                    </button>
                </div>

                {activeTab === 'builder' ? (
                    <div className="space-y-6">
                        {/* Form Presentation Card */}
                        <div className="bg-white border border-slate-200/80 rounded-2xl overflow-hidden shadow-2xs">
                            <div className="h-1.5 bg-[#F19B0A]" />
                            <div className="p-4 sm:p-7 space-y-5 sm:space-y-6">
                                {/* Cover banners: Desktop & Mobile */}
                                <div className="space-y-3">
                                    <div className="space-y-0.5">
                                        <div className="flex items-center gap-2">
                                            <h2 className="text-sm font-semibold text-slate-900">
                                                Banner de capa
                                            </h2>
                                            <span className="px-2 py-0.5 rounded-md bg-slate-100 text-[11px] font-medium text-slate-500">
                                                Opcional
                                            </span>
                                        </div>
                                        <p className="text-xs text-slate-500 leading-relaxed">
                                            Envie artes dedicadas para computador e celular. Se apenas uma versão for enviada, ela será exibida automaticamente em todos os dispositivos.
                                        </p>
                                    </div>

                                    <input
                                        ref={desktopCoverInputRef}
                                        type="file"
                                        accept="image/*"
                                        onChange={(e) => handleCoverUpload('desktop', e)}
                                        className="hidden"
                                    />
                                    <input
                                        ref={mobileCoverInputRef}
                                        type="file"
                                        accept="image/*"
                                        onChange={(e) => handleCoverUpload('mobile', e)}
                                        className="hidden"
                                    />

                                    <div className="grid grid-cols-1 md:grid-cols-[1.265fr_1fr] gap-4">
                                        {/* Desktop Cover Slot */}
                                        <div className="rounded-xl border border-slate-200/80 bg-slate-50/50 p-3 sm:p-3.5 space-y-3">
                                            <div className="flex items-center justify-between gap-2">
                                                <div className="flex items-center gap-2.5 min-w-0">
                                                    <div className="w-7 h-7 rounded-lg bg-white border border-slate-200/80 flex items-center justify-center text-slate-600 shrink-0">
                                                        <Monitor className="h-3.5 w-3.5" />
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className="text-xs font-semibold text-slate-900 truncate">
                                                            Versão Desktop
                                                        </p>
                                                        <p className="text-[11px] text-slate-500 truncate">
                                                            <span className="hidden sm:inline">Proporção </span>2.25:1 · 1600×710 px
                                                        </p>
                                                    </div>
                                                </div>
                                                {resolvedDesktopCover && (
                                                    <div className="flex items-center gap-1.5 shrink-0">
                                                        <button
                                                            type="button"
                                                            disabled={uploadingCoverTarget !== null}
                                                            onClick={() => desktopCoverInputRef.current?.click()}
                                                            className="h-7 px-2.5 rounded-lg border border-slate-200/90 bg-white hover:bg-slate-50 text-[11px] font-semibold text-slate-700 transition-colors cursor-pointer disabled:opacity-50"
                                                        >
                                                            {uploadingCoverTarget === 'desktop' ? 'Enviando...' : 'Trocar'}
                                                        </button>
                                                        <button
                                                            type="button"
                                                            disabled={uploadingCoverTarget !== null}
                                                            onClick={() =>
                                                                setValue('coverImageUrl', '', { shouldDirty: true })
                                                            }
                                                            className="h-7 w-7 rounded-lg border border-slate-200/90 bg-white hover:bg-red-50 hover:border-red-200 text-slate-500 hover:text-red-600 flex items-center justify-center transition-colors cursor-pointer disabled:opacity-50"
                                                            title="Remover capa Desktop"
                                                        >
                                                            <Trash2 className="h-3.5 w-3.5" />
                                                        </button>
                                                    </div>
                                                )}
                                            </div>

                                            {resolvedDesktopCover ? (
                                                <div className="relative w-full aspect-[2.25/1] rounded-xl overflow-hidden border border-slate-200/80 bg-white">
                                                    <img
                                                        src={resolvedDesktopCover}
                                                        alt="Banner de capa Desktop"
                                                        className="w-full h-full object-cover"
                                                    />
                                                    <div className="pointer-events-none absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-black/20 to-transparent" />
                                                </div>
                                            ) : (
                                                <button
                                                    type="button"
                                                    disabled={uploadingCoverTarget !== null}
                                                    onClick={() => desktopCoverInputRef.current?.click()}
                                                    className="w-full aspect-[2.25/1] rounded-xl border border-dashed border-slate-300/90 bg-white hover:border-[#F19B0A] hover:bg-amber-50/20 flex flex-col items-center justify-center gap-2 p-4 text-center transition-all cursor-pointer group disabled:opacity-60"
                                                >
                                                    {uploadingCoverTarget === 'desktop' ? (
                                                        <>
                                                            <Loader2 className="h-5 w-5 animate-spin text-[#F19B0A]" />
                                                            <span className="text-xs font-semibold text-amber-800">
                                                                Enviando capa Desktop...
                                                            </span>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <div className="w-8 h-8 rounded-lg bg-slate-50 border border-slate-200/80 flex items-center justify-center text-slate-400 group-hover:text-[#F19B0A] group-hover:border-amber-200 transition-colors">
                                                                <ImagePlus className="h-4 w-4" />
                                                            </div>
                                                            <div className="space-y-0.5">
                                                                <p className="text-xs font-semibold text-slate-800">
                                                                    Enviar capa para Desktop
                                                                </p>
                                                                <p className="text-[11px] text-slate-500">
                                                                    {resolvedMobileCover
                                                                        ? 'Usando a capa Mobile automaticamente · Clique para personalizar'
                                                                        : 'JPG, PNG ou WebP · Horizontal panorâmico'}
                                                                </p>
                                                            </div>
                                                        </>
                                                    )}
                                                </button>
                                            )}
                                        </div>

                                        {/* Mobile Cover Slot */}
                                        <div className="rounded-xl border border-slate-200/80 bg-slate-50/50 p-3 sm:p-3.5 space-y-3">
                                            <div className="flex items-center justify-between gap-2">
                                                <div className="flex items-center gap-2.5 min-w-0">
                                                    <div className="w-7 h-7 rounded-lg bg-white border border-slate-200/80 flex items-center justify-center text-slate-600 shrink-0">
                                                        <Smartphone className="h-3.5 w-3.5" />
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className="text-xs font-semibold text-slate-900 truncate">
                                                            Versão Mobile
                                                        </p>
                                                        <p className="text-[11px] text-slate-500 truncate">
                                                            <span className="hidden sm:inline">Proporção </span>16:9 · 1080×608 px
                                                        </p>
                                                    </div>
                                                </div>
                                                {resolvedMobileCover && (
                                                    <div className="flex items-center gap-1.5 shrink-0">
                                                        <button
                                                            type="button"
                                                            disabled={uploadingCoverTarget !== null}
                                                            onClick={() => mobileCoverInputRef.current?.click()}
                                                            className="h-7 px-2.5 rounded-lg border border-slate-200/90 bg-white hover:bg-slate-50 text-[11px] font-semibold text-slate-700 transition-colors cursor-pointer disabled:opacity-50"
                                                        >
                                                            {uploadingCoverTarget === 'mobile' ? 'Enviando...' : 'Trocar'}
                                                        </button>
                                                        <button
                                                            type="button"
                                                            disabled={uploadingCoverTarget !== null}
                                                            onClick={() =>
                                                                setValue('mobileCoverImageUrl', '', { shouldDirty: true })
                                                            }
                                                            className="h-7 w-7 rounded-lg border border-slate-200/90 bg-white hover:bg-red-50 hover:border-red-200 text-slate-500 hover:text-red-600 flex items-center justify-center transition-colors cursor-pointer disabled:opacity-50"
                                                            title="Remover capa Mobile"
                                                        >
                                                            <Trash2 className="h-3.5 w-3.5" />
                                                        </button>
                                                    </div>
                                                )}
                                            </div>

                                            {resolvedMobileCover ? (
                                                <div className="relative w-full aspect-[16/9] rounded-xl overflow-hidden border border-slate-200/80 bg-white">
                                                    <img
                                                        src={resolvedMobileCover}
                                                        alt="Banner de capa Mobile"
                                                        className="w-full h-full object-cover"
                                                    />
                                                    <div className="pointer-events-none absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-black/20 to-transparent" />
                                                </div>
                                            ) : (
                                                <button
                                                    type="button"
                                                    disabled={uploadingCoverTarget !== null}
                                                    onClick={() => mobileCoverInputRef.current?.click()}
                                                    className="w-full aspect-[16/9] rounded-xl border border-dashed border-slate-300/90 bg-white hover:border-[#F19B0A] hover:bg-amber-50/20 flex flex-col items-center justify-center gap-2 p-4 text-center transition-all cursor-pointer group disabled:opacity-60"
                                                >
                                                    {uploadingCoverTarget === 'mobile' ? (
                                                        <>
                                                            <Loader2 className="h-5 w-5 animate-spin text-[#F19B0A]" />
                                                            <span className="text-xs font-semibold text-amber-800">
                                                                Enviando capa Mobile...
                                                            </span>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <div className="w-8 h-8 rounded-lg bg-slate-50 border border-slate-200/80 flex items-center justify-center text-slate-400 group-hover:text-[#F19B0A] group-hover:border-amber-200 transition-colors">
                                                                <ImagePlus className="h-4 w-4" />
                                                            </div>
                                                            <div className="space-y-0.5">
                                                                <p className="text-xs font-semibold text-slate-800">
                                                                    Enviar capa para Celular
                                                                </p>
                                                                <p className="text-[11px] text-slate-500">
                                                                    {resolvedDesktopCover
                                                                        ? 'Usando a capa Desktop automaticamente · Clique para personalizar'
                                                                        : 'JPG, PNG ou WebP · Ideal para telas verticais'}
                                                                </p>
                                                            </div>
                                                        </>
                                                    )}
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>

                            {/* Title */}
                            <div className="space-y-1.5">
                                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">
                                    Título do Formulário *
                                </label>
                                <input
                                    type="text"
                                    {...register('title')}
                                    placeholder="Ex: Cadastro para 1ºTurma Brilha Mais 2027"
                                    className="w-full h-12 rounded-xl border border-slate-200/90 px-4 text-base sm:text-lg font-bold text-slate-900 bg-slate-50/30 focus:bg-white focus:outline-none focus:border-[#F19B0A] focus:ring-2 focus:ring-[#F19B0A]/15 transition-all"
                                />
                                {errors.title && (
                                    <p className="text-xs font-medium text-red-600 mt-1">{errors.title.message}</p>
                                )}
                            </div>

                            {/* Presentation Description */}
                            <Controller
                                name="description"
                                control={control}
                                render={({ field }) => (
                                    <RichTextInput
                                        label="Texto de Apresentação e Aviso de Triagem (Topo da Ficha)"
                                        value={field.value || ''}
                                        onChange={field.onChange}
                                        rows={3}
                                        placeholder="Apresente os objetivos do projeto, requisitos, orientações e avisos institucionais..."
                                    />
                                )}
                            />
                        </div>
                    </div>

                    {/* Drag and Drop Sections */}
                    <DragDropContext onDragEnd={handleDragEnd}>
                        <Droppable droppableId="sections-list" type="SECTION">
                            {(provided) => (
                                <div
                                    ref={provided.innerRef}
                                    {...provided.droppableProps}
                                    className="flex flex-col"
                                >
                                    {sections.map((sec, sIdx) => {
                                        const secKey = getSectionKey(sec, sIdx);
                                        const isCollapsed = !!collapsedSections[secKey];
                                        return (
                                            <Draggable
                                                key={secKey}
                                                draggableId={`sec-${secKey}`}
                                                index={sIdx}
                                            >
                                                {(dragProvided, dragSnapshot) => {
                                                    const isActivelyDragging =
                                                        dragSnapshot.isDragging &&
                                                        !dragSnapshot.isDropAnimating;
                                                    return (
                                                        <div
                                                            ref={dragProvided.innerRef}
                                                            {...dragProvided.draggableProps}
                                                            style={getDraggableCardStyle(
                                                                dragProvided.draggableProps.style,
                                                                dragSnapshot,
                                                            )}
                                                            className="mb-6 last:mb-0 outline-none"
                                                        >
                                                            <div
                                                                className={`bg-white border rounded-2xl overflow-hidden transition-[box-shadow,border-color,transform] duration-200 ease-out ${
                                                                    isActivelyDragging
                                                                        ? 'scale-[1.01] shadow-2xl border-amber-300 ring-2 ring-[#F19B0A]/15'
                                                                        : 'border-slate-200/80 shadow-2xs'
                                                                }`}
                                                            >
                                                                {/* Section Header */}
                                                                <div className="bg-slate-50/80 border-b border-slate-200/80 px-3.5 sm:px-5 py-3 sm:py-3.5 flex flex-wrap sm:flex-nowrap items-center gap-2 sm:gap-3">
                                                                    <div className="order-1 flex items-center gap-2 shrink-0">
                                                                        <div
                                                                            {...dragProvided.dragHandleProps}
                                                                            className="cursor-grab active:cursor-grabbing touch-none select-none text-slate-400 hover:text-slate-700 p-1 rounded-lg hover:bg-slate-200/60 transition-colors"
                                                                            title="Arrastar para reordenar bloco"
                                                                        >
                                                                            <GripVertical className="h-4 w-4" />
                                                                        </div>
                                                                        <span className="px-2.5 py-1 rounded-lg bg-amber-50 border border-amber-200/80 text-xs font-bold text-amber-900 shrink-0">
                                                                            Bloco {sIdx + 1}
                                                                        </span>
                                                                        <span className="sm:hidden text-[11px] font-medium text-slate-400">
                                                                            · {sec.fields.length} {sec.fields.length === 1 ? 'campo' : 'campos'}
                                                                        </span>
                                                                    </div>

                                                                    <div className="order-2 sm:order-3 flex items-center gap-1 ml-auto sm:ml-0 shrink-0">
                                                                        <Tooltip content={isCollapsed ? 'Expandir bloco' : 'Recolher bloco'}>
                                                                            <button
                                                                                type="button"
                                                                                onClick={() =>
                                                                                    setCollapsedSections((prev) => ({
                                                                                        ...prev,
                                                                                        [secKey]: !prev[secKey],
                                                                                    }))
                                                                                }
                                                                                className="h-8 w-8 rounded-lg hover:bg-slate-200/60 text-slate-500 flex items-center justify-center transition-colors"
                                                                            >
                                                                                {isCollapsed ? (
                                                                                    <ChevronDown className="h-4 w-4" />
                                                                                ) : (
                                                                                    <ChevronUp className="h-4 w-4" />
                                                                                )}
                                                                            </button>
                                                                        </Tooltip>
                                                                        <Tooltip content="Excluir bloco">
                                                                            <button
                                                                                type="button"
                                                                                onClick={() => removeSection(sIdx)}
                                                                                className="h-8 w-8 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-600 flex items-center justify-center transition-colors"
                                                                            >
                                                                                <Trash2 className="h-4 w-4" />
                                                                            </button>
                                                                        </Tooltip>
                                                                    </div>

                                                                    <input
                                                                        type="text"
                                                                        value={sec.title}
                                                                        onChange={(e) =>
                                                                            updateSection(sIdx, {
                                                                                title: e.target.value,
                                                                            })
                                                                        }
                                                                        placeholder="Título do Bloco Temático"
                                                                        className="order-3 sm:order-2 w-full sm:w-auto sm:flex-1 min-w-0 bg-white sm:bg-transparent border border-slate-200/80 sm:border-0 sm:border-b sm:border-transparent focus:border-[#F19B0A] focus:bg-white rounded-xl sm:rounded px-3 sm:px-2 h-9 sm:h-auto sm:py-0.5 text-sm sm:text-base font-bold text-slate-900 focus:outline-none transition-all"
                                                                    />
                                                                </div>

                                                        {!isCollapsed && (
                                                            <div className="p-3.5 sm:p-6 space-y-4 sm:space-y-5">
                                                                {/* Optional section description */}
                                                                <RichTextInput
                                                                    label="Subtítulo / Orientações deste Bloco (Opcional)"
                                                                    value={sec.description || ''}
                                                                    onChange={(val) =>
                                                                        updateSection(sIdx, {
                                                                            description: val,
                                                                        })
                                                                    }
                                                                    rows={2}
                                                                    placeholder="Ex: Preencha seus dados pessoais e canais de contato..."
                                                                />

                                                                {/* Conditional logic for whole section */}
                                                                <ConditionEditor
                                                                    label="Regra Condicional do Bloco Completo"
                                                                    condition={sec.condition || null}
                                                                    availableFields={allChoiceFields.filter(
                                                                        (cf) =>
                                                                            !sec.fields.some(
                                                                                (sf) => sf.key === cf.key,
                                                                            ),
                                                                    )}
                                                                    onChange={(cond) =>
                                                                        updateSection(sIdx, {
                                                                            condition: cond,
                                                                        })
                                                                    }
                                                                />

                                                                {/* Questions List */}
                                                                <Droppable
                                                                    droppableId={`fields-${secKey}`}
                                                                    type="FIELD"
                                                                >
                                                                    {(fieldDrop, fieldDropSnapshot) => (
                                                                        <div
                                                                            ref={fieldDrop.innerRef}
                                                                            {...fieldDrop.droppableProps}
                                                                            className={`flex flex-col min-h-[12px] rounded-2xl transition-colors ${
                                                                                fieldDropSnapshot.isDraggingOver
                                                                                    ? 'bg-amber-50/30'
                                                                                    : ''
                                                                            }`}
                                                                        >
                                                                            {sec.fields.length === 0 && (
                                                                                <div
                                                                                    className={`h-24 rounded-2xl border border-dashed flex flex-col items-center justify-center text-center p-4 mb-3.5 pointer-events-none transition-colors ${
                                                                                        fieldDropSnapshot.isDraggingOver
                                                                                            ? 'border-amber-300 bg-amber-50/60 text-amber-800'
                                                                                            : 'border-slate-200 bg-slate-50/50 text-slate-400'
                                                                                    }`}
                                                                                >
                                                                                    <p className="text-xs font-semibold">
                                                                                        {fieldDropSnapshot.isDraggingOver
                                                                                            ? 'Soltar pergunta neste bloco'
                                                                                            : 'Nenhum campo neste bloco'}
                                                                                    </p>
                                                                                    <p className="text-[11px] opacity-80 mt-0.5">
                                                                                        Arraste uma pergunta para cá ou adicione abaixo
                                                                                    </p>
                                                                                </div>
                                                                            )}
                                                                            {sec.fields.map((field, fIdx) => {
                                                                                const isExpanded =
                                                                                    expandedFieldKeys[
                                                                                        field.key
                                                                                    ] ?? false;
                                                                                return (
                                                                                    <Draggable
                                                                                        key={field.key}
                                                                                        draggableId={`fld-${field.key}`}
                                                                                        index={fIdx}
                                                                                    >
                                                                                        {(fldDrag, fldSnapshot) => {
                                                                                            const isFieldActivelyDragging =
                                                                                                fldSnapshot.isDragging &&
                                                                                                !fldSnapshot.isDropAnimating;
                                                                                            return (
                                                                                                <div
                                                                                                    ref={fldDrag.innerRef}
                                                                                                    {...fldDrag.draggableProps}
                                                                                                    style={getDraggableCardStyle(
                                                                                                        fldDrag.draggableProps.style,
                                                                                                        fldSnapshot,
                                                                                                    )}
                                                                                                    className="mb-3.5 outline-none"
                                                                                                >
                                                                                                    <div
                                                                                                        className={`rounded-2xl border bg-white p-3.5 sm:p-5 space-y-3.5 sm:space-y-4 transition-[box-shadow,border-color,transform] duration-200 ease-out ${
                                                                                                            isFieldActivelyDragging
                                                                                                                ? 'scale-[1.01] shadow-xl border-amber-300 ring-2 ring-[#F19B0A]/15'
                                                                                                                : 'border-slate-200/80 hover:border-slate-300 shadow-2xs'
                                                                                                        }`}
                                                                                                    >
                                                                                                        {/* Main Question Header Row */}
                                                                                                        <div className="flex flex-col lg:flex-row lg:items-center gap-2.5 sm:gap-3">
                                                                                                            <div className="flex items-center gap-2 flex-1 min-w-0">
                                                                                                                <div
                                                                                                                    {...fldDrag.dragHandleProps}
                                                                                                                    className="cursor-grab active:cursor-grabbing touch-none select-none text-slate-400 hover:text-slate-700 p-1 rounded-lg hover:bg-slate-100 transition-colors shrink-0"
                                                                                                                    title="Arrastar pergunta"
                                                                                                                >
                                                                                                                    <GripVertical className="h-4 w-4" />
                                                                                                                </div>
                                                                                                                <input
                                                                                                                    type="text"
                                                                                                                    value={field.label}
                                                                                                                    onChange={(e) =>
                                                                                                                        updateField(
                                                                                                                            sIdx,
                                                                                                                            fIdx,
                                                                                                                            {
                                                                                                                                label: e.target.value,
                                                                                                                            },
                                                                                                                        )
                                                                                                                    }
                                                                                                                    placeholder="Enunciado da pergunta *"
                                                                                                                    className="flex-1 min-w-0 h-10 px-3.5 rounded-xl border border-slate-200/90 bg-slate-50/40 focus:bg-white text-sm font-semibold text-slate-900 focus:outline-none focus:border-[#F19B0A] focus:ring-2 focus:ring-[#F19B0A]/15 transition-all"
                                                                                                                />
                                                                                                            </div>

                                                                                                            <div className="flex flex-col sm:flex-row sm:flex-wrap lg:flex-nowrap sm:items-center gap-2 lg:shrink-0">
                                                                                                                <div className="flex items-center gap-2 w-full sm:w-auto">
                                                                                                                    <select
                                                                                                                        value={field.type}
                                                                                                                        onChange={(e) => {
                                                                                                                            const nextType = e.target.value as FormFieldType;
                                                                                                                            updateField(
                                                                                                                                sIdx,
                                                                                                                                fIdx,
                                                                                                                                {
                                                                                                                                    type: nextType,
                                                                                                                                    options:
                                                                                                                                        CHOICE_TYPES.includes(nextType) &&
                                                                                                                                        (!field.options || field.options.length === 0)
                                                                                                                                            ? ['Sim', 'Não']
                                                                                                                                            : field.options,
                                                                                                                                },
                                                                                                                            );
                                                                                                                        }}
                                                                                                                        className="flex-1 min-w-0 sm:flex-none h-9 sm:h-10 px-3 rounded-xl border border-slate-200/90 bg-white text-xs font-semibold text-slate-700 focus:outline-none focus:border-[#F19B0A] shadow-2xs"
                                                                                                                    >
                                                                                                                        {Object.entries(
                                                                                                                            FIELD_TYPE_LABELS,
                                                                                                                        ).map(([val, lbl]) => (
                                                                                                                            <option key={val} value={val}>
                                                                                                                                {lbl}
                                                                                                                            </option>
                                                                                                                        ))}
                                                                                                                    </select>

                                                                                                                    {field.type !== 'INFO_BLOCK' && (
                                                                                                                        <label className="shrink-0 h-9 sm:h-auto inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700 cursor-pointer px-2.5 py-2 rounded-xl border border-slate-200/70 sm:border-transparent bg-slate-50/70 sm:bg-transparent hover:bg-slate-100 transition-colors">
                                                                                                                            <input
                                                                                                                                type="checkbox"
                                                                                                                                checked={field.required}
                                                                                                                                onChange={(e) =>
                                                                                                                                    updateField(
                                                                                                                                        sIdx,
                                                                                                                                        fIdx,
                                                                                                                                        {
                                                                                                                                            required: e.target.checked,
                                                                                                                                        },
                                                                                                                                    )
                                                                                                                                }
                                                                                                                                className="rounded border-slate-300 text-[#F19B0A] focus:ring-[#F19B0A]"
                                                                                                                            />
                                                                                                                            <span>Obrigatória</span>
                                                                                                                        </label>
                                                                                                                    )}
                                                                                                                </div>

                                                                                                                <div className="flex items-center gap-1.5 sm:gap-2 w-full sm:w-auto">
                                                                                                                    <button
                                                                                                                        type="button"
                                                                                                                        onClick={() =>
                                                                                                                            setExpandedFieldKeys((prev) => ({
                                                                                                                                ...prev,
                                                                                                                                [field.key]: !isExpanded,
                                                                                                                            }))
                                                                                                                        }
                                                                                                                        className={`flex-1 sm:flex-none h-9 px-3 rounded-xl border text-xs font-semibold transition-all ${
                                                                                                                            isExpanded
                                                                                                                                ? 'border-amber-300 bg-amber-50 text-amber-900'
                                                                                                                                : 'border-slate-200/90 bg-white hover:bg-slate-50 text-slate-700'
                                                                                                                        }`}
                                                                                                                    >
                                                                                                                        {isExpanded ? 'Menos Opções' : 'Mais Opções'}
                                                                                                                    </button>

                                                                                                                    <Tooltip content="Duplicar pergunta">
                                                                                                                        <button
                                                                                                                            type="button"
                                                                                                                            onClick={() => duplicateField(sIdx, fIdx)}
                                                                                                                            className="h-9 w-9 shrink-0 rounded-xl border border-slate-200/90 bg-white hover:bg-slate-50 text-slate-500 hover:text-slate-800 flex items-center justify-center transition-colors shadow-2xs"
                                                                                                                        >
                                                                                                                            <Copy className="h-4 w-4" />
                                                                                                                        </button>
                                                                                                                    </Tooltip>

                                                                                                                    <Tooltip content="Excluir pergunta">
                                                                                                                        <button
                                                                                                                            type="button"
                                                                                                                            onClick={() => removeField(sIdx, fIdx)}
                                                                                                                            className="h-9 w-9 shrink-0 rounded-xl border border-slate-200/90 bg-white hover:bg-red-50 hover:border-red-200 text-slate-400 hover:text-red-600 flex items-center justify-center transition-colors shadow-2xs"
                                                                                                                        >
                                                                                                                            <Trash2 className="h-4 w-4" />
                                                                                                                        </button>
                                                                                                                    </Tooltip>
                                                                                                                </div>
                                                                                                            </div>
                                                                                                        </div>

                                                                                                {/* Choice options editor */}
                                                                                                {CHOICE_TYPES.includes(field.type) && (
                                                                                                    <div className="pl-0 sm:pl-7 pt-1 space-y-2.5">
                                                                                                        <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                                                                                                            Opções de Resposta
                                                                                                        </p>
                                                                                                        <div className="space-y-2">
                                                                                                            {(field.options || []).map((opt, optIdx) => (
                                                                                                                <div key={optIdx} className="flex items-center gap-2">
                                                                                                                    <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-500 text-[11px] font-bold flex items-center justify-center shrink-0">
                                                                                                                        {optIdx + 1}
                                                                                                                    </span>
                                                                                                                    <input
                                                                                                                        type="text"
                                                                                                                        value={opt}
                                                                                                                        onChange={(e) => {
                                                                                                                            const nextOpts = [...(field.options || [])];
                                                                                                                            nextOpts[optIdx] = e.target.value;
                                                                                                                            updateField(sIdx, fIdx, {
                                                                                                                                options: nextOpts,
                                                                                                                            });
                                                                                                                        }}
                                                                                                                        placeholder={`Opção ${optIdx + 1}`}
                                                                                                                        className="flex-1 min-w-0 h-9 px-3 rounded-xl border border-slate-200/90 bg-white text-xs font-medium text-slate-800 focus:outline-none focus:border-[#F19B0A]"
                                                                                                                    />
                                                                                                                    <button
                                                                                                                        type="button"
                                                                                                                        onClick={() => {
                                                                                                                            const nextOpts = (field.options || []).filter(
                                                                                                                                (_, oi) => oi !== optIdx,
                                                                                                                            );
                                                                                                                            updateField(sIdx, fIdx, {
                                                                                                                                options: nextOpts,
                                                                                                                            });
                                                                                                                        }}
                                                                                                                        className="h-8 w-8 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-600 flex items-center justify-center transition-colors"
                                                                                                                        title="Remover opção"
                                                                                                                    >
                                                                                                                        <X className="h-3.5 w-3.5" />
                                                                                                                    </button>
                                                                                                                </div>
                                                                                                            ))}
                                                                                                        </div>

                                                                                                        <div className="flex flex-wrap items-center gap-3 pt-1">
                                                                                                            <button
                                                                                                                type="button"
                                                                                                                onClick={() => {
                                                                                                                    const nextOpts = [
                                                                                                                        ...(field.options || []),
                                                                                                                        `Opção ${(field.options || []).length + 1}`,
                                                                                                                    ];
                                                                                                                    updateField(sIdx, fIdx, {
                                                                                                                        options: nextOpts,
                                                                                                                    });
                                                                                                                }}
                                                                                                                className="h-8 px-3 rounded-lg border border-dashed border-slate-300 hover:border-amber-400 hover:bg-amber-50/30 text-xs font-semibold text-slate-700 hover:text-amber-800 inline-flex items-center gap-1.5 transition-colors"
                                                                                                            >
                                                                                                                <Plus className="h-3.5 w-3.5" />
                                                                                                                <span>Adicionar opção</span>
                                                                                                            </button>

                                                                                                            <label className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 cursor-pointer">
                                                                                                                <input
                                                                                                                    type="checkbox"
                                                                                                                    checked={field.allowOther}
                                                                                                                    onChange={(e) =>
                                                                                                                        updateField(sIdx, fIdx, {
                                                                                                                            allowOther: e.target.checked,
                                                                                                                        })
                                                                                                                    }
                                                                                                                    className="rounded border-slate-300 text-[#F19B0A] focus:ring-[#F19B0A]"
                                                                                                                />
                                                                                                                <span>Permitir campo de texto "Outro:"</span>
                                                                                                            </label>
                                                                                                        </div>
                                                                                                    </div>
                                                                                                )}

                                                                                                {/* Expanded Options Drawer */}
                                                                                                {isExpanded && (
                                                                                                    <div className="pl-0 sm:pl-7 pt-3 border-t border-slate-100 space-y-4">
                                                                                                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                                                                                                            <div className="space-y-1">
                                                                                                                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">
                                                                                                                    Texto de Ajuda / Subtítulo
                                                                                                                </label>
                                                                                                                <input
                                                                                                                    type="text"
                                                                                                                    value={field.description || ''}
                                                                                                                    onChange={(e) =>
                                                                                                                        updateField(sIdx, fIdx, {
                                                                                                                            description: e.target.value,
                                                                                                                        })
                                                                                                                    }
                                                                                                                    placeholder="Ex: Informe com DDD, apenas números..."
                                                                                                                    className="w-full h-9 px-3 rounded-xl border border-slate-200/90 bg-white text-xs text-slate-800 focus:outline-none focus:border-[#F19B0A]"
                                                                                                                />
                                                                                                            </div>

                                                                                                            <div className="space-y-1">
                                                                                                                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">
                                                                                                                    Vínculo Automático de Aluno
                                                                                                                </label>
                                                                                                                <select
                                                                                                                    value={field.semanticKey || ''}
                                                                                                                    onChange={(e) =>
                                                                                                                        updateField(sIdx, fIdx, {
                                                                                                                            semanticKey: e.target.value || null,
                                                                                                                        })
                                                                                                                    }
                                                                                                                    className="w-full h-9 px-3 rounded-xl border border-slate-200/90 bg-white text-xs font-semibold text-slate-700 focus:outline-none focus:border-[#F19B0A]"
                                                                                                                >
                                                                                                                    <option value="">Nenhum (pergunta genérica)</option>
                                                                                                                    <option value="NAME">Nome do Candidato</option>
                                                                                                                    <option value="EMAIL">E-mail de Contato</option>
                                                                                                                    <option value="PHONE">Telefone / WhatsApp</option>
                                                                                                                    <option value="CPF">CPF (Validação automática)</option>
                                                                                                                    <option value="BIRTH_DATE">Data de Nascimento</option>
                                                                                                                    <option value="CITY">Cidade de Residência</option>
                                                                                                                </select>
                                                                                                            </div>

                                                                                                            <div className="space-y-1">
                                                                                                                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">
                                                                                                                    Largura na Ficha (Desktop)
                                                                                                                </label>
                                                                                                                <select
                                                                                                                    value={field.validation?.layout || ''}
                                                                                                                    onChange={(e) =>
                                                                                                                        updateField(sIdx, fIdx, {
                                                                                                                            validation: e.target.value
                                                                                                                                ? {
                                                                                                                                      ...(field.validation || {}),
                                                                                                                                      layout: e.target.value as 'half' | 'full',
                                                                                                                                  }
                                                                                                                                : null,
                                                                                                                        })
                                                                                                                    }
                                                                                                                    className="w-full h-9 px-3 rounded-xl border border-slate-200/90 bg-white text-xs font-semibold text-slate-700 focus:outline-none focus:border-[#F19B0A]"
                                                                                                                >
                                                                                                                    <option value="">Automático (conforme tipo)</option>
                                                                                                                    <option value="full">Largura total (1 coluna)</option>
                                                                                                                    <option value="half">Meia coluna (lado a lado)</option>
                                                                                                                </select>
                                                                                                            </div>
                                                                                                        </div>

                                                                                                        <ConditionEditor
                                                                                                            label="Regra Condicional desta Pergunta"
                                                                                                            condition={field.condition || null}
                                                                                                            availableFields={allChoiceFields.filter(
                                                                                                                (cf) => cf.key !== field.key,
                                                                                                            )}
                                                                                                            onChange={(cond) =>
                                                                                                                updateField(sIdx, fIdx, {
                                                                                                                    condition: cond,
                                                                                                                })
                                                                                                            }
                                                                                                        />
                                                                                                    </div>
                                                                                                )}
                                                                                                    </div>
                                                                                                </div>
                                                                                            );
                                                                                        }}
                                                                                    </Draggable>
                                                                                );
                                                                            })}
                                                                            {fieldDrop.placeholder}
                                                                        </div>
                                                                    )}
                                                                </Droppable>

                                                                {/* Add question to this section button */}
                                                                <button
                                                                    type="button"
                                                                    onClick={() => addFieldToSection(sIdx)}
                                                                    className="!mt-1.5 w-full h-11 rounded-2xl border-2 border-dashed border-slate-200 hover:border-amber-400 hover:bg-amber-50/20 text-xs font-bold text-slate-700 hover:text-amber-800 inline-flex items-center justify-center gap-2 transition-all cursor-pointer"
                                                                >
                                                                    <Plus className="h-4 w-4" />
                                                                    <span>Adicionar Campo neste Bloco</span>
                                                                </button>
                                                            </div>
                                                        )}
                                                            </div>
                                                        </div>
                                                    );
                                                }}
                                            </Draggable>
                                        );
                                    })}
                                    {provided.placeholder}
                                </div>
                            )}
                        </Droppable>
                    </DragDropContext>

                    {/* Add new section button */}
                    <button
                        type="button"
                        onClick={addSection}
                        className="!mt-1 w-full h-14 rounded-2xl border-2 border-dashed border-slate-200 hover:border-amber-400 bg-white hover:bg-amber-50/20 text-sm font-bold text-slate-700 hover:text-amber-800 inline-flex items-center justify-center gap-2.5 transition-all shadow-2xs cursor-pointer"
                    >
                        <Plus className="h-5 w-5 text-amber-600" />
                        <span>Adicionar Novo Bloco Temático</span>
                    </button>
                </div>
            ) : (
                /* Settings Tab */
                <div className="space-y-6">
                    {/* Card 1: URL & Polo */}
                    <div className="bg-white border border-slate-200/80 rounded-2xl p-4 sm:p-7 shadow-2xs space-y-5">
                        <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
                            <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200/60 flex items-center justify-center text-amber-600 shrink-0">
                                <Globe className="h-5 w-5" />
                            </div>
                            <div>
                                <h3 className="text-base font-bold text-slate-900">
                                    Identificação & Polo
                                </h3>
                                <p className="text-xs text-slate-500 mt-0.5">
                                    Configure o endereço web público do formulário e a localidade de atendimento.
                                </p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                            <div className="space-y-1.5">
                                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">
                                    Link Público (Slug)
                                </label>
                                <div className="flex items-center rounded-xl border border-slate-200/90 overflow-hidden bg-slate-50 focus-within:border-[#F19B0A] focus-within:bg-white transition-all shadow-2xs">
                                    <span className="px-2.5 sm:px-3.5 text-xs text-slate-400 font-mono border-r border-slate-200/80 py-2.5 bg-slate-100/60 shrink-0">
                                        /inscricao/
                                    </span>
                                    <input
                                        type="text"
                                        {...register('slug')}
                                        placeholder={slugifyClient(watchedValues.title || 'meu-formulario')}
                                        className="flex-1 min-w-0 h-10 px-3 text-xs font-mono text-slate-900 bg-transparent focus:outline-none"
                                    />
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">
                                    Polo / Localidade
                                </label>
                                {userRole === 'SUPER_ADMIN' ? (
                                    <select
                                        {...register('locationId')}
                                        className="w-full h-10 px-3.5 rounded-xl border border-slate-200/90 bg-white text-xs font-semibold text-slate-700 focus:outline-none focus:border-[#F19B0A] shadow-2xs"
                                    >
                                        <option value="">Global (Todos os Polos)</option>
                                        {locations.map((loc) => (
                                            <option key={loc.id} value={loc.id}>
                                                {loc.name}
                                            </option>
                                        ))}
                                    </select>
                                ) : (
                                    <div className="h-10 px-3.5 rounded-xl border border-slate-200/80 bg-slate-50 flex items-center text-xs text-slate-600 font-medium">
                                        Vinculado automaticamente ao seu Polo
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Card 2: Schedule */}
                    <div className="bg-white border border-slate-200/80 rounded-2xl p-4 sm:p-7 shadow-2xs space-y-5">
                        <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
                            <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200/60 flex items-center justify-center text-amber-600 shrink-0">
                                <Calendar className="h-5 w-5" />
                            </div>
                            <div>
                                <h3 className="text-base font-bold text-slate-900">
                                    Período de Inscrição (Agendamento Automático)
                                </h3>
                                <p className="text-xs text-slate-500 mt-0.5">
                                    Deixe em branco para manter a disponibilidade manual ou defina prazos de abertura e encerramento.
                                </p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                            <div className="space-y-1.5">
                                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">
                                    Data de Abertura Programada
                                </label>
                                <input
                                    type="datetime-local"
                                    {...register('opensAt')}
                                    className="w-full h-10 px-3.5 rounded-xl border border-slate-200/90 bg-white text-xs font-semibold text-slate-700 focus:outline-none focus:border-[#F19B0A] shadow-2xs"
                                />
                            </div>

                            <div className="space-y-1.5">
                                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">
                                    Data de Encerramento Programada
                                </label>
                                <input
                                    type="datetime-local"
                                    {...register('closesAt')}
                                    className="w-full h-10 px-3.5 rounded-xl border border-slate-200/90 bg-white text-xs font-semibold text-slate-700 focus:outline-none focus:border-[#F19B0A] shadow-2xs"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Card 3: Rules & Confirmation */}
                    <div className="bg-white border border-slate-200/80 rounded-2xl p-4 sm:p-7 shadow-2xs space-y-5">
                        <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
                            <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200/60 flex items-center justify-center text-amber-600 shrink-0">
                                <Sliders className="h-5 w-5" />
                            </div>
                            <div>
                                <h3 className="text-base font-bold text-slate-900">
                                    Regras de Submissão & Tela de Confirmação
                                </h3>
                                <p className="text-xs text-slate-500 mt-0.5">
                                    Controle duplicidades e personalize a mensagem final exibida ao candidato.
                                </p>
                            </div>
                        </div>

                        <div className="space-y-3">
                            <label className="flex items-start gap-3.5 p-4 rounded-xl border border-slate-200/80 hover:bg-slate-50/60 cursor-pointer transition-colors">
                                <input
                                    type="checkbox"
                                    {...register('isActive')}
                                    className="mt-0.5 rounded border-slate-300 text-[#F19B0A] focus:ring-[#F19B0A]"
                                />
                                <div>
                                    <span className="text-sm font-bold text-slate-900 block">
                                        Formulário ativo para receber inscrições
                                    </span>
                                    <span className="text-xs text-slate-500">
                                        Quando desativado, o público verá aviso de formulário encerrado/indisponível.
                                    </span>
                                </div>
                            </label>

                            <label className="flex items-start gap-3.5 p-4 rounded-xl border border-slate-200/80 hover:bg-slate-50/60 cursor-pointer transition-colors">
                                <input
                                    type="checkbox"
                                    {...register('enforceSingleSubmission')}
                                    className="mt-0.5 rounded border-slate-300 text-[#F19B0A] focus:ring-[#F19B0A]"
                                />
                                <div>
                                    <span className="text-sm font-bold text-slate-900 block">
                                        Limitar a 1 inscrição por pessoa
                                    </span>
                                    <span className="text-xs text-slate-500">
                                        Impede inscrições duplicadas baseando-se no CPF ou E-mail fornecido pelo candidato.
                                    </span>
                                </div>
                            </label>

                            <label className="flex items-start gap-3.5 p-4 rounded-xl border border-slate-200/80 hover:bg-slate-50/60 cursor-pointer transition-colors">
                                <input
                                    type="checkbox"
                                    {...register('showOnLandingPage')}
                                    className="mt-0.5 rounded border-slate-300 text-[#F19B0A] focus:ring-[#F19B0A]"
                                />
                                <div>
                                    <span className="text-sm font-bold text-slate-900 block">
                                        Destacar formulário na Página Inicial
                                    </span>
                                    <span className="text-xs text-slate-500">
                                        Exibe um botão de destaque "Inscreva-se na Próxima Turma" na capa do site público.
                                    </span>
                                </div>
                            </label>
                        </div>

                        <div className="pt-4 border-t border-slate-100 space-y-4">
                            <div className="space-y-1.5">
                                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">
                                    Título da Tela de Confirmação
                                </label>
                                <input
                                    type="text"
                                    {...register('confirmationTitle')}
                                    placeholder="Inscrição recebida com sucesso!"
                                    className="w-full h-10 px-3.5 rounded-xl border border-slate-200/90 bg-white text-xs font-semibold text-slate-800 focus:outline-none focus:border-[#F19B0A] shadow-2xs"
                                />
                            </div>

                            <div className="space-y-1.5">
                                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">
                                    Mensagem de Orientações Pós-Envio
                                </label>
                                <textarea
                                    {...register('confirmationMessage')}
                                    rows={3}
                                    placeholder="Ex: Fique atento ao seu WhatsApp e e-mail. Nossa coordenação entrará em contato nos próximos dias para a entrevista presencial."
                                    className="w-full p-3 rounded-xl border border-slate-200/90 bg-white text-xs text-slate-800 focus:outline-none focus:border-[#F19B0A] shadow-2xs"
                                />
                            </div>
                        </div>
                    </div>
                </div>
            )}
            </motion.div>

        </form>

        {/* Preview Simulation Modal (V2 Design System) */}
        <PortalModal
            isOpen={isPreviewOpen}
            onClose={() => setIsPreviewOpen(false)}
            className="relative z-[100000] w-full max-w-5xl h-[92vh] flex flex-col"
        >
            <div className="bg-[#FAFAF9] rounded-2xl border border-zinc-200/90 shadow-2xl flex flex-col h-full overflow-clip">
                {/* Clean White Topbar */}
                <div className="min-h-14 px-3.5 sm:px-5 py-2.5 bg-white border-b border-zinc-200/80 flex flex-wrap items-center justify-between gap-2.5 sm:gap-3 shrink-0">
                    {/* Left: Title & mode pill */}
                    <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
                        <div className="w-8 h-8 rounded-lg bg-zinc-50 border border-zinc-200/80 flex items-center justify-center text-zinc-600 shrink-0">
                            <Eye className="h-4 w-4 text-[#F19B0A]" />
                        </div>
                        <div className="flex items-center gap-2 flex-wrap min-w-0">
                            <h3 className="text-xs sm:text-sm font-bold tracking-tight text-zinc-900">
                                Simulação<span className="hidden sm:inline"> da Ficha</span>
                            </h3>
                            <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-full bg-zinc-100 text-[11px] font-medium text-zinc-500 border border-zinc-200/60">
                                Respostas não são salvas
                            </span>
                        </div>
                    </div>

                    {/* Center: Screen & Device Segmented Controls */}
                    <div className="flex items-center gap-2 flex-wrap">
                        <div className="inline-flex p-0.5 bg-zinc-100 rounded-xl border border-zinc-200/70">
                            <button
                                type="button"
                                onClick={() => {
                                    setPreviewScreen('form');
                                    previewScrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
                                }}
                                className={`px-3 py-1.5 rounded-lg text-xs transition-all cursor-pointer ${
                                    previewScreen === 'form'
                                        ? 'bg-white text-zinc-900 font-semibold shadow-2xs'
                                        : 'text-zinc-500 hover:text-zinc-900 font-medium'
                                }`}
                            >
                                Ficha
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    setPreviewScreen('confirmation');
                                    previewScrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
                                }}
                                className={`px-3 py-1.5 rounded-lg text-xs transition-all cursor-pointer ${
                                    previewScreen === 'confirmation'
                                        ? 'bg-white text-zinc-900 font-semibold shadow-2xs'
                                        : 'text-zinc-500 hover:text-zinc-900 font-medium'
                                }`}
                            >
                                Confirmação
                            </button>
                        </div>

                        <div className="hidden sm:inline-flex p-0.5 bg-zinc-100 rounded-xl border border-zinc-200/70">
                            <Tooltip content="Visualização Desktop">
                                <button
                                    type="button"
                                    onClick={() => setPreviewDevice('desktop')}
                                    className={`h-7 w-8 rounded-lg flex items-center justify-center transition-all cursor-pointer ${
                                        previewDevice === 'desktop'
                                            ? 'bg-white text-zinc-900 shadow-2xs'
                                            : 'text-zinc-500 hover:text-zinc-900'
                                    }`}
                                >
                                    <Monitor className="h-3.5 w-3.5" />
                                </button>
                            </Tooltip>
                            <Tooltip content="Visualização Celular">
                                <button
                                    type="button"
                                    onClick={() => setPreviewDevice('mobile')}
                                    className={`h-7 w-8 rounded-lg flex items-center justify-center transition-all cursor-pointer ${
                                        previewDevice === 'mobile'
                                            ? 'bg-white text-zinc-900 shadow-2xs'
                                            : 'text-zinc-500 hover:text-zinc-900'
                                    }`}
                                >
                                    <Smartphone className="h-3.5 w-3.5" />
                                </button>
                            </Tooltip>
                        </div>
                    </div>

                    {/* Right: Public link + Close */}
                    <div className="flex items-center gap-1.5 shrink-0">
                        {isEditing && previewFormModel.slug && (
                            <a
                                href={`/inscricao/${previewFormModel.slug}`}
                                target="_blank"
                                rel="noreferrer"
                                className="hidden md:inline-flex items-center gap-1.5 h-8 px-3 rounded-lg border border-zinc-200/90 bg-white hover:bg-zinc-50 text-xs font-medium text-zinc-600 hover:text-zinc-900 transition-colors"
                            >
                                <span>Abrir página</span>
                                <ExternalLink className="h-3 w-3" />
                            </a>
                        )}
                        <button
                            type="button"
                            onClick={() => setIsPreviewOpen(false)}
                            className="h-8 w-8 rounded-lg hover:bg-zinc-100 text-zinc-400 hover:text-zinc-700 flex items-center justify-center transition-colors cursor-pointer"
                            title="Fechar simulação"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    </div>
                </div>

                {/* Canvas Area matching PublicFormPage (#FAFAF9) */}
                <div className="flex-1 min-h-0 px-3 sm:px-8 py-4 sm:py-6 flex flex-col">
                    <div
                        className={`mx-auto w-full flex-1 min-h-0 flex flex-col transition-[max-width] duration-200 ease-out bg-[#FAFAF9] rounded-2xl border border-zinc-200/80 shadow-sm overflow-clip ${
                            previewDevice === 'mobile'
                                ? 'max-w-[400px]'
                                : 'max-w-3xl'
                        }`}
                    >
                        <FormBrandHeader embedded linkHome={false} />
                        <div
                            ref={previewScrollRef}
                            className={`relative flex-1 min-h-0 overflow-y-auto custom-scrollbar ${
                                previewDevice === 'mobile'
                                    ? 'p-3.5'
                                    : 'p-5 sm:p-8'
                            }`}
                        >
                            {previewScreen === 'form' ? (
                                <div className="space-y-6">
                                    <DynamicFormRenderer
                                        form={previewFormModel}
                                        previewMode={true}
                                        forceMobileLayout={previewDevice === 'mobile'}
                                        onSubmitAnswers={async () => {
                                            toast.success('Simulação concluída com sucesso!');
                                            setPreviewScreen('confirmation');
                                            previewScrollRef.current?.scrollTo({
                                                top: 0,
                                                behavior: 'smooth',
                                            });
                                        }}
                                    />

                                    <footer className="pt-4 pb-4 flex flex-col items-center gap-2 text-center">
                                        <img
                                            src={logo}
                                            alt="Brilha Mais"
                                            className="h-6 w-auto object-contain opacity-80"
                                        />
                                        <p className="text-xs text-zinc-400">
                                            Plataforma Brilha Mais · Ficha oficial de inscrição
                                        </p>
                                    </footer>
                                </div>
                            ) : (
                                <div className="min-h-full py-6 sm:py-10 flex items-center justify-center">
                                    <div className="max-w-lg w-full bg-white border border-zinc-200/80 rounded-2xl overflow-hidden shadow-sm">
                                        <div className="p-7 sm:p-8 space-y-5 text-center">
                                            <div className="w-14 h-14 rounded-2xl bg-emerald-50 border border-emerald-200/70 flex items-center justify-center mx-auto text-emerald-600">
                                                <CheckCircle2 className="h-7 w-7" />
                                            </div>
                                            <div className="space-y-2">
                                                <p className="text-xs font-medium text-zinc-500">
                                                    {previewFormModel.title}
                                                </p>
                                                <h2 className="text-2xl font-bold tracking-tight text-zinc-900">
                                                    {watchedValues.confirmationTitle?.trim() ||
                                                        'Inscrição recebida com sucesso!'}
                                                </h2>
                                            </div>
                                            {watchedValues.confirmationMessage?.trim() ? (
                                                <div className="bg-zinc-50/80 border border-zinc-200/70 rounded-xl p-4 text-left">
                                                    <RichTextRenderer
                                                        content={watchedValues.confirmationMessage}
                                                    />
                                                </div>
                                            ) : (
                                                <p className="text-sm text-zinc-500 leading-relaxed">
                                                    Sua inscrição foi registrada. Em caso de dúvidas, entre em contato com a coordenação do projeto Brilha Mais.
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </PortalModal>
        </>
    );
}

function ConditionEditor({
    label,
    condition,
    availableFields,
    onChange,
}: {
    label: string;
    condition: FormCondition | null;
    availableFields: FormFieldModel[];
    onChange: (next: FormCondition | null) => void;
}) {
    const enabled = Boolean(condition?.fieldKey);
    const selectedField = availableFields.find((f) => f.key === condition?.fieldKey);
    const fieldOptions = Array.isArray(selectedField?.options)
        ? selectedField!.options!
        : [];

    if (!enabled) {
        return (
            <button
                type="button"
                disabled={availableFields.length === 0}
                onClick={() => {
                    const first = availableFields[0];
                    if (!first) return;
                    onChange({
                        fieldKey: first.key,
                        operator: 'EQUALS',
                        value: first.options?.[0] || '',
                    });
                }}
                className="text-xs font-semibold text-slate-500 hover:text-amber-700 inline-flex text-left items-start sm:items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed transition-colors py-1"
            >
                <GitBranch className="h-3.5 w-3.5 text-amber-500 shrink-0 mt-0.5 sm:mt-0" />
                <span>
                    {availableFields.length === 0
                        ? `${label}: Adicione perguntas de múltipla escolha para habilitar lógica condicional`
                        : `+ Adicionar regra condicional de exibição`}
                </span>
            </button>
        );
    }

    return (
        <div className="rounded-xl bg-amber-50/40 border border-amber-200/70 p-3.5 space-y-2.5">
            <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 text-xs font-bold text-amber-900">
                    <GitBranch className="h-3.5 w-3.5 text-amber-600" />
                    <span>{label}</span>
                </div>
                <button
                    type="button"
                    onClick={() => onChange(null)}
                    className="text-xs font-semibold text-slate-500 hover:text-red-600 transition-colors"
                >
                    Remover regra
                </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <select
                    value={condition?.fieldKey || ''}
                    onChange={(e) => {
                        const target = availableFields.find(
                            (f) => f.key === e.target.value,
                        );
                        onChange({
                            fieldKey: e.target.value,
                            operator: condition?.operator || 'EQUALS',
                            value: target?.options?.[0] || '',
                        });
                    }}
                    className="h-9 px-3 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-800 focus:outline-none focus:border-[#F19B0A]"
                >
                    {availableFields.map((f) => (
                        <option key={f.key} value={f.key}>
                            {f.label}
                        </option>
                    ))}
                </select>

                <select
                    value={condition?.operator || 'EQUALS'}
                    onChange={(e) =>
                        onChange({
                            fieldKey: condition!.fieldKey,
                            operator: e.target.value as ConditionOperator,
                            value: condition?.value || '',
                        })
                    }
                    className="h-9 px-3 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-800 focus:outline-none focus:border-[#F19B0A]"
                >
                    <option value="EQUALS">For igual a</option>
                    <option value="NOT_EQUALS">For diferente de</option>
                    <option value="INCLUDES">Contiver o texto</option>
                </select>

                {fieldOptions.length > 0 ? (
                    <select
                        value={condition?.value || ''}
                        onChange={(e) =>
                            onChange({
                                fieldKey: condition!.fieldKey,
                                operator: condition?.operator || 'EQUALS',
                                value: e.target.value,
                            })
                        }
                        className="h-9 px-3 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-800 focus:outline-none focus:border-[#F19B0A]"
                    >
                        {fieldOptions.map((opt) => (
                            <option key={opt} value={opt}>
                                {opt}
                            </option>
                        ))}
                    </select>
                ) : (
                    <input
                        type="text"
                        value={condition?.value || ''}
                        onChange={(e) =>
                            onChange({
                                fieldKey: condition!.fieldKey,
                                operator: condition?.operator || 'EQUALS',
                                value: e.target.value,
                            })
                        }
                        placeholder="Valor esperado"
                        className="h-9 px-3 rounded-lg border border-slate-200 bg-white text-xs font-medium text-slate-800 focus:outline-none focus:border-[#F19B0A]"
                    />
                )}
            </div>
        </div>
    );
}

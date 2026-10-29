import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    LucideUpload,
    LucideTrash2,
    LucideFileText,
    LucideDownload,
    LucideShieldCheck,
    LucideAlertCircle,
    LucideCheck,
    LucideX,
    LucideLoader2,
    LucideEye,
    LucideChevronDown
} from 'lucide-react';
import api from '../utils/api';
import toast from 'react-hot-toast';
import Skeleton from '../components/Skeleton';
import { formatPhoneMask } from '../utils/formatters';

interface TalentProfileData {
    id?: string;
    phone?: string;
    birthDate?: string;
    city?: string;
    state?: string;
    headline?: string;
    bio?: string;
    areasOfInterest: string[];
    availability?: string;
    linkedinUrl?: string;
    resumeUrl?: string;
    resumeFileName?: string;
    resumeFileSize?: string;
    resumeUpdatedAt?: string;
    isAvailable: boolean;
    lgpdConsent: boolean;
    lgpdConsentAt?: string;
    isMinor: boolean;
    parentName?: string;
    parentContact?: string;
    parentConsent: boolean;
    parentDocumentUrl?: string;
    parentDocumentFileName?: string;
    minorApproved?: boolean;
    minorApprovedAt?: string;
    user?: {
        name?: string;
        email?: string;
        avatarUrl?: string;
        turmas?: { id: string; name: string }[];
    };
}


interface Option {
    value: string;
    label: string;
}

function FormDropdown({
    label,
    value,
    onChange,
    options,
    placeholder = "Selecione..."
}: {
    label: string;
    value: string;
    onChange: (val: string) => void;
    options: Option[];
    placeholder?: string;
}) {
    const [isOpen, setIsOpen] = useState(false);
    const selectedOption = options.find(o => o.value === value);

    return (
        <div className="relative">
            <label className="block text-xs font-medium text-zinc-700 mb-1.5">
                {label}
            </label>
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className={`h-10 w-full bg-white border rounded-xl px-3.5 text-left transition-colors flex items-center justify-between outline-none focus:outline-none focus-visible:outline-none focus:ring-1 focus:ring-amber-500 select-none cursor-pointer ${
                    isOpen
                        ? 'border-amber-500 ring-1 ring-amber-500'
                        : 'border-zinc-200/80 hover:border-zinc-300'
                }`}
            >
                <span className={`text-xs sm:text-sm truncate ${selectedOption ? 'text-zinc-900' : 'text-zinc-400'}`}>
                    {selectedOption ? selectedOption.label : placeholder}
                </span>
                <LucideChevronDown className={`h-4 w-4 text-zinc-400 shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180 text-zinc-700' : ''}`} />
            </button>

            <AnimatePresence>
                {isOpen && (
                    <>
                        <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
                        <motion.div
                            initial={{ opacity: 0, y: 4, scale: 0.98 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 4, scale: 0.98 }}
                            transition={{ duration: 0.12 }}
                            className="absolute top-full left-0 right-0 mt-1.5 bg-white border border-zinc-200/90 rounded-xl shadow-lg z-50 p-1 flex flex-col gap-0.5 overflow-hidden"
                        >
                            <div className="max-h-60 overflow-y-auto custom-scrollbar flex flex-col">
                                {options.map(opt => {
                                    const isSelected = value === opt.value;
                                    return (
                                        <button
                                            key={opt.value}
                                            type="button"
                                            onClick={() => {
                                                onChange(opt.value);
                                                setIsOpen(false);
                                            }}
                                            className={`w-full px-3 py-2 rounded-lg text-left text-xs sm:text-sm font-medium transition-colors flex items-center justify-between cursor-pointer ${
                                                isSelected
                                                    ? 'bg-amber-50 text-amber-800 font-semibold'
                                                    : 'text-zinc-700 hover:bg-zinc-50 hover:text-zinc-900'
                                            }`}
                                        >
                                            <span>{opt.label}</span>
                                            {isSelected && <LucideCheck className="h-3.5 w-3.5 text-amber-600 shrink-0 ml-1" />}
                                        </button>
                                    );
                                })}
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </div>
    );
}

const availabilityOptions = [
    { value: 'MANHA', label: 'Manhã' },
    { value: 'TARDE', label: 'Tarde' },
    { value: 'NOITE', label: 'Noite' },
    { value: 'INTEGRAL', label: 'Período Integral' },
    { value: 'FLEXIVEL', label: 'Horário Flexível' },
];

export default function StudentResumePage() {
    const [profile, setProfile] = useState<TalentProfileData>({
        areasOfInterest: [],
        isAvailable: true,
        lgpdConsent: false,
        isMinor: false,
        parentConsent: false,
    });
    const [initialProfile, setInitialProfile] = useState<TalentProfileData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [isDeletingResume, setIsDeletingResume] = useState(false);
    const [tagInput, setTagInput] = useState('');

    useEffect(() => {
        fetchProfile();
    }, []);

    const fetchProfile = async () => {
        try {
            setIsLoading(true);
            const { data } = await api.get('/talents/me');
            const formatted: TalentProfileData = {
                ...data,
                phone: formatPhoneMask(data.phone || ''),
                parentContact: formatPhoneMask(data.parentContact || ''),
                areasOfInterest: Array.isArray(data.areasOfInterest) ? data.areasOfInterest : [],
                birthDate: data.birthDate ? data.birthDate.split('T')[0] : '',
                city: data.city || '',
                state: data.state || '',
                headline: data.headline || '',
                bio: data.bio || '',
                availability: data.availability || '',
                linkedinUrl: data.linkedinUrl || '',
                parentName: data.parentName || '',
                isAvailable: Boolean(data.isAvailable ?? true),
                lgpdConsent: Boolean(data.lgpdConsent),
                isMinor: Boolean(data.isMinor),
                parentConsent: Boolean(data.parentConsent),
            };
            setProfile(formatted);
            setInitialProfile(formatted);
        } catch (error) {
            console.error('Erro ao buscar perfil de talentos:', error);
            toast.error('Erro ao carregar dados do currículo.');
        } finally {
            setIsLoading(false);
        }
    };

    const hasChanges = useMemo(() => {
        if (!initialProfile) return false;

        const normStr = (val?: string | null) => (val || '').trim();
        const arraysEqual = (a: string[] = [], b: string[] = []) => {
            if (a.length !== b.length) return false;
            const sortedA = [...a].sort();
            const sortedB = [...b].sort();
            return sortedA.every((val, index) => val === sortedB[index]);
        };

        if (normStr(profile.phone) !== normStr(initialProfile.phone)) return true;
        if (normStr(profile.birthDate) !== normStr(initialProfile.birthDate)) return true;
        if (normStr(profile.city) !== normStr(initialProfile.city)) return true;
        if (normStr(profile.state) !== normStr(initialProfile.state)) return true;
        if (normStr(profile.headline) !== normStr(initialProfile.headline)) return true;
        if (normStr(profile.bio) !== normStr(initialProfile.bio)) return true;
        if (normStr(profile.availability) !== normStr(initialProfile.availability)) return true;
        if (normStr(profile.linkedinUrl) !== normStr(initialProfile.linkedinUrl)) return true;
        if (Boolean(profile.isAvailable) !== Boolean(initialProfile.isAvailable)) return true;
        if (Boolean(profile.lgpdConsent) !== Boolean(initialProfile.lgpdConsent)) return true;
        if (Boolean(profile.isMinor) !== Boolean(initialProfile.isMinor)) return true;
        if (normStr(profile.parentName) !== normStr(initialProfile.parentName)) return true;
        if (normStr(profile.parentContact) !== normStr(initialProfile.parentContact)) return true;
        if (Boolean(profile.parentConsent) !== Boolean(initialProfile.parentConsent)) return true;
        if (!arraysEqual(profile.areasOfInterest, initialProfile.areasOfInterest)) return true;

        return false;
    }, [profile, initialProfile]);

    const handleBirthDateChange = (dateStr: string) => {
        let isMinor = false;
        if (dateStr) {
            const birth = new Date(dateStr);
            const today = new Date();
            let age = today.getFullYear() - birth.getFullYear();
            const m = today.getMonth() - birth.getMonth();
            if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
                age--;
            }
            if (age < 18) {
                isMinor = true;
            }
        }
        setProfile(prev => ({
            ...prev,
            birthDate: dateStr,
            isMinor,
            parentConsent: isMinor ? prev.parentConsent : true,
        }));
    };

    const handleAddTag = (e?: React.KeyboardEvent | React.MouseEvent) => {
        if (e && 'key' in e && e.key !== 'Enter') return;
        if (e) e.preventDefault();
        const trimmed = tagInput.trim();
        if (!trimmed) return;
        if (!profile.areasOfInterest.includes(trimmed)) {
            setProfile(prev => ({
                ...prev,
                areasOfInterest: [...prev.areasOfInterest, trimmed]
            }));
        }
        setTagInput('');
    };

    const handleRemoveTag = (tagToRemove: string) => {
        setProfile(prev => ({
            ...prev,
            areasOfInterest: prev.areasOfInterest.filter(t => t !== tagToRemove)
        }));
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const validExtensions = ['.pdf', '.doc', '.docx'];
        const fileNameLower = file.name.toLowerCase();
        const hasValidExt = validExtensions.some(ext => fileNameLower.endsWith(ext));
        if (!hasValidExt) {
            toast.error('Formato inválido. Por favor, envie em PDF ou Word (.docx, .doc).');
            return;
        }

        if (file.size > 10 * 1024 * 1024) {
            toast.error('O arquivo é muito grande. O limite máximo é 10MB.');
            return;
        }

        setIsUploading(true);
        const formData = new FormData();
        formData.append('file', file);

        try {
            const { data: uploadRes } = await api.post('/upload', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            const fileSizeFormatted = `${(file.size / 1024).toFixed(1)} KB`;

            const { data: updatedProfile } = await api.post('/talents/me/resume', {
                resumeUrl: uploadRes.url,
                resumeFileName: file.name,
                resumeFileSize: fileSizeFormatted,
            });

            setProfile(prev => ({
                ...prev,
                resumeUrl: updatedProfile.resumeUrl,
                resumeFileName: updatedProfile.resumeFileName,
                resumeFileSize: updatedProfile.resumeFileSize,
                resumeUpdatedAt: updatedProfile.resumeUpdatedAt,
            }));

            toast.success('Currículo enviado com sucesso!');
        } catch (error) {
            console.error('Erro no upload de currículo:', error);
            toast.error('Falha ao enviar arquivo. Tente novamente.');
        } finally {
            setIsUploading(false);
            e.target.value = '';
        }
    };

    const handleRemoveResume = async () => {
        setIsDeletingResume(true);
        try {
            await api.delete('/talents/me/resume');
            setProfile(prev => ({
                ...prev,
                resumeUrl: undefined,
                resumeFileName: undefined,
                resumeFileSize: undefined,
                resumeUpdatedAt: undefined,
            }));
            toast.success('Currículo removido com sucesso!');
        } catch (error) {
            console.error('Erro ao remover currículo:', error);
            toast.error('Erro ao remover arquivo.');
        } finally {
            setIsDeletingResume(false);
        }
    };

    const handleSaveProfile = async (e: React.FormEvent) => {
        e.preventDefault();

        if (profile.isMinor && profile.lgpdConsent) {
            if (!profile.parentName?.trim() || !profile.parentContact?.trim() || !profile.parentConsent) {
                toast.error('Como você é menor de 18 anos, é necessário preencher o nome e contato do responsável legal e confirmar a autorização.');
                return;
            }
        }

        setIsSaving(true);
        try {
            await api.put('/talents/me', {
                phone: profile.phone,
                birthDate: profile.birthDate ? profile.birthDate : undefined,
                city: profile.city,
                state: profile.state,
                headline: profile.headline,
                bio: profile.bio,
                areasOfInterest: profile.areasOfInterest,
                availability: profile.availability,
                linkedinUrl: profile.linkedinUrl,
                isAvailable: profile.isAvailable,
                lgpdConsent: profile.lgpdConsent,
                isMinor: profile.isMinor,
                parentName: profile.parentName,
                parentContact: profile.parentContact,
                parentConsent: profile.parentConsent,
            });
            setInitialProfile({ ...profile });
            toast.success('Perfil atualizado com sucesso!');
        } catch (error) {
            console.error('Erro ao salvar dados:', error);
            toast.error('Erro ao salvar informações.');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="space-y-8 w-full pb-10">
            {/* Header Padronizado */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-900">
                        Meu Currículo
                    </h1>
                    <p className="text-sm text-zinc-500 mt-1">
                        Mantenha seu currículo e dados profissionais atualizados para vagas e oportunidades.
                    </p>
                </div>

                {/* Status Toggle Card */}
                {isLoading ? (
                    <Skeleton className="h-10 w-48 shrink-0" variant="rounded" />
                ) : (
                    <div className="flex items-center gap-3 bg-white border border-zinc-200/80 px-3.5 py-2 rounded-xl shadow-2xs shrink-0 self-start sm:self-auto">
                        <span className="text-xs font-medium text-zinc-700">
                            {profile.isAvailable ? 'Disponível para vagas' : 'Oculto para vagas'}
                        </span>
                        <button
                            type="button"
                            onClick={() => setProfile(p => ({ ...p, isAvailable: !p.isAvailable }))}
                            className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                                profile.isAvailable ? 'bg-[#F19B0A]' : 'bg-zinc-200'
                            }`}
                        >
                            <span
                                className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-xs ring-0 transition duration-200 ease-in-out ${
                                    profile.isAvailable ? 'translate-x-4' : 'translate-x-0'
                                }`}
                            />
                        </button>
                    </div>
                )}
            </div>

            {isLoading ? (
                <div className="space-y-6">
                    <div className="bg-white border border-zinc-200/80 rounded-2xl p-6 shadow-2xs space-y-4">
                        <Skeleton className="h-5 w-40" variant="rectangle" />
                        <Skeleton className="h-20 w-full" variant="rounded" />
                    </div>

                    <div className="bg-white border border-zinc-200/80 rounded-2xl p-6 shadow-2xs space-y-6">
                        <Skeleton className="h-5 w-52" variant="rectangle" />
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                            {[...Array(6)].map((_, i) => (
                                <div key={i} className="space-y-1.5">
                                    <Skeleton className="h-3 w-28" variant="rectangle" />
                                    <Skeleton className="h-10 w-full" variant="rounded" />
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="bg-white border border-zinc-200/80 rounded-2xl p-6 shadow-2xs space-y-4">
                        <Skeleton className="h-5 w-48" variant="rectangle" />
                        <Skeleton className="h-16 w-full" variant="rounded" />
                    </div>
                </div>
            ) : (
                <form onSubmit={handleSaveProfile} className="space-y-6">
                    {/* Alerta de Status de Menor de Idade */}
                    {profile.isMinor && (
                        profile.minorApproved ? (
                            <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200/80 flex items-start gap-3.5 shadow-2xs">
                                <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                                    <LucideCheck className="w-5 h-5 text-emerald-700" />
                                </div>
                                <div className="text-xs text-emerald-950 leading-relaxed">
                                    <p className="font-semibold text-sm text-emerald-900">
                                        Autorização Parental Validada pela Coordenação
                                    </p>
                                    <p className="mt-0.5 text-emerald-800">
                                        O termo assinado pelos seus pais/responsáveis foi validado pela equipe do Projeto Brilha Mais. Seu currículo está liberado para encaminhamento e processos seletivos com empresas parceiras.
                                    </p>
                                </div>
                            </div>
                        ) : (
                            <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200/80 flex items-start gap-3.5 shadow-2xs">
                                <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                                    <LucideAlertCircle className="w-5 h-5 text-amber-700" />
                                </div>
                                <div className="text-xs text-amber-950 leading-relaxed">
                                    <p className="font-semibold text-sm text-amber-900">
                                        Aguardando Validação da Coordenação (Menor de 18 anos)
                                    </p>
                                    <p className="mt-0.5 text-amber-800">
                                        Seu currículo e informações estão salvos. Por você ter menos de 18 anos, a coordenação irá conferir internamente o termo assinado pelos seus responsáveis desde o início das aulas para liberar seu perfil para o encaminhamento a vagas.
                                    </p>
                                </div>
                            </div>
                        )
                    )}

                    {/* 1. Card: Arquivo do Currículo */}
                    <div className="bg-white border border-zinc-200/80 rounded-2xl p-6 shadow-2xs space-y-5">
                        <div className="flex items-center gap-3 pb-4 border-b border-zinc-100">
                            <div className="w-9 h-9 rounded-xl bg-amber-50 border border-amber-200/60 flex items-center justify-center text-amber-600 shrink-0">
                                <LucideFileText className="w-4 h-4" />
                            </div>
                            <div>
                                <h2 className="text-base font-semibold text-zinc-900 leading-tight">
                                    Arquivo do Currículo
                                </h2>
                                <p className="text-xs text-zinc-500 mt-0.5">
                                    Envie seu currículo formatado em PDF ou Word (até 10MB)
                                </p>
                            </div>
                        </div>

                        {profile.resumeUrl ? (
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-zinc-50/60 border border-zinc-200/70">
                                <div className="flex items-center gap-3 min-w-0">
                                    <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200/60 flex items-center justify-center text-[#F19B0A] shrink-0 shadow-2xs">
                                        <LucideFileText className="w-5 h-5" />
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-sm font-semibold text-zinc-900 truncate">
                                            {profile.resumeFileName || 'Meu Curriculo.pdf'}
                                        </p>
                                        <p className="text-xs text-zinc-500 mt-0.5">
                                            {profile.resumeFileSize ? `${profile.resumeFileSize} • ` : ''}
                                            {profile.resumeUpdatedAt
                                                ? `Atualizado em ${new Date(profile.resumeUpdatedAt).toLocaleDateString('pt-BR')}`
                                                : 'Pronto para encaminhamento'}
                                        </p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                                    <a
                                        href={profile.resumeUrl}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="h-9 px-3 rounded-lg text-xs font-medium text-zinc-700 hover:text-zinc-900 bg-white hover:bg-zinc-50 border border-zinc-200/80 transition-colors shadow-2xs inline-flex items-center gap-1.5"
                                    >
                                        <LucideEye className="w-3.5 h-3.5 text-zinc-500" />
                                        Visualizar
                                    </a>

                                    <label className="h-9 px-3 rounded-lg text-xs font-medium text-zinc-700 hover:text-zinc-900 bg-white hover:bg-zinc-50 border border-zinc-200/80 transition-colors shadow-2xs inline-flex items-center gap-1.5 cursor-pointer">
                                        <LucideUpload className="w-3.5 h-3.5 text-zinc-500" />
                                        {isUploading ? 'Enviando...' : 'Substituir'}
                                        <input
                                            type="file"
                                            accept=".pdf,.doc,.docx"
                                            onChange={handleFileUpload}
                                            disabled={isUploading}
                                            className="hidden"
                                        />
                                    </label>

                                    <button
                                        type="button"
                                        onClick={handleRemoveResume}
                                        disabled={isDeletingResume}
                                        className="p-2 rounded-lg text-zinc-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                                        title="Remover currículo"
                                    >
                                        <LucideTrash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <label className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-zinc-200 hover:border-amber-400/80 rounded-2xl bg-zinc-50/50 hover:bg-amber-50/20 cursor-pointer transition-all text-center">
                                <div className="w-10 h-10 rounded-xl bg-white border border-zinc-200/80 flex items-center justify-center text-zinc-500 mb-2.5 shadow-2xs">
                                    {isUploading ? (
                                        <LucideLoader2 className="w-5 h-5 animate-spin text-[#F19B0A]" />
                                    ) : (
                                        <LucideUpload className="w-5 h-5" />
                                    )}
                                </div>
                                <p className="text-xs font-semibold text-zinc-800">
                                    {isUploading ? 'Enviando arquivo...' : 'Clique para selecionar seu currículo'}
                                </p>
                                <p className="text-[11px] text-zinc-400 mt-0.5">
                                    Formatos aceitos: PDF, DOC ou DOCX (até 10MB)
                                </p>
                                <input
                                    type="file"
                                    accept=".pdf,.doc,.docx"
                                    onChange={handleFileUpload}
                                    disabled={isUploading}
                                    className="hidden"
                                />
                            </label>
                        )}
                    </div>

                    {/* 2. Card: Informações Profissionais e Contato */}
                    <div className="bg-white border border-zinc-200/80 rounded-2xl p-6 shadow-2xs space-y-6">
                        <div className="flex items-center gap-3 pb-4 border-b border-zinc-100">
                            <div className="w-9 h-9 rounded-xl bg-amber-50 border border-amber-200/60 flex items-center justify-center text-amber-600 shrink-0">
                                <LucideFileText className="w-4 h-4" />
                            </div>
                            <div>
                                <h2 className="text-base font-semibold text-zinc-900 leading-tight">
                                    Dados Profissionais e Contato
                                </h2>
                                <p className="text-xs text-zinc-500 mt-0.5">
                                    Informações que auxiliam o RH das empresas parceiras a entrar em contato
                                </p>
                            </div>
                        </div>

                        {/* Grid de 3 Colunas */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                            <div>
                                <label className="block text-xs font-medium text-zinc-700 mb-1.5">
                                    WhatsApp / Telefone
                                </label>
                                <input
                                    type="tel"
                                    maxLength={15}
                                    placeholder="(11) 98765-4321"
                                    value={profile.phone || ''}
                                    onChange={e => setProfile(p => ({ ...p, phone: formatPhoneMask(e.target.value) }))}
                                    className="h-10 w-full bg-white border border-zinc-200/80 rounded-xl px-3.5 text-xs sm:text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none transition-colors"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-medium text-zinc-700 mb-1.5">
                                    Data de Nascimento
                                </label>
                                <input
                                    type="date"
                                    value={profile.birthDate || ''}
                                    onChange={e => handleBirthDateChange(e.target.value)}
                                    className="h-10 w-full bg-white border border-zinc-200/80 rounded-xl px-3.5 text-xs sm:text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none transition-colors"
                                />
                            </div>

                            <FormDropdown
                                label="Disponibilidade de Horário"
                                value={profile.availability || ''}
                                onChange={(val) => setProfile(p => ({ ...p, availability: val }))}
                                options={availabilityOptions}
                                placeholder="Selecione..."
                            />

                            <div>
                                <label className="block text-xs font-medium text-zinc-700 mb-1.5">
                                    Cidade
                                </label>
                                <input
                                    type="text"
                                    placeholder="Ex: São Paulo, Piracicaba..."
                                    value={profile.city || ''}
                                    onChange={e => setProfile(p => ({ ...p, city: e.target.value }))}
                                    className="h-10 w-full bg-white border border-zinc-200/80 rounded-xl px-3.5 text-xs sm:text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none transition-colors"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-medium text-zinc-700 mb-1.5">
                                    Estado (UF)
                                </label>
                                <input
                                    type="text"
                                    maxLength={2}
                                    placeholder="SP"
                                    value={profile.state || ''}
                                    onChange={e => setProfile(p => ({ ...p, state: e.target.value.toUpperCase() }))}
                                    className="h-10 w-full bg-white border border-zinc-200/80 rounded-xl px-3.5 text-xs sm:text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none transition-colors"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-medium text-zinc-700 mb-1.5">
                                    LinkedIn (opcional)
                                </label>
                                <input
                                    type="url"
                                    placeholder="https://linkedin.com/in/seu-perfil"
                                    value={profile.linkedinUrl || ''}
                                    onChange={e => setProfile(p => ({ ...p, linkedinUrl: e.target.value }))}
                                    className="h-10 w-full bg-white border border-zinc-200/80 rounded-xl px-3.5 text-xs sm:text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none transition-colors"
                                />
                            </div>
                        </div>

                        {/* Objetivo Profissional */}
                        <div>
                            <label className="block text-xs font-medium text-zinc-700 mb-1.5">
                                Objetivo Profissional / Cargo Pretendido
                            </label>
                            <input
                                type="text"
                                placeholder="Ex: Jovem Aprendiz Administrativo, Auxiliar de Atendimento, Auxiliar de TI..."
                                value={profile.headline || ''}
                                onChange={e => setProfile(p => ({ ...p, headline: e.target.value }))}
                                className="h-10 w-full bg-white border border-zinc-200/80 rounded-xl px-3.5 text-xs sm:text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none transition-colors"
                            />
                        </div>

                        {/* Áreas de Interesse (Tags Livres com Input Integrado) */}
                        <div className="space-y-2">
                            <label className="block text-xs font-medium text-zinc-700">
                                Áreas de Interesse
                            </label>
                            <div className="relative">
                                <input
                                    type="text"
                                    placeholder="Digite uma área (ex: Recepção, Vendas, Programação) e pressione Enter..."
                                    value={tagInput}
                                    onChange={e => setTagInput(e.target.value)}
                                    onKeyDown={handleAddTag}
                                    className="w-full h-10 bg-white border border-zinc-200/80 rounded-xl pl-3.5 pr-24 text-xs sm:text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none transition-colors"
                                />
                                <button
                                    type="button"
                                    onClick={handleAddTag}
                                    className="absolute right-1.5 top-1/2 -translate-y-1/2 h-7 px-2.5 rounded-lg text-xs font-medium text-zinc-700 hover:text-zinc-900 bg-zinc-100 hover:bg-zinc-200/70 border border-zinc-200/60 transition-colors cursor-pointer"
                                >
                                    Adicionar
                                </button>
                            </div>

                            {profile.areasOfInterest.length > 0 && (
                                <div className="flex flex-wrap gap-1.5 pt-1">
                                    {profile.areasOfInterest.map((tag, idx) => (
                                        <span
                                            key={idx}
                                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-zinc-100 border border-zinc-200/60 text-zinc-800"
                                        >
                                            {tag}
                                            <button
                                                type="button"
                                                onClick={() => handleRemoveTag(tag)}
                                                className="text-zinc-400 hover:text-zinc-700 cursor-pointer"
                                            >
                                                <LucideX className="w-3.5 h-3.5" />
                                            </button>
                                        </span>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Sobre Mim */}
                        <div>
                            <label className="block text-xs font-medium text-zinc-700 mb-1.5">
                                Sobre Mim (Resumo de habilidades e perfil)
                            </label>
                            <textarea
                                rows={3}
                                placeholder="Conte um pouco sobre você, facilidade de aprendizado e pontos fortes..."
                                value={profile.bio || ''}
                                onChange={e => setProfile(p => ({ ...p, bio: e.target.value }))}
                                className="w-full bg-white border border-zinc-200/80 rounded-xl p-3.5 text-xs sm:text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none transition-colors resize-none leading-relaxed"
                            />
                        </div>
                    </div>

                    {/* 3. Card: Termo LGPD */}
                    <div className="bg-white border border-zinc-200/80 rounded-2xl p-6 shadow-2xs space-y-5">
                        <div className="flex items-center gap-3 pb-4 border-b border-zinc-100">
                            <div className="w-9 h-9 rounded-xl bg-amber-50 border border-amber-200/60 flex items-center justify-center text-amber-600 shrink-0">
                                <LucideShieldCheck className="w-4 h-4" />
                            </div>
                            <div>
                                <h2 className="text-base font-semibold text-zinc-900 leading-tight">
                                    Termo de Autorização e LGPD
                                </h2>
                                <p className="text-xs text-zinc-500 mt-0.5">
                                    Conformidade com a Lei Geral de Proteção de Dados (Lei nº 13.709/2018)
                                </p>
                            </div>
                        </div>

                        <div className="p-4 rounded-xl bg-zinc-50/70 border border-zinc-200/60 text-xs text-zinc-600 leading-relaxed space-y-1.5">
                            <p>
                                Ao autorizar, você permite que a coordenação do <strong>Projeto Brilha Mais</strong> compartilhe seu currículo e informações de contato profissional exclusivamente com empresas parceiras e conveniadas para fins de vagas de estágio, jovem aprendiz e contratação formal.
                            </p>
                            <p className="text-zinc-500">
                                Você pode revogar este consentimento ou pausar a visualização do seu currículo a qualquer momento neste painel.
                            </p>
                        </div>

                        {/* Checkbox LGPD Aluno */}
                        <label className="flex items-center gap-3 p-3.5 rounded-xl border border-zinc-200/80 bg-white hover:bg-zinc-50/60 transition-colors cursor-pointer select-none">
                            <input
                                type="checkbox"
                                checked={profile.lgpdConsent}
                                onChange={e => setProfile(p => ({ ...p, lgpdConsent: e.target.checked }))}
                                className="h-4 w-4 rounded border-zinc-300 text-amber-600 focus:ring-amber-500 shrink-0"
                            />
                            <div className="text-xs leading-normal">
                                <span className="font-medium text-zinc-900 block">
                                    Autorizo o Projeto Brilha Mais a compartilhar meu currículo e dados profissionais com empresas parceiras para fins de processos seletivos.
                                </span>
                                {profile.lgpdConsentAt && (
                                    <span className="text-[11px] font-normal text-emerald-600 mt-1 block">
                                        ✓ Consentimento registrado em {new Date(profile.lgpdConsentAt).toLocaleDateString('pt-BR')}
                                    </span>
                                )}
                            </div>
                        </label>

                        {/* Bloco Obrigatório se Menor de 18 Anos */}
                        {profile.isMinor && (
                            <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                className="pt-4 border-t border-zinc-100 space-y-4"
                            >
                                <div className="p-3.5 rounded-xl bg-amber-50/50 border border-amber-200/70 flex items-start gap-3">
                                    <LucideAlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                                    <div className="text-xs text-amber-900 leading-relaxed">
                                        <p className="font-semibold">Menor de 18 anos detectado</p>
                                        <p className="mt-0.5 text-amber-800">
                                            Nos termos do Art. 14 da LGPD, o encaminhamento de currículos de jovens menores de idade exige consentimento e ciência do responsável legal (pai, mãe ou tutor).
                                        </p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-medium text-zinc-700 mb-1.5">
                                            Nome completo do responsável legal *
                                        </label>
                                        <input
                                            type="text"
                                            placeholder="Nome do pai, mãe ou responsável"
                                            value={profile.parentName || ''}
                                            onChange={e => setProfile(p => ({ ...p, parentName: e.target.value }))}
                                            className="h-10 w-full bg-white border border-zinc-200/80 rounded-xl px-3.5 text-xs sm:text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none transition-colors"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-xs font-medium text-zinc-700 mb-1.5">
                                            Telefone ou contato do responsável *
                                        </label>
                                        <input
                                            type="tel"
                                            maxLength={15}
                                            placeholder="(11) 98765-4321"
                                            value={profile.parentContact || ''}
                                            onChange={e => setProfile(p => ({ ...p, parentContact: formatPhoneMask(e.target.value) }))}
                                            className="h-10 w-full bg-white border border-zinc-200/80 rounded-xl px-3.5 text-xs sm:text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none transition-colors"
                                        />
                                    </div>
                                </div>

                                <label className="flex items-center gap-3 p-3.5 rounded-xl border border-zinc-200/80 bg-white hover:bg-zinc-50/60 transition-colors cursor-pointer select-none">
                                    <input
                                        type="checkbox"
                                        checked={profile.parentConsent}
                                        onChange={e => setProfile(p => ({ ...p, parentConsent: e.target.checked }))}
                                        className="h-4 w-4 rounded border-zinc-300 text-amber-600 focus:ring-amber-500 shrink-0"
                                    />
                                    <span className="text-xs font-medium text-zinc-800 leading-normal">
                                        Declaro que meu responsável legal está ciente e autoriza o envio do meu currículo para empresas conveniadas.
                                    </span>
                                </label>

                                {profile.minorApproved ? (
                                    <div className="flex items-center gap-2 p-2.5 rounded-xl bg-emerald-50 border border-emerald-200/70 text-xs font-semibold text-emerald-800">
                                        <LucideCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                                        <span>Termo parental validado e currículo liberado pela coordenação</span>
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-2 p-2.5 rounded-xl bg-amber-50/70 border border-amber-200/70 text-xs text-amber-800">
                                        <LucideAlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                                        <span>Aguardando a coordenação conferir o termo assinado para liberação</span>
                                    </div>
                                )}
                            </motion.div>
                        )}
                    </div>

                    {/* Barra de Ação Inferior */}
                    <div className="flex items-center justify-end gap-3 pt-2">
                        <button
                            type="submit"
                            disabled={!hasChanges || isSaving}
                            className={`h-11 px-6 rounded-xl text-sm font-semibold transition-all flex items-center gap-2 ${
                                hasChanges && !isSaving
                                    ? 'bg-[#F19B0A] hover:bg-[#D98B08] active:scale-[0.98] text-white shadow-xs cursor-pointer'
                                    : 'bg-zinc-100 text-zinc-400 border border-zinc-200/80 cursor-not-allowed shadow-none'
                            }`}
                        >
                            {isSaving ? (
                                <>
                                    <LucideLoader2 className="w-4 h-4 animate-spin" />
                                    Salvando...
                                </>
                            ) : (
                                <>
                                    <LucideCheck className="w-4 h-4" />
                                    Salvar Currículo
                                </>
                            )}
                        </button>
                    </div>
                </form>
            )}
        </div>
    );
}

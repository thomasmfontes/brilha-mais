import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
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
    LucidePhone,
    LucideMapPin,
    LucideCalendar,
    LucideClock,
    LucideLinkedin,
    LucideBriefcase
} from 'lucide-react';
import api from '../utils/api';
import toast from 'react-hot-toast';
import Skeleton from '../components/Skeleton';

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
    user?: {
        name?: string;
        email?: string;
        avatarUrl?: string;
        turmas?: { id: string; name: string }[];
    };
}

export default function StudentResumePage() {
    const [profile, setProfile] = useState<TalentProfileData>({
        areasOfInterest: [],
        isAvailable: true,
        lgpdConsent: false,
        isMinor: false,
        parentConsent: false,
    });
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
            setProfile({
                ...data,
                areasOfInterest: Array.isArray(data.areasOfInterest) ? data.areasOfInterest : [],
                birthDate: data.birthDate ? data.birthDate.split('T')[0] : '',
            });
        } catch (error) {
            console.error('Erro ao buscar perfil de talentos:', error);
            toast.error('Erro ao carregar dados do currículo.');
        } finally {
            setIsLoading(false);
        }
    };

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
        if (!window.confirm('Tem certeza que deseja remover o seu currículo?')) return;
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
            toast.success('Currículo removido.');
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
            {/* Header com Mesma Estrutura de Divs das Demais Telas */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-900">
                        Meu currículo
                    </h1>
                    <p className="text-sm text-zinc-500 mt-1">
                        Mantenha seu currículo e dados profissionais atualizados para vagas e oportunidades.
                    </p>
                </div>

                {/* Status Toggle Card */}
                {isLoading ? (
                    <Skeleton className="h-10 w-44 shrink-0" variant="rounded" />
                ) : (
                    <div className="flex items-center gap-3 bg-white border border-zinc-200/80 px-4 py-2.5 rounded-xl shadow-xs shrink-0 self-start sm:self-auto">
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
                <div className="space-y-8">
                    {/* Card 1 Skeleton */}
                    <div className="bg-white border border-zinc-200/80 rounded-2xl p-6 shadow-xs space-y-4">
                        <div className="flex items-center gap-3 border-b border-zinc-100 pb-4">
                            <Skeleton className="w-9 h-9" variant="rounded" />
                            <div className="space-y-1.5 flex-1">
                                <Skeleton className="h-4 w-40" variant="rectangle" />
                                <Skeleton className="h-3 w-64" variant="rectangle" />
                            </div>
                        </div>
                        <Skeleton className="h-28 w-full" variant="rounded" />
                    </div>

                    {/* Card 2 Skeleton */}
                    <div className="bg-white border border-zinc-200/80 rounded-2xl p-6 shadow-xs space-y-6">
                        <div className="flex items-center gap-3 border-b border-zinc-100 pb-4">
                            <Skeleton className="w-9 h-9" variant="rounded" />
                            <div className="space-y-1.5 flex-1">
                                <Skeleton className="h-4 w-52" variant="rectangle" />
                                <Skeleton className="h-3 w-80" variant="rectangle" />
                            </div>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                            {[...Array(6)].map((_, i) => (
                                <div key={i} className="space-y-1.5">
                                    <Skeleton className="h-3 w-28" variant="rectangle" />
                                    <Skeleton className="h-10 w-full" variant="rounded" />
                                </div>
                            ))}
                        </div>
                        <div className="space-y-1.5">
                            <Skeleton className="h-3 w-40" variant="rectangle" />
                            <Skeleton className="h-10 w-full" variant="rounded" />
                        </div>
                        <div className="space-y-1.5">
                            <Skeleton className="h-3 w-32" variant="rectangle" />
                            <Skeleton className="h-20 w-full" variant="rounded" />
                        </div>
                    </div>

                    {/* Card 3 Skeleton */}
                    <div className="bg-white border border-zinc-200/80 rounded-2xl p-6 shadow-xs space-y-5">
                        <div className="flex items-center gap-3 border-b border-zinc-100 pb-4">
                            <Skeleton className="w-9 h-9" variant="rounded" />
                            <div className="space-y-1.5 flex-1">
                                <Skeleton className="h-4 w-48" variant="rectangle" />
                                <Skeleton className="h-3 w-72" variant="rectangle" />
                            </div>
                        </div>
                        <Skeleton className="h-16 w-full" variant="rounded" />
                        <Skeleton className="h-5 w-80" variant="rectangle" />
                    </div>
                </div>
            ) : (
                <>
            {/* 1. Card: Arquivo do Currículo */}
            <div className="bg-white border border-zinc-200/80 rounded-2xl p-6 shadow-xs space-y-4">
                <div className="flex items-center gap-3 border-b border-zinc-100 pb-4">
                    <div className="w-9 h-9 rounded-lg bg-zinc-50 border border-zinc-100 flex items-center justify-center text-zinc-700 shrink-0">
                        <LucideFileText className="w-4 h-4" />
                    </div>
                    <div>
                        <h2 className="text-base font-semibold text-zinc-900">Arquivo do currículo</h2>
                        <p className="text-xs text-zinc-500">Envie seu currículo formatado em PDF ou Word (até 10MB)</p>
                    </div>
                </div>

                {profile.resumeUrl ? (
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-zinc-50/70 border border-zinc-200/70">
                        <div className="flex items-center gap-3 min-w-0">
                            <div className="w-9 h-9 rounded-lg bg-white border border-zinc-200 flex items-center justify-center text-[#F19B0A] shrink-0">
                                <LucideFileText className="w-4 h-4" />
                            </div>
                            <div className="min-w-0">
                                <p className="text-sm font-semibold text-zinc-900 truncate">
                                    {profile.resumeFileName || 'Meu Curriculo.pdf'}
                                </p>
                                <p className="text-xs text-zinc-500">
                                    {profile.resumeFileSize ? `${profile.resumeFileSize} • ` : ''}
                                    {profile.resumeUpdatedAt
                                        ? `Atualizado em ${new Date(profile.resumeUpdatedAt).toLocaleDateString('pt-BR')}`
                                        : 'Currículo pronto para envio'}
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                            <a
                                href={profile.resumeUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-white border border-zinc-200/80 text-zinc-700 hover:bg-zinc-50 hover:text-zinc-900 transition-all shadow-xs active:scale-[0.98]"
                            >
                                <LucideDownload className="w-3.5 h-3.5" />
                                Visualizar
                            </a>

                            <label className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-[#F19B0A] hover:bg-[#D98B08] text-white transition-all cursor-pointer shadow-xs active:scale-[0.98]">
                                <LucideUpload className="w-3.5 h-3.5" />
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
                                className="p-2 rounded-xl text-zinc-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                                title="Remover currículo"
                            >
                                <LucideTrash2 className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                ) : (
                    <label className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-zinc-200 hover:border-[#F19B0A]/60 rounded-2xl bg-zinc-50/50 hover:bg-amber-50/10 cursor-pointer transition-all duration-200 text-center">
                        <div className="w-10 h-10 rounded-lg bg-zinc-100 text-zinc-600 flex items-center justify-center mb-3">
                            {isUploading ? (
                                <LucideLoader2 className="w-5 h-5 animate-spin text-[#F19B0A]" />
                            ) : (
                                <LucideUpload className="w-5 h-5" />
                            )}
                        </div>
                        <p className="text-sm font-semibold text-zinc-900">
                            {isUploading ? 'Enviando arquivo...' : 'Clique para selecionar seu currículo'}
                        </p>
                        <p className="text-xs text-zinc-500 mt-1">Formatos aceitos: PDF, DOC ou DOCX (até 10MB)</p>
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

            {/* Form de Dados Profissionais & LGPD */}
            <form onSubmit={handleSaveProfile} className="space-y-8">
                {/* 2. Card: Informações Profissionais e Contato */}
                <div className="bg-white border border-zinc-200/80 rounded-2xl p-6 shadow-xs space-y-6">
                    <div className="flex items-center gap-3 border-b border-zinc-100 pb-4">
                        <div className="w-9 h-9 rounded-lg bg-zinc-50 border border-zinc-100 flex items-center justify-center text-zinc-700 shrink-0">
                            <LucideBriefcase className="w-4 h-4" />
                        </div>
                        <div>
                            <h2 className="text-base font-semibold text-zinc-900">Dados profissionais e contato</h2>
                            <p className="text-xs text-zinc-500">Informações que auxiliam o RH das empresas parceiras a entrar em contato</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                        {/* WhatsApp */}
                        <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-zinc-700 flex items-center gap-1.5">
                                <LucidePhone className="w-3.5 h-3.5 text-zinc-400" />
                                WhatsApp / Telefone
                            </label>
                            <input
                                type="text"
                                placeholder="(11) 98765-4321"
                                value={profile.phone || ''}
                                onChange={e => setProfile(p => ({ ...p, phone: e.target.value }))}
                                className="w-full bg-white border border-zinc-200/80 rounded-xl px-3.5 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-[#F19B0A] focus:ring-2 focus:ring-[#F19B0A]/10 outline-none transition-all shadow-xs"
                            />
                        </div>

                        {/* Data de Nascimento */}
                        <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-zinc-700 flex items-center gap-1.5">
                                <LucideCalendar className="w-3.5 h-3.5 text-zinc-400" />
                                Data de nascimento
                            </label>
                            <input
                                type="date"
                                value={profile.birthDate || ''}
                                onChange={e => handleBirthDateChange(e.target.value)}
                                className="w-full bg-white border border-zinc-200/80 rounded-xl px-3.5 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-[#F19B0A] focus:ring-2 focus:ring-[#F19B0A]/10 outline-none transition-all shadow-xs"
                            />
                        </div>

                        {/* Disponibilidade */}
                        <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-zinc-700 flex items-center gap-1.5">
                                <LucideClock className="w-3.5 h-3.5 text-zinc-400" />
                                Disponibilidade de horário
                            </label>
                            <select
                                value={profile.availability || ''}
                                onChange={e => setProfile(p => ({ ...p, availability: e.target.value }))}
                                className="w-full bg-white border border-zinc-200/80 rounded-xl px-3.5 py-2.5 text-sm text-zinc-900 focus:border-[#F19B0A] focus:ring-2 focus:ring-[#F19B0A]/10 outline-none transition-all shadow-xs"
                            >
                                <option value="">Selecione...</option>
                                <option value="MANHA">Manhã</option>
                                <option value="TARDE">Tarde</option>
                                <option value="NOITE">Noite</option>
                                <option value="INTEGRAL">Período Integral</option>
                                <option value="FLEXIVEL">Horário Flexível</option>
                            </select>
                        </div>

                        {/* Cidade */}
                        <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-zinc-700 flex items-center gap-1.5">
                                <LucideMapPin className="w-3.5 h-3.5 text-zinc-400" />
                                Cidade
                            </label>
                            <input
                                type="text"
                                placeholder="Ex: Piracicaba, São Paulo..."
                                value={profile.city || ''}
                                onChange={e => setProfile(p => ({ ...p, city: e.target.value }))}
                                className="w-full bg-white border border-zinc-200/80 rounded-xl px-3.5 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-[#F19B0A] focus:ring-2 focus:ring-[#F19B0A]/10 outline-none transition-all shadow-xs"
                            />
                        </div>

                        {/* Estado / UF */}
                        <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-zinc-700">Estado (UF)</label>
                            <input
                                type="text"
                                maxLength={2}
                                placeholder="SP"
                                value={profile.state || ''}
                                onChange={e => setProfile(p => ({ ...p, state: e.target.value.toUpperCase() }))}
                                className="w-full bg-white border border-zinc-200/80 rounded-xl px-3.5 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-[#F19B0A] focus:ring-2 focus:ring-[#F19B0A]/10 outline-none transition-all shadow-xs"
                            />
                        </div>

                        {/* LinkedIn */}
                        <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-zinc-700 flex items-center gap-1.5">
                                <LucideLinkedin className="w-3.5 h-3.5 text-zinc-400" />
                                LinkedIn (opcional)
                            </label>
                            <input
                                type="url"
                                placeholder="https://linkedin.com/in/seu-perfil"
                                value={profile.linkedinUrl || ''}
                                onChange={e => setProfile(p => ({ ...p, linkedinUrl: e.target.value }))}
                                className="w-full bg-white border border-zinc-200/80 rounded-xl px-3.5 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-[#F19B0A] focus:ring-2 focus:ring-[#F19B0A]/10 outline-none transition-all shadow-xs"
                            />
                        </div>
                    </div>

                    {/* Objetivo Profissional */}
                    <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-zinc-700">
                            Objetivo profissional / cargo pretendido
                        </label>
                        <input
                            type="text"
                            placeholder="Ex: Jovem Aprendiz Administrativo, Auxiliar de Logística, Atendimento..."
                            value={profile.headline || ''}
                            onChange={e => setProfile(p => ({ ...p, headline: e.target.value }))}
                            className="w-full bg-white border border-zinc-200/80 rounded-xl px-3.5 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-[#F19B0A] focus:ring-2 focus:ring-[#F19B0A]/10 outline-none transition-all shadow-xs"
                        />
                    </div>

                    {/* Áreas de Interesse (Tags Livres) */}
                    <div className="space-y-2">
                        <label className="text-xs font-semibold text-zinc-700">
                            Áreas de interesse (digite e pressione Enter para adicionar)
                        </label>
                        <div className="flex gap-2">
                            <input
                                type="text"
                                placeholder="Ex: Recepção, Vendas, Programação, Financeiro..."
                                value={tagInput}
                                onChange={e => setTagInput(e.target.value)}
                                onKeyDown={handleAddTag}
                                className="flex-1 bg-white border border-zinc-200/80 rounded-xl px-3.5 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-[#F19B0A] focus:ring-2 focus:ring-[#F19B0A]/10 outline-none transition-all shadow-xs"
                            />
                            <button
                                type="button"
                                onClick={handleAddTag}
                                className="px-4 py-2.5 rounded-xl text-xs font-semibold bg-zinc-100 hover:bg-zinc-200 text-zinc-800 transition-colors shadow-2xs active:scale-[0.98]"
                            >
                                Adicionar
                            </button>
                        </div>

                        {profile.areasOfInterest.length > 0 && (
                            <div className="flex flex-wrap gap-2 pt-1">
                                {profile.areasOfInterest.map((tag, idx) => (
                                    <span
                                        key={idx}
                                        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium bg-zinc-100 border border-zinc-200/80 text-zinc-800"
                                    >
                                        {tag}
                                        <button
                                            type="button"
                                            onClick={() => handleRemoveTag(tag)}
                                            className="text-zinc-400 hover:text-zinc-700"
                                        >
                                            <LucideX className="w-3.5 h-3.5" />
                                        </button>
                                    </span>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Sobre Mim */}
                    <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-zinc-700">
                            Sobre mim (resumo de habilidades e objetivos)
                        </label>
                        <textarea
                            rows={3}
                            placeholder="Conte um pouco sobre suas habilidades, facilidade de aprendizado e experiências..."
                            value={profile.bio || ''}
                            onChange={e => setProfile(p => ({ ...p, bio: e.target.value }))}
                            className="w-full bg-white border border-zinc-200/80 rounded-xl px-3.5 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-[#F19B0A] focus:ring-2 focus:ring-[#F19B0A]/10 outline-none transition-all shadow-xs resize-y"
                        />
                    </div>
                </div>

                {/* 3. Card: Termo LGPD */}
                <div className="bg-white border border-zinc-200/80 rounded-2xl p-6 shadow-xs space-y-5">
                    <div className="flex items-center gap-3 border-b border-zinc-100 pb-4">
                        <div className="w-9 h-9 rounded-lg bg-zinc-50 border border-zinc-100 flex items-center justify-center text-zinc-700 shrink-0">
                            <LucideShieldCheck className="w-4 h-4" />
                        </div>
                        <div>
                            <h2 className="text-base font-semibold text-zinc-900">Termo de autorização e LGPD</h2>
                            <p className="text-xs text-zinc-500">Conformidade com a Lei Geral de Proteção de Dados (Lei nº 13.709/2018)</p>
                        </div>
                    </div>

                    <div className="p-4 rounded-xl bg-zinc-50/70 border border-zinc-200/60 text-xs text-zinc-600 leading-relaxed space-y-2">
                        <p>
                            Ao autorizar, você permite que a coordenação do <strong>Projeto Brilha Mais</strong> compartilhe seu currículo e informações de contato profissional exclusivamente com empresas parceiras e conveniadas para fins de vagas de estágio, jovem aprendiz e contratação formal.
                        </p>
                        <p className="text-zinc-500">
                            Você pode revogar este consentimento ou pausar a visualização do seu currículo a qualquer momento neste painel.
                        </p>
                    </div>

                    {/* Checkbox LGPD Aluno */}
                    <label className="flex items-start gap-3 cursor-pointer select-none">
                        <input
                            type="checkbox"
                            checked={profile.lgpdConsent}
                            onChange={e => setProfile(p => ({ ...p, lgpdConsent: e.target.checked }))}
                            className="mt-0.5 h-4 w-4 rounded border-zinc-300 text-[#F19B0A] focus:ring-[#F19B0A]"
                        />
                        <span className="text-xs font-medium text-zinc-800 leading-tight">
                            Autorizo o Projeto Brilha Mais a compartilhar meu currículo e dados profissionais com empresas parceiras para fins de processos seletivos.
                            {profile.lgpdConsentAt && (
                                <span className="block text-[11px] font-normal text-emerald-600 mt-0.5">
                                    ✓ Consentimento registrado em {new Date(profile.lgpdConsentAt).toLocaleDateString('pt-BR')}
                                </span>
                            )}
                        </span>
                    </label>

                    {/* Bloco Obrigatório se Menor de 18 Anos */}
                    {profile.isMinor && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            className="pt-4 border-t border-zinc-100 space-y-4"
                        >
                            <div className="p-3.5 rounded-xl bg-zinc-50 border border-zinc-200/80 flex items-start gap-3">
                                <LucideAlertCircle className="w-4 h-4 text-zinc-500 shrink-0 mt-0.5" />
                                <div className="text-xs text-zinc-600 leading-relaxed">
                                    <p className="font-semibold text-zinc-900">Menor de 18 anos:</p>
                                    <p className="mt-0.5">
                                        Nos termos do Art. 14 da LGPD, o encaminhamento de currículos de jovens menores de idade exige consentimento e ciência do responsável legal (pai, mãe ou tutor).
                                    </p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-xs font-semibold text-zinc-700">
                                        Nome completo do responsável legal *
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="Nome do pai, mãe ou responsável"
                                        value={profile.parentName || ''}
                                        onChange={e => setProfile(p => ({ ...p, parentName: e.target.value }))}
                                        className="w-full bg-white border border-zinc-200/80 rounded-xl px-3.5 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-[#F19B0A] focus:ring-2 focus:ring-[#F19B0A]/10 outline-none transition-all shadow-xs"
                                    />
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-xs font-semibold text-zinc-700">
                                        Telefone ou contato do responsável *
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="(11) 98765-4321"
                                        value={profile.parentContact || ''}
                                        onChange={e => setProfile(p => ({ ...p, parentContact: e.target.value }))}
                                        className="w-full bg-white border border-zinc-200/80 rounded-xl px-3.5 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-[#F19B0A] focus:ring-2 focus:ring-[#F19B0A]/10 outline-none transition-all shadow-xs"
                                    />
                                </div>
                            </div>

                            <label className="flex items-start gap-3 cursor-pointer select-none">
                                <input
                                    type="checkbox"
                                    checked={profile.parentConsent}
                                    onChange={e => setProfile(p => ({ ...p, parentConsent: e.target.checked }))}
                                    className="mt-0.5 h-4 w-4 rounded border-zinc-300 text-[#F19B0A] focus:ring-[#F19B0A]"
                                />
                                <span className="text-xs font-medium text-zinc-800 leading-tight">
                                    Declaro que meu responsável legal está ciente e autoriza o envio do meu currículo para empresas conveniadas.
                                </span>
                            </label>
                        </motion.div>
                    )}
                </div>

                {/* Barra de Ação Inferior */}
                <div className="flex justify-end gap-3 pt-2">
                    <button
                        type="submit"
                        disabled={isSaving}
                        className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold bg-[#F19B0A] hover:bg-[#D98B08] active:scale-[0.98] text-white shadow-xs transition-all disabled:opacity-50"
                    >
                        {isSaving ? (
                            <>
                                <LucideLoader2 className="w-4 h-4 animate-spin" />
                                Salvando...
                            </>
                        ) : (
                            <>
                                <LucideCheck className="w-4 h-4" />
                                Salvar currículo
                            </>
                        )}
                    </button>
                </div>
            </form>
                </>
            )}
        </div>
    );
}

import React, { useState, useEffect } from 'react';
import {
    LucideX,
    LucideDownload,
    LucidePhone,
    LucideMapPin,
    LucideCalendar,
    LucideClock,
    LucideShieldCheck,
    LucideFileText,
    LucideLinkedin,
    LucideGraduationCap,
    LucideCheckCircle2,
    LucideAlertCircle,
    LucideExternalLink,
    LucideUpload,
    LucideTrash2,
    LucideEye,
    LucideLoader2,
    LucideShieldAlert,
} from 'lucide-react';
import { PortalModal } from './PortalModal';
import api from '../utils/api';
import toast from 'react-hot-toast';

export interface TalentItem {
    id: string;
    userId: string;
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
    parentDocumentUploadedAt?: string;
    minorApproved?: boolean;
    minorApprovedAt?: string;
    minorApprovedById?: string;
    approverName?: string;
    user?: {
        id: string;
        name: string;
        email: string;
        avatarUrl?: string;
        turmas?: { id: string; name: string }[];
        enrollments?: { course: { id: string; title: string } }[];
        meetingAttendances?: { id: string }[];
    };
}

interface TalentDetailsModalProps {
    isOpen: boolean;
    onClose: () => void;
    talent: TalentItem | null;
    onTalentUpdated?: (updatedTalent: TalentItem) => void;
}

export default function TalentDetailsModal({
    isOpen,
    onClose,
    talent,
    onTalentUpdated,
}: TalentDetailsModalProps) {
    const [currentTalent, setCurrentTalent] = useState<TalentItem | null>(talent);
    const [isUploadingDoc, setIsUploadingDoc] = useState(false);
    const [isDeletingDoc, setIsDeletingDoc] = useState(false);
    const [isUpdatingApproval, setIsUpdatingApproval] = useState(false);

    useEffect(() => {
        setCurrentTalent(talent);
    }, [talent]);

    if (!currentTalent) return null;

    const phoneClean = currentTalent.phone?.replace(/\D/g, '') || '';
    const whatsappLink = phoneClean
        ? `https://wa.me/55${phoneClean}?text=${encodeURIComponent(
              `Olá ${currentTalent.user?.name || ''}, tudo bem? Aqui é da coordenação do Projeto Brilha Mais referente a uma oportunidade de vaga.`
          )}`
        : null;

    const availabilityMap: Record<string, string> = {
        MANHA: 'Manhã',
        TARDE: 'Tarde',
        NOITE: 'Noite',
        INTEGRAL: 'Integral',
        FLEXIVEL: 'Horário Flexível',
    };

    const calculateAge = (dateStr?: string) => {
        if (!dateStr) return null;
        const birth = new Date(dateStr);
        if (isNaN(birth.getTime())) return null;
        const today = new Date();
        let age = today.getFullYear() - birth.getFullYear();
        const m = today.getMonth() - birth.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
            age--;
        }
        return age;
    };

    const age = calculateAge(currentTalent.birthDate);
    const turmasText = currentTalent.user?.turmas?.map(t => t.name).join(', ') || 'Sem turma vinculada';

    const handleParentDocUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const allowed = ['.pdf', '.png', '.jpg', '.jpeg'];
        const fileNameLower = file.name.toLowerCase();
        const isAllowed = allowed.some(ext => fileNameLower.endsWith(ext));
        if (!isAllowed) {
            toast.error('Formato inválido. Aceito apenas PDF, PNG ou JPG.');
            return;
        }

        if (file.size > 10 * 1024 * 1024) {
            toast.error('O arquivo é muito grande (máximo 10MB).');
            return;
        }

        setIsUploadingDoc(true);
        try {
            const formData = new FormData();
            formData.append('file', file);
            const { data: uploadRes } = await api.post('/upload', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });

            const { data: updated } = await api.post(`/talents/${currentTalent.id}/parent-document`, {
                parentDocumentUrl: uploadRes.url,
                parentDocumentFileName: file.name,
            });

            setCurrentTalent(updated);
            onTalentUpdated?.(updated);
            toast.success('Termo assinado anexado com sucesso!');
        } catch (err: any) {
            toast.error(err.response?.data?.message || 'Erro ao enviar termo.');
        } finally {
            setIsUploadingDoc(false);
            e.target.value = '';
        }
    };

    const handleRemoveParentDoc = async () => {
        if (!confirm('Deseja realmente remover o termo assinado deste aluno? Caso já esteja liberado, a liberação será revogada.')) return;
        setIsDeletingDoc(true);
        try {
            const { data: updated } = await api.delete(`/talents/${currentTalent.id}/parent-document`);
            setCurrentTalent(updated);
            onTalentUpdated?.(updated);
            toast.success('Termo removido com sucesso.');
        } catch (err: any) {
            toast.error(err.response?.data?.message || 'Erro ao remover termo.');
        } finally {
            setIsDeletingDoc(false);
        }
    };

    const handleToggleApproval = async (approved: boolean) => {
        if (approved && !currentTalent.parentDocumentUrl) {
            const proceed = confirm(
                'Atenção: Nenhum termo digital foi anexado ainda. Deseja aprovar mesmo assim com base no documento físico arquivado na coordenação?'
            );
            if (!proceed) return;
        }

        setIsUpdatingApproval(true);
        try {
            const { data: updated } = await api.patch(`/talents/${currentTalent.id}/minor-approval`, {
                approved,
            });
            setCurrentTalent(updated);
            onTalentUpdated?.(updated);
            toast.success(
                approved
                    ? 'Aluno menor liberado para empresas parceiras!'
                    : 'Liberação do aluno revogada.'
            );
        } catch (err: any) {
            toast.error(err.response?.data?.message || 'Erro ao alterar liberação.');
        } finally {
            setIsUpdatingApproval(false);
        }
    };

    return (
        <PortalModal isOpen={isOpen} onClose={onClose} className="relative z-[100000] w-full max-w-2xl">
            <div className="bg-white rounded-2xl shadow-2xl border border-zinc-200/80 overflow-hidden flex flex-col max-h-[90vh]">
                {/* Header do Perfil */}
                <div className="p-6 pb-5 border-b border-zinc-100 bg-white">
                    <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-4 min-w-0">
                            {currentTalent.user?.avatarUrl ? (
                                <img
                                    src={currentTalent.user.avatarUrl}
                                    alt={currentTalent.user.name}
                                    className="w-14 h-14 rounded-2xl object-cover border border-zinc-200/80 shrink-0"
                                />
                            ) : (
                                <div className="w-14 h-14 rounded-2xl bg-amber-50 text-[#F19B0A] font-semibold text-xl flex items-center justify-center border border-amber-200/60 shrink-0">
                                    {currentTalent.user?.name ? currentTalent.user.name.charAt(0).toUpperCase() : 'A'}
                                </div>
                            )}

                            <div className="min-w-0">
                                <div className="flex flex-wrap items-center gap-2">
                                    <h3 className="text-xl font-bold text-zinc-900 tracking-tight leading-tight truncate">
                                        {currentTalent.user?.name || 'Aluno'}
                                    </h3>
                                    <span
                                        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-xs font-medium ${
                                            currentTalent.isAvailable
                                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/60'
                                                : 'bg-zinc-100 text-zinc-600 border border-zinc-200'
                                        }`}
                                    >
                                        <span className={`w-1.5 h-1.5 rounded-full ${currentTalent.isAvailable ? 'bg-emerald-500' : 'bg-zinc-400'}`} />
                                        {currentTalent.isAvailable ? 'Disponível' : 'Pausado'}
                                    </span>
                                </div>

                                {currentTalent.headline ? (
                                    <p className="text-sm font-medium text-zinc-800 mt-0.5 truncate">
                                        {currentTalent.headline}
                                    </p>
                                ) : (
                                    <p className="text-xs text-zinc-500 mt-0.5 truncate">
                                        {turmasText}
                                    </p>
                                )}

                                <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-500 mt-1">
                                    <span>{currentTalent.user?.email}</span>
                                    <span>•</span>
                                    <span>{turmasText}</span>
                                </div>
                            </div>
                        </div>

                        <button
                            type="button"
                            onClick={onClose}
                            className="p-2 rounded-xl text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition-colors cursor-pointer shrink-0"
                            title="Fechar"
                        >
                            <LucideX className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Barra de Ações Rápidas */}
                    <div className="flex flex-wrap items-center gap-2.5 mt-5 pt-4 border-t border-zinc-100">
                        {currentTalent.resumeUrl ? (
                            <a
                                href={currentTalent.resumeUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="h-10 px-4 rounded-xl text-xs sm:text-sm font-semibold bg-[#F19B0A] hover:bg-[#D98B08] active:scale-[0.98] text-white shadow-xs inline-flex items-center gap-2 transition-all cursor-pointer"
                            >
                                <LucideDownload className="w-4 h-4" />
                                <span>Baixar Currículo</span>
                                {currentTalent.resumeFileName && (
                                    <span className="opacity-80 text-[11px] font-normal max-w-[130px] truncate hidden sm:inline">
                                        ({currentTalent.resumeFileName})
                                    </span>
                                )}
                            </a>
                        ) : (
                            <span className="h-10 px-3.5 rounded-xl text-xs font-medium bg-zinc-50 text-zinc-400 border border-zinc-200/80 inline-flex items-center gap-2">
                                <LucideFileText className="w-4 h-4 text-zinc-400" />
                                <span>Sem currículo anexado</span>
                            </span>
                        )}

                        {whatsappLink && (
                            <a
                                href={whatsappLink}
                                target="_blank"
                                rel="noreferrer"
                                className="h-10 px-4 rounded-xl text-xs sm:text-sm font-semibold bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white shadow-xs inline-flex items-center gap-2 transition-all cursor-pointer"
                            >
                                <LucidePhone className="w-4 h-4" />
                                <span>WhatsApp</span>
                                <span className="opacity-90 text-[11px] font-normal hidden sm:inline">
                                    ({currentTalent.phone})
                                </span>
                            </a>
                        )}

                        {currentTalent.linkedinUrl && (
                            <a
                                href={currentTalent.linkedinUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="h-10 px-3.5 rounded-xl text-xs sm:text-sm font-medium bg-white hover:bg-zinc-50 border border-zinc-200/80 text-zinc-700 active:scale-[0.98] shadow-xs inline-flex items-center gap-1.5 transition-all cursor-pointer"
                            >
                                <LucideLinkedin className="w-4 h-4 text-blue-600" />
                                <span>LinkedIn</span>
                                <LucideExternalLink className="w-3.5 h-3.5 text-zinc-400" />
                            </a>
                        )}
                    </div>
                </div>

                {/* Conteúdo do Modal */}
                <div className="p-6 overflow-y-auto space-y-6">
                    {/* Bloco Específico: Validação e Liberação do Menor de Idade */}
                    {currentTalent.isMinor && (
                        <div className="p-5 rounded-2xl bg-amber-50/40 border border-amber-200/80 space-y-4">
                            <div className="flex items-start justify-between gap-3">
                                <div className="flex items-start gap-3">
                                    <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                                        <LucideShieldAlert className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <h4 className="text-sm font-bold text-zinc-900 leading-tight">
                                            Liberação de Aluno Menor de Idade
                                        </h4>
                                        <p className="text-xs text-zinc-600 mt-0.5">
                                            Exigência de validação interna da coordenação com termo físico assinado pelos pais desde o início do curso.
                                        </p>
                                    </div>
                                </div>

                                {currentTalent.minorApproved ? (
                                    <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-800 bg-emerald-100/80 px-2.5 py-1 rounded-lg border border-emerald-300 shrink-0">
                                        <LucideCheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
                                        Liberado para Empresas
                                    </span>
                                ) : (
                                    <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-800 bg-amber-100 px-2.5 py-1 rounded-lg border border-amber-300 shrink-0">
                                        <LucideAlertCircle className="w-3.5 h-3.5 text-amber-700" />
                                        Pendente de Liberação
                                    </span>
                                )}
                            </div>

                            {/* Informações de Aprovação */}
                            {currentTalent.minorApproved && (
                                <div className="p-3 rounded-xl bg-emerald-50/70 border border-emerald-200/80 text-xs text-emerald-900 leading-relaxed">
                                    <p className="font-semibold flex items-center gap-1.5">
                                        <LucideCheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                                        Liberado formalmente pela coordenação
                                    </p>
                                    <p className="mt-0.5 text-emerald-800 text-[11px]">
                                        {currentTalent.approverName ? `Aprovado por: ${currentTalent.approverName}` : 'Aprovado pelo Administrador'}
                                        {currentTalent.minorApprovedAt && ` em ${new Date(currentTalent.minorApprovedAt).toLocaleDateString('pt-BR')}`}
                                    </p>
                                </div>
                            )}

                            {/* Área do Termo Digitalizado */}
                            <div className="space-y-2">
                                <label className="text-xs font-semibold text-zinc-800 block">
                                    Termo Físico Assinado pelos Pais / Responsáveis
                                </label>

                                {currentTalent.parentDocumentUrl ? (
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl bg-white border border-zinc-200/80 shadow-2xs">
                                        <div className="flex items-center gap-2.5 min-w-0">
                                            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 border border-amber-200/60 flex items-center justify-center shrink-0">
                                                <LucideFileText className="w-4 h-4" />
                                            </div>
                                            <div className="min-w-0">
                                                <p className="text-xs font-semibold text-zinc-900 truncate">
                                                    {currentTalent.parentDocumentFileName || 'Termo_Assinado_Pais.pdf'}
                                                </p>
                                                <p className="text-[11px] text-zinc-500">
                                                    {currentTalent.parentDocumentUploadedAt
                                                        ? `Anexado em ${new Date(currentTalent.parentDocumentUploadedAt).toLocaleDateString('pt-BR')}`
                                                        : 'Documento anexado'}
                                                </p>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center">
                                            <a
                                                href={currentTalent.parentDocumentUrl}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="h-8 px-2.5 rounded-lg text-xs font-medium text-zinc-700 hover:text-zinc-900 bg-white hover:bg-zinc-50 border border-zinc-200 transition-colors inline-flex items-center gap-1.5 shadow-2xs"
                                                title="Visualizar documento em nova aba"
                                            >
                                                <LucideEye className="w-3.5 h-3.5 text-zinc-500" />
                                                Visualizar
                                            </a>

                                            <label className="h-8 px-2.5 rounded-lg text-xs font-medium text-zinc-700 hover:text-zinc-900 bg-white hover:bg-zinc-50 border border-zinc-200 transition-colors inline-flex items-center gap-1.5 shadow-2xs cursor-pointer">
                                                {isUploadingDoc ? (
                                                    <LucideLoader2 className="w-3.5 h-3.5 animate-spin text-amber-600" />
                                                ) : (
                                                    <LucideUpload className="w-3.5 h-3.5 text-zinc-500" />
                                                )}
                                                Substituir
                                                <input
                                                    type="file"
                                                    accept=".pdf,image/png,image/jpeg,image/jpg"
                                                    onChange={handleParentDocUpload}
                                                    disabled={isUploadingDoc}
                                                    className="hidden"
                                                />
                                            </label>

                                            <button
                                                type="button"
                                                onClick={handleRemoveParentDoc}
                                                disabled={isDeletingDoc}
                                                className="p-1.5 rounded-lg text-zinc-400 hover:text-red-600 hover:bg-red-50 border border-transparent hover:border-red-100 transition-colors cursor-pointer"
                                                title="Excluir documento"
                                            >
                                                {isDeletingDoc ? (
                                                    <LucideLoader2 className="w-3.5 h-3.5 animate-spin" />
                                                ) : (
                                                    <LucideTrash2 className="w-3.5 h-3.5" />
                                                )}
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <label className="flex items-center justify-center gap-2.5 p-4 rounded-xl border border-dashed border-amber-300 hover:border-amber-400 bg-white/70 hover:bg-white transition-all cursor-pointer text-xs font-semibold text-amber-900 text-center shadow-2xs">
                                        {isUploadingDoc ? (
                                            <>
                                                <LucideLoader2 className="w-4 h-4 animate-spin text-amber-600" />
                                                <span>Enviando documento...</span>
                                            </>
                                        ) : (
                                            <>
                                                <LucideUpload className="w-4 h-4 text-amber-600" />
                                                <span>Anexar Termo Assinado pelos Pais (PDF, JPG ou PNG)</span>
                                            </>
                                        )}
                                        <input
                                            type="file"
                                            accept=".pdf,image/png,image/jpeg,image/jpg"
                                            onChange={handleParentDocUpload}
                                            disabled={isUploadingDoc}
                                            className="hidden"
                                        />
                                    </label>
                                )}
                            </div>

                            {/* Botões de Ação para Aprovar/Revogar */}
                            <div className="pt-2 border-t border-amber-200/60 flex items-center justify-between gap-3">
                                <span className="text-[11px] text-zinc-500">
                                    {currentTalent.minorApproved
                                        ? 'O aluno está visível para vagas de empresas.'
                                        : 'A liberação torna o perfil apto a ser encaminhado para processos seletivos.'}
                                </span>

                                {currentTalent.minorApproved ? (
                                    <button
                                        type="button"
                                        onClick={() => handleToggleApproval(false)}
                                        disabled={isUpdatingApproval}
                                        className="h-9 px-3 rounded-xl text-xs font-medium text-zinc-600 hover:text-red-600 bg-white hover:bg-red-50 border border-zinc-200 transition-colors cursor-pointer disabled:opacity-50 inline-flex items-center gap-1.5 shadow-2xs"
                                    >
                                        {isUpdatingApproval && <LucideLoader2 className="w-3.5 h-3.5 animate-spin" />}
                                        Revogar Liberação
                                    </button>
                                ) : (
                                    <button
                                        type="button"
                                        onClick={() => handleToggleApproval(true)}
                                        disabled={isUpdatingApproval}
                                        className="h-9 px-4 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white shadow-xs inline-flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50"
                                    >
                                        {isUpdatingApproval ? (
                                            <LucideLoader2 className="w-3.5 h-3.5 animate-spin" />
                                        ) : (
                                            <LucideCheckCircle2 className="w-3.5 h-3.5" />
                                        )}
                                        Aprovar e Liberar Menor
                                    </button>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Grid de Informações Chave */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="p-3.5 rounded-xl bg-zinc-50/60 border border-zinc-200/60 flex items-start gap-3">
                            <div className="w-8 h-8 rounded-lg bg-white border border-zinc-200/70 flex items-center justify-center text-zinc-500 shrink-0 shadow-2xs">
                                <LucideMapPin className="w-4 h-4" />
                            </div>
                            <div className="min-w-0">
                                <span className="text-[11px] text-zinc-500 font-medium block">Localidade</span>
                                <p className="text-sm font-semibold text-zinc-900 mt-0.5 truncate">
                                    {currentTalent.city ? `${currentTalent.city}${currentTalent.state ? ` - ${currentTalent.state}` : ''}` : 'Não informado'}
                                </p>
                            </div>
                        </div>

                        <div className="p-3.5 rounded-xl bg-zinc-50/60 border border-zinc-200/60 flex items-start gap-3">
                            <div className="w-8 h-8 rounded-lg bg-white border border-zinc-200/70 flex items-center justify-center text-zinc-500 shrink-0 shadow-2xs">
                                <LucideClock className="w-4 h-4" />
                            </div>
                            <div className="min-w-0">
                                <span className="text-[11px] text-zinc-500 font-medium block">Disponibilidade</span>
                                <p className="text-sm font-semibold text-zinc-900 mt-0.5 truncate">
                                    {currentTalent.availability ? availabilityMap[currentTalent.availability] || currentTalent.availability : 'Não informado'}
                                </p>
                            </div>
                        </div>

                        <div className="p-3.5 rounded-xl bg-zinc-50/60 border border-zinc-200/60 flex items-start gap-3">
                            <div className="w-8 h-8 rounded-lg bg-white border border-zinc-200/70 flex items-center justify-center text-zinc-500 shrink-0 shadow-2xs">
                                <LucideCalendar className="w-4 h-4" />
                            </div>
                            <div className="min-w-0">
                                <span className="text-[11px] text-zinc-500 font-medium block">Idade / Nascimento</span>
                                <p className="text-sm font-semibold text-zinc-900 mt-0.5 truncate">
                                    {currentTalent.birthDate ? (
                                        <>
                                            {age !== null ? `${age} anos` : ''}
                                            <span className="text-xs font-normal text-zinc-500 ml-1">
                                                ({new Date(currentTalent.birthDate).toLocaleDateString('pt-BR')}) • {currentTalent.isMinor ? 'Menor' : 'Maior'}
                                            </span>
                                        </>
                                    ) : (
                                        'Não informado'
                                    )}
                                </p>
                            </div>
                        </div>

                        <div className="p-3.5 rounded-xl bg-zinc-50/60 border border-zinc-200/60 flex items-start gap-3">
                            <div className="w-8 h-8 rounded-lg bg-white border border-zinc-200/70 flex items-center justify-center text-zinc-500 shrink-0 shadow-2xs">
                                <LucideGraduationCap className="w-4 h-4" />
                            </div>
                            <div className="min-w-0">
                                <span className="text-[11px] text-zinc-500 font-medium block">Trajetória no Brilha Mais</span>
                                <p className="text-sm font-semibold text-zinc-900 mt-0.5 truncate">
                                    {currentTalent.user?.enrollments?.length || 0} {currentTalent.user?.enrollments?.length === 1 ? 'curso' : 'cursos'} • {currentTalent.user?.meetingAttendances?.length || 0} presenças
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Áreas de Interesse */}
                    {currentTalent.areasOfInterest && currentTalent.areasOfInterest.length > 0 && (
                        <div className="space-y-2 pt-2 border-t border-zinc-100">
                            <h4 className="text-xs font-semibold text-zinc-900">Áreas de Interesse</h4>
                            <div className="flex flex-wrap gap-2">
                                {currentTalent.areasOfInterest.map((tag, idx) => (
                                    <span
                                        key={idx}
                                        className="px-2.5 py-1 rounded-lg text-xs font-medium bg-zinc-100 text-zinc-800 border border-zinc-200/60"
                                    >
                                        {tag}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Sobre o Jovem (Bio) */}
                    {currentTalent.bio && (
                        <div className="space-y-2 pt-2 border-t border-zinc-100">
                            <h4 className="text-xs font-semibold text-zinc-900">Sobre o Aluno</h4>
                            <p className="text-sm text-zinc-600 leading-relaxed whitespace-pre-line bg-zinc-50/50 rounded-xl p-4 border border-zinc-200/50">
                                {currentTalent.bio}
                            </p>
                        </div>
                    )}

                    {/* Conformidade LGPD & Termo */}
                    <div className="pt-2 border-t border-zinc-100">
                        <div className="p-4 rounded-xl bg-zinc-50/60 border border-zinc-200/70 space-y-3">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <LucideShieldCheck className={`w-4 h-4 ${currentTalent.lgpdConsent ? 'text-emerald-600' : 'text-amber-500'}`} />
                                    <span className="text-xs font-semibold text-zinc-900">Conformidade e Termo LGPD</span>
                                </div>
                                {currentTalent.lgpdConsent ? (
                                    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200/60">
                                        <LucideCheckCircle2 className="w-3 h-3 text-emerald-600" />
                                        Autorizado {currentTalent.lgpdConsentAt ? `em ${new Date(currentTalent.lgpdConsentAt).toLocaleDateString('pt-BR')}` : ''}
                                    </span>
                                ) : (
                                    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200/60">
                                        <LucideAlertCircle className="w-3 h-3 text-amber-600" />
                                        Pendente
                                    </span>
                                )}
                            </div>

                            {currentTalent.isMinor ? (
                                <div className="pt-2 border-t border-zinc-200/60 space-y-1 text-xs">
                                    <p className="text-zinc-600">
                                        <strong className="text-zinc-900 font-medium">Responsável Legal:</strong> {currentTalent.parentName || 'Não informado'}
                                        {currentTalent.parentContact && ` • Contato: ${currentTalent.parentContact}`}
                                    </p>
                                    <p className="text-[11px] text-zinc-500 flex items-center gap-1 mt-1">
                                        <LucideCheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                        {currentTalent.parentConsent ? 'Autorização dos pais confirmada e registrada pelo aluno' : 'Aguardando confirmação dos pais no cadastro'}
                                    </p>
                                </div>
                            ) : (
                                <p className="text-xs text-zinc-500 leading-relaxed">
                                    Aluno maior de idade (≥ 18 anos). Consentimento concedido para compartilhamento do currículo e contato com empresas conveniadas.
                                </p>
                            )}
                        </div>
                    </div>
                </div>

                {/* Footer do Modal */}
                <div className="flex items-center justify-end p-4 px-6 border-t border-zinc-100 bg-white">
                    <button
                        type="button"
                        onClick={onClose}
                        className="h-10 px-4 rounded-xl text-xs font-semibold bg-white border border-zinc-200/80 hover:bg-zinc-50 text-zinc-700 active:scale-[0.98] shadow-2xs transition-all cursor-pointer"
                    >
                        Fechar
                    </button>
                </div>
            </div>
        </PortalModal>
    );
}

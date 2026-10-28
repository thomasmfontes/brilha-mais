import React from 'react';
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
    LucideExternalLink
} from 'lucide-react';
import { PortalModal } from './PortalModal';

interface TalentItem {
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
}

export default function TalentDetailsModal({ isOpen, onClose, talent }: TalentDetailsModalProps) {
    if (!talent) return null;

    const phoneClean = talent.phone?.replace(/\D/g, '') || '';
    const whatsappLink = phoneClean
        ? `https://wa.me/55${phoneClean}?text=${encodeURIComponent(
              `Olá ${talent.user?.name || ''}, tudo bem? Aqui é da coordenação do Projeto Brilha Mais referente a uma oportunidade de vaga.`
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

    const age = calculateAge(talent.birthDate);
    const turmasText = talent.user?.turmas?.map(t => t.name).join(', ') || 'Sem turma vinculada';

    return (
        <PortalModal isOpen={isOpen} onClose={onClose} className="relative z-[100000] w-full max-w-2xl">
            <div className="bg-white rounded-2xl shadow-2xl border border-zinc-200/80 overflow-hidden flex flex-col max-h-[90vh]">
                {/* Header do Perfil */}
                <div className="p-6 pb-5 border-b border-zinc-100 bg-white">
                    <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-4 min-w-0">
                            {talent.user?.avatarUrl ? (
                                <img
                                    src={talent.user.avatarUrl}
                                    alt={talent.user.name}
                                    className="w-14 h-14 rounded-2xl object-cover border border-zinc-200/80 shrink-0"
                                />
                            ) : (
                                <div className="w-14 h-14 rounded-2xl bg-amber-50 text-[#F19B0A] font-semibold text-xl flex items-center justify-center border border-amber-200/60 shrink-0">
                                    {talent.user?.name ? talent.user.name.charAt(0).toUpperCase() : 'A'}
                                </div>
                            )}

                            <div className="min-w-0">
                                <div className="flex flex-wrap items-center gap-2">
                                    <h3 className="text-xl font-bold text-zinc-900 tracking-tight leading-tight truncate">
                                        {talent.user?.name || 'Aluno'}
                                    </h3>
                                    <span
                                        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-xs font-medium ${
                                            talent.isAvailable
                                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/60'
                                                : 'bg-zinc-100 text-zinc-600 border border-zinc-200'
                                        }`}
                                    >
                                        <span className={`w-1.5 h-1.5 rounded-full ${talent.isAvailable ? 'bg-emerald-500' : 'bg-zinc-400'}`} />
                                        {talent.isAvailable ? 'Disponível' : 'Pausado'}
                                    </span>
                                </div>

                                {talent.headline ? (
                                    <p className="text-sm font-medium text-zinc-800 mt-0.5 truncate">
                                        {talent.headline}
                                    </p>
                                ) : (
                                    <p className="text-xs text-zinc-500 mt-0.5 truncate">
                                        {turmasText}
                                    </p>
                                )}

                                <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-500 mt-1">
                                    <span>{talent.user?.email}</span>
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

                    {/* Barra de Ações Rápidas (Alinhada e Ergonômica) */}
                    <div className="flex flex-wrap items-center gap-2.5 mt-5 pt-4 border-t border-zinc-100">
                        {talent.resumeUrl ? (
                            <a
                                href={talent.resumeUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="h-10 px-4 rounded-xl text-xs sm:text-sm font-semibold bg-[#F19B0A] hover:bg-[#D98B08] active:scale-[0.98] text-white shadow-xs inline-flex items-center gap-2 transition-all cursor-pointer"
                            >
                                <LucideDownload className="w-4 h-4" />
                                <span>Baixar Currículo</span>
                                {talent.resumeFileName && (
                                    <span className="opacity-80 text-[11px] font-normal max-w-[130px] truncate hidden sm:inline">
                                        ({talent.resumeFileName})
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
                                    ({talent.phone})
                                </span>
                            </a>
                        )}

                        {talent.linkedinUrl && (
                            <a
                                href={talent.linkedinUrl}
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

                {/* Conteúdo do Modal (Scrollável e Editorial) */}
                <div className="p-6 overflow-y-auto space-y-6">
                    {/* Grid de Informações Chave */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="p-3.5 rounded-xl bg-zinc-50/60 border border-zinc-200/60 flex items-start gap-3">
                            <div className="w-8 h-8 rounded-lg bg-white border border-zinc-200/70 flex items-center justify-center text-zinc-500 shrink-0 shadow-2xs">
                                <LucideMapPin className="w-4 h-4" />
                            </div>
                            <div className="min-w-0">
                                <span className="text-[11px] text-zinc-500 font-medium block">Localidade</span>
                                <p className="text-sm font-semibold text-zinc-900 mt-0.5 truncate">
                                    {talent.city ? `${talent.city}${talent.state ? ` - ${talent.state}` : ''}` : 'Não informado'}
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
                                    {talent.availability ? availabilityMap[talent.availability] || talent.availability : 'Não informado'}
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
                                    {talent.birthDate ? (
                                        <>
                                            {age !== null ? `${age} anos` : ''}
                                            <span className="text-xs font-normal text-zinc-500 ml-1">
                                                ({new Date(talent.birthDate).toLocaleDateString('pt-BR')}) • {talent.isMinor ? 'Menor' : 'Maior'}
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
                                    {talent.user?.enrollments?.length || 0} {talent.user?.enrollments?.length === 1 ? 'curso' : 'cursos'} • {talent.user?.meetingAttendances?.length || 0} presenças
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Áreas de Interesse */}
                    {talent.areasOfInterest && talent.areasOfInterest.length > 0 && (
                        <div className="space-y-2 pt-2 border-t border-zinc-100">
                            <h4 className="text-xs font-semibold text-zinc-900">Áreas de Interesse</h4>
                            <div className="flex flex-wrap gap-2">
                                {talent.areasOfInterest.map((tag, idx) => (
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

                    {/* Sobre o Jovem (Bio Editorial) */}
                    {talent.bio && (
                        <div className="space-y-2 pt-2 border-t border-zinc-100">
                            <h4 className="text-xs font-semibold text-zinc-900">Sobre o Aluno</h4>
                            <p className="text-sm text-zinc-600 leading-relaxed whitespace-pre-line bg-zinc-50/50 rounded-xl p-4 border border-zinc-200/50">
                                {talent.bio}
                            </p>
                        </div>
                    )}

                    {/* Conformidade LGPD & Termo */}
                    <div className="pt-2 border-t border-zinc-100">
                        <div className="p-4 rounded-xl bg-zinc-50/60 border border-zinc-200/70 space-y-3">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <LucideShieldCheck className={`w-4 h-4 ${talent.lgpdConsent ? 'text-emerald-600' : 'text-amber-500'}`} />
                                    <span className="text-xs font-semibold text-zinc-900">Conformidade e Termo LGPD</span>
                                </div>
                                {talent.lgpdConsent ? (
                                    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200/60">
                                        <LucideCheckCircle2 className="w-3 h-3 text-emerald-600" />
                                        Autorizado {talent.lgpdConsentAt ? `em ${new Date(talent.lgpdConsentAt).toLocaleDateString('pt-BR')}` : ''}
                                    </span>
                                ) : (
                                    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200/60">
                                        <LucideAlertCircle className="w-3 h-3 text-amber-600" />
                                        Pendente
                                    </span>
                                )}
                            </div>

                            {talent.isMinor ? (
                                <div className="pt-2 border-t border-zinc-200/60 space-y-1 text-xs">
                                    <p className="text-zinc-600">
                                        <strong className="text-zinc-900 font-medium">Responsável Legal:</strong> {talent.parentName || 'Não informado'}
                                        {talent.parentContact && ` • Contato: ${talent.parentContact}`}
                                    </p>
                                    <p className="text-[11px] text-zinc-500 flex items-center gap-1 mt-1">
                                        <LucideCheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                        {talent.parentConsent ? 'Autorização dos pais confirmada e registrada' : 'Aguardando confirmação dos pais'}
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

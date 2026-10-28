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

    return (
        <PortalModal isOpen={isOpen} onClose={onClose} className="relative z-[100000] w-full max-w-2xl">
            <div className="bg-white rounded-2xl shadow-2xl border border-zinc-200/80 overflow-hidden flex flex-col max-h-[90vh]">
                {/* Modal Header */}
                <div className="flex items-center justify-between p-5 sm:p-6 border-b border-zinc-100 bg-white">
                    <div className="flex items-center gap-3.5">
                        {talent.user?.avatarUrl ? (
                            <img
                                src={talent.user.avatarUrl}
                                alt={talent.user.name}
                                className="w-12 h-12 rounded-xl object-cover border border-zinc-200/80 shrink-0"
                            />
                        ) : (
                            <div className="w-12 h-12 rounded-xl bg-amber-50 text-[#F19B0A] font-semibold text-lg flex items-center justify-center border border-amber-200/60 shrink-0">
                                {talent.user?.name ? talent.user.name.charAt(0).toUpperCase() : 'A'}
                            </div>
                        )}
                        <div>
                            <div className="flex items-center gap-2">
                                <h3 className="text-base sm:text-lg font-bold text-zinc-950 leading-tight">
                                    {talent.user?.name || 'Aluno'}
                                </h3>
                                <span
                                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium ${
                                        talent.isAvailable
                                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/60'
                                            : 'bg-zinc-100 text-zinc-600 border border-zinc-200'
                                    }`}
                                >
                                    <span className={`w-1.5 h-1.5 rounded-full ${talent.isAvailable ? 'bg-emerald-500' : 'bg-zinc-400'}`} />
                                    {talent.isAvailable ? 'Disponível' : 'Pausado'}
                                </span>
                            </div>
                            <p className="text-xs text-zinc-500 mt-1">
                                {talent.user?.email} • {talent.user?.turmas?.map(t => t.name).join(', ') || 'Sem turma'}
                            </p>
                        </div>
                    </div>

                    <button
                        type="button"
                        onClick={onClose}
                        className="p-2 rounded-xl text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition-colors cursor-pointer"
                        title="Fechar"
                    >
                        <LucideX className="w-5 h-5" />
                    </button>
                </div>

                {/* Modal Body */}
                <div className="p-5 sm:p-6 overflow-y-auto space-y-6">
                    {/* Ações Rápidas (Download e WhatsApp) */}
                    <div className="flex flex-wrap items-center gap-2.5 p-3.5 rounded-xl bg-zinc-50/70 border border-zinc-200/80">
                        {talent.resumeUrl ? (
                            <a
                                href={talent.resumeUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-semibold bg-[#F19B0A] hover:bg-[#D98B08] active:scale-[0.98] text-white shadow-2xs transition-all"
                            >
                                <LucideDownload className="w-4 h-4" />
                                <span>Baixar Currículo ({talent.resumeFileName || 'PDF'})</span>
                            </a>
                        ) : (
                            <span className="inline-flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium bg-white text-zinc-400 border border-zinc-200/80">
                                <LucideFileText className="w-4 h-4 text-zinc-400" />
                                <span>Sem currículo anexado</span>
                            </span>
                        )}

                        {whatsappLink && (
                            <a
                                href={whatsappLink}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white shadow-2xs transition-all"
                            >
                                <LucidePhone className="w-4 h-4" />
                                <span>Chamar no WhatsApp ({talent.phone})</span>
                            </a>
                        )}

                        {talent.linkedinUrl && (
                            <a
                                href={talent.linkedinUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-medium bg-white border border-zinc-200/80 text-zinc-700 hover:bg-zinc-50 transition-colors shadow-2xs"
                            >
                                <LucideLinkedin className="w-3.5 h-3.5 text-blue-600" />
                                <span>LinkedIn</span>
                                <LucideExternalLink className="w-3 h-3 text-zinc-400" />
                            </a>
                        )}
                    </div>

                    {/* Detalhes do Perfil em Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                        <div className="p-3.5 rounded-xl bg-zinc-50/70 border border-zinc-200/70 space-y-1">
                            <span className="text-zinc-500 font-medium flex items-center gap-1.5">
                                <LucideMapPin className="w-3.5 h-3.5 text-zinc-400" /> Localidade
                            </span>
                            <p className="font-semibold text-zinc-900 text-sm">
                                {talent.city ? `${talent.city}${talent.state ? ` - ${talent.state}` : ''}` : 'Não informado'}
                            </p>
                        </div>

                        <div className="p-3.5 rounded-xl bg-zinc-50/70 border border-zinc-200/70 space-y-1">
                            <span className="text-zinc-500 font-medium flex items-center gap-1.5">
                                <LucideClock className="w-3.5 h-3.5 text-zinc-400" /> Disponibilidade
                            </span>
                            <p className="font-semibold text-zinc-900 text-sm">
                                {talent.availability ? availabilityMap[talent.availability] || talent.availability : 'Não informado'}
                            </p>
                        </div>

                        <div className="p-3.5 rounded-xl bg-zinc-50/70 border border-zinc-200/70 space-y-1">
                            <span className="text-zinc-500 font-medium flex items-center gap-1.5">
                                <LucideCalendar className="w-3.5 h-3.5 text-zinc-400" /> Nascimento / Idade
                            </span>
                            <p className="font-semibold text-zinc-900 text-sm">
                                {talent.birthDate
                                    ? `${new Date(talent.birthDate).toLocaleDateString('pt-BR')} (${talent.isMinor ? 'Menor de 18 anos' : 'Maior de idade'})`
                                    : 'Não informado'}
                            </p>
                        </div>

                        <div className="p-3.5 rounded-xl bg-zinc-50/70 border border-zinc-200/70 space-y-1">
                            <span className="text-zinc-500 font-medium flex items-center gap-1.5">
                                <LucideGraduationCap className="w-3.5 h-3.5 text-zinc-400" /> Histórico Brilha Mais
                            </span>
                            <p className="font-semibold text-zinc-900 text-sm">
                                {talent.user?.enrollments?.length || 0} cursos matriculados • {talent.user?.meetingAttendances?.length || 0} presenças
                            </p>
                        </div>
                    </div>

                    {/* Objetivo Profissional */}
                    {talent.headline && (
                        <div className="space-y-1.5">
                            <h4 className="text-xs font-semibold text-zinc-700">Objetivo / Cargo Desejado:</h4>
                            <p className="text-sm text-zinc-900 font-medium p-3.5 rounded-xl bg-white border border-zinc-200/80 shadow-2xs">
                                {talent.headline}
                            </p>
                        </div>
                    )}

                    {/* Áreas de Interesse */}
                    {talent.areasOfInterest && talent.areasOfInterest.length > 0 && (
                        <div className="space-y-2">
                            <h4 className="text-xs font-semibold text-zinc-700">Áreas de Interesse:</h4>
                            <div className="flex flex-wrap gap-1.5">
                                {talent.areasOfInterest.map((area, idx) => (
                                    <span
                                        key={idx}
                                        className="px-2.5 py-1 rounded-lg text-xs font-medium bg-amber-50 border border-amber-200/70 text-amber-900"
                                    >
                                        {area}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Sobre o Jovem */}
                    {talent.bio && (
                        <div className="space-y-1.5">
                            <h4 className="text-xs font-semibold text-zinc-700">Sobre o Jovem:</h4>
                            <p className="text-xs text-zinc-700 leading-relaxed p-3.5 rounded-xl bg-white border border-zinc-200/80 shadow-2xs whitespace-pre-wrap">
                                {talent.bio}
                            </p>
                        </div>
                    )}

                    {/* Seção LGPD */}
                    <div className="p-4 rounded-xl border border-zinc-200/80 bg-zinc-50/70 space-y-3">
                        <div className="flex items-center gap-2 text-zinc-900 font-semibold text-xs">
                            <LucideShieldCheck className={`w-4 h-4 ${talent.lgpdConsent ? 'text-emerald-600' : 'text-amber-500'}`} />
                            <span>Conformidade e Termo LGPD</span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                            <div>
                                <span className="text-zinc-500">Consentimento do Jovem:</span>
                                <p className="font-semibold mt-0.5 flex items-center gap-1.5">
                                    {talent.lgpdConsent ? (
                                        <span className="text-emerald-700 flex items-center gap-1">
                                            <LucideCheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                            Autorizado {talent.lgpdConsentAt ? `em ${new Date(talent.lgpdConsentAt).toLocaleDateString('pt-BR')}` : ''}
                                        </span>
                                    ) : (
                                        <span className="text-amber-700 flex items-center gap-1">
                                            <LucideAlertCircle className="w-3.5 h-3.5 text-amber-600" />
                                            Pendente de autorização
                                        </span>
                                    )}
                                </p>
                            </div>

                            <div>
                                <span className="text-zinc-500">Faixa Etária:</span>
                                <p className="font-semibold text-zinc-800 mt-0.5">
                                    {talent.isMinor ? 'Menor de 18 anos' : 'Maior de idade (≥ 18 anos)'}
                                </p>
                            </div>

                            {talent.isMinor && (
                                <div className="col-span-full pt-2 border-t border-zinc-200/60">
                                    <span className="text-zinc-500">Responsável Legal:</span>
                                    <p className="font-semibold text-zinc-900 mt-0.5">
                                        {talent.parentName || 'Não informado'} • Contato: {talent.parentContact || 'Não informado'}
                                    </p>
                                    <p className="text-[11px] text-emerald-600 mt-1 flex items-center gap-1">
                                        <LucideCheckCircle2 className="w-3.5 h-3.5" />
                                        {talent.parentConsent ? 'Autorização dos pais confirmada pelo aluno' : 'Pendente de confirmação dos pais'}
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Modal Footer */}
                <div className="flex items-center justify-end p-4 border-t border-zinc-100 bg-white">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 rounded-xl text-xs font-semibold bg-white border border-zinc-200/80 hover:bg-zinc-50 text-zinc-700 shadow-2xs transition-colors cursor-pointer"
                    >
                        Fechar
                    </button>
                </div>
            </div>
        </PortalModal>
    );
}

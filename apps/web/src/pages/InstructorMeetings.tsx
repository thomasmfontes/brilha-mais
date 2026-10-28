import React, { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import api from "../utils/api";
import { LucideChevronLeft, LucidePlus, LucideQrCode, LucideCheckCircle2, LucideXCircle, LucideUsers, LucideLoader2, LucidePencil, LucideTrash2, LucideX, LucideAlertCircle } from "lucide-react";
import toast from "react-hot-toast";
import LoadingSpinner from "../components/LoadingSpinner";
import Skeleton from "../components/Skeleton";
import { PortalModal } from "../components/PortalModal";
import { ConfirmModal } from "../components/ConfirmModal";

export default function InstructorMeetings() {
    const { id: turmaId } = useParams();
    const [meetings, setMeetings] = useState<any[]>([]);
    const [turma, setTurma] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [newMeeting, setNewMeeting] = useState({ title: "", date: "" });
    const [editingMeeting, setEditingMeeting] = useState<any>(null);
    const [meetingToDelete, setMeetingToDelete] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);

    // Selected meeting for manual attendance
    const [selectedMeeting, setSelectedMeeting] = useState<any>(null);
    const [isAttendanceModalOpen, setIsAttendanceModalOpen] = useState(false);
    const [meetingDetails, setMeetingDetails] = useState<any>(null);
    const [isLoadingDetails, setIsLoadingDetails] = useState(false);
    const [processingUsers, setProcessingUsers] = useState<Record<string, boolean>>({});
    const [userRole, setUserRole] = useState<string | null>(null);
    
    // Sorted users for attendance list (Only students)
    const sortedUsers = React.useMemo(() => {
        if (!turma?.users) return [];
        return [...turma.users]
            .filter((u: any) => u.role === 'STUDENT')
            .sort((a, b) => a.name.localeCompare(b.name));
    }, [turma]);

    // Student count for stats
    const studentCount = React.useMemo(() => {
        if (!turma?.users) return 0;
        return turma.users.filter((u: any) => u.role === 'STUDENT').length;
    }, [turma]);

    useEffect(() => {
        fetchData();
        fetchUser();
    }, [turmaId]);

    const fetchUser = async () => {
        try {
            const response = await api.get('/users/me');
            setUserRole(response.data.role);
        } catch (error) {
            console.error("Error fetching user role:", error);
        }
    };

    const fetchData = async (silent = false) => {
        if (!silent) setIsLoading(true);
        try {
            const [turmaRes, meetingsRes] = await Promise.all([
                api.get(`/turmas/${turmaId}`),
                api.get(`/in-person-meetings/turma/${turmaId}`)
            ]);
            setTurma(turmaRes.data);
            setMeetings(meetingsRes.data);
        } catch (error) {
            console.error("Error fetching meetings:", error);
            toast.error("Erro ao carregar os encontros.");
        } finally {
            if (!silent) setIsLoading(false);
        }
    };

    const handleCreateMeeting = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        try {
            await api.post(`/in-person-meetings/turma/${turmaId}`, newMeeting);
            toast.success("Encontro criado!");
            setIsCreateModalOpen(false);
            setNewMeeting({ title: "", date: "" });
            fetchData();
        } catch (error) {
            toast.error("Erro ao criar encontro.");
        } finally {
            setIsSaving(false);
        }
    };

    const handleUpdateMeeting = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        try {
            await api.put(`/in-person-meetings/${editingMeeting.id}`, editingMeeting);
            toast.success("Encontro atualizado!");
            setIsEditModalOpen(false);
            setEditingMeeting(null);
            fetchData();
        } catch (error) {
            toast.error("Erro ao atualizar encontro.");
        } finally {
            setIsSaving(false);
        }
    };

    const handleDeleteMeeting = async () => {
        if (!meetingToDelete) return;
        setIsSaving(true);
        try {
            await api.delete(`/in-person-meetings/${meetingToDelete}`);
            toast.success("Encontro excluído!");
            setIsDeleteModalOpen(false);
            setMeetingToDelete(null);
            fetchData();
        } catch (error) {
            toast.error("Erro ao excluir encontro.");
        } finally {
            setIsSaving(false);
        }
    };

    const openAttendance = async (meeting: any) => {
        setSelectedMeeting(meeting);
        setIsAttendanceModalOpen(true);
        setIsLoadingDetails(true);
        try {
            const res = await api.get(`/in-person-meetings/${meeting.id}`);
            setMeetingDetails(res.data);
        } catch (error) {
            toast.error("Erro ao carregar detalhes.");
        } finally {
            setIsLoadingDetails(false);
        }
    };

    const toggleManualAttendance = async (userId: string) => {
        setProcessingUsers(prev => ({ ...prev, [userId]: true }));
        try {
            const res = await api.post(`/in-person-meetings/${selectedMeeting.id}/attendances/${userId}`);
            // Optimistically update
            setMeetingDetails((prev: any) => {
                const isAttended = prev.attendances.some((a: any) => a.userId === userId);
                let newAttendances = [...prev.attendances];
                if (isAttended) {
                    newAttendances = newAttendances.filter((a: any) => a.userId !== userId);
                } else {
                    newAttendances.push({ userId, timestamp: new Date().toISOString() });
                }
                return { ...prev, attendances: newAttendances };
            });
            toast.success(res.data.status === 'added' ? "Presença confirmada" : "Presença removida");
            fetchData(true); // refresh counts in background silently
        } catch (error) {
            toast.error("Erro ao atualizar presença.");
        } finally {
            setProcessingUsers(prev => ({ ...prev, [userId]: false }));
        }
    };

    if (isLoading) {
        return (
            <div className="max-w-6xl mx-auto space-y-6 pb-20">
                {/* Header Skeleton */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <Skeleton className="h-9 w-9" variant="rounded" />
                        <div className="space-y-1.5">
                            <Skeleton className="h-3 w-32" variant="rectangle" />
                            <Skeleton className="h-5 w-48" variant="rounded" />
                        </div>
                    </div>
                    <Skeleton className="h-10 w-36" variant="rounded" />
                </div>

                {/* Stats Skeleton */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="bg-white border border-slate-200/80 p-4 rounded-xl shadow-2xs flex items-center gap-3.5">
                            <Skeleton className="h-9 w-9" variant="rounded" />
                            <div className="space-y-1.5 flex-1">
                                <Skeleton className="h-3 w-20" variant="rectangle" />
                                <Skeleton className="h-5 w-12" variant="rounded" />
                            </div>
                        </div>
                    ))}
                </div>

                {/* Cards Skeleton */}
                <div className="space-y-4 pt-2">
                    <Skeleton className="h-4 w-36" variant="rectangle" />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {[1, 2, 3, 4].map(i => (
                            <div key={i} className="bg-white border border-slate-200/80 rounded-2xl p-5 h-44 flex flex-col justify-between">
                                <div className="flex justify-between items-start">
                                    <div className="space-y-2">
                                        <Skeleton className="h-3 w-24" variant="rectangle" />
                                        <Skeleton className="h-5 w-56" variant="rounded" />
                                    </div>
                                    <Skeleton className="h-6 w-20" variant="rounded" />
                                </div>
                                <div className="flex gap-2">
                                    <Skeleton className="h-9 flex-1" variant="rounded" />
                                    <Skeleton className="h-9 flex-1" variant="rounded" />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-6xl mx-auto space-y-6 pb-20">
            {/* Header & Breadcrumb */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <Link
                        to="/instructor"
                        className="h-9 w-9 rounded-lg bg-white border border-slate-200 text-slate-500 hover:text-slate-900 hover:bg-slate-50 flex items-center justify-center transition-colors shadow-2xs shrink-0"
                        title="Voltar ao Painel"
                    >
                        <LucideChevronLeft className="h-4 w-4" />
                    </Link>
                    <div>
                        <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-0.5">
                            <span>Administração</span>
                            <span>/</span>
                            <span className="text-amber-600 font-medium">Chamadas Presenciais</span>
                        </div>
                        <h1 className="text-xl font-bold text-slate-900 tracking-tight leading-snug">
                            {turma?.name || 'Carregando...'}
                        </h1>
                    </div>
                </div>
                {(userRole === 'ADMIN' || userRole === 'SUPER_ADMIN') && (
                    <button
                        onClick={() => setIsCreateModalOpen(true)}
                        className="h-10 px-4 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-medium text-xs shadow-xs transition-all active:scale-[0.98] flex items-center justify-center gap-2 self-start sm:self-auto"
                    >
                        <LucidePlus className="h-4 w-4" /> Novo Encontro
                    </button>
                )}
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-white border border-slate-200/80 p-4 rounded-xl shadow-2xs flex items-center gap-3.5">
                    <div className="h-9 w-9 rounded-lg bg-amber-50 border border-amber-200/60 flex items-center justify-center text-amber-600 shrink-0">
                        <LucideUsers className="h-4 w-4" />
                    </div>
                    <div>
                        <p className="text-xs font-medium text-slate-500">Alunos na Turma</p>
                        <p className="text-xl font-bold tracking-tight text-slate-900">{studentCount}</p>
                    </div>
                </div>
                <div className="bg-white border border-slate-200/80 p-4 rounded-xl shadow-2xs flex items-center gap-3.5">
                    <div className="h-9 w-9 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-700 shrink-0">
                        <LucideQrCode className="h-4 w-4" />
                    </div>
                    <div>
                        <p className="text-xs font-medium text-slate-500">Total de Encontros</p>
                        <p className="text-xl font-bold tracking-tight text-slate-900">{meetings.length}</p>
                    </div>
                </div>
                <div className="bg-white border border-slate-200/80 p-4 rounded-xl shadow-2xs flex items-center gap-3.5">
                    <div className="h-9 w-9 rounded-lg bg-emerald-50 border border-emerald-200/60 flex items-center justify-center text-emerald-700 shrink-0">
                        <LucideCheckCircle2 className="h-4 w-4" />
                    </div>
                    <div>
                        <p className="text-xs font-medium text-slate-500">Presença Média</p>
                        <p className="text-xl font-bold tracking-tight text-slate-900">
                            {meetings.length > 0 && studentCount > 0
                                ? Math.round((meetings.reduce((acc, m) => acc + (m._count?.attendances || 0), 0) / (meetings.length * studentCount)) * 100)
                                : 0}%
                        </p>
                    </div>
                </div>
            </div>

            {/* Meetings List */}
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-sm font-semibold text-slate-900">Histórico de Chamadas</h2>
                        <p className="text-xs text-slate-500 mt-0.5">Sessões e registros de presenças</p>
                    </div>
                    {meetings.length > 0 && (
                        <span className="text-xs font-medium text-slate-500 bg-slate-100 px-2.5 py-1 rounded-lg">
                            {meetings.length} {meetings.length === 1 ? 'encontro' : 'encontros'}
                        </span>
                    )}
                </div>

                {meetings.length === 0 ? (
                    <div className="bg-white border border-dashed border-slate-200 rounded-2xl p-12 text-center space-y-3">
                        <div className="h-12 w-12 bg-slate-50 rounded-xl flex items-center justify-center mx-auto text-slate-400">
                            <LucideQrCode className="h-6 w-6" />
                        </div>
                        <div>
                            <p className="text-slate-900 font-semibold text-sm">Nenhum encontro criado</p>
                            <p className="text-slate-500 text-xs mt-0.5">
                                {userRole === 'ADMIN' || userRole === 'SUPER_ADMIN' 
                                    ? "Crie seu primeiro encontro para começar a registrar presenças." 
                                    : "Aguarde a criação de um encontro por um administrador."}
                            </p>
                        </div>
                        {(userRole === 'ADMIN' || userRole === 'SUPER_ADMIN') && (
                            <button 
                                onClick={() => setIsCreateModalOpen(true)}
                                className="h-9 px-3.5 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-xs font-medium transition-colors shadow-2xs inline-flex items-center gap-1.5"
                            >
                                <LucidePlus className="h-3.5 w-3.5" /> Criar Encontro
                            </button>
                        )}
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {meetings.map((meeting) => (
                            <div key={meeting.id} className="group bg-white border border-slate-200/80 hover:border-slate-300 rounded-2xl p-5 transition-all shadow-2xs flex flex-col justify-between gap-4">
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between gap-2">
                                        <div className="flex items-center gap-2">
                                            <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                                            <span className="text-xs font-medium text-slate-500">
                                                {(() => {
                                                    const [year, month, day] = meeting.date.split('T')[0].split('-').map(Number);
                                                    return new Date(year, month - 1, day).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long' });
                                                })()}
                                            </span>
                                        </div>

                                        <div className="flex items-center gap-1.5">
                                            <div className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md text-xs font-medium border border-slate-200/60 flex items-center gap-1.5">
                                                <LucideUsers className="h-3.5 w-3.5 text-slate-400" />
                                                <span>{meeting._count?.attendances || 0} Presentes</span>
                                            </div>

                                            {(userRole === 'ADMIN' || userRole === 'SUPER_ADMIN') && (
                                                <div className="flex items-center gap-0.5">
                                                    <button 
                                                        onClick={() => {
                                                            setEditingMeeting({ 
                                                                id: meeting.id, 
                                                                title: meeting.title, 
                                                                date: meeting.date.split('T')[0] 
                                                            });
                                                            setIsEditModalOpen(true);
                                                        }}
                                                        className="p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                                                        title="Editar"
                                                    >
                                                        <LucidePencil className="h-3.5 w-3.5" />
                                                    </button>
                                                    <button 
                                                        onClick={() => {
                                                            setMeetingToDelete(meeting.id);
                                                            setIsDeleteModalOpen(true);
                                                        }}
                                                        className="p-1 rounded-md text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                                                        title="Excluir"
                                                    >
                                                        <LucideTrash2 className="h-3.5 w-3.5" />
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <h3 className="text-base font-semibold text-slate-900 group-hover:text-amber-600 transition-colors leading-snug line-clamp-2">
                                        {meeting.title}
                                    </h3>
                                </div>

                                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100">
                                    <button
                                        onClick={() => openAttendance(meeting)}
                                        className="h-9 px-3 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200/80 font-medium text-xs transition-colors flex items-center justify-center gap-1.5"
                                    >
                                        Lista Manual
                                    </button>
                                    <Link
                                        to={`/instructor/meeting/${meeting.id}/project`}
                                        className="h-9 px-3 rounded-lg bg-slate-900 hover:bg-amber-500 text-white font-medium text-xs transition-colors shadow-2xs flex items-center justify-center gap-1.5"
                                    >
                                        <LucideQrCode className="h-3.5 w-3.5" />
                                        <span>Projetar QR</span>
                                    </Link>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Create Meeting Modal */}
            <PortalModal isOpen={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)}>
                <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-xl border border-slate-200/80 relative">
                    <div className="flex items-start justify-between mb-4">
                        <div>
                            <h2 className="text-lg font-bold tracking-tight text-slate-900">Novo Encontro</h2>
                            <p className="text-xs text-slate-500 mt-0.5">Crie uma nova sessão de chamada presencial.</p>
                        </div>
                        <button 
                            onClick={() => setIsCreateModalOpen(false)}
                            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                        >
                            <LucideX className="h-5 w-5" />
                        </button>
                    </div>

                    <form onSubmit={handleCreateMeeting} className="space-y-4">
                        <div className="space-y-1.5">
                            <label className="text-xs font-medium text-slate-700">Tema da Aula</label>
                            <input
                                required
                                type="text"
                                placeholder="Ex: Introdução ao Mercado"
                                value={newMeeting.title}
                                onChange={e => setNewMeeting({ ...newMeeting, title: e.target.value })}
                                className="w-full h-10 px-3 rounded-lg border border-slate-200 bg-white text-sm text-slate-900 placeholder:text-slate-400 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none transition-colors"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-xs font-medium text-slate-700">Data do Encontro</label>
                            <input
                                required
                                type="date"
                                value={newMeeting.date}
                                onChange={e => setNewMeeting({ ...newMeeting, date: e.target.value })}
                                className="w-full h-10 px-3 rounded-lg border border-slate-200 bg-white text-sm text-slate-900 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none transition-colors"
                            />
                        </div>
                        <div className="pt-2 flex items-center justify-end gap-2">
                            <button
                                type="button"
                                onClick={() => setIsCreateModalOpen(false)}
                                disabled={isSaving}
                                className="h-10 px-4 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 font-medium text-xs transition-colors"
                            >
                                Cancelar
                            </button>
                            <button 
                                disabled={isSaving} 
                                className="h-10 px-4 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-medium text-xs shadow-xs transition-all active:scale-[0.98] flex items-center gap-2 disabled:opacity-50"
                            >
                                {isSaving ? "Criando..." : "Criar Encontro"}
                            </button>
                        </div>
                    </form>
                </div>
            </PortalModal>

            {/* Edit Meeting Modal */}
            <PortalModal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)}>
                <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-xl border border-slate-200/80 relative">
                    <div className="flex items-start justify-between mb-4">
                        <div>
                            <h2 className="text-lg font-bold tracking-tight text-slate-900">Editar Encontro</h2>
                            <p className="text-xs text-slate-500 mt-0.5">Ajuste os detalhes da aula presencial.</p>
                        </div>
                        <button 
                            onClick={() => setIsEditModalOpen(false)}
                            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                        >
                            <LucideX className="h-5 w-5" />
                        </button>
                    </div>

                    {editingMeeting && (
                        <form onSubmit={handleUpdateMeeting} className="space-y-4">
                            <div className="space-y-1.5">
                                <label className="text-xs font-medium text-slate-700">Tema da Aula</label>
                                <input
                                    required
                                    type="text"
                                    value={editingMeeting.title}
                                    onChange={e => setEditingMeeting({ ...editingMeeting, title: e.target.value })}
                                    className="w-full h-10 px-3 rounded-lg border border-slate-200 bg-white text-sm text-slate-900 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none transition-colors"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-medium text-slate-700">Data do Encontro</label>
                                <input
                                    required
                                    type="date"
                                    value={editingMeeting.date}
                                    onChange={e => setEditingMeeting({ ...editingMeeting, date: e.target.value })}
                                    className="w-full h-10 px-3 rounded-lg border border-slate-200 bg-white text-sm text-slate-900 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none transition-colors"
                                />
                            </div>
                            <div className="pt-2 flex items-center justify-end gap-2">
                                <button
                                    type="button"
                                    onClick={() => setIsEditModalOpen(false)}
                                    disabled={isSaving}
                                    className="h-10 px-4 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 font-medium text-xs transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button 
                                    disabled={isSaving} 
                                    className="h-10 px-4 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-medium text-xs shadow-xs transition-all active:scale-[0.98] flex items-center gap-2 disabled:opacity-50"
                                >
                                    {isSaving ? "Salvando..." : "Salvar Alterações"}
                                </button>
                            </div>
                        </form>
                    )}
                </div>
            </PortalModal>

            <ConfirmModal 
                isOpen={isDeleteModalOpen}
                onClose={() => {
                    setIsDeleteModalOpen(false);
                    setMeetingToDelete(null);
                }}
                onConfirm={handleDeleteMeeting}
                isLoading={isSaving}
                title="Excluir Encontro?"
                description="Todas as presenças marcadas neste encontro serão perdidas permanentemente."
                confirmText="Sim, Excluir"
            />

            {/* Manual Attendance Modal */}
            <PortalModal isOpen={isAttendanceModalOpen} onClose={() => setIsAttendanceModalOpen(false)}>
                <div className="bg-white rounded-2xl p-6 max-w-xl w-full shadow-xl border border-slate-200/80 max-h-[85vh] flex flex-col">
                    <div className="flex items-start justify-between mb-4">
                        <div>
                            <div className="flex items-center gap-2">
                                <h2 className="text-lg font-bold tracking-tight text-slate-900">Lista de Presença</h2>
                                {sortedUsers && (
                                    <span className="text-xs font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                                        {sortedUsers.length} alunos
                                    </span>
                                )}
                            </div>
                            <p className="text-xs text-slate-500 mt-0.5">Controle manual de presenças neste encontro.</p>
                        </div>
                        <button 
                            onClick={() => setIsAttendanceModalOpen(false)}
                            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                        >
                            <LucideX className="h-5 w-5" />
                        </button>
                    </div>
                    
                    <div className="h-px bg-slate-100 mb-4" />
                    
                    {isLoadingDetails ? (
                        <div className="flex-1 flex items-center justify-center py-20"><LoadingSpinner size="md" /></div>
                    ) : (
                        <div className="flex-1 overflow-y-auto pr-1 space-y-2">
                            {!sortedUsers || sortedUsers.length === 0 ? (
                                <div className="text-center py-16 space-y-2">
                                    <div className="h-12 w-12 bg-slate-50 rounded-xl flex items-center justify-center mx-auto text-slate-300">
                                        <LucideUsers className="h-6 w-6" />
                                    </div>
                                    <p className="text-slate-600 font-medium text-sm">Nenhum aluno cadastrado nesta turma.</p>
                                </div>
                            ) : (
                                sortedUsers.map((user: any) => {
                                    const isPresent = meetingDetails?.attendances?.some((a: any) => a.userId === user.id);
                                    return (
                                        <div key={user.id} className="flex items-center justify-between p-3 rounded-xl bg-white border border-slate-200/80 hover:border-slate-300 transition-colors">
                                            <div className="flex items-center gap-3 min-w-0">
                                                <div className="h-9 w-9 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-700 text-xs font-semibold overflow-hidden shrink-0">
                                                    {user.avatarUrl ? (
                                                        <img 
                                                            src={user.avatarUrl} 
                                                            alt={user.name} 
                                                            className="w-full h-full object-cover"
                                                            onError={(e) => {
                                                                const target = e.target as HTMLImageElement;
                                                                target.style.display = 'none';
                                                            }}
                                                        />
                                                    ) : (
                                                        <span>{user.name?.charAt(0).toUpperCase()}</span>
                                                    )}
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="text-sm font-medium text-slate-900 truncate">{user.name}</p>
                                                    <p className="text-xs text-slate-400 truncate">{user.email}</p>
                                                </div>
                                            </div>
                                            <button
                                                disabled={processingUsers[user.id]}
                                                onClick={() => toggleManualAttendance(user.id)}
                                                className={`h-8 px-3 rounded-lg flex items-center gap-1.5 transition-colors font-medium text-xs shrink-0 ${
                                                    processingUsers[user.id] 
                                                        ? 'bg-slate-50 text-slate-300 cursor-not-allowed' 
                                                        : isPresent 
                                                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/80 hover:bg-emerald-100/80' 
                                                            : 'bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100'
                                                }`}
                                            >
                                                {processingUsers[user.id] ? (
                                                    <LucideLoader2 className="h-3.5 w-3.5 animate-spin" />
                                                ) : isPresent ? (
                                                    <LucideCheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                                                ) : (
                                                    <div className="h-3 w-3 rounded-full border-2 border-slate-300" />
                                                )}
                                                <span>{processingUsers[user.id] ? 'Salvando...' : isPresent ? 'Presente' : 'Dar Presença'}</span>
                                            </button>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    )}
                </div>
            </PortalModal>
        </div>
    );
}

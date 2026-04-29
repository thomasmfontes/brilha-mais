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
            <div className="max-w-6xl mx-auto space-y-8 pb-20">
                {/* Header Skeleton */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <Skeleton className="h-10 w-10" variant="rounded" />
                        <div className="space-y-2">
                            <Skeleton className="h-2 w-24" variant="rectangle" />
                            <Skeleton className="h-6 w-48" variant="rounded" />
                        </div>
                    </div>
                    <Skeleton className="h-12 w-40" variant="rounded" />
                </div>

                {/* Stats Skeleton */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="bg-white border border-slate-100 p-5 rounded-3xl h-24 flex items-center gap-4">
                            <Skeleton className="h-12 w-12" variant="rounded" />
                            <div className="space-y-2 flex-1">
                                <Skeleton className="h-2 w-1/2" variant="rectangle" />
                                <Skeleton className="h-5 w-1/3" variant="rounded" />
                            </div>
                        </div>
                    ))}
                </div>

                {/* Cards Skeleton */}
                <div className="space-y-6 pt-4">
                    <Skeleton className="h-3 w-32 mx-2" variant="rectangle" />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {[1, 2, 3, 4].map(i => (
                            <div key={i} className="bg-white border border-slate-100 rounded-[2rem] p-6 h-48 flex flex-col justify-between">
                                <div className="flex justify-between items-start">
                                    <div className="space-y-3">
                                        <Skeleton className="h-3 w-24" variant="rectangle" />
                                        <Skeleton className="h-6 w-56" variant="rounded" />
                                    </div>
                                    <Skeleton className="h-8 w-20" variant="rounded" />
                                </div>
                                <div className="flex gap-3">
                                    <Skeleton className="h-12 flex-1" variant="rounded" />
                                    <Skeleton className="h-12 flex-1" variant="rounded" />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-6xl mx-auto space-y-8 pb-20">
            {/* Header & Breadcrumb */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <Link to="/instructor" className="h-10 w-10 rounded-xl bg-white border border-slate-200 text-slate-400 hover:text-primary hover:border-primary/30 flex items-center justify-center transition-all shadow-sm">
                        <LucideChevronLeft className="h-5 w-5" />
                    </Link>
                    <div>
                        <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-1">
                            <span>Administração</span>
                            <span>/</span>
                            <span className="text-primary">Chamadas Presenciais</span>
                        </div>
                        <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tight leading-none">
                            {turma?.name || 'Carregando...'}
                        </h1>
                    </div>
                </div>
                {(userRole === 'ADMIN' || userRole === 'SUPER_ADMIN') && (
                    <button
                        onClick={() => setIsCreateModalOpen(true)}
                        className="bg-primary text-white px-6 py-3.5 rounded-2xl font-black uppercase tracking-widest text-[10px] flex items-center justify-center gap-2 hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 active:scale-95"
                    >
                        <LucidePlus className="h-4 w-4" /> Novo Encontro
                    </button>
                )}
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white border border-slate-200/60 p-5 rounded-3xl shadow-sm flex items-center gap-4">
                    <div className="h-12 w-12 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400">
                        <LucideUsers className="h-5 w-5" />
                    </div>
                    <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Alunos na Turma</p>
                        <p className="text-xl font-black text-slate-900">{studentCount}</p>
                    </div>
                </div>
                <div className="bg-white border border-slate-200/60 p-5 rounded-3xl shadow-sm flex items-center gap-4">
                    <div className="h-12 w-12 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-500">
                        <LucideQrCode className="h-5 w-5" />
                    </div>
                    <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Total de Encontros</p>
                        <p className="text-xl font-black text-slate-900">{meetings.length}</p>
                    </div>
                </div>
                <div className="bg-white border border-slate-200/60 p-5 rounded-3xl shadow-sm flex items-center gap-4">
                    <div className="h-12 w-12 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-500">
                        <LucideCheckCircle2 className="h-5 w-5" />
                    </div>
                    <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Presença Média</p>
                        <p className="text-xl font-black text-slate-900">
                            {meetings.length > 0 && studentCount > 0
                                ? Math.round((meetings.reduce((acc, m) => acc + (m._count?.attendances || 0), 0) / (meetings.length * studentCount)) * 100)
                                : 0}%
                        </p>
                    </div>
                </div>
            </div>

            {/* Meetings List */}
            <div className="space-y-4">
                <div className="flex items-center gap-3 px-2">
                    <h2 className="text-xs font-black uppercase tracking-[0.25em] text-slate-400">Histórico de Chamadas</h2>
                    <div className="h-px flex-1 bg-slate-100"></div>
                </div>

                {meetings.length === 0 ? (
                    <div className="bg-white border border-dashed border-slate-200 rounded-[2.5rem] p-20 text-center space-y-4">
                        <div className="h-16 w-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto text-slate-300">
                            <LucideQrCode className="h-8 w-8" />
                        </div>
                        <div>
                            <p className="text-slate-900 font-black uppercase tracking-tight">Nenhum encontro criado</p>
                            <p className="text-slate-400 text-sm font-bold mt-1">
                                {userRole === 'ADMIN' || userRole === 'SUPER_ADMIN' 
                                    ? "Crie seu primeiro encontro para começar a marcar presenças." 
                                    : "Aguarde a criação de um encontro por um administrador."}
                            </p>
                        </div>
                        {(userRole === 'ADMIN' || userRole === 'SUPER_ADMIN') && (
                            <button 
                                onClick={() => setIsCreateModalOpen(true)}
                                className="text-primary font-black uppercase tracking-widest text-[10px] hover:underline"
                            >
                                Criar encontro agora
                            </button>
                        )}
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {meetings.map((meeting) => (
                            <div key={meeting.id} className="group bg-white border border-slate-200 hover:border-primary/20 rounded-[2rem] p-6 transition-all hover:shadow-xl hover:shadow-slate-200/50 flex flex-col justify-between gap-6">
                                <div className="flex flex-col md:flex-row justify-between items-start gap-4">
                                    <div className="space-y-1 w-full md:w-auto">
                                        <div className="flex items-center justify-between md:justify-start gap-2">
                                            <div className="flex items-center gap-2">
                                                <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
                                                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                                                    {(() => {
                                                        const [year, month, day] = meeting.date.split('T')[0].split('-').map(Number);
                                                        return new Date(year, month - 1, day).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long' });
                                                    })()}
                                                </span>
                                            </div>
                                            
                                            {/* Mobile-only Actions Icons */}
                                            {(userRole === 'ADMIN' || userRole === 'SUPER_ADMIN') && (
                                                <div className="flex md:hidden gap-1">
                                                    <button 
                                                        onClick={() => {
                                                            setEditingMeeting({ 
                                                                id: meeting.id, 
                                                                title: meeting.title, 
                                                                date: meeting.date.split('T')[0] 
                                                            });
                                                            setIsEditModalOpen(true);
                                                        }}
                                                        className="p-1.5 text-slate-400 hover:text-primary transition-colors"
                                                    >
                                                        <LucidePencil className="h-3.5 w-3.5" />
                                                    </button>
                                                    <button 
                                                        onClick={() => {
                                                            setMeetingToDelete(meeting.id);
                                                            setIsDeleteModalOpen(true);
                                                        }}
                                                        className="p-1.5 text-slate-400 hover:text-destructive transition-colors"
                                                    >
                                                        <LucideTrash2 className="h-3.5 w-3.5" />
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                        <h3 className="text-base md:text-lg font-black text-slate-900 uppercase tracking-tight leading-tight group-hover:text-primary transition-colors">
                                            {meeting.title}
                                        </h3>
                                    </div>
                                    
                                    <div className="flex items-center justify-between md:justify-end w-full md:w-auto gap-2">
                                        <div className="bg-slate-50 text-slate-600 px-3 py-1.5 rounded-xl text-[9px] md:text-[10px] font-black uppercase tracking-widest border border-slate-100 flex items-center gap-2 shrink-0">
                                            <LucideUsers className="h-3 w-3" />
                                            {meeting._count?.attendances || 0} Presentes
                                        </div>
                                        
                                        {/* Desktop-only Actions Icons */}
                                        {(userRole === 'ADMIN' || userRole === 'SUPER_ADMIN') && (
                                            <div className="hidden md:flex gap-1">
                                                <button 
                                                    onClick={() => {
                                                        setEditingMeeting({ 
                                                            id: meeting.id, 
                                                            title: meeting.title, 
                                                            date: meeting.date.split('T')[0] 
                                                        });
                                                        setIsEditModalOpen(true);
                                                    }}
                                                    className="p-2 text-slate-400 hover:text-primary transition-colors"
                                                >
                                                    <LucidePencil className="h-4 w-4" />
                                                </button>
                                                <button 
                                                    onClick={() => {
                                                        setMeetingToDelete(meeting.id);
                                                        setIsDeleteModalOpen(true);
                                                    }}
                                                    className="p-2 text-slate-400 hover:text-destructive transition-colors"
                                                >
                                                    <LucideTrash2 className="h-4 w-4" />
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="flex flex-col md:grid md:grid-cols-2 gap-3 mt-2">
                                    <button
                                        onClick={() => openAttendance(meeting)}
                                        className="w-full flex items-center justify-center gap-2 bg-slate-50 text-slate-600 py-3.5 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-slate-100 transition-all border border-slate-100 order-2 md:order-1"
                                    >
                                        Lista Manual
                                    </button>
                                    <Link
                                        to={`/instructor/meeting/${meeting.id}/project`}
                                        className="w-full flex items-center justify-center gap-2 bg-slate-900 text-white py-3.5 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-black transition-all shadow-md active:scale-95 order-1 md:order-2"
                                    >
                                        <LucideQrCode className="h-4 w-4" /> Projetar QR
                                    </Link>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Create Meeting Modal */}
            <PortalModal isOpen={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)}>
                <div className="bg-white rounded-[2.5rem] p-8 max-w-md w-full shadow-2xl border border-slate-100 relative overflow-hidden">
                    <button 
                        onClick={() => setIsCreateModalOpen(false)}
                        className="absolute top-6 right-6 p-2 text-slate-300 hover:text-slate-600 hover:bg-slate-50 rounded-full transition-all"
                    >
                        <LucideX className="h-4 w-4" />
                    </button>

                    <div className="space-y-1 mb-6">
                        <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-primary">
                            <LucidePlus className="h-3 w-3" />
                            <span>Presença</span>
                        </div>
                        <h2 className="text-2xl font-black uppercase tracking-tight text-slate-900 leading-tight">Novo Encontro</h2>
                        <p className="text-[10px] font-black uppercase tracking-[0.1em] text-slate-400">Crie uma nova sessão de chamada presencial.</p>
                    </div>

                    <form onSubmit={handleCreateMeeting} className="space-y-5">
                        <div className="space-y-2">
                            <label className="text-[10px] uppercase font-black tracking-widest text-slate-400 ml-1">Tema da Aula</label>
                            <input
                                required
                                type="text"
                                placeholder="Ex: Introdução ao Mercado"
                                value={newMeeting.title}
                                onChange={e => setNewMeeting({ ...newMeeting, title: e.target.value })}
                                className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 outline-none focus:ring-2 focus:ring-primary/20 font-bold text-slate-900 transition-all"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] uppercase font-black tracking-widest text-slate-400 ml-1">Data do Encontro</label>
                            <input
                                required
                                type="date"
                                value={newMeeting.date}
                                onChange={e => setNewMeeting({ ...newMeeting, date: e.target.value })}
                                className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 outline-none focus:ring-2 focus:ring-primary/20 font-bold text-slate-900 transition-all"
                            />
                        </div>
                        <button 
                            disabled={isSaving} 
                            className="w-full bg-primary text-white py-4 rounded-2xl font-black uppercase tracking-[0.2em] text-[11px] hover:bg-primary/90 transition-all mt-4 shadow-lg shadow-primary/20 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isSaving ? "Criando..." : "Criar Encontro"}
                        </button>
                    </form>
                </div>
            </PortalModal>

            {/* Edit Meeting Modal */}
            <PortalModal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)}>
                <div className="bg-white rounded-[2.5rem] p-8 max-w-md w-full shadow-2xl border border-slate-100 relative overflow-hidden">
                    <button 
                        onClick={() => setIsEditModalOpen(false)}
                        className="absolute top-6 right-6 p-2 text-slate-300 hover:text-slate-600 hover:bg-slate-50 rounded-full transition-all"
                    >
                        <LucideX className="h-4 w-4" />
                    </button>

                    <div className="space-y-1 mb-6">
                        <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-primary">
                            <LucidePencil className="h-3 w-3" />
                            <span>Edição</span>
                        </div>
                        <h2 className="text-2xl font-black uppercase tracking-tight text-slate-900 leading-tight">Editar Encontro</h2>
                        <p className="text-[10px] font-black uppercase tracking-[0.1em] text-slate-400">Ajuste os detalhes da aula presencial.</p>
                    </div>

                    {editingMeeting && (
                        <form onSubmit={handleUpdateMeeting} className="space-y-5">
                            <div className="space-y-2">
                                <label className="text-[10px] uppercase font-black tracking-widest text-slate-400 ml-1">Tema da Aula</label>
                                <input
                                    required
                                    type="text"
                                    value={editingMeeting.title}
                                    onChange={e => setEditingMeeting({ ...editingMeeting, title: e.target.value })}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 outline-none focus:ring-2 focus:ring-primary/20 font-bold text-slate-900 transition-all"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] uppercase font-black tracking-widest text-slate-400 ml-1">Data do Encontro</label>
                                <input
                                    required
                                    type="date"
                                    value={editingMeeting.date}
                                    onChange={e => setEditingMeeting({ ...editingMeeting, date: e.target.value })}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 outline-none focus:ring-2 focus:ring-primary/20 font-bold text-slate-900 transition-all"
                                />
                            </div>
                            <button 
                                disabled={isSaving} 
                                className="w-full bg-primary text-white py-4 rounded-2xl font-black uppercase tracking-[0.2em] text-[11px] hover:bg-primary/90 transition-all mt-4 shadow-lg shadow-primary/20 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isSaving ? "Salvando..." : "Confirmar Alterações"}
                            </button>
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
                <div className="bg-white rounded-[2.5rem] p-8 max-w-2xl w-full shadow-2xl space-y-6 border border-slate-100 max-h-[85vh] flex flex-col">
                    <div className="space-y-1">
                        <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-primary">
                            <LucideUsers className="h-3 w-3" />
                            <span>Controle Manual</span>
                        </div>
                        <h2 className="text-2xl font-black uppercase tracking-tight text-slate-900">Lista de Presença</h2>
                    </div>
                    
                    <div className="h-px bg-slate-100"></div>
                    
                    {isLoadingDetails ? (
                        <div className="flex-1 flex items-center justify-center py-20"><LoadingSpinner /></div>
                    ) : (
                        <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-2">
                            {!sortedUsers || sortedUsers.length === 0 ? (
                                <div className="text-center py-20 space-y-4">
                                    <div className="h-12 w-12 bg-slate-50 rounded-full flex items-center justify-center mx-auto text-slate-300">
                                        <LucideUsers className="h-6 w-6" />
                                    </div>
                                    <p className="text-slate-400 font-bold text-sm">Nenhum aluno cadastrado nesta turma.</p>
                                </div>
                            ) : (
                                sortedUsers.map((user: any) => {
                                    const isPresent = meetingDetails?.attendances?.some((a: any) => a.userId === user.id);
                                    return (
                                        <div key={user.id} className="flex items-center justify-between p-4 rounded-[1.5rem] bg-white border border-slate-100 hover:border-slate-200 transition-all group">
                                            <div className="flex items-center gap-4">
                                                <div className="h-11 w-11 rounded-xl bg-slate-50 border border-slate-100 uppercase font-black flex items-center justify-center text-slate-400 text-sm group-hover:bg-primary/5 group-hover:text-primary transition-colors overflow-hidden shrink-0 shadow-sm relative">
                                                    {user.avatarUrl ? (
                                                        <>
                                                            <img 
                                                                src={user.avatarUrl} 
                                                                alt={user.name} 
                                                                className="w-full h-full object-cover"
                                                                onError={(e) => {
                                                                    const target = e.target as HTMLImageElement;
                                                                    target.style.display = 'none';
                                                                    const fallback = target.nextElementSibling as HTMLElement;
                                                                    if (fallback) fallback.style.display = 'flex';
                                                                }}
                                                            />
                                                            <span className="hidden w-full h-full items-center justify-center">{user.name?.charAt(0)}</span>
                                                        </>
                                                    ) : (
                                                        <span>{user.name?.charAt(0)}</span>
                                                    )}
                                                </div>
                                                <div>
                                                    <p className="text-sm font-black uppercase tracking-tight text-slate-900 leading-tight">{user.name}</p>
                                                    <p className="text-[10px] text-slate-400 font-bold">{user.email}</p>
                                                </div>
                                            </div>
                                            <button
                                                disabled={processingUsers[user.id]}
                                                onClick={() => toggleManualAttendance(user.id)}
                                                className={`px-5 py-2.5 rounded-xl flex items-center gap-2 transition-all font-black text-[10px] uppercase tracking-widest ${processingUsers[user.id] ? 'bg-slate-50 text-slate-300 cursor-not-allowed' : isPresent ? 'bg-emerald-50 text-emerald-600 border border-emerald-100 shadow-sm hover:bg-emerald-100' : 'bg-slate-50 text-slate-400 border border-transparent hover:border-slate-200 hover:text-slate-600 shadow-sm'}`}
                                            >
                                                {processingUsers[user.id] ? (
                                                    <LucideLoader2 className="h-3 w-3 animate-spin" />
                                                ) : isPresent ? (
                                                    <LucideCheckCircle2 className="h-3 w-3" />
                                                ) : (
                                                    <div className="h-3 w-3 rounded-full border-2 border-slate-300" />
                                                )}
                                                {processingUsers[user.id] ? 'Salvando...' : isPresent ? 'Presente' : 'Dar Presença'}
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

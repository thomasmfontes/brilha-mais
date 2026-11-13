import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { CheckCircle2, Clock, Lock, FileX2, ArrowLeft } from 'lucide-react';
import api from '../utils/api';
import { AnswerEntry, FormModel } from '../utils/formTypes';
import { DynamicFormRenderer, FormBrandHeader } from '../components/forms/DynamicFormRenderer';
import { RichTextRenderer } from '../components/forms/RichTextRenderer';
import logo from '../assets/logo.png';

export default function PublicFormPage() {
    const { slug } = useParams<{ slug: string }>();
    const [form, setForm] = useState<FormModel | null>(null);
    const [loading, setLoading] = useState(true);
    const [notFound, setNotFound] = useState(false);

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState<string | null>(null);
    const [submittedResult, setSubmittedResult] = useState<{
        confirmationTitle?: string | null;
        confirmationMessage?: string | null;
    } | null>(null);

    const submittedStorageKey = `brilha_form_submitted_${slug}`;

    useEffect(() => {
        if (!slug) return;
        let cancelled = false;

        const fetchForm = async () => {
            setLoading(true);
            setNotFound(false);
            try {
                const res = await api.get(`/forms/public/${slug}`);
                if (!cancelled) {
                    setForm(res.data);
                    if (res.data.enforceSingleSubmission) {
                        try {
                            const saved = localStorage.getItem(submittedStorageKey);
                            if (saved) {
                                setSubmittedResult(JSON.parse(saved));
                            }
                        } catch {}
                    }
                }
            } catch (err: any) {
                if (!cancelled) {
                    if (err.response?.status === 404) {
                        setNotFound(true);
                    }
                }
            } finally {
                if (!cancelled) setLoading(false);
            }
        };

        fetchForm();
        return () => {
            cancelled = true;
        };
    }, [slug, submittedStorageKey]);

    const handleSubmitAnswers = async (answers: Record<string, AnswerEntry>) => {
        if (!slug) return;
        setIsSubmitting(true);
        setSubmitError(null);
        try {
            const res = await api.post(`/forms/public/${slug}/submit`, { answers });
            const confirmation = {
                confirmationTitle: res.data.confirmationTitle,
                confirmationMessage: res.data.confirmationMessage,
            };
            setSubmittedResult(confirmation);
            try {
                localStorage.removeItem(`brilha_form_draft_${slug}`);
                if (form?.enforceSingleSubmission) {
                    localStorage.setItem(
                        submittedStorageKey,
                        JSON.stringify(confirmation),
                    );
                }
            } catch {}
            window.scrollTo({ top: 0, behavior: 'smooth' });
        } catch (err: any) {
            const msg =
                err.response?.data?.message ||
                'Não foi possível enviar sua inscrição. Verifique os campos e tente novamente.';
            setSubmitError(Array.isArray(msg) ? msg.join(' ') : msg);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        } finally {
            setIsSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-[100dvh] bg-[#FAFAF9] overflow-x-hidden flex flex-col">
                <FormBrandHeader />
                <main className="flex-1 w-full py-6 sm:py-8 px-3.5 sm:px-4">
                    <div className="max-w-3xl mx-auto space-y-5">
                        <div className="bg-white border border-zinc-200/80 rounded-2xl p-5 sm:p-8 space-y-4 shadow-sm">
                            <div className="h-7 w-3/4 bg-zinc-200/70 rounded-lg animate-pulse" />
                            <div className="h-4 w-full bg-zinc-100 rounded-lg animate-pulse" />
                            <div className="h-4 w-2/3 bg-zinc-100 rounded-lg animate-pulse" />
                        </div>
                        <div className="bg-white border border-zinc-200/80 rounded-2xl p-5 sm:p-8 space-y-5 shadow-sm">
                            <div className="h-5 w-1/3 bg-zinc-200/70 rounded-lg animate-pulse" />
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="h-11 sm:col-span-2 bg-zinc-100 rounded-xl animate-pulse" />
                                <div className="h-11 bg-zinc-100 rounded-xl animate-pulse" />
                                <div className="h-11 bg-zinc-100 rounded-xl animate-pulse" />
                            </div>
                        </div>
                    </div>
                </main>
            </div>
        );
    }

    if (notFound || !form) {
        return (
            <div className="min-h-[100dvh] bg-[#FAFAF9] overflow-x-hidden flex flex-col">
                <FormBrandHeader />
                <main className="flex-1 flex items-center justify-center px-4 py-10 sm:py-12">
                    <div className="max-w-md w-full bg-white border border-zinc-200/80 rounded-2xl p-7 text-center space-y-4 shadow-sm">
                        <div className="w-12 h-12 rounded-xl bg-zinc-100 border border-zinc-200/70 flex items-center justify-center mx-auto text-zinc-500">
                            <FileX2 className="h-6 w-6" />
                        </div>
                        <h1 className="text-xl font-bold text-zinc-900">
                            Formulário não encontrado
                        </h1>
                        <p className="text-sm text-zinc-500 leading-relaxed">
                            O link de inscrição acessado não existe ou foi removido pela coordenação.
                        </p>
                        <Link
                            to="/"
                            className="inline-flex items-center justify-center gap-2 h-10 px-5 rounded-xl bg-[#F19B0A] hover:bg-[#D98B08] text-white text-sm font-semibold transition-all"
                        >
                            <ArrowLeft className="h-4 w-4" />
                            <span>Voltar para a página inicial</span>
                        </Link>
                    </div>
                </main>
            </div>
        );
    }

    if (submittedResult) {
        return (
            <div className="min-h-[100dvh] bg-[#FAFAF9] overflow-x-hidden flex flex-col">
                <FormBrandHeader linkHome={false} />
                <main className="flex-1 flex items-center justify-center px-4 py-10 sm:py-12">
                    <div className="max-w-lg w-full bg-white border border-zinc-200/80 rounded-2xl overflow-hidden shadow-sm">
                        <div className="p-7 sm:p-8 space-y-5 text-center">
                            <div className="w-14 h-14 rounded-2xl bg-emerald-50 border border-emerald-200/70 flex items-center justify-center mx-auto text-emerald-600">
                                <CheckCircle2 className="h-7 w-7" />
                            </div>
                            <div className="space-y-2">
                                <p className="text-xs font-medium text-zinc-500">{form.title}</p>
                                <h1 className="text-2xl font-bold tracking-tight text-zinc-900">
                                    {submittedResult.confirmationTitle ||
                                        'Inscrição recebida com sucesso!'}
                                </h1>
                            </div>
                            {submittedResult.confirmationMessage ? (
                                <div className="bg-zinc-50/80 border border-zinc-200/70 rounded-xl p-4 text-left">
                                    <RichTextRenderer content={submittedResult.confirmationMessage} />
                                </div>
                            ) : (
                                <p className="text-sm text-zinc-500 leading-relaxed">
                                    Sua inscrição foi registrada. Em caso de dúvidas, entre em contato com a coordenação do projeto Brilha Mais.
                                </p>
                            )}
                        </div>
                    </div>
                </main>
            </div>
        );
    }

    if (form.availabilityStatus && form.availabilityStatus !== 'OPEN') {
        const isNotStarted = form.availabilityStatus === 'NOT_STARTED';
        const isClosed = form.availabilityStatus === 'CLOSED';
        return (
            <div className="min-h-[100dvh] bg-[#FAFAF9] overflow-x-hidden flex flex-col">
                <FormBrandHeader />
                <main className="flex-1 flex items-center justify-center px-4 py-10 sm:py-12">
                    <div className="max-w-md w-full bg-white border border-zinc-200/80 rounded-2xl overflow-hidden shadow-sm">
                        <div className="p-7 text-center space-y-4">
                            <div className="w-12 h-12 rounded-xl bg-amber-50 border border-amber-200/70 flex items-center justify-center mx-auto text-[#F19B0A]">
                                {isNotStarted || isClosed ? (
                                    <Clock className="h-6 w-6" />
                                ) : (
                                    <Lock className="h-6 w-6" />
                                )}
                            </div>
                            <h1 className="text-xl font-bold text-zinc-900">{form.title}</h1>
                            <p className="text-sm text-zinc-500 leading-relaxed">
                                {isNotStarted && form.opensAt
                                    ? `As inscrições abrirão em ${new Date(form.opensAt).toLocaleString('pt-BR')}.`
                                    : isClosed
                                      ? 'O período de inscrições para este formulário foi encerrado.'
                                      : 'Este formulário não está aceitando respostas no momento.'}
                            </p>
                            <Link
                                to="/"
                                className="inline-flex items-center justify-center gap-2 h-10 px-5 rounded-xl border border-zinc-200/90 hover:bg-zinc-50 text-sm font-semibold text-zinc-700 transition-colors"
                            >
                                <ArrowLeft className="h-4 w-4" />
                                <span>Voltar ao início</span>
                            </Link>
                        </div>
                    </div>
                </main>
            </div>
        );
    }

    return (
        <div className="min-h-[100dvh] bg-[#FAFAF9] overflow-x-hidden flex flex-col">
            <FormBrandHeader />
            <main className="flex-1 w-full pt-4 pb-[max(2rem,env(safe-area-inset-bottom))] sm:py-8 px-3.5 sm:px-4">
                <div className="max-w-3xl mx-auto space-y-6">
                    <DynamicFormRenderer
                        form={form}
                        onSubmitAnswers={handleSubmitAnswers}
                        isSubmitting={isSubmitting}
                        submitError={submitError}
                    />

                    <footer className="pt-4 pb-6 flex flex-col items-center gap-2 text-center">
                        <Link to="/" className="opacity-80 hover:opacity-100 transition-opacity">
                            <img src={logo} alt="Brilha Mais" className="h-6 w-auto object-contain" />
                        </Link>
                        <p className="text-xs text-zinc-400">
                            Plataforma Brilha Mais · Ficha oficial de inscrição
                        </p>
                    </footer>
                </div>
            </main>
        </div>
    );
}

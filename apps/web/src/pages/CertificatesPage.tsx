import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { LucideDownload, LucideAward, LucideEye, LucideLoader2, LucideX, LucideCalendar, LucideExternalLink } from "lucide-react";
import Skeleton from "../components/Skeleton";
import { PortalModal } from "../components/PortalModal";
import api from "../utils/api";
import toast from "react-hot-toast";
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

// Configure CDN worker for instant, reliable loading across all browsers and environments
pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface CertificateItem {
    id: string;
    name: string;
    url: string;
    type: string;
    size?: string;
    createdAt: string;
}

const isImageFile = (url: string, name: string) => {
    const lowerUrl = url.toLowerCase();
    const lowerName = name.toLowerCase();
    return lowerUrl.endsWith('.jpg') || lowerUrl.endsWith('.jpeg') || lowerUrl.endsWith('.png') || lowerUrl.endsWith('.webp') ||
           lowerName.endsWith('.jpg') || lowerName.endsWith('.jpeg') || lowerName.endsWith('.png') || lowerName.endsWith('.webp');
};

function CertificatePreviewContent({ cert }: { cert: CertificateItem }) {
    const containerRef = useRef<HTMLDivElement>(null);
    const [containerWidth, setContainerWidth] = useState<number>(0);
    const [isPageLoaded, setIsPageLoaded] = useState(false);
    const isImg = isImageFile(cert.url, cert.name);

    useEffect(() => {
        setIsPageLoaded(false);
        const updateWidth = () => {
            if (containerRef.current) {
                const w = containerRef.current.clientWidth;
                // Leave 16px safety padding so no scrollbar ever triggers
                setContainerWidth(Math.max(w - 16, 260));
            }
        };

        updateWidth();
        const obs = new ResizeObserver(updateWidth);
        if (containerRef.current) obs.observe(containerRef.current);
        window.addEventListener('resize', updateWidth);

        return () => {
            obs.disconnect();
            window.removeEventListener('resize', updateWidth);
        };
    }, [cert.url]);

    if (isImg) {
        return (
            <div className="w-full flex items-center justify-center p-2 md:p-4">
                <img
                    src={cert.url}
                    alt={cert.name}
                    className="w-full h-auto max-h-[75vh] object-contain rounded-2xl shadow-xl border border-slate-200/80 bg-white"
                />
            </div>
        );
    }

    return (
        <div ref={containerRef} className="w-full flex flex-col items-center justify-center p-1 md:p-3 overflow-hidden min-h-[220px] md:min-h-[380px] relative">
            {/* Loading Indicator when rendering canvas */}
            {!isPageLoaded && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-slate-50/80 rounded-2xl z-10">
                    <div className="p-4 rounded-2xl bg-amber-50 border border-amber-100 text-amber-500 flex items-center justify-center shadow-inner">
                        <LucideLoader2 className="h-7 w-7 animate-spin text-amber-500" />
                    </div>
                    <p className="text-[11px] font-black uppercase tracking-widest text-slate-500 animate-pulse">
                        Renderizando Certificado...
                    </p>
                </div>
            )}

            <Document
                file={cert.url}
                loading={null}
                error={
                    <div className="py-10 flex flex-col items-center justify-center gap-3 text-center px-4">
                        <p className="text-sm font-bold text-red-500">Erro ao carregar o visualizador direto.</p>
                        <a
                            href={cert.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs font-bold text-primary underline uppercase tracking-wider flex items-center gap-1.5"
                        >
                            <LucideExternalLink className="h-4 w-4" /> Abrir certificado em nova aba
                        </a>
                    </div>
                }
                className="flex items-center justify-center w-full"
            >
                {containerWidth > 0 && (
                    <div className={`rounded-2xl overflow-hidden shadow-xl border border-slate-200/80 bg-white flex items-center justify-center max-w-full transition-opacity duration-300 ${isPageLoaded ? 'opacity-100' : 'opacity-0'}`}>
                        <Page
                            pageNumber={1}
                            width={containerWidth}
                            renderTextLayer={false}
                            renderAnnotationLayer={false}
                            onRenderSuccess={() => setIsPageLoaded(true)}
                        />
                    </div>
                )}
            </Document>
        </div>
    );
}

export default function CertificatesPage() {
    const [certificates, setCertificates] = useState<CertificateItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [downloadingId, setDownloadingId] = useState<string | null>(null);
    const [previewCert, setPreviewCert] = useState<CertificateItem | null>(null);

    useEffect(() => {
        fetchCertificates();
    }, []);

    const fetchCertificates = async () => {
        setIsLoading(true);
        try {
            const { data } = await api.get('/users/me/certificates');
            setCertificates(data);
        } catch (error) {
            console.error("Error fetching certificates:", error);
            toast.error("Não foi possível carregar seus certificados.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleDownload = async (cert: CertificateItem, e?: React.MouseEvent) => {
        if (e) e.stopPropagation();
        setDownloadingId(cert.id);
        try {
            if (cert.url.startsWith('http://') || cert.url.startsWith('https://')) {
                const response = await fetch(cert.url);
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.setAttribute('download', cert.name.endsWith('.pdf') ? cert.name : `${cert.name}.pdf`);
                document.body.appendChild(link);
                link.click();
                link.remove();
                window.URL.revokeObjectURL(url);
            } else {
                window.open(cert.url, '_blank');
            }
            toast.success("Download iniciado!");
        } catch (error) {
            console.error("Error downloading certificate:", error);
            window.open(cert.url, '_blank');
        } finally {
            setDownloadingId(null);
        }
    };

    return (
        <div className="space-y-8 md:space-y-10 md:px-0">
            <div>
                <h1 className="text-2xl md:text-4xl font-black tracking-tight mb-2 uppercase italic leading-none text-slate-900">Certificados</h1>
                <p className="text-muted-foreground text-xs md:text-sm font-bold uppercase tracking-[0.2em] md:tracking-widest mt-2 italic">Suas conquistas oficiais.</p>
            </div>

            {isLoading ? (
                <div className="grid md:grid-cols-2 gap-6">
                    {[...Array(2)].map((_, i) => (
                        <Skeleton key={i} className="h-32 w-full" variant="rounded" />
                    ))}
                </div>
            ) : certificates.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                    {certificates.map((cert, idx) => (
                        <motion.div
                            key={cert.id}
                            initial={{ opacity: 0, y: 15 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: idx * 0.05 }}
                            className="p-6 md:p-8 rounded-[2rem] md:rounded-[2.5rem] border border-border bg-card shadow-sm hover:shadow-md transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-6 group"
                        >
                            <div className="flex items-center gap-4 md:gap-6 min-w-0">
                                <div className="h-14 w-14 md:h-16 md:w-16 bg-amber-50 rounded-2xl flex items-center justify-center text-amber-500 shadow-inner shrink-0 border border-amber-100 group-hover:scale-105 transition-transform">
                                    <LucideAward className="h-7 w-7 md:h-8 md:w-8" />
                                </div>
                                <div className="min-w-0">
                                    <h3 className="text-base md:text-lg font-black truncate uppercase tracking-tight text-slate-900" title={cert.name}>
                                        {cert.name}
                                    </h3>
                                    <p className="text-[10px] md:text-xs text-muted-foreground font-bold uppercase tracking-wider truncate mt-1 flex items-center gap-1.5">
                                        <LucideCalendar className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                                        Emitido em {new Date(cert.createdAt).toLocaleDateString('pt-BR')}
                                    </p>
                                </div>
                            </div>
                            
                            <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                                <button
                                    onClick={() => setPreviewCert(cert)}
                                    className="px-4 py-3 md:px-5 md:py-3.5 rounded-xl md:rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-black text-xs uppercase tracking-wider flex items-center gap-2 transition-all hover:scale-105 active:scale-95 shadow-sm"
                                    title="Visualizar Certificado"
                                >
                                    <LucideEye className="h-4 w-4" />
                                    <span>Visualizar</span>
                                </button>
                                <button
                                    onClick={(e) => handleDownload(cert, e)}
                                    disabled={downloadingId === cert.id}
                                    className="px-4 py-3 md:px-5 md:py-3.5 rounded-xl md:rounded-2xl bg-primary hover:brightness-110 text-white font-black text-xs uppercase tracking-wider flex items-center gap-2 transition-all hover:scale-105 active:scale-95 shadow-sm shadow-primary/20 disabled:opacity-50"
                                    title="Baixar Certificado"
                                >
                                    {downloadingId === cert.id ? (
                                        <LucideLoader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                        <LucideDownload className="h-4 w-4" />
                                    )}
                                    <span>Baixar</span>
                                </button>
                            </div>
                        </motion.div>
                    ))}
                </div>
            ) : (
                <div className="h-[350px] md:h-[400px] flex flex-col items-center justify-center text-center p-6 md:p-12 space-y-6 bg-card rounded-[2.5rem] md:rounded-[3rem] border border-dashed border-border shadow-inner">
                    <div className="h-20 w-20 md:h-24 md:w-24 bg-amber-50 rounded-full flex items-center justify-center border border-amber-100">
                        <LucideAward className="h-10 w-10 md:h-12 md:w-12 text-amber-500/50" />
                    </div>
                    <div className="space-y-2">
                        <h2 className="text-xl md:text-2xl font-black tracking-tight text-foreground/80 uppercase">Nenhum certificado</h2>
                        <p className="text-muted-foreground text-xs md:text-sm font-bold uppercase tracking-widest max-w-[260px] md:max-w-xs mx-auto leading-relaxed">
                            Assim que seu certificado for emitido, ele aparecerá aqui para você visualizar e baixar.
                        </p>
                    </div>
                </div>
            )}

            {/* Modal de Prévia Totalmente no Portal (Cobre 100% da tela, sem scrollbars) */}
            {previewCert && (
                <PortalModal
                    isOpen={!!previewCert}
                    onClose={() => setPreviewCert(null)}
                    className="relative z-[100000] w-full max-w-4xl"
                >
                    <div className="w-full bg-white rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col border border-white/20">
                        {/* Cabeçalho */}
                        <div className="px-5 py-4 md:px-8 md:py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
                            <div className="flex items-center gap-3 min-w-0 pr-3">
                                <div className="h-10 w-10 md:h-11 md:w-11 rounded-2xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-500 shrink-0">
                                    <LucideAward className="h-5 w-5" />
                                </div>
                                <div className="min-w-0">
                                    <h2 className="font-black text-xs md:text-base text-slate-900 truncate leading-tight">
                                        {previewCert.name}
                                    </h2>
                                    <p className="text-[9px] md:text-xs text-slate-400 font-bold uppercase tracking-wider mt-0.5">
                                        Emitido em {new Date(previewCert.createdAt).toLocaleDateString('pt-BR')}
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                                <button
                                    onClick={() => handleDownload(previewCert)}
                                    disabled={downloadingId === previewCert.id}
                                    className="bg-primary text-white px-3 py-2 md:px-5 md:py-2.5 rounded-xl font-black uppercase text-[10px] md:text-xs tracking-wider flex items-center gap-2 hover:brightness-110 active:scale-95 transition-all shadow-md shadow-primary/20 disabled:opacity-50"
                                >
                                    {downloadingId === previewCert.id ? (
                                        <LucideLoader2 className="h-3.5 w-3.5 animate-spin" />
                                    ) : (
                                        <LucideDownload className="h-3.5 w-3.5" />
                                    )}
                                    <span className="hidden sm:inline">Baixar</span>
                                </button>

                                <button
                                    onClick={() => setPreviewCert(null)}
                                    className="h-9 w-9 md:h-10 md:w-10 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition-colors active:scale-95"
                                >
                                    <LucideX className="h-4 w-4 md:h-5 md:w-5" />
                                </button>
                            </div>
                        </div>

                        {/* Corpo do Documento */}
                        <div className="bg-slate-100/80 p-2 md:p-6 flex items-center justify-center overflow-hidden">
                            <CertificatePreviewContent cert={previewCert} />
                        </div>
                    </div>
                </PortalModal>
            )}
        </div>
    );
}

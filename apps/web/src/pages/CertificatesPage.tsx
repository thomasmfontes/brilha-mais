import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
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
                    className="w-full h-auto max-h-[75vh] object-contain rounded-xl shadow-md border border-zinc-200 bg-white"
                />
            </div>
        );
    }

    return (
        <div ref={containerRef} className="w-full flex flex-col items-center justify-center p-1 md:p-3 overflow-hidden min-h-[220px] md:min-h-[380px] relative">
            {!isPageLoaded && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-zinc-50/90 rounded-xl z-10">
                    <div className="p-3 rounded-xl bg-amber-50 border border-amber-200/60 text-[#F19B0A] flex items-center justify-center shadow-xs">
                        <LucideLoader2 className="h-6 w-6 animate-spin text-[#F19B0A]" />
                    </div>
                    <p className="text-xs font-medium text-zinc-500 animate-pulse">
                        Carregando visualizador...
                    </p>
                </div>
            )}

            <Document
                file={cert.url}
                loading={null}
                error={
                    <div className="py-10 flex flex-col items-center justify-center gap-3 text-center px-4">
                        <p className="text-sm font-medium text-red-500">Erro ao carregar o visualizador direto.</p>
                        <a
                            href={cert.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs font-medium text-[#F19B0A] hover:underline flex items-center gap-1.5"
                        >
                            <LucideExternalLink className="h-4 w-4" /> Abrir certificado em nova aba
                        </a>
                    </div>
                }
                className="flex items-center justify-center w-full"
            >
                {containerWidth > 0 && (
                    <div className={`rounded-xl overflow-hidden shadow-md border border-zinc-200 bg-white flex items-center justify-center max-w-full transition-opacity duration-300 ${isPageLoaded ? 'opacity-100' : 'opacity-0'}`}>
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
        <div className="space-y-8 w-full pb-10">
            {/* Header */}
            <div>
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-900">Certificados</h1>
                <p className="text-sm text-zinc-500 mt-1">Suas conquistas e certificações oficiais emitidas.</p>
            </div>

            {isLoading ? (
                <div className="grid md:grid-cols-2 gap-5">
                    {[...Array(2)].map((_, i) => (
                        <div key={i} className="bg-white border border-zinc-200/80 rounded-2xl p-6">
                            <Skeleton className="h-20 w-full" variant="rounded" />
                        </div>
                    ))}
                </div>
            ) : certificates.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
                    {certificates.map((cert, idx) => (
                        <motion.div
                            key={cert.id}
                            initial={{ opacity: 0, y: 12 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: idx * 0.04 }}
                            className="p-5 sm:p-6 rounded-2xl border border-zinc-200/80 bg-white hover:border-zinc-300 hover:shadow-sm transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 group"
                        >
                            <div className="flex items-center gap-4 min-w-0">
                                <div className="w-12 h-12 rounded-xl bg-amber-50 border border-amber-200/60 flex items-center justify-center text-[#F19B0A] shrink-0 group-hover:scale-105 transition-transform shadow-2xs">
                                    <LucideAward className="w-6 h-6" />
                                </div>
                                <div className="min-w-0">
                                    <h3 className="text-base font-semibold truncate text-zinc-900 group-hover:text-[#F19B0A] transition-colors" title={cert.name}>
                                        {cert.name}
                                    </h3>
                                    <p className="text-xs text-zinc-500 truncate mt-1 flex items-center gap-1.5">
                                        <LucideCalendar className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                                        <span>Emitido em {new Date(cert.createdAt).toLocaleDateString('pt-BR')}</span>
                                    </p>
                                </div>
                            </div>
                            
                            <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                                <button
                                    onClick={() => setPreviewCert(cert)}
                                    className="px-3.5 py-2 rounded-xl bg-zinc-100 hover:bg-zinc-200/70 text-zinc-700 font-medium text-xs sm:text-sm flex items-center gap-1.5 transition-colors active:scale-[0.98]"
                                    title="Visualizar Certificado"
                                >
                                    <LucideEye className="w-4 h-4 text-zinc-500" />
                                    <span>Visualizar</span>
                                </button>
                                <button
                                    onClick={(e) => handleDownload(cert, e)}
                                    disabled={downloadingId === cert.id}
                                    className="px-3.5 py-2 rounded-xl bg-[#F19B0A] hover:bg-[#D98B08] text-white font-medium text-xs sm:text-sm flex items-center gap-1.5 transition-all shadow-xs active:scale-[0.98] disabled:opacity-50 cursor-pointer"
                                    title="Baixar Certificado"
                                >
                                    {downloadingId === cert.id ? (
                                        <LucideLoader2 className="w-4 h-4 animate-spin" />
                                    ) : (
                                        <LucideDownload className="w-4 h-4" />
                                    )}
                                    <span>Baixar</span>
                                </button>
                            </div>
                        </motion.div>
                    ))}
                </div>
            ) : (
                /* Clean Empty State */
                <div className="min-h-[340px] flex flex-col items-center justify-center text-center p-8 sm:p-12 bg-white rounded-2xl border border-zinc-200/80 shadow-2xs">
                    <div className="w-14 h-14 rounded-2xl bg-amber-50/80 border border-amber-200/60 flex items-center justify-center text-[#F19B0A] mb-4 shadow-2xs">
                        <LucideAward className="w-7 h-7" />
                    </div>
                    <div>
                        <h2 className="text-base sm:text-lg font-semibold text-zinc-900">Nenhum certificado emitido</h2>
                        <p className="text-xs sm:text-sm text-zinc-500 max-w-sm mx-auto mt-1 leading-relaxed">
                            Assim que você concluir um curso e seu certificado for gerado, ele aparecerá aqui para você visualizar e baixar.
                        </p>
                    </div>
                </div>
            )}

            {/* Modal de Prévia */}
            {previewCert && (
                <PortalModal
                    isOpen={!!previewCert}
                    onClose={() => setPreviewCert(null)}
                    className="relative z-[100000] w-full max-w-4xl"
                >
                    <div className="w-full bg-white rounded-2xl shadow-xl overflow-hidden flex flex-col border border-zinc-200">
                        {/* Cabeçalho */}
                        <div className="px-5 py-4 sm:px-6 sm:py-4 border-b border-zinc-100 flex items-center justify-between bg-zinc-50/80">
                            <div className="flex items-center gap-3 min-w-0 pr-3">
                                <div className="w-9 h-9 rounded-xl bg-amber-50 border border-amber-200/60 flex items-center justify-center text-[#F19B0A] shrink-0">
                                    <LucideAward className="w-4 h-4" />
                                </div>
                                <div className="min-w-0">
                                    <h2 className="font-semibold text-sm sm:text-base text-zinc-900 truncate leading-snug">
                                        {previewCert.name}
                                    </h2>
                                    <p className="text-xs text-zinc-500 mt-0.5">
                                        Emitido em {new Date(previewCert.createdAt).toLocaleDateString('pt-BR')}
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                                <button
                                    onClick={() => handleDownload(previewCert)}
                                    disabled={downloadingId === previewCert.id}
                                    className="bg-[#F19B0A] hover:bg-[#D98B08] text-white px-3.5 py-1.5 sm:px-4 sm:py-2 rounded-xl font-medium text-xs sm:text-sm flex items-center gap-1.5 transition-all shadow-xs active:scale-[0.98] disabled:opacity-50"
                                >
                                    {downloadingId === previewCert.id ? (
                                        <LucideLoader2 className="w-3.5 h-3.5 animate-spin" />
                                    ) : (
                                        <LucideDownload className="w-3.5 h-3.5" />
                                    )}
                                    <span>Baixar</span>
                                </button>

                                <button
                                    onClick={() => setPreviewCert(null)}
                                    className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-zinc-100 hover:bg-zinc-200/80 text-zinc-500 hover:text-zinc-800 flex items-center justify-center transition-colors active:scale-[0.98]"
                                >
                                    <LucideX className="w-4 h-4" />
                                </button>
                            </div>
                        </div>

                        {/* Corpo do Documento */}
                        <div className="bg-zinc-100/70 p-3 sm:p-6 flex items-center justify-center overflow-hidden">
                            <CertificatePreviewContent cert={previewCert} />
                        </div>
                    </div>
                </PortalModal>
            )}
        </div>
    );
}

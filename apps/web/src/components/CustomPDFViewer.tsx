import { useState, useRef, useEffect } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { LucidePlus, LucideMinus, LucideMaximize2 } from 'lucide-react';
import LoadingSpinner from './LoadingSpinner';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

// Initialize PDF.js worker natively using Vite environment module syntax
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString();

interface CustomPDFViewerProps {
    url: string;
}

export default function CustomPDFViewer({ url }: CustomPDFViewerProps) {
    const [numPages, setNumPages] = useState<number>();
    const containerRef = useRef<HTMLDivElement>(null);
    const [containerWidth, setContainerWidth] = useState<number>(0);
    const [scale, setScale] = useState(1);

    // Calculate dynamic width based on the container size to ensure Text Layer matches exactly
    useEffect(() => {
        const obs = new ResizeObserver((entries) => {
            if (entries[0]) {
                const w = entries[0].contentRect.width;
                // Provide 32px safety margin on small devices, cap maximum thickness to 850px on desktop
                const safeWidth = Math.min(w > 600 ? w - 64 : w - 32, 850); 
                setContainerWidth(safeWidth);
            }
        });
        
        if (containerRef.current) {
            obs.observe(containerRef.current);
        }
        return () => obs.disconnect();
    }, []);

    function onDocumentLoadSuccess({ numPages }: { numPages: number }): void {
        setNumPages(numPages);
    }

    const handleZoomIn = () => setScale(prev => Math.min(prev + 0.2, 3));
    const handleZoomOut = () => setScale(prev => Math.max(prev - 0.2, 0.5));
    const handleReset = () => setScale(1);

    return (
        <div className="flex-1 w-full h-full relative overflow-hidden bg-slate-100 group">
            <div ref={containerRef} className="w-full h-full flex flex-col items-center py-6 md:py-10 overflow-y-auto overflow-x-auto custom-scrollbar relative scroll-smooth">
                <Document 
                    file={url} 
                    onLoadSuccess={onDocumentLoadSuccess}
                    loading={
                        <div className="h-64 flex flex-col items-center justify-center gap-4 text-muted-foreground w-full">
                            <LoadingSpinner size="md" variant="primary" />
                            <p className="text-[10px] font-black uppercase tracking-[0.2em]">Processando Arquivo...</p>
                        </div>
                    }
                    error={
                        <div className="h-64 flex flex-col items-center justify-center text-red-500 font-bold uppercase text-[10px] tracking-widest text-center px-6">
                            <p>Ocorreu um erro ao carregar o material.</p>
                            <p className="text-muted-foreground mt-2 font-medium normal-case">Tente novamente mais tarde ou contate o suporte se persistir.</p>
                        </div>
                    }
                    className="flex flex-col items-center gap-6 md:gap-8 pb-32"
                >
                    {Array.from(new Array(numPages), (el, index) => (
                        <div 
                            key={`page_${index + 1}`} 
                            className="bg-white mx-auto shadow-2xl shadow-slate-900/5 ring-1 ring-border/50 rounded-lg overflow-hidden shrink-0 transition-all duration-200"
                            style={{ width: containerWidth ? containerWidth * scale : 'auto' }}
                        >
                            <Page 
                                pageNumber={index + 1} 
                                width={containerWidth ? containerWidth * scale : undefined} 
                                renderTextLayer={true}
                                renderAnnotationLayer={true} 
                            />
                        </div>
                    ))}
                </Document>
            </div>

            {/* Floating Zoom Toolbar - Now absolute to the viewer, not fixed to the window */}
            {numPages && (
                <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-1 p-1 bg-white/90 backdrop-blur-md rounded-xl shadow-xl shadow-slate-900/10 border border-slate-200/60 z-50 transition-all opacity-0 group-hover:opacity-100 hover:bg-white">
                    <button 
                        onClick={handleZoomOut} 
                        className="h-8 w-8 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-900 transition-all active:scale-95"
                        title="Diminuir Zoom"
                    >
                        <LucideMinus className="h-3.5 w-3.5" />
                    </button>
                    
                    <div className="px-2">
                        <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 w-10 text-center block">
                            {Math.round(scale * 100)}%
                        </span>
                    </div>

                    <button 
                        onClick={handleZoomIn} 
                        className="h-8 w-8 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-900 transition-all active:scale-95"
                        title="Aumentar Zoom"
                    >
                        <LucidePlus className="h-3.5 w-3.5" />
                    </button>

                    <div className="w-px h-3 bg-slate-200 mx-1" />

                    <button 
                        onClick={handleReset} 
                        className="h-8 w-8 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-900 transition-all active:scale-95"
                        title="Resetar Zoom"
                    >
                        <LucideMaximize2 className="h-3.5 w-3.5" />
                    </button>
                </div>
            )}
        </div>
    );
}

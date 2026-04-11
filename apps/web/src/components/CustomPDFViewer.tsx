import { useState, useRef, useEffect } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
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
    const [containerWidth, setContainerWidth] = useState<number>();

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

    return (
        <div ref={containerRef} className="w-full flex-1 bg-slate-100 flex flex-col items-center py-6 md:py-10 overflow-y-auto custom-scrollbar relative">
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
                        className="bg-white mx-auto shadow-2xl shadow-slate-900/5 ring-1 ring-border/50 rounded-lg overflow-hidden shrink-0"
                    >
                        <Page 
                            pageNumber={index + 1} 
                            width={containerWidth} 
                            renderTextLayer={true}
                            renderAnnotationLayer={true} 
                        />
                    </div>
                ))}
            </Document>
            
        </div>
    );
}

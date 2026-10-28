import { useEffect } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import toast from 'react-hot-toast';
import { RefreshCw, Sparkles, X } from 'lucide-react';

/**
 * UpdateNotifier component
 * This component monitors for new versions of the application (Service Worker updates).
 * When a new version is detected, it shows a persistent toast inviting the user to reload.
 */
const UpdateNotifier = () => {
    const {
        needRefresh: [needRefresh, setNeedRefresh],
        updateServiceWorker,
    } = useRegisterSW({
        onRegistered(r) {
            // Check for updates every 5 minutes
            if (r) {
                setInterval(() => {
                    r.update();
                }, 5 * 60 * 1000);
            }
        },
    });

    useEffect(() => {
        const handleFocus = () => {
            // Check for updates when user returns to the tab
            navigator.serviceWorker.getRegistration().then(r => {
                if (r) r.update();
            });
        };

        window.addEventListener('focus', handleFocus);
        return () => window.removeEventListener('focus', handleFocus);
    }, []);

    useEffect(() => {
        if (needRefresh) {
            toast((t) => (
                <div className="flex flex-col gap-3.5 p-1 w-full text-left">
                    <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3">
                            <div className="h-9 w-9 rounded-xl bg-amber-50 border border-amber-200/60 text-amber-600 flex items-center justify-center shrink-0">
                                <Sparkles className="h-4 w-4 text-[#F19B0A]" />
                            </div>
                            <div className="space-y-0.5">
                                <p className="text-sm font-semibold text-zinc-950 tracking-tight">Nova versão disponível</p>
                                <p className="text-xs text-zinc-500 leading-relaxed">Atualize para carregar o novo visual e melhorias da plataforma.</p>
                            </div>
                        </div>

                        <button
                            type="button"
                            onClick={() => toast.dismiss(t.id)}
                            className="p-1 rounded-lg text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition-colors"
                            title="Fechar"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    </div>
                    
                    <button
                        type="button"
                        onClick={() => {
                            updateServiceWorker(true);
                            setNeedRefresh(false);
                            toast.dismiss(t.id);
                        }}
                        className="w-full bg-[#F19B0A] hover:bg-[#D98B08] text-white py-2.5 px-4 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 active:scale-[0.98] transition-all shadow-2xs cursor-pointer"
                    >
                        <RefreshCw className="h-3.5 w-3.5" />
                        <span>Atualizar agora</span>
                    </button>
                </div>
            ), {
                duration: Infinity, // Keep the toast until user clicks
                style: {
                    borderRadius: '1rem',
                    background: '#ffffff',
                    color: '#09090b',
                    border: '1px solid rgba(228, 228, 231, 0.9)',
                    boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.08), 0 8px 10px -6px rgba(0, 0, 0, 0.04)',
                    padding: '0.875rem',
                    maxWidth: '360px',
                    width: '100%'
                },
            });
        }
    }, [needRefresh, updateServiceWorker, setNeedRefresh]);

    return null;
};

export default UpdateNotifier;

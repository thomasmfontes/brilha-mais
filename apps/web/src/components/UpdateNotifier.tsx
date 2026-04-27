import { useEffect } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import toast from 'react-hot-toast';
import { LucideRefreshCw, LucideZap } from 'lucide-react';

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
        if (needRefresh) {
            toast((t) => (
                <div className="flex flex-col gap-3 p-1">
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                            <LucideZap className="h-5 w-5 animate-pulse" />
                        </div>
                        <div>
                            <p className="text-sm font-black text-slate-900 uppercase tracking-tight">Nova Versão Disponível!</p>
                            <p className="text-[11px] font-medium text-slate-500 leading-tight mt-0.5">Fizemos melhorias na plataforma. Atualize para ver as novidades.</p>
                        </div>
                    </div>
                    
                    <button
                        onClick={() => {
                            updateServiceWorker(true);
                            setNeedRefresh(false);
                            toast.dismiss(t.id);
                        }}
                        className="w-full bg-primary text-white py-2.5 rounded-xl text-[10px] font-black uppercase tracking-[0.1em] flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-95 transition-all shadow-lg shadow-primary/20"
                    >
                        <LucideRefreshCw className="h-3.5 w-3.5" />
                        Atualizar Agora
                    </button>
                </div>
            ), {
                duration: Infinity, // Keep the toast until user clicks
                position: 'bottom-right',
                style: {
                    borderRadius: '1.5rem',
                    background: '#ffffff',
                    color: '#334155',
                    border: '1px solid #f1f5f9',
                    boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
                    padding: '1rem',
                    maxWidth: '350px'
                },
            });
        }
    }, [needRefresh, updateServiceWorker, setNeedRefresh]);

    return null; // This component doesn't render anything itself
};

export default UpdateNotifier;

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LucideFolder, LucideUpload, LucideTrash2, LucideFileText, LucideDownload, LucideX, LucideLoader2 } from 'lucide-react';
import { PortalModal } from './PortalModal';
import api from '../utils/api';
import toast from 'react-hot-toast';

interface Material {
    id: string;
    name: string;
    url: string;
    type: string;
    size?: string;
    createdAt: string;
}

interface UserMaterialsModalProps {
    isOpen: boolean;
    onClose: () => void;
    userId: string;
    userName: string;
}

export default function UserMaterialsModal({ isOpen, onClose, userId, userName }: UserMaterialsModalProps) {
    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
    const [materials, setMaterials] = useState<Material[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isUploading, setIsUploading] = useState(false);
    const [isDeleting, setIsDeleting] = useState<string | null>(null);
    const [confirmDeletion, setConfirmDeletion] = useState<string | null>(null);
    const [isDownloading, setIsDownloading] = useState<string | null>(null);
    const [pendingFile, setPendingFile] = useState<{ url: string; originalName: string; customName: string; extension: string; type: string; size: string } | null>(null);

    useEffect(() => {
        if (isOpen) {
            fetchMaterials();
            setPendingFile(null);
        }
    }, [isOpen, userId]);

    const fetchMaterials = async () => {
        setIsLoading(true);
        try {
            const { data } = await api.get(`/users/${userId}/materials`);
            setMaterials(data);
        } catch (error) {
            console.error('Error fetching materials:', error);
            toast.error('Erro ao carregar materiais.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsUploading(true);
        const formData = new FormData();
        formData.append('file', file);

        try {
            // 1. Upload the file to get the URL
            const { data: uploadData } = await api.post('/upload', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            // Split name and extension
            const lastDotIndex = file.name.lastIndexOf('.');
            const baseName = lastDotIndex !== -1 ? file.name.substring(0, lastDotIndex) : file.name;
            const extension = lastDotIndex !== -1 ? file.name.substring(lastDotIndex) : '';

            // 2. Instead of saving immediately, set to pending state for naming
            setPendingFile({
                url: uploadData.url,
                originalName: file.name,
                customName: baseName,
                extension: extension,
                type: file.type,
                size: `${(file.size / 1024).toFixed(1)} KB`
            });
        } catch (error) {
            console.error('Error uploading material:', error);
            toast.error('Erro ao enviar material.');
        } finally {
            setIsUploading(false);
            e.target.value = ''; // Reset input
        }
    };

    const handleConfirmUpload = async () => {
        if (!pendingFile) return;

        try {
            setIsUploading(true);
            const finalName = `${pendingFile.customName.trim()}${pendingFile.extension}`;
            
            await api.post(`/users/${userId}/materials`, {
                name: finalName,
                url: pendingFile.url,
                type: pendingFile.type,
                size: pendingFile.size
            });

            toast.success('Material salvo com sucesso!');
            setPendingFile(null);
            fetchMaterials();
        } catch (error) {
            console.error('Error saving material:', error);
            toast.error('Erro ao salvar material.');
        } finally {
            setIsUploading(false);
        }
    };

    const handleDelete = async (materialId: string) => {
        setIsDeleting(materialId);
        try {
            await api.delete(`/users/${userId}/materials/${materialId}`);
            setMaterials(prev => prev.filter(m => m.id !== materialId));
            toast.success('Material removido.');
        } catch (error) {
            console.error('Error deleting material:', error);
            toast.error('Erro ao remover material.');
        } finally {
            setIsDeleting(null);
        }
    };

    const handleDownload = async (file: Material) => {
        setIsDownloading(file.id);
        try {
            const response = await api.get(`/users/${userId}/materials/${file.id}/download`, {
                responseType: 'blob'
            });
            
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', file.name);
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Error downloading file:', error);
            toast.error('Erro ao baixar o arquivo.');
        } finally {
            setIsDownloading(null);
        }
    };

    return (
        <PortalModal isOpen={isOpen} onClose={onClose} preventCloseOnOverlayClick={isUploading}>
            <motion.div
                initial={{ scale: 0.9, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.9, opacity: 0, y: 20 }}
                className="relative w-full max-w-2xl bg-card border border-border rounded-[2.5rem] p-8 md:p-10 shadow-2xl flex flex-col max-h-[85vh] overflow-hidden"
            >
                <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-primary/40 via-primary to-primary/40" />
                
                <button 
                    onClick={onClose}
                    className="absolute top-6 right-6 p-2 rounded-full hover:bg-muted transition-colors text-muted-foreground"
                >
                    <LucideX className="h-5 w-5" />
                </button>

                <div className="mb-8">
                    <h2 className="text-2xl font-black mb-2 flex items-center gap-3">
                        <div className="p-2.5 rounded-2xl bg-primary/10 text-primary">
                            <LucideFolder className="h-6 w-6" />
                        </div>
                        Materiais do Aluno
                    </h2>
                    <p className="text-muted-foreground font-medium flex items-center gap-2">
                        Gerenciando arquivos para: <span className="text-slate-900 font-bold px-2 py-0.5 bg-slate-100 rounded-lg">{userName}</span>
                    </p>
                </div>

                <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-4">
                    {/* Pending Upload Edit UI */}
                    <AnimatePresence>
                        {pendingFile && (
                            <motion.div 
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                className="overflow-hidden"
                            >
                                <div className="p-6 rounded-3xl bg-primary/5 border border-primary/20 space-y-4 mb-4">
                                    <div className="flex items-center gap-4">
                                        <div className="h-12 w-12 rounded-2xl bg-white shadow-sm flex items-center justify-center text-primary shrink-0">
                                            <LucideFileText className="h-6 w-6" />
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-primary/60 mb-1">Nome do Arquivo</p>
                                            <div className="flex items-center bg-white border border-primary/10 rounded-xl px-4 shadow-sm focus-within:ring-2 focus-within:ring-primary/20 transition-all">
                                                <input 
                                                    autoFocus
                                                    type="text" 
                                                    value={pendingFile.customName}
                                                    onChange={e => setPendingFile({ ...pendingFile, customName: e.target.value })}
                                                    className="flex-1 bg-transparent py-2.5 text-sm font-bold text-slate-900 outline-none"
                                                    placeholder="Digite o nome..."
                                                />
                                                <span className="text-xs font-black text-slate-400 select-none pb-0.5">{pendingFile.extension}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <button 
                                            onClick={handleConfirmUpload}
                                            disabled={isUploading || !pendingFile.customName.trim()}
                                            className="flex-1 bg-primary text-white py-3 rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-lg shadow-primary/20 hover:brightness-110 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            Confirmar e Salvar
                                        </button>
                                        <button 
                                            onClick={() => setPendingFile(null)}
                                            disabled={isUploading}
                                            className="px-6 py-3 rounded-2xl bg-white border border-primary/10 text-primary font-black uppercase tracking-widest text-[10px] hover:bg-primary/5 active:scale-95 transition-all"
                                        >
                                            Cancelar
                                        </button>
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Upload Section */}
                    {!pendingFile && (
                        <div className="relative group">
                            <input
                                type="file"
                                onChange={handleFileUpload}
                                disabled={isUploading}
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10 disabled:cursor-not-allowed"
                            />
                            <div className={`p-8 rounded-3xl border-2 border-dashed transition-all flex flex-col items-center justify-center gap-3 ${isUploading ? 'bg-muted border-muted' : 'bg-slate-50/50 border-slate-200 group-hover:border-primary/50 group-hover:bg-primary/5'}`}>
                                {isUploading ? (
                                    <>
                                        <LucideLoader2 className="h-8 w-8 text-primary animate-spin" />
                                        <p className="text-sm font-black uppercase tracking-widest text-primary">Enviando Arquivo...</p>
                                    </>
                                ) : (
                                    <>
                                        <div className="p-3 rounded-2xl bg-white shadow-sm text-slate-400 group-hover:text-primary transition-colors">
                                            <LucideUpload className="h-6 w-6" />
                                        </div>
                                        <div className="text-center">
                                            <p className="text-sm font-bold text-slate-900">Clique ou arraste um arquivo</p>
                                            <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mt-1">PDF, DOCX, Imagens (Máx 50MB)</p>
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Materials List */}
                    <div className="space-y-3 pt-4">
                        <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-1">Arquivos Carregados</h3>
                        
                        {isLoading ? (
                            <div className="py-12 flex flex-col items-center justify-center gap-3">
                                <LucideLoader2 className="h-6 w-6 text-primary animate-spin" />
                                <p className="text-xs font-bold text-slate-400">Buscando materiais...</p>
                            </div>
                        ) : materials.length > 0 ? (
                            materials.map((file) => (
                                <motion.div 
                                    layout
                                    key={file.id} 
                                    className="relative p-4 rounded-2xl bg-white border border-slate-100 shadow-sm flex items-center justify-between hover:border-primary/20 transition-all group/file"
                                >
                                    <div className="flex items-center gap-4 min-w-0">
                                        <div className="h-12 w-12 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 group-hover/file:bg-primary/5 group-hover/file:text-primary transition-colors shrink-0">
                                            <LucideFileText className="h-6 w-6" />
                                        </div>
                                        <div className="min-w-0">
                                            <p className="font-bold text-sm truncate text-slate-900">{file.name}</p>
                                            <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mt-0.5">
                                                {file.size || 'N/A'} • {new Date(file.createdAt).toLocaleDateString()}
                                            </p>
                                        </div>
                                    </div>
                                    
                                    <div className="flex items-center gap-2">
                                        <button 
                                            onClick={() => handleDownload(file)}
                                            disabled={isDownloading === file.id}
                                            className="p-2.5 rounded-xl bg-slate-50 text-slate-400 hover:bg-primary/10 hover:text-primary transition-all disabled:opacity-50"
                                            title="Download"
                                        >
                                            <div className="relative">
                                                <motion.div
                                                    animate={{
                                                        y: isDownloading === file.id ? [0, -4, 0] : 0
                                                    }}
                                                    transition={{
                                                        duration: 0.6,
                                                        repeat: isDownloading === file.id ? Infinity : 0,
                                                        ease: "easeInOut"
                                                    }}
                                                >
                                                    <LucideDownload className={`h-4 w-4 ${isDownloading === file.id ? 'text-primary' : ''}`} />
                                                </motion.div>
                                            </div>
                                        </button>
                                        <button 
                                            onClick={() => setConfirmDeletion(file.id)}
                                            disabled={isDeleting === file.id}
                                            className="p-2.5 rounded-xl bg-slate-50 text-slate-400 hover:bg-red-50 hover:text-red-500 transition-all"
                                            title="Excluir"
                                        >
                                            {isDeleting === file.id ? (
                                                <LucideLoader2 className="h-4 w-4 animate-spin" />
                                            ) : (
                                                <LucideTrash2 className="h-4 w-4" />
                                            )}
                                        </button>
                                    </div>

                                    {/* Inline Deletion Confirmation */}
                                    <AnimatePresence>
                                        {confirmDeletion === file.id && (
                                            <motion.div 
                                                initial={{ opacity: 0, scale: 0.95 }}
                                                animate={{ opacity: 1, scale: 1 }}
                                                exit={{ opacity: 0, scale: 0.95 }}
                                                className="absolute inset-x-0 inset-y-0 bg-white/90 backdrop-blur-sm z-10 flex items-center justify-between px-8 rounded-2xl border-2 border-red-100 shadow-sm"
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div className="h-10 w-10 rounded-xl bg-red-50 flex items-center justify-center text-red-500">
                                                        <LucideTrash2 className="h-5 w-5" />
                                                    </div>
                                                    <p className="text-sm font-bold text-slate-900">Tem certeza que deseja excluir?</p>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <button 
                                                        onClick={() => {
                                                            handleDelete(file.id);
                                                            setConfirmDeletion(null);
                                                        }}
                                                        className="px-4 py-2 rounded-xl bg-red-500 text-white text-[10px] font-black uppercase tracking-widest hover:brightness-110 active:scale-95 transition-all"
                                                    >
                                                        Sim, Excluir
                                                    </button>
                                                    <button 
                                                        onClick={() => setConfirmDeletion(null)}
                                                        className="px-4 py-2 rounded-xl bg-slate-100 text-slate-500 text-[10px] font-black uppercase tracking-widest hover:bg-slate-200 active:scale-95 transition-all"
                                                    >
                                                        Cancelar
                                                    </button>
                                                </div>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </motion.div>
                            ))
                        ) : (
                            <div className="py-20 text-center bg-slate-50/50 rounded-[2rem] border border-dashed border-slate-200">
                                <LucideFolder className="h-10 w-10 text-slate-200 mx-auto mb-4" />
                                <p className="text-sm font-bold text-slate-400">Nenhum material carregado para este aluno.</p>
                            </div>
                        )}
                    </div>
                </div>

                <div className="mt-8 pt-6 border-t border-slate-50 flex justify-end">
                    <button 
                        onClick={onClose}
                        className="px-8 py-3.5 rounded-2xl border border-slate-200 font-black uppercase tracking-widest text-xs hover:bg-slate-50 transition-all"
                    >
                        Fechar
                    </button>
                </div>
            </motion.div>
        </PortalModal>
    );
}

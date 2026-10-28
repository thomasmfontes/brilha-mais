import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LucideFolder, LucideUpload, LucideTrash2, LucideFileText, LucideDownload, LucideX, LucideLoader2, LucideAward, LucideGraduationCap } from 'lucide-react';
import { PortalModal } from './PortalModal';
import api from '../utils/api';
import toast from 'react-hot-toast';

interface Material {
    id: string;
    name: string;
    url: string;
    type: string;
    size?: string;
    category?: string;
    createdAt: string;
}

interface UserMaterialsModalProps {
    isOpen: boolean;
    onClose: () => void;
    userId: string;
    userName: string;
}

export default function UserMaterialsModal({ isOpen, onClose, userId, userName }: UserMaterialsModalProps) {
    const [materials, setMaterials] = useState<Material[]>([]);
    const [activeTab, setActiveTab] = useState<'materials' | 'certificates'>('materials');
    const [isLoading, setIsLoading] = useState(true);
    const [isUploading, setIsUploading] = useState(false);
    const [isDeleting, setIsDeleting] = useState<string | null>(null);
    const [confirmDeletion, setConfirmDeletion] = useState<string | null>(null);
    const [isDownloading, setIsDownloading] = useState<string | null>(null);
    const [pendingFile, setPendingFile] = useState<{ url: string; originalName: string; customName: string; extension: string; type: string; size: string; category: 'MATERIAL' | 'CERTIFICATE' } | null>(null);

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
            toast.error('Erro ao carregar arquivos.');
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
                customName: activeTab === 'certificates' && !baseName.toLowerCase().includes('certificado') ? `Certificado - ${baseName}` : baseName,
                extension: extension,
                type: file.type,
                size: `${(file.size / 1024).toFixed(1)} KB`,
                category: activeTab === 'certificates' ? 'CERTIFICATE' : 'MATERIAL'
            });
        } catch (error) {
            console.error('Error uploading file:', error);
            toast.error(activeTab === 'certificates' ? 'Erro ao enviar certificado.' : 'Erro ao enviar material.');
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
                size: pendingFile.size,
                category: pendingFile.category
            });

            toast.success(pendingFile.category === 'CERTIFICATE' ? 'Certificado salvo com sucesso!' : 'Material salvo com sucesso!');
            setPendingFile(null);
            fetchMaterials();
        } catch (error) {
            console.error('Error saving file:', error);
            toast.error('Erro ao salvar arquivo.');
        } finally {
            setIsUploading(false);
        }
    };

    const handleDelete = async (materialId: string) => {
        setIsDeleting(materialId);
        try {
            await api.delete(`/users/${userId}/materials/${materialId}`);
            setMaterials(prev => prev.filter(m => m.id !== materialId));
            toast.success('Arquivo removido.');
        } catch (error) {
            console.error('Error deleting file:', error);
            toast.error('Erro ao remover arquivo.');
        } finally {
            setIsDeleting(null);
        }
    };

    const handleDownload = async (file: Material) => {
        setIsDownloading(file.id);
        try {
            if (file.url.startsWith('http://') || file.url.startsWith('https://')) {
                const response = await fetch(file.url);
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.setAttribute('download', file.name);
                document.body.appendChild(link);
                link.click();
                link.remove();
                window.URL.revokeObjectURL(url);
            } else {
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
            }
        } catch (error) {
            console.error('Error downloading file:', error);
            window.open(file.url, '_blank');
        } finally {
            setIsDownloading(null);
        }
    };

    const materialsCount = materials.filter(m => m.category !== 'CERTIFICATE').length;
    const certificatesCount = materials.filter(m => m.category === 'CERTIFICATE').length;
    const filteredFiles = materials.filter(m => activeTab === 'certificates' ? m.category === 'CERTIFICATE' : m.category !== 'CERTIFICATE');

    return (
        <PortalModal isOpen={isOpen} onClose={onClose} preventCloseOnOverlayClick={isUploading}>
            <div className="relative w-full max-w-2xl bg-white border border-slate-200/80 rounded-2xl p-6 md:p-7 shadow-2xl flex flex-col max-h-[88vh] overflow-hidden text-left">
                <button 
                    onClick={onClose}
                    className="absolute top-5 right-5 p-1.5 rounded-lg hover:bg-slate-100 transition-colors text-slate-400 hover:text-slate-700"
                >
                    <LucideX className="h-5 w-5" />
                </button>

                <div className="flex items-center gap-3 mb-5 pb-4 border-b border-slate-100">
                    <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200/60 flex items-center justify-center text-amber-600 shrink-0">
                        {activeTab === 'certificates' ? <LucideAward className="h-5 w-5" /> : <LucideFolder className="h-5 w-5" />}
                    </div>
                    <div>
                        <h2 className="text-lg font-semibold text-slate-900 leading-tight">
                            {activeTab === 'certificates' ? 'Certificados do Aluno' : 'Materiais do Aluno'}
                        </h2>
                        <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1.5">
                            Gerenciando arquivos de: <strong className="text-slate-900 font-medium">{userName}</strong>
                        </p>
                    </div>
                </div>

                {/* Sub-tabs */}
                <div className="bg-slate-100 p-1 rounded-xl flex mb-5">
                    <button
                        onClick={() => { setActiveTab('materials'); setPendingFile(null); }}
                        className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-medium transition-all ${activeTab === 'materials' ? 'bg-white text-slate-900 shadow-2xs font-semibold' : 'text-slate-500 hover:text-slate-900'}`}
                    >
                        <LucideFolder className="h-4 w-4" />
                        <span>Materiais Gerais</span>
                        <span className={`px-1.5 py-0.2 rounded-md text-[10px] font-semibold ${activeTab === 'materials' ? 'bg-amber-100 text-amber-800' : 'bg-slate-200 text-slate-600'}`}>
                            {materialsCount}
                        </span>
                    </button>
                    <button
                        onClick={() => { setActiveTab('certificates'); setPendingFile(null); }}
                        className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-medium transition-all ${activeTab === 'certificates' ? 'bg-white text-slate-900 shadow-2xs font-semibold' : 'text-slate-500 hover:text-slate-900'}`}
                    >
                        <LucideAward className="h-4 w-4" />
                        <span>Certificados</span>
                        <span className={`px-1.5 py-0.2 rounded-md text-[10px] font-semibold ${activeTab === 'certificates' ? 'bg-amber-100 text-amber-800' : 'bg-slate-200 text-slate-600'}`}>
                            {certificatesCount}
                        </span>
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto pr-1 custom-scrollbar space-y-4">
                    {/* Pending Upload Edit UI */}
                    <AnimatePresence>
                        {pendingFile && (
                            <motion.div 
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                className="overflow-hidden"
                            >
                                <div className="p-4 rounded-xl border border-amber-200 bg-amber-50/50 space-y-3 mb-4">
                                    <div className="flex items-center gap-3">
                                        <div className="h-10 w-10 rounded-xl bg-white border border-amber-200/80 shadow-2xs flex items-center justify-center shrink-0 text-amber-600">
                                            {pendingFile.category === 'CERTIFICATE' ? <LucideAward className="h-5 w-5" /> : <LucideFileText className="h-5 w-5" />}
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <p className="text-xs font-semibold text-amber-900 mb-1">
                                                {pendingFile.category === 'CERTIFICATE' ? 'Título do Certificado' : 'Nome do Arquivo'}
                                            </p>
                                            <div className="flex items-center bg-white border border-amber-300 rounded-lg px-3 shadow-2xs focus-within:ring-2 focus-within:ring-amber-500/20 transition-all">
                                                <input 
                                                    autoFocus
                                                    type="text" 
                                                    value={pendingFile.customName}
                                                    onChange={e => setPendingFile({ ...pendingFile, customName: e.target.value })}
                                                    className="flex-1 bg-transparent py-2 text-xs font-medium text-slate-900 outline-none"
                                                    placeholder={pendingFile.category === 'CERTIFICATE' ? 'Ex: Certificado de Conclusão - Liderança 2026' : 'Digite o nome...'}
                                                />
                                                <span className="text-xs text-slate-400 font-medium select-none">{pendingFile.extension}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center justify-end gap-2 pt-1">
                                        <button 
                                            onClick={() => setPendingFile(null)}
                                            disabled={isUploading}
                                            className="h-8 px-3 rounded-lg border border-slate-200/80 bg-white hover:bg-slate-50 text-slate-600 text-xs font-medium transition-colors"
                                        >
                                            Cancelar
                                        </button>
                                        <button 
                                            onClick={handleConfirmUpload}
                                            disabled={isUploading || !pendingFile.customName.trim()}
                                            className="h-8 px-4 bg-amber-500 hover:bg-amber-600 text-white rounded-lg font-medium text-xs shadow-xs transition-all active:scale-[0.98] disabled:opacity-50 flex items-center gap-1.5"
                                        >
                                            Confirmar e Salvar
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
                                accept={activeTab === 'certificates' ? '.pdf,image/*' : '*'}
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10 disabled:cursor-not-allowed"
                            />
                            <div className={`p-6 rounded-xl border border-dashed transition-all flex flex-col items-center justify-center gap-2 ${
                                isUploading 
                                    ? 'bg-slate-50 border-slate-200' 
                                    : 'bg-slate-50/60 border-slate-200 hover:border-amber-400 hover:bg-amber-50/30'
                            }`}>
                                {isUploading ? (
                                    <>
                                        <LucideLoader2 className="h-6 w-6 text-amber-500 animate-spin" />
                                        <p className="text-xs font-semibold text-slate-700">Enviando Arquivo...</p>
                                    </>
                                ) : (
                                    <>
                                        <div className="w-10 h-10 rounded-xl bg-white border border-slate-200/80 shadow-2xs flex items-center justify-center text-slate-400 group-hover:text-amber-600 group-hover:border-amber-200 transition-colors">
                                            {activeTab === 'certificates' ? <LucideAward className="h-5 w-5" /> : <LucideUpload className="h-5 w-5" />}
                                        </div>
                                        <div className="text-center">
                                            <p className="text-xs font-semibold text-slate-800">
                                                {activeTab === 'certificates' ? 'Clique ou arraste o Certificado' : 'Clique ou arraste um arquivo'}
                                            </p>
                                            <p className="text-[11px] text-slate-400 mt-0.5">
                                                {activeTab === 'certificates' ? 'PDF ou Imagem (Máx 50MB)' : 'PDF, DOCX, Imagens (Máx 50MB)'}
                                            </p>
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Files List */}
                    <div className="space-y-2.5 pt-2">
                        <span className="text-xs font-semibold text-slate-600 block">
                            {activeTab === 'certificates' ? 'Certificados Cadastrados' : 'Arquivos Carregados'}
                        </span>
                        
                        {isLoading ? (
                            <div className="py-10 flex flex-col items-center justify-center gap-2">
                                <LucideLoader2 className="h-5 w-5 text-amber-500 animate-spin" />
                                <p className="text-xs text-slate-400">Buscando arquivos...</p>
                            </div>
                        ) : filteredFiles.length > 0 ? (
                            filteredFiles.map((file) => (
                                <div 
                                    key={file.id} 
                                    className="relative p-3 rounded-xl bg-white border border-slate-200/80 shadow-2xs flex items-center justify-between hover:border-slate-300 transition-all group/file"
                                >
                                    <div className="flex items-center gap-3 min-w-0">
                                        <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${file.category === 'CERTIFICATE' ? 'bg-amber-50 text-amber-600' : 'bg-slate-100 text-slate-500'}`}>
                                            {file.category === 'CERTIFICATE' ? <LucideAward className="h-4 w-4" /> : <LucideFileText className="h-4 w-4" />}
                                        </div>
                                        <div className="min-w-0">
                                            <p className="font-medium text-xs truncate text-slate-900">{file.name}</p>
                                            <p className="text-[11px] text-slate-400 mt-0.5">
                                                {file.size || 'N/A'} • {new Date(file.createdAt).toLocaleDateString('pt-BR')}
                                            </p>
                                        </div>
                                    </div>
                                    
                                    <div className="flex items-center gap-1">
                                        <button 
                                            onClick={() => handleDownload(file)}
                                            disabled={isDownloading === file.id}
                                            className="p-1.5 rounded-lg text-slate-400 hover:text-amber-600 hover:bg-amber-50 transition-colors disabled:opacity-50"
                                            title="Download"
                                        >
                                            <LucideDownload className={`h-4 w-4 ${isDownloading === file.id ? 'animate-bounce text-amber-500' : ''}`} />
                                        </button>
                                        <button 
                                            onClick={() => setConfirmDeletion(file.id)}
                                            disabled={isDeleting === file.id}
                                            className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                                            title="Excluir"
                                        >
                                            {isDeleting === file.id ? (
                                                <LucideLoader2 className="h-4 w-4 animate-spin text-red-500" />
                                            ) : (
                                                <LucideTrash2 className="h-4 w-4" />
                                            )}
                                        </button>
                                    </div>

                                    {/* Inline Deletion Confirmation */}
                                    <AnimatePresence>
                                        {confirmDeletion === file.id && (
                                            <motion.div 
                                                initial={{ opacity: 0, scale: 0.98 }}
                                                animate={{ opacity: 1, scale: 1 }}
                                                exit={{ opacity: 0, scale: 0.98 }}
                                                className="absolute inset-0 bg-white/95 backdrop-blur-xs z-10 flex items-center justify-between px-4 rounded-xl border border-red-200 shadow-2xs"
                                            >
                                                <p className="text-xs font-semibold text-slate-900">Excluir este {file.category === 'CERTIFICATE' ? 'certificado' : 'material'}?</p>
                                                <div className="flex items-center gap-2">
                                                    <button 
                                                        onClick={() => setConfirmDeletion(null)}
                                                        className="h-7 px-3 rounded-lg border border-slate-200 text-slate-600 text-xs font-medium hover:bg-slate-50 transition-colors"
                                                    >
                                                        Cancelar
                                                    </button>
                                                    <button 
                                                        onClick={() => {
                                                            handleDelete(file.id);
                                                            setConfirmDeletion(null);
                                                        }}
                                                        className="h-7 px-3 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-medium transition-colors"
                                                    >
                                                        Excluir
                                                    </button>
                                                </div>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>
                            ))
                        ) : (
                            <div className="py-10 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200">
                                {activeTab === 'certificates' ? (
                                    <>
                                        <LucideAward className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                                        <p className="text-xs font-medium text-slate-500">Nenhum certificado cadastrado para este aluno.</p>
                                        <p className="text-[11px] text-slate-400 mt-0.5">Arraste um PDF ou imagem acima para emitir.</p>
                                    </>
                                ) : (
                                    <>
                                        <LucideFolder className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                                        <p className="text-xs font-medium text-slate-500">Nenhum material carregado para este aluno.</p>
                                    </>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                <div className="mt-5 pt-4 border-t border-slate-100 flex justify-end">
                    <button 
                        onClick={onClose}
                        className="h-9 px-4 rounded-xl border border-slate-200/80 hover:bg-slate-50 text-slate-600 text-xs font-medium transition-colors"
                    >
                        Fechar
                    </button>
                </div>
            </div>
        </PortalModal>
    );
}

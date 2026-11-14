import React, { useMemo, useState } from 'react';
import {
  LucideFileCode,
  LucideGlobe,
  LucidePlus,
  LucideSave,
  LucideX,
} from 'lucide-react';
import {
  getAheadBehindCounts,
  getCurrentBranchName,
  getFileStatuses,
} from '../../lib/git-engine/engine';
import { GitRepoState } from '../../lib/git-engine/types';
import { PortalModal } from '../PortalModal';
import { GitCommitGraph } from './GitCommitGraph';

interface GitWorkspaceVisualizerProps {
  state: GitRepoState;
  onUpdateFile: (filename: string, content: string) => void;
}

type VisualizerTab = 'graph' | 'files';

interface FlatFileRow {
  name: string;
  badgeText: string;
  badgeClass: string;
  iconClass: string;
}

export function GitWorkspaceVisualizer({
  state,
  onUpdateFile,
}: GitWorkspaceVisualizerProps) {
  const [activeTab, setActiveTab] = useState<VisualizerTab>('graph');
  const [editingFile, setEditingFile] = useState<string | null>(null);
  const [draftContent, setDraftContent] = useState('');
  const [newFileModalOpen, setNewFileModalOpen] = useState(false);
  const [newFileName, setNewFileName] = useState('');
  const [newFileContent, setNewFileContent] = useState('');

  const summary = useMemo(() => getFileStatuses(state), [state]);
  const currentBranch = getCurrentBranchName(state);
  const syncInfo = useMemo(() => getAheadBehindCounts(state), [state]);
  const remotes = Object.values(state.remotes);
  const filesCount = Object.keys(state.workingDirectory).length;

  const flatFiles = useMemo<FlatFileRow[]>(() => {
    const rows: FlatFileRow[] = [];
    const seen = new Set<string>();

    const addRow = (
      name: string,
      badgeText: string,
      badgeClass: string,
      iconClass: string,
    ) => {
      if (seen.has(name)) return;
      seen.add(name);
      rows.push({ name, badgeText, badgeClass, iconClass });
    };

    for (const name of summary.conflicted) {
      addRow(
        name,
        'Conflito • Resolver',
        'bg-rose-50 text-rose-700 border-rose-200',
        'text-rose-600',
      );
    }

    for (const item of summary.staged) {
      addRow(
        item.name,
        item.action === 'deleted' ? 'Removido (pronto)' : 'Pronto p/ commit',
        'bg-emerald-50 text-emerald-700 border-emerald-200',
        'text-emerald-600',
      );
    }

    for (const item of summary.unstaged) {
      addRow(
        item.name,
        item.action === 'deleted' ? 'Removido' : 'Modificado',
        'bg-amber-50 text-amber-800 border-amber-200',
        'text-[#D98B08]',
      );
    }

    for (const name of summary.untracked) {
      addRow(
        name,
        'Novo (sem git add)',
        'bg-amber-50 text-amber-800 border-amber-200',
        'text-[#D98B08]',
      );
    }

    for (const name of summary.clean) {
      addRow(
        name,
        'Salvo',
        'bg-slate-100 text-slate-600 border-slate-200/80',
        'text-slate-400',
      );
    }

    for (const name of summary.ignored) {
      addRow(
        name,
        'Ignorado',
        'bg-slate-50 text-slate-400 border-slate-200/60',
        'text-slate-300',
      );
    }

    return rows;
  }, [summary]);

  const openEditor = (filename: string) => {
    setEditingFile(filename);
    setDraftContent(state.workingDirectory[filename] ?? '');
  };

  const handleSaveEditor = () => {
    if (!editingFile) return;
    onUpdateFile(editingFile, draftContent);
    setEditingFile(null);
  };

  const handleCreateNewFile = (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = newFileName.trim().replace(/^\/+/, '');
    if (!cleaned) return;
    onUpdateFile(cleaned, newFileContent);
    setNewFileName('');
    setNewFileContent('');
    setNewFileModalOpen(false);
  };

  return (
    <div className="bg-white border border-slate-200/80 rounded-2xl shadow-2xs overflow-hidden flex flex-col min-w-0">
      {/* Compact 1-Line Header */}
      <div className="px-4 py-3 border-b border-slate-200/80 bg-[#FAFAF9]/70 flex items-center justify-between gap-3">
        <p className="text-xs text-slate-600 truncate">
          {state.initialized ? (
            <>
              Branch:{' '}
              <span className="font-semibold text-slate-900">
                {currentBranch ?? 'HEAD destacado'}
              </span>
            </>
          ) : (
            <span className="font-medium text-slate-500">Sem Git iniciado</span>
          )}
        </p>

        <div className="inline-flex p-0.5 bg-slate-100 rounded-lg border border-slate-200/60 shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('graph')}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs transition-all ${
              activeTab === 'graph'
                ? 'bg-white text-slate-900 font-semibold shadow-2xs'
                : 'text-slate-600 hover:text-slate-900 font-medium'
            }`}
          >
            <span>Commits</span>
            <span className="text-[11px] text-slate-400 font-medium">
              {state.commits.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('files')}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs transition-all ${
              activeTab === 'files'
                ? 'bg-white text-slate-900 font-semibold shadow-2xs'
                : 'text-slate-600 hover:text-slate-900 font-medium'
            }`}
          >
            <span>Arquivos</span>
            <span className="text-[11px] text-slate-400 font-medium">
              {filesCount}
            </span>
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="p-4 max-h-[420px] overflow-y-auto custom-scrollbar">
        {activeTab === 'graph' && (
          <div>
            {remotes.length > 0 && (
              <div className="mb-3 px-3 py-2 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-2 min-w-0">
                  <LucideGlobe className="w-3.5 h-3.5 text-sky-600 shrink-0" />
                  <span className="text-slate-600 truncate">
                    Remoto:{' '}
                    <span className="font-mono font-semibold text-slate-900">
                      {remotes.map((r) => r.name).join(', ')}
                    </span>
                  </span>
                </div>

                {syncInfo ? (
                  syncInfo.ahead > 0 ? (
                    <span className="px-2 py-0.5 rounded-md bg-amber-50 border border-amber-200 text-amber-800 text-[11px] font-semibold shrink-0">
                      ↑ {syncInfo.ahead} para push
                    </span>
                  ) : syncInfo.behind > 0 ? (
                    <span className="px-2 py-0.5 rounded-md bg-sky-50 border border-sky-200 text-sky-800 text-[11px] font-semibold shrink-0">
                      ↓ {syncInfo.behind} para pull
                    </span>
                  ) : syncInfo.remoteBranchExists ? (
                    <span className="px-2 py-0.5 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-700 text-[11px] font-semibold shrink-0">
                      Sincronizado
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-md bg-white border border-slate-200 text-slate-500 text-[11px] font-medium shrink-0">
                      Pronto p/ push
                    </span>
                  )
                ) : (
                  <span className="px-2 py-0.5 rounded-md bg-white border border-slate-200 text-slate-500 text-[11px] font-medium shrink-0">
                    Conectado
                  </span>
                )}
              </div>
            )}

            <GitCommitGraph state={state} />
          </div>
        )}

        {activeTab === 'files' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs text-slate-500">
                Clique em um arquivo para ver ou editar.
              </p>
              <button
                type="button"
                onClick={() => setNewFileModalOpen(true)}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-xs font-medium text-slate-700 transition-colors shrink-0 active:scale-[0.98]"
              >
                <LucidePlus className="w-3.5 h-3.5" />
                <span>Novo arquivo</span>
              </button>
            </div>

            {flatFiles.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-8">
                Nenhum arquivo nesta pasta ainda. Crie com{' '}
                <code className="font-mono">touch</code> ou clicando em &quot;Novo arquivo&quot;.
              </p>
            ) : (
              <div className="rounded-xl border border-slate-200/80 divide-y divide-slate-100 bg-white overflow-hidden">
                {flatFiles.map((file) => (
                  <button
                    key={file.name}
                    type="button"
                    onClick={() => openEditor(file.name)}
                    className="w-full flex items-center justify-between gap-3 px-3 py-2.5 hover:bg-slate-50/70 transition-colors text-left"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <LucideFileCode
                        className={`w-4 h-4 shrink-0 ${file.iconClass}`}
                      />
                      <span className="font-mono text-xs font-medium text-slate-800 truncate">
                        {file.name}
                      </span>
                    </div>
                    <span
                      className={`text-[11px] font-medium px-2 py-0.5 rounded-md border shrink-0 ${file.badgeClass}`}
                    >
                      {file.badgeText}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modal File Inspector / Quick Editor */}
      <PortalModal
        isOpen={Boolean(editingFile)}
        onClose={() => setEditingFile(null)}
        className="relative z-[100000] w-full max-w-lg"
      >
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xl overflow-hidden flex flex-col">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <div className="min-w-0">
              <p className="text-xs text-slate-500">Editor rápido de arquivo</p>
              <h3 className="font-mono text-sm font-semibold text-slate-900 truncate">
                {editingFile}
              </h3>
            </div>
            <button
              type="button"
              onClick={() => setEditingFile(null)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
            >
              <LucideX className="w-4 h-4" />
            </button>
          </div>

          <div className="p-5 space-y-3">
            {draftContent.includes('<<<<<<<') && (
              <div className="p-3 rounded-xl bg-amber-50 border border-amber-200/80 text-xs text-amber-900 space-y-1">
                <p className="font-semibold">Conflito detectado neste arquivo</p>
                <p>
                  Apague as linhas com <code className="font-mono">&lt;&lt;&lt;&lt;&lt;&lt;&lt;</code>,{' '}
                  <code className="font-mono">=======</code> e <code className="font-mono">&gt;&gt;&gt;&gt;&gt;&gt;&gt;</code>, deixe o texto final desejado e salve.
                </p>
              </div>
            )}

            <textarea
              value={draftContent}
              onChange={(e) => setDraftContent(e.target.value)}
              rows={8}
              spellCheck={false}
              className="w-full rounded-xl border border-slate-200 bg-zinc-950 text-zinc-100 font-mono text-xs p-3.5 outline-none focus:border-[#F19B0A] focus:ring-1 focus:ring-[#F19B0A]/30 resize-y"
            />
          </div>

          <div className="px-5 py-3.5 bg-[#FAFAF9] border-t border-slate-100 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setEditingFile(null)}
              className="px-4 h-10 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-sm font-semibold text-slate-700 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleSaveEditor}
              className="inline-flex items-center gap-1.5 px-4 h-10 rounded-xl bg-[#F19B0A] hover:bg-[#D98B08] text-white text-sm font-semibold transition-all active:scale-[0.98]"
            >
              <LucideSave className="w-4 h-4" />
              <span>Salvar arquivo</span>
            </button>
          </div>
        </div>
      </PortalModal>

      {/* Modal New File */}
      <PortalModal
        isOpen={newFileModalOpen}
        onClose={() => setNewFileModalOpen(false)}
        className="relative z-[100000] w-full max-w-md"
      >
        <form
          onSubmit={handleCreateNewFile}
          className="bg-white rounded-2xl border border-slate-200/80 shadow-xl overflow-hidden flex flex-col"
        >
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <h3 className="text-base font-semibold text-slate-900">
              Criar arquivo no workspace
            </h3>
            <button
              type="button"
              onClick={() => setNewFileModalOpen(false)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
            >
              <LucideX className="w-4 h-4" />
            </button>
          </div>
          <div className="p-5 space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">
                Nome do arquivo
              </label>
              <input
                type="text"
                required
                value={newFileName}
                onChange={(e) => setNewFileName(e.target.value)}
                placeholder="Ex: script.js ou .gitignore"
                className="w-full h-10 px-3 rounded-xl border border-slate-200 text-sm font-mono text-slate-900 outline-none focus:border-[#F19B0A] focus:ring-1 focus:ring-[#F19B0A]/30"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">
                Conteúdo inicial
              </label>
              <textarea
                rows={4}
                value={newFileContent}
                onChange={(e) => setNewFileContent(e.target.value)}
                placeholder='console.log("Olá Brilha Mais");'
                className="w-full p-3 rounded-xl border border-slate-200 text-xs font-mono text-slate-900 outline-none focus:border-[#F19B0A] focus:ring-1 focus:ring-[#F19B0A]/30 resize-y"
              />
            </div>
          </div>
          <div className="px-5 py-3.5 bg-[#FAFAF9] border-t border-slate-100 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setNewFileModalOpen(false)}
              className="px-4 h-10 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-sm font-semibold text-slate-700 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 h-10 rounded-xl bg-[#F19B0A] hover:bg-[#D98B08] text-white text-sm font-semibold transition-all active:scale-[0.98]"
            >
              Criar
            </button>
          </div>
        </form>
      </PortalModal>
    </div>
  );
}

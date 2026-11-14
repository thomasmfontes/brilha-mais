import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import {
  LucideArrowRight,
  LucideCheck,
  LucideCheckCircle2,
  LucideChevronDown,
  LucideLightbulb,
  LucideRotateCcw,
} from 'lucide-react';
import {
  cloneRepoState,
  executeGitLabCommand,
  getCurrentBranchName,
} from '../../lib/git-engine/engine';
import {
  GitMission,
  GitRepoState,
  SandboxPreset,
} from '../../lib/git-engine/types';
import { GitTerminal, TerminalEntry } from './GitTerminal';
import { GitWorkspaceVisualizer } from './GitWorkspaceVisualizer';

interface GitPracticeWorkspaceProps {
  mode: 'mission' | 'sandbox';
  mission?: GitMission;
  totalMissions?: number;
  isCompleted?: boolean;
  hasNextMission?: boolean;
  onPhaseComplete?: (slug: string, commandsCount: number) => void;
  onNextMission?: () => void;
  sandboxPreset?: SandboxPreset;
  externalInsertRequest?: { text: string; nonce: number } | null;
  resetNonce?: number;
}

const STORAGE_PREFIX = 'brilha_git_lab_draft_v1_';

function buildInitialEntries(label: string): TerminalEntry[] {
  return [
    {
      id: `welcome-${Date.now()}`,
      lines: [
        {
          text: `Git Lab • ${label}`,
          tone: 'accent',
        },
        {
          text: 'Digite um comando abaixo ou "help" para ver os comandos disponíveis.',
          tone: 'muted',
        },
      ],
    },
  ];
}

export function GitPracticeWorkspace({
  mode,
  mission,
  totalMissions = 10,
  isCompleted = false,
  hasNextMission = false,
  onPhaseComplete,
  onNextMission,
  sandboxPreset,
  externalInsertRequest,
  resetNonce,
}: GitPracticeWorkspaceProps) {
  const workspaceKey =
    mode === 'mission'
      ? `mission_${mission?.slug || 'default'}`
      : `sandbox_${sandboxPreset?.id || 'empty'}`;

  const createFreshState = (): GitRepoState => {
    if (mode === 'mission' && mission) {
      return mission.initialState();
    }
    if (sandboxPreset) {
      return sandboxPreset.initialState();
    }
    throw new Error('GitPracticeWorkspace precisa de mission ou sandboxPreset.');
  };

  const buildWelcomeLabel = () =>
    mode === 'mission'
      ? `Fase ${mission?.order}: ${mission?.title}`
      : sandboxPreset?.title || 'Terminal Livre';

  const loadDraft = (): { state: GitRepoState; entries: TerminalEntry[] } => {
    try {
      const raw = localStorage.getItem(`${STORAGE_PREFIX}${workspaceKey}`);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && parsed.state && Array.isArray(parsed.entries)) {
          return parsed;
        }
      }
    } catch {
      // ignore corrupted draft
    }
    return {
      state: createFreshState(),
      entries: buildInitialEntries(buildWelcomeLabel()),
    };
  };

  const [repoState, setRepoState] = useState<GitRepoState>(() => loadDraft().state);
  const [entries, setEntries] = useState<TerminalEntry[]>(() => loadDraft().entries);
  const [showHelp, setShowHelp] = useState(false);
  const [visibleHintsCount, setVisibleHintsCount] = useState(0);
  const [localInsertReq, setLocalInsertReq] = useState<{
    text: string;
    nonce: number;
  } | null>(null);
  const completedSessionRef = useRef<Set<string>>(new Set());
  const prevResetNonceRef = useRef<number | undefined>(resetNonce);

  useEffect(() => {
    const loaded = loadDraft();
    setRepoState(loaded.state);
    setEntries(loaded.entries);
    setShowHelp(false);
    setVisibleHintsCount(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workspaceKey]);

  useEffect(() => {
    if (externalInsertRequest) {
      setLocalInsertReq(externalInsertRequest);
    }
  }, [externalInsertRequest]);

  useEffect(() => {
    if (resetNonce !== undefined && resetNonce !== prevResetNonceRef.current) {
      prevResetNonceRef.current = resetNonce;
      handleReset();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resetNonce]);

  useEffect(() => {
    try {
      localStorage.setItem(
        `${STORAGE_PREFIX}${workspaceKey}`,
        JSON.stringify({ state: repoState, entries: entries.slice(-60) }),
      );
    } catch {
      // ignore quota errors
    }
  }, [repoState, entries, workspaceKey]);

  const objectiveResults = useMemo(() => {
    if (mode !== 'mission' || !mission) return [];
    return mission.objectives.map((obj) => ({
      ...obj,
      passed: obj.check(repoState),
    }));
  }, [mode, mission, repoState]);

  const passedCount = objectiveResults.filter((o) => o.passed).length;

  const allObjectivesPassed =
    mode === 'mission' &&
    objectiveResults.length > 0 &&
    passedCount === objectiveResults.length;

  const checkAndNotifyCompletion = (nextState: GitRepoState) => {
    if (mode !== 'mission' || !mission || !onPhaseComplete) return;
    const passedNow = mission.objectives.every((obj) => obj.check(nextState));
    const sessionKey = `${mission.slug}`;
    if (passedNow && !completedSessionRef.current.has(sessionKey)) {
      completedSessionRef.current.add(sessionKey);
      if (!isCompleted) {
        onPhaseComplete(mission.slug, nextState.executedCommands.length);
      }
    }
  };

  const handleRunCommand = (rawCommand: string) => {
    const promptBefore = `~/${repoState.projectName} (${
      getCurrentBranchName(repoState) ?? 'sem-git'
    }) $`;

    const result = executeGitLabCommand(repoState, rawCommand);
    setRepoState(result.nextState);

    if (result.clearScreen) {
      setEntries([]);
    } else {
      const nextLines = result.mobileNormalizedNote
        ? [
            { text: `↳ ${result.mobileNormalizedNote}`, tone: 'muted' as const },
            ...result.lines,
          ]
        : result.lines;

      setEntries((prev) => [
        ...prev,
        {
          id: `cmd-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          prompt: promptBefore,
          command: rawCommand.trim(),
          lines: nextLines,
        },
      ]);
    }

    checkAndNotifyCompletion(result.nextState);
  };

  const handleUpdateFile = (filename: string, content: string) => {
    const nextState = cloneRepoState(repoState);
    nextState.workingDirectory[filename] = content;
    setRepoState(nextState);
    setEntries((prev) => [
      ...prev,
      {
        id: `file-${Date.now()}`,
        lines: [
          {
            text: `Arquivo '${filename}' atualizado pelo editor visual.`,
            tone: 'info',
          },
        ],
      },
    ]);
    checkAndNotifyCompletion(nextState);
  };

  const handleReset = () => {
    const fresh = createFreshState();
    const freshEntries = buildInitialEntries(buildWelcomeLabel());
    setRepoState(fresh);
    setEntries(freshEntries);
    setShowHelp(false);
    setVisibleHintsCount(0);
    if (mission) {
      completedSessionRef.current.delete(mission.slug);
    }
    try {
      localStorage.removeItem(`${STORAGE_PREFIX}${workspaceKey}`);
    } catch {
      // ignore
    }
  };

  const requestInsert = (text: string) => {
    setLocalInsertReq({ text, nonce: Date.now() + Math.random() });
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start min-w-0">
      {/* Left Column: Mission Briefing */}
      {mode === 'mission' && mission && (
        <div className="lg:col-span-5 min-w-0">
          <div className="bg-white border border-slate-200/80 rounded-2xl shadow-2xs p-5 sm:p-6 space-y-5">
            {/* Compact Header */}
            <div className="space-y-1.5">
              <p className="text-xs font-medium text-slate-500">
                Fase {mission.order} de {totalMissions} • {mission.difficulty}
              </p>
              <h2 className="text-lg font-bold tracking-tight text-slate-900">
                {mission.title}
              </h2>
              <p className="text-sm text-slate-600 leading-relaxed">
                {mission.scenario}
              </p>
            </div>

            {/* Clean Checklist */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-900">O que fazer</span>
                <span className="font-medium text-slate-500">
                  {passedCount}/{objectiveResults.length}
                </span>
              </div>

              <div className="rounded-xl border border-slate-200/80 divide-y divide-slate-100 overflow-hidden bg-white">
                {objectiveResults.map((obj) => (
                  <div
                    key={obj.id}
                    className={`flex items-start gap-3 px-3.5 py-2.5 transition-colors ${
                      obj.passed ? 'bg-emerald-50/40' : ''
                    }`}
                  >
                    <div
                      className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5 transition-colors ${
                        obj.passed
                          ? 'bg-emerald-600 text-white'
                          : 'bg-slate-100 border border-slate-300 text-transparent'
                      }`}
                    >
                      <LucideCheck className="w-3 h-3" />
                    </div>
                    <p
                      className={`text-xs sm:text-[13px] leading-snug ${
                        obj.passed
                          ? 'font-medium text-emerald-950'
                          : 'text-slate-700'
                      }`}
                    >
                      {obj.label}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Completion Banner */}
            {(allObjectivesPassed || isCompleted) && (
              <motion.div
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200/80 flex items-center justify-between gap-3 flex-wrap"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <LucideCheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                  <p className="text-xs font-semibold text-emerald-950">
                    {allObjectivesPassed
                      ? 'Fase concluída!'
                      : 'Fase já concluída'}
                  </p>
                </div>

                {hasNextMission && onNextMission && (
                  <button
                    type="button"
                    onClick={onNextMission}
                    className="inline-flex items-center gap-1.5 h-8 px-3.5 rounded-lg bg-[#F19B0A] hover:bg-[#D98B08] text-white text-xs font-semibold transition-all active:scale-[0.98]"
                  >
                    <span>Próxima fase</span>
                    <LucideArrowRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </motion.div>
            )}

            {/* Collapsible Help + Quiet Footer Actions */}
            <div className="pt-2 border-t border-slate-100 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => setShowHelp((prev) => !prev)}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700 hover:text-slate-950 transition-colors"
                >
                  <LucideLightbulb className="w-3.5 h-3.5 text-[#D98B08]" />
                  <span>Como fazer / Dicas</span>
                  <LucideChevronDown
                    className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-150 ${
                      showHelp ? 'rotate-180' : ''
                    }`}
                  />
                </button>

                <button
                  type="button"
                  onClick={handleReset}
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-800 transition-colors"
                >
                  <LucideRotateCcw className="w-3.5 h-3.5" />
                  <span>Reiniciar</span>
                </button>
              </div>

              {showHelp && (
                <div className="p-4 rounded-xl bg-[#FAFAF9] border border-slate-200/80 space-y-3">
                  <p className="text-xs text-slate-600 leading-relaxed">
                    {mission.conceptSummary}
                  </p>

                  {mission.exampleCommands.length > 0 && (
                    <div className="space-y-1.5">
                      <p className="text-[11px] font-medium text-slate-500">
                        Clique para preencher no terminal:
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {mission.exampleCommands.map((cmd) => (
                          <button
                            key={cmd}
                            type="button"
                            onClick={() => requestInsert(cmd)}
                            className="px-2.5 py-1 rounded-lg bg-white hover:bg-amber-50 border border-slate-200 hover:border-amber-300 font-mono text-[11px] text-slate-800 transition-colors text-left max-w-full truncate active:scale-[0.98]"
                            title={`Inserir: ${cmd}`}
                          >
                            {cmd}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {mission.hints.length > 0 && (
                    <div className="space-y-2 pt-1 border-t border-slate-200/60">
                      {mission.hints
                        .slice(0, visibleHintsCount)
                        .map((hint, idx) => (
                          <p
                            key={idx}
                            className="text-xs text-amber-900 bg-amber-50/70 border border-amber-200/70 rounded-lg p-2.5 leading-relaxed"
                          >
                            {hint}
                          </p>
                        ))}

                      {visibleHintsCount < mission.hints.length && (
                        <button
                          type="button"
                          onClick={() => setVisibleHintsCount((c) => c + 1)}
                          className="text-xs font-semibold text-[#D98B08] hover:text-amber-700 transition-colors"
                        >
                          Ver próxima dica ({visibleHintsCount + 1}/
                          {mission.hints.length})
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Terminal + Live Repository Visualizer */}
      <div
        className={
          mode === 'mission'
            ? 'lg:col-span-7 space-y-5 min-w-0'
            : 'lg:col-span-12 min-w-0'
        }
      >
        <div
          className={
            mode === 'sandbox'
              ? 'grid grid-cols-1 lg:grid-cols-12 gap-5 items-start'
              : 'space-y-5'
          }
        >
          <div className={mode === 'sandbox' ? 'lg:col-span-7 min-w-0' : 'min-w-0'}>
            <GitTerminal
              state={repoState}
              entries={entries}
              onRunCommand={handleRunCommand}
              onClear={() => setEntries([])}
              insertRequest={localInsertReq}
            />
          </div>

          <div className={mode === 'sandbox' ? 'lg:col-span-5 min-w-0' : 'min-w-0'}>
            <GitWorkspaceVisualizer
              state={repoState}
              onUpdateFile={handleUpdateFile}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

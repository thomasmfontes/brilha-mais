import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  LucideArrowLeft,
  LucideArrowRight,
  LucideCheck,
  LucideChevronDown,
  LucideLock,
  LucideRotateCcw,
  LucideSearch,
  LucideUsers,
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../utils/api';
import { hasTechAreaAccess } from '../utils/techAccess';
import {
  GIT_CHEAT_SHEET,
  GIT_MISSIONS,
  SANDBOX_PRESETS,
} from '../lib/git-engine/missions';
import { GitPracticeWorkspace } from '../components/git/GitPracticeWorkspace';
import Skeleton from '../components/Skeleton';

type LabTab = 'missions' | 'sandbox' | 'guide' | 'students';

interface StudentProgressItem {
  id: string;
  name: string | null;
  email: string;
  avatarUrl: string | null;
  locationName: string | null;
  turmas: Array<{ id: string; name: string }>;
  completedSlugs: string[];
  completedCount: number;
  totalCommands: number;
  lastActivityAt: string | null;
}

const PROGRESS_CACHE_KEY = 'brilha_git_lab_completed_v1';

const PRESET_SHORT_LABELS: Record<string, string> = {
  empty: 'Pasta Vazia',
  webapp: 'Projeto Web',
  'team-remote': 'Servidor Remoto',
  'conflict-lab': 'Conflito de Merge',
};

export default function GitLabPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [hasAccess, setHasAccess] = useState(true);
  const [userRole, setUserRole] = useState<string>('STUDENT');
  const [activeTab, setActiveTab] = useState<LabTab>('missions');
  const [selectedSlug, setSelectedSlug] = useState<string>(GIT_MISSIONS[0].slug);
  const [isPhaseMenuOpen, setIsPhaseMenuOpen] = useState(false);
  const phaseMenuRef = useRef<HTMLDivElement>(null);

  const [completedSlugs, setCompletedSlugs] = useState<string[]>(() => {
    try {
      const raw = localStorage.getItem(PROGRESS_CACHE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });

  const [selectedPresetId, setSelectedPresetId] = useState<string>(
    SANDBOX_PRESETS[0].id,
  );
  const [sandboxInsertReq, setSandboxInsertReq] = useState<{
    text: string;
    nonce: number;
  } | null>(null);
  const [sandboxResetNonce, setSandboxResetNonce] = useState(0);

  const [guideSearch, setGuideSearch] = useState('');
  const [guideCategoryId, setGuideCategoryId] = useState<string>('ALL');

  const [studentsProgress, setStudentsProgress] = useState<StudentProgressItem[]>(
    [],
  );
  const [isLoadingStudents, setIsLoadingStudents] = useState(false);
  const [studentSearch, setStudentSearch] = useState('');
  const [expandedStudentId, setExpandedStudentId] = useState<string | null>(
    null,
  );

  const canViewStudents =
    userRole === 'INSTRUCTOR' ||
    userRole === 'ADMIN' ||
    userRole === 'SUPER_ADMIN';

  useEffect(() => {
    const handleOutside = (event: MouseEvent) => {
      if (
        phaseMenuRef.current &&
        !phaseMenuRef.current.contains(event.target as Node)
      ) {
        setIsPhaseMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, []);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setIsLoading(true);
      try {
        const { data: user } = await api.get('/users/me');
        if (!mounted) return;

        const role = String(user?.role || 'STUDENT').toUpperCase();
        setUserRole(role);

        const allowed = hasTechAreaAccess(user);
        setHasAccess(allowed);
        if (!allowed) {
          return;
        }

        const { data: prog } = await api.get('/git-lab/my-progress');
        if (!mounted) return;
        const slugs: string[] = Array.isArray(prog?.completedSlugs)
          ? prog.completedSlugs
          : [];
        setCompletedSlugs(slugs);
        localStorage.setItem(PROGRESS_CACHE_KEY, JSON.stringify(slugs));

        const firstIncomplete = GIT_MISSIONS.find(
          (m) => !slugs.includes(m.slug),
        );
        if (firstIncomplete) {
          setSelectedSlug(firstIncomplete.slug);
        }
      } catch (error) {
        console.error('Error loading Git Lab:', error);
      } finally {
        if (mounted) setIsLoading(false);
      }
    };

    load();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (activeTab === 'students' && canViewStudents) {
      fetchStudentsProgress();
    }
  }, [activeTab, canViewStudents]);

  const fetchStudentsProgress = async () => {
    setIsLoadingStudents(true);
    try {
      const { data } = await api.get('/git-lab/students');
      setStudentsProgress(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error loading students git progress:', error);
      toast.error('Não foi possível carregar o progresso dos alunos.');
    } finally {
      setIsLoadingStudents(false);
    }
  };

  const handlePhaseComplete = async (slug: string, commandsCount: number) => {
    setCompletedSlugs((prev) => {
      const next = prev.includes(slug) ? prev : [...prev, slug];
      try {
        localStorage.setItem(PROGRESS_CACHE_KEY, JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });

    const mission = GIT_MISSIONS.find((m) => m.slug === slug);
    toast.success(
      mission
        ? `Fase ${mission.order} concluída: ${mission.title}`
        : 'Fase concluída!',
    );

    try {
      const { data } = await api.post('/git-lab/complete', {
        exerciseSlug: slug,
        commandsCount,
      });
      if (Array.isArray(data?.completedSlugs)) {
        setCompletedSlugs(data.completedSlugs);
        localStorage.setItem(
          PROGRESS_CACHE_KEY,
          JSON.stringify(data.completedSlugs),
        );
      }
    } catch (error) {
      console.error('Error saving git phase progress:', error);
      toast.error('Fase validada localmente, mas houve falha ao sincronizar.');
    }
  };

  const handleTestCommand = (insertText: string) => {
    setSandboxInsertReq({
      text: insertText,
      nonce: Date.now() + Math.random(),
    });
    setActiveTab('sandbox');
  };

  const currentMissionIdx = useMemo(
    () =>
      Math.max(
        0,
        GIT_MISSIONS.findIndex((m) => m.slug === selectedSlug),
      ),
    [selectedSlug],
  );
  const currentMission = GIT_MISSIONS[currentMissionIdx];
  const hasPrevMission = currentMissionIdx > 0;
  const hasNextMission = currentMissionIdx < GIT_MISSIONS.length - 1;

  const currentPreset = useMemo(
    () =>
      SANDBOX_PRESETS.find((p) => p.id === selectedPresetId) ||
      SANDBOX_PRESETS[0],
    [selectedPresetId],
  );

  const groupedMissions = useMemo(() => {
    const groups = new Map<string, typeof GIT_MISSIONS>();
    for (const mission of GIT_MISSIONS) {
      const list = groups.get(mission.stageGroup) || [];
      list.push(mission);
      groups.set(mission.stageGroup, list);
    }
    return Array.from(groups.entries());
  }, []);

  const filteredGuideCategories = useMemo(() => {
    const q = guideSearch.trim().toLowerCase();
    return GIT_CHEAT_SHEET.filter(
      (cat) => guideCategoryId === 'ALL' || cat.id === guideCategoryId,
    )
      .map((cat) => {
        if (!q) return cat;
        const items = cat.items.filter(
          (item) =>
            item.cmd.toLowerCase().includes(q) ||
            item.description.toLowerCase().includes(q) ||
            cat.title.toLowerCase().includes(q),
        );
        return { ...cat, items };
      })
      .filter((cat) => cat.items.length > 0);
  }, [guideSearch, guideCategoryId]);

  const filteredStudents = useMemo(() => {
    const q = studentSearch.trim().toLowerCase();
    if (!q) return studentsProgress;
    return studentsProgress.filter((student) => {
      const nameMatch = (student.name || '').toLowerCase().includes(q);
      const emailMatch = (student.email || '').toLowerCase().includes(q);
      const turmaMatch = student.turmas.some((t) =>
        t.name.toLowerCase().includes(q),
      );
      return nameMatch || emailMatch || turmaMatch;
    });
  }, [studentsProgress, studentSearch]);

  const studentStats = useMemo(() => {
    const total = studentsProgress.length;
    const avg =
      total > 0
        ? Math.round(
            (studentsProgress.reduce((acc, s) => acc + s.completedCount, 0) /
              (total * GIT_MISSIONS.length)) *
              100,
          )
        : 0;
    const finishedAll = studentsProgress.filter(
      (s) => s.completedCount >= GIT_MISSIONS.length,
    ).length;
    return { total, avg, finishedAll };
  }, [studentsProgress]);

  if (isLoading) {
    return (
      <div className="space-y-6 w-full pb-12">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div className="space-y-2">
            <Skeleton className="h-8 w-40" variant="rounded" />
            <Skeleton className="h-4 w-72" variant="rectangle" />
          </div>
          <Skeleton className="h-10 w-80" variant="rounded" />
        </div>
        <Skeleton className="h-14 w-full" variant="rounded" />
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          <Skeleton className="lg:col-span-5 h-[420px]" variant="rounded" />
          <Skeleton className="lg:col-span-7 h-[420px]" variant="rounded" />
        </div>
      </div>
    );
  }

  if (!hasAccess) {
    return (
      <div className="max-w-xl mx-auto py-12">
        <div className="bg-white border border-slate-200/80 rounded-2xl shadow-2xs p-8 text-center space-y-4">
          <div className="w-12 h-12 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-center text-slate-500 mx-auto">
            <LucideLock className="w-6 h-6" />
          </div>
          <div className="space-y-1.5">
            <h1 className="text-xl font-bold tracking-tight text-slate-900">
              Área exclusiva de Tecnologia
            </h1>
            <p className="text-sm text-slate-500 leading-relaxed">
              O Git Lab está disponível para alunos e instrutores vinculados às turmas da área de Tecnologia.
            </p>
          </div>
          <div className="pt-2">
            <Link
              to="/dashboard"
              className="inline-flex items-center justify-center gap-2 h-10 px-5 rounded-xl bg-[#F19B0A] hover:bg-[#D98B08] text-white text-sm font-semibold transition-all active:scale-[0.98]"
            >
              <LucideArrowLeft className="w-4 h-4" />
              <span>Voltar ao início</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 w-full pb-12 min-w-0">
      {/* Header + Segmented Navigation Pills */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
            Git Lab
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Pratique comandos Git passo a passo no terminal interativo.
          </p>
        </div>

        <div className="inline-flex p-1 bg-slate-100 rounded-xl border border-slate-200/60 self-start sm:self-auto overflow-x-auto max-w-full no-scrollbar">
          <button
            type="button"
            onClick={() => setActiveTab('missions')}
            className={`px-3 py-1.5 rounded-lg text-xs transition-all whitespace-nowrap ${
              activeTab === 'missions'
                ? 'bg-white text-slate-900 font-semibold shadow-2xs'
                : 'text-slate-600 hover:text-slate-900 font-medium'
            }`}
          >
            Exercícios{' '}
            <span className="ml-1 text-slate-400 font-normal">
              {completedSlugs.length}/{GIT_MISSIONS.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('sandbox')}
            className={`px-3 py-1.5 rounded-lg text-xs transition-all whitespace-nowrap ${
              activeTab === 'sandbox'
                ? 'bg-white text-slate-900 font-semibold shadow-2xs'
                : 'text-slate-600 hover:text-slate-900 font-medium'
            }`}
          >
            Terminal Livre
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('guide')}
            className={`px-3 py-1.5 rounded-lg text-xs transition-all whitespace-nowrap ${
              activeTab === 'guide'
                ? 'bg-white text-slate-900 font-semibold shadow-2xs'
                : 'text-slate-600 hover:text-slate-900 font-medium'
            }`}
          >
            Guia Rápido
          </button>

          {canViewStudents && (
            <button
              type="button"
              onClick={() => setActiveTab('students')}
              className={`px-3 py-1.5 rounded-lg text-xs transition-all whitespace-nowrap ${
                activeTab === 'students'
                  ? 'bg-white text-slate-900 font-semibold shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900 font-medium'
              }`}
            >
              Alunos
            </button>
          )}
        </div>
      </div>

      {/* Tab 1: Guided Exercises */}
      {activeTab === 'missions' && (
        <div className="space-y-5 min-w-0">
          {/* Compact Single Phase Navigation Bar */}
          <div className="bg-white border border-slate-200/80 rounded-2xl shadow-2xs p-3 flex flex-wrap items-center justify-between gap-3">
            {/* Phase Dropdown */}
            <div className="relative min-w-0" ref={phaseMenuRef}>
              <button
                type="button"
                onClick={() => setIsPhaseMenuOpen((o) => !o)}
                className="h-9 px-3 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs sm:text-sm font-medium text-slate-800 inline-flex items-center gap-2 max-w-full transition-colors"
              >
                <span className="font-semibold text-[#D98B08] shrink-0">
                  Fase {String(currentMission.order).padStart(2, '0')}:
                </span>
                <span className="truncate max-w-[200px] sm:max-w-[260px]">
                  {currentMission.title}
                </span>
                <LucideChevronDown
                  className={`w-4 h-4 text-slate-400 shrink-0 transition-transform duration-150 ${
                    isPhaseMenuOpen ? 'rotate-180 text-slate-700' : ''
                  }`}
                />
              </button>

              {isPhaseMenuOpen && (
                <div className="absolute left-0 top-full mt-1.5 w-80 max-w-[calc(100vw-2.5rem)] bg-white border border-slate-200/90 rounded-xl shadow-lg z-40 py-2 max-h-80 overflow-y-auto custom-scrollbar">
                  {groupedMissions.map(([stageName, missions]) => (
                    <div key={stageName} className="py-1">
                      <p className="px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                        {stageName}
                      </p>
                      {missions.map((mission) => {
                        const isDone = completedSlugs.includes(mission.slug);
                        const isSelected = mission.slug === selectedSlug;
                        return (
                          <button
                            key={mission.slug}
                            type="button"
                            onClick={() => {
                              setSelectedSlug(mission.slug);
                              setIsPhaseMenuOpen(false);
                            }}
                            className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs text-left transition-colors ${
                              isSelected
                                ? 'bg-amber-50/80 text-amber-950 font-semibold'
                                : 'text-slate-700 hover:bg-slate-50'
                            }`}
                          >
                            <span
                              className={`w-5 h-5 rounded-md flex items-center justify-center text-[11px] font-semibold shrink-0 ${
                                isDone
                                  ? 'bg-emerald-600 text-white'
                                  : isSelected
                                    ? 'bg-[#F19B0A] text-white'
                                    : 'bg-slate-100 text-slate-600'
                              }`}
                            >
                              {isDone ? (
                                <LucideCheck className="w-3 h-3" />
                              ) : (
                                mission.order
                              )}
                            </span>
                            <span className="truncate flex-1">
                              {mission.title}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Prev / Next Controls */}
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                disabled={!hasPrevMission}
                onClick={() => {
                  if (hasPrevMission) {
                    setSelectedSlug(GIT_MISSIONS[currentMissionIdx - 1].slug);
                  }
                }}
                className="inline-flex items-center gap-1 h-9 px-3 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:pointer-events-none text-xs font-medium text-slate-700 transition-colors"
              >
                <LucideArrowLeft className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Anterior</span>
              </button>

              <button
                type="button"
                disabled={!hasNextMission}
                onClick={() => {
                  if (hasNextMission) {
                    setSelectedSlug(GIT_MISSIONS[currentMissionIdx + 1].slug);
                  }
                }}
                className="inline-flex items-center gap-1 h-9 px-3 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:pointer-events-none text-xs font-medium text-slate-700 transition-colors"
              >
                <span className="hidden sm:inline">Próxima</span>
                <LucideArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <GitPracticeWorkspace
            mode="mission"
            mission={currentMission}
            totalMissions={GIT_MISSIONS.length}
            isCompleted={completedSlugs.includes(currentMission.slug)}
            hasNextMission={hasNextMission}
            onPhaseComplete={handlePhaseComplete}
            onNextMission={() => {
              if (hasNextMission) {
                setSelectedSlug(GIT_MISSIONS[currentMissionIdx + 1].slug);
              }
            }}
          />
        </div>
      )}

      {/* Tab 2: Free Sandbox */}
      {activeTab === 'sandbox' && (
        <div className="space-y-5 min-w-0">
          {/* Compact Scenario Toolbar */}
          <div className="bg-white border border-slate-200/80 rounded-2xl shadow-2xs p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 flex-wrap min-w-0">
              <span className="text-xs font-medium text-slate-500 shrink-0">
                Cenário:
              </span>
              <div className="inline-flex p-0.5 bg-slate-100 rounded-lg border border-slate-200/60 overflow-x-auto max-w-full no-scrollbar">
                {SANDBOX_PRESETS.map((preset) => {
                  const isSelected = preset.id === selectedPresetId;
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => setSelectedPresetId(preset.id)}
                      className={`px-2.5 py-1 rounded-md text-xs whitespace-nowrap transition-all ${
                        isSelected
                          ? 'bg-white text-slate-900 font-semibold shadow-2xs'
                          : 'text-slate-600 hover:text-slate-900 font-medium'
                      }`}
                    >
                      {PRESET_SHORT_LABELS[preset.id] || preset.title}
                    </button>
                  );
                })}
              </div>
              <span className="hidden xl:inline text-xs text-slate-400 truncate max-w-xs">
                {currentPreset.description}
              </span>
            </div>

            <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
              <button
                type="button"
                onClick={() => setSandboxResetNonce((n) => n + 1)}
                className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 transition-colors active:scale-[0.98]"
              >
                <LucideRotateCcw className="w-3.5 h-3.5" />
                <span>Reiniciar</span>
              </button>
            </div>
          </div>

          <GitPracticeWorkspace
            mode="sandbox"
            sandboxPreset={currentPreset}
            externalInsertRequest={sandboxInsertReq}
            resetNonce={sandboxResetNonce}
          />
        </div>
      )}

      {/* Tab 3: Quick Reference Guide */}
      {activeTab === 'guide' && (
        <div className="space-y-5 min-w-0">
          {/* Search & Category Pills */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <LucideSearch className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={guideSearch}
                onChange={(e) => setGuideSearch(e.target.value)}
                placeholder="Buscar comando ou ação..."
                className="w-full h-10 pl-10 pr-3.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:border-[#F19B0A] focus:ring-1 focus:ring-[#F19B0A]/30"
              />
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto max-w-full no-scrollbar pb-0.5">
              <button
                type="button"
                onClick={() => setGuideCategoryId('ALL')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap border transition-colors ${
                  guideCategoryId === 'ALL'
                    ? 'bg-slate-900 text-white border-slate-900'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                }`}
              >
                Todos
              </button>
              {GIT_CHEAT_SHEET.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setGuideCategoryId(cat.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap border transition-colors ${
                    guideCategoryId === cat.id
                      ? 'bg-slate-900 text-white border-slate-900'
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  {cat.title}
                </button>
              ))}
            </div>
          </div>

          {filteredGuideCategories.length === 0 ? (
            <div className="bg-white border border-slate-200/80 rounded-2xl shadow-2xs p-12 text-center space-y-1.5">
              <p className="text-sm font-semibold text-slate-900">
                Nenhum comando encontrado
              </p>
              <p className="text-xs text-slate-500">
                Tente buscar por palavras como &quot;commit&quot;, &quot;branch&quot; ou &quot;merge&quot;.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
              {filteredGuideCategories.map((category) => (
                <div
                  key={category.id}
                  className="bg-white border border-slate-200/80 rounded-2xl shadow-2xs overflow-hidden"
                >
                  <div className="px-5 py-3.5 bg-slate-50/70 border-b border-slate-100">
                    <h2 className="text-sm font-semibold text-slate-900">
                      {category.title}
                    </h2>
                  </div>

                  <div className="divide-y divide-slate-100">
                    {category.items.map((item) => (
                      <div
                        key={item.cmd}
                        className="px-5 py-3 flex items-center justify-between gap-3"
                      >
                        <div className="min-w-0">
                          <code className="block font-mono text-xs font-semibold text-slate-900 break-all">
                            {item.cmd}
                          </code>
                          <p className="text-xs text-slate-500 mt-0.5 leading-snug">
                            {item.description}
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleTestCommand(item.insertText)}
                          className="shrink-0 h-8 px-3 rounded-lg border border-slate-200 bg-white hover:border-[#F19B0A] hover:text-[#D98B08] text-xs font-semibold text-slate-700 transition-colors active:scale-[0.98]"
                        >
                          Testar
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 4: Students Progress (Instructors / Admins) */}
      {activeTab === 'students' && canViewStudents && (
        <div className="space-y-5 min-w-0">
          {/* KPIs */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white border border-slate-200/80 rounded-xl shadow-2xs p-5">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Alunos
              </p>
              <p className="text-2xl font-bold text-slate-900 mt-1">
                {studentStats.total}
              </p>
            </div>
            <div className="bg-white border border-slate-200/80 rounded-xl shadow-2xs p-5">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Progresso Médio
              </p>
              <p className="text-2xl font-bold text-[#D98B08] mt-1">
                {studentStats.avg}%
              </p>
            </div>
            <div className="bg-white border border-slate-200/80 rounded-xl shadow-2xs p-5">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Trilha Completa
              </p>
              <p className="text-2xl font-bold text-emerald-600 mt-1">
                {studentStats.finishedAll}
              </p>
            </div>
          </div>

          {/* Search Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <LucideSearch className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={studentSearch}
                onChange={(e) => setStudentSearch(e.target.value)}
                placeholder="Buscar aluno por nome, e-mail ou turma..."
                className="w-full h-10 pl-10 pr-3.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:border-[#F19B0A] focus:ring-1 focus:ring-[#F19B0A]/30"
              />
            </div>
            <button
              type="button"
              onClick={fetchStudentsProgress}
              className="h-10 px-4 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-sm font-semibold text-slate-700 transition-colors shrink-0 self-start sm:self-auto"
            >
              Atualizar
            </button>
          </div>

          {/* Student List */}
          {isLoadingStudents ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-16 w-full" variant="rounded" />
              ))}
            </div>
          ) : filteredStudents.length === 0 ? (
            <div className="bg-white border border-slate-200/80 rounded-2xl shadow-2xs p-12 text-center space-y-2">
              <LucideUsers className="w-8 h-8 text-slate-300 mx-auto" />
              <p className="text-sm font-semibold text-slate-900">
                Nenhum aluno encontrado
              </p>
              <p className="text-xs text-slate-500">
                Não há alunos da área de Tecnologia correspondentes ao filtro atual.
              </p>
            </div>
          ) : (
            <div className="bg-white border border-slate-200/80 rounded-2xl shadow-2xs overflow-hidden divide-y divide-slate-100">
              {filteredStudents.map((student) => {
                const pct = Math.round(
                  (student.completedCount / GIT_MISSIONS.length) * 100,
                );
                const isExpanded = expandedStudentId === student.id;
                const statusInfo =
                  student.completedCount >= GIT_MISSIONS.length
                    ? {
                        label: 'Concluído',
                        classes:
                          'bg-emerald-50 text-emerald-700 border-emerald-200',
                      }
                    : student.completedCount > 0
                      ? {
                          label: 'Em andamento',
                          classes:
                            'bg-amber-50 text-amber-800 border-amber-200',
                        }
                      : {
                          label: 'Não iniciou',
                          classes:
                            'bg-slate-100 text-slate-600 border-slate-200/80',
                        };

                return (
                  <div key={student.id}>
                    <button
                      type="button"
                      onClick={() =>
                        setExpandedStudentId((prev) =>
                          prev === student.id ? null : student.id,
                        )
                      }
                      className="w-full px-4 sm:px-5 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/70 transition-colors text-left"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-xl bg-slate-100 border border-slate-200/80 flex items-center justify-center overflow-hidden shrink-0 text-xs font-semibold text-slate-700">
                          {student.avatarUrl ? (
                            <img
                              src={student.avatarUrl}
                              alt={student.name || student.email}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <span>
                              {(student.name || student.email)
                                .slice(0, 2)
                                .toUpperCase()}
                            </span>
                          )}
                        </div>

                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-sm font-semibold text-slate-900 truncate">
                              {student.name || 'Aluno'}
                            </p>
                            {student.turmas.length > 0 && (
                              <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 text-[11px] font-medium shrink-0">
                                {student.turmas[0].name}
                                {student.turmas.length > 1
                                  ? ` +${student.turmas.length - 1}`
                                  : ''}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-500 truncate">
                            {student.email}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
                        <span
                          className={`px-2 py-0.5 rounded-md text-[11px] font-medium border ${statusInfo.classes}`}
                        >
                          {statusInfo.label}
                        </span>

                        <div className="flex items-center gap-2.5">
                          <div className="w-24 sm:w-28 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div
                              style={{ width: `${pct}%` }}
                              className="h-full bg-[#F19B0A]"
                            />
                          </div>
                          <span className="text-xs font-semibold text-slate-700 tabular-nums w-16 text-right">
                            {student.completedCount}/{GIT_MISSIONS.length}{' '}
                            <span className="text-slate-400 font-normal">
                              ({pct}%)
                            </span>
                          </span>
                        </div>

                        <LucideChevronDown
                          className={`w-4 h-4 text-slate-400 transition-transform duration-150 ${
                            isExpanded ? 'rotate-180 text-slate-700' : ''
                          }`}
                        />
                      </div>
                    </button>

                    {isExpanded && (
                      <div className="bg-[#FAFAF9] px-4 sm:px-5 py-3 border-t border-slate-100 flex flex-wrap gap-1.5">
                        {GIT_MISSIONS.map((m) => {
                          const done = student.completedSlugs.includes(m.slug);
                          return (
                            <span
                              key={m.slug}
                              title={`Fase ${m.order}: ${m.title}`}
                              className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-medium border ${
                                done
                                  ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                                  : 'bg-white border-slate-200/80 text-slate-500'
                              }`}
                            >
                              {done && <LucideCheck className="w-3 h-3" />}
                              <span>
                                {String(m.order).padStart(2, '0')} • {m.title}
                              </span>
                            </span>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

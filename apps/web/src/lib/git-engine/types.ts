export type GitHead =
  | { type: 'branch'; ref: string }
  | { type: 'detached'; hash: string };

export interface GitCommit {
  hash: string;
  message: string;
  authorName: string;
  authorEmail: string;
  timestamp: string;
  parentHashes: string[];
  tree: Record<string, string>;
}

export interface PostCloneRemoteCommits {
  branch: string;
  commits: GitCommit[];
}

export interface GitRemoteRepo {
  name: string;
  url: string;
  branches: Record<string, string>;
  commits: GitCommit[];
}

export interface RemoteCatalogEntry {
  projectName: string;
  branches: Record<string, string>;
  commits: GitCommit[];
  postCloneRemoteCommits?: PostCloneRemoteCommits;
}

export interface MergeConflictState {
  incomingBranch: string;
  incomingHash: string;
  conflictedFiles: string[];
}

export interface GitRepoState {
  projectName: string;
  initialized: boolean;
  config: {
    userName: string;
    userEmail: string;
  };
  workingDirectory: Record<string, string>;
  stagingArea: Record<string, string>;
  commits: GitCommit[];
  branches: Record<string, string>;
  head: GitHead;
  remotes: Record<string, GitRemoteRepo>;
  remoteCatalog: Record<string, RemoteCatalogEntry>;
  mergeConflict: MergeConflictState | null;
  commandHistory: string[];
  executedCommands: string[];
}

export type TerminalOutputTone =
  | 'default'
  | 'success'
  | 'warning'
  | 'error'
  | 'info'
  | 'muted'
  | 'accent';

export interface TerminalOutputSegment {
  text: string;
  tone?: TerminalOutputTone;
}

export interface CommandExecutionResult {
  nextState: GitRepoState;
  lines: TerminalOutputSegment[];
  clearScreen?: boolean;
  mobileNormalizedNote?: string;
}

export interface FileDiffSummary {
  staged: Array<{ name: string; action: 'added' | 'modified' | 'deleted' }>;
  unstaged: Array<{ name: string; action: 'modified' | 'deleted' }>;
  untracked: string[];
  ignored: string[];
  conflicted: string[];
  clean: string[];
}

export interface GitMissionObjective {
  id: string;
  label: string;
  commandHint?: string;
  check: (state: GitRepoState) => boolean;
}

export type MissionDifficulty =
  | 'Iniciante'
  | 'Intermediário'
  | 'Prática de Mercado';

export interface GitMission {
  slug: string;
  order: number;
  stageGroup: string;
  title: string;
  subtitle: string;
  difficulty: MissionDifficulty;
  estimatedMinutes: number;
  conceptSummary: string;
  exampleCommands: string[];
  scenario: string;
  hints: string[];
  initialState: () => GitRepoState;
  objectives: GitMissionObjective[];
  solutionCommands: string[];
}

export interface SandboxPreset {
  id: string;
  title: string;
  description: string;
  badge: string;
  initialState: () => GitRepoState;
}

export interface CheatSheetCommand {
  cmd: string;
  description: string;
  insertText: string;
}

export interface CheatSheetCategory {
  id: string;
  title: string;
  items: CheatSheetCommand[];
}

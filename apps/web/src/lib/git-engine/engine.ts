import {
  CommandExecutionResult,
  FileDiffSummary,
  GitCommit,
  GitRepoState,
  TerminalOutputSegment,
  TerminalOutputTone,
} from './types';

const GIT_SUBCOMMANDS = [
  'init',
  'config',
  'status',
  'add',
  'commit',
  'log',
  'diff',
  'branch',
  'checkout',
  'switch',
  'merge',
  'restore',
  'reset',
  'remote',
  'clone',
  'fetch',
  'pull',
  'push',
];

const seg = (
  text: string,
  tone: TerminalOutputTone = 'default',
): TerminalOutputSegment => ({ text, tone });

export function cloneRepoState(state: GitRepoState): GitRepoState {
  return JSON.parse(JSON.stringify(state));
}

export function createCommitHash(seed: string): string {
  let hash = 2166136261;
  for (let i = 0; i < seed.length; i += 1) {
    hash ^= seed.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  const unsigned = hash >>> 0;
  return unsigned.toString(16).padStart(7, '0').slice(0, 7);
}

export function getCurrentBranchName(state: GitRepoState): string | null {
  return state.head.type === 'branch' ? state.head.ref : null;
}

export function getHeadCommitHash(state: GitRepoState): string | null {
  if (!state.initialized) return null;
  if (state.head.type === 'detached') {
    return state.head.hash;
  }
  return state.branches[state.head.ref] ?? null;
}

export function findCommitByHash(
  commits: GitCommit[],
  hash: string | null,
): GitCommit | null {
  if (!hash) return null;
  return commits.find((c) => c.hash === hash) ?? null;
}

export function getHeadCommit(state: GitRepoState): GitCommit | null {
  return findCommitByHash(state.commits, getHeadCommitHash(state));
}

export function getHeadTree(state: GitRepoState): Record<string, string> {
  return getHeadCommit(state)?.tree ?? {};
}

export function isIgnoredByGitignore(
  filename: string,
  gitignoreContent?: string,
): boolean {
  if (!gitignoreContent) return false;
  const rules = gitignoreContent
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith('#'));

  const baseName = filename.split('/').pop() || filename;

  for (const rawRule of rules) {
    const rule = rawRule.replace(/^\.\//, '');
    if (rule === filename || rule === baseName) return true;
    if (rule.endsWith('/')) {
      const dir = rule.slice(0, -1);
      if (filename === dir || filename.startsWith(`${dir}/`)) return true;
    }
    if (rule.startsWith('*.')) {
      const ext = rule.slice(1);
      if (filename.endsWith(ext) || baseName.endsWith(ext)) return true;
    }
  }

  return false;
}

export function getFileStatuses(state: GitRepoState): FileDiffSummary {
  const headTree = getHeadTree(state);
  const gitignore = state.workingDirectory['.gitignore'];
  const conflictedSet = new Set(state.mergeConflict?.conflictedFiles ?? []);

  const allNames = Array.from(
    new Set([
      ...Object.keys(headTree),
      ...Object.keys(state.stagingArea),
      ...Object.keys(state.workingDirectory),
    ]),
  ).sort((a, b) => a.localeCompare(b));

  const staged: FileDiffSummary['staged'] = [];
  const unstaged: FileDiffSummary['unstaged'] = [];
  const untracked: string[] = [];
  const ignored: string[] = [];
  const conflicted: string[] = [];
  const clean: string[] = [];

  for (const name of allNames) {
    if (conflictedSet.has(name)) {
      conflicted.push(name);
      continue;
    }

    const inHead = Object.prototype.hasOwnProperty.call(headTree, name);
    const inStage = Object.prototype.hasOwnProperty.call(state.stagingArea, name);
    const inWork = Object.prototype.hasOwnProperty.call(
      state.workingDirectory,
      name,
    );

    let hasChanges = false;

    if (!inHead && inStage) {
      staged.push({ name, action: 'added' });
      hasChanges = true;
    } else if (inHead && !inStage) {
      staged.push({ name, action: 'deleted' });
      hasChanges = true;
    } else if (inHead && inStage && headTree[name] !== state.stagingArea[name]) {
      staged.push({ name, action: 'modified' });
      hasChanges = true;
    }

    if (!inStage && inWork) {
      if (!inHead && isIgnoredByGitignore(name, gitignore)) {
        ignored.push(name);
      } else {
        untracked.push(name);
      }
      hasChanges = true;
    } else if (inStage && !inWork) {
      unstaged.push({ name, action: 'deleted' });
      hasChanges = true;
    } else if (
      inStage &&
      inWork &&
      state.stagingArea[name] !== state.workingDirectory[name]
    ) {
      unstaged.push({ name, action: 'modified' });
      hasChanges = true;
    }

    if (!hasChanges && inWork) {
      clean.push(name);
    }
  }

  return { staged, unstaged, untracked, ignored, conflicted, clean };
}

function getAncestorDistances(
  commits: GitCommit[],
  startHash: string | null,
): Map<string, number> {
  const distances = new Map<string, number>();
  if (!startHash) return distances;

  const commitMap = new Map(commits.map((c) => [c.hash, c]));
  const queue: Array<{ hash: string; dist: number }> = [
    { hash: startHash, dist: 0 },
  ];

  while (queue.length > 0) {
    const { hash, dist } = queue.shift()!;
    if (distances.has(hash)) continue;
    distances.set(hash, dist);
    const commit = commitMap.get(hash);
    if (!commit) continue;
    for (const parent of commit.parentHashes) {
      if (!distances.has(parent)) {
        queue.push({ hash: parent, dist: dist + 1 });
      }
    }
  }

  return distances;
}

export function isCommitAncestor(
  commits: GitCommit[],
  ancestorHash: string,
  descendantHash: string,
): boolean {
  const distances = getAncestorDistances(commits, descendantHash);
  return distances.has(ancestorHash);
}

function findLowestCommonAncestor(
  commits: GitCommit[],
  hashA: string,
  hashB: string,
): GitCommit | null {
  const distA = getAncestorDistances(commits, hashA);
  const distB = getAncestorDistances(commits, hashB);

  let bestHash: string | null = null;
  let bestScore = Number.POSITIVE_INFINITY;

  for (const [hash, dA] of distA.entries()) {
    const dB = distB.get(hash);
    if (dB !== undefined && dA + dB < bestScore) {
      bestScore = dA + dB;
      bestHash = hash;
    }
  }

  return findCommitByHash(commits, bestHash);
}

export function getReachableCommits(
  commits: GitCommit[],
  startHash: string | null,
): GitCommit[] {
  if (!startHash) return [];
  const commitMap = new Map(commits.map((c) => [c.hash, c]));
  const seen = new Set<string>();
  const ordered: GitCommit[] = [];
  const stack: string[] = [startHash];

  while (stack.length > 0) {
    const hash = stack.shift()!;
    if (seen.has(hash)) continue;
    const commit = commitMap.get(hash);
    if (!commit) continue;
    seen.add(hash);
    ordered.push(commit);
    for (const parent of commit.parentHashes) {
      if (!seen.has(parent)) {
        stack.push(parent);
      }
    }
  }

  const indexMap = new Map(commits.map((c, idx) => [c.hash, idx]));
  return ordered.sort(
    (a, b) => (indexMap.get(b.hash) ?? 0) - (indexMap.get(a.hash) ?? 0),
  );
}

export function getAheadBehindCounts(
  state: GitRepoState,
  remoteName = 'origin',
): { ahead: number; behind: number; remoteBranchExists: boolean } | null {
  const branch = getCurrentBranchName(state);
  const remote = state.remotes[remoteName];
  if (!branch || !remote) return null;

  const localHash = state.branches[branch] ?? null;
  const remoteHash = remote.branches[branch] ?? null;
  if (!remoteHash) {
    return {
      ahead: localHash ? getReachableCommits(state.commits, localHash).length : 0,
      behind: 0,
      remoteBranchExists: false,
    };
  }

  const combined = mergeCommitLists(state.commits, remote.commits);
  const localSet = new Set(
    getReachableCommits(combined, localHash).map((c) => c.hash),
  );
  const remoteSet = new Set(
    getReachableCommits(combined, remoteHash).map((c) => c.hash),
  );

  let ahead = 0;
  let behind = 0;
  for (const h of localSet) {
    if (!remoteSet.has(h)) ahead += 1;
  }
  for (const h of remoteSet) {
    if (!localSet.has(h)) behind += 1;
  }

  return { ahead, behind, remoteBranchExists: true };
}

function mergeCommitLists(a: GitCommit[], b: GitCommit[]): GitCommit[] {
  const seen = new Set<string>();
  const result: GitCommit[] = [];
  for (const c of [...a, ...b]) {
    if (!seen.has(c.hash)) {
      seen.add(c.hash);
      result.push(c);
    }
  }
  return result;
}

export function normalizeMobileInput(raw: string): {
  normalized: string;
  changed: boolean;
} {
  let text = raw
    .replace(/\u00A0/g, ' ')
    .replace(/[“”„‟]/g, '"')
    .replace(/[‘’‚‛]/g, "'")
    .replace(/[—–]/g, '--')
    .trim();

  if (/^Git(?:\s|$)/.test(text)) {
    text = `git${text.slice(3)}`;
  }

  return {
    normalized: text,
    changed: text !== raw.trim(),
  };
}

function tokenizeArgs(input: string): { tokens: string[]; error?: string } {
  const tokens: string[] = [];
  let current = '';
  let quote: '"' | "'" | null = null;
  let hasToken = false;

  for (let i = 0; i < input.length; i += 1) {
    const ch = input[i];
    if (quote) {
      if (ch === quote) {
        quote = null;
        hasToken = true;
      } else if (ch === '\\' && quote === '"' && i + 1 < input.length) {
        const next = input[i + 1];
        current += next === 'n' ? '\n' : next;
        i += 1;
        hasToken = true;
      } else {
        current += ch;
        hasToken = true;
      }
      continue;
    }

    if (ch === '"' || ch === "'") {
      quote = ch;
      hasToken = true;
      continue;
    }

    if (/\s/.test(ch)) {
      if (hasToken || current.length > 0) {
        tokens.push(current);
        current = '';
        hasToken = false;
      }
      continue;
    }

    current += ch;
    hasToken = true;
  }

  if (quote) {
    return {
      tokens,
      error: `Aspas ${quote} não fechadas. Feche as aspas antes de executar.`,
    };
  }

  if (hasToken || current.length > 0) {
    tokens.push(current);
  }

  return { tokens };
}

function levenshtein(a: string, b: string): number {
  const dp = Array.from({ length: a.length + 1 }, () =>
    new Array<number>(b.length + 1).fill(0),
  );
  for (let i = 0; i <= a.length; i += 1) dp[i][0] = i;
  for (let j = 0; j <= b.length; j += 1) dp[0][j] = j;

  for (let i = 1; i <= a.length; i += 1) {
    for (let j = 1; j <= b.length; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + cost,
      );
    }
  }

  return dp[a.length][b.length];
}

function suggestGitSubcommand(cmd: string): string | null {
  let best: string | null = null;
  let bestDist = 3;
  for (const candidate of GIT_SUBCOMMANDS) {
    const dist = levenshtein(cmd.toLowerCase(), candidate);
    if (dist < bestDist) {
      bestDist = dist;
      best = candidate;
    }
  }
  return best;
}

function hasConflictMarkers(content: string): boolean {
  return (
    content.includes('<<<<<<<') ||
    content.includes('=======') ||
    content.includes('>>>>>>>')
  );
}

function preserveIgnoredFiles(
  oldWorking: Record<string, string>,
  nextTree: Record<string, string>,
): Record<string, string> {
  const result = { ...nextTree };
  const gitignore = result['.gitignore'] ?? oldWorking['.gitignore'];
  for (const [name, value] of Object.entries(oldWorking)) {
    if (
      !Object.prototype.hasOwnProperty.call(result, name) &&
      isIgnoredByGitignore(name, gitignore)
    ) {
      result[name] = value;
    }
  }
  return result;
}

function performBranchOrPullMerge(
  state: GitRepoState,
  targetHash: string,
  incomingLabel: string,
  isPull: boolean,
): TerminalOutputSegment[] {
  const branch = getCurrentBranchName(state);
  if (!branch) {
    return [seg('Erro: não é possível fazer merge em HEAD destacado (detached HEAD).', 'error')];
  }

  const currentHash = state.branches[branch] ?? null;

  if (!currentHash) {
    const targetCommit = findCommitByHash(state.commits, targetHash);
    if (!targetCommit) {
      return [seg(`Erro: commit '${targetHash}' não encontrado.`, 'error')];
    }
    state.branches[branch] = targetHash;
    state.workingDirectory = preserveIgnoredFiles(
      state.workingDirectory,
      targetCommit.tree,
    );
    state.stagingArea = { ...targetCommit.tree };
    return [
      seg(
        `${isPull ? 'Atualizado' : 'Merge'} (Fast-forward) para ${targetHash.slice(0, 7)}.`,
        'success',
      ),
    ];
  }

  if (
    currentHash === targetHash ||
    isCommitAncestor(state.commits, targetHash, currentHash)
  ) {
    return [seg('Já está atualizado (Already up to date).', 'info')];
  }

  if (isCommitAncestor(state.commits, currentHash, targetHash)) {
    const targetCommit = findCommitByHash(state.commits, targetHash)!;
    state.branches[branch] = targetHash;
    state.workingDirectory = preserveIgnoredFiles(
      state.workingDirectory,
      targetCommit.tree,
    );
    state.stagingArea = { ...targetCommit.tree };
    return [
      seg(`Atualizando ${currentHash}..${targetHash}`, 'muted'),
      seg('Fast-forward aplicado com sucesso!', 'success'),
    ];
  }

  const baseCommit = findLowestCommonAncestor(state.commits, currentHash, targetHash);
  const baseTree = baseCommit?.tree ?? {};
  const oursTree = findCommitByHash(state.commits, currentHash)?.tree ?? {};
  const theirsTree = findCommitByHash(state.commits, targetHash)?.tree ?? {};

  const allFiles = Array.from(
    new Set([
      ...Object.keys(baseTree),
      ...Object.keys(oursTree),
      ...Object.keys(theirsTree),
    ]),
  ).sort();

  const mergedTree: Record<string, string> = {};
  const conflictedFiles: string[] = [];

  for (const file of allFiles) {
    const b = baseTree[file];
    const o = oursTree[file];
    const t = theirsTree[file];

    if (o === t) {
      if (o !== undefined) mergedTree[file] = o;
    } else if (o === b) {
      if (t !== undefined) mergedTree[file] = t;
    } else if (t === b) {
      if (o !== undefined) mergedTree[file] = o;
    } else {
      conflictedFiles.push(file);
      mergedTree[file] = [
        '<<<<<<< HEAD',
        o ?? '(arquivo removido nesta branch)',
        '=======',
        t ?? '(arquivo removido na branch recebida)',
        `>>>>>>> ${incomingLabel}`,
      ].join('\n');
    }
  }

  if (conflictedFiles.length > 0) {
    state.workingDirectory = preserveIgnoredFiles(
      state.workingDirectory,
      mergedTree,
    );
    const nonConflictedStage = { ...mergedTree };
    for (const cf of conflictedFiles) {
      delete nonConflictedStage[cf];
    }
    state.stagingArea = nonConflictedStage;
    state.mergeConflict = {
      incomingBranch: incomingLabel,
      incomingHash: targetHash,
      conflictedFiles,
    };

    return [
      seg(
        `CONFLITO (conteúdo): Conflito de merge em ${conflictedFiles.join(', ')}`,
        'warning',
      ),
      seg(
        'Merge automático falhou; corrija os conflitos e faça commit do resultado.',
        'error',
      ),
      seg(
        'Dica: clique no arquivo na aba "Arquivos" ao lado (ou edite no terminal), remova os marcadores <<<<<<<, ======= e >>>>>>>, e rode "git add <arquivo>" seguido de "git commit -m \\"Resolve conflito\\"".',
        'info',
      ),
    ];
  }

  const message = isPull
    ? `Merge branch '${incomingLabel}' into ${branch}`
    : `Merge branch '${incomingLabel}'`;
  const authorName = state.config.userName || 'Aluno Brilha Mais';
  const authorEmail = state.config.userEmail || 'aluno@brilhamais.org';
  const hash = createCommitHash(
    `${message}|${currentHash}|${targetHash}|${state.commits.length}`,
  );
  const mergeCommit: GitCommit = {
    hash,
    message,
    authorName,
    authorEmail,
    timestamp: new Date(
      Date.UTC(2026, 10, 13, 12, state.commits.length),
    ).toISOString(),
    parentHashes: [currentHash, targetHash],
    tree: mergedTree,
  };

  state.commits.push(mergeCommit);
  state.branches[branch] = hash;
  state.workingDirectory = preserveIgnoredFiles(state.workingDirectory, mergedTree);
  state.stagingArea = { ...mergedTree };

  return [
    seg(`Merge feito pela estratégia 'ort': commit ${hash} criado.`, 'success'),
  ];
}

function handleEchoCommand(
  state: GitRepoState,
  rawAfterEcho: string,
): TerminalOutputSegment[] {
  let quote: '"' | "'" | null = null;
  let redirectIdx = -1;
  let append = false;

  for (let i = 0; i < rawAfterEcho.length; i += 1) {
    const ch = rawAfterEcho[i];
    if (quote) {
      if (ch === quote) quote = null;
      else if (ch === '\\' && quote === '"' && i + 1 < rawAfterEcho.length) i += 1;
      continue;
    }
    if (ch === '"' || ch === "'") {
      quote = ch;
      continue;
    }
    if (ch === '>') {
      redirectIdx = i;
      append = rawAfterEcho[i + 1] === '>';
      break;
    }
  }

  const decodeText = (rawText: string) => {
    const trimmed = rawText.trim();
    if (
      (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
      (trimmed.startsWith("'") && trimmed.endsWith("'"))
    ) {
      return trimmed.slice(1, -1).replace(/\\n/g, '\n');
    }
    return trimmed.replace(/\\n/g, '\n');
  };

  if (redirectIdx === -1) {
    return [seg(decodeText(rawAfterEcho), 'default')];
  }

  const contentPart = decodeText(rawAfterEcho.slice(0, redirectIdx));
  const targetPart = rawAfterEcho
    .slice(redirectIdx + (append ? 2 : 1))
    .trim()
    .replace(/^['"]|['"]$/g, '');

  if (!targetPart) {
    return [seg('Erro de sintaxe: informe o arquivo após ">".', 'error')];
  }

  if (append && Object.prototype.hasOwnProperty.call(state.workingDirectory, targetPart)) {
    const existing = state.workingDirectory[targetPart];
    const separator = existing.length > 0 && !existing.endsWith('\n') ? '\n' : '';
    state.workingDirectory[targetPart] = `${existing}${separator}${contentPart}`;
  } else {
    state.workingDirectory[targetPart] = contentPart;
  }

  return [
    seg(
      `Arquivo '${targetPart}' ${append ? 'atualizado' : 'salvo'}.`,
      'muted',
    ),
  ];
}

function handleShellCommand(
  state: GitRepoState,
  tokens: string[],
  normalizedInput: string,
): CommandExecutionResult {
  const cmd = tokens[0].toLowerCase();
  const args = tokens.slice(1);

  switch (cmd) {
    case 'help':
      return {
        nextState: state,
        lines: [
          seg('Comandos de Terminal disponíveis:', 'accent'),
          seg('  ls [-a]              Lista os arquivos da pasta atual', 'default'),
          seg('  cat <arquivo>        Mostra o conteúdo de um arquivo', 'default'),
          seg('  touch <arquivo>      Cria um arquivo vazio', 'default'),
          seg('  echo "txt" > arq     Escreve texto em um arquivo (>> adiciona)', 'default'),
          seg('  rm <arquivo>         Remove um arquivo da pasta', 'default'),
          seg('  pwd / clear          Mostra o caminho atual / limpa a tela', 'default'),
          seg('', 'default'),
          seg('Comandos Git suportados:', 'accent'),
          seg('  git init | git config | git status | git add | git commit -m "..."', 'info'),
          seg('  git log [--oneline] | git diff [--staged]', 'info'),
          seg('  git branch | git switch [-c] | git checkout [-b] | git merge', 'info'),
          seg('  git restore [--staged] | git reset [--soft|--mixed|--hard] HEAD~1', 'info'),
          seg('  git remote [-v | add] | git clone | git fetch | git pull | git push', 'info'),
        ],
      };

    case 'clear':
      return { nextState: state, lines: [], clearScreen: true };

    case 'pwd':
      return {
        nextState: state,
        lines: [seg(`/workspace/${state.projectName}`, 'default')],
      };

    case 'ls': {
      const showAll = args.some((a) => a.includes('a'));
      const names = Object.keys(state.workingDirectory)
        .filter((name) => showAll || !name.startsWith('.'))
        .sort();
      const items = [...names];
      if (showAll && state.initialized) {
        items.unshift('.git/');
      }
      if (items.length === 0) {
        return {
          nextState: state,
          lines: [
            seg(
              '(pasta vazia — use "ls -a" para ver arquivos ocultos)',
              'muted',
            ),
          ],
        };
      }
      return {
        nextState: state,
        lines: [seg(items.join('   '), 'info')],
      };
    }

    case 'cat': {
      const file = args[0];
      if (!file) {
        return {
          nextState: state,
          lines: [seg('Uso: cat <nome-do-arquivo>', 'warning')],
        };
      }
      if (!Object.prototype.hasOwnProperty.call(state.workingDirectory, file)) {
        return {
          nextState: state,
          lines: [seg(`cat: ${file}: Arquivo não encontrado`, 'error')],
        };
      }
      const content = state.workingDirectory[file];
      return {
        nextState: state,
        lines: content
          ? content.split(/\r?\n/).map((line) => seg(line, 'default'))
          : [seg('(arquivo vazio)', 'muted')],
      };
    }

    case 'touch': {
      if (args.length === 0) {
        return {
          nextState: state,
          lines: [seg('Uso: touch <nome-do-arquivo>', 'warning')],
        };
      }
      for (const file of args) {
        if (!Object.prototype.hasOwnProperty.call(state.workingDirectory, file)) {
          state.workingDirectory[file] = '';
        }
      }
      return {
        nextState: state,
        lines: [seg(`Arquivo(s) criado(s): ${args.join(', ')}`, 'muted')],
      };
    }

    case 'echo': {
      const afterEcho = normalizedInput.replace(/^echo\s*/i, '');
      const lines = handleEchoCommand(state, afterEcho);
      return { nextState: state, lines };
    }

    case 'rm': {
      const targets = args.filter((a) => !a.startsWith('-'));
      if (targets.length === 0) {
        return {
          nextState: state,
          lines: [seg('Uso: rm <arquivo>', 'warning')],
        };
      }
      const lines: TerminalOutputSegment[] = [];
      for (const target of targets) {
        if (Object.prototype.hasOwnProperty.call(state.workingDirectory, target)) {
          delete state.workingDirectory[target];
          lines.push(seg(`Removido '${target}'.`, 'muted'));
        } else {
          lines.push(seg(`rm: ${target}: Arquivo não encontrado`, 'error'));
        }
      }
      return { nextState: state, lines };
    }

    case 'mkdir':
      return {
        nextState: state,
        lines: [
          seg(
            args[0]
              ? `Diretório '${args[0]}' preparado no workspace.`
              : 'Uso: mkdir <nome-da-pasta>',
            args[0] ? 'muted' : 'warning',
          ),
        ],
      };

    default:
      return {
        nextState: state,
        lines: [
          seg(
            `Comando '${tokens[0]}' não encontrado. Digite "help" para ver os comandos disponíveis.`,
            'error',
          ),
        ],
      };
  }
}

function handleGitConfig(state: GitRepoState, args: string[]): TerminalOutputSegment[] {
  const filtered = args.filter((a) => a !== '--global' && a !== '--local');
  if (filtered.includes('--list') || filtered.includes('-l')) {
    return [
      seg(`user.name=${state.config.userName || '(não definido)'}`, 'default'),
      seg(`user.email=${state.config.userEmail || '(não definido)'}`, 'default'),
    ];
  }

  const key = filtered[0];
  const value = filtered.slice(1).join(' ');

  if (key === 'user.name') {
    if (!value) {
      return [seg(state.config.userName || '(não definido)', 'info')];
    }
    state.config.userName = value;
    return [seg(`Identidade atualizada: user.name = "${value}"`, 'success')];
  }

  if (key === 'user.email') {
    if (!value) {
      return [seg(state.config.userEmail || '(não definido)', 'info')];
    }
    state.config.userEmail = value;
    return [seg(`Identidade atualizada: user.email = "${value}"`, 'success')];
  }

  return [
    seg(
      'Uso: git config [--global] user.name "Seu Nome" | user.email "email@exemplo.com"',
      'warning',
    ),
  ];
}

function handleGitStatus(state: GitRepoState): TerminalOutputSegment[] {
  const branch = getCurrentBranchName(state);
  const headHash = getHeadCommitHash(state);
  const lines: TerminalOutputSegment[] = [];

  if (branch) {
    lines.push(seg(`Na branch ${branch}`, 'info'));
  } else {
    lines.push(seg(`HEAD destacado em ${headHash?.slice(0, 7)}`, 'warning'));
  }

  if (!headHash) {
    lines.push(seg('Nenhum commit ainda', 'muted'));
  } else {
    const sync = getAheadBehindCounts(state);
    if (sync?.remoteBranchExists) {
      if (sync.ahead === 0 && sync.behind === 0) {
        lines.push(
          seg(`Sua branch está atualizada com 'origin/${branch}'.`, 'muted'),
        );
      } else {
        if (sync.ahead > 0) {
          lines.push(
            seg(
              `Sua branch está à frente de 'origin/${branch}' por ${sync.ahead} commit(s). (use "git push")`,
              'info',
            ),
          );
        }
        if (sync.behind > 0) {
          lines.push(
            seg(
              `Sua branch está atrás de 'origin/${branch}' por ${sync.behind} commit(s). (use "git pull")`,
              'warning',
            ),
          );
        }
      }
    }
  }

  const summary = getFileStatuses(state);

  if (summary.conflicted.length > 0) {
    lines.push(seg('', 'default'));
    lines.push(seg('Caminhos não mesclados (conflitos a resolver):', 'warning'));
    for (const name of summary.conflicted) {
      lines.push(seg(`  ambos modificados:   ${name}`, 'error'));
    }
  }

  if (summary.staged.length > 0) {
    lines.push(seg('', 'default'));
    lines.push(seg('Mudanças a serem comitadas (Staging Area):', 'success'));
    for (const item of summary.staged) {
      const label =
        item.action === 'added'
          ? 'novo arquivo'
          : item.action === 'deleted'
            ? 'deletado'
            : 'modificado';
      lines.push(seg(`  ${label.padEnd(13)} ${item.name}`, 'success'));
    }
  }

  if (summary.unstaged.length > 0) {
    lines.push(seg('', 'default'));
    lines.push(seg('Mudanças não preparadas para commit:', 'error'));
    for (const item of summary.unstaged) {
      const label = item.action === 'deleted' ? 'deletado' : 'modificado';
      lines.push(seg(`  ${label.padEnd(13)} ${item.name}`, 'error'));
    }
  }

  if (summary.untracked.length > 0) {
    lines.push(seg('', 'default'));
    lines.push(seg('Arquivos não monitorados (use "git add <arquivo>"):', 'warning'));
    for (const name of summary.untracked) {
      lines.push(seg(`  ${name}`, 'warning'));
    }
  }

  if (
    summary.conflicted.length === 0 &&
    summary.staged.length === 0 &&
    summary.unstaged.length === 0 &&
    summary.untracked.length === 0
  ) {
    lines.push(seg('nada a comitar, árvore de trabalho limpa', 'success'));
  }

  return lines;
}

function handleGitAdd(state: GitRepoState, args: string[]): TerminalOutputSegment[] {
  if (args.length === 0) {
    return [
      seg('Nada especificado, nada adicionado. Use "git add ." ou "git add <arquivo>".', 'warning'),
    ];
  }

  const gitignore = state.workingDirectory['.gitignore'];
  const stageAll = args.some((a) => a === '.' || a === '-A' || a === '--all');

  if (stageAll) {
    const candidates = Array.from(
      new Set([
        ...Object.keys(state.workingDirectory),
        ...Object.keys(state.stagingArea),
      ]),
    );
    let stagedCount = 0;
    const warnings: TerminalOutputSegment[] = [];

    for (const name of candidates) {
      const inWork = Object.prototype.hasOwnProperty.call(
        state.workingDirectory,
        name,
      );
      const inStage = Object.prototype.hasOwnProperty.call(state.stagingArea, name);

      if (inWork && !inStage && isIgnoredByGitignore(name, gitignore)) {
        continue;
      }

      if (
        state.mergeConflict?.conflictedFiles.includes(name) &&
        inWork &&
        hasConflictMarkers(state.workingDirectory[name])
      ) {
        warnings.push(
          seg(
            `Aviso: '${name}' ainda contém marcadores de conflito (<<<<<<<, =======, >>>>>>>). Resolva antes do git add.`,
            'warning',
          ),
        );
        continue;
      }

      if (inWork) {
        if (!inStage || state.stagingArea[name] !== state.workingDirectory[name]) {
          state.stagingArea[name] = state.workingDirectory[name];
          stagedCount += 1;
        }
        if (state.mergeConflict) {
          state.mergeConflict.conflictedFiles =
            state.mergeConflict.conflictedFiles.filter((f) => f !== name);
        }
      } else if (inStage) {
        delete state.stagingArea[name];
        stagedCount += 1;
      }
    }

    if (warnings.length > 0) return warnings;
    return [
      seg(
        stagedCount > 0
          ? `${stagedCount} alteração(ões) preparada(s) na Staging Area.`
          : 'Nenhuma alteração nova para adicionar.',
        stagedCount > 0 ? 'success' : 'muted',
      ),
    ];
  }

  const lines: TerminalOutputSegment[] = [];
  for (const target of args) {
    if (target.startsWith('-')) continue;
    const inWork = Object.prototype.hasOwnProperty.call(
      state.workingDirectory,
      target,
    );
    const inStage = Object.prototype.hasOwnProperty.call(
      state.stagingArea,
      target,
    );

    if (!inWork && !inStage) {
      lines.push(
        seg(
          `fatal: pathspec '${target}' não corresponde a nenhum arquivo`,
          'error',
        ),
      );
      continue;
    }

    if (inWork && !inStage && isIgnoredByGitignore(target, gitignore)) {
      lines.push(
        seg(
          `O caminho '${target}' é ignorado pelo arquivo .gitignore e não foi adicionado.`,
          'warning',
        ),
      );
      continue;
    }

    if (
      state.mergeConflict?.conflictedFiles.includes(target) &&
      inWork &&
      hasConflictMarkers(state.workingDirectory[target])
    ) {
      lines.push(
        seg(
          `Aviso: '${target}' ainda contém marcadores de conflito (<<<<<<<, =======, >>>>>>>). Edite o arquivo antes de rodar git add.`,
          'warning',
        ),
      );
      continue;
    }

    if (inWork) {
      state.stagingArea[target] = state.workingDirectory[target];
      if (state.mergeConflict) {
        state.mergeConflict.conflictedFiles =
          state.mergeConflict.conflictedFiles.filter((f) => f !== target);
      }
      lines.push(seg(`Adicionado '${target}' à Staging Area.`, 'success'));
    } else if (inStage) {
      delete state.stagingArea[target];
      lines.push(seg(`Remoção de '${target}' preparada na Staging Area.`, 'success'));
    }
  }

  return lines;
}

function handleGitCommit(state: GitRepoState, args: string[]): TerminalOutputSegment[] {
  let stageTracked = false;
  let message: string | null = null;

  for (let i = 0; i < args.length; i += 1) {
    const token = args[i];
    if (token === '-a' || token === '--all') {
      stageTracked = true;
    } else if (token === '-am' || token === '-ma') {
      stageTracked = true;
      message = args[i + 1] ?? null;
      i += 1;
    } else if (token === '-m' || token === '--message') {
      message = args[i + 1] ?? null;
      i += 1;
    } else if (token.startsWith('-m') && token.length > 2) {
      message = token.slice(2);
    }
  }

  if (message === null || message.trim().length === 0) {
    return [
      seg('Erro: informe uma mensagem para o commit.', 'error'),
      seg('Exemplo: git commit -m "Adiciona página inicial"', 'info'),
    ];
  }

  if (
    state.mergeConflict &&
    state.mergeConflict.conflictedFiles.length > 0
  ) {
    return [
      seg(
        `Erro: ainda existem conflitos não resolvidos em: ${state.mergeConflict.conflictedFiles.join(', ')}`,
        'error',
      ),
      seg(
        'Remova os marcadores de conflito e rode "git add <arquivo>" antes de comitar.',
        'info',
      ),
    ];
  }

  if (stageTracked) {
    for (const file of Object.keys(state.stagingArea)) {
      if (Object.prototype.hasOwnProperty.call(state.workingDirectory, file)) {
        state.stagingArea[file] = state.workingDirectory[file];
      } else {
        delete state.stagingArea[file];
      }
    }
  }

  const headHash = getHeadCommitHash(state);
  const summary = getFileStatuses(state);

  if (headHash && summary.staged.length === 0 && !state.mergeConflict) {
    return [
      seg(
        'Nada preparado para comitar. Use "git add <arquivo>" ou "git add ." primeiro.',
        'warning',
      ),
    ];
  }

  if (!headHash && Object.keys(state.stagingArea).length === 0) {
    return [
      seg(
        'Nada preparado para comitar. Adicione ao menos um arquivo com "git add".',
        'warning',
      ),
    ];
  }

  const branch = getCurrentBranchName(state);
  const parentHashes: string[] = [];
  if (headHash) parentHashes.push(headHash);
  if (state.mergeConflict) parentHashes.push(state.mergeConflict.incomingHash);

  const authorName = state.config.userName || 'Aluno Brilha Mais';
  const authorEmail = state.config.userEmail || 'aluno@brilhamais.org';
  const hash = createCommitHash(
    `${message}|${parentHashes.join(',')}|${state.commits.length}`,
  );

  const commit: GitCommit = {
    hash,
    message: message.trim(),
    authorName,
    authorEmail,
    timestamp: new Date(
      Date.UTC(2026, 10, 13, 12, state.commits.length),
    ).toISOString(),
    parentHashes,
    tree: { ...state.stagingArea },
  };

  state.commits.push(commit);
  if (branch) {
    state.branches[branch] = hash;
  } else {
    state.head = { type: 'detached', hash };
  }
  state.mergeConflict = null;

  return [
    seg(
      `[${branch ?? 'HEAD destacado'}${!headHash ? ' (commit-raiz)' : ''} ${hash}] ${commit.message}`,
      'success',
    ),
    seg(
      `${summary.staged.length || Object.keys(commit.tree).length} arquivo(s) salvo(s) neste commit.`,
      'muted',
    ),
  ];
}

function handleGitLog(state: GitRepoState, args: string[]): TerminalOutputSegment[] {
  const headHash = getHeadCommitHash(state);
  if (!headHash) {
    return [
      seg(
        `fatal: sua branch atual '${getCurrentBranchName(state) ?? 'main'}' ainda não possui nenhum commit`,
        'warning',
      ),
    ];
  }

  const oneline = args.includes('--oneline');
  const reachable = getReachableCommits(state.commits, headHash);
  const lines: TerminalOutputSegment[] = [];

  for (const commit of reachable) {
    const refs: string[] = [];
    if (state.head.type === 'branch' && state.branches[state.head.ref] === commit.hash) {
      refs.push(`HEAD -> ${state.head.ref}`);
    } else if (state.head.type === 'detached' && state.head.hash === commit.hash) {
      refs.push('HEAD');
    }

    for (const [bName, bHash] of Object.entries(state.branches)) {
      if (
        bHash === commit.hash &&
        !(state.head.type === 'branch' && state.head.ref === bName)
      ) {
        refs.push(bName);
      }
    }

    for (const [rName, remote] of Object.entries(state.remotes)) {
      for (const [rbName, rbHash] of Object.entries(remote.branches)) {
        if (rbHash === commit.hash) {
          refs.push(`${rName}/${rbName}`);
        }
      }
    }

    const deco = refs.length > 0 ? ` (${refs.join(', ')})` : '';

    if (oneline) {
      lines.push(seg(`${commit.hash}${deco} ${commit.message}`, 'accent'));
    } else {
      lines.push(seg(`commit ${commit.hash}${deco}`, 'accent'));
      lines.push(seg(`Author: ${commit.authorName} <${commit.authorEmail}>`, 'muted'));
      lines.push(seg(`    ${commit.message}`, 'default'));
      lines.push(seg('', 'default'));
    }
  }

  return lines;
}

function handleGitDiff(state: GitRepoState, args: string[]): TerminalOutputSegment[] {
  const stagedOnly = args.includes('--staged') || args.includes('--cached');
  const headTree = getHeadTree(state);
  const left = stagedOnly ? headTree : state.stagingArea;
  const right = stagedOnly ? state.stagingArea : state.workingDirectory;

  const files = Array.from(
    new Set([...Object.keys(left), ...Object.keys(right)]),
  ).sort();

  const lines: TerminalOutputSegment[] = [];
  for (const file of files) {
    const a = left[file];
    const b = right[file];
    if (a === b) continue;
    if (!stagedOnly && a === undefined && isIgnoredByGitignore(file, state.workingDirectory['.gitignore'])) {
      continue;
    }

    lines.push(seg(`diff --git a/${file} b/${file}`, 'info'));
    if (a !== undefined) {
      for (const line of a.split(/\r?\n/)) {
        if (!b || !b.split(/\r?\n/).includes(line)) {
          lines.push(seg(`- ${line}`, 'error'));
        }
      }
    }
    if (b !== undefined) {
      for (const line of b.split(/\r?\n/)) {
        if (!a || !a.split(/\r?\n/).includes(line)) {
          lines.push(seg(`+ ${line}`, 'success'));
        }
      }
    }
  }

  if (lines.length === 0) {
    return [
      seg(
        stagedOnly
          ? 'Nenhuma diferença preparada na Staging Area.'
          : 'Nenhuma modificação no diretório de trabalho.',
        'muted',
      ),
    ];
  }

  return lines;
}

function handleGitBranch(state: GitRepoState, args: string[]): TerminalOutputSegment[] {
  const currentBranch = getCurrentBranchName(state);

  if (args.length === 0) {
    const names = Object.keys(state.branches);
    if (names.length === 0 && currentBranch) {
      return [seg(`* ${currentBranch} (sem commits ainda)`, 'success')];
    }
    return names.map((name) =>
      name === currentBranch
        ? seg(`* ${name}`, 'success')
        : seg(`  ${name}`, 'default'),
    );
  }

  if (args[0] === '-M' || args[0] === '-m') {
    const newName = args[1];
    if (!newName) {
      return [seg('Uso: git branch -M <novo-nome>', 'warning')];
    }
    if (!currentBranch) {
      return [seg('Erro: não é possível renomear em HEAD destacado.', 'error')];
    }
    const existingHash = state.branches[currentBranch];
    delete state.branches[currentBranch];
    if (existingHash) {
      state.branches[newName] = existingHash;
    }
    state.head = { type: 'branch', ref: newName };
    return [seg(`Branch '${currentBranch}' renomeada para '${newName}'.`, 'success')];
  }

  if (args[0] === '-d' || args[0] === '-D') {
    const target = args[1];
    if (!target) {
      return [seg('Uso: git branch -d <nome-da-branch>', 'warning')];
    }
    if (target === currentBranch) {
      return [
        seg(
          `Erro: não é possível apagar a branch '${target}' porque você está nela.`,
          'error',
        ),
      ];
    }
    if (!state.branches[target]) {
      return [seg(`Erro: branch '${target}' não encontrada.`, 'error')];
    }
    delete state.branches[target];
    return [seg(`Branch '${target}' removida.`, 'success')];
  }

  const branchName = args[0];
  const headHash = getHeadCommitHash(state);
  if (!headHash) {
    return [
      seg(
        'Erro: faça pelo menos 1 commit antes de criar novas branches.',
        'error',
      ),
    ];
  }
  if (state.branches[branchName]) {
    return [seg(`fatal: a branch '${branchName}' já existe.`, 'error')];
  }
  state.branches[branchName] = headHash;
  return [
    seg(
      `Branch '${branchName}' criada em ${headHash}. (use "git switch ${branchName}" para entrar nela)`,
      'success',
    ),
  ];
}

function switchToBranchOrCreate(
  state: GitRepoState,
  target: string,
  createNew: boolean,
): TerminalOutputSegment[] {
  if (state.mergeConflict) {
    return [
      seg(
        'Erro: resolva o conflito de merge atual antes de trocar de branch.',
        'error',
      ),
    ];
  }

  const currentBranch = getCurrentBranchName(state);
  const headHash = getHeadCommitHash(state);

  if (createNew) {
    if (!target) {
      return [seg('Uso: git switch -c <nova-branch>', 'warning')];
    }
    if (state.branches[target]) {
      return [seg(`fatal: a branch '${target}' já existe.`, 'error')];
    }
    if (!headHash) {
      state.head = { type: 'branch', ref: target };
      return [seg(`Trocado para a nova branch '${target}'`, 'success')];
    }
    state.branches[target] = headHash;
    state.head = { type: 'branch', ref: target };
    return [seg(`Trocado para a nova branch '${target}'`, 'success')];
  }

  if (!target) {
    return [seg('Informe o nome da branch de destino.', 'warning')];
  }

  if (currentBranch === target) {
    return [seg(`Já está na branch '${target}'.`, 'info')];
  }

  let targetHash = state.branches[target];
  if (!targetHash && state.remotes.origin?.branches[target]) {
    targetHash = state.remotes.origin.branches[target];
    state.commits = mergeCommitLists(state.commits, state.remotes.origin.commits);
    state.branches[target] = targetHash;
  }

  if (!targetHash) {
    const commitMatch = state.commits.find((c) => c.hash.startsWith(target));
    if (commitMatch) {
      state.head = { type: 'detached', hash: commitMatch.hash };
      state.workingDirectory = preserveIgnoredFiles(
        state.workingDirectory,
        commitMatch.tree,
      );
      state.stagingArea = { ...commitMatch.tree };
      return [seg(`HEAD movido para commit ${commitMatch.hash}.`, 'info')];
    }
    return [
      seg(
        `Erro: branch '${target}' não encontrada. Use "git switch -c ${target}" para criá-la.`,
        'error',
      ),
    ];
  }

  const currentTree = getHeadTree(state);
  const targetTree = findCommitByHash(state.commits, targetHash)?.tree ?? {};
  const status = getFileStatuses(state);
  const dirtyNames = new Set([
    ...status.staged.map((s) => s.name),
    ...status.unstaged.map((u) => u.name),
    ...status.untracked,
  ]);

  for (const dirty of dirtyNames) {
    if (currentTree[dirty] !== targetTree[dirty]) {
      return [
        seg(
          `Erro: suas alterações locais em '${dirty}' seriam sobrescritas pela troca de branch. Comite ou restaure antes de trocar.`,
          'error',
        ),
      ];
    }
  }

  const nextWorking: Record<string, string> = { ...targetTree };
  const nextStaging: Record<string, string> = { ...targetTree };
  for (const dirty of dirtyNames) {
    if (Object.prototype.hasOwnProperty.call(state.workingDirectory, dirty)) {
      nextWorking[dirty] = state.workingDirectory[dirty];
    } else {
      delete nextWorking[dirty];
    }
    if (Object.prototype.hasOwnProperty.call(state.stagingArea, dirty)) {
      nextStaging[dirty] = state.stagingArea[dirty];
    } else {
      delete nextStaging[dirty];
    }
  }

  state.head = { type: 'branch', ref: target };
  state.workingDirectory = preserveIgnoredFiles(state.workingDirectory, nextWorking);
  state.stagingArea = nextStaging;
  return [seg(`Trocado para a branch '${target}'`, 'success')];
}

function handleGitRestore(state: GitRepoState, args: string[]): TerminalOutputSegment[] {
  const staged = args.includes('--staged') || args.includes('-S');
  const targets = args.filter((a) => !a.startsWith('-'));

  if (targets.length === 0) {
    return [
      seg('Uso: git restore [--staged] <arquivo>', 'warning'),
    ];
  }

  const headTree = getHeadTree(state);
  const expanded =
    targets.includes('.') || targets.includes('*')
      ? Array.from(
          new Set([
            ...Object.keys(headTree),
            ...Object.keys(state.stagingArea),
          ]),
        )
      : targets;

  const lines: TerminalOutputSegment[] = [];
  for (const file of expanded) {
    if (staged) {
      const inHead = Object.prototype.hasOwnProperty.call(headTree, file);
      const inStage = Object.prototype.hasOwnProperty.call(state.stagingArea, file);
      if (!inHead && !inStage) {
        lines.push(seg(`error: pathspec '${file}' não encontrado`, 'error'));
        continue;
      }
      if (inHead) {
        state.stagingArea[file] = headTree[file];
      } else {
        delete state.stagingArea[file];
      }
      lines.push(seg(`'${file}' removido da Staging Area (unstage).`, 'success'));
    } else {
      const sourceTree = Object.prototype.hasOwnProperty.call(state.stagingArea, file)
        ? state.stagingArea
        : headTree;
      if (!Object.prototype.hasOwnProperty.call(sourceTree, file)) {
        lines.push(seg(`error: pathspec '${file}' não é monitorado pelo Git`, 'error'));
        continue;
      }
      state.workingDirectory[file] = sourceTree[file];
      lines.push(seg(`Alterações locais em '${file}' descartadas.`, 'success'));
    }
  }

  return lines;
}

function resolveCommitRef(state: GitRepoState, ref: string): string | null {
  const headHash = getHeadCommitHash(state);
  if (!headHash) return null;

  if (ref === 'HEAD') return headHash;

  const tildeMatch = /^HEAD~(\d+)$/i.exec(ref);
  if (tildeMatch || /^HEAD\^+$/i.test(ref)) {
    const steps = tildeMatch ? parseInt(tildeMatch[1], 10) : ref.length - 4;
    let cursor: string | null = headHash;
    for (let i = 0; i < steps; i += 1) {
      const commit = findCommitByHash(state.commits, cursor);
      if (!commit || commit.parentHashes.length === 0) return null;
      cursor = commit.parentHashes[0];
    }
    return cursor;
  }

  if (state.branches[ref]) return state.branches[ref];
  return state.commits.find((c) => c.hash.startsWith(ref))?.hash ?? null;
}

function handleGitReset(state: GitRepoState, args: string[]): TerminalOutputSegment[] {
  let mode: 'soft' | 'mixed' | 'hard' = 'mixed';
  const rest: string[] = [];

  for (const arg of args) {
    if (arg === '--soft') mode = 'soft';
    else if (arg === '--mixed') mode = 'mixed';
    else if (arg === '--hard') mode = 'hard';
    else rest.push(arg);
  }

  if (
    rest.length === 1 &&
    rest[0] !== 'HEAD' &&
    !rest[0].startsWith('HEAD~') &&
    !rest[0].startsWith('HEAD^') &&
    Object.prototype.hasOwnProperty.call(state.stagingArea, rest[0])
  ) {
    return handleGitRestore(state, ['--staged', rest[0]]);
  }

  const targetRef = rest[0] || 'HEAD';
  const targetHash = resolveCommitRef(state, targetRef);
  if (!targetHash) {
    return [
      seg(`fatal: referência '${targetRef}' não encontrada no histórico.`, 'error'),
    ];
  }

  const targetCommit = findCommitByHash(state.commits, targetHash);
  if (!targetCommit) {
    return [seg(`fatal: commit '${targetHash}' não encontrado.`, 'error')];
  }

  const branch = getCurrentBranchName(state);
  if (branch) {
    state.branches[branch] = targetHash;
  } else {
    state.head = { type: 'detached', hash: targetHash };
  }

  if (mode === 'mixed' || mode === 'hard') {
    state.stagingArea = { ...targetCommit.tree };
  }
  if (mode === 'hard') {
    state.workingDirectory = preserveIgnoredFiles(
      state.workingDirectory,
      targetCommit.tree,
    );
    state.mergeConflict = null;
  }

  return [
    seg(
      `HEAD agora está em ${targetHash} (${targetCommit.message}) [modo --${mode}]`,
      'success',
    ),
  ];
}

function lookupRemoteCatalog(state: GitRepoState, rawUrl: string) {
  const trimmed = rawUrl.trim().replace(/\/+$/, '');
  const candidates = [trimmed, `${trimmed}.git`, trimmed.replace(/\.git$/, '')];
  for (const key of candidates) {
    if (state.remoteCatalog[key]) {
      return { url: key, entry: state.remoteCatalog[key] };
    }
  }
  return null;
}

function handleGitRemote(state: GitRepoState, args: string[]): TerminalOutputSegment[] {
  if (args.length === 0) {
    const names = Object.keys(state.remotes);
    return names.length > 0
      ? names.map((n) => seg(n, 'info'))
      : [seg('(nenhum repositório remoto configurado)', 'muted')];
  }

  if (args[0] === '-v' || args[0] === '--verbose') {
    const entries = Object.values(state.remotes);
    if (entries.length === 0) {
      return [seg('(nenhum repositório remoto configurado)', 'muted')];
    }
    return entries.flatMap((r) => [
      seg(`${r.name}\t${r.url} (fetch)`, 'info'),
      seg(`${r.name}\t${r.url} (push)`, 'info'),
    ]);
  }

  if (args[0] === 'add') {
    const name = args[1];
    const url = args[2];
    if (!name || !url) {
      return [seg('Uso: git remote add <nome> <url>', 'warning')];
    }
    if (state.remotes[name]) {
      return [seg(`erro: remoto '${name}' já existe.`, 'error')];
    }
    const found = lookupRemoteCatalog(state, url);
    state.remotes[name] = {
      name,
      url,
      branches: found ? { ...found.entry.branches } : {},
      commits: found ? [...found.entry.commits] : [],
    };
    return [seg(`Remoto '${name}' conectado a ${url}.`, 'success')];
  }

  return [seg('Uso: git remote [-v] | git remote add origin <url>', 'warning')];
}

function handleGitClone(state: GitRepoState, args: string[]): TerminalOutputSegment[] {
  const url = args.find((a) => !a.startsWith('-'));
  if (!url) {
    return [seg('Uso: git clone <url-do-repositorio>', 'warning')];
  }

  const found = lookupRemoteCatalog(state, url);
  const repoName =
    found?.entry.projectName ||
    url.split('/').pop()?.replace(/\.git$/, '') ||
    'projeto-clonado';

  const starterCommit: GitCommit = {
    hash: createCommitHash(`clone|${repoName}`),
    message: 'chore: setup inicial do repositório',
    authorName: 'Equipe Brilha Mais',
    authorEmail: 'time@brilhamais.org',
    timestamp: new Date(Date.UTC(2026, 10, 12, 10, 0)).toISOString(),
    parentHashes: [],
    tree: {
      'README.md': `# ${repoName}\nProjeto clonado via Git.`,
    },
  };

  const initialCommits = found ? [...found.entry.commits] : [starterCommit];
  const initialBranches: Record<string, string> = found
    ? { ...found.entry.branches }
    : { main: starterCommit.hash };

  const defaultBranch = initialBranches.main
    ? 'main'
    : Object.keys(initialBranches)[0] || 'main';
  const tipHash = initialBranches[defaultBranch] ?? null;
  const tipCommit = findCommitByHash(initialCommits, tipHash);

  state.projectName = repoName;
  state.initialized = true;
  state.commits = initialCommits.map((c) => ({ ...c, tree: { ...c.tree } }));
  state.branches = { ...initialBranches };
  state.head = { type: 'branch', ref: defaultBranch };
  state.workingDirectory = tipCommit ? { ...tipCommit.tree } : {};
  state.stagingArea = tipCommit ? { ...tipCommit.tree } : {};
  state.mergeConflict = null;

  const remoteCommits = [...initialCommits];
  const remoteBranches: Record<string, string> = { ...initialBranches };

  if (found?.entry.postCloneRemoteCommits) {
    const { branch, commits: extra } = found.entry.postCloneRemoteCommits;
    for (const c of extra) {
      remoteCommits.push({ ...c, tree: { ...c.tree } });
      remoteBranches[branch] = c.hash;
    }
  }

  state.remotes = {
    origin: {
      name: 'origin',
      url,
      branches: remoteBranches,
      commits: remoteCommits,
    },
  };

  return [
    seg(`Clonando em '${repoName}'...`, 'info'),
    seg(`remote: Enumerating objects: ${initialCommits.length * 3}, done.`, 'muted'),
    seg(`Repositório clonado com sucesso na branch '${defaultBranch}'.`, 'success'),
  ];
}

function handleGitFetch(state: GitRepoState, args: string[]): TerminalOutputSegment[] {
  const remoteName = args[0] || 'origin';
  const remote = state.remotes[remoteName];
  if (!remote) {
    return [seg(`fatal: '${remoteName}' não parece ser um repositório git`, 'error')];
  }
  const sync = getAheadBehindCounts(state, remoteName);
  if (sync && sync.behind > 0) {
    return [
      seg(
        `Novos commits encontrados em '${remoteName}': sua branch local está ${sync.behind} commit(s) atrás.`,
        'info',
      ),
      seg('Use "git pull" para trazer as alterações para sua máquina.', 'muted'),
    ];
  }
  return [seg(`Remoto '${remoteName}' verificado: sem novidades pendentes.`, 'muted')];
}

function handleGitPull(state: GitRepoState, args: string[]): TerminalOutputSegment[] {
  const positional = args.filter((a) => !a.startsWith('-'));
  const remoteName = positional[0] || 'origin';
  const branch = positional[1] || getCurrentBranchName(state) || 'main';
  const remote = state.remotes[remoteName];

  if (!remote) {
    return [seg(`fatal: remoto '${remoteName}' não configurado.`, 'error')];
  }

  const remoteHash = remote.branches[branch];
  if (!remoteHash) {
    return [
      seg(
        `Não há branch '${branch}' no remoto '${remoteName}'.`,
        'warning',
      ),
    ];
  }

  state.commits = mergeCommitLists(state.commits, remote.commits);
  return performBranchOrPullMerge(state, remoteHash, `${remoteName}/${branch}`, true);
}

function handleGitPush(state: GitRepoState, args: string[]): TerminalOutputSegment[] {
  const positional = args.filter((a) => !a.startsWith('-'));
  const remoteName = positional[0] || 'origin';
  const branch = positional[1] || getCurrentBranchName(state);

  const remote = state.remotes[remoteName];
  if (!remote) {
    return [
      seg(`fatal: remoto '${remoteName}' não configurado.`, 'error'),
      seg(
        'Dica: conecte primeiro usando "git remote add origin <url>".',
        'info',
      ),
    ];
  }

  if (!branch) {
    return [seg('Erro: você não está em nenhuma branch para fazer push.', 'error')];
  }

  const localHash = state.branches[branch];
  if (!localHash) {
    return [
      seg(
        `Erro: a branch '${branch}' ainda não tem nenhum commit local.`,
        'error',
      ),
    ];
  }

  const combined = mergeCommitLists(state.commits, remote.commits);
  const prevRemoteHash = remote.branches[branch] ?? null;

  if (
    prevRemoteHash &&
    prevRemoteHash !== localHash &&
    !isCommitAncestor(combined, prevRemoteHash, localHash)
  ) {
    return [
      seg(
        `! [rejected] ${branch} -> ${branch} (non-fast-forward)`,
        'error',
      ),
      seg(
        'Dica: o repositório remoto possui commits que você ainda não tem. Rode "git pull" primeiro!',
        'warning',
      ),
    ];
  }

  if (prevRemoteHash === localHash) {
    return [seg('Everything up-to-date (nada novo para enviar).', 'muted')];
  }

  const reachable = getReachableCommits(state.commits, localHash);
  remote.commits = mergeCommitLists(remote.commits, reachable);
  remote.branches[branch] = localHash;

  return [
    seg(`Enumerating objects: ${reachable.length * 2}, done.`, 'muted'),
    seg(`To ${remote.url}`, 'info'),
    prevRemoteHash
      ? seg(`   ${prevRemoteHash}..${localHash}  ${branch} -> ${branch}`, 'success')
      : seg(` * [new branch]      ${branch} -> ${branch}`, 'success'),
  ];
}

export function executeGitLabCommand(
  state: GitRepoState,
  rawInput: string,
): CommandExecutionResult {
  const nextState = cloneRepoState(state);
  const { normalized, changed } = normalizeMobileInput(rawInput);

  if (!normalized) {
    return { nextState, lines: [] };
  }

  const { tokens, error } = tokenizeArgs(normalized);
  if (error) {
    return {
      nextState,
      lines: [seg(error, 'error')],
    };
  }

  if (tokens.length === 0) {
    return { nextState, lines: [] };
  }

  nextState.commandHistory.push(normalized);
  nextState.executedCommands.push(normalized);

  const mobileNormalizedNote =
    changed && rawInput.trim() !== normalized
      ? `Comando normalizado para "${normalized}"`
      : undefined;

  if (tokens[0].toLowerCase() !== 'git') {
    const shellRes = handleShellCommand(nextState, tokens, normalized);
    return { ...shellRes, mobileNormalizedNote };
  }

  const sub = (tokens[1] || '').toLowerCase();
  const args = tokens.slice(2);

  if (!sub) {
    return {
      nextState,
      mobileNormalizedNote,
      lines: [
        seg('git: informe um subcomando. Exemplo: "git status" ou digite "help".', 'info'),
      ],
    };
  }

  if (sub === 'init') {
    const wasInitialized = nextState.initialized;
    nextState.initialized = true;
    if (nextState.head.type !== 'branch') {
      nextState.head = { type: 'branch', ref: 'main' };
    }
    return {
      nextState,
      mobileNormalizedNote,
      lines: [
        seg(
          wasInitialized
            ? `Repositório Git existente reinicializado em /workspace/${nextState.projectName}/.git/`
            : `Repositório Git vazio inicializado em /workspace/${nextState.projectName}/.git/ (branch '${nextState.head.ref}')`,
          'success',
        ),
      ],
    };
  }

  if (sub === 'config') {
    return {
      nextState,
      mobileNormalizedNote,
      lines: handleGitConfig(nextState, args),
    };
  }

  if (sub === 'clone') {
    return {
      nextState,
      mobileNormalizedNote,
      lines: handleGitClone(nextState, args),
    };
  }

  if (!nextState.initialized) {
    return {
      nextState,
      mobileNormalizedNote,
      lines: [
        seg(
          'fatal: não é um repositório git (use "git init" para criar um ou "git clone <url>")',
          'error',
        ),
      ],
    };
  }

  let lines: TerminalOutputSegment[];
  switch (sub) {
    case 'status':
      lines = handleGitStatus(nextState);
      break;
    case 'add':
      lines = handleGitAdd(nextState, args);
      break;
    case 'commit':
      lines = handleGitCommit(nextState, args);
      break;
    case 'log':
      lines = handleGitLog(nextState, args);
      break;
    case 'diff':
      lines = handleGitDiff(nextState, args);
      break;
    case 'branch':
      lines = handleGitBranch(nextState, args);
      break;
    case 'switch': {
      const createFlag = args[0] === '-c' || args[0] === '--create';
      const target = createFlag ? args[1] : args[0];
      lines = switchToBranchOrCreate(nextState, target || '', createFlag);
      break;
    }
    case 'checkout': {
      const createFlag = args[0] === '-b';
      const target = createFlag ? args[1] : args[0];
      lines = switchToBranchOrCreate(nextState, target || '', createFlag);
      break;
    }
    case 'merge': {
      const branchArg = args.find((a) => !a.startsWith('-'));
      if (!branchArg) {
        lines = [seg('Uso: git merge <nome-da-branch>', 'warning')];
        break;
      }
      if (nextState.mergeConflict) {
        lines = [
          seg(
            'Erro: você já está no meio de um conflito de merge. Resolva e comite primeiro.',
            'error',
          ),
        ];
        break;
      }
      const targetHash = nextState.branches[branchArg];
      if (!targetHash) {
        lines = [seg(`merge: branch '${branchArg}' não encontrada.`, 'error')];
        break;
      }
      lines = performBranchOrPullMerge(nextState, targetHash, branchArg, false);
      break;
    }
    case 'restore':
      lines = handleGitRestore(nextState, args);
      break;
    case 'reset':
      lines = handleGitReset(nextState, args);
      break;
    case 'remote':
      lines = handleGitRemote(nextState, args);
      break;
    case 'fetch':
      lines = handleGitFetch(nextState, args);
      break;
    case 'pull':
      lines = handleGitPull(nextState, args);
      break;
    case 'push':
      lines = handleGitPush(nextState, args);
      break;
    default: {
      const suggestion = suggestGitSubcommand(sub);
      lines = [
        seg(`git: '${sub}' não é um comando git válido.`, 'error'),
        ...(suggestion
          ? [seg(`Você quis dizer "git ${suggestion}"?`, 'info')]
          : [seg('Digite "help" para ver os comandos suportados.', 'muted')]),
      ];
    }
  }

  return { nextState, lines, mobileNormalizedNote };
}

export function getAutocompleteSuggestions(
  state: GitRepoState,
  input: string,
): string[] {
  const trimmedLeft = input.replace(/^\s+/, '');
  const parts = trimmedLeft.split(/\s+/);
  const endsWithSpace = /\s$/.test(input);

  if (parts.length <= 1 && !endsWithSpace) {
    const prefix = (parts[0] || '').toLowerCase();
    return ['git', 'ls', 'cat', 'touch', 'echo', 'rm', 'clear', 'help', 'pwd'].filter(
      (c) => c.startsWith(prefix),
    );
  }

  if (parts[0]?.toLowerCase() === 'git') {
    if ((parts.length === 2 && !endsWithSpace) || (parts.length === 1 && endsWithSpace)) {
      const prefix = endsWithSpace ? '' : (parts[1] || '').toLowerCase();
      return GIT_SUBCOMMANDS.filter((sub) => sub.startsWith(prefix)).map(
        (sub) => `git ${sub}`,
      );
    }

    const sub = parts[1]?.toLowerCase();
    const lastPrefix = endsWithSpace ? '' : parts[parts.length - 1] || '';
    const baseHead = endsWithSpace
      ? trimmedLeft
      : parts.slice(0, -1).join(' ');

    if (['switch', 'checkout', 'merge', 'branch'].includes(sub)) {
      return Object.keys(state.branches)
        .filter((b) => b.startsWith(lastPrefix))
        .map((b) => `${baseHead} ${b}`);
    }

    if (['add', 'restore', 'diff'].includes(sub)) {
      return Object.keys(state.workingDirectory)
        .filter((f) => f.startsWith(lastPrefix))
        .map((f) => `${baseHead} ${f}`);
    }

    if (sub === 'clone') {
      return Object.keys(state.remoteCatalog)
        .filter((u) => u.startsWith(lastPrefix))
        .map((u) => `${baseHead} ${u}`);
    }
  }

  if (['cat', 'rm', 'touch'].includes(parts[0]?.toLowerCase())) {
    const lastPrefix = endsWithSpace ? '' : parts[parts.length - 1] || '';
    const baseHead = endsWithSpace ? trimmedLeft : parts.slice(0, -1).join(' ');
    return Object.keys(state.workingDirectory)
      .filter((f) => f.startsWith(lastPrefix))
      .map((f) => `${baseHead} ${f}`);
  }

  return [];
}

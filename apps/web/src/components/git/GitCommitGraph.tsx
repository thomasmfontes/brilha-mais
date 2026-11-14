import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  LucideGitBranch,
  LucideGitCommitHorizontal,
  LucideGlobe,
  LucideAlertTriangle,
} from 'lucide-react';
import {
  getCurrentBranchName,
  getHeadCommitHash,
} from '../../lib/git-engine/engine';
import { GitCommit, GitRepoState } from '../../lib/git-engine/types';

interface GitCommitGraphProps {
  state: GitRepoState;
}

interface PositionedNode {
  commit: GitCommit;
  lane: number;
  row: number;
  isReachableLocal: boolean;
  isHead: boolean;
  localBranches: string[];
  remoteBranches: string[];
}

const LANE_COLORS = [
  '#F19B0A', // main (brand amber)
  '#0EA5E9', // feature lane 1 (sky)
  '#10B981', // feature lane 2 (emerald)
  '#6366F1', // feature lane 3 (indigo)
  '#EC4899', // feature lane 4 (pink)
];

const ROW_HEIGHT = 64;
const LANE_GAP = 22;
const LEFT_PAD = 18;

export function GitCommitGraph({ state }: GitCommitGraphProps) {
  const currentBranch = getCurrentBranchName(state);
  const headHash = getHeadCommitHash(state);

  const graphData = useMemo(() => {
    const localHashes = new Set(state.commits.map((c) => c.hash));
    const allCommitsMap = new Map<string, GitCommit>();

    for (const c of state.commits) {
      allCommitsMap.set(c.hash, c);
    }

    for (const remote of Object.values(state.remotes)) {
      for (const rc of remote.commits) {
        if (!allCommitsMap.has(rc.hash)) {
          allCommitsMap.set(rc.hash, rc);
        }
      }
    }

    const ordered = Array.from(allCommitsMap.values()).reverse();
    if (ordered.length === 0) {
      return { nodes: [] as PositionedNode[], maxLane: 0 };
    }

    const laneMap = new Map<string, number>();

    const traceFirstParent = (startHash: string | undefined, lane: number) => {
      let cursor = startHash;
      const visited = new Set<string>();
      while (cursor && !visited.has(cursor)) {
        visited.add(cursor);
        if (!laneMap.has(cursor)) {
          laneMap.set(cursor, lane);
        }
        const commit = allCommitsMap.get(cursor);
        cursor = commit?.parentHashes[0];
      }
    };

    const mainHash =
      state.branches['main'] ??
      state.remotes.origin?.branches['main'];
    traceFirstParent(mainHash, 0);

    let nextLane = 1;
    for (const [bName, bHash] of Object.entries(state.branches)) {
      if (bName === 'main') continue;
      if (!laneMap.has(bHash)) {
        traceFirstParent(bHash, nextLane);
        nextLane += 1;
      }
    }

    for (const remote of Object.values(state.remotes)) {
      for (const [rbName, rbHash] of Object.entries(remote.branches)) {
        if (rbName === 'main') continue;
        if (!laneMap.has(rbHash)) {
          traceFirstParent(rbHash, nextLane);
          nextLane += 1;
        }
      }
    }

    for (const commit of ordered) {
      if (!laneMap.has(commit.hash)) {
        laneMap.set(commit.hash, 0);
      }
    }

    const nodes: PositionedNode[] = ordered.map((commit, row) => {
      const localBranches = Object.entries(state.branches)
        .filter(([, hash]) => hash === commit.hash)
        .map(([name]) => name);

      const remoteBranches: string[] = [];
      for (const [rName, remote] of Object.entries(state.remotes)) {
        for (const [rbName, rbHash] of Object.entries(remote.branches)) {
          if (rbHash === commit.hash) {
            remoteBranches.push(`${rName}/${rbName}`);
          }
        }
      }

      return {
        commit,
        lane: laneMap.get(commit.hash) ?? 0,
        row,
        isReachableLocal: localHashes.has(commit.hash),
        isHead: headHash === commit.hash,
        localBranches,
        remoteBranches,
      };
    });

    const maxLane = nodes.reduce((max, n) => Math.max(max, n.lane), 0);
    return { nodes, maxLane };
  }, [state.commits, state.branches, state.remotes, headHash]);

  if (!state.initialized) {
    return (
      <div className="flex flex-col items-center justify-center py-10 px-4 text-center">
        <div className="w-10 h-10 rounded-xl bg-zinc-50 border border-zinc-200/80 flex items-center justify-center text-zinc-400 mb-3">
          <LucideGitBranch className="w-5 h-5" />
        </div>
        <p className="text-sm font-semibold text-zinc-900">
          Nenhum repositório Git ainda
        </p>
        <p className="text-xs text-zinc-500 mt-1 max-w-xs leading-relaxed">
          Rode <code className="px-1.5 py-0.5 rounded bg-zinc-100 text-zinc-800 font-mono">git init</code> ou{' '}
          <code className="px-1.5 py-0.5 rounded bg-zinc-100 text-zinc-800 font-mono">git clone</code> no terminal para ver o grafo nascer aqui.
        </p>
      </div>
    );
  }

  if (graphData.nodes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-10 px-4 text-center">
        <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200/70 flex items-center justify-center text-[#D98B08] mb-3">
          <LucideGitCommitHorizontal className="w-5 h-5" />
        </div>
        <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-zinc-100 border border-zinc-200/80 text-xs font-medium text-zinc-700 mb-2">
          <span>HEAD → {currentBranch ?? 'main'}</span>
        </div>
        <p className="text-sm font-semibold text-zinc-900">
          Repositório inicializado, sem commits ainda
        </p>
        <p className="text-xs text-zinc-500 mt-1 max-w-xs leading-relaxed">
          Use <code className="px-1.5 py-0.5 rounded bg-zinc-100 text-zinc-800 font-mono">git add .</code> e{' '}
          <code className="px-1.5 py-0.5 rounded bg-zinc-100 text-zinc-800 font-mono">git commit -m "..."</code> para criar o primeiro nó.
        </p>
      </div>
    );
  }

  const nodeByHash = new Map(graphData.nodes.map((n) => [n.commit.hash, n]));
  const railWidth = Math.max(44, LEFT_PAD * 2 + graphData.maxLane * LANE_GAP);
  const svgHeight = graphData.nodes.length * ROW_HEIGHT;

  return (
    <div className="space-y-3">
      {state.mergeConflict && (
        <div className="flex items-start gap-2.5 p-3 rounded-xl bg-rose-50 border border-rose-200/80 text-rose-900">
          <LucideAlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
          <div className="min-w-0 text-xs leading-relaxed">
            <p className="font-semibold">
              Merge em andamento com conflito ({state.mergeConflict.incomingBranch})
            </p>
            <p className="text-rose-700 mt-0.5">
              {state.mergeConflict.conflictedFiles.length > 0
                ? `Arquivo(s) pendente(s): ${state.mergeConflict.conflictedFiles.join(', ')}`
                : 'Conflito limpo! Falta apenas rodar git commit -m "..." para concluir.'}
            </p>
          </div>
        </div>
      )}

      <div className="relative flex items-start overflow-x-auto custom-scrollbar">
        <svg
          width={railWidth}
          height={svgHeight}
          className="shrink-0 select-none"
          aria-hidden="true"
        >
          {/* Edges from commit to parent(s) */}
          {graphData.nodes.map((node) => {
            const x1 = LEFT_PAD + node.lane * LANE_GAP;
            const y1 = node.row * ROW_HEIGHT + ROW_HEIGHT / 2;

            return node.commit.parentHashes.map((pHash, pIdx) => {
              const parent = nodeByHash.get(pHash);
              if (!parent) return null;

              const x2 = LEFT_PAD + parent.lane * LANE_GAP;
              const y2 = parent.row * ROW_HEIGHT + ROW_HEIGHT / 2;
              const color =
                pIdx === 0
                  ? LANE_COLORS[node.lane % LANE_COLORS.length]
                  : LANE_COLORS[parent.lane % LANE_COLORS.length];

              const midY = (y1 + y2) / 2;
              const pathD =
                x1 === x2
                  ? `M ${x1} ${y1} L ${x2} ${y2}`
                  : `M ${x1} ${y1} C ${x1} ${midY}, ${x2} ${midY}, ${x2} ${y2}`;

              return (
                <path
                  key={`${node.commit.hash}-${pHash}`}
                  d={pathD}
                  fill="none"
                  stroke={color}
                  strokeWidth={2}
                  strokeOpacity={node.isReachableLocal ? 0.75 : 0.4}
                  strokeDasharray={node.isReachableLocal ? undefined : '4 3'}
                />
              );
            });
          })}

          {/* Commit nodes */}
          {graphData.nodes.map((node) => {
            const cx = LEFT_PAD + node.lane * LANE_GAP;
            const cy = node.row * ROW_HEIGHT + ROW_HEIGHT / 2;
            const color = LANE_COLORS[node.lane % LANE_COLORS.length];

            return (
              <g key={node.commit.hash}>
                {node.isHead && (
                  <motion.circle
                    initial={{ scale: 0.7, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    cx={cx}
                    cy={cy}
                    r={10}
                    fill={color}
                    fillOpacity={0.16}
                  />
                )}
                <circle
                  cx={cx}
                  cy={cy}
                  r={node.isHead ? 6 : 5}
                  fill={node.isReachableLocal ? color : '#ffffff'}
                  stroke={color}
                  strokeWidth={2.5}
                />
              </g>
            );
          })}
        </svg>

        <div className="flex-1 min-w-0 divide-y divide-zinc-100">
          {graphData.nodes.map((node) => (
            <div
              key={node.commit.hash}
              style={{ height: ROW_HEIGHT }}
              className={`flex flex-col justify-center px-2 min-w-0 ${
                node.isHead ? 'bg-amber-50/40 rounded-r-xl' : ''
              }`}
            >
              <div className="flex items-center gap-1.5 flex-wrap min-w-0">
                <span className="font-mono text-[11px] font-semibold text-zinc-500 bg-zinc-100 border border-zinc-200/70 px-1.5 py-0.5 rounded">
                  {node.commit.hash}
                </span>

                {node.isHead && state.head.type === 'detached' && (
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-[#F19B0A] text-white text-[11px] font-semibold">
                    HEAD
                  </span>
                )}

                {node.localBranches.map((branchName) => {
                  const isCurrent =
                    state.head.type === 'branch' && state.head.ref === branchName;
                  return (
                    <span
                      key={branchName}
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold border ${
                        isCurrent
                          ? 'bg-amber-50 border-amber-300 text-amber-800'
                          : 'bg-zinc-50 border-zinc-200 text-zinc-700'
                      }`}
                    >
                      {isCurrent && (
                        <span className="w-1.5 h-1.5 rounded-full bg-[#F19B0A]" />
                      )}
                      <span>
                        {isCurrent ? `HEAD → ${branchName}` : branchName}
                      </span>
                    </span>
                  );
                })}

                {node.remoteBranches.map((rb) => (
                  <span
                    key={rb}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-sky-50 border border-sky-200/80 text-sky-700"
                  >
                    <LucideGlobe className="w-3 h-3" />
                    <span>{rb}</span>
                  </span>
                ))}

                {!node.isReachableLocal && (
                  <span className="text-[11px] text-sky-600 font-medium">
                    (no servidor — rode git pull)
                  </span>
                )}
              </div>

              <p
                className="text-xs font-medium text-zinc-800 truncate mt-1"
                title={node.commit.message}
              >
                {node.commit.message}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

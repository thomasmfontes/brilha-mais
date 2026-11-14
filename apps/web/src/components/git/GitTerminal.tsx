import React, { useEffect, useRef, useState } from 'react';
import { LucideEraser, LucideTerminal } from 'lucide-react';
import {
  getAutocompleteSuggestions,
  getCurrentBranchName,
} from '../../lib/git-engine/engine';
import {
  GitRepoState,
  TerminalOutputSegment,
  TerminalOutputTone,
} from '../../lib/git-engine/types';

export interface TerminalEntry {
  id: string;
  prompt?: string;
  command?: string;
  lines: TerminalOutputSegment[];
}

interface GitTerminalProps {
  state: GitRepoState;
  entries: TerminalEntry[];
  onRunCommand: (command: string) => void;
  onClear: () => void;
  insertRequest?: { text: string; nonce: number } | null;
}

const TONE_CLASS: Record<TerminalOutputTone, string> = {
  default: 'text-zinc-200',
  success: 'text-emerald-400',
  warning: 'text-amber-300',
  error: 'text-rose-400',
  info: 'text-sky-300',
  muted: 'text-zinc-400',
  accent: 'text-[#F19B0A]',
};

export function GitTerminal({
  state,
  entries,
  onRunCommand,
  onClear,
  insertRequest,
}: GitTerminalProps) {
  const [input, setInput] = useState('');
  const [historyIdx, setHistoryIdx] = useState<number>(-1);
  const [tabHint, setTabHint] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const branchName = getCurrentBranchName(state);
  const branchBadge = state.initialized
    ? state.mergeConflict
      ? `${branchName ?? 'HEAD'} | CONFLITO`
      : branchName ?? 'HEAD'
    : 'sem git';

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [entries]);

  useEffect(() => {
    if (!insertRequest) return;
    applyInsertText(insertRequest.text);
  }, [insertRequest]);

  const applyInsertText = (text: string) => {
    setInput(text);
    setTabHint(null);
    requestAnimationFrame(() => {
      const el = inputRef.current;
      if (!el) return;
      el.focus();
      const emptyQuotesPos = text.indexOf('""');
      if (emptyQuotesPos !== -1) {
        el.setSelectionRange(emptyQuotesPos + 1, emptyQuotesPos + 1);
      } else {
        el.setSelectionRange(text.length, text.length);
      }
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cmd = input;
    setInput('');
    setHistoryIdx(-1);
    setTabHint(null);
    if (!cmd.trim()) return;
    onRunCommand(cmd);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.ctrlKey && e.key.toLowerCase() === 'l') {
      e.preventDefault();
      onClear();
      return;
    }

    if (e.key === 'ArrowUp') {
      e.preventDefault();
      const history = state.commandHistory;
      if (history.length === 0) return;
      const nextIdx =
        historyIdx === -1 ? history.length - 1 : Math.max(0, historyIdx - 1);
      setHistoryIdx(nextIdx);
      setInput(history[nextIdx]);
      setTabHint(null);
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      const history = state.commandHistory;
      if (historyIdx === -1) return;
      if (historyIdx >= history.length - 1) {
        setHistoryIdx(-1);
        setInput('');
      } else {
        const nextIdx = historyIdx + 1;
        setHistoryIdx(nextIdx);
        setInput(history[nextIdx]);
      }
      setTabHint(null);
      return;
    }

    if (e.key === 'Tab') {
      e.preventDefault();
      const suggestions = getAutocompleteSuggestions(state, input);
      if (suggestions.length === 1) {
        setInput(`${suggestions[0]} `);
        setTabHint(null);
      } else if (suggestions.length > 1) {
        setTabHint(suggestions.slice(0, 5).join('   '));
      }
    }
  };

  return (
    <div
      className="bg-zinc-950 text-zinc-100 border border-zinc-800 rounded-2xl shadow-xs overflow-hidden flex flex-col min-w-0"
      onClick={() => inputRef.current?.focus()}
    >
      {/* Top Bar */}
      <div className="px-4 py-2.5 bg-zinc-900/90 border-b border-zinc-800/90 flex items-center justify-between gap-2 shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <div className="flex items-center gap-1.5 text-xs text-zinc-200 font-medium">
            <LucideTerminal className="w-3.5 h-3.5 text-[#F19B0A] shrink-0" />
            <span>Terminal</span>
          </div>
          <span
            className={`px-2 py-0.5 rounded-md text-[11px] font-mono font-medium shrink-0 ${
              state.mergeConflict
                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                : state.initialized
                  ? 'bg-amber-500/15 text-[#F19B0A] border border-amber-500/25'
                  : 'bg-zinc-800 text-zinc-400 border border-zinc-700'
            }`}
          >
            {branchBadge}
          </span>
        </div>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onClear();
          }}
          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white text-xs font-medium transition-colors shrink-0"
          title="Limpar terminal (Ctrl+L)"
        >
          <LucideEraser className="w-3.5 h-3.5" />
          <span>Limpar</span>
        </button>
      </div>

      {/* Output Scroll Area */}
      <div
        ref={scrollRef}
        className="p-4 h-[290px] sm:h-[340px] overflow-y-auto custom-scrollbar font-mono text-xs sm:text-[13px] leading-relaxed space-y-2.5"
      >
        {entries.map((entry) => (
          <div key={entry.id} className="space-y-1">
            {entry.command && (
              <div className="flex items-baseline gap-1.5 break-all">
                <span className="text-emerald-400 shrink-0 font-semibold">
                  {entry.prompt || '$'}
                </span>
                <span className="text-white">{entry.command}</span>
              </div>
            )}
            {entry.lines.map((line, idx) => (
              <div
                key={idx}
                className={`whitespace-pre-wrap break-words ${
                  TONE_CLASS[line.tone || 'default']
                }`}
              >
                {line.text || '\u00A0'}
              </div>
            ))}
          </div>
        ))}

        {tabHint && (
          <div className="text-zinc-400 text-xs pt-1 border-t border-zinc-800/70">
            Sugestões: <span className="text-sky-300">{tabHint}</span>
          </div>
        )}
      </div>

      {/* Prompt Input */}
      <form
        onSubmit={handleSubmit}
        className="px-4 py-2.5 bg-zinc-900/60 border-t border-zinc-800/80 flex items-center gap-2 font-mono text-xs sm:text-[13px]"
      >
        <span className="text-emerald-400 font-semibold shrink-0 select-none">
          <span className="hidden sm:inline">~/{state.projectName} </span>
          <span className="text-[#F19B0A]">({branchName ?? 'sem-git'})</span> $
        </span>
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => {
            setInput(e.target.value);
            setTabHint(null);
          }}
          onKeyDown={handleKeyDown}
          placeholder="Digite um comando (ex: git status)..."
          autoCapitalize="none"
          autoCorrect="off"
          autoComplete="off"
          enterKeyHint="enter"
          spellCheck={false}
          className="flex-1 min-w-0 bg-transparent text-white placeholder:text-zinc-500 outline-none"
        />
      </form>
    </div>
  );
}

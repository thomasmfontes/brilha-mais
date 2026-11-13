import React, { useRef } from 'react';
import { Bold, Italic, Underline, List } from 'lucide-react';

function renderInlineFormatting(text: string, keyPrefix: string): React.ReactNode[] {
    const nodes: React.ReactNode[] = [];
    // Matches **bold**, __underline__, *italic*
    const regex = /(\*\*[^*]+\*\*|__[^_]+__|\*[^*]+\*)/g;
    let lastIndex = 0;
    let match: RegExpExecArray | null;
    let idx = 0;

    while ((match = regex.exec(text)) !== null) {
        if (match.index > lastIndex) {
            nodes.push(text.slice(lastIndex, match.index));
        }
        const token = match[0];
        const inner = token.slice(token.startsWith('**') || token.startsWith('__') ? 2 : 1, token.length - (token.startsWith('**') || token.startsWith('__') ? 2 : 1));

        if (token.startsWith('**')) {
            nodes.push(
                <strong key={`${keyPrefix}-b-${idx}`} className="font-semibold text-zinc-900">
                    {renderInlineFormatting(inner, `${keyPrefix}-bi-${idx}`)}
                </strong>
            );
        } else if (token.startsWith('__')) {
            nodes.push(
                <span key={`${keyPrefix}-u-${idx}`} className="underline underline-offset-4 decoration-zinc-400">
                    {renderInlineFormatting(inner, `${keyPrefix}-ui-${idx}`)}
                </span>
            );
        } else {
            nodes.push(
                <em key={`${keyPrefix}-i-${idx}`} className="italic">
                    {renderInlineFormatting(inner, `${keyPrefix}-ii-${idx}`)}
                </em>
            );
        }

        lastIndex = regex.lastIndex;
        idx += 1;
    }

    if (lastIndex < text.length) {
        nodes.push(text.slice(lastIndex));
    }
    return nodes;
}

export function RichTextRenderer({
    content,
    className = '',
}: {
    content?: string | null;
    className?: string;
}) {
    if (!content) return null;

    const lines = content.split(/\r?\n/);
    const blocks: React.ReactNode[] = [];
    let listItems: string[] = [];

    const flushList = (keyIdx: number) => {
        if (listItems.length === 0) return;
        blocks.push(
            <ul key={`ul-${keyIdx}`} className="list-disc pl-5 space-y-1 text-zinc-600">
                {listItems.map((item, i) => (
                    <li key={`li-${keyIdx}-${i}`} className="leading-relaxed">
                        {renderInlineFormatting(item, `li-${keyIdx}-${i}`)}
                    </li>
                ))}
            </ul>
        );
        listItems = [];
    };

    lines.forEach((line, i) => {
        const trimmed = line.trim();
        if (trimmed.startsWith('- ') || trimmed.startsWith('• ')) {
            listItems.push(trimmed.slice(2).trim());
        } else {
            flushList(i);
            if (trimmed === '') {
                blocks.push(<div key={`sp-${i}`} className="h-2.5" />);
            } else {
                blocks.push(
                    <p key={`p-${i}`} className="leading-relaxed text-zinc-600">
                        {renderInlineFormatting(line, `p-${i}`)}
                    </p>
                );
            }
        }
    });

    flushList(lines.length);

    return <div className={`text-sm space-y-2 break-words ${className}`}>{blocks}</div>;
}

export function RichTextInput({
    value,
    onChange,
    placeholder,
    rows = 3,
    label,
}: {
    value: string;
    onChange: (nextValue: string) => void;
    placeholder?: string;
    rows?: number;
    label?: string;
}) {
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    const applyWrap = (prefix: string, suffix: string, fallbackText: string) => {
        const el = textareaRef.current;
        if (!el) return;

        const start = el.selectionStart ?? value.length;
        const end = el.selectionEnd ?? value.length;
        const selected = value.slice(start, end) || fallbackText;
        const next =
            value.slice(0, start) + prefix + selected + suffix + value.slice(end);
        onChange(next);

        requestAnimationFrame(() => {
            el.focus();
            el.setSelectionRange(
                start + prefix.length,
                start + prefix.length + selected.length,
            );
        });
    };

    const applyListLine = () => {
        const el = textareaRef.current;
        if (!el) return;
        const start = el.selectionStart ?? value.length;
        const prefix = value.length > 0 && value[start - 1] !== '\n' ? '\n- ' : '- ';
        const next = value.slice(0, start) + prefix + value.slice(start);
        onChange(next);
        requestAnimationFrame(() => {
            el.focus();
            el.setSelectionRange(start + prefix.length, start + prefix.length);
        });
    };

    return (
        <div className="space-y-1.5">
            {label && (
                <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-medium text-zinc-700">{label}</span>
                    <div className="flex items-center gap-1 bg-zinc-100/80 border border-zinc-200/80 rounded-lg p-0.5">
                        <button
                            type="button"
                            onClick={() => applyWrap('**', '**', 'negrito')}
                            title="Negrito (**texto**)"
                            className="h-6 w-6 flex items-center justify-center rounded-md text-zinc-600 hover:text-zinc-950 hover:bg-white transition-colors"
                        >
                            <Bold className="h-3.5 w-3.5" />
                        </button>
                        <button
                            type="button"
                            onClick={() => applyWrap('*', '*', 'itálico')}
                            title="Itálico (*texto*)"
                            className="h-6 w-6 flex items-center justify-center rounded-md text-zinc-600 hover:text-zinc-950 hover:bg-white transition-colors"
                        >
                            <Italic className="h-3.5 w-3.5" />
                        </button>
                        <button
                            type="button"
                            onClick={() => applyWrap('__', '__', 'sublinhado')}
                            title="Sublinhado (__texto__)"
                            className="h-6 w-6 flex items-center justify-center rounded-md text-zinc-600 hover:text-zinc-950 hover:bg-white transition-colors"
                        >
                            <Underline className="h-3.5 w-3.5" />
                        </button>
                        <button
                            type="button"
                            onClick={applyListLine}
                            title="Item de lista (- item)"
                            className="h-6 w-6 flex items-center justify-center rounded-md text-zinc-600 hover:text-zinc-950 hover:bg-white transition-colors"
                        >
                            <List className="h-3.5 w-3.5" />
                        </button>
                    </div>
                </div>
            )}
            <textarea
                ref={textareaRef}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                rows={rows}
                placeholder={placeholder}
                className="w-full rounded-xl border border-zinc-200/90 bg-white px-3.5 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:border-[#F19B0A] focus:ring-2 focus:ring-[#F19B0A]/15 transition-all resize-y"
            />
        </div>
    );
}

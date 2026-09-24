"use client";

import { useRef } from "react";

export function CodeEditor({
  value,
  onChange,
  onRunShortcut,
  errorLine,
}: {
  value: string;
  onChange: (next: string) => void;
  onRunShortcut?: () => void;
  errorLine?: number | null;
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const gutterRef = useRef<HTMLDivElement>(null);

  const lines = value.split("\n");

  function syncScroll() {
    if (gutterRef.current && textareaRef.current) {
      gutterRef.current.scrollTop = textareaRef.current.scrollTop;
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    const el = e.currentTarget;

    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      onRunShortcut?.();
      return;
    }

    if (e.key === "Tab") {
      e.preventDefault();
      const start = el.selectionStart;
      const end = el.selectionEnd;
      const next = value.slice(0, start) + "    " + value.slice(end);
      onChange(next);
      requestAnimationFrame(() => {
        el.selectionStart = el.selectionEnd = start + 4;
      });
      return;
    }

    if (e.key === "Enter") {
      const start = el.selectionStart;
      const before = value.slice(0, start);
      const currentLine = before.slice(before.lastIndexOf("\n") + 1);
      const indentMatch = currentLine.match(/^\s*/);
      let indent = indentMatch ? indentMatch[0] : "";
      if (currentLine.trim().endsWith(":")) indent += "    ";
      e.preventDefault();
      const next = value.slice(0, start) + "\n" + indent + value.slice(el.selectionEnd);
      onChange(next);
      requestAnimationFrame(() => {
        el.selectionStart = el.selectionEnd = start + 1 + indent.length;
      });
    }
  }

  return (
    <div className="flex overflow-hidden">
      <div
        ref={gutterRef}
        aria-hidden="true"
        className="select-none overflow-hidden bg-surface-2 px-2 py-4 text-right font-mono text-sm text-muted"
        style={{ lineHeight: "1.5rem" }}
      >
        {lines.map((_, i) => (
          <div key={i} className={errorLine === i + 1 ? "font-bold text-danger" : ""}>
            {i + 1}
          </div>
        ))}
      </div>
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        onScroll={syncScroll}
        spellCheck={false}
        aria-label="Python code editor"
        className="h-72 flex-1 resize-none bg-surface p-4 font-mono text-sm text-foreground outline-none"
        style={{ lineHeight: "1.5rem" }}
      />
    </div>
  );
}

"use client";

import { useMemo } from "react";
import CodeMirror from "@uiw/react-codemirror";
import { python } from "@codemirror/lang-python";
import { EditorView } from "@codemirror/view";

const theme = EditorView.theme(
  {
    "&": { color: "#eef2ff", backgroundColor: "transparent" },
    ".cm-content": { caretColor: "#a68bff", fontFamily: "var(--font-geist-mono), monospace" },
    ".cm-cursor": { borderLeftColor: "#a68bff" },
    ".cm-activeLine": { backgroundColor: "rgba(124,92,255,0.08)" },
    ".cm-activeLineGutter": { backgroundColor: "transparent", color: "#a5b0d6" },
    ".cm-gutters": { color: "#6b78ab" },
    ".cm-selectionBackground, &.cm-focused .cm-selectionBackground, ::selection": {
      backgroundColor: "rgba(124,92,255,0.35)",
    },
  },
  { dark: true },
);

export function CodeEditor({
  value,
  onChange,
  readOnly = false,
  minHeight = "320px",
}: {
  value: string;
  onChange: (next: string) => void;
  readOnly?: boolean;
  minHeight?: string;
}) {
  const extensions = useMemo(() => [python(), theme, EditorView.lineWrapping], []);

  return (
    <div className="overflow-hidden rounded-xl border border-line bg-surface/80">
      <CodeMirror
        value={value}
        onChange={onChange}
        extensions={extensions}
        readOnly={readOnly}
        minHeight={minHeight}
        basicSetup={{ highlightActiveLine: true, foldGutter: false, autocompletion: false }}
        aria-label="Python code editor"
      />
    </div>
  );
}

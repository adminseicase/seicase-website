"use client";

import { useEffect, useRef } from "react";
import { Bold, Heading2, Heading3, Italic, Link2, List, ListOrdered, Quote, Undo2, Redo2, Eraser } from "lucide-react";

/**
 * Lightweight rich-text editor (no heavy dependency). Produces simple HTML
 * that the server sanitises before saving (lib/admin/helpers.ts → cleanHtml).
 */
export function RichText({ value, onChange, id, minHeight = 220, label }: { value: string; onChange: (html: string) => void; id?: string; minHeight?: number; label: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (ref.current && ref.current.innerHTML !== value) ref.current.innerHTML = value || "";
    // only sync from props on mount / external reset
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const cmd = (c: string, arg?: string) => {
    ref.current?.focus();
    document.execCommand(c, false, arg);
    onChange(ref.current?.innerHTML ?? "");
  };
  const btn = (title: string, Icon: typeof Bold, run: () => void) => (
    <button key={title} type="button" title={title} aria-label={title} onMouseDown={(e) => e.preventDefault()} onClick={run} className="inline-flex size-8 items-center justify-center rounded-md hover:bg-surface-muted">
      <Icon className="size-4" />
    </button>
  );
  return (
    <div className="overflow-hidden rounded-md border border-border-strong bg-surface focus-within:border-cognac">
      <div className="flex flex-wrap gap-0.5 border-b bg-surface-muted/40 p-1" role="toolbar" aria-label={`${label} formatting`}>
        {btn("Bold", Bold, () => cmd("bold"))}
        {btn("Italic", Italic, () => cmd("italic"))}
        {btn("Heading", Heading2, () => cmd("formatBlock", "h2"))}
        {btn("Subheading", Heading3, () => cmd("formatBlock", "h3"))}
        {btn("Bulleted list", List, () => cmd("insertUnorderedList"))}
        {btn("Numbered list", ListOrdered, () => cmd("insertOrderedList"))}
        {btn("Quote", Quote, () => cmd("formatBlock", "blockquote"))}
        {btn("Link", Link2, () => {
          const url = prompt("Link URL (https://… or /page)");
          if (url) cmd("createLink", url);
        })}
        {btn("Clear formatting", Eraser, () => {
          cmd("removeFormat");
          cmd("formatBlock", "p");
        })}
        {btn("Undo", Undo2, () => cmd("undo"))}
        {btn("Redo", Redo2, () => cmd("redo"))}
      </div>
      <div
        ref={ref}
        id={id}
        role="textbox"
        aria-multiline="true"
        aria-label={label}
        contentEditable
        suppressContentEditableWarning
        onInput={() => onChange(ref.current?.innerHTML ?? "")}
        onPaste={(e) => {
          // paste as plain text to keep markup clean
          e.preventDefault();
          document.execCommand("insertText", false, e.clipboardData.getData("text/plain"));
        }}
        className="prose-seicase max-w-none overflow-y-auto px-4 py-3 text-sm focus:outline-none"
        style={{ minHeight }}
      />
    </div>
  );
}

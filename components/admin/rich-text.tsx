"use client";

import { useEffect, useRef } from "react";
import { Bold, Heading2, Heading3, Italic, Link2, List, ListOrdered, Quote, Undo2, Redo2, Eraser } from "lucide-react";

/**
 * Lightweight rich-text editor (no heavy dependency). Produces simple HTML
 * that the server sanitises before saving (lib/admin/helpers.ts → cleanHtml).
 */
export function RichText({
  value,
  onChange,
  id,
  minHeight = 220,
  label,
}: {
  value: string;
  onChange: (html: string) => void;
  id?: string;
  minHeight?: number;
  label: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (ref.current && ref.current.innerHTML !== value) ref.current.innerHTML = value || "";
    // only sync from props on mount / external reset
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  // Toolbar as data; the handler reads the ref only inside the click event.
  const tools: { title: string; Icon: typeof Bold; cmd: string; arg?: string }[] = [
    { title: "Bold", Icon: Bold, cmd: "bold" },
    { title: "Italic", Icon: Italic, cmd: "italic" },
    { title: "Heading", Icon: Heading2, cmd: "formatBlock", arg: "h2" },
    { title: "Subheading", Icon: Heading3, cmd: "formatBlock", arg: "h3" },
    { title: "Bulleted list", Icon: List, cmd: "insertUnorderedList" },
    { title: "Numbered list", Icon: ListOrdered, cmd: "insertOrderedList" },
    { title: "Quote", Icon: Quote, cmd: "formatBlock", arg: "blockquote" },
    { title: "Link", Icon: Link2, cmd: "createLink" },
    { title: "Clear formatting", Icon: Eraser, cmd: "removeFormat" },
    { title: "Undo", Icon: Undo2, cmd: "undo" },
    { title: "Redo", Icon: Redo2, cmd: "redo" },
  ];
  const exec = (cmd: string, arg?: string) => {
    const el = ref.current;
    if (!el) return;
    el.focus();
    if (cmd === "createLink") {
      const url = prompt("Link URL (https://… or /page)");
      if (!url) return;
      document.execCommand("createLink", false, url);
    } else if (cmd === "removeFormat") {
      document.execCommand("removeFormat");
      document.execCommand("formatBlock", false, "p");
    } else document.execCommand(cmd, false, arg);
    onChange(el.innerHTML);
  };
  return (
    <div className="border-border-strong bg-surface focus-within:border-cognac overflow-hidden rounded-md border">
      <div className="bg-surface-muted/40 flex flex-wrap gap-0.5 border-b p-1" role="toolbar" aria-label={`${label} formatting`}>
        {tools.map((t) => (
          <button
            key={t.title}
            type="button"
            title={t.title}
            aria-label={t.title}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => exec(t.cmd, t.arg)}
            className="hover:bg-surface-muted inline-flex size-8 items-center justify-center rounded-md"
          >
            <t.Icon className="size-4" />
          </button>
        ))}
      </div>
      <div
        ref={ref}
        id={id}
        role="textbox"
        aria-multiline="true"
        aria-label={label}
        contentEditable
        suppressContentEditableWarning
        onInput={(e) => onChange(e.currentTarget.innerHTML)}
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

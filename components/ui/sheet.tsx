"use client";

import * as React from "react";
import { Dialog } from "radix-ui";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

/** Accessible slide-in drawer (focus trap, Esc to close, scroll lock). */
export function Sheet({
  open,
  onOpenChange,
  side = "right",
  title,
  description,
  children,
  className,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  side?: "left" | "right";
  title: React.ReactNode;
  description?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="animate-fade-in fixed inset-0 z-50 bg-[#1f1a17]/35 backdrop-blur-[2px]" />
        <Dialog.Content
          className={cn(
            "bg-surface shadow-lift fixed top-0 z-50 flex h-dvh w-[min(92vw,420px)] flex-col focus:outline-none",
            side === "right" ? "animate-slide-in-right right-0" : "animate-slide-in-left left-0",
            className,
          )}
          {...(!description ? { "aria-describedby": undefined } : {})}
        >
          <div className="flex items-center justify-between border-b px-5 py-3">
            <Dialog.Title className="font-serif text-2xl">{title}</Dialog.Title>
            <Dialog.Close
              className="hover:bg-surface-muted -mr-2 inline-flex size-11 items-center justify-center rounded-full"
              aria-label="Close"
            >
              <X className="size-5 stroke-[1.5]" />
            </Dialog.Close>
          </div>
          {description && <Dialog.Description className="sr-only">{description}</Dialog.Description>}
          {children}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

/** Centered dialog. */
export function Modal({
  open,
  onOpenChange,
  title,
  description,
  children,
  className,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="animate-fade-in fixed inset-0 z-50 bg-[#1f1a17]/40" />
        <Dialog.Content
          className={cn(
            "bg-surface text-foreground shadow-lift fixed top-1/2 left-1/2 z-50 max-h-[90dvh] w-[min(94vw,560px)] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-xl p-6 focus:outline-none",
            className,
          )}
          {...(!description ? { "aria-describedby": undefined } : {})}
        >
          <div className="mb-4 flex items-start justify-between gap-4">
            <div>
              <Dialog.Title className="font-serif text-2xl">{title}</Dialog.Title>
              {description && <Dialog.Description className="text-muted mt-1 text-sm">{description}</Dialog.Description>}
            </div>
            <Dialog.Close
              className="hover:bg-surface-muted -mt-1 -mr-2 inline-flex size-10 items-center justify-center rounded-full"
              aria-label="Close"
            >
              <X className="size-5 stroke-[1.5]" />
            </Dialog.Close>
          </div>
          {children}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

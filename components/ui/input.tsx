import * as React from "react";
import { cn } from "@/lib/utils";

export const inputClass =
  "flex h-11 w-full rounded-md border border-border-strong bg-surface px-3.5 text-[0.95rem] text-foreground placeholder:text-muted/80 transition-colors focus-visible:border-cognac focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cognac/20 disabled:cursor-not-allowed disabled:opacity-60 aria-[invalid=true]:border-danger";

export function Input({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(inputClass, className)} {...props} />;
}

export function Textarea({ className, ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn(inputClass, "min-h-28 py-3 leading-relaxed", className)} {...props} />;
}

const chevron =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%237D6E64' stroke-width='1.5'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")";

export function NativeSelect({ className, children, style, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(inputClass, "appearance-none bg-[length:14px] bg-[right_0.9rem_center] bg-no-repeat pr-9", className)}
      style={{ backgroundImage: chevron, ...style }}
      {...props}
    >
      {children}
    </select>
  );
}

export function Label({ className, ...props }: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return <label className={cn("mb-1.5 block text-sm font-medium text-foreground", className)} {...props} />;
}

export function FieldError({ message, id }: { message?: string; id?: string }) {
  if (!message) return null;
  return (
    <p id={id} role="alert" className="mt-1.5 text-xs text-danger">
      {message}
    </p>
  );
}

export function Checkbox({ className, ...props }: Omit<React.InputHTMLAttributes<HTMLInputElement>, "type">) {
  return <input type="checkbox" className={cn("size-4 shrink-0 rounded border-border-strong accent-foreground", className)} {...props} />;
}

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva("inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap", {
  variants: {
    tone: {
      neutral: "bg-surface-muted text-foreground",
      success: "bg-success-bg text-success",
      warning: "bg-warning-bg text-warning",
      danger: "bg-danger-bg text-danger",
      cognac: "bg-[#F1E2D6] text-brown",
      dark: "bg-foreground text-background",
      outline: "border border-border-strong text-foreground",
    },
  },
  defaultVariants: { tone: "neutral" },
});

export function Badge({ className, tone, ...props }: React.HTMLAttributes<HTMLSpanElement> & VariantProps<typeof badgeVariants>) {
  return <span className={cn(badgeVariants({ tone }), className)} {...props} />;
}

const STATUS_TONE: Record<string, VariantProps<typeof badgeVariants>["tone"]> = {
  pending: "warning",
  placed: "cognac",
  confirmed: "cognac",
  shipped: "neutral",
  out_for_delivery: "neutral",
  delivered: "success",
  cancelled: "danger",
  returned: "danger",
  paid: "success",
  failed: "danger",
  refunded: "neutral",
  partially_refunded: "neutral",
  requested: "warning",
  approved: "cognac",
  rejected: "danger",
  received: "neutral",
  exchanged: "success",
  published: "success",
  draft: "neutral",
  archived: "outline",
  hidden: "outline",
  captured: "success",
  created: "warning",
  active: "success",
  abandoned: "warning",
  recovered: "success",
  converted: "neutral",
};

export function StatusBadge({ status, label, className }: { status: string; label?: string; className?: string }) {
  return (
    <Badge tone={STATUS_TONE[status] ?? "neutral"} className={className}>
      {label ?? status.replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase())}
    </Badge>
  );
}

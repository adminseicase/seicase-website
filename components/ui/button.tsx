import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap font-sans text-sm font-medium tracking-wide transition-colors duration-200 disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-4 [&_svg]:shrink-0 [&_svg]:stroke-[1.5]",
  {
    variants: {
      variant: {
        primary: "bg-foreground text-background hover:bg-brown dark:hover:bg-cognac dark:hover:text-white",
        secondary: "border border-foreground bg-transparent text-foreground hover:bg-foreground hover:text-background",
        outline: "border border-border-strong bg-surface text-foreground hover:border-foreground",
        ghost: "text-foreground hover:bg-surface-muted",
        link: "h-auto px-0 text-foreground underline-offset-4 hover:text-cognac hover:underline",
        cognac: "bg-cognac text-white hover:bg-brown",
        danger: "bg-danger text-white hover:opacity-90",
      },
      size: {
        sm: "h-9 rounded-md px-3 text-xs",
        md: "h-11 rounded-md px-5",
        lg: "h-12 rounded-md px-7 text-[0.95rem]",
        icon: "size-11 rounded-full",
        "icon-sm": "size-9 rounded-full",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

/** `asChild` styles the single child element (e.g. a <Link>) as a button — no extra wrapper, no dependency. */
export function Button({ className, variant, size, asChild, type, children, ...props }: ButtonProps) {
  const classes = cn(buttonVariants({ variant, size }), className);
  if (asChild && React.isValidElement<{ className?: string }>(children)) {
    return React.cloneElement(children, { ...(props as object), className: cn(classes, children.props.className) });
  }
  return (
    <button data-slot="button" className={classes} type={type ?? "button"} {...props}>
      {children}
    </button>
  );
}

export { buttonVariants };

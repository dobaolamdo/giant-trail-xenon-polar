import type { ComponentProps } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-sm px-1.5 py-0.5 text-xs font-semibold uppercase tracking-wider",
  {
    variants: {
      variant: {
        default: "bg-accent text-fg",
        muted: "bg-surface-2 text-muted",
        outline: "shadow-[var(--shadow-border)] text-muted",
        live: "bg-accent/15 text-accent",
        green: "bg-flag-green/15 text-flag-green",
        yellow: "bg-flag-yellow/15 text-flag-yellow",
        purple: "bg-sector-purple/15 text-sector-purple",
      },
    },
    defaultVariants: { variant: "default" },
  },
);

function Badge({
  className,
  variant,
  ...props
}: ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };

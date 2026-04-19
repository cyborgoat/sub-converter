import * as React from "react";

import { cn } from "@/lib/utils";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: "default" | "outline" | "success";
}

function Badge({ className, variant = "default", ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium",
        variant === "default" &&
          "border-transparent bg-violet-500/15 text-violet-200",
        variant === "outline" &&
          "border-white/15 bg-transparent text-zinc-300",
        variant === "success" &&
          "border-transparent bg-emerald-500/15 text-emerald-200",
        className,
      )}
      {...props}
    />
  );
}

export { Badge };

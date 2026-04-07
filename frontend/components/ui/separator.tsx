import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function Separator({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      aria-hidden="true"
      className={cn("h-px w-full bg-white/8", className)}
      {...props}
    />
  );
}

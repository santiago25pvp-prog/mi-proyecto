"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.ComponentProps<"textarea">
>(({ className, ...props }, ref) => {
  return (
    <textarea
      ref={ref}
      className={cn(
        "flex min-h-32 w-full rounded-[1.75rem] border border-white/10 bg-white/5 px-4 py-4 text-sm text-white placeholder:text-white/35 outline-none transition-[border-color,box-shadow,background-color] focus:border-[var(--accent)] focus:bg-white/8 focus:shadow-[0_0_0_4px_rgba(240,179,106,0.08)]",
        className,
      )}
      {...props}
    />
  );
});
Textarea.displayName = "Textarea";

export { Textarea };


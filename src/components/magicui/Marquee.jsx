"use client";

import { cn } from "@/lib/utils";

export const Marquee = ({
  className,
  reverse,
  pauseOnHover = false,
  children,
  ...props
}) => {
  return (
    <div
      {...props}
      className={cn(
        "group flex overflow-hidden p-2 [--duration:40s] [--gap:1rem] [flex-direction:row]",
        className
      )}
    >
      <div
        className={cn(
          "flex shrink-0 justify-around gap-[--gap] min-w-full flex-row animate-marquee",
          reverse && "direction-reverse",
          pauseOnHover && "group-hover:[animation-play-state:paused]"
        )}
      >
        {children}
      </div>
      <div
        className={cn(
          "flex shrink-0 justify-around gap-[--gap] min-w-full flex-row animate-marquee",
          reverse && "direction-reverse",
          pauseOnHover && "group-hover:[animation-play-state:paused]"
        )}
        aria-hidden="true"
      >
        {children}
      </div>
    </div>
  );
};

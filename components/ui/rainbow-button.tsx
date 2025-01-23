import React from "react";

import { cn } from "@/lib/utils";
interface RainbowButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {}

export function RainbowButton({
  children,
  className,
  ...props
}: RainbowButtonProps) {
  return (
    <button
      className={cn(
        "group relative inline-flex h-11 cursor-pointer items-center justify-center rounded-xl border-0 bg-[length:200%] px-8 py-2 font-medium transition-all duration-300 [background-clip:padding-box,border-box,border-box] [background-origin:border-box] [border:calc(0.12*1rem)_solid_transparent]",
        "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50",

        // Enhanced glow effect
        "before:absolute before:bottom-[-40%] before:left-1/2 before:z-0 before:h-1/4 before:w-4/5 before:-translate-x-1/2 before:bg-[linear-gradient(90deg,hsl(var(--color-1)),hsl(var(--color-5)),hsl(var(--color-3)),hsl(var(--color-4)),hsl(var(--color-2)))] before:bg-[length:200%] before:opacity-70 before:[filter:blur(1.5rem)] before:transition-all before:duration-300",

        // Light mode gradient
        "bg-[linear-gradient(#121213,#121213),linear-gradient(#121213_30%,rgba(18,18,19,0.3)_70%,rgba(18,18,19,0)),linear-gradient(90deg,hsl(var(--color-1))_0%,hsl(var(--color-5))_25%,hsl(var(--color-3))_50%,hsl(var(--color-4))_75%,hsl(var(--color-2))_100%)] bg-[position:0%] hover:bg-[position:100%]",

        // Dark mode gradient
        "dark:bg-[linear-gradient(#fff,#fff),linear-gradient(#fff_30%,rgba(255,255,255,0.3)_70%,rgba(0,0,0,0)),linear-gradient(90deg,hsl(var(--color-1))_0%,hsl(var(--color-5))_25%,hsl(var(--color-3))_50%,hsl(var(--color-4))_75%,hsl(var(--color-2))_100%)]",

        // Hover effects
        "hover:before:opacity-100 hover:before:[filter:blur(2rem)] hover:scale-105",

        className,
      )}
      style={{
        "--color-1": "340, 82%, 52%",  // Vibrant Red
        "--color-2": "270, 91%, 65%",  // Vibrant Purple
        "--color-3": "205, 90%, 60%",  // Vibrant Blue
        "--color-4": "45, 93%, 58%",   // Vibrant Yellow
        "--color-5": "142, 71%, 45%",  // Vibrant Green
      } as React.CSSProperties}
      {...props}
    >
      {children}
    </button>
  );
}

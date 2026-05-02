import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-none text-sm font-bold uppercase tracking-[0.2em] ring-offset-background transition-all duration-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 relative overflow-hidden active:scale-[0.97]",
  {
    variants: {
      variant: {
        default: [
          "bg-primary text-primary-foreground",
          "before:absolute before:inset-0 before:bg-[var(--btn-mirror)] before:pointer-events-none",
          "after:absolute after:inset-0 after:border after:border-[var(--btn-border)] after:pointer-events-none",
          "hover:bg-primary-glow hover:shadow-[0_0_40px_-10px_hsl(var(--primary-glow)/0.6)]",
          "hover:after:border-white/50"
        ].join(" "),
        destructive: [
          "bg-destructive text-destructive-foreground",
          "before:absolute before:inset-0 before:bg-[var(--btn-mirror)]",
          "after:absolute after:inset-0 after:border after:border-[var(--btn-border)]",
          "hover:brightness-125"
        ].join(" "),
        outline: [
          "border-2 border-primary bg-transparent text-primary font-black",
          "hover:bg-primary hover:text-primary-foreground hover:shadow-glow",
          "before:absolute before:inset-0 before:bg-white/0 hover:before:bg-[var(--btn-mirror)]"
        ].join(" "),
        secondary: [
          "bg-secondary text-secondary-foreground",
          "before:absolute before:inset-0 before:bg-[var(--btn-mirror)]",
          "after:absolute after:inset-0 after:border after:border-[var(--btn-border)]",
          "hover:bg-secondary/90 hover:after:border-white/40"
        ].join(" "),
        accent: [
          "bg-accent text-accent-foreground",
          "before:absolute before:inset-0 before:bg-[var(--btn-mirror)]",
          "after:absolute after:inset-0 after:border after:border-white/20",
          "hover:brightness-110 shadow-lg"
        ].join(" "),
        blue: [
          "bg-secondary text-secondary-foreground",
          "before:absolute before:inset-0 before:bg-[var(--btn-mirror)]",
          "after:absolute after:inset-0 after:border after:border-white/20",
          "hover:brightness-110"
        ].join(" "),
        green: [
          "bg-muted text-white",
          "before:absolute before:inset-0 before:bg-[var(--btn-mirror)]",
          "after:absolute after:inset-0 after:border after:border-white/20",
          "hover:brightness-110"
        ].join(" "),
        purple: [
          "bg-premium-purple text-white",
          "before:absolute before:inset-0 before:bg-[var(--btn-mirror)]",
          "after:absolute after:inset-0 after:border after:border-white/20",
          "hover:brightness-110"
        ].join(" "),
        ghost: "hover:bg-primary/10 hover:text-primary tracking-widest",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-12 px-8 py-3",
        sm: "h-10 rounded-sm px-4",
        lg: "h-14 rounded-sm px-10 text-base",
        icon: "h-12 w-12",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };

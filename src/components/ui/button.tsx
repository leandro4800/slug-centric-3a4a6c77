import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-sm text-sm font-bold uppercase tracking-wider ring-offset-background transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 relative overflow-hidden active:scale-[0.98]",
  {
    variants: {
      variant: {
        default: [
          "bg-primary text-primary-foreground shadow-glow",
          "before:absolute before:inset-0 before:bg-[var(--btn-gloss)] before:pointer-events-none",
          "after:absolute after:inset-0 after:border after:border-[var(--btn-border)] after:rounded-sm after:pointer-events-none",
          "hover:bg-primary-glow hover:shadow-[0_0_30px_-5px_hsl(var(--primary-glow)/0.8)] hover:-translate-y-0.5"
        ].join(" "),
        destructive: [
          "bg-destructive text-destructive-foreground",
          "before:absolute before:inset-0 before:bg-[var(--btn-gloss)]",
          "hover:bg-destructive/90"
        ].join(" "),
        outline: "border-2 border-primary bg-transparent text-primary hover:bg-primary hover:text-primary-foreground hover:shadow-glow",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80 border border-white/10",
        ghost: "hover:bg-primary/10 hover:text-primary",
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

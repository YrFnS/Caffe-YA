import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "bg-gradient-to-br from-primary to-primary-dim text-on-primary",
        destructive:
          "bg-tertiary text-on-primary hover:bg-tertiary-fixed-dim",
        outline:
          "border border-outline-variant/50 bg-transparent hover:bg-surface-container-high",
        secondary:
          "bg-surface-container-high text-on-surface hover:bg-surface-container-high/80",
        ghost: "hover:bg-surface-container-high text-on-surface-variant",
        link: "text-primary underline-offset-4 hover:underline",
        success:
          "bg-secondary text-on-primary hover:bg-secondary/90",
      },
      size: {
        default: "h-14 px-6 py-3",
        sm: "h-11 px-4 text-sm",
        lg: "h-16 px-8",
        icon: "h-12 w-12",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => {
    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
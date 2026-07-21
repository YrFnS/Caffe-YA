import * as React from "react"
import { cn } from "@/lib/utils"

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, label, ...props }, ref) => {
    return (
      <div className="flex flex-col gap-1">
        {label && (
          <label className="text-sm font-medium text-on-surface">{label}</label>
        )}
        <input
          type={type}
          className={cn(
            "flex h-11 w-full rounded-xl border border-outline-variant bg-white px-3 py-2 text-sm shadow-sm transition placeholder:text-on-surface-disabled focus:border-secondary focus:outline-none focus:ring-4 focus:ring-secondary/10 disabled:cursor-not-allowed disabled:opacity-50",
            className
          )}
          ref={ref}
          {...props}
        />
      </div>
    )
  }
)
Input.displayName = "Input"

export { Input }

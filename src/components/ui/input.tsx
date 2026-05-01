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
            "flex h-12 w-full rounded-none border-b-2 border-outline bg-surface-container-highest px-3 py-2 text-sm transition-colors placeholder:text-on-surface-disabled focus:border-outline focus:outline-none disabled:cursor-not-allowed disabled:opacity-50",
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
import * as React from 'react'
import { cn } from '@/lib/utils'

export interface SelectOption {
  value: string
  label: string
}

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  options: SelectOption[]
  label?: string
  placeholder?: string
}

const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, options, label, placeholder, id, ...props }, ref) => {
    const generatedId = React.useId()
    const selectId = id ?? generatedId

    return (
      <div className="flex flex-col gap-1">
        {label && <label htmlFor={selectId} className="text-sm font-medium text-on-surface">{label}</label>}
        <select
          id={selectId}
          className={cn(
            'min-h-12 w-full rounded-xl border border-outline-variant bg-surface-container-lowest px-4 text-base text-on-surface outline-none focus:border-secondary focus:ring-4 focus:ring-secondary/10 disabled:cursor-not-allowed disabled:opacity-50',
            className,
          )}
          ref={ref}
          {...props}
        >
          {placeholder && <option value="" disabled>{placeholder}</option>}
          {options.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
        </select>
      </div>
    )
  },
)
Select.displayName = 'Select'

export { Select }

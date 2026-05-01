import * as React from "react"
import { cn } from "@/lib/utils"
import { useSearchParams } from "next/navigation"

export interface TableColumn<T> {
  key: string
  label: string
  sortable?: boolean
  render?: (row: T) => React.ReactNode
}

export interface TableProps<T> {
  columns: TableColumn<T>[]
  data: T[]
  loading?: boolean
  emptyMessage?: string
  onSort?: (key: string, dir: "asc" | "desc") => void
}

function Table<T>({
  columns,
  data,
  loading,
  emptyMessage = "No results",
  onSort,
}: TableProps<T>) {
  const searchParams = useSearchParams()
  const sortKey = searchParams.get("sort")
  const sortDir = searchParams.get("dir") as "asc" | "desc" | null

  const handleSort = (key: string, col: TableColumn<T>) => {
    if (!col.sortable) return
    const newDir = sortKey === key && sortDir === "asc" ? "desc" : "asc"
    onSort?.(key, newDir)
  }

  if (loading) {
    return (
      <div className="flex h-32 items-center justify-center">
        <span className="text-on-surface-variant">Loading...</span>
      </div>
    )
  }

  if (data.length === 0) {
    return (
      <div className="flex h-32 items-center justify-center">
        <span className="text-on-surface-variant">{emptyMessage}</span>
      </div>
    )
  }

  return (
    <div className="w-full overflow-auto">
      <table className="w-full border-collapse">
        <thead>
          <tr className="border-b border-outline">
            {columns.map((col) => (
              <th
                key={col.key}
                className={cn(
                  "px-4 py-3 text-left text-sm font-medium text-on-surface-variant",
                  col.sortable && "cursor-pointer select-none hover:text-on-surface"
                )}
                onClick={() => handleSort(col.key, col)}
              >
                <span className="flex items-center gap-1">
                  {col.label}
                  {col.sortable && sortKey === col.key && (
                    <span>{sortDir === "asc" ? " ↑" : " ↓"}</span>
                  )}
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, i) => (
            <tr
              key={i}
              className="border-b border-outline hover:bg-surface-container-high/50"
            >
              {columns.map((col) => (
                <td key={col.key} className="px-4 py-3 text-sm text-on-surface">
                  {col.render
                    ? col.render(row)
                    : (row as Record<string, unknown>)[col.key] as React.ReactNode ?? "—"}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export { Table }
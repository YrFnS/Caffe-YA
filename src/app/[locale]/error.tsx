"use client"

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] p-8">
      <h2 className="text-xl font-semibold text-error mb-4">Something went wrong!</h2>
      <p className="text-on-surface-variant mb-4">{error.message}</p>
      <button
        type="button"
        onClick={() => reset()}
        className="px-4 py-2 bg-primary text-on-primary rounded-lg hover:bg-primary-dim"
      >
        Try again
      </button>
    </div>
  )
}
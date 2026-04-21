"use client"

export default function Error({ reset }: { reset: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center h-64 text-center">
      <p className="text-body-lg text-tertiary mb-4">Something went wrong</p>
      <button
        onClick={reset}
        className="px-4 py-2 bg-primary text-on-primary rounded-lg font-medium"
      >
        Retry
      </button>
    </div>
  )
}

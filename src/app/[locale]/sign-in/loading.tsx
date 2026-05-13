export default function Loading() {
  return (
    <div className="min-h-screen bg-surface flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="h-10 w-48 bg-surface-container-high rounded mx-auto mb-2" />
          <div className="h-5 w-32 bg-surface-container-high rounded mx-auto" />
        </div>
        <div className="bg-surface-container-lowest rounded-2xl p-6 shadow-lg">
          <div className="space-y-4 animate-pulse">
            <div className="h-10 bg-surface-container-low rounded" />
            <div className="h-10 bg-surface-container-low rounded" />
            <div className="h-12 bg-primary/20 rounded-lg mt-6" />
          </div>
        </div>
      </div>
    </div>
  )
}
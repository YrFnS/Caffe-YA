export default function Loading() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="h-8 w-48 bg-surface-container-low rounded-lg" />
      <div className="h-24 bg-surface-container-low rounded-xl" />
      <div className="h-12 bg-surface-container-low rounded-xl" />
      <div className="h-64 bg-surface-container-low rounded-xl" />
    </div>
  )
}
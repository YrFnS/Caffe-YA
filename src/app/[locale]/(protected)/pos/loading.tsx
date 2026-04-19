export default function POSLoading() {
  return (
    <div className="flex gap-6 h-full">
      {/* Product grid skeleton */}
      <div className="flex-1 space-y-4">
        <div className="flex gap-2 overflow-hidden">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-10 w-24 bg-surface-container-low rounded-full animate-pulse" />
          ))}
        </div>
        <div className="grid grid-cols-4 gap-4">
          {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
            <div key={i} className="h-32 bg-surface-container-low rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
      {/* Order summary skeleton */}
      <div className="w-80 bg-surface-container-lowest rounded-lg animate-pulse" />
    </div>
  )
}
export default function Loading() {
  return (
    <div className="animate-pulse">
      <div className="h-8 bg-surface-container-high rounded w-32 mb-6"></div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-surface-container-lowest p-6 rounded-lg">
            <div className="h-4 bg-surface-container-high w-24 rounded mb-2"></div>
            <div className="h-8 bg-surface-container-high w-32 rounded mt-4"></div>
          </div>
        ))}
      </div>
    </div>
  )
}
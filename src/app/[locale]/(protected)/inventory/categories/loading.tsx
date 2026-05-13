export default function Loading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-9 w-48 bg-surface-container-low rounded-lg" />
      <div className="border border-outline rounded-xl overflow-hidden">
        <div className="bg-surface-container-lowest">
          <div className="h-12 bg-surface-container-low border-b border-outline" />
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-16 border-b border-outline last:border-b-0" />
          ))}
        </div>
      </div>
    </div>
  )
}
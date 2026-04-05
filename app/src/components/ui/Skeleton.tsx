interface Props {
  className?: string
}

export function SkeletonLine({ className = '' }: Props) {
  return <div className={`skeleton h-4 ${className}`} />
}

export function SkeletonCircle({ className = '' }: Props) {
  return <div className={`skeleton rounded-full ${className}`} />
}

export function TrackerSkeleton() {
  return (
    <div className="animate-pulse-soft">
      {/* Hero */}
      <div className="text-center py-6 px-5">
        <div className="skeleton h-8 w-24 mx-auto mb-4 rounded-full" />
        <div className="skeleton h-14 w-40 mx-auto mb-2" />
        <div className="skeleton h-4 w-32 mx-auto" />
      </div>

      {/* Grid */}
      <div className="px-5">
        <div className="grid grid-cols-3 gap-3">
          {Array.from({ length: 9 }).map((_, i) => (
            <div key={i} className="skeleton aspect-square rounded-lg" />
          ))}
        </div>
      </div>
    </div>
  )
}

export function HistorySkeleton() {
  return (
    <div className="animate-pulse-soft px-5 space-y-2 mt-4">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="skeleton h-16 rounded-lg" />
      ))}
    </div>
  )
}

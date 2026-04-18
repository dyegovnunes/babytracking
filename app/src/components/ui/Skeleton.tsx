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

/**
 * Fallback genérico pra Suspense de rotas lazy — usado enquanto o chunk JS
 * da página baixa, antes do skeleton específico da página montar. Evita o
 * flash de spinner roxo girando.
 */
export function RouteFallbackSkeleton() {
  return (
    <div className="min-h-screen bg-surface animate-pulse-soft">
      <PageHeaderSkeleton />
      <div className="px-5 space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="skeleton h-20 rounded-xl" />
        ))}
      </div>
    </div>
  )
}

/**
 * Skeleton genérico para um título de página + subtítulo (eyebrow).
 * Usado como cabeçalho de skeletons que reproduzem a forma da tela.
 */
function PageHeaderSkeleton() {
  return (
    <div className="px-5 pt-6 pb-4">
      <div className="skeleton h-7 w-40 mb-2" />
      <div className="skeleton h-4 w-52" />
    </div>
  )
}

export function InsightsSkeleton() {
  return (
    <div className="animate-pulse-soft">
      <PageHeaderSkeleton />
      {/* DaySummaryCard */}
      <div className="px-5 mb-3">
        <div className="skeleton h-32 rounded-xl" />
      </div>
      {/* Period dropdown */}
      <div className="px-5 mb-4">
        <div className="skeleton h-10 w-36 rounded-full" />
      </div>
      {/* Chart */}
      <div className="px-5 mb-4">
        <div className="skeleton h-48 rounded-xl" />
      </div>
      {/* Insight cards */}
      <div className="px-5 space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="skeleton h-24 rounded-lg" />
        ))}
      </div>
    </div>
  )
}

export function VaccinesSkeleton() {
  return (
    <div className="animate-pulse-soft">
      <PageHeaderSkeleton />
      {/* Progress card */}
      <div className="px-5 mb-4">
        <div className="skeleton h-20 rounded-xl" />
      </div>
      {/* Lista de grupos de idade */}
      <div className="px-5 space-y-4">
        {Array.from({ length: 3 }).map((_, g) => (
          <div key={g}>
            <div className="skeleton h-4 w-28 mb-2" />
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="skeleton h-14 rounded-lg" />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export function MilestonesSkeleton() {
  return (
    <div className="animate-pulse-soft">
      <PageHeaderSkeleton />
      {/* Progress */}
      <div className="px-5 mb-4">
        <div className="skeleton h-20 rounded-xl" />
      </div>
      {/* Categorias */}
      <div className="px-5 space-y-4">
        {Array.from({ length: 4 }).map((_, c) => (
          <div key={c}>
            <div className="skeleton h-4 w-36 mb-2" />
            <div className="grid grid-cols-2 gap-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="skeleton h-16 rounded-lg" />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export function MedicationsSkeleton() {
  return (
    <div className="animate-pulse-soft">
      <PageHeaderSkeleton />
      {/* CTA adicionar */}
      <div className="px-5 mb-4">
        <div className="skeleton h-12 rounded-full" />
      </div>
      {/* Cards de medicamentos */}
      <div className="px-5 space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="skeleton h-24 rounded-xl" />
        ))}
      </div>
    </div>
  )
}

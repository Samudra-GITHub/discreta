import type { FeatureStatus } from '../types'

const LABELS: Record<FeatureStatus, string> = {
  planned: 'Planned',
  'in-progress': 'In progress',
  available: 'Available',
}

const TONES: Record<FeatureStatus, string> = {
  planned: 'aurora-chip text-fg-muted',
  'in-progress': 'border border-warn/30 bg-warn/10 text-warn',
  available: 'border border-ok/30 bg-ok/10 text-ok',
}

export function StatusBadge({ status }: { status: FeatureStatus }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-bold tracking-wide uppercase ${TONES[status]}`}
    >
      {LABELS[status]}
    </span>
  )
}

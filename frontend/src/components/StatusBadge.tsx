import type { FeatureStatus } from '../types'

const LABELS: Record<FeatureStatus, string> = {
  planned: 'Planned',
  'in-progress': 'In progress',
  available: 'Available',
}

const TONES: Record<FeatureStatus, string> = {
  planned: 'border-line-strong text-fg-muted',
  'in-progress': 'border-warn/40 text-warn',
  available: 'border-ok/40 text-ok',
}

export function StatusBadge({ status }: { status: FeatureStatus }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium tracking-wide uppercase ${TONES[status]}`}
    >
      {LABELS[status]}
    </span>
  )
}

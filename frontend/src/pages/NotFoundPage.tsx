import { Link } from 'react-router-dom'
import { PageHeader } from '../components/PageHeader'

export function NotFoundPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="404"
        title="Page not found"
        description="There is nothing at this address."
      />
      <Link to="/" className="inline-block text-sm text-accent hover:text-accent-strong">
        Back to the dashboard
      </Link>
    </div>
  )
}

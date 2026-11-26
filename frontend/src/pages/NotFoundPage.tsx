import { Link } from 'react-router-dom'
import { PageHeader } from '../components/ui'
import { OVERVIEW_PATH, WORKSPACE_PATH } from '../layouts/navigation'

export function NotFoundPage() {
  return (
    <>
      <PageHeader eyebrow="404" title="Page not found">
        There is nothing at this address.
      </PageHeader>
      <div className="flex flex-wrap gap-3">
        <Link to={WORKSPACE_PATH} className="btn btn-primary no-underline">
          Open Cipher Workspace
        </Link>
        <Link to={OVERVIEW_PATH} className="btn no-underline">
          Go to Overview
        </Link>
      </div>
    </>
  )
}

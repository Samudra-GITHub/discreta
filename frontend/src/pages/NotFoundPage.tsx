import { ArrowRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { PageHero } from '../components/PageHero'
import { Sculpture } from '../components/sculpture/Sculpture'

export function NotFoundPage() {
  return (
    <PageHero
      eyebrow="404"
      title="Page not found"
      description="There is nothing at this address."
      illustration={<Sculpture shape="orb" className="mx-auto max-w-xs" />}
    >
      <Link
        to="/"
        className="aurora-primary inline-flex h-11 items-center gap-2 rounded-full px-5 text-sm font-bold transition-transform duration-200 hover:-translate-y-0.5"
      >
        Back to the dashboard
        <ArrowRight aria-hidden="true" className="size-4" />
      </Link>
    </PageHero>
  )
}

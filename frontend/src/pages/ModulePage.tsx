import { useParams } from 'react-router-dom'
import { PlannedFeaturePage } from '../components/PlannedFeaturePage'
import { getLabModule } from '../modules'
import { NotFoundPage } from './NotFoundPage'

/** Generic overview page for any of the five mathematical modules. */
export function ModulePage() {
  const { moduleId } = useParams()
  const module = getLabModule(moduleId)

  if (!module) return <NotFoundPage />

  return (
    <PlannedFeaturePage
      eyebrow="Mathematical module"
      title={module.title}
      description={module.description}
      planned={module.topics.map((topic) => ({
        title: topic,
        detail: 'Interactive exploration to be designed and verified against SymPy.',
      }))}
      foundations={module.foundations}
    />
  )
}

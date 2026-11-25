import { Binary } from 'lucide-react'
import type { LabModule } from '../../types'

export const logicModule: LabModule = {
  id: 'logic',
  title: 'Logic',
  studioName: 'Logic Studio',
  symbol: 'p ∧ q',
  tagline: 'Propositions, truth tables and proof.',
  description:
    'Propositional and predicate logic: the formal language used to state and prove every other result in discrete mathematics.',
  topics: [
    'Propositions and logical connectives',
    'Truth tables and logical equivalence',
    'Tautologies, contradictions and normal forms',
    'Predicates and quantifiers',
    'Rules of inference and proof techniques',
  ],
  foundations: [
    'A compound proposition with n variables has 2ⁿ truth assignments.',
    'Two propositions are equivalent when their truth tables agree on every assignment.',
  ],
  icon: Binary,
  status: 'planned',
}

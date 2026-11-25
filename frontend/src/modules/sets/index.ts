import { Shapes } from 'lucide-react'
import type { LabModule } from '../../types'

export const setsModule: LabModule = {
  id: 'sets',
  title: 'Sets',
  studioName: 'Set Explorer',
  symbol: 'A ∪ B',
  tagline: 'Sets, relations and functions.',
  description:
    'Finite sets and the structures built on them: relations, equivalence classes, partial orders and functions.',
  topics: [
    'Set operations and Venn diagrams',
    'Power sets and Cartesian products',
    'Relations and their properties',
    'Equivalence relations and partitions',
    'Functions: injective, surjective, bijective',
  ],
  foundations: [
    'A finite set with n elements has 2ⁿ subsets.',
    'Equivalence relations on a set correspond exactly to its partitions.',
  ],
  icon: Shapes,
  status: 'planned',
}

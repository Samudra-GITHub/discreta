import { Dices } from 'lucide-react'
import type { LabModule } from '../../types'

export const combinatoricsModule: LabModule = {
  id: 'combinatorics',
  title: 'Combinatorics',
  symbol: 'C(n, k)',
  tagline: 'Counting, arrangements and recurrences.',
  description:
    'The art of counting without listing: permutations, combinations, inclusion–exclusion and recurrence relations.',
  topics: [
    'Rule of sum and rule of product',
    'Permutations and combinations',
    'Binomial coefficients and Pascal’s triangle',
    'Inclusion–exclusion principle',
    'Recurrence relations',
  ],
  foundations: [
    'C(n, k) = n! / (k! (n − k)!) counts the k-element subsets of an n-element set.',
    'Key-space size drives brute-force cost: a 26-letter substitution cipher has 26! keys.',
  ],
  icon: Dices,
  status: 'planned',
}

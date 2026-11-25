import { Sigma } from 'lucide-react'
import type { LabModule } from '../../types'

export const algebraModule: LabModule = {
  id: 'algebra',
  title: 'Algebra',
  studioName: 'Algebra Lab',
  symbol: 'ℤₙ',
  tagline: 'Modular arithmetic and algebraic structures.',
  description:
    'Number theory and abstract algebra: the arithmetic that classical ciphers, and later public-key cryptography, are built on.',
  topics: [
    'Divisibility and the Euclidean algorithm',
    'Congruences and modular arithmetic',
    'Modular inverses and the units of ℤₙ',
    'Groups, rings and fields',
    'Applications to ciphers',
  ],
  foundations: [
    'a has a multiplicative inverse in ℤₙ exactly when gcd(a, n) = 1.',
    'The Caesar, affine and Vigenère ciphers are all arithmetic in ℤ₂₆.',
  ],
  icon: Sigma,
  status: 'in-progress',
}

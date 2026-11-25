import type { JSX } from 'react'
import {
  AlgebraIllustration,
  CombinatoricsIllustration,
  FrequencyIllustration,
  GraphIllustration,
  HeroOrb,
  JourneyIllustration,
  LogicIllustration,
  QuietOrb,
  SetsIllustration,
  TheoryIllustration,
} from '../illustrations'
import { SculptureCanvas } from './SculptureCanvas'
import type { SculptureShape } from './shaders'

const FALLBACKS: Record<SculptureShape, () => JSX.Element> = {
  dashboard: HeroOrb,
  logic: LogicIllustration,
  sets: SetsIllustration,
  combinatorics: CombinatoricsIllustration,
  graphs: GraphIllustration,
  algebra: AlgebraIllustration,
  frequency: FrequencyIllustration,
  journey: JourneyIllustration,
  theory: TheoryIllustration,
  orb: QuietOrb,
}

const LABELS: Record<SculptureShape, string> = {
  dashboard: 'Decorative 3D sculpture: a fluid, iridescent ring',
  logic: 'Decorative 3D sculpture: an AND gate with two input pegs and an output peg',
  sets: 'Decorative 3D sculpture: three interlocked rings in a Venn arrangement',
  combinatorics: 'Decorative 3D sculpture: three layers on which three spheres stand in different orders',
  graphs: 'Decorative 3D sculpture: spheres joined by rods to form a graph',
  algebra: 'Decorative 3D sculpture: a ring of 26 beads for the integers modulo 26',
  frequency: 'Decorative 3D sculpture: bars for the twelve most common English letters',
  journey: 'Decorative 3D sculpture: two spheres joined by an arc with a floating glass card',
  theory: 'Decorative 3D sculpture: stacked slabs for the steps of a proof',
  orb: 'Decorative 3D sculpture: a fluid iridescent sphere',
}

/**
 * The focal 3D form of a page: a small WebGL sculpture, or its static SVG fallback when WebGL
 * is not available. One per page, so the effect stays rare and the interface stays calm.
 */
export function Sculpture({ shape, className = '' }: { shape: SculptureShape; className?: string }) {
  const Fallback = FALLBACKS[shape]
  return (
    <div className={`aurora-float ${className}`}>
      <SculptureCanvas shape={shape} label={LABELS[shape]} fallback={<Fallback />} />
    </div>
  )
}

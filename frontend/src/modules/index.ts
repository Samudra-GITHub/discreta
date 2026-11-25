import type { LabModule, ModuleId } from '../types'
import { algebraModule } from './algebra'
import { combinatoricsModule } from './combinatorics'
import { graphsModule } from './graphs'
import { logicModule } from './logic'
import { setsModule } from './sets'

/**
 * The five mathematical laboratories, in display order.
 * To add a module: create `modules/<name>/index.ts` and register it here.
 */
export const labModules: readonly LabModule[] = [
  logicModule,
  setsModule,
  combinatoricsModule,
  graphsModule,
  algebraModule,
]

export function getLabModule(id: string | undefined): LabModule | undefined {
  return labModules.find((m) => m.id === (id as ModuleId))
}

export function labPath(id: ModuleId): string {
  return `/labs/${id}`
}

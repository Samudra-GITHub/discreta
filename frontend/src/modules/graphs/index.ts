import { Network } from 'lucide-react'
import type { LabModule } from '../../types'

export const graphsModule: LabModule = {
  id: 'graphs',
  title: 'Graphs',
  studioName: 'Graph Lab',
  symbol: 'G = (V, E)',
  tagline: 'Vertices, edges, paths and trees.',
  description:
    'Graph theory as a model of networks: representation, connectivity, traversal and shortest paths.',
  topics: [
    'Directed and undirected graphs',
    'Adjacency matrices and lists',
    'Paths, cycles and connectivity',
    'Trees and spanning trees',
    'Traversal and shortest-path algorithms',
  ],
  foundations: [
    'In any graph, the sum of vertex degrees equals twice the number of edges.',
    'A tree on n vertices has exactly n − 1 edges.',
  ],
  icon: Network,
  status: 'planned',
}

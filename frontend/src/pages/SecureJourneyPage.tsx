import {
  Background,
  MarkerType,
  Position,
  ReactFlow,
  type Edge,
  type Node,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { PlannedFeaturePage } from '../components/PlannedFeaturePage'
import { Sculpture } from '../components/sculpture/Sculpture'
import { Tile } from '../components/Tile'

function stage(title: string, detail: string) {
  return (
    <div className="px-1 py-0.5 text-center">
      <p className="text-xs font-bold text-fg">{title}</p>
      <p className="mt-0.5 text-[10px] leading-tight font-semibold text-fg-muted">{detail}</p>
    </div>
  )
}

const nodeStyle = { width: 132, padding: 8 }

const { Left, Right, Top, Bottom } = Position

// Sender on the top row (left to right), receiver on the bottom row (right to left).
const nodes: Node[] = [
  { id: 'plain', position: { x: 0, y: 0 }, sourcePosition: Right, data: { label: stage('Plaintext', 'HELLO') } },
  { id: 'encode', position: { x: 170, y: 0 }, sourcePosition: Right, targetPosition: Left, data: { label: stage('Encode', 'letters → ℤ₂₆') } },
  { id: 'encrypt', position: { x: 340, y: 0 }, sourcePosition: Bottom, targetPosition: Left, data: { label: stage('Encrypt', 'apply key') } },
  { id: 'channel', position: { x: 340, y: 120 }, sourcePosition: Left, targetPosition: Top, data: { label: stage('Channel', 'ciphertext in transit') } },
  { id: 'decrypt', position: { x: 170, y: 120 }, sourcePosition: Left, targetPosition: Right, data: { label: stage('Decrypt', 'inverse of key') } },
  { id: 'decode', position: { x: 0, y: 120 }, targetPosition: Right, data: { label: stage('Decode', 'ℤ₂₆ → letters') } },
].map((n) => ({
  ...n,
  style: nodeStyle,
  draggable: false,
  connectable: false,
  selectable: false,
  focusable: false,
}))

const link = (source: string, target: string): Edge => ({
  id: `${source}-${target}`,
  source,
  target,
  type: 'straight',
  markerEnd: { type: MarkerType.ArrowClosed },
  focusable: false,
})

const edges: Edge[] = [
  link('plain', 'encode'),
  link('encode', 'encrypt'),
  link('encrypt', 'channel'),
  link('channel', 'decrypt'),
  link('decrypt', 'decode'),
]

export default function SecureJourneyPage() {
  return (
    <PlannedFeaturePage
      eyebrow="Cryptography"
      title="Secure Message Journey"
      description="A guided walk through the life of one message: encoded as numbers, encrypted, sent, then decrypted. Each stage will show the mathematics applied to your text."
      illustration={<Sculpture shape="journey" />}
      planned={[
        {
          title: 'Step-by-step walkthrough',
          detail: 'Advance one stage at a time and inspect the message in each representation.',
        },
        {
          title: 'Live mathematics',
          detail: 'Show the exact computation, such as (x + k) mod 26, for every letter.',
        },
        {
          title: 'Interceptor view',
          detail: 'See what an eavesdropper observes, and what frequency analysis can recover.',
        },
      ]}
    >
      <Tile title="Planned stages" rise={1}>
        <p className="-mt-1 mb-3 text-sm font-medium text-fg-muted">
          A static outline of the pipeline. No message is encrypted or transmitted here.
        </p>
        <div
          role="img"
          aria-label="Pipeline: plaintext, encode, encrypt, channel, decrypt, decode"
          className="discreta-flow aurora-inset h-[300px] overflow-hidden rounded-2xl"
        >
          <ReactFlow
            nodes={nodes}
            edges={edges}
            fitView
            fitViewOptions={{ padding: 0.2 }}
            nodesDraggable={false}
            nodesConnectable={false}
            elementsSelectable={false}
            panOnDrag={false}
            zoomOnScroll={false}
            zoomOnPinch={false}
            zoomOnDoubleClick={false}
            preventScrolling={false}
          >
            <Background gap={24} color="var(--color-line-strong)" />
          </ReactFlow>
        </div>
      </Tile>
    </PlannedFeaturePage>
  )
}

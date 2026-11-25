import { LockOpen, Lock, RotateCw, Spline } from 'lucide-react'
import { CipherDisc, type DiscState } from '../components/cipher/CipherDisc'
import { ConnectionNotice } from '../components/cipher/ConnectionNotice'
import { FormulaPanel } from '../components/cipher/FormulaPanel'
import { KeyGauge } from '../components/cipher/KeyGauge'
import { KeyPanel } from '../components/cipher/KeyPanel'
import { MappingChart } from '../components/cipher/MappingChart'
import { MathExplainer } from '../components/cipher/MathExplainer'
import { MessagePanel } from '../components/cipher/MessagePanel'
import { ResultPanel } from '../components/cipher/ResultPanel'
import { RunButton } from '../components/cipher/RunButton'
import { Segmented, type SegmentedOption } from '../components/cipher/Segmented'
import { Tile } from '../components/Tile'
import { WorkedExample } from '../components/cipher/WorkedExample'
import { mod26, operationMap } from '../modules/algebra/cipherMath'
import { useCipherLab } from '../modules/algebra/useCipherLab'
import type { CipherId, CipherOperation } from '../types/cipher'

const CIPHERS: readonly SegmentedOption<CipherId>[] = [
  { value: 'caesar', label: 'Caesar', icon: RotateCw, description: 'Shift every letter by k places. 26 keys.' },
  { value: 'affine', label: 'Affine', icon: Spline, description: 'Multiply by a, then shift by b. 312 keys.' },
]

const OPERATIONS: readonly SegmentedOption<CipherOperation>[] = [
  { value: 'encrypt', label: 'Encrypt', icon: Lock },
  { value: 'decrypt', label: 'Decrypt', icon: LockOpen },
]

/** Sections that share one surface are told apart by a hairline instead of a box each. */
const SECTIONS = '[&>*+*]:mt-5 [&>*+*]:border-t [&>*+*]:border-line [&>*+*]:pt-5'

export function CipherLabPage() {
  const lab = useCipherLab()
  const { inputs, validation } = lab

  const map = validation.params ? operationMap(validation.params, inputs.operation) : null
  const discState: DiscState = validation.params === null ? 'incomplete' : map === null ? 'invalid' : 'ready'

  let hubLabel = 'shift'
  let hubValue = '?'
  let keyCallout = 'Shift k = ?'
  let shift: number | null = null
  if (inputs.cipher === 'caesar') {
    if (validation.key.ok) {
      shift = mod26(validation.key.big)
      hubValue = String(shift)
      keyCallout = `Shift k = ${shift}`
    }
  } else {
    hubLabel = 'a·x + b'
    keyCallout = 'a, b = ?'
    if (validation.a.ok && validation.b.ok) {
      const a = mod26(validation.a.big)
      const b = mod26(validation.b.big)
      keyCallout = `a = ${a} · b = ${b}`
      hubValue = discState === 'ready' ? `${a}x+${b}` : '✕'
    }
  }

  return (
    <div className="@container mx-auto w-full max-w-[72rem]">
      <header className="aurora-rise mb-6 max-w-2xl">
        <p className="text-xs font-bold tracking-[0.16em] text-accent uppercase">Cipher Laboratory · arithmetic in ℤ₂₆</p>
        <h1 className="mt-1.5">
          <span className="block text-xl font-semibold text-fg-muted [font-family:var(--font-display)] sm:text-2xl">
            Turn a message into mathematics,
          </span>
          <span className="block text-3xl font-bold tracking-wide text-fg uppercase [font-family:var(--font-display)] sm:text-4xl">
            one letter at a time.
          </span>
        </h1>
        <p className="mt-2 text-sm font-medium text-fg-muted">
          Pick a cipher and a key, press the round button, and the backend does the arithmetic. Each step is explained with
          your own numbers.
        </p>
      </header>

      <div className="mb-5 empty:hidden">
        <ConnectionNotice />
      </div>

      <div className="grid grid-cols-[minmax(0,1fr)] gap-5 @3xl:grid-cols-2 @5xl:grid-cols-[17rem_minmax(0,1fr)_17rem] @5xl:items-start">
        <div className="space-y-5 @3xl:col-span-2 @5xl:col-span-1 @5xl:col-start-2 @5xl:row-start-1">
          <CipherDisc
            cipher={inputs.cipher}
            operation={inputs.operation}
            map={map}
            shift={shift}
            state={discState}
            hubLabel={hubLabel}
            hubValue={hubValue}
            keyCallout={keyCallout}
          />
          <div className="mx-auto w-full max-w-xs">
            <MappingChart map={map} connect={inputs.cipher === 'caesar'} flat />
          </div>
        </div>

        <div className={`aurora-tile aurora-rise p-5 ${SECTIONS} @5xl:col-start-1 @5xl:row-start-1`} style={{ '--rise-i': 1 } as React.CSSProperties}>
          <Tile flat title="Cipher">
            <Segmented label="Cipher" value={inputs.cipher} options={CIPHERS} onChange={lab.setCipher} layout="cards" />
          </Tile>
          <Tile flat title="Operation">
            <Segmented label="Operation" value={inputs.operation} options={OPERATIONS} onChange={lab.setOperation} />
          </Tile>
          <KeyPanel lab={lab} flat />
        </div>

        <div className={`aurora-tile aurora-rise p-5 ${SECTIONS} @5xl:col-start-3 @5xl:row-start-1`} style={{ '--rise-i': 2 } as React.CSSProperties}>
          <FormulaPanel lab={lab} flat />
          <KeyGauge lab={lab} flat />
        </div>
      </div>

      <div className="@container mt-5 grid grid-cols-[minmax(0,1fr)] gap-4 @3xl:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] @3xl:items-stretch">
        <MessagePanel lab={lab} />
        <RunButton lab={lab} />
        <ResultPanel lab={lab} />
      </div>

      <div className="mt-8 space-y-8">
        <WorkedExample lab={lab} flat />
        <MathExplainer lab={lab} flat />
      </div>
    </div>
  )
}

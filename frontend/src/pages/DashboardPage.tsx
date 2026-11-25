import { ArrowRight, Sparkles } from 'lucide-react'
import { Link } from 'react-router-dom'
import { BackendStatusCard } from '../components/BackendStatusCard'
import { ModuleCard } from '../components/ModuleCard'
import { PageHero } from '../components/PageHero'
import { Sculpture } from '../components/sculpture/Sculpture'
import { StatusBadge } from '../components/StatusBadge'
import { CIPHER_LAB_PATH, cryptoNavItems } from '../layouts/navigation'
import { labModules } from '../modules'

const CRYPTO_BLURBS: Record<string, string> = {
  'Cipher Laboratory': 'Classical ciphers as arithmetic in ℤ₂₆: encrypt, decrypt and reason about keys.',
  'Frequency Analyzer': 'Letter statistics and the attacks they enable on substitution ciphers.',
  'Secure Message Journey': 'Follow one message from plaintext to ciphertext and back.',
}

export function DashboardPage() {
  return (
    <div className="space-y-12">
      <PageHero
        eyebrow="Interactive laboratory"
        title="DISCRETA"
        description="Five mathematical modules on one platform. The Cipher Laboratory is open: it runs real Caesar and affine ciphers on the backend and explains each step with your own numbers."
        illustration={
          <div className="relative">
            <Sculpture shape="dashboard" />
            <Link
              to={CIPHER_LAB_PATH}
              className="group absolute right-0 bottom-2 flex items-center gap-3 rounded-2xl border border-white/70 bg-white/45 py-2.5 pr-3 pl-4 shadow-[0_18px_30px_-18px_rgb(66_56_150/0.55)] backdrop-blur-md transition-transform duration-300 ease-out-quart hover:-translate-y-0.5 sm:right-2"
            >
              <span className="flex size-8 items-center justify-center rounded-xl bg-linear-to-br from-iris-blue via-iris-violet to-iris-pink text-white">
                <Sparkles aria-hidden="true" className="size-4" />
              </span>
              <span className="leading-tight">
                <span className="block text-sm font-bold text-fg">Cipher Laboratory</span>
                <span className="block text-[11px] font-semibold text-fg-muted">Caesar · Affine · live backend</span>
              </span>
              <ArrowRight aria-hidden="true" className="size-4 text-fg-subtle transition-transform duration-200 group-hover:translate-x-0.5" />
            </Link>
          </div>
        }
      />

      <section aria-labelledby="modules-title">
        <div className="max-w-2xl px-1">
          <h2 id="modules-title" className="text-2xl font-bold tracking-wide text-fg [font-family:var(--font-display)]">
            Five mathematical modules
          </h2>
          <p className="mt-1 text-sm leading-relaxed font-medium text-fg-muted">
            Each module pairs a precise mathematical definition with an interactive tool. Algebra is in progress; the other
            four are planned.
          </p>
        </div>
        <div className="mt-5 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {labModules.map((module, index) => (
            <ModuleCard key={module.id} module={module} index={index} />
          ))}
        </div>
      </section>

      <section aria-labelledby="crypto-title">
        <div className="max-w-2xl px-1">
          <h2 id="crypto-title" className="text-2xl font-bold tracking-wide text-fg [font-family:var(--font-display)]">
            Cipher &amp; frequency analysis
          </h2>
          <p className="mt-1 text-sm leading-relaxed font-medium text-fg-muted">
            The chosen base topic. It draws on the algebra module for modular arithmetic and on combinatorics for key-space
            counting.
          </p>
        </div>
        <ul className="mt-5 grid gap-5 md:grid-cols-3">
          {cryptoNavItems.map((item) => {
            const Icon = item.icon
            return (
              <li key={item.to}>
                <Link
                  to={item.to}
                  className="group aurora-tile flex h-full flex-col p-5 transition-[transform,box-shadow] duration-300 ease-out-quart hover:-translate-y-1 hover:shadow-[inset_0_1px_0_rgb(255_255_255/0.9),0_26px_44px_-22px_rgb(66_56_150/0.55)]"
                >
                  <div className="flex items-start justify-between">
                    <Icon aria-hidden="true" className="size-6 text-accent" />
                    <StatusBadge status={item.to === CIPHER_LAB_PATH ? 'in-progress' : 'planned'} />
                  </div>
                  <h3 className="mt-4 text-xl font-bold tracking-wide text-fg [font-family:var(--font-display)]">{item.label}</h3>
                  <p className="mt-1.5 flex-1 text-sm leading-relaxed font-medium text-fg-muted">{CRYPTO_BLURBS[item.label]}</p>
                  <span className="mt-5 inline-flex items-center gap-1.5 text-xs font-bold text-fg-subtle transition-colors duration-200 group-hover:text-accent-strong">
                    Open
                    <ArrowRight aria-hidden="true" className="size-3.5 transition-transform duration-200 group-hover:translate-x-0.5" />
                  </span>
                </Link>
              </li>
            )
          })}
        </ul>
      </section>

      <div className="max-w-2xl">
        <BackendStatusCard rise={2} />
      </div>
    </div>
  )
}

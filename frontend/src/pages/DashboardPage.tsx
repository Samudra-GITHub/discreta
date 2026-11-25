import { ArrowRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { BackendStatusCard } from '../components/BackendStatusCard'
import { ModuleCard } from '../components/ModuleCard'
import { PageHeader } from '../components/PageHeader'
import { StatusBadge } from '../components/StatusBadge'
import { cryptoNavItems } from '../layouts/navigation'
import { labModules } from '../modules'

const CRYPTO_BLURBS: Record<string, string> = {
  'Cipher Laboratory': 'Classical ciphers as arithmetic in ℤ₂₆: encrypt, decrypt and reason about keys.',
  'Frequency Analyzer': 'Letter statistics and the attacks they enable on substitution ciphers.',
  'Secure Message Journey': 'Follow one message from plaintext to ciphertext and back.',
}

export function DashboardPage() {
  return (
    <div className="space-y-14">
      <div className="grid gap-8 lg:grid-cols-[1fr_22rem] lg:items-start">
        <PageHeader
          eyebrow="Interactive laboratory"
          title="DISCRETA"
          description={
            <>
              An interactive laboratory for discrete mathematics and cryptography. Five
              mathematical modules share one platform, and the first topic under construction is
              classical ciphers and frequency analysis.
            </>
          }
        />
        <BackendStatusCard />
      </div>

      <section aria-labelledby="modules-title">
        <div className="max-w-2xl">
          <h2 id="modules-title" className="text-xl font-semibold tracking-tight text-fg">
            Five mathematical modules
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-fg-muted">
            Each module will pair a precise mathematical definition with an interactive tool. This
            release provides the foundation only: none of the tools are functional yet.
          </p>
        </div>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {labModules.map((module) => (
            <ModuleCard key={module.id} module={module} />
          ))}
        </div>
      </section>

      <section aria-labelledby="crypto-title">
        <div className="max-w-2xl">
          <h2 id="crypto-title" className="text-xl font-semibold tracking-tight text-fg">
            Cipher &amp; frequency analysis
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-fg-muted">
            The chosen base topic. It draws on the algebra module for modular arithmetic and on
            combinatorics for key-space counting.
          </p>
        </div>
        <ul className="mt-6 grid gap-4 md:grid-cols-3">
          {cryptoNavItems.map((item) => {
            const Icon = item.icon
            return (
              <li key={item.to}>
                <Link
                  to={item.to}
                  className="group flex h-full flex-col rounded-xl border border-line bg-surface p-5 transition-colors duration-200 hover:border-line-strong hover:bg-raised"
                >
                  <div className="flex items-start justify-between">
                    <Icon aria-hidden="true" className="size-5 text-fg-muted" />
                    <StatusBadge status="planned" />
                  </div>
                  <h3 className="mt-4 text-base font-medium text-fg">{item.label}</h3>
                  <p className="mt-1.5 flex-1 text-sm leading-relaxed text-fg-muted">
                    {CRYPTO_BLURBS[item.label]}
                  </p>
                  <span className="mt-5 inline-flex items-center gap-1.5 text-xs text-fg-subtle transition-colors duration-200 group-hover:text-fg">
                    Open
                    <ArrowRight
                      aria-hidden="true"
                      className="size-3.5 transition-transform duration-200 group-hover:translate-x-0.5"
                    />
                  </span>
                </Link>
              </li>
            )
          })}
        </ul>
      </section>
    </div>
  )
}

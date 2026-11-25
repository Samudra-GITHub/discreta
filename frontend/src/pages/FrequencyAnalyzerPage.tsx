import { PlannedFeaturePage } from '../components/PlannedFeaturePage'

export function FrequencyAnalyzerPage() {
  return (
    <PlannedFeaturePage
      eyebrow="Cryptography"
      title="Frequency Analyzer"
      description="Natural language is statistically lopsided, and simple ciphers preserve that shape. The analyzer will make the statistics visible and show how they break a cipher."
      planned={[
        {
          title: 'Letter frequency histogram',
          detail: 'Count letters in a text and compare them with typical English frequencies.',
        },
        {
          title: 'Index of coincidence',
          detail: 'A single number that separates monoalphabetic from polyalphabetic ciphertext.',
        },
        {
          title: 'Caesar and affine attacks',
          detail: 'Rank candidate keys by how closely the decrypted text matches English.',
        },
        {
          title: 'Explained results',
          detail: 'Every guess accompanied by the statistic that produced it.',
        },
      ]}
      foundations={[
        'For a text of N letters with counts nᵢ, the index of coincidence is IC = Σ nᵢ(nᵢ − 1) / (N(N − 1)).',
        'English text has IC ≈ 0.066; uniformly random letters give 1/26 ≈ 0.038.',
        'Monoalphabetic ciphers permute letters but leave the frequency histogram’s shape unchanged.',
      ]}
    />
  )
}

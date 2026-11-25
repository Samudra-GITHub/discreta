import { PlannedFeaturePage } from '../components/PlannedFeaturePage'
import { Sculpture } from '../components/sculpture/Sculpture'

export function FrequencyAnalyzerPage() {
  return (
    <PlannedFeaturePage
      eyebrow="Cryptography"
      title="Frequency Analyzer"
      description="Natural language is statistically lopsided, and simple ciphers preserve that shape. The analyzer will make the statistics visible and show how they break a cipher."
      illustration={<Sculpture shape="frequency" />}
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
        'Monoalphabetic ciphers permute letters, so the frequencies are rearranged rather than removed: the histogram keeps its shape.',
        'The bars in the illustration are the typical English frequencies of the twelve most common letters, E T A O I N S H R D L U.',
      ]}
    />
  )
}

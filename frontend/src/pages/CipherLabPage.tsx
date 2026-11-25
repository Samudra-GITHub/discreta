import { PlannedFeaturePage } from '../components/PlannedFeaturePage'

export function CipherLabPage() {
  return (
    <PlannedFeaturePage
      eyebrow="Cryptography"
      title="Cipher Laboratory"
      description="Classical ciphers treated as what they are: functions on ℤ₂₆. The laboratory will let you encrypt and decrypt, and see exactly which key values are valid and why."
      planned={[
        {
          title: 'Caesar cipher',
          detail: 'Shift cipher with a key k in ℤ₂₆, including all 26 possible shifts.',
        },
        {
          title: 'Affine cipher',
          detail: 'Linear cipher with a key pair (a, b); only values of a coprime to 26 are valid.',
        },
        {
          title: 'Vigenère cipher',
          detail: 'Polyalphabetic cipher built from repeated Caesar shifts under a keyword.',
        },
        {
          title: 'Key-space reasoning',
          detail: 'Counting valid keys for each cipher and what that means for brute-force search.',
        },
      ]}
      foundations={[
        'Letters A–Z are encoded as the integers 0–25, elements of ℤ₂₆.',
        'Caesar: E(x) = (x + k) mod 26, D(y) = (y − k) mod 26.',
        'Affine: E(x) = (a·x + b) mod 26. Decryption needs a⁻¹ mod 26, which exists iff gcd(a, 26) = 1, so there are 12 valid choices of a and 12 × 26 = 312 affine keys.',
      ]}
    />
  )
}

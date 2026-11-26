# DISCRETA documentation

Documentation for **DISCRETA v1.0.0**, a classical cryptography and frequency analysis laboratory built by team
BugSquad (Samudra Kar and Shriyanshu Rout Roy). Start with the [project README](../README.md) for an overview; this folder holds the detail.

## Where to start

| If you want to… | Read |
| --- | --- |
| use the application | [User guide](user-guide.md) |
| install and run it | [Development setup](development/setup.md) |
| run the tests | [Testing](development/testing.md) |
| understand how it is built | [Architecture overview](architecture/overview.md), then [Data flow](architecture/data-flow.md) |
| call the API directly | [API reference](api.md) |
| understand the mathematics | [Mathematics notes](mathematics/README.md) |
| read the academic report | [Project report](report/PROJECT_REPORT.md) (also as a [PDF](report/DISCRETA_Project_Report.pdf)) and the [executive summary](report/EXECUTIVE_SUMMARY.md) |
| see what the interface looks like | the committed screenshots in [report/screenshots-v1.0.0](report/screenshots-v1.0.0/) |

## Contents

### Using DISCRETA
* [User guide](user-guide.md): encrypt and decrypt, frequency analysis, cracking Caesar, investigating affine keys,
  analysing Vigenère ciphertext, reading the index of coincidence and Kasiski results, moving results between the
  workspace and the Analysis Lab.

### Building and running
* [Development setup](development/setup.md): prerequisites, environment variables, backend and frontend start-up.
* [Testing](development/testing.md): the commands, what the suites cover and the independent oracles they use.

### Architecture
* [Overview](architecture/overview.md): modules, rules, frontend structure, known limitations.
* [Data flow](architecture/data-flow.md): requests, the shared session and the Vigenère investigation, with diagrams.
* [Design system](architecture/design-system.md): tokens, type, the floating taskbar, the background layer.
* [API reference](api.md): every endpoint, limit and error.

### Mathematics
One note per topic family; each includes worked examples taken from the implementation.

| Topic | Note |
| --- | --- |
| Caesar and affine ciphers, modular arithmetic, gcd, the extended Euclidean algorithm, modular inverses | [caesar-and-affine.md](mathematics/caesar-and-affine.md) |
| The Vigenère cipher | [vigenere.md](mathematics/vigenere.md) |
| Letter frequencies, English reference, χ², Caesar and affine key ranking | [frequency-analysis.md](mathematics/frequency-analysis.md) |
| Index of coincidence, Kasiski examination, Vigenère key-length and key recovery | [polyalphabetic-analysis.md](mathematics/polyalphabetic-analysis.md) |

### Report
* [Project report](report/PROJECT_REPORT.md): the academic report (and [PDF](report/DISCRETA_Project_Report.pdf)).
* [Executive summary](report/EXECUTIVE_SUMMARY.md): one page.
* [Release report](report/progress-report.md): the v1.0.0 release record.
* [Figures](report/figures/) and [screenshots](report/screenshots-v1.0.0/) used by the report.

## Conventions used in these documents

* Formulas are written in plain Unicode so they read the same on GitHub, in an editor and in the PDF.
* Letters are numbers in ℤ₂₆: `A = 0, B = 1, …, Z = 25`.
* "Measured" means counted directly from the text; "calculated" means derived from those counts by a formula;
  "suggestion" means a statistical estimate. No result in DISCRETA is presented as proof.

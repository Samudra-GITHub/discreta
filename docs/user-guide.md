# User guide

How to use DISCRETA v1.0.0. The application has four destinations, reached from the floating taskbar at the bottom of
the screen: **Overview**, **Cipher Workspace**, **Analysis Lab** and **Settings**. To run it locally see
[Development setup](development/setup.md).

> DISCRETA works on classical ciphers for study and experiment. They are **not secure** and must not protect real data.
> Every analysis result is a statistical estimate, not proof.

## The two main places

| Place | Use it to |
| --- | --- |
| **Cipher Workspace** | encrypt or decrypt a message with the Caesar, affine or Vigenère cipher |
| **Analysis Lab** | study a ciphertext: letter frequencies, ranked keys, and the Vigenère investigation |

Both share one session while the tab is open, so a result can move from one to the other without retyping. Nothing is
saved: closing the tab ends the session. Nothing is sent to the backend while you type; work happens only when you press
a button.

## 1. Encrypt a message

1. Open **Cipher Workspace**.
2. Under **Method** choose **Caesar**, **Affine** or **Vigenère**. Under **Operation** choose **Encrypt**.
3. Set the key (see below).
4. Type or paste the text in the **Plaintext** box. Only the letters A–Z and a–z change; case, spaces, digits and
   punctuation are kept.
5. Press **Encrypt message** (or Ctrl+Enter in the box). The **Result** panel shows the ciphertext, a summary of the key
   used, and the first three letters worked out step by step, checked against the backend's output.

The panel above the message shows the one formula that applies to your choice, with your key filled in.

| Cipher | Key controls |
| --- | --- |
| Caesar | **Shift k**: type any whole number (negative and very large values are reduced mod 26), use − and +, or the slider from 0 to 25 |
| Affine | **Multiplier a** and **Offset b**. Only 12 multipliers are valid (1, 3, 5, 7, 9, 11, 15, 17, 19, 21, 23, 25); click one, or type a number. An invalid *a* is explained with two letters that would collide, and nothing is sent |
| Vigenère | **Keyword**: 1 to 64 letters only. A line shows how the keyword repeats over your letters; spaces and punctuation are skipped |

Limits: text up to 10,000 characters; Caesar and affine keys within ±9007199254740991 (2⁵³ − 1).

## 2. Decrypt a message

Choose **Decrypt**, enter the same key, paste the **Ciphertext** and press **Decrypt message**. For the affine cipher the
formula then shows the modular inverse a⁻¹ that the backend computed.

To check a round trip, press **Swap into input** under an encryption result: the output becomes the input and the
operation flips to Decrypt, so one more press returns the original text.

Other result actions: **Copy output**, **Clear** (empties the message and result), and **Paste** in the message toolbar.
If you change the message or key after a result, the result stays visible but is marked *Out of date*.

## 3. Perform frequency analysis

1. Open **Analysis Lab** and stay on **Frequency Analysis**.
2. Paste ciphertext in the **Ciphertext** box (or send it from the workspace, see section 8).
3. Press **Analyse letter frequencies**.

You get the number of letters analysed, χ² against English, the index of coincidence, the most and least frequent letters,
a bar chart of the ciphertext (Percent or Count) with the expected English value marked on each letter, a chart of the
difference from English, a plain-language reading, and a ranked table of all 26 letters. Only A–Z (any case) is counted;
spaces, digits, punctuation and other characters are ignored, and "How characters are counted" explains this.

## 4. Crack a Caesar ciphertext

1. Paste the ciphertext, open the **Caesar Analysis** tab and press **Rank all 26 shifts**.
2. The most likely shift is shown at the top. The table ranks all 26 shifts by χ² (lower is more English-like), with the
   start of each decryption.
3. Press **Inspect** on any row to read that decryption in full; **Copy text** copies it.

A **reliability** note appears above the result. With very little text the ranking is a guess, and even with plenty it is an
estimate, not proof. Check that the top candidate actually reads as language.

## 5. Investigate affine keys

1. Paste the ciphertext, open **Affine Analysis**, press **Rank all 312 keys**.
2. The page lists the 12 valid multipliers with their inverses, the most likely key, and a ranked table (the best 15 shown;
   **Show all 312 keys** shows every key).
3. **Inspect** shows a candidate in full. The best 20 come with their text; for any other key the text is decrypted on demand
   by the backend.

Affine needs more text than Caesar to rank reliably because it must tell 312 keys apart. The best affine key with a = 1 is
the same as a Caesar key.

## 6. Analyse Vigenère ciphertext

Open **Vigenère Analysis**, paste the ciphertext and press **Investigate key length**. Each section is tagged **Measured**
(counted from your text), **Calculated** (derived by a formula) or **Suggestion** (an estimate).

1. **Index of coincidence** (IC): the value for your text on a scale between random letters (0.0385) and English (0.0655),
   with a reading and a rough Friedman key-length estimate.
2. **Kasiski examination**: repeated sequences, where they occur, the distances between them, and which key lengths those
   distances share.
3. **Candidate key lengths**: a chart and table ranking lengths 1 to 20 by the mean IC of the columns, with Kasiski votes
   beside it. Plausible lengths are listed first, shortest first, and one is **suggested** if any qualifies.
4. **Key letters** for the chosen length: the best letter for each key position with alternatives, then up to ten ranked
   candidate keys. **Inspect** a candidate to read its decrypted text.

If a length is suggested, step 4 runs for it automatically. To try another length (for example a multiple of the suggestion, or
any length when nothing is suggested) press **Analyse** on its row in the table.

## 7. Interpret the index of coincidence and Kasiski results

**Index of coincidence.** It is the probability that two letters drawn from the text are the same.

| Reading | IC | Suggests |
| --- | --- | --- |
| english-like | 0.060 or more | plain English, a monoalphabetic cipher (Caesar, affine) or a transposition |
| intermediate | between | a polyalphabetic cipher with a short key, a short or unusual text, or a mix |
| flat | 0.045 or less | a polyalphabetic cipher such as Vigenère with a reasonably long key, or random text |

A Caesar or affine cipher does not change the IC. Treat the IC as a hint about the *kind* of cipher, never a verdict, and
distrust it below about 100 letters.

**Kasiski.** Repeated sequences in a repeating-key ciphertext tend to be a multiple of the key length apart, so a key length
that divides many distances is a candidate. Remember that every multiple of the true key length scores as well, that chance also
repeats short sequences, and that a short text or a long key may show no repeats at all (the page then says so). A key length
with a clear lead in the Kasiski table and in the mean-IC table is a good sign; disagreement means be careful.

**Reliability.** Each result is flagged *very low*, *low* or *usable*. For Vigenère, roughly 25 letters or more per key letter
are needed before a key letter can be trusted; fewer is a guess.

## 8. Move results between the workspace and the Analysis Lab

| From | To | How |
| --- | --- | --- |
| Workspace result | Analysis Lab | **Send to Analysis Lab**: opens the lab with that ciphertext and runs the frequency analysis |
| Workspace message | Analysis Lab | **Analyse** in the message toolbar sends the typed text |
| Analysis candidate | Workspace | **Send to Cipher Workspace** on an inspected candidate: the workspace is set to *encrypt* the candidate's plaintext with the candidate's key (for Vigenère, the shortest equivalent keyword), so running it reproduces your ciphertext, which is a check that the candidate is consistent |

The ciphertext, the active tab and every result in the Analysis Lab survive moving to another page and back. **Clear** in the
lab empties the text and every result. In **Settings**, **Clear session** resets both the workspace and the lab.

## Settings

* **Theme**: System (follows your operating system), Light or Dark; the choice is remembered in this browser.
* **Session**: **Clear session**.
* **Backend**: whether the backend is reachable, its address and version, and **Check again**.

## When something does not work

| You see | Meaning |
| --- | --- |
| "The backend is not reachable" | the backend is not running or the address is wrong; see [setup](development/setup.md) |
| "The server rejected the input" with a field message | for example a keyword with a digit, or a text with no letters sent to a key search |
| a result marked *Out of date* | the text or key changed after the run; run it again |
| a *Very low reliability* flag | the text is too short for the ranking to mean much |

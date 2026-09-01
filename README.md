# Boom Boom Robo Da — Round 01: Treasure Hunt

Mobile-first Next.js participant app for the camouflage-QR treasure hunt.

## Run it

```bash
npm install
npm run dev
```

Open `http://localhost:3000` on your phone (or resize a desktop browser to ~390px to simulate
mobile). For real camera capture on a phone, either deploy it (Vercel etc.) or serve it over
HTTPS / your LAN with a valid cert — mobile browsers require a secure context for camera access.

## Before running for real

Replace the two files in `/data` with your actual generated data:

- `data/data.csv` — the real spreadsheet, including real `vault_code`s.
- `data/manifest.json` — the output of your Python seeder (`generated/manifest.json`).

Both files are **server-only**. They're read with Node's `fs` inside `lib/server/challenge-data.ts`
and are never bundled into client JavaScript or exposed through a public route (verified — see
"Security" below).

The physical QR images themselves (`generated/individual/*.png`) are never uploaded anywhere —
participants photograph the physical printout with their own camera, and everything from there
happens in the browser.

## How the flow maps to files

| Stage | Component | What happens |
|---|---|---|
| Landing / chit entry | `components/stages/ChitStage.tsx` | Posts to `/api/validate-chit`, which only checks existence + difficulty (never returns cipher or vault data). |
| 01 Find QR | `components/stages/FindQRStage.tsx` | Static instructions — the real clue lives on the physical chit. |
| 02 Scan QR | `components/stages/ScanQRStage.tsx` | Camera capture / gallery picker. Image never leaves the device. |
| 03 Adjust QR | `components/stages/HSVStage.tsx` | The core recovery engine — see below. |
| 04 Color cipher | `components/stages/ColorCipherStage.tsx` | Renders `colorMap` / `colorSequence` parsed straight out of the decoded QR payload. |
| 05 Shape cipher | `components/stages/ShapeCipherStage.tsx` | Same, for shapes. |
| 06 Vault | `components/stages/VaultStage.tsx` | Posts `{ chitCode, enteredVaultCode }` to `/api/validate-vault`, which returns only `{ correct: boolean }`. |
| Success | `components/stages/SuccessStage.tsx` | Coordinator-facing confirmation screen. |

## The HSV recovery engine

Lives in `lib/qr/`:

- `hsv.ts` — RGB→HSV conversion (OpenCV convention: H 0–179, S/V 0–255), threshold masking
  (`s <= sMax && v <= vMax`, hue optionally restricted), and 3×3 morphological open+close cleanup
  — mirroring the seeder's own recovery pipeline.
- `decoder.ts` — wraps `jsQR` around the mask. `attemptDecode` runs one threshold combination
  (used for the live slider preview); `autoSearch` sweeps the same S/V grid the Python seeder
  searches (`S: 35→130`, `V: 65→180`, step 8), tried mid-range-first, yielding to the UI thread
  every few iterations so it never freezes the page. It stops as soon as it finds a decode whose
  embedded chit code matches the one the participant entered.
- `parser.ts` — parses the `R1|V1|<CHIT>|COLOR:...|SHAPE:...|COLSEQ:...|SHAPESEQ:...|ORDER:...`
  payload. Note the payload uses `|` both between top-level fields and *inside* the COLOR/SHAPE
  key groups, so this walks tokens and starts a new section whenever it sees a known
  `PREFIX:` token, rather than doing a naive `split("|")[n]`.

The manual sliders (Saturation, Value, and an optional Hue ceiling — hidden by default per the
brief, since the seeder doesn't need a restrictive hue range) drive live mask preview at a capped
640px working resolution so it stays smooth on mobile. "Auto find" runs the same search
programmatically with a small "searching…" animation.

## Security

- `data/data.csv` and `data/manifest.json` are read only inside `lib/server/challenge-data.ts`,
  which is marked `import "server-only"` — importing it from a client component is a build error.
- `/api/validate-chit` returns `{ valid, difficulty }` only — never color/shape/vault data.
- `/api/validate-vault` returns `{ correct: boolean }` only — the expected code is never sent to
  the browser, logged to the client, or embedded in any bundle.
- The two data files live outside `/public`, so there's no route that serves them directly.
- Verified after a production build: no `vault_code` string and no vault code value appears
  anywhere in `.next/static`.

## Notes / things you'll likely want to tune

- `data/manifest.json` currently ships with placeholder entries derived directly from
  `data/data.csv` (correct payload strings, but no real recovery thresholds) so the app is
  runnable out of the box. Swap in your seeder's real `manifest.json` once you've generated
  images — the app only reads `chit_code` and `difficulty` from it.
- The morphological cleanup and auto-search sweep approximate (not byte-for-byte replicate) the
  Python `cv2` implementation. If your printed QR images end up harder or easier to recover than
  intended, the two easiest knobs are `S_SEARCH_RANGE` / `V_SEARCH_RANGE` in `lib/qr/hsv.ts` and
  the coverage-ratio rejection bounds (`0.003`–`0.55`) in `lib/qr/decoder.ts`.

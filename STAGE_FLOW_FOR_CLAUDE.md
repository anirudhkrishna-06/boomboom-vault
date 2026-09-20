# Boom Boom Robo Da Stage Flow

This document describes the current participant flow and the exact data available at every stage. It is intended as a handoff for increasing puzzle difficulty while preserving the security boundary: vault answers stay server-side, QR payloads only become visible after a valid photo is manually decoded in the browser.

## Global Structure

The app is a mobile-first Next.js client flow in `app/page.tsx`. The active screen is controlled by a local `stage` state:

`chit -> find -> scan -> adjust -> color -> shape -> vault -> success`

Important runtime state:

- `chitCode`: entered by the participant and validated by `/api/validate-chit`.
- `capturedFile`: the local photo chosen by camera or gallery. It is never uploaded.
- `payload`: parsed QR payload after the adjuster successfully decodes the image.
- `colorCode`: the participant-visible result from the color cipher stage.
- `shapeCode`: the participant-visible result from the shape cipher stage.

The decoded QR payload contains cipher material but not the official server-side vault answer. The final vault validation still happens on the server with `/api/validate-vault`.

## Stage 00: Chit Entry

Component: `components/stages/ChitStage.tsx`

Participant action:

- Enters the code printed on the physical chit, for example `BB117`.
- Presses Continue.

System behavior:

- Sends `{ chitCode }` to `/api/validate-chit`.
- The API checks `data/manifest.json` first, then falls back to `data/data.csv`.
- The API returns only `{ valid, difficulty }`.
- No cipher keys, QR payload, or vault code are returned.

Purpose:

- Confirms that the participant has a real chit before the hunt begins.
- Establishes the expected chit code used later to reject the wrong QR.

Difficulty knobs:

- Chit codes can be made longer or patterned.
- Public difficulty from the manifest can be used to branch into different UI hints.
- Do not return cipher data from this stage.

## Stage 01: Find QR

Component: `components/stages/FindQRStage.tsx`

Participant action:

- Reads the physical clue on the chit.
- Goes to the clue location.
- Finds the camouflaged QR.
- Taps the confirmation button when ready.

System behavior:

- No network call.
- No QR scan yet.
- Displays only guidance and the current chit code.

Purpose:

- Keeps location solving outside the app.
- Reinforces that the QR is meant to be visually hidden.

Difficulty knobs:

- Make the physical clue more layered.
- Add optional hint tiers based on elapsed time or failed attempts.
- Keep the app text short so the actual hunt difficulty stays physical.

## Stage 02: Photograph QR

Component: `components/stages/ScanQRStage.tsx`

Participant action:

- Opens the camera or chooses a gallery image.
- Reviews the local preview.
- Uses or retakes the photo.

System behavior:

- Stores a local `File` object in browser state.
- Creates a temporary object URL for preview.
- Does not upload the image.

Purpose:

- Captures the physical QR for browser-side recovery.
- Gives participants control over photo quality before decoding.

Difficulty knobs:

- Require better framing by adding client-side image quality checks.
- Add a crop step before the adjuster.
- Add blur/lighting warnings without uploading the image.

## Stage 03: Manual QR Adjuster

Component: `components/stages/HSVStage.tsx`

Supporting files:

- `lib/qr/decoder.ts`
- `lib/qr/hsv.ts`
- `lib/qr/parser.ts`

Participant action:

- Adjusts recovery controls until the hidden QR pattern becomes visually clean.
- Uses the Filter or Mask preview mode.
- Taps `Check signal` when they believe the QR is recoverable.

Current controls:

- Saturation ceiling: keeps pixels with saturation under the threshold.
- Value ceiling: keeps pixels with brightness/value under the threshold.
- Hue start: lower bound for accepted hue.
- Hue end: upper bound for accepted hue. If start is greater than end, the range wraps around.
- Noise cleanup: applies 0 to 3 morphology cleanup passes.
- Preview mode: Filter shows a live visual dissolve; Mask shows the black/white decode mask.

System behavior:

- The photo is resized to a max working dimension of 640px.
- RGB pixels are converted to HSV planes.
- Slider movement renders only a preview. It does not attempt QR decoding.
- `Check signal` calls `attemptDecode`.
- The decoder thresholds the HSV mask, applies morphology cleanup, rejects impossible coverage ratios, and passes the mask to `jsQR`.
- A decoded payload must parse successfully and its embedded `chitCode` must match the original chit code.

Important change:

- There is no participant-facing auto-find.
- Detection is deliberate and only runs on the `Check signal` button.
- The old behavior decoded during slider debounce and also offered auto-search; that made the puzzle too easy and made the adjuster feel like it solved itself.

Purpose:

- Turns QR recovery into an actual puzzle step.
- Makes the participant manipulate the image rather than waiting for automatic detection.

Difficulty knobs:

- Increase camouflage in the QR generator.
- Narrow the useful S/V windows.
- Add another adjustable axis such as contrast, invert, crop, rotation, or local thresholding.
- Hide exact numeric slider values and use abstract labels.
- Limit check attempts or add a cooldown.
- Add misleading but plausible visual noise in the physical QR.

## QR Payload Format

Parser: `lib/qr/parser.ts`

Expected payload shape:

`R1|V1|<CHIT>|COLOR:...|SHAPE:...|COLSEQ:...|SHAPESEQ:...|ORDER:...`

Example structure:

`R1|V1|BB117|COLOR:RED=6|BLUE=9|GREEN=4|YELLOW=5|SHAPE:CIRCLE=8|TRIANGLE=1|SQUARE=7|DIAMOND=3|COLSEQ:RED-YELLOW-BLUE-GREEN|SHAPESEQ:CIRCLE-SQUARE-TRIANGLE-DIAMOND|ORDER:COLOR-SHAPE`

Parsed fields:

- `colorMap`: color name to digit.
- `shapeMap`: shape name to digit.
- `colorSequence`: color names in solving order.
- `shapeSequence`: shape names in solving order.
- `operationOrder`: whether final entry is color+shape or shape+color.

## Stage 04: Color Cipher

Component: `components/stages/ColorCipherStage.tsx`

Participant action:

- Reads the color-to-digit table.
- Applies it to the color sequence.
- Reviews or edits the visible Color code field.
- Continues to the shape cipher.

System behavior:

- Derives a default color code with `deriveColorCode(payload)`.
- Stores the code in `colorCode` in `app/page.tsx`.
- Passes that value into the next stage.

Purpose:

- First cipher layer.
- Produces the color portion of the final vault code.

Difficulty knobs:

- Use more colors.
- Use repeated colors.
- Add distractor colors that are present in the map but absent from the sequence.
- Replace direct digit mapping with a transformation, such as offsets or pair operations.

## Stage 05: Shape Cipher

Component: `components/stages/ShapeCipherStage.tsx`

Participant action:

- Sees the Color code from the previous stage.
- Reads the shape-to-digit table.
- Applies it to the shape sequence.
- Reviews or edits the visible Shape code field.
- Continues to the vault.

System behavior:

- Derives a default shape code with `deriveShapeCode(payload)`.
- Keeps the previously solved color code visible.
- Stores the shape result in `shapeCode` in `app/page.tsx`.

Purpose:

- Second cipher layer.
- Keeps the first code visible so participants do not lose context.

Difficulty knobs:

- Add more shape types.
- Use visually similar symbols.
- Add rotations, outlines, fills, or shape families.
- Require combining shape and color positions instead of solving separate strings.

## Stage 06: Vault

Component: `components/stages/VaultStage.tsx`

Participant action:

- Reviews both visible codes.
- Reviews the required operation order.
- Enters the final numeric code.
- Taps Unlock.

System behavior:

- Shows `Color code`, `Shape code`, `Order`, and `Enter`.
- The displayed final preview is built from client-known cipher results and payload order.
- Sends `{ chitCode, enteredVaultCode }` to `/api/validate-vault`.
- The server recomputes the expected code from `data/data.csv` and returns only `{ correct }`.

Security note:

- The browser can see the QR payload after successful decode because the participant has earned it.
- The browser still never receives `vault_code` from the CSV.
- The server accepts either the computed code or the explicit `vault_code` field from the CSV.

Difficulty knobs:

- Use `operation_order` beyond two parts, if the parser and UI are extended.
- Add checksum digits.
- Add arithmetic between color and shape codes.
- Require a final physical clue to determine order instead of placing order in the QR payload.

## Success Stage

Component: `components/stages/SuccessStage.tsx`

Participant action:

- Shows completion confirmation for the chit.

System behavior:

- No additional validation.
- This is the end state after `/api/validate-vault` returns `correct: true`.

## Current Security Boundaries

Server-only files:

- `data/data.csv`
- `data/manifest.json`
- `lib/server/challenge-data.ts`

APIs:

- `/api/validate-chit`: returns validity and difficulty only.
- `/api/validate-vault`: returns correctness only.

Client-visible only after QR decode:

- `colorMap`
- `shapeMap`
- `colorSequence`
- `shapeSequence`
- `operationOrder`

Never intentionally exposed to client:

- Raw CSV file.
- Manifest file.
- `vault_code` values from `data/data.csv`.

## Recommended Next Difficulty Upgrade

The cleanest next upgrade is to make Stage 03 harder while keeping it fair:

- Add crop and rotate controls before HSV thresholding.
- Add a contrast or gamma control.
- Add a limited number of `Check signal` attempts.
- Remove numeric slider values after testing, replacing them with coded readouts.
- Tune QR generation so there are several visually tempting but wrong threshold regions.

For cipher difficulty, the safest upgrade is to keep color and shape codes visible, but make the operation between them less direct. For example: solve both strings, then use the QR payload order plus a printed chit modifier to interleave, reverse, or offset digits.

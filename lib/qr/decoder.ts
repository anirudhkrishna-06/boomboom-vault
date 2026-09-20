import jsQR from "jsqr";
import {
  DEFAULT_THRESHOLDS,
  HsvBuffers,
  HsvThresholds,
  S_SEARCH_RANGE,
  V_SEARCH_RANGE,
  computeClarity,
  maskCoverage,
  maskToImageData,
  morphologicalCleanup,
  renderHsvDissolveImageData,
  thresholdMask,
  toHsvBuffers,
} from "./hsv";
import { parsePayload, ParsedPayload } from "./parser";

export interface DecodeAttemptResult {
  success: boolean;
  payload: string | null;
  mask: ImageData | null;
  renderedFrame: ImageData | null;
  clarity: number;
}

/** Loads a File/Blob into an HTMLImageElement. */
export function loadImage(file: Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Could not load image."));
    img.src = url;
  });
}

/** Draws an image onto an offscreen canvas capped at maxDim on the long edge, returning ImageData. */
export function imageToImageData(img: HTMLImageElement | HTMLCanvasElement, maxDim: number): ImageData {
  const srcW = "naturalWidth" in img ? img.naturalWidth : img.width;
  const srcH = "naturalHeight" in img ? img.naturalHeight : img.height;

  const scale = Math.min(1, maxDim / Math.max(srcW, srcH));
  const w = Math.max(1, Math.round(srcW * scale));
  const h = Math.max(1, Math.round(srcH * scale));

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
  ctx.drawImage(img, 0, 0, w, h);
  return ctx.getImageData(0, 0, w, h);
}

/**
 * Core mask decode. Applies HSV thresholding + morphological cleanup and
 * attempts to read a QR payload with jsQR.
 *
 * Bug fixes vs original:
 *  - Coverage upper-bound raised to 0.65 (was 0.55) to match the new maskClarity window.
 *  - inversionAttempts changed to "attemptBoth" so jsQR tries its own luminance inversion
 *    in addition to our manual mask-colour flip.
 */
function tryDecodeMask(
  buffers: HsvBuffers,
  thresholds: HsvThresholds
): { mask: ReturnType<typeof thresholdMask>; ratio: number; payload: string | null } {
  let mask = thresholdMask(buffers, thresholds);
  mask = morphologicalCleanup(mask, buffers.width, buffers.height, thresholds.cleanupPasses ?? 1);
  const ratio = maskCoverage(mask);

  // Guard: too sparse (empty) or too dense (whole image black) — skip decode.
  // Upper bound raised to 0.65 to align with maskClarity's new wider window.
  if (ratio < 0.003 || ratio > 0.65) {
    return { mask, ratio, payload: null };
  }

  for (const invert of [false, true]) {
    const imgData = maskToImageData(mask, buffers.width, buffers.height, invert);
    // Use "attemptBoth" so jsQR applies its own internal luminance inversion pass
    // in addition to our manual colour flip — more decode attempts per call.
    const result = jsQR(imgData.data, imgData.width, imgData.height, {
      inversionAttempts: "attemptBoth",
    });
    if (result?.data) {
      return { mask, ratio, payload: result.data };
    }
  }

  return { mask, ratio, payload: null };
}

/** Builds the live recovery preview without attempting to decode the QR. */
export function renderAdjustmentPreview(
  buffers: HsvBuffers,
  thresholds: HsvThresholds = DEFAULT_THRESHOLDS
): Omit<DecodeAttemptResult, "success" | "payload"> {
  let mask = thresholdMask(buffers, thresholds);
  mask = morphologicalCleanup(mask, buffers.width, buffers.height, thresholds.cleanupPasses ?? 1);
  const clarity = computeClarity(mask, thresholds);

  return {
    mask: maskToImageData(mask, buffers.width, buffers.height),
    renderedFrame: renderHsvDissolveImageData(buffers, thresholds, mask),
    clarity,
  };
}

/**
 * Attempts to decode the QR from the current thresholds.
 *
 * Strategy (in order):
 *  1. Try user's exact slider values with all 4 cleanup pass counts.
 *  2. Sweep ±15 on sMax and vMax (steps of 8, matching the seeder sweep step)
 *     across all cleanup passes — handles minor slider misalignment.
 * The displayed frame always reflects the user's ACTUAL slider state.
 */
export function attemptDecode(
  buffers: HsvBuffers,
  thresholds: HsvThresholds = DEFAULT_THRESHOLDS
): DecodeAttemptResult {
  const primaryForDisplay = tryDecodeMask(buffers, thresholds);

  /** Helper: attempt all 4 cleanup pass counts for a given threshold set. */
  function tryAllPasses(t: HsvThresholds): string | null {
    for (const passes of [t.cleanupPasses ?? 1, 0, 1, 2, 3]) {
      const { payload } = tryDecodeMask(buffers, { ...t, cleanupPasses: passes });
      if (payload) return payload;
    }
    return null;
  }

  // Step 1 — exact slider values
  const exactPayload = tryAllPasses(thresholds);
  if (exactPayload) {
    return {
      success: true,
      payload: exactPayload,
      mask: maskToImageData(primaryForDisplay.mask, buffers.width, buffers.height),
      renderedFrame: renderHsvDissolveImageData(buffers, thresholds, primaryForDisplay.mask),
      clarity: 1.0,
    };
  }

  // Step 2 — sweep ±15 neighbourhood on sMax and vMax
  // Users may be 5-10 units away from the exact decodable window for their photo.
  const STEP = 8; // matches S/V_SEARCH_RANGE.step
  const DELTAS = [-STEP * 2, -STEP, STEP, STEP * 2]; // ±8, ±16
  for (const ds of DELTAS) {
    for (const dv of DELTAS) {
      const alt: HsvThresholds = {
        ...thresholds,
        sMax: Math.max(0, Math.min(255, thresholds.sMax + ds)),
        vMax: Math.max(0, Math.min(255, thresholds.vMax + dv)),
      };
      const altPayload = tryAllPasses(alt);
      if (altPayload) {
        return {
          success: true,
          payload: altPayload,
          mask: maskToImageData(primaryForDisplay.mask, buffers.width, buffers.height),
          renderedFrame: renderHsvDissolveImageData(buffers, thresholds, primaryForDisplay.mask),
          clarity: 1.0,
        };
      }
    }
  }

  // All attempts failed — return the primary mask with a clarity score
  const clarity = computeClarity(primaryForDisplay.mask, thresholds);
  return {
    success: false,
    payload: null,
    mask: maskToImageData(primaryForDisplay.mask, buffers.width, buffers.height),
    renderedFrame: renderHsvDissolveImageData(buffers, thresholds, primaryForDisplay.mask),
    clarity,
  };
}




export interface AutoSearchOptions {
  expectedChitCode?: string;
  onProgress?: (fraction: number) => void;
  signal?: AbortSignal;
}

export interface AutoSearchResult {
  success: boolean;
  payload: string | null;
  thresholds: HsvThresholds | null;
  mask: ImageData | null;
}

/**
 * Sweeps low-S / low-V threshold combinations, mirroring the seeder's own
 * recovery search, looking for a decodable (and matching) QR payload.
 * Runs in small async chunks so the UI thread never freezes.
 */
export async function autoSearch(
  buffers: HsvBuffers,
  opts: AutoSearchOptions = {}
): Promise<AutoSearchResult> {
  const sValues: number[] = [];
  for (let s = S_SEARCH_RANGE.min; s <= S_SEARCH_RANGE.max; s += S_SEARCH_RANGE.step) sValues.push(s);
  const vValues: number[] = [];
  for (let v = V_SEARCH_RANGE.min; v <= V_SEARCH_RANGE.max; v += V_SEARCH_RANGE.step) vValues.push(v);

  const combos: Array<{ s: number; v: number }> = [];
  for (const s of sValues) for (const v of vValues) combos.push({ s, v });

  // Try the most promising (mid-range) combinations first.
  combos.sort((a, b) => {
    const da = Math.abs(a.s - 85) + Math.abs(a.v - 120);
    const db = Math.abs(b.s - 85) + Math.abs(b.v - 120);
    return da - db;
  });

  type BestMatch = {
    score: number;
    thresholds: HsvThresholds;
    payload: string;
    mask: ReturnType<typeof thresholdMask>;
  };
  let best: BestMatch | null = null;

  for (let i = 0; i < combos.length; i++) {
    if (opts.signal?.aborted) break;

    const { s, v } = combos[i];
    const thresholds: HsvThresholds = { hMin: 0, hMax: 179, sMax: s, vMax: v };
    const { mask, ratio, payload } = tryDecodeMask(buffers, thresholds);

    if (payload) {
      const parsed = parsePayload(payload);
      const matches = !opts.expectedChitCode || (parsed && parsed.chitCode === opts.expectedChitCode.toUpperCase());

      if (matches) {
        const score = Math.abs(ratio - 0.18);
        best = { score, thresholds, payload, mask };
        // Good enough — a QR that matches the expected chit is a strong signal, stop early.
        break;
      }
    }

    if (i % 6 === 0) {
      opts.onProgress?.(i / combos.length);
      await new Promise((r) => setTimeout(r, 0));
    }
  }

  opts.onProgress?.(1);

  if (!best) {
    return { success: false, payload: null, thresholds: null, mask: null };
  }

  return {
    success: true,
    payload: best.payload,
    thresholds: best.thresholds,
    mask: maskToImageData(best.mask, buffers.width, buffers.height),
  };
}

/** Convenience: builds HSV buffers straight from an image at a capped resolution. */
export function buildBuffers(img: HTMLImageElement, maxDim: number): HsvBuffers {
  const imageData = imageToImageData(img, maxDim);
  return toHsvBuffers(imageData);
}

export interface VerifyOriginalResult {
  success: boolean;
  payload: ParsedPayload | null;
  error?: "wrong" | "not-found";
}

/**
 * Directly verifies the chitcode against the original uploaded image buffers.
 * Runs a direct jsQR scan first, followed by autoSearch threshold unmasking.
 */
export async function verifyOriginalImage(
  buffers: HsvBuffers,
  expectedChitCode: string
): Promise<VerifyOriginalResult> {
  const normalizedTarget = expectedChitCode.trim().toUpperCase();

  // 1. Direct raw jsQR scan on the unmodified image
  const rawData = new ImageData(new Uint8ClampedArray(buffers.rgba), buffers.width, buffers.height);
  const rawQr = jsQR(rawData.data, rawData.width, rawData.height, { inversionAttempts: "attemptBoth" });
  if (rawQr?.data) {
    const parsed = parsePayload(rawQr.data);
    if (parsed && parsed.chitCode === normalizedTarget) {
      return { success: true, payload: parsed };
    } else if (parsed) {
      return { success: false, payload: parsed, error: "wrong" };
    }
  }

  // 2. Automated unmasking sweep (autoSearch) on the original image buffers
  const searchRes = await autoSearch(buffers, { expectedChitCode: normalizedTarget });
  if (searchRes.success && searchRes.payload) {
    const parsed = parsePayload(searchRes.payload);
    if (parsed && parsed.chitCode === normalizedTarget) {
      return { success: true, payload: parsed };
    } else if (parsed) {
      return { success: false, payload: parsed, error: "wrong" };
    }
  }

  return { success: false, payload: null, error: "not-found" };
}


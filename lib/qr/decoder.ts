import jsQR from "jsqr";
import {
  DEFAULT_THRESHOLDS,
  HsvBuffers,
  HsvThresholds,
  S_SEARCH_RANGE,
  V_SEARCH_RANGE,
  maskCoverage,
  maskToImageData,
  morphologicalCleanup,
  thresholdMask,
  toHsvBuffers,
} from "./hsv";
import { parsePayload } from "./parser";

export interface DecodeAttemptResult {
  success: boolean;
  payload: string | null;
  mask: ImageData | null;
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

function tryDecodeMask(
  buffers: HsvBuffers,
  thresholds: HsvThresholds
): { mask: ReturnType<typeof thresholdMask>; ratio: number; payload: string | null } {
  let mask = thresholdMask(buffers, thresholds);
  mask = morphologicalCleanup(mask, buffers.width, buffers.height);
  const ratio = maskCoverage(mask);

  if (ratio < 0.003 || ratio > 0.55) {
    return { mask, ratio, payload: null };
  }

  for (const invert of [false, true]) {
    const imgData = maskToImageData(mask, buffers.width, buffers.height, invert);
    const result = jsQR(imgData.data, imgData.width, imgData.height, {
      inversionAttempts: "dontInvert",
    });
    if (result?.data) {
      return { mask, ratio, payload: result.data };
    }
  }

  return { mask, ratio, payload: null };
}

/** Attempts a single decode at the given thresholds. Used for the live preview + manual "Detect" action. */
export function attemptDecode(
  buffers: HsvBuffers,
  thresholds: HsvThresholds = DEFAULT_THRESHOLDS
): DecodeAttemptResult {
  const { mask, payload } = tryDecodeMask(buffers, thresholds);
  return {
    success: !!payload,
    payload,
    mask: maskToImageData(mask, buffers.width, buffers.height),
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

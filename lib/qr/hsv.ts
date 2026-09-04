/**
 * HSV recovery engine.
 *
 * Mirrors the recovery behaviour of the Python seeder's camouflage QR:
 * the hidden QR modules have a controlled LOW saturation / LOW value
 * signature, while hue is inherited from the surrounding texture (and is
 * therefore not a reliable filtering axis on its own).
 *
 * Pipeline: RGB -> HSV -> threshold (S <= sMax, V <= vMax, H in [hMin,hMax])
 *           -> binary mask -> morphological open + close -> QR decode.
 */

export interface HsvThresholds {
  hMin: number; // 0-179
  hMax: number; // 0-179
  sMax: number; // 0-255 (keep only LOW saturation, i.e. s <= sMax)
  vMax: number; // 0-255 (keep only LOW value, i.e. v <= vMax)
}

export const DEFAULT_THRESHOLDS: HsvThresholds = {
  hMin: 0,
  hMax: 179,
  sMax: 130,
  vMax: 180,
};

// Recommended search bounds, mirroring the Python seeder's recovery sweep.
export const S_SEARCH_RANGE = { min: 35, max: 130, step: 8 };
export const V_SEARCH_RANGE = { min: 65, max: 180, step: 8 };

export interface HsvBuffers {
  width: number;
  height: number;
  h: Uint8ClampedArray;
  s: Uint8ClampedArray;
  v: Uint8ClampedArray;
  rgba: Uint8ClampedArray;
}

/** Converts an RGBA ImageData buffer into HSV planes (OpenCV convention: H 0-179, S/V 0-255). */
export function toHsvBuffers(imageData: ImageData): HsvBuffers {
  const { width, height, data } = imageData;
  const n = width * height;
  const h = new Uint8ClampedArray(n);
  const s = new Uint8ClampedArray(n);
  const v = new Uint8ClampedArray(n);
  const rgba = new Uint8ClampedArray(data);

  for (let i = 0, p = 0; i < n; i++, p += 4) {
    const r = data[p] / 255;
    const g = data[p + 1] / 255;
    const b = data[p + 2] / 255;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const delta = max - min;

    let hue = 0;
    if (delta !== 0) {
      if (max === r) hue = 60 * (((g - b) / delta) % 6);
      else if (max === g) hue = 60 * ((b - r) / delta + 2);
      else hue = 60 * ((r - g) / delta + 4);
    }
    if (hue < 0) hue += 360;

    h[i] = Math.round(hue / 2); // 0-179
    s[i] = Math.round((max === 0 ? 0 : delta / max) * 255);
    v[i] = Math.round(max * 255);
  }

  return { width, height, h, s, v, rgba };
}

/**
 * Renders a real-time pixel HSV dissolve frame.
 * Pixels within thresholds (the QR signal) remain crisp dark QR modules.
 * Pixels outside thresholds (camouflage background noise) dissolve into clean white/light-grey.
 */
export function renderHsvDissolveImageData(
  buffers: HsvBuffers,
  t: HsvThresholds
): ImageData {
  const { width, height, s, v, rgba } = buffers;
  const n = width * height;
  const outData = new Uint8ClampedArray(n * 4);

  const wrap = t.hMin > t.hMax;

  for (let i = 0, p = 0; i < n; i++, p += 4) {
    const sVal = s[i];
    const vVal = v[i];
    const hueVal = buffers.h[i];

    const hueOk = wrap ? hueVal >= t.hMin || hueVal <= t.hMax : hueVal >= t.hMin && hueVal <= t.hMax;
    const isSignal = hueOk && sVal <= t.sMax && vVal <= t.vMax;

    if (isSignal) {
      // Keep QR module pixel dark & crisp
      outData[p] = rgba[p];
      outData[p + 1] = rgba[p + 1];
      outData[p + 2] = rgba[p + 2];
      outData[p + 3] = 255;
    } else {
      // Calculate excess saturation/value above threshold
      const sExcess = Math.max(0, sVal - t.sMax);
      const vExcess = Math.max(0, vVal - t.vMax);
      const fade = Math.min(1.0, (sExcess * 1.5 + vExcess * 1.0) / 80);

      // Dissolve camouflage noise into clean light grey / white (RGB 245, 245, 245)
      const r = rgba[p];
      const g = rgba[p + 1];
      const b = rgba[p + 2];

      outData[p] = Math.round(r + (245 - r) * fade);
      outData[p + 1] = Math.round(g + (245 - g) * fade);
      outData[p + 2] = Math.round(b + (245 - b) * fade);
      outData[p + 3] = 255;
    }
  }

  return new ImageData(outData, width, height);
}


/** Builds a raw binary mask (0 / 255) from HSV planes given thresholds. Low-S / low-V is treated as QR signal. */
export function thresholdMask(buffers: HsvBuffers, t: HsvThresholds): Uint8ClampedArray {
  const { width, height, h, s, v } = buffers;
  const n = width * height;
  const mask = new Uint8ClampedArray(n);

  const wrap = t.hMin > t.hMax; // allow wrap-around hue ranges

  for (let i = 0; i < n; i++) {
    const hueOk = wrap ? h[i] >= t.hMin || h[i] <= t.hMax : h[i] >= t.hMin && h[i] <= t.hMax;
    if (hueOk && s[i] <= t.sMax && v[i] <= t.vMax) {
      mask[i] = 255;
    }
  }

  return mask;
}

function erode3x3(src: Uint8ClampedArray, width: number, height: number): Uint8ClampedArray {
  const out = new Uint8ClampedArray(width * height);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let allOn = true;
      for (let dy = -1; dy <= 1 && allOn; dy++) {
        const yy = Math.min(height - 1, Math.max(0, y + dy));
        for (let dx = -1; dx <= 1; dx++) {
          const xx = Math.min(width - 1, Math.max(0, x + dx));
          if (src[yy * width + xx] === 0) {
            allOn = false;
            break;
          }
        }
      }
      out[y * width + x] = allOn ? 255 : 0;
    }
  }
  return out;
}

function dilate3x3(src: Uint8ClampedArray, width: number, height: number): Uint8ClampedArray {
  const out = new Uint8ClampedArray(width * height);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let anyOn = false;
      for (let dy = -1; dy <= 1 && !anyOn; dy++) {
        const yy = Math.min(height - 1, Math.max(0, y + dy));
        for (let dx = -1; dx <= 1; dx++) {
          const xx = Math.min(width - 1, Math.max(0, x + dx));
          if (src[yy * width + xx] !== 0) {
            anyOn = true;
            break;
          }
        }
      }
      out[y * width + x] = anyOn ? 255 : 0;
    }
  }
  return out;
}

/** Morphological OPEN (erode->dilate) then CLOSE (dilate->erode), matching the seeder's cleanup step. */
export function morphologicalCleanup(
  mask: Uint8ClampedArray,
  width: number,
  height: number
): Uint8ClampedArray {
  let m = erode3x3(mask, width, height);
  m = dilate3x3(m, width, height); // open
  m = dilate3x3(m, width, height);
  m = erode3x3(m, width, height); // close
  return m;
}

/** Fraction of the mask that is "on" (foreground). Used to reject degenerate masks, mirroring the seeder. */
export function maskCoverage(mask: Uint8ClampedArray): number {
  let on = 0;
  for (let i = 0; i < mask.length; i++) if (mask[i] !== 0) on++;
  return on / mask.length;
}

/** Returns a 0–1 clarity score: how QR-like is this mask based on coverage density. */
export function maskClarity(mask: Uint8ClampedArray): number {
  const coverage = maskCoverage(mask);
  if (coverage < 0.03 || coverage > 0.60) return 0;
  const coverageScore = 1 - Math.abs(coverage - 0.18) / 0.18;
  return Math.max(0, Math.min(1, coverageScore));
}

/** Measures how close current thresholds are to target thresholds (default sMax=130, vMax=180). */
export function thresholdProximity(
  sMax: number,
  vMax: number,
  targetS = 130,
  targetV = 180
): number {
  const sDist = Math.abs(sMax - targetS) / 255;
  const vDist = Math.abs(vMax - targetV) / 255;
  return Math.max(0, 1 - (sDist + vDist) * 1.5);
}

/** Continuous 0–1 distance-based proximity score over full 0-255 spectrum with independent slider contributions. */
export function continuousProximity(
  sMax: number,
  vMax: number,
  targetS = 130,
  targetV = 180
): number {
  const sDist = Math.abs(sMax - targetS) / 255;
  const vDist = Math.abs(vMax - targetV) / 255;
  const sProx = Math.max(0, 1 - sDist);
  const vProx = Math.max(0, 1 - vDist);
  // Each slider independently contributes 50% to the reveal progress
  const avgProx = 0.5 * sProx + 0.5 * vProx;
  return Math.pow(avgProx, 1.1);
}

/** Confirms if BOTH sMax and vMax are in their required target ranges before QR detection unlocks. */
export function isWithinTargetWindows(
  t: HsvThresholds,
  targetS = 130,
  targetV = 180,
  sTol = 30,
  vTol = 30
): boolean {
  const sDiff = Math.abs(t.sMax - targetS);
  const vDiff = Math.abs(t.vMax - targetV);
  return sDiff <= sTol && vDiff <= vTol;
}




/** Converts a binary mask into RGBA ImageData (black/white), suitable for QR decoding. */
export function maskToImageData(mask: Uint8ClampedArray, width: number, height: number, invert = false): ImageData {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let i = 0, p = 0; i < mask.length; i++, p += 4) {
    const on = mask[i] !== 0;
    const value = (on && !invert) || (!on && invert) ? 0 : 255;
    data[p] = value;
    data[p + 1] = value;
    data[p + 2] = value;
    data[p + 3] = 255;
  }
  return new ImageData(data, width, height);
}


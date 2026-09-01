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
}

/** Converts an RGBA ImageData buffer into HSV planes (OpenCV convention: H 0-179, S/V 0-255). */
export function toHsvBuffers(imageData: ImageData): HsvBuffers {
  const { width, height, data } = imageData;
  const n = width * height;
  const h = new Uint8ClampedArray(n);
  const s = new Uint8ClampedArray(n);
  const v = new Uint8ClampedArray(n);

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

  return { width, height, h, s, v };
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

"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { StageShell } from "../StageShell";
import { attemptDecode, buildBuffers, loadImage, renderAdjustmentPreview } from "@/lib/qr/decoder";
import { DEFAULT_THRESHOLDS, HsvBuffers, HsvThresholds } from "@/lib/qr/hsv";
import { parsePayload, ParsedPayload } from "@/lib/qr/parser";

type Status = "idle" | "loading" | "checking" | "found" | "wrong" | "not-found";
type PreviewMode = "blend" | "mask";

const PREVIEW_DIM = 640;
const AUTO_ACCEPT_CLARITY = 0.9;

export function HSVStage({
  chitCode,
  file,
  onDecoded,
  onRetake,
}: {
  chitCode: string;
  file: File;
  onDecoded: (payload: ParsedPayload | null) => void;
  onRetake: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const buffersRef = useRef<HsvBuffers | null>(null);

  const [status, setStatus] = useState<Status>("loading");
  const [sMax, setSMax] = useState(DEFAULT_THRESHOLDS.sMax);
  const [vMax, setVMax] = useState(DEFAULT_THRESHOLDS.vMax);
  const [hMin, setHMin] = useState(0);
  const [hMax, setHMax] = useState(179);
  const [cleanupPasses, setCleanupPasses] = useState(1);
  const [previewMode, setPreviewMode] = useState<PreviewMode>("blend");
  const [foundPayload, setFoundPayload] = useState<ParsedPayload | null>(null);
  const [clarity, setClarity] = useState(0);

  const thresholds: HsvThresholds = { hMin, hMax, sMax, vMax, cleanupPasses };

  const drawFrame = useCallback((frame: ImageData | null) => {
    const canvas = canvasRef.current;
    if (!canvas || !frame) return;

    canvas.width = frame.width;
    canvas.height = frame.height;
    canvas.getContext("2d")?.putImageData(frame, 0, 0);
  }, []);

  const renderPreview = useCallback(
    (nextThresholds: HsvThresholds, mode: PreviewMode) => {
      const buffers = buffersRef.current;
      if (!buffers) return;

      const preview = renderAdjustmentPreview(buffers, nextThresholds);
      drawFrame(mode === "mask" ? preview.mask : preview.renderedFrame);
      setClarity(preview.clarity);
    },
    [drawFrame]
  );

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const img = await loadImage(file);
        if (cancelled) return;

        const buffers = buildBuffers(img, PREVIEW_DIM);
        buffersRef.current = buffers;
        setStatus("idle");
        renderPreview(thresholds, previewMode);
      } catch {
        if (!cancelled) setStatus("idle");
      }
    })();

    return () => {
      cancelled = true;
    };
    // The first render should use the initial controls only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [file]);

  useEffect(() => {
    if (status === "loading" || status === "checking") return;
    renderPreview(thresholds, previewMode);
    if (status === "found" || status === "wrong" || status === "not-found") {
      setStatus("idle");
      setFoundPayload(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sMax, vMax, hMin, hMax, cleanupPasses, previewMode]);

  function handleCheckSignal() {
    const buffers = buffersRef.current;
    if (!buffers) return;

    setStatus("checking");
    requestAnimationFrame(() => {
      setTimeout(() => {
        const result = attemptDecode(buffers, thresholds);
        drawFrame(previewMode === "mask" ? result.mask : result.renderedFrame);
        setClarity(result.clarity);

        if (result.success && result.payload) {
          const parsed = parsePayload(result.payload);
          if (parsed && parsed.chitCode === chitCode.toUpperCase()) {
            setFoundPayload(parsed);
            if (result.clarity >= AUTO_ACCEPT_CLARITY || clarity >= AUTO_ACCEPT_CLARITY) {
              onDecoded(parsed);
              return;
            }
            setStatus("found");
            return;
          }

          if (parsed) {
            setFoundPayload(null);
            setStatus("wrong");
            return;
          }
        }

        setFoundPayload(null);
        setStatus("not-found");
      }, 0);
    });
  }

  const isBusy = status === "loading" || status === "checking";
  const scopeClass =
    status === "found" ? "detected" : clarity > 0.68 ? "hot" : clarity > 0.38 ? "warm" : "";
  const clarityPercent = Math.round(clarity * 100);

  return (
    <StageShell railStage="adjust">
      <div className="eyebrow">
        <span className="rule" />
        STAGE 03
      </div>
      <h2 className="stage-title">Reveal the signal</h2>
      <p className="stage-sub">
        Tune the photo until the hidden modules lock into a clean pattern. Detection only runs when
        you check the signal.
      </p>

      <div className={`scope ${scopeClass}`} style={{ marginBottom: 14 }}>
        <canvas ref={canvasRef} />
        <div className="scope-grid" style={{ zIndex: 2 }} />
        {status === "checking" && <div className="scope-sweep" style={{ zIndex: 2 }} />}
        <span className="scope-corner tl" style={{ zIndex: 3 }} />
        <span className="scope-corner tr" style={{ zIndex: 3 }} />
        <span className="scope-corner bl" style={{ zIndex: 3 }} />
        <span className="scope-corner br" style={{ zIndex: 3 }} />
      </div>

      <div className="signal-readout">
        <div>
          <span className="field-label" style={{ marginBottom: 4 }}>
            Signal quality
          </span>
          <div className="signal-meter">
            <span style={{ width: `${clarityPercent}%` }} />
          </div>
        </div>
        <span className="mono signal-score">{clarityPercent}%</span>
      </div>

      <div style={{ marginBottom: 16, display: "flex", justifyContent: "center" }}>
        {status === "found" && (
          <span className="status-pill found">
            <span className="led" />
            QR DETECTED
          </span>
        )}
        {status === "wrong" && (
          <span className="status-pill error">
            <span className="led" />
            WRONG QR
          </span>
        )}
        {status === "not-found" && (
          <span className="status-pill error">
            <span className="led" />
            NO MATCH YET
          </span>
        )}
        {(status === "idle" || status === "loading" || status === "checking") && (
          <span className={`status-pill ${status === "checking" ? "searching" : ""}`}>
            <span className="led" />
            {status === "loading"
              ? "PREPARING IMAGE..."
              : status === "checking"
                ? "CHECKING SIGNAL..."
                : "ADJUST, THEN CHECK"}
          </span>
        )}
      </div>

      {status === "found" && foundPayload ? (
        <div className="panel text-center" style={{ marginBottom: 18 }}>
          <p className="mono" style={{ color: "var(--signal)", fontSize: 13, marginBottom: 6 }}>
            QR FOUND
          </p>
          <p className="mono" style={{ fontSize: 22, letterSpacing: "0.08em" }}>
            {foundPayload.chitCode}
          </p>
        </div>
      ) : (
        <div className="adjuster-panel">
          <div className="preview-toggle" role="group" aria-label="Preview mode">
            <button
              type="button"
              className={previewMode === "blend" ? "active" : ""}
              onClick={() => setPreviewMode("blend")}
              disabled={isBusy}
            >
              Filter
            </button>
            <button
              type="button"
              className={previewMode === "mask" ? "active" : ""}
              onClick={() => setPreviewMode("mask")}
              disabled={isBusy}
            >
              Mask
            </button>
          </div>

          <Slider
            label="Saturation ceiling"
            value={sMax}
            min={0}
            max={255}
            disabled={isBusy}
            onChange={setSMax}
          />
          <Slider
            label="Value ceiling"
            value={vMax}
            min={0}
            max={255}
            disabled={isBusy}
            onChange={setVMax}
          />
          <Slider
            label="Hue start"
            value={hMin}
            min={0}
            max={179}
            disabled={isBusy}
            onChange={setHMin}
          />
          <Slider
            label="Hue end"
            value={hMax}
            min={0}
            max={179}
            disabled={isBusy}
            onChange={setHMax}
          />
          <Slider
            label="Noise cleanup"
            value={cleanupPasses}
            min={0}
            max={3}
            disabled={isBusy}
            onChange={setCleanupPasses}
          />
          <p className="helper-text" style={{ marginTop: -6, marginBottom: 16 }}>
            Lower saturation and value ceilings make the filter stricter. At 90%+, a valid check
            locks in automatically.
          </p>
        </div>
      )}

      <div className="stack">
        {status !== "found" && (
          <button className="btn btn-signal" onClick={handleCheckSignal} disabled={isBusy}>
            {status === "checking" ? "Checking..." : "Check signal"}
          </button>
        )}
        {status === "found" ? (
          <button className="btn btn-primary" onClick={() => foundPayload && onDecoded(foundPayload)}>
            Continue -&gt;
          </button>
        ) : (
          <button className="btn btn-ghost" onClick={onRetake} disabled={isBusy}>
            Retake photo
          </button>
        )}
      </div>

      {status === "wrong" && (
        <p className="error-text text-center" style={{ marginTop: 12 }}>
          This QR belongs to another challenge. Make sure you're photographing the QR for {chitCode}.
        </p>
      )}
    </StageShell>
  );
}

function Slider({
  label,
  value,
  min,
  max,
  disabled,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  disabled: boolean;
  onChange: (value: number) => void;
}) {
  return (
    <div className="slider-row">
      <div className="slider-head">
        <span className="slider-name">{label}</span>
        <span className="slider-value">{value}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </div>
  );
}

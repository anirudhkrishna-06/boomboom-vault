"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { StageShell } from "../StageShell";
import { buildBuffers, loadImage, verifyOriginalImage } from "@/lib/qr/decoder";
import { HsvBuffers, HsvThresholds, renderHsvDissolveImageData } from "@/lib/qr/hsv";
import { ParsedPayload } from "@/lib/qr/parser";

type Status = "idle" | "loading" | "checking" | "found" | "wrong" | "not-found";

const PREVIEW_DIM = 640;

// Sliders target range where the QR becomes visually unmasked & clear to the participant
const S_MIN_TARGET = 65;
const S_MAX_TARGET = 165;
const V_MIN_TARGET = 75;
const V_MAX_TARGET = 205;

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
  // Sliders start at 255 so the full-color uploaded photo from Stage 2 is initially displayed.
  // Participants adjust the sliders to filter out background camouflage noise.
  const [sMax, setSMax] = useState(255);
  const [vMax, setVMax] = useState(255);
  const [foundPayload, setFoundPayload] = useState<ParsedPayload | null>(null);

  const thresholds: HsvThresholds = {
    hMin: 0,
    hMax: 179,
    sMax,
    vMax,
    cleanupPasses: 1,
  };

  // Determine whether the sliders are in the target range where the QR is visually clear
  const isQrVisible =
    sMax >= S_MIN_TARGET && sMax <= S_MAX_TARGET && vMax >= V_MIN_TARGET && vMax <= V_MAX_TARGET;

  const drawFrame = useCallback((frame: ImageData | null) => {
    const canvas = canvasRef.current;
    if (!canvas || !frame) return;

    canvas.width = frame.width;
    canvas.height = frame.height;
    canvas.getContext("2d")?.putImageData(frame, 0, 0);
  }, []);

  const renderPreview = useCallback(
    (nextThresholds: HsvThresholds) => {
      const buffers = buffersRef.current;
      if (!buffers) return;

      const frame = renderHsvDissolveImageData(buffers, nextThresholds);
      drawFrame(frame);
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
        renderPreview(thresholds);
      } catch {
        if (!cancelled) setStatus("idle");
      }
    })();

    return () => {
      cancelled = true;
    };
    // Initial load only
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [file]);

  useEffect(() => {
    if (status === "loading" || status === "checking") return;
    renderPreview(thresholds);
    if (status === "found" || status === "wrong" || status === "not-found") {
      setStatus("idle");
      setFoundPayload(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sMax, vMax]);

  async function handleCheckSignal() {
    const buffers = buffersRef.current;
    if (!buffers) return;

    if (!isQrVisible) {
      setStatus("not-found");
      return;
    }

    setStatus("checking");
    try {
      const result = await verifyOriginalImage(buffers, chitCode);
      if (result.success && result.payload) {
        setFoundPayload(result.payload);
        setStatus("found");
        onDecoded(result.payload);
      } else if (result.error === "wrong") {
        setFoundPayload(null);
        setStatus("wrong");
      } else {
        setFoundPayload(null);
        setStatus("not-found");
      }
    } catch {
      setStatus("not-found");
    }
  }

  const isBusy = status === "loading" || status === "checking";
  const scopeClass = status === "found" ? "detected" : isQrVisible ? "hot" : "";

  return (
    <StageShell railStage="adjust">
      <div className="eyebrow">
        <span className="rule" />
        STAGE 03
      </div>
      <h2 className="stage-title">Reveal the QR code</h2>
      <p className="stage-sub">
        Adjust the sliders to remove the filter and reveal the QR code clearly, then click Check QR.
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
          <span className={`status-pill ${status === "checking" ? "searching" : isQrVisible ? "found" : ""}`}>
            <span className="led" />
            {status === "loading"
              ? "PREPARING IMAGE..."
              : status === "checking"
                ? "VERIFYING QR..."
                : isQrVisible
                  ? "QR VISIBLE — READY TO CHECK"
                  : "FULL PHOTO — ADJUST SLIDERS TO FILTER"}
          </span>
        )}
      </div>

      {status === "found" && foundPayload ? (
        <div className="panel text-center" style={{ marginBottom: 18 }}>
          <p className="mono" style={{ color: "var(--signal)", fontSize: 13, marginBottom: 6 }}>
            QR VERIFIED
          </p>
          <p className="mono" style={{ fontSize: 22, letterSpacing: "0.08em" }}>
            {foundPayload.chitCode}
          </p>
        </div>
      ) : (
        <div className="adjuster-panel">
          <Slider
            label="Saturation filter"
            value={sMax}
            min={0}
            max={255}
            disabled={isBusy}
            onChange={setSMax}
          />
          <Slider
            label="Value filter"
            value={vMax}
            min={0}
            max={255}
            disabled={isBusy}
            onChange={setVMax}
          />
          <p className="helper-text" style={{ marginTop: 4, marginBottom: 16 }}>
            Lower the saturation and value sliders to filter out background camouflage noise until the QR pattern is clearly visible.
          </p>
        </div>
      )}

      <div className="stack">
        {status !== "found" && (
          <button
            className="btn btn-signal"
            onClick={handleCheckSignal}
            disabled={isBusy || !isQrVisible}
            title={!isQrVisible ? "Adjust sliders to make the QR code clearly visible first" : undefined}
          >
            {status === "checking" ? "Verifying..." : "Check QR"}
          </button>
        )}
        {!isQrVisible && status !== "found" && (
          <p className="helper-text text-center" style={{ marginTop: -8, marginBottom: 8, color: "var(--warn, #e09a4a)" }}>
            Adjust sliders to reveal the QR pattern before checking.
          </p>
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
          This QR code belongs to another challenge. Make sure you're photographing the QR for {chitCode}.
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


"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { StageShell } from "../StageShell";
import {
  attemptDecode,
  autoSearch,
  buildBuffers,
  loadImage,
} from "@/lib/qr/decoder";
import { HsvBuffers, HsvThresholds } from "@/lib/qr/hsv";
import { parsePayload } from "@/lib/qr/parser";

type Status = "idle" | "loading" | "searching" | "found" | "wrong" | "not-found";

const PREVIEW_DIM = 640;

export function HSVStage({
  chitCode,
  file,
  onDecoded,
  onRetake,
}: {
  chitCode: string;
  file: File;
  onDecoded: (payload: ReturnType<typeof parsePayload>) => void;
  onRetake: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const buffersRef = useRef<HsvBuffers | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const [status, setStatus] = useState<Status>("loading");
  const [sMax, setSMax] = useState(130);
  const [vMax, setVMax] = useState(180);
  const [hMax, setHMax] = useState(179);
  const [showHue, setShowHue] = useState(false);
  const [searchProgress, setSearchProgress] = useState(0);
  const [foundPayload, setFoundPayload] = useState<ReturnType<typeof parsePayload>>(null);

  // Load the image once and build HSV buffers.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const img = await loadImage(file);
        if (cancelled) return;
        buffersRef.current = buildBuffers(img, PREVIEW_DIM);
        setStatus("idle");
        renderMask({ hMin: 0, hMax, sMax, vMax });
      } catch {
        if (!cancelled) setStatus("idle");
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [file]);

  const renderMask = useCallback((thresholds: HsvThresholds) => {
    const buffers = buffersRef.current;
    const canvas = canvasRef.current;
    if (!buffers || !canvas) return;

    const result = attemptDecode(buffers, thresholds);
    canvas.width = buffers.width;
    canvas.height = buffers.height;
    const ctx = canvas.getContext("2d");
    if (ctx && result.mask) ctx.putImageData(result.mask, 0, 0);

    return result;
  }, []);

  const evaluate = useCallback(
    (thresholds: HsvThresholds) => {
      const result = renderMask(thresholds);
      if (!result) return;

      if (result.success && result.payload) {
        const parsed = parsePayload(result.payload);
        if (parsed && parsed.chitCode === chitCode.toUpperCase()) {
          setStatus("found");
          setFoundPayload(parsed);
          return;
        }
        if (parsed) {
          setStatus("wrong");
          return;
        }
      }
      setStatus((s) => (s === "found" || s === "wrong" ? "idle" : s));
    },
    [renderMask, chitCode]
  );

  // Debounced re-evaluation whenever a slider changes.
  useEffect(() => {
    if (status === "loading" || status === "searching") return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      evaluate({ hMin: 0, hMax, sMax, vMax });
    }, 90);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sMax, vMax, hMax]);

  async function handleAutoFind() {
    const buffers = buffersRef.current;
    if (!buffers) return;

    setStatus("searching");
    setSearchProgress(0);
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    const result = await autoSearch(buffers, {
      expectedChitCode: chitCode,
      onProgress: setSearchProgress,
      signal: controller.signal,
    });

    if (result.success && result.payload && result.thresholds) {
      setSMax(result.thresholds.sMax);
      setVMax(result.thresholds.vMax);
      setHMax(result.thresholds.hMax);

      const canvas = canvasRef.current;
      if (canvas && result.mask) {
        canvas.width = result.mask.width;
        canvas.height = result.mask.height;
        canvas.getContext("2d")?.putImageData(result.mask, 0, 0);
      }

      const parsed = parsePayload(result.payload);
      setFoundPayload(parsed);
      setStatus("found");
    } else {
      setStatus("not-found");
    }
  }

  const isBusy = status === "loading" || status === "searching";

  return (
    <StageShell railStage="adjust">
      <div className="eyebrow">
        <span className="rule" />
        STAGE 03
      </div>
      <h2 className="stage-title">Reveal the signal</h2>
      <p className="stage-sub">
        The QR is hidden in the texture. Filter by saturation and value to isolate it — or let
        auto find do the sweep for you.
      </p>

      <div className="scope" style={{ marginBottom: 18 }}>
        <canvas ref={canvasRef} />
        <div className="scope-grid" />
        {status === "searching" && <div className="scope-sweep" />}
        <span className="scope-corner tl" />
        <span className="scope-corner tr" />
        <span className="scope-corner bl" />
        <span className="scope-corner br" />
      </div>

      <div style={{ marginBottom: 18, display: "flex", justifyContent: "center" }}>
        {status === "searching" && (
          <span className="status-pill searching">
            <span className="led" />
            SEARCHING… {Math.round(searchProgress * 100)}%
          </span>
        )}
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
        {(status === "idle" || status === "loading") && (
          <span className="status-pill">
            <span className="led" />
            {status === "loading" ? "PREPARING IMAGE…" : "ADJUST TO REVEAL"}
          </span>
        )}
      </div>

      {status === "found" && foundPayload ? (
        <div className="panel text-center" style={{ marginBottom: 20 }}>
          <p className="mono" style={{ color: "var(--signal)", fontSize: 13, marginBottom: 6 }}>
            ✓ QR FOUND
          </p>
          <p className="mono" style={{ fontSize: 22, letterSpacing: "0.08em" }}>
            {foundPayload.chitCode}
          </p>
        </div>
      ) : (
        <div style={{ marginBottom: 6 }}>
          <div className="slider-row">
            <div className="slider-head">
              <span className="slider-name">Saturation</span>
              <span className="slider-value">≤ {sMax}</span>
            </div>
            <input
              type="range"
              min={0}
              max={255}
              value={sMax}
              disabled={isBusy}
              onChange={(e) => setSMax(Number(e.target.value))}
            />
          </div>

          <div className="slider-row">
            <div className="slider-head">
              <span className="slider-name">Value</span>
              <span className="slider-value">≤ {vMax}</span>
            </div>
            <input
              type="range"
              min={0}
              max={255}
              value={vMax}
              disabled={isBusy}
              onChange={(e) => setVMax(Number(e.target.value))}
            />
          </div>

          {showHue ? (
            <div className="slider-row">
              <div className="slider-head">
                <span className="slider-name">Hue ceiling</span>
                <span className="slider-value">≤ {hMax}</span>
              </div>
              <input
                type="range"
                min={0}
                max={179}
                value={hMax}
                disabled={isBusy}
                onChange={(e) => setHMax(Number(e.target.value))}
              />
            </div>
          ) : (
            <button
              className="btn-sm btn-ghost"
              style={{ marginBottom: 10 }}
              onClick={() => setShowHue(true)}
            >
              + Hue control (rarely needed)
            </button>
          )}
        </div>
      )}

      <div className="stack">
        {status !== "found" && (
          <button className="btn btn-signal" onClick={handleAutoFind} disabled={isBusy}>
            {status === "searching" ? "Searching…" : "Auto find"}
          </button>
        )}
        {status === "found" ? (
          <button className="btn btn-primary" onClick={() => onDecoded(foundPayload)}>
            Continue →
          </button>
        ) : (
          <button className="btn btn-ghost" onClick={onRetake} disabled={status === "searching"}>
            Retake photo
          </button>
        )}
      </div>

      {status === "wrong" && (
        <p className="error-text text-center" style={{ marginTop: 12 }}>
          This QR belongs to another challenge. Make sure you're photographing the QR for{" "}
          {chitCode}.
        </p>
      )}
    </StageShell>
  );
}

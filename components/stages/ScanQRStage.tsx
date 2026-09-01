"use client";

import { useEffect, useRef, useState } from "react";
import { StageShell } from "../StageShell";

export function ScanQRStage({
  onCaptured,
  onBack,
}: {
  onCaptured: (file: File) => void;
  onBack: () => void;
}) {
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!file) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (f) setFile(f);
    e.target.value = "";
  }

  function retake() {
    setFile(null);
  }

  return (
    <StageShell railStage="scan">
      <div className="eyebrow">
        <span className="rule" />
        STAGE 02
      </div>
      <h2 className="stage-title">Photograph it</h2>
      <p className="stage-sub">
        Fill the frame with the QR. The photo stays on your phone — nothing is uploaded here.
      </p>

      <div className="photo-frame" style={{ marginBottom: 20 }}>
        {previewUrl ? (
          <img src={previewUrl} alt="Captured QR" />
        ) : (
          <div className="photo-placeholder">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4">
              <rect x="3" y="7" width="18" height="13" rx="2" />
              <path d="M8 7l1.4-2.4A1 1 0 0 1 10.26 4h3.48a1 1 0 0 1 .86.6L16 7" />
              <circle cx="12" cy="13.5" r="3.4" />
            </svg>
            <span style={{ fontSize: 13 }}>No photo yet</span>
          </div>
        )}
      </div>

      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileChange}
        style={{ display: "none" }}
      />
      <input
        ref={galleryInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        style={{ display: "none" }}
      />

      {!file ? (
        <div className="stack">
          <button className="btn btn-primary" onClick={() => cameraInputRef.current?.click()}>
            Open camera
          </button>
          <button className="btn btn-ghost" onClick={() => galleryInputRef.current?.click()}>
            Choose from gallery
          </button>
        </div>
      ) : (
        <div className="row">
          <button className="btn btn-ghost grow" onClick={retake}>
            Retake
          </button>
          <button className="btn btn-primary grow" onClick={() => onCaptured(file)}>
            Use this photo →
          </button>
        </div>
      )}

      <div className="stage-footer" style={{ paddingTop: 16 }}>
        <button className="btn btn-ghost btn-sm" onClick={onBack} style={{ alignSelf: "center" }}>
          ← Back
        </button>
      </div>
    </StageShell>
  );
}

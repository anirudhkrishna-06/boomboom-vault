"use client";

import { useRef, useState } from "react";
import { StageShell } from "../StageShell";

const MAX_LEN = 12;
const MIN_BOXES = 6;

export function VaultStage({
  chitCode,
  onSuccess,
}: {
  chitCode: string;
  onSuccess: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [value, setValue] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [denied, setDenied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (!value.trim()) return;
    setSubmitting(true);
    setDenied(false);
    setError(null);

    try {
      const res = await fetch("/api/validate-vault", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chitCode, enteredVaultCode: value.trim() }),
      });
      const data = await res.json();

      if (data.correct) {
        onSuccess();
      } else {
        setDenied(true);
      }
    } catch {
      setError("Couldn't reach the server. Check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  }

  const boxCount = Math.max(MIN_BOXES, value.length);
  const boxes = Array.from({ length: boxCount }, (_, i) => value[i] ?? "");

  return (
    <StageShell railStage="vault">
      <div className="eyebrow">
        <span className="rule" />
        STAGE 06
      </div>
      <h2 className="stage-title">The vault</h2>
      <p className="stage-sub">
        Combine what the color and shape ciphers gave you, in the order specified, to form the
        final code.
      </p>

      <div
        className="vault-input-wrap"
        onClick={() => inputRef.current?.focus()}
        style={{ marginBottom: 8 }}
      >
        <div className="vault-boxes">
          {boxes.map((ch, i) => (
            <div className={`vault-box ${ch ? "filled" : ""}`} key={i}>
              {ch}
            </div>
          ))}
        </div>
        <input
          ref={inputRef}
          className="vault-hidden-input"
          value={value}
          maxLength={MAX_LEN}
          inputMode="numeric"
          autoFocus
          onChange={(e) => {
            setValue(e.target.value.replace(/[^0-9]/g, ""));
            setDenied(false);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") submit();
          }}
        />
      </div>

      {denied && (
        <div className="panel text-center" style={{ borderColor: "rgba(226,88,90,0.4)" }}>
          <p className="mono" style={{ color: "var(--danger)", fontSize: 13, marginBottom: 4 }}>
            ACCESS DENIED
          </p>
          <p style={{ color: "var(--text-muted)", fontSize: 14 }}>
            That code isn't correct. Try again.
          </p>
        </div>
      )}

      {error && <p className="error-text text-center">{error}</p>}

      <div className="stage-footer">
        <button className="btn btn-primary" onClick={submit} disabled={submitting || !value}>
          {submitting ? "Unlocking…" : "Unlock"}
        </button>
      </div>
    </StageShell>
  );
}

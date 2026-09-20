"use client";

import { useRef, useState } from "react";
import { StageShell } from "../StageShell";
import { McqAnswer, McqGate } from "@/lib/mcq/questions";
import { combineCipherCodes, deriveColorCode, deriveShapeCode } from "@/lib/qr/cipher";
import { ParsedPayload } from "@/lib/qr/parser";

const MAX_LEN = 8;
const MIN_BOXES = 8;

export function VaultStage({
  chitCode,
  teamName,
  payload,
  colorCode,
  shapeCode,
  mcqAnswers,
  onSuccess,
}: {
  chitCode: string;
  teamName: string;
  payload: ParsedPayload | null;
  colorCode: string;
  shapeCode: string;
  mcqAnswers: Partial<Record<McqGate, McqAnswer>>;
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

    const mcqRows = [
      { gate: "color" as const, label: "Color MCQ", answer: mcqAnswers.color },
      { gate: "shape" as const, label: "Shape MCQ", answer: mcqAnswers.shape },
    ];
    const mcqScore = mcqRows.filter((row) => row.answer?.isCorrect).length;

    try {
      const res = await fetch("/api/validate-vault", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chitCode,
          teamName,
          enteredVaultCode: value.trim(),
          mcqScore,
        }),
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

  const resolvedColorCode = colorCode || (payload ? deriveColorCode(payload) : "");
  const resolvedShapeCode = shapeCode || (payload ? deriveShapeCode(payload) : "");
  const order = payload?.operationOrder?.length ? payload.operationOrder : ["COLOR", "SHAPE"];
  const finalPreview = combineCipherCodes(resolvedColorCode, resolvedShapeCode, order);
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

      <div className="vault-summary">
        <div className="code-strip">
          <span>Color code</span>
          <strong className="mono">{resolvedColorCode || "----"}</strong>
        </div>
        <div className="code-strip">
          <span>Shape code</span>
          <strong className="mono">{resolvedShapeCode || "----"}</strong>
        </div>
        <div className="code-strip emphasis">
          <span>Order</span>
          <strong className="mono">{order.join(" + ")}</strong>
        </div>
      </div>

      <div className="vault-input-wrap" onClick={() => inputRef.current?.focus()} style={{ marginBottom: 8 }}>
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
          {submitting ? "Unlocking..." : "Unlock"}
        </button>
      </div>
    </StageShell>
  );
}

"use client";

import { useState } from "react";
import { StageShell } from "../StageShell";
import { deriveColorCode } from "@/lib/qr/cipher";
import { ParsedPayload } from "@/lib/qr/parser";

const SWATCH: Record<string, string> = {
  RED: "#e2585a",
  BLUE: "#4f8fe2",
  GREEN: "#59c78a",
  YELLOW: "#e0b84a",
  CYAN: "#4fd0e2",
  MAGENTA: "#d15fd6",
  ORANGE: "#e2914f",
  PURPLE: "#9d6fe0",
};

export function ColorCipherStage({
  payload,
  savedAnswer,
  onContinue,
}: {
  payload: ParsedPayload;
  savedAnswer: string;
  onContinue: (workingAnswer: string) => void;
}) {
  const derivedCode = deriveColorCode(payload);
  const [answer, setAnswer] = useState(savedAnswer ?? "");
  const colorEntries = Object.entries(payload.colorMap);

  return (
    <StageShell railStage="color">
      <div className="eyebrow">
        <span className="rule" />
        STAGE 04
      </div>
      <h2 className="stage-title">Color cipher</h2>
      <p className="stage-sub">Match each color to its digit, then work through the sequence.</p>

      <div className="cipher-grid">
        {colorEntries.map(([name, num]) => (
          <div className="cipher-row-pair" key={name} style={{ display: "contents" }}>
            <div className="cipher-cell">
              <span className="swatch" style={{ background: SWATCH[name] ?? "#666" }} />
              {name}
            </div>
            <div className="cipher-cell num">{num}</div>
          </div>
        ))}
      </div>

      <span className="field-label">Sequence</span>
      <div className="sequence-row" style={{ marginBottom: 26 }}>
        {payload.colorSequence.map((c, i) => (
          <span key={i} style={{ display: "contents" }}>
            <span className="sequence-chip">{c}</span>
            {i < payload.colorSequence.length - 1 && <span className="sequence-arrow">-&gt;</span>}
          </span>
        ))}
      </div>

      <span className="field-label">Color code</span>
      <input
        className="input"
        placeholder="e.g. 5921"
        value={answer}
        inputMode="numeric"
        onChange={(e) => setAnswer(e.target.value.replace(/[^0-9]/g, ""))}
        style={{ fontSize: 18, marginBottom: 4 }}
      />

      <div className="stage-footer">
        <button
          className="btn btn-primary"
          onClick={() => onContinue(answer)}
          disabled={answer.trim().length === 0}
        >
          Continue -&gt;
        </button>
      </div>
    </StageShell>
  );
}

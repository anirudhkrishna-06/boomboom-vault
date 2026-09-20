"use client";

import { useState } from "react";
import { StageShell } from "../StageShell";
import { buildObfuscatedDisplayEntries, deriveChitOffsetKey } from "@/lib/cipher/obfuscation";
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
  LIME: "#9bd94a",
  PINK: "#f07ab8",
  TEAL: "#3fb9ad",
  BROWN: "#9a6a3a",
  WHITE: "#e8e8df",
  BLACK: "#242424",
  MAROON: "#8b2d3b",
  NAVY: "#253f78",
};

const COLOR_DISTRACTORS = [
  "LIME",
  "PINK",
  "TEAL",
  "BROWN",
  "WHITE",
  "BLACK",
  "MAROON",
  "NAVY",
];

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
  const [answer, setAnswer] = useState(savedAnswer || derivedCode);
  const offsetKey = deriveChitOffsetKey(payload.chitCode);
  const colorEntries = buildObfuscatedDisplayEntries({
    map: payload.colorMap,
    sequence: payload.colorSequence,
    candidates: COLOR_DISTRACTORS,
    chitCode: payload.chitCode,
    namespace: "color",
  });

  return (
    <StageShell railStage="color">
      <div className="eyebrow">
        <span className="rule" />
        STAGE 04
      </div>
      <h2 className="stage-title">Color cipher</h2>
      <p className="stage-sub">Match each color to its digit, then work through the sequence.</p>

      <div className="panel cipher-legend">
        <p className="mono">CHIT KEY: {offsetKey}</p>
        <p>
          Add the digits in your chit code, keep the last digit, then subtract that key from each
          displayed table digit. Only colors in the sequence build the code.
        </p>
      </div>

      <div className="cipher-grid">
        {colorEntries.map((entry) => (
          <div className="cipher-row-pair" key={entry.name} style={{ display: "contents" }}>
            <div className="cipher-cell">
              <span className="swatch" style={{ background: SWATCH[entry.name] ?? "#666" }} />
              {entry.name}
            </div>
            <div className="cipher-cell num">{entry.displayDigit}</div>
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

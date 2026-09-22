"use client";

import { useState } from "react";
import { StageShell } from "../StageShell";
import { McqAnswer, McqGate, McqQuestion } from "@/lib/mcq/questions";

const GATE_COPY: Record<McqGate, { stage: string; title: string; railStage: "color" | "shape" }> = {
  color: {
    stage: "STAGE 04",
    title: "Color access check",
    railStage: "color",
  },
  shape: {
    stage: "STAGE 05",
    title: "Shape access check",
    railStage: "shape",
  },
};

export function MCQStage({
  gate,
  question,
  savedAnswer,
  onBack,
  onContinue,
}: {
  gate: McqGate;
  question: McqQuestion;
  savedAnswer?: McqAnswer;
  onBack?: () => void;
  onContinue: (answer: McqAnswer) => void;
}) {
  const savedIndex = savedAnswer
    ? question.options.findIndex((option) => option === savedAnswer.selectedOption)
    : -1;
  const [selectedIndex, setSelectedIndex] = useState<number | null>(savedIndex >= 0 ? savedIndex : null);
  const copy = GATE_COPY[gate];

  function submit() {
    if (selectedIndex === null) return;

    onContinue({
      gate,
      questionId: question.id,
      prompt: question.prompt,
      selectedOption: question.options[selectedIndex],
      correctOption: question.options[question.correctOptionIndex],
      isCorrect: selectedIndex === question.correctOptionIndex,
      answeredAt: new Date().toISOString(),
    });
  }

  return (
    <StageShell railStage={copy.railStage}>
      <div className="eyebrow">
        <span className="rule" />
        {copy.stage}
      </div>
      <h2 className="stage-title">{copy.title}</h2>
      <p className="stage-sub">
        Choose one answer to unlock the next cipher. The result is shown only at the vault.
      </p>

      <div className="panel mcq-panel">
        <p className="mcq-question">{question.prompt}</p>
        <div className="mcq-options">
          {question.options.map((option, index) => (
            <button
              className={`mcq-option ${selectedIndex === index ? "selected" : ""}`}
              key={option}
              type="button"
              onClick={() => setSelectedIndex(index)}
            >
              <span className="mono">{String.fromCharCode(65 + index)}</span>
              {option}
            </button>
          ))}
        </div>
      </div>

      <div className="stage-footer">
        {onBack && (
          <button className="btn btn-ghost" type="button" onClick={onBack}>
            &lt;- Back
          </button>
        )}
        <button className="btn btn-primary" onClick={submit} disabled={selectedIndex === null}>
          Submit -&gt;
        </button>
      </div>
    </StageShell>
  );
}

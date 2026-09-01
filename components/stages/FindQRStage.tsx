"use client";

import { StageShell } from "../StageShell";

export function FindQRStage({
  chitCode,
  onFound,
}: {
  chitCode: string;
  onFound: () => void;
}) {
  return (
    <StageShell railStage="find">
      <div className="eyebrow">
        <span className="rule" />
        CHIT {chitCode}
      </div>
      <h2 className="stage-title">Find the QR</h2>
      <p className="stage-sub">
        Follow the clue printed on your chit. It leads to a camouflaged QR — it won't look like
        an ordinary QR code, so look carefully.
      </p>

      <div className="panel" style={{ marginBottom: 0 }}>
        <div className="stack">
          <div className="row" style={{ alignItems: "flex-start" }}>
            <span className="mono" style={{ color: "var(--brass)", fontSize: 13, minWidth: 20 }}>
              01
            </span>
            <p style={{ fontSize: 14, color: "var(--text-muted)", lineHeight: 1.6 }}>
              Read the clue on your chit and go to the location it describes.
            </p>
          </div>
          <div className="row" style={{ alignItems: "flex-start" }}>
            <span className="mono" style={{ color: "var(--brass)", fontSize: 13, minWidth: 20 }}>
              02
            </span>
            <p style={{ fontSize: 14, color: "var(--text-muted)", lineHeight: 1.6 }}>
              The QR is blended into its surroundings. It won't jump out — that's intentional.
            </p>
          </div>
          <div className="row" style={{ alignItems: "flex-start" }}>
            <span className="mono" style={{ color: "var(--brass)", fontSize: 13, minWidth: 20 }}>
              03
            </span>
            <p style={{ fontSize: 14, color: "var(--text-muted)", lineHeight: 1.6 }}>
              Once you've found it, bring it fully into view and continue.
            </p>
          </div>
        </div>
      </div>

      <div className="stage-footer">
        <button className="btn btn-primary" onClick={onFound}>
          I've found it →
        </button>
      </div>
    </StageShell>
  );
}

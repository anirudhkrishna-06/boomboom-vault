"use client";

import { useState, useEffect } from "react";
import { ChitStage } from "@/components/stages/ChitStage";
import { FindQRStage } from "@/components/stages/FindQRStage";
import { ScanQRStage } from "@/components/stages/ScanQRStage";
import { HSVStage } from "@/components/stages/HSVStage";
import { MCQStage } from "@/components/stages/MCQStage";
import { ColorCipherStage } from "@/components/stages/ColorCipherStage";
import { ShapeCipherStage } from "@/components/stages/ShapeCipherStage";
import { VaultStage } from "@/components/stages/VaultStage";
import { SuccessStage } from "@/components/stages/SuccessStage";
import { McqAnswer, pickMcqQuestions } from "@/lib/mcq/questions";
import { ParsedPayload } from "@/lib/qr/parser";

type Stage =
  | "chit"
  | "find"
  | "scan"
  | "adjust"
  | "colorMcq"
  | "color"
  | "shapeMcq"
  | "shape"
  | "vault"
  | "success";

export default function Home() {
  const [stage, setStage] = useState<Stage>("chit");
  const [chitCode, setChitCode] = useState("");
  const [teamName, setTeamName] = useState("");
  const [capturedFile, setCapturedFile] = useState<File | null>(null);
  const [payload, setPayload] = useState<ParsedPayload | null>(null);
  const [colorCode, setColorCode] = useState("");
  const [shapeCode, setShapeCode] = useState("");
  const [mcqAnswers, setMcqAnswers] = useState<Partial<Record<"color" | "shape", McqAnswer>>>({});

  useEffect(() => {
    const stored = localStorage.getItem("teamName");
    if (stored) setTeamName(stored);
  }, []);

  switch (stage) {
    case "chit":
      return (
        <ChitStage
          onValid={(code, team) => {
            setChitCode(code);
            setTeamName(team);
            localStorage.setItem("teamName", team);
            setStage("find");
          }}
        />
      );

    case "find":
      return <FindQRStage chitCode={chitCode} onFound={() => setStage("scan")} />;

    case "scan":
      return (
        <ScanQRStage
          onCaptured={(file) => {
            setCapturedFile(file);
            setStage("adjust");
          }}
          onBack={() => setStage("find")}
        />
      );

    case "adjust":
      if (!capturedFile) {
        setStage("scan");
        return null;
      }
      return (
        <HSVStage
          chitCode={chitCode}
          file={capturedFile}
          onDecoded={(parsed) => {
            if (!parsed) return;
            setPayload(parsed);
            setColorCode("");
            setShapeCode("");
            setMcqAnswers({});
            setStage("colorMcq");
          }}
          onRetake={() => {
            setCapturedFile(null);
            setStage("scan");
          }}
        />
      );

    case "colorMcq": {
      if (!payload) {
        setStage("adjust");
        return null;
      }
      const question = pickMcqQuestions(chitCode).color;
      return (
        <MCQStage
          gate="color"
          question={question}
          savedAnswer={mcqAnswers.color}
          onBack={() => setStage("adjust")}
          onContinue={(answer) => {
            setMcqAnswers((current) => ({ ...current, color: answer }));
            setStage("color");
          }}
        />
      );
    }

    case "color":
      if (!payload) {
        setStage("adjust");
        return null;
      }
      return (
        <ColorCipherStage
          payload={payload}
          savedAnswer={colorCode}
          onBack={() => setStage("colorMcq")}
          onContinue={(answer) => {
            setColorCode(answer);
            setStage("shapeMcq");
          }}
        />
      );

    case "shapeMcq": {
      if (!payload) {
        setStage("adjust");
        return null;
      }
      const question = pickMcqQuestions(chitCode).shape;
      return (
        <MCQStage
          gate="shape"
          question={question}
          savedAnswer={mcqAnswers.shape}
          onBack={() => setStage("color")}
          onContinue={(answer) => {
            setMcqAnswers((current) => ({ ...current, shape: answer }));
            setStage("shape");
          }}
        />
      );
    }

    case "shape":
      if (!payload) {
        setStage("adjust");
        return null;
      }
      return (
        <ShapeCipherStage
          payload={payload}
          colorCode={colorCode}
          savedAnswer={shapeCode}
          onBack={() => setStage("shapeMcq")}
          onContinue={(answer) => {
            setShapeCode(answer);
            setStage("vault");
          }}
        />
      );

    case "vault":
      return (
        <VaultStage
          chitCode={chitCode}
          teamName={teamName}
          payload={payload}
          colorCode={colorCode}
          shapeCode={shapeCode}
          mcqAnswers={mcqAnswers}
          onSuccess={() => setStage("success")}
        />
      );

    case "success":
      return <SuccessStage chitCode={chitCode} teamName={teamName} mcqAnswers={mcqAnswers} />


    default:
      return null;
  }
}

"use client";

import { useState } from "react";
import { ChitStage } from "@/components/stages/ChitStage";
import { FindQRStage } from "@/components/stages/FindQRStage";
import { ScanQRStage } from "@/components/stages/ScanQRStage";
import { HSVStage } from "@/components/stages/HSVStage";
import { ColorCipherStage } from "@/components/stages/ColorCipherStage";
import { ShapeCipherStage } from "@/components/stages/ShapeCipherStage";
import { VaultStage } from "@/components/stages/VaultStage";
import { SuccessStage } from "@/components/stages/SuccessStage";
import { ParsedPayload } from "@/lib/qr/parser";

type Stage = "chit" | "find" | "scan" | "adjust" | "color" | "shape" | "vault" | "success";

export default function Home() {
  const [stage, setStage] = useState<Stage>("chit");
  const [chitCode, setChitCode] = useState("");
  const [capturedFile, setCapturedFile] = useState<File | null>(null);
  const [payload, setPayload] = useState<ParsedPayload | null>(null);
  const [colorCode, setColorCode] = useState("");
  const [shapeCode, setShapeCode] = useState("");

  switch (stage) {
    case "chit":
      return (
        <ChitStage
          onValid={(code) => {
            setChitCode(code);
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
            setStage("color");
          }}
          onRetake={() => {
            setCapturedFile(null);
            setStage("scan");
          }}
        />
      );

    case "color":
      if (!payload) {
        setStage("adjust");
        return null;
      }
      return (
        <ColorCipherStage
          payload={payload}
          savedAnswer={colorCode}
          onContinue={(answer) => {
            setColorCode(answer);
            setStage("shape");
          }}
        />
      );

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
          payload={payload}
          colorCode={colorCode}
          shapeCode={shapeCode}
          onSuccess={() => setStage("success")}
        />
      );

    case "success":
      return <SuccessStage chitCode={chitCode} />;

    default:
      return null;
  }
}

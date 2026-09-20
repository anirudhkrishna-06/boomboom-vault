import { ParsedPayload } from "./parser";

export function deriveColorCode(payload: ParsedPayload): string {
  return payload.colorSequence.map((name) => payload.colorMap[name] ?? "").join("");
}

export function deriveShapeCode(payload: ParsedPayload): string {
  return payload.shapeSequence.map((name) => payload.shapeMap[name] ?? "").join("");
}

export function combineCipherCodes(
  colorCode: string,
  shapeCode: string,
  operationOrder: string[]
): string {
  const normalized = operationOrder.map((part) => part.trim().toUpperCase());
  if (normalized[0] === "SHAPE") return shapeCode + colorCode;
  return colorCode + shapeCode;
}

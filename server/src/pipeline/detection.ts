import { DetectionSchema } from "../types";

export interface DetectionCallResult extends DetectionSchema {
  inputTokens: number;
  outputTokens: number;
}

/**
 * Stands in for the real vision-LLM call (see "Implement detection + OCR
 * call"). The real implementation swaps this function's body for an
 * Anthropic API call and keeps this same return shape — everything
 * downstream (filtering, review-flagging, token logging) is written
 * against DetectionCallResult, not against how it's produced.
 *
 * Branches on the filename rather than pixel content so callers/tests can
 * deterministically exercise each outcome without needing to craft real
 * image bytes for every case — the resize step ahead of this still runs
 * against real image bytes when they're valid.
 */
export async function mockDetect(image: Buffer, originalFilename: string): Promise<DetectionCallResult> {
  await new Promise((resolve) => setImmediate(resolve));

  const name = originalFilename.toLowerCase();
  const inputTokens = Math.max(200, Math.round(image.byteLength / 4));

  if (name.includes("not-a-note")) {
    return {
      is_note: false,
      confidence: 0.94,
      extracted_text: "",
      has_diagram: false,
      inputTokens,
      outputTokens: 15,
    };
  }

  if (name.includes("low-confidence")) {
    return {
      is_note: true,
      confidence: 0.35,
      extracted_text: "(uncertain) partial legible fragment",
      has_diagram: false,
      inputTokens,
      outputTokens: 40,
    };
  }

  const hasDiagram = name.includes("diagram");
  const extractedText = `Mock OCR transcript for ${originalFilename}`;
  return {
    is_note: true,
    confidence: 0.92,
    extracted_text: extractedText,
    has_diagram: hasDiagram,
    inputTokens,
    outputTokens: Math.max(20, Math.round(extractedText.length / 4)),
  };
}

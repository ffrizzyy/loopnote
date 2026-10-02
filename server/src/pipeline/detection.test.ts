import { mockDetect } from "./detection";

describe("mockDetect", () => {
  it("reports is_note: false for images flagged as not-a-note", async () => {
    const result = await mockDetect(Buffer.from("x"), "vacation-not-a-note.jpg");
    expect(result.is_note).toBe(false);
    expect(result.extracted_text).toBe("");
  });

  it("reports low confidence for images flagged as low-confidence", async () => {
    const result = await mockDetect(Buffer.from("x"), "smudged-low-confidence.jpg");
    expect(result.is_note).toBe(true);
    expect(result.confidence).toBeLessThan(0.6);
  });

  it("defaults to a confident note with non-empty extracted text", async () => {
    const result = await mockDetect(Buffer.from("x"), "whiteboard-01.jpg");
    expect(result.is_note).toBe(true);
    expect(result.confidence).toBeGreaterThanOrEqual(0.6);
    expect(result.extracted_text.length).toBeGreaterThan(0);
    expect(result.has_diagram).toBe(false);
  });

  it("flags has_diagram when the filename indicates a diagram", async () => {
    const result = await mockDetect(Buffer.from("x"), "system-diagram.jpg");
    expect(result.has_diagram).toBe(true);
  });

  it("always reports positive token counts for cost logging", async () => {
    const result = await mockDetect(Buffer.from("x"), "note.jpg");
    expect(result.inputTokens).toBeGreaterThan(0);
    expect(result.outputTokens).toBeGreaterThan(0);
  });
});

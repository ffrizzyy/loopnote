import { mockSummarize } from "./summarization";

describe("mockSummarize", () => {
  it("produces flashcards for genuinely testable content", async () => {
    const result = await mockSummarize("The mitochondria is the powerhouse of the cell.", "biology-ch4.jpg");
    expect(result.flashcards.length).toBeGreaterThan(0);
    expect(result.tags).toContain("study");
  });

  it("returns an empty flashcards array for reference-only content instead of inventing questions", async () => {
    const result = await mockSummarize("milk, eggs, bread, reference-only grocery list", "list.jpg");
    expect(result.flashcards).toEqual([]);
  });

  it("derives a topic from the filename", async () => {
    const result = await mockSummarize("some text", "cell-biology-notes.jpg");
    expect(result.topic.toLowerCase()).toContain("cell biology notes");
  });

  it("always reports positive token counts for cost logging", async () => {
    const result = await mockSummarize("some text", "note.jpg");
    expect(result.inputTokens).toBeGreaterThan(0);
    expect(result.outputTokens).toBeGreaterThan(0);
  });
});

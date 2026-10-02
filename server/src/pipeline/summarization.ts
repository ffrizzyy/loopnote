import { SummarizationSchema } from "../types";

export interface SummarizationCallResult extends SummarizationSchema {
  inputTokens: number;
  outputTokens: number;
}

/**
 * Stands in for the real summarization/flashcard-generation LLM call. Same
 * contract note as detection.ts: the real implementation swaps this
 * function's body for an Anthropic call and keeps this return shape.
 *
 * Branches on the extracted text (what a real call would actually see)
 * rather than the filename, so it composes correctly with mockDetect's
 * output instead of needing its own separate test-control channel.
 */
export async function mockSummarize(extractedText: string, filename: string): Promise<SummarizationCallResult> {
  await new Promise((resolve) => setImmediate(resolve));

  const outputTokens = Math.max(30, Math.round(extractedText.length / 3));
  const inputTokens = Math.max(50, Math.round(extractedText.length / 4));

  // "reference-only" content (e.g. a grocery list, a phone number jotted
  // down) has nothing to quiz someone on — flashcards must stay empty
  // rather than the model inventing questions to fill the field.
  const isGenuinelyTestable = !extractedText.toLowerCase().includes("reference-only");

  const topic = filename.replace(/\.[a-z0-9]+$/i, "").replace(/[-_]+/g, " ").trim() || "Untitled note";

  return {
    topic,
    summary: `Mock summary of: ${extractedText}`,
    tags: isGenuinelyTestable ? ["study", "notes"] : ["reference"],
    flashcards: isGenuinelyTestable
      ? [
          { question: `What is the main topic of "${topic}"?`, answer: `See: ${extractedText}` },
          { question: `Summarize "${topic}" in one sentence.`, answer: `Mock summary of: ${extractedText}` },
        ]
      : [],
    inputTokens,
    outputTokens,
  };
}

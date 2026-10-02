export interface TopicSignature {
  topicId: string;
  topicName: string;
  /** Aggregated tags across all notes currently in this topic. */
  tags: string[];
}

export interface TopicMatch {
  topicId: string;
  topicName: string;
  /** Jaccard similarity (intersection / union) between the note's tags
   * and the topic's aggregated tags, in [0, 1]. */
  confidence: number;
}

const DEFAULT_THRESHOLD = 0.2;

/**
 * Suggests the best-matching existing topic for a note's tags, by tag
 * overlap (Jaccard similarity). Returns null when there's no signal
 * (either side has no tags) or nothing clears the confidence threshold —
 * "no suggestion" rather than a low-confidence guess presented as
 * confident, since a wrong suggestion is exactly what "mis-grouping"
 * means here.
 *
 * This only ever *suggests* — nothing in this module writes to a note or
 * topic. The caller (the review flow) still requires an explicit
 * merge/keep action before any grouping actually happens.
 */
export function suggestTopic(
  noteTags: string[],
  topics: TopicSignature[],
  threshold: number = DEFAULT_THRESHOLD
): TopicMatch | null {
  if (noteTags.length === 0 || topics.length === 0) return null;

  const noteSet = new Set(noteTags.map((t) => t.toLowerCase()));
  let best: TopicMatch | null = null;
  let bestScore = 0;

  for (const topic of topics) {
    const topicSet = new Set(topic.tags.map((t) => t.toLowerCase()));
    if (topicSet.size === 0) continue;

    let intersectionSize = 0;
    for (const tag of noteSet) {
      if (topicSet.has(tag)) intersectionSize += 1;
    }
    const unionSize = new Set([...noteSet, ...topicSet]).size;
    const score = unionSize === 0 ? 0 : intersectionSize / unionSize;

    if (score > bestScore) {
      bestScore = score;
      best = { topicId: topic.topicId, topicName: topic.topicName, confidence: score };
    }
  }

  return best && bestScore >= threshold ? best : null;
}

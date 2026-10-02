import { suggestTopic, TopicSignature } from "./matchTopic";

describe("suggestTopic", () => {
  it("picks the topic with the highest tag overlap", () => {
    const topics: TopicSignature[] = [
      { topicId: "bio", topicName: "Biology", tags: ["biology", "cells", "mitochondria"] },
      { topicId: "chem", topicName: "Chemistry", tags: ["chemistry", "reactions"] },
    ];
    // intersection {biology, cells} = 2; union {biology,cells,mitochondria,history} = 4 -> 0.5
    const match = suggestTopic(["biology", "cells", "history"], topics);
    expect(match?.topicId).toBe("bio");
    expect(match?.confidence).toBeCloseTo(0.5, 5);
  });

  it("computes exact Jaccard similarity", () => {
    const topics: TopicSignature[] = [{ topicId: "t1", topicName: "T1", tags: ["a", "b", "c"] }];
    // intersection {a,b} = 2; union {a,b,c,d} = 4 -> 0.5
    const match = suggestTopic(["a", "b", "d"], topics);
    expect(match?.confidence).toBeCloseTo(0.5, 5);
  });

  it("is case-insensitive", () => {
    const topics: TopicSignature[] = [{ topicId: "t1", topicName: "T1", tags: ["Biology"] }];
    const match = suggestTopic(["biology"], topics);
    expect(match?.topicId).toBe("t1");
    expect(match?.confidence).toBeCloseTo(1, 5);
  });

  it("returns null when no topic clears the confidence threshold", () => {
    const topics: TopicSignature[] = [{ topicId: "t1", topicName: "T1", tags: ["completely", "unrelated"] }];
    const match = suggestTopic(["biology", "cells"], topics);
    expect(match).toBeNull();
  });

  it("returns null when the note has no tags", () => {
    const topics: TopicSignature[] = [{ topicId: "t1", topicName: "T1", tags: ["biology"] }];
    expect(suggestTopic([], topics)).toBeNull();
  });

  it("returns null when there are no existing topics", () => {
    expect(suggestTopic(["biology"], [])).toBeNull();
  });

  it("skips topics with no tags of their own rather than crashing", () => {
    const topics: TopicSignature[] = [
      { topicId: "empty", topicName: "Empty", tags: [] },
      { topicId: "bio", topicName: "Biology", tags: ["biology"] },
    ];
    const match = suggestTopic(["biology"], topics);
    expect(match?.topicId).toBe("bio");
  });

  it("respects a custom threshold", () => {
    const topics: TopicSignature[] = [{ topicId: "t1", topicName: "T1", tags: ["a", "b", "c", "d", "e"] }];
    // intersection {a} = 1; union {a,b,c,d,e,f} = 6 -> ~0.167
    const lowMatch = suggestTopic(["a", "f"], topics, 0.1);
    expect(lowMatch?.topicId).toBe("t1");
    const filteredOut = suggestTopic(["a", "f"], topics, 0.5);
    expect(filteredOut).toBeNull();
  });
});

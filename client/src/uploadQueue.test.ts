import { queueReducer, nextQueued, QueueItem } from "./uploadQueue";

function addOne(): QueueItem[] {
  return queueReducer([], { type: "ADD", items: [{ uri: "file:///a.jpg", filename: "a.jpg" }] });
}

describe("queueReducer", () => {
  it("adds items as queued with zero progress", () => {
    const state = addOne();
    expect(state).toHaveLength(1);
    expect(state[0].status).toBe("queued");
    expect(state[0].progress).toBe(0);
    expect(state[0].serverJobId).toBeNull();
  });

  it("keeps the picker's mime type on the queued item so the upload can use it", () => {
    const state = queueReducer([], {
      type: "ADD",
      items: [{ uri: "file:///a.heic", filename: "a.heic", mimeType: "image/heic" }],
    });
    expect(state[0].mimeType).toBe("image/heic");
  });

  it("can add a batch of multiple items at once", () => {
    const state = queueReducer([], {
      type: "ADD",
      items: [
        { uri: "file:///a.jpg", filename: "a.jpg" },
        { uri: "file:///b.jpg", filename: "b.jpg" },
      ],
    });
    expect(state).toHaveLength(2);
  });

  it("moves an item to uploading and tracks progress", () => {
    let state = addOne();
    const id = state[0].id;
    state = queueReducer(state, { type: "START_UPLOAD", id });
    expect(state[0].status).toBe("uploading");

    state = queueReducer(state, { type: "PROGRESS", id, progress: 42 });
    expect(state[0].progress).toBe(42);
  });

  it("marks success with the server job id", () => {
    let state = addOne();
    const id = state[0].id;
    state = queueReducer(state, { type: "SUCCESS", id, serverJobId: "job-123" });
    expect(state[0].status).toBe("done");
    expect(state[0].progress).toBe(100);
    expect(state[0].serverJobId).toBe("job-123");
  });

  it("marks failure without removing the item from the list", () => {
    let state = addOne();
    const id = state[0].id;
    state = queueReducer(state, { type: "FAILURE", id, error: "network error" });
    expect(state).toHaveLength(1);
    expect(state[0].status).toBe("failed");
    expect(state[0].error).toBe("network error");
  });

  it("retry resets a failed item back to queued", () => {
    let state = addOne();
    const id = state[0].id;
    state = queueReducer(state, { type: "FAILURE", id, error: "oops" });
    state = queueReducer(state, { type: "RETRY", id });
    expect(state[0].status).toBe("queued");
    expect(state[0].error).toBeNull();
  });

  it("only touches the targeted item, leaving others untouched", () => {
    let state = queueReducer([], {
      type: "ADD",
      items: [
        { uri: "file:///a.jpg", filename: "a.jpg" },
        { uri: "file:///b.jpg", filename: "b.jpg" },
      ],
    });
    const [first, second] = state;
    state = queueReducer(state, { type: "START_UPLOAD", id: first.id });
    const updatedSecond = state.find((i) => i.id === second.id)!;
    expect(updatedSecond.status).toBe("queued");
  });
});

describe("nextQueued", () => {
  it("returns the first queued item, skipping uploading/done/failed ones", () => {
    let state = queueReducer([], {
      type: "ADD",
      items: [
        { uri: "file:///a.jpg", filename: "a.jpg" },
        { uri: "file:///b.jpg", filename: "b.jpg" },
      ],
    });
    state = queueReducer(state, { type: "START_UPLOAD", id: state[0].id });
    expect(nextQueued(state)?.id).toBe(state[1].id);
  });

  it("returns undefined when nothing is queued", () => {
    expect(nextQueued([])).toBeUndefined();
  });
});

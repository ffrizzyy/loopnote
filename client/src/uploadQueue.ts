export type QueueItemStatus = "queued" | "uploading" | "done" | "failed";

export interface QueueItem {
  /** Client-local id — separate from the server's job id, which only
   * exists once an upload succeeds. */
  id: string;
  uri: string;
  filename: string;
  /** Passed through to the upload untouched — see UploadItem. */
  mimeType?: string | null;
  file?: Blob | null;
  status: QueueItemStatus;
  progress: number;
  error: string | null;
  serverJobId: string | null;
}

export type NewQueueItem = Pick<QueueItem, "uri" | "filename" | "mimeType" | "file">;

export type QueueAction =
  | { type: "ADD"; items: NewQueueItem[] }
  | { type: "START_UPLOAD"; id: string }
  | { type: "PROGRESS"; id: string; progress: number }
  | { type: "SUCCESS"; id: string; serverJobId: string }
  | { type: "FAILURE"; id: string; error: string }
  | { type: "RETRY"; id: string };

function makeLocalId(): string {
  // No uuid dependency for a purely local, never-transmitted id.
  return `local-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function queueReducer(state: QueueItem[], action: QueueAction): QueueItem[] {
  switch (action.type) {
    case "ADD":
      return [
        ...state,
        ...action.items.map(
          (i): QueueItem => ({
            id: makeLocalId(),
            uri: i.uri,
            filename: i.filename,
            mimeType: i.mimeType ?? null,
            file: i.file ?? null,
            status: "queued",
            progress: 0,
            error: null,
            serverJobId: null,
          })
        ),
      ];

    case "START_UPLOAD":
      return state.map((item) =>
        item.id === action.id ? { ...item, status: "uploading", progress: 0, error: null } : item
      );

    case "PROGRESS":
      return state.map((item) => (item.id === action.id ? { ...item, progress: action.progress } : item));

    case "SUCCESS":
      return state.map((item) =>
        item.id === action.id
          ? { ...item, status: "done", progress: 100, serverJobId: action.serverJobId, error: null }
          : item
      );

    case "FAILURE":
      // Failed uploads stay in the list (not silently dropped) so the UI
      // can offer a retry.
      return state.map((item) => (item.id === action.id ? { ...item, status: "failed", error: action.error } : item));

    case "RETRY":
      return state.map((item) =>
        item.id === action.id ? { ...item, status: "queued", progress: 0, error: null } : item
      );

    default:
      return state;
  }
}

export function nextQueued(items: QueueItem[]): QueueItem | undefined {
  return items.find((item) => item.status === "queued");
}

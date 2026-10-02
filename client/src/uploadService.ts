export interface UploadResult {
  jobId: string;
  duplicate: boolean;
}

export interface UploadOptions {
  onProgress?: (percent: number) => void;
  /** How long to wait before giving up. A wrong LAN IP usually doesn't
   * fail fast — the connection just hangs — so without a limit an item
   * sits at "Uploading…" until the OS gives up minutes later. */
  timeoutMs?: number;
}

export interface UploadItem {
  uri: string;
  filename: string;
  /** The picker's own report of the type, when it has one — more reliable
   * than guessing from the filename. */
  mimeType?: string | null;
  /** Web only: the picked File. A browser's FormData can't upload from a
   * { uri } object the way React Native's can — it needs the actual Blob. */
  file?: Blob | null;
}

export const DEFAULT_UPLOAD_TIMEOUT_MS = 60_000;

export function guessMimeType(filename: string): string {
  const ext = filename.split(".").pop()?.toLowerCase();
  switch (ext) {
    case "png":
      return "image/png";
    case "heic":
      return "image/heic";
    case "webp":
      return "image/webp";
    case "jpg":
    case "jpeg":
    default:
      return "image/jpeg";
  }
}

/**
 * Tidies a hand-typed server address: surrounding whitespace (phone
 * keyboards love a trailing space), trailing slashes, and a missing
 * scheme ("192.168.1.23:4000" → "http://192.168.1.23:4000").
 */
export function normalizeBaseUrl(input: string): string {
  let trimmed = input.trim();
  while (trimmed.endsWith("/")) trimmed = trimmed.slice(0, -1);
  if (!trimmed) return trimmed;
  return /^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed) ? trimmed : `http://${trimmed}`;
}

/**
 * Uploads a single picked image to POST /imports. Deliberately one file
 * per request (rather than batching, which the API also supports) so
 * each item in the client queue has independent progress and can be
 * retried on its own without re-sending everything else.
 *
 * Uses XMLHttpRequest rather than fetch specifically for
 * xhr.upload.onprogress — fetch has no upload-progress event, and
 * "visible progress" is an explicit acceptance criterion here.
 */
export function uploadImage(apiBaseUrl: string, item: UploadItem, options: UploadOptions = {}): Promise<UploadResult> {
  const url = `${normalizeBaseUrl(apiBaseUrl)}/imports`;

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", url);
    xhr.timeout = options.timeoutMs ?? DEFAULT_UPLOAD_TIMEOUT_MS;

    xhr.upload.onprogress = (event: ProgressEvent) => {
      if (event.lengthComputable && options.onProgress) {
        options.onProgress(Math.round((event.loaded / event.total) * 100));
      }
    };

    xhr.onload = () => {
      if (xhr.status < 200 || xhr.status >= 300) {
        reject(new Error(`Upload to ${url} failed with status ${xhr.status}`));
        return;
      }
      try {
        const body = JSON.parse(xhr.responseText);
        const job = body?.jobs?.[0];
        if (!job?.id) {
          reject(new Error("Server response was missing job info"));
          return;
        }
        resolve({ jobId: job.id, duplicate: Boolean(job.duplicate) });
      } catch {
        reject(new Error("Could not parse the server's response"));
      }
    };

    const unreachableHint =
      `If this is a physical device, "localhost" means the phone itself — ` +
      `use your computer's LAN IP instead, and make sure both are on the same network.`;

    xhr.onerror = () => {
      reject(new Error(`Couldn't reach ${url}. ${unreachableHint}`));
    };

    xhr.ontimeout = () => {
      reject(new Error(`Timed out trying to reach ${url}. ${unreachableHint}`));
    };

    const formData = new FormData();
    if (item.file) {
      formData.append("images", item.file, item.filename);
    } else {
      // React Native's FormData accepts this { uri, name, type } shape for
      // a file value — RN's own convention for native file uploads, not a
      // browser File/Blob. The `as unknown as Blob` cast exists only to
      // satisfy FormData's DOM typings, which don't know about RN's shape.
      const type = item.mimeType || guessMimeType(item.filename);
      formData.append("images", { uri: item.uri, name: item.filename, type } as unknown as Blob);
    }

    xhr.send(formData);
  });
}

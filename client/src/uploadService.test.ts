import { DEFAULT_UPLOAD_TIMEOUT_MS, guessMimeType, normalizeBaseUrl, uploadImage } from "./uploadService";

type ProgressHandler = (event: { lengthComputable: boolean; loaded: number; total: number }) => void;

class MockXHR {
  static instances: MockXHR[] = [];
  method = "";
  url = "";
  status = 200;
  responseText = "";
  upload: { onprogress: ProgressHandler | null } = { onprogress: null };
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  ontimeout: (() => void) | null = null;
  timeout = 0;
  body: unknown = null;

  open(method: string, url: string): void {
    this.method = method;
    this.url = url;
  }

  send(body: unknown): void {
    this.body = body;
    MockXHR.instances.push(this);
  }
}

describe("normalizeBaseUrl", () => {
  it("trims whitespace and trailing slashes", () => {
    expect(normalizeBaseUrl("  http://192.168.1.23:4000/ ")).toBe("http://192.168.1.23:4000");
    expect(normalizeBaseUrl("http://192.168.1.23:4000///")).toBe("http://192.168.1.23:4000");
  });

  it("adds http:// when the scheme was left off", () => {
    expect(normalizeBaseUrl("192.168.1.23:4000")).toBe("http://192.168.1.23:4000");
    expect(normalizeBaseUrl("localhost:4000")).toBe("http://localhost:4000");
  });

  it("leaves an explicit scheme alone", () => {
    expect(normalizeBaseUrl("https://api.example.com")).toBe("https://api.example.com");
  });

  it("returns an empty string for blank input rather than a bare scheme", () => {
    expect(normalizeBaseUrl("   ")).toBe("");
  });
});

describe("guessMimeType", () => {
  it("maps common extensions to their mime types", () => {
    expect(guessMimeType("photo.png")).toBe("image/png");
    expect(guessMimeType("photo.PNG")).toBe("image/png");
    expect(guessMimeType("photo.heic")).toBe("image/heic");
    expect(guessMimeType("photo.jpg")).toBe("image/jpeg");
    expect(guessMimeType("photo.unknownext")).toBe("image/jpeg");
  });
});

describe("uploadImage", () => {
  beforeEach(() => {
    MockXHR.instances = [];
    (global as unknown as { XMLHttpRequest: typeof MockXHR }).XMLHttpRequest = MockXHR;
  });

  it("POSTs to /imports and resolves with the returned job on success", async () => {
    const promise = uploadImage("http://localhost:4000", { uri: "file:///a.jpg", filename: "a.jpg" });

    const xhr = MockXHR.instances[0];
    expect(xhr.method).toBe("POST");
    expect(xhr.url).toBe("http://localhost:4000/imports");

    xhr.status = 202;
    xhr.responseText = JSON.stringify({ jobs: [{ id: "job-abc", status: "queued", duplicate: false }] });
    xhr.onload!();

    await expect(promise).resolves.toEqual({ jobId: "job-abc", duplicate: false });
  });

  it("strips a trailing slash from the base URL", async () => {
    const promise = uploadImage("http://localhost:4000/", { uri: "file:///a.jpg", filename: "a.jpg" });
    const xhr = MockXHR.instances[0];
    expect(xhr.url).toBe("http://localhost:4000/imports");
    xhr.status = 202;
    xhr.responseText = JSON.stringify({ jobs: [{ id: "job-abc", duplicate: false }] });
    xhr.onload!();
    await promise;
  });

  it("reports upload progress as it happens", async () => {
    const onProgress = jest.fn();
    const promise = uploadImage("http://localhost:4000", { uri: "file:///a.jpg", filename: "a.jpg" }, { onProgress });

    const xhr = MockXHR.instances[0];
    xhr.upload.onprogress!({ lengthComputable: true, loaded: 50, total: 100 });
    expect(onProgress).toHaveBeenCalledWith(50);

    xhr.status = 202;
    xhr.responseText = JSON.stringify({ jobs: [{ id: "job-abc", duplicate: false }] });
    xhr.onload!();
    await promise;
  });

  it("rejects on a non-2xx status, so the caller can offer retry instead of losing the failure", async () => {
    const promise = uploadImage("http://localhost:4000", { uri: "file:///a.jpg", filename: "a.jpg" });
    const xhr = MockXHR.instances[0];
    xhr.status = 500;
    xhr.onload!();
    await expect(promise).rejects.toThrow("500");
  });

  it("rejects on a network error, with an actionable message", async () => {
    const promise = uploadImage("http://localhost:4000", { uri: "file:///a.jpg", filename: "a.jpg" });
    const xhr = MockXHR.instances[0];
    xhr.onerror!();
    await expect(promise).rejects.toThrow("Couldn't reach");
  });

  it("sets a timeout and rejects with an actionable message when it fires, instead of hanging", async () => {
    const promise = uploadImage("http://10.0.0.99:4000", { uri: "file:///a.jpg", filename: "a.jpg" });
    const xhr = MockXHR.instances[0];
    expect(xhr.timeout).toBe(DEFAULT_UPLOAD_TIMEOUT_MS);
    xhr.ontimeout!();
    await expect(promise).rejects.toThrow("Timed out");
  });

  it("tolerates a hand-typed address with no scheme and a trailing space", async () => {
    const promise = uploadImage("192.168.1.23:4000 ", { uri: "file:///a.jpg", filename: "a.jpg" });
    const xhr = MockXHR.instances[0];
    expect(xhr.url).toBe("http://192.168.1.23:4000/imports");
    xhr.status = 202;
    xhr.responseText = JSON.stringify({ jobs: [{ id: "job-abc", duplicate: false }] });
    xhr.onload!();
    await promise;
  });

  it("uploads the picked File itself when there is one (web), under its filename", async () => {
    const file = new Blob(["fake image bytes"], { type: "image/png" });
    const promise = uploadImage("http://localhost:4000", { uri: "blob:abc", filename: "a.png", file });

    const xhr = MockXHR.instances[0];
    const sent = (xhr.body as FormData).get("images") as File;
    expect(sent.name).toBe("a.png");
    expect(sent.size).toBe(file.size);

    xhr.status = 202;
    xhr.responseText = JSON.stringify({ jobs: [{ id: "job-abc", duplicate: false }] });
    xhr.onload!();
    await promise;
  });

  it("prefers the picker's mime type over guessing from the filename", async () => {
    const append = jest.spyOn(FormData.prototype, "append").mockImplementation(() => undefined);
    const promise = uploadImage("http://localhost:4000", {
      uri: "file:///IMG_0001",
      filename: "IMG_0001",
      mimeType: "image/heic",
    });

    expect(append).toHaveBeenCalledWith("images", { uri: "file:///IMG_0001", name: "IMG_0001", type: "image/heic" });
    append.mockRestore();

    const xhr = MockXHR.instances[0];
    xhr.status = 202;
    xhr.responseText = JSON.stringify({ jobs: [{ id: "job-abc", duplicate: false }] });
    xhr.onload!();
    await promise;
  });

  it("rejects when the server response can't be parsed as expected", async () => {
    const promise = uploadImage("http://localhost:4000", { uri: "file:///a.jpg", filename: "a.jpg" });
    const xhr = MockXHR.instances[0];
    xhr.status = 202;
    xhr.responseText = "not json";
    xhr.onload!();
    await expect(promise).rejects.toThrow();
  });
});

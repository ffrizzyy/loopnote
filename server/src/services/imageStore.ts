import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

export interface SavedImage {
  hash: string;
  storedPath: string;
}

/**
 * Saves uploaded image bytes to disk under a content-hash filename.
 * Swappable later for real object storage (S3/etc — see STORAGE_* in
 * .env.example) without changing callers, since they only depend on
 * saveImage()'s return shape.
 */
export class ImageStore {
  constructor(private readonly baseDir: string) {}

  static hashOf(buffer: Buffer): string {
    return createHash("sha256").update(buffer).digest("hex");
  }

  async saveImage(buffer: Buffer, originalFilename: string): Promise<SavedImage> {
    const hash = ImageStore.hashOf(buffer);
    // The filename is client-supplied: only a plain alphanumeric extension
    // is carried over, so nothing like "a.b:c" or "a.b*" ends up in a path.
    const rawExt = path.extname(originalFilename);
    const ext = /^\.[a-z0-9]{1,10}$/i.test(rawExt) ? rawExt : "";
    const storedPath = path.join(this.baseDir, `${hash}${ext}`);
    await mkdir(this.baseDir, { recursive: true });
    await writeFile(storedPath, buffer);
    return { hash, storedPath };
  }
}

import sharp from "sharp";

// Long-edge target and JPEG quality chosen to keep image tokens down while
// staying well above the resolution needed to read handwriting — these are
// deliberately conservative and worth revisiting once real token costs are
// being logged (see UsageLog) against detection accuracy.
const MAX_LONG_EDGE_PX = 1568;
const JPEG_QUALITY = 82;

export interface PreprocessedImage {
  buffer: Buffer;
  resized: boolean;
}

/**
 * Downscales and re-encodes an image to control per-call token cost.
 * Falls back to the original bytes, rather than failing the job, when the
 * input can't be decoded as an image — detection still runs on the raw
 * bytes afterward and can report is_note: false / low confidence on
 * genuinely bad input instead of the whole pipeline erroring out on it.
 */
export async function resizeForDetection(original: Buffer): Promise<PreprocessedImage> {
  try {
    const resized = await sharp(original)
      .resize({ width: MAX_LONG_EDGE_PX, height: MAX_LONG_EDGE_PX, fit: "inside", withoutEnlargement: true })
      .jpeg({ quality: JPEG_QUALITY })
      .toBuffer();
    return { buffer: resized, resized: true };
  } catch {
    return { buffer: original, resized: false };
  }
}

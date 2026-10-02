import sharp from "sharp";
import { resizeForDetection } from "./imagePreprocessing";

async function makeTestPng(width: number, height: number): Promise<Buffer> {
  return sharp({
    create: {
      width,
      height,
      channels: 3,
      background: { r: 120, g: 140, b: 160 },
    },
  })
    .png()
    .toBuffer();
}

describe("resizeForDetection", () => {
  it("downscales an oversized image and shrinks its byte size", async () => {
    const original = await makeTestPng(3000, 2000);
    const { buffer, resized } = await resizeForDetection(original);

    expect(resized).toBe(true);
    expect(buffer.byteLength).toBeLessThan(original.byteLength);

    const meta = await sharp(buffer).metadata();
    expect(meta.width).toBeLessThanOrEqual(1568);
    expect(meta.height).toBeLessThanOrEqual(1568);
  });

  it("leaves a small image's dimensions alone (no enlargement)", async () => {
    const original = await makeTestPng(200, 100);
    const { buffer, resized } = await resizeForDetection(original);

    expect(resized).toBe(true);
    const meta = await sharp(buffer).metadata();
    expect(meta.width).toBe(200);
    expect(meta.height).toBe(100);
  });

  it("falls back to the original bytes when the input isn't a decodable image", async () => {
    const original = Buffer.from("this is not image data");
    const { buffer, resized } = await resizeForDetection(original);

    expect(resized).toBe(false);
    expect(buffer).toEqual(original);
  });
});

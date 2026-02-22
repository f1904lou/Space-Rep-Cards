import { describe, it, expect, vi, beforeEach } from "vitest";
import { cropToDataUrl } from "../lib/imageUtils";
import type { CssRect } from "../lib/imageUtils";

/** Build a mock HTMLImageElement with fixed natural and offset dimensions. */
function makeMockImg(
  naturalWidth: number,
  naturalHeight: number,
  offsetWidth: number,
  offsetHeight: number,
): HTMLImageElement {
  const img = document.createElement("img");
  Object.defineProperties(img, {
    naturalWidth: { value: naturalWidth, writable: false },
    naturalHeight: { value: naturalHeight, writable: false },
    offsetWidth: { value: offsetWidth, writable: false },
    offsetHeight: { value: offsetHeight, writable: false },
  });
  return img;
}

describe("cropToDataUrl", () => {
  let drawImage: ReturnType<typeof vi.fn>;
  let toDataURL: ReturnType<typeof vi.fn>;
  let mockCanvas: HTMLCanvasElement;

  beforeEach(() => {
    drawImage = vi.fn();
    toDataURL = vi.fn().mockReturnValue("data:image/jpeg;base64,cropped==");

    mockCanvas = {
      width: 0,
      height: 0,
      getContext: vi.fn().mockReturnValue({ drawImage }),
      toDataURL,
    } as unknown as HTMLCanvasElement;
  });

  it("scales CSS coordinates by the naturalWidth/offsetWidth ratio", () => {
    // 10× horizontal scale, 10× vertical scale
    const img = makeMockImg(3000, 4000, 300, 400);
    const cssRect: CssRect = { x: 10, y: 20, w: 100, h: 200 };

    cropToDataUrl(img, cssRect, 0.9, mockCanvas);

    expect(drawImage).toHaveBeenCalledOnce();
    expect(drawImage).toHaveBeenCalledWith(
      img,
      100,   // x  * scaleX (10)
      200,   // y  * scaleY (10)
      1000,  // w  * scaleX (10)
      2000,  // h  * scaleY (10)
      0,
      0,
      1000,  // canvas.width
      2000,  // canvas.height
    );
  });

  it("sets canvas width and height to the scaled pixel dimensions", () => {
    // 5× horizontal, 5× vertical scale
    const img = makeMockImg(1500, 2000, 300, 400);
    const cssRect: CssRect = { x: 0, y: 0, w: 60, h: 80 };

    cropToDataUrl(img, cssRect, 0.9, mockCanvas);

    expect(mockCanvas.width).toBe(300);   // 60  * 5
    expect(mockCanvas.height).toBe(400);  // 80  * 5
  });

  it("handles non-square scale factors (different X and Y ratios)", () => {
    // 4× horizontal, 2× vertical scale
    const img = makeMockImg(800, 400, 200, 200);
    const cssRect: CssRect = { x: 50, y: 100, w: 40, h: 60 };

    cropToDataUrl(img, cssRect, 0.9, mockCanvas);

    expect(drawImage).toHaveBeenCalledWith(
      img,
      200,   // 50  * 4
      200,   // 100 * 2
      160,   // 40  * 4
      120,   // 60  * 2
      0,
      0,
      160,
      120,
    );
  });

  it("returns the data URL produced by canvas.toDataURL", () => {
    const img = makeMockImg(100, 100, 100, 100);
    const result = cropToDataUrl(img, { x: 0, y: 0, w: 50, h: 50 }, 0.9, mockCanvas);

    expect(result).toBe("data:image/jpeg;base64,cropped==");
  });
});

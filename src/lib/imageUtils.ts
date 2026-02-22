export interface CssRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/**
 * Crops a rectangular region from an HTMLImageElement and returns a JPEG data URL.
 * CSS coordinates are scaled to the image's natural pixel dimensions.
 *
 * @param _canvas - Optional canvas element for dependency injection (useful in tests).
 */
export function cropToDataUrl(
  img: HTMLImageElement,
  cssRect: CssRect,
  quality = 0.9,
  _canvas?: HTMLCanvasElement,
): string {
  const scaleX = img.naturalWidth / img.offsetWidth;
  const scaleY = img.naturalHeight / img.offsetHeight;

  const c = _canvas ?? document.createElement("canvas");
  c.width = cssRect.w * scaleX;
  c.height = cssRect.h * scaleY;

  const ctx = c.getContext("2d");
  if (!ctx) return "";

  ctx.drawImage(
    img,
    cssRect.x * scaleX,
    cssRect.y * scaleY,
    cssRect.w * scaleX,
    cssRect.h * scaleY,
    0,
    0,
    c.width,
    c.height,
  );

  return c.toDataURL("image/jpeg", quality);
}

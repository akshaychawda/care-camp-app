// Bakes the caption onto the dream-card image at download time, client-side.
// The stored image from OpenAI has no text in it (by design), and the caption is
// rendered as an overlay on screen — so a raw download would lose it. Here we
// redraw the image + caption to a canvas and export a PNG that carries the caption.
//
// If the image can't be read into a canvas (e.g. CORS taints it) or anything else
// fails, we fall back to downloading the raw image so the button never breaks.

function triggerDownload(href: string, filename: string) {
  const a = document.createElement("a");
  a.href = href;
  a.download = filename;
  a.click();
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const test = current ? `${current} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && current) {
      lines.push(current);
      current = word;
    } else {
      current = test;
    }
  }
  if (current) lines.push(current);
  return lines;
}

export async function downloadCardWithCaption(
  imageUrl: string,
  caption: string | null,
  childName: string,
): Promise<void> {
  const filename = `${childName}-dream-card.png`;

  // No caption to bake — just download the raw image (still via blob for a clean filename).
  if (!caption) {
    try {
      const res = await fetch(imageUrl);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      triggerDownload(url, filename);
      URL.revokeObjectURL(url);
    } catch {
      triggerDownload(imageUrl, filename);
    }
    return;
  }

  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.crossOrigin = "anonymous";
      el.onload = () => resolve(el);
      el.onerror = reject;
      el.src = imageUrl;
    });

    const w = img.naturalWidth || 1024;
    const h = img.naturalHeight || 1024;
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("no 2d context");

    ctx.drawImage(img, 0, 0, w, h);

    // Bottom gradient scrim for legibility
    const scrimH = h * 0.38;
    const grad = ctx.createLinearGradient(0, h - scrimH, 0, h);
    grad.addColorStop(0, "rgba(0,0,0,0)");
    grad.addColorStop(1, "rgba(0,0,0,0.72)");
    ctx.fillStyle = grad;
    ctx.fillRect(0, h - scrimH, w, scrimH);

    // Caption text — italic serif, wrapped, anchored to the bottom
    const pad = w * 0.06;
    const fontSize = Math.round(w * 0.046);
    const lineHeight = fontSize * 1.25;
    ctx.font = `italic ${fontSize}px Georgia, 'Times New Roman', serif`;
    ctx.fillStyle = "#ffffff";
    ctx.textBaseline = "alphabetic";

    const lines = wrapText(ctx, `"${caption}"`, w - pad * 2);
    let y = h - pad - (lines.length - 1) * lineHeight;
    for (const line of lines) {
      ctx.fillText(line, pad, y);
      y += lineHeight;
    }

    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
    if (!blob) throw new Error("toBlob failed");
    const url = URL.createObjectURL(blob);
    triggerDownload(url, filename);
    URL.revokeObjectURL(url);
  } catch {
    // Canvas tainted (CORS) or any failure → fall back to the raw image download.
    try {
      const res = await fetch(imageUrl);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      triggerDownload(url, filename);
      URL.revokeObjectURL(url);
    } catch {
      triggerDownload(imageUrl, filename);
    }
  }
}

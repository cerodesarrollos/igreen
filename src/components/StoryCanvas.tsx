"use client";

import { useEffect, useRef, useState } from "react";

interface StoryCanvasProps {
  imageUrl: string;
  model: string;
  capacity?: string;
  color?: string;
  condition?: string;
  batteryHealth?: number | null;
  price?: number | null;
  isNew?: boolean;
}

const STORY_W = 1080;
const STORY_H = 1920;
const LOGO_SRC = "/logo-premium-reseller.jpg";
const ADDRESS = "Los Ríos 1774 · Recoleta, CABA";

export default function StoryCanvas({
  imageUrl, model, capacity, color, condition, batteryHealth, price, isNew,
}: StoryCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!imageUrl) return;
    setReady(false);
    setError("");

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = STORY_W;
    canvas.height = STORY_H;

    // Load product photo + logo in parallel
    const photoImg = new Image();
    const logoImg = new Image();
    photoImg.crossOrigin = "anonymous";
    logoImg.crossOrigin = "anonymous";

    let loaded = 0;
    const onLoad = () => {
      loaded++;
      if (loaded < 2) return;
      draw();
    };

    photoImg.onload = onLoad;
    logoImg.onload = onLoad;
    photoImg.onerror = () => { setError("No se pudo cargar la foto del equipo"); };
    logoImg.onerror = onLoad; // logo fail → still draw without logo

    photoImg.src = imageUrl;
    logoImg.src = LOGO_SRC;

    function draw() {
      if (!ctx) return;

      // ── Background: dark fallback
      ctx.fillStyle = "#111113";
      ctx.fillRect(0, 0, STORY_W, STORY_H);

      // ── Product photo — cover the full canvas
      const photoAspect = photoImg.naturalWidth / photoImg.naturalHeight;
      const canvasAspect = STORY_W / STORY_H;
      let sx = 0, sy = 0, sw = photoImg.naturalWidth, sh = photoImg.naturalHeight;
      if (photoAspect > canvasAspect) {
        sw = photoImg.naturalHeight * canvasAspect;
        sx = (photoImg.naturalWidth - sw) / 2;
      } else {
        sh = photoImg.naturalWidth / canvasAspect;
        sy = (photoImg.naturalHeight - sh) / 2;
      }
      ctx.drawImage(photoImg, sx, sy, sw, sh, 0, 0, STORY_W, STORY_H);

      // ── Top gradient (for logo legibility)
      const topGrad = ctx.createLinearGradient(0, 0, 0, 480);
      topGrad.addColorStop(0, "rgba(0,0,0,0.72)");
      topGrad.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = topGrad;
      ctx.fillRect(0, 0, STORY_W, 480);

      // ── Bottom gradient (for text legibility)
      const botGrad = ctx.createLinearGradient(0, STORY_H - 600, 0, STORY_H);
      botGrad.addColorStop(0, "rgba(0,0,0,0)");
      botGrad.addColorStop(0.35, "rgba(0,0,0,0.82)");
      botGrad.addColorStop(1, "rgba(0,0,0,0.95)");
      ctx.fillStyle = botGrad;
      ctx.fillRect(0, STORY_H - 600, STORY_W, 600);

      // ── Logo (top-center) — invert black→white via compositing
      if (logoImg.complete && logoImg.naturalWidth > 0) {
        const logoH = 110;
        const logoW = logoImg.naturalWidth * (logoH / logoImg.naturalHeight);
        const lx = (STORY_W - logoW) / 2;
        const ly = 90;

        // Draw logo inverted: draw white rect, then use difference blend
        ctx.save();
        ctx.globalCompositeOperation = "source-over";
        // Draw logo white by: draw white layer, then draw logo with 'difference' blend
        ctx.drawImage(logoImg, lx, ly, logoW, logoH);
        // Now invert: draw white rect on top with 'difference'
        ctx.globalCompositeOperation = "difference";
        ctx.fillStyle = "white";
        ctx.fillRect(lx, ly, logoW, logoH);
        ctx.restore();
        // That gives white-on-transparent for black logos. Clean up background square:
        // Actually we already have the gradient behind, so let's just use screen blend
      }

      // Better logo approach: draw white rect, clip to logo shape via globalCompositeOperation
      // Simplest reliable: draw logo with 'screen' blend mode over dark background
      if (logoImg.complete && logoImg.naturalWidth > 0) {
        const logoH = 110;
        const logoW = logoImg.naturalWidth * (logoH / logoImg.naturalHeight);
        const lx = (STORY_W - logoW) / 2;
        const ly = 90;

        ctx.save();
        ctx.globalCompositeOperation = "screen";
        ctx.drawImage(logoImg, lx, ly, logoW, logoH);
        ctx.restore();
      }

      // ── Bottom content
      const padX = 80;
      let y = STORY_H - 420;

      // Condition pill
      if (!isNew && condition) {
        const condText = condition === "A" ? "EXCELENTE ESTADO" : condition === "B" ? "MUY BUEN ESTADO" : "BUEN ESTADO";
        ctx.save();
        ctx.font = "bold 28px -apple-system, Helvetica, sans-serif";
        const tw = ctx.measureText(condText).width;
        const pillW = tw + 44;
        const pillH = 48;
        ctx.beginPath();
        ctx.roundRect(padX, y, pillW, pillH, 24);
        ctx.fillStyle = "rgba(255,255,255,0.14)";
        ctx.fill();
        ctx.strokeStyle = "rgba(255,255,255,0.22)";
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.fillStyle = "rgba(255,255,255,0.90)";
        ctx.textBaseline = "middle";
        ctx.fillText(condText, padX + 22, y + pillH / 2);
        ctx.restore();
        y += 72;
      }

      if (isNew) {
        ctx.save();
        ctx.font = "bold 28px -apple-system, Helvetica, sans-serif";
        const pillW = 260;
        const pillH = 48;
        ctx.beginPath();
        ctx.roundRect(padX, y, pillW, pillH, 24);
        ctx.fillStyle = "rgba(255,255,255,0.14)";
        ctx.fill();
        ctx.fillStyle = "rgba(255,255,255,0.90)";
        ctx.textBaseline = "middle";
        ctx.fillText("NUEVO · SELLADO", padX + 22, y + pillH / 2);
        ctx.restore();
        y += 72;
      }

      // Model + capacity
      ctx.save();
      ctx.font = "bold 92px -apple-system, Helvetica, sans-serif";
      ctx.fillStyle = "rgba(255,255,255,0.97)";
      ctx.textBaseline = "alphabetic";
      ctx.fillText(model, padX, y);
      y += 100;
      ctx.restore();

      // Capacity + color
      if (capacity || color) {
        ctx.save();
        ctx.font = "500 54px -apple-system, Helvetica, sans-serif";
        ctx.fillStyle = "rgba(255,255,255,0.60)";
        ctx.fillText([capacity, color].filter(Boolean).join(" · "), padX, y);
        y += 70;
        ctx.restore();
      }

      // Battery
      if (!isNew && batteryHealth) {
        ctx.save();
        ctx.font = "500 46px -apple-system, Helvetica, sans-serif";
        ctx.fillStyle = "rgba(255,255,255,0.55)";
        ctx.fillText(`🔋 Batería ${batteryHealth}%`, padX, y);
        y += 64;
        ctx.restore();
      }

      y += 20;

      // Price
      if (price) {
        ctx.save();
        ctx.font = "bold 100px -apple-system, Helvetica, sans-serif";
        ctx.fillStyle = "rgba(255,255,255,0.97)";
        ctx.fillText(`$${price.toLocaleString()} USD`, padX, y);
        y += 110;
        ctx.restore();
      }

      y += 16;

      // Divider line
      ctx.save();
      ctx.strokeStyle = "rgba(255,255,255,0.15)";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(padX, y);
      ctx.lineTo(STORY_W - padX, y);
      ctx.stroke();
      ctx.restore();
      y += 44;

      // Address + phone icon
      ctx.save();
      ctx.font = "500 40px -apple-system, Helvetica, sans-serif";
      ctx.fillStyle = "rgba(255,255,255,0.55)";
      ctx.fillText("📍 " + ADDRESS, padX, y);
      ctx.restore();

      setReady(true);
    }
  }, [imageUrl, model, capacity, color, condition, batteryHealth, price, isNew]);

  function download() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement("a");
    link.download = `historia-${model.replace(/\s+/g, "-").toLowerCase()}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  }

  return (
    <div className="flex flex-col items-center gap-4">
      {error && (
        <div className="w-full p-3 bg-white/[0.04] border border-white/[0.08] rounded-xl text-white/50 text-xs text-center">
          {error}
        </div>
      )}

      {/* Preview — scaled down to fit modal */}
      <div className="relative w-full" style={{ aspectRatio: "9/16", maxHeight: 480 }}>
        <canvas
          ref={canvasRef}
          className="w-full h-full rounded-xl object-cover"
          style={{ display: ready || !imageUrl ? "block" : "none" }}
        />
        {!ready && imageUrl && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/[0.04] rounded-xl">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white/30" />
          </div>
        )}
        {!imageUrl && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/[0.03] border border-white/[0.07] rounded-xl">
            <span className="material-symbols-outlined text-4xl text-white/20 mb-2">image</span>
            <p className="text-xs text-white/35">Cargá una foto para previsualizar</p>
          </div>
        )}
      </div>

      <button
        onClick={download}
        disabled={!ready}
        className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-white/[0.10] border border-white/[0.16] text-white/85 rounded-xl text-sm font-bold hover:bg-white/[0.13] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
      >
        <span className="material-symbols-outlined text-[18px]">download</span>
        Descargar Historia PNG
      </button>

      <p className="text-[10px] text-white/30 text-center">
        1080 × 1920px · Listo para subir a IG Stories
      </p>
    </div>
  );
}

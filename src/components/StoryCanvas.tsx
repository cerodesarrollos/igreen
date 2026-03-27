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
const ADDRESS = "Los Ríos 1774, Recoleta";
const GOLD = "#C9A84C";
const BG = "#080808";

/* ─── helpers ─── */
function conditionLabel(c: string): string {
  return c === "A" ? "EXCELENTE ESTADO" : c === "B" ? "MUY BUEN ESTADO" : "BUEN ESTADO";
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

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

    const photoImg = new Image();
    photoImg.crossOrigin = "anonymous";

    photoImg.onload = () => draw(ctx, photoImg);
    photoImg.onerror = () => {
      setError("No se pudo cargar la foto del equipo");
      draw(ctx, null);
    };
    photoImg.src = imageUrl;

    function draw(ctx: CanvasRenderingContext2D, photo: HTMLImageElement | null) {
      const W = STORY_W, H = STORY_H;

      // ── Background ──
      ctx.fillStyle = BG;
      ctx.fillRect(0, 0, W, H);

      // ── Product photo area (center, full width, cropped) ──
      const PHOTO_TOP = 200;
      const PHOTO_BOT = H - 520;
      const PHOTO_H = PHOTO_BOT - PHOTO_TOP;

      if (photo) {
        // contain: mostrar imagen completa sin recortar, centrada
        const imgRatio = photo.naturalWidth / photo.naturalHeight;
        const targetRatio = W / PHOTO_H;
        let dw, dh, dx, dy;
        if (imgRatio > targetRatio) {
          dw = W;
          dh = W / imgRatio;
          dx = 0;
          dy = PHOTO_TOP + (PHOTO_H - dh) / 2;
        } else {
          dh = PHOTO_H;
          dw = PHOTO_H * imgRatio;
          dx = (W - dw) / 2;
          dy = PHOTO_TOP;
        }
        ctx.drawImage(photo, dx, dy, dw, dh);

        // Gradient top over photo (for logo)
        const topGrad = ctx.createLinearGradient(0, PHOTO_TOP, 0, PHOTO_TOP + 300);
        topGrad.addColorStop(0, "rgba(8,8,8,0.92)");
        topGrad.addColorStop(1, "rgba(8,8,8,0)");
        ctx.fillStyle = topGrad;
        ctx.fillRect(0, PHOTO_TOP, W, 300);

        // Gradient bottom over photo (for info panel)
        const botGrad = ctx.createLinearGradient(0, PHOTO_BOT - 400, 0, PHOTO_BOT);
        botGrad.addColorStop(0, "rgba(8,8,8,0)");
        botGrad.addColorStop(1, "rgba(8,8,8,0.95)");
        ctx.fillStyle = botGrad;
        ctx.fillRect(0, PHOTO_BOT - 400, W, 400);
      } else {
        // Placeholder
        ctx.fillStyle = "#141414";
        ctx.fillRect(0, PHOTO_TOP, W, PHOTO_H);
        ctx.fillStyle = "rgba(255,255,255,0.08)";
        ctx.font = "300 48px -apple-system, sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("[ foto del equipo ]", W / 2, PHOTO_TOP + PHOTO_H / 2);
      }

      // ── Solid bottom panel ──
      ctx.fillStyle = BG;
      ctx.fillRect(0, PHOTO_BOT, W, H - PHOTO_BOT);

      // ─────────────────────────────────────────
      // TOP BAR — Logo
      // ─────────────────────────────────────────
      const PAD = 60;
      const LOGO_Y = 100;

      // "iGreen" wordmark
      ctx.fillStyle = "#ffffff";
      ctx.font = "300 72px -apple-system, BlinkMacSystemFont, 'Helvetica Neue', sans-serif";
      ctx.textAlign = "left";
      ctx.textBaseline = "alphabetic";
      ctx.fillText("iGreen", PAD, LOGO_Y + 55);

      // Separator pipe
      ctx.fillStyle = "rgba(255,255,255,0.2)";
      ctx.fillRect(PAD + 195, LOGO_Y, 1.5, 68);

      // "Apple Premium" small text
      ctx.fillStyle = "rgba(255,255,255,0.5)";
      ctx.font = "400 24px -apple-system, BlinkMacSystemFont, sans-serif";
      ctx.fillText("Apple Premium", PAD + 214, LOGO_Y + 28);
      ctx.fillText("Reseller", PAD + 214, LOGO_Y + 58);

      // Gold accent line under logo
      const logoLineGrad = ctx.createLinearGradient(PAD, 0, PAD + 400, 0);
      logoLineGrad.addColorStop(0, GOLD);
      logoLineGrad.addColorStop(1, "rgba(201,168,76,0)");
      ctx.fillStyle = logoLineGrad;
      ctx.fillRect(PAD, LOGO_Y + 78, 400, 2);

      // ─────────────────────────────────────────
      // BOTTOM INFO BLOCK
      // ─────────────────────────────────────────
      const INFO_Y = PHOTO_BOT + 30;

      // Condition/new badge
      const condText = isNew ? "NUEVO · SELLADO" : (condition ? conditionLabel(condition) : null);
      if (condText) {
        ctx.save();
        ctx.font = "600 26px -apple-system, sans-serif";
        const tw = ctx.measureText(condText).width;
        const pillW = tw + 48;
        const pillH = 50;
        roundRect(ctx, PAD, INFO_Y, pillW, pillH, 4);
        ctx.fillStyle = isNew ? "rgba(201,168,76,0.15)" : "rgba(255,255,255,0.07)";
        ctx.fill();
        ctx.strokeStyle = isNew ? GOLD : "rgba(255,255,255,0.12)";
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.fillStyle = isNew ? GOLD : "rgba(255,255,255,0.55)";
        ctx.textBaseline = "middle";
        ctx.textAlign = "left";
        ctx.fillText(condText, PAD + 24, INFO_Y + pillH / 2);
        ctx.restore();
      }

      // Model name — large
      const modelY = INFO_Y + (condText ? 80 : 10);
      ctx.save();
      ctx.font = "200 88px -apple-system, BlinkMacSystemFont, 'Helvetica Neue', sans-serif";
      ctx.fillStyle = "#ffffff";
      ctx.textAlign = "left";
      ctx.textBaseline = "alphabetic";
      ctx.fillText(model, PAD, modelY);
      ctx.restore();

      // Specs (capacity · color)
      let specsY = modelY + 60;
      const specs = [capacity, color].filter(Boolean).join("  ·  ");
      if (specs) {
        ctx.save();
        ctx.font = "300 34px -apple-system, sans-serif";
        ctx.fillStyle = "rgba(255,255,255,0.45)";
        ctx.textAlign = "left";
        ctx.textBaseline = "alphabetic";
        ctx.fillText(specs, PAD, specsY);
        ctx.restore();
        specsY += 52;
      }

      // Battery
      if (!isNew && batteryHealth) {
        ctx.save();
        ctx.font = "300 32px -apple-system, sans-serif";
        ctx.fillStyle = "rgba(255,255,255,0.40)";
        ctx.textAlign = "left";
        ctx.textBaseline = "alphabetic";
        ctx.fillText(`🔋 Batería ${batteryHealth}%`, PAD, specsY);
        ctx.restore();
        specsY += 52;
      }

      specsY += 20;

      // Price — gold, left side, below specs
      if (price) {
        const priceText = `USD ${price.toLocaleString()}`;
        ctx.save();
        ctx.font = "200 96px -apple-system, BlinkMacSystemFont, 'Helvetica Neue', sans-serif";
        ctx.fillStyle = GOLD;
        ctx.textAlign = "left";
        ctx.textBaseline = "alphabetic";
        ctx.fillText(priceText, PAD, specsY);
        ctx.restore();
      }

      // Divider
      const dividerY = H - 240;
      ctx.save();
      ctx.strokeStyle = "rgba(255,255,255,0.10)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(PAD, dividerY);
      ctx.lineTo(W - PAD, dividerY);
      ctx.stroke();
      ctx.restore();

      // Address
      ctx.save();
      ctx.font = "300 28px -apple-system, sans-serif";
      ctx.fillStyle = "rgba(255,255,255,0.30)";
      ctx.textAlign = "left";
      ctx.textBaseline = "middle";
      ctx.fillText(`📍 ${ADDRESS}  ·  @igreen.recoleta`, PAD, dividerY + 42);
      ctx.restore();

      // CTA button
      const ctaX = PAD;
      const ctaY = dividerY + 76;
      const ctaW = 380;
      const ctaH = 72;
      ctx.save();
      roundRect(ctx, ctaX, ctaY, ctaW, ctaH, 6);
      ctx.fillStyle = GOLD;
      ctx.fill();
      ctx.font = "700 26px -apple-system, sans-serif";
      ctx.fillStyle = BG;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("ESCRIBINOS →", ctaX + ctaW / 2, ctaY + ctaH / 2);
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

      {/* Preview — scaled 9:16 */}
      <div className="relative w-full" style={{ aspectRatio: "9/16", maxHeight: 680 }}>
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

      <p className="text-[10px] text-white/30 text-center">1080 × 1920px · Listo para subir a IG Stories</p>
    </div>
  );
}

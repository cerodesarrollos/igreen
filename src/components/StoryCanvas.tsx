"use client";

import { useEffect, useRef, useState } from "react";

interface StoryCanvasProps {
  imageUrl: string;
  model: string;
  capacity?: string;
  price?: number | null;
}

const STORY_W = 1080;
const STORY_H = 1920;
const ADDRESS = "Las Heras 1774, Recoleta";
const GOLD = "#C9A84C";
const BG = "#080808";
const PAD = 72;

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

export default function StoryCanvas({ imageUrl, model, capacity, price }: StoryCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!imageUrl) return;
    setReady(false);

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = STORY_W;
    canvas.height = STORY_H;

    const photo = new Image();
    photo.crossOrigin = "anonymous";
    photo.onload = () => draw(ctx, photo);
    photo.onerror = () => draw(ctx, null);
    photo.src = imageUrl;

    function draw(ctx: CanvasRenderingContext2D, photo: HTMLImageElement | null) {
      const W = STORY_W, H = STORY_H;

      // ── Fondo negro total ──
      ctx.fillStyle = BG;
      ctx.fillRect(0, 0, W, H);

      // ── Zonas ──
      const LOGO_ZONE_H = 180;       // arriba: logo
      const BOTTOM_ZONE_H = 420;     // abajo: info
      const PHOTO_TOP = LOGO_ZONE_H;
      const PHOTO_BOT = H - BOTTOM_ZONE_H;
      const PHOTO_H = PHOTO_BOT - PHOTO_TOP;

      // ── Foto: contain, centrada ──
      if (photo) {
        const imgRatio = photo.naturalWidth / photo.naturalHeight;
        const zoneRatio = W / PHOTO_H;
        let dw, dh, dx, dy;
        if (imgRatio > zoneRatio) {
          dw = W; dh = W / imgRatio;
          dx = 0; dy = PHOTO_TOP + (PHOTO_H - dh) / 2;
        } else {
          dh = PHOTO_H; dw = PHOTO_H * imgRatio;
          dx = (W - dw) / 2; dy = PHOTO_TOP;
        }
        ctx.drawImage(photo, dx, dy, dw, dh);
      }

      // Gradiente suave foto→negro arriba
      const topGrad = ctx.createLinearGradient(0, PHOTO_TOP, 0, PHOTO_TOP + 160);
      topGrad.addColorStop(0, "rgba(8,8,8,0.85)");
      topGrad.addColorStop(1, "rgba(8,8,8,0)");
      ctx.fillStyle = topGrad;
      ctx.fillRect(0, PHOTO_TOP, W, 160);

      // Gradiente suave foto→negro abajo
      const botGrad = ctx.createLinearGradient(0, PHOTO_BOT - 200, 0, PHOTO_BOT);
      botGrad.addColorStop(0, "rgba(8,8,8,0)");
      botGrad.addColorStop(1, "rgba(8,8,8,1)");
      ctx.fillStyle = botGrad;
      ctx.fillRect(0, PHOTO_BOT - 200, W, 200);

      // Panel inferior sólido
      ctx.fillStyle = BG;
      ctx.fillRect(0, PHOTO_BOT, W, H - PHOTO_BOT);

      // ─────────────────────────────────────────
      // LOGO ZONE — "iGreen" + Apple Premium Reseller
      // ─────────────────────────────────────────
      const LOGO_CY = LOGO_ZONE_H / 2 + 8;

      // Wordmark "iGreen"
      ctx.save();
      ctx.font = "300 80px -apple-system, BlinkMacSystemFont, 'Helvetica Neue', sans-serif";
      ctx.fillStyle = "#ffffff";
      ctx.textAlign = "left";
      ctx.textBaseline = "middle";
      ctx.fillText("iGreen", PAD, LOGO_CY);
      ctx.restore();

      // Separator
      ctx.fillStyle = "rgba(255,255,255,0.18)";
      ctx.fillRect(PAD + 208, LOGO_CY - 32, 1.5, 64);

      // "Apple Premium Reseller" pequeño
      ctx.save();
      ctx.font = "400 22px -apple-system, sans-serif";
      ctx.fillStyle = "rgba(255,255,255,0.42)";
      ctx.textAlign = "left";
      ctx.textBaseline = "middle";
      ctx.fillText("Apple Premium", PAD + 226, LOGO_CY - 14);
      ctx.fillText("Reseller", PAD + 226, LOGO_CY + 14);
      ctx.restore();

      // Línea gold debajo del logo
      const lineGrad = ctx.createLinearGradient(PAD, 0, PAD + 380, 0);
      lineGrad.addColorStop(0, GOLD);
      lineGrad.addColorStop(1, "rgba(201,168,76,0)");
      ctx.fillStyle = lineGrad;
      ctx.fillRect(PAD, LOGO_CY + 44, 380, 2);

      // ─────────────────────────────────────────
      // BOTTOM ZONE
      // ─────────────────────────────────────────
      const INFO_Y = PHOTO_BOT + 30;

      // Modelo + GB
      const modelCapacity = capacity ? `${model} ${capacity}` : model;
      ctx.save();
      ctx.font = "200 90px -apple-system, BlinkMacSystemFont, 'Helvetica Neue', sans-serif";
      ctx.fillStyle = "#ffffff";
      ctx.textAlign = "left";
      ctx.textBaseline = "alphabetic";

      // Si el texto es muy largo, reducir font
      let fontSize = 90;
      while (ctx.measureText(modelCapacity).width > W - PAD * 2 - 20 && fontSize > 52) {
        fontSize -= 4;
        ctx.font = `200 ${fontSize}px -apple-system, BlinkMacSystemFont, 'Helvetica Neue', sans-serif`;
      }
      ctx.fillText(modelCapacity, PAD, INFO_Y + fontSize);
      ctx.restore();

      // Precio — gold
      const priceY = INFO_Y + fontSize + 60;
      if (price) {
        ctx.save();
        ctx.font = `100 110px -apple-system, BlinkMacSystemFont, 'Helvetica Neue', sans-serif`;
        ctx.fillStyle = GOLD;
        ctx.textAlign = "left";
        ctx.textBaseline = "alphabetic";
        ctx.fillText(`USD ${price.toLocaleString()}`, PAD, priceY);
        ctx.restore();
      }

      // Dirección
      const addrY = H - 210;
      ctx.save();
      ctx.strokeStyle = "rgba(255,255,255,0.08)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(PAD, addrY - 20);
      ctx.lineTo(W - PAD, addrY - 20);
      ctx.stroke();
      ctx.font = "300 26px -apple-system, sans-serif";
      ctx.fillStyle = "rgba(255,255,255,0.28)";
      ctx.textAlign = "left";
      ctx.textBaseline = "middle";
      ctx.fillText(`📍 ${ADDRESS}  ·  @igreen.recoleta`, PAD, addrY + 14);
      ctx.restore();

      // Botón ESCRIBINOS
      const btnY = H - 154;
      const btnW = 360;
      const btnH = 72;
      ctx.save();
      roundRect(ctx, PAD, btnY, btnW, btnH, 6);
      ctx.fillStyle = GOLD;
      ctx.fill();
      ctx.font = "700 26px -apple-system, sans-serif";
      ctx.fillStyle = BG;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("ESCRIBINOS →", PAD + btnW / 2, btnY + btnH / 2);
      ctx.restore();

      setReady(true);
    }
  }, [imageUrl, model, capacity, price]);

  function download() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement("a");
    link.download = `historia-${model.replace(/\s+/g, "-").toLowerCase()}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  }

  return (
    <div className="flex flex-col items-center gap-4 h-full">
      <div className="relative w-full flex-1">
        <canvas
          ref={canvasRef}
          className="w-full h-full rounded-xl object-contain"
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

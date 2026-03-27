"use client";

import { useEffect, useRef, useState } from "react";

interface StoryCanvasProps {
  imageUrl: string;
  model: string;
  capacity?: string;
  price?: number | null;
}

const W = 1080;
const H = 1920;
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

    canvas.width = W;
    canvas.height = H;

    const photo = new Image();
    photo.crossOrigin = "anonymous";
    photo.onload = () => draw(ctx, photo);
    photo.onerror = () => draw(ctx, null);
    photo.src = imageUrl;

    function draw(ctx: CanvasRenderingContext2D, photo: HTMLImageElement | null) {
      // ── Fondo negro ──
      ctx.fillStyle = BG;
      ctx.fillRect(0, 0, W, H);

      // ── Foto full bleed (cover) ──
      if (photo) {
        const imgRatio = photo.naturalWidth / photo.naturalHeight;
        const canvasRatio = W / H;
        let sx = 0, sy = 0, sw = photo.naturalWidth, sh = photo.naturalHeight;
        if (imgRatio > canvasRatio) {
          // más ancha → recortar lados
          sw = sh * canvasRatio;
          sx = (photo.naturalWidth - sw) / 2;
        } else {
          // más alta → recortar arriba/abajo
          sh = sw / canvasRatio;
          sy = (photo.naturalHeight - sh) / 2;
        }
        ctx.drawImage(photo, sx, sy, sw, sh, 0, 0, W, H);
      }

      // ── Gradiente oscuro arriba (logo) ──
      const topGrad = ctx.createLinearGradient(0, 0, 0, 340);
      topGrad.addColorStop(0, "rgba(8,8,8,0.90)");
      topGrad.addColorStop(1, "rgba(8,8,8,0)");
      ctx.fillStyle = topGrad;
      ctx.fillRect(0, 0, W, 340);

      // ── Gradiente oscuro abajo (texto) ──
      const botGrad = ctx.createLinearGradient(0, H - 680, 0, H);
      botGrad.addColorStop(0, "rgba(8,8,8,0)");
      botGrad.addColorStop(0.35, "rgba(8,8,8,0.82)");
      botGrad.addColorStop(1, "rgba(8,8,8,1)");
      ctx.fillStyle = botGrad;
      ctx.fillRect(0, H - 680, W, 680);

      // ─────────────────────────────────────────
      // LOGO — arriba izquierda
      // ─────────────────────────────────────────
      const LOGO_CY = 112;

      ctx.save();
      ctx.font = "300 80px -apple-system, BlinkMacSystemFont, 'Helvetica Neue', sans-serif";
      ctx.fillStyle = "#ffffff";
      ctx.textAlign = "left";
      ctx.textBaseline = "middle";
      ctx.fillText("iGreen", PAD, LOGO_CY);
      ctx.restore();

      // Separador vertical
      ctx.fillStyle = "rgba(255,255,255,0.20)";
      ctx.fillRect(PAD + 212, LOGO_CY - 32, 1.5, 64);

      // "Apple Premium Reseller"
      ctx.save();
      ctx.font = "400 22px -apple-system, sans-serif";
      ctx.fillStyle = "rgba(255,255,255,0.44)";
      ctx.textAlign = "left";
      ctx.textBaseline = "middle";
      ctx.fillText("Apple Premium", PAD + 230, LOGO_CY - 14);
      ctx.fillText("Reseller", PAD + 230, LOGO_CY + 14);
      ctx.restore();

      // Línea gold bajo logo
      const lineGrad = ctx.createLinearGradient(PAD, 0, PAD + 380, 0);
      lineGrad.addColorStop(0, GOLD);
      lineGrad.addColorStop(1, "rgba(201,168,76,0)");
      ctx.fillStyle = lineGrad;
      ctx.fillRect(PAD, LOGO_CY + 50, 380, 2);

      // ─────────────────────────────────────────
      // BOTTOM — modelo, precio, dirección, botón
      // ─────────────────────────────────────────
      const modelCapacity = capacity ? `${model} ${capacity}` : model;

      // Medir y ajustar font modelo
      let fontSize = 100;
      ctx.font = `200 ${fontSize}px -apple-system, BlinkMacSystemFont, 'Helvetica Neue', sans-serif`;
      while (ctx.measureText(modelCapacity).width > W - PAD * 2 && fontSize > 52) {
        fontSize -= 4;
        ctx.font = `200 ${fontSize}px -apple-system, BlinkMacSystemFont, 'Helvetica Neue', sans-serif`;
      }

      const modelY = H - 490;
      ctx.save();
      ctx.fillStyle = "#ffffff";
      ctx.textAlign = "left";
      ctx.textBaseline = "alphabetic";
      ctx.fillText(modelCapacity, PAD, modelY);
      ctx.restore();

      // Precio
      const priceY = modelY + 110;
      if (price) {
        ctx.save();
        ctx.font = "100 118px -apple-system, BlinkMacSystemFont, 'Helvetica Neue', sans-serif";
        ctx.fillStyle = GOLD;
        ctx.textAlign = "left";
        ctx.textBaseline = "alphabetic";
        ctx.fillText(`USD ${price.toLocaleString()}`, PAD, priceY);
        ctx.restore();
      }

      // Separador
      const sepY = H - 252;
      ctx.strokeStyle = "rgba(255,255,255,0.10)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(PAD, sepY);
      ctx.lineTo(W - PAD, sepY);
      ctx.stroke();

      // Dirección + handle
      ctx.save();
      ctx.font = "300 26px -apple-system, sans-serif";
      ctx.fillStyle = "rgba(255,255,255,0.35)";
      ctx.textAlign = "left";
      ctx.textBaseline = "middle";
      ctx.fillText(`📍 ${ADDRESS}  ·  @igreen.recoleta`, PAD, sepY + 30);
      ctx.restore();

      // Botón ESCRIBINOS
      const btnY = H - 158;
      const btnW = 380;
      const btnH = 76;
      ctx.save();
      roundRect(ctx, PAD, btnY, btnW, btnH, 6);
      ctx.fillStyle = GOLD;
      ctx.fill();
      ctx.font = "700 28px -apple-system, sans-serif";
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
      <div className="relative w-full flex-1" style={{ aspectRatio: "9/16" }}>
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

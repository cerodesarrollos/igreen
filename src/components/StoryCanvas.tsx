"use client";

import { useEffect, useRef, useState } from "react";

export interface StoryOptions {
  showLogo: boolean;
  showModel: boolean;
  showPrice: boolean;
  showAddress: boolean;
  showButton: boolean;
  customModel: string;
  customPrice: string;
  customAddress: string;
  customButton: string;
}

interface StoryCanvasProps {
  imageUrl: string;
  options: StoryOptions;
}

const W = 1080;
const H = 1920;
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

export default function StoryCanvas({ imageUrl, options }: StoryCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [ready, setReady] = useState(false);
  const photoRef = useRef<HTMLImageElement | null>(null);
  const logoRef = useRef<HTMLImageElement | null>(null);
  const logoLoaded = useRef(false);

  // Precargar logo una sola vez
  useEffect(() => {
    const logo = new Image();
    logo.onload = () => { logoRef.current = logo; logoLoaded.current = true; redraw(); };
    logo.onerror = () => { logoLoaded.current = true; redraw(); };
    logo.src = "/logo-igreen.jpg";
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Precargar foto cuando cambia imageUrl
  useEffect(() => {
    if (!imageUrl) { photoRef.current = null; setReady(false); redraw(); return; }
    setReady(false);
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => { photoRef.current = img; redraw(); };
    img.onerror = () => { photoRef.current = null; redraw(); };
    img.src = imageUrl;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [imageUrl]);

  // Re-render cuando cambian opciones
  useEffect(() => { redraw(); }, [options]); // eslint-disable-line react-hooks/exhaustive-deps

  function redraw() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    canvas.width = W;
    canvas.height = H;
    draw(ctx);
  }

  function draw(ctx: CanvasRenderingContext2D) {
    const photo = photoRef.current;
    const logo = logoRef.current;

    // Fondo negro
    ctx.fillStyle = BG;
    ctx.fillRect(0, 0, W, H);

    // Foto full bleed (cover)
    if (photo) {
      const imgRatio = photo.naturalWidth / photo.naturalHeight;
      const canvasRatio = W / H;
      let sx = 0, sy = 0, sw = photo.naturalWidth, sh = photo.naturalHeight;
      if (imgRatio > canvasRatio) {
        sw = sh * canvasRatio; sx = (photo.naturalWidth - sw) / 2;
      } else {
        sh = sw / canvasRatio; sy = (photo.naturalHeight - sh) / 2;
      }
      ctx.drawImage(photo, sx, sy, sw, sh, 0, 0, W, H);
    }

    // Gradiente oscuro arriba
    const topGrad = ctx.createLinearGradient(0, 0, 0, 360);
    topGrad.addColorStop(0, "rgba(8,8,8,0.88)");
    topGrad.addColorStop(1, "rgba(8,8,8,0)");
    ctx.fillStyle = topGrad;
    ctx.fillRect(0, 0, W, 360);

    // Gradiente oscuro abajo
    const botGrad = ctx.createLinearGradient(0, H - 720, 0, H);
    botGrad.addColorStop(0, "rgba(8,8,8,0)");
    botGrad.addColorStop(0.3, "rgba(8,8,8,0.80)");
    botGrad.addColorStop(1, "rgba(8,8,8,1)");
    ctx.fillStyle = botGrad;
    ctx.fillRect(0, H - 720, W, 720);

    // ── LOGO ──
    if (options.showLogo && logo) {
      const LOGO_W = 600;
      const logoRatio = logo.naturalWidth / logo.naturalHeight;
      const LOGO_H = LOGO_W / logoRatio;
      const logoX = (W - LOGO_W) / 2;
      const logoY = 60;

      const off = document.createElement("canvas");
      off.width = LOGO_W; off.height = LOGO_H;
      const offCtx = off.getContext("2d")!;
      offCtx.drawImage(logo, 0, 0, LOGO_W, LOGO_H);
      offCtx.globalCompositeOperation = "difference";
      offCtx.fillStyle = "white";
      offCtx.fillRect(0, 0, LOGO_W, LOGO_H);

      ctx.save();
      ctx.globalAlpha = 0.92;
      ctx.drawImage(off, logoX, logoY, LOGO_W, LOGO_H);
      ctx.restore();
    }

    // ── FONDO: calcular dinámicamente cuántos elementos hay abajo ──
    const items: (() => void)[] = [];
    let currentY = H - 520;

    // Modelo
    if (options.showModel && options.customModel) {
      let fontSize = 100;
      ctx.font = `200 ${fontSize}px -apple-system, BlinkMacSystemFont, 'Helvetica Neue', sans-serif`;
      while (ctx.measureText(options.customModel).width > W - PAD * 2 && fontSize > 48) {
        fontSize -= 4;
        ctx.font = `200 ${fontSize}px -apple-system, BlinkMacSystemFont, 'Helvetica Neue', sans-serif`;
      }
      const capturedY = currentY;
      const capturedSize = fontSize;
      items.push(() => {
        ctx.save();
        ctx.font = `200 ${capturedSize}px -apple-system, BlinkMacSystemFont, 'Helvetica Neue', sans-serif`;
        ctx.fillStyle = "#ffffff";
        ctx.textAlign = "left";
        ctx.textBaseline = "alphabetic";
        ctx.fillText(options.customModel, PAD, capturedY);
        ctx.restore();
      });
      currentY += fontSize + 24;
    }

    // Precio
    if (options.showPrice && options.customPrice) {
      const capturedY = currentY;
      items.push(() => {
        ctx.save();
        ctx.font = "100 112px -apple-system, BlinkMacSystemFont, 'Helvetica Neue', sans-serif";
        ctx.fillStyle = GOLD;
        ctx.textAlign = "left";
        ctx.textBaseline = "alphabetic";
        ctx.fillText(options.customPrice, PAD, capturedY);
        ctx.restore();
      });
      currentY += 124;
    }

    // Separador
    const sepY = currentY + 16;
    const capturedSepY = sepY;
    items.push(() => {
      ctx.strokeStyle = "rgba(255,255,255,0.10)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(PAD, capturedSepY);
      ctx.lineTo(W - PAD, capturedSepY);
      ctx.stroke();
    });

    // Dirección
    if (options.showAddress && options.customAddress) {
      const capturedY = sepY + 30;
      items.push(() => {
        ctx.save();
        ctx.font = "300 26px -apple-system, sans-serif";
        ctx.fillStyle = "rgba(255,255,255,0.35)";
        ctx.textAlign = "left";
        ctx.textBaseline = "middle";
        ctx.fillText(`📍 ${options.customAddress}`, PAD, capturedY);
        ctx.restore();
      });
    }

    // Botón
    if (options.showButton && options.customButton) {
      const btnY = H - 158;
      const btnW = 400;
      const btnH = 76;
      items.push(() => {
        ctx.save();
        roundRect(ctx, PAD, btnY, btnW, btnH, 6);
        ctx.fillStyle = GOLD;
        ctx.fill();
        ctx.font = "700 28px -apple-system, sans-serif";
        ctx.fillStyle = BG;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(options.customButton, PAD + btnW / 2, btnY + btnH / 2);
        ctx.restore();
      });
    }

    // Render todos los items
    items.forEach(fn => fn());

    setReady(true);
  }

  function download() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement("a");
    link.download = `historia-igreen.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  }

  return (
    <div className="flex flex-col h-full gap-3">
      <div className="relative flex-1" style={{ aspectRatio: "9/16" }}>
        <canvas ref={canvasRef} className="w-full h-full rounded-2xl object-contain" />
        {!imageUrl && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/[0.03] border border-white/[0.07] rounded-2xl">
            <span className="material-symbols-outlined text-4xl text-white/20 mb-2">image</span>
            <p className="text-xs text-white/35">Subí una foto para previsualizar</p>
          </div>
        )}
      </div>

      <button onClick={download} disabled={!ready}
        className="flex items-center justify-center gap-2 px-4 py-3 bg-white/[0.08] hover:bg-white/[0.12] border border-white/[0.12] text-white/80 rounded-xl text-sm font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed">
        <span className="material-symbols-outlined text-[18px]">download</span>
        Descargar PNG
      </button>
      <p className="text-[10px] text-white/25 text-center">1080 × 1920px · Listo para Instagram Stories</p>
    </div>
  );
}

"use client";

import { useEffect, useRef } from "react";

export default function CursorGlow() {
  const glowRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = glowRef.current;
    if (!el) return;

    let raf: number;
    let tx = window.innerWidth / 2;
    let ty = window.innerHeight / 2;
    let cx = tx;
    let cy = ty;

    const onMove = (e: MouseEvent) => {
      tx = e.clientX;
      ty = e.clientY;
    };

    const animate = () => {
      cx += (tx - cx) * 0.06;
      cy += (ty - cy) * 0.06;
      // Outer diffuse glow
      el.style.background = `
        radial-gradient(80px circle at ${cx}px ${cy}px, rgba(62,255,142,0.35) 0%, rgba(62,255,142,0.12) 50%, transparent 70%),
        radial-gradient(500px circle at ${cx}px ${cy}px, rgba(62,255,142,0.08) 0%, transparent 70%)
      `;
      raf = requestAnimationFrame(animate);
    };

    window.addEventListener("mousemove", onMove);
    raf = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener("mousemove", onMove);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <div
      ref={glowRef}
      style={{
        position: "absolute",
        inset: 0,
        zIndex: 0,
        pointerEvents: "none",
        borderRadius: "inherit",
        mixBlendMode: "screen",
      }}
      aria-hidden
    />
  );
}

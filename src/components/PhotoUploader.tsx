"use client";

import { useRef, useState } from "react";
import { supabase } from "@/lib/supabase";

interface PhotoUploaderProps {
  productId: string;
  currentPhotos: string[];
  onPhotosChange: (photos: string[]) => void;
}

const BUCKET = "product-photos";
const SUPABASE_URL = "https://iglfukxthrmprnqergbz.supabase.co";

export default function PhotoUploader({ productId, currentPhotos, onPhotosChange }: PhotoUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState("");

  async function uploadFiles(files: FileList | File[]) {
    const arr = Array.from(files).filter((f) => f.type.startsWith("image/"));
    if (arr.length === 0) return;

    setUploading(true);
    setError("");
    const newUrls: string[] = [];

    for (const file of arr) {
      const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const path = `${productId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

      const { error: upErr } = await supabase.storage
        .from(BUCKET)
        .upload(path, file, { contentType: file.type, upsert: false });

      if (upErr) {
        setError(`Error subiendo ${file.name}: ${upErr.message}`);
        continue;
      }

      const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${path}`;
      newUrls.push(publicUrl);
    }

    if (newUrls.length > 0) {
      const updated = [...currentPhotos, ...newUrls];
      // Persist to DB
      await supabase
        .from("ig_products")
        .update({ photos: updated })
        .eq("id", productId);
      onPhotosChange(updated);
    }

    setUploading(false);
  }

  async function removePhoto(url: string) {
    // Extract path from URL
    const path = url.split(`/public/${BUCKET}/`)[1];
    if (path) {
      await supabase.storage.from(BUCKET).remove([path]);
    }
    const updated = currentPhotos.filter((p) => p !== url);
    await supabase.from("ig_products").update({ photos: updated }).eq("id", productId);
    onPhotosChange(updated);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files) uploadFiles(e.dataTransfer.files);
  }

  return (
    <div className="space-y-3">
      {/* Current photos grid */}
      {currentPhotos.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          {currentPhotos.map((url, i) => (
            <div key={url} className="relative group aspect-square">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={url}
                alt={`Foto ${i + 1}`}
                className="w-full h-full object-cover rounded-xl border border-white/[0.07]"
              />
              {/* Order badge */}
              {i === 0 && (
                <span className="absolute top-1.5 left-1.5 text-[9px] font-bold bg-white/20 text-white/80 px-1.5 py-0.5 rounded-full">
                  Principal
                </span>
              )}
              {/* Delete button */}
              <button
                onClick={() => removePhoto(url)}
                className="absolute top-1.5 right-1.5 w-6 h-6 bg-black/60 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/80"
              >
                <span className="material-symbols-outlined text-[12px] text-white/70">close</span>
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Drop zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={`relative flex flex-col items-center justify-center gap-2 p-6 rounded-xl border-2 border-dashed cursor-pointer transition-all ${
          dragOver
            ? "border-white/30 bg-white/[0.06]"
            : "border-white/[0.10] bg-white/[0.02] hover:bg-white/[0.04] hover:border-white/[0.16]"
        }`}
      >
        {uploading ? (
          <>
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white/30" />
            <p className="text-xs text-white/45">Subiendo fotos...</p>
          </>
        ) : (
          <>
            <span className="material-symbols-outlined text-3xl text-white/25">add_photo_alternate</span>
            <p className="text-xs text-white/50 text-center">
              <span className="font-bold text-white/65">Hacé click</span> o arrastrá las fotos acá
            </p>
            <p className="text-[10px] text-white/30">JPG, PNG, WEBP · máx 10MB c/u</p>
          </>
        )}
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => e.target.files && uploadFiles(e.target.files)}
        />
      </div>

      {error && (
        <p className="text-[11px] text-white/45 bg-white/[0.04] border border-white/[0.07] rounded-lg px-3 py-2">
          ⚠️ {error}
        </p>
      )}

      {currentPhotos.length > 0 && (
        <p className="text-[10px] text-white/30 text-center">
          La primera foto es la principal · Hover para eliminar
        </p>
      )}
    </div>
  );
}

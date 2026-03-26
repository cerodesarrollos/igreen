import { NextRequest, NextResponse } from "next/server";
import { fal } from "@fal-ai/client";

const STYLE_PROMPTS: Record<string, string> = {
  dark:      "product photo of smartphone on sleek matte black background, dramatic studio lighting, high-end commercial photography, sharp focus, 4k",
  gradient:  "product photo of smartphone on smooth purple-to-blue gradient background, professional studio lighting, clean minimalist style",
  lifestyle: "product photo of smartphone on white marble surface with soft natural light, lifestyle photography, minimal props, premium feel",
  white:     "product photo of smartphone on pure white background, bright even studio lighting, e-commerce style, clean and sharp",
};

export async function POST(req: NextRequest) {
  try {
    const { imageUrl, style } = await req.json();
    if (!imageUrl) return NextResponse.json({ error: "imageUrl requerida" }, { status: 400 });

    const apiKey = process.env.FAL_API_KEY;
    if (!apiKey) return NextResponse.json({ error: "FAL_API_KEY no configurada" }, { status: 500 });

    const prompt = STYLE_PROMPTS[style] || STYLE_PROMPTS.dark;

    const result = await fal.subscribe("fal-ai/flux/schnell", {
      input: {
        prompt,
        image_size: "square_hd",
        num_inference_steps: 4,
        num_images: 1,
      },
      pollInterval: 1000,
      headers: { Authorization: `Key ${apiKey}` },
    });

    const output = result as { images?: { url: string }[] };
    const outputUrl = output.images?.[0]?.url;
    if (!outputUrl) return NextResponse.json({ error: "No se generó imagen" }, { status: 500 });

    return NextResponse.json({ url: outputUrl });
  } catch (err) {
    console.error("Error generando imagen:", err);
    return NextResponse.json({ error: "Error al generar imagen" }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";

const IG_ID = "17841408400120435";
const PAGE_TOKEN = process.env.META_PAGE_ACCESS_TOKEN!;

export async function POST(req: NextRequest) {
  try {
    const { imageUrl, caption } = await req.json();

    if (!imageUrl || !caption) {
      return NextResponse.json({ error: "imageUrl y caption son requeridos" }, { status: 400 });
    }

    // Paso 1: Crear container de media
    const containerRes = await fetch(
      `https://graph.facebook.com/v17.0/${IG_ID}/media`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          image_url: imageUrl,
          caption,
          access_token: PAGE_TOKEN,
        }),
      }
    );
    const containerData = await containerRes.json();

    if (containerData.error) {
      console.error("Error creando container:", containerData.error);
      return NextResponse.json({ error: containerData.error.message }, { status: 400 });
    }

    const creationId = containerData.id;

    // Paso 2: Esperar a que el container esté listo
    await new Promise((r) => setTimeout(r, 3000));

    // Paso 3: Verificar status del container
    const statusRes = await fetch(
      `https://graph.facebook.com/v17.0/${creationId}?fields=status_code&access_token=${PAGE_TOKEN}`
    );
    const statusData = await statusRes.json();

    if (statusData.status_code && statusData.status_code !== "FINISHED") {
      // Esperar un poco más si no está listo
      await new Promise((r) => setTimeout(r, 5000));
    }

    // Paso 4: Publicar el container
    const publishRes = await fetch(
      `https://graph.facebook.com/v17.0/${IG_ID}/media_publish`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          creation_id: creationId,
          access_token: PAGE_TOKEN,
        }),
      }
    );
    const publishData = await publishRes.json();

    if (publishData.error) {
      console.error("Error publicando:", publishData.error);
      return NextResponse.json({ error: publishData.error.message }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      mediaId: publishData.id,
      message: "Publicado en Instagram correctamente",
    });
  } catch (err) {
    console.error("Error en publish route:", err);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}

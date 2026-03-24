import { NextResponse } from "next/server";

const IG_ID = "17841408400120435";
const PAGE_TOKEN = process.env.META_PAGE_ACCESS_TOKEN!;

export async function GET() {
  try {
    // Métricas del perfil (últimos 30 días)
    const profileRes = await fetch(
      `https://graph.facebook.com/v17.0/${IG_ID}/insights?metric=impressions,reach,profile_views,website_clicks,follower_count&period=day&since=${Math.floor(Date.now() / 1000) - 30 * 86400}&until=${Math.floor(Date.now() / 1000)}&access_token=${PAGE_TOKEN}`
    );
    const profileData = await profileRes.json();

    // Info básica del perfil (seguidores actuales)
    const infoRes = await fetch(
      `https://graph.facebook.com/v17.0/${IG_ID}?fields=followers_count,media_count,biography,website&access_token=${PAGE_TOKEN}`
    );
    const infoData = await infoRes.json();

    // Últimos posts con métricas
    const mediaRes = await fetch(
      `https://graph.facebook.com/v17.0/${IG_ID}/media?fields=id,caption,media_type,media_url,thumbnail_url,timestamp,like_count,comments_count&limit=9&access_token=${PAGE_TOKEN}`
    );
    const mediaData = await mediaRes.json();

    // Procesar métricas por tipo
    const metrics: Record<string, { total: number; data: { end_time: string; value: number }[] }> = {};
    if (profileData.data) {
      for (const m of profileData.data) {
        const total = m.values.reduce((sum: number, v: { value: number }) => sum + v.value, 0);
        metrics[m.name] = { total, data: m.values };
      }
    }

    return NextResponse.json({
      profile: {
        followers_count: infoData.followers_count || 0,
        media_count: infoData.media_count || 0,
        biography: infoData.biography || "",
        website: infoData.website || "",
      },
      metrics: {
        impressions: metrics.impressions?.total || 0,
        reach: metrics.reach?.total || 0,
        profile_views: metrics.profile_views?.total || 0,
        website_clicks: metrics.website_clicks?.total || 0,
        follower_count_data: metrics.follower_count?.data || [],
        impressions_data: metrics.impressions?.data || [],
        reach_data: metrics.reach?.data || [],
      },
      media: mediaData.data || [],
      error: profileData.error || infoData.error || null,
    });
  } catch (err) {
    console.error("Error fetching insights:", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

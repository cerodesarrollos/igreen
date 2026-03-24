import { NextResponse } from "next/server";

const IG_ID = "17841408400120435";
const PAGE_TOKEN = process.env.META_PAGE_ACCESS_TOKEN!;

export async function GET() {
  try {
    const since = Math.floor(Date.now() / 1000) - 30 * 86400;
    const until = Math.floor(Date.now() / 1000);

    // reach con period=day (funciona sin metric_type)
    const reachRes = await fetch(
      `https://graph.facebook.com/v17.0/${IG_ID}/insights?metric=reach&period=day&since=${since}&until=${until}&access_token=${PAGE_TOKEN}`
    );
    const reachData = await reachRes.json();

    // profile_views y website_clicks requieren metric_type=total_value
    const totalMetricsRes = await fetch(
      `https://graph.facebook.com/v17.0/${IG_ID}/insights?metric=profile_views,website_clicks&period=days_28&metric_type=total_value&access_token=${PAGE_TOKEN}`
    );
    const totalMetricsData = await totalMetricsRes.json();

    // Info básica del perfil
    const infoRes = await fetch(
      `https://graph.facebook.com/v17.0/${IG_ID}?fields=followers_count,media_count,biography,website&access_token=${PAGE_TOKEN}`
    );
    const infoData = await infoRes.json();

    // Últimos posts con métricas
    const mediaRes = await fetch(
      `https://graph.facebook.com/v17.0/${IG_ID}/media?fields=id,caption,media_type,media_url,thumbnail_url,timestamp,like_count,comments_count&limit=9&access_token=${PAGE_TOKEN}`
    );
    const mediaData = await mediaRes.json();

    // Procesar reach total
    const reachTotal = reachData.data
      ? reachData.data[0]?.values?.reduce((sum: number, v: { value: number }) => sum + v.value, 0) || 0
      : 0;
    const reachValues = reachData.data?.[0]?.values || [];

    // Procesar total_value metrics
    const totalMetrics: Record<string, number> = {};
    if (totalMetricsData.data) {
      for (const m of totalMetricsData.data) {
        totalMetrics[m.name] = m.total_value?.value || 0;
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
        reach: reachTotal,
        profile_views: totalMetrics.profile_views || 0,
        website_clicks: totalMetrics.website_clicks || 0,
        reach_data: reachValues,
      },
      media: mediaData.data || [],
      error: reachData.error || infoData.error || null,
    });
  } catch (err) {
    console.error("Error fetching insights:", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

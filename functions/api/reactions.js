// functions/api/reactions.js（Cloudflare Pages Functions / KV保存 / 連打OK）
export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const KV = env.HOU_REACTIONS; // ← PagesのKV binding名

  const corsHeaders = {
    "Access-Control-Allow-Origin": url.origin,
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };

  if (request.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (request.method === "GET") {
    const id = url.searchParams.get("id");
    if (!id) return new Response("missing id", { status: 400, headers: corsHeaders });

    const key = `reactions_${id}`;
    const stored = await KV.get(key);
    const data = stored ? JSON.parse(stored) : {};

    return new Response(JSON.stringify(data), {
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }

  if (request.method === "POST") {
    const body = await request.json().catch(() => null);
    if (!body?.id || !body?.emoji) {
      return new Response("bad body", { status: 400, headers: corsHeaders });
    }

    const key = `reactions_${body.id}`;
    const stored = await KV.get(key);
    const reactions = stored ? JSON.parse(stored) : {};

    reactions[body.emoji] = (reactions[body.emoji] || 0) + 1;

    await KV.put(key, JSON.stringify(reactions));

    return new Response(JSON.stringify(reactions), {
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }

  return new Response("method not allowed", { status: 405, headers: corsHeaders });
}

// functions/api/reactions.js
export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);

  // Cloudflare Pages の KV Binding 名（Pages設定でこれに合わせる）
  const KV = env.HOU_REACTIONS;

  if (request.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": url.origin,
        "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      },
    });
  }

  if (!KV) {
    return new Response("KV binding HOU_REACTIONS is not set", { status: 500 });
  }

  if (request.method === "GET") {
    const id = url.searchParams.get("id");
    if (!id) return new Response("missing id", { status: 400 });

    const key = `reactions_${id}`;
    const stored = await KV.get(key);
    return new Response(stored || "{}", {
      headers: { "Content-Type": "application/json" },
    });
  }

  if (request.method === "POST") {
    const body = await request.json();
    if (!body?.id || !body?.emoji) return new Response("bad body", { status: 400 });

    const key = `reactions_${body.id}`;
    const stored = await KV.get(key);
    const reactions = stored ? JSON.parse(stored) : {};

    reactions[body.emoji] = (reactions[body.emoji] || 0) + 1;

    await KV.put(key, JSON.stringify(reactions));
    return new Response(JSON.stringify(reactions), {
      headers: { "Content-Type": "application/json" },
    });
  }

  return new Response("Method Not Allowed", { status: 405 });
}

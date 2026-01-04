export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);

  const KV = env.HOU_REACTIONS;
  if (!KV) return new Response("KV binding HOU_REACTIONS is not set", { status: 500 });

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
    let body;
    try { body = await request.json(); } catch { body = null; }
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

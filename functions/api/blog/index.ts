export async function onRequestGet({ env }: any) {
  const res = await env.BLOG_API.fetch("https://dummy/api/blog");
  return new Response(await res.text(), {
    status: res.status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
    },
  });
}

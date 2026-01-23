export const onRequestPost: PagesFunction = async (context) => {
  const form = await context.request.formData();
  const pass = String(form.get("pass") || "");

  const expected = String(context.env.SECRET_PASS || "");
  if (!expected || pass !== expected) {
    return new Response("nope", { status: 403 });
  }

  const url = new URL(context.request.url);

 return new Response(null, {
  status: 302,
  headers: {
    "Set-Cookie": "hou_secret=ok; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=2592000",
    "Location": "/inside",
  },
});
};

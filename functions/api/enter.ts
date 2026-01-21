export const onRequestPost: PagesFunction = async (context) => {
  const form = await context.request.formData();
  const pass = String(form.get("pass") || "");

  
  const expected = String(context.env.SECRET_PASS || "");

  if (pass !== expected) {
    return new Response("nope", { status: 403 });
  }

  return new Response("ok", {
    status: 200,
    headers: {
      "Set-Cookie": "hou_secret=ok; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=2592000",
      "Content-Type": "text/plain",
    },
  });
};

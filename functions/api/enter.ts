export const onRequestPost: PagesFunction = async (context) => {
  const form = await context.request.formData();
  const pass = String(form.get("pass") || "");
  const expected = String(context.env.SECRET_PASS || "");

  if (!expected || pass !== expected) {
    return new Response("パスワードが違います", { status: 403 });
  }


  return Response.redirect(new URL("/inside", context.request.url), 302);
};

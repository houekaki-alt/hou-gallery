export const onRequest: PagesFunction = async (context) => {
  const url = new URL(context.request.url);

 
  if (url.pathname === "/inside.html") {
    const cookie = context.request.headers.get("Cookie") || "";
    const ok = cookie.includes("hou_secret=ok");
    if (!ok) {
      return Response.redirect(new URL("/enter.html", url.origin).toString(), 302);
    }
  }

  return context.next();
};

export async function onRequest(context) {
  const url = new URL(context.request.url);

  const clientId = context.env.GITHUB_CLIENT_ID;
  const site = "https://hou-gallery.pages.dev";

  // Decap が popup で開くやつ。GitHub に飛ばす
  const state = crypto.randomUUID();

  const authorize = new URL("https://github.com/login/oauth/authorize");
  authorize.searchParams.set("client_id", clientId);
  authorize.searchParams.set("redirect_uri", `${site}/callback`);
  authorize.searchParams.set("scope", "repo");
  authorize.searchParams.set("state", state);

  return Response.redirect(authorize.toString(), 302);
}

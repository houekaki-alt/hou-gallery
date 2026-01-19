export async function onRequest(context) {
  const url = new URL(context.request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");

  const clientId = context.env.GITHUB_CLIENT_ID;
  const clientSecret = context.env.GITHUB_CLIENT_SECRET;

  if (!code) {
    return new Response(
      `<html><body><script>
        window.opener && window.opener.postMessage(
          'authorization:github:error:{"message":"Missing code"}',
          '*'
        );
        window.close();
      </script></body></html>`,
      { headers: { "Content-Type": "text/html; charset=utf-8" } }
    );
  }

  const tokenRes = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Accept": "application/json",
      "User-Agent": "hou-gallery-admin"
    },
    body: JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
      code,
      state
    })
  });

  const tokenJson = await tokenRes.json();
  const accessToken = tokenJson.access_token;

  if (!accessToken) {
    const msg = JSON.stringify({ message: tokenJson.error_description || "No access_token" });
    return new Response(
      `<html><body><script>
        window.opener && window.opener.postMessage(
          'authorization:github:error:${msg}',
          '*'
        );
        window.close();
      </script></body></html>`,
      { headers: { "Content-Type": "text/html; charset=utf-8" } }
    );
  }

  // Decap が待ってる postMessage 形式
  const content = JSON.stringify({ token: accessToken, provider: "github" });
  return new Response(
    `<html><body><script>
      (function () {
        window.opener && window.opener.postMessage("authorizing:github", "*");
        window.opener && window.opener.postMessage(
          'authorization:github:success:${content}',
          "*"
        );
        window.close();
      })();
    </script></body></html>`,
    { headers: { "Content-Type": "text/html; charset=utf-8" } }
  );
}

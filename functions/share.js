export async function onRequest({ request }) {
  const url = new URL(request.url);
  const img = url.searchParams.get("img"); // /images/001.jpg
  const imgAbs = img
    ? new URL(img, url.origin).href
    : `${url.origin}/og.jpg`;

  const redirectTo = `${url.origin}/?img=${encodeURIComponent(img || "")}`;

  const html = `<!doctype html><html lang="ja"><head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />

<meta property="og:type" content="website" />
<meta property="og:image" content="${imgAbs}" />
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:image" content="${imgAbs}" />

<meta http-equiv="refresh" content="0; url=${redirectTo}" />
<title> </title>
</head><body></body></html>`;

  return new Response(html, {
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

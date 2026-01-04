export async function onRequest({ params, request }) {
  const id = String(params.id || "");
  const url = new URL(request.url);
  const origin = url.origin;

  
  let list = [];
  try {
    const res = await fetch(`${origin}/images.json`, { cf: { cacheTtl: 60 } });
    list = await res.json();
  } catch {
    list = [];
  }

  const item = Array.isArray(list) ? list.find(x => String(x.id) === id) : null;

  
  const imageUrl = item?.file
    ? `${origin}/${String(item.file).replace(/^\/+/, "")}`
    : `${origin}/images/1%20(18).jpg`; 
  

  const shareUrl = `${origin}/share/${encodeURIComponent(id)}`;

  
 
  const redirectTo = item
    ? `${origin}/?i=${encodeURIComponent(id)}`
    : origin;

  const html = `<!doctype html>
<html lang="ja">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>苞 イラストギャラリー</title>

  <meta property="og:title" content="苞 イラストギャラリー">
  <meta property="og:type" content="website">
  <meta property="og:url" content="${shareUrl}">
  <meta property="og:image" content="${imageUrl}">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta name="twitter:card" content="summary_large_image">

  <meta http-equiv="refresh" content="0; url=${redirectTo}">
</head>
<body></body>
</html>`;

  return new Response(html, {
    headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" },
  });
}

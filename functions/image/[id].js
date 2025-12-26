export async function onRequest({ params, request }) {
  const id = params.id;
  // ★永遠に変更不要！！ スペースなしファイル名専用
  const filename = `1(${id}).jpg`;
  const encoded = encodeURIComponent(filename);
  const imageUrl = `https://hou-gallery.pages.dev/images/${encoded}`;
  const pageUrl = `https://hou-gallery.pages.dev/image/${id}`;

  const html = `<!doctype html>
<html lang="ja">
<head>
  <meta charset="utf-8" />
  <meta property="og:title" content="@hou_enj/illustration" />
  <meta property="og:type" content="article" />
  <meta property="og:url" content="${pageUrl}" />
  <meta property="og:image" content="${imageUrl}" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>@hou_enj/illustration</title>
  <style>
    body{margin:0;display:grid;place-items:center;min-height:100vh;background:#f6f2ee}
    img{max-width:min(900px,92vw);max-height:min(92vh,1200px);border-radius:16px;box-shadow:0 10px 40px rgba(0,0,0,.12)}
    a{position:fixed;top:16px;left:16px;font-family:system-ui;color:#666;text-decoration:none;background:#fff;border:1px solid #ddd;border-radius:999px;padding:8px 12px}
  </style>
</head>
<body>
  <a href="/?img=${encodeURIComponent(id)}">← 戻る</a>
  <img src="/images/${encoded}" alt="image ${id}">
</body>
</html>`;
  return new Response(html, {
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

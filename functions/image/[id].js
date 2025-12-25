export async function onRequestGet(context) {
  const { params, request } = context;
  const id = String(params.id || "").trim();

  const url = new URL(request.url);
  const origin = url.origin;

  // 画像URL（ここはあなたの画像の置き場所に合わせる）
  // 例: /images/001.jpg 形式ならこれでOK
  const imageUrl = `${origin}/images/${id}.jpg`;

  // 人間用：最終的に開きたい場所（あなたのギャラリーの表示方式に合わせて変えてOK）
  // 例: index.html で ?id=001 を見て開く設計ならこう
  const humanRedirectTo = `${origin}/?id=${encodeURIComponent(id)}`;

  const html = `<!doctype html>
<html lang="ja">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />

  <!-- OG (Xのサムネ用) -->
  <meta property="og:type" content="website" />
  <meta property="og:title" content="" />
  <meta property="og:description" content="" />
  <meta property="og:image" content="${imageUrl}" />
  <meta property="og:image:secure_url" content="${imageUrl}" />
  <meta property="og:url" content="${origin}/image/${encodeURIComponent(id)}" />

  <!-- X(Twitter) -->
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="" />
  <meta name="twitter:description" content="" />
  <meta name="twitter:image" content="${imageUrl}" />

  <title></title>
</head>
<body>
  <script>
    location.replace(${JSON.stringify(humanRedirectTo)});
  </script>
</body>
</html>`;

  return new Response(html, {
    headers: {
      "content-type": "text/html; charset=UTF-8",
      // キャッシュでサムネがズレるのを防ぐ（超重要）
      "cache-control": "no-store",
    },
  });
}

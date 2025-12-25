export async function onRequestGet({ request, params }) {
  const n = parseInt(params.id, 10);
  if (!Number.isFinite(n) || n < 1) {
    return new Response("Not found", { status: 404 });
  }

  const url = new URL(request.url);
  const origin = url.origin;

  // あなたの実ファイル名に合わせる： 1 (1).jpg みたいな形式
  const fileName = `1 (${n}).jpg`;
  const imagePath = `/images/${encodeURIComponent(fileName)}`;
  const imageUrl = `${origin}${imagePath}`;

  const pageUrl = `${origin}/image/${n}`;

  const html = `<!doctype html>
<html lang="ja">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />

  <!-- OGP -->
  <meta property="og:type" content="website" />
  <meta property="og:url" content="${pageUrl}" />
  <meta property="og:title" content="" />
  <meta property="og:description" content="" />
  <meta property="og:image" content="${imageUrl}" />
  <meta property="og:image:secure_url" content="${imageUrl}" />

  <!-- Twitter -->
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="" />
  <meta name="twitter:description" content="" />
  <meta name="twitter:image" content="${imageUrl}" />

  <!-- できるだけキャッシュさせない（Xの再取得しやすく） -->
  <meta http-equiv="cache-control" content="no-store" />
</head>
<body>
  <script>
    // 人が開いたら本編へ飛ばす（SNSクローラはJS無視するのでOK）
    location.replace("/#img=${n}");
  </script>
</body>
</html>`;

  return new Response(html, {
    headers: {
      "content-type": "text/html; charset=UTF-8",
      "cache-control": "no-store",
    },
  });
}

export async function onRequest({ params }) {
  const id = params.id;

  // 画像ファイル名をここで組み立てる
  // 例: id=1 → 1 (1).jpg
  const imageUrl = `https://hou-gallery.pages.dev/images/1 (${id}).jpg`;

  const html = `<!doctype html>
<html lang="ja">
<head>
  <meta charset="utf-8">

  <meta property="og:title" content="イラスト">
  <meta property="og:type" content="article">
  <meta property="og:image" content="${imageUrl}">
  <meta property="og:url" content="https://hou-gallery.pages.dev/image/${id}">
  <meta name="twitter:card" content="summary_large_image">

  <meta http-equiv="refresh" content="0; url=/?img=${id}">
</head>
<body></body>
</html>`;

  return new Response(html, {
    headers: { "content-type": "text/html; charset=utf-8" }
  });
}

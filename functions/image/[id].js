export async function onRequest({ params }) {
  const id = params.id;

  // ★あなたの画像ファイル名が「1 (1).jpg」形式なのでこうする
  const imgUrl = `https://hou-gallery.pages.dev/images/1 (${id}).jpg`;

  const html = `<!doctype html>
<html lang="ja">
<head>
  <meta charset="utf-8">
  <title>hou gallery</title>

  <meta property="og:type" content="website">
  <meta property="og:title" content="hou gallery">
  <meta property="og:description" content="">
  <meta property="og:image" content="${imgUrl}">
  <meta property="og:url" content="https://hou-gallery.pages.dev/image/${id}">

  <meta name="twitter:card" content="summary_large_image">
</head>
<body>
  <script>
    // 人が開いたときはギャラリーに戻す（表示は今まで通り）
    location.replace("/?img=" + ${JSON.stringify(id)});
  </script>
</body>
</html>`;

  return new Response(html, {
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

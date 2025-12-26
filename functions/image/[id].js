export async function onRequest({ params, request }) {
  const idStr = params.id;
  const id = Number(idStr);

  // 1〜63以外はトップへ
  if (!Number.isInteger(id) || id < 1 || id > 63) {
    return Response.redirect("https://hou-gallery.pages.dev/", 302);
  }

  const origin = new URL(request.url).origin;

  // ファイル名は images.json と同じルール
  const file = `images/1 (${id}).jpg`;
  const ogImage = `${origin}/${encodeURI(file)}`;
  const pageUrl = `${origin}/image/${id}`;

  const html = `<!doctype html>
<html lang="ja">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>@hou_enj/illustration</title>

  <meta property="og:title" content="苞 イラストギャラリー">
  <meta property="og:type" content="website">
  <meta property="og:url" content="${pageUrl}">
  <meta property="og:image" content="${ogImage}">
  <meta name="twitter:card" content="summary_large_image">

  <!-- すぐ本体へ飛ばす（人間が踏んだときはギャラリーが開く） -->
  <meta http-equiv="refresh" content="0; url=${origin}/#img=${id}">
</head>
<body>
  <a href="${origin}/#img=${id}">Open</a>
</body>
</html>`;

  return new Response(html, {
    headers: { "content-type": "text/html; charset=utf-8" }
  });
}

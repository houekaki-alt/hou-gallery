export async function onRequest(context) {
  const { request, env } = context;

  // URL例: https://hou-gallery.pages.dev/image/12
  const url = new URL(request.url);
  const id = url.pathname.split("/").pop();

  // images.json を読み込み（同一サイト内）
  // ※ 自分のドメインにGETしてるだけなのでOK
  const base = `${url.protocol}//${url.host}`;
  const listRes = await fetch(`${base}/images.json`, { cf: { cacheTtl: 60 } });

  let list = [];
  try {
    list = await listRes.json();
  } catch (e) {
    list = [];
  }

  const item = list.find((x) => String(x.id) === String(id));
  const ogImage = item ? `${base}/${encodeURI(item.src)}` : `${base}/`;

  const pageUrl = `${base}/image/${encodeURIComponent(id)}`;
  const title = item ? `苞 イラスト #${id}` : "苞 イラストギャラリー";

  // SNSクローラー向けHTML（OGタグをここで確定させる）
  // 人間が開いた場合はJSでトップに飛ばして表示する
  const html = `<!doctype html>
<html lang="ja">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>${escapeHtml(title)}</title>

  <meta property="og:title" content="${escapeHtml(title)}" />
  <meta property="og:type" content="website" />
  <meta property="og:url" content="${escapeHtml(pageUrl)}" />
  <meta property="og:image" content="${escapeHtml(ogImage)}" />
  <meta name="twitter:card" content="summary_large_image" />

  <meta http-equiv="refresh" content="0; url=${escapeHtml(`${base}/?img=${encodeURIComponent(id)}`)}" />
</head>
<body>
  <p>Redirecting…</p>
  <script>
    location.replace(${JSON.stringify(`${base}/?img=${id}`)});
  </script>
</body>
</html>`;

  return new Response(html, {
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "public, max-age=60"
    }
  });
}

function escapeHtml(str) {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

const FIXED_REACTIONS = ["👍", "❤️", "🙏"];
const API_URL = "https://reactions-api.hou-ekaki.workers.dev";

let images = [];
const carousel = document.getElementById("carousel");
const msg = document.getElementById("msg");

/* ===== APIキー（端末共通にするためpathnameに統一） ===== */
function imgKeyFromFile(file) {
  // file が "/images/1 (18).jpg" でも "https://..." でも同じキーにする
  return new URL(file, location.origin).pathname; // "/images/1%20(18).jpg"
}

/* ===== API ===== */
async function apiGet(imgKey) {
  const r = await fetch(`${API_URL}?img=${encodeURIComponent(imgKey)}`, { cache: "no-store" });
  const j = await r.json().catch(() => null);
  if (!r.ok || !j?.ok) throw new Error(j?.error || "GET failed");
  return j.reactions; // [{emoji,count},...]
}

async function apiPost(imgKey, emoji) {
  const r = await fetch(API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ img: imgKey, emoji })
  });
  const j = await r.json().catch(() => null);
  if (!r.ok || !j?.ok) throw new Error(j?.error || "POST failed");
  return j.reactions;
}

/* ===== 描画 ===== */
function renderReactionsUI(reactionsArr, container, onClickEmoji) {
  // reactionsArr: [{emoji,count},...]
  const map = Object.fromEntries((reactionsArr || []).map(r => [r.emoji, r.count]));
  container.innerHTML = "";

  FIXED_REACTIONS.forEach(emoji => {
    const count = map[emoji] ?? 0;

    const btn = document.createElement("div");
    btn.className = "thumb-reaction-item";
    btn.innerHTML = `${emoji}<span>${count}</span>`;

    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      onClickEmoji(emoji);
    });

    container.appendChild(btn);
  });
}

function renderSkeleton(container) {
  // 読み込み中は「…」にして、0で上書きしない
  container.innerHTML = "";
  FIXED_REACTIONS.forEach(emoji => {
    const btn = document.createElement("div");
    btn.className = "thumb-reaction-item";
    btn.innerHTML = `${emoji}<span>…</span>`;
    container.appendChild(btn);
  });
}

/* ===== 1枚分：読み込み＆クリック処理 ===== */
async function attachReactions(item, container) {
  const imgKey = imgKeyFromFile(item.file);

  renderSkeleton(container);

  // まずDBから読み込み
  try {
    const reactions = await apiGet(imgKey);
    renderReactionsUI(reactions, container, async (emoji) => {
      // 押したらDBに+1 → 返ってきた値で更新（0に戻らない）
      try {
        const updated = await apiPost(imgKey, emoji);
        renderReactionsUI(updated, container, arguments.callee);
      } catch {
        msg.innerHTML = `<div class="error">リアクション保存に失敗（POST）</div>`;
      }
    });
  } catch {
    // GET失敗時も一応0表示（この時だけ）
    renderReactionsUI([], container, async (emoji) => {
      try {
        const updated = await apiPost(imgKey, emoji);
        renderReactionsUI(updated, container, arguments.callee);
      } catch {
        msg.innerHTML = `<div class="error">リアクション保存に失敗（POST）</div>`;
      }
    });
  }
}

/* ===== 初期化（表示はあなたのまま） ===== */
async function init() {
  let res;
  try {
    res = await fetch("/images.json", { cache: "no-store" });
  } catch {
    msg.innerHTML = `<div class="error">images.json を読み込めません</div>`;
    return;
  }

  images = await res.json();
  carousel.innerHTML = "";

  images.forEach((item) => {
    const card = document.createElement("div");
    card.className = "thumb-container";

    const img = document.createElement("img");
    img.className = "thumb";
    img.src = item.file;
    img.loading = "lazy";

    const bar = document.createElement("div");
    bar.className = "thumb-reaction-bar";

    const reactions = document.createElement("div");
    reactions.className = "thumb-reactions-container";

    bar.appendChild(reactions);
    card.appendChild(img);
    card.appendChild(bar);
    carousel.appendChild(card);

    // ★ここだけがlocalStorage→APIに変わった
    attachReactions(item, reactions);
  });
}

init();

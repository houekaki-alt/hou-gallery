/* =========================
   設定
========================= */
const API = "https://reactions-api.hou-ekaki.workers.dev";
const FIXED_EMOJIS = ["👍", "❤️", "🙏"];

// ★ここだけ選んでください
// true: 画像を自動で探す（番号が連続してる前提 / 少し重い）
// false: IMAGES配列を使う（あなたの元の方式そのまま）
const USE_AUTO_SCAN = false;

// 画像が /images/1 (18).jpg 形式のとき用（AUTO_SCANで使用）
const IMAGE_DIR = "/images/";
const IMAGE_PREFIX = "1 (";
const IMAGE_SUFFIX = ").jpg";
const MISS_LIMIT = 60;
const MAX_TRIES = 5000;

// 固定リスト方式（元のサイトのやり方に合わせてここに貼る）
const IMAGES = [
  // 例:
  // "/images/1 (1).jpg",
  // "/images/1 (2).jpg",
];

/* =========================
   DOM
========================= */
const carouselEl = document.getElementById("carousel");
const msgEl = document.getElementById("msg");

const modalEl = document.getElementById("modal");
const modalImgEl = document.getElementById("modal-img");
const closeBtn = document.getElementById("close");
const prevBtn = document.getElementById("prev");
const nextBtn = document.getElementById("next");

const reactionsContainer = document.getElementById("reactions-container");
const shareBtn = document.getElementById("share-btn");

/* =========================
   状態
========================= */
let images = [];
let currentIndex = -1;
// 画像切替中に古いGET結果で上書きされるのを防ぐための番号札
let reactionReqToken = 0;

/* =========================
   小物
========================= */
function setMsg(text = "") {
  if (msgEl) msgEl.textContent = text;
}

// ★PC/スマホで同じキーになるように固定（0に戻る原因の一つを潰す）
function toImgKeyFromSrc(src) {
  // srcが相対でも絶対でも pathname に統一する
  return new URL(src, location.origin).pathname; // "/images/1%20(18).jpg"
}

function getCurrentImgKey() {
  if (!modalImgEl?.src) return null;
  return toImgKeyFromSrc(modalImgEl.src);
}

/* =========================
   画像一覧（AUTO_SCANオプション）
   - fetchを使わず new Image() で確認（ブロッカー回避）
========================= */
function imageExists(src) {
  return new Promise(resolve => {
    const img = new Image();
    img.onload = () => resolve(true);
    img.onerror = () => resolve(false);
    img.src = src;
  });
}

async function buildImageListAuto() {
  const list = [];
  let miss = 0;

  for (let i = 1; i <= MAX_TRIES; i++) {
    const src = `${IMAGE_DIR}${IMAGE_PREFIX}${i}${IMAGE_SUFFIX}`;
    const ok = await imageExists(src);

    if (ok) {
      list.push(src);
      miss = 0;
    } else {
      miss++;
    }

    if (miss >= MISS_LIMIT) break;
  }
  return list;
}

/* =========================
   カルーセル描画（レイアウトはCSS任せ）
   - あなたの元の形（カード）に合わせて class を触らない
========================= */
function renderCarousel() {
  carouselEl.innerHTML = "";

  if (!images.length) {
    setMsg("画像がありません（画像リスト or 命名規則を確認してね）");
    return;
  }
  setMsg("");

  images.forEach((src, idx) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "card"; // ★元のCSSが card 想定ならこれ
    // もし元が "thumb" なら、次の行を "thumb" に変えてOK
    // btn.className = "thumb";

    const img = document.createElement("img");
    img.src = src;
    img.alt = "";
    img.loading = "lazy";

    btn.appendChild(img);
    btn.addEventListener("click", () => openModal(idx));
    carouselEl.appendChild(btn);
  });
}

/* =========================
   リアクションUI
   - ここが最重要：切替時に 0 を描かない
========================= */
function renderReactions(reactions) {
  reactionsContainer.innerHTML = "";
  reactions.forEach(r => {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "reaction-btn";
    b.textContent = `${r.emoji} ${r.count}`;
    b.addEventListener("click", () => sendReaction(r.emoji));
    reactionsContainer.appendChild(b);
  });
}

function ensureButtonsSkeleton() {
  // 初回だけ「枠」を出す（数字は "…" にして 0 を出さない）
  if (reactionsContainer.dataset.ready === "1") return;

  reactionsContainer.innerHTML = "";
  FIXED_EMOJIS.forEach(e => {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "reaction-btn";
    b.textContent = `${e} …`;
    b.addEventListener("click", () => sendReaction(e));
    reactionsContainer.appendChild(b);
  });
  reactionsContainer.dataset.ready = "1";
}

/* =========================
   API
========================= */
async function apiGet(imgKey) {
  const r = await fetch(`${API}?img=${encodeURIComponent(imgKey)}`, { cache: "no-store" });
  const j = await r.json().catch(() => null);
  if (!r.ok || !j?.ok) throw new Error(j?.error || "GET failed");
  return j;
}

async function apiPost(imgKey, emoji) {
  const r = await fetch(API, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ img: imgKey, emoji })
  });
  const j = await r.json().catch(() => null);
  if (!r.ok || !j?.ok) throw new Error(j?.error || "POST failed");
  return j;
}

/* =========================
   リアクション読み込み
   - トークンで「古いGETが上書き」を防ぐ
========================= */
async function loadReactions() {
  const imgKey = getCurrentImgKey();
  if (!imgKey) return;

  const token = ++reactionReqToken;

  try {
    const data = await apiGet(imgKey);
    if (token !== reactionReqToken) return; // 途中で画像が変わったら捨てる

    // ★GETが成功したときだけ表示を更新
    renderReactions(data.reactions);
    setMsg("");
  } catch (e) {
    // 失敗時：0で初期化しない。枠だけは残す。
    if (token !== reactionReqToken) return;
    setMsg("リアクション読込に失敗（ネットワーク）");
  }
}

/* =========================
   送信（0に戻らない核心）
========================= */
async function sendReaction(emoji) {
  const imgKey = getCurrentImgKey();
  if (!imgKey) return;

  try {
    // ★POST成功の返り値が「DBの真の値」
    const data = await apiPost(imgKey, emoji);
    renderReactions(data.reactions);
    setMsg("");
  } catch (e) {
    setMsg("リアクション保存に失敗（POST）");
  }
}

/* =========================
   モーダル
========================= */
function openModal(idx) {
  currentIndex = idx;
  modalImgEl.src = images[currentIndex];

  modalEl.classList.add("open");
  modalEl.setAttribute("aria-hidden", "false");

  // ★0は描かない。枠だけ出す
  ensureButtonsSkeleton();
  loadReactions();
  updateShare();
}

function closeModal() {
  modalEl.classList.remove("open");
  modalEl.setAttribute("aria-hidden", "true");
}

function prev() {
  if (!images.length) return;
  currentIndex = (currentIndex - 1 + images.length) % images.length;
  modalImgEl.src = images[currentIndex];
  ensureButtonsSkeleton();
  loadReactions();
  updateShare();
}

function next() {
  if (!images.length) return;
  currentIndex = (currentIndex + 1) % images.length;
  modalImgEl.src = images[currentIndex];
  ensureButtonsSkeleton();
  loadReactions();
  updateShare();
}

/* =========================
   シェア（X）
========================= */
function updateShare() {
  const url = encodeURIComponent(location.href);
  const text = encodeURIComponent("苞のイラスト");
  shareBtn.onclick = () => {
    window.open(
      `https://twitter.com/intent/tweet?text=${text}&url=${url}`,
      "_blank",
      "noopener"
    );
  };
}

/* =========================
   イベント
========================= */
closeBtn.onclick = closeModal;
prevBtn.onclick = prev;
nextBtn.onclick = next;

modalEl.addEventListener("click", e => {
  if (e.target === modalEl) closeModal();
});

window.addEventListener("keydown", e => {
  if (modalEl.getAttribute("aria-hidden") === "true") return;
  if (e.key === "Escape") closeModal();
  if (e.key === "ArrowLeft") prev();
  if (e.key === "ArrowRight") next();
});

/* =========================
   起動
========================= */
(async () => {
  // 画像一覧：元のサイトの方式を優先
  if (USE_AUTO_SCAN) {
    images = await buildImageListAuto();
  } else {
    images = IMAGES.slice();
  }

  renderCarousel();
})();

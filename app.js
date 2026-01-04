/* =====================
   設定
===================== */
const API = "https://reactions-api.hou-ekaki.workers.dev";
const EMOJIS = ["👍", "❤️", "🙏"];

// 画像の実パス・命名規則
const IMAGE_DIR = "/images/";
const IMAGE_PREFIX = "1 (";
const IMAGE_SUFFIX = ").jpg";

// 途中番号から始まっても拾うための安全装置
const MISS_LIMIT = 60;
const MAX_TRIES = 5000;

/* =====================
   DOM
===================== */
const carouselEl = document.getElementById("carousel");
const msgEl = document.getElementById("msg");

const modalEl = document.getElementById("modal");
const modalImgEl = document.getElementById("modal-img");
const closeBtn = document.getElementById("close");
const prevBtn = document.getElementById("prev");
const nextBtn = document.getElementById("next");

const reactionsContainer = document.getElementById("reactions-container");
const shareBtn = document.getElementById("share-btn");

/* =====================
   状態
===================== */
let images = [];
let currentIndex = -1;

/* =====================
   共通
===================== */
function setMsg(t = "") {
  if (msgEl) msgEl.textContent = t;
}

// リアクションのキーを必ず統一
function normalizeImgKey(src) {
  return new URL(src, location.origin).pathname;
}
function getCurrentImgKey() {
  if (!modalImgEl.src) return null;
  return normalizeImgKey(modalImgEl.src);
}

/* =====================
   画像存在確認（fetch不使用）
===================== */
function imageExists(src) {
  return new Promise(resolve => {
    const img = new Image();
    img.onload = () => resolve(true);
    img.onerror = () => resolve(false);
    img.src = src;
  });
}

/* =====================
   画像一覧生成（枚数指定なし）
===================== */
async function buildImageList() {
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

/* =====================
   カルーセル（CSS想定どおり）
===================== */
function renderCarousel() {
  carouselEl.innerHTML = "";

  if (!images.length) {
    setMsg("画像が見つかりません");
    return;
  }
  setMsg("");

  images.forEach((src, idx) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "thumb";

    const img = document.createElement("img");
    img.src = src;
    img.loading = "lazy";
    img.alt = "";

    btn.appendChild(img);
    btn.onclick = () => openModal(idx);

    carouselEl.appendChild(btn);
  });
}

/* =====================
   リアクション描画
===================== */
function renderReactions(reactions) {
  reactionsContainer.innerHTML = "";
  reactions.forEach(r => {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "reaction-btn";
    b.textContent = `${r.emoji} ${r.count}`;
    b.onclick = () => sendReaction(r.emoji);
    reactionsContainer.appendChild(b);
  });
}
function renderDefaultReactions() {
  renderReactions(EMOJIS.map(e => ({ emoji: e, count: 0 })));
}

/* =====================
   API
===================== */
async function apiGet(imgKey) {
  const r = await fetch(`${API}?img=${encodeURIComponent(imgKey)}`);
  const j = await r.json().catch(() => null);
  if (!r.ok || !j?.ok) throw new Error();
  return j;
}
async function apiPost(imgKey, emoji) {
  const r = await fetch(API, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ img: imgKey, emoji })
  });
  const j = await r.json().catch(() => null);
  if (!r.ok || !j?.ok) throw new Error();
  return j;
}

/* =====================
   リアクション制御
===================== */
async function loadReactions() {
  const imgKey = getCurrentImgKey();
  if (!imgKey) return;

  try {
    const data = await apiGet(imgKey);
    renderReactions(data.reactions);
  } catch {
    renderDefaultReactions();
  }
}

async function sendReaction(emoji) {
  const imgKey = getCurrentImgKey();
  if (!imgKey) return;

  try {
    const data = await apiPost(imgKey, emoji);
    // ★ POST結果だけで更新 → 0に戻らない
    renderReactions(data.reactions);
  } catch {
    setMsg("リアクション保存に失敗");
  }
}

/* =====================
   モーダル
===================== */
function openModal(idx) {
  currentIndex = idx;
  modalImgEl.src = images[currentIndex];

  modalEl.classList.add("open");
  modalEl.setAttribute("aria-hidden", "false");

  renderDefaultReactions();
  loadReactions();
  updateShare();
}

function closeModal() {
  modalEl.classList.remove("open");
  modalEl.setAttribute("aria-hidden", "true");
}

function prev() {
  currentIndex = (currentIndex - 1 + images.length) % images.length;
  openModal(currentIndex);
}
function next() {
  currentIndex = (currentIndex + 1) % images.length;
  openModal(currentIndex);
}

/* =====================
   シェア（X）
===================== */
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

/* =====================
   イベント
===================== */
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

/* =====================
   起動
===================== */
(async () => {
  images = await buildImageList();
  renderCarousel();
})();

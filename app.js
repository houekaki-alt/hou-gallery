/* =====================
   設定
===================== */
const API = "https://reactions-api.hou-ekaki.workers.dev";
const EMOJIS = ["👍", "❤️", "🙏"];

// 画像の命名規則
const IMAGE_DIR = "./images/";
const IMAGE_PREFIX = "1 (";
const IMAGE_SUFFIX = ").jpg";

// ★ここが肝：連続で何回「無い」が続いたら探索をやめるか
const MISS_LIMIT = 30; // 30連続404で終了（最初が18でもOK）
const MAX_TRIES = 2000; // 念のため上限（暴走防止）

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

function normalizeImgKey(src) {
  return new URL(src, location.origin).pathname;
}
function getCurrentImgKey() {
  if (!modalImgEl.src) return null;
  return normalizeImgKey(modalImgEl.src);
}

/* =====================
   画像一覧（枚数指定なし／途中開始OK）
===================== */
async function buildImageList() {
  const list = [];
  let miss = 0;

  for (let i = 1; i <= MAX_TRIES; i++) {
    const src = `${IMAGE_DIR}${IMAGE_PREFIX}${i}${IMAGE_SUFFIX}`;

    try {
      // PagesでHEADが拒否される事があるのでGETで確認
      const res = await fetch(src, { method: "GET", cache: "no-store" });

      if (res.ok) {
        list.push(src);
        miss = 0; // 見つかったら連続ミスをリセット
      } else {
        miss++;
      }
    } catch {
      miss++;
    }

    // 連続で無かったら、もう終盤と判断して終了
    if (miss >= MISS_LIMIT) break;
  }

  return list;
}

/* =====================
   カルーセル
===================== */
function renderCarousel() {
  carouselEl.innerHTML = "";

  if (images.length === 0) {
    setMsg("画像が見つからない（ファイル名/場所を確認して）");
    return;
  }

  setMsg("");

  images.forEach((src, idx) => {
    const btn = document.createElement("button");
    btn.className = "thumb";
    btn.type = "button";

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
   リアクション表示
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
    // ★POST成功の結果だけ反映（1→0に戻らない）
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
  if (!images.length) return;
  currentIndex = (currentIndex - 1 + images.length) % images.length;
  modalImgEl.src = images[currentIndex];
  renderDefaultReactions();
  loadReactions();
  updateShare();
}

function next() {
  if (!images.length) return;
  currentIndex = (currentIndex + 1) % images.length;
  modalImgEl.src = images[currentIndex];
  renderDefaultReactions();
  loadReactions();
  updateShare();
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
(async function init() {
  images = await buildImageList();
  renderCarousel();
})();

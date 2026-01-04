/* =====================
   設定
===================== */
const API = "https://reactions-api.hou-ekaki.workers.dev";
const EMOJIS = ["👍", "❤️", "🙏"];

const IMAGE_DIR = "/images/";
const IMAGE_PREFIX = "1 (";
const IMAGE_SUFFIX = ").jpg";

const MISS_LIMIT = 60;   // 連続で無かったら終了
const MAX_TRIES  = 5000;

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
   画像一覧（fetchを使わない）
===================== */
function imageExists(src) {
  return new Promise(resolve => {
    const img = new Image();
    img.onload = () => resolve(true);
    img.onerror = () => resolve(false);
    img.src = src;
  });
}

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
   カルーセル
===================== */
function renderCarousel() {
  carouselEl.innerHTML = "";

  if (!images.length) {
    setMsg("画像が見つかりません");
    return;
  }
  setMsg("");

  images.forEach((src, idx) => {
    const img = document.createElement("img");
    img.src = src;
    img.loading = "lazy";
    img.style.cursor = "pointer";

    img.onclick = () => openModal(idx);
    carouselEl.appendChild(img);
  });
}

/* =====================
   リアクション
===================== */
function renderReactions(reactions) {
  reactionsContainer.innerHTML = "";
  reactions.forEach(r => {
    const b = document.createElement("button");
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
  const j = await r.json();
  if (!r.ok || !j.ok) throw new Error();
  return j;
}
async function apiPost(imgKey, emoji) {
  const r = await fetch(API, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ img: imgKey, emoji })
  });
  const j = await r.json();
  if (!r.ok || !j.ok) throw new Error();
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
    renderReactions(data.reactions); // ★0に戻らない
  } catch {
    setMsg("保存失敗");
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
   イベント
===================== */
closeBtn.onclick = closeModal;
prevBtn.onclick = prev;
nextBtn.onclick = next;

/* =====================
   起動
===================== */
(async () => {
  images = await buildImageList();
  renderCarousel();
})();

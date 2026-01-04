/* =====================
   設定
===================== */
const API = "https://reactions-api.hou-ekaki.workers.dev";
const EMOJIS = ["👍", "❤️", "🙏"];

// 画像命名規則: /images/1 (18).jpg の形
const IMAGE_DIR = "/images/";
const IMAGE_PREFIX = "1 (";
const IMAGE_SUFFIX = ").jpg";

// 途中から始まっても探せるようにする
const MISS_LIMIT = 60;   // 連続で60個無かったら終わり
const MAX_TRIES  = 5000; // 念のため上限

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

// POST/GETで同じキーに統一（1→0に戻る対策の核）
function normalizeImgKey(src) {
  return new URL(src, location.origin).pathname; // "/images/1%20(18).jpg" みたいになる
}
function getCurrentImgKey() {
  if (!modalImgEl?.src) return null;
  return normalizeImgKey(modalImgEl.src);
}

/* =====================
   画像一覧（自動）
   - 1(1)が無くても探し続ける
   - 「無い」が続いたら終わり
===================== */
async function buildImageList() {
  const list = [];
  let miss = 0;

  for (let i = 1; i <= MAX_TRIES; i++) {
    const path = `${IMAGE_DIR}${IMAGE_PREFIX}${i}${IMAGE_SUFFIX}`;
    const url = new URL(path, location.origin);

    try {
      // PagesでHEADがダメなことがあるのでGETで確認
      const res = await fetch(url, { method: "GET", cache: "no-store" });

      if (res.ok) {
        list.push(path);
        miss = 0; // 見つかったらリセット
      } else {
        miss++;
      }
    } catch {
      miss++;
    }

    if (miss >= MISS_LIMIT) break;
  }

  return list;
}

/* =====================
   カルーセル（とにかく表示が出る構造）
   - 余計なclass依存を減らす
===================== */
function renderCarousel() {
  carouselEl.innerHTML = "";

  if (!images.length) {
    setMsg("画像が見つからない（ファイル名・場所を確認してね）");
    return;
  }
  setMsg("");

  images.forEach((src, idx) => {
    // “ボタン＋img” だとCSSが効かない環境があるので、imgを直置きにする
    const img = document.createElement("img");
    img.src = src;
    img.loading = "lazy";
    img.alt = "";
    img.style.cursor = "pointer";

    img.addEventListener("click", () => openModal(idx));
    carouselEl.appendChild(img);
  });
}

/* =====================
   リアクションUI
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
    setMsg("");
  } catch {
    // GET失敗時は0表示にしておく
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
    setMsg("");
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

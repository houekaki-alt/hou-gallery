const FIXED_REACTIONS = ["👍", "❤️", "🙏"];
const API_URL = "https://reactions-api.hou-ekaki.workers.dev"; // あなたのWorker URL

let images = [];
let currentIndex = 0;

const carousel = document.getElementById("carousel");
const modal = document.getElementById("modal");
const modalImg = document.getElementById("modal-img");
const shareBtn = document.getElementById("share-btn");
const msg = document.getElementById("msg");

/**
 * DB用のキー（ファイル名）
 */
function imgKeyFromFile(file) {
  const fileName = file.split('/').pop(); 
  return encodeURIComponent(decodeURIComponent(fileName)); 
}

/**
 * X共有URL用の短いID（例: "1 (65).jpg" -> "65"）
 */
function getShortId(file) {
  const match = file.match(/\((\d+)\)/); 
  return match ? match[1] : null;
}

/* API通信 */
async function apiCall(method, imgKey, emoji = null) {
  const url = method === "GET" ? `${API_URL}?img=${imgKey}&t=${Date.now()}` : API_URL;
  const options = {
    method,
    headers: { "Content-Type": "application/json" },
    cache: "no-store"
  };
  if (method === "POST") options.body = JSON.stringify({ img: imgKey, emoji });

  const r = await fetch(url, options);
  const j = await r.json().catch(() => null);
  if (!r.ok || !j?.ok) throw new Error("API Error");
  return j.reactions;
}

/* リアクションUIの描画 */
function renderReactionsUI(reactionsArr, container, imgKey, isModal = false) {
  const map = Object.fromEntries((reactionsArr || []).map(r => [r.emoji, r.count]));
  container.innerHTML = "";
  FIXED_REACTIONS.forEach(emoji => {
    const count = map[emoji] ?? 0;
    const btn = document.createElement("div");
    btn.className = isModal ? "reaction-item" : "thumb-reaction-item";
    btn.innerHTML = `${emoji}<span>${count}</span>`;
    
    btn.addEventListener("click", async (e) => {
      e.stopPropagation();
      btn.style.pointerEvents = "none";
      try {
        const updated = await apiCall("POST", imgKey, emoji);
        renderReactionsUI(updated, container, imgKey, isModal);
      } catch (err) {
        console.error("Reactions update failed", err);
      } finally {
        btn.style.pointerEvents = "auto";
      }
    });
    container.appendChild(btn);
  });
}

/* リアクション情報の取得と紐付け */
async function attachReactions(item, container, isModal = false) {
  const imgKey = imgKeyFromFile(item.file);
  try {
    const reactions = await apiCall("GET", imgKey);
    renderReactionsUI(reactions, container, imgKey, isModal);
  } catch {
    renderReactionsUI([], container, imgKey, isModal);
  }
}

/* モーダルを開く */
function openModal(index) {
  currentIndex = index;
  const item = images[currentIndex];
  modalImg.src = item.file;
  modal.style.display = "block";
  setTimeout(() => modal.classList.add("show"), 10);
  
  const container = document.getElementById("reactions-container");
  attachReactions(item, container, true);
}

/* モーダルを閉じる */
function closeModal() {
  modal.classList.remove("show");
  setTimeout(() => { modal.style.display = "none"; }, 250);
}

/* 初期化処理 */
async function init() {
  try {
    const res = await fetch("/images.json", { cache: "no-store" });
    images = await res.json();
  } catch (e) {
    msg.innerHTML = "データの読み込みに失敗しました。";
    return;
  }

  carousel.innerHTML = "";
  images.forEach((item, index) => {
    const card = document.createElement("div");
    card.className = "thumb-container";
    
    const img = document.createElement("img");
    img.className = "thumb";
    img.src = item.file;
    img.loading = "lazy";
    img.addEventListener("click", () => openModal(index));

    const bar = document.createElement("div");
    bar.className = "thumb-reaction-bar";
    const container = document.createElement("div");
    container.className = "thumb-reactions-container";

    bar.appendChild(container);
    card.appendChild(img);
    card.appendChild(bar);
    carousel.appendChild(card);
    
    attachReactions(item, container, false);
  });

  // URLに目印(?i=65)があったら自動でその画像を開く
  const urlParams = new URLSearchParams(window.location.search);
  const iParam = urlParams.get('i');
  if (iParam) {
    const idx = images.findIndex(item => {
        const sid = getShortId(item.file);
        return sid === iParam;
    });
    if (idx !== -1) openModal(idx);
  }
}

/* X共有機能 */
shareBtn.addEventListener("click", () => {
  const item = images[currentIndex];
  const shortId = getShortId(item.file);
  const text = encodeURIComponent("苞さんのイラストギャラリーより");
  
  // URLを ?i=65 形式に
  const shareUrl = shortId 
    ? `${window.location.origin}/?i=${shortId}` 
    : window.location.href;
    
  window.open(`https://twitter.com/intent/tweet?text=${text}&url=${encodeURIComponent(shareUrl)}`, '_blank');
});

/* モーダル操作のイベントリスナー */
document.getElementById("close").addEventListener("click", closeModal);
document.getElementById("prev").addEventListener("click", (e) => {
  e.stopPropagation();
  currentIndex = (currentIndex - 1 + images.length) % images.length;
  openModal(currentIndex);
});
document.getElementById("next").addEventListener("click", (e) => {
  e.stopPropagation();
  currentIndex = (currentIndex + 1) % images.length;
  openModal(currentIndex);
});
modal.addEventListener("click", (e) => { if (e.target === modal) closeModal(); });

// キーボード操作対応
document.addEventListener("keydown", (e) => {
  if (modal.classList.contains("show")) {
    if (e.key === "ArrowLeft") document.getElementById("prev").click();
    if (e.key === "ArrowRight") document.getElementById("next").click();
    if (e.key === "Escape") closeModal();
  }
});

init();
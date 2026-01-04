const FIXED_REACTIONS = ["👍", "❤️", "🙏"];
const API_URL = "https://reactions-api.hou-ekaki.workers.dev"; // あなたのWorker URL

let images = [];
let currentIndex = 0;

const carousel = document.getElementById("carousel");
const msg = document.getElementById("msg");
const modal = document.getElementById("modal");
const modalImg = document.getElementById("modal-img");

/**
 * 端末間でキーを共通化するための関数
 */
function imgKeyFromFile(file) {
  const fileName = file.split('/').pop(); 
  return encodeURIComponent(decodeURIComponent(fileName)); 
}

/* API通信 */
async function apiCall(method, imgKey, emoji = null) {
  const url = method === "GET" 
    ? `${API_URL}?img=${imgKey}&t=${Date.now()}` 
    : API_URL;

  const options = {
    method,
    headers: { "Content-Type": "application/json" },
    cache: "no-store"
  };
  if (method === "POST") {
    options.body = JSON.stringify({ img: imgKey, emoji });
  }

  const r = await fetch(url, options);
  const j = await r.json().catch(() => null);
  if (!r.ok || !j?.ok) throw new Error("API Error");
  return j.reactions;
}

/* リアクションUIの描画 */
function renderReactionsUI(reactionsArr, container, imgKey) {
  const map = Object.fromEntries((reactionsArr || []).map(r => [r.emoji, r.count]));
  container.innerHTML = "";

  FIXED_REACTIONS.forEach(emoji => {
    const count = map[emoji] ?? 0;
    const btn = document.createElement("div");
    btn.className = "thumb-reaction-item";
    btn.innerHTML = `${emoji}<span>${count}</span>`;

    btn.addEventListener("click", async (e) => {
      e.stopPropagation();
      btn.style.pointerEvents = "none";
      try {
        const updated = await apiCall("POST", imgKey, emoji);
        renderReactionsUI(updated, container, imgKey);
      } catch (err) {
        msg.innerHTML = `<div class="error">保存に失敗しました</div>`;
      } finally {
        btn.style.pointerEvents = "auto";
      }
    });

    container.appendChild(btn);
  });
}

/* スケルトン表示 */
function renderSkeleton(container) {
  container.innerHTML = "";
  FIXED_REACTIONS.forEach(emoji => {
    const btn = document.createElement("div");
    btn.className = "thumb-reaction-item";
    btn.innerHTML = `${emoji}<span>…</span>`;
    container.appendChild(btn);
  });
}

/* リアクション機能の紐付け */
async function attachReactions(item, container) {
  const imgKey = imgKeyFromFile(item.file);
  renderSkeleton(container);
  try {
    const reactions = await apiCall("GET", imgKey);
    renderReactionsUI(reactions, container, imgKey);
  } catch {
    renderReactionsUI([], container, imgKey);
  }
}

/* モーダルを開く */
function openModal(index) {
  currentIndex = index;
  const item = images[currentIndex];
  modalImg.src = item.file;
  
  modal.style.display = "block";
  // クラス付与タイミングを少し遅らせてアニメーションを効かせる
  setTimeout(() => modal.classList.add("show"), 10);
  modal.setAttribute("aria-hidden", "false");
}

/* モーダルを閉じる */
function closeModal() {
  modal.classList.remove("show");
  setTimeout(() => {
    modal.style.display = "none";
  }, 250);
  modal.setAttribute("aria-hidden", "true");
}

/* 初期化 */
async function init() {
  try {
    const res = await fetch("/images.json", { cache: "no-store" });
    images = await res.json();
  } catch {
    msg.innerHTML = `<div class="error">images.json を読み込めません</div>`;
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
    
    // 画像クリックでモーダル起動
    img.addEventListener("click", () => openModal(index));

    const bar = document.createElement("div");
    bar.className = "thumb-reaction-bar";
    const reactionsContainer = document.createElement("div");
    reactionsContainer.className = "thumb-reactions-container";

    bar.appendChild(reactionsContainer);
    card.appendChild(img);
    card.appendChild(bar);
    carousel.appendChild(card);

    attachReactions(item, reactionsContainer);
  });
}

/* モーダル関連のイベントリスナー（1回だけ登録） */
document.getElementById("close").addEventListener("click", closeModal);

document.getElementById("prev").addEventListener("click", (e) => {
  e.stopPropagation();
  currentIndex = (currentIndex - 1 + images.length) % images.length;
  modalImg.src = images[currentIndex].file;
});

document.getElementById("next").addEventListener("click", (e) => {
  e.stopPropagation();
  currentIndex = (currentIndex + 1) % images.length;
  modalImg.src = images[currentIndex].file;
});

// 背景クリックで閉じる
modal.addEventListener("click", (e) => {
  if (e.target === modal) closeModal();
});

init();
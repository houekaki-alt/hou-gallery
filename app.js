const FIXED_REACTIONS = ["👍", "❤️", "🙏"];
const API_URL = "https://reactions-api.hou-ekaki.workers.dev"; 

let images = [];
let currentIndex = 0;

const carousel = document.getElementById("carousel");
const modal = document.getElementById("modal");
const modalImg = document.getElementById("modal-img");
const shareBtn = document.getElementById("share-btn");

// DB用キー（変更厳禁）
function imgKeyFromFile(file) {
  const fileName = file.split('/').pop(); 
  return encodeURIComponent(decodeURIComponent(fileName)); 
}

// X共有URL用のID抽出（"1 (65).jpg" -> "65"）
function getShortId(file) {
  const match = file.match(/\((\d+)\)/); 
  return match ? match[1] : null;
}

async function apiCall(method, imgKey, emoji = null) {
  const url = method === "GET" ? `${API_URL}?img=${imgKey}&t=${Date.now()}` : API_URL;
  const options = {
    method,
    headers: { "Content-Type": "application/json" },
    cache: "no-store"
  };
  if (method === "POST") options.body = JSON.stringify({ img: imgKey, emoji });

  const r = await fetch(url, options);
  const j = await r.json();
  return j.reactions;
}

function renderReactionsUI(reactionsArr, container, imgKey, isModal = false) {
  const map = Object.fromEntries((reactionsArr || []).map(r => [r.emoji, r.count]));
  container.innerHTML = "";
  FIXED_REACTIONS.forEach(emoji => {
    const count = map[emoji] ?? 0;
    const btn = document.createElement("div");
    btn.className = isModal ? "reaction-item" : "thumb-reaction-item";
    btn.innerHTML = `${emoji}<span>${count}</span>`;
    btn.onclick = async (e) => {
      e.stopPropagation();
      btn.style.pointerEvents = "none";
      try {
        await apiCall("POST", imgKey, emoji);
        const updated = await apiCall("GET", imgKey);
        renderReactionsUI(updated, container, imgKey, isModal);
      } finally { btn.style.pointerEvents = "auto"; }
    };
    container.appendChild(btn);
  });
}

async function attachReactions(item, container, isModal = false) {
  const imgKey = imgKeyFromFile(item.file);
  try {
    const reactions = await apiCall("GET", imgKey);
    renderReactionsUI(reactions, container, imgKey, isModal);
  } catch { renderReactionsUI([], container, imgKey, isModal); }
}

function openModal(index) {
  currentIndex = index;
  const item = images[currentIndex];
  modalImg.src = item.file;
  modal.style.display = "block";
  setTimeout(() => modal.classList.add("show"), 10);
  attachReactions(item, document.getElementById("reactions-container"), true);
}

function closeModal() {
  modal.classList.remove("show");
  setTimeout(() => { modal.style.display = "none"; }, 250);
}

async function init() {
  const res = await fetch("/images.json", { cache: "no-store" });
  images = await res.json();

  carousel.innerHTML = "";
  images.forEach((item, index) => {
    const card = document.createElement("div");
    card.className = "thumb-container";
    const img = document.createElement("img");
    img.className = "thumb";
    img.src = item.file;
    img.onclick = () => openModal(index);

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

  // URLパラメータ ?i=数字 があれば自動で開く
  const urlParams = new URLSearchParams(window.location.search);
  const iParam = urlParams.get('i');
  if (iParam) {
    const idx = images.findIndex(item => getShortId(item.file) === iParam);
    if (idx !== -1) openModal(idx);
  }
}

shareBtn.onclick = () => {
  const item = images[currentIndex];
  const shortId = getShortId(item.file);
  const text = encodeURIComponent("苞さんのイラストギャラリーより");
  // 共有用URLを生成
  const shareUrl = `${window.location.origin}/?i=${shortId}`;
  window.open(`https://twitter.com/intent/tweet?text=${text}&url=${encodeURIComponent(shareUrl)}`, '_blank');
};

document.getElementById("close").onclick = closeModal;
document.getElementById("prev").onclick = (e) => {
  e.stopPropagation();
  currentIndex = (currentIndex - 1 + images.length) % images.length;
  openModal(currentIndex);
};
document.getElementById("next").onclick = (e) => {
  e.stopPropagation();
  currentIndex = (currentIndex + 1) % images.length;
  openModal(currentIndex);
};
modal.onclick = (e) => { if (e.target === modal) closeModal(); };

init();
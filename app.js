const FIXED_REACTIONS = ["👍", "❤️", "🙏"];
const API_URL = "https://reactions-api.hou-ekaki.workers.dev";

let images = [];
let currentIndex = 0;

const carousel = document.getElementById("carousel");
const modal = document.getElementById("modal");
const modalImg = document.getElementById("modal-img");
const shareBtn = document.getElementById("share-btn");
const msg = document.getElementById("msg");

function imgKeyFromFile(file) {
  const fileName = file.split('/').pop(); 
  return encodeURIComponent(decodeURIComponent(fileName)); 
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
  const j = await r.json().catch(() => null);
  if (!r.ok || !j?.ok) throw new Error("API Error");
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
    btn.addEventListener("click", async (e) => {
      e.stopPropagation();
      btn.style.pointerEvents = "none";
      try {
        const updated = await apiCall("POST", imgKey, emoji);
        renderReactionsUI(updated, container, imgKey, isModal);
      } catch (err) { console.error(err); } finally { btn.style.pointerEvents = "auto"; }
    });
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
  try {
    const res = await fetch("/images.json", { cache: "no-store" });
    images = await res.json();
  } catch (e) { return; }
  carousel.innerHTML = "";
  images.forEach((item, index) => {
    const card = document.createElement("div");
    card.className = "thumb-container";
    const img = document.createElement("img");
    img.className = "thumb";
    img.src = item.file;
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
}

// Xシェア（画像直リンク版）
shareBtn.addEventListener("click", () => {
  const item = images[currentIndex];
  const absoluteImageUrl = new URL(item.file, window.location.origin).href;
  const text = encodeURIComponent("イラストを見ました！");
  window.open(`https://twitter.com/intent/tweet?text=${text}&url=${encodeURIComponent(absoluteImageUrl)}`, '_blank');
});

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
init();
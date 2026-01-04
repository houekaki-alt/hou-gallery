const FIXED_REACTIONS = ["👍", "❤️", "🙏"];
const API_URL = "https://reactions-api.hou-ekaki.workers.dev";

let images = [];
let currentIndex = 0;

const carousel = document.getElementById("carousel");
const msg = document.getElementById("msg");

const modal = document.getElementById("modal");
const modalImg = document.getElementById("modal-img");
const reactionsContainer = document.getElementById("reactions-container");
const shareBtn = document.getElementById("share-btn");
const closeBtn = document.getElementById("close");
const prevBtn = document.getElementById("prev");
const nextBtn = document.getElementById("next");


function imgKeyFromItem(item) {
  return String(item.id);
}


function renderLoading(container, isModal = false) {
  container.innerHTML = "";
  FIXED_REACTIONS.forEach((e) => {
    const btn = document.createElement("div");
    btn.className = isModal ? "reaction-item" : "thumb-reaction-item";
    btn.innerHTML = `${e}<span>…</span>`;
    container.appendChild(btn);
  });
}


async function apiGet(imgKey) {
  const url = `${API_URL}/?img=${encodeURIComponent(imgKey)}`;
  const r = await fetch(url, { method: "GET" });
  if (!r.ok) throw new Error("GET failed");
  const j = await r.json();
  return j.reactions || FIXED_REACTIONS.map((e) => ({ emoji: e, count: 0 }));
}

async function apiPost(imgKey, emoji) {
  const r = await fetch(`${API_URL}/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ img: imgKey, emoji }),
  });
  if (!r.ok) throw new Error("POST failed");
  return r.json().catch(() => ({}));
}

function renderReactionsUI(reactionsArr, container, imgKey, isModal = false) {
  const map = Object.fromEntries((reactionsArr || []).map((r) => [r.emoji, r.count]));
  container.innerHTML = "";

  FIXED_REACTIONS.forEach((emoji) => {
    const count = map[emoji] ?? 0;

    const btn = document.createElement("div");
    btn.className = isModal ? "reaction-item" : "thumb-reaction-item";
    btn.innerHTML = `${emoji}<span>${count}</span>`;

    btn.addEventListener("click", async (e) => {
      e.preventDefault();
      e.stopPropagation();

      const span = btn.querySelector("span");
      const before = parseInt(span.textContent, 10) || 0;

     
      span.textContent = String(before + 1);

      try {
        await apiPost(imgKey, emoji);

        
        const latest = await apiGet(imgKey);
        renderReactionsUI(latest, container, imgKey, isModal);

        
        syncThumbIfOpen(imgKey, latest);
      } catch (err) {
       
        span.textContent = String(before);
        console.error(err);
      }
    });

    container.appendChild(btn);
  });
}


function syncThumbIfOpen(imgKey, latestReactions) {
  const thumb = document.querySelector(`.thumb-reactions-container[data-key="${CSS.escape(imgKey)}"]`);
  if (!thumb) return;
  renderReactionsUI(latestReactions, thumb, imgKey, false);
}


function openModal(index) {
  currentIndex = index;
  const item = images[currentIndex];

  modalImg.src = item.file;
  modal.style.display = "block";
  requestAnimationFrame(() => modal.classList.add("show"));

  const key = imgKeyFromItem(item);

  
  renderLoading(reactionsContainer, true);

  apiGet(key)
    .then((data) => renderReactionsUI(data, reactionsContainer, key, true))
    .catch((err) => {
      console.error(err);
      
    });

 
  const url = new URL(location.href);
  url.searchParams.set("i", String(index + 1));
  shareBtn.onclick = () => {
    const shareText = "苞さんのイラストを見ました！";
    const shareUrl = `https://x.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(url.toString())}`;
    window.open(shareUrl, "_blank", "noopener");
  };
}

function closeModal() {
  modal.classList.remove("show");
  setTimeout(() => {
    modal.style.display = "none";
  }, 200);
}

function prev() {
  if (!images.length) return;
  openModal((currentIndex - 1 + images.length) % images.length);
}
function next() {
  if (!images.length) return;
  openModal((currentIndex + 1) % images.length);
}

closeBtn.addEventListener("click", closeModal);
prevBtn.addEventListener("click", prev);
nextBtn.addEventListener("click", next);

modal.addEventListener("click", (e) => {
  if (e.target === modal) closeModal();
});


document.addEventListener("keydown", (e) => {
  const open = modal.style.display === "block";
  if (!open) return;
  if (e.key === "Escape") closeModal();
  if (e.key === "ArrowLeft") prev();
  if (e.key === "ArrowRight") next();
});


async function init() {
  msg.textContent = "読み込み中…";

  const res = await fetch("/images.json", { cache: "no-store" });
  images = await res.json();

  carousel.innerHTML = "";

  images.forEach((item, index) => {
    const card = document.createElement("div");
    card.className = "thumb-container";

    const img = document.createElement("img");
    img.className = "thumb";
    img.src = item.file;
    img.alt = "";
    img.addEventListener("click", () => openModal(index));

    const bar = document.createElement("div");
    bar.className = "thumb-reaction-bar";

    const container = document.createElement("div");
    container.className = "thumb-reactions-container";

    
    const key = imgKeyFromItem(item);
    container.dataset.key = key;

    bar.appendChild(container);
    card.appendChild(img);
    card.appendChild(bar);
    carousel.appendChild(card);

    
    renderLoading(container, false);

    apiGet(key)
      .then((data) => renderReactionsUI(data, container, key, false))
      .catch((err) => {
        console.error(err);
        
      });
  });

  msg.textContent = "";
}

init().catch((err) => {
  console.error(err);
  msg.textContent = "読み込みに失敗しました。";
});

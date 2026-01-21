async function loadArtworksFromCMS() {
  const res = await fetch("https://dduckth5s9.microcms.io/api/v1/artworks?limit=200", {
  headers: {
    "X-MICROCMS-API-KEY": "rZuCnNa7mF8FPM3vfIPKmLgtXBiLIlj2tflQ"
  },
  cache: "no-store",
});

  if (!res.ok) throw new Error("CMS fetch failed: " + res.status);
  const data = await res.json();

  
    return (data.contents || []).map((c) => {
    const legacyImgKey = String(c.artwork_id || "").match(/\d+$/)?.[0] || "";
    return {
      id: c.artwork_id,
      legacyImgKey,
      title: c.title || "",
      tags: (c.tags || "").split(/\r?\n/).map(s => s.trim()).filter(Boolean),
      file: c.image?.url || "",
      source: "cms",
    };
  });
}



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


function keyFromItem(item) {
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
  if (!r.ok) throw new Error(`GET failed: ${r.status}`);
  const j = await r.json();
  return j.reactions || FIXED_REACTIONS.map((e) => ({ emoji: e, count: 0 }));
}

async function apiPost(imgKey, emoji) {
  const r = await fetch(`${API_URL}/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ img: imgKey, emoji }),
  });
  if (!r.ok) throw new Error(`POST failed: ${r.status}`);
 
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

        
        syncThumb(imgKey, latest);
        syncModal(imgKey, latest);
      } catch (err) {
        
        span.textContent = String(before);
        console.error(err);
      }
    });

    container.appendChild(btn);
  });
}

function syncThumb(imgKey, latestReactions) {
  const el = document.querySelector(`.thumb-reactions-container[data-key="${CSS.escape(imgKey)}"]`);
  if (!el) return;
  renderReactionsUI(latestReactions, el, imgKey, false);
}

function syncModal(imgKey, latestReactions) {
 
  if (modal.style.display !== "block") return;
  const item = images[currentIndex];
  if (!item) return;
  const curKey = keyFromItem(item);
  if (curKey !== imgKey) return;
  renderReactionsUI(latestReactions, reactionsContainer, imgKey, true);
}


function openModal(index) {
  if (!images.length) return;

  currentIndex = index;
  const item = images[currentIndex]; // ← item宣言はここ1回だけ
  const file = item.file;

  modalImg.src = file;

  modal.style.display = "block";
  requestAnimationFrame(() => modal.classList.add("show"));

  const key = keyFromItem(item);


  renderLoading(reactionsContainer, true);

  apiGet(key)
    .then((data) => renderReactionsUI(data, reactionsContainer, key, true))
    .catch((err) => {
      console.error(err);
      
    });

  
  shareBtn.onclick = () => {
    const sharePage = `${location.origin}/share/${encodeURIComponent(item.id)}`;
    const shareText = "苞さんのイラストを見ました！";
    const xIntent = `https://x.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(sharePage)}`;
    window.open(xIntent, "_blank", "noopener");
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

  images = await loadArtworksFromCMS();


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

    const key = keyFromItem(item);
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

 
  const qp = new URLSearchParams(location.search);
  const openId = qp.get("i");
  if (openId) {
    const idx = images.findIndex((x) => String(x.id) === String(openId));
    if (idx >= 0) openModal(idx);
  }
}

init().catch((err) => {
  console.error(err);
  msg.textContent = "読み込みに失敗しました。";
});




const FIXED_REACTIONS = ["👍", "❤️", "🙏"];

const API_URL = "https://hou-gallery.website";

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

function imgKeyFromFile(file) {
  return encodeURIComponent(file.split("/").pop());
}

function makeZeroReactions() {
  return FIXED_REACTIONS.map(e => ({ emoji: e, count: 0 }));
}

async function apiGet(imgKey) {
  const url = `${API_URL}/?img=${imgKey}&t=${Date.now()}`;
  const r = await fetch(url, { method: "GET" });
  if (!r.ok) throw new Error("GET failed");
  const j = await r.json();
  return j.reactions || makeZeroReactions();
}

async function apiPost(imgKey, emoji) {
  const r = await fetch(`${API_URL}/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ img: imgKey, emoji }),
  });
  if (!r.ok) throw new Error("POST failed");
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
      e.preventDefault();
      e.stopPropagation();

      
      const span = btn.querySelector("span");
      span.textContent = String((parseInt(span.textContent, 10) || 0) + 1);

      
      try {
        await apiPost(imgKey, emoji);
      } catch (err) {
        // 失敗したら元に戻す（嘘カウント防止）
        span.textContent = String(count);
        console.error(err);
        return;
      }

      
      try {
        const latest = await apiGet(imgKey);
        // このcontainerは今押した側
        renderReactionsUI(latest, container, imgKey, isModal);

        
        const modalOpen = modal.style.display === "block";
        if (modalOpen) {
          const currentKey = imgKeyFromFile(images[currentIndex].file);
          if (currentKey === imgKey) {
            renderReactionsUI(latest, reactionsContainer, imgKey, true);
          }
        }
      } catch (err) {
        
        console.error(err);
      }
    });

    container.appendChild(btn);
  });
}

function openModal(index) {
  currentIndex = index;
  const file = images[currentIndex].file;
  modalImg.src = file;

  modal.style.display = "block";
  requestAnimationFrame(() => modal.classList.add("show"));

  
  const key = imgKeyFromFile(file);
  renderReactionsUI(makeZeroReactions(), reactionsContainer, key, true);
  apiGet(key).then(data => renderReactionsUI(data, reactionsContainer, key, true))
             .catch(() => renderReactionsUI(makeZeroReactions(), reactionsContainer, key, true));

  // 共有ボタン
  const url = new URL(location.href);
  url.searchParams.set("i", String(index + 1)); // 
  shareBtn.onclick = () => {
    const shareText = "苞(@hou_enj) イラスト";
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

// ESC / ← → 対応
document.addEventListener("keydown", (e) => {
  const open = modal.style.display === "block";
  if (!open) return;
  if (e.key === "Escape") closeModal();
  if (e.key === "ArrowLeft") prev();
  if (e.key === "ArrowRight") next();
});

async function init() {
  const res = await fetch("/images.json");
  images = await res.json();

  carousel.innerHTML = "";

  images.forEach((item, index) => {
    const card = document.createElement("div");
    card.className = "thumb-container";

    const img = document.createElement("img");
    img.className = "thumb";                // ★超重要：CSSの前提を満たす
    img.src = item.file;
    img.alt = "";
    img.addEventListener("click", () => openModal(index));

    const bar = document.createElement("div");
    bar.className = "thumb-reaction-bar";

    const container = document.createElement("div");
    container.className = "thumb-reactions-container";

    bar.appendChild(container);
    card.appendChild(img);
    card.appendChild(bar);
    carousel.appendChild(card);

    const key = imgKeyFromFile(item.file);


    renderReactionsUI(makeZeroReactions(), container, key, false);

    
    apiGet(key)
      .then(data => renderReactionsUI(data, container, key, false))
      .catch(() => {
       
        renderReactionsUI(makeZeroReactions(), container, key, false);
      });
  });

  msg.textContent = "";
}

init().catch(err => {
  console.error(err);
  msg.textContent = "読み込みに失敗しました。";
});

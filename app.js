const FIXED_REACTIONS = ["👍", "❤️", "🙏"];

let images = [];
let currentIndex = 0;

const carousel = document.getElementById("carousel");
const msg = document.getElementById("msg");

const modal = document.getElementById("modal");
const modalImg = document.getElementById("modal-img");
const closeBtn = document.getElementById("close");
const shareBtn = document.getElementById("share-btn");

const reactionsContainer = document.getElementById("reactions-container");
const moreEmojiBtn = document.getElementById("more-emoji-btn");
const emojiPickerContainer = document.getElementById("emoji-picker-container");

let prevBtn, nextBtn;
let picker = null;

// postId -> { reactionsEl }
const thumbUI = new Map();

// APIが落ちてる時の警告を1回だけ出す
let apiDeadWarned = false;

function showError(text) {
  msg.innerHTML = `<div class="error">${text}</div>`;
}

function warnApiDeadOnce() {
  if (apiDeadWarned) return;
  apiDeadWarned = true;
  // 表示したくないならこの行消してOK
  showError("※ いま /api/reactions が使えないため、この端末内だけのカウント（localStorage）で動いています。");
}

/* ===== ローカル保存（フォールバック） ===== */
function lsKey(postId) { return `reactions_${postId}`; }
function lsGet(postId) {
  try {
    const s = localStorage.getItem(lsKey(postId));
    return s ? JSON.parse(s) : {};
  } catch { return {}; }
}
function lsPut(postId, obj) {
  try { localStorage.setItem(lsKey(postId), JSON.stringify(obj)); } catch {}
}

/* ===== API ===== */
async function apiGetReactions(postId) {
  try {
    const res = await fetch(`/api/reactions?id=${encodeURIComponent(postId)}`, { cache: "no-store" });
    if (!res.ok) return null; // ← null は API死
    return await res.json();
  } catch {
    return null;
  }
}

async function apiAddReaction(postId, emoji) {
  try {
    const res = await fetch(`/api/reactions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: postId, emoji }),
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

/* ===== 絵文字ピッカー ===== */
async function initEmojiPicker() {
  if (picker) return;

  const data = await (await fetch("https://cdn.jsdelivr.net/npm/@emoji-mart/data")).json();
  picker = new EmojiMart.Picker({
    data,
    theme: "light",
    locale: "ja",
    set: "native",
    previewPosition: "none",
    skinTonePosition: "none",
    onEmojiSelect: (emoji) => {
      addReaction(images[currentIndex].id, emoji.native);
      hidePicker();
    },
  });

  emojiPickerContainer.appendChild(picker);
}

function openPickerAt(buttonEl) {
  emojiPickerContainer.style.display = "block";

  const isMobile = window.matchMedia("(max-width: 768px)").matches;
  if (isMobile) {
    emojiPickerContainer.style.left = "50%";
    emojiPickerContainer.style.top = "50%";
    emojiPickerContainer.style.transform = "translate(-50%, -50%)";
    return;
  }

  const rect = buttonEl.getBoundingClientRect();
  const margin = 12;

  emojiPickerContainer.style.transform = "none";

  const w = 360;
  const h = 420;

  let left = rect.left;
  let top = rect.bottom + margin;

  if (left + w > window.innerWidth) left = window.innerWidth - w - margin;
  if (top + h > window.innerHeight) top = rect.top - h - margin;

  left = Math.max(margin, left);
  top = Math.max(margin, top);

  emojiPickerContainer.style.left = `${left}px`;
  emojiPickerContainer.style.top = `${top}px`;
}

function hidePicker() {
  emojiPickerContainer.style.display = "none";
}

/* ===== リアクション描画 ===== */
async function getReactions(postId) {
  // まずAPIを試す
  const api = await apiGetReactions(postId);
  if (api !== null) return api;

  // API死ならローカルに落とす
  warnApiDeadOnce();
  return lsGet(postId);
}

async function setReactions(postId, reactions) {
  // APIへ書けるならAPI優先
  // ここは addReaction 内で apiAddReaction してるので、通常は呼ばない
  lsPut(postId, reactions);
}

async function renderReactionBar(postId, container, type = "thumb") {
  container.innerHTML = "";

  const reactions = await getReactions(postId);

  // 固定3種：必ず 0 も表示
  for (const emoji of FIXED_REACTIONS) {
    const count = reactions[emoji] ?? 0;

    const item = document.createElement("div");
    item.className = type === "thumb" ? "thumb-reaction-item" : "reaction-item";
    item.innerHTML = `${emoji}<span>${count}</span>`;

    item.addEventListener("click", (e) => {
      e.stopPropagation();
      addReaction(postId, emoji);
    }, { passive: true });

    container.appendChild(item);
  }

  // 固定以外：押されたものだけ表示
  Object.keys(reactions)
    .filter((e) => !FIXED_REACTIONS.includes(e) && (reactions[e] ?? 0) > 0)
    .sort((a, b) => reactions[b] - reactions[a])
    .forEach((emoji) => {
      const item = document.createElement("div");
      item.className = type === "thumb" ? "thumb-reaction-item" : "reaction-item";
      item.innerHTML = `${emoji}<span>${reactions[emoji]}</span>`;
      item.addEventListener("click", (ev) => {
        ev.stopPropagation();
        addReaction(postId, emoji);
      }, { passive: true });
      container.appendChild(item);
    });
}

async function addReaction(postId, emoji) {
  // まずAPIに投げる（成功すれば全端末共通）
  const updated = await apiAddReaction(postId, emoji);

  if (updated !== null) {
    // API成功：その値で更新
    if (modal.style.display === "block") {
      renderReactionBar(images[currentIndex].id, reactionsContainer, "modal");
    }
    const ui = thumbUI.get(String(postId));
    if (ui?.reactionsEl) renderReactionBar(postId, ui.reactionsEl, "thumb");
    return;
  }

  // API死：ローカルで増やす（押せる状態にする）
  warnApiDeadOnce();
  const reactions = lsGet(postId);
  reactions[emoji] = (reactions[emoji] || 0) + 1;
  await setReactions(postId, reactions);

  if (modal.style.display === "block") {
    renderReactionBar(images[currentIndex].id, reactionsContainer, "modal");
  }
  const ui = thumbUI.get(String(postId));
  if (ui?.reactionsEl) renderReactionBar(postId, ui.reactionsEl, "thumb");
}

/* ===== モーダル ===== */
function updateShareBtn() {
  shareBtn.onclick = () => {
    const shareUrl = `${location.origin}/image/${images[currentIndex].id}`;
    const twitterUrl = `https://twitter.com/intent/tweet?url=${encodeURIComponent(shareUrl)}`;
    window.open(twitterUrl, "_blank");
  };
}

function openModal(index) {
  currentIndex = index;
  modal.style.display = "block";
  setTimeout(() => modal.classList.add("show"), 10);
  modalImg.src = images[currentIndex].file;
  updateShareBtn();

  if (!prevBtn) {
    prevBtn = document.createElement("div");
    prevBtn.className = "prev";
    prevBtn.innerHTML = "‹";
    prevBtn.onclick = prevImage;
    modal.appendChild(prevBtn);

    nextBtn = document.createElement("div");
    nextBtn.className = "next";
    nextBtn.innerHTML = "›";
    nextBtn.onclick = nextImage;
    modal.appendChild(nextBtn);
  }

  renderReactionBar(images[currentIndex].id, reactionsContainer, "modal");
}

function closeModal() {
  modal.classList.remove("show");
  setTimeout(() => (modal.style.display = "none"), 300);
  hidePicker();
}

function prevImage() {
  currentIndex = (currentIndex - 1 + images.length) % images.length;
  modalImg.src = images[currentIndex].file;
  updateShareBtn();
  renderReactionBar(images[currentIndex].id, reactionsContainer, "modal");
}
function nextImage() {
  currentIndex = (currentIndex + 1) % images.length;
  modalImg.src = images[currentIndex].file;
  updateShareBtn();
  renderReactionBar(images[currentIndex].id, reactionsContainer, "modal");
}

/* ===== init ===== */
async function init() {
  let res;
  try {
    res = await fetch("/images.json", { cache: "no-store" });
  } catch {
    showError("images.json を読み込めませんでした（ネットワークエラー）");
    return;
  }
  if (!res.ok) {
    showError(`images.json の読み込みに失敗しました（${res.status}）`);
    return;
  }

  let data;
  try {
    data = await res.json();
  } catch {
    showError("images.json が壊れています（JSON形式エラー）");
    return;
  }
  if (!Array.isArray(data) || data.length === 0) {
    showError("images.json に画像データがありません");
    return;
  }

  images = data;
  carousel.innerHTML = "";
  thumbUI.clear();

  images.forEach((item, index) => {
    const card = document.createElement("div");
    card.className = "thumb-container";

    const img = document.createElement("img");
    img.className = "thumb";
    img.loading = "lazy";
    img.src = item.file;
    img.alt = `illustration ${item.id}`;
    img.onclick = () => openModal(index);

    const bar = document.createElement("div");
    bar.className = "thumb-reaction-bar";

    const reactionsEl = document.createElement("div");
    reactionsEl.className = "thumb-reactions-container";

    const plusBtn = document.createElement("button");
    plusBtn.className = "thumb-more-btn";
    plusBtn.type = "button";
    plusBtn.textContent = "＋";
    plusBtn.onclick = async (e) => {
      e.stopPropagation();
      currentIndex = index;
      await initEmojiPicker();
      openPickerAt(e.currentTarget);
    };

    bar.appendChild(reactionsEl);
    bar.appendChild(plusBtn);

    card.appendChild(img);
    card.appendChild(bar);
    carousel.appendChild(card);

    thumbUI.set(String(item.id), { reactionsEl });

    // 初期描画（👍0 ❤️0 🙏0）
    renderReactionBar(item.id, reactionsEl, "thumb");
  });

  // モーダルの＋
  moreEmojiBtn.textContent = "＋";
  moreEmojiBtn.onclick = async (e) => {
    e.stopPropagation();
    await initEmojiPicker();
    openPickerAt(e.currentTarget);
  };

  document.addEventListener("keydown", (e) => {
    if (modal.style.display === "block") {
      if (e.key === "ArrowLeft") prevImage();
      if (e.key === "ArrowRight") nextImage();
      if (e.key === "Escape") closeModal();
    }
  });
}

// ピッカー外で閉じる（picker内部クリックは閉じない）
document.addEventListener("pointerdown", (e) => {
  if (emojiPickerContainer.style.display !== "block") return;
  const inPicker = emojiPickerContainer.contains(e.target);
  const onPlus = e.target.closest(".thumb-more-btn") || e.target.closest(".more-emoji-btn");
  if (!inPicker && !onPlus) hidePicker();
});

closeBtn.onclick = closeModal;
modal.onclick = (e) => { if (e.target === modal) closeModal(); };

init();

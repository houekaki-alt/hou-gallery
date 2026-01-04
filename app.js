// app.js
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

// 一覧のDOMを postId -> {container, moreBtn} で持つ
const thumbUI = new Map();

function showError(text) {
  msg.innerHTML = `<div class="error">${text}</div>`;
}

/* ========= API (Cloudflare KV) ========= */

async function apiGetReactions(postId) {
  const res = await fetch(`/api/reactions?id=${encodeURIComponent(postId)}`, { cache: "no-store" });
  if (!res.ok) {
    // 失敗が見えるようにしておく
    console.warn("GET /api/reactions failed", res.status);
    return {};
  }
  try {
    return await res.json();
  } catch {
    return {};
  }
}

async function apiAddReaction(postId, emoji) {
  const res = await fetch(`/api/reactions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id: postId, emoji }),
  });
  if (!res.ok) {
    console.warn("POST /api/reactions failed", res.status);
    return null;
  }
  try {
    return await res.json(); // 最新のreactionsを返す
  } catch {
    return null;
  }
}

/* ========= UI ========= */

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

function updateShareBtn() {
  shareBtn.onclick = function () {
    // どのドメインでも正しく動くようにする
    const shareUrl = `${location.origin}/image/${images[currentIndex].id}`;
    const twitterUrl = `https://twitter.com/intent/tweet?url=${encodeURIComponent(shareUrl)}`;
    window.open(twitterUrl, "_blank");
  };
}

/* ピッカー位置制御：スマホは中央、PCは押したボタン付近 */
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

  // 一旦仮置きしてサイズを取れるように
  emojiPickerContainer.style.left = "0px";
  emojiPickerContainer.style.top = "0px";

  const pickerWidth = emojiPickerContainer.offsetWidth || 320;
  const pickerHeight = emojiPickerContainer.offsetHeight || 420;

  let left = rect.left;
  let top = rect.bottom + margin;

  if (left + pickerWidth > window.innerWidth) {
    left = window.innerWidth - pickerWidth - margin;
  }
  if (top + pickerHeight > window.innerHeight) {
    top = rect.top - pickerHeight - margin;
  }

  left = Math.max(margin, left);
  top = Math.max(margin, top);

  emojiPickerContainer.style.left = `${left}px`;
  emojiPickerContainer.style.top = `${top}px`;
}

function hidePicker() {
  emojiPickerContainer.style.display = "none";
}

/* ========= リアクション描画 ========= */

async function renderReactionBar(postId, container, type = "thumb") {
  container.innerHTML = "";

  const reactions = await apiGetReactions(postId);

  // 固定(👍❤️🙏)を必ず出す
  FIXED_REACTIONS.forEach((emoji) => {
    const count = reactions[emoji] || 0;
    const item = document.createElement("div");
    item.className = type === "thumb" ? "thumb-reaction-item" : "reaction-item";

    // 0は数字なし（押しやすさ優先）
    item.innerHTML = `${emoji}${count > 0 ? `<span>${count}</span>` : ""}`;

    item.onclick = (e) => {
      e.stopPropagation();
      addReaction(postId, emoji);
    };
    container.appendChild(item);
  });

  // 固定以外で押されてるものも表示（数があるものだけ）
  Object.keys(reactions)
    .filter((emoji) => !FIXED_REACTIONS.includes(emoji) && reactions[emoji] > 0)
    .sort((a, b) => reactions[b] - reactions[a])
    .forEach((emoji) => {
      const item = document.createElement("div");
      item.className = type === "thumb" ? "thumb-reaction-item" : "reaction-item";
      item.innerHTML = `${emoji}<span>${reactions[emoji]}</span>`;
      item.onclick = (e) => {
        e.stopPropagation();
        addReaction(postId, emoji);
      };
      container.appendChild(item);
    });
}

async function addReaction(postId, emoji) {
  const updated = await apiAddReaction(postId, emoji);
  if (!updated) return;

  // モーダル開いてるならモーダルも更新
  if (modal.style.display === "block") {
    renderReactionBar(images[currentIndex].id, reactionsContainer, "modal");
  }

  // 一覧の当該カードも更新
  const ui = thumbUI.get(String(postId));
  if (ui?.reactionsEl) {
    renderReactionBar(postId, ui.reactionsEl, "thumb");
  }
}

/* ========= Emoji Picker ========= */

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

/* ========= init ========= */

async function init() {
  let res;
  try {
    res = await fetch("/images.json", { cache: "no-store" });
  } catch (e) {
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
  } catch (e) {
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
    const container = document.createElement("div");
    container.className = "thumb-container";

    const img = document.createElement("img");
    img.className = "thumb";
    img.loading = "lazy";
    img.src = item.file;
    img.alt = `illustration ${item.id}`;
    img.onclick = () => openModal(index);

    // 画像内に重ねるリアクションバー
    const thumbBar = document.createElement("div");
    thumbBar.className = "thumb-reaction-bar";

    const thumbReactions = document.createElement("div");
    thumbReactions.className = "thumb-reactions-container";

    const thumbMore = document.createElement("button");
    thumbMore.className = "thumb-more-btn";
    thumbMore.type = "button";
    thumbMore.innerHTML = "＋";
    thumbMore.onclick = async (e) => {
      e.stopPropagation();
      currentIndex = index;
      await initEmojiPicker();
      openPickerAt(e.currentTarget);
    };

    thumbBar.appendChild(thumbReactions);
    thumbBar.appendChild(thumbMore);

    container.appendChild(img);
    container.appendChild(thumbBar);
    carousel.appendChild(container);

    thumbUI.set(String(item.id), { reactionsEl: thumbReactions, moreBtn: thumbMore });

    // 非同期で初期表示（KVから）
    renderReactionBar(item.id, thumbReactions, "thumb");
  });

  // モーダルの＋
  moreEmojiBtn.innerHTML = "＋";
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

/* ピッカー：外クリックで閉じる */
document.addEventListener("pointerdown", (e) => {
  if (emojiPickerContainer.style.display === "block") {
    const isOnPicker = emojiPickerContainer.contains(e.target);
    const isOnPlus = e.target.closest(".thumb-more-btn") || e.target.closest(".more-emoji-btn");
    if (!isOnPicker && !isOnPlus) hidePicker();
  }
});

closeBtn.onclick = closeModal;
modal.onclick = function (event) {
  if (event.target === modal) closeModal();
};

init();

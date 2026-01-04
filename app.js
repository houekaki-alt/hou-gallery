// app.js 完全版（スマホ＝中央、PC＝⋯ボタン近くに表示 + iPhone即閉じ対策）
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
let pickerReady = false;

function showError(text) {
  msg.innerHTML = `<div class="error">${text}</div>`;
}

function isModalOpen() {
  return modal.style.display === "block";
}

/* ===== Picker open/close (PC: near button, Mobile: center) ===== */
function openPickerAt(anchorEl) {
  emojiPickerContainer.style.display = "block";
  emojiPickerContainer.setAttribute("aria-hidden", "false");

  const isMobile = window.matchMedia("(max-width: 768px)").matches;

  // スマホ/アンカーなしは中央固定
  if (isMobile || !anchorEl) {
    emojiPickerContainer.style.left = "50%";
    emojiPickerContainer.style.top = "50%";
    emojiPickerContainer.style.transform = "translate(-50%, -50%)";
    return;
  }

  // PCは押したボタン付近
  emojiPickerContainer.style.transform = "translate(0, 0)";

  const r = anchorEl.getBoundingClientRect();
  const margin = 12;

  // サイズ計測のため一旦表示位置を仮置き
  emojiPickerContainer.style.left = "0px";
  emojiPickerContainer.style.top = "0px";

  requestAnimationFrame(() => {
    const pw = emojiPickerContainer.offsetWidth;
    const ph = emojiPickerContainer.offsetHeight;

    let left = r.left;
    let top = r.bottom + margin;

    // 右はみ出し補正
    left = Math.min(left, window.innerWidth - pw - margin);
    left = Math.max(margin, left);

    // 下はみ出しなら上に出す
    if (top + ph > window.innerHeight - margin) {
      top = r.top - ph - margin;
    }

    // 上も無理なら中央
    if (top < margin) {
      emojiPickerContainer.style.left = "50%";
      emojiPickerContainer.style.top = "50%";
      emojiPickerContainer.style.transform = "translate(-50%, -50%)";
      return;
    }

    emojiPickerContainer.style.left = `${left}px`;
    emojiPickerContainer.style.top = `${top}px`;
  });
}

function closePicker() {
  emojiPickerContainer.style.display = "none";
  emojiPickerContainer.setAttribute("aria-hidden", "true");
}

function togglePicker(anchorEl) {
  if (emojiPickerContainer.style.display === "block") closePicker();
  else openPickerAt(anchorEl);
}

/* ===== Modal ===== */
function openModal(index) {
  currentIndex = index;

  modal.style.display = "block";
  modal.setAttribute("aria-hidden", "false");
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
  initEmojiPicker(); // 先読み
}

function closeModal() {
  modal.classList.remove("show");
  modal.setAttribute("aria-hidden", "true");
  setTimeout(() => (modal.style.display = "none"), 300);
  closePicker();
}

function prevImage() {
  currentIndex = (currentIndex - 1 + images.length) % images.length;
  modalImg.src = images[currentIndex].file;
  updateShareBtn();
  renderReactionBar(images[currentIndex].id, reactionsContainer, "modal");
  closePicker();
}

function nextImage() {
  currentIndex = (currentIndex + 1) % images.length;
  modalImg.src = images[currentIndex].file;
  updateShareBtn();
  renderReactionBar(images[currentIndex].id, reactionsContainer, "modal");
  closePicker();
}

function updateShareBtn() {
  shareBtn.onclick = function () {
    const shareUrl = `https://hou-gallery.pages.dev/image/${images[currentIndex].id}`;
    const twitterUrl = `https://twitter.com/intent/tweet?url=${encodeURIComponent(shareUrl)}`;
    window.open(twitterUrl, "_blank");
  };
}

/* ===== OG image ===== */
function setDynamicOgImage() {
  if (images.length === 0) return;
  const latestImage = images[images.length - 1];
  const ogImageUrl = `https://hou-gallery.pages.dev/${latestImage.file}`;

  let ogImageTag = document.querySelector('meta[property="og:image"]');
  if (ogImageTag) {
    ogImageTag.setAttribute("content", ogImageUrl);
  } else {
    ogImageTag = document.createElement("meta");
    ogImageTag.setAttribute("property", "og:image");
    ogImageTag.setAttribute("content", ogImageUrl);
    document.head.appendChild(ogImageTag);
  }
}

/* ===== Init gallery ===== */
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

  images.forEach((item, index) => {
    const container = document.createElement("div");
    container.className = "thumb-container";

    const img = document.createElement("img");
    img.className = "thumb";
    img.loading = "lazy";
    img.src = item.file;
    img.alt = `illustration ${item.id}`;
    img.onclick = () => openModal(index);

    const thumbBar = document.createElement("div");
    thumbBar.className = "thumb-reaction-bar";

    const thumbReactions = document.createElement("div");
    thumbReactions.className = "thumb-reactions-container";

    const thumbMore = document.createElement("button");
    thumbMore.className = "thumb-more-btn";
    thumbMore.type = "button";
    thumbMore.innerHTML = "⋯";
    thumbMore.onclick = (e) => {
      e.preventDefault();
      e.stopPropagation();
      currentIndex = index;
      initEmojiPicker();
      togglePicker(e.currentTarget); // ←ここが「右側に飛ぶ」を解決
    };

    thumbBar.appendChild(thumbReactions);
    thumbBar.appendChild(thumbMore);

    renderReactionBar(item.id, thumbReactions, "thumb");

    container.appendChild(img);
    container.appendChild(thumbBar);
    carousel.appendChild(container);
  });

  setDynamicOgImage();

  document.addEventListener("keydown", (e) => {
    if (isModalOpen()) {
      if (e.key === "ArrowLeft") prevImage();
      if (e.key === "ArrowRight") nextImage();
      if (e.key === "Escape") closeModal();
    } else {
      if (e.key === "Escape") closePicker();
    }
  });
}

/* ===== Reactions (localStorage) ===== */
function getReactions(postId) {
  const key = `reactions_${postId}`;
  const stored = localStorage.getItem(key);
  return stored ? JSON.parse(stored) : {};
}

function saveReactions(postId, reactions) {
  const key = `reactions_${postId}`;
  localStorage.setItem(key, JSON.stringify(reactions));
}

function renderReactionBar(postId, container, type = "modal") {
  container.innerHTML = '';
  const reactions = getReactions(postId);

  Object.keys(reactions)
    .sort((a, b) => reactions[b] - reactions[a])
    .forEach(emoji => {
      const item = document.createElement("div");
      item.className = type === "thumb" ? "thumb-reaction-item" : "reaction-item";
      item.innerHTML = `${emoji}<span>${reactions[emoji]}</span>`;
      item.onclick = (e) => {
        e.stopPropagation();
        addReaction(postId, emoji);
      };
      container.appendChild(item);
    });

  if (container.parentElement) container.parentElement.style.display = "flex";
}

function addReaction(postId, emoji) {
  const reactions = getReactions(postId);
  reactions[emoji] = (reactions[emoji] || 0) + 1;
  saveReactions(postId, reactions);

  // モーダル側
  if (isModalOpen() && images[currentIndex] && images[currentIndex].id == postId) {
    renderReactionBar(postId, reactionsContainer, "modal");
  }

  // 一覧側（該当だけ更新）
  const thumbContainers = document.querySelectorAll('.thumb-reactions-container');
  images.forEach((item, idx) => {
    if (item.id == postId && thumbContainers[idx]) {
      renderReactionBar(postId, thumbContainers[idx], "thumb");
    }
  });
}

/* ===== Emoji picker ===== */
async function initEmojiPicker() {
  if (pickerReady) return;
  pickerReady = true;

  try {
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
        closePicker();
      },
    });

    emojiPickerContainer.innerHTML = "";
    emojiPickerContainer.appendChild(picker);
  } catch (e) {
    pickerReady = false;
    showError("絵文字ピッカーの読み込みに失敗しました（ネットワーク / CDN）");
  }
}

/* ===== Buttons ===== */
moreEmojiBtn.onclick = (e) => {
  e.preventDefault();
  e.stopPropagation();
  initEmojiPicker();
  togglePicker(e.currentTarget);
};

closeBtn.onclick = closeModal;
modal.onclick = function (event) {
  if (event.target === modal) closeModal();
};

/* ===== iPhone対策：外タップで閉じる（closestで安定） ===== */
document.addEventListener("pointerdown", (e) => {
  if (emojiPickerContainer.style.display !== "block") return;

  const isMoreButton = e.target.closest(".thumb-more-btn, #more-emoji-btn, .more-emoji-btn");
  const isInsidePicker = emojiPickerContainer.contains(e.target);

  if (!isInsidePicker && !isMoreButton) closePicker();
}, { capture: true });

/* ピッカー内の操作は外判定にしない */
emojiPickerContainer.addEventListener("pointerdown", (e) => {
  e.stopPropagation();
}, { capture: true });

init();

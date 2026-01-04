let images = [];
let currentIndex = 0;
const carousel = document.getElementById("carousel");
const msg = document.getElementById("msg");
const modal = document.getElementById("modal");
const modalImg = document.getElementById("modal-img");
const closeBtn = document.getElementById("close");
const shareBtn = document.getElementById("share-btn");
const reactionBar = document.getElementById("reaction-bar");
const reactionsContainer = document.getElementById("reactions-container");
const moreEmojiBtn = document.getElementById("more-emoji-btn");
const emojiPickerContainer = document.getElementById("emoji-picker-container");
let prevBtn, nextBtn;
let picker = null;

function showError(text) {
  msg.innerHTML = `<div class="error">${text}</div>`;
}

function openModal(index) {
  currentIndex = index;
  modal.style.display = "block";
  setTimeout(() => modal.classList.add("show"), 10);
  modalImg.src = images[currentIndex].file;

  shareBtn.onclick = function () {
    const shareUrl = `https://hou-gallery.pages.dev/image/${images[currentIndex].id}`;
    const twitterUrl = `https://twitter.com/intent/tweet?url=${encodeURIComponent(shareUrl)}`;
    window.open(twitterUrl, "_blank");
  };

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

  renderReactionBar(images[currentIndex].id);
  initEmojiPicker();
}

function closeModal() {
  modal.classList.remove("show");
  setTimeout(() => (modal.style.display = "none"), 300);
  emojiPickerContainer.style.display = 'none';
}

function prevImage() {
  currentIndex = (currentIndex - 1 + images.length) % images.length;
  modalImg.src = images[currentIndex].file;
  updateShareBtn();
  renderReactionBar(images[currentIndex].id);
}

function nextImage() {
  currentIndex = (currentIndex + 1) % images.length;
  modalImg.src = images[currentIndex].file;
  updateShareBtn();
  renderReactionBar(images[currentIndex].id);
}

function updateShareBtn() {
  shareBtn.onclick = function () {
    const shareUrl = `https://hou-gallery.pages.dev/image/${images[currentIndex].id}`;
    const twitterUrl = `https://twitter.com/intent/tweet?url=${encodeURIComponent(shareUrl)}`;
    window.open(twitterUrl, "_blank");
  };
}

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
  let widthTag = document.querySelector('meta[property="og:image:width"]');
  if (!widthTag) {
    widthTag = document.createElement("meta");
    widthTag.setAttribute("property", "og:image:width");
    widthTag.setAttribute("content", "1200");
    document.head.appendChild(widthTag);
  }
  let heightTag = document.querySelector('meta[property="og:image:height"]');
  if (!heightTag) {
    heightTag = document.createElement("meta");
    heightTag.setAttribute("property", "og:image:height");
    heightTag.setAttribute("content", "630");
    document.head.appendChild(heightTag);
  }
}

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
    const img = document.createElement("img");
    img.className = "thumb";
    img.loading = "lazy";
    img.src = item.file;
    img.alt = `illustration ${item.id}`;
    img.onclick = () => openModal(index);
    carousel.appendChild(img);
  });
  setDynamicOgImage();

  document.addEventListener("keydown", (e) => {
    if (modal.style.display === "block") {
      if (e.key === "ArrowLeft") prevImage();
      if (e.key === "ArrowRight") nextImage();
      if (e.key === "Escape") closeModal();
    }
  });
}

// === リアクション機能 ===
function getReactions(postId) {
  const key = `reactions_${postId}`;
  const stored = localStorage.getItem(key);
  return stored ? JSON.parse(stored) : {};
}

function saveReactions(postId, reactions) {
  const key = `reactions_${postId}`;
  localStorage.setItem(key, JSON.stringify(reactions));
}

function renderReactionBar(postId) {
  reactionsContainer.innerHTML = '';
  const reactions = getReactions(postId);

  // 絵文字をUnicode順に並べて表示
  Object.keys(reactions)
    .sort()
    .forEach(emoji => {
      const item = document.createElement("div");
      item.className = "reaction-item";
      item.innerHTML = `${emoji}<span>${reactions[emoji]}</span>`;
      item.onclick = () => addReaction(postId, emoji);
      reactionsContainer.appendChild(item);
    });

  // 常にバーを表示
  reactionBar.style.display = "flex";
}

function addReaction(postId, emoji) {
  const reactions = getReactions(postId);
  reactions[emoji] = (reactions[emoji] || 0) + 1;
  saveReactions(postId, reactions);
  renderReactionBar(postId);
}

async function initEmojiPicker() {
  if (picker) {
    moreEmojiBtn.onclick = () => {
      emojiPickerContainer.style.display = emojiPickerContainer.style.display === 'none' ? 'block' : 'none';
    };
    return;
  }

  const data = await (await fetch("https://cdn.jsdelivr.net/npm/@emoji-mart/data")).json();

  picker = new EmojiMart.Picker({
    data,
    theme: "light",
    previewPosition: "none",
    skinTonePosition: "none",
    onEmojiSelect: (emoji) => {
      addReaction(images[currentIndex].id, emoji.native);
      emojiPickerContainer.style.display = "none";
    },
  });

  emojiPickerContainer.appendChild(picker);

  moreEmojiBtn.onclick = () => {
    emojiPickerContainer.style.display = emojiPickerContainer.style.display === 'none' ? 'block' : 'none';
  };
}

// イベント
closeBtn.onclick = closeModal;
modal.onclick = function (event) {
  if (event.target === modal) closeModal();
};

init();
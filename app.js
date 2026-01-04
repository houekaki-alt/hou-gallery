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

  renderReactionBar(images[currentIndex].id, reactionsContainer, "modal");
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
    thumbMore.innerHTML = "⋯";
    thumbMore.onclick = (e) => {
      e.stopPropagation();
      currentIndex = index;
      initEmojiPickerForThumb(item.id);
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
    if (modal.style.display === "block") {
      if (e.key === "ArrowLeft") prevImage();
      if (e.key === "ArrowRight") nextImage();
      if (e.key === "Escape") closeModal();
    }
  });
}

// リアクション機能
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
    .sort((a, b) => reactions[b] - reactions[a])  // カウント多い順に並べる
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

  container.parentElement.style.display = "flex";
}

function addReaction(postId, emoji) {
  const reactions = getReactions(postId);
  reactions[emoji] = (reactions[emoji] || 0) + 1;
  saveReactions(postId, reactions);

  renderReactionBar(postId, reactionsContainer, "modal");

  const thumbContainers = document.querySelectorAll('.thumb-reactions-container');
  images.forEach((item, idx) => {
    if (item.id == postId && thumbContainers[idx]) {
      renderReactionBar(postId, thumbContainers[idx], "thumb");
    }
  });
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
    set: "apple",  // iPhone風可愛い絵文字！
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

function initEmojiPickerForThumb(postId) {
  currentIndex = images.findIndex(img => img.id == postId);
  initEmojiPicker();
  emojiPickerContainer.style.display = 'block';
}

closeBtn.onclick = closeModal;
modal.onclick = function (event) {
  if (event.target === modal) closeModal();
};

init();
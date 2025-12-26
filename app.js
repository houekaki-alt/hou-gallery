let images = [];
let currentIndex = 0;  // 現在表示中の画像のインデックス

const carousel = document.getElementById("carousel");
const msg = document.getElementById("msg");
const modal = document.getElementById("modal");
const modalImg = document.getElementById("modal-img");
const closeBtn = document.getElementById("close");
const shareBtn = document.getElementById("share-btn");

// 左右矢印ボタン（動的に追加）
let prevBtn, nextBtn;

function showError(text) {
  msg.innerHTML = `<div class="error">${text}</div>`;
}

function openModal(index) {
  currentIndex = index;
  modal.style.display = "block";
  setTimeout(() => modal.classList.add("show"), 10);
  modalImg.src = images[currentIndex].file;

  // Shareボタン更新
  shareBtn.onclick = function () {
    const shareUrl = `https://hou-gallery.pages.dev/image/${images[currentIndex].id}`;
    const twitterUrl = `https://twitter.com/intent/tweet?url=${encodeURIComponent(shareUrl)}`;
    window.open(twitterUrl, "_blank");
  };

  // 矢印ボタン作成（初回のみ）
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
}

function closeModal() {
  modal.classList.remove("show");
  setTimeout(() => (modal.style.display = "none"), 300);
}

function prevImage() {
  currentIndex = (currentIndex - 1 + images.length) % images.length;
  modalImg.src = images[currentIndex].file;
  updateShareBtn();
}

function nextImage() {
  currentIndex = (currentIndex + 1) % images.length;
  modalImg.src = images[currentIndex].file;
  updateShareBtn();
}

function updateShareBtn() {
  shareBtn.onclick = function () {
    const shareUrl = `https://hou-gallery.pages.dev/image/${images[currentIndex].id}`;
    const twitterUrl = `https://twitter.com/intent/tweet?url=${encodeURIComponent(shareUrl)}`;
    window.open(twitterUrl, "_blank");
  };
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

    img.onclick = () => openModal(index);  // インデックスを渡す

    carousel.appendChild(img);
  });

  // キーボード左右キーでも操作
  document.addEventListener("keydown", (e) => {
    if (modal.style.display === "block") {
      if (e.key === "ArrowLeft") prevImage();
      if (e.key === "ArrowRight") nextImage();
      if (e.key === "Escape") closeModal();
    }
  });
}

closeBtn.onclick = closeModal;

modal.onclick = function (event) {
  if (event.target === modal) {
    closeModal();
  }
};

init();

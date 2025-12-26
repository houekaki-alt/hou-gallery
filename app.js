let images = [];
const carousel = document.getElementById("carousel");
const msg = document.getElementById("msg");
const modal = document.getElementById("modal");
const modalImg = document.getElementById("modal-img");
const closeBtn = document.getElementById("close");
const shareBtn = document.getElementById("share-btn");

function showError(text) {
  msg.innerHTML = `<div class="error">${text}</div>`;
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
  images.forEach((item) => {
    const img = document.createElement("img");
    img.className = "thumb";
    img.loading = "lazy";
    img.src = item.file;
    img.alt = `illustration ${item.id}`;

    img.onclick = function () {
      modal.style.display = "block";
      setTimeout(() => modal.classList.add("show"), 10);

      modalImg.src = item.file;

      shareBtn.onclick = function () {
        const shareUrl = `https://hou-gallery.pages.dev/image/${item.id}`;
        const twitterUrl = `https://twitter.com/intent/tweet?url=${encodeURIComponent(shareUrl)}`;
        window.open(twitterUrl, "_blank");
      };
    };

    carousel.appendChild(img);
  });
}

// モーダル閉じる
closeBtn.onclick = function () {
  modal.classList.remove("show");
  setTimeout(() => (modal.style.display = "none"), 300);
};

modal.onclick = function (event) {
  if (event.target === modal) {
    closeBtn.onclick();
  }
};

init();

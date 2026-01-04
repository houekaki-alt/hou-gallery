const FIXED_REACTIONS = ["👍", "❤️", "🙏"];

let images = [];
let currentIndex = 0;

document.addEventListener("DOMContentLoaded", () => {
  const carousel = document.getElementById("carousel");
  const msg = document.getElementById("msg");

  const modal = document.getElementById("modal");
  const modalImg = document.getElementById("modal-img");
  const closeBtn = document.getElementById("close");
  const prevBtn = document.getElementById("prev");
  const nextBtn = document.getElementById("next");

  const reactionsContainer = document.getElementById("reactions-container");
  const shareBtn = document.getElementById("share-btn");

  function showError(text) {
    if (msg) msg.innerHTML = `<div class="error">${text}</div>`;
  }

  /* ===== localStorage ===== */
  const storageKey = (id) => `reactions_${id}`;

  function loadReactions(id) {
    try {
      return JSON.parse(localStorage.getItem(storageKey(id))) || {};
    } catch {
      return {};
    }
  }

  function saveReactions(id, data) {
    localStorage.setItem(storageKey(id), JSON.stringify(data));
  }

  /* ===== 描画（固定3種） ===== */
  function renderReactions(postId, container, type) {
    if (!container) return;

    const data = loadReactions(postId);
    container.innerHTML = "";

    FIXED_REACTIONS.forEach((emoji) => {
      const count = data[emoji] || 0;

      const item = document.createElement("div");
      item.className = (type === "modal") ? "reaction-item" : "thumb-reaction-item";
      item.innerHTML = `${emoji}<span>${count}</span>`;

      item.addEventListener("click", (e) => {
        e.stopPropagation();

        data[emoji] = (data[emoji] || 0) + 1;
        saveReactions(postId, data);

        // モーダル更新
        if (reactionsContainer && modal && modal.style.display === "block") {
          renderReactions(postId, reactionsContainer, "modal");
        }

        // 一覧側の該当カード更新
        const thumbAreas = document.querySelectorAll(".thumb-reactions-container");
        images.forEach((it, idx) => {
          if (it.id === postId && thumbAreas[idx]) {
            renderReactions(postId, thumbAreas[idx], "thumb");
          }
        });
      });

      container.appendChild(item);
    });
  }

  /* ===== モーダル ===== */
  function updateShareLink() {
    if (!shareBtn) return;

    shareBtn.onclick = () => {
      const id = images[currentIndex]?.id;
      if (!id) return;

      const shareUrl = `https://hou-gallery.pages.dev/image/${id}`;
      const twitterUrl = `https://twitter.com/intent/tweet?url=${encodeURIComponent(shareUrl)}`;
      window.open(twitterUrl, "_blank");
    };
  }

  function openModal(index) {
    if (!modal || !modalImg) return;

    currentIndex = index;

    modalImg.src = images[currentIndex].file;
    modal.style.display = "block";
    modal.setAttribute("aria-hidden", "false");
    setTimeout(() => modal.classList.add("show"), 10);

    renderReactions(images[currentIndex].id, reactionsContainer, "modal");
    updateShareLink();
  }

  function closeModal() {
    if (!modal) return;
    modal.classList.remove("show");
    modal.setAttribute("aria-hidden", "true");
    setTimeout(() => (modal.style.display = "none"), 250);
  }

  function prevImage() {
    if (!modalImg) return;
    currentIndex = (currentIndex - 1 + images.length) % images.length;
    modalImg.src = images[currentIndex].file;
    renderReactions(images[currentIndex].id, reactionsContainer, "modal");
    updateShareLink();
  }

  function nextImage() {
    if (!modalImg) return;
    currentIndex = (currentIndex + 1) % images.length;
    modalImg.src = images[currentIndex].file;
    renderReactions(images[currentIndex].id, reactionsContainer, "modal");
    updateShareLink();
  }

  /* ===== 初期化 ===== */
  async function init() {
    if (!carousel) {
      showError("carousel が見つかりません（index.html の id='carousel' を確認）");
      return;
    }

    let res;
    try {
      res = await fetch("./images.json", { cache: "no-store" });
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

    images.forEach((item, index) => {
      const card = document.createElement("div");
      card.className = "thumb-container";

      const img = document.createElement("img");
      img.className = "thumb";
      img.loading = "lazy";
      img.src = item.file;
      img.alt = `illustration ${item.id}`;
      img.addEventListener("click", () => openModal(index));

      const bar = document.createElement("div");
      bar.className = "thumb-reaction-bar";

      const area = document.createElement("div");
      area.className = "thumb-reactions-container";

      bar.appendChild(area);
      card.appendChild(img);
      card.appendChild(bar);
      carousel.appendChild(card);

      // 初期 0 表示
      renderReactions(item.id, area, "thumb");
    });
  }

  /* ===== イベント ===== */
  if (closeBtn) closeBtn.addEventListener("click", closeModal);
  if (prevBtn) prevBtn.addEventListener("click", (e) => { e.stopPropagation(); prevImage(); });
  if (nextBtn) nextBtn.addEventListener("click", (e) => { e.stopPropagation(); nextImage(); });

  if (modal) {
    modal.addEventListener("click", (e) => {
      if (e.target === modal) closeModal();
    });
  }

  document.addEventListener("keydown", (e) => {
    if (!modal || modal.style.display !== "block") return;
    if (e.key === "Escape") closeModal();
    if (e.key === "ArrowLeft") prevImage();
    if (e.key === "ArrowRight") nextImage();
  });

  init();
});

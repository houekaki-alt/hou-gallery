const FIXED_REACTIONS = ["👍", "❤️", "🙏"];

let images = [];
let currentIndex = 0;

document.addEventListener("DOMContentLoaded", () => {
  // DOMが揃ってから取る（←これ大事）
  const carousel = document.getElementById("carousel");
  const msg = document.getElementById("msg");

  // モーダル系（無くても落ちないようにする）
  const modal = document.getElementById("modal");
  const modalImg = document.getElementById("modal-img");
  const closeBtn = document.getElementById("close");
  const reactionBar = document.getElementById("reaction-bar");
  const reactionsContainer = document.getElementById("reactions-container");

  let prevBtn, nextBtn;
  let modalInner = null;

  function showError(text) {
    if (msg) msg.innerHTML = `<div class="error">${text}</div>`;
  }

  /* ===== localStorage ===== */
  function storageKey(id) { return `reactions_${id}`; }

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

        // モーダル側更新（存在する時だけ）
        if (reactionsContainer) renderReactions(postId, reactionsContainer, "modal");

        // 一覧側の該当カード更新
        const thumbContainers = document.querySelectorAll(".thumb-reactions-container");
        images.forEach((it, idx) => {
          if (it.id === postId && thumbContainers[idx]) {
            renderReactions(postId, thumbContainers[idx], "thumb");
          }
        });
      });

      container.appendChild(item);
    });
  }

  /* ===== モーダル ===== */
  function ensureModalInner() {
    if (!modal || !modalImg || !reactionBar) return;
    if (modalInner) return;

    modalInner = document.createElement("div");
    modalInner.className = "modal-inner";

    // 画像とリアクションを縦に並べる
    modalInner.appendChild(modalImg);
    modalInner.appendChild(reactionBar);
    modal.appendChild(modalInner);
  }

  function openModal(index) {
    if (!modal || !modalImg) return;

    currentIndex = index;
    ensureModalInner();

    modal.style.display = "block";
    setTimeout(() => modal.classList.add("show"), 10);

    modalImg.src = images[currentIndex].file;

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

    if (reactionsContainer) renderReactions(images[currentIndex].id, reactionsContainer, "modal");
  }

  function closeModal() {
    if (!modal) return;
    modal.classList.remove("show");
    setTimeout(() => (modal.style.display = "none"), 300);
  }

  function prevImage() {
    if (!modalImg) return;
    currentIndex = (currentIndex - 1 + images.length) % images.length;
    modalImg.src = images[currentIndex].file;
    if (reactionsContainer) renderReactions(images[currentIndex].id, reactionsContainer, "modal");
  }

  function nextImage() {
    if (!modalImg) return;
    currentIndex = (currentIndex + 1) % images.length;
    modalImg.src = images[currentIndex].file;
    if (reactionsContainer) renderReactions(images[currentIndex].id, reactionsContainer, "modal");
  }

  /* ===== 初期化 ===== */
  async function init() {
    if (!carousel) {
      showError("carousel が見つかりません（index.html の id を確認してね）");
      return;
    }

    let res;
    try {
      // ★ 絶対パス "/" じゃなくて相対 "./" にする（スマホで安定）
      res = await fetch("./images.json", { cache: "no-store" });
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

      // モーダルが存在する時だけクリックで開く
      if (modal && modalImg) img.onclick = () => openModal(index);

      const bar = document.createElement("div");
      bar.className = "thumb-reaction-bar";

      const reactions = document.createElement("div");
      reactions.className = "thumb-reactions-container";

      bar.appendChild(reactions);
      card.appendChild(img);
      card.appendChild(bar);
      carousel.appendChild(card);

      renderReactions(item.id, reactions, "thumb");
    });

    // キーボード操作（PC）
    document.addEventListener("keydown", (e) => {
      if (modal && modal.style.display === "block") {
        if (e.key === "ArrowLeft") prevImage();
        if (e.key === "ArrowRight") nextImage();
        if (e.key === "Escape") closeModal();
      }
    });
  }

  // モーダルのイベント（存在する時だけ）
  if (closeBtn) closeBtn.onclick = closeModal;
  if (modal) {
    modal.onclick = (event) => {
      if (event.target === modal) closeModal();
    };
  }

  init();
});

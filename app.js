const FIXED_REACTIONS = ["👍", "❤️", "🙏"];

// ★ ここを自分の Worker URL に（末尾スラッシュはどっちでもOK）
const API_BASE = "https://reactions-api.hou-ekaki.workers.dev";

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

  // =========================
  // API helpers（D1/Worker）
  // =========================
  async function apiGet(imgId) {
    const url = `${API_BASE}/?img=${encodeURIComponent(imgId)}`;
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) throw new Error(`GET failed: ${res.status}`);
    return await res.json();
  }

  async function apiPost(imgId, emoji) {
    const res = await fetch(`${API_BASE}/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ img: imgId, emoji }),
    });
    if (!res.ok) throw new Error(`POST failed: ${res.status}`);
    return await res.json();
  }

  // =========================
  // 描画（API形式に合わせる）
  // 期待：{ ok:true, img:"...", reactions:[{emoji:"❤️",count:3},...] }
  // =========================
  function normalizeToMap(apiJson) {
    const map = {};
    const list = apiJson?.reactions || [];
    for (const row of list) {
      if (row?.emoji) map[row.emoji] = Number(row.count || 0);
    }
    return map;
  }

  function renderFromApi(container, imgId, apiJson, type) {
    if (!container) return;

    const map = normalizeToMap(apiJson);
    container.innerHTML = "";

    FIXED_REACTIONS.forEach((emoji) => {
      const count = map[emoji] || 0;

      const item = document.createElement("div");
      item.className = (type === "modal") ? "reaction-item" : "thumb-reaction-item";
      item.innerHTML = `${emoji}<span>${count}</span>`;

      // ★ ここが「0に戻る」を潰すキモ
      // POSTしたあと、必ずGETし直して“最新の一覧”で描画する
      item.addEventListener("click", async (e) => {
        e.stopPropagation();

        try {
          await apiPost(imgId, emoji);
          const fresh = await apiGet(imgId);

          // モーダル更新
          if (reactionsContainer && modal && modal.style.display === "block") {
            renderFromApi(reactionsContainer, imgId, fresh, "modal");
          }

          // 一覧側の該当カード更新（全カード更新じゃなく該当だけ）
          const thumbAreas = document.querySelectorAll(".thumb-reactions-container");
          images.forEach((it, idx) => {
            if (it.id === imgId && thumbAreas[idx]) {
              renderFromApi(thumbAreas[idx], imgId, fresh, "thumb");
            }
          });

        } catch (err) {
          console.error(err);
        }
      });

      container.appendChild(item);
    });
  }

  // =========================
  // Share
  // =========================
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

  // =========================
  // Modal
  // =========================
  async function openModal(index) {
    if (!modal || !modalImg) return;

    currentIndex = index;

    modalImg.src = images[currentIndex].file;
    modal.style.display = "block";
    modal.setAttribute("aria-hidden", "false");
    setTimeout(() => modal.classList.add("show"), 10);

    try {
      const apiJson = await apiGet(images[currentIndex].id);
      renderFromApi(reactionsContainer, images[currentIndex].id, apiJson, "modal");
    } catch (err) {
      console.error(err);
      // API落ちてもUIは出す（0表示）
      renderFromApi(reactionsContainer, images[currentIndex].id, { reactions: [] }, "modal");
    }

    updateShareLink();
  }

  function closeModal() {
    if (!modal) return;
    modal.classList.remove("show");
    modal.setAttribute("aria-hidden", "true");
    setTimeout(() => (modal.style.display = "none"), 250);
  }

  async function prevImage() {
    if (!modalImg) return;
    currentIndex = (currentIndex - 1 + images.length) % images.length;
    modalImg.src = images[currentIndex].file;

    try {
      const apiJson = await apiGet(images[currentIndex].id);
      renderFromApi(reactionsContainer, images[currentIndex].id, apiJson, "modal");
    } catch (err) {
      console.error(err);
      renderFromApi(reactionsContainer, images[currentIndex].id, { reactions: [] }, "modal");
    }

    updateShareLink();
  }

  async function nextImage() {
    if (!modalImg) return;
    currentIndex = (currentIndex + 1) % images.length;
    modalImg.src = images[currentIndex].file;

    try {
      const apiJson = await apiGet(images[currentIndex].id);
      renderFromApi(reactionsContainer, images[currentIndex].id, apiJson, "modal");
    } catch (err) {
      console.error(err);
      renderFromApi(reactionsContainer, images[currentIndex].id, { reactions: [] }, "modal");
    }

    updateShareLink();
  }

  // =========================
  // Init
  // =========================
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

      // 初期表示：APIから取得（失敗したら0）
      (async () => {
        try {
          const apiJson = await apiGet(item.id);
          renderFromApi(area, item.id, apiJson, "thumb");
        } catch (err) {
          console.error(err);
          renderFromApi(area, item.id, { reactions: [] }, "thumb");
        }
      })();
    });
  }

  // =========================
  // Events
  // =========================
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

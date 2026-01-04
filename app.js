const FIXED_REACTIONS = ["👍", "❤️", "🙏"];

// ★ここはあなたの想定通り「リンク」＝APIのベースURLでOK
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

  // ===== API =====
  async function apiGet(imgId) {
    const res = await fetch(`${API_BASE}/?img=${encodeURIComponent(imgId)}`, {
      method: "GET",
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`GET failed ${res.status}`);
    return await res.json();
  }

  async function apiPost(imgId, emoji) {
    const res = await fetch(`${API_BASE}/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ img: imgId, emoji }),
    });
    if (!res.ok) throw new Error(`POST failed ${res.status}`);
    return await res.json();
  }

  function blankCounts() {
    const obj = {};
    FIXED_REACTIONS.forEach((e) => (obj[e] = 0));
    return obj;
  }

  function normalizeFromApi(data) {
    // reactions: [{emoji,count}] -> {emoji:count}
    const map = blankCounts();

    const list = data?.reactions;
    if (Array.isArray(list)) {
      for (const r of list) {
        const emoji = r?.emoji === "❤" ? "❤️" : r?.emoji;
        if (!emoji || !FIXED_REACTIONS.includes(emoji)) continue;
        map[emoji] = Number(r.count) || 0;
      }
    }
    return map;
  }

  function renderReactions(postId, container, type, countsMap) {
    if (!container) return;

    const data = countsMap || blankCounts();
    container.innerHTML = "";

    FIXED_REACTIONS.forEach((emoji) => {
      const count = data[emoji] || 0;

      const item = document.createElement("div");
      item.className = type === "modal" ? "reaction-item" : "thumb-reaction-item";
      item.innerHTML = `${emoji}<span>${count}</span>`;

      item.addEventListener("click", async (e) => {
        e.stopPropagation();

        // 楽観更新（即反映）
        data[emoji] = (data[emoji] || 0) + 1;
        syncAllUI(postId, data);

        try {
          const ret = await apiPost(postId, emoji);
          // サーバー確定値で上書き（ズレ防止）
          const fixed = Number(ret?.count);
          if (Number.isFinite(fixed)) {
            data[emoji] = fixed;
            syncAllUI(postId, data);
          } else {
            // 返り値が想定外でも表示は維持
            syncAllUI(postId, data);
          }
        } catch (err) {
          // 失敗したら戻す（好みで“戻さない”運用にもできる）
          data[emoji] = Math.max(0, (data[emoji] || 1) - 1);
          syncAllUI(postId, data);
          console.warn(err);
        }
      });

      container.appendChild(item);
    });
  }

  function syncAllUI(postId, countsMap) {
    // 一覧の該当カード更新
    const thumbAreas = document.querySelectorAll(".thumb-reactions-container");
    images.forEach((it, idx) => {
      if (it.id === postId && thumbAreas[idx]) {
        renderReactions(postId, thumbAreas[idx], "thumb", countsMap);
      }
    });

    // モーダルが開いていて同じIDなら更新
    if (modal && modal.style.display === "block") {
      const currentId = images[currentIndex]?.id;
      if (currentId === postId && reactionsContainer) {
        renderReactions(postId, reactionsContainer, "modal", countsMap);
      }
    }
  }

  // ===== Share =====
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

  // ===== Modal =====
  async function openModal(index) {
    if (!modal || !modalImg) return;

    currentIndex = index;
    modalImg.src = images[currentIndex].file;

    modal.style.display = "block";
    modal.setAttribute("aria-hidden", "false");
    setTimeout(() => modal.classList.add("show"), 10);

    updateShareLink();

    // サーバー最新を取得して表示
    try {
      const data = await apiGet(images[currentIndex].id);
      const map = normalizeFromApi(data);
      renderReactions(images[currentIndex].id, reactionsContainer, "modal", map);
      syncAllUI(images[currentIndex].id, map);
    } catch (e) {
      renderReactions(images[currentIndex].id, reactionsContainer, "modal", blankCounts());
      console.warn(e);
    }
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
    updateShareLink();

    try {
      const data = await apiGet(images[currentIndex].id);
      const map = normalizeFromApi(data);
      renderReactions(images[currentIndex].id, reactionsContainer, "modal", map);
      syncAllUI(images[currentIndex].id, map);
    } catch (e) {
      renderReactions(images[currentIndex].id, reactionsContainer, "modal", blankCounts());
      console.warn(e);
    }
  }

  async function nextImage() {
    if (!modalImg) return;
    currentIndex = (currentIndex + 1) % images.length;
    modalImg.src = images[currentIndex].file;
    updateShareLink();

    try {
      const data = await apiGet(images[currentIndex].id);
      const map = normalizeFromApi(data);
      renderReactions(images[currentIndex].id, reactionsContainer, "modal", map);
      syncAllUI(images[currentIndex].id, map);
    } catch (e) {
      renderReactions(images[currentIndex].id, reactionsContainer, "modal", blankCounts());
      console.warn(e);
    }
  }

  // ===== 初期化 =====
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

    // まず0で表示（体感速度）
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

      renderReactions(item.id, area, "thumb", blankCounts());
    });

    // あとからサーバー値を流し込む（同時リクエストは控えめに）
    const concurrency = 6;
    let i = 0;

    async function worker() {
      while (i < images.length) {
        const idx = i++;
        const it = images[idx];

        try {
          const data = await apiGet(it.id);
          const map = normalizeFromApi(data);
          syncAllUI(it.id, map);
        } catch (e) {
          console.warn(e);
        }
      }
    }

    await Promise.all(Array.from({ length: concurrency }, worker));
  }

  // ===== Events =====
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

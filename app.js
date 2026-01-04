const FIXED_REACTIONS = ["👍", "❤️", "🙏"];
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

  function showTiny(text) {
    // 既存msgを壊さず、下に小さく出す
    if (!msg) return;
    const div = document.createElement("div");
    div.className = "error";
    div.style.marginTop = "10px";
    div.style.opacity = "0.9";
    div.textContent = text;
    msg.appendChild(div);
    setTimeout(() => div.remove(), 5000);
  }

  // ===== API =====
  async function apiGet(imgId) {
    const url = `${API_BASE}/?img=${encodeURIComponent(imgId)}`;
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) throw new Error(`GET ${res.status}`);
    return await res.json();
  }

  async function apiPost(imgId, emoji) {
    const res = await fetch(`${API_BASE}/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ img: imgId, emoji }),
    });
    if (!res.ok) throw new Error(`POST ${res.status}`);
    return await res.json();
  }

  // ===== normalize =====
  function normalizeToMap(apiJson) {
    const map = {};
    const list = apiJson?.reactions || [];
    for (const row of list) {
      if (row?.emoji) map[row.emoji] = Number(row.count || 0);
    }
    return map;
  }

  // containerごとに「最後に成功したmap」を保持（失敗しても0にしないため）
  const lastGood = new WeakMap();

  function renderFromMap(container, map, type) {
    container.innerHTML = "";

    FIXED_REACTIONS.forEach((emoji) => {
      const count = map[emoji] ?? 0;

      const item = document.createElement("div");
      item.className = (type === "modal") ? "reaction-item" : "thumb-reaction-item";
      item.innerHTML = `${emoji}<span>${count}</span>`;
      container.appendChild(item);
    });
  }

  // クリック可能にした描画（一覧/モーダル共通）
  function renderInteractive(container, imgId, map, type) {
    if (!container) return;

    container.innerHTML = "";

    FIXED_REACTIONS.forEach((emoji) => {
      const count = map[emoji] ?? 0;

      const item = document.createElement("div");
      item.className = (type === "modal") ? "reaction-item" : "thumb-reaction-item";
      item.innerHTML = `${emoji}<span>${count}</span>`;

      item.addEventListener("click", async (e) => {
        e.stopPropagation();

        // ① まず見た目だけ即+1（気持ちいい）
        const optimistic = { ...map, [emoji]: (map[emoji] ?? 0) + 1 };
        lastGood.set(container, optimistic);
        renderInteractive(container, imgId, optimistic, type);

        // ② 通信：POST→GET
        try {
          await apiPost(imgId, emoji);
          const fresh = await apiGet(imgId);
          const freshMap = normalizeToMap(fresh);

          // 成功したら確定表示
          lastGood.set(container, freshMap);
          renderInteractive(container, imgId, freshMap, type);

          // モーダルと一覧の両方を同じ値に合わせる
          if (reactionsContainer && modal && modal.style.display === "block" && reactionsContainer !== container) {
            lastGood.set(reactionsContainer, freshMap);
            renderInteractive(reactionsContainer, imgId, freshMap, "modal");
          }

          const thumbAreas = document.querySelectorAll(".thumb-reactions-container");
          images.forEach((it, idx) => {
            if (it.id === imgId && thumbAreas[idx] && thumbAreas[idx] !== container) {
              lastGood.set(thumbAreas[idx], freshMap);
              renderInteractive(thumbAreas[idx], imgId, freshMap, "thumb");
            }
          });

        } catch (err) {
          // ★ ここが肝：失敗しても0で上書きしない
          console.error(err);
          showTiny(`リアクション保存に失敗（${String(err.message || err)}）`);

          // optimisticのまま残す（戻さない）
          // ※厳密に戻したいならここでmapに戻すけど、今回は簡単優先
        }
      });

      container.appendChild(item);
    });
  }

  async function loadAndRender(container, imgId, type) {
    // 失敗したら0表示はOK（初回だけ）
    const zeroMap = { "👍": 0, "❤️": 0, "🙏": 0 };

    try {
      const apiJson = await apiGet(imgId);
      const map = normalizeToMap(apiJson);
      lastGood.set(container, map);
      renderInteractive(container, imgId, map, type);
    } catch (err) {
      console.error(err);
      lastGood.set(container, zeroMap);
      renderInteractive(container, imgId, zeroMap, type);
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

    await loadAndRender(reactionsContainer, images[currentIndex].id, "modal");
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
    await loadAndRender(reactionsContainer, images[currentIndex].id, "modal");
    updateShareLink();
  }

  async function nextImage() {
    if (!modalImg) return;
    currentIndex = (currentIndex + 1) % images.length;
    modalImg.src = images[currentIndex].file;
    await loadAndRender(reactionsContainer, images[currentIndex].id, "modal");
    updateShareLink();
  }

  // ===== Init =====
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

      loadAndRender(area, item.id, "thumb");
    });
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

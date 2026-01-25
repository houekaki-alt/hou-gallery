// =========================
// microCMS proxy（タグ）
// =========================
const CMS_BASE = "https://microcms-proxy.hou-ekaki.workers.dev";

// ===== tags =====
async function loadTagsFromCMS() {
  const url = `${CMS_BASE}/cms/tags?_=${Date.now()}`;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error("Tags fetch failed: " + res.status);
  const data = await res.json();
  return (data.contents || [])
    .map((t) => ({
      name: (t.name || "").trim(),
      order: Number(t.order ?? 9999),
    }))
    .filter((t) => t.name);
}

// ===== artworks =====
async function loadArtworksFromCMS() {
  const base = "https://reactions-api.hou-ekaki.workers.dev/cms/artworks";
  const limit = 100;
  let offset = 0;
  let all = [];
  let total = Infinity;

  while (all.length < total) {
    const url = `${base}?limit=${limit}&offset=${offset}&_=${Date.now()}`;
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) throw new Error("CMS fetch failed: " + res.status);
    const data = await res.json();

    const contents = data.contents || [];
    total = Number(data.totalCount ?? contents.length);
    all = all.concat(contents);

    if (!contents.length) break;
    offset += limit;
  }

  return all.map((c) => {
    const legacyImgKey = String(c.artwork_id || "").match(/\d+$/)?.[0] || "";
    return {
      id: c.artwork_id,
      legacyImgKey,
      title: c.title || "",
      tags: (c.tags || "")
        .split(/\r?\n/)
        .map((s) => s.trim())
        .filter(Boolean),
      file: c.image?.url || "",
      createdAt: c.createdAt || "",
      publishedAt: c.publishedAt || "",
      updatedAt: c.updatedAt || "",
    };
  });
}

// =========================
// reactions
// =========================
const FIXED_REACTIONS = ["👍", "❤️", "🙏"];
const API_URL = "https://reactions-api.hou-ekaki.workers.dev";

async function apiGet(imgKey) {
  const r = await fetch(`${API_URL}/?img=${encodeURIComponent(imgKey)}`);
  if (!r.ok) throw new Error(`GET failed: ${r.status}`);
  const j = await r.json();
  return j.reactions || FIXED_REACTIONS.map((e) => ({ emoji: e, count: 0 }));
}

async function apiPost(imgKey, emoji) {
  const r = await fetch(`${API_URL}/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ img: imgKey, emoji }),
  });
  if (!r.ok) throw new Error(`POST failed: ${r.status}`);
  return r.json().catch(() => ({}));
}

// =========================
// state & elements
// =========================
let images = [];
let modalItems = [];
let modalIndex = 0;

const tagbar = document.getElementById("tagbar");
const tagPrev = document.getElementById("tagPrev");
const tagNext = document.getElementById("tagNext");

const recentGrid = document.getElementById("recent");
const randomGrid = document.getElementById("random");
const msg = document.getElementById("msg");

const modal = document.getElementById("modal");
const modalImg = document.getElementById("modal-img");
const reactionsContainer = document.getElementById("reactions-container");
const shareBtn = document.getElementById("share-btn");
const closeBtn = document.getElementById("close");
const prevBtn = document.getElementById("prev");
const nextBtn = document.getElementById("next");

function keyFromItem(item) {
  return item.legacyImgKey ? String(item.legacyImgKey) : String(item.id);
}

// =========================
// utils
// =========================
function renderLoading(container, isModal = false) {
  if (!container) return;
  container.innerHTML = "";
  FIXED_REACTIONS.forEach((e) => {
    const d = document.createElement("div");
    d.className = isModal ? "reaction-item" : "thumb-reaction-item";
    d.innerHTML = `${e}<span>…</span>`;
    container.appendChild(d);
  });
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function sortByNewest(arr) {
  const pick = (x) => x.publishedAt || x.createdAt || x.updatedAt || "";
  return [...arr].sort((a, b) => (pick(b) > pick(a) ? 1 : pick(b) < pick(a) ? -1 : 0));
}

// =========================
// reactions UI
// =========================
function renderReactionsUI(reactionsArr, container, imgKey, isModal = false) {
  if (!container) return;
  const map = Object.fromEntries((reactionsArr || []).map((r) => [r.emoji, r.count]));
  container.innerHTML = "";

  FIXED_REACTIONS.forEach((emoji) => {
    const count = map[emoji] ?? 0;
    const btn = document.createElement("div");
    btn.className = isModal ? "reaction-item" : "thumb-reaction-item";
    btn.innerHTML = `${emoji}<span>${count}</span>`;
    btn.addEventListener("click", async (e) => {
      e.preventDefault();
      e.stopPropagation();
      const span = btn.querySelector("span");
      const before = parseInt(span.textContent, 10) || 0;
      span.textContent = String(before + 1); // 楽観更新
      try {
        await apiPost(imgKey, emoji);
        const latest = await apiGet(imgKey);
        renderReactionsUI(latest, container, imgKey, isModal);
        syncThumb(imgKey, latest);
        syncModal(imgKey, latest);
      } catch {
        span.textContent = String(before);
      }
    });
    container.appendChild(btn);
  });
}

function syncThumb(imgKey, latest) {
  document
    .querySelectorAll(`.thumb-reactions-container[data-key="${CSS.escape(imgKey)}"]`)
    .forEach((el) => renderReactionsUI(latest, el, imgKey, false));
}

function syncModal(imgKey, latest) {
  if (modal?.style.display !== "block") return;
  const item = modalItems[modalIndex];
  if (!item || keyFromItem(item) !== imgKey) return;
  renderReactionsUI(latest, reactionsContainer, imgKey, true);
}

// =========================
// modal
// =========================
function openModal(list, idx) {
  if (!list?.length) return;
  modalItems = list;
  modalIndex = idx;

  const item = modalItems[modalIndex];
  modalImg.src = item.file;

  modal.style.display = "block";
  requestAnimationFrame(() => modal.classList.add("show"));

  const key = keyFromItem(item);
  renderLoading(reactionsContainer, true);
  apiGet(key).then((d) => renderReactionsUI(d, reactionsContainer, key, true));

  shareBtn.onclick = () => {
    const sharePage = `${location.origin}/share/${encodeURIComponent(item.id)}`;
    const shareText = "苞さんのイラストを見ました！";
    const xIntent = `https://x.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(sharePage)}`;
    window.open(xIntent, "_blank", "noopener");
  };
}

function closeModal() {
  modal.classList.remove("show");
  setTimeout(() => (modal.style.display = "none"), 200);
}
function prev() {
  if (!modalItems.length) return;
  openModal(modalItems, (modalIndex - 1 + modalItems.length) % modalItems.length);
}
function next() {
  if (!modalItems.length) return;
  openModal(modalItems, (modalIndex + 1) % modalItems.length);
}

closeBtn?.addEventListener("click", closeModal);
prevBtn?.addEventListener("click", prev);
nextBtn?.addEventListener("click", next);
modal?.addEventListener("click", (e) => e.target === modal && closeModal());

// =========================
// thumbs
// =========================
function renderThumbList(list, containerEl) {
  if (!containerEl) return;
  containerEl.innerHTML = "";

  list.forEach((item, i) => {
    const card = document.createElement("div");
    card.className = "thumb-container";

    const img = document.createElement("img");
    img.className = "thumb";
    img.src = item.file;
    img.alt = "";
    img.addEventListener("click", () => openModal(list, i));

    const bar = document.createElement("div");
    bar.className = "thumb-reaction-bar";

    const rc = document.createElement("div");
    rc.className = "thumb-reactions-container";
    rc.dataset.key = keyFromItem(item);

    bar.appendChild(rc);
    card.appendChild(img);
    card.appendChild(bar);
    containerEl.appendChild(card);

    renderLoading(rc, false);
    apiGet(keyFromItem(item)).then((d) => renderReactionsUI(d, rc, keyFromItem(item), false));
  });
}

// =========================
// tags (count & order)
// =========================
function buildTagCountMap(items) {
  const map = new Map(); // name -> count
  items.forEach((it) => (it.tags || []).forEach((t) => {
    const name = String(t).trim();
    if (!name) return;
    map.set(name, (map.get(name) || 0) + 1);
  }));
  return map;
}

function renderTagBar(tags) {
  if (!tagbar) return;
  tagbar.innerHTML = "";
  tags.forEach((t) => {
    const a = document.createElement("a");
    a.className = "tagchip";
    a.href = `?tag=${encodeURIComponent(t.name)}`;
    a.textContent = `${t.name} (${t.count})`; // ← 件数表示
    tagbar.appendChild(a);
  });
}

function bindTagArrows() {
  if (!tagbar || !tagPrev || !tagNext) return;
  const step = () => Math.max(220, Math.floor(tagbar.clientWidth * 0.75));
  tagPrev.onclick = () => tagbar.scrollBy({ left: -step(), behavior: "smooth" });
  tagNext.onclick = () => tagbar.scrollBy({ left: step(), behavior: "smooth" });
}

function applyTagFilter(allItems) {
  const tag = new URLSearchParams(location.search).get("tag");
  if (!tag) return allItems;
  return allItems.filter((x) => (x.tags || []).includes(tag));
}

// =========================
// init
// =========================
async function init() {
  msg.textContent = "読み込み中…";

  images = await loadArtworksFromCMS();
  const countMap = buildTagCountMap(images);

  // CMSタグ × 件数 → 多い順（同数は五十音）
  try {
    let tags = await loadTagsFromCMS(); // [{name, order}]
    tags = tags
      .map((t) => ({ ...t, count: countMap.get(t.name) || 0 }))
      .filter((t) => t.count > 0) // 0件は非表示（外したければ消す）
      .sort((a, b) => (b.count - a.count) || a.name.localeCompare(b.name, "ja"));
    renderTagBar(tags);
  } catch {
    // フォールバック：作品から直接
    const tags = Array.from(countMap.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => (b.count - a.count) || a.name.localeCompare(b.name, "ja"));
    renderTagBar(tags);
  }
  bindTagArrows();

  const filtered = applyTagFilter(images);
  const newest = sortByNewest(filtered);

  renderThumbList(newest.slice(0, 3), recentGrid);           // 新着3
  renderThumbList(shuffle(filtered).slice(0, 24), randomGrid); // ランダム

  msg.textContent = filtered.length ? "" : "該当タグの作品がありません。";
}

init().catch(() => (msg.textContent = "読み込みに失敗しました。"));

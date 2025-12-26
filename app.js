let images = [];
let currentIndex = -1;

const grid = document.getElementById("grid");
const msg = document.getElementById("msg");

const modal = document.getElementById("modal");
const modalImg = document.getElementById("modalImg");
const btnClose = document.getElementById("close");
const btnPrev = document.getElementById("prev");
const btnNext = document.getElementById("next");
const shareLink = document.getElementById("share");

function showError(text){
  msg.innerHTML = `<div class="error">${text}</div>`;
}

function parseImgFromHash(){
  // #img=12
  const h = location.hash || "";
  const m = h.match(/img=(\d+)/);
  return m ? parseInt(m[1], 10) : null;
}

function setHash(id){
  // 履歴が邪魔なら replaceState にする
  history.replaceState(null, "", `/#img=${id}`);
}

function clearHash(){
  history.replaceState(null, "", "/");
}

function openModalByIndex(idx){
  if (!images.length) return;
  if (idx < 0) idx = images.length - 1;
  if (idx >= images.length) idx = 0;

  currentIndex = idx;
  const item = images[currentIndex];

  modal.classList.add("open");
  modal.setAttribute("aria-hidden", "false");

  modalImg.src = item.file;
  modalImg.alt = `image ${item.id}`;

  setHash(item.id);

  // 共有は /image/{id} を投げる（ここがPages FunctionsのOGP）
  const shareUrl = `${location.origin}/image/${item.id}`;
  const intent = `https://x.com/intent/tweet?url=${encodeURIComponent(shareUrl)}`;
  shareLink.href = intent;
}

function closeModal(){
  modal.classList.remove("open");
  modal.setAttribute("aria-hidden", "true");
  modalImg.src = "";
  currentIndex = -1;
  clearHash();
}

function go(delta){
  if (currentIndex === -1) return;
  openModalByIndex(currentIndex + delta);
}

function bindEvents(){
  btnClose.addEventListener("click", closeModal);
  btnPrev.addEventListener("click", () => go(-1));
  btnNext.addEventListener("click", () => go(1));

  // 背景クリックで閉じる
  modal.addEventListener("click", (e) => {
    if (e.target === modal) closeModal();
  });

  // キーボード
  window.addEventListener("keydown", (e) => {
    if (!modal.classList.contains("open")) return;
    if (e.key === "Escape") closeModal();
    if (e.key === "ArrowLeft") go(-1);
    if (e.key === "ArrowRight") go(1);
  });

  // ハッシュ直打ちで開く（/#img=1）
  window.addEventListener("hashchange", () => {
    const id = parseImgFromHash();
    if (!id) return;
    const idx = images.findIndex(x => x.id === id);
    if (idx !== -1) openModalByIndex(idx);
  });
}

async function init(){
  bindEvents();

  let res;
  try {
    res = await fetch("./images.json", { cache: "no-store" });
  } catch {
    showError("images.json を読み込めませんでした（ネットワーク）");
    return;
  }

  if (!res.ok){
    showError(`images.json の読み込みに失敗しました（${res.status}）`);
    return;
  }

  let data;
  try {
    data = await res.json();
  } catch {
    showError("images.json がJSONとして壊れています（カンマ/引用符の抜け等）");
    return;
  }

  if (!Array.isArray(data) || data.length === 0){
    showError("images.json の中身が空、または形式が違います（配列になってない）");
    return;
  }

  images = data;

  // grid 描画
  grid.innerHTML = "";
  images.forEach((item, idx) => {
    const img = document.createElement("img");
    img.className = "thumb";
    img.loading = "lazy";
    img.src = item.file;
    img.alt = `thumb ${item.id}`;
    img.addEventListener("click", () => openModalByIndex(idx));
    grid.appendChild(img);
  });

  // 直アクセス対応
  const id = parseImgFromHash();
  if (id){
    const idx = images.findIndex(x => x.id === id);
    if (idx !== -1) openModalByIndex(idx);
  }
}

init();

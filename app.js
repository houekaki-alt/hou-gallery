const FIXED = ["👍", "❤️", "🙏"];

let images = [];
let currentIndex = 0;

const carousel = document.getElementById("carousel");
const msg = document.getElementById("msg");

const modal = document.getElementById("modal");
const modalImg = document.getElementById("modal-img");
const closeBtn = document.getElementById("close");
const shareBtn = document.getElementById("share-btn");

const reactionsContainer = document.getElementById("reactions-container");

let prevBtn, nextBtn;
const thumbUI = new Map();

let apiDeadWarned = false;
function showError(text){ msg.innerHTML = `<div class="error">${text}</div>`; }
function warnApiDeadOnce(){
  if (apiDeadWarned) return;
  apiDeadWarned = true;
  showError("※ いま /api/reactions が使えないため、この端末内だけのカウント（localStorage）で動いています。");
}

/* ---------- storage fallback ---------- */
function lsKey(postId){ return `reactions_${postId}`; }
function lsGet(postId){
  try{
    const s = localStorage.getItem(lsKey(postId));
    return s ? JSON.parse(s) : {};
  }catch{ return {}; }
}
function lsPut(postId, obj){
  try{ localStorage.setItem(lsKey(postId), JSON.stringify(obj)); }catch{}
}

/* ---------- API (optional) ---------- */
async function apiGetReactions(postId){
  try{
    const res = await fetch(`/api/reactions?id=${encodeURIComponent(postId)}`, { cache:"no-store" });
    if(!res.ok) return null;
    return await res.json();
  }catch{ return null; }
}
async function apiAddReaction(postId, emoji){
  try{
    const res = await fetch(`/api/reactions`,{
      method:"POST",
      headers:{ "Content-Type":"application/json" },
      body: JSON.stringify({ id: postId, emoji })
    });
    if(!res.ok) return null;
    return await res.json();
  }catch{ return null; }
}

/* ---------- utils ---------- */
function fmtCount(n){
  if (n > 9999) return "9999+";
  return String(n);
}
function isWideText(t){
  return t.endsWith("+"); // "9999+"
}

/* ---------- reactions ---------- */
async function getReactions(postId){
  const api = await apiGetReactions(postId);
  if(api !== null) return api;
  warnApiDeadOnce();
  return lsGet(postId);
}

function makeReactBtn(postId, emoji){
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "react-btn";

  const e = document.createElement("span");
  e.className = "react-emoji";
  e.textContent = emoji;

  const c = document.createElement("span");
  c.className = "react-count";
  c.textContent = "0";

  btn.appendChild(e);
  btn.appendChild(c);

  btn.addEventListener("click", (ev)=>{
    ev.preventDefault();
    ev.stopPropagation();
    addReaction(postId, emoji);
  });

  return { btn, countEl: c };
}

async function renderFixedBar(postId, container, type="thumb"){
  container.innerHTML = "";
  const reactions = await getReactions(postId);

  FIXED.forEach((emoji)=>{
    const { btn, countEl } = makeReactBtn(postId, emoji);

    const raw = reactions[emoji] ?? 0;
    const text = fmtCount(raw);
    countEl.textContent = text;
    countEl.classList.toggle("is-wide", isWideText(text));

    container.appendChild(btn);
  });
}

async function addReaction(postId, emoji){
  // API優先（端末間同期）
  const updated = await apiAddReaction(postId, emoji);
  if(updated !== null){
    if(modal.style.display === "block"){
      renderFixedBar(images[currentIndex].id, reactionsContainer, "modal");
    }
    const ui = thumbUI.get(String(postId));
    if(ui?.reactionsEl) renderFixedBar(postId, ui.reactionsEl, "thumb");
    return;
  }

  // API死：localStorageで増やす
  warnApiDeadOnce();
  const reactions = lsGet(postId);
  reactions[emoji] = (reactions[emoji] || 0) + 1;
  lsPut(postId, reactions);

  if(modal.style.display === "block"){
    renderFixedBar(images[currentIndex].id, reactionsContainer, "modal");
  }
  const ui = thumbUI.get(String(postId));
  if(ui?.reactionsEl) renderFixedBar(postId, ui.reactionsEl, "thumb");
}

/* ---------- modal ---------- */
function updateShareBtn(){
  shareBtn.onclick = ()=>{
    const shareUrl = `${location.origin}/image/${images[currentIndex].id}`;
    const twitterUrl = `https://twitter.com/intent/tweet?url=${encodeURIComponent(shareUrl)}`;
    window.open(twitterUrl, "_blank");
  };
}

function openModal(index){
  currentIndex = index;
  modal.style.display = "block";
  setTimeout(()=> modal.classList.add("show"), 10);
  modalImg.src = images[currentIndex].file;
  updateShareBtn();

  if(!prevBtn){
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

  renderFixedBar(images[currentIndex].id, reactionsContainer, "modal");
}

function closeModal(){
  modal.classList.remove("show");
  setTimeout(()=> (modal.style.display = "none"), 300);
}

function prevImage(){
  currentIndex = (currentIndex - 1 + images.length) % images.length;
  modalImg.src = images[currentIndex].file;
  updateShareBtn();
  renderFixedBar(images[currentIndex].id, reactionsContainer, "modal");
}
function nextImage(){
  currentIndex = (currentIndex + 1) % images.length;
  modalImg.src = images[currentIndex].file;
  updateShareBtn();
  renderFixedBar(images[currentIndex].id, reactionsContainer, "modal");
}

/* ---------- init ---------- */
async function init(){
  let res;
  try{
    res = await fetch("/images.json", { cache:"no-store" });
  }catch{
    showError("images.json を読み込めませんでした（ネットワークエラー）");
    return;
  }
  if(!res.ok){
    showError(`images.json の読み込みに失敗しました（${res.status}）`);
    return;
  }

  let data;
  try{ data = await res.json(); }
  catch{
    showError("images.json が壊れています（JSON形式エラー）");
    return;
  }

  if(!Array.isArray(data) || data.length === 0){
    showError("images.json に画像データがありません");
    return;
  }

  images = data;
  carousel.innerHTML = "";
  thumbUI.clear();

  images.forEach((item, index)=>{
    const card = document.createElement("div");
    card.className = "thumb-container";

    const img = document.createElement("img");
    img.className = "thumb";
    img.loading = "lazy";
    img.src = item.file;
    img.alt = `illustration ${item.id}`;
    img.addEventListener("click", ()=> openModal(index));

    const bar = document.createElement("div");
    bar.className = "thumb-reaction-bar";

    const reactionsEl = document.createElement("div");
    reactionsEl.className = "thumb-reactions-container";

    bar.appendChild(reactionsEl);

    card.appendChild(img);
    card.appendChild(bar);
    carousel.appendChild(card);

    thumbUI.set(String(item.id), { reactionsEl });
    renderFixedBar(item.id, reactionsEl, "thumb");
  });

  document.addEventListener("keydown", (e)=>{
    if(modal.style.display === "block"){
      if(e.key === "ArrowLeft") prevImage();
      if(e.key === "ArrowRight") nextImage();
      if(e.key === "Escape") closeModal();
    }
  });
}

closeBtn.onclick = closeModal;
modal.onclick = (e)=>{ if(e.target === modal) closeModal(); };

init();

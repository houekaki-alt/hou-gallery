const FIXED_REACTIONS = ["👍", "❤️", "🙏"];

let images = [];
const carousel = document.getElementById("carousel");
const msg = document.getElementById("msg");

/* ===== localStorage ===== */
function storageKey(id){ return `reactions_${id}`; }

function loadReactions(id){
  try{
    return JSON.parse(localStorage.getItem(storageKey(id))) || {};
  }catch{
    return {};
  }
}

function saveReactions(id, data){
  localStorage.setItem(storageKey(id), JSON.stringify(data));
}

/* ===== 描画 ===== */
function renderReactions(id, container){
  const data = loadReactions(id);
  container.innerHTML = "";

  FIXED_REACTIONS.forEach((emoji)=>{
    const count = data[emoji] || 0;

    const btn = document.createElement("div");
    btn.className = "thumb-reaction-item";
    btn.innerHTML = `${emoji}<span>${count}</span>`;

    btn.addEventListener("click", (e)=>{
      e.stopPropagation();
      data[emoji] = (data[emoji] || 0) + 1;
      saveReactions(id, data);
      renderReactions(id, container);
    });

    container.appendChild(btn);
  });
}

/* ===== 初期化 ===== */
async function init(){
  let res;
  try{
    res = await fetch("/images.json", { cache: "no-store" });
  }catch{
    msg.innerHTML = `<div class="error">images.json を読み込めませんでした</div>`;
    return;
  }

  if(!res.ok){
    msg.innerHTML = `<div class="error">images.json の読み込みに失敗しました（${res.status}）</div>`;
    return;
  }

  let data;
  try{
    data = await res.json();
  }catch{
    msg.innerHTML = `<div class="error">images.json が壊れています（JSON形式エラー）</div>`;
    return;
  }

  if(!Array.isArray(data) || data.length === 0){
    msg.innerHTML = `<div class="error">images.json に画像データがありません</div>`;
    return;
  }

  images = data;
  carousel.innerHTML = "";

  images.forEach((item)=>{
    const card = document.createElement("div");
    card.className = "thumb-container";

    const img = document.createElement("img");
    img.className = "thumb";
    img.loading = "lazy";
    img.src = item.file;
    img.alt = `illustration ${item.id}`;

    // 今回は一覧でのクリック拡大を一旦切る（必要なら後で戻す）
    // img.onclick = () => openModal(index);

    const bar = document.createElement("div");
    bar.className = "thumb-reaction-bar";

    const reactions = document.createElement("div");
    reactions.className = "thumb-reactions-container";

    bar.appendChild(reactions);
    card.appendChild(img);
    card.appendChild(bar);
    carousel.appendChild(card);

    renderReactions(item.id, reactions);
  });
}

init();

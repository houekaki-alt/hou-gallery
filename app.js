const FIXED_REACTIONS = ["👍", "❤️", "🙏"];

let images = [];
const carousel = document.getElementById("carousel");
const msg = document.getElementById("msg");

/* ===== localStorage ===== */
function key(id){ return `reactions_${id}`; }

function loadReactions(id){
  try{
    return JSON.parse(localStorage.getItem(key(id))) || {};
  }catch{
    return {};
  }
}

function saveReactions(id,data){
  localStorage.setItem(key(id), JSON.stringify(data));
}

/* ===== 描画 ===== */
function renderReactions(id, container){
  const data = loadReactions(id);
  container.innerHTML = "";

  FIXED_REACTIONS.forEach(emoji=>{
    const count = data[emoji] || 0;

    const btn = document.createElement("div");
    btn.className = "thumb-reaction-item";
    btn.innerHTML = `${emoji}<span>${count}</span>`;

    btn.addEventListener("click", e=>{
      e.stopPropagation();
      data[emoji] = (data[emoji] || 0) + 1;
      saveReactions(id,data);
      renderReactions(id,container);
    });

    container.appendChild(btn);
  });
}

/* ===== 初期化 ===== */
async function init(){
  let res;
  try{
    res = await fetch("/images.json",{cache:"no-store"});
  }catch{
    msg.innerHTML = `<div class="error">images.json を読み込めません</div>`;
    return;
  }

  images = await res.json();
  carousel.innerHTML = "";

  images.forEach((item)=>{
    const card = document.createElement("div");
    card.className = "thumb-container";

    const img = document.createElement("img");
    img.className = "thumb";
    img.src = item.file;
    img.loading = "lazy";

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

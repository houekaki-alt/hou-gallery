const FIXED_REACTIONS = ["👍", "❤️", "🙏"];
// API_URLを空にすると、現在のドメイン(hou-gallery.website)を自動で使います
const API_URL = ""; 

let images = [];
let currentIndex = 0;

const carousel = document.getElementById("carousel");
const modal = document.getElementById("modal");
const modalImg = document.getElementById("modal-img");
const shareBtn = document.getElementById("share-btn");

function imgKeyFromFile(file) {
  return encodeURIComponent(file.split('/').pop());
}

// 通信エラーが起きても「0」を返して処理を止めない関数
async function apiCall(method, imgKey, emoji = null) {
  try {
    const url = method === "GET" ? `${API_URL}/?img=${imgKey}&t=${Date.now()}` : API_URL;
    const options = {
      method,
      headers: { "Content-Type": "application/json" }
    };
    if (method === "POST") options.body = JSON.stringify({ img: imgKey, emoji });

    const r = await fetch(url, options);
    if (!r.ok) throw new Error();
    const j = await r.json();
    return j.reactions || [];
  } catch (e) {
    console.log("通信に失敗しましたが、処理を続行します");
    return FIXED_REACTIONS.map(e => ({ emoji: e, count: 0 }));
  }
}

function renderReactionsUI(reactionsArr, container, imgKey, isModal = false) {
  const map = Object.fromEntries((reactionsArr || []).map(r => [r.emoji, r.count]));
  container.innerHTML = "";
  FIXED_REACTIONS.forEach(emoji => {
    const count = map[emoji] ?? 0;
    const btn = document.createElement("div");
    btn.className = isModal ? "reaction-item" : "thumb-reaction-item";
    btn.style.cursor = "pointer"; // 強制的に指マーク
    btn.innerHTML = `${emoji}<span>${count}</span>`;
    
    btn.onclick = async (e) => {
      e.stopPropagation();
      // 押した瞬間に見た目だけ数字を増やす（反応を速くする）
      const span = btn.querySelector('span');
      span.innerText = parseInt(span.innerText) + 1;
      
      try {
        await apiCall("POST", imgKey, emoji);
      } catch (err) {
        console.error("送信失敗");
      }
    };
    container.appendChild(btn);
  });
}

// 初期化などは以前と同じ...（中略）
async function init() {
  const res = await fetch("/images.json");
  images = await res.json();
  carousel.innerHTML = "";
  images.forEach((item, index) => {
    const card = document.createElement("div");
    card.className = "thumb-container";
    const img = document.createElement("img");
    img.src = item.file;
    img.onclick = () => openModal(index);
    const bar = document.createElement("div");
    bar.className = "thumb-reaction-bar";
    const container = document.createElement("div");
    container.className = "thumb-reactions-container";
    bar.appendChild(container);
    card.appendChild(img);
    card.appendChild(bar);
    carousel.appendChild(card);
    // 最初はとりあえず「0」で表示させておく（待ち時間をなくす）
    renderReactionsUI([], container, imgKeyFromFile(item.file), false);
    // そのあと裏で実際の数字を取りに行く
    apiCall("GET", imgKeyFromFile(item.file)).then(data => {
        renderReactionsUI(data, container, imgKeyFromFile(item.file), false);
    });
  });
}
// 以下のイベントリスナー等はそのまま残す
document.getElementById("close").onclick = () => modal.style.display = "none";
init();
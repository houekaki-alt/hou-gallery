let images = [];
const carousel = document.getElementById("carousel");  // grid を carousel に
const msg = document.getElementById("msg");

function showError(text){
  msg.innerHTML = `<div class="error">${text}</div>`;
}

async function init(){
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
  // carousel 描画
  carousel.innerHTML = "";
  images.forEach((item) => {  // idx 不要
    const img = document.createElement("img");
    img.className = "thumb";
    img.loading = "lazy";
    img.src = item.file;
    img.alt = `thumb ${item.id}`;
    // クリックイベント削除（モーダルなし）
    carousel.appendChild(img);
  });
}
init();

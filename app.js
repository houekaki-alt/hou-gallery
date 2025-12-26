let images = [];
const carousel = document.getElementById("carousel");
const msg = document.getElementById("msg");
const modal = document.getElementById("modal");
const modalImg = document.getElementById("modal-img");
const closeBtn = document.getElementById("close");
const shareBtn = document.getElementById("share-btn");

function showError(text){
  msg.innerHTML = `<div class="error">${text}</div>`;
}

async function init(){
  let res;
  try {
    // ここは /images.json に変更推奨（前回のアドバイス通り）
    res = await fetch("/images.json", { cache: "no-store" });
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
    showError("images.json がJSONとして壊れています");
    return;
  }
  if (!Array.isArray(data) || data.length === 0){
    showError("images.json の中身が空です");
    return;
  }
  images = data;

  // カルーセルに画像を追加（ここが欠落していた部分！）
  carousel.innerHTML = "";
  images.forEach((item) => {
    const img = document.createElement("img");
    img.className = "thumb";
    img.loading = "lazy";
    img.src = item.file;
    img.alt = `thumb ${item.id}`;

    // サムネイルクリック → モーダル表示
    img.onclick = function() {
      modal.style.display = "block";
      setTimeout(() => modal.classList.add("show"), 10); // ふわっと出現
      modalImg.src = item.file;

      // Share to X ボタン設定（URLだけ）
      shareBtn.onclick = function() {
        const shareUrl = `https://hou-gallery.pages.dev/image/${item.id}`;
        window.open(`https://twitter.com/intent/tweet?url=${encodeURIComponent(shareUrl)}`, '_blank');
      };
    };

    carousel.appendChild(img);
  });

  // URLパラメータ ?img=id で自動オープン（オプション）
  const urlParams = new URLSearchParams(window.location.search);
  const imgId = urlParams.get('img');
  if (imgId) {
    const item = images.find(i => i.id == imgId);
    if (item) {
      modal.style.display = "block";
      setTimeout(() => modal.classList.add("show"), 10);
      modalImg.src = item.file;
      shareBtn.onclick = function() {
        const shareUrl = `https://hou-gallery.pages.dev/image/${item.id}`;
        window.open(`https://twitter.com/intent/tweet?url=${encodeURIComponent

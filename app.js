// モーダル関連の要素を取得
const modal = document.getElementById("modal");
const modalImg = document.getElementById("modal-img");
const closeBtn = document.getElementById("close");
const shareBtn = document.getElementById("share-btn");

// サムネイルクリック → モーダル表示
img.onclick = function() {
  modal.style.display = "block";
  setTimeout(() => modal.classList.add("show"), 10); // ふわっと出現
  modalImg.src = item.file;

  // Share to X ボタン：URLだけをツイート画面に渡す
  shareBtn.onclick = function() {
    const shareUrl = `https://hou-gallery.pages.dev/image/${item.id}`;
    window.open(`https://twitter.com/intent/tweet?url=${encodeURIComponent(shareUrl)}`, '_blank');
  };
};

// ×ボタンや背景クリックでモーダル閉じる
closeBtn.onclick = function() {
  modal.classList.remove("show");
  setTimeout(() => modal.style.display = "none", 300);
};
modal.onclick = function(event) {
  if (event.target === modal) {
    closeBtn.onclick();
  }
};

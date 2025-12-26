// グローバル変数
let images = [];
const carousel = document.getElementById("carousel");
const msg = document.getElementById("msg");
const modal = document.getElementById("modal");
const modalImg = document.getElementById("modal-img");
const closeBtn = document.getElementById("close");
const shareBtn = document.getElementById("share-btn");

function showError(text) {
  msg.innerHTML = `<div class="error">${text}</div>`;
}

// メイン処理
async function init() {
  let res;
  try {
    // 絶対パスで確実に読み込む（Cloudflare Pages で安定）
    res = await fetch("/images.json", { cache: "no-store" });
  } catch (e) {
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
  } catch (e) {
    showError("images.json が壊れています（JSON形式エラー）");
    return;
  }

  if (!Array.isArray(data) || data.length === 0) {
    showError("images.json に画像データがありません");
    return;
  }

  images = data;

  // カルーセルにサムネイルを追加
  carousel.innerHTML = "";
  images.forEach((item) => {
    const img = document.createElement("img");
    img.className = "thumb";
    img.loading = "lazy";
    img.src = item.file;           // images/1 (1).jpg など
    img.alt = `illustration ${item.id}`;

    // クリックでモーダル表示
    img.onclick = function () {
      modal.style.display = "block";
      setTimeout(() => modal.classList.add("show"), 10); // ふわっと出現

      modalImg.src = item.file;

      // Share to X ボタン：URLだけをツイート画面に渡す
      shareBtn.onclick = function () {
        const shareUrl = `https://hou-gallery.pages.dev/image/${item.id}`;
        const twitterUrl = `https://twitter.com/intent/tweet?url=${encodeURIComponent(shareUrl)}`;
        window.open(twitterUrl, "_blank");
      };
    };

    carousel.appendChild(img);
  });

  // オプション：URLに ?img=1 のように指定して戻ってきたら自動でモーダルを開く
  const urlParams = new URLSearchParams(window.location.search);
  const openId = urlParams.get("img");
  if (openId) {
    const item = images.find((i) => i.id == openId);
    if (item) {
      modal.style.display = "block";
      setTimeout(() => modal.classList.add("show"), 10);
      modalImg.src = item.file;
      shareBtn.onclick = function () {
        const shareUrl = `https://hou-gallery.pages.dev/image/${item.id}`;
        window.open(`https://twitter.com/intent/tweet?url=${encodeURIComponent(shareUrl)}`, "_blank");
      };
    }
  }
}

// モーダル閉じる処理
closeBtn.onclick = function () {
  modal.classList.remove("show");
  setTimeout(() => (modal.style.display = "none"), 300);
};

modal.onclick = function (event) {
  if (event.target === modal) {
    closeBtn.onclick();
  }
};

// 起動
init();

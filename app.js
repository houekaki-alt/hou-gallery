// app.js
const gallery = document.getElementById("gallery");

const modal = document.getElementById("modal");
const modalImg = document.getElementById("modal-image");
const shareUrl = `${location.origin}/image/${n}`;
const xIntent = `https://twitter.com/intent/tweet?url=${encodeURIComponent(shareUrl)}`;
window.open(xIntent, "_blank");

const closeBtn = document.querySelector(".modal-close");
const prevBtn = document.querySelector(".nav.prev");
const nextBtn = document.querySelector(".nav.next");

let images = [];
let currentIndex = -1;

fetch("images.json")
  .then(r => r.json())
  .then(list => {
    images = list;
    images.forEach((src, idx) => {
      const a = document.createElement("a");
      a.className = "gallery-item";
      a.href = src;
      a.onclick = e => {
        e.preventDefault();
        openModal(idx);
      };

      const img = document.createElement("img");
      img.src = src;
      img.loading = "lazy";
      img.alt = "";

      a.appendChild(img);
      gallery.appendChild(a);
    });
  });

function openModal(idx){
  currentIndex = idx;
  modalImg.src = images[currentIndex];
  modal.classList.remove("hidden");
  modal.setAttribute("aria-hidden", "false");

  // 共有
  shareX.href =
    "https://twitter.com/intent/tweet?url=" +
    encodeURIComponent(location.href);
}

function closeModal(){
  modal.classList.add("hidden");
  modal.setAttribute("aria-hidden", "true");
  modalImg.src = "";
  currentIndex = -1;
}

function showPrev(){
  if (!images.length) return;
  currentIndex = (currentIndex - 1 + images.length) % images.length;
  modalImg.src = images[currentIndex];
}

function showNext(){
  if (!images.length) return;
  currentIndex = (currentIndex + 1) % images.length;
  modalImg.src = images[currentIndex];
}

closeBtn.onclick = closeModal;
prevBtn.onclick = showPrev;
nextBtn.onclick = showNext;

modal.onclick = e => {
  if (e.target === modal) closeModal();
};

document.addEventListener("keydown", (e) => {
  if (modal.classList.contains("hidden")) return;
  if (e.key === "Escape") closeModal();
  if (e.key === "ArrowLeft") showPrev();
  if (e.key === "ArrowRight") showNext();
});


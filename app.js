let images = [];
let current = 0;

const grid = document.getElementById('grid');
const modal = document.getElementById('modal');
const modalImg = document.getElementById('modalImg');
const closeBtn = document.getElementById('close');
const prevBtn = document.getElementById('prev');
const nextBtn = document.getElementById('next');
const shareA = document.getElementById('share');

function openModal(i) {
  current = i;
  const item = images[current];
  if (!item) return;

  modalImg.src = item.src;
  modalImg.alt = item.alt || '';
  modal.classList.add('open');
  modal.setAttribute('aria-hidden', 'false');

  // URLを ?img= にする（戻るボタンでも復元しやすい）
  const url = new URL(location.href);
  url.searchParams.set('img', String(item.id));
  history.replaceState(null, '', url.toString());

  // X共有リンク（/image/ID を共有する）
  const shareUrl = `${location.origin}/image/${item.id}`;
  const text = '';
  shareA.href = `https://twitter.com/intent/tweet?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(text)}`;
}

function closeModal() {
  modal.classList.remove('open');
  modal.setAttribute('aria-hidden', 'true');
  modalImg.src = '';

  const url = new URL(location.href);
  url.searchParams.delete('img');
  history.replaceState(null, '', url.toString());
}

function step(delta) {
  const next = (current + delta + images.length) % images.length;
  openModal(next);
}

async function init() {
  const res = await fetch('./images.json', { cache: 'no-store' });
  if (!res.ok) throw new Error('images.json not found');
  images = await res.json();

  grid.innerHTML = '';
  images.forEach((item, idx) => {
    const img = document.createElement('img');
    img.src = item.src;
    img.alt = item.alt || '';
    img.loading = 'lazy';
    img.className = 'thumb';
    img.addEventListener('click', () => openModal(idx));
    grid.appendChild(img);
  });

  // 直リンク表示（?img=1 みたいなの）
  const url = new URL(location.href);
  const id = Number(url.searchParams.get('img'));
  if (id) {
    const index = images.findIndex(x => x.id === id);
    if (index >= 0) openModal(index);
  }
}

closeBtn.addEventListener('click', closeModal);
prevBtn.addEventListener('click', () => step(-1));
nextBtn.addEventListener('click', () => step(1));
modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });

document.addEventListener('keydown', (e) => {
  if (!modal.classList.contains('open')) return;
  if (e.key === 'Escape') closeModal();
  if (e.key === 'ArrowLeft') step(-1);
  if (e.key === 'ArrowRight') step(1);
});

init().catch(err => {
  console.error(err);
  grid.innerHTML = `<p style="padding:16px;">画像の読み込みに失敗しました（images.json / images フォルダを確認してね）</p>`;
});

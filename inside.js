
const BLOG_REACTIONS = ["👍"];
const API_URL = "https://reactions-api.hou-ekaki.workers.dev";

const POSTS = [
  {
    id: "2026-01-22-1",
    date: "2026-01-22",
    title: "楽しいだけじゃない予定で",
    body:
`4年前の今日の写真です↓
（ここに文章）

やっぱり、楽しいが断然多くて☺
初めての経験なので、アタフタしますが…`,
    tags: ["日記", "メモ"],
  },

];

const postList = document.getElementById("postList");
const recentList = document.getElementById("recentList");
const archiveList = document.getElementById("archiveList");
const msg = document.getElementById("msg");


function blogKey(postId) {
  return `blog:${postId}`;
}

async function apiGet(key) {
  const url = `${API_URL}/?img=${encodeURIComponent(key)}`;
  const r = await fetch(url, { method: "GET" });
  if (!r.ok) throw new Error(`GET failed: ${r.status}`);
  const j = await r.json();
  return j.reactions || BLOG_REACTIONS.map(e => ({ emoji: e, count: 0 }));
}

async function apiPost(key, emoji) {
  const r = await fetch(`${API_URL}/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ img: key, emoji }),
  });
  if (!r.ok) throw new Error(`POST failed: ${r.status}`);
  return r.json().catch(() => ({}));
}

function renderPost(post) {
  const el = document.createElement("article");
  el.className = "post";
  el.dataset.postId = post.id;

  el.innerHTML = `
    <div class="postMeta">
      <span class="badge">NEW</span>
      <span>${post.date}</span>
    </div>
    <div class="postTitle">${escapeHtml(post.title)}</div>
    <div class="postBody">${escapeHtml(post.body)}</div>

    <div class="tagRow">
      ${(post.tags || []).map(t => `<span class="tag">${escapeHtml(t)}</span>`).join("")}
    </div>

    <div class="actions">
      <button class="likeBtn" type="button" aria-label="like">
        👍 <span class="likeCount">…</span>
      </button>
    </div>
  `;

  const btn = el.querySelector(".likeBtn");
  const countEl = el.querySelector(".likeCount");
  const key = blogKey(post.id);

  
  apiGet(key)
    .then((arr) => {
      const map = Object.fromEntries(arr.map(r => [r.emoji, r.count]));
      countEl.textContent = String(map["👍"] ?? 0);
    })
    .catch((e) => {
      console.error(e);
      countEl.textContent = "0";
    });

  btn.addEventListener("click", async () => {
    const before = parseInt(countEl.textContent, 10) || 0;
    countEl.textContent = String(before + 1); 

    try {
      await apiPost(key, "👍");
      const latest = await apiGet(key);
      const map = Object.fromEntries(latest.map(r => [r.emoji, r.count]));
      countEl.textContent = String(map["👍"] ?? 0);
    } catch (e) {
      console.error(e);
      countEl.textContent = String(before); 
    }
  });

  return el;
}

function renderSidebar() {
  
  recentList.innerHTML = "";
  POSTS.slice(0, 8).forEach(p => {
    const li = document.createElement("li");
    li.innerHTML = `<a href="#${encodeURIComponent(p.id)}">${escapeHtml(p.title)}</a>`;
    recentList.appendChild(li);
  });


  const byMonth = new Map();
  POSTS.forEach(p => {
    const m = (p.date || "").slice(0, 7); 
    byMonth.set(m, (byMonth.get(m) || 0) + 1);
  });

  archiveList.innerHTML = "";
  Array.from(byMonth.entries())
    .sort((a,b) => (a[0] < b[0] ? 1 : -1))
    .forEach(([m, n]) => {
      const li = document.createElement("li");
      li.innerHTML = `<a href="#month-${m}">${escapeHtml(m)}（${n}）</a>`;
      archiveList.appendChild(li);
    });
}

function init() {
  msg.textContent = "";

  if (!POSTS.length) {
    msg.textContent = "記事がまだないで。";
    return;
  }

  postList.innerHTML = "";
  POSTS.forEach(p => {
    const node = renderPost(p);
    node.id = p.id; 
    postList.appendChild(node);
  });

  renderSidebar();
}

function escapeHtml(s) {
  return String(s ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

init();

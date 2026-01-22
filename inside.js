fetch("https://ddutkh5s9.microcms.io/api/v1/blog", {
  headers: {
    "X-MICROCMS-API-KEY": "あとで入れる"
  }
})
  .then(res => res.json())
  .then(data => {
    const ul = document.getElementById("blog-list");
    data.contents.forEach(post => {
      const li = document.createElement("li");
      li.textContent = post.title;
      ul.appendChild(li);
    });
  });

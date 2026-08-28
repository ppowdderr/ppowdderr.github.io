// List every post file here; newest first.
const postFiles = [
  "on-walking.html",
  "on-boredom.html",
  "on-rereading.html"
];

function formatStamp(meta) {
  const dateObj = new Date(meta.date + "T" + (meta.time || "00:00"));
  const date = dateObj.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  const day = dateObj.toLocaleDateString("en-US", { weekday: "short" });
  const time = dateObj.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }).toLowerCase();
  return `${date} \u00b7 ${day} ${time}`;
}

async function fetchPost(file) {
  const res = await fetch(`posts/${file}`);
  if (!res.ok) throw new Error("Post not found: " + file);
  const doc = new DOMParser().parseFromString(await res.text(), "text/html");
  return {
    id: file.replace(".html", ""),
    meta: JSON.parse(doc.querySelector(".post-meta").textContent),
    content: doc.querySelector(".post-content")
  };
}

function trimToPreview(content, postId) {
  const cut = content.querySelector("[data-cut]");
  if (!cut) return content;

  let node = cut.nextSibling;
  while (node) {
    const next = node.nextSibling;
    node.remove();
    node = next;
  }
  cut.remove();

  const link = document.createElement("a");
  link.href = `post_viewer.html?postid=${postId}`;
  link.className = "continue";
  link.textContent = "... read more";
  content.appendChild(link);
  return content;
}

function renderPost(post, { preview }) {
  const article = document.createElement("article");
  article.className = "post";

  const heading = preview
    ? `<h2 class="post-title"><a href="post_viewer.html?postid=${post.id}">${post.meta.title}</a></h2>`
    : `<h2 class="post-title">${post.meta.title}</h2>`;

  article.innerHTML = `
    <header>
      ${heading}
      <span class="post-date">${formatStamp(post.meta)}</span>
    </header>
    <div class="post-body"></div>
    <footer class="post-footer">
      tags: <span class="post-footer-tags">${post.meta.tags.join("; ")}</span>
    </footer>
  `;

  const body = post.content.cloneNode(true);
  article.querySelector(".post-body").appendChild(preview ? trimToPreview(body, post.id) : body);
  return article;
}

function renderRail(posts, currentId) {
  const list = document.getElementById("rail-index");
  if (!list) return;

  for (const post of posts) {
    const item = document.createElement("li");
    const current = post.id === currentId ? ' aria-current="page"' : "";
    item.innerHTML = `
      <a href="post_viewer.html?postid=${post.id}"${current}>
        <span class="rail-date">${formatStamp(post.meta)}</span>
        <span class="rail-name">${post.meta.title}</span>
      </a>
    `;
    list.appendChild(item);
  }
}

async function loadAllPosts() {
  const posts = [];
  for (const file of postFiles) {
    try {
      posts.push(await fetchPost(file));
    } catch (err) {
      console.error(err);
    }
  }
  return posts;
}

async function initIndex() {
  const posts = await loadAllPosts();
  renderRail(posts, null);

  const feed = document.getElementById("feed");
  for (const post of posts) {
    feed.appendChild(renderPost(post, { preview: true }));
  }
}

async function initViewer() {
  const postId = new URLSearchParams(window.location.search).get("postid");
  const container = document.getElementById("post-container");
  const posts = await loadAllPosts();
  renderRail(posts, postId);

  const post = posts.find((candidate) => candidate.id === postId);
  if (!post) {
    container.innerHTML = '<p class="note">no such post. <a href="index.html">back to the index</a>.</p>';
    return;
  }

  document.title = `${post.meta.title} \u2014 my ivory tower`;
  container.appendChild(renderPost(post, { preview: false }));
}

// List every post file here; newest first.
const postFiles = [
  "on-walking.html",
  "on-boredom.html",
  "on-rereading.html"
];

const ROMAN = ["i", "ii", "iii", "iv", "v", "vi", "vii", "viii", "ix", "x"];

function toRoman(n) {
  return ROMAN[n - 1] || String(n);
}

function stampParts(meta) {
  const dateObj = new Date(meta.date + "T" + (meta.time || "00:00"));
  return {
    date: dateObj.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }),
    day: dateObj.toLocaleDateString("en-US", { weekday: "long" }),
    time: dateObj.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }).toLowerCase()
  };
}

function shortStamp(meta) {
  const { date, day } = stampParts(meta);
  return `${day.slice(0, 3)} \u00b7 ${date}`;
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
  link.textContent = "the rest of the leaf \u2192";
  content.appendChild(link);
  return content;
}

// An entry is a two-column leaf: marginalia on the left, prose on the right.
function renderEntry(post, { preview, folio }) {
  const { date, day, time } = stampParts(post.meta);
  const entry = document.createElement("article");
  entry.className = "entry";

  const title = preview
    ? `<a href="post_viewer.html?postid=${post.id}">${post.meta.title}</a>`
    : post.meta.title;

  entry.innerHTML = `
    <aside class="entry-margin">
      <span class="folio">fol. ${toRoman(folio)}</span>
      <span class="margin-note">${date}<br>${day}, ${time}</span>
      <span class="margin-note">${post.meta.tags.join(" \u00b7 ")}</span>
    </aside>
    <div class="entry-text">
      <h2 class="entry-title">${title}</h2>
      <div class="entry-body"></div>
    </div>
  `;

  const body = post.content.cloneNode(true);
  entry.querySelector(".entry-body").appendChild(preview ? trimToPreview(body, post.id) : body);
  return entry;
}

function renderMarginIndex(posts, currentId, mount) {
  if (!mount) return;

  const label = document.createElement("span");
  label.className = "margin-label";
  label.textContent = currentId ? "other leaves" : "the quire";
  mount.appendChild(label);

  const list = document.createElement("ul");
  list.className = "rail-index";
  for (const post of posts) {
    const item = document.createElement("li");
    const current = post.id === currentId ? ' aria-current="page"' : "";
    item.innerHTML = `
      <a href="post_viewer.html?postid=${post.id}"${current}>
        <span class="rail-date">${shortStamp(post.meta)}</span>
        ${post.meta.title}
      </a>
    `;
    list.appendChild(item);
  }
  mount.appendChild(list);
}

async function initIndex() {
  const posts = await loadAllPosts();
  const leaves = document.getElementById("leaves");
  posts.forEach((post, i) => {
    leaves.appendChild(renderEntry(post, { preview: true, folio: i + 1 }));
  });
}

async function initViewer() {
  const postId = new URLSearchParams(window.location.search).get("postid");
  const container = document.getElementById("leaves");
  const posts = await loadAllPosts();
  const index = posts.findIndex((candidate) => candidate.id === postId);

  if (index === -1) {
    container.innerHTML = '<p class="note">no such leaf. <a href="index.html">back to the quire</a>.</p>';
    return;
  }

  const post = posts[index];
  document.title = `${post.meta.title} \u2014 my ivory tower`;
  const entry = renderEntry(post, { preview: false, folio: index + 1 });
  renderMarginIndex(posts, postId, entry.querySelector(".entry-margin"));
  container.appendChild(entry);
}

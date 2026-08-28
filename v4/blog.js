// List every leaf here, in reading order (newest first).
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

function openingWords(post, count) {
  const text = post.content.textContent.trim().replace(/\s+/g, " ");
  const words = text.split(" ").slice(0, count);
  return words.join(" ");
}

function leafHref(post) {
  return `post_viewer.html?postid=${post.id}`;
}

function renderLeaf(post, folio) {
  const { date, day, time } = stampParts(post.meta);
  const entry = document.createElement("article");
  // odd folios are recto, even are verso: the marginalia change sides as you turn
  entry.className = `entry ${folio % 2 ? "recto" : "verso"}`;
  entry.innerHTML = `
    <aside class="entry-margin">
      <span class="folio">fol. ${toRoman(folio)}</span>
      <span class="margin-note">${date}<br>${day}, ${time}</span>
      <span class="margin-note">${post.meta.tags.join(" \u00b7 ")}</span>
    </aside>
    <div class="entry-text">
      <h2 class="entry-title">${post.meta.title}</h2>
      <div class="entry-body"></div>
    </div>
  `;
  entry.querySelector(".entry-body").appendChild(post.content.cloneNode(true));
  return entry;
}

// The scribe's catchword: the next leaf's first word, written at the foot of this one.
function renderCatchword(nextPost) {
  const catchword = document.createElement("div");
  catchword.className = "catchword";
  catchword.innerHTML = `
    <span class="catchword-label mono">catchword</span>
    <a href="${leafHref(nextPost)}">${openingWords(nextPost, 1).replace(/[^\w'\u2019-]+$/, "")}\u2026</a>
  `;
  return catchword;
}

function renderTurn(prevPost, nextPost) {
  const turn = document.createElement("nav");
  turn.className = "turn";
  turn.setAttribute("aria-label", "turn the leaf");
  turn.innerHTML = `
    <span>${prevPost ? `<a href="${leafHref(prevPost)}" rel="prev">\u2190 ${prevPost.meta.title}</a>` : ""}</span>
    <span class="turn-hint mono">\u2190 \u2192 to turn</span>
    <span>${nextPost ? `<a href="${leafHref(nextPost)}" rel="next">${nextPost.meta.title} \u2192</a>` : ""}</span>
  `;
  return turn;
}

function bindLeafTurning(prevPost, nextPost) {
  document.addEventListener("keydown", (event) => {
    if (event.metaKey || event.ctrlKey || event.altKey) return;
    const tag = document.activeElement && document.activeElement.tagName;
    if (tag === "INPUT" || tag === "TEXTAREA") return;

    if (event.key === "ArrowLeft" && prevPost) window.location.href = leafHref(prevPost);
    if (event.key === "ArrowRight" && nextPost) window.location.href = leafHref(nextPost);
  });
}

// index.html: a foliated table of contents rather than a feed of previews.
async function initQuire() {
  const posts = await loadAllPosts();
  const list = document.getElementById("quire");

  posts.forEach((post, i) => {
    const { date, day } = stampParts(post.meta);
    const item = document.createElement("li");
    item.className = "quire-leaf";
    item.innerHTML = `
      <div>
        <span class="folio">fol. ${toRoman(i + 1)}</span>
        <span class="quire-date">${day.slice(0, 3)} \u00b7 ${date}</span>
      </div>
      <div>
        <h2 class="quire-title"><a href="${leafHref(post)}">${post.meta.title}</a></h2>
        <p class="quire-opening">${openingWords(post, 14)}\u2026</p>
      </div>
    `;
    list.appendChild(item);
  });
}

async function initLeaf() {
  const postId = new URLSearchParams(window.location.search).get("postid");
  const container = document.getElementById("leaves");
  const posts = await loadAllPosts();
  const index = posts.findIndex((candidate) => candidate.id === postId);

  if (index === -1) {
    container.innerHTML = '<p class="note">no such leaf. <a href="index.html">back to the quire</a>.</p>';
    return;
  }

  const post = posts[index];
  const prevPost = posts[index - 1] || null;
  const nextPost = posts[index + 1] || null;

  document.title = `${post.meta.title} \u2014 my ivory tower`;
  const entry = renderLeaf(post, index + 1);
  if (nextPost) entry.querySelector(".entry-text").appendChild(renderCatchword(nextPost));
  entry.querySelector(".entry-text").appendChild(renderTurn(prevPost, nextPost));
  container.appendChild(entry);

  bindLeafTurning(prevPost, nextPost);
}

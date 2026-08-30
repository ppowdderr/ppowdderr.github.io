// v7 — Ivory Keys. The index is a keyboard; every essay is a key.
const postFiles = [
  "on-walking.html",
  "on-boredom.html",
  "on-rereading.html"
];

const NOTES = ["C", "D", "E", "F", "G", "A", "B"];

function noteName(i) {
  const octave = Math.floor(i / NOTES.length) + 3;
  return NOTES[i % NOTES.length] + octave;
}

async function fetchPost(file) {
  const res = await fetch(`posts/${file}`);
  if (!res.ok) throw new Error(file);
  const doc = new DOMParser().parseFromString(await res.text(), "text/html");
  return {
    id: file.replace(".html", ""),
    meta: JSON.parse(doc.querySelector(".post-meta").textContent),
    content: doc.querySelector(".post-content")
  };
}

function loadAll() {
  return Promise.all(postFiles.map(fetchPost));
}

function previewOf(content) {
  const c = content.cloneNode(true);
  const cut = c.querySelector("[data-cut]");
  if (cut) {
    let n = cut.nextSibling;
    while (n) { const x = n.nextSibling; n.remove(); n = x; }
    cut.remove();
  }
  return c;
}

function fmtDate(meta) {
  const d = new Date(meta.date + "T" + (meta.time || "00:00"));
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function renderKeyboard(posts, currentId, hrefFor) {
  const kb = document.getElementById("keyboard");
  kb.innerHTML = "";
  posts.forEach((post, i) => {
    const key = document.createElement("a");
    key.className = "key" + (post.id === currentId ? " down" : "");
    key.href = hrefFor(post);
    key.title = post.meta.title;
    if (post.id === currentId) key.setAttribute("aria-current", "true");
    key.innerHTML = `<span class="key-note">${noteName(i)}</span><span class="key-title">${post.meta.title.toLowerCase()}</span>`;
    kb.appendChild(key);
  });
  // unwritten essays: blank keys waiting at the right of the keyboard
  for (let j = 0; j < 9; j++) {
    const blank = document.createElement("span");
    blank.className = "key blank";
    blank.setAttribute("aria-hidden", "true");
    blank.innerHTML = `<span class="key-note">${noteName(posts.length + j)}</span>`;
    kb.appendChild(blank);
  }
}

/* ---------- index: sounding board ---------- */
async function initKeys() {
  let posts;
  try { posts = await loadAll(); }
  catch (e) {
    document.getElementById("sounding-board").innerHTML =
      "<p class=\"silent\">this key is silent — the essay would not sound.</p>";
    return;
  }

  function currentId() {
    const h = location.hash.replace("#", "");
    return posts.some(p => p.id === h) ? h : posts[0].id;
  }

  function render() {
    const id = currentId();
    const i = posts.findIndex(p => p.id === id);
    const post = posts[i];
    document.title = `my ivory tower · ${noteName(i)} ${post.meta.title.toLowerCase()}`;

    const board = document.getElementById("sounding-board");
    board.innerHTML = `
      <p class="sounding-meta">${noteName(i)} · ${fmtDate(post.meta)} · ${post.meta.tags.join(" · ")}</p>
      <h2 class="sounding-title">${post.meta.title}</h2>
      <div class="sounding-body"></div>
      <a class="sustain" href="post_viewer.html?postid=${post.id}">hold the key — read it whole &rarr;</a>
    `;
    board.querySelector(".sounding-body").appendChild(previewOf(post.content));
    renderKeyboard(posts, id, p => `#${p.id}`);
  }

  window.addEventListener("hashchange", render);
  render();
}

/* ---------- post page: one key held down ---------- */
async function initHeldKey() {
  const id = new URLSearchParams(location.search).get("postid");
  const board = document.getElementById("sounding-board");
  let posts;
  try { posts = await loadAll(); }
  catch (e) { board.innerHTML = "<p class=\"silent\">this key is silent.</p>"; return; }

  const i = posts.findIndex(p => p.id === id);
  if (i === -1) { board.innerHTML = "<p class=\"silent\">no such key on this keyboard.</p>"; return; }

  const post = posts[i];
  document.title = `my ivory tower · ${noteName(i)} ${post.meta.title.toLowerCase()}`;
  board.innerHTML = `
    <p class="sounding-meta">${noteName(i)} · ${fmtDate(post.meta)} · ${post.meta.tags.join(" · ")}</p>
    <h1 class="sounding-title">${post.meta.title}</h1>
    <div class="sounding-body full"></div>
  `;
  board.querySelector(".sounding-body").appendChild(post.content.cloneNode(true));
  renderKeyboard(posts, id, p => `post_viewer.html?postid=${p.id}`);

  document.addEventListener("keydown", (e) => {
    if (e.metaKey || e.ctrlKey || e.altKey || e.shiftKey) return;
    const t = document.activeElement && document.activeElement.tagName;
    if (t === "INPUT" || t === "TEXTAREA") return;
    if (e.key === "ArrowLeft" && posts[i - 1]) location.href = `post_viewer.html?postid=${posts[i - 1].id}`;
    if (e.key === "ArrowRight" && posts[i + 1]) location.href = `post_viewer.html?postid=${posts[i + 1].id}`;
  });
}

// v8 — Scrimshaw. Everything is engraved line on bone-black.
const postFiles = [
  "on-walking.html",
  "on-boredom.html",
  "on-rereading.html"
];

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
  return d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }).toLowerCase();
}

/* ---------- index: the engraved plate ---------- */
async function initPlate() {
  const plate = document.getElementById("plate");
  let posts;
  try { posts = await loadAll(); }
  catch (e) {
    plate.innerHTML = "<p class=\"chipped\">the surface is chipped here; this scene is lost.</p>";
    return;
  }

  posts.forEach((post, i) => {
    const scene = document.createElement("section");
    scene.className = "scene";
    scene.innerHTML = `
      <p class="scene-no">scene ${i + 1} · ${fmtDate(post.meta)}</p>
      <h2 class="scene-title"><a href="post_viewer.html?postid=${post.id}">${post.meta.title}</a></h2>
      <div class="scene-body"></div>
      <a class="scene-more" href="post_viewer.html?postid=${post.id}">carved deeper &rarr;</a>
    `;
    scene.querySelector(".scene-body").appendChild(previewOf(post.content));
    plate.appendChild(scene);
  });
}

/* ---------- post page: one panel ---------- */
async function initPanel() {
  const id = new URLSearchParams(location.search).get("postid");
  const panel = document.getElementById("panel");
  let posts;
  try { posts = await loadAll(); }
  catch (e) { panel.innerHTML = "<p class=\"chipped\">the surface is chipped here.</p>"; return; }

  const i = posts.findIndex(p => p.id === id);
  if (i === -1) { panel.innerHTML = "<p class=\"chipped\">nothing is engraved under that name.</p>"; return; }

  const post = posts[i];
  document.title = `my ivory tower · ${post.meta.title.toLowerCase()}, engraved`;
  const prev = posts[i + 1]; // older
  const next = posts[i - 1]; // newer

  panel.innerHTML = `
    <p class="scene-no">scene ${i + 1} · ${fmtDate(post.meta)} · ${post.meta.tags.join(" · ")}</p>
    <h1 class="scene-title inked">${post.meta.title}</h1>
    <div class="scene-body full"></div>
    <nav class="strokes">
      ${prev ? `<a href="post_viewer.html?postid=${prev.id}">&larr; the earlier cut, ${prev.meta.title.toLowerCase()}</a>` : "<span class=\"chipped\">the first stroke</span>"}
      ${next ? `<a href="post_viewer.html?postid=${next.id}">the later cut, ${next.meta.title.toLowerCase()} &rarr;</a>` : "<span class=\"chipped\">the last stroke so far</span>"}
    </nav>
  `;
  panel.querySelector(".scene-body").appendChild(post.content.cloneNode(true));
}

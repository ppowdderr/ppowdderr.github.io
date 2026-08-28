// v11 — Palimpsest. Older essays show through, faintly, under the newest.
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
  return d.toLocaleDateString("en-US", { month: "long", year: "numeric" }).toLowerCase();
}

/* ---------- index: layers of scraped writing ---------- */
async function initLayers() {
  const vellum = document.getElementById("vellum");
  let posts;
  try { posts = await loadAll(); }
  catch (e) {
    vellum.innerHTML = "<p class=\"scraped\">scraped too deep — nothing legible remains.</p>";
    return;
  }

  // newest first; each successive (older) layer is fainter and slightly rotated
  posts.forEach((post, i) => {
    const layer = document.createElement("section");
    layer.className = "layer";
    layer.style.setProperty("--depth", i);
    layer.innerHTML = `
      <p class="under">${i === 0 ? "the present hand" : `written over · ${"i".repeat(i)} layer${i > 1 ? "s" : ""} down`} · ${fmtDate(post.meta)}</p>
      <h2 class="layer-title"><a href="post_viewer.html?postid=${post.id}">${post.meta.title}</a></h2>
      <div class="layer-body"></div>
      <a class="raise" href="post_viewer.html?postid=${post.id}">raise this layer to the surface &rarr;</a>
    `;
    layer.querySelector(".layer-body").appendChild(previewOf(post.content));
    vellum.appendChild(layer);
  });
}

/* ---------- post page: one layer raised ---------- */
async function initRaised() {
  const id = new URLSearchParams(location.search).get("postid");
  const vellum = document.getElementById("vellum");
  let posts;
  try { posts = await loadAll(); }
  catch (e) { vellum.innerHTML = "<p class=\"scraped\">scraped too deep — nothing legible remains.</p>"; return; }

  const i = posts.findIndex(p => p.id === id);
  if (i === -1) { vellum.innerHTML = "<p class=\"scraped\">that hand was scraped away entirely.</p>"; return; }

  const post = posts[i];
  document.title = `my ivory tower · ${post.meta.title.toLowerCase()}, raised`;
  const under = posts[i + 1]; // older, beneath
  const over = posts[i - 1];  // newer, above

  // ghost titles of every other layer drift behind the raised text
  const ghosts = posts
    .filter(p => p.id !== id)
    .map((p, k) => `<span class="ghost" style="--g:${k}">${p.meta.title.toLowerCase()}</span>`)
    .join("");

  vellum.innerHTML = `
    <div class="ghost-field" aria-hidden="true">${ghosts}</div>
    <section class="layer raised">
      <p class="under">${fmtDate(post.meta)} · ${post.meta.tags.join(" · ")}</p>
      <h1 class="layer-title">${post.meta.title}</h1>
      <div class="layer-body"></div>
      <nav class="scrapes">
        ${under ? `<a href="post_viewer.html?postid=${under.id}">beneath this: ${under.meta.title.toLowerCase()}</a>` : "<span class=\"scraped\">nothing beneath — the first hand</span>"}
        ${over ? `<a href="post_viewer.html?postid=${over.id}">written over by: ${over.meta.title.toLowerCase()}</a>` : "<span class=\"scraped\">nothing above — the surface</span>"}
      </nav>
    </section>
  `;
  vellum.querySelector(".layer-body").appendChild(post.content.cloneNode(true));
}

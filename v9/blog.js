// v9 — Vitrine. A museum of ivory objects; the essays are the objects.
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

function words(content) {
  return content.textContent.trim().split(/\s+/).length;
}

function accession(meta, i, total) {
  const year = meta.date.slice(0, 4);
  return `IT.${year}.${String(total - i).padStart(3, "0")}`;
}

function fmtDate(meta) {
  const d = new Date(meta.date + "T" + (meta.time || "00:00"));
  return d.toLocaleDateString("en-US", { day: "numeric", month: "long", year: "numeric" });
}

function labelHTML(post, i, total, heading) {
  const h = heading || "h2";
  return `
    <p class="accession">${accession(post.meta, i, total)}</p>
    <${h} class="object-title"><a href="post_viewer.html?postid=${post.id}">${post.meta.title}</a></${h}>
    <dl class="object-facts">
      <div><dt>acquired</dt><dd>${fmtDate(post.meta)}</dd></div>
      <div><dt>medium</dt><dd>text · ${words(post.content).toLocaleString()} words</dd></div>
      <div><dt>provenance</dt><dd>${post.meta.tags.join("; ")}</dd></div>
    </dl>
  `;
}

/* ---------- index: the gallery wall ---------- */
async function initGallery() {
  const wall = document.getElementById("wall");
  let posts;
  try { posts = await loadAll(); }
  catch (e) {
    wall.innerHTML = "<p class=\"on-loan\">this case is empty — the object is on loan.</p>";
    return;
  }
  const total = posts.length;

  posts.forEach((post, i) => {
    const label = document.createElement("article");
    label.className = "label";
    label.innerHTML = labelHTML(post, i, total);
    wall.appendChild(label);
  });

  document.getElementById("case-count").textContent =
    `${total} objects on display · gallery of one visitor`;
}

/* ---------- post page: the object, label pinned aside ---------- */
async function initObject() {
  const id = new URLSearchParams(location.search).get("postid");
  const room = document.getElementById("object-room");
  let posts;
  try { posts = await loadAll(); }
  catch (e) { room.innerHTML = "<p class=\"on-loan\">the object is on loan.</p>"; return; }

  const i = posts.findIndex(p => p.id === id);
  if (i === -1) { room.innerHTML = "<p class=\"on-loan\">no object under that accession number.</p>"; return; }

  const post = posts[i];
  const total = posts.length;
  document.title = `${accession(post.meta, i, total)} · ${post.meta.title}`;
  const prev = posts[i + 1];
  const next = posts[i - 1];

  room.innerHTML = `
    <aside class="label pinned">${labelHTML(post, i, total, "h1")}
      <nav class="case-nav">
        ${prev ? `<a href="post_viewer.html?postid=${prev.id}">&larr; previous case</a>` : ""}
        ${next ? `<a href="post_viewer.html?postid=${next.id}">next case &rarr;</a>` : ""}
        <a href="index.html">back to the gallery</a>
      </nav>
    </aside>
    <div class="object"></div>
  `;
  room.querySelector(".object").appendChild(post.content.cloneNode(true));
}

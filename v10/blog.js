// v10 — Card Catalogue. Essays are index cards riding a brass rod.
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

function callNumber(post, i, total) {
  // shelved like a real card: author-less, subject shelfmark
  const tag = (post.meta.tags[0] || "misc").slice(0, 3).toUpperCase();
  return `${tag} ${post.meta.date.replaceAll("-", ".")} · card ${total - i}/${total}`;
}

/* ---------- index: the open drawer ---------- */
async function initDrawer() {
  const drawer = document.getElementById("drawer");
  let posts;
  try { posts = await loadAll(); }
  catch (e) {
    drawer.innerHTML = "<p class=\"misfiled\">the drawer jams — a card is misfiled.</p>";
    return;
  }
  const total = posts.length;

  posts.forEach((post, i) => {
    const card = document.createElement("article");
    card.className = "card";
    card.innerHTML = `
      <p class="rule-top">${callNumber(post, i, total)}</p>
      <h2 class="card-title"><a href="post_viewer.html?postid=${post.id}">${post.meta.title}</a></h2>
      <div class="card-body"></div>
      <p class="see-also">see: ${post.meta.tags.join(", ")} · <a href="post_viewer.html?postid=${post.id}">pull this card &rarr;</a></p>
    `;
    card.querySelector(".card-body").appendChild(previewOf(post.content));
    drawer.appendChild(card);
  });
}

/* ---------- post page: the pulled card ---------- */
async function initCard() {
  const id = new URLSearchParams(location.search).get("postid");
  const tray = document.getElementById("tray");
  let posts;
  try { posts = await loadAll(); }
  catch (e) { tray.innerHTML = "<p class=\"misfiled\">the drawer jams.</p>"; return; }

  const i = posts.findIndex(p => p.id === id);
  if (i === -1) { tray.innerHTML = "<p class=\"misfiled\">no card under that heading — misfiled, perhaps forever.</p>"; return; }

  const post = posts[i];
  const total = posts.length;
  document.title = `my ivory tower · ${post.meta.title.toLowerCase()} (pulled card)`;
  const older = posts[i + 1];
  const newer = posts[i - 1];

  tray.innerHTML = `
    <article class="card pulled">
      <p class="rule-top">${callNumber(post, i, total)}</p>
      <h1 class="card-title">${post.meta.title}</h1>
      <div class="card-body"></div>
      <p class="see-also">see: ${post.meta.tags.join(", ")}</p>
    </article>
    <nav class="rod-nav">
      ${older ? `<a href="post_viewer.html?postid=${older.id}">&larr; card behind, ${older.meta.title.toLowerCase()}</a>` : "<span class=\"misfiled\">front of the drawer</span>"}
      ${newer ? `<a href="post_viewer.html?postid=${newer.id}">card in front, ${newer.meta.title.toLowerCase()} &rarr;</a>` : "<span class=\"misfiled\">back of the drawer</span>"}
    </nav>
  `;
  tray.querySelector(".card-body").appendChild(post.content.cloneNode(true));
}

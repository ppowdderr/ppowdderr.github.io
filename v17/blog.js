// v17 — Punch Card. Each essay is a card in the deck; the full text prints as a listing.
const postFiles = [
  "on-walking.html",
  "on-boredom.html",
  "on-rereading.html"
];

const COLUMNS = 24; // punch columns rendered per card

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

// deterministic punch pattern from the slug — the essay "encoded"
function punchesOf(id) {
  let h = 2166136261;
  const rows = [];
  for (let c = 0; c < COLUMNS; c++) {
    h ^= id.charCodeAt(c % id.length) + c;
    h = Math.imul(h, 16777619) >>> 0;
    rows.push(h % 12); // one punch per column, rows 0..11
  }
  return rows;
}

function cardHTML(post, i, total) {
  const punches = punchesOf(post.id);
  const holes = punches.map((r, c) =>
    `<span class="hole" style="--c:${c};--r:${r}" aria-hidden="true"></span>`
  ).join("");
  return `
    <a class="card" href="post_viewer.html?postid=${post.id}">
      <span class="corner" aria-hidden="true"></span>
      <span class="card-head">
        <span class="seq">CARD ${String(total - i).padStart(4, "0")}</span>
        <span class="card-title">${post.meta.title.toUpperCase()}</span>
        <span class="card-date">${post.meta.date.replaceAll("-", "/")}</span>
      </span>
      <span class="field" aria-hidden="true">${holes}</span>
      <span class="interpret">${post.content.textContent.trim().split(/\s+/).slice(0, 18).join(" ").toUpperCase()}&hellip;</span>
    </a>
  `;
}

/* ---------- index: the deck ---------- */
async function initDeck() {
  const deck = document.getElementById("deck");
  let posts;
  try { posts = await loadAll(); }
  catch (e) {
    deck.innerHTML = "<p class=\"jam\">READER JAM — THE DECK COULD NOT BE FED.</p>";
    return;
  }
  const total = posts.length;
  deck.innerHTML = posts.map((p, i) => cardHTML(p, i, total)).join("");
  document.getElementById("deck-note").textContent =
    `DECK IVORYTWR · ${total} CARDS · DO NOT FOLD, SPINDLE, OR MUTILATE`;
}

/* ---------- post page: the listing ---------- */
async function initListing() {
  const id = new URLSearchParams(location.search).get("postid");
  const out = document.getElementById("printout");
  let posts;
  try { posts = await loadAll(); }
  catch (e) { out.innerHTML = "<p class=\"jam\">READER JAM.</p>"; return; }

  const i = posts.findIndex(p => p.id === id);
  if (i === -1) { out.innerHTML = "<p class=\"jam\">CARD NOT IN DECK — CHECK SEQUENCE NUMBER.</p>"; return; }

  const post = posts[i];
  const total = posts.length;
  document.title = `my ivory tower · card ${String(total - i).padStart(4, "0")} listing`;
  const older = posts[i + 1];
  const newer = posts[i - 1];

  out.innerHTML = `
    <article class="listing">
      <p class="job-line">// JOB IVORYTWR · CARD ${String(total - i).padStart(4, "0")} · ${post.meta.date} ${post.meta.time || ""} · ${post.meta.tags.join(",").toUpperCase()}</p>
      <h1 class="listing-title">${post.meta.title}</h1>
      <div class="listing-body"></div>
      <p class="job-line end">// END OF LISTING</p>
      <nav class="feed">
        ${older ? `<a href="post_viewer.html?postid=${older.id}">&larr; FEED PREVIOUS CARD: ${older.meta.title.toUpperCase()}</a>` : "<span class=\"jam\">FIRST CARD IN DECK</span>"}
        ${newer ? `<a href="post_viewer.html?postid=${newer.id}">FEED NEXT CARD: ${newer.meta.title.toUpperCase()} &rarr;</a>` : "<span class=\"jam\">LAST CARD IN DECK</span>"}
      </nav>
    </article>
  `;
  out.querySelector(".listing-body").appendChild(post.content.cloneNode(true));
}

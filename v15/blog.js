// v15 — Almanac. The year's entries kept as a farmer's ledger table.
const postFiles = [
  "on-walking.html",
  "on-boredom.html",
  "on-rereading.html"
];

const MOONS = ["\u{1F311}", "\u{1F312}", "\u{1F313}", "\u{1F314}", "\u{1F315}", "\u{1F316}", "\u{1F317}", "\u{1F318}"];

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

// a fanciful but deterministic moon phase from the date
function moonOf(meta) {
  const d = new Date(meta.date + "T00:00:00Z");
  const days = Math.floor(d.getTime() / 86400000);
  return MOONS[Math.floor(((days % 29.53) / 29.53) * 8) % 8];
}

function season(meta) {
  const m = Number(meta.date.slice(5, 7));
  if (m <= 2 || m === 12) return "deep winter";
  if (m <= 5) return "sowing";
  if (m <= 8) return "high summer";
  return "harvest";
}

/* ---------- index: the year's table ---------- */
let currentSort = { key: "date", dir: -1 };
let almanacPosts = [];

function rowsHTML() {
  const sorted = [...almanacPosts].sort((a, b) => {
    let va, vb;
    if (currentSort.key === "date") { va = a.meta.date; vb = b.meta.date; }
    else if (currentSort.key === "entry") { va = a.meta.title.toLowerCase(); vb = b.meta.title.toLowerCase(); }
    else { va = words(a.content); vb = words(b.content); }
    return (va < vb ? -1 : va > vb ? 1 : 0) * currentSort.dir;
  });
  return sorted.map(p => `
    <tr>
      <td class="c-date">${p.meta.date}</td>
      <td class="c-moon" aria-label="phase of the moon">${moonOf(p.meta)}</td>
      <td class="c-entry"><a href="post_viewer.html?postid=${p.id}">${p.meta.title}</a></td>
      <td class="c-season">${season(p.meta)}</td>
      <td class="c-length">${words(p.content).toLocaleString()} w.</td>
    </tr>
  `).join("");
}

function renderTable() {
  document.getElementById("rows").innerHTML = rowsHTML();
  document.querySelectorAll("th button").forEach(btn => {
    const active = btn.dataset.key === currentSort.key;
    btn.setAttribute("aria-sort", active ? (currentSort.dir === 1 ? "ascending" : "descending") : "none");
    btn.querySelector(".dir").textContent = active ? (currentSort.dir === 1 ? " \u2191" : " \u2193") : "";
  });
}

async function initAlmanac() {
  const table = document.getElementById("ledger");
  try { almanacPosts = await loadAll(); }
  catch (e) {
    table.outerHTML = "<p class=\"weathered\">the year's pages are water-damaged — the table cannot be read.</p>";
    return;
  }
  renderTable();
  document.querySelectorAll("th button").forEach(btn => {
    btn.addEventListener("click", () => {
      if (currentSort.key === btn.dataset.key) currentSort.dir *= -1;
      else currentSort = { key: btn.dataset.key, dir: btn.dataset.key === "entry" ? 1 : -1 };
      renderTable();
    });
  });
}

/* ---------- post page: the day's entry ---------- */
async function initEntry() {
  const id = new URLSearchParams(location.search).get("postid");
  const page = document.getElementById("day");
  let posts;
  try { posts = await loadAll(); }
  catch (e) { page.innerHTML = "<p class=\"weathered\">the year's pages are water-damaged.</p>"; return; }

  const i = posts.findIndex(p => p.id === id);
  if (i === -1) { page.innerHTML = "<p class=\"weathered\">no entry was kept for that day.</p>"; return; }

  const post = posts[i];
  document.title = `my ivory tower · ${post.meta.date}, ${post.meta.title.toLowerCase()}`;
  const older = posts[i + 1];
  const newer = posts[i - 1];

  page.innerHTML = `
    <p class="conditions">${post.meta.date} · ${moonOf(post.meta)} · ${season(post.meta)} · ${post.meta.tags.join(", ")}</p>
    <h1 class="entry-title">${post.meta.title}</h1>
    <div class="entry-body"></div>
    <nav class="turn">
      ${older ? `<a href="post_viewer.html?postid=${older.id}">&larr; an earlier day: ${older.meta.title.toLowerCase()}</a>` : "<span class=\"weathered\">the first entry of the year</span>"}
      ${newer ? `<a href="post_viewer.html?postid=${newer.id}">a later day: ${newer.meta.title.toLowerCase()} &rarr;</a>` : "<span class=\"weathered\">the most recent entry</span>"}
    </nav>
  `;
  page.querySelector(".entry-body").appendChild(post.content.cloneNode(true));
}

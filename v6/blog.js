// v6 — The Tower. Reading is climbing.
const postFiles = [
  "on-walking.html",
  "on-boredom.html",
  "on-rereading.html"
];

const STOREY_HEIGHT_M = 3.4;

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

/* ---------- index: the section drawing ---------- */
async function initTower() {
  let posts;
  try { posts = await loadAll(); }
  catch (e) {
    document.getElementById("shaft").innerHTML =
      "<p class=\"collapse\">a storey has collapsed; the stair is closed.</p>";
    return;
  }
  const total = posts.length;
  const shaft = document.getElementById("shaft");

  posts.forEach((post, i) => {
    const storeyNo = total - i; // newest = top floor
    const floor = document.createElement("section");
    floor.className = "storey";
    floor.dataset.storey = storeyNo;
    floor.innerHTML = `
      <div class="storey-plate">
        <span class="storey-no">${storeyNo}</span>
        <span class="storey-date">${fmtDate(post.meta)}</span>
      </div>
      <div class="storey-room">
        <h2 class="storey-title"><a href="post_viewer.html?postid=${post.id}">${post.meta.title}</a></h2>
        <div class="storey-body"></div>
        <a class="stair" href="post_viewer.html?postid=${post.id}">enter this storey &rarr;</a>
      </div>
    `;
    floor.querySelector(".storey-body").appendChild(previewOf(post.content));
    shaft.appendChild(floor);
  });

  const ground = document.createElement("div");
  ground.className = "ground";
  ground.innerHTML = `<span>ground &mdash; ${total} storeys &middot; ${(total * STOREY_HEIGHT_M).toFixed(0)} m</span>`;
  shaft.appendChild(ground);

  // altimeter
  const alt = document.getElementById("altimeter");
  const storeys = Array.from(document.querySelectorAll(".storey"));
  function readAltitude() {
    const mid = window.innerHeight / 2;
    let current = storeys[0];
    for (const s of storeys) {
      const r = s.getBoundingClientRect();
      if (r.top <= mid && r.bottom >= mid) { current = s; break; }
      if (r.top <= mid) current = s;
    }
    const n = Number(current.dataset.storey);
    alt.textContent = `storey ${n} of ${total} · ${(n * STOREY_HEIGHT_M).toFixed(1)} m`;
  }
  document.addEventListener("scroll", readAltitude, { passive: true });
  readAltitude();
}

/* ---------- post page: one storey ---------- */
async function initStorey() {
  const id = new URLSearchParams(location.search).get("postid");
  const room = document.getElementById("room");
  let posts;
  try { posts = await loadAll(); }
  catch (e) { room.innerHTML = "<p class=\"collapse\">the stair is closed.</p>"; return; }

  const i = posts.findIndex(p => p.id === id);
  if (i === -1) { room.innerHTML = "<p class=\"collapse\">no such storey in this tower.</p>"; return; }

  const post = posts[i];
  const total = posts.length;
  const storeyNo = total - i;
  const above = posts[i - 1]; // newer = higher
  const below = posts[i + 1];

  document.title = `storey ${storeyNo} · ${post.meta.title}`;
  room.innerHTML = `
    <div class="storey-plate">
      <span class="storey-no">${storeyNo}</span>
      <span class="storey-date">${fmtDate(post.meta)} · ${post.meta.tags.join(" · ")}</span>
    </div>
    <h1 class="storey-title">${post.meta.title}</h1>
    <div class="storey-body full"></div>
    <nav class="stairwell">
      ${above ? `<a class="stair up" href="post_viewer.html?postid=${above.id}">&uarr; up to ${above.meta.title}</a>` : `<span class="stair roof">the roof &mdash; nothing above yet</span>`}
      ${below ? `<a class="stair down" href="post_viewer.html?postid=${below.id}">&darr; down to ${below.meta.title}</a>` : `<span class="stair roof">bedrock &mdash; the first storey</span>`}
    </nav>
  `;
  room.querySelector(".storey-body").appendChild(post.content.cloneNode(true));
  document.getElementById("altimeter").textContent =
    `storey ${storeyNo} of ${total} · ${(storeyNo * STOREY_HEIGHT_M).toFixed(1)} m`;

  document.addEventListener("keydown", (e) => {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    const t = document.activeElement && document.activeElement.tagName;
    if (t === "INPUT" || t === "TEXTAREA") return;
    if (!e.shiftKey) return; // plain arrows keep scrolling the storey
    if (e.key === "ArrowUp" && above) { e.preventDefault(); location.href = `post_viewer.html?postid=${above.id}`; }
    if (e.key === "ArrowDown" && below) { e.preventDefault(); location.href = `post_viewer.html?postid=${below.id}`; }
  });
}

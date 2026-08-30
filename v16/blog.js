// v16 — Star Chart. Essays are stars fixed on a night sky, joined as one constellation.
const postFiles = [
  "on-walking.html",
  "on-boredom.html",
  "on-rereading.html"
];

const BAYER = ["\u03b1", "\u03b2", "\u03b3", "\u03b4", "\u03b5", "\u03b6", "\u03b7", "\u03b8"];

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

// deterministic position from the slug, kept away from the edges
function positionOf(id) {
  let h = 2166136261;
  for (const ch of id) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619) >>> 0; }
  const x = 12 + (h % 1000) / 1000 * 76;            // 12%..88%
  const y = 14 + ((Math.floor(h / 1000)) % 1000) / 1000 * 64; // 14%..78%
  return { x: Math.round(x * 10) / 10, y: Math.round(y * 10) / 10 };
}

function magnitude(i) {
  // newest essay shines brightest
  return Math.min(i, 3);
}

/* ---------- index: the chart ---------- */
async function initChart() {
  const sky = document.getElementById("sky");
  const legend = document.getElementById("legend");
  let posts;
  try { posts = await loadAll(); }
  catch (e) {
    legend.innerHTML = "<p class=\"overcast\">the sky is overcast — no stars could be plotted.</p>";
    return;
  }

  const placed = posts.map((p, i) => ({ ...p, pos: positionOf(p.id), mag: magnitude(i), bayer: BAYER[i % BAYER.length] }));

  // constellation lines connect the stars in order of writing (SVG, no libs)
  const linePts = placed.map(p => `${p.pos.x},${p.pos.y}`).join(" ");
  sky.insertAdjacentHTML("afterbegin",
    `<svg class="lines" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">` +
    `<polyline points="${linePts}" /></svg>`);

  placed.forEach(p => {
    const star = document.createElement("a");
    star.className = "star";
    star.href = `post_viewer.html?postid=${p.id}`;
    star.style.setProperty("--x", p.pos.x + "%");
    star.style.setProperty("--y", p.pos.y + "%");
    star.style.setProperty("--mag", p.mag);
    star.setAttribute("aria-label", `${p.bayer} Tur, ${p.meta.title}`);
    star.innerHTML = `<span class="point" aria-hidden="true"></span>` +
      `<span class="designation">${p.bayer} Tur &middot; ${p.meta.title.toLowerCase()}</span>`;
    sky.appendChild(star);
  });

  legend.innerHTML = `<p class="legend-note">the constellation Turris Eburnea · ${placed.length} stars charted · lines join them in order of writing</p>` +
    placed.map(p =>
      `<p class="legend-row"><span class="bayer">${p.bayer} Tur</span> ` +
      `<a href="post_viewer.html?postid=${p.id}">${p.meta.title}</a> ` +
      `<span class="epoch">· epoch ${p.meta.date}</span></p>`
    ).join("");
}

/* ---------- post page: the star observed ---------- */
async function initObservation() {
  const id = new URLSearchParams(location.search).get("postid");
  const obs = document.getElementById("observation");
  let posts;
  try { posts = await loadAll(); }
  catch (e) { obs.innerHTML = "<p class=\"overcast\">the sky is overcast.</p>"; return; }

  const i = posts.findIndex(p => p.id === id);
  if (i === -1) { obs.innerHTML = "<p class=\"overcast\">no star is charted under that name.</p>"; return; }

  const post = posts[i];
  const bayer = BAYER[i % BAYER.length];
  document.title = `my ivory tower · ${bayer} Tur, ${post.meta.title.toLowerCase()}`;
  const older = posts[i + 1];
  const newer = posts[i - 1];

  obs.innerHTML = `
    <p class="plate-label">${bayer} Turris Eburneae · epoch ${post.meta.date} ${post.meta.time || ""} · ${post.meta.tags.join(" · ")}</p>
    <h1 class="obs-title">${post.meta.title}</h1>
    <div class="obs-body"></div>
    <nav class="sweep">
      ${older ? `<a href="post_viewer.html?postid=${older.id}">&larr; sweep to ${BAYER[(i + 1) % BAYER.length]} Tur, ${older.meta.title.toLowerCase()}</a>` : "<span class=\"overcast\">the first star charted</span>"}
      ${newer ? `<a href="post_viewer.html?postid=${newer.id}">sweep to ${BAYER[(i - 1 + BAYER.length) % BAYER.length]} Tur, ${newer.meta.title.toLowerCase()} &rarr;</a>` : "<span class=\"overcast\">the newest star</span>"}
    </nav>
  `;
  obs.querySelector(".obs-body").appendChild(post.content.cloneNode(true));
}

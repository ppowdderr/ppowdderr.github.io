// v18 — The Bone Orrery. Essays are ivory moons in orbit around a dark sun.
const postFiles = [
  "on-walking.html",
  "on-boredom.html",
  "on-rereading.html"
];

const HOUSES = ["the first orbit", "the second orbit", "the third orbit", "the fourth orbit", "the fifth orbit", "the sixth orbit"];
const SIGILS = ["\u263e", "\u2726", "\u2609", "\u2727", "\u263d", "\u2735"];

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

// deterministic starting angle from the slug
function angleOf(id) {
  let h = 2166136261;
  for (const ch of id) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619) >>> 0; }
  return h % 360;
}

function previewOf(content) {
  const clone = content.cloneNode(true);
  const cut = clone.querySelector("[data-cut]");
  if (cut) {
    let node = cut;
    while (node && node !== clone) {
      let next = node.nextSibling;
      let parent = node.parentNode;
      node.remove();
      while (!next && parent && parent !== clone) { next = parent.nextSibling; parent = parent.parentNode; }
      node = next;
    }
  }
  return clone;
}

/* ---------- index: the orrery ---------- */
async function initOrrery() {
  const orrery = document.getElementById("orrery");
  const ephemeris = document.getElementById("ephemeris");
  let posts;
  try { posts = await loadAll(); }
  catch (e) {
    ephemeris.innerHTML = "<p class=\"turning\">the mechanism has seized &mdash; the moons cannot be read tonight.</p>";
    return;
  }

  posts.forEach((post, i) => {
    const ring = document.createElement("div");
    ring.className = "ring";
    ring.style.setProperty("--i", i);
    ring.style.setProperty("--n", posts.length);
    ring.style.setProperty("--a", angleOf(post.id) + "deg");
    const moon = document.createElement("a");
    moon.className = "moon";
    moon.href = `post_viewer.html?postid=${post.id}`;
    moon.setAttribute("aria-label", `${post.meta.title}, ${HOUSES[i % HOUSES.length]}`);
    moon.innerHTML = `<span class="moon-inner"><span class="disc" aria-hidden="true">${SIGILS[i % SIGILS.length]}</span>` +
      `<span class="moon-name">${post.meta.title.toLowerCase()}</span></span>`;
    ring.appendChild(moon);
    orrery.appendChild(ring);
  });

  ephemeris.innerHTML = `<p class="eph-note">ephemeris &middot; ${posts.length} moons held &middot; the innermost is the newest carving</p>` +
    posts.map((post, i) => {
      const entry = document.createElement("section");
      entry.className = "eph-entry";
      entry.innerHTML = `
        <p class="eph-orbit">${SIGILS[i % SIGILS.length]} ${HOUSES[i % HOUSES.length]} &middot; carved ${post.meta.date}${post.meta.time ? " · " + post.meta.time : ""} &middot; ${post.meta.tags.join(" · ")}</p>
        <h2 class="eph-title"><a href="post_viewer.html?postid=${post.id}">${post.meta.title}</a></h2>
        <div class="eph-body"></div>
        <a class="descend" href="post_viewer.html?postid=${post.id}">descend into this moon &rarr;</a>`;
      entry.querySelector(".eph-body").appendChild(previewOf(post.content));
      return entry.outerHTML;
    }).join("");
}

/* ---------- post page: inside the moon ---------- */
async function initChamber() {
  const id = new URLSearchParams(location.search).get("postid");
  const chamber = document.getElementById("chamber");
  let posts;
  try { posts = await loadAll(); }
  catch (e) { chamber.innerHTML = "<p class=\"turning\">the mechanism has seized.</p>"; return; }

  const i = posts.findIndex(p => p.id === id);
  if (i === -1) { chamber.innerHTML = "<p class=\"turning\">no moon is held under that name.</p>"; return; }

  const post = posts[i];
  document.title = `ivory tower · ${post.meta.title.toLowerCase()}`;
  const older = posts[i + 1];
  const newer = posts[i - 1];

  chamber.innerHTML = `
    <p class="orbit-label">${SIGILS[i % SIGILS.length]} ${HOUSES[i % HOUSES.length]} &middot; carved ${post.meta.date}${post.meta.time ? " · " + post.meta.time : ""} &middot; ${post.meta.tags.join(" · ")}</p>
    <h1 class="chamber-title">${post.meta.title}</h1>
    <div class="chamber-body"></div>
    <nav class="orbits">
      ${older ? `<a href="post_viewer.html?postid=${older.id}">&larr; the outer moon, ${older.meta.title.toLowerCase()}</a>` : "<span class=\"turning\">the outermost moon</span>"}
      ${newer ? `<a href="post_viewer.html?postid=${newer.id}">the inner moon, ${newer.meta.title.toLowerCase()} &rarr;</a>` : "<span class=\"turning\">the innermost moon</span>"}
    </nav>
  `;
  chamber.querySelector(".chamber-body").appendChild(post.content.cloneNode(true));
}

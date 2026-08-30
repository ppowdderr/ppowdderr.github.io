// v19 — The Gate of Ivory. Essays are dreams sealed behind a pair of ivory doors.
const postFiles = [
  "on-walking.html",
  "on-boredom.html",
  "on-rereading.html"
];

const NUMERALS = ["i", "ii", "iii", "iv", "v", "vi", "vii", "viii", "ix", "x", "xi", "xii"];

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

// deterministic sigil rotation from the slug
function sigilTurn(id) {
  let h = 0;
  for (const ch of id) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
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

/* ---------- index: before the gate ---------- */
async function initGate() {
  const dreams = document.getElementById("dreams");
  let posts;
  try { posts = await loadAll(); }
  catch (e) {
    dreams.innerHTML = "<p class=\"hush\">the gate will not open tonight &mdash; the dreams stay on their side.</p>";
    return;
  }

  dreams.innerHTML = `<p class="keeper-note">${posts.length} dreams kept &middot; the newest waits nearest the seam</p>` +
    posts.map((post, i) => {
      const entry = document.createElement("section");
      entry.className = "seal";
      entry.innerHTML = `
        <a class="sigil" href="post_viewer.html?postid=${post.id}" aria-label="pass through: ${post.meta.title}">
          <span class="sigil-ring" style="--turn:${sigilTurn(post.id)}deg" aria-hidden="true"></span>
          <span class="sigil-numeral" aria-hidden="true">${NUMERALS[i % NUMERALS.length]}</span>
        </a>
        <div class="seal-text">
          <p class="dreamt">dream ${NUMERALS[i % NUMERALS.length]} &middot; dreamt ${post.meta.date}${post.meta.time ? " · " + post.meta.time : ""} &middot; ${post.meta.tags.join(" · ")}</p>
          <h2 class="seal-title"><a href="post_viewer.html?postid=${post.id}">${post.meta.title}</a></h2>
          <div class="seal-body"></div>
          <a class="pass" href="post_viewer.html?postid=${post.id}">pass through the gate &rarr;</a>
        </div>`;
      entry.querySelector(".seal-body").appendChild(previewOf(post.content));
      return entry.outerHTML;
    }).join("");
}

/* ---------- post page: the dream, passing ---------- */
async function initDream() {
  const id = new URLSearchParams(location.search).get("postid");
  const dream = document.getElementById("dream");
  let posts;
  try { posts = await loadAll(); }
  catch (e) { dream.innerHTML = "<p class=\"hush\">the gate will not open tonight.</p>"; return; }

  const i = posts.findIndex(p => p.id === id);
  if (i === -1) { dream.innerHTML = "<p class=\"hush\">no dream is kept under that seal.</p>"; return; }

  const post = posts[i];
  document.title = `ivory tower · ${post.meta.title.toLowerCase()}`;
  const older = posts[i + 1];
  const newer = posts[i - 1];

  dream.innerHTML = `
    <p class="dreamt centered">dream ${NUMERALS[i % NUMERALS.length]} &middot; dreamt ${post.meta.date}${post.meta.time ? " · " + post.meta.time : ""} &middot; ${post.meta.tags.join(" · ")}</p>
    <h1 class="dream-title">${post.meta.title}</h1>
    <div class="dream-body"></div>
    <p class="wake">&mdash; and here the dream lets go of you &mdash;</p>
    <nav class="thresholds">
      ${older ? `<a href="post_viewer.html?postid=${older.id}">&larr; an earlier dream, ${older.meta.title.toLowerCase()}</a>` : "<span class=\"hush\">the oldest dream kept</span>"}
      ${newer ? `<a href="post_viewer.html?postid=${newer.id}">a later dream, ${newer.meta.title.toLowerCase()} &rarr;</a>` : "<span class=\"hush\">the newest dream</span>"}
    </nav>
  `;
  dream.querySelector(".dream-body").appendChild(post.content.cloneNode(true));
}

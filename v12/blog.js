// v12 — Teleprinter. Essays arrive as telegram transmissions.
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

function serial(post, i, total) {
  return `MSG ${String(total - i).padStart(3, "0")}`;
}

function routing(post, i, total) {
  const d = post.meta.date.replaceAll("-", "");
  return `ZCZC ${serial(post, i, total)} · IVRYTWR ${d} ${post.meta.time || "0000"}Z · VIA ${post.meta.tags.join("/").toUpperCase()}`;
}

/* ---------- filtering (the wire filter) ---------- */
function applyFilter(q) {
  const needle = q.trim().toLowerCase();
  let shown = 0;
  document.querySelectorAll(".transmission").forEach(t => {
    const hit = !needle || t.dataset.haystack.includes(needle);
    t.hidden = !hit;
    if (hit) shown++;
  });
  const status = document.getElementById("wire-status");
  if (status) {
    status.textContent = needle
      ? `${shown} transmission${shown === 1 ? "" : "s"} match "${needle.toUpperCase()}"`
      : `${shown} transmissions on the wire`;
  }
}

/* ---------- index: the feed ---------- */
async function initWire() {
  const wire = document.getElementById("wire");
  let posts;
  try { posts = await loadAll(); }
  catch (e) {
    wire.innerHTML = "<p class=\"garbled\">LINE DOWN STOP TRANSMISSION GARBLED STOP TRY AGAIN LATER NNNN</p>";
    return;
  }
  const total = posts.length;

  posts.forEach((post, i) => {
    const t = document.createElement("article");
    t.className = "transmission";
    t.dataset.haystack = (post.meta.title + " " + post.meta.tags.join(" ") + " " + post.content.textContent).toLowerCase();
    t.innerHTML = `
      <p class="routing">${routing(post, i, total)}</p>
      <h2 class="subject"><a href="post_viewer.html?postid=${post.id}">${post.meta.title.toUpperCase()}</a></h2>
      <div class="tape"></div>
      <p class="endmark">MESSAGE CONTINUES STOP <a href="post_viewer.html?postid=${post.id}">REQUEST FULL TRANSMISSION</a></p>
    `;
    t.querySelector(".tape").appendChild(previewOf(post.content));
    wire.appendChild(t);
  });

  applyFilter("");
  const input = document.getElementById("filter");
  input.addEventListener("input", () => applyFilter(input.value));
  // "/" focuses the filter, like a command palette
  document.addEventListener("keydown", (e) => {
    if (e.key === "/" && document.activeElement !== input) {
      e.preventDefault();
      input.focus();
    }
    if (e.key === "Escape" && document.activeElement === input) {
      input.value = "";
      applyFilter("");
      input.blur();
    }
  });
}

/* ---------- post page: the full transmission ---------- */
async function initTransmission() {
  const id = new URLSearchParams(location.search).get("postid");
  const wire = document.getElementById("wire");
  let posts;
  try { posts = await loadAll(); }
  catch (e) { wire.innerHTML = "<p class=\"garbled\">LINE DOWN STOP NNNN</p>"; return; }

  const i = posts.findIndex(p => p.id === id);
  if (i === -1) { wire.innerHTML = "<p class=\"garbled\">NO SUCH MESSAGE STOP CHECK SERIAL STOP NNNN</p>"; return; }

  const post = posts[i];
  const total = posts.length;
  document.title = `my ivory tower · ${serial(post, i, total)} ${post.meta.title.toUpperCase()}`;
  const older = posts[i + 1];
  const newer = posts[i - 1];

  wire.innerHTML = `
    <article class="transmission full">
      <p class="routing">${routing(post, i, total)}</p>
      <h1 class="subject">${post.meta.title.toUpperCase()}</h1>
      <div class="tape"></div>
      <p class="endmark">END OF MESSAGE STOP NNNN</p>
      <nav class="reroute">
        ${older ? `<a href="post_viewer.html?postid=${older.id}">PREVIOUS ON WIRE: ${older.meta.title.toUpperCase()}</a>` : "<span class=\"garbled\">FIRST MESSAGE ON FILE</span>"}
        ${newer ? `<a href="post_viewer.html?postid=${newer.id}">NEXT ON WIRE: ${newer.meta.title.toUpperCase()}</a>` : "<span class=\"garbled\">LATEST MESSAGE</span>"}
      </nav>
    </article>
  `;
  wire.querySelector(".tape").appendChild(post.content.cloneNode(true));
}

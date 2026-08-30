// v13 — Contact Sheet. Essays are frames on a strip of 35mm film.
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

function firstWords(content, n) {
  return content.textContent.trim().split(/\s+/).slice(0, n).join(" ");
}

function frameNo(i, total) {
  return String(total - i).padStart(2, "0");
}

/* ---------- index: the sheet ---------- */
async function initSheet() {
  const strip = document.getElementById("strip");
  let posts;
  try { posts = await loadAll(); }
  catch (e) {
    strip.innerHTML = "<p class=\"fogged\">the negatives are fogged — nothing developed.</p>";
    return;
  }
  const total = posts.length;

  posts.forEach((post, i) => {
    const frame = document.createElement("article");
    frame.className = "frame";
    frame.innerHTML = `
      <a class="frame-window" href="post_viewer.html?postid=${post.id}">
        <span class="frame-glimpse">${firstWords(post.content, 26)}&hellip;</span>
      </a>
      <p class="frame-edge"><span class="frame-no">&#9654; ${frameNo(i, total)}A</span> ${post.meta.title.toLowerCase()} · ${post.meta.date}</p>
    `;
    strip.appendChild(frame);
  });

  document.getElementById("sheet-note").textContent =
    `IVORY TWR · ${total} exposures · marked frames are printed below`;
}

/* ---------- post page: the print ---------- */
async function initPrint() {
  const id = new URLSearchParams(location.search).get("postid");
  const dark = document.getElementById("darkroom");
  let posts;
  try { posts = await loadAll(); }
  catch (e) { dark.innerHTML = "<p class=\"fogged\">the negatives are fogged.</p>"; return; }

  const i = posts.findIndex(p => p.id === id);
  if (i === -1) { dark.innerHTML = "<p class=\"fogged\">that frame was never exposed.</p>"; return; }

  const post = posts[i];
  const total = posts.length;
  document.title = `my ivory tower · frame ${frameNo(i, total)}A, printed`;
  const older = posts[i + 1];
  const newer = posts[i - 1];

  dark.innerHTML = `
    <article class="print">
      <p class="frame-edge on-print">&#9654; ${frameNo(i, total)}A · ${post.meta.date} ${post.meta.time || ""} · ${post.meta.tags.join(" / ")}</p>
      <h1 class="print-title">${post.meta.title}</h1>
      <div class="print-body"></div>
      <nav class="strip-nav">
        ${older ? `<a href="post_viewer.html?postid=${older.id}">&larr; frame ${frameNo(i + 1, total)}A, ${older.meta.title.toLowerCase()}</a>` : "<span class=\"fogged\">start of the roll</span>"}
        ${newer ? `<a href="post_viewer.html?postid=${newer.id}">frame ${frameNo(i - 1, total)}A, ${newer.meta.title.toLowerCase()} &rarr;</a>` : "<span class=\"fogged\">end of the roll</span>"}
      </nav>
    </article>
  `;
  dark.querySelector(".print-body").appendChild(post.content.cloneNode(true));
}

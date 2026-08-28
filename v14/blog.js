// v14 — Endgame. Essays are ivory pieces standing on a chess diagram.
const postFiles = [
  "on-walking.html",
  "on-boredom.html",
  "on-rereading.html"
];

const BOARD = 8;
const PIECES = ["\u2654", "\u2655", "\u2656", "\u2657", "\u2658", "\u2659"]; // K Q R B N P

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

// deterministic square from the slug: same essay always stands on the same square
function squareOf(id, taken) {
  let h = 0;
  for (const ch of id) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  let idx = h % (BOARD * BOARD);
  while (taken.has(idx)) idx = (idx + 13) % (BOARD * BOARD);
  taken.add(idx);
  return idx;
}

function algebraic(idx) {
  const file = "abcdefgh"[idx % BOARD];
  const rank = BOARD - Math.floor(idx / BOARD);
  return file + rank;
}

function placePosts(posts) {
  const taken = new Set();
  return posts.map((post, i) => ({
    ...post,
    square: squareOf(post.id, taken),
    piece: PIECES[i % PIECES.length]
  }));
}

/* ---------- index: the diagram ---------- */
async function initBoard() {
  const board = document.getElementById("board");
  const caption = document.getElementById("caption");
  let posts;
  try { posts = placePosts(await loadAll()); }
  catch (e) {
    caption.innerHTML = "<p class=\"resigned\">the position is lost — the pieces would not load.</p>";
    return;
  }

  const bySquare = new Map(posts.map(p => [p.square, p]));
  const cells = [];

  for (let idx = 0; idx < BOARD * BOARD; idx++) {
    const dark = (Math.floor(idx / BOARD) + idx) % 2 === 1;
    const p = bySquare.get(idx);
    if (p) {
      cells.push(
        `<a class="sq ${dark ? "dark" : "light"} occupied" href="post_viewer.html?postid=${p.id}" ` +
        `aria-label="${p.meta.title}, on ${algebraic(idx)}" data-square="${algebraic(idx)}">` +
        `<span class="piece">${p.piece}</span></a>`
      );
    } else {
      cells.push(`<span class="sq ${dark ? "dark" : "light"}" aria-hidden="true"></span>`);
    }
  }
  board.innerHTML = cells.join("");

  caption.innerHTML = posts.map(p =>
    `<p class="move"><span class="coord">${algebraic(p.square)}</span> ` +
    `<a href="post_viewer.html?postid=${p.id}">${p.meta.title}</a> ` +
    `<span class="when">· ${p.meta.date}</span></p>`
  ).join("");

  // arrow keys walk the occupied squares in reading order
  const links = [...board.querySelectorAll("a.sq")];
  board.addEventListener("keydown", (e) => {
    const at = links.indexOf(document.activeElement);
    if (at === -1) return;
    if (e.key === "ArrowRight" || e.key === "ArrowDown") {
      e.preventDefault();
      links[(at + 1) % links.length].focus();
    }
    if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
      e.preventDefault();
      links[(at - 1 + links.length) % links.length].focus();
    }
  });
}

/* ---------- post page: the piece examined ---------- */
async function initPiece() {
  const id = new URLSearchParams(location.search).get("postid");
  const study = document.getElementById("study");
  let posts;
  try { posts = placePosts(await loadAll()); }
  catch (e) { study.innerHTML = "<p class=\"resigned\">the position is lost.</p>"; return; }

  const i = posts.findIndex(p => p.id === id);
  if (i === -1) { study.innerHTML = "<p class=\"resigned\">no piece stands on that square.</p>"; return; }

  const post = posts[i];
  document.title = `my ivory tower · ${post.meta.title.toLowerCase()} on ${algebraic(post.square)}`;
  const older = posts[i + 1];
  const newer = posts[i - 1];

  study.innerHTML = `
    <p class="annotation">${post.piece} ${algebraic(post.square)} · ${post.meta.date} · ${post.meta.tags.join(" · ")}</p>
    <h1 class="study-title">${post.meta.title}</h1>
    <div class="study-body"></div>
    <nav class="variations">
      ${older ? `<a href="post_viewer.html?postid=${older.id}">${older.piece} earlier move: ${older.meta.title.toLowerCase()}</a>` : "<span class=\"resigned\">the opening move</span>"}
      ${newer ? `<a href="post_viewer.html?postid=${newer.id}">${newer.piece} later move: ${newer.meta.title.toLowerCase()}</a>` : "<span class=\"resigned\">the latest move</span>"}
    </nav>
  `;
  study.querySelector(".study-body").appendChild(post.content.cloneNode(true));
}

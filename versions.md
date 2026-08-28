# versions

Twelve standalone designs of the same blog. Each lives in its own directory, shares the same
static post model (`posts/*.html` with a JSON `.post-meta` block and a `.post-content` article,
previews cut at `[data-cut]`, full posts at `post_viewer.html?postid=<slug>`), and uses no
dependencies at all — no fonts fetched, no libraries, no build step. All dark, all minimal.

| version | name | conceit | old pattern × new pattern |
|---|---|---|---|
| `v6/` | The Tower | posts are storeys of a tower in architectural section | section drawing × scroll-driven altimeter |
| `v7/` | Ivory Keys | posts are keys of an ivory keyboard; the open one stays depressed | piano skeuomorph × scroll-snap + hash state |
| `v8/` | Scrimshaw | essays engraved as scenes on a bone-black plate | ivory engraving × outline typography |
| `v9/` | Vitrine | posts are accessioned objects with museum labels | museum label × grid + `:has()` |
| `v10/` | Card Catalogue | posts are punched index cards on a brass rod | library drawer × generated ruling |
| `v11/` | Palimpsest | older essays sit fainter and tilted beneath the present hand | layered parchment × depth custom properties |
| `v12/` | Teleprinter | essays arrive as telegrams; the wire is filterable live | teletype telegram × command-palette filter |
| `v13/` | Contact Sheet | essays are 35mm frames; the loupe brings them up | contact sheet × `aspect-ratio` grid |
| `v14/` | Endgame | essays stand as ivory pieces on a chess study diagram | chess diagram × keyboard-walked grid |
| `v15/` | Almanac | the year kept as a farmer's ledger with moons and seasons | almanac table × sortable columns |
| `v16/` | Star Chart | essays plotted as the constellation Turris Eburnea | celestial atlas × hashed CSS positioning |
| `v17/` | Punch Card | essays are a punched deck; listings print on green-bar | IBM card × generative punch patterns |

To add a post to any version: drop the file in that version's `posts/` and add its filename to
the `postFiles` array at the top of that version's `blog.js`.

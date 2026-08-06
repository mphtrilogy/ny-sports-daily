import React, { useState, useRef, useEffect } from "react";

const FONT_IMPORT_URL =
  "https://fonts.googleapis.com/css2?family=Oswald:wght@400;500;600;700&family=PT+Serif:ital,wght@0,400;0,700;1,400&family=IBM+Plex+Mono:wght@400;500;600&display=swap";

const NY_TEAMS = [
  "jets", "giants", "yankees", "mets", "knicks", "nets", "rangers",
  "islanders", "devils", "liberty", "nycfc", "red bulls", "gotham fc",
];

// Guaranteed-correct subreddit per team, decoupled from whatever the
// Reddit search happens to surface as the "pulse" hit.
const TEAM_SUBREDDITS = {
  jets: "nyjets",
  giants: "NYGiants",
  yankees: "NYYankees",
  mets: "NewYorkMets",
  knicks: "NYKnicks",
  nets: "GoNets",
  rangers: "NYRangers",
  islanders: "NewYorkIslanders",
  devils: "devils",
  liberty: "NYLiberty",
  nycfc: "nycfc",
  "red bulls": "newyorkredbulls",
  "gotham fc": "nwsl",
};

const STATS_SITE_BY_SPORT = {
  NFL: "pro-football-reference.com",
  MLB: "baseball-reference.com",
  NHL: "hockey-reference.com",
  NBA: "basketball-reference.com",
};

function statsSearchUrl(name, sport) {
  const site = STATS_SITE_BY_SPORT[sport];
  const q = site ? `site:${site} ${name}` : `${name} stats ${sport || ""}`.trim();
  return `https://www.google.com/search?q=${encodeURIComponent(q)}`;
}
function newsSearchUrl(name) {
  return `https://news.google.com/search?q=${encodeURIComponent(name)}`;
}
function espnSearchUrl(name) {
  return `https://www.espn.com/search/_/q/${encodeURIComponent(name)}`;
}
function xSearchUrl(name) {
  return `https://x.com/search?q=${encodeURIComponent(`"${name}"`)}&f=live`;
}
function youtubeSearchUrl(name) {
  return `https://www.youtube.com/results?search_query=${encodeURIComponent(name + " highlights")}`;
}
function redditSearchUrl(name) {
  return `https://www.reddit.com/search/?q=${encodeURIComponent(`"${name}"`)}`;
}
function googleSearchUrl(name) {
  return `https://www.google.com/search?q=${encodeURIComponent(name)}`;
}
function buildLinks(result) {
  const links = [
    { label: "Wikipedia", url: result.pageUrl },
    { label: "Deeper stats", url: statsSearchUrl(result.name, result.sport) },
    { label: "ESPN", url: espnSearchUrl(result.name) },
    { label: "Latest news", url: newsSearchUrl(result.name) },
    { label: "X / Twitter", url: xSearchUrl(result.name) },
    { label: "Highlights", url: youtubeSearchUrl(result.name) },
    { label: "Reddit search", url: redditSearchUrl(result.name) },
  ];
  if (result.pulse && result.pulse.subreddit.toLowerCase() !== (result.teamSubreddit || "").toLowerCase()) {
    links.push({ label: `r/${result.pulse.subreddit}`, url: `https://reddit.com${result.pulse.permalink ? "" : ""}/r/${result.pulse.subreddit}` });
  }
  if (result.teamSubreddit) {
    links.push({ label: `r/${result.teamSubreddit}`, url: `https://reddit.com/r/${result.teamSubreddit}` });
  }
  links.push({ label: "Google", url: googleSearchUrl(result.name) });
  return links;
}

const SPORT_HINTS = [
  { kw: ["american football", "nfl", "quarterback", "cornerback", "wide receiver", "linebacker"], sport: "NFL" },
  { kw: ["baseball", "mlb", "pitcher", "outfielder", "shortstop"], sport: "MLB" },
  { kw: ["ice hockey", "nhl", "goaltender", "defenseman"], sport: "NHL" },
  { kw: ["basketball", "nba", "point guard", "power forward", "center"], sport: "NBA" },
  { kw: ["golf", "pga", "golfer"], sport: "Golf" },
  { kw: ["tennis", "atp", "wta"], sport: "Tennis" },
];

function pad(n) {
  return n.toString().padStart(2, "0");
}

function dispatchStamp() {
  const now = new Date();
  const date = `${pad(now.getMonth() + 1)}.${pad(now.getDate())}.${now
    .getFullYear()
    .toString()
    .slice(2)}`;
  const time = `${pad(now.getHours())}:${pad(now.getMinutes())}`;
  return `${date} — ${time}`;
}

function dispatchNumber(seed) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return (1000 + (h % 8999)).toString();
}

function timeAgo(unixSeconds) {
  const diffMs = Date.now() - unixSeconds * 1000;
  const mins = Math.floor(diffMs / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}

function initials(name) {
  return name.split(" ").filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase();
}

// --- Paste-a-tweet: pull a likely player name out of pasted text instead
// of treating the whole blob as a search query.
const EXCLUDE_WORDS = new Set([
  "The", "This", "That", "Just", "Wow", "Who", "Is", "New", "York",
  "NFL", "MLB", "NHL", "NBA", "PGA", "ATP", "WTA", "Jets", "Giants",
  "Yankees", "Mets", "Knicks", "Nets", "Rangers", "Islanders", "Devils",
  "Liberty", "Twitter", "X",
]);

function extractNameFromText(text) {
  const noUrls = text.replace(/https?:\/\/\S+/g, "");
  const candidates = noUrls.match(/\b([A-Z][a-zA-Z'’]+(?:\s[A-Z][a-zA-Z'’]+){1,2})\b/g) || [];
  const filtered = candidates
    .map((c) => c.trim())
    .filter((c) => {
      const words = c.split(" ");
      return !words.every((w) => EXCLUDE_WORDS.has(w));
    });
  return filtered[0] || null;
}

// --- Canvas export: draws a simplified, share-ready version of the
// dispatch card as a portrait PNG (1080x1350, Instagram-friendly).
async function exportCardAsImage(result) {
  if (document.fonts && document.fonts.ready) await document.fonts.ready;

  const W = 1080, H = 1350;
  const canvas = document.createElement("canvas");
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext("2d");

  const INK = "#14181F", PAPER = "#F2EDE1", AMBER = "#C97A2B", SLATE = "#5B6472", RED = "#8B2E2E";

  ctx.fillStyle = INK;
  ctx.fillRect(0, 0, W, H);

  const padOuter = 48;
  const cardX = padOuter, cardY = padOuter, cardW = W - padOuter * 2, cardH = H - padOuter * 2;
  ctx.fillStyle = PAPER;
  roundRect(ctx, cardX, cardY, cardW, cardH, 12);
  ctx.fill();

  let y = cardY + 70;
  const left = cardX + 56;
  const right = cardX + cardW - 56;

  ctx.fillStyle = SLATE;
  ctx.font = "600 22px 'IBM Plex Mono', monospace";
  ctx.textAlign = "left";
  ctx.fillText("SCOUTING REPORT", left, y);
  ctx.textAlign = "right";
  ctx.fillText(result._stamp || "", right, y);
  ctx.textAlign = "left";

  y += 60;

  if (result.ny_connection) {
    ctx.save();
    ctx.translate(right - 60, cardY + 90);
    ctx.rotate((-7 * Math.PI) / 180);
    ctx.strokeStyle = RED;
    ctx.lineWidth = 3;
    ctx.font = "700 24px 'Oswald', sans-serif";
    const label = "NY TIE";
    const tw = ctx.measureText(label).width;
    roundRectStroke(ctx, -tw / 2 - 16, -22, tw + 32, 44, 6);
    ctx.fillStyle = RED;
    ctx.textAlign = "center";
    ctx.fillText(label, 0, 8);
    ctx.restore();
    ctx.textAlign = "left";
  }

  ctx.fillStyle = INK;
  ctx.font = "700 62px 'Oswald', sans-serif";
  ctx.fillText(result.name.toUpperCase(), left, y);
  y += 50;

  ctx.font = "600 24px 'IBM Plex Mono', monospace";
  ctx.fillStyle = AMBER;
  const sportW = ctx.measureText(result.sport + "  ").width;
  ctx.fillText(result.sport, left, y);
  ctx.fillStyle = SLATE;
  ctx.fillText("·  " + result.team, left + sportW + 10, y);
  y += 44;

  ctx.strokeStyle = "#D9D2BE";
  ctx.beginPath(); ctx.moveTo(left, y); ctx.lineTo(right, y); ctx.stroke();
  y += 44;

  ctx.fillStyle = INK;
  ctx.font = "400 26px 'PT Serif', serif";
  y = wrapText(ctx, result.identity_line, left, y, right - left, 36, 7);
  y += 20;

  if (result.snapshot && result.snapshot.length > 0) {
    let cx = left, cy = y;
    const chipH = 84;
    for (const s of result.snapshot) {
      ctx.font = "600 26px 'IBM Plex Mono', monospace";
      const valueText = String(s.value);
      const w = Math.max(ctx.measureText(valueText).width, ctx.measureText(s.label).width) + 40;
      if (cx + w > right) { cx = left; cy += chipH + 12; }
      ctx.strokeStyle = "#D9D2BE";
      roundRectStroke(ctx, cx, cy, w, chipH, 6);
      ctx.fillStyle = INK;
      ctx.font = "600 30px 'Oswald', sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(valueText, cx + w / 2, cy + 40);
      ctx.fillStyle = SLATE;
      ctx.font = "500 15px 'IBM Plex Mono', monospace";
      ctx.fillText(s.label.toUpperCase(), cx + w / 2, cy + 64);
      ctx.textAlign = "left";
      cx += w + 14;
    }
    y = cy + chipH + 20;
  }

  ctx.strokeStyle = "#D9D2BE";
  ctx.beginPath(); ctx.moveTo(left, cardY + cardH - 60); ctx.lineTo(right, cardY + cardH - 60); ctx.stroke();

  ctx.fillStyle = "#9A927C";
  ctx.font = "500 18px 'IBM Plex Mono', monospace";
  ctx.fillText("SOURCE: WIKIPEDIA · SCOUTING REPORT", left, cardY + cardH - 24);

  const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${result.name.replace(/\s+/g, "-").toLowerCase()}-dispatch.png`;
  a.click();
  URL.revokeObjectURL(url);
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
function roundRectStroke(ctx, x, y, w, h, r) {
  roundRect(ctx, x, y, w, h, r);
  ctx.stroke();
}
function wrapText(ctx, text, x, y, maxWidth, lineHeight, maxLines) {
  const words = text.split(" ");
  let line = "";
  let lines = 0;
  for (let i = 0; i < words.length; i++) {
    const test = line + words[i] + " ";
    if (ctx.measureText(test).width > maxWidth && line) {
      if (lines >= maxLines - 1) {
        ctx.fillText(line.trim() + "…", x, y);
        return y + lineHeight;
      }
      ctx.fillText(line.trim(), x, y);
      line = words[i] + " ";
      y += lineHeight;
      lines++;
    } else {
      line = test;
    }
  }
  ctx.fillText(line.trim(), x, y);
  return y + lineHeight;
}

// --- "smart" interpolation: pull structured facts out of a plain-text
// Wikipedia lead paragraph using pattern matching, since the free summary
// endpoint doesn't return structured infobox fields directly.
function interpolateFromExtract(extract) {
  const facts = {};

  const bornMatch = extract.match(/born\s+([A-Z][a-z]+ \d{1,2}, \d{4})/);
  if (bornMatch) {
    facts.born = bornMatch[1];
    const parsedDate = new Date(bornMatch[1]);
    if (!isNaN(parsedDate)) {
      let age = new Date().getFullYear() - parsedDate.getFullYear();
      const hasHadBirthdayThisYear =
        new Date().getMonth() > parsedDate.getMonth() ||
        (new Date().getMonth() === parsedDate.getMonth() &&
          new Date().getDate() >= parsedDate.getDate());
      if (!hasHadBirthdayThisYear) age -= 1;
      facts.age = age;
    }
  }

  const teamMatch = extract.match(
    /for the\s+([A-Z][A-Za-z0-9.&'\- ]+?)(?:\s+of the|\s+in the|[.,])/
  );
  if (teamMatch) facts.team = teamMatch[1].trim();

  const collegeMatch = extract.match(
    /college\s+(?:football|basketball|baseball|hockey)?\s*for the\s+([A-Z][A-Za-z0-9&'\- ]+?)(?:\.|,)/i
  );
  if (collegeMatch) facts.college = collegeMatch[1].trim();

  const roleMatch = extract.match(
    /is an? ([a-z]+(?: [a-z]+)?\s(?:football|baseball|basketball|hockey|golfer|tennis player)[a-z\s]*?)(?:\s+for|\s+who|\.|,)/i
  );
  if (roleMatch) facts.role = roleMatch[1].trim();

  const lowerExtract = extract.toLowerCase();
  const sportHit = SPORT_HINTS.find((s) => s.kw.some((k) => lowerExtract.includes(k)));
  facts.sport = sportHit ? sportHit.sport : null;

  facts.nyConnection = NY_TEAMS.find((t) => lowerExtract.includes(t)) || null;

  return facts;
}

async function fetchWikipedia(name) {
  // Step 1: search, preferring a result whose snippet reads like a sports bio
  const searchUrl = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(
    name
  )}&format=json&origin=*&srlimit=5`;
  const searchRes = await fetch(searchUrl);
  const searchData = await searchRes.json();
  const hits = searchData?.query?.search || [];
  if (hits.length === 0) return null;

  const sportKeywords = ["football", "baseball", "hockey", "basketball", "golf", "tennis", "NFL", "MLB", "NHL", "NBA", "PGA", "ATP", "WTA"];
  const best =
    hits.find((h) => sportKeywords.some((k) => h.snippet.toLowerCase().includes(k.toLowerCase()))) ||
    hits[0];
  const title = best.title;

  // Step 2: clean lead-paragraph summary for identity + description
  const summaryUrl = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(
    title.replace(/ /g, "_")
  )}`;
  const summaryRes = await fetch(summaryUrl);
  if (!summaryRes.ok) return null;
  const summary = await summaryRes.json();
  if (!summary.extract) return null;

  // Step 3: raw wikitext of the lead section — sports bio infoboxes often
  // carry structured stat fields (statlabel1/statvalue1, draftyear, etc.)
  // that never make it into the plain-text summary above.
  let infoboxFields = {};
  try {
    const wikitextUrl = `https://en.wikipedia.org/w/api.php?action=query&prop=revisions&rvprop=content&rvslots=main&rvsection=0&format=json&origin=*&titles=${encodeURIComponent(
      title
    )}`;
    const wtRes = await fetch(wikitextUrl);
    const wtData = await wtRes.json();
    const pages = wtData?.query?.pages || {};
    const page = Object.values(pages)[0];
    const wikitext = page?.revisions?.[0]?.slots?.main?.["*"] || "";
    infoboxFields = parseInfobox(wikitext);
  } catch (e) {
    // Non-fatal — the plain-text summary still works without this.
  }

  return {
    title: summary.title,
    extract: summary.extract,
    description: summary.description || "",
    thumbnail: summary.thumbnail?.source || null,
    pageUrl: summary.content_urls?.desktop?.page || null,
    infoboxFields,
  };
}

// Pulls |key = value pairs out of a MediaWiki infobox template. Stops at
// the first top-level closing }} so it doesn't wander into later templates.
function parseInfobox(wikitext) {
  const start = wikitext.indexOf("{{Infobox");
  if (start === -1) return {};
  let depth = 0;
  let end = start;
  for (let i = start; i < wikitext.length; i++) {
    if (wikitext.slice(i, i + 2) === "{{") { depth++; i++; }
    else if (wikitext.slice(i, i + 2) === "}}") { depth--; i++; if (depth === 0) { end = i; break; } }
  }
  const block = wikitext.slice(start, end);
  const fields = {};
  const lines = block.split(/\n\|/).slice(1);
  for (const line of lines) {
    const eq = line.indexOf("=");
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).split("\n")[0].trim();
    value = value.replace(/\[\[([^\]|]+\|)?([^\]]+)\]\]/g, "$2").replace(/'''?/g, "").trim();
    if (key && value) fields[key] = value;
  }
  return fields;
}

// Builds up to 4 "career stat" chips from statlabelN/statvalueN pairs when
// the infobox has them (common on NFL/NBA/NHL/MLB bio pages).
function statChipsFromInfobox(fields) {
  const chips = [];
  for (let i = 1; i <= 6 && chips.length < 4; i++) {
    const label = fields[`statlabel${i}`];
    const value = fields[`statvalue${i}`];
    if (label && value) chips.push({ label, value });
  }
  return chips;
}

async function fetchRedditPulse(name) {
  const url = `https://www.reddit.com/search.json?q=${encodeURIComponent(
    `"${name}"`
  )}&sort=new&limit=8&t=month`;
  const res = await fetch(url);
  if (!res.ok) return null;
  const data = await res.json();
  const posts = (data?.data?.children || []).map((c) => c.data);
  if (posts.length === 0) return null;

  const lastName = name.trim().split(" ").pop().toLowerCase();
  const relevant =
    posts.find((p) => p.title.toLowerCase().includes(lastName)) || posts[0];

  return {
    title: relevant.title,
    subreddit: relevant.subreddit,
    when: timeAgo(relevant.created_utc),
    permalink: `https://reddit.com${relevant.permalink}`,
    score: relevant.score,
  };
}

function timeAgoFromDateString(dateStr) {
  const t = new Date(dateStr).getTime();
  if (isNaN(t)) return "";
  return timeAgo(Math.floor(t / 1000));
}

// Google News RSS doesn't set CORS headers for direct browser fetch, so
// this routes through a public CORS relay. Best-effort — if the relay is
// down or rate-limited, this just returns [] and the card shows no
// headlines rather than breaking.
async function fetchNews(name) {
  try {
    const rssUrl = `https://news.google.com/rss/search?q=${encodeURIComponent(
      name
    )}&hl=en-US&gl=US&ceid=US:en`;
    const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(
      rssUrl
    )}`;
    const res = await fetch(proxyUrl);
    if (!res.ok) return [];
    const text = await res.text();
    const xml = new DOMParser().parseFromString(text, "text/xml");
    const items = Array.from(xml.querySelectorAll("item")).slice(0, 3);
    return items.map((item) => {
      const rawTitle = item.querySelector("title")?.textContent || "";
      const source = item.querySelector("source")?.textContent || "";
      // Google News titles are usually "Headline - Source" already
      const title = source && rawTitle.endsWith(source)
        ? rawTitle.slice(0, rawTitle.length - source.length).replace(/\s*-\s*$/, "")
        : rawTitle;
      return {
        title,
        source,
        link: item.querySelector("link")?.textContent || "",
        when: timeAgoFromDateString(item.querySelector("pubDate")?.textContent || ""),
      };
    });
  } catch (e) {
    return [];
  }
}

export default function QuickIDFree({ initialQuery }) {
  const [query, setQuery] = useState(initialQuery || "");
  const [status, setStatus] = useState("idle");
  const [result, setResult] = useState(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [sourceStatus, setSourceStatus] = useState({ wiki: null, reddit: null, news: null });

  // Deep-link support: if we were handed a name from the URL (e.g. a
  // newsletter link like "who is this guy?" pointing at a specific player),
  // auto-run that search once on mount instead of waiting for a manual submit.
  const hasAutoRun = useRef(false);
  useEffect(() => {
    if (initialQuery && !hasAutoRun.current) {
      hasAutoRun.current = true;
      runLookup(initialQuery);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialQuery]);

  async function runLookup(q) {
    if (!q.trim()) return;
    setStatus("loading");
    setResult(null);
    setErrorMsg("");
    setSourceStatus({ wiki: null, reddit: null, news: null });

    let wiki = null;
    let reddit = null;
    let news = [];

    try {
      wiki = await fetchWikipedia(q);
      setSourceStatus((s) => ({ ...s, wiki: wiki ? "ok" : "empty" }));
    } catch (e) {
      setSourceStatus((s) => ({ ...s, wiki: "fail" }));
    }

    try {
      reddit = await fetchRedditPulse(q);
      setSourceStatus((s) => ({ ...s, reddit: reddit ? "ok" : "empty" }));
    } catch (e) {
      setSourceStatus((s) => ({ ...s, reddit: "fail" }));
    }

    try {
      news = await fetchNews(q);
      setSourceStatus((s) => ({ ...s, news: news.length > 0 ? "ok" : "empty" }));
    } catch (e) {
      setSourceStatus((s) => ({ ...s, news: "fail" }));
    }

    if (!wiki) {
      setStatus("error");
      setErrorMsg(`No signal on "${q}". Try the full name or a different spelling.`);
      return;
    }

    const facts = interpolateFromExtract(wiki.extract);
    const statChips = statChipsFromInfobox(wiki.infoboxFields || {});
    const draft =
      wiki.infoboxFields?.draftyear && wiki.infoboxFields?.draftround
        ? `Rd ${wiki.infoboxFields.draftround}${
            wiki.infoboxFields.draftpick ? `, Pk ${wiki.infoboxFields.draftpick}` : ""
          } (${wiki.infoboxFields.draftyear})`
        : null;

    setResult({
      name: wiki.title,
      thumbnail: wiki.thumbnail,
      pageUrl: wiki.pageUrl,
      identity_line: wiki.extract, // full extract, not truncated
      sport: facts.sport || "—",
      team: facts.team || wiki.description || "—",
      role: facts.role || wiki.description || "",
      snapshot: [
        facts.age ? { label: "Age", value: facts.age } : null,
        facts.born ? { label: "Born", value: facts.born } : null,
        facts.college ? { label: "College", value: facts.college } : null,
        draft ? { label: "Draft", value: draft } : null,
        ...statChips,
      ].filter(Boolean),
      ny_connection: facts.nyConnection
        ? `Ties to the ${facts.nyConnection[0].toUpperCase() + facts.nyConnection.slice(1)}`
        : null,
      teamSubreddit: facts.nyConnection ? TEAM_SUBREDDITS[facts.nyConnection] || null : null,
      pulse: reddit,
      headlines: news,
      _seed: q,
      _stamp: dispatchStamp(),
    });
    setStatus("done");
  }

  function handleSubmit(e) {
    e.preventDefault();
    runLookup(query);
  }

  return (
    <div style={styles.page}>
      <style>{`
        @import url('${FONT_IMPORT_URL}');
        * { box-sizing: border-box; }
        .qid-input::placeholder { color: #8A93A6; opacity: 1; }
        .qid-input:focus { outline: none; border-bottom-color: #C97A2B; }
        .qid-submit:hover { background: #C97A2B; color: #14181F; }
        .qid-submit:focus-visible { outline: 2px solid #C97A2B; outline-offset: 3px; }
        .qid-example:hover { color: #C97A2B; border-color: #C97A2B; }
        .qid-example:focus-visible { outline: 2px solid #C97A2B; outline-offset: 2px; }
        .qid-link { color: #C97A2B; text-decoration: none; border-bottom: 1px solid rgba(201,122,43,0.4); }
        .qid-link:hover { border-bottom-color: #C97A2B; }
        .qid-headline:hover .qid-headline-title { color: #C97A2B; }
        .qid-export:hover { border-color: #C97A2B !important; color: #C97A2B !important; }
        @keyframes blink { 0%, 45% { opacity: 1; } 50%, 100% { opacity: 0; } }
        .qid-cursor { animation: blink 1s steps(1) infinite; }
        @keyframes rise { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .qid-card { animation: rise 0.4s ease-out; }
        @media (prefers-reduced-motion: reduce) { .qid-cursor { animation: none; opacity: 1; } .qid-card { animation: none; } }
        @media (max-width: 560px) {
          .qid-name { font-size: 38px !important; }
          .qid-title { font-size: 28px !important; }
          .qid-shell { padding: 28px 18px !important; }
        }
      `}</style>

      <div style={styles.shell} className="qid-shell">
        <div style={styles.eyebrow}>PLAYER LOOKUP WIRE — FREE TIER</div>
        <h1 style={styles.title} className="qid-title">THE SCOUTING REPORT</h1>
        <p style={styles.tagline}>Drop a name. Get the dispatch. No API key, no cost.</p>

        <form onSubmit={handleSubmit} style={styles.form}>
          <span style={styles.prompt}>&gt;</span>
          <input
            className="qid-input"
            style={styles.input}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onPaste={(e) => {
              const pasted = e.clipboardData.getData("text");
              if (pasted.split(/\s+/).length > 4 || /https?:\/\//.test(pasted)) {
                e.preventDefault();
                const extracted = extractNameFromText(pasted);
                setQuery(extracted || pasted.replace(/https?:\/\/\S+/g, "").trim());
              }
            }}
            placeholder="e.g. Samuel Womack — or paste a tweet"
            aria-label="Player name"
          />
          <span className="qid-cursor" style={styles.blinkCursor}>▌</span>
          <button type="submit" className="qid-submit" style={styles.submit} disabled={status === "loading"}>
            {status === "loading" ? "SEARCHING" : "SEARCH WIRE"}
          </button>
        </form>

        <div style={styles.examplesRow}>
          {["Samuel Womack", "Cade Klubnik", "D'Angelo Ponds"].map((ex) => (
            <button
              key={ex}
              className="qid-example"
              style={styles.exampleChip}
              onClick={() => { setQuery(ex); runLookup(ex); }}
              type="button"
            >
              {ex}
            </button>
          ))}
        </div>

        <div style={styles.resultArea}>
          {status === "loading" && (
            <div style={styles.loadingLine}>
              <span className="qid-cursor" style={styles.loadingCursor}>●</span>
              PULLING WIKIPEDIA + REDDIT + NEWS…
            </div>
          )}

          {status === "error" && (
            <div style={styles.errorBox}>
              <div style={styles.errorLabel}>NO SIGNAL</div>
              <div style={styles.errorText}>{errorMsg}</div>
            </div>
          )}

          {status === "done" && result && (
            <>
              <DispatchCard result={result} sourceStatus={sourceStatus} />
              <button
                type="button"
                className="qid-export"
                style={styles.exportButton}
                onClick={() => exportCardAsImage(result)}
              >
                ⤓ Save as image
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function SourceDot({ state }) {
  const color = state === "ok" ? "#3F7A4E" : state === "fail" ? "#8B2E2E" : "#B8A96B";
  return <span style={{ ...styles.sourceDot, background: color }} />;
}

function DispatchCard({ result, sourceStatus }) {
  const num = dispatchNumber(result._seed || result.name || "x");
  return (
    <div style={styles.card} className="qid-card">
      <Perforation />

      <div style={styles.cardHeaderRow}>
        <span style={styles.dispatchNo}>DISPATCH NO. {num}</span>
        <span style={styles.dispatchStamp}>{result._stamp}</span>
      </div>

      {result.ny_connection && <div style={styles.nyStamp}>NY TIE</div>}

      <div style={styles.nameRow}>
        {result.thumbnail ? (
          <img src={result.thumbnail} alt="" style={styles.thumb} />
        ) : (
          <div style={styles.avatarFallback}>{initials(result.name)}</div>
        )}
        <div style={styles.nameBlock}>
          <div className="qid-name" style={styles.name}>{result.name}</div>
          <div style={styles.metaLine}>
            <span style={styles.metaAccent}>{result.sport}</span>
            <span style={styles.metaDot}>·</span>
            <span>{result.team}</span>
          </div>
        </div>
      </div>

      <div style={styles.hr} />

      <p style={styles.identityLine}>{result.identity_line}</p>

      {result.headlines && result.headlines.length > 0 && (
        <div style={styles.headlinesBlock}>
          <div style={styles.whyLabel}>RECENT HEADLINES</div>
          {result.headlines.map((h, i) => (
            <a
              key={i}
              href={h.link}
              target="_blank"
              rel="noreferrer"
              className="qid-headline"
              style={styles.headlineRow}
            >
              <span className="qid-headline-title" style={styles.headlineTitle}>{h.title}</span>
              <span style={styles.headlineMeta}>
                {h.source ? `${h.source} · ` : ""}{h.when}
              </span>
            </a>
          ))}
        </div>
      )}

      {result.pulse ? (
        <p style={styles.whyNow}>
          <span style={styles.whyLabel}>WIRE PULSE — </span>
          "{result.pulse.title}" — r/{result.pulse.subreddit}, {result.pulse.when}{" "}
          <a className="qid-link" href={result.pulse.permalink} target="_blank" rel="noreferrer">
            view
          </a>
        </p>
      ) : (
        <p style={styles.whyNowQuiet}>
          <span style={styles.whyLabel}>WIRE PULSE — </span>
          no fresh chatter this month, bio only.
        </p>
      )}

      {result.ny_connection && (
        <p style={styles.nyLine}>
          <span style={styles.whyLabel}>NY ANGLE — </span>
          {result.ny_connection}
        </p>
      )}

      {result.snapshot && result.snapshot.length > 0 && (
        <div style={styles.snapshotRow}>
          {result.snapshot.map((s, i) => (
            <div key={i} style={styles.snapshotChip}>
              <div style={styles.snapshotValue}>{s.value}</div>
              <div style={styles.snapshotLabel}>{s.label}</div>
            </div>
          ))}
        </div>
      )}

      <div style={styles.hr} />

      <div style={styles.linkRow}>
        {buildLinks(result).map((link) => (
          <a key={link.label} className="qid-link" style={styles.linkChip} href={link.url} target="_blank" rel="noreferrer">
            {link.label} →
          </a>
        ))}
      </div>

      <div style={styles.hr} />
      <div style={styles.footerRow}>
        <div style={styles.footer}>
          {result.pageUrl ? (
            <a className="qid-link" href={result.pageUrl} target="_blank" rel="noreferrer">
              SOURCE: WIKIPEDIA
            </a>
          ) : (
            "SOURCE: WIKIPEDIA"
          )}
        </div>
        <div style={styles.sourceRow}>
          <SourceDot state={sourceStatus.wiki} /> wiki
          <SourceDot state={sourceStatus.reddit} /> reddit
          <SourceDot state={sourceStatus.news} /> news
        </div>
      </div>
    </div>
  );
}

function Perforation() {
  const dots = new Array(28).fill(0);
  return (
    <div style={styles.perfRow} aria-hidden="true">
      {dots.map((_, i) => <span key={i} style={styles.perfDot} />)}
    </div>
  );
}

const INK = "#14181F";
const PAPER = "#F2EDE1";
const AMBER = "#C97A2B";
const RED = "#8B2E2E";
const SLATE = "#5B6472";
const SLATE_LIGHT = "#8A93A6";

const styles = {
  page: {
    minHeight: "100vh", width: "100%", background: INK,
    backgroundImage: "radial-gradient(circle at 20% 15%, rgba(201,122,43,0.06), transparent 45%), radial-gradient(circle at 85% 80%, rgba(139,46,46,0.08), transparent 40%)",
    display: "flex", justifyContent: "center", padding: "0",
  },
  shell: { width: "100%", maxWidth: 620, padding: "56px 32px 80px", fontFamily: "'PT Serif', Georgia, serif", color: PAPER },
  eyebrow: { fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, letterSpacing: "0.28em", color: AMBER, marginBottom: 10, fontWeight: 500 },
  title: { fontFamily: "'Oswald', sans-serif", fontWeight: 700, fontSize: 40, letterSpacing: "0.01em", margin: 0, lineHeight: 1.05, color: PAPER },
  tagline: { marginTop: 10, marginBottom: 36, fontSize: 16, fontStyle: "italic", color: SLATE_LIGHT },
  form: { display: "flex", alignItems: "center", gap: 10, borderBottom: `1px solid #2E3542`, paddingBottom: 12 },
  prompt: { fontFamily: "'IBM Plex Mono', monospace", color: AMBER, fontSize: 18 },
  input: { flex: 1, minWidth: 0, background: "transparent", border: "none", borderBottom: "2px solid transparent", color: PAPER, fontFamily: "'IBM Plex Mono', monospace", fontSize: 17, padding: "4px 0" },
  blinkCursor: { color: AMBER, fontFamily: "'IBM Plex Mono', monospace", marginLeft: -6 },
  submit: { fontFamily: "'IBM Plex Mono', monospace", fontSize: 12, letterSpacing: "0.14em", fontWeight: 600, background: "transparent", color: AMBER, border: `1px solid ${AMBER}`, padding: "10px 16px", cursor: "pointer", whiteSpace: "nowrap", transition: "background 0.15s, color 0.15s" },
  examplesRow: { display: "flex", flexWrap: "wrap", gap: 8, marginTop: 16 },
  exampleChip: { fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, letterSpacing: "0.04em", color: SLATE_LIGHT, background: "transparent", border: "1px solid #2E3542", borderRadius: 3, padding: "6px 10px", cursor: "pointer", transition: "color 0.15s, border-color 0.15s" },
  resultArea: { marginTop: 40 },
  loadingLine: { fontFamily: "'IBM Plex Mono', monospace", fontSize: 13, letterSpacing: "0.06em", color: SLATE_LIGHT, display: "flex", alignItems: "center", gap: 10 },
  loadingCursor: { color: AMBER },
  errorBox: { borderLeft: `3px solid ${RED}`, paddingLeft: 16 },
  errorLabel: { fontFamily: "'IBM Plex Mono', monospace", fontSize: 12, letterSpacing: "0.14em", color: RED, fontWeight: 600, marginBottom: 6 },
  errorText: { color: SLATE_LIGHT, fontSize: 15 },
  card: { position: "relative", background: PAPER, color: INK, borderRadius: 4, padding: "0 28px 24px", boxShadow: "0 20px 50px rgba(0,0,0,0.35)", overflow: "hidden" },
  perfRow: { display: "flex", justifyContent: "space-between", padding: "0 6px", marginBottom: 18, transform: "translateY(-1px)" },
  perfDot: { width: 7, height: 7, borderRadius: "50%", background: INK, marginTop: -4 },
  cardHeaderRow: { display: "flex", justifyContent: "space-between", fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, letterSpacing: "0.1em", color: SLATE, marginBottom: 22 },
  dispatchNo: { fontWeight: 600 },
  dispatchStamp: {},
  nyStamp: { position: "absolute", top: 44, right: 20, fontFamily: "'Oswald', sans-serif", fontWeight: 700, fontSize: 13, letterSpacing: "0.1em", color: RED, border: `2px solid ${RED}`, borderRadius: 3, padding: "3px 8px", transform: "rotate(-7deg)", opacity: 0.85 },
  nameRow: { display: "flex", alignItems: "flex-start", gap: 14 },
  thumb: { width: 56, height: 56, borderRadius: 4, objectFit: "cover", border: "1px solid #D9D2BE", marginTop: 4 },
  nameBlock: { marginBottom: 4, flex: 1 },
  name: { fontFamily: "'Oswald', sans-serif", fontWeight: 700, fontSize: 40, lineHeight: 1.05, letterSpacing: "0.005em", color: INK, textTransform: "uppercase" },
  metaLine: { fontFamily: "'IBM Plex Mono', monospace", fontSize: 13, letterSpacing: "0.03em", color: SLATE, marginTop: 6, display: "flex", flexWrap: "wrap", gap: 6 },
  metaAccent: { color: AMBER, fontWeight: 600 },
  metaDot: { color: "#C9C2AE" },
  hr: { height: 1, background: "#D9D2BE", margin: "20px 0" },
  identityLine: { fontSize: 17, lineHeight: 1.5, margin: "0 0 14px", color: INK },
  whyLabel: { fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, letterSpacing: "0.08em", color: AMBER, fontWeight: 600 },
  whyNow: { fontSize: 15, lineHeight: 1.6, color: "#2A2E38", margin: "0 0 10px" },
  whyNowQuiet: { fontSize: 15, lineHeight: 1.6, color: "#8A8368", margin: "0 0 10px", fontStyle: "italic" },
  nyLine: { fontSize: 15.5, lineHeight: 1.6, color: "#2A2E38", margin: "0 0 4px" },
  snapshotRow: { display: "flex", gap: 10, flexWrap: "wrap", marginTop: 18 },
  snapshotChip: { border: "1px solid #D9D2BE", borderRadius: 4, padding: "8px 14px", minWidth: 84, textAlign: "center" },
  snapshotValue: { fontFamily: "'Oswald', sans-serif", fontWeight: 600, fontSize: 19, color: INK },
  snapshotLabel: { fontFamily: "'IBM Plex Mono', monospace", fontSize: 9.5, letterSpacing: "0.06em", color: SLATE, marginTop: 2, textTransform: "uppercase" },
  footerRow: { display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 },
  footer: { fontFamily: "'IBM Plex Mono', monospace", fontSize: 10.5, letterSpacing: "0.08em", color: "#9A927C" },
  sourceRow: { fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, letterSpacing: "0.05em", color: "#9A927C", display: "flex", alignItems: "center", gap: 4 },
  sourceDot: { width: 6, height: 6, borderRadius: "50%", display: "inline-block", marginRight: 2 },
  linkRow: { display: "flex", flexWrap: "wrap", gap: 8 },
  linkChip: {
    fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, letterSpacing: "0.03em",
    color: "#5B6472", border: "1px solid #D9D2BE", borderRadius: 3,
    padding: "6px 10px", transition: "background 0.15s, color 0.15s, border-color 0.15s",
    textDecoration: "none",
  },
  headlinesBlock: { marginBottom: 14 },
  headlineRow: {
    display: "flex", justifyContent: "space-between", gap: 10,
    padding: "6px 0", borderBottom: "1px solid #E8E2D2", textDecoration: "none",
  },
  headlineTitle: { fontSize: 14.5, color: INK, lineHeight: 1.4, flex: 1 },
  headlineMeta: {
    fontFamily: "'IBM Plex Mono', monospace", fontSize: 10.5, color: SLATE,
    whiteSpace: "nowrap", paddingTop: 2,
  },
  avatarFallback: {
    width: 56, height: 56, borderRadius: 4, background: AMBER, color: PAPER,
    display: "flex", alignItems: "center", justifyContent: "center",
    fontFamily: "'Oswald', sans-serif", fontWeight: 700, fontSize: 20,
    marginTop: 4, flexShrink: 0,
  },
  exportButton: {
    marginTop: 16, fontFamily: "'IBM Plex Mono', monospace", fontSize: 12,
    letterSpacing: "0.06em", fontWeight: 600, background: "transparent",
    color: PAPER, border: "1px solid #2E3542", borderRadius: 4,
    padding: "10px 16px", cursor: "pointer", transition: "border-color 0.15s, color 0.15s",
  },
};

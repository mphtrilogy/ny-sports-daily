// api/news.js — Vercel Serverless Function
// Place this file at: ny-sports-daily/api/news.js
// Vercel auto-detects api/ folder and deploys as serverless function at /api/news
// 100% free on Vercel's free tier

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET");
  // Cache 5 minutes on Vercel CDN — fast for users, fresh enough for news
  res.setHeader("Cache-Control", "s-maxage=300, stale-while-revalidate=600");

  const results = [];
  const seen = new Set();

  function addItem(title, link, desc, pub, source, team, image) {
    const clean = (title||"").trim();
    if (!clean || seen.has(clean)) return;
    seen.add(clean);
    results.push({
      title: clean,
      link:  link || "#",
      desc:  (desc||"").replace(/<[^>]*>/g,"").trim().slice(0,300),
      pub:   pub || new Date().toISOString(),
      source, team, isNY: true,
      image: image || null,
    });
  }

  async function safeFetch(url) {
    try {
      const ctrl = new AbortController();
      setTimeout(() => ctrl.abort(), 8000);
      const r = await fetch(url, {
        signal: ctrl.signal,
        headers: { "User-Agent": "Mozilla/5.0 (compatible; NYSportsDaily/1.0; +https://nysportsdaily.com)" }
      });
      if (!r.ok) return null;
      return await r.text();
    } catch { return null; }
  }

  function parseRSS(xml, source, team) {
    if (!xml) return;
    const items = xml.match(/<item[\s\S]*?<\/item>/g) || [];
    items.slice(0, 20).forEach(item => {
      const getRaw = (tag) => {
        const cdata = item.match(new RegExp(`<${tag}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]><\\/${tag}>`))?.[1];
        const plain = item.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`))?.[1];
        return (cdata || plain || "").trim();
      };
      const decodeEntities = (s) => s
        .replace(/&amp;/g,"&").replace(/&lt;/g,"<").replace(/&gt;/g,">")
        .replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/&apos;/g,"'");
      const stripHTML = (s) => s.replace(/<[^>]*>/g," ").replace(/\s+/g," ").trim();

      const title = stripHTML(decodeEntities(getRaw("title")));

      // Google News uses <guid> for the real article URL, <link> is their redirect
      const guid = getRaw("guid");
      const linkRaw = getRaw("link");
      // Prefer non-Google URLs in guid
      const link = (guid && !guid.includes("news.google.com") ? guid : linkRaw) || guid || "#";

      // Description: decode entities FIRST, then strip all HTML tags and leftover junk
      const descRaw = decodeEntities(getRaw("description"));
      const desc = stripHTML(descRaw)
        .replace(/^https?:\/\/\S+/g, "")  // remove bare URLs at start
        .replace(/href="[^"]*"/g, "")       // remove href attributes
        .trim().slice(0, 300);

      const pub = getRaw("pubDate");
      const image = item.match(/url="([^"]*\.(jpg|jpeg|png|webp)[^"]*)"/i)?.[1]
                 || item.match(/<media:content[^>]+url="([^"]+)"/i)?.[1]
                 || null;
      if (title) addItem(title, link, desc, pub, source, team, image);
    });
  }

  // ── NY POST per-team tag feeds ────────────────────────────────────────────
  const NY_POST = [
    { url:"https://nypost.com/tag/new-york-yankees/feed/",    team:"Yankees",   src:"NY Post" },
    { url:"https://nypost.com/tag/new-york-mets/feed/",       team:"Mets",      src:"NY Post" },
    { url:"https://nypost.com/tag/new-york-jets/feed/",       team:"Jets",      src:"NY Post" },
    { url:"https://nypost.com/tag/new-york-giants/feed/",     team:"Giants",    src:"NY Post" },
    { url:"https://nypost.com/tag/new-york-knicks/feed/",     team:"Knicks",    src:"NY Post" },
    { url:"https://nypost.com/tag/brooklyn-nets/feed/",       team:"Nets",      src:"NY Post" },
    { url:"https://nypost.com/tag/new-york-rangers/feed/",    team:"Rangers",   src:"NY Post" },
    { url:"https://nypost.com/tag/new-york-islanders/feed/",  team:"Islanders", src:"NY Post" },
    { url:"https://nypost.com/tag/new-jersey-devils/feed/",   team:"Devils",    src:"NY Post" },
  ];

  // ── GOOGLE NEWS per-team RSS ──────────────────────────────────────────────
  // Aggregates ALL sources — Post, Daily News, ESPN, Athletic, CBS, NBC, etc.
  const GOOGLE = [
    { q:'"new york yankees"',          team:"Yankees"   },
    { q:'"new york mets"',             team:"Mets"      },
    { q:'"new york jets" nfl',         team:"Jets"      },
    { q:'"new york giants" nfl',       team:"Giants"    },
    { q:'"new york knicks"',           team:"Knicks"    },
    { q:'"brooklyn nets"',             team:"Nets"      },
    { q:'"new york rangers" nhl',      team:"Rangers"   },
    { q:'"new york islanders"',        team:"Islanders" },
    { q:'"new jersey devils" nhl',     team:"Devils"    },
    { q:'"new york liberty" wnba',     team:"Liberty"   },
  ].map(f => ({
    url: `https://news.google.com/rss/search?q=${encodeURIComponent(f.q)}&hl=en-US&gl=US&ceid=US:en`,
    team: f.team, src: "Google News"
  }));

  // ── MLB TRADE RUMORS ──────────────────────────────────────────────────────
  const MLB_TR = [
    { url:"https://www.mlbtraderumors.com/new-york-yankees/feed", team:"Yankees", src:"MLB Trade Rumors" },
    { url:"https://www.mlbtraderumors.com/new-york-mets/feed",    team:"Mets",    src:"MLB Trade Rumors" },
  ];

  // ── SB NATION TEAM BLOGS ──────────────────────────────────────────────────
  const SBN = [
    { url:"https://www.pinstripealley.com/rss/current",       team:"Yankees",   src:"Pinstripe Alley"  },
    { url:"https://www.amazinavenue.com/rss/current",          team:"Mets",      src:"Amazin' Avenue"   },
    { url:"https://www.ganggreennation.com/rss/current",       team:"Jets",      src:"Gang Green Nation"},
    { url:"https://www.bigblueview.com/rss/current",           team:"Giants",    src:"Big Blue View"    },
    { url:"https://www.postingandtoasting.com/rss/current",    team:"Knicks",    src:"Posting & Toasting"},
    { url:"https://www.netsdaily.com/rss/current",             team:"Nets",      src:"Nets Daily"       },
    { url:"https://www.blueshirtbanter.com/rss/current",       team:"Rangers",   src:"Blueshirt Banter" },
    { url:"https://www.lighthousehockey.com/rss/current",      team:"Islanders", src:"Lighthouse Hockey"},
    { url:"https://www.allaboutthejersey.com/rss/current",     team:"Devils",    src:"All About Jersey" },
  ];

  // ── SNY ───────────────────────────────────────────────────────────────────
  const OTHER = [
    { url:"https://sny.tv/rss/articles",   team:"Mets",   src:"SNY"  },
    { url:"https://amny.com/sports/feed/", team:"All NY", src:"amNY" },
  ];

  // Fetch everything in parallel
  const allFeeds = [...NY_POST, ...GOOGLE, ...MLB_TR, ...SBN, ...OTHER];
  await Promise.all(allFeeds.map(async ({ url, team, src }) => {
    const xml = await safeFetch(url);
    parseRSS(xml, src, team);
  }));

  // Sort newest first
  results.sort((a, b) => new Date(b.pub||0) - new Date(a.pub||0));

  res.status(200).json({
    articles:  results,
    count:     results.length,
    timestamp: new Date().toISOString(),
  });
}

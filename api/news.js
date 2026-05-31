// api/news.js — Vercel Serverless Function
// Place at: ny-sports-daily/api/news.js

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET");
  res.setHeader("Cache-Control", "s-maxage=300, stale-while-revalidate=600");

  const results = [];
  const seen = new Set();

  function decodeEntities(s) {
    return (s||"")
      .replace(/&#8216;/g,"'").replace(/&#8217;/g,"'").replace(/&#8220;/g,'"').replace(/&#8221;/g,'"')
      .replace(/&#8212;/g,"—").replace(/&#8211;/g,"–").replace(/&#038;/g,"&").replace(/&#39;/g,"'")
      .replace(/&amp;/g,"&").replace(/&lt;/g,"<").replace(/&gt;/g,">").replace(/&quot;/g,'"')
      .replace(/&apos;/g,"'").replace(/&nbsp;/g," ").replace(/&#\d+;/g,"");
  }
  function stripHTML(s) {
    return (s||"").replace(/<[^>]*>/g," ").replace(/\s+/g," ").trim();
  }
  function cleanText(s) {
    return stripHTML(decodeEntities(s||"")).trim();
  }

  function addItem(title, link, desc, pub, source, team, image) {
    const t = cleanText(title);
    if (!t || seen.has(t)) return;
    // Validate link — must be a real http URL, not a Google RSS path
    let cleanLink = (link||"").trim();
    if (!cleanLink.startsWith("http") || cleanLink.includes("news.google.com/rss/articles")) {
      // Skip — broken Google redirect link, article not usable
      // Instead use a Google search for the title as fallback
      cleanLink = `https://www.google.com/search?q=${encodeURIComponent(t)}`;
    }
    seen.add(t);
    results.push({
      title: t,
      link:  cleanLink,
      desc:  cleanText(desc).slice(0, 300),
      pub:   pub || new Date().toISOString(),
      source, team, isNY: true,
      image: image || null,
    });
  }

  async function safeFetch(url) {
    try {
      const ctrl = new AbortController();
      setTimeout(() => ctrl.abort(), 10000);
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
      // Title
      const title = cleanText(
        item.match(/<title><!\[CDATA\[([\s\S]*?)\]\]><\/title>/)?.[1] ||
        item.match(/<title[^>]*>([\s\S]*?)<\/title>/)?.[1] || ""
      );

      // Link — Google News RSS puts real URL in <link> as plain text between tags
      // but the regex needs to handle the self-closing nature
      let link = "";
      // Try CDATA guid first (NY Post, SB Nation use this)
      const guidCdata = item.match(/<guid[^>]*><!\[CDATA\[([\s\S]*?)\]\]><\/guid>/)?.[1];
      const guidPlain = item.match(/<guid[^>]*>([\s\S]*?)<\/guid>/)?.[1];
      // Google News: link is between </title> and <description>, no closing tag on same line
      const linkMatch = item.match(/<link\/?>([\s\S]*?)<\/link>|<link\/?>\s*(https?:\/\/[^\s<]+)/);
      const linkPlain = linkMatch?.[1]?.trim() || linkMatch?.[2]?.trim();

      // Pick best link — prefer non-Google URLs
      const candidates = [guidCdata, guidPlain, linkPlain].filter(Boolean);
      link = candidates.find(u => u.startsWith("http") && !u.includes("news.google.com/rss/articles"))
          || candidates.find(u => u.startsWith("http"))
          || "";

      // Description
      const descRaw =
        item.match(/<description><!\[CDATA\[([\s\S]*?)\]\]><\/description>/)?.[1] ||
        item.match(/<description[^>]*>([\s\S]*?)<\/description>/)?.[1] || "";
      const desc = cleanText(descRaw)
        .replace(/\[&#\d+;\]/g,"")
        .replace(/https?:\/\/\S+/g,"")
        .trim().slice(0, 300);

      // Date
      const pub = item.match(/<pubDate[^>]*>([\s\S]*?)<\/pubDate>/)?.[1]?.trim() || "";

      // Image
      const image =
        item.match(/<media:content[^>]+url="([^"]+\.(?:jpg|jpeg|png|webp)[^"]*)"/i)?.[1] ||
        item.match(/<enclosure[^>]+url="([^"]+\.(?:jpg|jpeg|png|webp))"/i)?.[1] ||
        item.match(/url="([^"]*\.(?:jpg|jpeg|png|webp)[^"]*)"/i)?.[1] ||
        null;

      if (title) addItem(title, link, desc, pub, source, team, image);
    });
  }

  // ── NY POST per-team ─────────────────────────────────────────────────────
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

  // ── GOOGLE NEWS per-team ─────────────────────────────────────────────────
  const GOOGLE = [
    { q:'"new york yankees"',         team:"Yankees"   },
    { q:'"new york mets"',            team:"Mets"      },
    { q:'"new york jets" nfl',        team:"Jets"      },
    { q:'"new york giants" nfl',      team:"Giants"    },
    { q:'"new york knicks"',          team:"Knicks"    },
    { q:'"brooklyn nets" nba',        team:"Nets"      },
    { q:'"new york rangers" nhl',     team:"Rangers"   },
    { q:'"new york islanders"',       team:"Islanders" },
    { q:'"new jersey devils" nhl',    team:"Devils"    },
    { q:'"new york liberty" wnba',    team:"Liberty"   },
  ].map(f => ({
    url: `https://news.google.com/rss/search?q=${encodeURIComponent(f.q)}&hl=en-US&gl=US&ceid=US:en`,
    team: f.team, src: "Google News"
  }));

  // ── MLB TRADE RUMORS ─────────────────────────────────────────────────────
  const MLB_TR = [
    { url:"https://www.mlbtraderumors.com/new-york-yankees/feed", team:"Yankees", src:"MLB Trade Rumors" },
    { url:"https://www.mlbtraderumors.com/new-york-mets/feed",    team:"Mets",    src:"MLB Trade Rumors" },
  ];

  // ── SB NATION TEAM BLOGS ─────────────────────────────────────────────────
  const SBN = [
    { url:"https://www.pinstripealley.com/rss/current",       team:"Yankees",   src:"Pinstripe Alley"   },
    { url:"https://www.amazinavenue.com/rss/current",          team:"Mets",      src:"Amazin' Avenue"    },
    { url:"https://www.ganggreennation.com/rss/current",       team:"Jets",      src:"Gang Green Nation" },
    { url:"https://www.bigblueview.com/rss/current",           team:"Giants",    src:"Big Blue View"     },
    { url:"https://www.postingandtoasting.com/rss/current",    team:"Knicks",    src:"Posting & Toasting"},
    { url:"https://www.netsdaily.com/rss/current",             team:"Nets",      src:"Nets Daily"        },
    { url:"https://www.blueshirtbanter.com/rss/current",       team:"Rangers",   src:"Blueshirt Banter"  },
    { url:"https://www.lighthousehockey.com/rss/current",      team:"Islanders", src:"Lighthouse Hockey" },
    { url:"https://www.allaboutthejersey.com/rss/current",     team:"Devils",    src:"All About Jersey"  },
  ];

  // ── OTHER ────────────────────────────────────────────────────────────────
  const OTHER = [
    { url:"https://sny.tv/rss/articles",   team:"Mets",   src:"SNY"  },
    { url:"https://amny.com/sports/feed/", team:"All NY", src:"amNY" },
  ];

  const allFeeds = [...NY_POST, ...GOOGLE, ...MLB_TR, ...SBN, ...OTHER];
  await Promise.all(allFeeds.map(async ({ url, team, src }) => {
    const xml = await safeFetch(url);
    if (xml) parseRSS(xml, src, team);
  }));

  results.sort((a, b) => new Date(b.pub||0) - new Date(a.pub||0));

  res.status(200).json({
    articles:  results,
    count:     results.length,
    timestamp: new Date().toISOString(),
  });
}

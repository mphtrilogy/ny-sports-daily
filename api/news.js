// api/news.js — Vercel Serverless Function
// Fetches NY sports news from multiple sources server-side (no CORS restrictions)
// Called by the React app at /api/news?team=Yankees or /api/news for all NY news

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Cache-Control", "s-maxage=300, stale-while-revalidate=600"); // cache 5 min

  const teamFilter = req.query.team || "ALL";
  const results = [];
  const seen = new Set();

  function addItem(title, link, desc, pub, source, team, image) {
    if (!title || seen.has(title)) return;
    seen.add(title);
    results.push({ title, link, desc: desc?.slice(0,300)||"", pub, source, team, isNY:true,
      image: image||null });
  }

  async function safeFetch(url, headers={}) {
    try {
      const controller = new AbortController();
      setTimeout(() => controller.abort(), 8000);
      const res = await fetch(url, {
        signal: controller.signal,
        headers: { "User-Agent":"Mozilla/5.0 (compatible; NYSportsDaily/1.0)", ...headers }
      });
      if (!res.ok) return null;
      return await res.text();
    } catch { return null; }
  }

  // Parse RSS/Atom XML — works for NY Post, Google News, SB Nation, MLB Trade Rumors
  function parseRSS(xml, source, team) {
    if (!xml) return;
    const items = xml.match(/<item[\s\S]*?<\/item>/g) || [];
    items.forEach(item => {
      const title = (item.match(/<title><!\[CDATA\[([\s\S]*?)\]\]><\/title>/)?.[1]
        || item.match(/<title>([\s\S]*?)<\/title>/)?.[1] || "")
        .replace(/&amp;/g,"&").replace(/&lt;/g,"<").replace(/&gt;/g,">").trim();
      const link = item.match(/<link>([\s\S]*?)<\/link>/)?.[1]?.trim()
        || item.match(/<guid[^>]*>([\s\S]*?)<\/guid>/)?.[1]?.trim() || "#";
      const desc = (item.match(/<description><!\[CDATA\[([\s\S]*?)\]\]><\/description>/)?.[1]
        || item.match(/<description>([\s\S]*?)<\/description>/)?.[1] || "")
        .replace(/<[^>]*>/g,"").trim().slice(0,300);
      const pub = item.match(/<pubDate>([\s\S]*?)<\/pubDate>/)?.[1]?.trim() || "";
      const image = item.match(/url="([^"]*\.(jpg|jpeg|png|webp))"/)?.[1]
        || item.match(/<media:content[^>]+url="([^"]+)"/)?.[1] || null;
      if (title) addItem(title, link, desc, pub, source, team, image);
    });
  }

  // ── NY POST — per-team tag feeds ─────────────────────────────────────────
  const NY_POST_FEEDS = [
    { url:"https://nypost.com/tag/new-york-yankees/feed/", team:"Yankees" },
    { url:"https://nypost.com/tag/new-york-mets/feed/",    team:"Mets"    },
    { url:"https://nypost.com/tag/new-york-jets/feed/",    team:"Jets"    },
    { url:"https://nypost.com/tag/new-york-giants/feed/",  team:"Giants"  },
    { url:"https://nypost.com/tag/new-york-knicks/feed/",  team:"Knicks"  },
    { url:"https://nypost.com/tag/brooklyn-nets/feed/",    team:"Nets"    },
    { url:"https://nypost.com/tag/new-york-rangers/feed/", team:"Rangers" },
    { url:"https://nypost.com/tag/new-york-islanders/feed/",team:"Islanders"},
    { url:"https://nypost.com/tag/new-jersey-devils/feed/",team:"Devils"  },
  ].filter(f => teamFilter === "ALL" || f.team === teamFilter);

  // ── GOOGLE NEWS — team-specific search RSS ────────────────────────────────
  const GOOGLE_FEEDS = [
    { q:'"new york yankees"',         team:"Yankees"   },
    { q:'"new york mets"',            team:"Mets"      },
    { q:'"new york jets" nfl',        team:"Jets"      },
    { q:'"new york giants" nfl',      team:"Giants"    },
    { q:'"new york knicks"',          team:"Knicks"    },
    { q:'"brooklyn nets"',            team:"Nets"      },
    { q:'"new york rangers" nhl',     team:"Rangers"   },
    { q:'"new york islanders"',       team:"Islanders" },
    { q:'"new jersey devils"',        team:"Devils"    },
    { q:'"new york liberty" wnba',    team:"Liberty"   },
  ].filter(f => teamFilter === "ALL" || f.team === teamFilter)
   .map(f => ({ url:`https://news.google.com/rss/search?q=${encodeURIComponent(f.q)}&hl=en-US&gl=US&ceid=US:en`, team:f.team }));

  // ── MLB TRADE RUMORS ──────────────────────────────────────────────────────
  const MLB_TR_FEEDS = [
    { url:"https://www.mlbtraderumors.com/new-york-yankees/feed", team:"Yankees" },
    { url:"https://www.mlbtraderumors.com/new-york-mets/feed",    team:"Mets"    },
  ].filter(f => teamFilter === "ALL" || f.team === teamFilter);

  // ── SB NATION TEAM BLOGS ──────────────────────────────────────────────────
  const SBN_FEEDS = [
    { url:"https://www.pinstripealley.com/rss/current",      team:"Yankees"   },
    { url:"https://www.amazinavenue.com/rss/current",         team:"Mets"      },
    { url:"https://www.ganggreennation.com/rss/current",      team:"Jets"      },
    { url:"https://www.bigblueview.com/rss/current",          team:"Giants"    },
    { url:"https://www.postingandtoasting.com/rss/current",   team:"Knicks"    },
    { url:"https://www.netsdaily.com/rss/current",            team:"Nets"      },
    { url:"https://www.blueshirtbanter.com/rss/current",      team:"Rangers"   },
    { url:"https://www.lighthousehockey.com/rss/current",     team:"Islanders" },
    { url:"https://www.allaboutthejersey.com/rss/current",    team:"Devils"    },
  ].filter(f => teamFilter === "ALL" || f.team === teamFilter);

  // ── SNY ───────────────────────────────────────────────────────────────────
  const SNY_FEEDS = teamFilter === "ALL" || ["Mets","Yankees","Knicks","Giants"].includes(teamFilter)
    ? [{ url:"https://sny.tv/rss/articles", team:"Mets" }] : [];

  // ── amNY Sports (free local NY paper) ─────────────────────────────────────
  const AMNY_FEEDS = teamFilter === "ALL"
    ? [{ url:"https://amny.com/sports/feed/", team:"All NY" }] : [];

  // Fetch all feeds in parallel
  const allFeeds = [...NY_POST_FEEDS, ...GOOGLE_FEEDS, ...MLB_TR_FEEDS, ...SBN_FEEDS, ...SNY_FEEDS, ...AMNY_FEEDS];

  await Promise.all(allFeeds.map(async ({ url, team: feedTeam }) => {
    const xml = await safeFetch(url);
    parseRSS(xml, guessSource(url), feedTeam);
  }));

  function guessSource(url) {
    if (url.includes("nypost"))       return "NY Post";
    if (url.includes("google"))       return "Google News";
    if (url.includes("mlbtraderumors")) return "MLB Trade Rumors";
    if (url.includes("pinstripealley")) return "Pinstripe Alley";
    if (url.includes("amazinavenue"))   return "Amazin' Avenue";
    if (url.includes("ganggreennation"))return "Gang Green Nation";
    if (url.includes("bigblueview"))    return "Big Blue View";
    if (url.includes("postingandtoasting")) return "Posting & Toasting";
    if (url.includes("netsdaily"))      return "Nets Daily";
    if (url.includes("blueshirtbanter"))return "Blueshirt Banter";
    if (url.includes("lighthousehockey"))return "Lighthouse Hockey";
    if (url.includes("allaboutthejersey"))return "All About Jersey";
    if (url.includes("sny"))            return "SNY";
    if (url.includes("amny"))           return "amNY";
    return "News";
  }

  // Sort by date, newest first
  results.sort((a,b) => new Date(b.pub||0) - new Date(a.pub||0));

  res.status(200).json({ articles: results, count: results.length, timestamp: new Date().toISOString() });
}

// api/news.js — Vercel Serverless Function
// Confirmed from debug: NY Post link_tag_match works, Google News 102 items, amNY ok

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Cache-Control", "s-maxage=300, stale-while-revalidate=600");

  const results = [];
  const seen = new Set();

  function decodeEntities(s) {
    return (s||"")
      .replace(/&amp;/g,"&").replace(/&lt;/g,"<").replace(/&gt;/g,">")
      .replace(/&quot;/g,'"').replace(/&apos;/g,"'").replace(/&nbsp;/g," ")
      .replace(/&#038;/g,"&").replace(/&#8216;/g,"'").replace(/&#8217;/g,"'")
      .replace(/&#8220;/g,'"').replace(/&#8221;/g,'"')
      .replace(/&#8212;/g,"—").replace(/&#8211;/g,"–").replace(/&#\d+;/g,"");
  }
  const stripHTML = s => (s||"").replace(/<[^>]*>/g," ").replace(/\s+/g," ").trim();
  const clean = s => stripHTML(decodeEntities(s||"")).trim();

  function add(title, link, desc, pub, source, team, image) {
    const t = clean(title);
    const l = (link||"").trim();
    if (!t || !l.startsWith("http") || seen.has(t)) return;
    seen.add(t);
    results.push({ title:t, link:l, desc:clean(desc).slice(0,300),
      pub:pub||new Date().toISOString(), source, team, isNY:true, image:image||null });
  }

  async function get(url) {
    try {
      const ctrl = new AbortController();
      setTimeout(() => ctrl.abort(), 10000);
      const r = await fetch(url, { signal:ctrl.signal, headers:{
        "User-Agent":"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36",
        "Accept":"application/rss+xml,application/xml,text/xml,*/*"
      }});
      if (!r.ok) return null;
      return await r.text();
    } catch { return null; }
  }

  // Confirmed working from debug:
  // <link>https://nypost.com/2026/06/01/sports/...</link>  ← this is the pattern
  function getLink(item) {
    // Primary: <link> tag containing https URL (with any whitespace around it)
    const m1 = item.match(/<link>\s*(https?:\/\/[^\s<]+)\s*<\/link>/i);
    if (m1) return m1[1].trim();

    // Fallback: <link> with URL but no closing tag (some feeds)
    const m2 = item.match(/<link>\s*(https?:\/\/[^\s<]+)/i);
    if (m2) return m2[1].trim();

    // Last resort: guid if it's a real permalink (not NY Post style ?post_type=)
    const guidFalse = /<guid[^>]+isPermaLink\s*=\s*['"]false['"]/i.test(item);
    if (!guidFalse) {
      const m3 = item.match(/<guid[^>]*>\s*(https?:\/\/[^<\s?]+[^<\s]*)\s*<\/guid>/i);
      if (m3 && !m3[1].includes("?post_type=")) return m3[1].trim();
    }
    return "";
  }

  function parseRSS(xml, source, team) {
    if (!xml) return;
    // Slice to first <item> to avoid channel-level <link> contamination
    const start = xml.indexOf("<item");
    if (start < 0) return;
    const items = xml.slice(start).match(/<item[\s\S]*?<\/item>/g) || [];
    items.slice(0,20).forEach(item => {
      const title =
        item.match(/<title><!\[CDATA\[([\s\S]*?)\]\]><\/title>/)?.[1] ||
        item.match(/<title[^>]*>([\s\S]*?)<\/title>/)?.[1] || "";
      const link = getLink(item);
      const desc =
        item.match(/<description><!\[CDATA\[([\s\S]*?)\]\]><\/description>/)?.[1] ||
        item.match(/<description[^>]*>([\s\S]*?)<\/description>/)?.[1] || "";
      const pub = item.match(/<pubDate[^>]*>([\s\S]*?)<\/pubDate>/)?.[1]?.trim() || "";
      const image =
        item.match(/<enclosure[^>]+url="([^"]+\.(?:jpg|jpeg|png|webp))"/i)?.[1] ||
        item.match(/<media:content[^>]+url="([^"]+\.(?:jpg|jpeg|png|webp)[^"]*)"/i)?.[1] || null;
      if (title && link) add(clean(title), link, desc, pub, source, team, image);
    });
  }

  // ── FEEDS ─────────────────────────────────────────────────────────────────
  const NY_POST = [
    { url:"https://nypost.com/tag/new-york-yankees/feed/",   team:"Yankees",   src:"NY Post" },
    { url:"https://nypost.com/tag/new-york-mets/feed/",      team:"Mets",      src:"NY Post" },
    { url:"https://nypost.com/tag/new-york-jets/feed/",      team:"Jets",      src:"NY Post" },
    { url:"https://nypost.com/tag/new-york-giants/feed/",    team:"Giants",    src:"NY Post" },
    { url:"https://nypost.com/tag/new-york-knicks/feed/",    team:"Knicks",    src:"NY Post" },
    { url:"https://nypost.com/tag/brooklyn-nets/feed/",      team:"Nets",      src:"NY Post" },
    { url:"https://nypost.com/tag/new-york-rangers/feed/",   team:"Rangers",   src:"NY Post" },
    { url:"https://nypost.com/tag/new-york-islanders/feed/", team:"Islanders", src:"NY Post" },
    { url:"https://nypost.com/tag/new-jersey-devils/feed/",  team:"Devils",    src:"NY Post" },
  ];

  const OTHER = [
    { url:"https://www.mlbtraderumors.com/new-york-yankees/feed", team:"Yankees", src:"MLB Trade Rumors" },
    { url:"https://www.mlbtraderumors.com/new-york-mets/feed",    team:"Mets",    src:"MLB Trade Rumors" },
    { url:"https://sny.tv/rss/articles",                          team:"Mets",    src:"SNY"              },
    { url:"https://amny.com/sports/feed/",                        team:"All NY",  src:"amNY"             },
  ];

  // Google News — 102 items confirmed working from Vercel
  // CBMi links work when clicked in browser (redirect to real article)
  const GOOGLE = [
    { url:"https://news.google.com/rss/search?q=%22new+york+yankees%22&hl=en-US&gl=US&ceid=US:en",     team:"Yankees"   },
    { url:"https://news.google.com/rss/search?q=%22new+york+mets%22&hl=en-US&gl=US&ceid=US:en",        team:"Mets"      },
    { url:"https://news.google.com/rss/search?q=%22new+york+jets%22+nfl&hl=en-US&gl=US&ceid=US:en",    team:"Jets"      },
    { url:"https://news.google.com/rss/search?q=%22new+york+giants%22+nfl&hl=en-US&gl=US&ceid=US:en",  team:"Giants"    },
    { url:"https://news.google.com/rss/search?q=%22new+york+knicks%22&hl=en-US&gl=US&ceid=US:en",      team:"Knicks"    },
    { url:"https://news.google.com/rss/search?q=%22brooklyn+nets%22+nba&hl=en-US&gl=US&ceid=US:en",    team:"Nets"      },
    { url:"https://news.google.com/rss/search?q=%22new+york+rangers%22+nhl&hl=en-US&gl=US&ceid=US:en", team:"Rangers"   },
    { url:"https://news.google.com/rss/search?q=%22new+york+islanders%22&hl=en-US&gl=US&ceid=US:en",   team:"Islanders" },
    { url:"https://news.google.com/rss/search?q=%22new+jersey+devils%22+nhl&hl=en-US&gl=US&ceid=US:en",team:"Devils"    },
    { url:"https://news.google.com/rss/search?q=%22new+york+liberty%22+wnba&hl=en-US&gl=US&ceid=US:en",team:"Liberty"   },
  ];

  // ── FETCH ─────────────────────────────────────────────────────────────────
  await Promise.all([...NY_POST, ...OTHER].map(async ({url,team,src}) => {
    parseRSS(await get(url), src, team);
  }));

  await Promise.all(GOOGLE.map(async ({url,team}) => {
    const xml = await get(url);
    if (!xml) return;
    const start = xml.indexOf("<item");
    if (start < 0) return;
    const items = xml.slice(start).match(/<item[\s\S]*?<\/item>/g) || [];
    items.slice(0,15).forEach(item => {
      const rawTitle =
        item.match(/<title><!\[CDATA\[([\s\S]*?)\]\]><\/title>/)?.[1] ||
        item.match(/<title[^>]*>([\s\S]*?)<\/title>/)?.[1] || "";
      const title = clean(rawTitle).replace(/\s*[-–]\s*[^-–]{1,50}$/, "").trim();
      if (!title) return;
      // Google News <link> = CBMi redirect URL — works in browser
      const link = item.match(/<link>\s*(https?:\/\/[^\s<]+)/i)?.[1]?.trim() || "";
      if (!link.startsWith("http")) return;
      const pub = item.match(/<pubDate[^>]*>([\s\S]*?)<\/pubDate>/)?.[1]?.trim() || "";
      const src = clean(item.match(/<source[^>]*>([\s\S]*?)<\/source>/)?.[1] || "");
      add(title, link, "", pub, `Google News · ${src||"News"}`, team, null);
    });
  }));

  results.sort((a,b) => new Date(b.pub||0) - new Date(a.pub||0));
  res.status(200).json({ articles:results, count:results.length, timestamp:new Date().toISOString() });
}

// api/news.js — Vercel Serverless Function
// Confirmed working from Vercel: NY Post, amNY, Google News (102 items)
// Blocked from Vercel: SB Nation blogs, rss2json

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Cache-Control", "s-maxage=300, stale-while-revalidate=600");

  // Debug mode
  if (req.query?.debug === "1") {
    const xml = await get("https://nypost.com/tag/new-york-jets/feed/");
    if (!xml) return res.status(200).json({ error:"NY Post returned null" });
    const firstItem = xml.slice(xml.indexOf("<item"));
    const item = firstItem.match(/<item[\s\S]*?<\/item>/)?.[0] || "NO ITEM";
    return res.status(200).json({
      raw_item: item.slice(0,1000),
      link_tag_match: item.match(/<link>(https?:\/\/[^<\s]+)/i)?.[1] || "NO LINK FOUND",
      guid_match: item.match(/<guid[^>]*>([\s\S]*?)<\/guid>/i)?.[1]?.trim() || "NO GUID",
    });
  }

  // ── UTILS ─────────────────────────────────────────────────────────────────
  function decodeEntities(s) {
    return (s||"")
      .replace(/&amp;/g,"&").replace(/&lt;/g,"<").replace(/&gt;/g,">")
      .replace(/&quot;/g,'"').replace(/&apos;/g,"'").replace(/&nbsp;/g," ")
      .replace(/&#8216;/g,"'").replace(/&#8217;/g,"'")
      .replace(/&#8220;/g,'"').replace(/&#8221;/g,'"')
      .replace(/&#8212;/g,"—").replace(/&#8211;/g,"–")
      .replace(/&#\d+;/g,"");
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

  // ── RSS LINK EXTRACTOR ────────────────────────────────────────────────────
  // NY Post uses WordPress RSS where <link> appears as raw text between tags
  // with no closing tag in many cases. We use multiple strategies.
  function getLink(item) {
    // Strategy 1: <link>https://...</link> — standard wrapped
    const wrapped = item.match(/<link>\s*(https?:\/\/[^\s<]+)/i)?.[1]?.trim();
    if (wrapped) return wrapped;

    // Strategy 2: <guid isPermaLink="true">URL</guid>
    const guidTrue = /<guid[^>]+isPermaLink\s*=\s*['"]true['"]/i.test(item);
    if (guidTrue) {
      const g = item.match(/<guid[^>]*>\s*(https?:\/\/[^<]+)\s*<\/guid>/i)?.[1]?.trim();
      if (g) return g;
    }

    // Strategy 3: <guid> without isPermaLink="false" — treat as URL if it is one
    const guidFalse = /<guid[^>]+isPermaLink\s*=\s*['"]false['"]/i.test(item);
    if (!guidFalse) {
      const g = item.match(/<guid[^>]*>\s*(https?:\/\/[^<]+)\s*<\/guid>/i)?.[1]?.trim();
      if (g) return g;
    }

    // Strategy 4: self-closing <link/> followed by URL
    const selfClose = item.match(/<link\s*\/>\s*(https?:\/\/[^\s<]+)/i)?.[1]?.trim();
    if (selfClose) return selfClose;

    return "";
  }

  // ── RSS PARSER ────────────────────────────────────────────────────────────
  function parseRSS(xml, source, team) {
    if (!xml) return;
    // Strip everything before first <item> to avoid channel-level <link> matching
    const firstItem = xml.indexOf("<item");
    if (firstItem < 0) return;
    const itemsXml = xml.slice(firstItem);
    const items = itemsXml.match(/<item[\s\S]*?<\/item>/g) || [];
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
        item.match(/<media:content[^>]+url="([^"]+\.(?:jpg|jpeg|png|webp)[^"]*)"/i)?.[1] ||
        item.match(/<enclosure[^>]+url="([^"]+\.(?:jpg|jpeg|png|webp))"/i)?.[1] || null;
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
    { url:"https://sny.tv/rss/articles",                          team:"Mets",    src:"SNY"  },
    { url:"https://amny.com/sports/feed/",                        team:"All NY",  src:"amNY" },
  ];

  // Google News — confirmed working from Vercel (102 items per feed)
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

  // ── FETCH ALL ─────────────────────────────────────────────────────────────
  await Promise.all([...NY_POST, ...OTHER].map(async ({url,team,src}) => {
    parseRSS(await get(url), src, team);
  }));

  // Google News — fetch directly, parse items, use CBMi links (work in browser)
  await Promise.all(GOOGLE.map(async ({url,team}) => {
    const xml = await get(url);
    if (!xml) return;
    // Google News XML has items at the channel level — slice past channel tags
    const items = xml.match(/<item[\s\S]*?<\/item>/g) || [];
    items.slice(0,15).forEach(item => {
      // Title — strip "- Publisher Name" suffix
      const rawTitle =
        item.match(/<title><!\[CDATA\[([\s\S]*?)\]\]><\/title>/)?.[1] ||
        item.match(/<title[^>]*>([\s\S]*?)<\/title>/)?.[1] || "";
      const title = clean(rawTitle).replace(/\s*[-–]\s*[^-–]{1,50}$/, "").trim();
      if (!title) return;

      // Google News <link> is the CBMi redirect URL — works when clicked in browser
      // It appears between </title> and <guid> — extract with a specific pattern
      const linkMatch = item.match(/<link>(https?:\/\/news\.google\.com[^<\s]+)/i) ||
                        item.match(/<link>(https?:\/\/[^<\s]+)/i);
      const link = linkMatch?.[1]?.trim() || "";
      if (!link.startsWith("http")) return;

      const pub = item.match(/<pubDate[^>]*>([\s\S]*?)<\/pubDate>/)?.[1]?.trim() || "";
      // Source name from <source> tag
      const sourceName = item.match(/<source[^>]*>([\s\S]*?)<\/source>/)?.[1]?.trim() || "Google News";
      add(title, link, "", pub, `Google News · ${clean(sourceName)}`, team, null);
    });
  }));

  results.sort((a,b) => new Date(b.pub||0) - new Date(a.pub||0));
  res.status(200).json({ articles:results, count:results.length, timestamp:new Date().toISOString() });
}

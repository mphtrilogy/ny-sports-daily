// api/news.js — Vercel Serverless Function
// NY Sports Daily news aggregator

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Cache-Control", "s-maxage=300, stale-while-revalidate=600");

  const results = [];
  const seen = new Set();

  function decodeEntities(s) {
    return (s||"")
      .replace(/&amp;/g,"&").replace(/&lt;/g,"<").replace(/&gt;/g,">")
      .replace(/&quot;/g,'"').replace(/&apos;/g,"'").replace(/&nbsp;/g," ")
      .replace(/&#8216;/g,"'").replace(/&#8217;/g,"'").replace(/&#8220;/g,'"')
      .replace(/&#8221;/g,'"').replace(/&#8212;/g,"—").replace(/&#8211;/g,"–")
      .replace(/&#\d+;/g,"");
  }
  const stripHTML = s => (s||"").replace(/<[^>]*>/g," ").replace(/\s+/g," ").trim();
  const clean = s => stripHTML(decodeEntities(s||"")).trim();
  const isUrl = u => !!(u && u.startsWith("http"));

  function add(title, link, desc, pub, source, team, image) {
    const t = clean(title);
    const l = (link||"").trim();
    if (!t || !isUrl(l) || seen.has(t)) return;
    seen.add(t);
    results.push({ title:t, link:l, desc:clean(desc).slice(0,300),
      pub:pub||new Date().toISOString(), source, team, isNY:true, image:image||null });
  }

  async function get(url) {
    try {
      const ctrl = new AbortController();
      setTimeout(() => ctrl.abort(), 10000);
      const r = await fetch(url, { signal:ctrl.signal, headers:{
        "User-Agent":"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept":"application/rss+xml,application/xml,text/xml,*/*"
      }});
      if (!r.ok) return null;
      return await r.text();
    } catch { return null; }
  }

  // Extract best link from an RSS <item> block
  function getLink(item) {
    // 1. <link> tag — in RSS the item <link> is the article URL
    //    WordPress puts it as bare text: <link>https://...</link>
    //    OR after a self-closing: <link/>\nhttps://...
    const linkInTag = item.match(/<link>(https?:\/\/[^<\s]+)/i)?.[1]?.trim();
    if (linkInTag) return linkInTag;

    // 2. <guid isPermaLink="true"> or <guid> with no isPermaLink attr
    const guidFalse = /<guid[^>]+isPermaLink\s*=\s*['"]false['"]/i.test(item);
    if (!guidFalse) {
      const guid = item.match(/<guid[^>]*>(https?:\/\/[^<]+)<\/guid>/i)?.[1]?.trim();
      if (guid) return guid;
    }

    // 3. <link/> followed by URL on same or next line
    const afterSelfClose = item.match(/<link\s*\/>\s*(https?:\/\/[^\s<]+)/i)?.[1]?.trim();
    if (afterSelfClose) return afterSelfClose;

    // 4. atom:link with rel="alternate"
    const atomAlt = item.match(/<atom:link[^>]+rel=['"]alternate['"][^>]+href=['"]([^'"]+)['"]/i)?.[1];
    if (atomAlt && isUrl(atomAlt)) return atomAlt;

    // 5. Any CDATA guid that's a URL
    const guidCdata = item.match(/<guid[^>]*><!\[CDATA\[(https?:\/\/[^\]]+)\]\]>/i)?.[1]?.trim();
    if (guidCdata) return guidCdata;

    return "";
  }

  function parseRSS(xml, source, team) {
    if (!xml) return;
    const items = xml.match(/<item[\s\S]*?<\/item>/g) || [];
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
        item.match(/<enclosure[^>]+url="([^"]+\.(?:jpg|jpeg|png|webp))"/i)?.[1] ||
        item.match(/<media:thumbnail[^>]+url="([^"]+)"/i)?.[1] || null;
      if (title && link) add(clean(title), link, desc, pub, source, team, image);
    });
  }

  // Google News: extract <source url="PUBLISHER_FEED"> and fetch real article
  async function parseGoogleNews(xml, src, team) {
    if (!xml) return;
    const items = xml.match(/<item[\s\S]*?<\/item>/g) || [];
    await Promise.all(items.slice(0,8).map(async item => {
      // Title — strip trailing " - Publisher Name"
      const rawTitle =
        item.match(/<title><!\[CDATA\[([\s\S]*?)\]\]><\/title>/)?.[1] ||
        item.match(/<title[^>]*>([\s\S]*?)<\/title>/)?.[1] || "";
      const title = clean(rawTitle).replace(/\s*-\s*[^-]{1,40}$/, "").trim();
      if (!title) return;

      // Publisher's own RSS feed URL from <source url="...">
      const sourceUrl = item.match(/<source[^>]+url="([^"]+)"/)?.[1];
      const pub = item.match(/<pubDate[^>]*>([\s\S]*?)<\/pubDate>/)?.[1]?.trim() || "";
      if (!sourceUrl || !isUrl(sourceUrl)) return;

      // Fetch publisher feed and find matching article
      const feedXml = await get(sourceUrl);
      if (!feedXml) return;
      const feedItems = feedXml.match(/<item[\s\S]*?<\/item>/g) || [];
      for (const fi of feedItems.slice(0,15)) {
        const ftitle = clean(
          fi.match(/<title><!\[CDATA\[([\s\S]*?)\]\]><\/title>/)?.[1] ||
          fi.match(/<title[^>]*>([\s\S]*?)<\/title>/)?.[1] || ""
        );
        const titleCore = title.toLowerCase().slice(0,25);
        if (!ftitle.toLowerCase().includes(titleCore) &&
            !titleCore.includes(ftitle.toLowerCase().slice(0,25))) continue;
        const link = getLink(fi);
        if (!link) continue;
        const desc = fi.match(/<description><!\[CDATA\[([\s\S]*?)\]\]><\/description>/)?.[1] || "";
        add(ftitle||title, link, clean(desc).slice(0,300), pub, src, team, null);
        break;
      }
    }));
  }

  // ── FEEDS ──────────────────────────────────────────────────────────────────
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

  const GOOGLE = [
    { q:'"new york yankees"',       team:"Yankees"   },
    { q:'"new york mets"',          team:"Mets"      },
    { q:'"new york jets" nfl',      team:"Jets"      },
    { q:'"new york giants" nfl',    team:"Giants"    },
    { q:'"new york knicks"',        team:"Knicks"    },
    { q:'"brooklyn nets" nba',      team:"Nets"      },
    { q:'"new york rangers" nhl',   team:"Rangers"   },
    { q:'"new york islanders"',     team:"Islanders" },
    { q:'"new jersey devils" nhl',  team:"Devils"    },
    { q:'"new york liberty" wnba',  team:"Liberty"   },
  ].map(f => ({
    url:`https://news.google.com/rss/search?q=${encodeURIComponent(f.q)}&hl=en-US&gl=US&ceid=US:en`,
    team:f.team, src:"Google News"
  }));

  const SBN = [
    { url:"https://www.pinstripealley.com/rss/current",     team:"Yankees",   src:"Pinstripe Alley"   },
    { url:"https://www.amazinavenue.com/rss/current",        team:"Mets",      src:"Amazin' Avenue"    },
    { url:"https://www.ganggreennation.com/rss/current",     team:"Jets",      src:"Gang Green Nation" },
    { url:"https://www.bigblueview.com/rss/current",         team:"Giants",    src:"Big Blue View"     },
    { url:"https://www.postingandtoasting.com/rss/current",  team:"Knicks",    src:"Posting & Toasting"},
    { url:"https://www.netsdaily.com/rss/current",           team:"Nets",      src:"Nets Daily"        },
    { url:"https://www.blueshirtbanter.com/rss/current",     team:"Rangers",   src:"Blueshirt Banter"  },
    { url:"https://www.lighthousehockey.com/rss/current",    team:"Islanders", src:"Lighthouse Hockey" },
    { url:"https://www.allaboutthejersey.com/rss/current",   team:"Devils",    src:"All About Jersey"  },
  ];

  const OTHER = [
    { url:"https://www.mlbtraderumors.com/new-york-yankees/feed", team:"Yankees", src:"MLB Trade Rumors" },
    { url:"https://www.mlbtraderumors.com/new-york-mets/feed",    team:"Mets",    src:"MLB Trade Rumors" },
    { url:"https://sny.tv/rss/articles",                          team:"Mets",    src:"SNY"  },
    { url:"https://amny.com/sports/feed/",                        team:"All NY",  src:"amNY" },
  ];

  // Fetch RSS feeds in parallel
  await Promise.all([...NY_POST, ...SBN, ...OTHER].map(async ({url,team,src}) => {
    parseRSS(await get(url), src, team);
  }));

  // Google News — fetch publisher feeds to get real URLs
  await Promise.all(GOOGLE.map(async ({url,team,src}) => {
    await parseGoogleNews(await get(url), src, team);
  }));

  results.sort((a,b) => new Date(b.pub||0) - new Date(a.pub||0));
  res.status(200).json({ articles:results, count:results.length, timestamp:new Date().toISOString() });
}

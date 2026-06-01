// api/news.js — Vercel Serverless Function

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Cache-Control", "s-maxage=300, stale-while-revalidate=600");

  const results = [];
  const seen = new Set();

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
        "User-Agent":"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept":"application/rss+xml,application/xml,text/xml,*/*"
      }});
      if (!r.ok) return null;
      return await r.text();
    } catch { return null; }
  }

  function getLink(item) {
    const linkInTag = item.match(/<link>(https?:\/\/[^<\s]+)/i)?.[1]?.trim();
    if (linkInTag) return linkInTag;
    const guidFalse = /<guid[^>]+isPermaLink\s*=\s*['"]false['"]/i.test(item);
    if (!guidFalse) {
      const guid = item.match(/<guid[^>]*>(https?:\/\/[^<]+)<\/guid>/i)?.[1]?.trim();
      if (guid) return guid;
    }
    const afterSelfClose = item.match(/<link\s*\/>\s*(https?:\/\/[^\s<]+)/i)?.[1]?.trim();
    if (afterSelfClose) return afterSelfClose;
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
        item.match(/<enclosure[^>]+url="([^"]+\.(?:jpg|jpeg|png|webp))"/i)?.[1] || null;
      if (title && link) add(clean(title), link, desc, pub, source, team, image);
    });
  }

  // ── NY POST ────────────────────────────────────────────────────────────────
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

  // ── SB NATION ──────────────────────────────────────────────────────────────
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

  // ── OTHER ──────────────────────────────────────────────────────────────────
  const OTHER = [
    { url:"https://www.mlbtraderumors.com/new-york-yankees/feed", team:"Yankees", src:"MLB Trade Rumors" },
    { url:"https://www.mlbtraderumors.com/new-york-mets/feed",    team:"Mets",    src:"MLB Trade Rumors" },
    { url:"https://sny.tv/rss/articles",                          team:"Mets",    src:"SNY"  },
    { url:"https://amny.com/sports/feed/",                        team:"All NY",  src:"amNY" },
  ];

  // ── GOOGLE NEWS via rss2json ───────────────────────────────────────────────
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

  // Fetch all RSS feeds
  await Promise.all([...NY_POST, ...SBN, ...OTHER].map(async ({url,team,src}) => {
    parseRSS(await get(url), src, team);
  }));

  // Google News via rss2json — CBMi URLs work when clicked in browser
  await Promise.all(GOOGLE.map(async ({url,team}) => {
    try {
      const r = await fetch(`https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(url)}&count=15`);
      if (!r.ok) return;
      const json = await r.json();
      if (json.status !== "ok") return;
      (json.items||[]).forEach(item => {
        const title = clean((item.title||"").replace(/\s*-\s*[^-]+$/, ""));
        const link = item.link || item.guid || "";
        if (title && link.startsWith("http"))
          add(title, link, (item.description||"").replace(/<[^>]*>/g,"").trim().slice(0,200),
              item.pubDate||"", "Google News", team, item.thumbnail||null);
      });
    } catch {}
  }));

  results.sort((a,b) => new Date(b.pub||0) - new Date(a.pub||0));
  res.status(200).json({ articles:results, count:results.length, timestamp:new Date().toISOString() });
}

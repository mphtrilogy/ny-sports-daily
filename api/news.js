// api/news.js — Vercel Serverless Function
// Place at: ny-sports-daily/api/news.js

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET");
  res.setHeader("Cache-Control", "s-maxage=300, stale-while-revalidate=600");

  // Debug mode: ?debug=1 returns raw test results
  if (req.query?.debug === "1") {
    const testGoogleUrl = "https://news.google.com/rss/articles/CBMidEFVX3lxTFBzLURqemc4QTBKSUlwN09sSTltXzJYM1RZSUZRWVU5RVptS1BmRUlXRTdIZFVYek5oYnV1R1VjamoyWnV1U19oblZkelVRVTBQVzdQWFJ6YWR5dGVPQ085Ry1EdkRzSmdRUktUdFF6TFk2Y00y?oc=5";
    try {
      const ctrl = new AbortController();
      setTimeout(() => ctrl.abort(), 8000);
      const r = await fetch(testGoogleUrl, {
        signal: ctrl.signal,
        redirect: "follow",
        headers: { "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36" }
      });
      const body = await r.text();
      return res.status(200).json({
        final_url: r.url,
        status: r.status,
        redirected: r.redirected,
        body_preview: body.slice(0, 500),
        // Check for real URL in body
        url_in_body: (body.match(/https?:\/\/(?!.*google\.com)[^\s"'<>]+/)?.[0] || "none found"),
      });
    } catch(e) {
      return res.status(200).json({ error: String(e) });
    }
  }

  const results = [];
  const seen    = new Set();

  // ── TEXT UTILITIES ────────────────────────────────────────────────────────
  function decodeEntities(s) {
    return (s||"")
      .replace(/&#8216;/g,"'").replace(/&#8217;/g,"'")
      .replace(/&#8220;/g,'"').replace(/&#8221;/g,'"')
      .replace(/&#8212;/g,"—").replace(/&#8211;/g,"–")
      .replace(/&#038;/g,"&").replace(/&#39;/g,"'")
      .replace(/&amp;/g,"&").replace(/&lt;/g,"<")
      .replace(/&gt;/g,">").replace(/&quot;/g,'"')
      .replace(/&apos;/g,"'").replace(/&nbsp;/g," ")
      .replace(/&#\d+;/g,"");
  }
  const stripHTML  = s => (s||"").replace(/<[^>]*>/g," ").replace(/\s+/g," ").trim();
  const cleanText  = s => stripHTML(decodeEntities(s||"")).trim();
  const isGoodUrl  = u => u && u.startsWith("http") && !u.includes("news.google.com/rss");
  const domainOf   = u => { try { return new URL(u).hostname.replace("www.",""); } catch { return ""; } };

  function addItem(title, link, desc, pub, source, team, image) {
    const t = cleanText(title);
    if (!t || seen.has(t)) return;
    const l = isGoodUrl(link) ? link.trim() : null;
    if (!l) return; // skip items with no valid direct link
    seen.add(t);
    results.push({ title:t, link:l, desc:cleanText(desc).slice(0,300),
      pub:pub||new Date().toISOString(), source, team, isNY:true, image:image||null });
  }

  // ── FETCH ─────────────────────────────────────────────────────────────────
  async function safeFetch(url) {
    try {
      const ctrl = new AbortController();
      setTimeout(() => ctrl.abort(), 10000);
      const r = await fetch(url, {
        signal: ctrl.signal,
        headers: { "User-Agent":"Mozilla/5.0 (compatible; NYSportsDaily/1.0; +https://nysportsdaily.com)",
                   "Accept":"application/rss+xml, application/xml, text/xml, */*" }
      });
      if (!r.ok) return null;
      return await r.text();
    } catch { return null; }
  }

  // ── RSS PARSER — handles all major RSS link patterns ─────────────────────
  function parseRSS(xml, source, team) {
    if (!xml) return;
    const items = xml.match(/<item[\s\S]*?<\/item>/g) || [];
    items.slice(0, 20).forEach(item => {

      // TITLE
      const title =
        item.match(/<title><!\[CDATA\[([\s\S]*?)\]\]><\/title>/)?.[1] ||
        item.match(/<title[^>]*>([\s\S]*?)<\/title>/)?.[1] || "";

      // LINK — try multiple strategies in priority order
      let link = "";

      // Strategy 1: <guid isPermaLink="true"> or plain <guid> without isPermaLink="false"
      const guidFalse   = /<guid[^>]+isPermaLink\s*=\s*["']false["'][^>]*>([\s\S]*?)<\/guid>/i.exec(item);
      const guidDefault = /<guid[^>]*>([\s\S]*?)<\/guid>/i.exec(item);
      if (!guidFalse && guidDefault) {
        const g = guidDefault[1].trim();
        if (isGoodUrl(g)) link = g;
      }

      // Strategy 2: <link> inside <item> — handle both self-closing and wrapped versions
      // In RSS 2.0, <link> inside an item is the article URL
      // It may appear as: <link>URL</link> OR <link/>URL (malformed but common)
      if (!link) {
        // Try standard wrapped form
        const linkWrapped = item.match(/<link>(https?:\/\/[^<]+)<\/link>/i)?.[1]?.trim();
        if (linkWrapped && isGoodUrl(linkWrapped)) link = linkWrapped;
      }
      if (!link) {
        // Try form where link appears after closing tag with no wrapper (common in Wordpress RSS)
        const linkAfterClose = item.match(/<link\/>(https?:\/\/[^\s<]+)/i)?.[1]?.trim();
        if (linkAfterClose && isGoodUrl(linkAfterClose)) link = linkAfterClose;
      }
      if (!link) {
        // Try atom:link alternate
        const atomLink = item.match(/<atom:link[^>]+href="(https?:\/\/[^"]+)"/i)?.[1];
        if (atomLink && isGoodUrl(atomLink)) link = atomLink;
      }

      // Strategy 3: look for the URL pattern in the raw item text after <link> tag
      if (!link) {
        const linkRaw = item.match(/<link[^>]*>\s*(https?:\/\/[^\s<"]+)/i)?.[1]?.trim();
        if (linkRaw && isGoodUrl(linkRaw)) link = linkRaw;
      }

      // Strategy 4: CDATA guid fallback
      if (!link) {
        const guidCdata = item.match(/<guid[^>]*><!\[CDATA\[([\s\S]*?)\]\]><\/guid>/i)?.[1]?.trim();
        if (guidCdata && isGoodUrl(guidCdata)) link = guidCdata;
      }

      // DESCRIPTION
      const descRaw =
        item.match(/<description><!\[CDATA\[([\s\S]*?)\]\]><\/description>/)?.[1] ||
        item.match(/<description[^>]*>([\s\S]*?)<\/description>/)?.[1] || "";
      const desc = cleanText(descRaw).replace(/https?:\/\/\S+/g,"").trim().slice(0,300);

      // DATE
      const pub = item.match(/<pubDate[^>]*>([\s\S]*?)<\/pubDate>/)?.[1]?.trim() || "";

      // IMAGE
      const image =
        item.match(/<media:content[^>]+url="([^"]+\.(?:jpg|jpeg|png|webp)[^"]*)"/i)?.[1] ||
        item.match(/<enclosure[^>]+url="([^"]+\.(?:jpg|jpeg|png|webp))"/i)?.[1] ||
        item.match(/<media:thumbnail[^>]+url="([^"]+)"/i)?.[1] ||
        null;

      if (title && link) addItem(cleanText(title), link, desc, pub, source, team, image);
    });
  }

  // ── GOOGLE NEWS — extract real article URL ──────────────────────────────────
  // Decode a Google News CBMi... article ID to real URL via their redirect
  async function decodeGoogleNewsUrl(googleUrl) {
    try {
      const ctrl = new AbortController();
      setTimeout(() => ctrl.abort(), 5000);
      const r = await fetch(googleUrl, {
        signal: ctrl.signal,
        redirect: "follow",
        headers: { "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36" }
      });
      // After redirect, r.url is the real article URL
      if (r.url && !r.url.includes("news.google.com")) return r.url;
      // If still on Google, check Location header
      const loc = r.headers.get("location");
      if (loc && !loc.includes("news.google.com")) return loc;
      return null;
    } catch { return null; }
  }

  function extractGoogleHref(text) {
    // Entity-encoded: &lt;a href=&quot;URL&quot;&gt; or &lt;a href="URL"&gt;
    const entityMatch = text.match(/href=(?:&quot;|")(https?:\/\/[^&"<\s]+)/);
    if (entityMatch) return decodeEntities(entityMatch[1]);
    // Direct href="URL"
    const directMatch = text.match(/href="(https?:\/\/[^"]+)"/);
    if (directMatch) return directMatch[1];
    return null;
  }

  async function parseGoogleNews(xml, src, team) {
    if (!xml) return;
    const items = xml.match(/<item[\s\S]*?<\/item>/g) || [];
    // Process up to 8 items per team (limit redirects)
    const parsed = items.slice(0, 8).map(item => {
      const title = cleanText(
        item.match(/<title><!\[CDATA\[([\s\S]*?)\]\]><\/title>/)?.[1] ||
        item.match(/<title[^>]*>([\s\S]*?)<\/title>/)?.[1] || ""
      );
      if (!title) return null;
      // Extract Google redirect URL from description (entity-encoded href)
      const descRaw =
        item.match(/<description><!\[CDATA\[([\s\S]*?)\]\]><\/description>/)?.[1] ||
        item.match(/<description[^>]*>([\s\S]*?)<\/description>/)?.[1] || "";
      const googleUrl = extractGoogleHref(descRaw) || extractGoogleHref(item);
      const pub = item.match(/<pubDate[^>]*>([\s\S]*?)<\/pubDate>/)?.[1]?.trim() || "";
      const descText = cleanText(descRaw.replace(/<[^>]*>/g," ")).slice(0,200);
      return { title, googleUrl, pub, descText };
    }).filter(Boolean);

    // Follow all Google redirects in parallel to get real article URLs
    await Promise.all(parsed.map(async ({ title, googleUrl, pub, descText }) => {
      if (!googleUrl) return;
      const realUrl = await decodeGoogleNewsUrl(googleUrl);
      if (realUrl && isGoodUrl(realUrl)) {
        addItem(title, realUrl, descText, pub, src, team, null);
      }
    }));
  }

  // ── FEEDS ─────────────────────────────────────────────────────────────────
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
    { q:'"new york yankees"',        team:"Yankees"   },
    { q:'"new york mets"',           team:"Mets"      },
    { q:'"new york jets" nfl',       team:"Jets"      },
    { q:'"new york giants" nfl',     team:"Giants"    },
    { q:'"new york knicks"',         team:"Knicks"    },
    { q:'"brooklyn nets" nba',       team:"Nets"      },
    { q:'"new york rangers" nhl',    team:"Rangers"   },
    { q:'"new york islanders"',      team:"Islanders" },
    { q:'"new jersey devils" nhl',   team:"Devils"    },
    { q:'"new york liberty" wnba',   team:"Liberty"   },
  ].map(f => ({
    url:`https://news.google.com/rss/search?q=${encodeURIComponent(f.q)}&hl=en-US&gl=US&ceid=US:en`,
    team:f.team, src:"Google News"
  }));

  // Bleacher Report — open RSS, works from Vercel, team-specific
  const BLEACHER = [
    { url:"https://bleacherreport.com/new-york-yankees/feed",      team:"Yankees",   src:"Bleacher Report" },
    { url:"https://bleacherreport.com/new-york-mets/feed",         team:"Mets",      src:"Bleacher Report" },
    { url:"https://bleacherreport.com/new-york-jets/feed",         team:"Jets",      src:"Bleacher Report" },
    { url:"https://bleacherreport.com/new-york-giants/feed",       team:"Giants",    src:"Bleacher Report" },
    { url:"https://bleacherreport.com/new-york-knicks/feed",       team:"Knicks",    src:"Bleacher Report" },
    { url:"https://bleacherreport.com/brooklyn-nets/feed",         team:"Nets",      src:"Bleacher Report" },
    { url:"https://bleacherreport.com/new-york-rangers/feed",      team:"Rangers",   src:"Bleacher Report" },
    { url:"https://bleacherreport.com/new-york-islanders/feed",    team:"Islanders", src:"Bleacher Report" },
    { url:"https://bleacherreport.com/new-jersey-devils/feed",     team:"Devils",    src:"Bleacher Report" },
  ];

  const MLB_TR = [
    { url:"https://www.mlbtraderumors.com/new-york-yankees/feed", team:"Yankees", src:"MLB Trade Rumors" },
    { url:"https://www.mlbtraderumors.com/new-york-mets/feed",    team:"Mets",    src:"MLB Trade Rumors" },
  ];

  const SBN = [
    { url:"https://www.pinstripealley.com/rss/current",      team:"Yankees",   src:"Pinstripe Alley"   },
    { url:"https://www.amazinavenue.com/rss/current",         team:"Mets",      src:"Amazin' Avenue"    },
    { url:"https://www.ganggreennation.com/rss/current",      team:"Jets",      src:"Gang Green Nation" },
    { url:"https://www.bigblueview.com/rss/current",          team:"Giants",    src:"Big Blue View"     },
    { url:"https://www.postingandtoasting.com/rss/current",   team:"Knicks",    src:"Posting & Toasting"},
    { url:"https://www.netsdaily.com/rss/current",            team:"Nets",      src:"Nets Daily"        },
    { url:"https://www.blueshirtbanter.com/rss/current",      team:"Rangers",   src:"Blueshirt Banter"  },
    { url:"https://www.lighthousehockey.com/rss/current",     team:"Islanders", src:"Lighthouse Hockey" },
    { url:"https://www.allaboutthejersey.com/rss/current",    team:"Devils",    src:"All About Jersey"  },
  ];

  const OTHER = [
    { url:"https://sny.tv/rss/articles",   team:"Mets",   src:"SNY"  },
    { url:"https://amny.com/sports/feed/", team:"All NY", src:"amNY" },
  ];

  // Fetch all feeds in parallel
  await Promise.all([...NY_POST, ...MLB_TR, ...SBN, ...OTHER].map(async ({url,team,src}) => {
    parseRSS(await safeFetch(url), src, team);
  }));

  // Google News: follow redirects to get real article URLs
  await Promise.all(GOOGLE.map(async ({url,team,src}) => {
    await parseGoogleNews(await safeFetch(url), src, team);
  }));

  await Promise.all(BLEACHER.map(async ({url,team,src}) => {
    parseRSS(await safeFetch(url), src, team);
  }));

  results.sort((a,b) => new Date(b.pub||0) - new Date(a.pub||0));
  res.status(200).json({ articles:results, count:results.length, timestamp:new Date().toISOString() });
}

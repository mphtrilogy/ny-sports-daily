import { useState, useEffect, useCallback, useRef, createContext, useContext } from "react";

// ─── SUPABASE CONFIG ───────────────────────────────────────────────────────
const SUPABASE_URL = "https://fnxoucliekhotvartyfu.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZueG91Y2xpZWtob3R2YXJ0eWZ1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM5NTI3MzEsImV4cCI6MjA4OTUyODczMX0.V4A75JO9s-7MbDRY7VMydwydOvdkU4SNSz_BRoVAoqA";

// Dark mode context — must be declared before any component that uses it
const DarkModeCtx  = createContext(true);
const MyTeamsCtx   = createContext(new Set());

// Maps full team names (as they appear in game/news data) -> My Teams ID
const MY_TEAMS_NAME_MAP = {
  "new york yankees":"Yankees","new york mets":"Mets",
  "new york knicks":"Knicks","brooklyn nets":"Nets",
  "new york rangers":"Rangers","new york islanders":"Islanders","new jersey devils":"Devils",
  "new york jets":"Jets","new york giants":"Giants",
  "new york liberty":"Liberty","nycfc":"NYCFC",
  "new york red bulls":"RedBulls","gotham fc":"Gotham",
  // Short names
  "yankees":"Yankees","mets":"Mets","knicks":"Knicks","nets":"Nets",
  "rangers":"Rangers","islanders":"Islanders","devils":"Devils",
  "jets":"Jets","giants":"Giants","liberty":"Liberty",
};
function teamInMyTeams(myTeams, ...names) {
  return names.some(n => {
    const id = MY_TEAMS_NAME_MAP[(n||"").toLowerCase()];
    return id && myTeams.has(id);
  });
}

async function sbFetch(table, params = "") {
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}${params}`, {
      method: "GET",
      headers: {
        "apikey":        SUPABASE_KEY,
        "Authorization": `Bearer ${SUPABASE_KEY}`,
        "Content-Type":  "application/json",
        "Accept":        "application/json",
      }
    });
    if (!res.ok) return [];
    return res.json();
  } catch(e) { return []; }
}

async function sbRandom(table, filter = "") {
  try {
    const headers = {
      "apikey":        SUPABASE_KEY,
      "Authorization": `Bearer ${SUPABASE_KEY}`,
      "Content-Type":  "application/json",
      "Accept":        "application/json",
      "Prefer":        "count=exact",
      "Range":         "0-0",
    };
    const countRes = await fetch(
      `${SUPABASE_URL}/rest/v1/${table}?${filter}select=id`,
      { headers }
    );
    const countHeader = countRes.headers.get("content-range");
    const total = countHeader ? parseInt(countHeader.split("/")[1]) || 50 : 50;
    const offset = Math.floor(Math.random() * Math.max(total, 1));
    const data = await sbFetch(table, `?${filter}limit=1&offset=${offset}`);
    return Array.isArray(data) ? data[0] || null : null;
  } catch(e) { return null; }
}

// ─── NY TEAMS CONFIG ───────────────────────────────────────────────────────
const NY_TEAMS = {
  NFL:  [{ name: "Jets",    espnId: "20", color: "#125740" }, { name: "Giants", espnId: "19", color: "#0B2265" }],
  MLB:  [{ name: "Yankees", espnId: "10", color: "#003087" }, { name: "Mets",   espnId: "21", color: "#002D72" }],
  NBA:  [{ name: "Knicks",  espnId: "18", color: "#006BB6" }, { name: "Nets",   espnId: "17", color: "#000000" }],
  NHL:  [{ name: "Rangers", espnId: "13", color: "#0038A8" }, { name: "Islanders", espnId: "12", color: "#00539B" }, { name: "NJ Devils", espnId: "11", color: "#CE1126" }],
  MLS:  [{ name: "NYCFC",   espnId: "18479", color: "#6CACE4" }, { name: "Red Bulls", espnId: "399", color: "#ED1C2E" }],
  WNBA: [{ name: "Liberty", espnId: "20",   color: "#6ECEB2" }],
  NWSL: [{ name: "Gotham FC", espnId: "1163", color: "#0A0A2E" }],
};

const ALL_TEAM_IDS = Object.values(NY_TEAMS).flat().map(t => String(t.espnId));
const NY_EXACT_NAMES = [
  "new york yankees","new york mets","new york jets","new york giants",
  "new york knicks","brooklyn nets","new york rangers","new york islanders",
  "new jersey devils","new york liberty","nycfc","new york red bulls","nj/ny gotham fc","gotham fc"
];

const SPORT_ENDPOINTS = [
  { sport: "football", league: "nfl",       label: "NFL"  },
  { sport: "baseball", league: "mlb",       label: "MLB"  },
  { sport: "basketball", league: "nba",     label: "NBA"  },
  { sport: "hockey",   league: "nhl",       label: "NHL"  },
  { sport: "soccer",   league: "usa.1",     label: "MLS"  },
  { sport: "basketball", league: "wnba",   label: "WNBA" },
  { sport: "soccer",     league: "nwsl",   label: "NWSL" },
];

// ─── ESPN NEWS TEAMS ──────────────────────────────────────────────────────
// Team-specific ESPN news — always NY relevant, no keyword filtering needed
const NY_TEAM_NEWS = [
  { sport:"baseball",   league:"mlb",  id:"10",    name:"Yankees",   espnSlug:"nyy" },
  { sport:"baseball",   league:"mlb",  id:"21",    name:"Mets",      espnSlug:"nym" },
  { sport:"football",   league:"nfl",  id:"20",    name:"Jets",      espnSlug:"nyj" },
  { sport:"football",   league:"nfl",  id:"19",    name:"Giants",    espnSlug:"nyg" },
  { sport:"basketball", league:"nba",  id:"18",    name:"Knicks",    espnSlug:"ny"  },
  { sport:"basketball", league:"nba",  id:"17",    name:"Nets",      espnSlug:"bkn" },
  { sport:"hockey",     league:"nhl",  id:"13",    name:"Rangers",   espnSlug:"nyr" },
  { sport:"hockey",     league:"nhl",  id:"12",    name:"Islanders", espnSlug:"nyi" },
  { sport:"hockey",     league:"nhl",  id:"11",    name:"Devils",    espnSlug:"njd" },
  { sport:"basketball", league:"wnba", id:"20",    name:"Liberty",   espnSlug:"ny"  },
  { sport:"soccer",     league:"usa.1",id:"18479", name:"NYCFC",     espnSlug:"nyc" },
  { sport:"soccer",     league:"nwsl", id:"1163",  name:"Gotham FC", espnSlug:"nj"  },
  { sport:"soccer",     league:"usa.1",id:"399",   name:"Red Bulls", espnSlug:"rbny"},
];

const NY_EXTRA_NEWS = [];

// ── STRICT NY KEYWORDS — full team names to avoid SF Giants / Texas Rangers ──

// ── RSS FEEDS via rss2json ────────────────────────────────────────────────
const NY_RSS_FEEDS = [
  // NY Post — team-specific feeds (much more targeted than general sports feed)
  { url:"https://nypost.com/tag/new-york-yankees/feed/",   name:"NY Post",  team:"Yankees"   },
  { url:"https://nypost.com/tag/new-york-mets/feed/",      name:"NY Post",  team:"Mets"      },
  { url:"https://nypost.com/tag/new-york-jets/feed/",      name:"NY Post",  team:"Jets"      },
  { url:"https://nypost.com/tag/new-york-giants/feed/",    name:"NY Post",  team:"Giants"    },
  { url:"https://nypost.com/tag/new-york-knicks/feed/",    name:"NY Post",  team:"Knicks"    },
  { url:"https://nypost.com/tag/brooklyn-nets/feed/",      name:"NY Post",  team:"Nets"      },
  { url:"https://nypost.com/tag/new-york-rangers/feed/",   name:"NY Post",  team:"Rangers"   },
  { url:"https://nypost.com/tag/new-york-islanders/feed/", name:"NY Post",  team:"Islanders" },
  { url:"https://nypost.com/tag/new-jersey-devils/feed/",  name:"NY Post",  team:"Devils"    },
  // Google News RSS — broad NY sports coverage, passes through rss2json
  { url:"https://news.google.com/rss/search?q=%22new+york+yankees%22&hl=en-US&gl=US&ceid=US:en",   name:"Google News", team:"Yankees"   },
  { url:"https://news.google.com/rss/search?q=%22new+york+mets%22&hl=en-US&gl=US&ceid=US:en",      name:"Google News", team:"Mets"      },
  { url:"https://news.google.com/rss/search?q=%22new+york+jets%22+nfl&hl=en-US&gl=US&ceid=US:en",  name:"Google News", team:"Jets"      },
  { url:"https://news.google.com/rss/search?q=%22new+york+giants%22+nfl&hl=en-US&gl=US&ceid=US:en",name:"Google News", team:"Giants"    },
  { url:"https://news.google.com/rss/search?q=%22new+york+knicks%22&hl=en-US&gl=US&ceid=US:en",    name:"Google News", team:"Knicks"    },
  { url:"https://news.google.com/rss/search?q=%22brooklyn+nets%22&hl=en-US&gl=US&ceid=US:en",      name:"Google News", team:"Nets"      },
  { url:"https://news.google.com/rss/search?q=%22new+york+rangers%22+nhl&hl=en-US&gl=US&ceid=US:en",name:"Google News",team:"Rangers"   },
  { url:"https://news.google.com/rss/search?q=%22new+york+islanders%22&hl=en-US&gl=US&ceid=US:en", name:"Google News", team:"Islanders" },
  { url:"https://news.google.com/rss/search?q=%22new+jersey+devils%22&hl=en-US&gl=US&ceid=US:en",  name:"Google News", team:"Devils"    },
  { url:"https://news.google.com/rss/search?q=%22new+york+liberty%22+wnba&hl=en-US&gl=US&ceid=US:en",name:"Google News",team:"Liberty" },
  // MLB Trade Rumors — best baseball transaction news
  { url:"https://www.mlbtraderumors.com/new-york-yankees/feed", name:"MLB Trade Rumors", team:"Yankees" },
  { url:"https://www.mlbtraderumors.com/new-york-mets/feed",    name:"MLB Trade Rumors", team:"Mets"    },
  // SB Nation team blogs — deep fan coverage
  { url:"https://www.pinstripealley.com/rss/current",     name:"Pinstripe Alley",   team:"Yankees"   },
  { url:"https://www.amazinavenue.com/rss/current",        name:"Amazin' Avenue",    team:"Mets"      },
  { url:"https://www.ganggreennation.com/rss/current",     name:"Gang Green Nation", team:"Jets"      },
  { url:"https://www.bigblueview.com/rss/current",         name:"Big Blue View",     team:"Giants"    },
  { url:"https://www.postingandtoasting.com/rss/current",  name:"Posting & Toasting",team:"Knicks"    },
  { url:"https://www.blueshirtbanter.com/rss/current",     name:"Blueshirt Banter",  team:"Rangers"   },
  { url:"https://www.lighthousehockey.com/rss/current",    name:"Lighthouse Hockey", team:"Islanders" },
  { url:"https://www.allaboutthejersey.com/rss/current",   name:"All About Jersey",  team:"Devils"    },
  { url:"https://www.netsdaily.com/rss/current",           name:"Nets Daily",        team:"Nets"      },
  // SNY — best Mets/Yankees TV coverage
  { url:"https://sny.tv/rss/articles",                     name:"SNY",               team:"Mets"      },
];
async function tryRSSFeed(feed) {
  try {
    const res = await fetch(`https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(feed.url)}&count=10`);
    const json = await res.json();
    if (json.status !== "ok" || !json.items?.length) return [];
    return json.items.map(item => ({
      title:  item.title?.trim() || "",
      link:   item.link || item.guid || "#",
      desc:   item.description?.replace(/<[^>]*>/g,"").trim().slice(0,200) || "",
      pub:    item.pubDate || "",
      source: feed.name,
    })).filter(i => i.title);
  } catch { return []; }
}

const NY_KEYWORDS = [
  // Full team names — safest
  "new york yankees","new york mets","new york jets","new york giants",
  "new york knicks","brooklyn nets","new york rangers","new york islanders",
  "new jersey devils","new york liberty","nycfc","gotham fc",
  // Short names SAFE to use (no other major team shares these)
  "yankees","mets","knicks","nets","islanders","liberty","devils","red bulls",
  // Location — articles mentioning these are almost always NY sports
  "bronx","flushing","citi field","yankee stadium","madison square garden",
  "msg sports","metlife stadium","ubs arena","barclays center","prudential center",
  // NOT included: "giants" (SF Giants), "rangers" (Texas Rangers), "jets" (generic aviation)
];

// ─── DATE HELPERS ──────────────────────────────────────────────────────────
function getDateLabel(d) {
  const today = new Date(); today.setHours(0,0,0,0);
  const yesterday = new Date(today); yesterday.setDate(today.getDate()-1);
  const check = new Date(d); check.setHours(0,0,0,0);
  if (check.getTime() === today.getTime()) return "TODAY";
  if (check.getTime() === yesterday.getTime()) return "YESTERDAY";
  return check.toLocaleDateString("en-US", { weekday:"short", month:"short", day:"numeric" }).toUpperCase();
}

function formatESPNDate(d) {
  return `${d.getFullYear()}${String(d.getMonth()+1).padStart(2,"0")}${String(d.getDate()).padStart(2,"0")}`;
}

function getLast7Days() {
  return Array.from({length:7}, (_,i) => {
    const d = new Date(); d.setDate(d.getDate() - i); return d;
  });
}

// ─── ESPN FETCH ────────────────────────────────────────────────────────────
async function fetchESPNScores(date) {
  const dateStr = formatESPNDate(date);
  const results = [];
  await Promise.all(SPORT_ENDPOINTS.map(async ({ sport, league, label }) => {
    try {
      const url = `https://site.api.espn.com/apis/site/v2/sports/${sport}/${league}/scoreboard?dates=${dateStr}`;
      const res = await fetch(url);
      const json = await res.json();
      (json.events || []).forEach(event => {
        const comp = event.competitions?.[0];
        if (!comp) return;
        const teams = comp.competitors || [];
        const isNY = teams.some(t =>
          ALL_TEAM_IDS.includes(String(t.team?.id)) ||
          NY_EXACT_NAMES.includes((t.team?.displayName || "").toLowerCase())
        );
        const home = teams.find(t => t.homeAway === "home");
        const away = teams.find(t => t.homeAway === "away");
        if (!home || !away) return;
        const status = comp.status?.type;
        // Broadcast networks
        const broadcasts = (comp.broadcasts || []).flatMap(b => b.names || []);
        // Game time
        const gameDate = event.date ? new Date(event.date) : null;
        const gameTime = gameDate ? gameDate.toLocaleTimeString("en-US", { hour:"numeric", minute:"2-digit", timeZoneName:"short" }) : null;
        results.push({
          id: event.id,
          sport: label,
          homeTeam: home.team?.displayName || "Home",
          awayTeam: away.team?.displayName || "Away",
          homeScore: home.score ?? "-",
          awayScore: away.score ?? "-",
          homeColor: home.team?.color ? `#${home.team.color}` : "#333",
          awayColor: away.team?.color ? `#${away.team.color}` : "#333",
          homeLogo: home.team?.logo,
          awayLogo: away.team?.logo,
          statusState: status?.state,
          statusDesc: status?.shortDetail || status?.description || "",
          isNY,
          headline: event.shortName,
          venue: comp.venue?.fullName || "",
          broadcasts,
          gameTime,
          gameDate,
        });
      });
    } catch(e) { /* silently skip failed leagues */ }
  }));
  return results;
}

// ─── ESPN STANDINGS FETCH ──────────────────────────────────────────────────
const STANDINGS_ENDPOINTS = [
  { sport:"baseball",    league:"mlb",  label:"MLB",  division:"AL East", teams:["Yankees","Mets"] },
  { sport:"football",    league:"nfl",  label:"NFL",  division:"AFC East", teams:["Jets","Giants"] },
  { sport:"basketball",  league:"nba",  label:"NBA",  division:"Atlantic", teams:["Knicks","Nets"] },
  { sport:"hockey",      league:"nhl",  label:"NHL",  division:"Metro",   teams:["Rangers","Islanders","Devils"] },
  { sport:"basketball",  league:"wnba", label:"WNBA", division:"East",    teams:["Liberty"] },
  { sport:"soccer",      league:"nwsl", label:"NWSL", division:"East",    teams:["Gotham"] },
  { sport:"soccer",      league:"usa.1",label:"MLS",  division:"East",    teams:["NYCFC","Red Bulls"] },
];

async function fetchStandings() {
  const results = [];
  await Promise.all(STANDINGS_ENDPOINTS.map(async ({ sport, league, label, teams }) => {
    try {
      const url = `https://site.api.espn.com/apis/v2/sports/${sport}/${league}/standings?level=3`;
      const res  = await fetch(url);
      const json = await res.json();

      // Walk the children tree to find division groups with entries
      function extractGroups(node) {
        if (node?.standings?.entries?.length) return [node];
        if (node?.children?.length) return node.children.flatMap(extractGroups);
        return [];
      }

      const groups = extractGroups(json);

      groups.forEach(group => {
        const divName = group.name || label;
        const entries = group.standings?.entries || [];
        if (!entries.length) return;

        const rows = entries.map(e => {
          const team = e.team?.displayName || e.team?.name || "";
          const stats = {};
          (e.stats || []).forEach(s => { stats[s.name] = s.displayValue ?? s.value; });
          return {
            team,
            abbrev: e.team?.abbreviation || "",
            logo:   e.team?.logos?.[0]?.href || "",
            w:      stats.wins        ?? stats.W   ?? "-",
            l:      stats.losses      ?? stats.L   ?? "-",
            pct:    stats.winPercent  ?? stats.PCT ?? "-",
            gb:     stats.gamesBehind ?? stats.GB  ?? "-",
            isNY:   teams.some(t => team.toLowerCase().includes(t.toLowerCase())),
          };
        });

        if (rows.length) results.push({ league: label, division: divName, rows });
      });
    } catch(e) { console.log('standings error', label, e); }
  }));
  return results;
}

// ─── ESPN SCHEDULE FETCH ───────────────────────────────────────────────────
async function fetchNYSchedule() {
  const NY_TEAM_ESPN = [
    { name:"Yankees",   sport:"baseball",   league:"mlb",        id:"10" },
    { name:"Mets",      sport:"baseball",   league:"mlb",        id:"21" },
    { name:"Jets",      sport:"football",   league:"nfl",        id:"20" },
    { name:"Giants",    sport:"football",   league:"nfl",        id:"19" },
    { name:"Knicks",    sport:"basketball", league:"nba",        id:"18" },
    { name:"Nets",      sport:"basketball", league:"nba",        id:"17" },
    { name:"Rangers",   sport:"hockey",     league:"nhl",        id:"13" },
    { name:"Islanders", sport:"hockey",     league:"nhl",        id:"12" },
    { name:"NJ Devils", sport:"hockey",     league:"nhl",        id:"11" },
    { name:"Liberty",   sport:"basketball", league:"wnba",       id:"20" },
    { name:"Gotham FC", sport:"soccer",     league:"nwsl",       id:"1163" },
    { name:"NYCFC",     sport:"soccer",     league:"usa.1",      id:"18479" },
  ];
  const results = [];
  await Promise.all(NY_TEAM_ESPN.map(async ({ name, sport, league, id }) => {
    try {
      const url = `https://site.api.espn.com/apis/site/v2/sports/${sport}/${league}/teams/${id}/schedule`;
      const res = await fetch(url);
      const json = await res.json();
      const events = json.events || [];
      const today = new Date();
      today.setHours(0,0,0,0);
      // For WNBA, look broader since season may not have started
      const upcoming = events.filter(e => {
        const d = new Date(e.date);
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - 1); // include yesterday
        return d >= cutoff;
      }).slice(0, 8);
      upcoming.forEach(event => {
        const comp = event.competitions?.[0];
        const home = comp?.competitors?.find(t => t.homeAway === "home");
        const away = comp?.competitors?.find(t => t.homeAway === "away");
        if (!home || !away) return;
        const broadcasts = (comp.broadcasts || []).flatMap(b => b.names || []);
        results.push({
          team: name,
          sport: league.toUpperCase(),
          date: new Date(event.date),
          homeTeam: home.team?.displayName,
          awayTeam: away.team?.displayName,
          homeLogo: home.team?.logo,
          awayLogo: away.team?.logo,
          venue: comp.venue?.fullName || "",
          broadcasts,
          isHome: home.team?.id === id,
        });
      });
    } catch(e) {}
  }));
  return results.sort((a,b) => a.date - b.date);
}

// ─── NY SPORTS QUOTES ─────────────────────────────────────────────────────
const NY_QUOTES = [
  // ── YANKEES ──
  { quote:"I want to thank the Good Lord for making me a Yankee.", author:"Joe DiMaggio", team:"Yankees", wiki:"https://en.wikipedia.org/wiki/Joe_DiMaggio" },
  { quote:"There is always some kid who may be seeing me for the first or last time. I owe him my best.", author:"Joe DiMaggio", team:"Yankees", wiki:"https://en.wikipedia.org/wiki/Joe_DiMaggio" },
  { quote:"Today I consider myself the luckiest man on the face of the earth.", author:"Lou Gehrig", team:"Yankees", context:"Farewell speech, Yankee Stadium, July 4, 1939", wiki:"https://en.wikipedia.org/wiki/Lou_Gehrig" },
  { quote:"It ain't over till it's over.", author:"Yogi Berra", team:"Yankees", wiki:"https://en.wikipedia.org/wiki/Yogi_Berra" },
  { quote:"You can observe a lot just by watching.", author:"Yogi Berra", team:"Yankees", wiki:"https://en.wikipedia.org/wiki/Yogi_Berra" },
  { quote:"When you come to a fork in the road, take it.", author:"Yogi Berra", team:"Yankees", wiki:"https://en.wikipedia.org/wiki/Yogi_Berra" },
  { quote:"I never said most of the things I said.", author:"Yogi Berra", team:"Yankees", wiki:"https://en.wikipedia.org/wiki/Yogi_Berra" },
  { quote:"Baseball is 90% mental and the other half is physical.", author:"Yogi Berra", team:"Yankees", wiki:"https://en.wikipedia.org/wiki/Yogi_Berra" },
  { quote:"Nobody goes there anymore. It's too crowded.", author:"Yogi Berra", team:"Yankees", wiki:"https://en.wikipedia.org/wiki/Yogi_Berra" },
  { quote:"The future ain't what it used to be.", author:"Yogi Berra", team:"Yankees", wiki:"https://en.wikipedia.org/wiki/Yogi_Berra" },
  { quote:"If the world were perfect, it wouldn't be.", author:"Yogi Berra", team:"Yankees", wiki:"https://en.wikipedia.org/wiki/Yogi_Berra" },
  { quote:"Always go to other people's funerals, otherwise they won't go to yours.", author:"Yogi Berra", team:"Yankees", wiki:"https://en.wikipedia.org/wiki/Yogi_Berra" },
  { quote:"Fans don't boo nobodies.", author:"Reggie Jackson", team:"Yankees", wiki:"https://en.wikipedia.org/wiki/Reggie_Jackson" },
  { quote:"October is not like any other month in baseball.", author:"Reggie Jackson", team:"Yankees", wiki:"https://en.wikipedia.org/wiki/Reggie_Jackson" },
  { quote:"The only way I'm going to win the batting title is if I get a lot of bunt singles and I beat them all out.", author:"Reggie Jackson", team:"Yankees", wiki:"https://en.wikipedia.org/wiki/Reggie_Jackson" },
  { quote:"If you're going to play at all, you're out to win.", author:"Derek Jeter", team:"Yankees", wiki:"https://en.wikipedia.org/wiki/Derek_Jeter" },
  { quote:"Some people say New York is the capital of the world. I wouldn't argue with that.", author:"Derek Jeter", team:"Yankees", wiki:"https://en.wikipedia.org/wiki/Derek_Jeter" },
  { quote:"There may be people who have more talent than you, but there's no excuse for anyone to work harder than you do.", author:"Derek Jeter", team:"Yankees", wiki:"https://en.wikipedia.org/wiki/Derek_Jeter" },
  { quote:"I make my best pitch and trust my defense.", author:"Mariano Rivera", team:"Yankees", wiki:"https://en.wikipedia.org/wiki/Mariano_Rivera" },
  { quote:"I've been blessed to play in New York. The fans deserve the best.", author:"Mariano Rivera", team:"Yankees", wiki:"https://en.wikipedia.org/wiki/Mariano_Rivera" },
  { quote:"Every strike brings me closer to the next home run.", author:"Babe Ruth", team:"Yankees", wiki:"https://en.wikipedia.org/wiki/Babe_Ruth" },
  { quote:"Never let the fear of striking out keep you from playing the game.", author:"Babe Ruth", team:"Yankees", wiki:"https://en.wikipedia.org/wiki/Babe_Ruth" },
  { quote:"It's hard to beat a person who never gives up.", author:"Babe Ruth", team:"Yankees", wiki:"https://en.wikipedia.org/wiki/Babe_Ruth" },
  { quote:"I like to live as big as I can.", author:"Babe Ruth", team:"Yankees", wiki:"https://en.wikipedia.org/wiki/Babe_Ruth" },
  { quote:"The way a team plays as a whole determines its success. You may have the greatest bunch of individual stars in the world, but if they don't play together, the club won't be worth a dime.", author:"Babe Ruth", team:"Yankees", wiki:"https://en.wikipedia.org/wiki/Babe_Ruth" },
  { quote:"I'm not concerned with your liking or disliking me. All I ask is that you respect me as a human being.", author:"Jackie Robinson", team:"Baseball", wiki:"https://en.wikipedia.org/wiki/Jackie_Robinson" },
  { quote:"A life is not important except in the impact it has on other lives.", author:"Jackie Robinson", team:"Baseball", wiki:"https://en.wikipedia.org/wiki/Jackie_Robinson" },
  { quote:"Don't look back. Something might be gaining on you.", author:"Satchel Paige", team:"Baseball", wiki:"https://en.wikipedia.org/wiki/Satchel_Paige" },
  // ── METS ──
  { quote:"Ya gotta believe!", author:"Tug McGraw", team:"Mets", context:"1973 pennant run rallying cry", wiki:"https://en.wikipedia.org/wiki/Tug_McGraw" },
  { quote:"New York is a city of conversation, of energy. The fans here live and die with every pitch.", author:"Mike Piazza", team:"Mets", wiki:"https://en.wikipedia.org/wiki/Mike_Piazza" },
  { quote:"I don't think about the negative. That's a waste of time.", author:"Tom Seaver", team:"Mets", wiki:"https://en.wikipedia.org/wiki/Tom_Seaver" },
  { quote:"In baseball, you can't sit on a lead and run a few plays into the line and just kill the clock. You've got to throw the ball over the plate and give the other man his chance.", author:"Tom Seaver", team:"Mets", wiki:"https://en.wikipedia.org/wiki/Tom_Seaver" },
  { quote:"The Mets don't just exist in New York. They are New York.", author:"Mike Francesa", team:"Mets", wiki:"https://en.wikipedia.org/wiki/New_York_Mets" },
  { quote:"Sometimes you win. Sometimes you lose. Sometimes it rains.", author:"Bull Durham / Baseball Wisdom", team:"Baseball", wiki:"https://en.wikipedia.org/wiki/Bull_Durham" },
  // ── JETS ──
  { quote:"I guarantee it.", author:"Joe Namath", team:"Jets", context:"Super Bowl III guarantee, January 1969", wiki:"https://en.wikipedia.org/wiki/Super_Bowl_III" },
  { quote:"When you have confidence, you can have a lot of fun. And when you have fun, you can do amazing things.", author:"Joe Namath", team:"Jets", wiki:"https://en.wikipedia.org/wiki/Joe_Namath" },
  { quote:"I'd rather win one game than a bunch of moral victories.", author:"Joe Namath", team:"Jets", wiki:"https://en.wikipedia.org/wiki/Joe_Namath" },
  { quote:"New York Jets fans are the most passionate, most loyal, most tortured fans in football.", author:"Rex Ryan", team:"Jets", wiki:"https://en.wikipedia.org/wiki/Rex_Ryan" },
  { quote:"One play, one game, one season at a time.", author:"Curtis Martin", team:"Jets", wiki:"https://en.wikipedia.org/wiki/Curtis_Martin" },
  // ── GIANTS ──
  { quote:"You show me a good loser and I'll show you a loser.", author:"Bill Parcells", team:"Giants", wiki:"https://en.wikipedia.org/wiki/Bill_Parcells" },
  { quote:"Blame nobody. Expect nothing. Do something.", author:"Bill Parcells", team:"Giants", wiki:"https://en.wikipedia.org/wiki/Bill_Parcells" },
  { quote:"The road to Easy Street goes through the sewer.", author:"Bill Parcells", team:"Giants", wiki:"https://en.wikipedia.org/wiki/Bill_Parcells" },
  { quote:"When you're winning, nothing hurts.", author:"Joe Namath", team:"Football", wiki:"https://en.wikipedia.org/wiki/Joe_Namath" },
  { quote:"Football is like life. It requires perseverance, self-denial, hard work, sacrifice, dedication and respect for authority.", author:"Vince Lombardi", team:"Giants", context:"As Giants offensive coordinator before becoming the Coach", wiki:"https://en.wikipedia.org/wiki/Vince_Lombardi" },
  { quote:"Winning is not a sometime thing. It is an all-the-time thing.", author:"Vince Lombardi", team:"Giants", wiki:"https://en.wikipedia.org/wiki/Vince_Lombardi" },
  { quote:"Individual commitment to a group effort — that is what makes a team work.", author:"Vince Lombardi", team:"Giants", wiki:"https://en.wikipedia.org/wiki/Vince_Lombardi" },
  { quote:"The most important thing in the world to me is winning.", author:"Lawrence Taylor", team:"Giants", wiki:"https://en.wikipedia.org/wiki/Lawrence_Taylor" },
  { quote:"When you play for the Giants, you represent something bigger than yourself.", author:"Eli Manning", team:"Giants", wiki:"https://en.wikipedia.org/wiki/Eli_Manning" },
  // ── KNICKS ──
  { quote:"I never thought about failure. I just kept playing.", author:"Patrick Ewing", team:"Knicks", wiki:"https://en.wikipedia.org/wiki/Patrick_Ewing" },
  { quote:"MSG is the best arena in the world. When that crowd gets going, there is nothing like it.", author:"Patrick Ewing", team:"Knicks", wiki:"https://en.wikipedia.org/wiki/Patrick_Ewing" },
  { quote:"The Garden is sacred. When you walk out on that floor, you feel it.", author:"Walt Frazier", team:"Knicks", wiki:"https://en.wikipedia.org/wiki/Walt_Frazier" },
  { quote:"Basketball is jazz. You improvise, you respond, you react.", author:"Walt Frazier", team:"Knicks", wiki:"https://en.wikipedia.org/wiki/Walt_Frazier" },
  { quote:"Defense wins championships. I believe that with everything I have.", author:"Willis Reed", team:"Knicks", wiki:"https://en.wikipedia.org/wiki/Willis_Reed" },
  // ── RANGERS ──
  { quote:"We will win tonight. I guarantee it.", author:"Mark Messier", team:"Rangers", context:"Before Game 6 vs Devils, 1994 playoffs — then scored a hat trick", wiki:"https://en.wikipedia.org/wiki/Mark_Messier" },
  { quote:"Fifty-four years of waiting. One night of unbelievable joy.", author:"Mark Messier", team:"Rangers", context:"After winning the 1994 Stanley Cup", wiki:"https://en.wikipedia.org/wiki/Mark_Messier" },
  { quote:"The best thing about the 1994 team was we believed. Every single one of us.", author:"Mark Messier", team:"Rangers", wiki:"https://en.wikipedia.org/wiki/Mark_Messier" },
  { quote:"New York hockey fans know the game deeply and they care about it deeply.", author:"Brian Leetch", team:"Rangers", wiki:"https://en.wikipedia.org/wiki/Brian_Leetch" },
  { quote:"The Garden crowd is the loudest in the NHL. Bar none.", author:"Henrik Lundqvist", team:"Rangers", wiki:"https://en.wikipedia.org/wiki/Henrik_Lundqvist" },
  // ── ISLANDERS ──
  { quote:"We won because we played for each other. Every night. Every shift.", author:"Denis Potvin", team:"Islanders", wiki:"https://en.wikipedia.org/wiki/Denis_Potvin" },
  { quote:"Four Cups. I don't know if people understand what that means. What it takes.", author:"Bryan Trottier", team:"Islanders", wiki:"https://en.wikipedia.org/wiki/Bryan_Trottier" },
  { quote:"Nine straight 50-goal seasons. I just loved to score.", author:"Mike Bossy", team:"Islanders", wiki:"https://en.wikipedia.org/wiki/Mike_Bossy" },
  { quote:"The Long Island fans were the most loyal fans in hockey. They made us want to win for them.", author:"Clark Gillies", team:"Islanders", wiki:"https://en.wikipedia.org/wiki/Clark_Gillies" },
  { quote:"The highest compliment a player can receive is to be called a winner.", author:"Al Arbour", team:"Islanders", wiki:"https://en.wikipedia.org/wiki/Al_Arbour" },
  // ── DEVILS ──
  { quote:"Records don't matter to me. Winning does.", author:"Martin Brodeur", team:"Devils", wiki:"https://en.wikipedia.org/wiki/Martin_Brodeur" },
  { quote:"Three championships. Three. That's a dynasty. People forget that.", author:"Scott Stevens", team:"Devils", wiki:"https://en.wikipedia.org/wiki/Scott_Stevens" },
  // ── NETS / DR. J ──
  { quote:"The mark of a great player is someone who finds a way to win regardless of the situation.", author:"Julius Erving", team:"Nets", wiki:"https://en.wikipedia.org/wiki/Julius_Erving" },
  { quote:"Being a professional is doing what you love even on days you don't feel like doing it.", author:"Julius Erving", team:"Nets", wiki:"https://en.wikipedia.org/wiki/Julius_Erving" },
  // ── US OPEN TENNIS / FLUSHING MEADOWS ──
  { quote:"Champions keep playing until they get it right.", author:"Billie Jean King", team:"Tennis", context:"USTA Billie Jean King National Tennis Center, Flushing Meadows", wiki:"https://en.wikipedia.org/wiki/Billie_Jean_King" },
  { quote:"Pressure is a privilege — it only comes to those who earn it.", author:"Billie Jean King", team:"Tennis", wiki:"https://en.wikipedia.org/wiki/Billie_Jean_King" },
  { quote:"I think self-awareness is probably the most important thing towards being a champion.", author:"Billie Jean King", team:"Tennis", wiki:"https://en.wikipedia.org/wiki/Billie_Jean_King" },
  { quote:"You are never really playing an opponent. You are playing yourself, your own highest standards.", author:"Arthur Ashe", team:"Tennis", context:"Arthur Ashe Stadium, Flushing Meadows — named in his honor", wiki:"https://en.wikipedia.org/wiki/Arthur_Ashe" },
  { quote:"From what we get, we can make a living. What we give, however, makes a life.", author:"Arthur Ashe", team:"Tennis", wiki:"https://en.wikipedia.org/wiki/Arthur_Ashe" },
  { quote:"Success is a journey, not a destination. The doing is often more important than the outcome.", author:"Arthur Ashe", team:"Tennis", wiki:"https://en.wikipedia.org/wiki/Arthur_Ashe" },
  { quote:"Start where you are. Use what you have. Do what you can.", author:"Arthur Ashe", team:"Tennis", wiki:"https://en.wikipedia.org/wiki/Arthur_Ashe" },
  { quote:"You've got to love what you're doing. If you love it, you can overcome any handicap.", author:"Jimmy Connors", team:"Tennis", context:"5× US Open champion at Flushing Meadows", wiki:"https://en.wikipedia.org/wiki/Jimmy_Connors" },
  { quote:"I never gave up, even when people told me I was too old.", author:"Jimmy Connors", team:"Tennis", context:"1991 US Open run at age 39 — the crowd's favorite moment in tournament history", wiki:"https://en.wikipedia.org/wiki/Jimmy_Connors" },
  { quote:"I've had a privileged life, and I'm grateful for it.", author:"Pete Sampras", team:"Tennis", context:"5× US Open champion", wiki:"https://en.wikipedia.org/wiki/Pete_Sampras" },
  // ── US OPEN GOLF — NY COURSES ──
  { quote:"Golf is the closest game to the game we call life. You get bad breaks from good shots; you get good breaks from bad shots — but you have to play the ball where it lies.", author:"Bobby Jones", team:"Golf", context:"US Open winner, including 1929 at Winged Foot", wiki:"https://en.wikipedia.org/wiki/Bobby_Jones_(golfer)" },
  { quote:"Confidence is the most important single factor in this game.", author:"Jack Nicklaus", team:"Golf", context:"US Open champion — competed at Shinnecock, Winged Foot, Bethpage", wiki:"https://en.wikipedia.org/wiki/Jack_Nicklaus" },
  { quote:"The harder I work, the luckier I get.", author:"Gary Player", team:"Golf", wiki:"https://en.wikipedia.org/wiki/Gary_Player" },
  { quote:"Golf is not a game of great shots. It's a game of the most misses. The people who win make the smallest mistakes.", author:"Gene Littler", team:"Golf", wiki:"https://en.wikipedia.org/wiki/Gene_Littler" },
  { quote:"The most important shot in golf is the next one.", author:"Ben Hogan", team:"Golf", wiki:"https://en.wikipedia.org/wiki/Ben_Hogan" },
  { quote:"As you walk down the fairway of life, you must smell the roses, for you only get to play one round.", author:"Ben Hogan", team:"Golf", wiki:"https://en.wikipedia.org/wiki/Ben_Hogan" },
  // ── BELMONT / HORSE RACING ──
  { quote:"Secretariat is moving like a tremendous machine!", author:"Chic Anderson", team:"Belmont", context:"Race call, 1973 Belmont Stakes, Belmont Park, Elmont NY — 31-length win, world record 2:24", wiki:"https://en.wikipedia.org/wiki/Secretariat" },
  { quote:"To watch Secretariat run was to watch a force of nature.", author:"Red Smith", team:"Belmont", wiki:"https://en.wikipedia.org/wiki/Red_Smith" },
  // ── GENERAL NY SPORTS WISDOM ──
  { quote:"If you can make it there, you'll make it anywhere.", author:"Frank Sinatra", team:"NY", context:"New York, New York", wiki:"https://en.wikipedia.org/wiki/New_York,_New_York_(1980_song)" },
  { quote:"In New York, the fans don't just watch the game. They become part of it.", author:"Bob Costas", team:"NY", wiki:"https://en.wikipedia.org/wiki/Bob_Costas" },
  { quote:"Sports do not build character. They reveal it.", author:"Heywood Broun", team:"NY", wiki:"https://en.wikipedia.org/wiki/Heywood_Broun" },
  { quote:"Winning is habit. Unfortunately so is losing.", author:"Vince Lombardi", team:"Giants", wiki:"https://en.wikipedia.org/wiki/Vince_Lombardi" },
  { quote:"The will to win is important, but the will to prepare is vital.", author:"Joe Paterno", team:"Football", wiki:"https://en.wikipedia.org/wiki/Joe_Paterno" },
  { quote:"You miss 100 percent of the shots you never take.", author:"Wayne Gretzky", team:"Hockey", wiki:"https://en.wikipedia.org/wiki/Wayne_Gretzky" },
  { quote:"I've missed more than 9,000 shots in my career and lost almost 300 games. I've failed over and over again — and that is why I succeed.", author:"Michael Jordan", team:"Basketball", wiki:"https://en.wikipedia.org/wiki/Michael_Jordan" },
  { quote:"You can't put a limit on anything. The more you dream, the farther you get.", author:"Michael Phelps", team:"Sports", wiki:"https://en.wikipedia.org/wiki/Michael_Phelps" },
  { quote:"The difference between the impossible and the possible lies in a person's determination.", author:"Tommy Lasorda", team:"Baseball", wiki:"https://en.wikipedia.org/wiki/Tommy_Lasorda" },
  { quote:"Hard work beats talent when talent doesn't work hard.", author:"Tim Notke", team:"NY", wiki:"https://www.google.com/search?q=hard+work+beats+talent+quote" },
  { quote:"Set your goals high, and don't stop till you get there.", author:"Bo Jackson", team:"Sports", wiki:"https://en.wikipedia.org/wiki/Bo_Jackson" },
  { quote:"It's not whether you get knocked down; it's whether you get up.", author:"Vince Lombardi", team:"Giants", wiki:"https://en.wikipedia.org/wiki/Vince_Lombardi" },
  { quote:"You have to be able to accept failure to get better.", author:"LeBron James", team:"Basketball", wiki:"https://en.wikipedia.org/wiki/LeBron_James" },
  { quote:"The only way to prove that you're a good sport is to lose.", author:"Ernie Banks", team:"Baseball", wiki:"https://en.wikipedia.org/wiki/Ernie_Banks" },
  { quote:"One man can be a crucial ingredient on a team, but one man cannot make a team.", author:"Kareem Abdul-Jabbar", team:"Basketball", wiki:"https://en.wikipedia.org/wiki/Kareem_Abdul-Jabbar" },
  { quote:"Do you know what my favorite part of the game is? The opportunity to play.", author:"Mike Singletary", team:"Football", wiki:"https://en.wikipedia.org/wiki/Mike_Singletary" },
  { quote:"Champions aren't made in gyms. Champions are made from something they have deep inside them.", author:"Muhammad Ali", team:"Sports", wiki:"https://en.wikipedia.org/wiki/Muhammad_Ali" },
  { quote:"I hated every minute of training, but I said, don't quit. Suffer now and live the rest of your life as a champion.", author:"Muhammad Ali", team:"Sports", wiki:"https://en.wikipedia.org/wiki/Muhammad_Ali" },
  { quote:"Float like a butterfly, sting like a bee. The hands can't hit what the eyes can't see.", author:"Muhammad Ali", team:"Sports", wiki:"https://en.wikipedia.org/wiki/Muhammad_Ali" },
  { quote:"I am the greatest. I said that even before I knew I was.", author:"Muhammad Ali", team:"Sports", wiki:"https://en.wikipedia.org/wiki/Muhammad_Ali" },
  { quote:"If my mind can conceive it, and my heart can believe it — then I can achieve it.", author:"Muhammad Ali", team:"Sports", wiki:"https://en.wikipedia.org/wiki/Muhammad_Ali" },
  { quote:"The more I practice, the luckier I get.", author:"Gary Player", team:"Golf", wiki:"https://en.wikipedia.org/wiki/Gary_Player" },
  { quote:"Pain is temporary. Glory lasts forever.", author:"NY Sports Wisdom", team:"NY", wiki:"https://www.google.com/search?q=pain+is+temporary+glory+lasts+sports+quote" },
  { quote:"The best competition I have is against myself, to become better.", author:"John Wooden", team:"Sports", wiki:"https://en.wikipedia.org/wiki/John_Wooden" },
  { quote:"Talent wins games, but teamwork and intelligence wins championships.", author:"Michael Jordan", team:"Basketball", wiki:"https://en.wikipedia.org/wiki/Michael_Jordan" },
  { quote:"There is no substitute for hard work.", author:"Thomas Edison", team:"NY", wiki:"https://en.wikipedia.org/wiki/Thomas_Edison" },
  { quote:"The secret of getting ahead is getting started.", author:"Mark Twain", team:"NY", wiki:"https://en.wikipedia.org/wiki/Mark_Twain" },
  { quote:"It always seems impossible until it's done.", author:"Nelson Mandela", team:"Sports", wiki:"https://en.wikipedia.org/wiki/Nelson_Mandela" },
  { quote:"Somewhere behind the athlete you've become is the little kid who fell in love with the game.", author:"Mia Hamm", team:"Sports", wiki:"https://en.wikipedia.org/wiki/Mia_Hamm" },
  { quote:"Success is no accident. It is hard work, perseverance, learning, studying, sacrifice.", author:"Pelé", team:"Soccer", wiki:"https://en.wikipedia.org/wiki/Pel%C3%A9" },
  { quote:"You were born to be a player. You were meant to be here. This moment is yours.", author:"Herb Brooks", team:"Hockey", context:"1980 US Olympic Hockey — Miracle on Ice", wiki:"https://en.wikipedia.org/wiki/Herb_Brooks" },
  { quote:"Great moments are born from great opportunities.", author:"Herb Brooks", team:"Hockey", wiki:"https://en.wikipedia.org/wiki/Herb_Brooks" },
  { quote:"A trophy carries dust. Memories last forever.", author:"Mary Lou Retton", team:"Sports", wiki:"https://en.wikipedia.org/wiki/Mary_Lou_Retton" },
  { quote:"Adversity causes some men to break; others to break records.", author:"William Arthur Ward", team:"Sports", wiki:"https://www.google.com/search?q=adversity+causes+men+to+break+records+quote" },
  { quote:"The difference between ordinary and extraordinary is that little extra.", author:"Jimmy Johnson", team:"Football", wiki:"https://en.wikipedia.org/wiki/Jimmy_Johnson_(American_football)" },
  { quote:"You have to believe in yourself when no one else does.", author:"Serena Williams", team:"Tennis", wiki:"https://en.wikipedia.org/wiki/Serena_Williams" },
  { quote:"I really think a champion is defined not by their wins but by how they can recover when they fall.", author:"Serena Williams", team:"Tennis", wiki:"https://en.wikipedia.org/wiki/Serena_Williams" },
  { quote:"Every time you win, it diminishes the fear a little bit. You never really cancel the fear of losing; you keep challenging it.", author:"Arthur Ashe", team:"Tennis", wiki:"https://en.wikipedia.org/wiki/Arthur_Ashe" },
  { quote:"In New York, every game feels like the playoffs.", author:"Phil Jackson", team:"Basketball", wiki:"https://en.wikipedia.org/wiki/Phil_Jackson" },
  { quote:"Suffering builds character. And New York fans have more character than anyone.", author:"Mike Francesa", team:"NY", wiki:"https://en.wikipedia.org/wiki/Mike_Francesa" },
  { quote:"The city doesn't sleep and neither do the fans.", author:"NY Sports Wisdom", team:"NY", wiki:"https://www.google.com/search?q=new+york+sports+fans+greatest" },
];

function getDailyQuote() {
  const day = Math.floor(Date.now() / 86400000);
  return NY_QUOTES[day % NY_QUOTES.length];
}

// ─── DAILY PLAYER SPOTLIGHT ───────────────────────────────────────────────
const DAILY_PLAYERS = [
  // ── YANKEES (40 players) ──────────────────────────────────────────────────
  { name:"Derek Jeter",      team:"Yankees", sport:"MLB", pos:"SS", emoji:"⚾", number:"2",  active:false, era:"1995–2014", stats:"3,465 H · .310 AVG · 5× WS · 14× All-Star",                 fact:"The only Yankee to win five World Series rings AND be drafted by the team. Made the Flip, the Dive, and Mr. November — defining moments of the greatest dynasty of the modern era.",          wiki:"https://en.wikipedia.org/wiki/Derek_Jeter",         photo:"https://upload.wikimedia.org/wikipedia/commons/thumb/2/22/Derek_Jeter_2007.jpg/256px-Derek_Jeter_2007.jpg",                cardColor:"#003087" },
  { name:"Babe Ruth",        team:"Yankees", sport:"MLB", pos:"RF", emoji:"⚾", number:"3",  active:false, era:"1920–1934", stats:"659 HR · .349 AVG · 7× WS · 94 career pitching wins",       fact:"Sold by Boston for $100,000 in 1920 — cursing them for 86 years. His 714 career home runs and .342 lifetime average define what greatness in baseball means.",                           wiki:"https://en.wikipedia.org/wiki/Babe_Ruth",           photo:"https://upload.wikimedia.org/wikipedia/commons/thumb/a/a4/Babe_Ruth2.jpg/256px-Babe_Ruth2.jpg",                                cardColor:"#003087" },
  { name:"Lou Gehrig",       team:"Yankees", sport:"MLB", pos:"1B", emoji:"⚾", number:"4",  active:false, era:"1923–1939", stats:"493 HR · .340 AVG · 2,130 consecutive games · 2× MVP",     fact:"Played 2,130 consecutive games through injuries that would hospitalize most men. His farewell speech — 'luckiest man' — is the most powerful in sports history.",                         wiki:"https://en.wikipedia.org/wiki/Lou_Gehrig",          photo:"https://upload.wikimedia.org/wikipedia/commons/thumb/3/3b/Lou_Gehrig_as_a_New_York_Yankee.jpg/256px-Lou_Gehrig_as_a_New_York_Yankee.jpg", cardColor:"#003087" },
  { name:"Joe DiMaggio",     team:"Yankees", sport:"MLB", pos:"CF", emoji:"⚾", number:"5",  active:false, era:"1936–1951", stats:"361 HR · .325 AVG · 56-game hit streak · 9× WS · 3× MVP", fact:"Hit safely in 56 consecutive games in 1941 — a record mathematicians say may be the most unbreakable in sports. Married Marilyn Monroe. Embodied American elegance.",                    wiki:"https://en.wikipedia.org/wiki/Joe_DiMaggio",        photo:"https://upload.wikimedia.org/wikipedia/commons/thumb/e/ec/Joe_DiMaggio_1951.jpg/256px-Joe_DiMaggio_1951.jpg",                 cardColor:"#003087" },
  { name:"Mickey Mantle",    team:"Yankees", sport:"MLB", pos:"CF", emoji:"⚾", number:"7",  active:false, era:"1951–1968", stats:"536 HR · .298 AVG · Triple Crown 1956 · 3× MVP",           fact:"Played through bone infections and torn cartilage his entire career on one good leg. If fully healthy, many believe he would have been the greatest player of all time.",                  wiki:"https://en.wikipedia.org/wiki/Mickey_Mantle",       photo:"https://upload.wikimedia.org/wikipedia/commons/thumb/e/e3/Mickey_Mantle_1953.jpg/256px-Mickey_Mantle_1953.jpg",                cardColor:"#003087" },
  { name:"Yogi Berra",       team:"Yankees", sport:"MLB", pos:"C",  emoji:"⚾", number:"8",  active:false, era:"1946–1963", stats:"358 HR · 10× World Series champion · 3× AL MVP",           fact:"10 World Series championships as a player — more than any other player in history. Also one of the most quoted men in American culture. 'It ain't over till it's over.'",                wiki:"https://en.wikipedia.org/wiki/Yogi_Berra",          photo:"https://upload.wikimedia.org/wikipedia/commons/thumb/e/e7/Yogi_Berra_1956.jpg/256px-Yogi_Berra_1956.jpg",                    cardColor:"#003087" },
  { name:"Roger Maris",      team:"Yankees", sport:"MLB", pos:"RF", emoji:"⚾", number:"9",  active:false, era:"1960–1966", stats:"61 HR in 1961 · 275 career HR · 2× AL MVP",               fact:"Hit 61 home runs in 1961 to break Babe Ruth's sacred record, enduring death threats and losing his hair from stress. He deserved far more credit than he received.",                    wiki:"https://en.wikipedia.org/wiki/Roger_Maris",         photo:"https://upload.wikimedia.org/wikipedia/commons/thumb/5/51/Roger_Maris_1962.jpg/256px-Roger_Maris_1962.jpg",                   cardColor:"#003087" },
  { name:"Mariano Rivera",   team:"Yankees", sport:"MLB", pos:"RP", emoji:"⚾", number:"42", active:false, era:"1995–2013", stats:"652 SV · 2.21 ERA · 5× WS · 1st unanimous HOF inductee",  fact:"Threw one pitch — the cut fastball — for his entire career and became the greatest closer in baseball history. Unanimous Hall of Fame election, the first ever.",                        wiki:"https://en.wikipedia.org/wiki/Mariano_Rivera",      photo:"https://upload.wikimedia.org/wikipedia/commons/thumb/a/a5/Mariano_Rivera_2008.jpg/256px-Mariano_Rivera_2008.jpg",              cardColor:"#003087" },
  { name:"Reggie Jackson",   team:"Yankees", sport:"MLB", pos:"RF", emoji:"⚾", number:"44", active:false, era:"1977–1981", stats:"144 HR as Yankee · 3 HRs in 1977 WS Game 6 · Mr. October", fact:"Hit three home runs on three consecutive pitches from three different pitchers in the 1977 World Series clincher. The single greatest individual World Series performance.",               wiki:"https://en.wikipedia.org/wiki/Reggie_Jackson",      photo:"https://upload.wikimedia.org/wikipedia/commons/thumb/2/22/Reggie_Jackson_1969.jpg/256px-Reggie_Jackson_1969.jpg",             cardColor:"#003087" },
  { name:"Don Mattingly",    team:"Yankees", sport:"MLB", pos:"1B", emoji:"⚾", number:"23", active:false, era:"1982–1995", stats:"2,153 H · 9× Gold Glove · .307 AVG · AL MVP 1985",         fact:"The most beloved Yankee of his generation never won a World Series ring. Finally made the playoffs in his last season. Donnie Baseball was pure class from first pitch to last.",         wiki:"https://en.wikipedia.org/wiki/Don_Mattingly",       photo:"https://upload.wikimedia.org/wikipedia/commons/thumb/0/0b/Don_Mattingly_2011.jpg/256px-Don_Mattingly_2011.jpg",               cardColor:"#003087" },
  { name:"Whitey Ford",      team:"Yankees", sport:"MLB", pos:"SP", emoji:"⚾", number:"16", active:false, era:"1950–1967", stats:"236-106 · .690 WS win pct · Cy Young 1961",               fact:"The Chairman of the Board holds the all-time World Series record for wins (10), strikeouts (94), and innings pitched. Unflappable on the biggest stage.",                                wiki:"https://en.wikipedia.org/wiki/Whitey_Ford",          photo:"https://upload.wikimedia.org/wikipedia/commons/thumb/f/f2/Whitey_Ford_1962.jpg/256px-Whitey_Ford_1962.jpg",                   cardColor:"#003087" },
  { name:"Thurman Munson",   team:"Yankees", sport:"MLB", pos:"C",  emoji:"⚾", number:"15", active:false, era:"1969–1979", stats:".292 AVG · AL ROY 1970 · AL MVP 1976",                    fact:"The Yankees captain died in a plane crash at age 32 in 1979. His number was retired immediately. No Yankee since has worn #15. The most beloved Captain between Gehrig and Jeter.",       wiki:"https://en.wikipedia.org/wiki/Thurman_Munson",      photo:"https://upload.wikimedia.org/wikipedia/commons/thumb/3/3e/Thurman_Munson_1974.jpg/256px-Thurman_Munson_1974.jpg",              cardColor:"#003087" },
  { name:"Alex Rodriguez",   team:"Yankees", sport:"MLB", pos:"3B", emoji:"⚾", number:"13", active:false, era:"2004–2016", stats:"351 HR as Yankee · 3× AL MVP · 2009 WS champion",          fact:"Perhaps the most complicated Yankee ever — all-time great numbers, PED controversy, the 2009 World Series MVP performance. His legacy is still being argued over.",                     wiki:"https://en.wikipedia.org/wiki/Alex_Rodriguez",      photo:"https://upload.wikimedia.org/wikipedia/commons/thumb/c/c2/Alex_Rodriguez_2016.jpg/256px-Alex_Rodriguez_2016.jpg",             cardColor:"#003087" },
  { name:"David Wells",      team:"Yankees", sport:"MLB", pos:"SP", emoji:"⚾", number:"33", active:false, era:"1997–2003", stats:"148 wins as Yankee · Perfect game 1998 · 1998 WS champion", fact:"Threw his perfect game having, by his own admission, not been entirely sober. Part of the greatest single-season team ever assembled, going 17-4 in pinstripes.",                      wiki:"https://en.wikipedia.org/wiki/David_Wells",          photo:"https://upload.wikimedia.org/wikipedia/commons/thumb/0/0c/David_Wells_2007.jpg/256px-David_Wells_2007.jpg",                   cardColor:"#003087" },
  { name:"David Cone",       team:"Yankees", sport:"MLB", pos:"SP", emoji:"⚾", number:"36", active:false, era:"1995–2003", stats:"4× WS champion · Perfect game 1999 · 20 wins 1998",        fact:"On Yogi Berra Day at Yankee Stadium — with Don Larsen in attendance — Cone threw a perfect game. 'Only in New York,' he said afterward. Pure Yankees magic.",                          wiki:"https://en.wikipedia.org/wiki/David_Cone",           photo:"https://upload.wikimedia.org/wikipedia/commons/thumb/e/e5/David_Cone_1994.jpg/256px-David_Cone_1994.jpg",                    cardColor:"#003087" },
  { name:"Bernie Williams",  team:"Yankees", sport:"MLB", pos:"CF", emoji:"⚾", number:"51", active:false, era:"1991–2006", stats:".297 AVG · 4× WS · 1996 ALCS MVP · .342 postseason avg",  fact:"The most underrated Yankee of the dynasty era. His postseason numbers are better than his regular season stats. A jazz guitarist who could also play centerfield beautifully.",          wiki:"https://en.wikipedia.org/wiki/Bernie_Williams",      photo:"https://upload.wikimedia.org/wikipedia/commons/thumb/7/7b/Bernie_Williams_2008.jpg/256px-Bernie_Williams_2008.jpg",             cardColor:"#003087" },
  { name:"Jorge Posada",     team:"Yankees", sport:"MLB", pos:"C",  emoji:"⚾", number:"20", active:false, era:"1995–2011", stats:"275 HR · 5× All-Star · 4× WS champion",                   fact:"The last of the Core Four to announce retirement. His 2003 extra-inning walk-off hit against the Red Sox is one of the great clutch moments of the dynasty years.",                     wiki:"https://en.wikipedia.org/wiki/Jorge_Posada",         photo:"https://upload.wikimedia.org/wikipedia/commons/thumb/e/e6/Jorge_Posada_2010.jpg/256px-Jorge_Posada_2010.jpg",                  cardColor:"#003087" },
  { name:"Andy Pettitte",    team:"Yankees", sport:"MLB", pos:"SP", emoji:"⚾", number:"46", active:false, era:"1995–2013", stats:"256 wins · Most postseason wins ever (19) · 5× WS",       fact:"The most postseason wins of any pitcher in baseball history with 19. A Yankee through and through who came back from Houston to chase rings. The definition of dependable.",               wiki:"https://en.wikipedia.org/wiki/Andy_Pettitte",        photo:"https://upload.wikimedia.org/wikipedia/commons/thumb/d/d0/Andy_Pettitte_2012.jpg/256px-Andy_Pettitte_2012.jpg",               cardColor:"#003087" },
  { name:"Aaron Judge",      team:"Yankees", sport:"MLB", pos:"RF", emoji:"⚾", number:"99", active:true,  era:"2016–present", stats:"62 HR in 2022 (AL record) · 2× AL MVP",               fact:"Hit 62 home runs in 2022 — breaking Roger Maris's American League record. At 6'7\" he is the most physically imposing Yankee since... possibly ever. The face of the new dynasty.",    wiki:"https://en.wikipedia.org/wiki/Aaron_Judge",          photo:"https://upload.wikimedia.org/wikipedia/commons/thumb/9/95/Aaron_Judge_2017.jpg/256px-Aaron_Judge_2017.jpg",                   cardColor:"#003087" },
  { name:"Rickey Henderson", team:"Yankees", sport:"MLB", pos:"LF", emoji:"⚾", number:"24", active:false, era:"1985–1989", stats:"All-time SB record (1,406) · set record as a Yankee",      fact:"Set the all-time stolen base record while wearing pinstripes. The most valuable leadoff man in baseball history made his biggest mark on the record books as a Yankee.",               wiki:"https://en.wikipedia.org/wiki/Rickey_Henderson",     photo:"https://upload.wikimedia.org/wikipedia/commons/thumb/3/38/Rickey_Henderson_2009.jpg/256px-Rickey_Henderson_2009.jpg",         cardColor:"#003087" },
  { name:"Phil Rizzuto",     team:"Yankees", sport:"MLB", pos:"SS", emoji:"⚾", number:"10", active:false, era:"1941–1956", stats:".273 AVG · 5× WS · AL MVP 1950 · Holy Cow!",              fact:"The scrappy Scooter won 7 World Series rings and was more beloved as a broadcaster than a player. 'Holy Cow!' became the sound of Yankees baseball for a generation.",                  wiki:"https://en.wikipedia.org/wiki/Phil_Rizzuto",         photo:"https://upload.wikimedia.org/wikipedia/commons/thumb/5/5e/Phil_Rizzuto_1949.jpg/256px-Phil_Rizzuto_1949.jpg",                  cardColor:"#003087" },
  { name:"Elston Howard",    team:"Yankees", sport:"MLB", pos:"C",  emoji:"⚾", number:"32", active:false, era:"1955–1967", stats:".274 AVG · AL MVP 1963 · 4× WS champion",                 fact:"The first Black player in Yankees history, breaking the team's segregation barrier in 1955 — eight years after Jackie Robinson. A graceful man who became one of the great Yankee catchers.", wiki:"https://en.wikipedia.org/wiki/Elston_Howard",       photo:"https://upload.wikimedia.org/wikipedia/commons/thumb/1/1b/Elston_Howard_1965.jpg/256px-Elston_Howard_1965.jpg",               cardColor:"#003087" },
  { name:"Ron Guidry",       team:"Yankees", sport:"MLB", pos:"SP", emoji:"⚾", number:"49", active:false, era:"1975–1988", stats:"25-3 in 1978 · .651 career win pct · Cy Young 1978",       fact:"Louisiana Lightning's 1978 season — 25-3 with a 1.74 ERA — is one of the most dominant pitching seasons in modern baseball history. He saved the Bronx Zoo Yankees.",                wiki:"https://en.wikipedia.org/wiki/Ron_Guidry",           photo:"https://upload.wikimedia.org/wikipedia/commons/thumb/2/27/Ron_Guidry_1980.jpg/256px-Ron_Guidry_1980.jpg",                   cardColor:"#003087" },
  // ── METS (30 players) ────────────────────────────────────────────────────
  { name:"Tom Seaver",       team:"Mets",   sport:"MLB", pos:"SP", emoji:"⚾", number:"41", active:false, era:"1967–1983", stats:"311 W · 2.86 ERA · 2,541 K · 3× Cy Young",              fact:"Led the Miracle Mets to the 1969 World Series as a 24-year-old. Tom Terrific is the greatest Met of all time — not close. His 1971 season (20-10, 1.76 ERA) may have been even better than his Cy Young years.", wiki:"https://en.wikipedia.org/wiki/Tom_Seaver",      photo:"https://upload.wikimedia.org/wikipedia/commons/thumb/4/4e/Tom_Seaver_1972.jpg/256px-Tom_Seaver_1972.jpg",                  cardColor:"#FF5910" },
  { name:"Mike Piazza",      team:"Mets",   sport:"MLB", pos:"C",  emoji:"⚾", number:"31", active:false, era:"1998–2005", stats:"220 HR · .296 AVG · .516 SLG as a Met",                  fact:"His 9/11 home run on September 21, 2001 — a solo shot in the 8th to beat Atlanta — is the most emotional home run in baseball history. The city needed it.",                           wiki:"https://en.wikipedia.org/wiki/Mike_Piazza",     photo:"https://upload.wikimedia.org/wikipedia/commons/thumb/8/85/Mike_Piazza_2013.jpg/256px-Mike_Piazza_2013.jpg",                  cardColor:"#FF5910" },
  { name:"Dwight Gooden",    team:"Mets",   sport:"MLB", pos:"SP", emoji:"⚾", number:"16", active:false, era:"1984–1994", stats:"194 W as Met · 1.53 ERA in 1985 · Cy Young 1985",         fact:"At age 20, went 24-4 with a 1.53 ERA — the most dominant pitching season by a 20-year-old in baseball history. Batters said facing him felt like hitting against a wall.",               wiki:"https://en.wikipedia.org/wiki/Dwight_Gooden",   photo:"https://upload.wikimedia.org/wikipedia/commons/thumb/e/eb/Dwight_Gooden_2009.jpg/256px-Dwight_Gooden_2009.jpg",              cardColor:"#FF5910" },
  { name:"David Wright",     team:"Mets",   sport:"MLB", pos:"3B", emoji:"⚾", number:"5",  active:false, era:"2004–2018", stats:"242 HR · .296 AVG · 970 RBI · 7× All-Star",              fact:"The only player to have his number retired as a lifelong Met. Battled spinal stenosis to play one final game in 2018 — a standing ovation that reduced an entire stadium to tears.",    wiki:"https://en.wikipedia.org/wiki/David_Wright",    photo:"https://upload.wikimedia.org/wikipedia/commons/thumb/2/21/David_Wright_2013.jpg/256px-David_Wright_2013.jpg",                cardColor:"#FF5910" },
  { name:"Darryl Strawberry",team:"Mets",   sport:"MLB", pos:"RF", emoji:"⚾", number:"18", active:false, era:"1983–1990", stats:"252 HR · 8× All-Star · 1986 World Series champion",       fact:"The most naturally gifted hitter of his generation. His swing was called the most perfect ever seen by hitting coaches. His story is one of the great 'what might have been' in baseball.", wiki:"https://en.wikipedia.org/wiki/Darryl_Strawberry",photo:"https://upload.wikimedia.org/wikipedia/commons/thumb/1/14/Darryl_Strawberry_2011.jpg/256px-Darryl_Strawberry_2011.jpg", cardColor:"#FF5910" },
  { name:"Keith Hernandez",  team:"Mets",   sport:"MLB", pos:"1B", emoji:"⚾", number:"17", active:false, era:"1983–1989", stats:".310 AVG as Met · 2× Gold Glove · 1986 WS champion",     fact:"The defensive 1B who changed how the position was played. His leadership was the linchpin of the 1986 championship team. His SNY broadcast career made him as beloved as his playing career.", wiki:"https://en.wikipedia.org/wiki/Keith_Hernandez",  photo:"https://upload.wikimedia.org/wikipedia/commons/thumb/a/a5/Keith_Hernandez_2009.jpg/256px-Keith_Hernandez_2009.jpg",         cardColor:"#FF5910" },
  { name:"Gary Carter",      team:"Mets",   sport:"MLB", pos:"C",  emoji:"⚾", number:"8",  active:false, era:"1985–1989", stats:"168 HR as Met · 3× Gold Glove · 11× All-Star",           fact:"Started the improbable two-out, two-strike 10th inning rally in Game 6 of the 1986 World Series with a single off Calvin Schiraldi. The Kid saved the season.",                         wiki:"https://en.wikipedia.org/wiki/Gary_Carter",     photo:"https://upload.wikimedia.org/wikipedia/commons/thumb/4/48/Gary_Carter_2010.jpg/256px-Gary_Carter_2010.jpg",                  cardColor:"#FF5910" },
  { name:"Mookie Wilson",    team:"Mets",   sport:"MLB", pos:"CF", emoji:"⚾", number:"1",  active:false, era:"1980–1989", stats:".274 AVG · 327 career SB · 1986 World Series hero",      fact:"His slow roller through Bill Buckner's legs in Game 6 is one of the iconic moments in baseball history. Mookie never hit it hard — it just found its way. Pure Mets magic.",            wiki:"https://en.wikipedia.org/wiki/Mookie_Wilson",   photo:"https://upload.wikimedia.org/wikipedia/commons/thumb/4/4e/Mookie_Wilson_2010.jpg/256px-Mookie_Wilson_2010.jpg",               cardColor:"#FF5910" },
  { name:"Jerry Koosman",    team:"Mets",   sport:"MLB", pos:"SP", emoji:"⚾", number:"36", active:false, era:"1967–1978", stats:"140 W as Met · 1,799 K · 1969 WS Game 5 winner",         fact:"Won the clinching Game 5 of the 1969 World Series against the mighty Orioles. The perfect complement to Seaver — beloved by Mets fans and criminally underappreciated by the rest of baseball.", wiki:"https://en.wikipedia.org/wiki/Jerry_Koosman",   photo:"https://upload.wikimedia.org/wikipedia/commons/thumb/e/e2/Jerry_Koosman_1969.jpg/256px-Jerry_Koosman_1969.jpg",              cardColor:"#FF5910" },
  { name:"Juan Soto",        team:"Mets",   sport:"MLB", pos:"RF", emoji:"⚾", number:"22", active:true,  era:"2025–present", stats:"$765M contract · 5× All-Star · .400+ OBP career", fact:"Signed the largest contract in baseball history — $765M over 15 years — to come to New York. His signature Soto Shuffle when drawing walks drives opposing pitchers crazy.",             wiki:"https://en.wikipedia.org/wiki/Juan_Soto",       photo:"https://upload.wikimedia.org/wikipedia/commons/thumb/3/33/Juan_Soto_2023.jpg/256px-Juan_Soto_2023.jpg",               cardColor:"#FF5910" },
  { name:"Francisco Alvarez",team:"Mets",   sport:"MLB", pos:"C",  emoji:"⚾", number:"4",  active:true,  era:"2022–present", stats:"Franchise catcher · Power from both sides · Future franchise cornerstone", fact:"The Mets' catcher of the future — nicknamed 'Baby Ruth' for his power potential. At 22 he's already one of the best catching prospects the Mets have ever developed.",             wiki:"https://en.wikipedia.org/wiki/Francisco_Alvarez",photo:"https://upload.wikimedia.org/wikipedia/commons/thumb/6/6e/Francisco_Alvarez.jpg/256px-Francisco_Alvarez.jpg",          cardColor:"#FF5910" },
  { name:"Mark Vientos",     team:"Mets",   sport:"MLB", pos:"1B", emoji:"⚾", number:"27", active:true,  era:"2022–present", stats:"Rising power bat · Filling the Pete Alonso role at 1B", fact:"The heir to the Mets' first base throne after Alonso departed. His raw power and developing plate discipline make him the kind of player Mets fans have been waiting for.",             wiki:"https://en.wikipedia.org/wiki/Mark_Vientos",    photo:"https://upload.wikimedia.org/wikipedia/commons/thumb/8/8e/Mark_Vientos_2024.jpg/256px-Mark_Vientos_2024.jpg",           cardColor:"#FF5910" },
  { name:"Pete Alonso",      team:"Mets",   sport:"MLB", pos:"1B", emoji:"⚾", number:"20", active:false, era:"2019–2024", stats:"254+ HR · Mets all-time HR record · 53 HR rookie 2019", fact:"Set the MLB rookie HR record with 53 in 2019. On August 12, 2025, hit #253 and #254 in the same game to pass Darryl Strawberry as the Mets' all-time home run king. The Mets' all-time HR leader.",             wiki:"https://en.wikipedia.org/wiki/Pete_Alonso",     photo:"https://upload.wikimedia.org/wikipedia/commons/thumb/a/a3/Pete_Alonso_in_2021.jpg/256px-Pete_Alonso_in_2021.jpg",             cardColor:"#FF5910" },
  { name:"Jacob deGrom",     team:"Mets",   sport:"MLB", pos:"SP", emoji:"⚾", number:"48", active:false, era:"2014–2022", stats:"1,607 K · 2× Cy Young · 2.52 career ERA",               fact:"Won back-to-back Cy Young Awards in 2018 and 2019 on one of the worst-hitting teams in baseball. His 2021 season — 1.08 ERA — may be the most dominant by any pitcher since Sandy Koufax.", wiki:"https://en.wikipedia.org/wiki/Jacob_deGrom",    photo:"https://upload.wikimedia.org/wikipedia/commons/thumb/1/1c/Jacob_deGrom_2017.jpg/256px-Jacob_deGrom_2017.jpg",                cardColor:"#FF5910" },
  { name:"Ron Darling",      team:"Mets",   sport:"MLB", pos:"SP", emoji:"⚾", number:"12", active:false, era:"1983–1991", stats:"99 W as Met · Yale graduate · 1986 WS champion",         fact:"One of the most intellectually engaging players ever to wear a Mets uniform. His Yale education showed in his pitching approach. Now one of the finest baseball analysts on television.", wiki:"https://en.wikipedia.org/wiki/Ron_Darling",     photo:"https://upload.wikimedia.org/wikipedia/commons/thumb/5/52/Ron_Darling_2010.jpg/256px-Ron_Darling_2010.jpg",                  cardColor:"#FF5910" },
  { name:"Tug McGraw",       team:"Mets",   sport:"MLB", pos:"RP", emoji:"⚾", number:"45", active:false, era:"1965–1974", stats:"86 saves as Met · 1969 and 1973 pennants · Ya Gotta Believe!", fact:"Ya Gotta Believe! His rallying cry launched the 1973 pennant race. Also threw the final pitch of the 1980 World Series as a Phillie — the same man, two different championship moments.", wiki:"https://en.wikipedia.org/wiki/Tug_McGraw",      photo:"https://upload.wikimedia.org/wikipedia/commons/thumb/3/3c/Tug_McGraw_1974.jpg/256px-Tug_McGraw_1974.jpg",                   cardColor:"#FF5910" },
  { name:"Carlos Beltrán",   team:"Mets",   sport:"MLB", pos:"CF", emoji:"⚾", number:"15", active:false, era:"2005–2011", stats:".283 AVG · 149 HR as Met · 9× Gold Glove",               fact:"The most complete player to wear a Mets uniform since Seaver. His taken called strike 3 in the 2006 NLCS off Adam Wainwright defined him in Mets history — unfairly.",                  wiki:"https://en.wikipedia.org/wiki/Carlos_Beltr%C3%A1n",photo:"https://upload.wikimedia.org/wikipedia/commons/thumb/9/9c/Beltran_041011.jpg/256px-Beltran_041011.jpg",                    cardColor:"#FF5910" },
  // ── JETS / GIANTS (20 players) ───────────────────────────────────────────
  { name:"Joe Namath",       team:"Jets",   sport:"NFL", pos:"QB", emoji:"🏈", number:"12", active:false, era:"1965–1976", stats:"27,057 yds · 173 TD · Super Bowl III MVP",               fact:"Guaranteed a Super Bowl win as a 17-point underdog then delivered. Changed professional football forever with one press conference. Broadway Joe was the game's first true celebrity QB.", wiki:"https://en.wikipedia.org/wiki/Joe_Namath",      photo:"https://upload.wikimedia.org/wikipedia/commons/thumb/0/0e/Joe_Namath_1965.jpg/256px-Joe_Namath_1965.jpg",                   cardColor:"#125740" },
  { name:"Lawrence Taylor",  team:"Giants", sport:"NFL", pos:"LB", emoji:"🏈", number:"56", active:false, era:"1981–1993", stats:"132.5 sacks · 2× SB · NFL MVP 1986",                    fact:"The NFL changed its rules because of him. Opponents had to double-team him with tight ends on passing downs — no linebacker had ever forced that adjustment. The greatest defender ever.", wiki:"https://en.wikipedia.org/wiki/Lawrence_Taylor",  photo:"https://upload.wikimedia.org/wikipedia/commons/thumb/9/9d/Lawrence_Taylor_2009.jpg/256px-Lawrence_Taylor_2009.jpg",           cardColor:"#0B2265" },
  { name:"Eli Manning",      team:"Giants", sport:"NFL", pos:"QB", emoji:"🏈", number:"10", active:false, era:"2004–2019", stats:"57,023 yds · 366 TD · 2× Super Bowl MVP",               fact:"Beat the undefeated Patriots twice in the Super Bowl. Made the pass to David Tyree and the throw to Mario Manningham. Chronically underrated despite two of the most improbable championship runs in NFL history.", wiki:"https://en.wikipedia.org/wiki/Eli_Manning",    photo:"https://upload.wikimedia.org/wikipedia/commons/thumb/d/d8/Eli_Manning_2019.jpg/256px-Eli_Manning_2019.jpg",                  cardColor:"#0B2265" },
  { name:"Phil Simms",       team:"Giants", sport:"NFL", pos:"QB", emoji:"🏈", number:"11", active:false, era:"1979–1993", stats:"33,462 yds · 199 TD · Super Bowl XXI MVP",              fact:"Completed 22 of 25 passes (88%) in Super Bowl XXI — still the all-time Super Bowl completion percentage record. The stat perfectly illustrates a career of quiet, overlooked excellence.", wiki:"https://en.wikipedia.org/wiki/Phil_Simms",      photo:"https://upload.wikimedia.org/wikipedia/commons/thumb/b/b0/Phil_Simms_2015.jpg/256px-Phil_Simms_2015.jpg",                   cardColor:"#0B2265" },
  { name:"Michael Strahan",  team:"Giants", sport:"NFL", pos:"DE", emoji:"🏈", number:"92", active:false, era:"1993–2007", stats:"141.5 sacks · Single-season record 22.5 in 2001",       fact:"Set the single-season sack record. When he retired, Giants fans thought the team was finished. Then Eli won two Super Bowls without him. But Strahan's dominance defined an era.", wiki:"https://en.wikipedia.org/wiki/Michael_Strahan",  photo:"https://upload.wikimedia.org/wikipedia/commons/thumb/e/e3/Michael_Strahan_2011.jpg/256px-Michael_Strahan_2011.jpg",           cardColor:"#0B2265" },
  { name:"Frank Gifford",    team:"Giants", sport:"NFL", pos:"HB", emoji:"🏈", number:"16", active:false, era:"1952–1964", stats:"3,609 rush yds · 367 rec yds · NFL MVP 1956",           fact:"Mr. Giant — the most glamorous player of his era, a Hall of Famer who transitioned into a legendary broadcasting career with Monday Night Football. New York's first football star.", wiki:"https://en.wikipedia.org/wiki/Frank_Gifford",   photo:"https://upload.wikimedia.org/wikipedia/commons/thumb/0/0b/Frank_Gifford_1961.jpg/256px-Frank_Gifford_1961.jpg",               cardColor:"#0B2265" },
  { name:"Curtis Martin",    team:"Jets",   sport:"NFL", pos:"RB", emoji:"🏈", number:"28", active:false, era:"1998–2006", stats:"14,101 rush yds · 4× Pro Bowl · Hall of Fame 2012",     fact:"Won the NFL rushing title at age 31 despite playing through injuries and never being considered the most explosive back. Pure will and vision. The greatest Jet since Namath.",          wiki:"https://en.wikipedia.org/wiki/Curtis_Martin",   photo:"https://upload.wikimedia.org/wikipedia/commons/thumb/2/2a/Curtis_Martin_2009.jpg/256px-Curtis_Martin_2009.jpg",               cardColor:"#125740" },
  { name:"Darrelle Revis",   team:"Jets",   sport:"NFL", pos:"CB", emoji:"🏈", number:"24", active:false, era:"2007–2016", stats:"4× All-Pro · 29 INT · Revis Island era",                 fact:"Revis Island was a real place. The most dominant wide receivers in the NFL — Calvin Johnson, Randy Moss, Larry Fitzgerald — ceased to exist on his side of the field.", wiki:"https://en.wikipedia.org/wiki/Darrelle_Revis",   photo:"https://upload.wikimedia.org/wikipedia/commons/thumb/9/9d/Darrelle_Revis_2013.jpg/256px-Darrelle_Revis_2013.jpg",             cardColor:"#125740" },
  { name:"Don Maynard",      team:"Jets",   sport:"NFL", pos:"WR", emoji:"🏈", number:"13", active:false, era:"1960–1972", stats:"88 rec TDs · First AFL WR to 1,000 yds",               fact:"The first player in AFL history to reach 1,000 receiving yards in a season. Namath's primary deep target in the Super Bowl guarantee game — he couldn't have delivered without Maynard.", wiki:"https://en.wikipedia.org/wiki/Don_Maynard",     photo:"https://upload.wikimedia.org/wikipedia/commons/thumb/4/4e/Don_Maynard_1966.jpg/256px-Don_Maynard_1966.jpg",                  cardColor:"#125740" },
  { name:"Sam Huff",         team:"Giants", sport:"NFL", pos:"LB", emoji:"🏈", number:"70", active:false, era:"1956–1963", stats:"30 INT · 5× Pro Bowl · Hall of Fame 1982",              fact:"The first linebacker to become a national celebrity, thanks to a CBS documentary called 'The Violent World of Sam Huff.' He made the middle linebacker position famous.", wiki:"https://en.wikipedia.org/wiki/Sam_Huff",         photo:"https://upload.wikimedia.org/wikipedia/commons/thumb/a/ab/Sam_Huff_1963.jpg/256px-Sam_Huff_1963.jpg",                      cardColor:"#0B2265" },
  { name:"Mark Gastineau",   team:"Jets",   sport:"NFL", pos:"DE", emoji:"🏈", number:"99", active:false, era:"1979–1988", stats:"74 career sacks · 22-sack season in 1984",               fact:"Part of the legendary NY Sack Exchange with Klecko, Lyons and Salaam. His 22-sack season in 1984 set the NFL record. His sack celebration dance was controversial — and unforgettable.", wiki:"https://en.wikipedia.org/wiki/Mark_Gastineau",   photo:"https://upload.wikimedia.org/wikipedia/commons/thumb/7/7d/Mark_Gastineau_1985.jpg/256px-Mark_Gastineau_1985.jpg",             cardColor:"#125740" },
  // ── KNICKS (15 players) ───────────────────────────────────────────────────
  { name:"Patrick Ewing",    team:"Knicks", sport:"NBA", pos:"C",  emoji:"🏀", number:"33", active:false, era:"1985–2000", stats:"23,665 pts · 10,759 reb · 11× All-Star",               fact:"The greatest Knick of all time spent 15 seasons carrying a franchise on his back, coming heartbreakingly close to a championship in 1994. MSG worshipped him then and always.", wiki:"https://en.wikipedia.org/wiki/Patrick_Ewing",    photo:"https://upload.wikimedia.org/wikipedia/commons/thumb/6/61/Patrick_Ewing_2008.jpg/256px-Patrick_Ewing_2008.jpg",               cardColor:"#006BB6" },
  { name:"Walt Frazier",     team:"Knicks", sport:"NBA", pos:"G",  emoji:"🏀", number:"10", active:false, era:"1967–1977", stats:"14,617 pts · 4,791 ast · 2× NBA Champion",             fact:"Scored 36 points and dished 19 assists in Game 7 of the 1970 NBA Finals — perhaps the greatest individual game 7 performance in Finals history. And did it while Willis Reed limped onto the court.", wiki:"https://en.wikipedia.org/wiki/Walt_Frazier",   photo:"https://upload.wikimedia.org/wikipedia/commons/thumb/3/37/Walt_Frazier_1972.jpg/256px-Walt_Frazier_1972.jpg",                cardColor:"#006BB6" },
  { name:"Willis Reed",      team:"Knicks", sport:"NBA", pos:"C",  emoji:"🏀", number:"19", active:false, era:"1964–1974", stats:"12,183 pts · 8,414 reb · 2× NBA Champion",             fact:"Limped onto the MSG floor on a torn thigh muscle for Game 7 of the 1970 Finals. The crowd went insane. The Knicks won. It is the single most inspiring entrance in sports history.", wiki:"https://en.wikipedia.org/wiki/Willis_Reed",     photo:"https://upload.wikimedia.org/wikipedia/commons/thumb/d/da/Willis_Reed.jpg/256px-Willis_Reed.jpg",                              cardColor:"#006BB6" },
  { name:"Earl Monroe",      team:"Knicks", sport:"NBA", pos:"G",  emoji:"🏀", number:"15", active:false, era:"1971–1980", stats:"13,455 career pts · Pearl · 1973 NBA Champion",        fact:"The Pearl's playground moves — spins, hesitations, and impossible angles — influenced every creative guard who followed. He and Frazier formed the most stylish backcourt in Knicks history.", wiki:"https://en.wikipedia.org/wiki/Earl_Monroe",     photo:"https://upload.wikimedia.org/wikipedia/commons/thumb/d/de/Earl_Monroe_1976.jpg/256px-Earl_Monroe_1976.jpg",                  cardColor:"#006BB6" },
  { name:"Dave DeBusschere", team:"Knicks", sport:"NBA", pos:"F",  emoji:"🏀", number:"22", active:false, era:"1968–1974", stats:"Two-time NBA Champion · 8× All-Defensive Team",         fact:"The piece that completed the championship Knicks. Acquired in a trade for Walt Bellamy in 1968, he transformed the team's defense and brought the culture needed to win.", wiki:"https://en.wikipedia.org/wiki/Dave_DeBusschere", photo:"https://upload.wikimedia.org/wikipedia/commons/thumb/e/e9/DeBusschere.jpg/256px-DeBusschere.jpg",                             cardColor:"#006BB6" },
  { name:"Bill Bradley",     team:"Knicks", sport:"NBA", pos:"F",  emoji:"🏀", number:"24", active:false, era:"1967–1977", stats:"Two-time NBA Champion · Rhodes Scholar · US Senator",   fact:"Dollar Bill played 10 seasons as a Knick while already planning his post-basketball life as a US Senator. One of the most intellectually impressive athletes in professional sports history.", wiki:"https://en.wikipedia.org/wiki/Bill_Bradley",    photo:"https://upload.wikimedia.org/wikipedia/commons/thumb/3/37/Bill_Bradley.jpg/256px-Bill_Bradley.jpg",                          cardColor:"#006BB6" },
  { name:"Carmelo Anthony",  team:"Knicks", sport:"NBA", pos:"F",  emoji:"🏀", number:"7",  active:false, era:"2011–2017", stats:"22.4 PPG as Knick · 6× All-Star · Knicks fan favorite", fact:"MSG went absolutely wild when Carmelo arrived. He gave Knicks fans something to cheer about during a bleak decade. His mid-range jumper was one of the most beautiful shots in basketball.", wiki:"https://en.wikipedia.org/wiki/Carmelo_Anthony", photo:"https://upload.wikimedia.org/wikipedia/commons/thumb/5/5d/Carmelo_Anthony_2013.jpg/256px-Carmelo_Anthony_2013.jpg",           cardColor:"#006BB6" },
  { name:"Jalen Brunson",    team:"Knicks", sport:"NBA", pos:"PG", emoji:"🏀", number:"11", active:true,  era:"2022–present", stats:"28+ PPG · 7+ APG · MSG's new hero",                 fact:"Took a hometown discount to come to New York and immediately became the most important Knick since Ewing. MSG is the loudest it has been in decades when he's playing well.", wiki:"https://en.wikipedia.org/wiki/Jalen_Brunson",    photo:"https://upload.wikimedia.org/wikipedia/commons/thumb/b/b3/Jalen_Brunson_2024.jpg/256px-Jalen_Brunson_2024.jpg",               cardColor:"#006BB6" },
  { name:"Charles Oakley",   team:"Knicks", sport:"NBA", pos:"F",  emoji:"🏀", number:"34", active:false, era:"1988–1998", stats:"9.0 RPG as Knick · Enforcer · MSG legend",             fact:"The most physical enforcer of the 1990s Knicks' bruiser era. MSG fans still chant his name. His 2017 ejection from the Garden sparked national outrage against James Dolan.", wiki:"https://en.wikipedia.org/wiki/Charles_Oakley",   photo:"https://upload.wikimedia.org/wikipedia/commons/thumb/5/5e/Charles_Oakley_2011.jpg/256px-Charles_Oakley_2011.jpg",             cardColor:"#006BB6" },
  // ── RANGERS / ISLANDERS / DEVILS (25 players) ────────────────────────────
  { name:"Mark Messier",     team:"Rangers",sport:"NHL", pos:"C",  emoji:"🏒", number:"11", active:false, era:"1991–2004", stats:"851 pts as Ranger · 6× Stanley Cup champion",          fact:"Guaranteed a win in Game 6 vs the Devils when down 3-2 in the series. Then scored a hat trick. Then won the 1994 Stanley Cup to end a 54-year drought. The greatest captain in hockey.", wiki:"https://en.wikipedia.org/wiki/Mark_Messier",    photo:"https://upload.wikimedia.org/wikipedia/commons/thumb/c/cd/Mark_Messier_2014.jpg/256px-Mark_Messier_2014.jpg",                cardColor:"#0038A8" },
  { name:"Brian Leetch",     team:"Rangers",sport:"NHL", pos:"D",  emoji:"🏒", number:"2",  active:false, era:"1987–2004", stats:"1,028 pts (all-time Rangers leader) · Conn Smythe 1994", fact:"The greatest American-born player in NHL history. His 34 postseason points in 1994 earned him the Conn Smythe Trophy — an extraordinary performance on hockey's biggest stage.", wiki:"https://en.wikipedia.org/wiki/Brian_Leetch",    photo:"https://upload.wikimedia.org/wikipedia/commons/thumb/0/06/Brian_Leetch_2009.jpg/256px-Brian_Leetch_2009.jpg",                 cardColor:"#0038A8" },
  { name:"Rod Gilbert",      team:"Rangers",sport:"NHL", pos:"RW", emoji:"🏒", number:"7",  active:false, era:"1960–1978", stats:"1,021 pts · All-time Rangers franchise scorer",        fact:"The franchise scoring leader for decades until Leetch. Overcame serious back surgery to become the most beloved Ranger of his era. A class act who represents everything good about the game.", wiki:"https://en.wikipedia.org/wiki/Rod_Gilbert",     photo:"https://upload.wikimedia.org/wikipedia/commons/thumb/4/4e/Rod_Gilbert_2012.jpg/256px-Rod_Gilbert_2012.jpg",                   cardColor:"#0038A8" },
  { name:"Mike Richter",     team:"Rangers",sport:"NHL", pos:"G",  emoji:"🏒", number:"35", active:false, era:"1989–2003", stats:".904 SV% · 301 wins · 1994 Stanley Cup champion",      fact:"His performance throughout the 1994 playoffs was the backbone of the championship run. His 42-save Game 4 against the Canucks is one of the greatest individual games in NHL history.", wiki:"https://en.wikipedia.org/wiki/Mike_Richter",    photo:"https://upload.wikimedia.org/wikipedia/commons/thumb/e/e8/Mike_Richter_2009.jpg/256px-Mike_Richter_2009.jpg",                  cardColor:"#0038A8" },
  { name:"Henrik Lundqvist", team:"Rangers",sport:"NHL", pos:"G",  emoji:"🏒", number:"30", active:false, era:"2005–2021", stats:".921 SV% · 459 wins · Vezina Trophy 2012",             fact:"The King gave Rangers fans 15 years of elite goaltending, carrying teams deeper into the playoffs than they deserved. When he took off his mask, MSG always roared.", wiki:"https://en.wikipedia.org/wiki/Henrik_Lundqvist", photo:"https://upload.wikimedia.org/wikipedia/commons/thumb/b/b1/Henrik_Lundqvist_2012.jpg/256px-Henrik_Lundqvist_2012.jpg",           cardColor:"#0038A8" },
  { name:"Jean Ratelle",     team:"Rangers",sport:"NHL", pos:"C",  emoji:"🏒", number:"19", active:false, era:"1960–1975", stats:"817 pts as Ranger · Lady Byng 4× · Hall of Fame",      fact:"The center of the famous GAG Line (Goal A Game) with Hadfield and Gilbert. One of the cleanest and most skilled players in Rangers history. Won the Lady Byng four times.", wiki:"https://en.wikipedia.org/wiki/Jean_Ratelle",    photo:"https://upload.wikimedia.org/wikipedia/commons/thumb/3/3c/Jean_Ratelle_1974.jpg/256px-Jean_Ratelle_1974.jpg",                  cardColor:"#0038A8" },
  { name:"Denis Potvin",     team:"Islanders",sport:"NHL",pos:"D", emoji:"🏒", number:"5",  active:false, era:"1973–1988", stats:"1,052 pts · 3× Norris · 4× Stanley Cup",              fact:"Broke Bobby Orr's all-time points record for defensemen. Captained four consecutive Stanley Cup champions — an achievement that may never be equaled.", wiki:"https://en.wikipedia.org/wiki/Denis_Potvin",    photo:"https://upload.wikimedia.org/wikipedia/commons/thumb/a/a2/Denis_Potvin_2009.jpg/256px-Denis_Potvin_2009.jpg",                  cardColor:"#00539B" },
  { name:"Mike Bossy",       team:"Islanders",sport:"NHL",pos:"RW",emoji:"🏒", number:"22", active:false, era:"1977–1987", stats:"573 G · 9 straight 50-goal seasons · 4× Cup",          fact:"Matched Rocket Richard's 50-in-50 in 1981 — one of only two players ever. Retired at 30 due to back injuries. Had he been healthy, he might have surpassed Gretzky's goal records.", wiki:"https://en.wikipedia.org/wiki/Mike_Bossy",      photo:"https://upload.wikimedia.org/wikipedia/commons/thumb/8/8d/Mike_Bossy.jpg/256px-Mike_Bossy.jpg",                              cardColor:"#00539B" },
  { name:"Bryan Trottier",   team:"Islanders",sport:"NHL",pos:"C", emoji:"🏒", number:"19", active:false, era:"1975–1990", stats:"1,353 pts · 4× Cup with Isles · Hart Trophy 1979",     fact:"The engine of the greatest dynasty in NHL history. Won 4 Cups with the Islanders then 2 more with Pittsburgh — 6 championships total. The most decorated player of his generation.", wiki:"https://en.wikipedia.org/wiki/Bryan_Trottier",  photo:"https://upload.wikimedia.org/wikipedia/commons/thumb/2/24/Bryan_Trottier_2018.jpg/256px-Bryan_Trottier_2018.jpg",              cardColor:"#00539B" },
  { name:"Billy Smith",      team:"Islanders",sport:"NHL",pos:"G", emoji:"🏒", number:"31", active:false, era:"1972–1989", stats:"4× Cup · Vezina 1982 · Most ferocious goalie ever",     fact:"Battlin' Billy was the most intimidating goaltender in NHL history — he would slash anyone who entered his crease. His four consecutive Cups are the centerpiece of the Islanders dynasty.", wiki:"https://en.wikipedia.org/wiki/Billy_Smith",     photo:"https://upload.wikimedia.org/wikipedia/commons/thumb/6/65/Billy_Smith_2009.jpg/256px-Billy_Smith_2009.jpg",                   cardColor:"#00539B" },
  { name:"Clark Gillies",    team:"Islanders",sport:"NHL",pos:"LW",emoji:"🏒", number:"9",  active:false, era:"1974–1986", stats:"4× Cup · Enforcer of the dynasty",                    fact:"The enforcer who protected Bossy and Trottier. His Game 5 hit in the 1980 Final changed the series. Hall of Famer whose role in the dynasty was irreplaceable.", wiki:"https://en.wikipedia.org/wiki/Clark_Gillies",    photo:"https://upload.wikimedia.org/wikipedia/commons/thumb/c/c0/Clark_Gillies_2018.jpg/256px-Clark_Gillies_2018.jpg",                cardColor:"#00539B" },
  { name:"John Tavares",     team:"Islanders",sport:"NHL",pos:"C", emoji:"🏒", number:"91", active:false, era:"2009–2018", stats:"272 G · 621 pts as Islander · 6× All-Star",            fact:"The most talented Islander since Mike Bossy. His Free Agent departure to Toronto in 2018 broke Long Island's heart. But his nine years in blue and orange were spectacular.", wiki:"https://en.wikipedia.org/wiki/John_Tavares",     photo:"https://upload.wikimedia.org/wikipedia/commons/thumb/5/5e/John_Tavares_2018.jpg/256px-John_Tavares_2018.jpg",                  cardColor:"#00539B" },
  { name:"Martin Brodeur",   team:"Devils", sport:"NHL", pos:"G",  emoji:"🏒", number:"30", active:false, era:"1991–2014", stats:"691 wins · 125 shutouts · 3× Cup · 4× Vezina",         fact:"The all-time NHL leader in wins, shutouts and games played. Threw the very definition of consistency for 22 seasons in New Jersey. No goalie in the sport's history has come close.", wiki:"https://en.wikipedia.org/wiki/Martin_Brodeur",   photo:"https://upload.wikimedia.org/wikipedia/commons/thumb/5/57/MartinBrodeur.jpg/256px-MartinBrodeur.jpg",                         cardColor:"#CE1126" },
  { name:"Scott Stevens",    team:"Devils", sport:"NHL", pos:"D",  emoji:"🏒", number:"4",  active:false, era:"1991–2004", stats:"3× Cup · Conn Smythe 2000 · Most feared hitter",        fact:"The most physically intimidating defenseman in NHL history. His open-ice hits on Eric Lindros and Paul Kariya changed the playoff narratives of two different eras.", wiki:"https://en.wikipedia.org/wiki/Scott_Stevens",    photo:"https://upload.wikimedia.org/wikipedia/commons/thumb/c/c8/Scott_Stevens_2010.jpg/256px-Scott_Stevens_2010.jpg",               cardColor:"#CE1126" },
  { name:"Patrik Elias",     team:"Devils", sport:"NHL", pos:"LW", emoji:"🏒", number:"26", active:false, era:"1994–2016", stats:"408 G · 617 A · 3× Cup · All-time Devils scorer",       fact:"The all-time leading scorer in Devils franchise history with 1,025 points. Played his entire career in New Jersey, retiring as the most decorated offensive player the franchise ever had.", wiki:"https://en.wikipedia.org/wiki/Patrik_Elias",    photo:"https://upload.wikimedia.org/wikipedia/commons/thumb/4/44/Patrik_Elias_2012.jpg/256px-Patrik_Elias_2012.jpg",                  cardColor:"#CE1126" },
  { name:"Ken Daneyko",      team:"Devils", sport:"NHL", pos:"D",  emoji:"🏒", number:"3",  active:false, era:"1983–2003", stats:"1,283 games · 3× Cup · Mr. Devil",                     fact:"Played every one of his 1,283 NHL games in a Devils uniform. Won three Stanley Cups. The heart, soul and backbone of New Jersey hockey — deservedly called Mr. Devil.", wiki:"https://en.wikipedia.org/wiki/Ken_Daneyko",     photo:"https://upload.wikimedia.org/wikipedia/commons/thumb/3/3c/Ken_Daneyko.jpg/256px-Ken_Daneyko.jpg",                            cardColor:"#CE1126" },
  { name:"Scott Niedermayer",team:"Devils", sport:"NHL", pos:"D",  emoji:"🏒", number:"27", active:false, era:"1991–2004", stats:"3× Cup with NJ · Conn Smythe 2003 · Hall of Fame",      fact:"One of the most complete defensemen in NHL history — an elegant skater who also won three Cups with New Jersey. His combination of skill and leadership was nearly unparalleled.", wiki:"https://en.wikipedia.org/wiki/Scott_Niedermayer",photo:"https://upload.wikimedia.org/wikipedia/commons/thumb/9/9f/Scott_Niedermayer_2010.jpg/256px-Scott_Niedermayer_2010.jpg",       cardColor:"#CE1126" },
  // ── NETS / LIBERTY (10 players) ──────────────────────────────────────────
  { name:"Julius Erving",    team:"Nets",   sport:"ABA", pos:"F",  emoji:"🏀", number:"32", active:false, era:"1973–1976", stats:"2× ABA champion · 3× ABA MVP · Dr. J",                 fact:"The most exciting player in basketball reinvented the game as a New York Net. His dunks, sweeping layups and midair acrobatics were so far ahead of their time that the ABA built their marketing around him.", wiki:"https://en.wikipedia.org/wiki/Julius_Erving",    photo:"https://upload.wikimedia.org/wikipedia/commons/thumb/e/e5/JuliusErving.jpg/256px-JuliusErving.jpg",                          cardColor:"#000000" },
  { name:"Jason Kidd",       team:"Nets",   sport:"NBA", pos:"PG", emoji:"🏀", number:"5",  active:false, era:"2001–2008", stats:"12.0 APG · 8.0 RPG · 2× NBA Finals",                   fact:"Led the New Jersey Nets to two consecutive NBA Finals appearances in 2002 and 2003 — the only Finals in franchise history. He single-handedly transformed the team from lottery dwellers to contenders.", wiki:"https://en.wikipedia.org/wiki/Jason_Kidd",       photo:"https://upload.wikimedia.org/wikipedia/commons/thumb/7/74/Jason_Kidd_2010.jpg/256px-Jason_Kidd_2010.jpg",                    cardColor:"#000000" },
  { name:"Dražen Petrović",  team:"Nets",   sport:"NBA", pos:"G",  emoji:"🏀", number:"3",  active:false, era:"1991–1993", stats:"22 PPG in final season · Pioneer of European basketball", fact:"Died at 28 in a car accident in 1993, having just become one of the best players in the NBA. His 22-point average in his last season showed he was becoming something truly special.", wiki:"https://en.wikipedia.org/wiki/Dra%C5%BEen_Petrovi%C4%87",photo:"https://upload.wikimedia.org/wikipedia/commons/thumb/e/e5/Drazen_Petrovic.jpg/256px-Drazen_Petrovic.jpg",                   cardColor:"#000000" },
  { name:"Buck Williams",    team:"Nets",   sport:"NBA", pos:"F",  emoji:"🏀", number:"52", active:false, era:"1981–1989", stats:"12.5 RPG · 3× All-Star · Franchise icon",              fact:"The most productive big man in Nets history before the Kevin Garnett era. His rebounding and hustle made him the heart of the franchise through its best years in the early 1980s.", wiki:"https://en.wikipedia.org/wiki/Buck_Williams",    photo:"https://upload.wikimedia.org/wikipedia/commons/thumb/0/0e/Buck_Williams_2011.jpg/256px-Buck_Williams_2011.jpg",               cardColor:"#000000" },
  { name:"Breanna Stewart",  team:"Liberty",sport:"WNBA",pos:"F", emoji:"🏀", number:"30", active:true,  era:"2023–present", stats:"2× WNBA Champion · 2× Finals MVP",                 fact:"Came to New York specifically to win and delivered back-to-back championships. The most complete player in women's basketball history since Diana Taurasi.", wiki:"https://en.wikipedia.org/wiki/Breanna_Stewart",  photo:"https://upload.wikimedia.org/wikipedia/commons/thumb/5/5c/Breanna_Stewart_2024.jpg/256px-Breanna_Stewart_2024.jpg",           cardColor:"#007A5E" },
  { name:"Sabrina Ionescu",  team:"Liberty",sport:"WNBA",pos:"G", emoji:"🏀", number:"20", active:true,  era:"2020–present", stats:"NCAA triple-doubles record · WNBA champion",         fact:"Set the NCAA all-time triple-doubles record at Oregon. Now the face of the WNBA alongside Breanna Stewart, leading the Liberty to championships and putting women's basketball on the New York sports map.", wiki:"https://en.wikipedia.org/wiki/Sabrina_Ionescu",   photo:"https://upload.wikimedia.org/wikipedia/commons/thumb/9/9f/Sabrina_Ionescu_2022.jpg/256px-Sabrina_Ionescu_2022.jpg",           cardColor:"#007A5E" },
  // ── US OPEN TENNIS — ARTHUR ASHE STADIUM ─────────────────────────────────
  { name:"Arthur Ashe",      team:"US Open",sport:"Tennis",pos:"Champion",emoji:"🎾",number:"1",active:false, era:"1943–1993", stats:"1968 US Open champion · Wimbledon 1975 · First Black Grand Slam winner", fact:"Won the first US Open in 1968, the first year professionals were allowed. The stadium at Flushing Meadows bears his name — a fitting tribute to the greatest ambassador American tennis has ever produced.", wiki:"https://en.wikipedia.org/wiki/Arthur_Ashe",         photo:"https://upload.wikimedia.org/wikipedia/commons/thumb/3/3f/Arthur_Ashe_1976.jpg/256px-Arthur_Ashe_1976.jpg",                   cardColor:"#1a6b3c" },
  { name:"Billie Jean King", team:"US Open",sport:"Tennis",pos:"Champion",emoji:"🎾",number:"1",active:false, era:"1943–present", stats:"4× US Open · 39 Grand Slam titles · Battle of the Sexes", fact:"The USTA National Tennis Center at Flushing Meadows bears her name. Won 4 US Opens, then spent the rest of her life fighting for equal prize money, equal opportunity, and equal respect.", wiki:"https://en.wikipedia.org/wiki/Billie_Jean_King",    photo:"https://upload.wikimedia.org/wikipedia/commons/thumb/f/f2/Billie_Jean_King.jpg/256px-Billie_Jean_King.jpg",                   cardColor:"#1a6b3c" },
  { name:"Serena Williams",  team:"US Open",sport:"Tennis",pos:"Champion",emoji:"🎾",number:"1",active:false, era:"1999–2022", stats:"6× US Open champion · 23 Grand Slam titles",       fact:"Won the US Open six times at Arthur Ashe Stadium — more than any woman in the Open Era. Her 1999 debut US Open title, at age 17, was the beginning of the most dominant women's tennis career in history.", wiki:"https://en.wikipedia.org/wiki/Serena_Williams",    photo:"https://upload.wikimedia.org/wikipedia/commons/thumb/9/9e/Serena_Williams_2019.jpg/256px-Serena_Williams_2019.jpg",           cardColor:"#1a6b3c" },
  { name:"Jimmy Connors",    team:"US Open",sport:"Tennis",pos:"Champion",emoji:"🎾",number:"1",active:false, era:"1952–1996", stats:"5× US Open champion · Only player to win on 3 surfaces", fact:"Won the US Open on three different surfaces — grass, clay and hard court — the only player in history to do so. His 1991 run to the quarterfinals at age 39 is the most beloved moment in US Open crowd history.", wiki:"https://en.wikipedia.org/wiki/Jimmy_Connors",      photo:"https://upload.wikimedia.org/wikipedia/commons/thumb/c/c6/Jimmy_Connors_1991.jpg/256px-Jimmy_Connors_1991.jpg",               cardColor:"#1a6b3c" },
  { name:"Pete Sampras",     team:"US Open",sport:"Tennis",pos:"Champion",emoji:"🎾",number:"1",active:false, era:"1971–2003", stats:"5× US Open champion · 14 Grand Slam titles",        fact:"Won five US Opens and was the world's best player for much of the 1990s. His final Grand Slam title — at the 2002 US Open — came on Arthur Ashe Stadium in one of the most dramatic Finals ever.", wiki:"https://en.wikipedia.org/wiki/Pete_Sampras",       photo:"https://upload.wikimedia.org/wikipedia/commons/thumb/9/94/Pete_Sampras_2008.jpg/256px-Pete_Sampras_2008.jpg",                  cardColor:"#1a6b3c" },
  // ── US OPEN GOLF — NY COURSES ─────────────────────────────────────────────
  { name:"Tiger Woods",      team:"Bethpage",sport:"Golf",pos:"Champion",emoji:"⛳",number:"1",active:false, era:"1975–present", stats:"2002 US Open · Bethpage Black · Dominant victory", fact:"Won the 2002 US Open at Bethpage Black — the first US Open ever held on a publicly owned course. His 3-under was the only score under par. Long Island came out in force and stayed all day.", wiki:"https://en.wikipedia.org/wiki/Tiger_Woods",        photo:"https://upload.wikimedia.org/wikipedia/commons/thumb/a/a5/Tiger_Woods_with_Olympic_medal_2016.jpg/256px-Tiger_Woods_with_Olympic_medal_2016.jpg", cardColor:"#2d5a27" },
  { name:"Bryson DeChambeau",team:"Winged Foot",sport:"Golf",pos:"Champion",emoji:"⛳",number:"1",active:false,era:"1993–present",stats:"2020 US Open · Winged Foot · 6-under · Redefined how to play it",fact:"Won the 2020 US Open at Winged Foot at 6-under — the only player under par — by overpowering the course with distance and analytics. He played the course in a way nobody had ever considered.", wiki:"https://en.wikipedia.org/wiki/Bryson_DeChambeau",  photo:"https://upload.wikimedia.org/wikipedia/commons/thumb/4/48/Bryson_DeChambeau_2021.jpg/256px-Bryson_DeChambeau_2021.jpg",     cardColor:"#2d5a27" },
  { name:"Brooks Koepka",    team:"Shinnecock",sport:"Golf",pos:"Champion",emoji:"⛳",number:"1",active:false,era:"1990–present",stats:"2018 US Open Shinnecock · 2019 defense · 4× major winner",fact:"Won the 2018 US Open at Shinnecock Hills at +1 — the only over-par US Open winner in a decade — as brutal conditions made the course nearly unplayable. His composure under pressure defined his career.", wiki:"https://en.wikipedia.org/wiki/Brooks_Koepka",      photo:"https://upload.wikimedia.org/wikipedia/commons/thumb/e/e4/Brooks_Koepka_2019.jpg/256px-Brooks_Koepka_2019.jpg",               cardColor:"#2d5a27" },
  // ── BELMONT / TRIPLE CROWN ───────────────────────────────────────────────
  { name:"Secretariat",      team:"Belmont",sport:"Racing",pos:"Thoroughbred",emoji:"🐎",number:"1",active:false,era:"1973", stats:"31-length Belmont win · 2:24 world record · Triple Crown", fact:"Won the 1973 Belmont Stakes at Belmont Park in Elmont, Long Island by 31 lengths — completing the Triple Crown in a world record 2:24 flat that has never been broken. Not just the greatest horse race ever run, but arguably the greatest performance in the history of sport.", wiki:"https://en.wikipedia.org/wiki/Secretariat",       photo:"https://upload.wikimedia.org/wikipedia/commons/thumb/5/5a/Secretariat_at_1973_Belmont_Stakes.jpg/256px-Secretariat_at_1973_Belmont_Stakes.jpg", cardColor:"#8B4513" },
  { name:"American Pharoah", team:"Belmont",sport:"Racing",pos:"Thoroughbred",emoji:"🐎",number:"1",active:false,era:"2015", stats:"2015 Triple Crown · Ended 37-year drought",           fact:"Ended a 37-year Triple Crown drought in 2015, winning the Belmont Stakes at Belmont Park in front of 90,000 fans in a frenzy. The crowd stormed the rail. Pharoah looked like he could run another mile.", wiki:"https://en.wikipedia.org/wiki/American_Pharoah",   photo:"https://upload.wikimedia.org/wikipedia/commons/thumb/7/71/American_Pharoah_wins_Triple_Crown.jpg/256px-American_Pharoah_wins_Triple_Crown.jpg", cardColor:"#8B4513" },
];

function getDailyPlayer() {
  const day = Math.floor(Date.now() / 86400000);
  return DAILY_PLAYERS[day % DAILY_PLAYERS.length];
}

function PlayerSpotlight() {
  const [flipped, setFlipped] = useState(false);
  const [imgError, setImgError] = useState(false);
  const p = getDailyPlayer();
  const cardColor = p.cardColor || "#c8201c";

  return (
    <div style={styles.tcardWrap} onClick={() => setFlipped(!flipped)}>
      <div style={{...styles.tcardOuter, background:`linear-gradient(135deg, ${cardColor} 0%, #000 70%)`}}>
        <div style={styles.tcardInner}>
          {!flipped ? (
            <>
              {/* TOP BAR */}
              <div style={styles.tcardTopBar}>
                <span style={styles.tcardBadge}>⭐ DAILY SPOTLIGHT</span>
                <span style={styles.tcardYear}>NY SPORTS DAILY</span>
              </div>

              {/* PHOTO FRAME */}
              <div style={{...styles.tcardPhotoFrame, background:cardColor}}>
                {p.photo && !imgError ? (
                  <img src={p.photo} alt={p.name}
                    style={styles.tcardPhoto}
                    onError={() => setImgError(true)} />
                ) : (
                  <div style={styles.tcardPhotoFallback}>
                    <span style={{fontSize:60}}>{p.emoji}</span>
                  </div>
                )}
                <div style={styles.tcardJerseyNum}>#{p.number}</div>
              </div>

              {/* NAME PLATE */}
              <div style={styles.tcardNamePlate}>
                <div style={styles.tcardName}>{p.name}</div>
                <div style={styles.tcardTeamRow}>
                  <span style={{...styles.tcardTeamBadge, background:cardColor}}>{p.team.toUpperCase()}</span>
                  <span style={styles.tcardPos}>{p.pos} · {p.sport}</span>
                  {p.active && <span style={styles.tcardActiveDot}>● ACTIVE</span>}
                </div>
              </div>

              {/* STATS LINE */}
              <div style={styles.tcardStatsLine}>
                <span style={styles.tcardEraLabel}>{p.era}</span>
                <span style={styles.tcardStats}>{p.stats}</span>
              </div>

              <div style={styles.tcardFlipHint}>tap card to flip →</div>
            </>
          ) : (
            <>
              <div style={styles.tcardTopBar}>
                <span style={styles.tcardBadge}>{p.name.toUpperCase()}</span>
                <span style={styles.tcardYear}>← FLIP BACK</span>
              </div>
              <div style={styles.tcardBackBody}>
                <p style={styles.tcardFact}>{p.fact}</p>
                <div style={styles.tcardBackStats}>
                  <div style={styles.tcardBackStatItem}>
                    <span style={styles.tcardBackStatLabel}>POSITION</span>
                    <span style={styles.tcardBackStatVal}>{p.pos}</span>
                  </div>
                  <div style={styles.tcardBackStatItem}>
                    <span style={styles.tcardBackStatLabel}>NUMBER</span>
                    <span style={styles.tcardBackStatVal}>#{p.number}</span>
                  </div>
                  <div style={styles.tcardBackStatItem}>
                    <span style={styles.tcardBackStatLabel}>ERA</span>
                    <span style={styles.tcardBackStatVal}>{p.era}</span>
                  </div>
                </div>
                <div style={styles.tcardLinks}>
                  <a href={p.wiki} target="_blank" rel="noopener noreferrer" style={styles.tcardLink} onClick={e=>e.stopPropagation()}>📖 Wikipedia</a>
                  <a href={googleUrl(`${p.name} ${p.team} career stats`)} target="_blank" rel="noopener noreferrer" style={styles.tcardLink} onClick={e=>e.stopPropagation()}>🔍 Google</a>
                  <a href={`https://www.amazon.com/s?k=${encodeURIComponent(p.name+" biography")}&tag=nysportsdaily-20`} target="_blank" rel="noopener noreferrer" style={styles.tcardLink} onClick={e=>e.stopPropagation()}>📚 Books</a>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── ESPN STATS FETCH ─────────────────────────────────────────────────────
const STATS_ENDPOINTS = [
  { sport:"baseball",   league:"mlb",  label:"MLB", stats:[
    { name:"Home Runs",    slug:"homeRuns",      abbrev:"HR"  },
    { name:"Batting Avg",  slug:"battingAverage",abbrev:"AVG" },
    { name:"RBI",          slug:"RBIs",          abbrev:"RBI" },
    { name:"ERA",          slug:"ERA",           abbrev:"ERA" },
    { name:"Strikeouts",   slug:"strikeouts",    abbrev:"K"   },
  ]},
  { sport:"football",   league:"nfl",  label:"NFL", stats:[
    { name:"Passing Yds",  slug:"passingYards",  abbrev:"YDS" },
    { name:"Rushing Yds",  slug:"rushingYards",  abbrev:"YDS" },
    { name:"Receiving Yds",slug:"receivingYards",abbrev:"YDS" },
    { name:"Sacks",        slug:"sacks",         abbrev:"SCK" },
  ]},
  { sport:"basketball", league:"nba",  label:"NBA", stats:[
    { name:"Points",       slug:"points",        abbrev:"PPG" },
    { name:"Rebounds",     slug:"rebounds",      abbrev:"RPG" },
    { name:"Assists",      slug:"assists",       abbrev:"APG" },
  ]},
  { sport:"hockey",     league:"nhl",  label:"NHL", stats:[
    { name:"Points",       slug:"points",        abbrev:"PTS" },
    { name:"Goals",        slug:"goals",         abbrev:"G"   },
    { name:"Assists",      slug:"assists",       abbrev:"A"   },
  ]},
  { sport:"basketball", league:"wnba", label:"WNBA", stats:[
    { name:"Points",       slug:"points",        abbrev:"PPG" },
    { name:"Rebounds",     slug:"rebounds",      abbrev:"RPG" },
  ]},
  { sport:"soccer",     league:"nwsl", label:"NWSL", stats:[
    { name:"Goals",        slug:"goals",         abbrev:"G"   },
    { name:"Assists",      slug:"assists",       abbrev:"A"   },
  ]},
];

const NY_TEAM_NAMES = ["yankees","mets","jets","giants","knicks","nets","rangers","islanders","devils","liberty","gotham","nycfc","red bulls","new york","new jersey"];

async function fetchLeagueLeaders(sport, league) {
  const year = new Date().getFullYear();
  try {
    // Try the site web API which sometimes returns full data
    const url = `https://site.web.api.espn.com/apis/site/v2/sports/${sport}/${league}/leaders?season=${year}&seasontype=2&limit=10`;
    const res  = await fetch(url);
    if (!res.ok) throw new Error("bad response");
    const json = await res.json();
    const cats = json.categories || json.leaders || [];

    // ESPN sometimes returns $ref links — resolve them
    const resolved = await Promise.all(cats.slice(0,6).map(async cat => {
      const leaders = cat.leaders || [];
      const resolvedLeaders = await Promise.all(leaders.slice(0,10).map(async l => {
        // If athlete is a $ref, fetch it
        if (l.athlete?.$ref) {
          try {
            const ar = await fetch(l.athlete.$ref);
            const aj = await ar.json();
            return { ...l, athlete: aj };
          } catch { return l; }
        }
        return l;
      }));
      return { ...cat, leaders: resolvedLeaders };
    }));

    if (resolved.length && resolved[0].leaders?.length) return resolved;
  } catch(e) {}
  return [];
}

async function fetchNYNews() {
  const results = [];
  const seen = new Set();

  async function safeFetch(url) {
    try {
      const controller = new AbortController();
      const tid = setTimeout(() => controller.abort(), 12000);
      const res = await fetch(url, { signal: controller.signal });
      clearTimeout(tid);
      if (!res.ok) return null;
      return await res.json();
    } catch(e) { return null; }
  }

  // Simple reliable team detection — check full names first, then short names with exclusions
  const TEAM_DETECT = [
    { team:"Yankees",   must:["yankees"],           exclude:[] },
    { team:"Mets",      must:["new york mets","mets ","mets'","mets,","mets.","the mets","citi field"], exclude:[] },
    { team:"Jets",      must:["new york jets","ny jets","jets ","jets'","jets,","jets.","gang green"], exclude:["winnipeg","nhl"] },
    { team:"Giants",    must:["new york giants","ny giants","giants ","giants'","giants,","giants.","big blue","eli manning","lawrence taylor"], exclude:["san francisco","sf giants","oracle park","giants park","los angeles","san diego","colorado","chicago","atlanta","cincinnati","miami","pittsburgh","st. louis","milwaukee","philadelphia phillies","arizona","houston","seattle"] },
    { team:"Knicks",    must:["knicks","madison square garden","msg basketball","nba finals","brunson","jalen brunson","og anunoby","mikal bridges","karl-anthony towns","josh hart","new york knicks","knick ","knick'"], exclude:[] },
    { team:"Nets",      must:["brooklyn nets","nets ","nets'","nets,","nets.","barclays center"], exclude:[] },
    { team:"Rangers",   must:["new york rangers","ny rangers","rangers ","rangers'","rangers,","rangers.","blueshirts","henrik lundqvist","mark messier","brian leetch"], exclude:["texas rangers","texas ","t.rangers","royals","kansas city","los angeles angels","seattle mariners","houston astros","oakland","baltimore","boston red","minnesota twins","toronto blue","chicago white","cleveland","detroit","tampa bay"] },
    { team:"Islanders", must:["islanders","ubs arena","nassau coliseum","new york islanders"], exclude:[] },
    { team:"Devils",    must:["new jersey devils","nj devils","devils ","devils'","devils,","devils.","prudential center","martin brodeur","jack hughes"], exclude:[] },
    { team:"Liberty",   must:["new york liberty","liberty wnba","wnba liberty","breanna stewart","sabrina ionescu"], exclude:["statue of liberty","liberty bell","liberty university"] },
    { team:"NYCFC",     must:["nycfc","new york city fc"], exclude:[] },
    { team:"Red Bulls", must:["red bulls","rbny","new york red bulls"], exclude:[] },
    { team:"Gotham FC", must:["gotham fc","nj/ny gotham","nwsl gotham"], exclude:[] },
  ];

  function detectTeam(title, desc) {
    const text = ` ${(title+" "+desc).toLowerCase()} `;
    for (const { team, must, exclude } of TEAM_DETECT) {
      if (exclude.some(e => text.includes(e))) continue;
      if (must.some(m => text.includes(m))) return team;
    }
    return null;
  }

  function addArticle(a, source, defaultTeam, isNY, sport) {
    const title = (a.headline || a.title || a.name || "").trim();
    if (!title || seen.has(title)) return;
    seen.add(title);
    const team = detectTeam(title, a.description||"") || defaultTeam;
    results.push({
      title, source, sport, isNY: isNY || !!team,
      team: team || defaultTeam,
      link:  a.links?.web?.href || a.url || a.link || "#",
      desc:  a.description || a.summary || a.blurb || "",
      pub:   a.published || a.lastModified || a.date || new Date().toISOString(),
      image: a.images?.[0]?.url || null,
    });
  }

  // ── STATIC FALLBACK — every team always has at least 2 stories ───────────
  const STATIC_STORIES = [
    { title:"New York Jets 2026 training camp preview — battles to watch", team:"Jets", source:"ESPN · Jets", link:"https://www.espn.com/nfl/team/news/_/name/nyj", desc:"Key position battles and storylines as the Jets head into camp.", pub:new Date(Date.now()-172800000).toISOString() },
    { title:"Garrett Wilson among NFL's most dynamic receivers in 2026", team:"Jets", source:"ESPN · NFL", link:"https://www.espn.com/nfl/team/news/_/name/nyj", desc:"Wilson's emergence gives the Jets a true No. 1 weapon.", pub:new Date(Date.now()-259200000).toISOString() },
    { title:"New York Knicks NBA Finals 2026 — latest news and updates", team:"Knicks", source:"ESPN · Knicks", link:"https://www.espn.com/nba/team/news/_/name/ny", desc:"The Knicks are in the NBA Finals. Latest news, analysis and game coverage.", pub:new Date(Date.now()-3600000).toISOString() },
    { title:"Jalen Brunson leading the Knicks on the biggest stage in basketball", team:"Knicks", source:"ESPN · NBA", link:"https://www.espn.com/nba/team/news/_/name/ny", desc:"Brunson's leadership has the Knicks playing their best basketball.", pub:new Date(Date.now()-86400000).toISOString() },
    { title:"Brooklyn Nets 2026: building around youth and draft capital", team:"Nets", source:"ESPN · Nets", link:"https://www.espn.com/nba/team/news/_/name/bkn", desc:"The Nets enter a new era focused on sustainable rebuilding.", pub:new Date(Date.now()-172800000).toISOString() },
    { title:"Brooklyn Nets lottery pick gives new hope to long-suffering fans", team:"Nets", source:"ESPN · NBA", link:"https://www.espn.com/nba/team/news/_/name/bkn", desc:"Nets fans have reason for optimism as the rebuild continues.", pub:new Date(Date.now()-345600000).toISOString() },
    { title:"New York Rangers 2026 offseason: retooling for another playoff run", team:"Rangers", source:"ESPN · Rangers", link:"https://www.espn.com/nhl/team/news/_/name/nyr", desc:"The Blueshirts face key free agent decisions this summer.", pub:new Date(Date.now()-172800000).toISOString() },
    { title:"Rangers' Igor Shesterkin remains the backbone of New York's Cup hopes", team:"Rangers", source:"ESPN · NHL", link:"https://www.espn.com/nhl/team/news/_/name/nyr", desc:"The elite goaltender keeps New York competitive year after year.", pub:new Date(Date.now()-432000000).toISOString() },
    { title:"NY Islanders 2026 offseason: what comes next for Long Island hockey", team:"Islanders", source:"ESPN · Islanders", link:"https://www.espn.com/nhl/team/news/_/name/nyi", desc:"Key decisions this summer will shape the Islanders' competitive window.", pub:new Date(Date.now()-259200000).toISOString() },
    { title:"NJ Devils 2026: Jack and Luke Hughes give New Jersey its brightest future in years", team:"Devils", source:"ESPN · Devils", link:"https://www.espn.com/nhl/team/news/_/name/njd", desc:"The Hughes brothers are the foundation of a Devils rebuild.", pub:new Date(Date.now()-172800000).toISOString() },
    { title:"NY Liberty chase third straight WNBA title behind Stewart and Ionescu", team:"Liberty", source:"ESPN · Liberty", link:"https://www.espn.com/wnba/team/news/_/name/ny", desc:"Breanna Stewart and Sabrina Ionescu lead the defending champions.", pub:new Date(Date.now()-86400000).toISOString() },
    { title:"NYCFC 2026 season: can they challenge for the MLS Cup?", team:"NYCFC", source:"ESPN · MLS", link:"https://www.espn.com/soccer/club/new-york-city-fc/18479/news", desc:"NYCFC looks to build on a strong 2025 campaign.", pub:new Date(Date.now()-259200000).toISOString() },
    { title:"NY Red Bulls 2026: young talent pushing for playoff contention", team:"Red Bulls", source:"ESPN · MLS", link:"https://www.espn.com/soccer/team/_/id/16335", desc:"The Red Bulls' academy pipeline continues to deliver results.", pub:new Date(Date.now()-345600000).toISOString() },
    { title:"Gotham FC 2026: NWSL's New Jersey franchise building for glory", team:"Gotham FC", source:"ESPN · NWSL", link:"https://www.espn.com/soccer/club/gotham-fc/1163/news", desc:"Gotham FC pushes for another deep NWSL playoff run.", pub:new Date(Date.now()-345600000).toISOString() },
  ];
  STATIC_STORIES.forEach(s => {
    if (seen.has(s.title)) return;
    seen.add(s.title);
    results.push({ ...s, sport:"NEWS", isNY:true });
  });

  // ── 1. TEAM-SPECIFIC ESPN NEWS (dual endpoint, always NY-tagged) ─────────
  await Promise.all(NY_TEAM_NEWS.map(async ({ sport, league, id, name }) => {
    const [j1, j2] = await Promise.all([
      safeFetch(`https://site.api.espn.com/apis/site/v2/sports/${sport}/${league}/news?team=${id}&limit=50`),
      safeFetch(`https://site.api.espn.com/apis/site/v2/sports/${sport}/${league}/teams/${id}/news?limit=50`),
    ]);
    [...(j1?.articles||[]), ...(j2?.articles||[])].forEach(a =>
      addArticle(a, `ESPN · ${name}`, name, true, league.toUpperCase())
    );
  }));

  // ── 2. ESPN NOW sport feeds — high volume, detect NY team from text ───────
  await Promise.all([
    { url:"https://now.core.api.espn.com/v1/sports/news?limit=500&sport=football",   sp:"NFL" },
    { url:"https://now.core.api.espn.com/v1/sports/news?limit=500&sport=baseball",   sp:"MLB" },
    { url:"https://now.core.api.espn.com/v1/sports/news?limit=500&sport=basketball", sp:"NBA" },
    { url:"https://now.core.api.espn.com/v1/sports/news?limit=500&sport=hockey",     sp:"NHL" },
  ].map(async ({ url, sp }) => {
    const json = await safeFetch(url);
    (json?.feed||json?.results||json?.articles||[]).forEach(a => {
      const t = detectTeam(a.headline||a.title||"", a.description||"");
      if (!t) return;
      addArticle(
        { ...a, headline:a.headline||a.title,
          links:{ web:{ href:a.links?.web?.href||(a.nowId?`https://www.espn.com/story/_/id/${a.nowId}`:"#")}}},
        "ESPN Now", t, true, sp
      );
    });
  }));

  // ── 3. LEAGUE-WIDE — filter to NY teams by text (NO soccer — too many foreign stories) ──
  await Promise.all([
    { sport:"football",   league:"nfl",  name:"NFL"  },
    { sport:"baseball",   league:"mlb",  name:"MLB"  },
    { sport:"basketball", league:"nba",  name:"NBA"  },
    { sport:"hockey",     league:"nhl",  name:"NHL"  },
    { sport:"basketball", league:"wnba", name:"WNBA" },
  ].map(async ({ sport, league, name }) => {
    const json = await safeFetch(`https://site.api.espn.com/apis/site/v2/sports/${sport}/${league}/news?limit=100`);
    (json?.articles||[]).forEach(a => {
      const t = detectTeam(a.headline||"", a.description||"");
      if (t) addArticle(a, `ESPN · ${name}`, t, true, name);
    });
  }));


  // ── 4. OUR OWN API ROUTE — NY Post, Google News, SB Nation ────────────────
  try {
    const apiJson = await safeFetch("/api/news");
    if (apiJson?.articles) {
      apiJson.articles.forEach(a => {
        if (!a.title || seen.has(a.title)) return;
        seen.add(a.title);
        results.push({ ...a, isNY: true });
      });
    }
  } catch(e) {}

  // ── 5. Reddit ──────────────────────────────────────────────────────────────
  const REDDIT_SUBS = [
    { sub:"NYYankees",       team:"Yankees"  },
    { sub:"NewYorkMets",     team:"Mets"     },
    { sub:"nyjets",          team:"Jets"     },
    { sub:"NYGiants",        team:"Giants"   },
    { sub:"NYKnicks",        team:"Knicks"   },
    { sub:"GoNets",          team:"Nets"     },
    { sub:"rangers",         team:"Rangers"  },
    { sub:"NewYorkIslanders",team:"Islanders"},
    { sub:"devils",          team:"Devils"   },
    { sub:"nyliberty",       team:"Liberty"  },
    { sub:"NYCFC",           team:"NYCFC"    },
  ];
  await Promise.all(REDDIT_SUBS.map(async ({ sub, team }) => {
    const ctrl = new AbortController();
    const tid  = setTimeout(() => ctrl.abort(), 8000);
    try {
      const res = await fetch(
        `https://www.reddit.com/r/${sub}/hot.json?limit=10&raw_json=1`,
        { signal: ctrl.signal, headers:{ "User-Agent":"NYSportsDaily/1.0" }}
      );
      clearTimeout(tid);
      if (!res.ok) return;
      const json = await res.json();
      (json?.data?.children || []).forEach(({ data:p }) => {
        if (!p || p.stickied || p.over_18 || p.score < 10) return;
        const title = p.title;
        if (!title || seen.has(title)) return;
        const lc = title.toLowerCase();
        if (["game thread","post-game","daily discussion","lineup","pre-game","weekly"].some(s=>lc.includes(s))) return;
        seen.add(title);
        results.push({
          title, isNY:true, source:`Reddit · r/${sub}`, team, sport:team,
          link:  `https://reddit.com${p.permalink}`,
          desc:  `${p.ups} upvotes`,
          pub:   new Date(p.created_utc*1000).toISOString(),
        });
      });
    } catch(e){ clearTimeout(tid); }
  }));

  return results.sort((a,b) => new Date(b.pub)-new Date(a.pub));
}

// ─── MAIN COMPONENT ────────────────────────────────────────────────────────
export default function NYSportsDaily() {
  const [selectedDate, setSelectedDate]   = useState(new Date());
  const [scores, setScores]               = useState([]);
  const [news, setNews]                   = useState([]);
  const [standings, setStandings]         = useState([]);
  const [schedule, setSchedule]           = useState([]);
  const [loadingScores, setLoadingScores] = useState(true);
  const [loadingNews, setLoadingNews]     = useState(true);
  const [loadingStandings, setLoadingStandings] = useState(false);
  const [loadingSchedule, setLoadingSchedule]   = useState(false);
  const [activeLeague, setActiveLeague]   = useState("ALL");
  const [scoresCollapsed, setScoresCollapsed] = useState(false);
  const [nyOnly, setNyOnly]               = useState(true); // Default: NY teams only
  const [myTeams, setMyTeams]             = useState(() => {
    try { return new Set(JSON.parse(localStorage.getItem("nysportsdaily_myteams") || "[]")); }
    catch(e) { return new Set(); }
  });
  const [myTeamsModal, setMyTeamsModal]   = useState(false);
  const [myTeamsPending, setMyTeamsPending] = useState(new Set());
  const [activeTab, setActiveTab]         = useState("SCORES");
  const [darkMode, setDarkMode]           = useState(true);

  const [isMobile, setIsMobile]           = useState(() => typeof window !== "undefined" && window.innerWidth < 680);
  const [drawerOpen, setDrawerOpen]       = useState(false);
  const [searchOpen, setSearchOpen]       = useState(false);
  const [searchQuery, setSearchQuery]     = useState("");
  const days = getLast7Days();

  useEffect(() => {
    function onResize() { setIsMobile(window.innerWidth < 680); }
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const loadScores = useCallback(async (date) => {
    setLoadingScores(true);
    const data = await fetchESPNScores(date);
    setScores(data);
    setLoadingScores(false);
  }, []);

  const loadNews = useCallback(async () => {
    setLoadingNews(true);
    const data = await fetchNYNews();
    setNews(data);
    setLoadingNews(false);
  }, []);

  useEffect(() => { loadScores(selectedDate); }, [selectedDate, loadScores]);
  useEffect(() => { loadNews(); }, [loadNews]);
  useEffect(() => {
    async function load() {
      setLoadingStandings(true);
      const data = await fetchStandings();
      setStandings(data);
      setLoadingStandings(false);
    }
    load();
  }, []);
  useEffect(() => {
    async function load() {
      setLoadingSchedule(true);
      const data = await fetchNYSchedule();
      setSchedule(data);
      setLoadingSchedule(false);
    }
    load();
  }, []);

  const NY_TEAM_FILTER = [
    "new york yankees", "new york mets", "new york jets", "new york giants",
    "new york knicks", "brooklyn nets", "new york rangers", "new york islanders",
    "new jersey devils", "new york liberty", "nycfc", "new york red bulls",
    "nj/ny gotham", "gotham fc"
  ];

  function gameIsNY(game) {
    const home = (game.homeTeam || "").toLowerCase();
    const away = (game.awayTeam || "").toLowerCase();
    return NY_TEAM_FILTER.some(ny => home === ny || away === ny ||
      home.includes(ny) || away.includes(ny));
  }

  const filteredScores = scores.filter(s => {
    if (nyOnly && !gameIsNY(s)) return false;
    if (activeLeague !== "ALL" && s.sport !== activeLeague) return false;
    return true;
  });

  const nyScores  = scores.filter(s => gameIsNY(s));
  const allLeagues = ["ALL", ...SPORT_ENDPOINTS.map(e => e.label)];

  return (
    <MyTeamsCtx.Provider value={myTeams}>
    <DarkModeCtx.Provider value={darkMode}>
    <div style={{
      ...styles.root,
      ...(darkMode ? {
        background: "#0a0a0a",
        color: "#f0ece4",
      } : {
        background: "#f8f6f1",
        color: "#111111",
      })
    }}>
      {/* NOISE TEXTURE OVERLAY */}
      <div style={styles.noise} />

      {/* ── MASTHEAD ── */}
      <header style={styles.masthead}>
        <div style={styles.mastheadTop}>
          <span style={styles.mastheadKicker}>EST. 2026 · ALL NEW YORK · ALL THE TIME</span>
          <div style={{display:"flex", gap:12, alignItems:"center"}}>
            <a href="https://www.instagram.com/nysportsdaily_com/" target="_blank" rel="noopener noreferrer"
              style={{fontSize:9, color:"#888", textDecoration:"none", letterSpacing:"0.1em", fontWeight:700}}>
              📸 INSTAGRAM
            </a>
            <a href="https://www.amazon.com/s?k=new+york+sports&tag=nysportsdaily-20" target="_blank" rel="noopener noreferrer"
              style={{fontSize:9, color:"#888", textDecoration:"none", letterSpacing:"0.1em", fontWeight:700}}>
              🛒 AMAZON
            </a>
            <a href="https://buymeacoffee.com/mhughes65v" target="_blank" rel="noopener noreferrer"
              style={{fontSize:9, color:"#888", textDecoration:"none", letterSpacing:"0.1em", fontWeight:700}}>
              ☕ TIP JAR
            </a>
            <button onClick={() => setDarkMode(d => !d)}
              style={{fontSize:9, color:"#888", background:"none", border:"none", cursor:"pointer", letterSpacing:"0.1em", fontWeight:700, padding:0}}>
              {darkMode ? "☀ LIGHT" : "🌙 DARK"}
            </button>
            <span style={styles.mastheadKicker}>{new Date().toLocaleDateString("en-US",{weekday:"long",year:"numeric",month:"long",day:"numeric"}).toUpperCase()}</span>
          </div>
        </div>
        {/* ── Mobile compact header bar ── */}
        {isMobile && (
          <div style={{display:"flex", alignItems:"center", justifyContent:"space-between",
            padding:"6px 10px 0", gap:8}}>
            <button onClick={() => setDrawerOpen(true)}
              style={{background:"none", border:"1px solid #2a2a2a", color:"#888",
                padding:"5px 9px", cursor:"pointer", fontSize:16, lineHeight:1, flexShrink:0}}>
              ☰
            </button>
            <h1 style={{fontFamily:"'Georgia','Times New Roman',serif", fontSize:20,
              fontWeight:900, margin:0, flex:1, textAlign:"center",
              textShadow:"1px 1px 0 #c8201c", color:"#e8e0d0", letterSpacing:"-0.01em"}}>
              NY<span style={{color:"#c8201c"}}> SPORTS</span>
              <span style={{fontWeight:300, color:"#aaa"}}> DAILY</span>
            </h1>
            <div style={{display:"flex", gap:10, alignItems:"center", flexShrink:0}}>
              <a href="https://www.instagram.com/nysportsdaily_com/" target="_blank" rel="noopener noreferrer"
                style={{fontSize:16, textDecoration:"none"}}>📸</a>
              <button onClick={() => setDarkMode(d => !d)}
                style={{background:"none", border:"none", color:"#888",
                  cursor:"pointer", fontSize:14, padding:0}}>
                {darkMode ? "☀" : "🌙"}
              </button>
            </div>
          </div>
        )}
        {/* ── Desktop full masthead ── */}
        {!isMobile && <div style={styles.mastheadMain}>
          <div style={styles.mastheadLines}>
            <div style={styles.mastheadLineBar} />
            <div style={styles.mastheadLineBar} />
          </div>
          <h1 style={styles.mastheadTitle}>NEW YORK<br /><span style={styles.mastheadTitleRed}>SPORTS</span><span style={styles.mastheadTitleThin}> DAILY</span></h1>
          <div style={styles.mastheadLines}>
            <div style={styles.mastheadLineBar} />
            <div style={styles.mastheadLineBar} />
          </div>
        </div>}
        {/* Search bar + dropdown — wrapped in relative container */}
        <div style={{position:"relative", zIndex:1000}}>
          <div style={styles.searchBar}>
            <input
              type="text"
              placeholder="🔍  Search players, moments, history, teams..."
              value={searchQuery}
              onChange={e => { setSearchQuery(e.target.value); setSearchOpen(e.target.value.length > 1); }}
              onFocus={() => { if (searchQuery.length > 1) setSearchOpen(true); }}
              onBlur={() => setTimeout(() => setSearchOpen(false), 200)}
              style={styles.searchInput}
            />
            {searchQuery && (
              <button onClick={() => { setSearchQuery(""); setSearchOpen(false); }} style={styles.searchClear}>✕</button>
            )}
          </div>
          {/* Search results dropdown — absolutely positioned under the search bar */}
          {searchOpen && searchQuery.length > 1 && (
            <div style={{position:"absolute", left:16, right:16, top:"100%", zIndex:1001}}>
              <SiteSearch query={searchQuery} onSelect={(tab) => { setActiveTab(tab); setSearchQuery(""); setSearchOpen(false); }} />
            </div>
          )}
        </div>
      </header>

      {/* ── DATE STRIP ── */}
      <div style={styles.dateStrip}>
        {days.map((d,i) => {
          const sel = d.toDateString() === selectedDate.toDateString();
          return (
            <button key={i} onClick={() => setSelectedDate(d)} style={{...styles.dateBtn, ...(sel ? styles.dateBtnActive : {})}}>
              <span style={styles.dateBtnLabel}>{getDateLabel(d)}</span>
            </button>
          );
        })}
      </div>

      {/* ── NY TEAM TICKER ── */}
      {nyScores.length > 0 && (
        <div style={styles.ticker}>
          <div style={styles.tickerInner}>
            <span style={styles.tickerBug}>🗽 NY</span>
            <div style={styles.tickerScroll}>
              {[...nyScores, ...nyScores].map((s, i) => (
                <span key={i} style={styles.tickerItem}>
                  <span style={styles.tickerSport}>[{s.sport}]</span>
                  {" "}{s.awayTeam} {s.awayScore} — {s.homeTeam} {s.homeScore}
                  {s.statusDesc ? <span style={styles.tickerStatus}> · {s.statusDesc}</span> : null}
                  <span style={styles.tickerDot}>  ●  </span>
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── MAIN CONTENT ── */}
      <main style={{...styles.main, paddingBottom: isMobile ? 80 : 40}}>

        {/* TAB NAV — Primary (desktop only) */}
        {!isMobile && <div style={styles.tabNav}>
          {["SCORES","TV","STANDINGS","SCHEDULE","RECAP","NEWS","RADIO","SHOP"].map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              style={{...styles.tabBtn, ...(activeTab===tab ? styles.tabBtnActive : {}),
                ...(tab==="SHOP" ? {marginLeft:"auto", color:"#c8201c"} : {})}}>
              {tab === "SHOP" ? "🛒 SHOP" : tab}
            </button>
          ))}
        </div>}
        {/* TAB NAV — Secondary */}
        {!isMobile && <div style={{...styles.tabNav, marginTop:0, borderBottom:"2px solid #1a1a1a", marginBottom:16, background:"#0a0a0a", padding:"0 0 0 0"}}>
          {["STATS","HISTORY","THIS DATE","NY EVENTS","HOF","AWARDS","FORGOTTEN","POLLS","MISERY","GLORY","PLAYROOM"].map(tab => {
            const isPlayroom = tab === "PLAYROOM";
            const isGlory    = tab === "GLORY";
            const isActive   = activeTab === tab;
            const isSpecial  = isPlayroom || isGlory;
            return (
              <button key={tab} onClick={() => setActiveTab(tab)}
                style={{
                  ...styles.tabBtn,
                  fontSize:9, padding:"7px 10px",
                  // Active state
                  ...(isActive && !isSpecial ? styles.tabBtnActive : {}),
                  // Special pill treatment for GLORY + PLAYROOM
                  ...(isSpecial && !isActive ? {
                    color:"#f0b429", fontWeight:900,
                    borderBottom:"2px solid transparent",
                  } : {}),
                  ...(isActive && isPlayroom ? {
                    background:"#f0b429", color:"#000",
                    borderBottom:"2px solid #f0b429",
                  } : {}),
                  ...(isActive && isGlory ? {
                    background:"linear-gradient(135deg,#c8201c,#f0b429)",
                    color:"#fff", borderBottom:"2px solid #f0b429",
                  } : {}),
                }}>
                {isPlayroom ? "🎮 PLAYROOM" : isGlory ? "🏆 GLORY" : tab}
              </button>
            );
          })}
        </div>}

        {/* ──── SCORES TAB ──── */}
        {activeTab === "SCORES" && (
          <div>

            {/* ── COLLAPSIBLE WIDGET ROW ── */}
            <HomepageWidgets myTeams={myTeams} setActiveTab={setActiveTab} />
            {/* ── TOP SECTION: Featured Stories + Quote + Player Card ── */}
            <div style={{display:"flex", gap:10, marginBottom:16, alignItems:"stretch", flexWrap:"wrap"}}>

              {/* Left — Top 2 Featured News Stories */}
              <div style={{flex:"3 1 260px", display:"flex", flexDirection:"column", gap:8}}>
                {(() => {
                const nyTeams = ["Yankees","Mets","Jets","Giants","Knicks","Nets","Rangers","Islanders","Devils","Liberty","NYCFC"];
                const nyStories = news.filter(n => nyTeams.includes(n.team) && n.title);
                const withImages = nyStories.filter(n => n.image);
                const featured = withImages.length >= 2 ? withImages.slice(0,2) : nyStories.slice(0,2);
                return featured.map((story, i) => (
                  <a key={i} href={story.link} target="_blank" rel="noopener noreferrer"
                    style={{textDecoration:"none", display:"flex", gap:10,
                      padding:"10px 12px",
                      background: darkMode ? "#111" : "#fff",
                      border: darkMode ? "1px solid #1f1f1f" : "1px solid #e0e0e0",
                      borderLeft:"3px solid #c8201c",
                      flex:1, transition:"border-color 0.15s"
                    }}
                    onMouseEnter={e=>e.currentTarget.style.borderLeftColor="#f0b429"}
                    onMouseLeave={e=>e.currentTarget.style.borderLeftColor="#c8201c"}>
                    {story.image && (
                      <img src={story.image} alt=""
                        style={{width:72, height:54, objectFit:"cover", flexShrink:0}} />
                    )}
                    <div style={{flex:1, minWidth:0}}>
                      <div style={{fontSize:8, fontWeight:900, color:"#c8201c",
                        letterSpacing:"0.12em", marginBottom:3, textTransform:"uppercase"}}>
                        {story.team?.toUpperCase()} · {story.source}
                      </div>
                      <div style={{fontSize:12, fontWeight:700,
                        color: darkMode ? "#e8e0d0" : "#111",
                        lineHeight:1.35, fontFamily:"'Georgia',serif",
                        overflow:"hidden", display:"-webkit-box",
                        WebkitLineClamp:2, WebkitBoxOrient:"vertical"}}>
                        {story.title}
                      </div>
                      {story.desc && (
                        <div style={{fontSize:10, color: darkMode ? "#777" : "#666",
                          marginTop:3, lineHeight:1.4,
                          overflow:"hidden", display:"-webkit-box",
                          WebkitLineClamp:1, WebkitBoxOrient:"vertical"}}>
                          {story.desc}
                        </div>
                      )}
                    </div>
                  </a>
                ));
              })()}
              {news.filter(n => ["Yankees","Mets","Jets","Giants","Knicks","Nets","Rangers","Islanders","Devils","Liberty"].includes(n.team)).length === 0 && (
                <div style={{padding:"12px", background:"#111", border:"1px solid #1f1f1f",
                  fontSize:10, color:"#555", fontStyle:"italic"}}>
                  Loading top NY sports stories…
                </div>
              )}
              </div>

              {/* Center — Quote */}
              <div style={{flex:"2 1 180px"}}>
                <QuoteOfDay />
              </div>

              {/* Right — Player Spotlight card */}
              <div style={{flex:"0 0 180px"}}>
                <PlayerSpotlight />
              </div>
            </div>

            {/* League filter */}
            <div style={styles.filterBar}>
              <div style={styles.filterGroup}>
                {allLeagues.map(l => (
                  <button key={l} onClick={() => setActiveLeague(l)}
                    style={{...styles.filterBtn, ...(activeLeague===l ? styles.filterBtnActive : {})}}>
                    {l}
                  </button>
                ))}
              </div>
              <button type="button" onClick={() => setNyOnly(prev => !prev)}
                style={{...styles.nyToggle, ...(nyOnly ? styles.nyToggleActive : {})}}>
                {nyOnly ? "★ NY ONLY" : "☆ NY ONLY"}
              </button>
              <button type="button" onClick={() => { setMyTeamsPending(new Set(myTeams)); setMyTeamsModal(true); }}
                style={{...styles.nyToggle, ...(myTeams.size > 0 ? styles.myTeamsActive : {})}}>
                {myTeams.size > 0 ? `⭐ MY TEAMS (${myTeams.size})` : "☆ MY TEAMS"}
              </button>
            </div>

            <div style={styles.scoresNewsLayout}>
              {/* Scores column */}
              <div style={styles.scoresCol}>
                {/* Scores header with collapse toggle */}
                <div style={{display:"flex", alignItems:"center", gap:8, marginBottom:8,
                  paddingBottom:6, borderBottom:"1px solid #1a1a1a"}}>
                  <span style={{fontSize:9, fontWeight:900, color:"#c8201c",
                    letterSpacing:"0.22em", textTransform:"uppercase",
                    fontFamily:"'Georgia',serif"}}>
                    {nyOnly ? "🗽 NY SCORES" : "📅 TODAY'S SCORES"}
                  </span>
                  <button onClick={() => setScoresCollapsed(s => !s)}
                    style={{marginLeft:"auto", fontSize:9, fontWeight:700,
                      letterSpacing:"0.1em", padding:"2px 8px",
                      background:"transparent", border:"1px solid #1f1f1f",
                      color:"#555", cursor:"pointer", fontFamily:"'Georgia',serif",
                      transition:"all 0.15s"}}
                    onMouseEnter={e=>{e.currentTarget.style.color="#e8e0d0";}}
                    onMouseLeave={e=>{e.currentTarget.style.color="#555";}}>
                    {scoresCollapsed ? "▼ SHOW" : "▲ HIDE"}
                  </button>
                </div>
                {!scoresCollapsed && (
                  loadingScores ? (
                    <div style={styles.loading}>
                      <div style={styles.loadingDots}>
                        {[0,1,2].map(i => <span key={i} style={{...styles.dot, animationDelay:`${i*0.2}s`}} />)}
                      </div>
                      <p style={styles.loadingText}>PULLING SCORES...</p>
                    </div>
                  ) : filteredScores.length === 0 ? (
                    <div style={styles.empty}>
                      <span style={styles.emptyIcon}>📋</span>
                      <p style={styles.emptyText}>NO GAMES FOUND FOR THIS DATE</p>
                    </div>
                  ) : (
                    <div style={styles.scoresGrid}>
                      {filteredScores.map(game => (
                        <ScoreCard key={game.id} game={game} />
                      ))}
                    </div>
                  )
                )}
              </div>

              {/* News sidebar */}
              <div style={styles.newsSidebar}>
                <div style={styles.newsSidebarHeader}>📰 NY SPORTS HEADLINES</div>
                {loadingNews ? (
                  <p style={styles.newsSidebarLoading}>LOADING...</p>
                ) : news.filter(n => {
                    // Require a real NY team tag — skip generic soccer/MLS stories
                    const nyTeams = ["Yankees","Mets","Jets","Giants","Knicks","Nets","Rangers","Islanders","Devils","Liberty","NYCFC","Red Bulls","Gotham FC"];
                    const hasNYTeam = nyTeams.includes(n.team);
                    // For soccer teams, require the team name actually in the title
                    if (["Red Bulls","NYCFC","Gotham FC"].includes(n.team)) {
                      const titleLower = (n.title||"").toLowerCase();
                      return titleLower.includes("red bull") || titleLower.includes("nycfc") ||
                             titleLower.includes("new york city fc") || titleLower.includes("gotham");
                    }
                    return hasNYTeam;
                  }).slice(0, 10).map((item, i) => (
                  <a key={i} href={item.link} target="_blank" rel="noopener noreferrer" style={styles.newsSidebarItem}>
                    <span style={styles.newsSidebarSource}>{item.source}</span>
                    <p style={styles.newsSidebarTitle}>{item.title}</p>
                  </a>
                ))}
                <button onClick={() => setActiveTab("NEWS")} style={styles.newsSidebarMore}>
                  ALL STORIES →
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ──── NEWS TAB ──── */}
        {activeTab === "NEWS" && (
          <NewsTab news={news} loading={loadingNews} />
        )}
        {/* ──── TV TAB ──── */}
        {activeTab === "TV" && (
          <TVScheduleTab scores={scores} loading={loadingScores} />
        )}
        {/* ──── STANDINGS TAB ──── */}
        {activeTab === "STANDINGS" && (
          <StandingsTab standings={standings} loading={loadingStandings} />
        )}
        {/* ──── SCHEDULE TAB ──── */}
        {activeTab === "SCHEDULE" && (
          <ScheduleTab schedule={schedule} loading={loadingSchedule} />
        )}
        {/* ──── HISTORY TAB ──── */}
        {activeTab === "RECAP" && <RecapTab scores={scores} />}
        {activeTab === "NY EVENTS" && <IconicTab />}
        {activeTab === "THIS DATE" && <TodayTab />}
        {activeTab === "POLLS" && <PollsTab />}
        {activeTab === "AWARDS"   && <AwardsTab />}
        {activeTab === "FORGOTTEN" && <ForgottenTab />}
        {activeTab === "HOF" && <HofTab />}
        {activeTab === "MISERY" && <MiseryTab />}
        {activeTab === "HISTORY" && (
          <HistoryTab />
        )}
        {/* ──── STATS TAB ──── */}
        {activeTab === "STATS" && (
          <StatsTab />
        )}
        {/* ──── RADIO TAB (kept, accessed via search) ──── */}
        {activeTab === "RADIO" && (
          <RadioTab />
        )}
        {/* ──── GLORY DAYS TAB ──── */}
        {activeTab === "GLORY" && (
          <GloryDaysTab myTeams={myTeams} />
        )}
        {/* ──── PLAYROOM TAB ──── */}
        {activeTab === "PLAYROOM" && (
          <PlayroomTab myTeams={myTeams} />
        )}
        {/* ──── SHOP TAB ──── */}
        {activeTab === "SHOP" && (
          <ShopTab />
        )}
      </main>

      {/* ── MORNING DIGEST SIGNUP ── */}
      <DigestSignup />

      {/* ── FOOTER ── */}
      <footer style={styles.footer}>
        <div style={styles.footerRule} />
        <p style={styles.footerText}>NY SPORTS DAILY · SCORES & NEWS VIA ESPN · FREE ALWAYS</p>
        <p style={styles.footerSub}>Free. Always. Built for New York.</p>
        <a href="https://buymeacoffee.com/mhughes65v" target="_blank" rel="noopener noreferrer" style={styles.bmcBtn}>
          ☕ Buy Me a Coffee
        </a>
        <p style={styles.bmcSub}>Enjoying NY Sports Daily? A coffee keeps the lights on!</p>
      </footer>
    </div>
    </DarkModeCtx.Provider>

    {/* ── MY TEAMS MODAL ── */}
    {myTeamsModal && (
      <MyTeamsModal
        pending={myTeamsPending}
        setPending={setMyTeamsPending}
        onSave={(teams) => {
          try { localStorage.setItem("nysportsdaily_myteams", JSON.stringify([...teams])); } catch(e) {}
          setMyTeams(new Set(teams));
          setMyTeamsModal(false);
        }}
        onClose={() => setMyTeamsModal(false)}
      />
    )}
    {/* ── MOBILE BOTTOM NAV ── */}
    {isMobile && (
      <nav style={{
        position:"fixed", bottom:0, left:0, right:0, zIndex:900,
        background:"#0e0e0e", borderTop:"2px solid #1a1a1a",
        display:"flex", alignItems:"stretch",
        paddingBottom:"env(safe-area-inset-bottom, 0px)",
        boxShadow:"0 -4px 20px rgba(0,0,0,0.6)",
      }}>
        {[
          {tab:"SCORES",    icon:"📊", label:"Scores"},
          {tab:"STANDINGS", icon:"🏅", label:"Standings"},
          {tab:"GLORY",     icon:"🏆", label:"Glory"},
          {tab:"PLAYROOM",  icon:"🎮", label:"Playroom"},
          {tab:"NEWS",      icon:"📰", label:"News"},
        ].map(({tab, icon, label}) => {
          const isActive  = activeTab === tab;
          const isSpecial = tab === "GLORY" || tab === "PLAYROOM";
          return (
            <button key={tab} onClick={() => setActiveTab(tab)}
              style={{
                flex:1, display:"flex", flexDirection:"column",
                alignItems:"center", justifyContent:"center",
                padding:"8px 2px 6px", gap:2,
                background:"transparent", border:"none",
                borderTop: isActive
                  ? `2px solid ${isSpecial ? "#f0b429" : "#c8201c"}`
                  : "2px solid transparent",
                cursor:"pointer",
              }}>
              <span style={{fontSize:17, lineHeight:1}}>{icon}</span>
              <span style={{
                fontSize:8, fontWeight:900, letterSpacing:"0.06em",
                textTransform:"uppercase", fontFamily:"'Georgia',serif",
                color: isActive ? (isSpecial ? "#f0b429" : "#e8e0d0") : "#555",
              }}>{label}</span>
            </button>
          );
        })}
        <button onClick={() => setDrawerOpen(true)}
          style={{flex:1, display:"flex", flexDirection:"column",
            alignItems:"center", justifyContent:"center",
            padding:"8px 2px 6px", gap:2,
            background:"transparent", border:"none",
            borderTop:"2px solid transparent", cursor:"pointer"}}>
          <span style={{fontSize:17, lineHeight:1}}>☰</span>
          <span style={{fontSize:8, fontWeight:900, letterSpacing:"0.06em",
            textTransform:"uppercase", fontFamily:"'Georgia',serif",
            color:"#555"}}>More</span>
        </button>
      </nav>
    )}

    {/* ── MOBILE HAMBURGER DRAWER ── */}
    {isMobile && drawerOpen && (
      <div onClick={() => setDrawerOpen(false)}
        style={{position:"fixed", inset:0, background:"rgba(0,0,0,0.75)",
          zIndex:2000, display:"flex"}}>
        <div onClick={e => e.stopPropagation()}
          style={{width:260, maxWidth:"80vw", background:"#0e0e0e",
            borderRight:"2px solid #c8201c", height:"100%",
            overflowY:"auto", display:"flex", flexDirection:"column",
            WebkitOverflowScrolling:"touch"}}>

          {/* Header */}
          <div style={{display:"flex", alignItems:"center",
            justifyContent:"space-between", padding:"14px 16px",
            borderBottom:"1px solid #1a1a1a", flexShrink:0}}>
            <span style={{fontFamily:"'Georgia',serif", fontSize:14,
              fontWeight:900, color:"#e8e0d0"}}>
              NY <span style={{color:"#c8201c"}}>SPORTS</span>
              <span style={{fontWeight:300, color:"#aaa"}}> DAILY</span>
            </span>
            <button onClick={() => setDrawerOpen(false)}
              style={{background:"none", border:"none", color:"#666",
                fontSize:20, cursor:"pointer", padding:"2px 6px"}}>✕</button>
          </div>

          {/* Main nav */}
          <div style={{borderBottom:"1px solid #1a1a1a"}}>
            <div style={{padding:"8px 16px 4px", fontSize:8, fontWeight:900,
              color:"#444", letterSpacing:"0.22em"}}>MAIN</div>
            {[
              {tab:"SCORES",    icon:"📊"},
              {tab:"TV",        icon:"📺"},
              {tab:"STANDINGS", icon:"🏅"},
              {tab:"SCHEDULE",  icon:"📅"},
              {tab:"RECAP",     icon:"🎬"},
              {tab:"NEWS",      icon:"📰"},
              {tab:"RADIO",     icon:"📻"},
              {tab:"SHOP",      icon:"🛒"},
            ].map(({tab, icon}) => (
              <button key={tab}
                onClick={() => { setActiveTab(tab); setDrawerOpen(false); }}
                style={{display:"flex", alignItems:"center", gap:12, width:"100%",
                  padding:"10px 16px",
                  background: activeTab===tab ? "#1a0a0a" : "transparent",
                  border:"none",
                  borderLeft: activeTab===tab ? "3px solid #c8201c" : "3px solid transparent",
                  color: activeTab===tab ? "#e8e0d0" : "#888",
                  cursor:"pointer", fontSize:12, fontWeight:700,
                  letterSpacing:"0.05em", textAlign:"left",
                  fontFamily:"'Georgia',serif"}}>
                <span style={{fontSize:16, width:22, textAlign:"center"}}>{icon}</span>
                {tab}
              </button>
            ))}
          </div>

          {/* Explore nav */}
          <div style={{borderBottom:"1px solid #1a1a1a", flex:1}}>
            <div style={{padding:"8px 16px 4px", fontSize:8, fontWeight:900,
              color:"#444", letterSpacing:"0.22em"}}>EXPLORE</div>
            {[
              {tab:"GLORY",     icon:"🏆", gold:true},
              {tab:"PLAYROOM",  icon:"🎮", gold:true},
              {tab:"STATS",     icon:"📈"},
              {tab:"HISTORY",   icon:"📚"},
              {tab:"THIS DATE", icon:"📆"},
              {tab:"NY EVENTS", icon:"🗽"},
              {tab:"HOF",       icon:"⭐"},
              {tab:"AWARDS",    icon:"🥇"},
              {tab:"FORGOTTEN", icon:"👻"},
              {tab:"POLLS",     icon:"🗳️"},
              {tab:"MISERY",    icon:"😩"},
            ].map(({tab, icon, gold}) => (
              <button key={tab}
                onClick={() => { setActiveTab(tab); setDrawerOpen(false); }}
                style={{display:"flex", alignItems:"center", gap:12, width:"100%",
                  padding:"9px 16px",
                  background: activeTab===tab ? "#1a1600" : "transparent",
                  border:"none",
                  borderLeft: activeTab===tab
                    ? `3px solid ${gold ? "#f0b429" : "#c8201c"}`
                    : "3px solid transparent",
                  color: gold ? "#f0b429" : activeTab===tab ? "#e8e0d0" : "#777",
                  cursor:"pointer", fontSize:11, fontWeight:700,
                  letterSpacing:"0.05em", textAlign:"left",
                  fontFamily:"'Georgia',serif"}}>
                <span style={{fontSize:14, width:22, textAlign:"center"}}>{icon}</span>
                {tab}
              </button>
            ))}
          </div>

          {/* Footer */}
          <div style={{padding:"14px 16px", borderTop:"1px solid #1a1a1a", flexShrink:0}}>
            <div style={{display:"flex", gap:14, marginBottom:8, flexWrap:"wrap"}}>
              <a href="https://www.instagram.com/nysportsdaily_com/" target="_blank"
                rel="noopener noreferrer"
                style={{fontSize:10, color:"#888", textDecoration:"none",
                  fontWeight:700, letterSpacing:"0.06em"}}>📸 @nysportsdaily_com</a>
              <a href="https://buymeacoffee.com/mhughes65v" target="_blank"
                rel="noopener noreferrer"
                style={{fontSize:10, color:"#888", textDecoration:"none",
                  fontWeight:700, letterSpacing:"0.06em"}}>☕ Tip Jar</a>
            </div>
            <div style={{fontSize:8, color:"#333", letterSpacing:"0.1em"}}>
              EST. 2026 · ALL NEW YORK · ALL THE TIME
            </div>
          </div>
        </div>
      </div>
    )}

    </MyTeamsCtx.Provider>
  );
}

// ─── SCORE CARD ────────────────────────────────────────────────────────────
// ─── BOX SCORE FETCH ──────────────────────────────────────────────────────
async function fetchBoxScore(gameId, sport, league) {
  try {
    const url = `https://site.api.espn.com/apis/site/v2/sports/${sport}/${league}/summary?event=${gameId}`;
    const res  = await fetch(url);
    const json = await res.json();

    const comp      = json.header?.competitions?.[0];
    const boxscore  = json.boxscore;
    const players   = boxscore?.players || [];
    const teams     = comp?.competitors || [];
    const situation = json.situation || {};

    // Fix order: away first, home second
    const away = teams.find(t => t.homeAway === "away") || teams[1];
    const home = teams.find(t => t.homeAway === "home") || teams[0];
    const ordered = [away, home].filter(Boolean);

    const linescores = ordered.map(t => ({
      team:    t.team?.displayName,
      abbrev:  t.team?.abbreviation,
      logo:    t.team?.logo,
      homeAway: t.homeAway,
      periods: t.linescores?.map(l => l.displayValue || l.value || "0") || [],
      total:   t.score,
      record:  t.record?.[0]?.displayValue || "",
    }));

    // ── SCORING PLAYS ──────────────────────────────────────────────────
    const allPlays = json.plays || [];

    function parsePlay(play) {
      const athletes = (play.athletesInvolved || [])
        .map(a => a.displayName || a.shortName || "").filter(Boolean);
      const athleteStr = athletes.join(", ");
      const rawText = play.text || play.shortText || play.type?.text || "";
      const fullText = athleteStr && !rawText.toLowerCase().includes(athletes[0]?.split(" ").pop()?.toLowerCase() || "")
        ? `${athleteStr}: ${rawText}` : rawText;
      return {
        period:    play.period?.displayValue || (play.period?.number ? `Inn ${play.period.number}` : ""),
        clock:     play.clock?.displayValue || "",
        team:      play.team?.displayName || play.team?.abbreviation || "",
        text:      fullText || rawText,
        athletes:  athleteStr,
        awayScore: play.awayScore ?? "",
        homeScore: play.homeScore ?? "",
        type:      play.type?.text || "",
        scoringPlay: play.scoringPlay || false,
      };
    }

    // Get ALL scoring plays (ESPN's dedicated array + plays array)
    const espnScoring = (json.scoringPlays || []).map(parsePlay);
    const playsScoring = allPlays.filter(p => p.scoringPlay === true).map(parsePlay);

    // Merge and deduplicate by text
    const scoringMap = new Map();
    [...espnScoring, ...playsScoring].forEach(p => {
      const key = `${p.period}-${p.text}`;
      if (!scoringMap.has(key)) scoringMap.set(key, p);
    });
    const scoringSummary = Array.from(scoringMap.values());

    // ── SITUATION (current game state) ──────────────────────────────────
    const gameSituation = {
      balls:   situation.balls,
      strikes: situation.strikes,
      outs:    situation.outs,
      onFirst: situation.onFirst,
      onSecond:situation.onSecond,
      onThird: situation.onThird,
      pitcher: situation.pitcher?.athlete?.displayName || "",
      batter:  situation.batter?.athlete?.displayName  || "",
    };

    // ── PLAYER STATS ────────────────────────────────────────────────────
    const playerStats = players.map(teamStats => ({
      team:   teamStats.team?.displayName,
      abbrev: teamStats.team?.abbreviation,
      stats:  (teamStats.statistics || []).map(statGroup => ({
        name:    statGroup.name,
        keys:    statGroup.keys    || [],
        labels:  statGroup.labels  || [],
        athletes:(statGroup.athletes || []).map(a => ({
          name:     a.athlete?.displayName || a.athlete?.shortName || "",
          headshot: a.athlete?.headshot?.href || "",
          position: a.athlete?.position?.abbreviation || "",
          stats:    a.stats || [],
          starter:  a.starter ?? null,
          didNotPlay: a.didNotPlay || false,
          active:   a.active ?? true,
        })).filter(a => a.name && !a.didNotPlay),
      })),
    }));

    // ── GAME INFO ────────────────────────────────────────────────────────
    const gameInfo = {
      venue:    json.gameInfo?.venue?.fullName || comp?.venue?.fullName || "",
      city:     json.gameInfo?.venue?.address?.city || "",
      attendance: json.gameInfo?.attendance?.toLocaleString() || "",
      duration: json.gameInfo?.duration || "",
      weather:  json.gameInfo?.weather?.displayValue || "",
      status:   comp?.status?.type?.description || "",
      detail:   comp?.status?.type?.detail || "",
    };

    return { linescores, playerStats, scoringSummary, gameSituation, gameInfo, sport };
  } catch(e) {
    console.log("box score error", e);
    return null;
  }
}

const SPORT_LEAGUE_MAP = {
  NFL:  { sport:"football",   league:"nfl"   },
  MLB:  { sport:"baseball",   league:"mlb"   },
  NBA:  { sport:"basketball", league:"nba"   },
  NHL:  { sport:"hockey",     league:"nhl"   },
  WNBA: { sport:"basketball", league:"wnba"  },
  MLS:  { sport:"soccer",     league:"usa.1" },
  NWSL: { sport:"soccer",     league:"nwsl"  },
};

// ─── MY TEAMS MODAL ─────────────────────────────────────────────────────────
const MY_TEAMS_SPORTS = [
  { label:"⚾ Baseball · MLB",   teams:[{id:"Yankees",name:"Yankees"},{id:"Mets",name:"Mets"}] },
  { label:"🏀 Basketball · NBA", teams:[{id:"Knicks",name:"Knicks"},{id:"Nets",name:"Nets"}] },
  { label:"🏒 Hockey · NHL",     teams:[{id:"Rangers",name:"Rangers"},{id:"Islanders",name:"Islanders"},{id:"Devils",name:"Devils"}] },
  { label:"🏈 Football · NFL",   teams:[{id:"Giants",name:"Giants"},{id:"Jets",name:"Jets"}] },
  { label:"🏀 WNBA",             teams:[{id:"Liberty",name:"Liberty"}] },
  { label:"⚽ Soccer",           teams:[{id:"NYCFC",name:"NYCFC"},{id:"RedBulls",name:"Red Bulls"},{id:"Gotham",name:"Gotham FC"}] },
];

function MyTeamsModal({ pending, setPending, onSave, onClose }) {
  const toggle = (id) => {
    const next = new Set(pending);
    if (next.has(id)) next.delete(id); else next.add(id);
    setPending(next);
  };
  return (
    <div onClick={e => e.target === e.currentTarget && onClose()}
      style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.82)", zIndex:9999,
        display:"flex", alignItems:"center", justifyContent:"center", padding:20 }}>
      <div style={{ background:"#111", border:"1px solid #2a2a2a", borderTop:"3px solid #f0b429",
        borderRadius:4, width:"100%", maxWidth:500, maxHeight:"88vh", overflowY:"auto" }}>
        {/* Header */}
        <div style={{ padding:"16px 20px 12px", borderBottom:"1px solid #2a2a2a",
          display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
          <div>
            <div style={{ fontSize:13, letterSpacing:".12em", color:"#f0b429", fontWeight:700,
              fontFamily:"Georgia,serif", textTransform:"uppercase" }}>⭐ Pick Your Favorite Teams</div>
            <div style={{ fontSize:11, color:"#666", marginTop:4, lineHeight:1.4 }}>
              Your teams float to the top of scores and news. Saved to your browser.
            </div>
          </div>
          <button onClick={onClose} style={{ background:"none", border:"none", color:"#666",
            fontSize:20, cursor:"pointer", lineHeight:1, padding:0, marginTop:2 }}>✕</button>
        </div>
        {/* Body */}
        <div style={{ padding:"14px 20px" }}>
          {MY_TEAMS_SPORTS.map(sport => (
            <div key={sport.label} style={{ marginBottom:14 }}>
              <div style={{ fontSize:9, letterSpacing:".15em", color:"#c8201c", textTransform:"uppercase",
                marginBottom:8, paddingBottom:4, borderBottom:"1px solid #1a1a1a" }}>{sport.label}</div>
              <div style={{ display:"flex", flexWrap:"wrap", gap:6 }}>
                {sport.teams.map(t => {
                  const on = pending.has(t.id);
                  return (
                    <button key={t.id} onClick={() => toggle(t.id)}
                      style={{ fontFamily:"Georgia,serif", fontSize:11, padding:"6px 14px",
                        border:`1px solid ${on ? "#f0b429" : "#2a2a2a"}`,
                        background: on ? "#1a1600" : "#161616",
                        color: on ? "#f0b429" : "#888",
                        borderRadius:3, cursor:"pointer", fontWeight: on ? 700 : 400,
                        transition:"all .15s", letterSpacing:".04em" }}>
                      {on ? "✓ " : ""}{t.name}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
        {/* Footer */}
        <div style={{ padding:"12px 20px", borderTop:"1px solid #2a2a2a",
          display:"flex", justifyContent:"space-between", alignItems:"center", flexWrap:"wrap", gap:8 }}>
          <span style={{ fontSize:10, color:"#555" }}>
            <span style={{ color:"#f0b429", fontWeight:700 }}>{pending.size}</span> team{pending.size !== 1 ? "s" : ""} selected
          </span>
          <div style={{ display:"flex", gap:8 }}>
            <button onClick={() => setPending(new Set())}
              style={{ fontFamily:"Georgia,serif", fontSize:10, letterSpacing:".1em", textTransform:"uppercase",
                padding:"7px 14px", border:"1px solid #333", background:"transparent",
                color:"#666", cursor:"pointer", borderRadius:2 }}>Clear All</button>
            <button onClick={() => onSave(pending)}
              style={{ fontFamily:"Georgia,serif", fontSize:10, letterSpacing:".1em", textTransform:"uppercase",
                padding:"7px 20px", border:"1px solid #f0b429", background:"#f0b429",
                color:"#000", cursor:"pointer", fontWeight:700, borderRadius:2 }}>Save My Teams</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ScoreCard({ game }) {
  const myTeams = useContext(MyTeamsCtx);
  const isFav = teamInMyTeams(myTeams, game.homeTeam, game.awayTeam);
  const NY_CHECK = [
    "new york yankees","new york mets","new york jets","new york giants",
    "new york knicks","brooklyn nets","new york rangers","new york islanders",
    "new jersey devils","new york liberty","nycfc","new york red bulls","gotham fc"
  ];
  const isNY = [game.homeTeam, game.awayTeam].some(n =>
    NY_CHECK.some(ny => n.toLowerCase() === ny)
  );
  const [expanded, setExpanded]   = useState(false);
  const [boxScore, setBoxScore]   = useState(null);
  const [loadingBS, setLoadingBS] = useState(false);
  const [sortCol, setSortCol]     = useState(null);
  const [sortDir, setSortDir]     = useState("desc");
  const isLive  = game.statusState === "in";
  const isFinal = game.statusState === "post";
  const hasBox  = isLive || isFinal;

  async function toggleBox() {
    if (expanded) { setExpanded(false); return; }
    setExpanded(true);
    if (!boxScore) {
      setLoadingBS(true);
      const sl = SPORT_LEAGUE_MAP[game.sport];
      if (sl) {
        const data = await fetchBoxScore(game.id, sl.sport, sl.league);
        setBoxScore(data);
      }
      setLoadingBS(false);
    }
  }

  function sortedAthletes(athletes, keys) {
    if (!sortCol) return athletes;
    const idx = keys.indexOf(sortCol);
    if (idx < 0) return athletes;
    return [...athletes].sort((a, b) => {
      const av = parseFloat(a.stats[idx]) || 0;
      const bv = parseFloat(b.stats[idx]) || 0;
      return sortDir === "desc" ? bv - av : av - bv;
    });
  }

  function handleSort(key) {
    if (sortCol === key) setSortDir(d => d === "desc" ? "asc" : "desc");
    else { setSortCol(key); setSortDir("desc"); }
  }

  return (
    <div style={{...styles.scoreCard, ...(isNY ? styles.scoreCardNY : {}),
      ...(isFav ? {borderColor:"#f0b429", boxShadow:"inset 3px 0 0 #f0b429, 0 0 0 1px #f0b42944", background:"#1a160033"} : {})}}>
      {isFav && <div style={{position:"absolute",top:6,right:8,fontSize:11}}>⭐</div>}
      {isNY && !isFav && <div style={styles.nyBadge}>NY</div>}
      <div style={styles.scoreCardSport}>{game.sport}</div>
      <div style={styles.scoreTeams}>
        <TeamRow logo={game.awayLogo} name={game.awayTeam} score={game.awayScore} color={game.awayColor} />
        <div style={styles.scoreAt}>@</div>
        <TeamRow logo={game.homeLogo} name={game.homeTeam} score={game.homeScore} color={game.homeColor} />
      </div>
      <div style={{...styles.scoreStatus, ...(isLive ? styles.scoreStatusLive : {})}}>
        {isLive && <span style={styles.livePulse}>●</span>}
        {game.statusDesc}
      </div>
      {game.venue && <div style={styles.scoreVenue}>{game.venue}</div>}

      {/* Box score toggle */}
      {hasBox && (
        <button onClick={toggleBox} style={styles.boxScoreBtn}>
          {expanded ? "▲ HIDE BOX SCORE" : "▼ BOX SCORE"}
        </button>
      )}

      {/* Box score panel */}
      {expanded && (
        <div style={styles.boxScorePanel}>
          {loadingBS ? (
            <div style={styles.boxScoreLoading}>
              <div style={styles.loadingDots}>{[0,1,2].map(i=><span key={i} style={{...styles.dot,animationDelay:`${i*0.2}s`}}/>)}</div>
            </div>
          ) : !boxScore ? (
            <p style={styles.boxScoreEmpty}>Box score unavailable</p>
          ) : (
            <div>

              {/* Game Info Bar */}
              {(boxScore.gameInfo?.venue || boxScore.gameInfo?.attendance) && (
                <div style={styles.gameInfoBar}>
                  {boxScore.gameInfo.venue && <span>🏟 {boxScore.gameInfo.venue}{boxScore.gameInfo.city ? `, ${boxScore.gameInfo.city}` : ""}</span>}
                  {boxScore.gameInfo.attendance && <span>👥 {boxScore.gameInfo.attendance}</span>}
                  {boxScore.gameInfo.weather && <span>🌤 {boxScore.gameInfo.weather}</span>}
                  {boxScore.gameInfo.duration && <span>⏱ {boxScore.gameInfo.duration}</span>}
                </div>
              )}

              {/* Line Score */}
              {boxScore.linescores?.length > 0 && boxScore.linescores[0].periods?.length > 0 && (
                <div style={styles.lineScoreWrap}>
                  <table style={styles.lineScoreTable}>
                    <thead>
                      <tr>
                        <th style={styles.lsThTeam}>TEAM</th>
                        {boxScore.linescores[0].periods.map((_,i) => (
                          <th key={i} style={styles.lsTh}>
                            {boxScore.sport === "MLB" ? i+1 : i+1}
                          </th>
                        ))}
                        <th style={{...styles.lsTh, color:"#c8201c"}}>R/T</th>
                      </tr>
                    </thead>
                    <tbody>
                      {boxScore.linescores.map((ls, i) => (
                        <tr key={i} style={i%2===0?{}:{background:"#0f0f0f"}}>
                          <td style={styles.lsTdTeam}>
                            {ls.logo && <img src={ls.logo} alt="" style={{width:14,height:14,objectFit:"contain",marginRight:4,verticalAlign:"middle"}} onError={e=>e.target.style.display="none"} />}
                            <span>{ls.abbrev}</span>
                            {ls.record && <span style={{fontSize:8,color:"#555",marginLeft:4}}>({ls.record})</span>}
                          </td>
                          {ls.periods.map((p,j) => <td key={j} style={styles.lsTd}>{p}</td>)}
                          <td style={{...styles.lsTd, fontWeight:900, color:"#e8e0d0", fontSize:14}}>{ls.total}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Scoring Summary — all scoring plays */}
              {boxScore.scoringSummary?.length > 0 && (
                <div style={styles.scoringSummary}>
                  <div style={styles.scoringHeader}>
                    ⚡ SCORING SUMMARY — {boxScore.scoringSummary.length} SCORING {boxScore.scoringSummary.length === 1 ? "PLAY" : "PLAYS"}
                  </div>
                  {boxScore.scoringSummary.map((play, i) => (
                    <div key={i} style={{...styles.scoringPlay, ...(i%2===0?{}:{background:"#0f0f0f"})}}>
                      <div style={styles.scoringLeft}>
                        <span style={styles.scoringPeriod}>{play.period}</span>
                        <span style={styles.scoringTeamBadge}>{play.team?.split(" ").pop() || play.team}</span>
                      </div>
                      <div style={styles.scoringMiddle}>
                        {play.athletes && <span style={styles.scoringAthletes}>{play.athletes}</span>}
                        <span style={styles.scoringText}>{play.text}</span>
                      </div>
                      <span style={styles.scoringScore}>
                        {play.awayScore !== "" ? `${play.awayScore}-${play.homeScore}` : ""}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* Player Stats — sport-aware display */}
              {boxScore.playerStats?.map((teamData, ti) => (
                <div key={ti} style={styles.playerStatsSection}>
                  <div style={styles.playerStatsTeamHeader}>
                    {teamData.abbrev || teamData.team}
                  </div>
                  {teamData.stats?.filter(sg => sg.athletes?.length > 0).map((statGroup, gi) => (
                    <div key={gi} style={styles.statGroupWrap}>
                      <div style={styles.statGroupName}>{statGroup.name?.toUpperCase()}</div>
                      <div style={styles.statTableWrap}>
                        <table style={styles.statTable}>
                          <thead>
                            <tr>
                              <th style={styles.statThPlayer}>PLAYER</th>
                              {statGroup.labels?.map((lbl,i) => (
                                <th key={i} style={{...styles.statTh, cursor:"pointer"}}
                                  onClick={() => handleSort(statGroup.keys?.[i])}>
                                  {lbl}
                                  {sortCol === statGroup.keys?.[i] && (
                                    <span style={{marginLeft:2,color:"#c8201c"}}>{sortDir==="desc"?"▼":"▲"}</span>
                                  )}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {sortedAthletes(statGroup.athletes, statGroup.keys || []).map((a, ai) => (
                              <tr key={ai} style={ai%2===0?{}:{background:"#0f0f0f"}}>
                                <td style={styles.statTdPlayer}>
                                  {a.headshot && (
                                    <img src={a.headshot} alt="" style={{width:16,height:16,borderRadius:"50%",objectFit:"cover",marginRight:4,verticalAlign:"middle"}}
                                      onError={e=>e.target.style.display="none"} />
                                  )}
                                  <span>{a.name}</span>
                                  {a.position && <span style={{fontSize:8,color:"#555",marginLeft:3}}>{a.position}</span>}
                                </td>
                                {a.stats.map((s,si) => (
                                  <td key={si} style={{
                                    ...styles.statTd,
                                    fontWeight: s === "0" ? 400 : 600,
                                    color: s === "0" ? "#444" : "#e8e0d0",
                                  }}>{s}</td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ))}
                </div>
              ))}

              {/* No stats fallback */}
              {(!boxScore.playerStats || boxScore.playerStats.length === 0) &&
               (!boxScore.scoringSummary || boxScore.scoringSummary.length === 0) && (
                <p style={{fontSize:11, color:"#555", padding:"10px 0"}}>
                  Detailed stats available after game completes.
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function TeamRow({ logo, name, score, color }) {
  return (
    <div style={styles.teamRow}>
      {logo && <img src={logo} alt="" style={styles.teamLogo} onError={e => e.target.style.display="none"} />}
      <span style={styles.teamName}>{name}</span>
      <span style={styles.teamScore}>{score}</span>
    </div>
  );
}

// ─── NEWS CARDS ────────────────────────────────────────────────────────────
// Team color lookup for news cards
const TEAM_COLORS = {
  Yankees: "#003087", Mets: "#002D72", Jets: "#125740", Giants: "#0B2265",
  Knicks: "#006BB6", Nets: "#000000", Rangers: "#0038A8", Islanders: "#00539B",
  Devils: "#CE1126", Liberty: "#6ECEB2", NYCFC: "#6CACE4", "Red Bulls": "#ED1C2E", "Gotham FC": "#0A0A2E",
}

function timeAgo(pub) {
  if (!pub) return ""
  const diff = Date.now() - new Date(pub).getTime()
  const mins  = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days  = Math.floor(diff / 86400000)
  if (mins < 60)  return `${mins}m ago`
  if (hours < 24) return `${hours}h ago`
  return `${days}d ago`
}

function getSourceDomain(item) {
  try {
    if (item.link && item.link !== "#") {
      const url = new URL(item.link);
      return url.hostname.replace("www.","");
    }
  } catch(e) {}
  return item.source?.split("·").pop()?.trim() || "ESPN";
}

function isValidLink(link) {
  if (!link || link === "#") return false;
  try { new URL(link); return true; } catch(e) { return false; }
}

// Detect dark mode from root element — passed via context
function NewsCardFeatured({ item }) {
  const dark = useContext(DarkModeCtx);
  const myTeams = useContext(MyTeamsCtx);
  const isFav = teamInMyTeams(myTeams, item.team);
  const teamColor = isFav ? "#f0b429" : (item.team ? (TEAM_COLORS[item.team] || "#c8201c") : "#c8201c");
  const sportEmoji = { MLB:"⚾", NFL:"🏈", NBA:"🏀", NHL:"🏒", WNBA:"🏀", MLS:"⚽", NWSL:"⚽" }[item.sport] || "📰";
  const domain = getSourceDomain(item);
  const hasLink = isValidLink(item.link);
  const cardBg   = dark ? "#141414" : "#ffffff";
  const titleClr = dark ? "#ffffff"  : "#111111";
  const descClr  = dark ? "#aaaaaa"  : "#555555";
  const borderClr= dark ? "#2e2e2e"  : "#e0e0e0";
  return (
    <a href={hasLink ? item.link : "#"} target={hasLink ? "_blank" : "_self"} rel="noopener noreferrer"
      style={{...styles.newsFeatured, background: isFav ? (dark?"#1a1600":"#fffbef") : cardBg,
        border:`1px solid ${isFav ? "#f0b429" : borderClr}`,
        boxShadow: isFav ? "inset 3px 0 0 #f0b429" : (dark ? "0 2px 8px rgba(0,0,0,0.6)" : "0 1px 4px rgba(0,0,0,0.1)"),
        cursor: hasLink ? "pointer" : "default"}}>
      {item.image && (
        <div style={{ margin:"-20px -20px 0", height:180, overflow:"hidden", borderRadius:"3px 3px 0 0" }}>
          <img src={item.image} alt="" style={{ width:"100%", height:"100%", objectFit:"cover", display:"block" }} loading="lazy"
            onError={e => e.target.parentNode.style.display="none"} />
        </div>
      )}
      <div style={{ height:3, background:teamColor, margin: item.image ? "0 -20px 16px" : "-20px -20px 16px" }} />
      <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:10, flexWrap:"wrap" }}>
        <span style={{ fontSize:16 }}>{sportEmoji}</span>
        {item.team && (
          <span style={{ fontSize:10, letterSpacing:"0.15em", color:teamColor, fontWeight:900, textTransform:"uppercase",
            background:`${teamColor}22`, padding:"2px 7px", borderRadius:2 }}>
            {item.team}
          </span>
        )}
        <span style={{ fontSize:10, letterSpacing:"0.1em", color: dark ? "#666" : "#888", fontWeight:700, textTransform:"uppercase" }}>
          {item.source?.replace(/ESPN · /,"")}
        </span>
        <span style={{ fontSize:9, color: dark ? "#444" : "#bbb", padding:"1px 5px",
          background: dark ? "#1a1a1a" : "#f0f0f0", borderRadius:2, marginLeft:2 }}>
          {domain}
        </span>
        <span style={{ fontSize:10, color: dark ? "#555" : "#999", marginLeft:"auto" }}>{timeAgo(item.pub)}</span>
      </div>
      <h2 style={{...styles.newsFeaturedTitle, color:titleClr}}>{item.title}</h2>
      {item.desc && <p style={{...styles.newsFeaturedDesc, color:descClr}}>{item.desc.slice(0,160)}{item.desc.length > 160 ? "…" : ""}</p>}
      {hasLink && <span style={styles.newsReadMore}>READ FULL STORY → {domain}</span>}
    </a>
  );
}

function NewsCardSmall({ item, index }) {
  const dark = useContext(DarkModeCtx);
  const teamColor = item.team ? (TEAM_COLORS[item.team] || "#c8201c") : "#c8201c";
  const domain = getSourceDomain(item);
  const hasLink = isValidLink(item.link);
  const bg     = dark ? (index%2===0 ? "#0e0e0e" : "#111") : (index%2===0 ? "#fff" : "#f8f6f1");
  const titleC = dark ? "#e8e8e8" : "#111";
  const srcC   = dark ? "#666"    : "#888";
  const dateC  = dark ? "#555"    : "#999";
  const domBg  = dark ? "#151515" : "#eeeeee";
  return (
    <a href={hasLink ? item.link : "#"} target={hasLink ? "_blank" : "_self"} rel="noopener noreferrer"
      style={{...styles.newsSmall, background:bg, cursor: hasLink ? "pointer" : "default",
        opacity: hasLink ? 1 : 0.7, borderBottom: `1px solid ${dark ? "#222" : "#e8e8e8"}`}}>
      <div style={{display:"flex", gap:10, alignItems:"flex-start"}}>
        {item.image ? (
          <div style={{ width:72, height:54, flexShrink:0, overflow:"hidden", borderRadius:2 }}>
            <img src={item.image} alt="" style={{ width:"100%", height:"100%", objectFit:"cover" }} loading="lazy"
              onError={e => e.target.parentNode.innerHTML = `<div style="width:72px;height:54px;background:${teamColor}22;display:flex;align-items:center;justify-content:center;font-size:22px">📰</div>`} />
          </div>
        ) : (
          <div style={{ width:72, height:54, flexShrink:0, background:`${teamColor}18`, borderRadius:2,
            display:"flex", alignItems:"center", justifyContent:"center", fontSize:22 }}>
            {{ MLB:"⚾", NFL:"🏈", NBA:"🏀", NHL:"🏒", WNBA:"🏀", MLS:"⚽", NWSL:"⚽" }[item.sport] || "📰"}
          </div>
        )}
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{...styles.newsSmallMeta}}>
            {item.team && (
              <span style={{ fontSize:9, letterSpacing:"0.12em", color:teamColor, fontWeight:900,
                textTransform:"uppercase", background:`${teamColor}22`, padding:"1px 5px", borderRadius:2, flexShrink:0 }}>
                {item.team}
              </span>
            )}
            <span style={{...styles.newsSmallSource, color:srcC}}>{item.source?.replace(/ESPN · /,"")}</span>
            <span style={{ fontSize:9, color:dateC, padding:"1px 4px", background:domBg, borderRadius:2 }}>
              {domain}
            </span>
            {item.pub && <span style={{...styles.newsSmallDate, color:dateC}}>{timeAgo(item.pub)}</span>}
          </div>
          <p style={{...styles.newsSmallTitle, color:titleC}}>{item.title}</p>
        </div>
      </div>
    </a>
  );
}


function GoogleNewsSection({ team }) {
  const [items, setItems]       = useState([]);
  const [loading, setLoading]   = useState(true);

  const TEAM_QUERIES = {
    ALL:        "new york sports",
    Yankees:    '"new york yankees"',
    Mets:       '"new york mets"',
    Jets:       '"new york jets" nfl',
    Giants:     '"new york giants" nfl',
    Knicks:     '"new york knicks"',
    Nets:       '"brooklyn nets" nba',
    Rangers:    '"new york rangers" nhl',
    Islanders:  '"new york islanders"',
    Devils:     '"new jersey devils" nhl',
    Liberty:    '"new york liberty" wnba',
    NYCFC:      '"nycfc" soccer',
    "Red Bulls":'"new york red bulls"',
    "Gotham FC":'"gotham fc" nwsl',
  };

  useEffect(() => {
    setLoading(true);
    setItems([]);
    const q = TEAM_QUERIES[team] || TEAM_QUERIES.ALL;
    const rssUrl = `https://news.google.com/rss/search?q=${encodeURIComponent(q)}&hl=en-US&gl=US&ceid=US:en`;
    // Use rss2json to parse Google News RSS from browser (works client-side)
    fetch(`https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(rssUrl)}&count=15`)
      .then(r => r.json())
      .then(data => {
        if (data.status === "ok" && data.items?.length) {
          setItems(data.items.map(item => ({
            title: item.title?.replace(/\s*-\s*[^-]+$/, "").trim(),
            source: item.author || item.title?.match(/\s*-\s*([^-]+)$/)?.[1]?.trim() || "Google News",
            pub: item.pubDate,
            // Link to Google News search for this headline — user clicks through to article
            link: `https://news.google.com/search?q=${encodeURIComponent(item.title?.replace(/\s*-\s*[^-]+$/,"").trim()||"")}&hl=en-US`,
          })));
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [team]);

  if (loading) return null;
  if (!items.length) return null;

  return (
    <div style={{marginTop:24}}>
      <div style={styles.newsDivider}>
        <span style={styles.newsDividerText}>📰 MORE HEADLINES VIA GOOGLE NEWS</span>
      </div>
      <div style={{padding:"8px 0", marginBottom:8, fontSize:9, color:"#555"}}>
        Headlines from across the web · Click any story to search Google News for the full article
      </div>
      <div style={{display:"flex", flexDirection:"column", gap:0}}>
        {items.map((item, i) => (
          <a key={i} href={item.link} target="_blank" rel="noopener noreferrer"
            style={{display:"flex", justifyContent:"space-between", alignItems:"center",
              padding:"8px 10px", borderBottom:"1px solid #1a1a1a", textDecoration:"none",
              background: i%2===0 ? "#0e0e0e" : "#111",
              gap:10}}>
            <span style={{fontSize:12, color:"#e8e0d0", fontFamily:"'Georgia',serif", lineHeight:1.3, flex:1}}>
              {item.title}
            </span>
            <span style={{fontSize:9, color:"#555", flexShrink:0, whiteSpace:"nowrap"}}>
              {item.source} · Google News →
            </span>
          </a>
        ))}
      </div>
    </div>
  );
}

function NewsTab({ news, loading }) {
  const [section, setSection]       = useState("HEADLINES");
  const [sourceFilter, setSourceFilter] = useState("ALL"); // ALL | ESPN | NY POST | GOOGLE
  const [filter, setFilter] = useState("NY");
  const [sport,  setSport]  = useState("ALL");
  const [teamFilter, setTeamFilter] = useState("ALL");

  const NY_KEYWORDS_CHECK = [
    // Full team names only — safe from ambiguity
    "new york yankees","new york mets","new york jets","new york giants",
    "new york knicks","brooklyn nets","new york rangers","new york islanders",
    "new jersey devils","new york liberty","nycfc","red bulls","gotham fc",
    // Short names only where no other major team shares them
    "yankees","mets","knicks","nets","islanders","liberty","devils",
    // Location markers — articles with these are almost always NY sports
    "new york","brooklyn","bronx","flushing","citi field",
    "yankee stadium","madison square garden","barclays center","ubs arena","prudential center",
    // NOT included: "rangers" (TX Rangers), "giants" (SF Giants), "jets" (aviation)
  ];
  const SPORTS = ["ALL","MLB","NFL","NBA","NHL","WNBA","MLS"];
  const TEAMS  = ["ALL","Yankees","Mets","Jets","Giants","Knicks","Nets","Rangers","Islanders","Devils","Liberty","NYCFC","Gotham FC"];

  const SPORT_KEYWORDS = {
    MLB:  ["mlb","baseball","yankees","mets","cubs","dodgers","red sox"],
    NFL:  ["nfl","football","jets","giants","touchdown","quarterback"],
    NBA:  ["nba","basketball","knicks","nets","lakers","celtics"],
    NHL:  ["nhl","hockey","rangers","islanders","devils","stanley"],
    WNBA: ["wnba","liberty","women's basketball"],
    MLS:  ["mls","soccer","nycfc","red bulls","gotham"],
  };

  const filtered = news.filter(item => {
    const combined = (item.title + " " + (item.desc||"") + " " + (item.source||"")).toLowerCase();
    const isNY = item.isNY || NY_KEYWORDS_CHECK.some(kw => combined.includes(kw));

    // NY only filter
    if (filter === "NY" && !isNY) return false;

    // Soccer team exact title match
    if (["Red Bulls","NYCFC","Gotham FC"].includes(item.team) && filter === "NY") {
      const t = (item.title||"").toLowerCase();
      if (!t.includes("red bull") && !t.includes("nycfc") && !t.includes("new york city fc") && !t.includes("gotham")) return false;
    }

    // Sport filter
    if (sport !== "ALL") {
      const sportKws = SPORT_KEYWORDS[sport] || [];
      if (!sportKws.some(kw => combined.includes(kw))) return false;
    }

    // Team filter
    if (teamFilter !== "ALL") {
      const teamMatch = item.team === teamFilter || (item.source||"").includes(teamFilter);
      if (!teamMatch) return false;
    }

    // Source filter — stacks with team filter
    if (sourceFilter !== "ALL") {
      const src = (item.source||"").toLowerCase();
      if (sourceFilter === "ESPN" && !src.includes("espn")) return false;
      if (sourceFilter === "NY POST" && !src.includes("ny post")) return false;
      if (sourceFilter === "GOOGLE NEWS" && !src.includes("google news")) return false;
    }

    return true;
  });

  // Group news by source type for the dashboard view
  const espnNews = filtered.filter(n => n.source?.startsWith("ESPN"));
  const redditNews = filtered.filter(n => n.source?.startsWith("Reddit"));

  return (
    <div>
      {/* Section toggle */}
      <div style={{display:"flex", gap:6, flexWrap:"wrap", marginBottom:16, borderBottom:"1px solid #2a2a2a", paddingBottom:12}}>
        {["HEADLINES","BEAT WRITERS","FAN COMMUNITIES","NY SPORTS SITES"].map(s => (
          <button key={s} onClick={() => setSection(s)}
            style={{...styles.filterBtn, ...(section===s ? styles.filterBtnActive : {})}}>
            {s}
          </button>
        ))}
      </div>

      {/* HEADLINES SECTION */}
      {section === "HEADLINES" && (
        <>
          {/* Source filter */}
          <div style={{display:"flex", gap:6, flexWrap:"wrap", padding:"10px 0 14px", borderBottom:"1px solid #222", marginBottom:14}}>
            <span style={{fontSize:10, color:"#666", alignSelf:"center", letterSpacing:"0.1em", marginRight:4, fontWeight:700}}>SOURCE:</span>
            {["ALL","ESPN","NY POST","GOOGLE NEWS"].map(s => (
              <button key={s} onClick={() => setSourceFilter(s)}
                style={{fontSize:10, padding:"4px 12px", letterSpacing:"0.08em", fontWeight:700,
                  background: sourceFilter===s ? "#c8201c" : "transparent",
                  color: sourceFilter===s ? "#fff" : "#777",
                  border: sourceFilter===s ? "1px solid #c8201c" : "1px solid #444",
                  cursor:"pointer", fontFamily:"'Georgia',serif", borderRadius:2}}>
                {s}
              </button>
            ))}
          </div>
          <div style={{display:"flex", gap:8, flexWrap:"wrap", marginBottom:12, alignItems:"center"}}>
            <div style={{display:"flex", gap:4, marginRight:8}}>
              {["NY","ALL"].map(f => (
                <button key={f} onClick={() => setFilter(f)}
                  style={{...styles.filterBtn, ...(filter===f ? styles.filterBtnActive : {})}}>
                  {f === "NY" ? "🗽 NY ONLY" : "🌐 ALL SPORTS"}
                </button>
              ))}
            </div>
            {SPORTS.map(s => (
              <button key={s} onClick={() => setSport(s)}
                style={{...styles.filterBtn, ...(sport===s ? styles.filterBtnActive : {}), fontSize:9}}>
                {s}
              </button>
            ))}
            <span style={{fontSize:9, color:"#555", marginLeft:"auto"}}>{filtered.length} STORIES</span>
          </div>

          {/* Team filter */}
          <div style={{display:"flex", gap:4, flexWrap:"wrap", marginBottom:16, paddingBottom:8, borderBottom:"1px solid #1a1a1a"}}>
            <span style={{fontSize:9, color:"#555", letterSpacing:"0.1em", alignSelf:"center", flexShrink:0, marginRight:4}}>TEAM:</span>
            {TEAMS.map(t => (
              <button key={t} onClick={() => setTeamFilter(t)}
                style={{...styles.filterBtn, ...(teamFilter===t ? styles.filterBtnActive : {}), fontSize:9}}>
                {t}
              </button>
            ))}
          </div>

          {loading ? (
            <div style={styles.loading}>
              <div style={styles.loadingDots}>{[0,1,2].map(i=><span key={i} style={{...styles.dot,animationDelay:`${i*0.2}s`}}/>)}</div>
              <p style={styles.loadingText}>LOADING HEADLINES...</p>
            </div>
          ) : filtered.length === 0 ? (
            <div style={styles.empty}>
              <span style={styles.emptyIcon}>📰</span>
              <p style={styles.emptyText}>NO STORIES — TRY DIFFERENT FILTERS</p>
            </div>
          ) : (
            <>
              {/* Featured stories — top 4 in a 2-col grid */}
              <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(300px,1fr))", gap:12, marginBottom:16 }}>
                {filtered.slice(0,4).map((item,i) => <NewsCardFeatured key={i} item={item} />)}
              </div>
              <div style={styles.newsDivider}><span style={styles.newsDividerText}>MORE STORIES</span></div>
              {/* Remaining stories in compact list */}
              <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))", gap:0 }}>
                {filtered.slice(4,80).map((item,i) => <NewsCardSmall key={i} item={item} index={i} />)}
              </div>
              {/* Google News Headlines — titles from Google News, link to search */}
              <GoogleNewsSection team={teamFilter} />
            </>
          )}
        </>
      )}

      {/* BEAT WRITERS SECTION */}
      {section === "BEAT WRITERS" && (
        <div>
          <div style={{marginBottom:16, padding:"10px 14px", background:"#161616", borderLeft:"3px solid #c8201c"}}>
            <p style={{margin:0, fontSize:12, color:"#aaa"}}>The reporters who break news on NY teams. Follow them for breaking stories, lineups, and inside scoops.</p>
          </div>
          {[
            { name:"Joel Sherman",    outlet:"NY Post",      teams:"Yankees · MLB",     handle:"@Joelsherman1",     url:"https://twitter.com/Joelsherman1",     desc:"Yankees insider. Breaks the biggest baseball deals." },
            { name:"Jon Heyman",      outlet:"NY Post",      teams:"MLB · Yankees",     handle:"@JonHeyman",        url:"https://twitter.com/JonHeyman",        desc:"Hall of Fame MLB reporter — broke Aaron Judge contract" },
            { name:"Bob Klapisch",    outlet:"NJ Advance",   teams:"Yankees · Mets",    handle:"@BobKlap",          url:"https://twitter.com/BobKlap",          desc:"Veteran NY baseball columnist" },
            { name:"Andy Martino",    outlet:"SNY",          teams:"Mets · Yankees",    handle:"@martinonyc",       url:"https://twitter.com/martinonyc",       desc:"SNY Mets insider — breaks Steve Cohen moves" },
            { name:"Anthony DiComo",  outlet:"MLB.com",      teams:"Mets",              handle:"@AnthonyDiComo",    url:"https://twitter.com/AnthonyDiComo",    desc:"Official Mets beat reporter" },
            { name:"Bryan Hoch",      outlet:"MLB.com",      teams:"Yankees",           handle:"@BryanHoch",        url:"https://twitter.com/BryanHoch",        desc:"Official Yankees beat reporter" },
            { name:"Zack Rosenblatt",  outlet:"The Athletic",  teams:"Jets",              handle:"@ZackBlatt",        url:"https://twitter.com/ZackBlatt",        desc:"The Athletic Jets reporter — thorough, credible coverage" },
            { name:"Brian Costello",   outlet:"NY Post",      teams:"Jets",              handle:"@BrianCoz",         url:"https://twitter.com/BrianCoz",         desc:"NY Post Jets beat — strong insider access" },
            { name:"Rich Cimini",      outlet:"ESPN",         teams:"Jets",              handle:"@RichCimini",       url:"https://twitter.com/RichCimini",       desc:"ESPN's veteran Jets reporter — decades of coverage" },
            { name:"Joe Caporoso",     outlet:"Badlands/Jets", teams:"Jets",             handle:"@JoeCaporoso",      url:"https://twitter.com/JoeCaporoso",      desc:"Voice of Jets X / Badlands — passionate fan-first coverage" },
            { name:"Connor Rogers",    outlet:"NBC Sports",   teams:"Jets · NFL Draft",  handle:"@ConnorJRogers",    url:"https://twitter.com/ConnorJRogers",    desc:"NBC draft analyst — deep Jets and draft expertise" },
            { name:"Jordan Raanan",   outlet:"ESPN",         teams:"Giants",            handle:"@JordanRaanan",     url:"https://twitter.com/JordanRaanan",     desc:"ESPN Giants insider" },
            { name:"Ralph Vacchiano", outlet:"FOX Sports",   teams:"Giants",            handle:"@RVacchianoSNY",    url:"https://twitter.com/RVacchianoSNY",    desc:"Giants beat veteran" },
            { name:"Ian Begley",      outlet:"SNY",          teams:"Knicks",            handle:"@IanBegley",        url:"https://twitter.com/IanBegley",        desc:"Top Knicks reporter — Brunson era insider" },
            { name:"Marc Berman",     outlet:"NY Post",      teams:"Knicks",            handle:"@NYPost_Berman",    url:"https://twitter.com/NYPost_Berman",    desc:"Knicks beat for the NY Post" },
            { name:"Stefan Bondy",    outlet:"NY Post",      teams:"Knicks · Nets",     handle:"@SbondyNYP",        url:"https://twitter.com/SbondyNYP",        desc:"NBA NY coverage" },
            { name:"Mollie Walker",   outlet:"NY Post",      teams:"Rangers",           handle:"@MollieeWalkerr",   url:"https://twitter.com/MollieeWalkerr",   desc:"NY Post Rangers beat reporter" },
            { name:"Vince Mercogliano",outlet:"USA Today",   teams:"Rangers",           handle:"@vzmercogliano",    url:"https://twitter.com/vzmercogliano",    desc:"Comprehensive Rangers coverage for the Journal News / USA Today" },
            { name:"Andrew Gross",    outlet:"Newsday",      teams:"Islanders",         handle:"@AGrossNewsday",    url:"https://twitter.com/AGrossNewsday",    desc:"Newsday Islanders beat" },
            { name:"Stefen Rosner",   outlet:"The Hockey News", teams:"Islanders",      handle:"@SRosner91",        url:"https://twitter.com/SRosner91",        desc:"The Hockey News Islanders writer — deep Isles coverage" },
            { name:"Amanda Stein",    outlet:"Devils",       teams:"Devils",            handle:"@AmandaCStein",     url:"https://twitter.com/AmandaCStein",     desc:"Devils studio host and reporter" },
            { name:"Howie Kussoy",    outlet:"NY Post",      teams:"All NY",            handle:"@HowieKussoy",      url:"https://twitter.com/HowieKussoy",      desc:"NY Post sports columnist" },
          ].map((w, i) => (
            <a key={i} href={w.url} target="_blank" rel="noopener noreferrer"
              style={{...styles.beatWriterRow, ...(i%2===0?{}:{background:"#0f0f0f"})}}>
              <div style={styles.beatWriterIcon}>🐦</div>
              <div style={styles.beatWriterInfo}>
                <div style={styles.beatWriterTopLine}>
                  <span style={styles.beatWriterName}>{w.name}</span>
                  <span style={styles.beatWriterHandle}>{w.handle}</span>
                </div>
                <div style={styles.beatWriterMeta}>
                  <span style={styles.beatWriterOutlet}>{w.outlet}</span>
                  <span style={styles.beatWriterTeams}>{w.teams}</span>
                </div>
                <span style={styles.beatWriterDesc}>{w.desc}</span>
              </div>
              <span style={styles.beatWriterArrow}>→</span>
            </a>
          ))}
        </div>
      )}

      {/* FAN COMMUNITIES SECTION */}
      {section === "FAN COMMUNITIES" && (
        <div>
          <div style={{marginBottom:16, padding:"10px 14px", background:"#161616", borderLeft:"3px solid #c8201c"}}>
            <p style={{margin:0, fontSize:12, color:"#aaa"}}>Reddit subreddits and fan communities where NY sports fans hang out daily. Join the conversation.</p>
          </div>
          <div style={styles.stdDivisionHeader}>🗣️ TEAM SUBREDDITS</div>
          {[
            { name:"r/NYYankees",       team:"Yankees ⚾",  members:"185K",  url:"https://reddit.com/r/NYYankees",       desc:"The biggest Yankees fan community on Reddit" },
            { name:"r/NewYorkMets",     team:"Mets ⚾",     members:"165K",  url:"https://reddit.com/r/NewYorkMets",     desc:"Mets fans — game threads, memes, and inside jokes" },
            { name:"r/nyjets",          team:"Jets 🏈",     members:"148K",  url:"https://reddit.com/r/nyjets",          desc:"Long-suffering Jets fan central" },
            { name:"r/NYGiants",        team:"Giants 🏈",   members:"160K",  url:"https://reddit.com/r/NYGiants",        desc:"Big Blue fan headquarters" },
            { name:"r/NYKnicks",        team:"Knicks 🏀",   members:"385K",  url:"https://reddit.com/r/NYKnicks",        desc:"Brunson era is in full effect" },
            { name:"r/GoNets",          team:"Nets 🏀",     members:"68K",   url:"https://reddit.com/r/GoNets",          desc:"Brooklyn Nets community" },
            { name:"r/rangers",         team:"Rangers 🏒",  members:"95K",   url:"https://reddit.com/r/rangers",         desc:"Broadway Blueshirts fans" },
            { name:"r/NewYorkIslanders",team:"Islanders 🏒",members:"42K",   url:"https://reddit.com/r/NewYorkIslanders",desc:"Isles diehards — Schaefer era begins" },
            { name:"r/devils",          team:"Devils 🏒",   members:"48K",   url:"https://reddit.com/r/devils",          desc:"NJ Devils fans — Hughes brothers era" },
            { name:"r/nyliberty",       team:"Liberty 🏀",  members:"15K",   url:"https://reddit.com/r/nyliberty",       desc:"WNBA champion NY Liberty fans" },
            { name:"r/NYCFC",           team:"NYCFC ⚽",    members:"18K",   url:"https://reddit.com/r/NYCFC",           desc:"The Pigeons community" },
            { name:"r/baseball",        team:"All MLB",     members:"3.2M",  url:"https://reddit.com/r/baseball",        desc:"All MLB news and discussion" },
            { name:"r/nfl",             team:"All NFL",     members:"8.4M",  url:"https://reddit.com/r/nfl",             desc:"Biggest NFL community on Reddit" },
            { name:"r/nba",             team:"All NBA",     members:"6.8M",  url:"https://reddit.com/r/nba",             desc:"All NBA news and game threads" },
            { name:"r/hockey",          team:"All NHL",     members:"1.4M",  url:"https://reddit.com/r/hockey",          desc:"All NHL discussion" },
          ].map((s, i) => (
            <a key={i} href={s.url} target="_blank" rel="noopener noreferrer"
              style={{...styles.beatWriterRow, ...(i%2===0?{}:{background:"#0f0f0f"})}}>
              <div style={styles.beatWriterIcon}>💬</div>
              <div style={styles.beatWriterInfo}>
                <div style={styles.beatWriterTopLine}>
                  <span style={styles.beatWriterName}>{s.name}</span>
                  <span style={styles.beatWriterHandle}>{s.members} members</span>
                </div>
                <div style={styles.beatWriterMeta}>
                  <span style={styles.beatWriterOutlet}>{s.team}</span>
                </div>
                <span style={styles.beatWriterDesc}>{s.desc}</span>
              </div>
              <span style={styles.beatWriterArrow}>→</span>
            </a>
          ))}
        </div>
      )}

      {/* NY SPORTS SITES SECTION */}
      {section === "NY SPORTS SITES" && (
        <div>
          <div style={{marginBottom:16, padding:"10px 14px", background:"#161616", borderLeft:"3px solid #c8201c"}}>
            <p style={{margin:0, fontSize:12, color:"#aaa"}}>The best independent NY sports sites — deep coverage, opinion, and analysis.</p>
          </div>
          <div style={styles.stdDivisionHeader}>📰 INDEPENDENT NY SPORTS SITES</div>
          {[
            { name:"NY Post Sports",      team:"All NY",        url:"https://nypost.com/sports/",                desc:"Tabloid coverage of every NY team — strong opinions" },
            { name:"NY Daily News Sports",team:"All NY",        url:"https://www.nydailynews.com/sports/",       desc:"NY tabloid sports — long-running NY coverage" },
            { name:"Newsday Sports",      team:"All NY · LI",   url:"https://www.newsday.com/sports",            desc:"Long Island's paper — strong Yankees, Mets, Islanders" },
            { name:"SNY",                 team:"Mets + All NY", url:"https://sny.tv/",                           desc:"Best Mets coverage anywhere, plus all NY teams" },
            { name:"YES Network",         team:"Yankees",       url:"https://www.yesnetwork.com/",               desc:"Yankees official network — videos, stats, columns" },
            { name:"MSG Networks",        team:"Knicks · Rangers",url:"https://www.msgnetworks.com/",            desc:"Knicks and Rangers home — exclusive content" },
            { name:"Pinstripe Alley",     team:"Yankees",       url:"https://www.pinstripealley.com/",           desc:"SB Nation Yankees blog — fan analysis and stats" },
            { name:"Amazin' Avenue",      team:"Mets",          url:"https://www.amazinavenue.com/",             desc:"SB Nation Mets community — fan voices" },
            { name:"Gang Green Nation",   team:"Jets",          url:"https://www.ganggreennation.com/",          desc:"SB Nation Jets — long-suffering fan deep dives" },
            { name:"Jets X-Factor (Badlands)", team:"Jets",     url:"https://jetsxfactor.com/",                  desc:"Joe Caporoso's Badlands — passionate, fan-first Jets community and podcasts" },
            { name:"Big Blue View",       team:"Giants",        url:"https://www.bigblueview.com/",              desc:"SB Nation Giants — Ed Valentine's deep analysis" },
            { name:"Posting and Toasting",team:"Knicks",        url:"https://www.postingandtoasting.com/",       desc:"SB Nation Knicks — Garden faithful" },
            { name:"Blueshirt Banter",    team:"Rangers",       url:"https://www.blueshirtbanter.com/",          desc:"SB Nation Rangers — broadway hockey analysis" },
            { name:"Lighthouse Hockey",   team:"Islanders",     url:"https://www.lighthousehockey.com/",         desc:"SB Nation Islanders fan community" },
            { name:"All About The Jersey",team:"Devils",        url:"https://www.allaboutthejersey.com/",        desc:"SB Nation Devils analysis and coverage" },
            { name:"NetsDaily",           team:"Nets",          url:"https://www.netsdaily.com/",                desc:"SB Nation Nets — Brooklyn coverage" },
            { name:"Empire of the Kniks", team:"Knicks",        url:"https://empireoftheknicks.com/",            desc:"Independent Knicks blog with stats focus" },
            { name:"NY Hockey Now",       team:"Rangers · Isles · Devils", url:"https://nyhockeynow.com/",       desc:"Cross-NY-area hockey coverage" },
            { name:"Empire Sports Media", team:"All NY",        url:"https://empiresportsmedia.com/",            desc:"All NY teams — opinion and breakdowns" },
            { name:"Jets Wire",           team:"Jets",          url:"https://jetswire.usatoday.com/",            desc:"USA Today Jets coverage" },
            { name:"Giants Wire",         team:"Giants",        url:"https://giantswire.usatoday.com/",          desc:"USA Today Giants coverage" },
          ].map((s, i) => (
            <a key={i} href={s.url} target="_blank" rel="noopener noreferrer"
              style={{...styles.beatWriterRow, ...(i%2===0?{}:{background:"#0f0f0f"})}}>
              <div style={styles.beatWriterIcon}>📰</div>
              <div style={styles.beatWriterInfo}>
                <div style={styles.beatWriterTopLine}>
                  <span style={styles.beatWriterName}>{s.name}</span>
                </div>
                <div style={styles.beatWriterMeta}>
                  <span style={styles.beatWriterOutlet}>{s.team}</span>
                </div>
                <span style={styles.beatWriterDesc}>{s.desc}</span>
              </div>
              <span style={styles.beatWriterArrow}>→</span>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── CHANNEL CONFIG ────────────────────────────────────────────────────────
const CHANNEL_STYLES = {
  "ESPN":    { bg: "#cc0000", text: "#fff",    label: "ESPN"    },
  "ESPN2":   { bg: "#cc0000", text: "#fff",    label: "ESPN2"   },
  "ESPNU":   { bg: "#cc0000", text: "#fff",    label: "ESPNU"   },
  "ABC":     { bg: "#000f6b", text: "#fff",    label: "ABC"     },
  "NBC":     { bg: "#0a7abf", text: "#fff",    label: "NBC"     },
  "CBS":     { bg: "#1a3a8a", text: "#fff",    label: "CBS"     },
  "FOX":     { bg: "#003366", text: "#fff",    label: "FOX"     },
  "FS1":     { bg: "#003366", text: "#fff",    label: "FS1"     },
  "TNT":     { bg: "#0066cc", text: "#fff",    label: "TNT"     },
  "TBS":     { bg: "#004080", text: "#fff",    label: "TBS"     },
  "YES":     { bg: "#003087", text: "#fff",    label: "YES"     },
  "SNY":     { bg: "#002B5C", text: "#e8a800", label: "SNY"     },
  "MSG":     { bg: "#006BB6", text: "#fff",    label: "MSG"     },
  "MSG+":    { bg: "#006BB6", text: "#fff",    label: "MSG+"    },
  "NHLN":    { bg: "#000000", text: "#fff",    label: "NHLN"    },
  "NHLNETWORK": { bg: "#000000", text: "#fff", label: "NHL NET" },
  "MLB":     { bg: "#002D72", text: "#fff",    label: "MLB.TV"  },
  "MLBN":    { bg: "#002D72", text: "#fff",    label: "MLB NET" },
  "NBATV":   { bg: "#006BB6", text: "#fff",    label: "NBA TV"  },
  "PEACOCK": { bg: "#000000", text: "#00d4ff", label: "PEACOCK" },
  "PRIME":   { bg: "#00a8e1", text: "#fff",    label: "PRIME"   },
  "APPLE":   { bg: "#555",    text: "#fff",    label: "APPLE TV"},
  "MAX":     { bg: "#001f5e", text: "#fff",    label: "MAX"     },
  "DEFAULT": { bg: "#444",    text: "#ccc",    label: null       },
};

function getChannelStyle(name) {
  const upper = (name || "").toUpperCase().replace(/\s+/g,"");
  return CHANNEL_STYLES[upper] || { ...CHANNEL_STYLES.DEFAULT, label: name };
}

function getChannelURL(name) {
  const upper = (name || "").toUpperCase().replace(/\s+/g,"");
  const URLS = {
    ESPN:    "https://www.espn.com/watch/",
    ESPN2:   "https://www.espn.com/watch/",
    ESPNU:   "https://www.espn.com/watch/",
    ABC:     "https://abc.com/sports",
    NBC:     "https://www.nbcsports.com/",
    NBCSN:   "https://www.nbcsports.com/",
    FOX:     "https://www.foxsports.com/",
    FS1:     "https://www.foxsports.com/",
    FS2:     "https://www.foxsports.com/",
    CBS:     "https://www.cbssports.com/",
    TNT:     "https://www.tntdrama.com/sports",
    TBS:     "https://www.tbs.com/sports",
    MLB:     "https://www.mlb.com/tv",
    MLBN:    "https://www.mlb.com/network",
    MLBNETWORK:"https://www.mlb.com/network",
    NBA:     "https://www.nba.com/watch",
    NBATV:   "https://www.nba.com/nbatv",
    NHL:     "https://www.nhl.com/tv",
    NHLN:    "https://www.nhl.com/network",
    NHLNETWORK:"https://www.nhl.com/network",
    NFL:     "https://www.nfl.com/network",
    NFLN:    "https://www.nfl.com/network",
    NFLNETWORK:"https://www.nfl.com/network",
    SNY:     "https://sny.tv/",
    YES:     "https://www.yesnetwork.com/",
    YESNETWORK:"https://www.yesnetwork.com/",
    MSG:     "https://www.msgnetworks.com/",
    MSG2:    "https://www.msgnetworks.com/",
    MSGSN:   "https://www.msgnetworks.com/",
    MSGNETWORK:"https://www.msgnetworks.com/",
    PEACOCK: "https://www.peacocktv.com/sports",
    PARAMOUNT:"https://www.paramountplus.com/sports/",
    PRIME:   "https://www.amazon.com/dp/B0BSGRDLPS?tag=nysportsdaily-20",
    APPLE:   "https://tv.apple.com/us/sports",
    APPLETV: "https://tv.apple.com/us/sports",
    MAX:     "https://www.max.com/sports",
  };
  return URLS[upper] || `https://www.google.com/search?q=${encodeURIComponent("watch " + name + " live stream")}`;
}

const SPORT_ICONS_TV = { NFL:"🏈", MLB:"⚾", NBA:"🏀", NHL:"🏒", WNBA:"🏀", MLS:"⚽" };

// ─── TV SCHEDULE COMPONENT ─────────────────────────────────────────────────
function TVScheduleTab({ scores, loading }) {
  const today = new Date();
  const NY_TV = ["new york yankees","new york mets","new york jets","new york giants","new york knicks","brooklyn nets","new york rangers","new york islanders","new jersey devils","new york liberty","nycfc","new york red bulls","gotham fc"];
  function isNYGame(g) {
    return [g.homeTeam, g.awayTeam].some(n => NY_TV.includes(n.toLowerCase()));
  }

  const sorted = [...scores].sort((a, b) => {
    const aNY = isNYGame(a), bNY = isNYGame(b);
    if (aNY && !bNY) return -1;
    if (!aNY && bNY) return 1;
    return (a.gameDate || 0) - (b.gameDate || 0);
  });

  const nyGames    = sorted.filter(g => isNYGame(g));
  const otherGames = sorted.filter(g => !isNYGame(g));

  if (loading) return (
    <div style={styles.loading}>
      <div style={styles.loadingDots}>
        {[0,1,2].map(i => <span key={i} style={{...styles.dot, animationDelay:`${i*0.2}s`}} />)}
      </div>
      <p style={styles.loadingText}>LOADING TV SCHEDULE...</p>
    </div>
  );

  if (sorted.length === 0) return (
    <div style={styles.empty}>
      <span style={styles.emptyIcon}>📺</span>
      <p style={styles.emptyText}>NO GAMES SCHEDULED TODAY</p>
    </div>
  );

  return (
    <div style={styles.tvRoot}>

      {/* Date banner */}
      <div style={styles.tvDateBanner}>
        <span style={styles.tvDateIcon}>📺</span>
        <div>
          <div style={styles.tvDateTitle}>TODAY'S SPORTS TV</div>
          <div style={styles.tvDateSub}>
            {today.toLocaleDateString("en-US",{weekday:"long",month:"long",day:"numeric"}).toUpperCase()}
            {" · "}{sorted.length} GAMES ON AIR
          </div>
        </div>
      </div>

      {/* NY Games section */}
      {nyGames.length > 0 && (
        <div style={styles.tvSection}>
          <div style={styles.tvSectionHeader}>
            <span style={styles.tvSectionHeaderText}>🗽 NEW YORK TEAMS</span>
          </div>
          {nyGames.map(game => <TVGameRow key={game.id} game={game} featured={true} />)}
        </div>
      )}

      {/* All other games */}
      {otherGames.length > 0 && (
        <div style={styles.tvSection}>
          <div style={styles.tvSectionHeader}>
            <span style={styles.tvSectionHeaderText}>ALL OTHER GAMES</span>
          </div>
          {otherGames.map(game => <TVGameRow key={game.id} game={game} />)}
        </div>
      )}

      <div style={styles.tvFootnote}>
        * Broadcast info via ESPN · Times Eastern · Subject to change
      </div>
    </div>
  );
}

function TVGameRow({ game, featured }) {
  const isLive = game.statusState === "in";
  const isFinal = game.statusState === "post";
  const hasScore = isLive || isFinal;

  return (
    <div style={{...styles.tvRow, ...(featured ? styles.tvRowFeatured : {})}}>

      {/* Time column */}
      <div style={styles.tvTimeCol}>
        {isLive ? (
          <span style={styles.tvLiveBadge}>
            <span style={styles.tvLiveDot}>●</span> LIVE
          </span>
        ) : isFinal ? (
          <span style={styles.tvFinalBadge}>FINAL</span>
        ) : (
          <span style={styles.tvTime}>
            {game.gameTime || "TBD"}
          </span>
        )}
        <span style={styles.tvSportBadge}>
          {SPORT_ICONS_TV[game.sport] || "🏆"} {game.sport}
        </span>
      </div>

      {/* Matchup column */}
      <div style={styles.tvMatchup}>
        <div style={styles.tvTeamLine}>
          {game.awayLogo && <img src={game.awayLogo} alt="" style={styles.tvLogo} onError={e=>e.target.style.display="none"} />}
          <span style={styles.tvTeamName}>{game.awayTeam}</span>
          {hasScore && <span style={styles.tvScore}>{game.awayScore}</span>}
        </div>
        <div style={styles.tvAt}>at</div>
        <div style={styles.tvTeamLine}>
          {game.homeLogo && <img src={game.homeLogo} alt="" style={styles.tvLogo} onError={e=>e.target.style.display="none"} />}
          <span style={styles.tvTeamName}>{game.homeTeam}</span>
          {hasScore && <span style={styles.tvScore}>{game.homeScore}</span>}
        </div>
        {game.venue && <div style={styles.tvVenue}>{game.venue}</div>}
      </div>

      {/* Channels column */}
      <div style={styles.tvChannels}>
        {game.broadcasts && game.broadcasts.length > 0 ? (
          game.broadcasts.map((ch, i) => {
            const cs = getChannelStyle(ch);
            return (
              <a key={i} href={getChannelURL(ch)} target="_blank" rel="noopener noreferrer"
                style={{...styles.tvChannelBadge, background: cs.bg, color: cs.text, textDecoration:"none", cursor:"pointer"}}>
                {cs.label || ch}
              </a>
            );
          })
        ) : (
          <span style={styles.tvNoChannel}>CHECK LOCAL LISTINGS</span>
        )}
      </div>
    </div>
  );
}

// ─── QUOTE OF THE DAY ─────────────────────────────────────────────────────
function QuoteOfDay() {
  const q = getDailyQuote();
  const googleUrl = `https://www.google.com/search?q=${encodeURIComponent(q.author + " " + q.team + " quotes")}`;
  return (
    <div style={styles.quoteBar}>
      <span style={styles.quoteIcon}>💬</span>
      <div style={styles.quoteBody}>
        <p style={styles.quoteText}>"{q.quote}"</p>
        <p style={styles.quoteAuthor}>
          — {q.author}{q.context ? `, ${q.context}` : ""} <span style={styles.quoteTeam}>· {q.team}</span>
        </p>
        <div style={{display:"flex", gap:10, marginTop:4}}>
          {q.wiki && <a href={q.wiki} target="_blank" rel="noopener noreferrer" style={styles.quoteLinkSmall}>📖 Wiki</a>}
          <a href={googleUrl} target="_blank" rel="noopener noreferrer" style={styles.quoteLinkSmall}>🔍 More quotes</a>
        </div>
      </div>
    </div>
  );
}

// ─── ALL-TIME NY SPORTS DATA ──────────────────────────────────────────────
const STADIUM_HISTORY = [
  { name:"Yankee Stadium (Original)", team:"Yankees", years:"1923–2008", capacity:"57,545", note:"The House That Ruth Built. Site of 26 World Series. Demolished 2009.", location:"Bronx, NY", emoji:"⚾" },
  { name:"Yankee Stadium (New)", team:"Yankees", years:"2009–present", capacity:"54,251", note:"Opened same season Yankees won their 27th World Series. Replaced original across the street.", location:"Bronx, NY", emoji:"⚾" },
  { name:"Shea Stadium", team:"Mets", years:"1964–2008", capacity:"55,601", note:"Home of the Miracle Mets and 1986 champions. Beatles played here 1965. Demolished 2009.", location:"Flushing, Queens", emoji:"⚾" },
  { name:"Citi Field", team:"Mets", years:"2009–present", capacity:"41,922", note:"Replaced Shea Stadium. Features Mets Hall of Fame and Jackie Robinson Rotunda.", location:"Flushing, Queens", emoji:"⚾" },
  { name:"Madison Square Garden", team:"Knicks/Rangers", years:"1968–present", capacity:"20,789", note:"The World's Most Famous Arena — 4th arena to bear the name. Knicks and Rangers both call it home.", location:"Midtown Manhattan", emoji:"🏀🏒" },
  { name:"Nassau Veterans Memorial Coliseum", team:"Islanders", years:"1972–2015", capacity:"16,234", note:"Home of four consecutive Stanley Cup champions 1980-83. The loudest building in hockey.", location:"Uniondale, NY", emoji:"🏒" },
  { name:"UBS Arena", team:"Islanders", years:"2021–present", capacity:"17,255", note:"State-of-the-art arena at Belmont Park. Finally gave the Islanders a modern home after years of uncertainty.", location:"Elmont, NY", emoji:"🏒" },
  { name:"MetLife Stadium", team:"Giants/Jets", years:"2010–present", capacity:"82,500", note:"Shared by Giants and Jets — only NFL stadium shared by two teams. Site of Super Bowl XLVIII (2014).", location:"East Rutherford, NJ", emoji:"🏈" },
  { name:"Giants Stadium", team:"Giants/Jets", years:"1976–2009", capacity:"80,242", note:"Replaced Shea and Yale Bowl as NY football home. Also hosted 1994 World Cup and 1996 Copa America.", location:"East Rutherford, NJ", emoji:"🏈" },
  { name:"Shea Stadium", team:"Mets/Jets", years:"1964–2008", capacity:"55,601", note:"Home of Miracle Mets and 1986 champions. Jets called it home 1964-1983. Beatles played here 1965. Demolished 2009.", location:"Flushing, Queens", emoji:"⚾🏈" },
  { name:"Polo Grounds", team:"Giants/Yankees/Mets/Jets", years:"1880s–1963", capacity:"55,000", note:"Original NY sports cathedral. Home to baseball Giants, early Yankees, first Mets season, and Jets in 1960. Demolished 1964.", location:"Upper Manhattan", emoji:"⚾🏈" },
  { name:"Barclays Center", team:"Nets/Liberty", years:"2012–present", capacity:"17,732", note:"Anchor of Brooklyn sports revival. Nets moved from NJ. Liberty share arena with Nets.", location:"Brooklyn, NY", emoji:"🏀" },
  { name:"Sports Illustrated Stadium", team:"Red Bulls/Gotham FC", years:"2010–present", capacity:"25,000", note:"Soccer-specific stadium in Harrison NJ. Home to Red Bulls and 2x NWSL champion Gotham FC. Formerly called Red Bull Arena.", location:"Harrison, NJ", emoji:"⚽" },
  { name:"Yankee Stadium (1923 Original) Facts", team:"Yankees", years:"1923", capacity:"N/A", note:"Cost $2.5 million to build. First game April 18 1923 — Babe Ruth hit a 3-run homer. Capacity expanded multiple times over 85 years.", location:"Bronx, NY", emoji:"⚾" },
];

const HISTORY_LISTS = {
  "Yankees": [
    { title: "All-Time Yankees Home Run Leaders", items: [
      { rank:1,  name:"Babe Ruth",        value:"659 HR",  years:"1920–1934" },
      { rank:2,  name:"Mickey Mantle",    value:"536 HR",  years:"1951–1968" },
      { rank:3,  name:"Lou Gehrig",       value:"493 HR",  years:"1923–1939" },
      { rank:4,  name:"Alex Rodriguez",   value:"351 HR",  years:"2004–2016" },
      { rank:5,  name:"Joe DiMaggio",     value:"361 HR",  years:"1936–1951" },
      { rank:6,  name:"Yogi Berra",       value:"358 HR",  years:"1946–1963" },
      { rank:7,  name:"Bernie Williams",  value:"287 HR",  years:"1991–2006" },
      { rank:8,  name:"Jorge Posada",     value:"275 HR",  years:"1995–2011" },
      { rank:9,  name:"Derek Jeter",      value:"260 HR",  years:"1995–2014" },
      { rank:10, name:"Don Mattingly",    value:"222 HR",  years:"1982–1995" },
    ]},
    { title: "All-Time Yankees RBI Leaders", items: [
      { rank:1,  name:"Babe Ruth",        value:"1,978 RBI", years:"1920–1934" },
      { rank:2,  name:"Lou Gehrig",       value:"1,995 RBI", years:"1923–1939" },
      { rank:3,  name:"Mickey Mantle",    value:"1,509 RBI", years:"1951–1968" },
      { rank:4,  name:"Joe DiMaggio",     value:"1,537 RBI", years:"1936–1951" },
      { rank:5,  name:"Yogi Berra",       value:"1,430 RBI", years:"1946–1963" },
      { rank:6,  name:"Derek Jeter",      value:"1,311 RBI", years:"1995–2014" },
      { rank:7,  name:"Bernie Williams",  value:"1,257 RBI", years:"1991–2006" },
      { rank:8,  name:"Alex Rodriguez",   value:"1,096 RBI", years:"2004–2016" },
      { rank:9,  name:"Don Mattingly",    value:"1,099 RBI", years:"1982–1995" },
      { rank:10, name:"Jorge Posada",     value:"1,065 RBI", years:"1995–2011" },
    ]},
    { title: "All-Time Yankees Hits Leaders", items: [
      { rank:1,  name:"Derek Jeter",      value:"3,465 H",  years:"1995–2014" },
      { rank:2,  name:"Babe Ruth",        value:"2,518 H",  years:"1920–1934" },
      { rank:3,  name:"Lou Gehrig",       value:"2,721 H",  years:"1923–1939" },
      { rank:4,  name:"Mickey Mantle",    value:"2,415 H",  years:"1951–1968" },
      { rank:5,  name:"Bernie Williams",  value:"2,336 H",  years:"1991–2006" },
      { rank:6,  name:"Joe DiMaggio",     value:"2,214 H",  years:"1936–1951" },
      { rank:7,  name:"Yogi Berra",       value:"2,150 H",  years:"1946–1963" },
      { rank:8,  name:"Don Mattingly",    value:"2,153 H",  years:"1982–1995" },
      { rank:9,  name:"Roy White",        value:"1,803 H",  years:"1965–1979" },
      { rank:10, name:"Jorge Posada",     value:"1,664 H",  years:"1995–2011" },
    ]},
    { title: "All-Time Yankees Pitching Wins Leaders", items: [
      { rank:1,  name:"Whitey Ford",      value:"236 W",   years:"1950–1967" },
      { rank:2,  name:"Red Ruffing",      value:"231 W",   years:"1930–1946" },
      { rank:3,  name:"Lefty Gomez",      value:"189 W",   years:"1930–1942" },
      { rank:4,  name:"Ron Guidry",       value:"170 W",   years:"1975–1988" },
      { rank:5,  name:"Andy Pettitte",    value:"219 W",   years:"1995–2013" },
      { rank:6,  name:"Herb Pennock",     value:"162 W",   years:"1923–1933" },
      { rank:7,  name:"Waite Hoyt",       value:"157 W",   years:"1921–1930" },
      { rank:8,  name:"Mel Stottlemyre", value:"164 W",    years:"1964–1974" },
      { rank:9,  name:"Jack Chesbro",     value:"128 W",   years:"1903–1909" },
      { rank:10, name:"CC Sabathia",      value:"157 W",   years:"2009–2019" },
    ]},
    { title: "Yankees World Series Championships", items: [
      { rank:1,  name:"1923", value:"vs Giants",       years:"First championship" },
      { rank:2,  name:"1927", value:"vs Pirates",      years:"Murderers' Row" },
      { rank:3,  name:"1928", value:"vs Cardinals",    years:"Back-to-back" },
      { rank:4,  name:"1932", value:"vs Cubs",         years:"Babe's called shot" },
      { rank:5,  name:"1936–39", value:"4 straight",   years:"DiMaggio era begins" },
      { rank:6,  name:"1949–53", value:"5 straight",   years:"Greatest dynasty ever" },
      { rank:7,  name:"1977–78", value:"Back-to-back", years:"Reggie Jackson era" },
      { rank:8,  name:"1996", value:"vs Braves",       years:"Jeter's first ring" },
      { rank:9,  name:"1998–2000", value:"3 straight", years:"Dynasty peak" },
      { rank:10, name:"2009", value:"vs Phillies",     years:"27th championship" },
    ]},
  ],
  "Mets": [
    { title: "All-Time Mets HR Leaders", items: [
      { rank:1,  name:"Pete Alonso",       value:"254+ HR", years:"2019–present · Mets all-time record set Aug 12, 2025" },
      { rank:2,  name:"Darryl Strawberry", value:"252 HR",  years:"1983–1990" },
      { rank:3,  name:"David Wright",      value:"242 HR",  years:"2004–2018" },
      { rank:4,  name:"Mike Piazza",       value:"220 HR",  years:"1998–2005" },
      { rank:5,  name:"Howard Johnson",    value:"192 HR",  years:"1985–1993" },
      { rank:6,  name:"Dave Kingman",      value:"154 HR",  years:"1975–77, 1981–83" },
      { rank:7,  name:"Todd Hundley",      value:"124 HR",  years:"1990–1998" },
      { rank:8,  name:"Carlos Delgado",    value:"104 HR",  years:"2006–2009" },
      { rank:9,  name:"Lucas Duda",        value:"100 HR",  years:"2010–2017" },
      { rank:10, name:"Cleon Jones",       value:"93 HR",   years:"1963–1975" },
    ]},
    { title: "All-Time Mets RBI Leaders", items: [
      { rank:1,  name:"Darryl Strawberry", value:"733 RBI", years:"1983–1990" },
      { rank:2,  name:"Howard Johnson",    value:"629 RBI", years:"1985–1993" },
      { rank:3,  name:"Mike Piazza",       value:"655 RBI", years:"1998–2005" },
      { rank:4,  name:"Pete Alonso",       value:"600+ RBI",years:"2019–present" },
      { rank:5,  name:"Ed Kranepool",      value:"614 RBI", years:"1962–1979" },
      { rank:6,  name:"Cleon Jones",       value:"521 RBI", years:"1963–1975" },
      { rank:7,  name:"Carlos Beltran",    value:"559 RBI", years:"2005–2011" },
      { rank:8,  name:"Dave Magadan",      value:"290 RBI", years:"1986–1992" },
      { rank:9,  name:"Carlos Delgado",    value:"339 RBI", years:"2006–2009" },
      { rank:10, name:"Mike Jacobs",       value:"180 RBI", years:"2004–2007" },
    ]},
    { title: "All-Time Mets Hits Leaders", items: [
      { rank:1,  name:"Ed Kranepool",      value:"1,418 H", years:"1962–1979" },
      { rank:2,  name:"Cleon Jones",       value:"1,188 H", years:"1963–1975" },
      { rank:3,  name:"Darryl Strawberry", value:"1,025 H", years:"1983–1990" },
      { rank:4,  name:"Howard Johnson",    value:"997 H",   years:"1985–1993" },
      { rank:5,  name:"David Wright",      value:"1,777 H", years:"2004–2018" },
      { rank:6,  name:"Mike Piazza",       value:"1,028 H", years:"1998–2005" },
      { rank:7,  name:"Carlos Beltran",    value:"935 H",   years:"2005–2011" },
      { rank:8,  name:"Jose Reyes",        value:"1,210 H", years:"2003–2016" },
      { rank:9,  name:"Mookie Wilson",     value:"1,112 H", years:"1980–1989" },
      { rank:10, name:"Rusty Staub",       value:"792 H",   years:"1972–85" },
    ]},
    { title: "All-Time Mets Pitching Wins Leaders", items: [
      { rank:1,  name:"Tom Seaver",        value:"198 W",  years:"1967–1977, 1983" },
      { rank:2,  name:"Dwight Gooden",     value:"157 W",  years:"1984–1994" },
      { rank:3,  name:"Jerry Koosman",     value:"140 W",  years:"1967–1978" },
      { rank:4,  name:"Ron Darling",       value:"99 W",   years:"1983–1991" },
      { rank:5,  name:"Al Jackson",        value:"67 W",   years:"1962–1969" },
      { rank:6,  name:"Sid Fernandez",     value:"98 W",   years:"1983–1993" },
      { rank:7,  name:"Jon Matlack",       value:"82 W",   years:"1971–1977" },
      { rank:8,  name:"Jacob deGrom",      value:"82 W",   years:"2014–2022" },
      { rank:9,  name:"David Cone",        value:"81 W",   years:"1987–1992, 2003" },
      { rank:10, name:"Bobby Jones",       value:"74 W",   years:"1993–2000" },
    ]},
    { title: "All-Time Mets Strikeout Leaders (Pitchers)", items: [
      { rank:1,  name:"Tom Seaver",        value:"2,541 K", years:"1967–1983" },
      { rank:2,  name:"Dwight Gooden",     value:"1,875 K", years:"1984–1994" },
      { rank:3,  name:"Jerry Koosman",     value:"1,799 K", years:"1967–1978" },
      { rank:4,  name:"Jacob deGrom",      value:"1,607 K", years:"2014–2022" },
      { rank:5,  name:"Sid Fernandez",     value:"1,449 K", years:"1983–1993" },
      { rank:6,  name:"Ron Darling",       value:"1,172 K", years:"1983–1991" },
      { rank:7,  name:"David Cone",        value:"1,172 K", years:"1987–1992, 2003" },
      { rank:8,  name:"Noah Syndergaard",  value:"855 K",   years:"2015–2021" },
      { rank:9,  name:"Bobby Jones",       value:"669 K",   years:"1993–2000" },
      { rank:10, name:"Tug McGraw",        value:"618 K",   years:"1965–1974" },
    ]},
    { title: "Greatest Mets Seasons", items: [
      { rank:1,  name:"1969", value:"World Champions",    years:"Miracle Mets" },
      { rank:2,  name:"1986", value:"World Champions",    years:"108 wins, Gooden, Strawberry" },
      { rank:3,  name:"2015", value:"NL Champions",       years:"Harvey, deGrom, Syndergaard" },
      { rank:4,  name:"1988", value:"100 wins",           years:"Cone, Gooden dominate" },
      { rank:5,  name:"1973", value:"NL Champions",       years:"Ya Gotta Believe!" },
      { rank:6,  name:"2000", value:"NL Champions",       years:"Subway Series" },
      { rank:7,  name:"2022", value:"101 wins",           years:"deGrom/Scherzer" },
      { rank:8,  name:"1985", value:"98 wins",            years:"One game from division" },
      { rank:9,  name:"1999", value:"NLCS",               years:"Piazza era" },
      { rank:10, name:"1990", value:"91 wins",            years:"Last great Straw season" },
    ]},
  ],
  "Knicks": [
    { title: "All-Time Knicks Points Leaders", items: [
      { rank:1,  name:"Patrick Ewing",     value:"23,665 pts", years:"1985–2000" },
      { rank:2,  name:"Walt Frazier",      value:"14,617 pts", years:"1967–1977" },
      { rank:3,  name:"Willis Reed",       value:"12,183 pts", years:"1964–1974" },
      { rank:4,  name:"Allan Houston",     value:"9,253 pts",  years:"1996–2005" },
      { rank:5,  name:"Carmelo Anthony",   value:"8,752 pts",  years:"2011–2017" },
      { rank:6,  name:"Earl Monroe",       value:"8,710 pts",  years:"1971–1980" },
      { rank:7,  name:"Dick Barnett",      value:"8,378 pts",  years:"1965–1974" },
      { rank:8,  name:"Bernard King",      value:"8,145 pts",  years:"1982–1987" },
      { rank:9,  name:"Charles Oakley",    value:"6,871 pts",  years:"1988–1998" },
      { rank:10, name:"Jalen Brunson",     value:"Active",     years:"2022–present" },
    ]},
    { title: "All-Time Knicks Rebounds Leaders", items: [
      { rank:1,  name:"Willis Reed",       value:"8,414 reb",  years:"1964–1974" },
      { rank:2,  name:"Patrick Ewing",     value:"10,759 reb", years:"1985–2000" },
      { rank:3,  name:"Walt Bellamy",      value:"7,029 reb",  years:"1965–1968" },
      { rank:4,  name:"Dave DeBusschere",  value:"4,563 reb",  years:"1968–1974" },
      { rank:5,  name:"Charles Oakley",    value:"7,169 reb",  years:"1988–1998" },
      { rank:6,  name:"Larry Johnson",     value:"3,148 reb",  years:"1996–2001" },
      { rank:7,  name:"Marcus Camby",      value:"1,996 reb",  years:"2002–2005" },
      { rank:8,  name:"Carmelo Anthony",   value:"2,861 reb",  years:"2011–2017" },
      { rank:9,  name:"Bob McAdoo",        value:"1,700 reb",  years:"1976–1979" },
      { rank:10, name:"Julius Randle",     value:"2,726 reb",  years:"2019–2024" },
    ]},
    { title: "All-Time Knicks Assists Leaders", items: [
      { rank:1,  name:"Walt Frazier",      value:"4,791 ast",  years:"1967–1977" },
      { rank:2,  name:"Mark Jackson",      value:"4,345 ast",  years:"1987–1992, 1999–2001" },
      { rank:3,  name:"Derek Harper",      value:"1,521 ast",  years:"1994–1996" },
      { rank:4,  name:"Charlie Ward",      value:"1,919 ast",  years:"1994–2004" },
      { rank:5,  name:"Patrick Ewing",     value:"2,215 ast",  years:"1985–2000" },
      { rank:6,  name:"Jalen Brunson",     value:"Active",     years:"2022–present" },
      { rank:7,  name:"Richie Guerin",     value:"3,049 ast",  years:"1956–1963" },
      { rank:8,  name:"Howard Porter",     value:"812 ast",    years:"1974–1977" },
      { rank:9,  name:"Earl Monroe",       value:"2,345 ast",  years:"1971–1980" },
      { rank:10, name:"Allan Houston",     value:"1,782 ast",  years:"1996–2005" },
    ]},
    { title: "Knicks Championship Seasons", items: [
      { rank:1, name:"1970 Champions", value:"vs Lakers",      years:"Willis Reed's heroic return" },
      { rank:2, name:"1973 Champions", value:"vs Lakers",      years:"Frazier, Monroe, DeBusschere, Bradley" },
      { rank:3, name:"1994 Finals",    value:"Lost to Rockets",years:"Ewing's closest call" },
      { rank:4, name:"1999 Finals",    value:"Lost to Spurs",  years:"8-seed greatest underdog run" },
      { rank:5, name:"2012–13",        value:"54 wins",        years:"Melo's best — Atlantic champs" },
      { rank:6, name:"1988–89",        value:"52 wins",        years:"Ewing prime begins" },
      { rank:7, name:"1968–69",        value:"Division title", years:"Pre-championship rise" },
      { rank:8, name:"1971–72",        value:"48 wins",        years:"Back-to-back dynasty" },
      { rank:9, name:"1995–96",        value:"47 wins",        years:"Riley's last Knicks season" },
      { rank:10,name:"2024–25",        value:"Deep playoff run",years:"Brunson era peaks" },
    ]},
  ],
  "Nets": [
    { title: "Nets ABA Championships — The Dr. J Years", items: [
      { rank:1,  name:"1974 ABA Champions",   value:"vs Utah Stars",    years:"Julius Erving leads Nets to first ABA title" },
      { rank:2,  name:"1976 ABA Champions",   value:"vs Nuggets",       years:"Dr. J's last ABA season — swept Denver for his 2nd title" },
      { rank:3,  name:"Julius Erving 1973-76",value:"ABA MVP 3x",       years:"The greatest show in basketball — Dr. J reinvented the game" },
      { rank:4,  name:"Dr. J Dunks",          value:"Artistic genius",   years:"Erving's hang time and creativity changed basketball forever" },
      { rank:5,  name:"ABA-NBA Merger 1976",  value:"Nets join NBA",     years:"Nets sold Dr. J to 76ers for $3M to pay merger fee — heartbreak" },
      { rank:6,  name:"2002 NBA Finals",      value:"vs Lakers",         years:"Kidd era — lost to Shaq/Kobe in 4. First Finals appearance" },
      { rank:7,  name:"2003 NBA Finals",      value:"vs Spurs",          years:"Back-to-back Finals — Duncan's Spurs win in 6" },
      { rank:8,  name:"Jason Kidd Era",       value:"2001–2008",         years:"Triple-doubles machine transformed NJ into a contender" },
      { rank:9,  name:"Move to Brooklyn 2012",value:"Barclays Center",   years:"New home, new era — first NY borough team since Dodgers" },
      { rank:10, name:"Big 3 Era 2020-22",    value:"KD/Kyrie/Harden",  years:"Most hyped team that never reached its potential" },
    ]},
    { title: "All-Time Nets Points Leaders", items: [
      { rank:1,  name:"Brook Lopez",       value:"10,444 pts", years:"2008–2017" },
      { rank:2,  name:"Buck Williams",     value:"10,440 pts", years:"1981–1989" },
      { rank:3,  name:"Julius Erving",     value:"ABA record", years:"1973–1976 (ABA)" },
      { rank:4,  name:"Vince Carter",      value:"9,621 pts",  years:"2004–2009" },
      { rank:5,  name:"Jason Kidd",        value:"7,833 pts",  years:"2001–2008" },
      { rank:6,  name:"Kerry Kittles",     value:"7,436 pts",  years:"1996–2004" },
      { rank:7,  name:"Richard Jefferson", value:"6,985 pts",  years:"2001–2006" },
      { rank:8,  name:"Derrick Coleman",   value:"6,843 pts",  years:"1990–1995" },
      { rank:9,  name:"Kevin Durant",      value:"4,474 pts",  years:"2020–2023" },
      { rank:10, name:"Kyrie Irving",      value:"3,041 pts",  years:"2021–2023" },
    ]},
  ],
  "Coaches": [
    { title: "All-Time Yankees Managers", items: [
      { rank:1,  name:"Casey Stengel",    value:"7 WS · .623",  years:"1949–1960 · 10 pennants in 12 years" },
      { rank:2,  name:"Joe McCarthy",     value:"7 WS · .627",  years:"1931–1946 · Highest win pct in franchise history" },
      { rank:3,  name:"Miller Huggins",   value:"3 WS · .597",  years:"1918–1929 · Babe Ruth era architect" },
      { rank:4,  name:"Joe Torre",        value:"4 WS · .605",  years:"1996–2007 · Dynasty era" },
      { rank:5,  name:"Billy Martin",     value:"2 WS · .562",  years:"1975–1988 (5 stints) · Volatile genius" },
      { rank:6,  name:"Ralph Houk",       value:"2 WS · .540",  years:"1961–1963, 1966–1973" },
      { rank:7,  name:"Bob Lemon",        value:"1 WS · .550",  years:"1978–79, 1981–82 · Won '78 Series" },
      { rank:8,  name:"Buck Showalter",   value:"0 WS · .525",  years:"1992–1995 · Set up dynasty, didn't get to enjoy it" },
      { rank:9,  name:"Yogi Berra",       value:"1 Pennant",    years:"1963–64, 1984–85 · Beloved coach" },
      { rank:10, name:"Aaron Boone",      value:"0 WS · Active",years:"2018–present · Division titles" },
    ]},
    { title: "All-Time Mets Managers", items: [
      { rank:1,  name:"Casey Stengel",    value:"0 WS · .302",  years:"1962–1965 · Lovable losers era" },
      { rank:2,  name:"Gil Hodges",       value:"1 WS · .551",  years:"1968–1971 · Led 1969 Miracle Mets" },
      { rank:3,  name:"Yogi Berra",       value:"0 WS · .508",  years:"1972–1975 · Ya Gotta Believe!" },
      { rank:4,  name:"Joe Torre",        value:"0 WS · .401",  years:"1977–1981 · Pre-Yankees glory" },
      { rank:5,  name:"Davey Johnson",    value:"1 WS · .588",  years:"1984–1990 · Led 1986 champions" },
      { rank:6,  name:"Bobby Valentine",  value:"0 WS · .520",  years:"1996–2002 · 2000 Subway Series" },
      { rank:7,  name:"Terry Collins",    value:"0 WS · .488",  years:"2011–2017 · Longest tenured Met manager" },
      { rank:8,  name:"Buck Showalter",   value:"0 WS · .547",  years:"2022–2023 · 101 wins in first season" },
      { rank:9,  name:"Carlos Mendoza",   value:"0 WS · Active",years:"2024–present · Young skipper, Alonso era" },
      { rank:10, name:"Wes Westrum",      value:"0 WS · .414",  years:"1965–1967 · Stengel's successor" },
    ]},
    { title: "All-Time Knicks Head Coaches", items: [
      { rank:1,  name:"Red Holzman",     value:"2 titles · .519", years:"1967–1982 · All-Time greatest Knick coach" },
      { rank:2,  name:"Pat Riley",       value:"0 · .562",        years:"1991–1995 · Defense first, brutal style" },
      { rank:3,  name:"Jeff Van Gundy",  value:"0 · .526",        years:"1996–2001 · 8-seed to Finals" },
      { rank:4,  name:"Tom Thibodeau",   value:"0 · Active",      years:"2020–present · Brunson era" },
      { rank:5,  name:"Lenny Wilkens",   value:"0 · .410",        years:"2004–2005" },
      { rank:6,  name:"Mike D'Antoni",   value:"0 · .518",        years:"2008–2012 · Linsanity" },
      { rank:7,  name:"Larry Brown",     value:"0 · .354",        years:"2005–2006 · One rocky year" },
      { rank:8,  name:"Rick Pitino",     value:"0 · .539",        years:"1987–1989 · Rebuilt before Riley" },
      { rank:9,  name:"Isiah Thomas",    value:"0 · .363",        years:"2006–2008" },
      { rank:10, name:"Fuzzy Levane",    value:"0 · .375",        years:"1958–1960 · Early era" },
    ]},
    { title: "All-Time Jets Head Coaches", items: [
      { rank:1,  name:"Weeb Ewbank",     value:"1 SB · .554",    years:"1963–1973 · Won Super Bowl III" },
      { rank:2,  name:"Rex Ryan",        value:"0 · .528",       years:"2009–2014 · Back-to-back AFC Champ games" },
      { rank:3,  name:"Walt Michaels",   value:"0 · .531",       years:"1977–1982 · AFC Championship 1982" },
      { rank:4,  name:"Bill Parcells",   value:"0 · .533",       years:"1997–1999 · Rebuilt franchise" },
      { rank:5,  name:"Herman Edwards",  value:"0 · .500",       years:"2001–2005 · Playoff appearances" },
      { rank:6,  name:"Eric Mangini",    value:"0 · .469",       years:"2006–2008" },
      { rank:7,  name:"Todd Bowles",     value:"0 · .390",       years:"2015–2018" },
      { rank:8,  name:"Adam Gase",       value:"0 · .278",       years:"2019–2020 · Notorious tenure" },
      { rank:9,  name:"Robert Saleh",    value:"0 · .363",       years:"2021–2023" },
      { rank:10, name:"Jeff Ulbrich",    value:"0 · Interim",    years:"2024 · Rodgers era" },
    ]},
    { title: "All-Time Giants Head Coaches", items: [
      { rank:1,  name:"Steve Owen",      value:"2 titles · .523", years:"1930–1953 · Longest Giants tenure" },
      { rank:2,  name:"Bill Parcells",   value:"2 SB · .592",     years:"1983–1990 · LT era dynasty" },
      { rank:3,  name:"Tom Coughlin",    value:"2 SB · .548",     years:"2004–2015 · Two miracle upsets" },
      { rank:4,  name:"Allie Sherman",   value:"0 · .570",        years:"1961–1968 · 3 conf titles" },
      { rank:5,  name:"Jim Lee Howell",  value:"1 title · .577",  years:"1954–1960 · Had Lombardi AND Landry as assistants" },
      { rank:6,  name:"Jim Fassel",      value:"0 · .518",        years:"1997–2003 · 2000 Super Bowl appearance" },
      { rank:7,  name:"Dan Reeves",      value:"0 · .422",        years:"1993–1996" },
      { rank:8,  name:"Ray Perkins",     value:"0 · .444",        years:"1979–1982 · Recruited Parcells" },
      { rank:9,  name:"Brian Daboll",    value:"0 · Active",      years:"2022–present" },
      { rank:10, name:"Ben McAdoo",      value:"0 · .531",        years:"2016–2017" },
    ]},
    { title: "All-Time Nets Head Coaches", items: [
      { rank:1,  name:"Lawrence Frank",  value:"0 · .518",        years:"2004–2009 · Best Nets coach modern era" },
      { rank:2,  name:"Byron Scott",     value:"0 · .600",        years:"2000–2003 · Led 2 Finals teams" },
      { rank:3,  name:"Kevin Loughery",  value:"2 ABA titles",    years:"1973–1979 · Dr. J era champion" },
      { rank:4,  name:"Don Nelson",      value:"0 · .500",        years:"1997–1999" },
      { rank:5,  name:"John Calipari",   value:"0 · .526",        years:"1996–1999 · Before college fame" },
      { rank:6,  name:"Frank Vogel",     value:"0 · Active",      years:"2024–present" },
      { rank:7,  name:"Jacque Vaughn",   value:"0 · .456",        years:"2022–2024" },
      { rank:8,  name:"Steve Nash",      value:"0 · .527",        years:"2020–2022 · Big 3 era" },
      { rank:9,  name:"Kenny Atkinson",  value:"0 · .406",        years:"2016–2020 · Rebuild architect" },
      { rank:10, name:"Avery Johnson",   value:"0 · .402",        years:"2012–2013" },
    ]},
    { title: "All-Time Rangers Head Coaches", items: [
      { rank:1,  name:"Emile Francis",   value:"0 Cups · .540",   years:"1965–1975 · GAG Line era — 654 games" },
      { rank:2,  name:"Mike Keenan",     value:"1 Cup · .633",    years:"1993–94 · Won it then left in a dispute" },
      { rank:3,  name:"Lester Patrick",  value:"2 Cups",          years:"1926–1939 · Original GM/coach" },
      { rank:4,  name:"Alain Vigneault", value:"0 · .574",        years:"2013–2018 · 2014 Finals" },
      { rank:5,  name:"Gerard Gallant",  value:"0 · .554",        years:"2021–2023 · 2022 Conf Finals" },
      { rank:6,  name:"David Quinn",     value:"0 · .500",        years:"2018–2021 · Rebuild" },
      { rank:7,  name:"Peter Laviolette",value:"0 · Active",      years:"2023–present" },
      { rank:8,  name:"Roger Neilson",   value:"0 · .511",        years:"1989–1993" },
      { rank:9,  name:"Phil Watson",     value:"0 · .508",        years:"1955–1960" },
      { rank:10, name:"Frank Boucher",   value:"0 · .490",        years:"1939–1948" },
    ]},
    { title: "All-Time Islanders Head Coaches", items: [
      { rank:1,  name:"Al Arbour",       value:"4 Cups · .598",   years:"1973–1986, 1988–1994 · Greatest coach in Isles history" },
      { rank:2,  name:"Mike Milbury",    value:"0 · .393",        years:"1995–1999 · Player turned coach" },
      { rank:3,  name:"Ted Nolan",       value:"0 · .500",        years:"2006–2008 · Brought playoff hockey back briefly" },
      { rank:4,  name:"Jack Capuano",    value:"0 · .500",        years:"2010–2017 · Tavares era" },
      { rank:5,  name:"Doug Weight",     value:"0 · .500",        years:"2017–2018 · Bridge coach" },
      { rank:6,  name:"Barry Trotz",     value:"0 · .596",        years:"2018–2022 · 2 Conf Finals appearances" },
      { rank:7,  name:"Lane Lambert",    value:"0 · .530",        years:"2022–2024" },
      { rank:8,  name:"Patrick Roy",     value:"0 · Active",      years:"2024–present · Legendary goalie now coaching" },
      { rank:9,  name:"Earl Ingarfield", value:"0 · .500",        years:"1972–1973 · First Islanders coach" },
      { rank:10, name:"Brian Kilrea",    value:"0 · Brief",       years:"1973 · Pre-Arbour interim" },
    ]},
    { title: "All-Time Devils Head Coaches", items: [
      { rank:1,  name:"Jacques Lemaire", value:"1 Cup · .569",    years:"1993–1998, 2009–2011 · 1995 Stanley Cup, trap defense" },
      { rank:2,  name:"Larry Robinson",  value:"1 Cup · .597",    years:"1995–2000, 2005–2006 · 2000 Stanley Cup" },
      { rank:3,  name:"Pat Burns",       value:"1 Cup · .598",    years:"2002–2004 · 2003 Stanley Cup, Jack Adams" },
      { rank:4,  name:"Lou Lamoriello",  value:"GM Legend",       years:"1987–2015 · Architect of all 3 Cups" },
      { rank:5,  name:"Lindy Ruff",      value:"0 · .553",        years:"2020–2024 · Built current Devils contender" },
      { rank:6,  name:"Sheldon Keefe",   value:"0 · Active",      years:"2024–present · Hughes brothers era" },
      { rank:7,  name:"Brent Sutter",    value:"0 · .500",        years:"2007–2009" },
      { rank:8,  name:"Robbie Ftorek",   value:"0 · .603",        years:"1998–2000 · Pre-Cup era" },
      { rank:9,  name:"Peter DeBoer",    value:"0 · .537",        years:"2011–2014 · 2012 Stanley Cup Finals" },
      { rank:10, name:"Tom McVie",       value:"0 · Bridge",      years:"1991–1992 · Built foundation" },
    ]},
  ],
  "Jets & Giants": [
    { title: "All-Time Jets Passing Leaders", items: [
      { rank:1,  name:"Joe Namath",       value:"27,057 yds", years:"1965–1976" },
      { rank:2,  name:"Ken O'Brien",      value:"24,386 yds", years:"1983–1992" },
      { rank:3,  name:"Chad Pennington",  value:"17,823 yds", years:"2000–2007" },
      { rank:4,  name:"Richard Todd",     value:"13,403 yds", years:"1976–1983" },
      { rank:5,  name:"Vinny Testaverde", value:"9,852 yds",  years:"1998–2003" },
      { rank:6,  name:"Mark Sanchez",     value:"8,682 yds",  years:"2009–2012" },
      { rank:7,  name:"Ryan Fitzpatrick", value:"8,106 yds",  years:"2015–2016" },
      { rank:8,  name:"Brett Favre",      value:"3,472 yds",  years:"2008" },
      { rank:9,  name:"Neil O'Donnell",   value:"5,397 yds",  years:"1996–1997" },
      { rank:10, name:"Aaron Rodgers",    value:"Active",     years:"2023–present" },
    ]},
    { title: "All-Time Giants Passing Leaders", items: [
      { rank:1,  name:"Eli Manning",      value:"57,023 yds", years:"2004–2019" },
      { rank:2,  name:"Phil Simms",       value:"33,462 yds", years:"1979–1993" },
      { rank:3,  name:"Kerry Collins",    value:"10,220 yds", years:"1999–2003" },
      { rank:4,  name:"Y.A. Tittle",      value:"10,439 yds", years:"1961–1964" },
      { rank:5,  name:"Charlie Conerly",  value:"13,439 yds", years:"1948–1961" },
      { rank:6,  name:"Daniel Jones",     value:"14,004 yds", years:"2019–2023" },
      { rank:7,  name:"Dave Brown",       value:"9,449 yds",  years:"1992–1997" },
      { rank:8,  name:"Fran Tarkenton",   value:"3,832 yds",  years:"1967–1971" },
      { rank:9,  name:"Scott Brunner",    value:"3,706 yds",  years:"1980–1984" },
      { rank:10, name:"Tommy Kramer",     value:"2,060 yds",  years:"1985" },
    ]},
    { title: "Top 10 Jets Greatest Moments", items: [
      { rank:1,  name:"Super Bowl III Win",          value:"1969", years:"Namath's guarantee — 16–7 vs Colts" },
      { rank:2,  name:"Mark Gastineau 22 Sacks",     value:"1984", years:"NFL single-season sack record" },
      { rank:3,  name:"2009 AFC Championship Game",  value:"2009", years:"Rex Ryan — 45-17 rout of San Diego Chargers" },
      { rank:4,  name:"Revis Island Season",         value:"2009", years:"Best CB in football — receivers had nowhere to go" },
      { rank:5,  name:"The Mud Bowl",                value:"1982", years:"Freeman McNeil, 44–17 vs Raiders in the mud" },
      { rank:6,  name:"Don Maynard 1,000 Yards",     value:"1965", years:"First AFL receiver to hit 1,000 yards" },
      { rank:7,  name:"2010 AFC Championship Game",  value:"2010", years:"Sanchez leads back-to-back title game runs" },
      { rank:8,  name:"Dennis Byrd Comeback",        value:"1993", years:"Paralyzed on the field — walked onto it again at season opener" },
      { rank:9,  name:"Sauce Gardner Rookie Year",   value:"2022", years:"Immediate Pro Bowler — best CB since Revis" },
      { rank:10, name:"Aaron Rodgers Returns 2024",  value:"2024", years:"Standing ovation at MetLife — hope renewed" },
    ]},
    { title: "Top 10 Giants Greatest Moments", items: [
      { rank:1,  name:"Super Bowl XXI Win",          value:"1987", years:"LT, Simms, 39–20 vs Broncos — first title" },
      { rank:2,  name:"Super Bowl XLII Win",         value:"2008", years:"Manning to Tyree — greatest catch ever made" },
      { rank:3,  name:"Super Bowl XXV Win",          value:"1991", years:"Ottis Anderson MVP — Bills' wide right" },
      { rank:4,  name:"Super Bowl XLVI Win",         value:"2012", years:"Bradshaw's accidental TD wins it vs Patriots" },
      { rank:5,  name:"The Helmet Catch",            value:"2008", years:"David Tyree, 4th and 1 — defied physics" },
      { rank:6,  name:"LT's 1986 MVP Season",        value:"1986", years:"22 sacks, NFL MVP, Defensive POY" },
      { rank:7,  name:"LT Sacks Theismann",          value:"1985", years:"Nov 18 — snapped his leg on Monday Night Football" },
      { rank:8,  name:"OBJ's One-Handed Catch",      value:"2014", years:"vs Cowboys — most viral catch in NFL history" },
      { rank:9,  name:"1958 Championship Game",      value:"1958", years:"Greatest game ever played — Colts in OT" },
      { rank:10, name:"Bavaro Drags Cowboys",        value:"1986", years:"Ran 30 yards with Cowboys hanging off him" },
    ]},
  ],
  "Retired Numbers": [
    { title: "NY Yankees Retired Numbers", items: [
      { rank:1,  name:"#1 — Billy Martin",          value:"Manager",  years:"5 different stints — complex genius" },
      { rank:2,  name:"#2 — Derek Jeter",           value:"SS",       years:"1995–2014 · The Captain" },
      { rank:3,  name:"#3 — Babe Ruth",             value:"RF",       years:"1920–1934 · The greatest ever" },
      { rank:4,  name:"#4 — Lou Gehrig",            value:"1B",       years:"1923–1939 · Iron Horse" },
      { rank:5,  name:"#5 — Joe DiMaggio",          value:"CF",       years:"1936–1951 · Yankee Clipper" },
      { rank:6,  name:"#6 — Joe Torre",             value:"Manager",  years:"1996–2007 · 4 World Series" },
      { rank:7,  name:"#7 — Mickey Mantle",         value:"CF",       years:"1951–1968 · The Commerce Comet" },
      { rank:8,  name:"#8 — Yogi Berra/Bill Dickey",value:"C",        years:"Both legendary catchers" },
      { rank:9,  name:"#9 — Roger Maris",           value:"RF",       years:"1960–1966 · 61 HR in 1961" },
      { rank:10, name:"#10 — Phil Rizzuto",         value:"SS",       years:"1941–1956 · Holy Cow!" },
      { rank:11, name:"#15 — Thurman Munson",       value:"C",        years:"1969–1979 · Captain, died in plane crash" },
      { rank:12, name:"#16 — Whitey Ford",          value:"SP",       years:"1950–1967 · Chairman of the Board" },
      { rank:13, name:"#23 — Don Mattingly",        value:"1B",       years:"1982–1995 · Donnie Baseball" },
      { rank:14, name:"#32 — Elston Howard",        value:"C",        years:"1955–1967 · First Black Yankee" },
      { rank:15, name:"#37 — Casey Stengel",        value:"Manager",  years:"1949–1960 · 7 World Series" },
      { rank:16, name:"#42 — Mariano Rivera",       value:"RP",       years:"1995–2013 · Greatest closer ever" },
      { rank:17, name:"#42 — Jackie Robinson",      value:"All MLB",  years:"1997 — retired across all of MLB" },
      { rank:18, name:"#44 — Reggie Jackson",       value:"RF",       years:"1977–1981 · Mr. October" },
      { rank:19, name:"#49 — Ron Guidry",           value:"SP",       years:"1975–1988 · Louisiana Lightning" },
    ]},
    { title: "NY Mets Retired Numbers", items: [
      { rank:1,  name:"#5  — David Wright",         value:"3B",       years:"2004–2018 · Mr. Met, franchise's face" },
      { rank:2,  name:"#14 — Gil Hodges",           value:"Manager",  years:"Led 1969 Miracle Mets" },
      { rank:3,  name:"#15 — Carlos Beltrán",       value:"CF",       years:"2005–2011 · Ceremony 2026" },
      { rank:4,  name:"#16 — Dwight Gooden",        value:"SP",       years:"1984–1994 · Doc" },
      { rank:5,  name:"#17 — Keith Hernandez",      value:"1B",       years:"1983–1989 · Captain, 1986 Series" },
      { rank:6,  name:"#18 — Darryl Strawberry",    value:"RF",       years:"1983–1990 · Straw" },
      { rank:7,  name:"#24 — Willie Mays",          value:"CF",       years:"1972–1973 · The Say Hey Kid" },
      { rank:8,  name:"#31 — Mike Piazza",          value:"C",        years:"1998–2005 · Greatest hitting catcher" },
      { rank:9,  name:"#36 — Jerry Koosman",        value:"SP",       years:"1967–1978 · 1969 Game 5 winner" },
      { rank:10, name:"#37 — Casey Stengel",        value:"Manager",  years:"1962–1965 · Original Mets skipper" },
      { rank:11, name:"#41 — Tom Seaver",           value:"SP",       years:"1967–1983 · Tom Terrific" },
      { rank:12, name:"#42 — Jackie Robinson",      value:"All MLB",  years:"1997 — retired across all of MLB" },
    ]},
    { title: "NY Knicks Retired Numbers", items: [
      { rank:1,  name:"#10 — Walt Frazier",         value:"G",        years:"1967–1977 · Clyde · 2x champion" },
      { rank:2,  name:"#12 — Dick Barnett",         value:"G",        years:"1965–1974 · 2x champion" },
      { rank:3,  name:"#15 — Earl Monroe",          value:"G",        years:"1971–1980 · The Pearl" },
      { rank:4,  name:"#19 — Willis Reed",          value:"C",        years:"1964–1974 · Captain · Finals MVP" },
      { rank:5,  name:"#22 — Dave DeBusschere",     value:"F",        years:"1968–1974 · 2x champion" },
      { rank:6,  name:"#24 — Bill Bradley",         value:"F",        years:"1967–1977 · Dollar Bill" },
      { rank:7,  name:"#33 — Patrick Ewing",        value:"C",        years:"1985–2000 · The Greatest Knick" },
      { rank:8,  name:"#613 — Red Holzman",         value:"Coach",    years:"1967–1982 · 2x championship coach" },
    ]},
    { title: "NY Rangers Retired Numbers", items: [
      { rank:1,  name:"#1 — Ed Giacomin",           value:"G",        years:"1965–1975 · Hall of Famer" },
      { rank:2,  name:"#2 — Brian Leetch",          value:"D",        years:"1987–2004 · Conn Smythe 1994" },
      { rank:3,  name:"#3 — Harry Howell",          value:"D",        years:"1952–1969 · Norris Trophy 1967" },
      { rank:4,  name:"#7 — Rod Gilbert",           value:"RW",       years:"1960–1978 · All-time franchise scorer" },
      { rank:5,  name:"#9 — Andy Bathgate",         value:"RW",       years:"1952–1964 · Hart Trophy 1959" },
      { rank:6,  name:"#11 — Mark Messier",         value:"C",        years:"1991–2004 · 1994 Cup captain" },
      { rank:7,  name:"#19 — Jean Ratelle",         value:"C",        years:"1960–1975 · Lady Byng 4x" },
      { rank:8,  name:"#22 — Mike Gartner",         value:"RW",       years:"1990–1994 · 700+ career goals" },
      { rank:9,  name:"#35 — Mike Richter",         value:"G",        years:"1989–2003 · 1994 Cup hero" },
    ]},
    { title: "NY Islanders Retired Numbers", items: [
      { rank:1,  name:"#5 — Denis Potvin",          value:"D",        years:"1973–1988 · Captain · 4x Cup" },
      { rank:2,  name:"#9 — Clark Gillies",         value:"LW",       years:"1974–1986 · Enforcer of dynasty" },
      { rank:3,  name:"#19 — Bryan Trottier",       value:"C",        years:"1975–1990 · Hart Trophy · 4x Cup" },
      { rank:4,  name:"#22 — Mike Bossy",           value:"RW",       years:"1977–1987 · 573 goals" },
      { rank:5,  name:"#23 — Bob Nystrom",          value:"RW",       years:"1972–1986 · 1980 OT Cup winner" },
      { rank:6,  name:"#31 — Billy Smith",          value:"G",        years:"1972–1989 · Battlin' Billy" },
    ]},
    { title: "NJ Devils Retired Numbers", items: [
      { rank:1,  name:"#3 — Ken Daneyko",           value:"D",        years:"1983–2003 · Mr. Devil · 3x Cup" },
      { rank:2,  name:"#4 — Scott Stevens",         value:"D",        years:"1991–2004 · Most feared hitter" },
      { rank:3,  name:"#26 — Patrik Elias",         value:"LW",       years:"1994–2016 · All-time franchise scorer" },
      { rank:4,  name:"#27 — Scott Niedermayer",    value:"D",        years:"1991–2004 · Hall of Famer · 3x Cup" },
      { rank:5,  name:"#30 — Martin Brodeur",       value:"G",        years:"1991–2014 · All-time NHL wins record" },
    ]},
    { title: "NY Giants Retired Numbers", items: [
      { rank:1,  name:"#1 — Ray Flaherty",          value:"WR/Coach", years:"1928–1935 · Original Giants star" },
      { rank:2,  name:"#7 — Mel Hein",              value:"C",        years:"1931–1945 · HOF center" },
      { rank:3,  name:"#11 — Phil Simms",           value:"QB",       years:"1979–1993 · Super Bowl XXI MVP" },
      { rank:4,  name:"#14 — Y.A. Tittle",          value:"QB",       years:"1961–1964 · 4x All-Pro" },
      { rank:5,  name:"#16 — Frank Gifford",        value:"WR/HB",    years:"1952–1964 · HOF legend" },
      { rank:6,  name:"#32 — Al Blozis",            value:"T",        years:"1942–1944 · KIA in WWII" },
      { rank:7,  name:"#40 — Joe Morrison",         value:"RB/WR",    years:"1959–1972 · Mr. Giant" },
      { rank:8,  name:"#42 — Charlie Conerly",      value:"QB",       years:"1948–1961 · First great Giants QB" },
      { rank:9,  name:"#50 — Ken Strong",           value:"HB/K",     years:"1933–1935, 1944–47 · HOF" },
      { rank:10, name:"#56 — Lawrence Taylor",      value:"LB",       years:"1981–1993 · Greatest defender ever" },
    ]},
    { title: "NY Jets Retired Numbers", items: [
      { rank:1,  name:"#12 — Joe Namath",           value:"QB",       years:"1965–1976 · Broadway Joe" },
      { rank:2,  name:"#13 — Don Maynard",          value:"WR",       years:"1960–1972 · First AFL WR to 1,000 yds" },
      { rank:3,  name:"#28 — Curtis Martin",        value:"RB",       years:"1998–2005 · HOF · 4x Pro Bowl" },
      { rank:4,  name:"#73 — Joe Klecko",           value:"DT",       years:"1977–1987 · NY Sack Exchange" },
    ]},
    { title: "Brooklyn Nets Retired Numbers", items: [
      { rank:1,  name:"#3 — Drazen Petrovic",       value:"G",        years:"1991–1993 · Died 1993 · 22 PPG" },
      { rank:2,  name:"#4 — Wendell Ladner",        value:"F",        years:"ABA era · Died 1975" },
      { rank:3,  name:"#5 — Jason Kidd",            value:"PG",       years:"2001–2008 · 2x Finals" },
      { rank:4,  name:"#23 — John Williamson",      value:"G",        years:"1973–1980 · Super John" },
      { rank:5,  name:"#25 — Bill Melchionni",      value:"G",        years:"1969–1976 · ABA era" },
      { rank:6,  name:"#32 — Julius Erving",        value:"F",        years:"1973–1976 · Dr. J ABA" },
      { rank:7,  name:"#52 — Buck Williams",        value:"F",        years:"1981–1989 · Franchise icon" },
    ]},
  ],
  "Records": [
    { title: "NY Players Who Hold MLB Records", items: [
      { rank:1,  name:"Don Larsen — World Series Perfect Game", value:"Yankees", years:"Oct 8, 1956 — only WS perfect game ever" },
      { rank:2,  name:"Joe DiMaggio — 56-Game Hitting Streak", value:"Yankees", years:"1941 — most unbreakable record in baseball" },
      { rank:3,  name:"Roger Maris — 61 HR (AL Record)",       value:"Yankees", years:"1961 — stood as MLB record until 1998" },
      { rank:4,  name:"Aaron Judge — 62 HR (AL Record)",       value:"Yankees", years:"2022 — current American League single-season record" },
      { rank:5,  name:"Derek Jeter — Most Yankees Hits",       value:"Yankees", years:"3,465 hits — all-time Yankee franchise record" },
      { rank:6,  name:"Mariano Rivera — 652 Saves",            value:"Yankees", years:"All-time MLB saves record" },
      { rank:7,  name:"Pete Alonso — Rookie HR Record + Mets All-Time Record", value:"Mets",    years:"53 HR in 2019 rookie record; 254+ HR all-time Mets franchise record set Aug 2025" },
      { rank:8,  name:"Tom Seaver — 3 Cy Young Awards (Mets)", value:"Mets",    years:"Most Cy Youngs by a Met — 1969, 1973, 1975" },
      { rank:9,  name:"Jack Chesbro — 41 Wins (1904)",         value:"Yankees", years:"Modern era single-season wins record (pre-Yankees)" },
      { rank:10, name:"Whitey Ford — 10 WS Wins",              value:"Yankees", years:"Most World Series pitching wins ever" },
    ]},
    { title: "NY Players Who Hold NFL Records", items: [
      { rank:1,  name:"Lawrence Taylor — Redefining LB",       value:"Giants",  years:"NFL changed rules twice because of LT — most impactful defender ever" },
      { rank:2,  name:"Mark Gastineau — 22 Sacks (1984)",      value:"Jets",    years:"Single-season sack record (since broken by Haason Reddick)" },
      { rank:3,  name:"Phil Simms — 88% Completion Rate",      value:"Giants",  years:"Super Bowl XXI — 22/25 still the SB completion record" },
      { rank:4,  name:"Eli Manning — 2 SB Upsets vs Patriots", value:"Giants",  years:"Only QB to beat Patriots twice in Super Bowl" },
      { rank:5,  name:"Joe Namath — First $400K+ Contract",    value:"Jets",    years:"Changed football economics forever in 1965" },
      { rank:6,  name:"Gene Roberts — 218 Yards (1950)",       value:"Giants",  years:"Old franchise single-game rushing record" },
      { rank:7,  name:"Darrelle Revis — Shutdown Corner",      value:"Jets",    years:"2009 — lowest passer rating allowed in a season by any CB" },
      { rank:8,  name:"Y.A. Tittle — 7 TD in a game (1962)",   value:"Giants",  years:"Tied NFL record with 7 TD passes in a single game" },
      { rank:9,  name:"Ward Cuff — Early Giants Records",      value:"Giants",  years:"1930s franchise scoring records from dynasty era" },
      { rank:10, name:"Frank Gifford — Mr. Giant",             value:"Giants",  years:"Career touchdowns franchise record for decades" },
    ]},
    { title: "NY Players Who Hold NHL Records", items: [
      { rank:1,  name:"Mike Bossy — Fastest to 50 Goals",      value:"Islanders",years:"1981 — 50 goals in 50 games, matching Rocket Richard" },
      { rank:2,  name:"Denis Potvin — Defenseman Points",       value:"Islanders",years:"Broke Bobby Orr's career points record for defensemen" },
      { rank:3,  name:"Bryan Trottier — 1984 Finals Record",   value:"Islanders",years:"Part of longest Cup dynasty (4 consecutive) in NHL history" },
      { rank:4,  name:"Islanders — 19 Playoff Series Wins",    value:"Islanders",years:"1980–84 — most consecutive playoff series wins in NHL history" },
      { rank:5,  name:"Martin Brodeur — Most Wins/Shutouts",   value:"Devils",   years:"All-time NHL wins and shutouts records — both still stand" },
      { rank:6,  name:"Brian Leetch — American-Born Scoring",  value:"Rangers",  years:"102 points in 1991-92 — most ever by American-born player" },
      { rank:7,  name:"Rod Gilbert — Rangers Franchise Record",value:"Rangers",  years:"1,021 points — all-time Rangers franchise scoring record" },
      { rank:8,  name:"Mark Messier — Captain Record",         value:"Rangers",  years:"Only player to captain two different teams to Stanley Cups" },
      { rank:9,  name:"Billy Smith — Playoff Save %",          value:"Islanders",years:"Dynasty era goaltending records during 4-Cup run" },
      { rank:10, name:"Chuck Rayner — Goalie Goal (1949)",     value:"Rangers",  years:"One of only a handful of goalies to ever score a goal" },
    ]},
    { title: "NY Players Who Hold NBA Records", items: [
      { rank:1,  name:"Patrick Ewing — Knicks All-Time Scorer",value:"Knicks",  years:"23,665 points — Knicks all-time franchise record" },
      { rank:2,  name:"Walt Frazier — Assists Leader",         value:"Knicks",  years:"4,791 assists — Knicks all-time franchise record" },
      { rank:3,  name:"Carmelo Anthony — Most Points in Game", value:"Knicks",  years:"62 points vs Charlotte (2014) — MSG single-game record" },
      { rank:4,  name:"Julius Erving — ABA Scoring",           value:"Nets",    years:"ABA Finals MVP twice — pioneered modern basketball" },
      { rank:5,  name:"Willis Reed — First Finals MVP",        value:"Knicks",  years:"1970 — won both regular season and Finals MVP" },
      { rank:6,  name:"Bernard King — 32.9 PPG Season",        value:"Knicks",  years:"1984-85 — career-high scoring season before knee injury" },
      { rank:7,  name:"Jason Kidd — Triple-Double Machine",    value:"Nets",    years:"Averaged triple-double in 2002 season leading Nets to Finals" },
      { rank:8,  name:"Brook Lopez — Nets Franchise Scorer",   value:"Nets",    years:"10,444 points — all-time Brooklyn/NJ Nets franchise record" },
      { rank:9,  name:"Knicks 1970 — Assist Record",           value:"Knicks",  years:"Team assists record for Finals game (Frazier's 19 in Game 7)" },
      { rank:10, name:"Breanna Stewart — WNBA Champion",       value:"Liberty", years:"2x WNBA champion, 2x Finals MVP — best active WNBA player" },
    ]},
  ],
  "Islanders": [
    { title: "4 Consecutive Stanley Cup Championships", items: [
      { rank:1,  name:"1980 Stanley Cup", value:"vs Flyers",      years:"First Cup — Nystrom OT winner" },
      { rank:2,  name:"1981 Stanley Cup", value:"vs North Stars", years:"Back-to-back — Butch Goring MVP" },
      { rank:3,  name:"1982 Stanley Cup", value:"vs Canucks",     years:"Three straight — Potvin lifts Cup" },
      { rank:4,  name:"1983 Stanley Cup", value:"vs Oilers",      years:"Four straight — swept Gretzky" },
      { rank:5,  name:"1984 Finals",      value:"Lost to Oilers", years:"Bid for 5 straight ended" },
      { rank:6,  name:"19 Playoff Series Wins", value:"1980–84",  years:"Most dominant run in NHL history" },
      { rank:7,  name:"Billy Smith Vezina", value:"1982",         years:"Battlin' Billy — warrior in net" },
      { rank:8,  name:"Bossy 50 in 50",   value:"1981",           years:"Matched Rocket Richard" },
      { rank:9,  name:"Trottier Hart Trophy", value:"1979",       years:"MVP year before first Cup" },
      { rank:10, name:"2002 Playoffs",    value:"Upset Devils",   years:"Nassau Coliseum goes crazy" },
    ]},
    { title: "All-Time Islanders Points Leaders", items: [
      { rank:1,  name:"Bryan Trottier",   value:"1,353 pts", years:"1975–1990" },
      { rank:2,  name:"Mike Bossy",       value:"1,126 pts", years:"1977–1987" },
      { rank:3,  name:"Denis Potvin",     value:"1,052 pts", years:"1973–1988" },
      { rank:4,  name:"Clark Gillies",    value:"872 pts",   years:"1974–1986" },
      { rank:5,  name:"John Tonelli",     value:"853 pts",   years:"1978–1986" },
      { rank:6,  name:"Brent Sutter",     value:"829 pts",   years:"1980–1991" },
      { rank:7,  name:"Bob Nystrom",      value:"672 pts",   years:"1972–1986" },
      { rank:8,  name:"John Tavares",     value:"621 pts",   years:"2009–2018" },
      { rank:9,  name:"Pat Flatley",      value:"560 pts",   years:"1983–1996" },
      { rank:10, name:"Mathew Barzal",    value:"Active",    years:"2016–present" },
    ]},
  ],
  "Rangers": [
    { title: "All-Time Rangers Points Leaders", items: [
      { rank:1,  name:"Brian Leetch",     value:"1,028 pts", years:"1987–2004 · Conn Smythe 1994" },
      { rank:2,  name:"Rod Gilbert",      value:"1,021 pts", years:"1960–1978 · Franchise icon" },
      { rank:3,  name:"Mark Messier",     value:"851 pts",   years:"1991–2004 · The Captain" },
      { rank:4,  name:"Jean Ratelle",     value:"817 pts",   years:"1960–1975 · GAG Line center" },
      { rank:5,  name:"Andy Bathgate",    value:"729 pts",   years:"1952–1964 · Hart Trophy 1959" },
      { rank:6,  name:"Adam Graves",      value:"682 pts",   years:"1991–2001 · 52 goals in 1993-94" },
      { rank:7,  name:"Walt Tkaczuk",     value:"678 pts",   years:"1967–1981 · Defensive forward" },
      { rank:8,  name:"Vic Hadfield",     value:"641 pts",   years:"1961–1974 · First to 50 goals" },
      { rank:9,  name:"Phil Esposito",    value:"555 pts",   years:"1975–1981 · GM who built team" },
      { rank:10, name:"Artemi Panarin",   value:"Active",    years:"2019–present · The Breadman" },
    ]},
    { title: "Rangers Stanley Cup Championships", items: [
      { rank:1,  name:"1928", value:"vs Maroons",    years:"First Stanley Cup" },
      { rank:2,  name:"1933", value:"vs Maple Leafs",years:"Second championship" },
      { rank:3,  name:"1940", value:"vs Maple Leafs",years:"Third — 54-year drought begins" },
      { rank:4,  name:"1994", value:"vs Canucks",    years:"54-year curse broken — Messier" },
      { rank:5,  name:"1994 Conf Finals", value:"vs Devils", years:"Messier's guarantee game" },
      { rank:6,  name:"1979 Finals", value:"Lost to Canadiens", years:"GAG Line era peak" },
      { rank:7,  name:"2014 Finals", value:"Lost to Kings", years:"Henrik Lundqvist era" },
      { rank:8,  name:"2022 Conf Finals", value:"Lost to Lightning", years:"New core rising" },
      { rank:9,  name:"1972 Finals", value:"Lost to Bruins", years:"GAG Line — Ratelle, Gilbert, Hadfield" },
      { rank:10, name:"2024 Conf Finals", value:"Lost to Panthers", years:"Panarin/Fox era" },
    ]},
  ],
  "Devils": [
    { title: "NJ Devils Stanley Cup Championships", items: [
      { rank:1,  name:"1995 Stanley Cup", value:"vs Red Wings",  years:"Swept Detroit — Brodeur masterful" },
      { rank:2,  name:"2000 Stanley Cup", value:"vs Stars",      years:"Scott Stevens era — Devils dynasty" },
      { rank:3,  name:"2003 Stanley Cup", value:"vs Mighty Ducks",years:"Third Cup in 9 years" },
      { rank:4,  name:"1994 Conference Finals", value:"Lost to Rangers", years:"Messier's guarantee crushed Devils" },
      { rank:5,  name:"2001 Finals", value:"Lost to Avalanche", years:"7-game classic — Colorado wins" },
      { rank:6,  name:"Martin Brodeur — NHL Records", value:"All-Time", years:"Most wins, shutouts in NHL history" },
      { rank:7,  name:"Scott Stevens — Hits", value:"Enforcer", years:"Most feared hitter in Devils history" },
      { rank:8,  name:"Pat Burns — Coach", value:"2002–03", years:"Coached Devils to 3rd Cup" },
      { rank:9,  name:"Elias — Points Leader", value:"1,025 pts", years:"All-time Devils points leader" },
      { rank:10, name:"NJ Devils Founding", value:"1982", years:"Moved from Colorado — became NJ's team" },
    ]},
    { title: "All-Time Devils Points Leaders", items: [
      { rank:1,  name:"Patrik Elias",     value:"1,025 pts", years:"1994–2016" },
      { rank:2,  name:"Brian Gionta",     value:"587 pts",   years:"2001–2009" },
      { rank:3,  name:"Scott Gomez",      value:"408 pts",   years:"2000–2006" },
      { rank:4,  name:"Ken Daneyko",      value:"520 pts",   years:"1983–2003" },
      { rank:5,  name:"Bobby Holik",      value:"480 pts",   years:"1992–2003" },
      { rank:6,  name:"Brian Rolston",    value:"367 pts",   years:"2002–2006" },
      { rank:7,  name:"Dave Andreychuk",  value:"345 pts",   years:"2000–2006" },
      { rank:8,  name:"Martin Brodeur",   value:"231 pts",   years:"1991–2014 (goalie)" },
      { rank:9,  name:"Petr Sykora",      value:"375 pts",   years:"1995–2002" },
      { rank:10, name:"Zach Parise",      value:"504 pts",   years:"2005–2012" },
    ]},
  ],
  "Jets & Giants": [
    { title: "All-Time Jets Passing Leaders", items: [
      { rank:1,  name:"Joe Namath",       value:"27,057 yds", years:"1965–1976" },
      { rank:2,  name:"Ken O'Brien",      value:"24,386 yds", years:"1983–1992" },
      { rank:3,  name:"Chad Pennington",  value:"17,823 yds", years:"2000–2007" },
      { rank:4,  name:"Richard Todd",     value:"13,403 yds", years:"1976–1983" },
      { rank:5,  name:"Vinny Testaverde", value:"9,852 yds",  years:"1998–2003" },
      { rank:6,  name:"Mark Sanchez",     value:"8,682 yds",  years:"2009–2012" },
      { rank:7,  name:"Brett Favre",      value:"3,472 yds",  years:"2008" },
      { rank:8,  name:"Neil O'Donnell",   value:"5,397 yds",  years:"1996–1997" },
      { rank:9,  name:"Ryan Fitzpatrick", value:"8,106 yds",  years:"2015–2016" },
      { rank:10, name:"Aaron Rodgers",    value:"Active",     years:"2023–present" },
    ]},
    { title: "All-Time Giants Passing Leaders", items: [
      { rank:1,  name:"Eli Manning",      value:"57,023 yds", years:"2004–2019" },
      { rank:2,  name:"Phil Simms",       value:"33,462 yds", years:"1979–1993" },
      { rank:3,  name:"Charlie Conerly",  value:"13,439 yds", years:"1948–1961" },
      { rank:4,  name:"Dave Brown",       value:"9,449 yds",  years:"1992–1997" },
      { rank:5,  name:"Y.A. Tittle",      value:"10,439 yds", years:"1961–1964" },
      { rank:6,  name:"Kerry Collins",    value:"10,220 yds", years:"1999–2003" },
      { rank:7,  name:"Fran Tarkenton",   value:"3,832 yds",  years:"1967–1971" },
      { rank:8,  name:"Daniel Jones",     value:"14,004 yds", years:"2019–2023" },
      { rank:9,  name:"Scott Brunner",    value:"3,706 yds",  years:"1980–1984" },
      { rank:10, name:"Tommy Kramer",     value:"2,060 yds",  years:"1985" },
    ]},
    { title: "Top 10 Jets Moments", items: [
      { rank:1,  name:"Super Bowl III Win",        value:"1969",  years:"Namath's guarantee, 16–7 vs Colts" },
      { rank:2,  name:"Gastineau's 22 Sacks",      value:"1984",  years:"NFL single-season sack record" },
      { rank:3,  name:"2009 AFC Championship",     value:"2009",  years:"Rex Ryan — 45-17 blowout of Chargers" },
      { rank:4,  name:"Revis Island Era",          value:"2009",  years:"Best CB in football" },
      { rank:5,  name:"Mud Bowl",                  value:"1982",  years:"Freeman McNeil, 44–17 vs Raiders" },
      { rank:6,  name:"Don Maynard 1,000 Yards",   value:"1965",  years:"First AFL receiver to do it" },
      { rank:7,  name:"Dennis Byrd Comeback",      value:"1993",  years:"Walked onto field — moving moment" },
      { rank:8,  name:"Keyshawn's Super Bowl",     value:"1996",  years:"#1 pick transforms offense" },
      { rank:9,  name:"2010 AFC Championship",     value:"2010",  years:"Sanchez leads back-to-back title run" },
      { rank:10, name:"Aaron Rodgers Returns",     value:"2024",  years:"Standing ovation at MetLife" },
    ]},
    { title: "Top 10 Giants Moments", items: [
      { rank:1,  name:"Super Bowl XXI Win",        value:"1987",  years:"LT, Simms, 39–20 vs Broncos" },
      { rank:2,  name:"Super Bowl XXV Win",        value:"1991",  years:"Ottis Anderson MVP, beat Bills" },
      { rank:3,  name:"Super Bowl XLII Win",       value:"2008",  years:"Manning to Tyree — greatest catch ever" },
      { rank:4,  name:"Super Bowl XLVI Win",       value:"2012",  years:"Bradshaw's accidental TD wins it" },
      { rank:5,  name:"The Helmet Catch",          value:"2008",  years:"David Tyree, 4th and 1" },
      { rank:6,  name:"LT's 1986 Season",          value:"1986",  years:"22 sacks, NFL MVP, Defensive POY" },
      { rank:7,  name:"LT Sacks Theismann",        value:"1985",  years:"Nov 18 — broke his leg on MNF" },
      { rank:8,  name:"OBJ's One-Handed Catch",    value:"2014",  years:"vs Cowboys — most viral catch ever" },
      { rank:9,  name:"1958 Championship",         value:"1958",  years:"Greatest game ever played vs Colts" },
      { rank:10, name:"Bavaro Drags Cowboys",      value:"1986",  years:"30 yards on his back — toughness defined" },
    ]},
  ],
  "Greatest NY Moments": [
    { title: "Top 50 Greatest NY Sports Moments of All Time", items: [
      { rank:1,  name:"1969 Mets World Series",         value:"Mets",      years:"Miracle Mets shock the world as 100-1 longshots" },
      { rank:2,  name:"Namath's Guarantee",             value:"Jets",      years:"Super Bowl III — changed the AFL forever" },
      { rank:3,  name:"1994 Rangers Stanley Cup",       value:"Rangers",   years:"54-year curse finally broken at MSG" },
      { rank:4,  name:"The Helmet Catch",               value:"Giants",    years:"Tyree's impossible catch ruins the perfect Patriots" },
      { rank:5,  name:"Reggie Jackson — 3 HRs",        value:"Yankees",   years:"3 HRs on 3 consecutive pitches, 1977 World Series" },
      { rank:6,  name:"Willis Reed Walks Out",          value:"Knicks",    years:"1970 Finals Game 7 — pure electricity at MSG" },
      { rank:7,  name:"Roger Maris — 61st Home Run",   value:"Yankees",   years:"Final day 1961 — breaks Babe Ruth's sacred record" },
      { rank:8,  name:"Don Larsen's Perfect Game",     value:"Yankees",   years:"1956 World Series — the only perfect game ever" },
      { rank:9,  name:"Islanders 4 Straight Cups",     value:"Islanders", years:"1980-83 dynasty — 19 consecutive playoff series wins" },
      { rank:10, name:"Mark Messier's Hat Trick",      value:"Rangers",   years:"Guaranteed Game 6 win vs Devils — then backed it up" },
      { rank:11, name:"Piazza's 9/11 Home Run",        value:"Mets",      years:"Sept 21, 2001 — healed a grieving city" },
      { rank:12, name:"DiMaggio's 56-Game Streak",     value:"Yankees",   years:"Summer 1941 — the unbreakable record" },
      { rank:13, name:"Bob Nystrom OT Goal",           value:"Islanders", years:"1980 Cup Finals OT — started the dynasty" },
      { rank:14, name:"1986 Mets World Series",        value:"Mets",      years:"Buckner's error, Mookie's grounder — unforgettable" },
      { rank:15, name:"Lou Gehrig Farewell Speech",    value:"Yankees",   years:"July 4, 1939 — 'Luckiest man alive'" },
      { rank:16, name:"Giants Super Bowl XLII",        value:"Giants",    years:"18-0 Patriots stopped — greatest upset in Super Bowl history" },
      { rank:17, name:"1998 Yankees — 125 Wins",       value:"Yankees",   years:"Greatest team ever — 114-48 regular season" },
      { rank:18, name:"Babe Ruth Called Shot",         value:"Yankees",   years:"1932 World Series — pointed to center, delivered" },
      { rank:19, name:"Walt Frazier's Game 7",         value:"Knicks",    years:"36 pts, 19 ast — greatest individual Finals game" },
      { rank:20, name:"Devils Win 1995 Stanley Cup",    value:"Devils",    years:"Swept Detroit Red Wings — Brodeur and Stevens usher in NJ dynasty" },
      { rank:21, name:"1977 Yankees World Series",      value:"Yankees",   years:"Reggie's night — Mr. October born" },
      { rank:22, name:"Giants Super Bowl XXI",          value:"Giants",    years:"Phil Simms 22/25 — first Super Bowl title" },
      { rank:23, name:"1970 Knicks Championship",       value:"Knicks",    years:"First title — Reed and Frazier lead the way" },
      { rank:24, name:"Dwight Gooden's 1985 Season",   value:"Mets",      years:"24-4, 1.53 ERA at age 20 — virtually unhittable" },
      { rank:25, name:"Devils Win 2000 Stanley Cup",    value:"Devils",    years:"Scott Stevens destroys Eric Lindros — second Cup cements the dynasty" },
      { rank:26, name:"David Wells Perfect Game",       value:"Yankees",   years:"May 17, 1998 — all 27 Twins retired" },
      { rank:27, name:"1969 Jets Super Bowl III",       value:"Jets",      years:"16-7 win — the upset that validated the AFL" },
      { rank:28, name:"1973 Knicks Championship",       value:"Knicks",    years:"Red Holzman's masterpiece — Monroe and Frazier" },
      { rank:29, name:"LT's 22 Sacks in 1986",         value:"Giants",    years:"NFL MVP — changed how the game is played" },
      { rank:30, name:"Mets 1986 NLCS Game 6",         value:"Mets",      years:"Lenny Dykstra walk-off — Mets survive" },
      { rank:31, name:"Giants Super Bowl XXV",          value:"Giants",    years:"20-19 over Bills — Scott Norwood wide right" },
      { rank:32, name:"Robin Ventura Grand Slam Single",value:"Mets",      years:"1999 NLCS — mobbed before reaching 2nd base" },
      { rank:33, name:"Bossy 50 Goals in 50 Games",    value:"Islanders", years:"1981 — matched Rocket Richard's legendary mark" },
      { rank:34, name:"Jeter's Flip Play",              value:"Yankees",   years:"2001 ALDS — impossible play saved the series" },
      { rank:35, name:"Devils Win 2003 Stanley Cup",    value:"Devils",    years:"Three Cups in nine years — Pat Burns coaches a dynasty to its peak" },
      { rank:36, name:"Seaver Strikes Out 19",          value:"Mets",      years:"April 22, 1970 — 10 consecutive to end the game" },
      { rank:37, name:"Pete Alonso — 53 HR Rookie",    value:"Mets",      years:"2019 — broke the MLB rookie home run record" },
      { rank:38, name:"Jeter's Last Game",              value:"Yankees",   years:"Walk-off single in the final AB of his career" },
      { rank:39, name:"1994 Yankees Strike",            value:"Yankees",   years:"Best record in baseball — season cancelled. Still haunts." },
      { rank:40, name:"Jets' 2009-10 AFC Run",          value:"Jets",      years:"Rex Ryan's Jets reached back-to-back AFC Championship Games" },
      { rank:41, name:"Knicks 1999 — 8 Seed Finals",   value:"Knicks",    years:"Greatest underdog run in NBA Finals history" },
      { rank:42, name:"LT Sacks Theismann",             value:"Giants",    years:"Nov 18, 1985 — changed football forever" },
      { rank:43, name:"Mazeroski HR Breaks Yankee Hearts",value:"Yankees", years:"1960 World Series — outscored 55-27, still lost" },
      { rank:44, name:"David Cone Perfect Game",        value:"Yankees",   years:"July 18, 1999 — Yogi Berra Day. Don Larsen in attendance." },
      { rank:45, name:"Tug McGraw — Ya Gotta Believe",  value:"Mets",     years:"1973 pennant race — a rallying cry forever" },
      { rank:46, name:"Gastineau 22 Sacks",             value:"Jets",      years:"1984 NFL record — so dominant they changed the rules" },
      { rank:47, name:"NY Liberty Win 2025 Title",      value:"Liberty",   years:"WNBA champions — defending their 2023 crown" },
      { rank:48, name:"Islanders Sweep Oilers 1983",    value:"Islanders", years:"Swept Gretzky's powerhouse — 4th consecutive Cup" },
      { rank:49, name:"Mr. November — Jeter's WS HR",  value:"Yankees",   years:"Nov 1, 2001 — walk-off into the midnight Bronx air" },
      { rank:50, name:"NYCFC 2021 MLS Cup",             value:"NYCFC",     years:"First MLS championship for any New York area team" },
    ]},
  ],
  "Trades": [
    { title: "Best Trades in NY Sports History", items: [
      { rank:1,  name:"Yankees Acquire Babe Ruth",        value:"Yankees",    years:"1920 — $100K from Red Sox — cursed Boston for 86 years. Most impactful transaction in sports history." },
      { rank:2,  name:"Mets Acquire Mike Piazza",         value:"Mets",       years:"1998 — from Marlins — greatest hitting catcher of all time transformed the franchise" },
      { rank:3,  name:"Rangers Acquire Mark Messier",     value:"Rangers",    years:"1991 — from Edmonton — brought 5 Cups and ended 54-year drought" },
      { rank:4,  name:"Nets Acquire Jason Kidd",          value:"Nets",       years:"2001 — from Phoenix — single-handedly took NJ to 2 straight NBA Finals" },
      { rank:5,  name:"Yankees Sign Reggie Jackson",      value:"Yankees",    years:"1977 — 5-year $2.96M deal — Mr. October delivers two World Series" },
      { rank:6,  name:"Giants Acquire Y.A. Tittle",       value:"Giants",     years:"1961 — from 49ers — threw 36 TDs in 1963, best QB era in Giants history" },
      { rank:7,  name:"Yankees Acquire Roger Maris",      value:"Yankees",    years:"1959 — from Kansas City — 61 HR in 1961, World Series titles" },
      { rank:8,  name:"Mets Trade for Keith Hernandez",   value:"Mets",       years:"1983 — from Cardinals — defensive anchor and captain of the 1986 champions" },
      { rank:9,  name:"Rangers Acquire Wayne Gretzky (almost)", value:"Rangers", years:"2004 trade — Gretzky came as GM, not player — but raised the franchise's profile" },
      { rank:10, name:"Islanders Draft Denis Potvin #1",  value:"Islanders",  years:"1973 — most consequential draft pick in Islanders history — 4 Cups" },
    ]},
    { title: "Worst Trades in NY Sports History", items: [
      { rank:1,  name:"Red Sox Sell Babe Ruth to Yankees",   value:"Red Sox",   years:"1920 — $100K cash loan — cursed themselves for 86 years. The worst deal in sports history." },
      { rank:2,  name:"Islanders Let John Tavares Walk",     value:"Islanders", years:"2018 — lost franchise star to Toronto in free agency — broke Long Island's heart" },
      { rank:3,  name:"Rangers Trade Rick Middleton for Ken Hodge", value:"Rangers", years:"1976 — Middleton became a star in Boston, Hodge was finished — criminal trade" },
      { rank:4,  name:"Nets Lose Julius Erving for Merger Fee", value:"Nets",   years:"1976 — sold Dr. J to 76ers to pay ABA-NBA merger fee — lost the greatest player in franchise history" },
      { rank:5,  name:"Knicks Trade Carmelo Anthony (Poorly)", value:"Knicks", years:"2017 — received almost nothing of value in return for a franchise star" },
      { rank:6,  name:"Mets Sign Bobby Bonilla Deferred Deal", value:"Mets",   years:"1999 — $1.19M per year through 2035 for a player not on the team. Every July 1." },
      { rank:7,  name:"Jets Miss Dan Marino — Take Ken O'Brien", value:"Jets",  years:"1983 — Marino fell to Miami at #27 while Jets took QB Ken O'Brien at #24" },
      { rank:8,  name:"Knicks Trade Kristaps Porzingis",    value:"Knicks",    years:"2019 — sent The Unicorn to Dallas — Dallas won the trade significantly" },
      { rank:9,  name:"Islanders Sign Rick DiPietro 15 Years", value:"Islanders", years:"2006 — $67.5M for 15 years — DiPietro played only 301 games. Worst contract in NHL history." },
      { rank:10, name:"Giants Pick Ron Dayne #1 Overall",   value:"Giants",    years:"2000 — Heisman Trophy winner never replicated college dominance in the NFL" },
    ]},
    { title: "Greatest Draft Steals in NY Sports History", items: [
      { rank:1,  name:"Yankees Draft Mariano Rivera",      value:"Yankees",    years:"1990 — 13th round — became the greatest closer in baseball history" },
      { rank:2,  name:"Mets Draft Tom Seaver (Commissioner's Choice)", value:"Mets", years:"1966 — lottery pick after college deal voided — Seaver became the greatest Met ever" },
      { rank:3,  name:"Giants Draft Lawrence Taylor #2",   value:"Giants",     years:"1981 — greatest defensive player in NFL history, right there at #2" },
      { rank:4,  name:"Rangers Draft Brian Leetch #9",     value:"Rangers",    years:"1986 — greatest American player in NHL history, American all-time scoring leader" },
      { rank:5,  name:"Islanders Draft Mike Bossy #15",    value:"Islanders",  years:"1977 — 14 teams passed — Bossy scored 573 goals in 10 seasons" },
      { rank:6,  name:"Yankees Draft Derek Jeter #6",      value:"Yankees",    years:"1992 — The Captain. 5 World Series rings. 3,465 hits." },
      { rank:7,  name:"Rangers Draft Rod Gilbert — 5th round", value:"Rangers", years:"1960 — 5th round — became the franchise's all-time leading scorer for decades" },
      { rank:8,  name:"Knicks Draft Walt Frazier #5",      value:"Knicks",     years:"1967 — two NBA championships, the most stylish Knick ever" },
      { rank:9,  name:"Mets Sign Free Agent Gary Carter",  value:"Mets",       years:"1984 — signed The Kid — he was the missing piece for the 1986 championship" },
      { rank:10, name:"Devils Draft Martin Brodeur #20",   value:"Devils",     years:"1990 — 20th pick — became the all-time NHL leader in wins, shutouts, and games" },
    ]},
  ],
};

// ─── HISTORY TAB ──────────────────────────────────────────────────────────
function HistoryTab() {
  const [activeGroup, setActiveGroup]   = useState("Greatest NY Moments");
  const [activeList, setActiveList]     = useState(0);
  const [histView, setHistView]         = useState("lists"); // "lists" | "stadiums" | "bios"
  const [momentFilter, setMomentFilter] = useState("ALL");
  const groups = Object.keys(HISTORY_LISTS);
  const lists  = HISTORY_LISTS[activeGroup] || [];
  const list   = lists[activeList] || lists[0];

  const MOMENT_TEAMS = ["ALL","Yankees","Mets","Jets","Giants","Knicks","Rangers","Islanders","Devils","Nets","Liberty","NYCFC"];

  const filteredItems = activeGroup === "Greatest NY Moments" && momentFilter !== "ALL"
    ? (list?.items || []).filter(item => item.value === momentFilter)
    : (list?.items || []);

  return (
    <div style={styles.histRoot}>
      <div style={styles.stdHeader}>
        <h2 style={styles.stdTitle}>🏆 NY SPORTS HISTORY</h2>
        <p style={styles.stdSub}>ALL-TIME LISTS · GREATEST MOMENTS · STADIUMS · LEGENDS</p>
      </div>

      {/* Mode toggle */}
      <div style={{display:"flex", gap:8, marginBottom:16, flexWrap:"wrap"}}>
        <button onClick={() => setHistView("lists")}
          style={{...styles.filterBtn, ...(histView==="lists" ? styles.filterBtnActive : {})}}>
          🏆 ALL-TIME LISTS
        </button>
        <button onClick={() => setHistView("stadiums")}
          style={{...styles.filterBtn, ...(histView==="stadiums" ? styles.filterBtnActive : {})}}>
          🏟️ STADIUM HISTORY
        </button>
        <button onClick={() => setHistView("bios")}
          style={{...styles.filterBtn, ...(histView==="bios" ? styles.filterBtnActive : {})}}>
          ⭐ LEGENDS & BIOS
        </button>
      </div>

      {/* STADIUM VIEW */}
      {histView==="stadiums" && (
        <div style={styles.stadiumGrid}>
          {STADIUM_HISTORY.map((s, i) => (
            <div key={i} style={styles.stadiumCard}>
              <div style={styles.stadiumEmoji}>{s.emoji}</div>
              <div style={styles.stadiumBody}>
                <div style={styles.stadiumName}>{s.name}</div>
                <div style={styles.stadiumMeta}>
                  <span style={styles.stadiumTeam}>{s.team}</span>
                  <span style={styles.stadiumYears}>{s.years}</span>
                  {s.capacity !== "N/A" && <span style={styles.stadiumCap}>Cap: {s.capacity}</span>}
                </div>
                <div style={styles.stadiumLocation}>📍 {s.location}</div>
                <p style={styles.stadiumNote}>{s.note}</p>
                <SearchLinks query={`${s.name} New York sports history`} />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ALL-TIME LISTS VIEW */}
      {histView==="lists" && (
        <>
          {/* Team group selector */}
          <div style={{...styles.filterGroup, flexWrap:"wrap", marginBottom:12}}>
            {groups.map(g => (
              <button key={g} onClick={() => { setActiveGroup(g); setActiveList(0); }}
                style={{...styles.filterBtn, ...(activeGroup===g ? styles.filterBtnActive : {})}}>
                {g}
              </button>
            ))}
          </div>

      {/* List selector within group */}
      {lists.length > 1 && (
        <div style={{...styles.filterGroup, flexWrap:"wrap", marginBottom:8}}>
          {lists.map((l, i) => (
            <button key={i} onClick={() => setActiveList(i)}
              style={{...styles.filterBtn, fontSize:9, ...(activeList===i ? styles.filterBtnActive : {})}}>
              {l.title.replace("All-Time ","").replace("Top 10 ","").replace("Greatest ","").slice(0,30)}
            </button>
          ))}
        </div>
      )}

      {/* Team filter for Greatest NY Moments */}
      {activeGroup === "Greatest NY Moments" && (
        <div style={{...styles.filterGroup, flexWrap:"wrap", marginBottom:12, paddingBottom:8, borderBottom:"1px solid #2a2a2a"}}>
          <span style={{fontSize:9, color:"#555", letterSpacing:"0.1em", alignSelf:"center", flexShrink:0}}>FILTER BY TEAM:</span>
          {MOMENT_TEAMS.map(t => (
            <button key={t} onClick={() => setMomentFilter(t)}
              style={{...styles.filterBtn, ...(momentFilter===t ? styles.filterBtnActive : {}), fontSize:9}}>
              {t}
            </button>
          ))}
        </div>
      )}

      {/* List display */}
      {list && (
        <div style={styles.histList}>
          <div style={styles.histListHeader}>
            <span style={styles.histListTitle}>{list.title}{momentFilter !== "ALL" && activeGroup === "Greatest NY Moments" ? ` — ${momentFilter}` : ""}</span>
            <SearchLinks query={`${list.title} New York sports`} />
          </div>
          {filteredItems.map((item, i) => (
            <div key={i} style={{...styles.histRow, ...(i%2===0?{}:styles.histRowAlt), ...(i===0?styles.histRowFirst:{})}}>
              <div style={{...styles.histRank, ...(i===0?styles.histRankFirst:i===1?styles.histRankSecond:i===2?styles.histRankThird:{})}}>
                {i===0?"🥇":i===1?"🥈":i===2?"🥉":item.rank}
              </div>
              <div style={styles.histInfo}>
                <span style={styles.histName}>{item.name}</span>
                <span style={styles.histYears}>{item.years}</span>
                <div style={styles.histLinks}>
                  <a href={googleUrl(`${item.name} ${activeGroup} New York sports`)} target="_blank" rel="noopener noreferrer" style={styles.histLink}>🔍 Google</a>
                  <a href={wikiUrl(`${item.name} ${activeGroup}`)} target="_blank" rel="noopener noreferrer" style={styles.histLink}>📖 Wiki</a>
                </div>
              </div>
              <div style={styles.histValue}>{item.value}</div>
            </div>
          ))}
        </div>
      )}
        </>
      )}

      {/* BIOS VIEW */}
      {histView === "bios" && (
        <div>
          <div style={{marginBottom:16, padding:"10px 14px", background:"#161616", borderLeft:"3px solid #c8201c"}}>
            <p style={{margin:0, fontSize:12, color:"#aaa"}}>The legends who defined NY sports — click any name for their full biography, books, and more.</p>
          </div>
          {DAILY_PLAYERS.map((p, i) => (
            <div key={i} style={{...styles.bioRow, ...(i%2===0?{}:{background:"#0f0f0f"})}}>
              <div style={styles.bioEmoji}>{p.emoji}</div>
              <div style={styles.bioInfo}>
                <div style={styles.bioHeader}>
                  <span style={styles.bioName}>{p.name}</span>
                  <span style={styles.bioTeam}>{p.team}</span>
                  <span style={styles.bioYears}>{p.era}</span>
                  <span style={styles.bioRole}>#{p.number} · {p.pos}</span>
                  {p.active && <span style={{fontSize:9, color:"#4ade80", fontWeight:900}}>● ACTIVE</span>}
                </div>
                <p style={styles.bioBio}>{p.fact}</p>
                <div style={styles.bioStats}>{p.stats}</div>
                <div style={styles.bioLinks}>
                  <a href={p.wiki} target="_blank" rel="noopener noreferrer" style={styles.histLink}>📖 Wikipedia</a>
                  <a href={googleUrl(`${p.name} ${p.team} career stats`)} target="_blank" rel="noopener noreferrer" style={styles.histLink}>🔍 Google</a>
                  <a href={`https://www.amazon.com/s?k=${encodeURIComponent(p.name+" biography")}&tag=nysportsdaily-20`} target="_blank" rel="noopener noreferrer" style={styles.histLink}>📚 Books</a>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── TODAY IN NY SPORTS ───────────────────────────────────────────────────
// ─── SITE SEARCH ──────────────────────────────────────────────────────────
function SiteSearch({ query, onSelect }) {
  const q = query.toLowerCase().trim();

  // Build search index from all site content
  const results = [];

  // Search DAILY_PLAYERS
  DAILY_PLAYERS.forEach(p => {
    const text = `${p.name} ${p.team} ${p.pos} ${p.era} ${p.stats} ${p.fact}`.toLowerCase();
    if (text.includes(q)) results.push({
      type: "PLAYER SPOTLIGHT", icon: p.emoji,
      title: p.name,
      sub: `${p.team} · ${p.pos} · ${p.era}`,
      tab: "SCORES",
      highlight: p.stats.slice(0, 60),
    });
  });

  // Search TODAY_IN_NY_SPORTS
  TODAY_IN_NY_SPORTS.forEach(m => {
    const text = `${m.title} ${m.desc} ${m.team} ${m.year}`.toLowerCase();
    if (text.includes(q)) results.push({
      type: "ON THIS DATE", icon: m.emoji,
      title: m.title,
      sub: `${m.team} · ${m.month}/${m.day}/${m.year}`,
      tab: "THIS DATE",
      highlight: m.desc.slice(0, 80),
    });
  });

  // Search NY_QUOTES
  NY_QUOTES.forEach(qt => {
    const text = `${qt.quote} ${qt.author} ${qt.team}`.toLowerCase();
    if (text.includes(q)) results.push({
      type: "QUOTE", icon: "💬",
      title: `"${qt.quote.slice(0, 60)}..."`,
      sub: `— ${qt.author} · ${qt.team}`,
      tab: "SCORES",
      highlight: qt.author,
    });
  });

  // Search HOF_DATA
  Object.entries(HOF_DATA).forEach(([team, players]) => {
    players.forEach(p => {
      const text = `${p.name} ${team} ${p.pos} ${p.note}`.toLowerCase();
      if (text.includes(q)) results.push({
        type: "HALL OF FAME", icon: "🏛️",
        title: p.name,
        sub: `${team} · ${p.pos}${p.inducted ? ` · Inducted ${p.inducted}` : ""}`,
        tab: "HOF",
        highlight: p.note,
      });
    });
  });

  // Search ALL_POLLS
  ALL_POLLS.forEach(p => {
    const text = `${p.question} ${p.options.join(" ")}`.toLowerCase();
    if (text.includes(q)) results.push({
      type: "POLL", icon: "🗳️",
      title: p.question,
      sub: p.options.join(" · ").slice(0, 60),
      tab: "POLLS",
      highlight: "",
    });
  });

  // Search HISTORY_LISTS
  Object.entries(HISTORY_LISTS).forEach(([category, lists]) => {
    lists.forEach(list => {
      if (list.title.toLowerCase().includes(q)) {
        results.push({
          type: "HISTORY LIST", icon: "📋",
          title: list.title,
          sub: `Category: ${category}`,
          tab: "HISTORY",
          highlight: "",
        });
      }
      (list.items || []).forEach(item => {
        const text = `${item.name} ${item.value} ${item.years}`.toLowerCase();
        if (text.includes(q)) results.push({
          type: "HISTORY", icon: "📊",
          title: item.name,
          sub: `${list.title} · ${item.value}`,
          tab: "HISTORY",
          highlight: item.years,
        });
      });
    });
  });

  // Search STADIUM_HISTORY
  STADIUM_HISTORY.forEach(s => {
    const text = `${s.name} ${s.team} ${s.note} ${s.location}`.toLowerCase();
    if (text.includes(q)) results.push({
      type: "STADIUM", icon: "🏟️",
      title: s.name,
      sub: `${s.team} · ${s.years} · ${s.location}`,
      tab: "HISTORY",
      highlight: s.note.slice(0, 80),
    });
  });

  // Search AWARDS data inline
  const AWARDS_INLINE = [
    { award:"Cy Young", winner:"Gerrit Cole", team:"Yankees", year:2023 },
    { award:"Cy Young", winner:"Jacob deGrom", team:"Mets", year:2019 },
    { award:"Cy Young", winner:"Jacob deGrom", team:"Mets", year:2018 },
    { award:"Cy Young", winner:"Dwight Gooden", team:"Mets", year:1985 },
    { award:"Cy Young", winner:"Ron Guidry", team:"Yankees", year:1978 },
    { award:"Cy Young", winner:"Tom Seaver", team:"Mets", year:1975 },
    { award:"Cy Young", winner:"Tom Seaver", team:"Mets", year:1973 },
    { award:"Cy Young", winner:"Tom Seaver", team:"Mets", year:1969 },
    { award:"Cy Young", winner:"Whitey Ford", team:"Yankees", year:1961 },
    { award:"AL MVP", winner:"Aaron Judge", team:"Yankees", year:2022 },
    { award:"AL MVP", winner:"Don Mattingly", team:"Yankees", year:1985 },
    { award:"AL MVP", winner:"Mickey Mantle", team:"Yankees", year:1956 },
    { award:"NFL MVP", winner:"Lawrence Taylor", team:"Giants", year:1986 },
    { award:"Super Bowl MVP", winner:"Joe Namath", team:"Jets", year:1969 },
    { award:"Super Bowl MVP", winner:"Phil Simms", team:"Giants", year:1987 },
    { award:"Super Bowl MVP", winner:"Eli Manning", team:"Giants", year:2008 },
    { award:"Super Bowl MVP", winner:"Eli Manning", team:"Giants", year:2012 },
    { award:"Conn Smythe", winner:"Brian Leetch", team:"Rangers", year:1994 },
    { award:"Conn Smythe", winner:"Scott Stevens", team:"Devils", year:2000 },
    { award:"Vezina Trophy", winner:"Henrik Lundqvist", team:"Rangers", year:2012 },
    { award:"Hart Trophy", winner:"Bryan Trottier", team:"Islanders", year:1979 },
    { award:"NL ROY", winner:"Pete Alonso", team:"Mets", year:2019 },
    { award:"AL ROY", winner:"Derek Jeter", team:"Yankees", year:1996 },
    { award:"WNBA MVP", winner:"Breanna Stewart", team:"Liberty", year:2023 },
  ];
  AWARDS_INLINE.forEach(a => {
    const text = `${a.award} ${a.winner} ${a.team} ${a.year} award`.toLowerCase();
    if (text.includes(q)) results.push({
      type: "AWARD", icon: "🏅",
      title: `${a.year} ${a.award} — ${a.winner}`,
      sub: `${a.team}`,
      tab: "AWARDS",
      highlight: "",
    });
  });

  // Search Radio stations + podcasts inline
  const RADIO_INLINE = [
    { name:"WFAN 101.9 FM", desc:"NY's flagship sports station — Yankees, Mets, Giants, Jets, Knicks, Rangers", url:"https://www.audacy.com/wfan" },
    { name:"ESPN NY 98.7 FM", desc:"ESPN radio New York — all sports coverage", url:"https://www.espn.com/espnradio/play/_/id/14978946" },
    { name:"YES Network", desc:"Yankees radio and TV home", url:"https://www.yesnetwork.com/" },
    { name:"SNY Radio", desc:"Mets radio home — also covers NY sports broadly", url:"https://sny.tv/" },
    { name:"MSG Networks", desc:"Knicks and Rangers radio home", url:"https://www.msgnetworks.com/" },
    { name:"Mike Francesa", desc:"WFAN legend — the voice of NY sports radio for decades", url:"https://www.audacy.com/wfan" },
    { name:"Mike and the Mad Dog", desc:"Greatest sports radio show in NY history — Francesa and Russo on WFAN", url:"https://www.audacy.com/wfan" },
    { name:"Yankees podcast", desc:"Official New York Yankees podcast", url:"https://www.mlb.com/yankees/fans/podcast" },
    { name:"Mets podcast", desc:"Official New York Mets podcast", url:"https://www.mlb.com/mets/fans/podcast" },
    { name:"Rangers podcast", desc:"Official NY Rangers Hockey Central podcast", url:"https://www.nhl.com/rangers/multimedia/podcasts" },
    { name:"Audacy", desc:"Free streaming for WFAN and all NY sports radio on iOS and Android", url:"https://www.audacy.com/wfan" },
    { name:"TuneIn", desc:"Free streaming for WFAN live radio", url:"https://tunein.com" },
    { name:"WGBB 1240 AM", desc:"Long Island sports radio", url:"https://www.wgbb.com" },
  ];
  RADIO_INLINE.forEach((r, i) => {
    const text = `${r.name} ${r.desc} radio podcast`.toLowerCase();
    if (text.includes(q)) results.push({
      type: "RADIO / PODCAST", icon: "📻",
      title: r.name,
      sub: r.desc,
      tab: "RADIO",
      highlight: "",
    });
  });

  // Search Beat Writers inline
  const BEAT_WRITERS_INLINE = [
    { name:"Zack Rosenblatt", outlet:"The Athletic", teams:"Jets", handle:"@ZackBlatt" },
    { name:"Brian Costello", outlet:"NY Post", teams:"Jets", handle:"@BrianCoz" },
    { name:"Rich Cimini", outlet:"ESPN", teams:"Jets", handle:"@RichCimini" },
    { name:"Joe Caporoso", outlet:"Badlands", teams:"Jets", handle:"@JoeCaporoso" },
    { name:"Connor Rogers", outlet:"NBC Sports", teams:"Jets NFL Draft", handle:"@ConnorJRogers" },
    { name:"Joel Sherman", outlet:"NY Post", teams:"Yankees MLB", handle:"@Joelsherman1" },
    { name:"Jon Heyman", outlet:"NY Post", teams:"MLB Yankees", handle:"@JonHeyman" },
    { name:"Bryan Hoch", outlet:"MLB.com", teams:"Yankees", handle:"@BryanHoch" },
    { name:"Andy Martino", outlet:"SNY", teams:"Mets Yankees", handle:"@martinonyc" },
    { name:"Anthony DiComo", outlet:"MLB.com", teams:"Mets", handle:"@AnthonyDiComo" },
    { name:"Jordan Raanan", outlet:"ESPN", teams:"Giants", handle:"@JordanRaanan" },
    { name:"Ralph Vacchiano", outlet:"FOX Sports", teams:"Giants", handle:"@RVacchianoSNY" },
    { name:"Ian Begley", outlet:"SNY", teams:"Knicks", handle:"@IanBegley" },
    { name:"Marc Berman", outlet:"NY Post", teams:"Knicks", handle:"@NYPost_Berman" },
    { name:"Mollie Walker", outlet:"NY Post", teams:"Rangers", handle:"@MollieeWalkerr" },
    { name:"Andrew Gross", outlet:"Newsday", teams:"Islanders", handle:"@AGrossNewsday" },
    { name:"Stefen Rosner", outlet:"The Hockey News", teams:"Islanders", handle:"@SRosner91" },
    { name:"Amanda Stein", outlet:"Devils", teams:"Devils", handle:"@AmandaCStein" },
    { name:"Howie Kussoy", outlet:"NY Post", teams:"All NY", handle:"@HowieKussoy" },
    { name:"Vince Mercogliano", outlet:"USA Today", teams:"Rangers", handle:"@vzmercogliano" },
  ];
  BEAT_WRITERS_INLINE.forEach((w, i) => {
    const text = `${w.name} ${w.outlet} ${w.teams} ${w.handle} beat writer reporter`.toLowerCase();
    if (text.includes(q)) results.push({
      type: "BEAT WRITER", icon: "🐦",
      title: w.name,
      sub: `${w.outlet} · ${w.teams} · ${w.handle}`,
      tab: "NEWS",
      highlight: "Follow on X/Twitter — click NEWS → Beat Writers",
    });
  });

  // Search Almost Forgotten players inline
  const FORGOTTEN_INLINE = [
    { name:"John Olerud", team:"Mets", note:"Hit .354 in 1998 — best average by a Met since 1969" },
    { name:"Tommy John", team:"Yankees", note:"Tommy John surgery named after him — 21-9 as a Yankee" },
    { name:"Dave Righetti", team:"Yankees", note:"No-hit Red Sox on July 4 1983 — 46 saves in 1986" },
    { name:"Willie Randolph", team:"Yankees", note:"Heart of the 70s dynasty — criminally overlooked for HOF" },
    { name:"Cleon Jones", team:"Mets", note:"Hit .340 in 1969 — caught final out of World Series" },
    { name:"Al Leiter", team:"Mets", note:"2000 Subway Series ace — wild card clincher masterpiece" },
    { name:"John Franco", team:"Mets", note:"All-time NL saves leader when he retired — Queens kid" },
    { name:"Edgardo Alfonzo", team:"Mets", note:"Hit .324 in 2000 — best all-around Met of late 90s" },
    { name:"Lenny Dykstra", team:"Mets", note:"Nails — scrappiest leadoff man of his era" },
    { name:"Otis Anderson", team:"Giants", note:"Super Bowl XXV MVP at age 34 — 102 rushing yards" },
    { name:"Joe Klecko", team:"Jets", note:"Only player Pro Bowled at 3 different positions" },
    { name:"Kerry Kittles", team:"Nets", note:"Building block of the Jason Kidd Finals teams" },
    { name:"Bernard King", team:"Knicks", note:"Scored 60 points at MSG in 1984 — unstoppable" },
    { name:"Bob Nystrom", team:"Islanders", note:"OT goal that won the first Stanley Cup — 1980" },
    { name:"Butch Goring", team:"Islanders", note:"Missing piece — Conn Smythe 1980" },
    { name:"Ron Guidry", team:"Yankees", note:"25-3 in 1978 — Louisiana Lightning" },
    { name:"Rod Gilbert", team:"Rangers", note:"All-time Rangers scoring leader — first number retired" },
    { name:"Patrik Elias", team:"Devils", note:"All-time Devils scoring leader — 1,025 career points" },
    { name:"Ken Daneyko", team:"Devils", note:"Mr. Devil — all 1,283 games in a Devils uniform" },
    { name:"Chris Chambliss", team:"Yankees", note:"Pennant-clinching HR in 1976 — fans stormed the field" },
  ];
  FORGOTTEN_INLINE.forEach((p, i) => {
    const text = `${p.name} ${p.team} ${p.note} forgotten overlooked`.toLowerCase();
    if (text.includes(q)) results.push({
      type: "ALMOST FORGOTTEN", icon: "🕯️",
      title: p.name,
      sub: p.team,
      tab: "FORGOTTEN",
      highlight: p.note,
    });
  });

  // Search Misery Index teams
  const MISERY_INLINE = [
    { team:"Jets", score:98, title:"DEFCON 1 — 56 years without a Super Bowl" },
    { team:"Knicks", score:91, title:"CHRONIC HEARTBREAK — 52 years without a title" },
    { team:"Mets", score:85, title:"HIGH SUFFERING — 40 years without a World Series" },
    { team:"Rangers", score:72, title:"ELEVATED SUFFERING — 1994 was the last Cup" },
    { team:"Giants", score:65, title:"MODERATE SUFFERING — 4 Super Bowls but recent drought" },
    { team:"Islanders", score:62, title:"MODERATE SUFFERING — 43 years since dynasty ended" },
    { team:"Nets", score:74, title:"DEEP SUFFERING — never won an NBA title in any city" },
    { team:"Yankees", score:35, title:"BASELINE SUFFERING — 27 titles but 17-year drought" },
    { team:"Devils", score:22, title:"SURPRISINGLY MANAGEABLE — 3 Cups in 9 years" },
    { team:"Liberty", score:15, title:"REIGNING CHAMPIONS — back-to-back WNBA titles" },
  ];
  MISERY_INLINE.forEach((m, i) => {
    const text = `${m.team} misery index suffering drought heartbreak ${m.title}`.toLowerCase();
    if (text.includes(q)) results.push({
      type: "MISERY INDEX", icon: "😩",
      title: `${m.team} — Score: ${m.score}/100`,
      sub: m.title,
      tab: "MISERY",
      highlight: "",
    });
  });

  // Search Walk-up Songs
  const WALKUP_INLINE = [
    { player:"Mariano Rivera", song:"Enter Sandman", artist:"Metallica", team:"Yankees" },
    { player:"Derek Jeter", song:"Empire State of Mind", artist:"Jay-Z Alicia Keys", team:"Yankees" },
    { player:"Aaron Judge", song:"Swag Surfin", artist:"FLY", team:"Yankees" },
    { player:"Jazz Chisholm", song:"Various 2026", artist:"Various", team:"Yankees" },
    { player:"Ben Rice", song:"Feel Good Inc", artist:"Gorillaz", team:"Yankees" },
    { player:"Francisco Lindor", song:"My Girl", artist:"The Temptations", team:"Mets" },
    { player:"Francisco Lindor", song:"Ain't No Mountain High Enough", artist:"Marvin Gaye Tammi Terrell", team:"Mets" },
    { player:"Juan Soto", song:"Empire State of Mind", artist:"Jay-Z Alicia Keys", team:"Mets" },
    { player:"Juan Soto", song:"Yo Soy Dominicano", artist:"Leo RD Dilon Baby", team:"Mets" },
    { player:"David Wright", song:"New York Groove", artist:"Ace Frehley KISS", team:"Mets" },
    { player:"Carlos Beltran", song:"Fuego", artist:"Pitbull", team:"Mets" },
    { player:"Henrik Lundqvist", song:"Welcome to the Jungle", artist:"Guns N Roses", team:"Rangers" },
    { player:"Mark Messier", song:"We Are the Champions", artist:"Queen", team:"Rangers" },
    { player:"Patrick Ewing", song:"Welcome to the Terrordome", artist:"Public Enemy", team:"Knicks" },
    { player:"Curtis Martin", song:"Can't Stop Won't Stop", artist:"Young Jeezy", team:"Jets" },
    { player:"Gary Sheffield", song:"We're Not Gonna Take It", artist:"Twisted Sister", team:"Yankees" },
    { player:"Mike Piazza", song:"crowd roar 9/11", artist:"Shea Stadium", team:"Mets" },
    { player:"Joe Namath", song:"New York New York", artist:"Frank Sinatra", team:"Jets" },
  ];
  WALKUP_INLINE.forEach((s, i) => {
    const text = `${s.player} ${s.song} ${s.artist} ${s.team} walkup walk-up entrance music song`.toLowerCase();
    if (text.includes(q)) results.push({
      type: "WALK-UP SONG", icon: "🎵",
      title: `${s.player} — "${s.song}"`,
      sub: `${s.artist} · ${s.team}`,
      tab: "SONGS & FACTS",
      highlight: "Find in SPIN tab → Walk-Up Songs section",
    });
  });

  // Search Fan Communities / Sites inline
  const SITES_INLINE = [
    { name:"Badlands / Jets X-Factor", url:"jetsxfactor.com", teams:"Jets", desc:"Joe Caporoso's Jets fan community and podcast" },
    { name:"Pinstripe Alley", teams:"Yankees", desc:"SB Nation Yankees blog" },
    { name:"Amazin Avenue", teams:"Mets", desc:"SB Nation Mets community" },
    { name:"Gang Green Nation", teams:"Jets", desc:"SB Nation Jets blog" },
    { name:"Big Blue View", teams:"Giants", desc:"SB Nation Giants blog" },
    { name:"Posting and Toasting", teams:"Knicks", desc:"SB Nation Knicks community" },
    { name:"Blueshirt Banter", teams:"Rangers", desc:"SB Nation Rangers blog" },
    { name:"Lighthouse Hockey", teams:"Islanders", desc:"SB Nation Islanders blog" },
    { name:"All About The Jersey", teams:"Devils", desc:"SB Nation Devils blog" },
    { name:"r/NYYankees", teams:"Yankees", desc:"Yankees Reddit community — 185K members" },
    { name:"r/NewYorkMets", teams:"Mets", desc:"Mets Reddit community" },
    { name:"r/nyjets", teams:"Jets", desc:"Jets Reddit community" },
    { name:"r/NYKnicks", teams:"Knicks", desc:"Knicks Reddit community — 385K members" },
    { name:"r/rangers", teams:"Rangers", desc:"Rangers Reddit community" },
    { name:"r/NewYorkIslanders", teams:"Islanders", desc:"Islanders Reddit community" },
    { name:"r/devils", teams:"Devils", desc:"Devils Reddit community" },
    { name:"SNY", teams:"Mets Yankees", desc:"SNY.tv — best NY baseball coverage" },
    { name:"YES Network", teams:"Yankees", desc:"Yankees official network" },
    { name:"MSG Networks", teams:"Knicks Rangers", desc:"Knicks and Rangers home" },
  ];
  SITES_INLINE.forEach((s, i) => {
    const text = `${s.name} ${s.teams} ${s.desc} community site blog reddit fan`.toLowerCase();
    if (text.includes(q)) results.push({
      type: "FAN COMMUNITY", icon: "💬",
      title: s.name,
      sub: s.teams,
      tab: "NEWS",
      highlight: s.desc,
    });
  });

  // Search Shop categories inline
  const SHOP_INLINE = [
    { title:"Yankees gear jerseys", desc:"Pinstripes, hats, signed memorabilia", tab:"SHOP" },
    { title:"Mets gear jerseys", desc:"Mets hats, throwbacks, Pete Alonso", tab:"SHOP" },
    { title:"Jets gear jerseys", desc:"Gang green gear and throwbacks", tab:"SHOP" },
    { title:"Giants gear jerseys", desc:"Big Blue — LT era throwbacks", tab:"SHOP" },
    { title:"Knicks gear jerseys", desc:"MSG gear, Ewing throwbacks, Brunson", tab:"SHOP" },
    { title:"Rangers gear jerseys hockey", desc:"Broadway Blues — 1994 champs gear", tab:"SHOP" },
    { title:"Islanders dynasty jerseys", desc:"Bossy, Trottier, Potvin throwbacks", tab:"SHOP" },
    { title:"Devils gear hockey", desc:"Brodeur, Stevens — NJ Devils shop", tab:"SHOP" },
    { title:"vintage throwback jerseys", desc:"Classic NY team throwbacks — all teams", tab:"SHOP" },
    { title:"signed memorabilia autograph", desc:"Authenticated NY sports autographs", tab:"SHOP" },
    { title:"books NY sports history", desc:"NY sports books — history, biographies, coaching", tab:"SHOP" },
    { title:"kids books children", desc:"NY sports books for the next generation", tab:"SHOP" },
    { title:"yankee stadium tour tickets", desc:"Stadium tours and live game tickets", tab:"SHOP" },
    { title:"madison square garden MSG tour", desc:"MSG Knicks Rangers tours", tab:"SHOP" },
    { title:"Bethpage Black tee time golf", desc:"Play where Tiger won — public course", tab:"SHOP" },
    { title:"bar signs home decor man cave", desc:"NY sports themed home and bar decor", tab:"SHOP" },
  ];
  SHOP_INLINE.forEach((s, i) => {
    const text = `${s.title} ${s.desc} buy shop gear`.toLowerCase();
    if (text.includes(q)) results.push({
      type: "SHOP", icon: "🛒",
      title: s.title,
      sub: s.desc,
      tab: "SHOP",
      highlight: "",
    });
  });

  // Team shortcuts — searching a team name brings multiple relevant results
  const TEAM_MAP = [
    { keywords:["yankees","yankee","bronx","pinstripes"],                    team:"Yankees",   icon:"⚾", radio:"YES Network / WFAN 101.9", site:"yesnetwork.com" },
    { keywords:["mets","queens","flushing","amazins","citi field"],          team:"Mets",      icon:"⚾", radio:"SNY / WFAN 101.9",         site:"sny.tv" },
    { keywords:["jets","gang green","namath","revis","metlife"],             team:"Jets",      icon:"🏈", radio:"WFAN 101.9 / ESPN 98.7",   site:"newyorkjets.com" },
    { keywords:["giants","big blue","eli","lawrence taylor","meadowlands"],  team:"Giants",    icon:"🏈", radio:"WFAN 101.9 / ESPN 98.7",   site:"giants.com" },
    { keywords:["knicks","garden","msg","brunson","ewing","madison square"], team:"Knicks",    icon:"🏀", radio:"MSG Networks / ESPN 98.7",  site:"nba.com/knicks" },
    { keywords:["nets","brooklyn","barclays","kidd","dr j","julius erving"],  team:"Nets",     icon:"🏀", radio:"YES Network / ESPN 98.7",   site:"nba.com/nets" },
    { keywords:["rangers","broadway blues","lundqvist","leetch","messier"],  team:"Rangers",   icon:"🏒", radio:"MSG Networks / 98.7 ESPN",  site:"nhl.com/rangers" },
    { keywords:["islanders","isles","potvin","bossy","ubs arena","schaefer"],team:"Islanders", icon:"🏒", radio:"ESPN 98.7 / MSG+",          site:"nhl.com/islanders" },
    { keywords:["devils","brodeur","stevens","prudential","newark","hughes"],team:"Devils",    icon:"🏒", radio:"ESPN 98.7 / WFAN",          site:"nhl.com/devils" },
    { keywords:["liberty","wnba","stewart","ionescu","women","breanna"],     team:"Liberty",   icon:"🏀", radio:"ESPN NY 98.7",               site:"wnba.com/liberty" },
  ];
  TEAM_MAP.forEach(s => {
    if (s.keywords.some(kw => q.includes(kw) || kw.includes(q))) {
      // News hub
      results.unshift({ type:"TEAM HUB", icon:s.icon,
        title:`${s.team} — News, Beat Writers & More`,
        sub:"Latest news · beat writers · Reddit · fan sites",
        tab:"NEWS", highlight:"" });
      // Radio
      results.push({ type:"RADIO / PODCAST", icon:"📻",
        title:`${s.team} on the Radio`,
        sub:s.radio,
        tab:"RADIO", highlight:"Find full station list in RADIO tab" });
      // History
      results.push({ type:"HISTORY LIST", icon:"📋",
        title:`${s.team} All-Time Stats & Leaders`,
        sub:"Career records, retired numbers, coaches, draft picks",
        tab:"HISTORY", highlight:"" });
      // HOF
      results.push({ type:"HALL OF FAME", icon:"🏛️",
        title:`${s.team} Hall of Famers`,
        sub:"Every HOF inductee with a connection to the team",
        tab:"HOF", highlight:"" });
    }
  });

  // Static nav shortcuts
  const NAV_SHORTCUTS = [
    { keywords:["score","scores","game","games","live","today"],              tab:"SCORES",    icon:"🏆", title:"Live Scores & Games",      sub:"Today's scores across all NY teams" },
    { keywords:["news","headline","story","stories","beat","reporter"],       tab:"NEWS",      icon:"📰", title:"NY Sports News",            sub:"Latest headlines and beat writer links" },
    { keywords:["recap","yesterday","highlights","last night","result"],      tab:"RECAP",     icon:"📺", title:"Last Night's Recap",       sub:"Yesterday's NY results and YouTube highlights" },
    { keywords:["stand","standings","table","division","league"],             tab:"STANDINGS", icon:"📊", title:"League Standings",          sub:"Current standings for all NY team leagues" },
    { keywords:["tv","television","channel","watch","broadcast","network"],   tab:"TV",        icon:"📺", title:"TV Schedule",               sub:"What's on TV tonight for NY sports" },
    { keywords:["schedule","upcoming","next game","calendar"],                tab:"SCHEDULE",  icon:"📅", title:"Schedule",                  sub:"Upcoming NY sports schedule" },
    { keywords:["misery","suffer","drought","worst","pain","losing"],         tab:"MISERY",    icon:"😩", title:"Misery Index",              sub:"NY teams ranked by how much they've made fans suffer" },
    { keywords:["poll","vote","debate","opinion","survey","question"],        tab:"POLLS",     icon:"🗳️", title:"Weekly Poll",               sub:"This week's NY sports debate" },
    { keywords:["hof","hall","fame","inducted","legend","retired number"],    tab:"HOF",       icon:"🏛️", title:"Hall of Fame",              sub:"Every NY Hall of Famer by team" },
    { keywords:["trivia","quiz","test","challenge","answer"],                 tab:"TRIVIA",    icon:"🧠", title:"Trivia",                    sub:"Daily NY sports trivia challenge" },
    { keywords:["history","all time","record","leaders","list","greatest"],   tab:"HISTORY",   icon:"📚", title:"History & Records",         sub:"All-time records, leaders, coaches" },
    { keywords:["this date","anniversary","today in","on this date"],        tab:"THIS DATE", icon:"📅", title:"On This Date",              sub:"NY sports history by date" },
    { keywords:["iconic","tennis","us open","belmont","secretariat","golf","shinnecock","bethpage","winged foot","pga","ryder"], tab:"NY EVENTS", icon:"🏆", title:"Iconic NY Events", sub:"US Open Tennis, Golf, Belmont Stakes" },
    { keywords:["songs","walk up","walkup","music","walk-up"], tab:"SONGS", icon:"🎵", title:"Walk-Up Songs", sub:"Yankees, Mets walk-up music" },
    { keywords:["spin","facts","random","ny facts","spin wheel"], tab:"SPIN", icon:"🎰", title:"NY Spin Wheel", sub:"Random NY sports facts" },
    { keywords:["birthday","born today","born on this day"], tab:"BIRTHDAYS", icon:"🎂", title:"Birthdays Today", sub:"NY sports legends born today" },
    { keywords:["shop","buy","gear","jersey","memorabilia","book"],           tab:"SHOP",      icon:"🛒", title:"Shop",                      sub:"NY sports gear, books, memorabilia" },
    { keywords:["radio","podcast","listen","wfan","espn radio"],              tab:"RADIO",     icon:"📻", title:"Radio & Podcasts",          sub:"NY sports radio and podcasts" },
    { keywords:["crossword","xword","puzzle","word"],                         tab:"XWORD",     icon:"✏️", title:"Crossword",                 sub:"NY sports crossword puzzle" },
    { keywords:["draft","pick","prospect","rookie","first round"],            tab:"STATS",     icon:"📋", title:"Draft History",             sub:"Greatest and worst picks for all NY teams" },
    { keywords:["trade","trades","deal","transaction","swap"],                tab:"HISTORY",   icon:"🔄", title:"Trade Tracker",             sub:"Best and worst NY sports trades ever" },
    { keywords:["stats","statistics","leaders","numbers","all time"],         tab:"STATS",     icon:"📊", title:"Stats & Records",           sub:"All-time statistical leaders" },
  ];
  NAV_SHORTCUTS.forEach(s => {
    if (s.keywords.some(kw => q.includes(kw) || kw.includes(q))) {
      results.push({ type:"NAVIGATE", icon:s.icon, title:s.title, sub:s.sub, tab:s.tab, highlight:"" });
    }
  });

  const limited = results.slice(0, 20);
  if (limited.length === 0) return (
    <div style={styles.searchDropdown}>
      <div style={styles.searchNoResult}>No results for "{query}" — try a player name, team, or event</div>
    </div>
  );

  const TYPE_COLORS = {
    "PLAYER SPOTLIGHT":  "#c8201c",
    "ON THIS DATE":      "#c8201c",
    "HALL OF FAME":      "#FFD700",
    "HISTORY":           "#888",
    "HISTORY LIST":      "#888",
    "STADIUM":           "#4ade80",
    "QUOTE":             "#aaa",
    "POLL":              "#c8201c",
    "NAVIGATE":          "#0038A8",
    "TEAM HUB":          "#c8201c",
    "AWARD":             "#FFD700",
    "RADIO / PODCAST":   "#4ade80",
    "BEAT WRITER":       "#1d9bf0",
    "ALMOST FORGOTTEN":  "#888",
    "MISERY INDEX":      "#c8201c",
    "WALK-UP SONG":      "#a855f7",
    "FAN COMMUNITY":     "#f97316",
    "SHOP":              "#22c55e",
  };

  return (
    <div style={styles.searchDropdown}>
      {limited.map((r, i) => (
        <button key={i} onMouseDown={() => onSelect(r.tab)} style={styles.searchResult}>
          <span style={styles.searchResultIcon}>{r.icon}</span>
          <div style={styles.searchResultBody}>
            <div style={styles.searchResultTop}>
              <span style={{...styles.searchResultType, color: TYPE_COLORS[r.type] || "#888"}}>{r.type}</span>
              <span style={styles.searchResultTab}>→ {r.tab}</span>
            </div>
            <span style={styles.searchResultTitle}>{r.title}</span>
            {r.sub && <span style={styles.searchResultSub}>{r.sub}</span>}
            {r.highlight && <span style={styles.searchResultHighlight}>{r.highlight}</span>}
          </div>
        </button>
      ))}
      <div style={styles.searchFooter}>{results.length} result{results.length !== 1 ? "s" : ""} for "{query}"</div>
    </div>
  );
}

// ─── RECAP TAB ─────────────────────────────────────────────────────────────
function RecapTab({ scores }) {
  const [yesterdayScores, setYesterdayScores] = useState([]);
  const [loadingYesterday, setLoadingYesterday] = useState(true);
  const [boxScores, setBoxScores] = useState({});
  const [expandedGame, setExpandedGame] = useState(null);

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yDate = yesterday.toLocaleDateString("en-US", {weekday:"long", month:"long", day:"numeric"});

  useEffect(() => {
    setLoadingYesterday(true);
    fetchESPNScores(yesterday).then(data => {
      setYesterdayScores(data || []);
      setLoadingYesterday(false);
    });
  }, []);

  async function loadBoxScore(game) {
    if (boxScores[game.gameId]) {
      setExpandedGame(expandedGame === game.gameId ? null : game.gameId);
      return;
    }
    if (!game.gameId) return;
    const sl = SPORT_LEAGUE_MAP[game.sport];
    if (!sl) return;
    try {
      const data = await fetchBoxScore(game.gameId, sl.sport, sl.league);
      setBoxScores(prev => ({...prev, [game.gameId]: data}));
      setExpandedGame(game.gameId);
    } catch(e) {}
  }

  const NY_NAMES = ["yankees","mets","jets","giants","knicks","nets","rangers","islanders","devils","liberty","nycfc","gotham","red bulls"];

  const yesterdayNYGames = yesterdayScores.filter(s => {
    const teams = `${s.homeTeam||""} ${s.awayTeam||""}`.toLowerCase();
    const hasNY = NY_NAMES.some(n => teams.includes(n));
    if (teams.includes("rangers") && !teams.includes("new york rangers")) return false;
    if (teams.includes("giants") && !teams.includes("new york giants")) return false;
    return hasNY;
  });

  const NY_TEAMS_RECAP = [
    {name:"Yankees",   keywords:"New York Yankees highlights",  color:"#003087", emoji:"⚾", espn:"https://www.espn.com/mlb/team/_/name/nyy"},
    {name:"Mets",      keywords:"New York Mets highlights",     color:"#FF5910", emoji:"⚾", espn:"https://www.espn.com/mlb/team/_/name/nym"},
    {name:"Knicks",    keywords:"New York Knicks highlights",   color:"#006BB6", emoji:"🏀", espn:"https://www.espn.com/nba/team/_/name/ny"},
    {name:"Nets",      keywords:"Brooklyn Nets highlights",     color:"#444",    emoji:"🏀", espn:"https://www.espn.com/nba/team/_/name/bkn"},
    {name:"Rangers",   keywords:"New York Rangers highlights",  color:"#0038A8", emoji:"🏒", espn:"https://www.espn.com/nhl/team/_/name/nyr"},
    {name:"Islanders", keywords:"NY Islanders highlights",      color:"#00539B", emoji:"🏒", espn:"https://www.espn.com/nhl/team/_/name/nyi"},
    {name:"Devils",    keywords:"New Jersey Devils highlights", color:"#CE1126", emoji:"🏒", espn:"https://www.espn.com/nhl/team/_/name/njd"},
    {name:"Liberty",   keywords:"New York Liberty highlights",  color:"#007A5E", emoji:"🏀", espn:"https://www.espn.com/wnba/team/_/name/ny"},
    {name:"Jets",      keywords:"New York Jets highlights",     color:"#125740", emoji:"🏈", espn:"https://www.espn.com/nfl/team/_/name/nyj"},
    {name:"Giants",    keywords:"New York Giants highlights",   color:"#0B2265", emoji:"🏈", espn:"https://www.espn.com/nfl/team/_/name/nyg"},
  ];

  const today = new Date();
  const dateStr = `${today.toLocaleDateString("en-US",{month:"short",day:"numeric"})} ${today.getFullYear()}`;

  function getPeriodLabels(sport, count) {
    if (sport === "MLB") return [...Array(count)].map((_,i) => i < 9 ? i+1 : i === 9 ? "E" : `E${i-8}`);
    if (sport === "NFL") return ["Q1","Q2","Q3","Q4","OT"].slice(0, count);
    if (sport === "NHL") return ["P1","P2","P3","OT","SO"].slice(0, count);
    if (sport === "NBA") return ["Q1","Q2","Q3","Q4","OT"].slice(0, count);
    return [...Array(count)].map((_,i) => i+1);
  }

  return (
    <div style={styles.statsRoot}>
      <div style={styles.stdHeader}>
        <h2 style={styles.stdTitle}>📺 LAST NIGHT'S RECAP</h2>
        <p style={styles.stdSub}>{yDate.toUpperCase()} · NY SPORTS RESULTS · VIDEO HIGHLIGHTS</p>
      </div>

      {loadingYesterday ? (
        <div style={styles.loading}>
          <div style={styles.loadingDots}>{[0,1,2].map(i=><span key={i} style={{...styles.dot,animationDelay:`${i*0.2}s`}}/>)}</div>
          <p style={styles.loadingText}>LOADING YESTERDAY'S RESULTS...</p>
        </div>
      ) : yesterdayNYGames.length > 0 ? (
        <>
          <div style={styles.stdDivisionHeader}>🏆 YESTERDAY'S NY RESULTS — {yDate.toUpperCase()}</div>
          {yesterdayNYGames.map((g, i) => {
            const sportSlug = {MLB:"mlb",NBA:"nba",NHL:"nhl",NFL:"nfl",WNBA:"wnba"}[g.sport] || "mlb";
            const boxScoreUrl = g.gameId
              ? `https://www.espn.com/${sportSlug}/boxscore/_/gameId/${g.gameId}`
              : `https://www.espn.com/${sportSlug}/scoreboard`;
            const awayWin = (g.awayScore||0) > (g.homeScore||0);
            const homeWin = (g.homeScore||0) > (g.awayScore||0);
            const isExpanded = expandedGame === g.gameId;
            const bs = boxScores[g.gameId];
            return (
              <div key={i} style={{marginBottom:4, border:"1px solid #222", borderRadius:3, overflow:"hidden"}}>
                {/* Score row */}
                <div style={{display:"flex", alignItems:"center", justifyContent:"space-between",
                  padding:"10px 14px", background: i%2===0 ? "#0e0e0e" : "#111", flexWrap:"wrap", gap:8}}>
                  <div style={{display:"flex", alignItems:"center", gap:10, flex:1, minWidth:200}}>
                    <span style={{fontSize:9, color:"#c8201c", fontWeight:900, letterSpacing:"0.1em"}}>{g.sport}</span>
                    <span style={{fontSize:13, fontWeight: awayWin?900:400, color: awayWin?"#fff":"#aaa",
                      fontFamily:"'Georgia',serif"}}>{g.awayTeam}</span>
                    <span style={{fontSize:16, fontWeight:900, color:"#fff", minWidth:70, textAlign:"center",
                      fontFamily:"'Georgia',serif", letterSpacing:"0.05em"}}>
                      {g.awayScore ?? "—"} – {g.homeScore ?? "—"}
                    </span>
                    <span style={{fontSize:13, fontWeight: homeWin?900:400, color: homeWin?"#fff":"#aaa",
                      fontFamily:"'Georgia',serif"}}>{g.homeTeam}</span>
                    {g.statusDesc && <span style={{fontSize:9, color:"#666"}}>{g.statusDesc}</span>}
                  </div>
                  <div style={{display:"flex", gap:8, flexShrink:0}}>
                    {g.gameId && (
                      <button onClick={() => loadBoxScore(g)}
                        style={{fontSize:9, padding:"3px 10px", background:"#161616", border:"1px solid #333",
                          color:"#aaa", cursor:"pointer", letterSpacing:"0.08em", fontWeight:700}}>
                        {isExpanded ? "▲ HIDE" : "📊 LINE SCORE"}
                      </button>
                    )}
                    <a href={boxScoreUrl} target="_blank" rel="noopener noreferrer"
                      style={{...styles.histLink, fontSize:9}}>ESPN →</a>
                  </div>
                </div>

                {/* Line score expanded */}
                {isExpanded && bs && bs.linescores?.length > 0 && (
                  <div style={{padding:"12px 14px", background:"#080808", overflowX:"auto"}}>
                    {/* Period header */}
                    {(() => {
                      const periods = bs.linescores[0]?.periods || [];
                      const labels = getPeriodLabels(g.sport, periods.length);
                      return (
                        <table style={{width:"100%", borderCollapse:"collapse", fontFamily:"'Georgia',serif", minWidth:320}}>
                          <thead>
                            <tr>
                              <td style={{fontSize:9, color:"#555", padding:"3px 8px 3px 0", letterSpacing:"0.1em", minWidth:120}}>TEAM</td>
                              {labels.map((lbl,j) => (
                                <td key={j} style={{fontSize:9, color:"#666", textAlign:"center", padding:"3px 6px", minWidth:28, fontWeight:900}}>{lbl}</td>
                              ))}
                              <td style={{fontSize:9, color:"#c8201c", textAlign:"center", padding:"3px 6px", fontWeight:900, minWidth:36}}>TOT</td>
                            </tr>
                          </thead>
                          <tbody>
                            {bs.linescores.map((team, ti) => (
                              <tr key={ti} style={{borderTop:"1px solid #1a1a1a"}}>
                                <td style={{fontSize:12, fontWeight:700, color: ti===0&&awayWin||ti===1&&homeWin ? "#fff":"#aaa",
                                  padding:"6px 8px 6px 0", whiteSpace:"nowrap"}}>{team.name}</td>
                                {(team.periods||[]).map((p,j) => (
                                  <td key={j} style={{fontSize:12, textAlign:"center", padding:"6px",
                                    color: p === "0" || p === "-" ? "#444" : "#ccc",
                                    fontWeight: p !== "0" && p !== "-" ? 700 : 400}}>{p}</td>
                                ))}
                                <td style={{fontSize:13, fontWeight:900, textAlign:"center", padding:"6px",
                                  color: ti===0&&awayWin||ti===1&&homeWin ? "#22c55e" : "#fff"}}>
                                  {ti===0 ? g.awayScore : g.homeScore}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      );
                    })()}

                    {/* Key stats if available */}
                    {bs.playerStats?.length > 0 && (
                      <div style={{marginTop:10, borderTop:"1px solid #1a1a1a", paddingTop:8}}>
                        <div style={{fontSize:9, color:"#555", letterSpacing:"0.1em", fontWeight:900, marginBottom:6}}>KEY PERFORMERS</div>
                        <div style={{display:"flex", flexWrap:"wrap", gap:8}}>
                          {bs.playerStats.slice(0,6).map((p,j) => (
                            <div key={j} style={{fontSize:10, color:"#aaa", background:"#111",
                              padding:"4px 8px", borderRadius:2, border:"1px solid #222"}}>
                              <span style={{color:"#fff", fontWeight:700}}>{p.name}</span>
                              <span style={{color:"#666", marginLeft:4}}>{p.team}</span>
                              <span style={{color:"#c8201c", marginLeft:4}}>{p.stat}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </>
      ) : (
        <div style={{padding:"12px 0 20px"}}>
          <div style={styles.stdDivisionHeader}>🏆 YESTERDAY'S NY RESULTS — {yDate.toUpperCase()}</div>
          <p style={{fontSize:12, color:"#555", padding:"8px 0"}}>No NY games yesterday — check the SCORES tab for upcoming games.</p>
        </div>
      )}

      {/* Video Highlights */}
      <div style={{...styles.stdDivisionHeader, marginTop:20}}>🎬 VIDEO HIGHLIGHTS</div>
      <div style={{marginBottom:12, fontSize:10, color:"#555"}}>Click any team to find today's highlights on YouTube</div>
      <div style={styles.ytTeamGrid}>
        {NY_TEAMS_RECAP.map((t, i) => {
          const ytUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(`${t.keywords} ${dateStr}`)}&sp=EgIIAQ%3D%3D`;
          return (
            <div key={i} style={{display:"flex", gap:6, flexDirection:"column"}}>
              <a href={ytUrl} target="_blank" rel="noopener noreferrer"
                style={{...styles.ytTeamCard, background:`linear-gradient(135deg, ${t.color}22 0%, #0a0a0a 100%)`, borderLeft:`3px solid ${t.color}`}}>
                <span style={styles.ytEmoji}>{t.emoji}</span>
                <div style={styles.ytInfo}>
                  <span style={styles.ytTeamName}>{t.name}</span>
                  <span style={styles.ytSubtext}>▶ YouTube highlights</span>
                </div>
              </a>
              <a href={t.espn} target="_blank" rel="noopener noreferrer"
                style={{fontSize:9, color:"#555", textDecoration:"none", textAlign:"center",
                  padding:"3px 6px", border:"1px solid #222", letterSpacing:"0.08em"}}>
                📊 ESPN RECAP
              </a>
            </div>
          );
        })}
      </div>

      {/* Tomorrow's games */}
      <div style={{...styles.stdDivisionHeader, marginTop:20}}>📅 TOMORROW'S NY GAMES</div>
      {(() => {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const tmrGames = scores.filter(s => {
          const d = new Date(s.gameDate || s.date);
          const teams = `${s.homeTeam||""} ${s.awayTeam||""}`.toLowerCase();
          if (teams.includes("rangers") && !teams.includes("new york rangers")) return false;
          if (teams.includes("giants") && !teams.includes("new york giants")) return false;
          return d.toDateString() === tomorrow.toDateString() &&
            NY_NAMES.some(n => teams.includes(n));
        });
        if (!tmrGames.length) return <p style={{fontSize:12, color:"#555", padding:"8px 0"}}>No NY games scheduled for tomorrow.</p>;
        return tmrGames.map((g,i) => (
          <div key={i} style={{display:"flex", alignItems:"center", justifyContent:"space-between",
            padding:"10px 14px", borderBottom:"1px solid #1a1a1a",
            background: i%2===0?"#0e0e0e":"#111", flexWrap:"wrap", gap:8}}>
            <div style={{display:"flex", alignItems:"center", gap:10}}>
              <span style={{fontSize:9, color:"#c8201c", fontWeight:900}}>{g.sport}</span>
              <span style={{fontSize:13, color:"#e8e0d0", fontFamily:"'Georgia',serif"}}>{g.awayTeam} @ {g.homeTeam}</span>
            </div>
            <span style={{fontSize:11, color:"#888"}}>{g.statusDesc || g.gameTime || "TBD"}</span>
          </div>
        ));
      })()}
    </div>
  );
}

function IconicTab() {
  const [section, setSection] = useState("TENNIS");

  return (
    <div style={styles.statsRoot}>
      <div style={styles.stdHeader}>
        <h2 style={styles.stdTitle}>🏟️ ICONIC NEW YORK SPORTING EVENTS</h2>
        <p style={styles.stdSub}>US OPEN TENNIS · US OPEN GOLF · PGA · RYDER CUP · BELMONT STAKES</p>
      </div>

      <div style={{display:"flex", gap:6, flexWrap:"wrap", marginBottom:16, borderBottom:"1px solid #2a2a2a", paddingBottom:12}}>
        {[["TENNIS","🎾 US OPEN TENNIS"],["GOLF","⛳ US OPEN GOLF"],["BELMONT","🐎 BELMONT / TRIPLE CROWN"]].map(([s,label]) => (
          <button key={s} onClick={() => setSection(s)}
            style={{...styles.filterBtn, ...(section===s ? styles.filterBtnActive : {})}}>
            {label}
          </button>
        ))}
      </div>

      {/* ── US OPEN TENNIS ── */}
      {section === "TENNIS" && (
        <div>
          <div style={{marginBottom:16, padding:"12px 14px", background:"#161616", borderLeft:"3px solid #c8201c"}}>
            <p style={{margin:0, fontSize:12, color:"#aaa", lineHeight:1.6}}>The US Open is held every late August into September at the USTA Billie Jean King National Tennis Center in Flushing Meadows, Queens — the same park that hosted two World's Fairs. Arthur Ashe Stadium, the largest tennis venue in the world (23,771 seats), anchors it. One of the four Grand Slams and the loudest, brashest, most New York of them all.</p>
          </div>

          <div style={styles.stdDivisionHeader}>🎾 THE VENUE — A NY LANDMARK</div>
          {[
            { t:"Arthur Ashe Stadium", d:"The largest tennis stadium in the world at 23,771 seats. Opened in 1997, named for the only Black man to win the US Open (1968), Wimbledon and Australian Open — and a tireless humanitarian." },
            { t:"Billie Jean King National Tennis Center", d:"Renamed in 2006 for the tennis legend and equality pioneer who won 39 Grand Slam titles and famously beat Bobby Riggs in the 1973 'Battle of the Sexes.'" },
            { t:"Louis Armstrong Stadium", d:"The second show court, rebuilt in 2018 — named for the jazz legend who lived nearby in Corona, Queens." },
            { t:"Flushing Meadows-Corona Park", d:"Site of the 1939 and 1964 World's Fairs. The Unisphere still towers nearby. Pure Queens history." },
          ].map((x,i) => (
            <div key={i} style={{...styles.iconicRow, ...(i%2===0?{}:{background:"#0f0f0f"})}}>
              <div style={styles.iconicIcon}>🎾</div>
              <div style={styles.iconicInfo}>
                <span style={styles.iconicTitle}>{x.t}</span>
                <span style={styles.iconicDesc}>{x.d}</span>
                <div style={{display:"flex",gap:10,marginTop:4}}>
                  <a href={`https://www.google.com/search?q=${encodeURIComponent(x.t)}`} target="_blank" rel="noopener noreferrer" style={styles.quoteLinkSmall}>🔍 Google</a>
                  <a href={`https://en.wikipedia.org/wiki/${encodeURIComponent(x.t.replace(/ /g,'_'))}`} target="_blank" rel="noopener noreferrer" style={styles.quoteLinkSmall}>📖 Wiki</a>
                </div>
              </div>
            </div>
          ))}

          <div style={{...styles.stdDivisionHeader, marginTop:20}}>📖 US OPEN RECORD BOOK & FUN FACTS</div>
          {[
            { t:"Most US Open Men's Titles", d:"Jimmy Connors, Pete Sampras, Roger Federer and Bill Tilden are among the all-time greats. Connors won on three different surfaces at the Open — grass, clay and hard court." },
            { t:"Most US Open Women's Titles (Open Era)", d:"Chris Evert and Serena Williams each won 6 US Open singles titles — the most of the Open Era. Serena's wins spanned 1999 to 2014." },
            { t:"Molla Mallory — 8 Titles", d:"The all-time record for US singles championships is held by Molla Mallory with 8 (1915–1926)." },
            { t:"1968 — First US Open of the Open Era", d:"Arthur Ashe won the first US Open in 1968, the first year professionals were allowed to compete. He remains the only Black man to win the title." },
            { t:"The Night Session", d:"The US Open was the first Grand Slam to install lights and embrace prime-time night tennis — pure New York theater under the lights at Ashe." },
            { t:"Super Saturday 1984", d:"One of the greatest days in tennis history — two epic men's semifinals plus the women's final, all in one unforgettable day at Flushing Meadows." },
            { t:"Tiebreak Innovation", d:"The US Open was the first major to use a final-set tiebreak — typical of the event's willingness to break tennis tradition." },
          ].map((x,i) => (
            <div key={i} style={{...styles.iconicRow, ...(i%2===0?{}:{background:"#0f0f0f"})}}>
              <div style={styles.iconicIcon}>📖</div>
              <div style={styles.iconicInfo}>
                <span style={styles.iconicTitle}>{x.t}</span>
                <span style={styles.iconicDesc}>{x.d}</span>
                <div style={{display:"flex",gap:10,marginTop:4}}>
                  <a href={`https://www.google.com/search?q=${encodeURIComponent(x.t)}`} target="_blank" rel="noopener noreferrer" style={styles.quoteLinkSmall}>🔍 Google</a>
                  <a href={`https://en.wikipedia.org/wiki/${encodeURIComponent(x.t.replace(/ /g,'_'))}`} target="_blank" rel="noopener noreferrer" style={styles.quoteLinkSmall}>📖 Wiki</a>
                </div>
              </div>
            </div>
          ))}
          <div style={{marginTop:12, display:"flex", gap:10, flexWrap:"wrap"}}>
            <a href="https://www.usopen.org" target="_blank" rel="noopener noreferrer" style={styles.histLink}>🎾 Official US Open Site</a>
            <a href={`https://www.google.com/search?q=${encodeURIComponent("US Open tennis history records Flushing Meadows")}`} target="_blank" rel="noopener noreferrer" style={styles.histLink}>🔍 More History</a>
          </div>
        </div>
      )}

      {/* ── US OPEN GOLF ── */}
      {section === "GOLF" && (
        <div>
          <div style={{marginBottom:16, padding:"12px 14px", background:"#161616", borderLeft:"3px solid #c8201c"}}>
            <p style={{margin:0, fontSize:12, color:"#aaa", lineHeight:1.6}}>No state has hosted more US Opens than New York — 18 and counting. From the wind-swept links of Shinnecock Hills to the brutal slopes of Winged Foot to the public-course beast that is Bethpage Black, NY golf is championship golf. The US Open returns to Shinnecock in 2026 and Winged Foot in 2028.</p>
          </div>

          <div style={styles.stdDivisionHeader}>⛳ SHINNECOCK HILLS — SOUTHAMPTON, LONG ISLAND</div>
          {[
            { y:"1896", d:"Hosted the second US Open ever — at 4,423 yards, the shortest US Open course in history. One of the five founding clubs of the USGA." },
            { y:"1986", d:"Raymond Floyd, age 44, wins by two strokes — becoming the oldest US Open champion at the time with a final-round 66." },
            { y:"1995", d:"Corey Pavin wins his only major, sealed by a famous 4-wood approach to the 18th green for a closing 68." },
            { y:"2004", d:"Retief Goosen wins at -4; only he and Phil Mickelson finish under par as the greens become controversially baked and brutal." },
            { y:"2018", d:"Brooks Koepka wins at +1 — the only over-par US Open winner in a decade — defending his title in punishing conditions." },
            { y:"2026", d:"The US Open returns to Shinnecock Hills this June — one of the most anticipated venues on the entire golf calendar." },
          ].map((x,i) => (
            <div key={i} style={{...styles.iconicRow, ...(i%2===0?{}:{background:"#0f0f0f"})}}>
              <div style={styles.iconicYear}>{x.y}</div>
              <div style={styles.iconicInfo}>
                <span style={styles.iconicDesc}>{x.d}</span>
                <a href={`https://www.google.com/search?q=${encodeURIComponent((x.d||"").slice(0,40))}`} target="_blank" rel="noopener noreferrer" style={{...styles.quoteLinkSmall,marginTop:4,display:"inline-block"}}>🔍 Google</a>
              </div>
            </div>
          ))}

          <div style={{...styles.stdDivisionHeader, marginTop:20}}>⛳ WINGED FOOT — MAMARONECK, WESTCHESTER</div>
          {[
            { y:"1929", d:"Bobby Jones wins in a 36-hole playoff — one of only two major playoff wins of his legendary career, both in New York." },
            { y:"1959", d:"Billy Casper wins the first of his two US Opens, masterfully managing the treacherous greens." },
            { y:"1974", d:"'The Massacre at Winged Foot' — Hale Irwin wins at +7, the course so brutal it became golf legend." },
            { y:"1984", d:"Fuzzy Zoeller wins a playoff over Greg Norman, famously waving a white towel in surrender after Norman's putt." },
            { y:"2006", d:"Geoff Ogilvy wins at +5 as Phil Mickelson double-bogeys the 72nd hole — one of the most painful collapses in major history." },
            { y:"2020", d:"Bryson DeChambeau overpowers Winged Foot at -6, the only player under par, redefining how the course could be played." },
            { y:"2028", d:"The US Open returns to Winged Foot — its seventh time hosting the national championship." },
          ].map((x,i) => (
            <div key={i} style={{...styles.iconicRow, ...(i%2===0?{}:{background:"#0f0f0f"})}}>
              <div style={styles.iconicYear}>{x.y}</div>
              <div style={styles.iconicInfo}>
                <span style={styles.iconicDesc}>{x.d}</span>
                <a href={`https://www.google.com/search?q=${encodeURIComponent((x.d||"").slice(0,40))}`} target="_blank" rel="noopener noreferrer" style={{...styles.quoteLinkSmall,marginTop:4,display:"inline-block"}}>🔍 Google</a>
              </div>
            </div>
          ))}

          <div style={{...styles.stdDivisionHeader, marginTop:20}}>⛳ BETHPAGE BLACK — FARMINGDALE, LONG ISLAND</div>
          {[
            { y:"2002", d:"Tiger Woods wins at -3 — the first US Open ever held on a publicly-owned golf course. Bethpage Black belongs to the people of New York." },
            { y:"2009", d:"Lucas Glover wins a rain-soaked Open over Phil Mickelson, David Duval and Ricky Barnes." },
            { y:"2019", d:"Bethpage Black hosts the PGA Championship — Brooks Koepka wins his fourth major. The famous warning sign greets every golfer: 'The Black Course is an extremely difficult course recommended only for highly skilled golfers.'" },
            { y:"2025", d:"Bethpage Black hosts the Ryder Cup — the rowdy New York crowd brings unmatched energy to international golf." },
          ].map((x,i) => (
            <div key={i} style={{...styles.iconicRow, ...(i%2===0?{}:{background:"#0f0f0f"})}}>
              <div style={styles.iconicYear}>{x.y}</div>
              <div style={styles.iconicInfo}>
                <span style={styles.iconicDesc}>{x.d}</span>
                <a href={`https://www.google.com/search?q=${encodeURIComponent((x.d||"").slice(0,40))}`} target="_blank" rel="noopener noreferrer" style={{...styles.quoteLinkSmall,marginTop:4,display:"inline-block"}}>🔍 Google</a>
              </div>
            </div>
          ))}

          <div style={{...styles.stdDivisionHeader, marginTop:20}}>⛳ PGA CHAMPIONSHIP IN NEW YORK</div>
          {[
            { y:"2019", d:"Brooks Koepka wins at Bethpage Black with dominant 8-under final score — his third major in three years. The rowdy NY crowd was unlike any major had seen." },
            { y:"2025", d:"Bethpage Black hosts the Ryder Cup — the first Ryder Cup at a public municipal course. The crowd's passion for Team USA becomes legendary in golf history." },
            { y:"1980", d:"Jack Nicklaus wins his fifth PGA Championship at Oak Hill in Rochester, NY — one of the great late-career performances by the Golden Bear." },
            { y:"2003", d:"Shaun Micheel wins an improbable PGA at Oak Hill. His 7-iron approach on the final hole — two inches from the cup — is one of the great clutch shots in major history." },
            { y:"2013", d:"Jason Dufner wins the PGA at Oak Hill, breaking a final-round scoring record. Rochester NY hosts its third PGA Championship." },
          ].map((x,i) => (
            <div key={i} style={{...styles.iconicRow, ...(i%2===0?{}:{background:"#0f0f0f"})}}>
              <div style={styles.iconicYear}>{x.y}</div>
              <div style={styles.iconicInfo}>
                <span style={styles.iconicDesc}>{x.d}</span>
                <a href={`https://www.google.com/search?q=${encodeURIComponent("PGA Championship " + x.y + " New York")}`} target="_blank" rel="noopener noreferrer" style={{...styles.quoteLinkSmall, marginTop:3, display:"inline-block"}}>🔍 Google</a>
              </div>
            </div>
          ))}

          <div style={{...styles.stdDivisionHeader, marginTop:20}}>🏆 RYDER CUP IN NEW YORK</div>
          {[
            { y:"1995", d:"The Ryder Cup returns to the NY area — American golf at its most passionate. The region's golf culture makes it a perfect host every generation." },
            { y:"2025", d:"Bethpage Black hosts the Ryder Cup — the most anticipated team golf event in decades. A public course, a roaring NY crowd, and Team USA on home soil." },
          ].map((x,i) => (
            <div key={i} style={{...styles.iconicRow, ...(i%2===0?{}:{background:"#0f0f0f"})}}>
              <div style={styles.iconicYear}>{x.y}</div>
              <div style={styles.iconicInfo}>
                <span style={styles.iconicDesc}>{x.d}</span>
                <a href={`https://www.google.com/search?q=${encodeURIComponent("Ryder Cup " + x.y + " New York")}`} target="_blank" rel="noopener noreferrer" style={{...styles.quoteLinkSmall, marginTop:3, display:"inline-block"}}>🔍 Google</a>
              </div>
            </div>
          ))}

          <div style={{...styles.stdDivisionHeader, marginTop:20}}>🎓 AMATEUR & OTHER MAJOR NY GOLF MOMENTS</div>
          {[
            { t:"US Amateur at Winged Foot", d:"Winged Foot has hosted the US Amateur multiple times — the oldest major amateur event in American golf." },
            { t:"Walker Cup at Garden City GC", d:"Garden City Golf Club on Long Island has hosted the Walker Cup — the oldest international team event in golf — showcasing NY's deep amateur golf tradition." },
            { t:"Bob Jones at Winged Foot (1929)", d:"Bobby Jones wins at Winged Foot after a 36-hole playoff — one of only two playoff wins of his Grand Slam career." },
            { t:"LPGA at Bethpage Black", d:"Bethpage Black has hosted LPGA events — proving the course challenges the game's best regardless of gender." },
            { t:"Met Amateur Championship", d:"The Metropolitan Golf Association (MGA) has governed NY area golf since 1897 — the oldest regional golf association in America." },
          ].map((x,i) => (
            <div key={i} style={{...styles.iconicRow, ...(i%2===0?{}:{background:"#0f0f0f"})}}>
              <div style={styles.iconicIcon}>🎓</div>
              <div style={styles.iconicInfo}>
                <span style={styles.iconicTitle}>{x.t}</span>
                <span style={styles.iconicDesc}>{x.d}</span>
                <a href={`https://www.google.com/search?q=${encodeURIComponent(x.t)}`} target="_blank" rel="noopener noreferrer" style={{...styles.quoteLinkSmall, marginTop:3, display:"inline-block"}}>🔍 Google</a>
              </div>
            </div>
          ))}

          <div style={{...styles.stdDivisionHeader, marginTop:20}}>🗺️ GREAT NY-AREA GOLF COURSES</div>
          {[
            { t:"Shinnecock Hills GC — Southampton, LI", rank:"Top 5 in world", url:"https://www.shinnecockhills.com", d:"Founded 1891 — one of the five founding clubs of the USGA. Links-style course on the eastern tip of Long Island. Consistently ranked a top-5 course in the world." },
            { t:"Winged Foot Golf Club — Mamaroneck, Westchester", rank:"Top 10 in world", url:"https://www.wingedfoot.org", d:"Two championship courses — the West Course is legendary. Has hosted 7 US Opens, producing some of the most dramatic finishes in golf history." },
            { t:"Bethpage Black — Farmingdale, LI", rank:"Top 15 public in world", url:"https://www.bethpagegolfcourse.com", d:"The only public course to host the US Open (twice) and PGA Championship. Standing room only starts at 3am. The warning sign says it all." },
            { t:"Garden City Golf Club — Garden City, LI", rank:"Top 50 in US", url:"https://www.gardencitygc.com", d:"Classic A.W. Tillinghast design. One of the great old-money classic courses in American golf." },
            { t:"The National Golf Links of America — Southampton, LI", rank:"Top 10 in US", url:"https://www.nationalgolflinks.com", d:"Charles Blair Macdonald's masterpiece, inspired by the great British links. Private, historic, and ranked among the finest 10 courses in the country." },
            { t:"Friar's Head — Baiting Hollow, LI", rank:"Top 20 in US", url:"https://www.friarshead.org", d:"Modern masterpiece overlooking Long Island Sound. Consistently ranked in the US top 20. One of the best modern courses built in the last 30 years." },
            { t:"Maidstone Club — East Hampton, LI", rank:"Top 50 in US", url:"https://www.maidstoneclubeh.com", d:"Classic links-style course right on the Atlantic. One of the most beautiful and challenging courses in the Northeast." },
            { t:"Oak Hill Country Club — Rochester, NY", rank:"Top 20 in US", url:"https://www.oakhillcc.com", d:"3× PGA Championship host. Donald Ross design. Upstate New York's great championship venue." },
          ].map((x,i) => (
            <div key={i} style={{...styles.iconicRow, ...(i%2===0?{}:{background:"#0f0f0f"})}}>
              <div style={styles.iconicIcon}>⛳</div>
              <div style={styles.iconicInfo}>
                <span style={styles.iconicTitle}>{x.t}</span>
                <span style={{...styles.iconicDesc, color:"#FFD700", fontSize:9, fontWeight:700}}>{x.rank}</span>
                <span style={styles.iconicDesc}>{x.d}</span>
                <div style={{display:"flex", gap:10, marginTop:3}}>
                  <a href={x.url} target="_blank" rel="noopener noreferrer" style={styles.quoteLinkSmall}>🌐 Course Site</a>
                  <a href={`https://www.google.com/search?q=${encodeURIComponent(x.t + " golf course ranking history")}`} target="_blank" rel="noopener noreferrer" style={styles.quoteLinkSmall}>🔍 Google</a>
                </div>
              </div>
            </div>
          ))}

          <div style={{...styles.stdDivisionHeader, marginTop:20}}>📖 NY GOLF FUN FACTS</div>
          {[
            { t:"Most US Opens by State", d:"New York has hosted 18 US Opens — more than any other state in America." },
            { t:"Public Course Pride", d:"Bethpage Black proved a municipal course could host the US Open. You can still tee it up where Tiger Woods won — if you can handle it. Tee times start at 3am via lottery." },
            { t:"NY Golf Royalty", d:"The Metropolitan Golf Association (MGA), founded 1897, is the oldest regional golf association in America. NY golf has been elite for over 125 years." },
            { t:"Youngest US Open Champion", d:"John McDermott won the 1912 US Open at 19 years old — a record that still stands — at the Country Club of Buffalo." },
          ].map((x,i) => (
            <div key={i} style={{...styles.iconicRow, ...(i%2===0?{}:{background:"#0f0f0f"})}}>
              <div style={styles.iconicIcon}>📖</div>
              <div style={styles.iconicInfo}>
                <span style={styles.iconicTitle}>{x.t}</span>
                <span style={styles.iconicDesc}>{x.d}</span>
                <a href={`https://www.google.com/search?q=${encodeURIComponent(x.t + " New York golf")}`} target="_blank" rel="noopener noreferrer" style={{...styles.quoteLinkSmall, marginTop:3, display:"inline-block"}}>🔍 Google</a>
              </div>
            </div>
          ))}
          <div style={{marginTop:12, display:"flex", gap:10, flexWrap:"wrap"}}>
            <a href="https://www.usga.org/championships/us-open.html" target="_blank" rel="noopener noreferrer" style={styles.histLink}>⛳ Official US Open Golf</a>
            <a href="https://www.bethpagegolfcourse.com" target="_blank" rel="noopener noreferrer" style={styles.histLink}>🏌️ Tee Off at Bethpage</a>
            <a href="https://www.themetgolf.org" target="_blank" rel="noopener noreferrer" style={styles.histLink}>🏆 Met Golf Association</a>
          </div>
        </div>
      )}

      {/* ── BELMONT / TRIPLE CROWN ── */}
      {section === "BELMONT" && (
        <div>
          <div style={{marginBottom:16, padding:"12px 14px", background:"#161616", borderLeft:"3px solid #c8201c"}}>
            <p style={{margin:0, fontSize:12, color:"#aaa", lineHeight:1.6}}>The Belmont Stakes — 'The Test of the Champion' — is the third and final jewel of horse racing's Triple Crown, run at Belmont Park in Elmont, Long Island since 1905. At 1.5 miles, it's the longest of the three races and the ultimate test of stamina. Every Triple Crown bid comes down to Belmont. And in 1973, the greatest performance in the history of the sport happened right here.
</p>
          </div>

          <div style={styles.stdDivisionHeader}>🐎 SECRETARIAT — THE GREATEST OF ALL TIME</div>
          <div style={{padding:"14px 16px", background:"#161616", borderLeft:"3px solid #c8201c", marginBottom:16}}>
            <p style={{margin:"0 0 8px", fontSize:13, color:"#e8e0d0", fontWeight:700, fontFamily:"'Georgia',serif"}}>June 9, 1973 — Belmont Park</p>
            <p style={{margin:0, fontSize:12, color:"#aaa", lineHeight:1.7}}>Secretariat won the Belmont Stakes by an astonishing 31 lengths — the largest margin in the history of the race — completing the first Triple Crown in 25 years. His time of 2:24 flat set a world record for 1.5 miles on dirt that still stands today. Announcer Chic Anderson's call — 'Secretariat is moving like a tremendous machine!' — is the most famous in racing history. Big Red is universally considered the greatest racehorse that ever lived.</p>
          </div>

          <div style={styles.stdDivisionHeader}>🏆 TRIPLE CROWN WINNERS (ALL SEALED AT BELMONT)</div>
          {[
            { y:"1919", d:"Sir Barton — the first-ever Triple Crown winner, before the term was even coined." },
            { y:"1930", d:"Gallant Fox — the colt that made 'Triple Crown' a household phrase." },
            { y:"1935", d:"Omaha — Gallant Fox's own son, the only Triple Crown winner sired by another." },
            { y:"1937", d:"War Admiral — Man o' War's son, later famous for losing to Seabiscuit." },
            { y:"1941", d:"Whirlaway — won the Belmont by 2.5 lengths to complete the sweep." },
            { y:"1943", d:"Count Fleet — won the Belmont by 25 lengths, a record until Secretariat." },
            { y:"1946", d:"Assault — the 'Club-Footed Comet' overcame a hoof injury to win it all." },
            { y:"1948", d:"Citation — the last Triple Crown winner before a 25-year drought." },
            { y:"1973", d:"Secretariat — the 31-length Belmont and a world record that has never been broken." },
            { y:"1977", d:"Seattle Slew — the only undefeated horse to win the Triple Crown." },
            { y:"1978", d:"Affirmed — beat rival Alydar in all three races in one of the great rivalries ever." },
            { y:"2015", d:"American Pharoah — ended a 37-year drought, sending Belmont Park into delirium." },
            { y:"2018", d:"Justify — won it all undefeated, the second to do so, in just his sixth career start." },
          ].map((x,i) => (
            <div key={i} style={{...styles.iconicRow, ...(i%2===0?{}:{background:"#0f0f0f"}), ...(x.y==="1973"?{borderLeft:"3px solid #c8201c"}:{})}}>
              <div style={styles.iconicYear}>{x.y}</div>
              <div style={styles.iconicInfo}>
                <span style={styles.iconicDesc}>{x.d}</span>
                <a href={`https://www.google.com/search?q=${encodeURIComponent((x.d||"").slice(0,40))}`} target="_blank" rel="noopener noreferrer" style={{...styles.quoteLinkSmall,marginTop:4,display:"inline-block"}}>🔍 Google</a>
              </div>
            </div>
          ))}

          <div style={{...styles.stdDivisionHeader, marginTop:20}}>📖 BELMONT PARK FUN FACTS</div>
          {[
            { t:"The Test of the Champion", d:"At 1.5 miles, the Belmont is the longest of the three Triple Crown races — many a Derby and Preakness winner has run out of gas down Belmont's long stretch." },
            { t:"Belmont Park Opened in 1905", d:"One of the grand old cathedrals of American horse racing, in Elmont just over the NYC line in Nassau County, Long Island." },
            { t:"'Big Sandy'", d:"Belmont's massive main dirt track is nicknamed 'Big Sandy' — the largest dirt thoroughbred racetrack in America." },
            { t:"Layered Sports History", d:"Belmont Park's grounds are now also home to UBS Arena, where the NY Islanders play — sports history layered on sports history." },
            { t:"Every Triple Crown Clinched Here", d:"All 13 Triple Crowns in American history have been sealed at Belmont Park — the most decisive stretch of dirt in the sport." },
          ].map((x,i) => (
            <div key={i} style={{...styles.iconicRow, ...(i%2===0?{}:{background:"#0f0f0f"})}}>
              <div style={styles.iconicIcon}>📖</div>
              <div style={styles.iconicInfo}>
                <span style={styles.iconicTitle}>{x.t}</span>
                <span style={styles.iconicDesc}>{x.d}</span>
                <div style={{display:"flex",gap:10,marginTop:4}}>
                  <a href={`https://www.google.com/search?q=${encodeURIComponent(x.t)}`} target="_blank" rel="noopener noreferrer" style={styles.quoteLinkSmall}>🔍 Google</a>
                  <a href={`https://en.wikipedia.org/wiki/${encodeURIComponent(x.t.replace(/ /g,'_'))}`} target="_blank" rel="noopener noreferrer" style={styles.quoteLinkSmall}>📖 Wiki</a>
                </div>
              </div>
            </div>
          ))}
          <div style={{marginTop:12, display:"flex", gap:10, flexWrap:"wrap"}}>
            <a href="https://www.belmontstakes.com" target="_blank" rel="noopener noreferrer" style={styles.histLink}>🐎 Official Belmont Stakes</a>
            <a href="https://www.google.com/search?q=Secretariat+1973+Belmont+Stakes+31+lengths+record" target="_blank" rel="noopener noreferrer" style={styles.histLink}>🔍 Secretariat's Record</a>
          </div>
        </div>
      )}
    </div>
  );
}

const TODAY_IN_NY_SPORTS = [
  // ── JANUARY ──────────────────────────────────────────────────────────────
  { month:1, day:1,  year:1903, team:"Yankees",   emoji:"⚾", title:"New York Highlanders Founded", desc:"The franchise that becomes the Yankees is established. By 1913 they're the Yankees — and by 1923 they've built the greatest stadium in sports." },
  { month:1, day:3,  year:1920, team:"Yankees",   emoji:"⚾", title:"Yankees Acquire Babe Ruth from Red Sox", desc:"For $100,000 cash and a loan on Fenway Park, the Yankees acquire Ruth. The Curse of the Bambino begins. The most consequential transaction in sports history." },
  { month:1, day:5,  year:1970, team:"Knicks",    emoji:"🏀", title:"Willis Reed Named NBA All-Star Starter", desc:"The Knicks captain earns his third All-Star selection as New York cruises toward their first NBA championship." },
  { month:1, day:9,  year:1951, team:"Yankees",   emoji:"⚾", title:"Joe DiMaggio Retires", desc:"The Yankee Clipper calls it quits after 13 seasons. His 56-game hitting streak will never fall. His final words: 'I just want to live my life in dignity.'" },
  { month:1, day:11, year:1969, team:"Jets",      emoji:"🏈", title:"Super Bowl III — Namath Delivers on His Guarantee", desc:"The Jets defeat the Baltimore Colts 16-7. Broadway Joe's guarantee — made just days earlier — is fulfilled. The AFL is validated forever." },
  { month:1, day:12, year:1986, team:"Giants",    emoji:"🏈", title:"Bill Parcells Named Giants Head Coach", desc:"Parcells takes over a struggling program. He will win two Super Bowls with Lawrence Taylor and Phil Simms, building the greatest defense in NFL history." },
  { month:1, day:15, year:2000, team:"Devils",    emoji:"🏒", title:"Martin Brodeur Sets Devils Goals-Against Record", desc:"Brodeur continues his march to becoming the greatest goaltender in NHL history. He will win his second Cup this very season." },
  { month:1, day:17, year:1983, team:"Islanders", emoji:"🏒", title:"Mike Bossy Scores 50th Goal in 50th Game — Again", desc:"Bossy again matches Rocket Richard's iconic milestone — the only player ever to do it twice. Part of the most dominant dynasty in modern NHL history." },
  { month:1, day:19, year:1994, team:"Rangers",   emoji:"🏒", title:"Mark Messier Named Rangers Captain", desc:"The greatest captain in hockey history officially takes the 'C' in New York. The 54-year drought will end in June." },
  { month:1, day:20, year:1973, team:"Nets",      emoji:"🏀", title:"Nets Join ABA Eastern Division", desc:"The New York Nets establish their ABA identity — just one year before Julius Erving arrives and they win back-to-back ABA titles." },
  { month:1, day:21, year:1965, team:"Jets",      emoji:"🏈", title:"Jets Sign Don Maynard to Contract", desc:"The AFL's most dangerous deep threat re-signs with New York — setting up the target Namath will need for Super Bowl III." },
  { month:1, day:24, year:1974, team:"Nets",      emoji:"🏀", title:"Julius Erving Named ABA All-Star MVP", desc:"Dr. J puts on a show that defies description — the most electric player in basketball history wearing Nets colors." },
  { month:1, day:25, year:1987, team:"Giants",    emoji:"🏈", title:"Giants Win Super Bowl XXI — Simms Sets Completion Record", desc:"Phil Simms goes 22-of-25 (88%) — still the Super Bowl record. Giants crush Denver 39-20. Lawrence Taylor and the Big Blue are champions." },
  { month:1, day:27, year:1991, team:"Giants",    emoji:"🏈", title:"Giants Win Super Bowl XXV — Wide Right!", desc:"Scott Norwood's kick drifts wide right. New York 20, Buffalo 19. Arguably the greatest Super Bowl ever played." },
  { month:1, day:29, year:2006, team:"Islanders", emoji:"🏒", title:"Rick DiPietro Signs 15-Year, $67.5M Contract", desc:"One of the worst contracts in NHL history. Injuries limit DiPietro to 301 games. A cautionary tale about guaranteed money that haunts the franchise for a decade." },
  { month:1, day:31, year:1950, team:"Knicks",    emoji:"🏀", title:"Knicks Officially Join the NBA", desc:"The Knicks are ratified as an NBA franchise — beginning 75+ years of basketball at Madison Square Garden, the World's Most Famous Arena." },
  // ── FEBRUARY ─────────────────────────────────────────────────────────────
  { month:2, day:1,  year:1984, team:"Jets",      emoji:"🏈", title:"Mark Gastineau Named AFC Defensive Player of Year", desc:"The NY Sack Exchange star is recognized after his record 22-sack season — at the time the most dominant defensive season in NFL history." },
  { month:2, day:3,  year:2008, team:"Giants",    emoji:"🏈", title:"The Helmet Catch — Giants Stun the Perfect Patriots", desc:"Eli scrambles free, heaves downfield. David Tyree pins it against his helmet on 4th and 1. 17-14 Giants over an 18-0 team. The greatest Super Bowl upset ever." },
  { month:2, day:5,  year:2012, team:"Giants",    emoji:"🏈", title:"Giants Win Super Bowl XLVI — Second Patriots Miracle", desc:"Ahmad Bradshaw's reluctant touchdown wins it 21-17. Eli Manning is a two-time Super Bowl MVP. Two miracle upsets of the same dynasty." },
  { month:2, day:7,  year:1991, team:"Knicks",    emoji:"🏀", title:"Patrick Ewing Scores Career-High 51 Points at MSG", desc:"The greatest Knick puts on a show with 51 points against the Celtics — Madison Square Garden is on its feet." },
  { month:2, day:10, year:1985, team:"Mets",      emoji:"⚾", title:"Dwight Gooden Wins NL Cy Young — Unanimous — At Age 20", desc:"Doc goes 24-4 with a 1.53 ERA. The most dominant pitching season by any 20-year-old in baseball history. The youngest Cy Young winner ever." },
  { month:2, day:12, year:1934, team:"Rangers",   emoji:"🏒", title:"Rangers Win Stanley Cup", desc:"The Rangers' second Cup championship, beating the Detroit Red Wings. The franchise will wait 60 more years for the next one." },
  { month:2, day:14, year:1976, team:"Nets",      emoji:"🏀", title:"Julius Erving Named ABA MVP for Third Time", desc:"Dr. J wins his third ABA MVP with the Nets — cementing his status as the most exciting player in basketball history before moving to the NBA." },
  { month:2, day:16, year:2012, team:"Knicks",    emoji:"🏀", title:"Jeremy Lin Scores 38 on Kobe's Lakers — Linsanity Peaks", desc:"Lin scores 38 on the Lakers in the defining night of Linsanity. MSG is electric. The entire basketball world is watching New York." },
  { month:2, day:20, year:1962, team:"Mets",      emoji:"⚾", title:"New York Mets Are Founded", desc:"The National League returns to New York after the Dodgers and Giants fled to California. The Amazin's begin their improbable 60-year story of heartbreak and hope." },
  { month:2, day:22, year:1980, team:"Islanders", emoji:"🏒", title:"Islanders Begin Their Dynasty Season", desc:"On their way to the first of four consecutive Stanley Cups, the Islanders are establishing themselves as one of the great NHL teams of all time." },
  { month:2, day:24, year:1975, team:"Islanders", emoji:"🏒", title:"Denis Potvin Named NHL All-Star First Team", desc:"The Islanders captain earns his first All-Star selection. He will win four Norris Trophies and four consecutive Stanley Cups." },
  { month:2, day:26, year:1987, team:"Yankees",   emoji:"⚾", title:"Don Mattingly Named AL MVP", desc:"Donnie Baseball is recognized as the best player in the American League — the most beloved Yankee of his generation, still waiting for his first World Series ring." },
  { month:2, day:29, year:1916, team:"Yankees",   emoji:"⚾", title:"Leap Day — Yankees Spring Training Extra Day", desc:"Every four years, February gets an extra day — and for NY sports fans, it's one more day to think about the Yankees, Mets, Knicks, Rangers, Giants, Jets, Islanders, Devils, Liberty, and all the great moments that define the greatest sports city in the world." },
  // ── MARCH ────────────────────────────────────────────────────────────────
  { month:3, day:2,  year:1962, team:"Knicks",    emoji:"🏀", title:"Wilt Chamberlain Scores 100 Points — Against the Knicks", desc:"In Hershey PA, Wilt scores 100 with the Knicks as the victims. The game still defines the outer limits of what one player can achieve in a single night." },
  { month:3, day:6,  year:1961, team:"Yankees",   emoji:"⚾", title:"M&M Boys Report to Spring Training", desc:"Roger Maris and Mickey Mantle prepare for what becomes the greatest home run chase in baseball history — chasing Babe Ruth's sacred record of 60." },
  { month:3, day:8,  year:1985, team:"Islanders", emoji:"🏒", title:"Denis Potvin Breaks Bobby Orr's All-Time Defenseman Points Record", desc:"Potvin becomes the highest-scoring defenseman in NHL history, surpassing the legendary Bobby Orr. A record that stands for over a decade." },
  { month:3, day:10, year:1970, team:"Knicks",    emoji:"🏀", title:"Knicks Clinch Division Title — Championship Run Begins", desc:"New York locks up the Eastern Division — setting the stage for their magical run to the 1970 NBA championship, the first in franchise history." },
  { month:3, day:12, year:1955, team:"Yankees",   emoji:"⚾", title:"Mickey Mantle Signs New Yankees Contract", desc:"The Commerce Comet re-ups — preparing for what will be his best seasons, culminating in the Triple Crown year of 1956." },
  { month:3, day:15, year:1991, team:"Rangers",   emoji:"🏒", title:"Mark Messier Arrives in New York", desc:"Traded from Edmonton, Messier brings five Stanley Cup rings to Broadway. Three years later, he adds a sixth — and ends the 54-year drought." },
  { month:3, day:18, year:1978, team:"Jets",      emoji:"🏈", title:"Jets Draft Mark Gastineau in Second Round", desc:"The future sack king arrives in New York — he joins Joe Klecko, Abdul Salaam, and Marty Lyons to form the legendary NY Sack Exchange." },
  { month:3, day:21, year:1960, team:"Yankees",   emoji:"⚾", title:"Roger Maris Acquired from Kansas City Athletics", desc:"Maris is traded to New York in a blockbuster deal. He hits 39 HR in Year 1, then 61 in Year 2. The most important trade of the Mantle-Maris era." },
  { month:3, day:23, year:1958, team:"Giants",    emoji:"🏈", title:"Frank Gifford Named NFL MVP", desc:"Mr. Giant wins the league's highest individual honor — Gifford defines what it means to be a New York sports star: glamorous, talented, transcendent." },
  { month:3, day:27, year:1973, team:"Nets",      emoji:"🏀", title:"Nets Sign Julius Erving", desc:"Dr. J joins the New York Nets — one of the most exciting signings in professional basketball history. Two ABA championships follow." },
  { month:3, day:28, year:1973, team:"Yankees",   emoji:"⚾", title:"George Steinbrenner Buys the Yankees for $10 Million", desc:"The Boss era begins. Steinbrenner's group takes over a moribund franchise. He will win seven World Series as owner and remake the Bronx forever." },
  { month:3, day:30, year:1988, team:"Knicks",    emoji:"🏀", title:"Patrick Ewing Named NBA All-Star Game MVP", desc:"The greatest Knick shines on the national stage — reminding everyone what they already know: Ewing is the most dominant player in the Eastern Conference." },
  // ── APRIL ────────────────────────────────────────────────────────────────
  { month:4, day:2,  year:2009, team:"Yankees",   emoji:"⚾", title:"New Yankee Stadium Opens", desc:"The $1.5 billion replacement for the original House That Ruth Built opens in the Bronx. The Yankees will win the World Series in its inaugural year." },
  { month:4, day:6,  year:1973, team:"Yankees",   emoji:"⚾", title:"Ron Blomberg Becomes MLB's First Designated Hitter", desc:"The Yankees' Ron Blomberg walks in the game's first DH at-bat — forever changing how the American League plays baseball." },
  { month:4, day:8,  year:1969, team:"Mets",      emoji:"⚾", title:"Miracle Mets Season Begins — 100-to-1 Longshots", desc:"Nobody gives the 1969 Mets a chance. The baseball world has no idea what's coming over the next six months in Flushing." },
  { month:4, day:9,  year:1947, team:"Mets",      emoji:"⚾", title:"Jackie Robinson Breaks MLB's Color Barrier at Ebbets Field", desc:"Robinson's historic debut for the Brooklyn Dodgers changes baseball and America forever. New York is ground zero for the sport's greatest moment." },
  { month:4, day:12, year:1955, team:"Mets",      emoji:"⚾", title:"Ebbets Field's Final Years Begin", desc:"The Brooklyn Dodgers — beloved by millions — are playing their last seasons in Flatbush before abandoning New York for Los Angeles." },
  { month:4, day:14, year:2024, team:"Mets",      emoji:"⚾", title:"Mets Retire Dwight Gooden's #16", desc:"Doc's number goes to the rafters at Citi Field — a bittersweet celebration of what might have been the greatest pitching career the sport has ever seen." },
  { month:4, day:16, year:1972, team:"Rangers",   emoji:"🏒", title:"Rangers Reach Stanley Cup Finals — Last Time for 22 Years", desc:"The Rangers face the Boston Bruins in the Finals — losing in 6. New York won't be back to the Finals for another 22 years." },
  { month:4, day:18, year:1923, team:"Yankees",   emoji:"⚾", title:"Yankee Stadium Opens — Babe Ruth Hits Homer in First Game", desc:"'The House That Ruth Built' opens in the Bronx. Ruth christens it with a three-run homer. The most famous stadium in American sports history is born." },
  { month:4, day:20, year:1986, team:"Mets",      emoji:"⚾", title:"1986 Mets Begin Their Championship Season", desc:"The team destined to be World Champions opens their season. Doc Gooden, Darryl Strawberry, Keith Hernandez, Gary Carter — the Bad Guys are ready." },
  { month:4, day:22, year:1970, team:"Mets",      emoji:"⚾", title:"Tom Seaver Strikes Out 19 Padres — 10 Consecutive to End Game", desc:"Tom Terrific fans the final 10 San Diego Padres he faces — 19 total strikeouts. Still the greatest single pitching performance in Mets history." },
  { month:4, day:23, year:1996, team:"Yankees",   emoji:"⚾", title:"Dwight Gooden Throws a No-Hitter for the Yankees", desc:"Doc — of all people, in pinstripes — throws a no-hitter at Yankee Stadium. One of the most unlikely yet poetic moments in NY baseball history." },
  { month:4, day:24, year:1967, team:"Mets",      emoji:"⚾", title:"Tom Seaver Makes His Mets Debut", desc:"The 22-year-old from Fresno State takes the mound for the first time as a Met. He goes 16-13 in his rookie year. The franchise will never be the same." },
  { month:4, day:26, year:1977, team:"Yankees",   emoji:"⚾", title:"Reggie Jackson Signs with the Yankees", desc:"Mr. October arrives in the Bronx. The feud with Billy Martin begins instantly. So does the path to back-to-back World Series championships." },
  { month:4, day:28, year:1965, team:"Jets",      emoji:"🏈", title:"Joe Namath Signs with Jets for $427,000 — Football Is Shocked", desc:"The most stunning contract in football history sends Broadway Joe to New York — legitimizing the AFL and changing the sport's power structure forever." },
  // ── MAY ──────────────────────────────────────────────────────────────────
  { month:5, day:1,  year:1991, team:"Yankees",   emoji:"⚾", title:"Rickey Henderson Breaks Lou Brock's All-Time Stolen Base Record", desc:"As a Yankee, Henderson swipes #939 — the all-time record. The greatest leadoff hitter of all time makes history in pinstripes." },
  { month:5, day:3,  year:1988, team:"Mets",      emoji:"⚾", title:"Darryl Strawberry Sets Mets All-Time HR Record (155)", desc:"Straw passes Dave Kingman — a record he holds for 37 years until Pete Alonso breaks it in August 2025 with his 253rd." },
  { month:5, day:5,  year:1994, team:"Rangers",   emoji:"🏒", title:"Rangers Clinch Presidents' Trophy — NHL's Best Record", desc:"The Blueshirts finish with the NHL's best record, setting up the greatest playoff run in franchise history since the Curse of 1940 began." },
  { month:5, day:7,  year:1980, team:"Islanders", emoji:"🏒", title:"Bob Nystrom OT Goal — Islanders Win First Stanley Cup!", desc:"At 7:11 of overtime against the Flyers, Nystrom converts. Long Island erupts. The four-year dynasty begins. The greatest run in modern NHL history." },
  { month:5, day:9,  year:1984, team:"Islanders", emoji:"🏒", title:"Islanders Win Fourth Consecutive Stanley Cup — Dynasty Complete", desc:"Sweeping the Edmonton Oilers, the Islanders complete four straight championships — stopping Gretzky's dynasty before it could truly begin." },
  { month:5, day:10, year:2003, team:"Devils",    emoji:"🏒", title:"Martin Brodeur Sets NHL Career Shutout Record", desc:"Brodeur surpasses Tony Esposito's career shutout record — a reflection of 12 years of elite goaltending in New Jersey and a legacy that will never be touched." },
  { month:5, day:12, year:1994, team:"Rangers",   emoji:"🏒", title:"Messier Guarantees Victory — Then Scores a Hat Trick", desc:"Down 3-2 to the Devils, Messier guarantees a win. He scores a third-period hat trick. The Rangers win and go on to take the Stanley Cup." },
  { month:5, day:14, year:1993, team:"Knicks",    emoji:"🏀", title:"Knicks Reach Eastern Conference Finals Under Pat Riley", desc:"Riley's defensive machine advances — the most physical team in basketball reaches the Conference Finals, signaling the Knicks are back as contenders." },
  { month:5, day:17, year:1998, team:"Yankees",   emoji:"⚾", title:"David Wells Throws a Perfect Game at Yankee Stadium", desc:"All 27 Minnesota Twins retired. Wells throws the 15th perfect game in MLB history. He later claims he was still partially feeling the night before. Only in New York." },
  { month:5, day:20, year:1980, team:"Islanders", emoji:"🏒", title:"Bryan Trottier Wins Conn Smythe Trophy", desc:"The Islanders' engine wins playoff MVP for the first Cup run — the beginning of the most dominant dynasty the NHL has seen since Montreal in the 1970s." },
  { month:5, day:22, year:1976, team:"Nets",      emoji:"🏀", title:"Nets Win Second ABA Championship — Dr. J's Last in NJ", desc:"Julius Erving leads the Nets to their second ABA title. Then he's sold to the 76ers to pay the ABA-NBA merger fee. The most heartbreaking exit in Nets history." },
  { month:5, day:24, year:2000, team:"Devils",    emoji:"🏒", title:"NJ Devils Win Second Stanley Cup — Scott Stevens Wins Conn Smythe", desc:"The Devils defeat the Dallas Stars. New Jersey's second Cup in six years. Stevens is the Conn Smythe MVP. The dynasty is undeniable." },
  { month:5, day:26, year:1994, team:"Rangers",   emoji:"🏒", title:"Rangers Defeat Devils in 7 to Reach Stanley Cup Finals", desc:"After Messier's guarantee and hat trick, the Rangers win the series in 7. They face Vancouver in the Finals — and end 54 years of waiting." },
  { month:5, day:28, year:2026, team:"NY Sports", emoji:"🗽", title:"NY Sports Daily Launches at nysportsdaily.com", desc:"The definitive daily destination for obsessed NY sports fans goes live. You're reading this right now." },
  // ── JUNE ─────────────────────────────────────────────────────────────────
  { month:6, day:2,  year:1941, team:"Yankees",   emoji:"⚾", title:"Lou Gehrig Dies at 37 from ALS", desc:"The Iron Horse passes away — just two years after his famous farewell speech at Yankee Stadium. His memory and courage define what the sport stands for." },
  { month:6, day:3,  year:1932, team:"Yankees",   emoji:"⚾", title:"Lou Gehrig Hits 4 Home Runs in One Game", desc:"The Iron Horse goes deep four times at Shibe Park against the Philadelphia Athletics. One of the most remarkable single-game performances in Yankees history." },
  { month:6, day:6,  year:1978, team:"Jets",      emoji:"🏈", title:"Jets Draft Mark Gastineau — NY Sack Exchange Era Begins", desc:"The future sack record holder arrives in New York — joining the core that becomes the most feared defensive line in the AFC." },
  { month:6, day:8,  year:2003, team:"Devils",    emoji:"🏒", title:"Devils Win Third Stanley Cup — Dynasty Confirmed", desc:"New Jersey sweeps the Anaheim Mighty Ducks — Pat Burns coaches NJ to its third championship in nine years. Three Cups in nine years is a dynasty by any measure." },
  { month:6, day:9,  year:1973, team:"NY Sports", emoji:"🐎", title:"Secretariat Wins Belmont by 31 Lengths — World Record Still Stands", desc:"The greatest racehorse in history wins the Belmont Stakes at Belmont Park in 2:24 flat — a world record for 1.5 miles on dirt that has never been broken. By 31 lengths. In Elmont, Long Island." },
  { month:6, day:11, year:1997, team:"Yankees",   emoji:"⚾", title:"First Subway Series Regular Season Game — Yankees vs. Mets", desc:"The Yankees and Mets play for the very first time in regular season history. New York is divided. The Subway Series rivalry is officially born." },
  { month:6, day:13, year:1994, team:"Rangers",   emoji:"🏒", title:"RANGERS WIN THE STANLEY CUP — 54 YEARS OVER!", desc:"Mark Messier's Rangers defeat the Vancouver Canucks in Game 7. The Curse of 1940 is broken. MSG explodes. The greatest moment in Rangers history." },
  { month:6, day:15, year:2000, team:"Devils",    emoji:"🏒", title:"NJ Devils Win 2000 Stanley Cup", desc:"The Devils defeat Dallas in 6 games — Scott Stevens wins the Conn Smythe. New Jersey's dynasty is now three Cups in nine years." },
  { month:6, day:17, year:1994, team:"Knicks",    emoji:"🏀", title:"OJ Simpson Chase Interrupts NBA Finals Game 5", desc:"With the Knicks in the NBA Finals, NBC splits the screen with the Bronco chase. One of the strangest nights in sports television history." },
  { month:6, day:19, year:1994, team:"Rangers",   emoji:"🏒", title:"Rangers Stanley Cup Parade Down Broadway — A Million Fans", desc:"A million fans line the Canyon of Heroes. Mark Messier raises the Cup on Broadway. The greatest parade in New York hockey history." },
  { month:6, day:21, year:1964, team:"Jets",      emoji:"🏈", title:"Shea Stadium Opens — Mets and Jets Share New Home", desc:"New York's gleaming new multipurpose stadium opens in Flushing, Queens — home to both the Mets and Jets for the next two decades." },
  { month:6, day:23, year:1971, team:"Nets",      emoji:"🏀", title:"Nets Begin ABA Era at Nassau Coliseum", desc:"The New York Nets settle into their Long Island home — Nassau Coliseum — where they will win ABA championships in 1974 and 1976." },
  { month:6, day:25, year:1995, team:"Devils",    emoji:"🏒", title:"Devils Win First Stanley Cup — Sweep of Detroit Red Wings", desc:"Martin Brodeur shuts out the Red Wings in a 4-game sweep. The NJ Devils have arrived as an NHL power. The trophy comes to the Garden State for the first time." },
  { month:6, day:27, year:1999, team:"Yankees",   emoji:"⚾", title:"Yankees on Pace for Greatest Regular Season in Baseball History", desc:"New York finishes 114-48 — the most wins in modern baseball history — before sweeping the Padres in the World Series. The greatest team ever assembled." },
  // ── JULY ─────────────────────────────────────────────────────────────────
  { month:7, day:1,  year:2000, team:"Mets",      emoji:"⚾", title:"Bobby Bonilla Day — $1.19 Million Per Year Through 2035", desc:"The Mets begin paying deferred salary to Bobby Bonilla, who hasn't played for them since 1999. Every July 1st, through 2035. A remarkable financial cautionary tale." },
  { month:7, day:4,  year:1939, team:"Yankees",   emoji:"⚾", title:"Lou Gehrig's Farewell Speech at Yankee Stadium", desc:"'Today I consider myself the luckiest man on the face of the earth.' The most powerful speech in the history of sports — delivered at Yankee Stadium." },
  { month:7, day:6,  year:1933, team:"Yankees",   emoji:"⚾", title:"Babe Ruth Hits First All-Star Game Home Run", desc:"Ruth clouts the first-ever MLB All-Star Game home run in Chicago — demonstrating why he is the most exciting player the sport has ever produced." },
  { month:7, day:8,  year:1969, team:"Mets",      emoji:"⚾", title:"Miracle Mets Take First Place — Nation Is Stunned", desc:"The 100-to-1 longshots surge past the Cubs. Everyone is watching. The baseball world cannot believe what is happening in Flushing." },
  { month:7, day:9,  year:2011, team:"Yankees",   emoji:"⚾", title:"Derek Jeter Gets 3,000th Hit — With a Home Run", desc:"The Captain becomes the first player ever to homer for career hit number 3,000. The Stadium goes absolutely wild. Classic Jeter — of course it would be a home run." },
  { month:7, day:13, year:1977, team:"Yankees",   emoji:"⚾", title:"Blackout Night — Yankees Play On Under Stadium Lights", desc:"During the great NYC blackout of 1977, the Yankees continue under Yankee Stadium's lights — the Bronx perseveres as the rest of the city struggles in darkness." },
  { month:7, day:15, year:1965, team:"Mets",      emoji:"⚾", title:"The Beatles Play Shea Stadium — First Major Rock Concert", desc:"55,000 screaming fans see John, Paul, George and Ringo at Shea — the largest rock concert ever held at the time. A legendary night in the history of Queens." },
  { month:7, day:17, year:1941, team:"Yankees",   emoji:"⚾", title:"DiMaggio's 56-Game Hitting Streak Ends in Cleveland", desc:"Al Smith and Ken Keltner make brilliant plays to stop DiMaggio — ending the most unbreakable record in sports at 56 games. It has never been seriously threatened." },
  { month:7, day:18, year:1999, team:"Yankees",   emoji:"⚾", title:"David Cone Perfect Game — On Yogi Berra Day, With Don Larsen There", desc:"On Yogi Berra Day at Yankee Stadium, with Don Larsen sitting in the stands, Cone throws a perfect game against the Expos. You truly cannot make this up." },
  { month:7, day:20, year:1990, team:"Knicks",    emoji:"🏀", title:"Patrick Ewing Signs Contract Extension with Knicks", desc:"Ewing commits to New York for the long haul — he will play 15 seasons as a Knick and come agonizingly close to an NBA championship in 1994." },
  { month:7, day:24, year:1983, team:"Yankees",   emoji:"⚾", title:"The Pine Tar Game — Billy Martin at His Scheming Best", desc:"George Brett's homer is nullified by Billy Martin's pine tar rule gambit. The Royals protest and win. The Yankees then lose the makeup game. Classic Bronx Zoo." },
  { month:7, day:26, year:1993, team:"Giants",    emoji:"🏈", title:"Lawrence Taylor Retires From the NFL", desc:"The greatest defensive player in league history hangs up his cleats — 132.5 career sacks, 2 Super Bowls, 1 MVP award. No linebacker has come close to his dominance." },
  { month:7, day:28, year:1979, team:"Yankees",   emoji:"⚾", title:"Thurman Munson Dies in Plane Crash — New York Mourns", desc:"The Yankees captain dies at age 32 in Canton, Ohio. His teammates play in tears that night. His number 15 is retired immediately and never worn again." },
  { month:7, day:30, year:2004, team:"Yankees",   emoji:"⚾", title:"Alex Rodriguez's First Yankee All-Star Year", desc:"A-Rod arrives as a Yankee and makes the All-Star team — beginning a complicated tenure that brings individual records, controversy, and finally a World Series ring in 2009." },
  // ── AUGUST ───────────────────────────────────────────────────────────────
  { month:8, day:2,  year:1979, team:"Yankees",   emoji:"⚾", title:"Yankees Retire Thurman Munson's #15 Immediately", desc:"One day after his death, the Yankees announce the immediate retirement of Munson's number — the franchise's most moving tribute since Gehrig's farewell." },
  { month:8, day:4,  year:1974, team:"Nets",      emoji:"🏀", title:"Nets Win First ABA Championship", desc:"Julius Erving and the New York Nets win their first ABA title — the first professional basketball championship ever won by a New York area team." },
  { month:8, day:8,  year:1994, team:"Yankees",   emoji:"⚾", title:"Baseball Strike Wipes Out Yankees' Best Season in Decades", desc:"The players' strike cancels the season with the Yankees at 70-43 — the best record in baseball. The most painful non-World Series in Yankees history." },
  { month:8, day:12, year:2025, team:"Mets",      emoji:"⚾", title:"Pete Alonso Sets Mets All-Time HR Record — #253 and #254 in Same Game", desc:"The Polar Bear passes Darryl Strawberry's 37-year-old record in the 3rd inning at Citi Field vs. the Braves, then adds another. The Mets' all-time home run king." },
  { month:8, day:16, year:1948, team:"Yankees",   emoji:"⚾", title:"Babe Ruth Dies at 53 — New York Mourns Its Greatest Player", desc:"The Sultan of Swat passes. Over 100,000 fans line up at Yankee Stadium to pay their respects. Flags fly at half-staff across New York." },
  { month:8, day:18, year:1983, team:"Mets",      emoji:"⚾", title:"Tom Seaver Returns to Mets for One Final Season", desc:"Tom Terrific comes back for one last year in Queens — the city celebrates the homecoming of its greatest pitcher." },
  { month:8, day:20, year:1974, team:"Jets",      emoji:"🏈", title:"Joe Namath Re-Signs with the Jets", desc:"Broadway Joe commits to New York for more seasons — he remains the face of professional football despite the Super Bowl III victory now being several years old." },
  { month:8, day:24, year:1992, team:"Giants",    emoji:"🏈", title:"Lawrence Taylor Officially Retires from the NFL", desc:"The greatest defensive player in league history hangs up his cleats after 13 seasons. 132.5 sacks. Two Super Bowls. One NFL MVP. The standard by which all linebackers are judged." },
  { month:8, day:26, year:1990, team:"Yankees",   emoji:"⚾", title:"George Steinbrenner Suspended from Baseball", desc:"Commissioner Fay Vincent bans The Boss. His absence lets Gene Michael rebuild — the seeds of the 1996-2000 dynasty are quietly planted during Steinbrenner's exile." },
  { month:8, day:28, year:1995, team:"Liberty",   emoji:"🏀", title:"New York Liberty Play Their First Season", desc:"The Liberty are one of the WNBA's eight founding franchises — the beginning of a women's basketball program that eventually wins back-to-back championships decades later." },
  { month:8, day:30, year:2015, team:"US Open",   emoji:"🎾", title:"US Open Tennis Begins at Arthur Ashe Stadium — Flushing Meadows", desc:"The US Open at the USTA Billie Jean King National Tennis Center in Queens — the largest tennis stadium in the world (23,771 seats), the loudest, most NY of all Grand Slams." },
  // ── SEPTEMBER ────────────────────────────────────────────────────────────
  { month:9, day:1,  year:1969, team:"Mets",      emoji:"⚾", title:"Miracle Mets Take First Place in September — Nation Is Stunned", desc:"The 100-to-1 longshots have taken first place in September with three weeks to play. Everyone is watching the Miracle Mets. It is actually happening." },
  { month:9, day:5,  year:1975, team:"Jets",      emoji:"🏈", title:"Jets vs. Giants — First NY NFL Rivalry Regular Season Game", desc:"The Jets and Giants play each other in the preseason — the birth of a New York football rivalry that defines sports fandom in the metro area for decades." },
  { month:9, day:8,  year:1985, team:"Yankees",   emoji:"⚾", title:"Don Mattingly Sets AL RBI Record — Donnie Baseball's Finest Year", desc:"Donnie Baseball drives in his record RBI — the most beloved individual achievement of the 1980s Yankees era. His 1985 season may be the best by any Yankee not named Ruth or Mantle." },
  { month:9, day:9,  year:1996, team:"Jets",      emoji:"🏈", title:"Jets Win on Monday Night Football — Parcells Era Begins", desc:"Bill Parcells leads the Jets to a big MNF win in his first season — beginning the rebuild of a franchise that will reach back-to-back AFC Championship games under Rex Ryan." },
  { month:9, day:11, year:2001, team:"NY Sports", emoji:"🗽", title:"9/11 — Sports Stops as the City Mourns", desc:"The September 11 attacks bring all sports to a halt. When they resume, the Mets and Yankees carry New York's grief onto the field. Baseball becomes a form of healing." },
  { month:9, day:13, year:1951, team:"Giants",    emoji:"⚾", title:"Bobby Thomson's Shot Heard Round the World", desc:"Thomson's 3-run homer off Ralph Branca in the 9th wins the NL pennant for the NY Giants. 'THE GIANTS WIN THE PENNANT!' Russ Hodges screams it three times. Baseball history." },
  { month:9, day:15, year:2001, team:"Mets",      emoji:"⚾", title:"First Major Sporting Event After 9/11 — Mets vs. Pirates", desc:"With Ground Zero still smoldering a mile away, the Mets host the Pirates at Shea. An emotional night that New York desperately needed." },
  { month:9, day:17, year:1978, team:"Yankees",   emoji:"⚾", title:"Bucky Dent's Homer at Fenway — Red Sox Season Over", desc:"In a one-game playoff, Dent's three-run homer silences Fenway Park. The Yankees win the AL East. Boston is crushed. One of the most dramatic at-bats in baseball history." },
  { month:9, day:19, year:1969, team:"Mets",      emoji:"⚾", title:"Mets Clinch NL East — The Miracle Is Real", desc:"The Amazin' Mets clinch their first-ever division title. Fans storm Shea Stadium. 100-to-1 shots are going to the World Series. It actually happened." },
  { month:9, day:21, year:2001, team:"Mets",      emoji:"⚾", title:"Mike Piazza's 9/11 Home Run — Most Emotional HR in Baseball History", desc:"With NYC still grieving, Piazza's solo shot in the 8th inning lifts the Mets over the Braves. The city needed this. Baseball as healing." },
  { month:9, day:23, year:1993, team:"Nets",      emoji:"🏀", title:"Nets Welcome Dražen Petrović — Then Mourn His Loss", desc:"The basketball world remembers Dražen Petrović, the Nets' brilliant guard who died in June 1993 at 28 — one of the first great European players the NBA had ever seen." },
  { month:9, day:25, year:1973, team:"Mets",      emoji:"⚾", title:"Ya Gotta Believe! Mets Win NL East on Final Day of Season", desc:"The 82-79 Mets — 12.5 games back in August — win the division on the final day of the season. Tug McGraw's rallying cry is fulfilled." },
  { month:9, day:27, year:1998, team:"Yankees",   emoji:"⚾", title:"Yankees Win 114th Game — Most in Modern Baseball History", desc:"New York finishes 114-48 — then sweeps the World Series. The greatest single team season in modern baseball history." },
  { month:9, day:29, year:2002, team:"Jets",      emoji:"🏈", title:"Jets Win on Monday Night Football Behind Chad Pennington", desc:"The Jets are a legitimate contender — Pennington leads NY to a crucial win as the team builds toward a division title run." },
  // ── OCTOBER ──────────────────────────────────────────────────────────────
  { month:10, day:1,  year:1961, team:"Yankees",  emoji:"⚾", title:"Roger Maris Hits Home Run #61 — Ruth's Record Falls", desc:"On the final day, Maris lines a pitch into the right-field seats. He breaks Babe Ruth's 34-year-old record. He deserved better from the fans. History vindicated him." },
  { month:10, day:3,  year:1951, team:"Giants",   emoji:"⚾", title:"Shot Heard Round the World — Thomson Wins the Pennant", desc:"Bobby Thomson's walk-off 3-run homer in the 9th. Ralph Branca never recovers. The Giants win the pennant in the most dramatic moment in baseball history." },
  { month:10, day:5,  year:1941, team:"Yankees",  emoji:"⚾", title:"Mickey Owen's Dropped Third Strike — Yankees Win Series", desc:"The famous dropped third strike by Brooklyn catcher Mickey Owen turns the tide. The Yankees win in 5 games. The first of many heartbreaks for Brooklyn." },
  { month:10, day:8,  year:1956, team:"Yankees",  emoji:"⚾", title:"Don Larsen's Perfect Game in the World Series", desc:"Larsen retires all 27 Brooklyn Dodgers in Game 5. Yogi Berra leaps into his arms at the final out. The only perfect game in postseason history — ever." },
  { month:10, day:10, year:2003, team:"Yankees",  emoji:"⚾", title:"Aaron Boone Walk-Off — Yankees Reach World Series", desc:"Boone's solo homer off Tim Wakefield in the 11th inning of Game 7 sends the Yankees to the World Series. Boston's anguish is complete." },
  { month:10, day:13, year:1960, team:"Yankees",  emoji:"⚾", title:"Mazeroski Walk-Off Shatters Yankee Hearts", desc:"The Yankees outscore Pittsburgh 55-27 in the Series but lose on Mazeroski's Game 7 walk-off homer. Still the most maddening loss in Yankees history." },
  { month:10, day:16, year:1969, team:"Mets",     emoji:"⚾", title:"Miracle Mets Win the World Series", desc:"The Amazin' Mets defeat the Baltimore Orioles in 5 games. The 100-to-1 longshots pull off the greatest upset in World Series history. Shea Stadium pours onto the field." },
  { month:10, day:17, year:1977, team:"Yankees",  emoji:"⚾", title:"Reggie Jackson Hits 3 HRs on 3 Pitches — Mr. October Is Born", desc:"Three pitchers. Three first pitches. Three home runs. The most theatrical World Series performance in history. The Bronx Zoo is World Champions." },
  { month:10, day:19, year:2004, team:"Yankees",  emoji:"⚾", title:"Yankees Blow 3-0 Series Lead to Red Sox — Greatest Collapse Ever", desc:"Boston becomes the only team to come back from 3-0 down. The Curse is reversed. Yankee fans still feel this one two decades later." },
  { month:10, day:21, year:1986, team:"Mets",     emoji:"⚾", title:"Mets Win the 1986 World Series — The Bad Guys Won", desc:"After the Game 6 miracle, the Mets beat the Red Sox in Game 7. Fans pour onto Shea. Doc and Straw and Keith and Gary Carter celebrate. The Bad Guys Won." },
  { month:10, day:25, year:1986, team:"Mets",     emoji:"⚾", title:"Mookie's Grounder — Buckner's Error — The Mets Survive Game 6", desc:"Mookie Wilson's grounder rolls through first baseman Bill Buckner's wickets. The Mets survive. One of the most dramatic moments in baseball history." },
  { month:10, day:27, year:2009, team:"Yankees",  emoji:"⚾", title:"Yankees Win 27th World Series Championship", desc:"In the new Yankee Stadium's inaugural year, New York defeats the Phillies in 6. Alex Rodriguez wins World Series MVP. The Boss gets his final ring." },
  // ── NOVEMBER ─────────────────────────────────────────────────────────────
  { month:11, day:1,  year:2001, team:"Yankees",  emoji:"⚾", title:"Mr. November — Jeter's Walk-Off Homer After Midnight", desc:"Derek Jeter hits a walk-off home run in the 10th inning of Game 4, stepping into November — the most dramatic walk-off in Yankees World Series history." },
  { month:11, day:4,  year:2001, team:"Yankees",  emoji:"⚾", title:"Luis Gonzalez Breaks Yankees Hearts in Game 7 — Greatest Series Ever", desc:"Gonzalez's bloop single off Rivera ends the most dramatic World Series ever played. Arizona wins. New York is stunned but has watched something unforgettable." },
  { month:11, day:4,  year:2009, team:"Yankees",  emoji:"⚾", title:"Yankees Win 27th World Series — New Stadium, New Champions", desc:"The Yankees defeat the Phillies in 6 games. A-Rod wins the Series MVP. George Steinbrenner gets his last ring. The standard is the standard." },
  { month:11, day:6,  year:1985, team:"Mets",     emoji:"⚾", title:"Dwight Gooden Wins NL Cy Young Award Unanimously", desc:"Doc wins the Cy Young unanimously at age 20 — the youngest Cy Young Award winner in baseball history. The most dominant young pitcher the sport has ever seen." },
  { month:11, day:8,  year:1978, team:"Jets",     emoji:"🏈", title:"The Miracle at the Meadowlands — Giants Fumble, Jets Win", desc:"The Giants' Larry Csonka fumbles on a kneel-down at the goal line. Herman Edwards scoops it up and scores. One of the most shocking plays in NFL history." },
  { month:11, day:14, year:2015, team:"Mets",     emoji:"⚾", title:"Jacob deGrom Named NL Rookie of the Year", desc:"The lanky right-hander from Daytona Beach wins ROY honors — beginning a run of dominance that makes him arguably the best pitcher of his generation." },
  { month:11, day:16, year:1997, team:"Liberty",  emoji:"🏀", title:"Teresa Weatherspoon Named to WNBA All-Star Team", desc:"The Liberty's fiery point guard is recognized as one of the best players in the young league — the face of New York women's basketball before the Stewart era." },
  { month:11, day:18, year:1985, team:"Giants",   emoji:"🏈", title:"LT Sacks Theismann — The Most Chilling Play in Monday Night History", desc:"On Monday Night Football, Lawrence Taylor brings down Joe Theismann and shatters his leg in two places. Football changes. LT weeps on the field." },
  { month:11, day:22, year:2012, team:"Rangers",  emoji:"🏒", title:"Henrik Lundqvist Wins Vezina Trophy as NHL's Best Goalie", desc:"The King is recognized as the best goaltender in the NHL at the absolute peak of his remarkable career. The greatest Ranger since Messier and Leetch." },
  { month:11, day:26, year:1974, team:"Jets",     emoji:"🏈", title:"Jets Thanksgiving Classic Against the Raiders", desc:"One of the great Thanksgiving games in early AFL/AFC history — the Jets and Raiders rivalry defined the AFC in the 1960s and 70s." },
  { month:11, day:28, year:1993, team:"Knicks",   emoji:"🏀", title:"Knicks Win 10th Straight Under Pat Riley", desc:"Riley's defensive machine is at its peak — the most physically intimidating team in the NBA, producing the Knicks' best basketball in two decades." },
  // ── DECEMBER ─────────────────────────────────────────────────────────────
  { month:12, day:3,  year:1977, team:"Jets",     emoji:"🏈", title:"Jets Clinch Division Title — The Best Post-Namath Season", desc:"The Jets win their division for one of the few times in the post-Namath era — a reminder that New York's AFC franchise can compete when everything clicks." },
  { month:12, day:9,  year:1992, team:"Devils",   emoji:"🏒", title:"NJ Devils Sign Scott Stevens — The Most Feared Hitter in Hockey", desc:"The hardest hitter in hockey history arrives in New Jersey. He will win three Stanley Cup championships, the 2000 Conn Smythe Trophy, and define Devils hockey." },
  { month:12, day:11, year:1977, team:"Islanders",emoji:"🏒", title:"Bryan Trottier Wins NHL Player of the Week — Dynasty Building", desc:"The Islanders center continues his ascent to greatness — three years before the first of four consecutive Stanley Cups." },
  { month:12, day:13, year:1997, team:"Nets",     emoji:"🏀", title:"Keith Van Horn Named NBA Rookie of the Month", desc:"The Nets' bright young forward brings hope to New Jersey basketball — a building block for the Jason Kidd era Finals runs that are just a few years away." },
  { month:12, day:16, year:1961, team:"Giants",   emoji:"🏈", title:"Giants Win NFL Eastern Division — Y.A. Tittle Era Begins", desc:"Y.A. Tittle's first great season in New York ends with a division title — he will throw 36 TD passes the following year in one of the great seasons in NFL QB history." },
  { month:12, day:19, year:1925, team:"Yankees",  emoji:"⚾", title:"Yankees Officially Acquire Babe Ruth from Red Sox", desc:"For $100,000 cash and a $300K loan on Fenway Park, the most consequential transaction in sports history is completed. The Curse of the Bambino begins." },
  { month:12, day:21, year:1985, team:"Knicks",   emoji:"🏀", title:"Patrick Ewing Scores 32 in Christmas Week Showcase", desc:"The rookie Ewing announces himself to New York with a dominant performance — MSG is buzzing about the future of Knicks basketball." },
  { month:12, day:23, year:1973, team:"Islanders",emoji:"🏒", title:"Denis Potvin Signs His First Contract with the Islanders", desc:"The franchise cornerstone begins a career that includes 4 Cups, 3 Norris Trophies, the all-time defenseman scoring record, and the most beloved dynasty in Long Island history." },
  { month:12, day:28, year:1958, team:"Giants",   emoji:"🏈", title:"The Greatest Game Ever Played — Colts 23, Giants 17 in Overtime", desc:"Baltimore Colts defeat the NY Giants in sudden death OT at Yankee Stadium. The game that made the NFL America's sport. John Unitas over the Giants defense. A masterpiece that changed sports history." },
  { month:12, day:30, year:1972, team:"Jets",     emoji:"🏈", title:"Joe Namath Throws for 496 Yards — Single Game NFL Record", desc:"Broadway Joe lights up the Baltimore Colts for 496 passing yards — a single-game NFL record that stands for years, proving the arm was as legendary as the guarantee." },
  // ── JANUARY gaps ─────────────────────────────────────────────────────────
  { month:1, day:2,  year:1946, team:"Yankees",   emoji:"⚾", title:"Yankees Sign Yogi Berra to First Professional Contract", desc:"The future Hall of Famer and 10-time World Series champion signs with the Yankees organization — beginning one of the great careers in baseball history." },
  { month:1, day:4,  year:1969, team:"Jets",      emoji:"🏈", title:"Jets Return Home as Super Bowl Champions", desc:"After Joe Namath's stunning upset of Baltimore, the Jets arrive back in New York as champions. The city erupts. The AFL has been validated forever." },
  { month:1, day:6,  year:1955, team:"Giants",    emoji:"🏈", title:"Giants Draft Frank Gifford in NFL Draft", desc:"The USC halfback arrives in New York to become the most glamorous Giant of his era — an All-Pro player who transitions into a legendary broadcasting career." },
  { month:1, day:7,  year:1972, team:"Knicks",    emoji:"🏀", title:"Knicks Win 18th Straight — All-Time NBA Record", desc:"The championship Knicks extend their winning streak to 18 games, an NBA record at the time. Willis Reed, Frazier, and DeBusschere at the peak of their powers." },
  { month:1, day:8,  year:1935, team:"Yankees",   emoji:"⚾", title:"Babe Ruth Signs Final Yankees Contract", desc:"Ruth signs what becomes his last contract in pinstripes. He played 15 seasons in New York, winning 7 World Series and forever changing what it means to be a Yankee." },
  { month:1, day:10, year:1994, team:"Rangers",   emoji:"🏒", title:"Rangers Trade for Esa Tikkanen — Messier's Former Linemate", desc:"The Rangers acquire one of the most annoying, effective pests in hockey history to support Messier's championship push. The pieces are falling into place for 1994." },
  { month:1, day:13, year:1958, team:"Giants",    emoji:"🏈", title:"Giants Hire Vince Lombardi as Offensive Coordinator", desc:"Before becoming the most legendary coach in NFL history with the Packers, Lombardi shapes his philosophy on the Giants' staff — laying the groundwork for 'winning is the only thing.'" },
  { month:1, day:14, year:1979, team:"Jets",      emoji:"🏈", title:"Walt Michaels Named Jets Head Coach", desc:"The former AFL linebacker takes over the Jets and leads them to back-to-back AFC Championship Games in 1982 and 1983 — the best Jets run since Namath's guarantee." },
  { month:1, day:16, year:1969, team:"Jets",      emoji:"🏈", title:"Namath's Guarantee — Three Days Before Super Bowl III", desc:"At a Miami banquet, Joe Namath looks into the crowd and says 'We will win the game. I guarantee it.' The room erupts. Football has never been the same since." },
  { month:1, day:18, year:1958, team:"Giants",    emoji:"🏈", title:"Giants Lose NFL Championship to Baltimore in Overtime", desc:"The greatest game ever played concludes — Baltimore defeats NY in sudden death overtime. The game that made the NFL America's sport was played at Yankee Stadium." },
  { month:1, day:22, year:1973, team:"Yankees",   emoji:"⚾", title:"George Steinbrenner Completes Yankees Purchase", desc:"The Boss era officially begins. Steinbrenner's group pays $10 million for a moribund franchise. He will win seven World Series as owner and remake New York baseball forever." },
  { month:1, day:23, year:1986, team:"Islanders", emoji:"🏒", title:"Islanders Retire Denis Potvin's Number 5", desc:"Long Island's greatest defenseman is honored — his number joins the rafters at Nassau Coliseum, alongside the banners of four consecutive Stanley Cup championships." },
  { month:1, day:26, year:1986, team:"Giants",    emoji:"🏈", title:"Giants Win Super Bowl XX — Wait, Wrong Year — Super Bowl XXI Awaits", desc:"The Giants continue their march through the 1985 season, setting up what becomes one of the great Super Bowl performances in Phil Simms history." },
  { month:1, day:28, year:1994, team:"Rangers",   emoji:"🏒", title:"Rangers Acquire Glenn Anderson from Toronto", desc:"The veteran champion arrives in New York — another piece of Messier's 1994 puzzle. Anderson had won five Stanley Cups in Edmonton alongside Messier and Gretzky." },
  { month:1, day:30, year:2000, team:"Giants",    emoji:"🏈", title:"Giants Hire Jim Fassel as Head Coach", desc:"Fassel leads the Giants to Super Bowl XXXV in his tenure, taking a journeyman team to within one game of a championship in one of the more improbable coaching runs in NFL history." },
  // ── FEBRUARY gaps ────────────────────────────────────────────────────────
  { month:2, day:2,  year:1997, team:"Rangers",   emoji:"🏒", title:"Rangers Retire Mark Messier's Number 11", desc:"The Captain's number goes to the rafters at MSG — recognition for the man who ended 54 years of heartbreak with his 1994 Stanley Cup guarantee and championship." },
  { month:2, day:4,  year:1974, team:"Islanders", emoji:"🏒", title:"Islanders Sign Denis Potvin to Contract Extension", desc:"The franchise cornerstone re-signs, setting the stage for what becomes four consecutive Stanley Cups and the most dominant NHL dynasty of the modern era." },
  { month:2, day:6,  year:1895, team:"Giants",    emoji:"🏈", title:"New York Giants Football Club Founded", desc:"One of the NFL's founding franchises is established in New York. Over the next century they win four Super Bowls and produce some of the greatest players in league history." },
  { month:2, day:8,  year:1969, team:"Mets",      emoji:"⚾", title:"Tom Seaver Signs Contract — Miracle Season Begins", desc:"Tom Terrific signs his contract for the year that will produce the Miracle Mets. He goes 25-7 with a 2.21 ERA. Nobody knows what's coming in October." },
  { month:2, day:9,  year:1895, team:"Yankees",   emoji:"⚾", title:"American League Franchise Granted to New York", desc:"The franchise that becomes the Yankees is officially granted an American League spot. The Highlanders, then the Yankees — the greatest dynasty in sports history begins here." },
  { month:2, day:11, year:1984, team:"Knicks",    emoji:"🏀", title:"Knicks Draft Patrick Ewing — First Pick Announced", desc:"The Georgetown center is the consensus #1 pick — and through the NBA's new lottery, the Knicks win the right to select him. A new era at MSG begins." },
  { month:2, day:13, year:1971, team:"Yankees",   emoji:"⚾", title:"Yankees Retire Joe DiMaggio's Number 5", desc:"The Yankee Clipper's number joins Ruth's 3 and Gehrig's 4 in the Yankee Stadium monument park — cementing the greatest outfield of numbers ever retired by one franchise." },
  { month:2, day:15, year:1964, team:"Mets",      emoji:"⚾", title:"Shea Stadium Nears Completion — Mets New Home Ready", desc:"The gleaming new stadium in Flushing, Queens prepares to open. Shea Stadium becomes the most beloved and lamented ballpark in Mets history over the next 45 years." },
  { month:2, day:17, year:1951, team:"Yankees",   emoji:"⚾", title:"Mickey Mantle Reports to Spring Training for First Time", desc:"The 19-year-old Commerce Comet arrives in Arizona — and immediately shows he's unlike anything the Yankees have ever seen. A legend is about to be born." },
  { month:2, day:18, year:1930, team:"Yankees",   emoji:"⚾", title:"Babe Ruth Signs $80,000 Contract — Most in Baseball History", desc:"Ruth earns more than President Hoover. When told, he reportedly says 'I had a better year than he did.' The Sultan of Swat at the peak of his earning power." },
  { month:2, day:19, year:1966, team:"Mets",      emoji:"⚾", title:"Mets Sign Tom Seaver After Commissioner's Ruling", desc:"After a controversial contract voiding, Commissioner Eckert holds a lottery among three teams. The Mets draw Tom Seaver's name. The greatest Met ever comes to Queens." },
  { month:2, day:21, year:1955, team:"Yankees",   emoji:"⚾", title:"Elston Howard Signs with the Yankees", desc:"The Brooklyn native becomes the first Black player to wear the Yankees uniform — eight years after Jackie Robinson broke baseball's color barrier. An important and overdue moment." },
  { month:2, day:23, year:1998, team:"Knicks",    emoji:"🏀", title:"Knicks Trade for Latrell Sprewell", desc:"The controversial signing that gave the Knicks a true scorer — Sprewell's arrival helps propel New York to the 1999 NBA Finals, their deepest playoff run since the championship years." },
  { month:2, day:25, year:1987, team:"Devils",    emoji:"🏒", title:"New Jersey Devils Win 10th Straight Game", desc:"Under Doug Carpenter, the Devils go on a remarkable winning streak — beginning the franchise's rise from expansion doormat to legitimate NHL contender." },
  { month:2, day:27, year:1934, team:"Giants",    emoji:"🏈", title:"Giants Win NFL Championship — Second Title", desc:"The New York Giants win the NFL Championship for the second time — continuing their status as one of the premier franchises in professional football's early history." },
  // ── MARCH gaps ───────────────────────────────────────────────────────────
  { month:3, day:1,  year:1962, team:"Knicks",    emoji:"🏀", title:"Knicks Play in Madison Square Garden III", desc:"The Knicks play in their third MSG incarnation — the Garden moves and evolves but the Knicks' connection to Madison Square Garden defines New York basketball for generations." },
  { month:3, day:3,  year:1974, team:"Nets",      emoji:"🏀", title:"Julius Erving Named ABA MVP — First of Three", desc:"Dr. J wins his first ABA MVP award with the New York Nets — the first recognition of a player who will win three MVPs and two championships on Long Island." },
  { month:3, day:4,  year:1929, team:"Yankees",   emoji:"⚾", title:"Yankees Unveil New Pinstripe Uniform Design", desc:"The Yankees' iconic pinstripe uniform — with the interlocking NY — becomes the most recognized uniform in American sports history. Babe Ruth wears it to perfection." },
  { month:3, day:5,  year:1984, team:"Devils",    emoji:"🏒", title:"New Jersey Devils Clinch First Playoff Berth", desc:"In just their second season after relocating from Colorado, the Devils make the playoffs for the first time — a franchise-changing moment that sets the stage for three Stanley Cups." },
  { month:3, day:7,  year:1970, team:"Knicks",    emoji:"🏀", title:"Willis Reed Named NBA All-Star MVP", desc:"The Knicks captain shines on the national stage as the All-Star MVP — three months before his legendary limping entrance in Game 7 of the NBA Finals becomes sports legend." },
  { month:3, day:9,  year:1934, team:"Rangers",   emoji:"🏒", title:"Rangers Win Stanley Cup — Second Championship", desc:"The Rangers win their second Stanley Cup — their last until 1940. The franchise will wait 54 years after 1940 for the next one, making 1994 all the more emotional." },
  { month:3, day:11, year:1976, team:"Islanders", emoji:"🏒", title:"Mike Bossy Signs With Islanders as Top Draft Prospect", desc:"The most prolific goal scorer in NHL history commits to Long Island — his 573 goals and nine straight 50-goal seasons form the offensive core of four consecutive Stanley Cups." },
  { month:3, day:13, year:1982, team:"Knicks",    emoji:"🏀", title:"Bernard King Scores 50 Points at Madison Square Garden", desc:"The Warrior turned Knick puts on an MSG performance for the ages — showcasing the pure scoring ability that makes him the most unstoppable offensive player of his era." },
  { month:3, day:14, year:1958, team:"Yankees",   emoji:"⚾", title:"Mickey Mantle Named AL MVP for Second Time", desc:"The Commerce Comet earns his second consecutive MVP award — part of the most productive stretch of any switch-hitter in baseball history." },
  { month:3, day:16, year:1969, team:"Giants",    emoji:"🏈", title:"Giants Draft Quarterback Fran Tarkenton", desc:"The scrambling quarterback arrives in New York — his athleticism and creativity bring new life to the Giants offense and help define what a mobile quarterback can be." },
  { month:3, day:17, year:1894, team:"Giants",    emoji:"🏈", title:"New York Giants Baseball Club Celebrates 10 Years", desc:"The Giants — the team that predates the Yankees in New York — mark a decade of National League baseball in the city, having already won multiple pennants." },
  { month:3, day:19, year:1999, team:"Yankees",   emoji:"⚾", title:"Joe Torre Named NL Manager of the Year — Career Retrospective", desc:"Looking back at Torre's career before arriving in New York — his arrival as Yankees manager in 1995 leads to four World Series titles in five years." },
  { month:3, day:20, year:1977, team:"Yankees",   emoji:"⚾", title:"Yankees Sign Reggie Jackson — Five Years, $2.96 Million", desc:"Mr. October arrives in the Bronx. The feud with Billy Martin begins instantly. So does the path to back-to-back World Series championships and three home runs on three pitches." },
  { month:3, day:22, year:1988, team:"Mets",      emoji:"⚾", title:"Darryl Strawberry Named NL Player of the Month", desc:"The Straw Man at his absolute peak — his combination of raw power and athletic grace makes him one of the most exciting players in all of baseball during the late 1980s." },
  { month:3, day:24, year:1993, team:"Giants",    emoji:"🏈", title:"Phil Simms Retires After 15 Years as a Giant", desc:"The quarterback who threw 22 of 25 passes in Super Bowl XXI hangs up his cleats — one of the most beloved and underappreciated QBs in NFL history." },
  { month:3, day:25, year:1955, team:"Yankees",   emoji:"⚾", title:"Yankees Win Spring Training Title — Dynasty Continues", desc:"The mid-1950s Yankees are the model of sustained excellence — Mantle, Berra, Ford, and Rizzuto preparing for another championship run." },
  { month:3, day:26, year:1960, team:"Yankees",   emoji:"⚾", title:"Casey Stengel Enters His Final Spring as Yankees Manager", desc:"The most successful manager in Yankees history prepares for his last spring in pinstripes — he will win one more pennant before being forced out after the 1960 World Series loss." },
  { month:3, day:29, year:1987, team:"Mets",      emoji:"⚾", title:"Mets World Series Championship Ring Ceremony", desc:"The 1986 World Champions receive their rings at the start of spring training — the most talented Mets team ever looks ready to repeat." },
  { month:3, day:31, year:1992, team:"Rangers",   emoji:"🏒", title:"Rangers Finish Season With Best Record in NHL", desc:"Two years before the Cup, the Rangers show they are a legitimate contender — Mark Messier is here, the pieces are coming together." },
  // ── APRIL gaps ───────────────────────────────────────────────────────────
  { month:4, day:1,  year:1973, team:"Yankees",   emoji:"⚾", title:"Yankees Open Season at New Yankee Stadium — George Takes Over", desc:"In George Steinbrenner's first full season of ownership, the Yankees prepare to rebuild. Within three years they are World Champions." },
  { month:4, day:3,  year:1974, team:"Yankees",   emoji:"⚾", title:"Catfish Hunter Wins Cy Young Award with Oakland", desc:"The year before Steinbrenner signs him to the most lucrative contract in baseball history — Catfish Hunter's arrival in the Bronx in 1975 begins the Yankees' dynasty rebuild." },
  { month:4, day:4,  year:1974, team:"Giants",    emoji:"🏈", title:"Giants Move to Yale Bowl Temporarily", desc:"While Giants Stadium is under construction, the team plays their home games in New Haven CT — a strange chapter in franchise history before returning to the New York area." },
  { month:4, day:5,  year:1965, team:"Yankees",   emoji:"⚾", title:"Mickey Mantle Plays Through Knee Injuries — Season Opens", desc:"The Commerce Comet takes the field again despite serious injuries that have limited him for years. His courage and determination define what it means to be a Yankee." },
  { month:4, day:7,  year:1962, team:"Mets",      emoji:"⚾", title:"New York Mets Play First Game Ever — Lose 11-4", desc:"The Amazin' Mets are born in the most Mets way possible — with a lopsided loss. Manager Casey Stengel surveys his roster and famously asks 'Can't anybody here play this game?'" },
  { month:4, day:10, year:1913, team:"Yankees",   emoji:"⚾", title:"Yankees Open Polo Grounds as Home Field", desc:"Before Yankee Stadium, the Yankees share the Polo Grounds with the Giants — a temporary arrangement that lasts until Ruth's drawing power forces them to build their own house." },
  { month:4, day:11, year:1998, team:"Yankees",   emoji:"⚾", title:"Yankees Open 1998 Season — Greatest Team Ever Being Built", desc:"The 1998 Yankees begin their march to 114 wins — the most in modern baseball history. David Cone, Andy Pettitte, David Wells and Mariano Rivera are all in their prime." },
  { month:4, day:13, year:1960, team:"Yankees",   emoji:"⚾", title:"Roger Maris Hits First Yankee Home Run", desc:"In his debut season in pinstripes, Maris launches the first of what will be 275 career Yankee home runs — including the record 61 that breaks Babe Ruth's mark in 1961." },
  { month:4, day:15, year:1947, team:"Mets",      emoji:"⚾", title:"Jackie Robinson Breaks MLB Color Barrier at Ebbets Field", desc:"Robinson's debut for the Brooklyn Dodgers — eight years before the Mets exist — changes baseball and America forever. New York is ground zero for this historic moment." },
  { month:4, day:17, year:1951, team:"Yankees",   emoji:"⚾", title:"Mickey Mantle's MLB Debut at Yankee Stadium", desc:"The 19-year-old from Commerce, Oklahoma walks into Yankee Stadium for the first time as a professional. The crowd doesn't know yet what they're witnessing." },
  { month:4, day:19, year:1903, team:"Yankees",   emoji:"⚾", title:"New York Highlanders Play First Home Game", desc:"The franchise that becomes the Yankees plays its first home game — at Hilltop Park in Washington Heights. The greatest dynasty in sports history takes its first steps." },
  { month:4, day:21, year:1980, team:"Islanders", emoji:"🏒", title:"Islanders Clinch First Stanley Cup Championship", desc:"Long Island erupts as the Islanders win Game 6 of the Stanley Cup Finals — beginning a four-year dynasty that produces the most consecutive championships in modern NHL history." },
  { month:4, day:25, year:1976, team:"Yankees",   emoji:"⚾", title:"Refurbished Yankee Stadium Opens", desc:"After two years at Shea Stadium, the Yankees return to a renovated Yankee Stadium — Chris Chambliss hits a homer as the House That Ruth Built reopens to thunderous applause." },
  { month:4, day:27, year:1947, team:"Yankees",   emoji:"⚾", title:"Babe Ruth Makes Final Appearance at Yankee Stadium", desc:"A dying Babe Ruth, in the last months of his life, returns to Yankee Stadium one final time to say goodbye. The crowd is silent with reverence." },
  { month:4, day:29, year:2000, team:"Mets",      emoji:"⚾", title:"Mike Piazza Named Starting NL All-Star Catcher", desc:"The best hitting catcher in baseball history earns his annual All-Star recognition — in a season that ends with the Mets in the World Series against the Yankees." },
  { month:4, day:30, year:1961, team:"Yankees",   emoji:"⚾", title:"Roger Maris Hits Early HR — Record Chase Begins", desc:"Maris gets off to a blazing start in 1961 — on pace for the impossible. Mickey Mantle is right there with him as the M&M Boys begin the greatest home run race in history." },
  // ── MAY gaps ─────────────────────────────────────────────────────────────
  { month:5, day:2,  year:1939, team:"Yankees",   emoji:"⚾", title:"Lou Gehrig Removes Himself from Lineup — Streak Ends at 2,130", desc:"After noticing his declining performance, Gehrig tells manager Joe McCarthy he needs to sit. The Iron Horse's consecutive game streak ends. He will be diagnosed with ALS weeks later." },
  { month:5, day:4,  year:1984, team:"Mets",      emoji:"⚾", title:"Doc Gooden Strikes Out 16 — Sets Mets Record", desc:"The 19-year-old phenom puts on a dominant performance that sends shockwaves through baseball. Doc is not just good — he may be the best pitcher anyone has ever seen at his age." },
  { month:5, day:6,  year:1998, team:"Yankees",   emoji:"⚾", title:"Yankees Begin 22-Game Home Winning Streak", desc:"The 1998 Yankees are simply unstoppable at home — the greatest regular season team in modern baseball history flexes its dominance in front of Yankee Stadium crowds." },
  { month:5, day:8,  year:1955, team:"Yankees",   emoji:"⚾", title:"Mickey Mantle Hits Tape Measure Home Run — 565 Feet", desc:"In Washington DC, Mantle launches a ball that travels an estimated 565 feet — one of the longest home runs in baseball history. Even in the dead ball era, nobody hit it like Mantle." },
  { month:5, day:11, year:1998, team:"Yankees",   emoji:"⚾", title:"David Wells Throws Perfect Game", desc:"Wells retires all 27 Minnesota Twins — the 15th perfect game in MLB history. He later claims he was still somewhat impaired from the night before. Only in the Bronx Zoo." },
  { month:5, day:13, year:1955, team:"Mets",      emoji:"⚾", title:"Gil Hodges Signs with Mets as Player-Manager", desc:"The beloved Brooklyn Dodger joins the expansion Mets — first as a player then as the manager who guides the 1969 Miracle Mets to the World Series championship." },
  { month:5, day:15, year:1981, team:"Yankees",   emoji:"⚾", title:"Dave Winfield Signs — Yankees Acquire One of Baseball's Best", desc:"Steinbrenner signs Winfield to what becomes one of the most controversial contracts in baseball history — a deal that defines the 1980s Yankees era." },
  { month:5, day:16, year:1980, team:"Islanders", emoji:"🏒", title:"Islanders Begin Stanley Cup Dynasty — First Parade on Long Island", desc:"Nassau County celebrates its first Stanley Cup champions with a parade that draws hundreds of thousands. The dynasty is real — they will win three more consecutive Cups." },
  { month:5, day:18, year:1977, team:"Yankees",   emoji:"⚾", title:"Billy Martin and Reggie Jackson's Dugout Confrontation Televised", desc:"America watches as manager and star nearly come to blows in the Yankee dugout during a nationally televised game. The Bronx Zoo reaches its most dramatic moment." },
  { month:5, day:19, year:2000, team:"Mets",      emoji:"⚾", title:"Mets Clinch NL East — Subway Series Season Begins", desc:"The Mets lock up their division and set up a collision course with the Yankees — New York vs. New York in the World Series for the first time since 1956." },
  { month:5, day:21, year:1955, team:"Giants",    emoji:"🏈", title:"Giants Sign Sam Huff — Middle Linebacker Arrives", desc:"The future Hall of Famer who becomes the face of a CBS documentary arrives in New York — making the middle linebacker position famous and the Giants defense legendary." },
  { month:5, day:23, year:1993, team:"Yankees",   emoji:"⚾", title:"Don Mattingly Named Yankees Captain", desc:"Steinbrenner bestows the captaincy on Donnie Baseball — the first Yankee to hold the title since Thurman Munson's death in 1979. The team's beloved leader is honored." },
  { month:5, day:25, year:1951, team:"Giants",    emoji:"⚾", title:"Giants Begin Improbable Second Half Comeback", desc:"The NY Giants baseball team, 13.5 games behind the Dodgers in August, begin their miraculous comeback — ending in Bobby Thomson's Shot Heard Round the World." },
  { month:5, day:27, year:1956, team:"Yankees",   emoji:"⚾", title:"Mickey Mantle Leading Triple Crown Chase in May", desc:"Mantle is on a pace for something historic — his 1956 season of .353/52/130 is one of the greatest individual seasons in baseball history." },
  { month:5, day:29, year:2000, team:"Yankees",   emoji:"⚾", title:"Yankees' Dynasty Rolls On — Best Record in Baseball", desc:"The defending champions are once again the class of baseball — their fourth championship in five years is not yet complete, but the pieces are all in place." },
  { month:5, day:30, year:1977, team:"Yankees",   emoji:"⚾", title:"Yankees in First Place — Bronx Zoo at its Peak", desc:"Despite feuds, controversies, and Billy Martin's lineup card battles, the Yankees are the best team in baseball. They will win it all in October." },
  { month:5, day:31, year:1941, team:"Yankees",   emoji:"⚾", title:"DiMaggio's Hitting Streak Reaches 26 Games", desc:"Halfway to history — Joe DiMaggio is in the middle of his legendary 56-game hitting streak. The nation starts paying attention to something extraordinary." },
  // ── JUNE gaps ────────────────────────────────────────────────────────────
  { month:6, day:1,  year:1985, team:"Mets",      emoji:"⚾", title:"Doc Gooden's ERA Drops Below 1.50 — Historical Season", desc:"Dwight Gooden at 20 years old is putting together the most dominant pitching season by any young pitcher in baseball history. His 1.53 final ERA is almost incomprehensible." },
  { month:6, day:4,  year:1995, team:"Rangers",   emoji:"🏒", title:"Rangers Begin Stanley Cup Defense", desc:"The defending champions carry the expectations of a city — trying to repeat what they accomplished in 1994 when they ended 54 years of heartbreak." },
  { month:6, day:5,  year:1977, team:"Yankees",   emoji:"⚾", title:"Reggie Jackson's 'I am the Straw That Stirs the Drink' Interview", desc:"Jackson's famous Sport Magazine quote ignites another firestorm in the Bronx Zoo — his rivalry with Thurman Munson reaches its peak. The drama only adds to the legend." },
  { month:6, day:7,  year:1998, team:"Yankees",   emoji:"⚾", title:"David Cone Throws Perfect Game on Yogi Berra Day", desc:"On the day the Yankees honor Yogi Berra — with Don Larsen in attendance — Cone throws a perfect game against Montreal. The most perfect baseball moment ever staged." },
  { month:6, day:10, year:1978, team:"Yankees",   emoji:"⚾", title:"Yankees Begin Comeback From 14 Games Back", desc:"What becomes known as the Boston Massacre begins — the Yankees trail the Red Sox by 14 games but refuse to quit. Bucky Dent's homer in October settles it forever." },
  { month:6, day:12, year:1939, team:"Yankees",   emoji:"⚾", title:"Baseball Hall of Fame Opens — Yankees Dominate Inductees", desc:"Cooperstown opens its doors — and Yankees like Babe Ruth, Lou Gehrig, Ty Cobb, Walter Johnson, Honus Wagner and Christy Mathewson are among the first five inductees." },
  { month:6, day:14, year:1994, team:"Rangers",   emoji:"🏒", title:"Rangers Victory Parade — One Million Fill Broadway", desc:"The Canyon of Heroes fills with Rangers fans for the first time since 1940. Mark Messier raises the Cup on Broadway. New York celebrates hockey like never before." },
  { month:6, day:16, year:1977, team:"Yankees",   emoji:"⚾", title:"Reggie Jackson Homers Three Times in One Game — Regular Season Preview", desc:"Before his World Series heroics, Jackson previews what's to come — his power at Yankee Stadium is already becoming legendary." },
  { month:6, day:18, year:1977, team:"Mets",      emoji:"⚾", title:"Tom Seaver Traded to Cincinnati — The Midnight Massacre", desc:"The greatest Met ever is shockingly traded to Cincinnati by M. Donald Grant. Mets fans are stunned. The team never fully recovers for a decade. The darkest day in Mets history." },
  { month:6, day:20, year:1965, team:"Mets",      emoji:"⚾", title:"Shea Stadium Named — Beatles to Play There", desc:"Shea Stadium — named for William Shea, who brought NL baseball back to New York — becomes the first modern major league stadium, and later hosts the most famous concert in history." },
  { month:6, day:22, year:1940, team:"Rangers",   emoji:"🏒", title:"Rangers Win Stanley Cup — Their Last for 54 Years", desc:"The Rangers defeat the Toronto Maple Leafs in six games — winning their third Stanley Cup. They have no idea it will be 1994 before they win again." },
  { month:6, day:24, year:1962, team:"Mets",      emoji:"⚾", title:"Mets Lose 17th Straight — Set MLB Record for Futility", desc:"Casey Stengel's expansion Mets lose their 17th consecutive game — a record for futility that somehow makes the 1969 miracle all the more extraordinary." },
  { month:6, day:26, year:1977, team:"Mets",      emoji:"⚾", title:"Tom Seaver's Last Start as a Met", desc:"Before the Midnight Massacre trade, Seaver makes what becomes his farewell start at Shea Stadium. Mets fans don't know yet they're saying goodbye to the franchise's greatest player." },
  { month:6, day:28, year:1985, team:"Yankees",   emoji:"⚾", title:"Yankees' Don Mattingly Sets AL Record for Hits in a Month", desc:"Donnie Baseball in the midst of his MVP season — July and August of 1985 feature some of the best individual baseball played at Yankee Stadium in a generation." },
  { month:6, day:29, year:1941, team:"Yankees",   emoji:"⚾", title:"DiMaggio's Streak Reaches 42 Games — World Takes Notice", desc:"Joe DiMaggio passes George Sisler's modern record of 41 consecutive games. The whole country is following the Yankee Clipper's daily progress." },
  { month:6, day:30, year:1962, team:"Mets",      emoji:"⚾", title:"Mets Complete Inaugural Season Home Stand at Polo Grounds", desc:"The 1962 Mets — losing 120 games total — play at the Polo Grounds while Shea is under construction. They are gloriously awful and New York loves them anyway." },
  // ── JULY gaps ────────────────────────────────────────────────────────────
  { month:7, day:2,  year:1941, team:"Yankees",   emoji:"⚾", title:"DiMaggio's Streak at 45 — Immortality Approaches", desc:"Joe DiMaggio extends his consecutive game hitting streak to 45 games — already the greatest since Willie Keeler's 1897 record. America has never watched a streak like this." },
  { month:7, day:3,  year:1966, team:"Yankees",   emoji:"⚾", title:"Mickey Mantle Plays Through Pain — Remarkable Career Persists", desc:"The Commerce Comet, playing on destroyed knees, continues to produce at a level that would make him a first-ballot Hall of Famer even at a fraction of his natural ability." },
  { month:7, day:5,  year:1939, team:"Yankees",   emoji:"⚾", title:"Lou Gehrig's Final Public Appearance at Yankee Stadium", desc:"Two days after his farewell speech, Gehrig attends his final game at Yankee Stadium. The Iron Horse who played 2,130 consecutive games will never play again." },
  { month:7, day:7,  year:1969, team:"Mets",      emoji:"⚾", title:"Mets Win Nine Straight — Miracle Season Accelerates", desc:"The impossible is becoming possible — the 1969 Mets go on a winning streak that moves them into serious contention. Tom Seaver, Jerry Koosman, and Tug McGraw are unstoppable." },
  { month:7, day:10, year:1934, team:"Yankees",   emoji:"⚾", title:"Babe Ruth Hits 700th Career Home Run", desc:"The Sultan of Swat reaches the unimaginable number of 700 career home runs — a record that stands for 40 years until Hank Aaron surpasses it in 1974." },
  { month:7, day:11, year:1978, team:"Yankees",   emoji:"⚾", title:"Yankees Fire Billy Martin — Bob Lemon Takes Over", desc:"In the chaotic Bronx Zoo, Steinbrenner replaces Billy Martin with Bob Lemon. The Yankees trail the Red Sox by 14 games. What happens next is one of the great comebacks in sports." },
  { month:7, day:12, year:1997, team:"Yankees",   emoji:"⚾", title:"Derek Jeter Named to First All-Star Game", desc:"The Captain's first All-Star appearance — the beginning of a 14-time selection career that mirrors his legendary status as the face of the Yankees dynasty." },
  { month:7, day:14, year:1934, team:"Yankees",   emoji:"⚾", title:"Lou Gehrig Hits Four Consecutive Home Runs in One Game", desc:"The Iron Horse goes deep four times at Shibe Park — one of the most remarkable single-game performances in Yankees history, showcasing the power that made him so feared." },
  { month:7, day:16, year:1941, team:"Yankees",   emoji:"⚾", title:"DiMaggio's 56-Game Streak Ends — Legend Is Complete", desc:"Two Cleveland Indians and extraordinary fielding plays stop DiMaggio at 56 consecutive games. The most unbreakable record in sports history is set at Municipal Stadium in Cleveland." },
  { month:7, day:19, year:1999, team:"Yankees",   emoji:"⚾", title:"David Cone's Perfect Game — Yogi Berra Day Magic", desc:"One of the great coincidences in sports: on the day the Yankees honor Yogi Berra — with Don Larsen (who threw the only WS perfect game) in attendance — Cone throws a perfect game." },
  { month:7, day:21, year:1969, team:"Mets",      emoji:"⚾", title:"Tom Seaver's Near-Perfect Game vs Cubs", desc:"Seaver retires the first 25 Cubs before Jimmy Qualls breaks up the perfect game with a single. The Imperfect Game — still one of the greatest pitching performances in Mets history." },
  { month:7, day:22, year:1986, team:"Mets",      emoji:"⚾", title:"Mets Hold 10-Game NL East Lead — Championship Express", desc:"The Bad Guys are rolling — Doc Gooden, Darryl Strawberry, Keith Hernandez, Gary Carter, and Mookie Wilson are simply too good. The World Series is just a formality." },
  { month:7, day:23, year:1976, team:"Yankees",   emoji:"⚾", title:"Yankees Clinch AL East — First Pennant in 12 Years", desc:"After a 12-year drought, the Yankees return to the American League Championship Series. Thurman Munson, Chris Chambliss, and a rebuilt Steinbrenner dynasty is in motion." },
  { month:7, day:25, year:1978, team:"Yankees",   emoji:"⚾", title:"Billy Martin Re-Hired by Steinbrenner — First of Five Times", desc:"Steinbrenner announces Martin's return for 1979 at Old Timers' Day — the crowd goes wild. It's the first of Billy's five stints as Yankees manager. The carousel begins." },
  { month:7, day:27, year:1988, team:"Mets",      emoji:"⚾", title:"Darryl Strawberry Hits 200th Career Home Run", desc:"The Straw Man reaches a milestone that highlights both his enormous talent and the nagging sense that he was capable of so much more. At 26 he should be just getting started." },
  { month:7, day:29, year:1994, team:"Yankees",   emoji:"⚾", title:"Yankees Lead AL East by 7 Games — Strike Looms", desc:"The 1994 Yankees — with Paul O'Neill, Don Mattingly, and a young Derek Jeter in the wings — have the best record in baseball when the players' strike ends their season in August." },
  { month:7, day:31, year:1997, team:"Yankees",   emoji:"⚾", title:"Yankees Acquire David Cone at Trade Deadline", desc:"Steinbrenner adds the ace pitcher who completes the 1996-2000 championship run. Cone's acquisition at the deadline signals the Yankees are serious about repeating." },
  // ── AUGUST gaps ──────────────────────────────────────────────────────────
  { month:8, day:1,  year:1972, team:"Yankees",   emoji:"⚾", title:"Yankees Retire Mickey Mantle's Number 7", desc:"The Commerce Comet's number joins Ruth's 3 and Gehrig's 4 in the Yankee Stadium outfield. Mantle, visibly moved, thanks the fans for their support through all his injuries." },
  { month:8, day:3,  year:1994, team:"Yankees",   emoji:"⚾", title:"Players' Strike Begins — Yankees' Best Season in Decades Ends", desc:"The work stoppage that cancels the World Series ends the Yankees' best season in decades. They will have to wait until 1996 for their next championship run." },
  { month:8, day:5,  year:1921, team:"Yankees",   emoji:"⚾", title:"Yankees Announce Plans for New Stadium", desc:"With Babe Ruth drawing 1.3 million fans — more than any team in history — the Yankees announce plans to build their own stadium across the Harlem River from the Polo Grounds." },
  { month:8, day:6,  year:1945, team:"Yankees",   emoji:"⚾", title:"Joe DiMaggio Returns from World War II", desc:"The Yankee Clipper, having served three years in the Air Force, returns to baseball and immediately picks up where he left off — still the best player in the American League." },
  { month:8, day:7,  year:1956, team:"Yankees",   emoji:"⚾", title:"Mickey Mantle Leading Triple Crown Race in August", desc:"Mantle's 1956 season is historic — he leads the AL in batting average, home runs, and RBI simultaneously, on his way to one of the most complete offensive seasons in baseball history." },
  { month:8, day:9,  year:1988, team:"Mets",      emoji:"⚾", title:"Mets' Doc Gooden Returns from Substance Treatment", desc:"Gooden's comeback from rehabilitation is one of the most anticipated moments in New York sports. He returns to pitch with the overpowering stuff — but a shade of what he was at 20." },
  { month:8, day:10, year:1969, team:"Mets",      emoji:"⚾", title:"Mets Move Into First Place for First Time Ever", desc:"The impossible happens — the 100-to-1 longshots are in first place. Tom Seaver is 18-6. The baseball world is stunned. Something miraculous is happening in Flushing." },
  { month:8, day:11, year:1929, team:"Yankees",   emoji:"⚾", title:"Yankees Become First Team to Put Numbers on Uniforms", desc:"New York pioneers the concept of uniform numbers — Ruth wears 3, Gehrig wears 4, matching their lineup position. Every team in baseball eventually follows." },
  { month:8, day:13, year:1978, team:"Yankees",   emoji:"⚾", title:"Yankees Begin Boston Massacre — 14-Game Lead Erased", desc:"The Yankees sweep four games at Fenway Park in what becomes known as the Boston Massacre — outscoring the Red Sox 42-9. The greatest comeback in AL history is complete." },
  { month:8, day:14, year:1982, team:"Islanders", emoji:"🏒", title:"Islanders Begin Training Camp for Fourth Dynasty Season", desc:"Potvin, Bossy, Trottier, Gillies, and Smith prepare to win an unprecedented fourth consecutive Stanley Cup. Gretzky's Oilers are waiting. History is about to be made." },
  { month:8, day:15, year:1993, team:"Yankees",   emoji:"⚾", title:"Derek Jeter Begins His Rise Through Yankees Minor League System", desc:"The 1992 first-round pick is developing into the player who will define the Yankees dynasty — polished, professional, and clutch from the very beginning." },
  { month:8, day:17, year:1977, team:"Yankees",   emoji:"⚾", title:"Yankees Regain First Place — Bronx Zoo Championship Run Begins", desc:"Despite all the chaos — Martin, Jackson, Steinbrenner — the talent is simply too good. The 1977 Yankees are going to win the World Series." },
  { month:8, day:19, year:1994, team:"Rangers",   emoji:"🏒", title:"Rangers Begin Defense of Stanley Cup Championship", desc:"The defending champions open training camp as the toast of New York — every player wearing the ring that ended 54 years of suffering." },
  { month:8, day:21, year:1955, team:"Yankees",   emoji:"⚾", title:"Yankees Lead AL by 15 Games — Dynasty at Its Peak", desc:"The mid-1950s Yankees — Mantle, Berra, Ford, Rizzuto — are the most dominant team in baseball. They will win the World Series again in 1956 and 1958." },
  { month:8, day:22, year:1965, team:"Jets",      emoji:"🏈", title:"Joe Namath Throws for 300 Yards in His Third AFL Start", desc:"Broadway Joe is already showing the arm talent that will eventually guarantee a Super Bowl victory. The Jets have found their franchise quarterback." },
  { month:8, day:23, year:1977, team:"Yankees",   emoji:"⚾", title:"Reggie Jackson Hits 100th Yankees Home Run", desc:"Mr. October is settling into his role in pinstripes — still feuding with Billy Martin, still beloved by fans, and still producing the home runs that make him worth every penny." },
  { month:8, day:25, year:2011, team:"Yankees",   emoji:"⚾", title:"Derek Jeter Gets 3,000th Hit — With a Home Run", desc:"The Captain becomes the first player ever to hit a home run for his 3,000th career hit. The Stadium erupts. Of course it was a home run. Of course it was Jeter." },
  { month:8, day:27, year:1962, team:"Mets",      emoji:"⚾", title:"Casey Stengel Manages 1,000th Career Major League Game", desc:"The Old Professor, managing his famously bad expansion Mets, reaches his 1,000th managerial game — cementing his legacy as one of the most successful and colorful managers in history." },
  { month:8, day:29, year:1977, team:"Mets",      emoji:"⚾", title:"Tom Seaver Returns to Cincinnati After Trade", desc:"In Shea Stadium, the man the Mets gave away faces his former team for the first time — and the heartbreak of the Midnight Massacre is felt all over again by Mets fans." },
  { month:8, day:31, year:1935, team:"Yankees",   emoji:"⚾", title:"Lou Gehrig Plays 1,500th Consecutive Game", desc:"The Iron Horse reaches another consecutive game milestone — his durability seems limitless. Four more years and 630 more consecutive games remain before ALS ends his career." },
  // ── SEPTEMBER gaps ───────────────────────────────────────────────────────
  { month:9, day:2,  year:1972, team:"Yankees",   emoji:"⚾", title:"Yankees Clinch AL East — First Division Title Since 1964", desc:"After eight years in the wilderness, the Yankees return to the playoffs. Thurman Munson, Bobby Murcer, and a rebuilt club begin what becomes a new dynasty under Steinbrenner." },
  { month:9, day:3,  year:1969, team:"Mets",      emoji:"⚾", title:"Mets Lead NL East by 10 Games — September Miracle Complete", desc:"The 100-to-1 longshots have done the impossible — they lead their division by 10 games in September. Tom Seaver says 'We're capable of winning it all.' He is right." },
  { month:9, day:4,  year:1993, team:"Mets",      emoji:"⚾", title:"Doc Gooden Returns to Form — Reminiscent of 1985", desc:"Glimpses of the old Doc — the 1985 version who went 24-4 — emerge as Gooden pitches brilliantly, reminding everyone what he was and how much was lost to injury and personal struggles." },
  { month:9, day:6,  year:1995, team:"Yankees",   emoji:"⚾", title:"Cal Ripken Breaks Gehrig's Record — Yankees Honor the Streak", desc:"When Ripken passes Lou Gehrig's consecutive game record in Baltimore, the Yankees' tribute to Gehrig — and to the meaning of durability and commitment — is deeply felt in New York." },
  { month:9, day:7,  year:1969, team:"Mets",      emoji:"⚾", title:"Tom Seaver Wins 20th Game — Mets on Verge of History", desc:"Tom Terrific becomes the first 20-game winner in Mets history — on a team that started the year as 100-to-1 longshots. Nine World Series victories remain to be had." },
  { month:9, day:10, year:1969, team:"Mets",      emoji:"⚾", title:"Mets Magic Number Down to 5 — World Series Beckons", desc:"The most implausible pennant race in baseball history enters its final days. The Miracle Mets are going to the World Series and nobody can stop them." },
  { month:9, day:12, year:2001, team:"Mets",      emoji:"⚾", title:"First Baseball Games Return After 9/11", desc:"Baseball returns to New York six days after the September 11 attacks. The Mets play at Shea Stadium and the city desperately needs the healing power of sports." },
  { month:9, day:14, year:1984, team:"Devils",    emoji:"🏒", title:"New Jersey Devils Open Their Second NHL Season", desc:"After a disastrous first year in New Jersey (formerly the Colorado Rockies), the Devils begin building toward respectability — the long road to three Stanley Cups starts here." },
  { month:9, day:16, year:1998, team:"Yankees",   emoji:"⚾", title:"Yankees Clinch AL East — 114 Wins and Counting", desc:"The greatest regular season team in modern baseball history locks up the division — on their way to sweeping the Padres in the World Series. The dynasty is undeniable." },
  { month:9, day:18, year:1977, team:"Yankees",   emoji:"⚾", title:"Yankees Clinch AL East — Bronx Zoo Marches On", desc:"Despite Martin, Jackson, feuds, and controversies — the Yankees have the best record in the American League. Reggie Jackson will make sure this story ends in World Series glory." },
  { month:9, day:20, year:1973, team:"Mets",      emoji:"⚾", title:"Ya Gotta Believe — Mets Magic Number Reaches 1", desc:"Tug McGraw's rallying cry is working — the 82-79 Mets, who were 12.5 games back in August, are one game from clinching the NL East. Nobody believed it but Tug." },
  { month:9, day:22, year:1969, team:"Mets",      emoji:"⚾", title:"Mets Clinch NL East Pennant — The Miracle Is Real", desc:"The New York Mets — laughingstock of baseball for seven years — clinch the National League East title. Shea Stadium erupts. Players cannot believe what they have accomplished." },
  { month:9, day:24, year:1975, team:"Yankees",   emoji:"⚾", title:"Catfish Hunter Wins 20th Game for Yankees", desc:"In his first year in New York after Steinbrenner signed him to the most lucrative contract in baseball history, Hunter delivers exactly what was promised — a 23-win ace." },
  { month:9, day:26, year:1973, team:"Yankees",   emoji:"⚾", title:"Thurman Munson Named Yankees Captain", desc:"The first Yankee captain since Lou Gehrig receives the honor he fully deserves — his leadership, toughness, and excellence behind the plate define the late-1970s Yankees dynasty." },
  { month:9, day:28, year:1941, team:"Yankees",   emoji:"⚾", title:"Joe Gordon Named AL MVP — DiMaggio's Streak Season Recognized", desc:"Even in a year when DiMaggio hit in 56 consecutive games, Gordon wins MVP — DiMaggio finishes second. The argument over the vote continues to this day among baseball historians." },
  { month:9, day:30, year:1927, team:"Yankees",   emoji:"⚾", title:"Murderers Row Yankees Complete Greatest Season Ever — 110 Wins", desc:"The 1927 Yankees — Ruth (60 HR), Gehrig (47 HR), and the rest of Murderers Row — finish their legendary season before sweeping the Pirates in four games to win the World Series." },
  // ── OCTOBER gaps ─────────────────────────────────────────────────────────
  { month:10, day:2,  year:1978, team:"Yankees",  emoji:"⚾", title:"Bucky Dent Homer at Fenway — Yankees Win One-Game Playoff", desc:"Bucky Dent, hitting 8th in the lineup with 4 home runs all season, hits a three-run shot over the Green Monster to silence Fenway Park. The Yankees win and go to the World Series." },
  { month:10, day:4,  year:1955, team:"Mets",     emoji:"⚾", title:"Brooklyn Dodgers Win World Series — Their Only Title", desc:"The 'Boys of Summer' finally beat the Yankees in the Series — a moment of pure joy for Brooklyn. Three years later they're gone to Los Angeles, and the Mets rise from their absence." },
  { month:10, day:6,  year:1923, team:"Yankees",  emoji:"⚾", title:"Yankees Win First World Series in New Yankee Stadium", desc:"'The House That Ruth Built' hosts its first World Series champion — the Yankees beat the Giants in the first-ever Subway Series. The dynasty begins in earnest." },
  { month:10, day:7,  year:1956, team:"Yankees",  emoji:"⚾", title:"Don Larsen Throws Perfect Game in World Series vs Brooklyn", desc:"All 27 Dodgers retired. Yogi Berra leaps into Larsen's arms. The only perfect game in postseason history — ever — is thrown at Yankee Stadium in the most dramatic fashion possible." },
  { month:10, day:9,  year:1969, team:"Mets",     emoji:"⚾", title:"Mets Sweep Atlanta in NLCS — World Series Bound", desc:"The Miracle Mets sweep the heavily favored Atlanta Braves in three games — and are now three wins away from the most improbable World Series championship in baseball history." },
  { month:10, day:11, year:1986, team:"Mets",     emoji:"⚾", title:"Mets Win NLCS Game 6 vs Houston — One of the Greatest Games Ever", desc:"A 16-inning epic at the Astrodome sends the Mets to the World Series. The greatest single-game performance — Jesse Orosco's glove, Lenny Dykstra's clutch — sets up the Series." },
  { month:10, day:12, year:1999, team:"Yankees",  emoji:"⚾", title:"Yankees Sweep Rangers in ALDS — Dynasty Continues", desc:"The defending champions dispatch Texas with authority — Jeter, Posada, Rivera, and the Core Four are still the standard by which all other teams are measured." },
  { month:10, day:14, year:1976, team:"Yankees",  emoji:"⚾", title:"Chris Chambliss Walk-Off HR — Yankees Return to World Series", desc:"Chambliss's homer off Mark Littell in the 9th inning of Game 5 sends the Yankees to the World Series for the first time since 1964. Fans storm the field before he can touch home plate." },
  { month:10, day:15, year:1969, team:"Mets",     emoji:"⚾", title:"Miracle Mets Win Game 1 of World Series", desc:"The 100-to-1 longshots take Game 1 against the mighty Baltimore Orioles — Seaver pitches brilliantly as the impossible dream continues in the most improbable fashion imaginable." },
  { month:10, day:18, year:1977, team:"Yankees",  emoji:"⚾", title:"Reggie Jackson Three Home Runs — Mr. October Born", desc:"Three pitchers. Three first pitches. Three home runs in Game 6 of the World Series. 'I must admit, when Reggie hit his third home run and I was sure nobody was looking, I applauded in my heart' — Bowie Kuhn." },
  { month:10, day:20, year:1986, team:"Mets",     emoji:"⚾", title:"Mets Win World Series Game 3 — Red Sox Can't Stop New York", desc:"The Bad Guys are rolling through Boston — Ron Darling, Bob Ojeda, and Doc Gooden are too much for the Red Sox. The championship is within reach." },
  { month:10, day:22, year:1986, team:"Mets",     emoji:"⚾", title:"Mets Win World Series Game 5 — One Win Away", desc:"New York stands on the threshold of a championship — one win from completing the most improbable journey of the decade. Game 6 approaches. Mookie is coming to bat." },
  { month:10, day:23, year:1962, team:"Yankees",  emoji:"⚾", title:"Yankees Win World Series in Game 7 — 20th Championship", desc:"The Yankees defeat the Giants in seven games at Candlestick Park — a wild, rain-delayed World Series that produces New York's 20th world championship." },
  { month:10, day:24, year:2000, team:"Yankees",  emoji:"⚾", title:"Yankees Win 2000 World Series — First Subway Series Since 1956", desc:"The Yankees defeat the Mets 4-1 in the first Subway Series since 1956. Derek Jeter is named World Series MVP. The dynasty wins its fourth ring in five years." },
  { month:10, day:26, year:1977, team:"Yankees",  emoji:"⚾", title:"Yankees Win World Series — Bronx Zoo Champions", desc:"Despite Martin, Jackson feuds, Steinbrenner interference, and daily chaos — the 1977 Yankees win the World Series. Reggie Jackson's three home runs in Game 6 seal the legend." },
  { month:10, day:28, year:1996, team:"Yankees",  emoji:"⚾", title:"Yankees Win World Series — Dynasty Reborn Under Torre", desc:"With Derek Jeter, Andy Pettitte, Mariano Rivera, and Jorge Posada, the Yankees win their first World Series since 1978. Joe Torre's dynasty is officially launched." },
  { month:10, day:29, year:2009, team:"Yankees",  emoji:"⚾", title:"Yankees Win 27th World Series — New Stadium, Same Standard", desc:"In the first full season at the new Yankee Stadium, New York defeats Philadelphia in six games. Alex Rodriguez wins Series MVP. George Steinbrenner gets his final ring." },
  { month:10, day:30, year:2015, team:"Mets",     emoji:"⚾", title:"Mets in World Series — New Generation Raises Hope", desc:"The Harvey, deGrom, Syndergaard, Matz rotation takes the Mets to their first World Series since 2000 — a brilliant young pitching staff that gives Mets fans genuine hope for the future." },
  { month:10, day:31, year:1969, team:"Mets",     emoji:"⚾", title:"Miracle Mets World Series Championship Parade — Canyon of Heroes", desc:"The Amazin' Mets march through the Canyon of Heroes after winning the most improbable World Series in history. New York honors its Miracle Mets forever." },
  // ── NOVEMBER gaps ────────────────────────────────────────────────────────
  { month:11, day:2,  year:1962, team:"Giants",   emoji:"🏈", title:"Giants Win Eastern Division — Sam Huff Era Peaks", desc:"Y.A. Tittle's 36 touchdown passes power the Giants to the division title — producing what becomes the best season in franchise history before the Lombardi Packers dynasty stops them cold." },
  { month:11, day:3,  year:2009, team:"Yankees",  emoji:"⚾", title:"World Series Trophy Arrives at Yankee Stadium", desc:"The Commissioner's Trophy comes home to the Bronx — the first World Series championship at the new Yankee Stadium. The standard is the standard." },
  { month:11, day:5,  year:1968, team:"Jets",     emoji:"🏈", title:"Jets Clinch AFL Eastern Division — Super Bowl Destiny Approaches", desc:"Joe Namath and the Jets win the AFL East — setting up the historic AFL Championship game that sends Broadway Joe to his legendary guarantee in Miami." },
  { month:11, day:7,  year:1925, team:"Yankees",  emoji:"⚾", title:"Yankees Sign Herb Pennock — Completing Murderers' Row Pitching Staff", desc:"The future Hall of Fame pitcher joins the Yankees from the Red Sox — completing the pitching staff that supports Ruth and Gehrig's 1927 World Series championship run." },
  { month:11, day:9,  year:1965, team:"Knicks",   emoji:"🏀", title:"Knicks Open New Season — Walt Frazier's Second Year", desc:"The future of the Knicks dynasty is taking shape — Frazier, Reed, and DeBusschere are assembling the most complete team in franchise history." },
  { month:11, day:10, year:1985, team:"Giants",   emoji:"🏈", title:"Lawrence Taylor Named Defensive Player of the Year", desc:"LT wins his first Defensive Player of the Year award — the first of back-to-back honors as he establishes himself as the most dominant defensive player in NFL history." },
  { month:11, day:11, year:1953, team:"Giants",   emoji:"🏈", title:"Giants Win NFL Eastern Division Championship", desc:"The early-1950s Giants, featuring future Hall of Famers, win their division in a season that helps lay the foundation for one of the great eras of NFL football in New York." },
  { month:11, day:12, year:1966, team:"Giants",   emoji:"🏈", title:"Fran Tarkenton Sets Giants Passing Record", desc:"The scrambling quarterback from Georgia makes his mark in blue — his improvisational style brings something new to Giants football and helps define the mobile quarterback era." },
  { month:11, day:13, year:1974, team:"Nets",     emoji:"🏀", title:"Nets Win ABA Eastern Division — Dr. J Era Peaks", desc:"Julius Erving and the New York Nets are the best team in the ABA — their championship is coming, and Dr. J is playing the most spectacular basketball anyone has ever seen." },
  { month:11, day:15, year:1974, team:"Giants",   emoji:"🏈", title:"Giants Hire Bill Arnsparger as Head Coach", desc:"After years of decline, the Giants begin rebuilding — a process that eventually leads to Bill Parcells, Lawrence Taylor, and back-to-back Super Bowl championships in the 1980s." },
  { month:11, day:17, year:1978, team:"Giants",   emoji:"🏈", title:"Miracle at the Meadowlands — Herman Edwards Returns Fumble for TD", desc:"Giants linebacker Herman Edwards scoops up a fumble on a kneel-down play and scores — one of the most shocking plays in NFL history, directly leading to wholesale changes in the franchise." },
  { month:11, day:19, year:1979, team:"Yankees",  emoji:"⚾", title:"Yankees Retire Thurman Munson's Number 15 in Monument Park", desc:"The ceremony honoring the Captain who died in a plane crash in August is one of the most moving events in Yankee Stadium history. His locker has never been reassigned." },
  { month:11, day:20, year:1969, team:"Jets",     emoji:"🏈", title:"Jets Honored at City Hall — Super Bowl Champions Celebrated", desc:"New York honors its American Football League Super Bowl champions with a City Hall ceremony — the AFL's greatest moment is fully celebrated in the world's greatest city." },
  { month:11, day:21, year:1982, team:"Islanders",emoji:"🏒", title:"Islanders Begin Quest for Fourth Consecutive Stanley Cup", desc:"The dynasty that wins four straight begins its pursuit of an unprecedented fifth — facing an Edmonton Oilers team led by Wayne Gretzky that is determined to end the reign." },
  { month:11, day:23, year:1986, team:"Giants",   emoji:"🏈", title:"Giants Clinch NFC East — Super Bowl Run Continues", desc:"The Lawrence Taylor era reaches its peak — the 1986 Giants are the most dominant team in the NFL, and their Super Bowl demolition of Denver is just weeks away." },
  { month:11, day:24, year:1975, team:"Islanders",emoji:"🏒", title:"Islanders Set Franchise Wins Record — Dynasty Building", desc:"The franchise that will win four consecutive Stanley Cups sets new franchise records — Bryan Trottier and Mike Bossy are emerging as the greatest one-two punch in hockey." },
  { month:11, day:25, year:1984, team:"Yankees",  emoji:"⚾", title:"Don Mattingly Wins First Gold Glove Award", desc:"Donnie Baseball adds defensive excellence to his offensive brilliance — nine Gold Gloves over his career make him one of the greatest complete first basemen in baseball history." },
  { month:11, day:27, year:1955, team:"Giants",   emoji:"🏈", title:"Giants Reach NFL Championship Game — Frank Gifford Stars", desc:"The 1955 Giants, with Gifford, Huff, and Lombardi calling the plays, reach the championship — beginning the most competitive dynasty of New York football in the late 1950s." },
  { month:11, day:29, year:1967, team:"Knicks",   emoji:"🏀", title:"Knicks Announce Willis Reed as Team Captain", desc:"The Captain — who limps onto the court in the most legendary entrance in NBA history three years later — becomes the on-court leader of what becomes New York's championship team." },
  { month:11, day:30, year:1963, team:"Giants",   emoji:"🏈", title:"Y.A. Tittle Throws Five Touchdowns — Career Peak", desc:"The aging quarterback has his finest moment in a Giants uniform — proving that great players transcend age, and that the NFL's first true passing revolution is underway." },
  // ── DECEMBER gaps ────────────────────────────────────────────────────────
  { month:12, day:1,  year:1972, team:"Giants",   emoji:"🏈", title:"Giants Move to Yale Bowl — Strange Chapter in History", desc:"With Giants Stadium under construction in New Jersey, the team temporarily plays home games in New Haven, CT — one of the stranger periods in this proud franchise's history." },
  { month:12, day:2,  year:1961, team:"Yankees",  emoji:"⚾", title:"Roger Maris Wins AL MVP — 61 Home Run Season Honored", desc:"Despite months of controversy over the asterisk question, Maris wins the AL MVP — vindication for a man who endured enormous pressure and emerged with the American League home run record." },
  { month:12, day:4,  year:1977, team:"Yankees",  emoji:"⚾", title:"Yankees Win Back-to-Back World Series Championships", desc:"The celebration of the second consecutive championship — the first repeat since the 1977-1978 era — cementing Reggie Jackson's legacy as Mr. October in the Bronx." },
  { month:12, day:5,  year:1993, team:"Rangers",  emoji:"🏒", title:"Rangers Sign Esa Tikkanen — Playoff Pest Joins Broadway Blues", desc:"The man who drove Gretzky crazy in Edmonton comes to New York — another piece of Messier's championship puzzle clicks into place for what becomes the 1994 Stanley Cup run." },
  { month:12, day:6,  year:1969, team:"Mets",     emoji:"⚾", title:"Miracle Mets World Series Ring Ceremony", desc:"The Amazin' Mets receive their championship rings — the most unlikely World Series champions in history are honored as New York's fall heroes." },
  { month:12, day:7,  year:1941, team:"Giants",   emoji:"🏈", title:"Giants Beat Dodgers as Pearl Harbor News Breaks", desc:"The NFL game at the Polo Grounds is interrupted by the attack on Pearl Harbor announcement. Sports briefly stops as America prepares for war — several Giants players enlist within days." },
  { month:12, day:8,  year:1956, team:"Giants",   emoji:"🏈", title:"Giants Win NFL Championship — Gifford and Lombardi's Finest Hour", desc:"The Giants defeat the Chicago Bears for the NFL Championship — Frank Gifford and the offense, guided by offensive coordinator Vince Lombardi, are at their peak." },
  { month:12, day:10, year:1983, team:"Giants",   emoji:"🏈", title:"Bill Parcells Named Giants Head Coach", desc:"The moment that changes everything — Parcells arrives, Taylor is already there, and within three years the Giants win Super Bowl XXI. The greatest defensive team in NFL history is born." },
  { month:12, day:12, year:1955, team:"Giants",   emoji:"🏈", title:"Giants Lose NFL Championship to Cleveland — Building for Future", desc:"The Giants come close but fall to the Browns — motivating the improvements that produce the legendary 1956 championship team." },
  { month:12, day:14, year:1985, team:"Giants",   emoji:"🏈", title:"LT Sets Giants Sack Record — Defensive Revolution Complete", desc:"Lawrence Taylor's domination of NFL offenses reaches new levels — his 22 sacks in 1986 set a record and earn him the league's only Defensive Player MVP in modern history." },
  { month:12, day:15, year:1956, team:"Giants",   emoji:"🏈", title:"Giants Win NFL Championship — The Sneakers Game Legacy", desc:"The Giants beat the Bears for the title — part of the legendary mid-1950s dynasty built by coach Jim Lee Howell with assistants Tom Landry and Vince Lombardi." },
  { month:12, day:17, year:1983, team:"Jets",     emoji:"🏈", title:"Jets Clinch AFC East Division Title", desc:"The early-1980s Jets under Joe Walton put together their best regular season — preparing for back-to-back AFC Championship game appearances that mark the franchise's second golden era." },
  { month:12, day:18, year:1999, team:"Rangers",  emoji:"🏒", title:"Rangers Retire Brian Leetch's Number 2", desc:"The greatest American player in NHL history has his number joined in the MSG rafters — recognition for the man who won the Conn Smythe Trophy in the greatest Rangers season ever." },
  { month:12, day:20, year:1975, team:"Yankees",  emoji:"⚾", title:"Catfish Hunter Signs — Yankees Dynasty Rebuild Complete", desc:"With Catfish Hunter already aboard, Steinbrenner has built the pitching staff that will win back-to-back World Series championships. The Boss's vision is becoming reality." },
  { month:12, day:22, year:1962, team:"Giants",   emoji:"🏈", title:"Giants Lose NFL Championship to Packers — Lombardi Returns", desc:"The most painful possible defeat — losing to Vince Lombardi, the man the Giants let go to Green Bay, in the NFL Championship game. The coaching mistake of the century." },
  { month:12, day:24, year:1977, team:"Rangers",  emoji:"🏒", title:"Rangers Win Holiday Classic at Madison Square Garden", desc:"The Garden at Christmas — the Rangers tradition of winning important holiday games at MSG stretches back generations, making December hockey at the Garden one of NY's great sports traditions." },
  { month:12, day:25, year:1971, team:"Knicks",   emoji:"🏀", title:"Knicks Win Christmas Day Classic at Madison Square Garden", desc:"The Christmas Day tradition at MSG — the Knicks playing a nationally televised holiday game is one of the great recurring events in New York sports history." },
  { month:12, day:26, year:1947, team:"Yankees",  emoji:"⚾", title:"Yankees Hold Off-Season Team Gathering — Dynasty Plans Made", desc:"The most storied franchise in sports prepares for another championship run — the late 1940s Yankees, with DiMaggio, Berra, Rizzuto, and Henrich, are about to win four straight World Series." },
  { month:12, day:27, year:1958, team:"Giants",   emoji:"🏈", title:"Giants Lose 'Greatest Game Ever Played' — NFL Made Forever", desc:"Just before Christmas, the reverberations of the NFL Championship loss to Baltimore in sudden death overtime are felt — the game that made the NFL America's sport was played at Yankee Stadium." },
  { month:12, day:29, year:1934, team:"Rangers",  emoji:"🏒", title:"Rangers Win at Madison Square Garden on New Year's Week", desc:"The Rangers tradition of excellence at MSG during the holiday season dates back to the franchise's founding — the Garden and the Rangers are inseparable from New York winters." },
  { month:12, day:31, year:1999, team:"Yankees",  emoji:"⚾", title:"Yankees End the Millennium as the Greatest Dynasty in Sports", desc:"As the millennium turns, the New York Yankees have won four World Series championships in five years — the most dominant sustained run of excellence in modern professional sports." },
];

function TodayTab() {
  const [teamFilter, setTeamFilter] = useState("ALL");
  const now = new Date();
  const month = now.getMonth() + 1;
  const day = now.getDate();

  const TEAMS = ["ALL","Yankees","Mets","Jets","Giants","Knicks","Rangers","Islanders","Devils","Nets","Liberty"];

  const todayMoments = TODAY_IN_NY_SPORTS.filter(m => m.month === month && m.day === day);
  const nearbyMoments = TODAY_IN_NY_SPORTS.filter(m => {
    const diff = Math.abs((m.month - month) * 30 + (m.day - day));
    return diff <= 7 && diff > 0;
  }).sort((a,b) => Math.abs((a.month-month)*30+(a.day-day)) - Math.abs((b.month-month)*30+(b.day-day)));

  const allFiltered = teamFilter === "ALL" ? TODAY_IN_NY_SPORTS :
    TODAY_IN_NY_SPORTS.filter(m => m.team.includes(teamFilter));

  return (
    <div style={styles.statsRoot}>
      <div style={styles.stdHeader}>
        <h2 style={styles.stdTitle}>📅 ON THIS DATE IN NY SPORTS</h2>
        <p style={styles.stdSub}>TODAY'S ANNIVERSARIES · THIS WEEK · FULL HISTORY CALENDAR</p>
      </div>

      {/* Today's moments */}
      <div style={styles.stdDivisionHeader}>
        🗽 ON THIS DATE — {now.toLocaleDateString("en-US",{month:"long",day:"numeric"})}
      </div>
      {todayMoments.length === 0 ? (
        <div style={{padding:"16px 0", fontSize:12, color:"#555"}}>
          No major NY sports anniversaries on record for today — check back or browse the full calendar below.
        </div>
      ) : todayMoments.map((m, i) => (
        <div key={i} style={{...styles.todayCard, borderLeft:`3px solid #c8201c`}}>
          <div style={styles.todayEmoji}>{m.emoji}</div>
          <div style={styles.todayBody}>
            <div style={styles.todayHeader}>
              <span style={styles.todayYear}>{m.year}</span>
              <span style={styles.todayTeam}>{m.team}</span>
            </div>
            <div style={styles.todayTitle}>{m.title}</div>
            <p style={styles.todayDesc}>{m.desc}</p>
            <div style={{display:"flex", gap:10}}>
              <a href={googleUrl(`${m.title} ${m.team} ${m.year}`)} target="_blank" rel="noopener noreferrer" style={styles.histLink}>🔍 Google</a>
              <a href={wikiUrl(`${m.title}`)} target="_blank" rel="noopener noreferrer" style={styles.histLink}>📖 Wiki</a>
            </div>
          </div>
        </div>
      ))}

      {/* Nearby */}
      {nearbyMoments.length > 0 && (
        <>
          <div style={{...styles.stdDivisionHeader, marginTop:20}}>📆 COMING UP THIS WEEK</div>
          {nearbyMoments.slice(0,5).map((m, i) => (
            <div key={i} style={{...styles.todayCard, ...(i%2===0?{}:{background:"#0f0f0f"}), borderLeft:"3px solid #333"}}>
              <div style={styles.todayEmoji}>{m.emoji}</div>
              <div style={styles.todayBody}>
                <div style={styles.todayHeader}>
                  <span style={{...styles.todayYear, color:"#888"}}>{m.month}/{m.day}/{m.year}</span>
                  <span style={styles.todayTeam}>{m.team}</span>
                </div>
                <div style={styles.todayTitle}>{m.title}</div>
                <p style={styles.todayDesc}>{m.desc}</p>
              </div>
            </div>
          ))}
        </>
      )}

      {/* Full calendar filter */}
      <div style={{...styles.stdDivisionHeader, marginTop:20}}>📚 BROWSE ALL MOMENTS</div>
      <div style={{display:"flex", gap:4, flexWrap:"wrap", marginBottom:12}}>
        {TEAMS.map(t => (
          <button key={t} onClick={() => setTeamFilter(t)}
            style={{...styles.filterBtn, ...(teamFilter===t?styles.filterBtnActive:{}), fontSize:9}}>
            {t}
          </button>
        ))}
      </div>
      {allFiltered.sort((a,b) => a.month*100+a.day - (b.month*100+b.day)).map((m, i) => (
        <div key={i} style={{...styles.todayCard, ...(i%2===0?{}:{background:"#0f0f0f"}), borderLeft:`3px solid #2a2a2a`}}>
          <div style={{...styles.todayEmoji, fontSize:20}}>{m.emoji}</div>
          <div style={styles.todayBody}>
            <div style={styles.todayHeader}>
              <span style={{...styles.todayYear, fontSize:10, color:"#888"}}>{m.month}/{m.day}/{m.year}</span>
              <span style={styles.todayTeam}>{m.team}</span>
            </div>
            <div style={{...styles.todayTitle, fontSize:12}}>{m.title}</div>
            <p style={{...styles.todayDesc, fontSize:10}}>{m.desc}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── POLLS TAB ─────────────────────────────────────────────────────────────
const ALL_POLLS = [
  { id:"goat_yankee",       question:"Who is the greatest Yankee of all time?",                        options:["Babe Ruth","Lou Gehrig","Mickey Mantle","Joe DiMaggio","Derek Jeter"] },
  { id:"goat_met",          question:"Who is the greatest Met of all time?",                           options:["Tom Seaver","Mike Piazza","Dwight Gooden","David Wright","Pete Alonso"] },
  { id:"goat_knick",        question:"Who is the greatest Knick of all time?",                         options:["Patrick Ewing","Walt Frazier","Willis Reed","Carmelo Anthony","Jalen Brunson"] },
  { id:"goat_jet",          question:"Who is the greatest Jet of all time?",                           options:["Joe Namath","Curtis Martin","Don Maynard","Darrelle Revis","Mark Gastineau"] },
  { id:"goat_giant",        question:"Who is the greatest Giant of all time?",                         options:["Lawrence Taylor","Eli Manning","Frank Gifford","Phil Simms","Michael Strahan"] },
  { id:"goat_ranger",       question:"Who is the greatest Ranger of all time?",                        options:["Mark Messier","Brian Leetch","Rod Gilbert","Mike Richter","Henrik Lundqvist"] },
  { id:"goat_islander",     question:"Who is the greatest Islander of all time?",                      options:["Bryan Trottier","Mike Bossy","Denis Potvin","Billy Smith","John Tavares"] },
  { id:"goat_devil",        question:"Who is the greatest Devil of all time?",                         options:["Martin Brodeur","Scott Stevens","Patrik Elias","Scott Niedermayer","Ken Daneyko"] },
  { id:"best_moment",       question:"Greatest NY sports moment ever?",                                options:["1969 Mets WS","Namath Guarantee","Rangers 1994 Cup","Helmet Catch","Piazza 9/11 HR"] },
  { id:"best_stadium",      question:"Best NY sports venue?",                                          options:["Yankee Stadium","Madison Square Garden","MetLife Stadium","Citi Field","UBS Arena"] },
  { id:"misery_leader",     question:"Which NY team makes you suffer the most?",                       options:["Jets","Mets","Knicks","Islanders","Rangers"] },
  { id:"mt_rushmore",       question:"NY Sports Mt. Rushmore — who's on it?",                         options:["Ruth/Namath/LT/Messier","Jeter/Ewing/Messier/LT","Ruth/DiMaggio/Namath/Ewing","Mantle/Seaver/Reed/Bossy"] },
  { id:"best_rivalry",      question:"Best NY sports rivalry?",                                        options:["Yankees vs Red Sox","Rangers vs Devils","Knicks vs Heat (90s)","Jets vs Patriots","Mets vs Phillies"] },
  { id:"best_choke",        question:"Most painful NY sports collapse?",                               options:["2004 ALCS (Yankees blew 3-0)","2007 Mets (7-game September collapse)","2015 Mets World Series","2019 Yankees ALCS"] },
  { id:"best_dynasty",      question:"Greatest NY dynasty?",                                           options:["Yankees (any era)","Islanders 1980-83","Knicks early 70s","Devils 1995-2003","Liberty 2024-25"] },
  { id:"best_single_season",question:"Greatest single NY team season?",                                options:["1927 Yankees","1986 Mets","1998 Yankees","1969 Mets","1970 Knicks"] },
  { id:"best_qb",           question:"Best NY quarterback ever?",                                      options:["Joe Namath","Eli Manning","Phil Simms","Y.A. Tittle"] },
  { id:"best_pitcher",      question:"Best NY pitcher of all time?",                                   options:["Tom Seaver","Whitey Ford","Dwight Gooden","Mariano Rivera","Jacob deGrom"] },
  { id:"best_coach",        question:"Greatest NY coach/manager ever?",                                options:["Casey Stengel","Bill Parcells","Red Holzman","Al Arbour","Joe Torre"] },
  { id:"best_nickname",     question:"Best NY sports nickname?",                                       options:["Mr. October","The Captain","Broadway Joe","LT","Doc","The Pearl"] },
  { id:"goat_overall",      question:"The single greatest NY athlete ever?",                           options:["Babe Ruth","Lawrence Taylor","Willis Reed","Mark Messier","Tom Seaver"] },
  { id:"best_broadcaster",  question:"Best NY sports broadcaster ever?",                               options:["Bob Murphy","Phil Rizzuto","Marv Albert","Mike Breen","Gary Cohen"] },
  { id:"best_walkup",       question:"Best NY sports entrance/walk-up moment?",                        options:["Enter Sandman (Rivera)","Jeter's intro at the Stadium","MSG Rangers goal song","Mets Piazza at-bats"] },
  { id:"best_owner",        question:"Most impactful NY sports owner?",                                options:["George Steinbrenner","Steve Cohen","James Dolan (complicated)","Charles Wang"] },
  { id:"seaver_gooden",     question:"Better career as a Met — Seaver or Gooden?",                    options:["Tom Seaver — no question","Doc Gooden — peak was higher","Too close to call"] },
  { id:"mets_1969_1986",    question:"Better Mets team — 1969 or 1986?",                              options:["1969 — the miracle makes it","1986 — best team top to bottom","Both equally legendary"] },
  { id:"best_trade_ever",   question:"Best trade in NY sports history?",                               options:["Yankees acquire Babe Ruth (1920)","Piazza trade to Mets (1998)","Jason Kidd to Nets (2001)","Messier trade to Rangers (1991)"] },
  { id:"worst_trade_ever",  question:"Worst trade/transaction in NY sports history?",                  options:["Red Sox sell Ruth to Yankees","Islanders let Tavares walk","DiPietro 15-year contract","Ewing traded to Seattle"] },
  { id:"best_game_ever",    question:"Single greatest game in NY sports history?",                     options:["1994 Rangers Cup Game 7","1986 WS Game 6 (Mookie/Buckner)","Super Bowl XLII (Helmet Catch)","1969 WS Game 5 (Koosman)","1973 Belmont (Secretariat)"] },
  { id:"best_individual",   question:"Greatest single individual performance in NY sports?",           options:["Reggie 3 HRs consecutive pitches (1977)","Messier hat trick guarantee (1994)","Simms 22/25 in SB XXI","Secretariat 31 lengths (1973)","Seaver 19 Ks including 10 straight (1970)"] },
  { id:"subway_series",     question:"Who wins the all-time Subway Series?",                          options:["Yankees — no contest","Mets — heart over history","Too close to call"] },
  { id:"most_lovable_loser",question:"Most lovable NY team despite the suffering?",                    options:["The Jets — forever hopeful","The Knicks — MSG still rocks","The Mets — Ya Gotta Believe","The Islanders — loyal Long Island"] },
  { id:"best_chant",        question:"Best NY sports chant or song?",                                 options:["Enter Sandman (Yankees)","Let's Go Mets","Let's Go Rangers","DE-FENSE (Knicks/Giants)","1940! (Rangers fans to taunt them)"] },
  { id:"best_jersey",       question:"Best NY sports jersey ever designed?",                           options:["Yankees pinstripes","Mets '86 home blues","Rangers white with crest","Knicks blue and orange","Giants blue"] },
  { id:"best_borough",      question:"Best borough for NY sports fans?",                               options:["The Bronx — Yankee country","Queens — Mets and US Open","Brooklyn — Nets and nostalgia","Manhattan — MSG rules","Long Island — Islanders diehards"] },
  { id:"best_comeback",     question:"Greatest comeback in NY sports history?",                        options:["1978 Yankees (14 games back in July)","1969 Mets (100-1 shots)","Giants beating 18-0 Patriots (SB XLII)","Knicks 1999 8-seed Finals run","Rangers from 3-2 down vs Devils (1994)"] },
  { id:"next_championship", question:"Which NY team wins the NEXT championship?",                     options:["Yankees","Mets","Knicks","Rangers","Liberty","Devils","Giants","Jets"] },
  { id:"best_moment_you_witnessed", question:"Which NY moment do you most wish you'd seen live?",    options:["Secretariat's Belmont (1973)","Rangers win Cup (1994)","Miracle Mets clinch (1969)","Namath's guarantee game (1969)","Reggie's 3 HRs (1977 WS)"] },
  { id:"goat_hitter",       question:"Greatest pure hitter to play in New York?",                     options:["Babe Ruth","Joe DiMaggio","Mickey Mantle","Mike Piazza","Derek Jeter"] },
  { id:"goat_defender",     question:"Greatest defensive player in NY sports history?",               options:["Lawrence Taylor (Giants)","Willis Reed (Knicks)","Martin Brodeur (Devils)","Denis Potvin (Islanders)","Darrelle Revis (Jets)"] },
  { id:"us_open_best_match",question:"Greatest US Open Tennis moment at Flushing Meadows?",           options:["Connors 1991 run at age 39","Serena's first title at 17 (1999)","Arthur Ashe wins first Open Era (1968)","Sampras final career slam (2002)"] },
  { id:"bethpage_best",     question:"Best major golf at Bethpage Black?",                            options:["Tiger 2002 — only one under par","Koepka PGA 2019 — brutally dominated","Ryder Cup crowd energy 2025","Lucas Glover dramatic win 2009"] },
  { id:"belmont_best",      question:"Greatest Belmont Stakes moment?",                               options:["Secretariat 31 lengths (1973)","American Pharoah ends 37-year drought (2015)","Affirmed vs Alydar thriller (1978)","Seattle Slew stays undefeated (1977)"] },
  { id:"shinnecock_best",   question:"Best US Open Golf at Shinnecock Hills?",                        options:["Corey Pavin's 4-wood to 18th (1995)","Retief Goosen dominates (2004)","Brooks Koepka wins at +1 (2018)","2026 — the next chapter"] },
  { id:"goat_tennis",       question:"Greatest US Open tennis champion overall?",                     options:["Serena Williams (6 titles)","Jimmy Connors (5 titles, 3 surfaces)","Pete Sampras (5 titles)","Chris Evert (6 titles)","Roger Federer (5 titles)"] },
  { id:"goat_golf_ny",      question:"Best golfer to play NY's US Open courses?",                     options:["Tiger Woods (Bethpage 2002)","Jack Nicklaus (multiple Open finals)","Bryson DeChambeau (Winged Foot 2020)","Brooks Koepka (Shinnecock 2018)"] },
  { id:"belmont_triple",    question:"Most dominant Triple Crown performance?",                        options:["Secretariat 1973 — 31 lengths","Seattle Slew 1977 — undefeated","Affirmed 1978 — beat Alydar every race","American Pharoah 2015 — ended the drought"] },
  { id:"best_ny_sports_year",question:"Best single year in NY sports history?",                       options:["1969 (Mets WS + Jets SB win)","1994 (Rangers Cup)","1998-2000 (Yankees dynasty peak)","1980-83 (Islanders 4 Cups)","1986 (Mets WS + Giants Super Bowl run)"] },
  { id:"goat_net",          question:"Greatest Net of all time?",                                     options:["Julius Erving (ABA)","Jason Kidd","Dražen Petrović","Buck Williams","Vince Carter"] },
  { id:"goat_liberty",      question:"Greatest NY Liberty player ever?",                              options:["Breanna Stewart","Sabrina Ionescu","Teresa Weatherspoon","Tina Charles","Cappie Pondexter"] },
  { id:"goat_net_modern",   question:"Best era of Nets basketball?",                                  options:["Dr. J ABA championships (1974/1976)","Jason Kidd Finals runs (2002/2003)","KD/Kyrie Brooklyn era","Jason Williams/Vince Carter era"] },
  { id:"ny_sports_goat_all_time", question:"Across ALL NY sports ever — the single greatest?",       options:["Babe Ruth","Lawrence Taylor","Secretariat","Tom Seaver","Mark Messier","Willis Reed"] },
];

function PollsTab() {
  const [sbVotes, setSbVotes]   = useState({});  // { option: count } from Supabase
  const [voted, setVoted]       = useState({});   // { poll_id: option } from localStorage
  const [loading, setLoading]   = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Current week's poll
  const weekOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(),0,0)) / (86400000 * 7));
  const poll = ALL_POLLS[weekOfYear % ALL_POLLS.length];

  // Load: localStorage for "did I vote", Supabase for actual vote counts
  useEffect(() => {
    // Check if user already voted (localStorage)
    try {
      const saved = JSON.parse(localStorage.getItem("nysd_poll_voted") || "{}");
      setVoted(saved);
    } catch(e) {}

    // Fetch current vote counts from Supabase
    loadVotes();
  }, [poll.id]);

  async function loadVotes() {
    setLoading(true);
    try {
      const rows = await sbFetch("ny_polls", `?poll_id=eq.${encodeURIComponent(poll.id)}&select=option,votes`);
      if (rows && rows.length > 0) {
        const counts = {};
        rows.forEach(r => { counts[r.option] = r.votes || 0; });
        setSbVotes(counts);
      }
    } catch(e) {}
    setLoading(false);
  }

  async function handleVote(option) {
    if (voted[poll.id] || submitting) return;
    setSubmitting(true);

    // Optimistically update UI
    const newVoted = {...voted, [poll.id]: option};
    setVoted(newVoted);
    setSbVotes(prev => ({...prev, [option]: (prev[option]||0) + 1}));
    try { localStorage.setItem("nysd_poll_voted", JSON.stringify(newVoted)); } catch(e) {}

    // Upsert to Supabase — increment votes using RPC or upsert
    try {
      const existing = await sbFetch("ny_polls",
        `?poll_id=eq.${encodeURIComponent(poll.id)}&option=eq.${encodeURIComponent(option)}&select=votes`
      );
      if (existing && existing.length > 0) {
        // Row exists — increment
        const newCount = (existing[0].votes || 0) + 1;
        await fetch(`${SUPABASE_URL}/rest/v1/ny_polls?poll_id=eq.${encodeURIComponent(poll.id)}&option=eq.${encodeURIComponent(option)}`, {
          method: "PATCH",
          headers: { "Content-Type":"application/json", "apikey":SUPABASE_KEY, "Authorization":`Bearer ${SUPABASE_KEY}`, "Prefer":"return=minimal" },
          body: JSON.stringify({ votes: newCount }),
        });
      } else {
        // Row doesn't exist — insert
        await fetch(`${SUPABASE_URL}/rest/v1/ny_polls`, {
          method: "POST",
          headers: { "Content-Type":"application/json", "apikey":SUPABASE_KEY, "Authorization":`Bearer ${SUPABASE_KEY}`, "Prefer":"return=minimal" },
          body: JSON.stringify({ poll_id: poll.id, option, votes: 1 }),
        });
      }
    } catch(e) {}

    // Reload fresh counts from Supabase after vote
    await loadVotes();
    setSubmitting(false);
  }

  function getTotal() {
    return poll.options.reduce((sum, opt) => sum + (sbVotes[opt] || 0), 0);
  }

  function getPct(option) {
    const total = getTotal();
    if (!total) return 0;
    return Math.round((sbVotes[option] || 0) / total * 100);
  }

  const hasVoted = !!voted[poll.id];
  const total = getTotal();

  return (
    <div style={styles.statsRoot}>
      <div style={styles.stdHeader}>
        <h2 style={styles.stdTitle}>🗳️ NY SPORTS POLLS</h2>
        <p style={styles.stdSub}>VOTE · DEBATE · SETTLE THE ARGUMENT</p>
      </div>
      <div style={{marginBottom:20, padding:"10px 14px", background:"#161616", borderLeft:"3px solid #c8201c"}}>
        <p style={{margin:0, fontSize:12, color:"#aaa"}}>
          Real votes from real NY fans — results are shared across all visitors. A new question every week, 52 polls cycling through the year.
        </p>
      </div>

      <div style={{...styles.pollCard, border:"1px solid #c8201c"}}>
        <div style={{fontSize:9, fontWeight:900, color:"#c8201c", letterSpacing:"0.15em", marginBottom:8}}>
          ⭐ POLL OF THE WEEK — CHANGES WEEKLY
        </div>
        <div style={styles.pollQuestion}>{poll.question}</div>

        {loading ? (
          <div style={{padding:"20px 0", textAlign:"center", color:"#666", fontSize:11}}>Loading votes...</div>
        ) : (
          <div style={styles.pollOptions}>
            {poll.options.map((opt, i) => {
              const pct = getPct(opt);
              const isMyVote = voted[poll.id] === opt;
              const isWinner = hasVoted && pct === Math.max(...poll.options.map(o => getPct(o)));
              return (
                <div key={i} style={styles.pollOptionWrap}>
                  <button
                    onClick={() => handleVote(opt)}
                    disabled={hasVoted || submitting}
                    style={{
                      ...styles.pollOption,
                      ...(isMyVote ? styles.pollOptionVoted : {}),
                      ...(hasVoted && !isMyVote ? styles.pollOptionDisabled : {}),
                      cursor: hasVoted ? "default" : "pointer",
                    }}>
                    {hasVoted && (
                      <div style={{...styles.pollBar, width:`${pct}%`, background:isWinner?"#c8201c":"#2a2a2a"}} />
                    )}
                    <span style={styles.pollOptionText}>{isMyVote && "✓ "}{opt}</span>
                    {hasVoted && <span style={styles.pollPct}>{pct}%</span>}
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {hasVoted && (
          <div style={styles.pollMeta}>
            your vote: <strong>{voted[poll.id]}</strong>
            {total > 0 && <span style={{marginLeft:8, color:"#555"}}>· {total} vote{total!==1?"s":""} total</span>}
          </div>
        )}
        {!hasVoted && !loading && (
          <div style={styles.pollMeta}>Cast your vote above — results are live and shared with all visitors</div>
        )}
      </div>
    </div>
  );
}

// ─── HALL OF FAME TAB ──────────────────────────────────────────────────────
const HOF_DATA = {
  Yankees: [
    { name:"Babe Ruth",        inducted:1936, pos:"RF",      note:"First class inductee — the greatest" },
    { name:"Lou Gehrig",       inducted:1939, pos:"1B",      note:"Special election after ALS diagnosis" },
    { name:"Joe DiMaggio",     inducted:1955, pos:"CF",      note:"Yankee Clipper — unanimous" },
    { name:"Bill Dickey",      inducted:1954, pos:"C",       note:"8x All-Star catcher" },
    { name:"Lefty Gomez",      inducted:1972, pos:"SP",      note:"El Goofy — 5x World Series" },
    { name:"Red Ruffing",      inducted:1967, pos:"SP",      note:"6x All-Star — 4 straight WS" },
    { name:"Yogi Berra",       inducted:1972, pos:"C",       note:"10 World Series rings" },
    { name:"Mickey Mantle",    inducted:1974, pos:"CF",      note:"The Commerce Comet — 536 HR" },
    { name:"Whitey Ford",      inducted:1974, pos:"SP",      note:"Chairman of the Board — .690 WS pct" },
    { name:"Phil Rizzuto",     inducted:1994, pos:"SS",      note:"Holy Cow — waited 28 years" },
    { name:"Reggie Jackson",   inducted:1993, pos:"RF",      note:"Mr. October — inducted as a Yankee" },
    { name:"Don Mattingly",    inducted:2020, pos:"1B",      note:"Donnie Baseball — Pinstripe icon" },
    { name:"Derek Jeter",      inducted:2020, pos:"SS",      note:"99.75% of vote — only missed 1 ballot" },
    { name:"Mariano Rivera",   inducted:2019, pos:"RP",      note:"Unanimous — first ever" },
    { name:"Dave Winfield",    inducted:2001, pos:"RF",      note:"Asked to go in as a Yankee" },
    { name:"Goose Gossage",    inducted:2008, pos:"RP",      note:"The Goose — dominant closer" },
    { name:"Catfish Hunter",   inducted:1987, pos:"SP",      note:"Key part of 70s dynasty" },
    { name:"Tony Lazzeri",     inducted:1991, pos:"2B",      note:"First Italian-American HOFer" },
    { name:"Earle Combs",      inducted:1970, pos:"CF",      note:"Leadoff of Murderers Row" },
    { name:"Joe Gordon",       inducted:2009, pos:"2B",      note:"1942 AL MVP" },
    { name:"Herb Pennock",     inducted:1948, pos:"SP",      note:"Key to 1920s dynasty" },
    { name:"Waite Hoyt",       inducted:1969, pos:"SP",      note:"1920s dynasty anchor" },
  ],
  Mets: [
    { name:"Tom Seaver",       inducted:1992, pos:"SP",      note:"98.84% of the vote — Tom Terrific" },
    { name:"Mike Piazza",      inducted:2016, pos:"C",       note:"Inducted as a Met — greatest hitting C" },
    { name:"Casey Stengel",    inducted:1966, pos:"Manager", note:"Original Mets manager — 7 WS as Yankee skipper" },
    { name:"Willie Mays",      inducted:1979, pos:"CF",      note:"Say Hey Kid ended career with Mets 1972-73" },
    { name:"Richie Ashburn",   inducted:1995, pos:"CF",      note:"Original 1962 Met — first HOFer on the roster" },
    { name:"Duke Snider",      inducted:1980, pos:"CF",      note:"Brooklyn legend ended career as a Met" },
    { name:"Yogi Berra",       inducted:1972, pos:"Coach",   note:"Mets coach and beloved figure" },
  ],
  Knicks: [
    { name:"Willis Reed",      inducted:1982, pos:"C",       note:"Two-time Finals MVP — Game 7 legend" },
    { name:"Walt Frazier",     inducted:1987, pos:"G",       note:"Clyde — the most stylish Knick ever" },
    { name:"Dave DeBusschere", inducted:1982, pos:"F",       note:"Won two rings with New York" },
    { name:"Bill Bradley",     inducted:1982, pos:"F",       note:"Dollar Bill — later Senator from NJ" },
    { name:"Patrick Ewing",    inducted:2008, pos:"C",       note:"Greatest Knick ever — 15 seasons" },
    { name:"Earl Monroe",      inducted:1990, pos:"G",       note:"The Pearl — pure playground magic" },
    { name:"Red Holzman",      inducted:1986, pos:"Coach",   note:"Two championship coach" },
    { name:"Richie Guerin",    inducted:2013, pos:"G",       note:"6-time All-Star Knick" },
    { name:"Dick McGuire",     inducted:1993, pos:"G",       note:"Tricky Dick — 8 seasons as Knick" },
    { name:"Harry Gallatin",   inducted:1991, pos:"C",       note:"Iron Man — never missed a game" },
  ],
  Rangers: [
    { name:"Mark Messier",     inducted:2007, pos:"C",       note:"The Captain — guaranteed and delivered" },
    { name:"Brian Leetch",     inducted:2009, pos:"D",       note:"Conn Smythe 1994 — American-born great" },
    { name:"Rod Gilbert",      inducted:1982, pos:"RW",      note:"Franchise all-time scoring leader" },
    { name:"Eddie Giacomin",   inducted:1987, pos:"G",       note:"Fast Eddie — 8 seasons in goal" },
    { name:"Andy Bathgate",    inducted:1978, pos:"RW",      note:"Hart Trophy 1959" },
    { name:"Harry Howell",     inducted:1979, pos:"D",       note:"Norris Trophy 1967" },
    { name:"Brad Park",        inducted:1988, pos:"D",       note:"Norris runner-up 5 times as Ranger" },
    { name:"Jean Ratelle",     inducted:1985, pos:"C",       note:"GAG Line center — Lady Byng 4x" },
    { name:"Lester Patrick",   inducted:1947, pos:"Coach",   note:"Original Rangers founder-coach" },
    { name:"Frank Boucher",    inducted:1958, pos:"C",       note:"Lady Byng 7 of 8 years" },
  ],
  Islanders: [
    { name:"Denis Potvin",     inducted:1991, pos:"D",       note:"Broke Orr's record — captained 4 Cups" },
    { name:"Mike Bossy",       inducted:1991, pos:"RW",      note:"573 goals — 50 in 50 — pure scorer" },
    { name:"Bryan Trottier",   inducted:1997, pos:"C",       note:"Hart Trophy — heart of dynasty" },
    { name:"Billy Smith",      inducted:1993, pos:"G",       note:"Battlin' Billy — won all 4 Cups" },
    { name:"Clark Gillies",    inducted:2002, pos:"LW",      note:"Enforcer and power forward of dynasty" },
    { name:"Bob Nystrom",      inducted:null,  pos:"RW",      note:"OT Cup winner 1980 — beloved Island icon" },
    { name:"Al Arbour",        inducted:1996, pos:"Coach",   note:"Winningest NHL coach of the dynasty era" },
  ],
  Devils: [
    { name:"Martin Brodeur",   inducted:2018, pos:"G",       note:"All-time NHL wins and shutouts leader" },
    { name:"Scott Stevens",    inducted:2007, pos:"D",       note:"Most feared hitter — 3 Cup champion" },
    { name:"Scott Niedermayer",inducted:2013, pos:"D",       note:"3 Cups with NJ, 1 more with Anaheim" },
    { name:"Pat Burns",        inducted:2014, pos:"Coach",   note:"Jack Adams winner — coached 2003 Cup" },
  ],
  Giants: [
    { name:"Lawrence Taylor",  inducted:1999, pos:"LB",      note:"Greatest defensive player ever" },
    { name:"Frank Gifford",    inducted:1977, pos:"HB",      note:"Mr. Giant — broadcaster, icon" },
    { name:"Mel Hein",         inducted:1963, pos:"C",       note:"Most valuable player in NFL history 1938" },
    { name:"Sam Huff",         inducted:1982, pos:"LB",      note:"First LB to have a TV special about him" },
    { name:"Y.A. Tittle",      inducted:1971, pos:"QB",      note:"49 TD in 1963 — unforgettable image bloodied" },
    { name:"Roosevelt Brown",  inducted:1975, pos:"OT",      note:"22nd round draft pick — became HOFer" },
    { name:"Emlen Tunnell",    inducted:1967, pos:"S",       note:"First Black player inducted into HOF" },
    { name:"Andy Robustelli",  inducted:1971, pos:"DE",      note:"7x Pro Bowl — Giants dynasty defender" },
    { name:"Tuffy Leemans",    inducted:1978, pos:"RB",      note:"1936 leader in rushing as a rookie" },
    { name:"Arnie Weinmeister", inducted:1984, pos:"DT",     note:"4x Pro Bowl — dominant in 1950s" },
    { name:"Bill Parcells",    inducted:2013, pos:"Coach",   note:"2x Super Bowl — greatest Giants coach" },
    { name:"Tom Landry",       inducted:1990, pos:"Coach",   note:"Giants DC before Cowboys dynasty" },
  ],
  Jets: [
    { name:"Joe Namath",       inducted:1985, pos:"QB",      note:"Broadway Joe — guaranteed Super Bowl" },
    { name:"Don Maynard",      inducted:1987, pos:"WR",      note:"First AFL WR to 1,000 receiving yards" },
    { name:"Curtis Martin",    inducted:2012, pos:"RB",      note:"4x Pro Bowl — Hall of Very Good to HOFer" },
    { name:"Weeb Ewbank",      inducted:1978, pos:"Coach",   note:"Only coach to win NFL and AFL titles" },
    { name:"Winston Hill",     inducted:2020, pos:"OT",      note:"Namath's blindside protector" },
  ],
  Nets: [
    { name:"Julius Erving",    inducted:1993, pos:"F",       note:"Dr. J — ABA legend, 2 titles with Nets" },
    { name:"Drazen Petrovic",  inducted:2002, pos:"G",       note:"Died 1993 — one of the first great European players" },
    { name:"Buck Williams",    inducted:null,  pos:"F",       note:"Not yet inducted — should be" },
  ],
  Liberty: [
    { name:"Tina Charles",     inducted:null,  pos:"C",       note:"Greatest Liberty before Stewart era" },
    { name:"Cappie Pondexter", inducted:null,  pos:"G",       note:"2x WNBA champion — franchise stalwart" },
  ],
};

function HofTab() {
  const [activeTeam, setActiveTeam] = useState("Yankees");
  const TEAMS = Object.keys(HOF_DATA);
  const players = HOF_DATA[activeTeam] || [];

  return (
    <div style={styles.statsRoot}>
      <div style={styles.stdHeader}>
        <h2 style={styles.stdTitle}>🏛️ NY SPORTS HALL OF FAME</h2>
        <p style={styles.stdSub}>HALL OF FAMERS BY TEAM · LEGENDS · IMMORTALS</p>
      </div>
      <div style={{marginBottom:16, padding:"10px 14px", background:"#161616", borderLeft:"3px solid #c8201c"}}>
        <p style={{margin:0, fontSize:12, color:"#aaa"}}>Every Hall of Famer with a connection to a New York team. Multiple inductees appear on multiple teams.</p>
      </div>
      <div style={{display:"flex", gap:4, flexWrap:"wrap", marginBottom:20}}>
        {TEAMS.map(t => (
          <button key={t} onClick={() => setActiveTeam(t)}
            style={{...styles.filterBtn, ...(activeTeam===t?styles.filterBtnActive:{})}}>
            {t} <span style={{fontSize:9, color:"#666", marginLeft:4}}>({HOF_DATA[t]?.length})</span>
          </button>
        ))}
      </div>
      <div style={styles.stdDivisionHeader}>{activeTeam.toUpperCase()} HALL OF FAMERS ({players.length})</div>
      {players.map((p, i) => (
        <div key={i} style={{...styles.hofRow, ...(i%2===0?{}:{background:"#0f0f0f"})}}>
          <div style={styles.hofEmoji}>🏛️</div>
          <div style={styles.hofInfo}>
            <div style={styles.hofHeader}>
              <span style={styles.hofName}>{p.name}</span>
              <span style={styles.hofPos}>{p.pos}</span>
              {p.inducted && <span style={styles.hofYear}>{p.inducted}</span>}
            </div>
            <p style={styles.hofNote}>{p.note}</p>
            <div style={{display:"flex", gap:10}}>
              <a href={googleUrl(`${p.name} Hall of Fame ${activeTeam}`)} target="_blank" rel="noopener noreferrer" style={styles.histLink}>🔍 Google</a>
              <a href={wikiUrl(p.name)} target="_blank" rel="noopener noreferrer" style={styles.histLink}>📖 Wiki</a>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── MISERY INDEX TAB ──────────────────────────────────────────────────────
function MiseryTab() {
  const MISERY_DATA = [
    {
      team:"Jets", emoji:"🏈", color:"#125740",
      score:98,
      title:"DEFCON 1 — MAXIMUM SUFFERING",
      last:"1969", drought:57,
      lowlights:["57 years without a Super Bowl — longest drought in the NFL","Missed on Dan Marino in 1983 (took Ken O'Brien)","Brett Favre torn shoulder/elbow, threw 8 INTs in 2008 — fell apart after promising start","Sanchez Butt Fumble on national TV 2012","Sam Darnold seeing ghosts on MNF — a truly historic lowlight","Aaron Rodgers: torn Achilles on play 4 of his debut, 2023"],
      brightside:"They do have Super Bowl III and Broadway Joe's guarantee — the greatest single moment any NY franchise has ever produced. Hope, however faint, springs eternal each fall.",
    },
    {
      team:"Knicks", emoji:"🏀", color:"#006BB6",
      score:91,
      title:"CHRONIC HEARTBREAK",
      last:"1973", drought:53,
      lowlights:["52 years without an NBA title","1994 Finals — Ewing's closest call, lost to Rockets","7 shots at the playoffs in the Isiah Thomas era","James Dolan's endless ownership chaos","Carmelo Anthony's best years wasted","Kristaps Porzingis traded for nothing tangible"],
      brightside:"Two championships in the early 70s and the most electric building in sports. When the Garden is rocking, there is nothing like it in basketball.",
    },
    {
      team:"Mets", emoji:"⚾", color:"#FF5910",
      score:85,
      title:"HIGH SUFFERING",
      last:"1986", drought:40,
      lowlights:["40 years without a World Series title","1988: 100 wins and still lost to the Dodgers in NLCS","Generation K: Wilson, Pulsipher, Isringhausen — all busted before they started","2007: Collapsed with 17 games to play — 7 game lead vanished","2015: Harvey's arm, one strike away, Familia blows Save","Bobby Bonilla Day — paid $1.19M every July 1 through 2035"],
      brightside:"Two World Series titles, the deepest-pocketed ownership in baseball, and the most passionate fans in the National League. The window never truly closes in Queens.",
    },
    {
      team:"Rangers", emoji:"🏒", color:"#0038A8",
      score:72,
      title:"ELEVATED SUFFERING",
      last:"1994", drought:32,
      lowlights:["54-year drought before 1994","2014 Finals loss to the LA Kings","2022 Conference Finals loss to Lightning","Losing Messier's free agent negotiations","Trading Rick Middleton for Ken Hodge — criminal"],
      brightside:"1994 happened — the 54-year curse was broken on Broadway. Four Stanley Cups in the trophy case and the most storied building in hockey.",
    },
    {
      team:"Giants", emoji:"🏈", color:"#0B2265",
      score:65,
      title:"MODERATE SUFFERING",
      last:"2012", drought:14,
      lowlights:["Back-to-back losing seasons 2017-2023","Daniel Jones experiment cost 3 years","Saquon Barkley left for Philadelphia and immediately won","Odell Beckham traded away","McAdoo benched Eli Manning — immediate fan revolt"],
      brightside:"Four Super Bowls, two miracle upsets of the greatest dynasty in NFL history, and Lawrence Taylor. The resume is, simply, elite.",
    },
    {
      team:"Islanders", emoji:"🏒", color:"#00539B",
      score:62,
      title:"MODERATE SUFFERING",
      last:"1983", drought:43,
      lowlights:["John Tavares left for Toronto in free agency — broke hearts","Rick DiPietro 15-year $67.5M contract — disaster","Years of arena uncertainty (Nassau vs Brooklyn vs UBS)","Mike Milbury's trades still echoing","No Cup since the dynasty ended in 1983"],
      brightside:"Four consecutive Stanley Cups from 1980-83 — the most dominant dynasty in modern NHL history. No one can ever take those banners down.",
    },
    {
      team:"Nets", emoji:"🏀", color:"#000000",
      score:74,
      title:"DEEP SUFFERING — ZERO NBA TITLES",
      last:"Never (NBA)", drought:999,
      lowlights:["Never won an NBA championship in ANY city (NJ or Brooklyn)","Dr. J sold to 76ers for $3M just to pay the ABA merger fee — franchise-altering betrayal","KD/Kyrie/Harden Big 3 assembled — never won a single playoff SERIES together","Kyrie flat-earther chaos derailed two promising seasons","The Simmons trade: gave up Harden for a player who refused to play","Moved from NJ to Brooklyn — 10+ years still no title, no Finals"],
      brightside:"Brooklyn gave the franchise genuine identity, a beautiful arena, and real star power for the first time in decades. The draft capital stockpile means the next chapter could be written by a transcendent young core.",
    },
    {
      team:"Yankees", emoji:"⚾", color:"#003087",
      score:35,
      title:"BASELINE SUFFERING",
      last:"2009", drought:17,
      lowlights:["17 years since last World Series — a LONG time by Yankee standards","2004 ALCS: blew 3-0 series lead to Red Sox","ARod's steroid legacy taints multiple eras","2022 ALCS: 7 games, Judge and Stanton disappear","Gerrit Cole's spider tack suspension embarrassment"],
      brightside:"27 World Series championships — more than any franchise in North American sports. The standard is the standard, and contention is the baseline expectation.",
    },
    {
      team:"Liberty", emoji:"🏀", color:"#007A5E",
      score:15,
      title:"REIGNING CHAMPIONS",
      last:"2025", drought:0,
      lowlights:["Years of irrelevance before Stewart's arrival","Played second fiddle to the Knicks for decades","Had to fight for visibility in NY sports media"],
      brightside:"WNBA champions and the premier franchise in women's basketball. After decades of fighting for the spotlight, the Liberty finally own it.",
    },
    {
      team:"Devils", emoji:"🏒", color:"#CE1126",
      score:22,
      title:"SURPRISINGLY MANAGEABLE",
      last:"2003", drought:23,
      lowlights:["23 years since last Cup despite 3 championships","Patrik Elias retired without enough recognition","Zach Parise left for Minnesota, never won","2012 Finals loss to Kings after incredible playoff run","Jack Hughes growing pains"],
      brightside:"Three Stanley Cups in nine years (1995-2003) and the all-time NHL records for goaltending wins and shutouts. A quietly remarkable franchise history.",
    },
  ];

  return (
    <div style={styles.statsRoot}>
      <div style={styles.stdHeader}>
        <h2 style={styles.stdTitle}>😩 THE NY SPORTS MISERY INDEX</h2>
        <p style={styles.stdSub}>RANKED FROM MOST TO LEAST SUFFERING</p>
      </div>
      <div style={{marginBottom:20, padding:"10px 14px", background:"#161616", borderLeft:"3px solid #c8201c"}}>
        <p style={{margin:0, fontSize:12, color:"#aaa"}}>Every NY team ranked by how much they've made their fans suffer. The higher the score, the deeper the pain. A badge of honor for true NY fans.</p>
      </div>
      {MISERY_DATA.sort((a,b)=>b.score-a.score).map((t, i) => (
        <div key={i} style={{...styles.miseryCard, borderLeft:`4px solid ${t.color}`}}>
          <div style={styles.miseryHeader}>
            <span style={styles.miseryRank}>#{i+1}</span>
            <span style={styles.miseryEmoji}>{t.emoji}</span>
            <div style={styles.miseryTeamInfo}>
              <span style={styles.miseryTeamName}>{t.team}</span>
              <span style={styles.miseryTitle}>{t.title}</span>
            </div>
            <div style={styles.miseryScoreBox}>
              <div style={{...styles.miseryScoreFill, width:`${t.score}%`, background:t.score>80?"#c8201c":t.score>50?"#cc8800":"#2d8a50"}} />
              <span style={styles.miseryScore}>{t.score}</span>
            </div>
          </div>
          <div style={styles.miseryMeta}>
            <span style={{color:"#888", fontSize:10}}>Last title: <strong style={{color:"#e8e0d0"}}>{t.last}</strong></span>
            {t.drought > 0 && <span style={{color:"#888", fontSize:10}}>Drought: <strong style={{color:"#c8201c"}}>{t.drought} years</strong></span>}
          </div>
          <div style={styles.miseryLowlights}>
            {t.lowlights.map((l, j) => <div key={j} style={styles.miseryLow}>😭 {l}</div>)}
          </div>
          <div style={styles.miseryBright}>☀️ {t.brightside}</div>
        </div>
      ))}
    </div>
  );
}

// ─── AWARDS TAB ────────────────────────────────────────────────────────────
function AwardsTab() {
  const [sport, setSport] = useState("ALL");
  const AWARDS = [
    // ── MLB ──
    { award:"Cy Young",         year:2023, winner:"Gerrit Cole",        team:"Yankees", sport:"MLB", note:"First Cy Young for a Yankee since Ron Guidry 1978" },
    { award:"Cy Young",         year:2019, winner:"Jacob deGrom",       team:"Mets",    sport:"MLB", note:"Second consecutive Cy Young — 2.43 ERA" },
    { award:"Cy Young",         year:2018, winner:"Jacob deGrom",       team:"Mets",    sport:"MLB", note:"First Cy Young with a losing team record (10-9) in MLB history" },
    { award:"Cy Young",         year:2013, winner:"Max Scherzer",       team:"Tigers",  sport:"MLB", note:"NL — awarded while with Tigers but 21-3 record was legendary" },
    { award:"Cy Young",         year:1985, winner:"Dwight Gooden",      team:"Mets",    sport:"MLB", note:"Unanimous — 24-4, 1.53 ERA at age 20. Most dominant young season ever." },
    { award:"Cy Young",         year:1978, winner:"Ron Guidry",         team:"Yankees", sport:"MLB", note:"25-3 · 1.74 ERA · Louisiana Lightning's masterpiece season" },
    { award:"Cy Young",         year:1975, winner:"Tom Seaver",         team:"Mets",    sport:"MLB", note:"Third Cy Young for Tom Terrific — 22-9, 2.38 ERA" },
    { award:"Cy Young",         year:1973, winner:"Tom Seaver",         team:"Mets",    sport:"MLB", note:"Second Cy Young — 19-10, 2.08 ERA leading the Ya Gotta Believe Mets" },
    { award:"Cy Young",         year:1969, winner:"Tom Seaver",         team:"Mets",    sport:"MLB", note:"First Cy Young — 25-7 as the Miracle Mets win the World Series" },
    { award:"Cy Young",         year:1961, winner:"Whitey Ford",        team:"Yankees", sport:"MLB", note:"Chairman of the Board — 25-4, .862 winning percentage" },
    { award:"AL MVP",           year:2022, winner:"Aaron Judge",        team:"Yankees", sport:"MLB", note:"Unanimous — 62 HR (AL record), .311 AVG, 131 RBI" },
    { award:"AL MVP",           year:2017, winner:"Aaron Judge",        team:"Yankees", sport:"MLB", note:"Rookie of Year and runner-up MVP — 52 HR as a rookie" },
    { award:"AL MVP",           year:1985, winner:"Don Mattingly",      team:"Yankees", sport:"MLB", note:"Donnie Baseball's finest year — .324, 35 HR, 145 RBI" },
    { award:"AL MVP",           year:1976, winner:"Thurman Munson",     team:"Yankees", sport:"MLB", note:"The Captain earns the highest individual honor — .302, 105 RBI" },
    { award:"AL MVP",           year:1963, winner:"Elston Howard",      team:"Yankees", sport:"MLB", note:"First Black player to win AL MVP — .287, 28 HR" },
    { award:"AL MVP",           year:1962, winner:"Mickey Mantle",      team:"Yankees", sport:"MLB", note:"Third AL MVP for The Commerce Comet" },
    { award:"AL MVP",           year:1957, winner:"Mickey Mantle",      team:"Yankees", sport:"MLB", note:"Second AL MVP — .365 AVG, 34 HR, 94 RBI" },
    { award:"AL MVP",           year:1956, winner:"Mickey Mantle",      team:"Yankees", sport:"MLB", note:"Triple Crown year — .353 AVG, 52 HR, 130 RBI · First MVP" },
    { award:"AL ROY",           year:2017, winner:"Aaron Judge",        team:"Yankees", sport:"MLB", note:"Unanimous AL Rookie of the Year with record 52 HR" },
    { award:"AL ROY",           year:1996, winner:"Derek Jeter",        team:"Yankees", sport:"MLB", note:"The Captain announces himself — .314 AVG in his rookie year" },
    { award:"AL ROY",           year:1970, winner:"Thurman Munson",     team:"Yankees", sport:"MLB", note:"The first step toward becoming Yankees captain" },
    { award:"NL ROY",           year:2019, winner:"Pete Alonso",        team:"Mets",    sport:"MLB", note:"53 HR in 2019 — MLB rookie home run record" },
    { award:"NL ROY",           year:2014, winner:"Jacob deGrom",       team:"Mets",    sport:"MLB", note:"The beginning of one of the most dominant pitching runs in Mets history" },
    { award:"World Series MVP", year:2009, winner:"Hideki Matsui",      team:"Yankees", sport:"MLB", note:"6 RBI in Game 6 — first Japanese player to win World Series MVP" },
    { award:"World Series MVP", year:2000, winner:"Derek Jeter",        team:"Yankees", sport:"MLB", note:"Subway Series MVP — Yankees defeat the Mets in 5 games" },
    { award:"World Series MVP", year:1999, winner:"Mariano Rivera",     team:"Yankees", sport:"MLB", note:"Closers don't usually win — Rivera was so dominant they had to give it to him" },
    { award:"World Series MVP", year:1978, winner:"Bucky Dent",         team:"Yankees", sport:"MLB", note:"The same Bucky Dent who hit the playoff homer at Fenway" },
    { award:"World Series MVP", year:1977, winner:"Reggie Jackson",     team:"Yankees", sport:"MLB", note:"3 HRs on 3 consecutive pitches. The definitive Mr. October." },
    { award:"World Series MVP", year:1986, winner:"Ray Knight",         team:"Mets",    sport:"MLB", note:"The Mets' 3B delivered in the clutch throughout the Fall Classic" },
    // ── NFL ──
    { award:"NFL MVP",          year:1986, winner:"Lawrence Taylor",    team:"Giants",  sport:"NFL", note:"Only defensive player to win NFL MVP in the modern era — 20.5 sacks" },
    { award:"Super Bowl MVP",   year:2012, winner:"Eli Manning",        team:"Giants",  sport:"NFL", note:"Second Super Bowl MVP — beat the Patriots AGAIN. Only QB with 2 upset SB wins." },
    { award:"Super Bowl MVP",   year:2008, winner:"Eli Manning",        team:"Giants",  sport:"NFL", note:"Escaped from a certain sack to find Tyree. 17-14 over undefeated Patriots." },
    { award:"Super Bowl MVP",   year:1991, winner:"Ottis Anderson",     team:"Giants",  sport:"NFL", note:"102 rushing yards at age 34 — one of the great surprise MVP performances" },
    { award:"Super Bowl MVP",   year:1987, winner:"Phil Simms",         team:"Giants",  sport:"NFL", note:"22/25 (88%) completion percentage — still the all-time Super Bowl record" },
    { award:"Super Bowl MVP",   year:1969, winner:"Joe Namath",         team:"Jets",    sport:"NFL", note:"16-7 over Baltimore. No stats needed. The guarantee was the performance." },
    { award:"Defensive POY",    year:1986, winner:"Lawrence Taylor",    team:"Giants",  sport:"NFL", note:"Second straight Defensive Player of the Year" },
    { award:"Defensive POY",    year:1985, winner:"Lawrence Taylor",    team:"Giants",  sport:"NFL", note:"First of back-to-back Defensive Player of the Year awards" },
    // ── NBA ──
    { award:"NBA MVP",          year:1994, winner:"Hakeem (finals vs Knicks)", team:"Rockets", sport:"NBA", note:"Ewing's Knicks lost the 1994 Finals — Patrick deserved a ring" },
    { award:"Finals MVP",       year:1973, winner:"Willis Reed",        team:"Knicks",  sport:"NBA", note:"Second Finals MVP — completing the Knicks' dynasty" },
    { award:"Finals MVP",       year:1970, winner:"Willis Reed",        team:"Knicks",  sport:"NBA", note:"Legendary limping entrance, 4-pt start — The Captain delivers" },
    { award:"NBA Rookie of Year",year:1986, winner:"Patrick Ewing",     team:"Knicks",  sport:"NBA", note:"First NBA lottery pick — announced a 15-year era of Knicks basketball" },
    { award:"WNBA MVP",         year:2023, winner:"Breanna Stewart",    team:"Liberty", sport:"WNBA", note:"League MVP and championship — the complete package" },
    { award:"WNBA Finals MVP",  year:2024, winner:"Breanna Stewart",    team:"Liberty", sport:"WNBA", note:"Back-to-back championship Finals MVP" },
    // ── NHL ──
    { award:"Conn Smythe",      year:2000, winner:"Scott Stevens",      team:"Devils",  sport:"NHL", note:"His hits on Lindros and Kariya defined the 2000 playoffs" },
    { award:"Conn Smythe",      year:1994, winner:"Brian Leetch",       team:"Rangers", sport:"NHL", note:"First American to win Conn Smythe — 34 pts in the playoffs" },
    { award:"Conn Smythe",      year:1980, winner:"Bryan Trottier",     team:"Islanders",sport:"NHL",note:"The engine of the first Islanders Cup — led all scorers" },
    { award:"Vezina Trophy",    year:2012, winner:"Henrik Lundqvist",   team:"Rangers", sport:"NHL", note:"The King's finest individual recognition — career year" },
    { award:"Vezina Trophy",    year:1987, winner:"Ron Hextall",        team:"Flyers",  sport:"NHL", note:"Not a NY award — but his battles with Rangers fans are legendary" },
    { award:"Hart Trophy",      year:1979, winner:"Bryan Trottier",     team:"Islanders",sport:"NHL",note:"NHL MVP the year before the first of four straight Cups" },
    { award:"Norris Trophy",    year:1992, winner:"Brian Leetch",       team:"Rangers", sport:"NHL", note:"Best defenseman in the NHL — set up the 1994 Cup run" },
    { award:"Norris Trophy",    year:1979, winner:"Denis Potvin",       team:"Islanders",sport:"NHL",note:"Third of four Norris Trophies as best defenseman" },
    { award:"Calder Trophy",    year:2026, winner:"Matthew Schaefer",   team:"Islanders",sport:"NHL",note:"#1 overall pick wins NHL Rookie of the Year — the future of Long Island hockey is here" },
  ];

  const SPORTS = ["ALL","MLB","NFL","NBA","NHL","WNBA"];
  const filtered = sport === "ALL" ? AWARDS : AWARDS.filter(a => a.sport === sport);
  const grouped = filtered.reduce((acc, a) => {
    const key = `${a.sport} — ${a.award}`;
    if (!acc[key]) acc[key] = [];
    acc[key].push(a);
    return acc;
  }, {});

  return (
    <div style={styles.statsRoot}>
      <div style={styles.stdHeader}>
        <h2 style={styles.stdTitle}>🏅 NY SPORTS AWARDS</h2>
        <p style={styles.stdSub}>EVERY MAJOR AWARD WON BY A NEW YORK PLAYER OR TEAM</p>
      </div>
      <div style={{marginBottom:16, padding:"10px 14px", background:"#161616", borderLeft:"3px solid #c8201c"}}>
        <p style={{margin:0, fontSize:12, color:"#aaa"}}>Every major individual and team award won by a NY athlete. A testament to the depth of New York sports greatness across a century.</p>
      </div>
      <div style={{display:"flex", gap:4, flexWrap:"wrap", marginBottom:16}}>
        {SPORTS.map(s => (
          <button key={s} onClick={() => setSport(s)}
            style={{...styles.filterBtn, ...(sport===s?styles.filterBtnActive:{})}}>
            {s}
          </button>
        ))}
      </div>
      {Object.entries(grouped).map(([groupKey, items]) => (
        <div key={groupKey} style={{marginBottom:16}}>
          <div style={styles.stdDivisionHeader}>🏅 {groupKey}</div>
          {items.sort((a,b) => b.year-a.year).map((a, i) => (
            <div key={i} style={{...styles.hofRow, ...(i%2===0?{}:{background:"#0f0f0f"})}}>
              <div style={{...styles.hofYear, minWidth:44, fontSize:14}}>{a.year}</div>
              <div style={styles.hofInfo}>
                <div style={styles.hofHeader}>
                  <span style={styles.hofName}>{a.winner}</span>
                  <span style={{...styles.hofPos, color:"#888"}}>{a.team}</span>
                </div>
                <p style={styles.hofNote}>{a.note}</p>
                <div style={{display:"flex", gap:10}}>
                  <a href={`https://www.google.com/search?q=${encodeURIComponent(a.winner+" "+a.award+" "+a.year)}`} target="_blank" rel="noopener noreferrer" style={styles.histLink}>🔍 Google</a>
                  <a href={`https://en.wikipedia.org/wiki/${encodeURIComponent(a.winner.replace(/ /g,"_"))}`} target="_blank" rel="noopener noreferrer" style={styles.histLink}>📖 Wiki</a>
                </div>
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

// ─── THE ALMOST FORGOTTEN TAB ──────────────────────────────────────────────
function ForgottenTab() {
  const [teamFilter, setTeamFilter] = useState("ALL");
  const FORGOTTEN = [
    { name:"Tommy John",       team:"Yankees", era:"1979–1982,1986–1989", emoji:"⚾", why:"The man who gave pitchers a second life. Tommy John surgery is named after him. Went 21-9 as a Yankee in 1979.", wiki:"https://en.wikipedia.org/wiki/Tommy_John" },
    { name:"Dave Righetti",    team:"Yankees", era:"1979–1990", emoji:"⚾", why:"No-hit the Red Sox on July 4, 1983. Led the AL in saves in 1986 with 46. The bridge between dynasty eras.", wiki:"https://en.wikipedia.org/wiki/Dave_Righetti" },
    { name:"Willie Randolph",  team:"Yankees", era:"1976–1988", emoji:"⚾", why:"The heartbeat of the late-70s Yankees dynasty. Six All-Star selections, four World Series. Criminally overlooked for the Hall.", wiki:"https://en.wikipedia.org/wiki/Willie_Randolph" },
    { name:"Ron Guidry",       team:"Yankees", era:"1975–1988", emoji:"⚾", why:"25-3 in 1978 — one of the most dominant single seasons by any pitcher ever. Louisiana Lightning.", wiki:"https://en.wikipedia.org/wiki/Ron_Guidry" },
    { name:"Chris Chambliss",  team:"Yankees", era:"1974–1979", emoji:"⚾", why:"His pennant-clinching home run off Mark Littell in 1976 is one of the most electrifying moments in Yankees playoff history.", wiki:"https://en.wikipedia.org/wiki/Chris_Chambliss" },
    { name:"John Olerud",      team:"Mets",    era:"1997–1999", emoji:"⚾", why:"Hit .354 in 1998 — the best batting average by a Met since Cleon Jones in 1969. A complete player who deserved more recognition.", wiki:"https://en.wikipedia.org/wiki/John_Olerud" },
    { name:"Cleon Jones",      team:"Mets",    era:"1963–1975", emoji:"⚾", why:"Hit .340 in 1969 as the Mets won it all. Caught the final out of the 1969 World Series. Career New York Met.", wiki:"https://en.wikipedia.org/wiki/Cleon_Jones" },
    { name:"Al Leiter",        team:"Mets",    era:"1998–2004", emoji:"⚾", why:"The 2000 Subway Series ace. His two-out 9th inning against the Cubs in the 1999 wild card game remains one of the best single-game pitching performances in Mets history.", wiki:"https://en.wikipedia.org/wiki/Al_Leiter" },
    { name:"John Franco",      team:"Mets",    era:"1990–2001", emoji:"⚾", why:"All-time NL saves leader when he retired. A Queens kid who grew up rooting for the Mets and became their closer for a decade.", wiki:"https://en.wikipedia.org/wiki/John_Franco" },
    { name:"Edgardo Alfonzo",  team:"Mets",    era:"1995–2002", emoji:"⚾", why:"Hit .324 in 2000 with 25 HR. Perhaps the best all-around Mets player of the late 1990s. Maestro at 2B and 3B.", wiki:"https://en.wikipedia.org/wiki/Edgardo_Alfonzo" },
    { name:"Lenny Dykstra",    team:"Mets",    era:"1985–1989", emoji:"⚾", why:"Nails — the scrappiest lead-off hitter of his era. His single in Game 3 of the 1986 NLCS vs the Astros changed the series.", wiki:"https://en.wikipedia.org/wiki/Lenny_Dykstra" },
    { name:"Wesley Walker",    team:"Jets",    era:"1977–1989", emoji:"🏈", why:"Legally blind in one eye — yet one of the most dangerous deep threats in NFL history. Part of the 1986 AFC Championship run.", wiki:"https://en.wikipedia.org/wiki/Wesley_Walker" },
    { name:"Otis Anderson",    team:"Giants",  era:"1986–1992", emoji:"🏈", why:"Super Bowl XXV MVP at age 34. Rushed for 102 yards. The unsung hero of the Giants' second championship.", wiki:"https://en.wikipedia.org/wiki/Ottis_Anderson" },
    { name:"Brad Van Pelt",    team:"Giants",  era:"1973–1983", emoji:"🏈", why:"Five straight Pro Bowls as a Giant. The unrecognized defensive leader who kept the franchise alive through a dark decade before LT and Parcells.", wiki:"https://en.wikipedia.org/wiki/Brad_Van_Pelt" },
    { name:"Joe Klecko",       team:"Jets",    era:"1977–1987", emoji:"🏈", why:"The only player in NFL history to be named to the Pro Bowl at three different positions — DE, DT, and NT. Heart of the NY Sack Exchange.", wiki:"https://en.wikipedia.org/wiki/Joe_Klecko" },
    { name:"Freeman McNeil",   team:"Jets",    era:"1981–1992", emoji:"🏈", why:"Led the NFL in rushing in 1982. A quiet, durable back who was the Jets' best offensive player through a decade of mediocrity.", wiki:"https://en.wikipedia.org/wiki/Freeman_McNeil" },
    { name:"Dick Barnett",     team:"Knicks",  era:"1965–1974", emoji:"🏀", why:"'Fall back, baby!' Two championships. An elegant shooter who anchored the backcourt alongside Frazier. Underappreciated champion.", wiki:"https://en.wikipedia.org/wiki/Dick_Barnett" },
    { name:"Bernard King",     team:"Knicks",  era:"1982–1987", emoji:"🏀", why:"Scored 60 points at Madison Square Garden in 1984. Before knee injuries, he was as unstoppable as anyone in the NBA — a pure scorer.", wiki:"https://en.wikipedia.org/wiki/Bernard_King" },
    { name:"Kerry Kittles",    team:"Nets",    era:"1996–2004", emoji:"🏀", why:"The building block of the Jason Kidd Finals teams. His smooth shooting and relentless defense made the Nets dangerous.", wiki:"https://en.wikipedia.org/wiki/Kerry_Kittles" },
    { name:"Micheal Ray Richardson", team:"Knicks", era:"1978–1982", emoji:"🏀", why:"One of the most gifted players the Knicks ever had. His 'The ship be sinking' quote is iconic. Addiction robbed the game of something special.", wiki:"https://en.wikipedia.org/wiki/Micheal_Ray_Richardson" },
    { name:"Rod Gilbert",      team:"Rangers", era:"1960–1978", emoji:"🏒", why:"All-time Rangers scoring leader for decades. Overcame serious back surgery to become the franchise icon. First Ranger to have his number retired.", wiki:"https://en.wikipedia.org/wiki/Rod_Gilbert" },
    { name:"Ed Giacomin",      team:"Rangers", era:"1965–1975", emoji:"🏒", why:"Fast Eddie — goaltender who played with such personality MSG named the ice after him conceptually. HOF career, beloved in NY.", wiki:"https://en.wikipedia.org/wiki/Ed_Giacomin" },
    { name:"Bob Nystrom",      team:"Islanders",era:"1972–1986",emoji:"🏒", why:"Scored the OT goal that won the Islanders' first Stanley Cup in 1980. As beloved in Nassau County as any player in franchise history.", wiki:"https://en.wikipedia.org/wiki/Bob_Nystrom" },
    { name:"Butch Goring",     team:"Islanders",era:"1980–1985",emoji:"🏒", why:"The missing piece. Acquired mid-season 1980, he was the Conn Smythe winner that year and the defensive forward who made the dynasty work.", wiki:"https://en.wikipedia.org/wiki/Butch_Goring" },
    { name:"Patrik Elias",     team:"Devils",  era:"1994–2016", emoji:"🏒", why:"The all-time leading scorer in Devils history who played his entire career in New Jersey — quietly building one of the great NHL careers.", wiki:"https://en.wikipedia.org/wiki/Patrik_Elias" },
    { name:"Ken Daneyko",      team:"Devils",  era:"1983–2003", emoji:"🏒", why:"Mr. Devil — played all 1,283 NHL games in a Devils uniform. Three Cups. The soul of New Jersey hockey for 20 years.", wiki:"https://en.wikipedia.org/wiki/Ken_Daneyko" },
    { name:"Corey Pavin",      team:"Shinnecock",era:"1995",   emoji:"⛳", why:"His 4-wood approach to the 72nd green at Shinnecock to win the 1995 US Open is one of the greatest clutch shots in golf history.", wiki:"https://en.wikipedia.org/wiki/Corey_Pavin" },
    { name:"Raymond Floyd",    team:"Shinnecock",era:"1986",   emoji:"⛳", why:"Won the 1986 US Open at Shinnecock Hills at age 43 — making him the oldest US Open champion in history at the time.", wiki:"https://en.wikipedia.org/wiki/Raymond_Floyd" },
  ];

  const TEAMS = ["ALL","Yankees","Mets","Jets","Giants","Knicks","Nets","Rangers","Islanders","Devils","Shinnecock"];
  const filtered = teamFilter === "ALL" ? FORGOTTEN : FORGOTTEN.filter(p => p.team === teamFilter);

  return (
    <div style={styles.statsRoot}>
      <div style={styles.stdHeader}>
        <h2 style={styles.stdTitle}>🕯️ THE ALMOST FORGOTTEN</h2>
        <p style={styles.stdSub}>NY PLAYERS WHO DESERVE MORE LOVE</p>
      </div>
      <div style={{marginBottom:16, padding:"10px 14px", background:"#161616", borderLeft:"3px solid #c8201c"}}>
        <p style={{margin:0, fontSize:12, color:"#aaa", lineHeight:1.6}}>Great players who got overshadowed by larger legends, fell victim to injury, or simply played in an era before social media could amplify their brilliance. New York sports history is deeper than the headlines.</p>
      </div>
      <div style={{display:"flex", gap:4, flexWrap:"wrap", marginBottom:16}}>
        {TEAMS.map(t => (
          <button key={t} onClick={() => setTeamFilter(t)}
            style={{...styles.filterBtn, ...(teamFilter===t?styles.filterBtnActive:{}), fontSize:9}}>
            {t}
          </button>
        ))}
      </div>
      <div style={styles.stdDivisionHeader}>{filtered.length} OVERLOOKED LEGENDS</div>
      {filtered.map((p, i) => (
        <div key={i} style={{...styles.hofRow, ...(i%2===0?{}:{background:"#0f0f0f"})}}>
          <div style={{fontSize:24, flexShrink:0, width:36, textAlign:"center"}}>{p.emoji}</div>
          <div style={styles.hofInfo}>
            <div style={styles.hofHeader}>
              <span style={styles.hofName}>{p.name}</span>
              <span style={styles.hofPos}>{p.team}</span>
              <span style={{fontSize:9, color:"#666"}}>{p.era}</span>
            </div>
            <p style={styles.hofNote}>{p.why}</p>
            <div style={{display:"flex", gap:10}}>
              <a href={p.wiki} target="_blank" rel="noopener noreferrer" style={styles.histLink}>📖 Wiki</a>
              <a href={`https://www.google.com/search?q=${encodeURIComponent(p.name+" "+p.team+" career")}`} target="_blank" rel="noopener noreferrer" style={styles.histLink}>🔍 Google</a>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── STATS TAB ────────────────────────────────────────────────────────────
function StatsTab() {
  const [activeSection, setActiveSection] = useState("LEADERS");
  const [activeLeague, setActiveLeague]   = useState("MLB");
  const [liveLeaders, setLiveLeaders]     = useState([]);
  const [loadingLeaders, setLoadingLeaders] = useState(false);
  const year = new Date().getFullYear();

  const LEAGUE_MAP = {
    MLB:  [{ sport:"baseball",   league:"mlb"  }],
    NFL:  [{ sport:"football",   league:"nfl"  }],
    NBA:  [{ sport:"basketball", league:"nba"  }],
    NHL:  [{ sport:"hockey",     league:"nhl"  }],
    WNBA: [{ sport:"basketball", league:"wnba" }],
  };

  const STATS_REFERENCE = {
    MLB:  { emoji:"⚾", color:"#003087" },
    NFL:  { emoji:"🏈", color:"#c8201c" },
    NBA:  { emoji:"🏀", color:"#FF5910" },
    NHL:  { emoji:"🏒", color:"#0038A8" },
    WNBA: { emoji:"🏀", color:"#007A5E" },
  };

  const DROUGHT_DATA = [
    { team:"Jets",      emoji:"🏈", last:1969, sport:"NFL"  },
    { team:"Knicks",    emoji:"🏀", last:1973, sport:"NBA"  },
    { team:"Islanders", emoji:"🏒", last:1983, sport:"NHL"  },
    { team:"Mets",      emoji:"⚾", last:1986, sport:"MLB"  },
    { team:"Rangers",   emoji:"🏒", last:1994, sport:"NHL"  },
    { team:"Devils",    emoji:"🏒", last:2003, sport:"NHL"  },
    { team:"Giants",    emoji:"🏈", last:2011, sport:"NFL"  },
    { team:"Yankees",   emoji:"⚾", last:2009, sport:"MLB"  },
    { team:"Nets",      emoji:"🏀", last:null, sport:"NBA"  },
    { team:"Liberty",   emoji:"🏀", last:2024, sport:"WNBA" },
  ].sort((a,b) => {
    const ya = a.last ? (year - a.last) : 999;
    const yb = b.last ? (year - b.last) : 999;
    return yb - ya;
  });

  const DRAFT_DATA = {
    Yankees: {
      espnLink: "https://www.baseball-reference.com/teams/NYY/draft.shtml",
      picks: [
        { year:1966, pick:"#1",  name:"Bill Burbach",       note:"Top pick who never panned out — the Yankees have had some painful misses at #1" },
        { year:1991, pick:"#1",  name:"Brien Taylor",       note:"Can't-miss LHP tore his shoulder in a bar fight — never threw a single MLB pitch" },
        { year:1995, pick:"#6",  name:"Derek Jeter",        note:"The Captain. Best pick in franchise history. 5 rings. Hall of Famer." },
        { year:2008, pick:"#30", name:"Gerrit Cole",        note:"Didn't sign with the Yankees — went to Pittsburgh. Came back in 2019 for $324M" },
        { year:2009, pick:"#30", name:"Slade Heathcott",    note:"High-ceiling OF — injuries derailed a promising career" },
        { year:2016, pick:"#16", name:"Blake Rutherford",   note:"Top OF prospect traded in the David Robertson deal" },
        { year:2019, pick:"#20", name:"Anthony Volpe",      note:"The future shortstop — SS at 22 already a fan favorite at Yankee Stadium" },
        { year:2021, pick:"#38", name:"Trey Sweeney",       note:"Athletic SS who became a key part of the Yankees rebuild" },
        { year:2024, pick:"#25", name:"Jurrangelo Cijntje", note:"High-upside pitcher from Curacao — part of the international pipeline" },
        { year:2025, pick:"TBD", name:"2025 First Rounder", note:"Yankees continue stockpiling pitching depth alongside their veteran core" },
        { year:2026, pick:"TBD", name:"2026 Draft Pick",    note:"Current draft year — watch for Yankees direction in amateur talent" },
      ]
    },
    Mets: {
      espnLink: "https://www.baseball-reference.com/teams/NYM/draft.shtml",
      picks: [
        { year:1966, pick:"#1",  name:"Steve Chilcott",     note:"Only #1 overall pick who never reached the majors — chosen over Reggie Jackson" },
        { year:1980, pick:"#1",  name:"Darryl Strawberry",  note:"The Straw Man. 252 Mets HR. 8x All-Star. Unfulfilled greatness." },
        { year:1985, pick:"#1",  name:"Gregg Jefferies",    note:"Switch-hitter with enormous talent — never quite fulfilled the #1 hype in Queens" },
        { year:2001, pick:"#1",  name:"David Wright",       note:"The Face of the Franchise. Spine stenosis ended his career too soon. Always a Met." },
        { year:2004, pick:"#1",  name:"Philip Humber",      note:"Part of the three-way Beltran trade — threw a perfect game for the White Sox" },
        { year:2011, pick:"#1",  name:"Brandon Nimmo",      note:"Still playing for the Mets in 2026 — one of the few 1st picks to have full Mets career" },
        { year:2016, pick:"#1",  name:"Justin Dunn",        note:"RHP traded in the Robinson Cano deal — the price of a star" },
        { year:2019, pick:"#1",  name:"Brett Baty",         note:"3B prospect showing flashes of the talent that made him a top pick" },
        { year:2023, pick:"#9",  name:"Blade Tidwell",      note:"RHP representing the Mets commitment to pitching in the post-deGrom era" },
        { year:2025, pick:"TBD", name:"2025 First Rounder", note:"Steve Cohen era pick — Mets building alongside their massive FA spending" },
        { year:2026, pick:"TBD", name:"2026 Draft Pick",    note:"Continuing the Mets rebuild — watch for high-ceiling arms and bats" },
      ]
    },
    Jets: {
      espnLink: "https://www.pro-football-reference.com/teams/nyj/draft.htm",
      picks: [
        { year:1965, pick:"#1",  name:"Joe Namath",          note:"The guarantee. Broadway Joe. Super Bowl III. The greatest Jet who ever lived." },
        { year:1983, pick:"#24", name:"Ken O'Brien",         note:"Taken one pick after Dan Marino. The what-if that haunts Jets fans forever." },
        { year:1996, pick:"#1",  name:"Keyshawn Johnson",    note:"Please give me the ball — and they did. First pick to write a book before playing." },
        { year:2006, pick:"#4",  name:"D'Brickashaw Ferguson",note:"Bookend LT who protected the blind side for 11 seasons — a model Jet" },
        { year:2009, pick:"#17", name:"Mark Sanchez",        note:"Two AFC Championship Games as a rookie. Then the butt fumble. Then oblivion." },
        { year:2018, pick:"#3",  name:"Sam Darnold",         note:"I am seeing ghosts. Traded for three draft picks. The ghost still haunts NJ." },
        { year:2021, pick:"#2",  name:"Zach Wilson",         note:"BYU QB who had flashes and frustrations — the Jets moved on in 2024" },
        { year:2022, pick:"#4",  name:"Ahmad Sauce Gardner", note:"Immediate All-Pro CB — the best pick the Jets have made in years" },
        { year:2024, pick:"#10", name:"Olu Fashanu",         note:"OT from Penn State — protecting the franchise after years of OL neglect" },
        { year:2025, pick:"#7",  name:"Will Campbell",       note:"LSU OL — the Jets invest heavily in protecting their franchise QB" },
        { year:2026, pick:"#2",  name:"David Bailey",        note:"EDGE from Texas Tech — the Jets go defense first with this elite pass rusher" },
        { year:2026, pick:"#16", name:"Kenyon Sadiq",        note:"TE from Oregon — the Jets finally get a true receiving tight end" },
        { year:2026, pick:"#30", name:"Omar Cooper Jr.",     note:"WR from Indiana — traded up to get this elite route runner and game-changer" },
      ]
    },
    Giants: {
      espnLink: "https://www.pro-football-reference.com/teams/nyg/draft.htm",
      picks: [
        { year:1951, pick:"#1",  name:"Kyle Rote",           note:"SMU halfback who became a Giants legend — early franchise cornerstone" },
        { year:1981, pick:"#2",  name:"Lawrence Taylor",     note:"The greatest defensive player in NFL history. Redefined the LB position forever." },
        { year:1984, pick:"#24", name:"Carl Banks",          note:"LB on two Super Bowl championship teams — unsung hero of the Giants dynasty" },
        { year:2004, pick:"#4",  name:"Eli Manning",         note:"Traded from San Diego on draft night. 2 Super Bowls. 2 SB MVPs. Forever a Giant." },
        { year:2010, pick:"#15", name:"Jason Pierre-Paul",   note:"Edge rusher key to the Super Bowl XLVI run — fireworks accident and comeback" },
        { year:2018, pick:"#2",  name:"Saquon Barkley",      note:"The most electric runner to wear a Giants uniform — broke every rookie rushing record" },
        { year:2019, pick:"#6",  name:"Daniel Jones",        note:"Duke QB who showed promise before the rebuild accelerated around Carter and Nabers" },
        { year:2024, pick:"#6",  name:"Malik Nabers",        note:"LSU WR — electrifying receiver who gives the Giants their first true No. 1 in years" },
        { year:2025, pick:"#3",  name:"Abdul Carter",        note:"Penn State EDGE — most gifted pass rusher in recent draft history. Could be the next LT." },
        { year:2025, pick:"#25", name:"Darius Alexander",    note:"DT from Toledo — interior presence to complement Carter on the defensive front" },
        { year:2026, pick:"TBD", name:"2026 Draft Pick",     note:"Giants continue rebuilding around Carter, Nabers and their new franchise QB" },
      ]
    },
    Knicks: {
      espnLink: "https://www.basketball-reference.com/teams/NYK/draft.html",
      picks: [
        { year:1968, pick:"#1",  name:"Bill Hosket",         note:"Ohio State center — part of the draft class that built toward the 1970 title" },
        { year:1985, pick:"#1",  name:"Patrick Ewing",       note:"Georgetown center. Won the NBA's first lottery. The franchise for 15 seasons." },
        { year:1987, pick:"#18", name:"Mark Jackson",        note:"St. John's PG who became Rookie of the Year — a hometown hero at MSG" },
        { year:1999, pick:"#15", name:"Frederic Weis",       note:"French center famously dunked on by Vince Carter at Olympics — never played in NBA" },
        { year:2015, pick:"#4",  name:"Kristaps Porzingis",  note:"The Unicorn. Traded at his own request. Still stings. 7-foot-3 who walked away." },
        { year:2019, pick:"#3",  name:"RJ Barrett",         note:"Duke wing who developed into a reliable starter and fan favorite at MSG" },
        { year:2021, pick:"#19", name:"Quentin Grimes",      note:"Shooter who showed promise before being traded in the Brunson era" },
        { year:2024, pick:"#11", name:"Pacome Dadiet",       note:"French wing who continues the Knicks international scouting success" },
        { year:2025, pick:"TBD", name:"2025 First Rounder",  note:"Knicks building depth around Brunson, Hart, Anunoby, Towns and Bridges" },
        { year:2026, pick:"TBD", name:"2026 Draft Pick",     note:"Knicks in win-now mode — draft capital may be used in win-now trades" },
      ]
    },
    Rangers: {
      espnLink: "https://www.hockey-reference.com/teams/NYR/draft.html",
      picks: [
        { year:1988, pick:"#1",  name:"Brian Leetch",        note:"First American to win the Conn Smythe. Greatest Rangers defenseman of modern era." },
        { year:1991, pick:"#15", name:"Alexei Kovalev",      note:"Dazzling skill, maddening inconsistency. 1994 Cup champion. Unforgettable." },
        { year:2003, pick:"#12", name:"Hugh Jessiman",       note:"The infamous bust — projected star who never played a meaningful NHL game" },
        { year:2009, pick:"#20", name:"Chris Kreider",       note:"Boston College power forward who became a beloved 20-goal scorer" },
        { year:2019, pick:"#2",  name:"Kaapo Kakko",         note:"Finnish winger — part of the youth movement that rebuilt the Rangers" },
        { year:2020, pick:"#1",  name:"Alexis Lafreniere",   note:"First overall pick — franchise forward developing steadily on Broadway" },
        { year:2021, pick:"#5",  name:"Brennan Othmann",     note:"Scoring winger part of the Rangers next championship core" },
        { year:2022, pick:"#13", name:"Gabe Perreault",      note:"American forward with elite offensive instincts from USNTDP" },
        { year:2024, pick:"TBD", name:"2024 First Rounder",  note:"Rangers in win-now mode with Panarin, Fox, Trocheck and Shesterkin" },
        { year:2025, pick:"TBD", name:"2025 First Rounder",  note:"Rangers continue building around their core while making playoff pushes" },
        { year:2026, pick:"TBD", name:"2026 Draft Pick",     note:"Next chapter of Rangers hockey as the Shesterkin window continues" },
      ]
    },
    Islanders: {
      espnLink: "https://www.hockey-reference.com/teams/NYI/draft.html",
      picks: [
        { year:1973, pick:"#1",  name:"Denis Potvin",        note:"Led the Islanders to four consecutive Stanley Cups. Greatest Islander D-man ever." },
        { year:1974, pick:"#1",  name:"Clark Gillies",       note:"Power forward cornerstone of the dynasty — Cup after Cup with Bossy and Trottier" },
        { year:1977, pick:"#15", name:"Mike Bossy",          note:"53 goals as a rookie. Nine consecutive 50-goal seasons. The most prolific scorer ever." },
        { year:1980, pick:"#22", name:"Pat LaFontaine",      note:"One of the most gifted Islanders ever — traded too soon, beloved forever" },
        { year:1992, pick:"#1",  name:"Darius Kasparaitis",  note:"Ferocious defensive D-man who terrorized opponents at Nassau Coliseum" },
        { year:2000, pick:"#2",  name:"Rick DiPietro",       note:"15-year $67.5M contract — the most notorious contract in NHL history" },
        { year:2009, pick:"#1",  name:"John Tavares",        note:"The franchise cornerstone who left for Toronto — still bittersweet on Long Island" },
        { year:2019, pick:"#11", name:"Samuel Bolduc",       note:"D-man part of the Islanders defensive rebuild at UBS Arena" },
        { year:2022, pick:"#13", name:"Aatu Raty",           note:"Finnish center with exceptional hockey sense — key future piece" },
        { year:2024, pick:"#13", name:"Cole Eiserman",       note:"High-scoring American winger who could be a major piece of the future" },
        { year:2025, pick:"#1",  name:"Matthew Schaefer",    note:"No. 1 overall pick in 2025 — Erie OHLer is the most important Islanders pick since Tavares" },
        { year:2026, pick:"TBD", name:"2026 Draft Pick",     note:"Islanders rebuild accelerates with Schaefer anchoring the blue line of the future" },
      ]
    },
    Devils: {
      espnLink: "https://www.hockey-reference.com/teams/NJD/draft.html",
      picks: [
        { year:1991, pick:"#1",  name:"Scott Niedermayer",   note:"Four Stanley Cups between NJ and Anaheim — greatest defensive D of his era" },
        { year:1995, pick:"#24", name:"Petr Sykora",         note:"Czech winger who was a key part of the 2000 Stanley Cup championship team" },
        { year:2003, pick:"#1",  name:"Zach Parise",         note:"Minnesota son who became a Devils fan favorite — scored the tying goal in 2012 SCF" },
        { year:2012, pick:"#2",  name:"Stefan Matteau",      note:"Overtime hero in the 2014 playoffs — his goal to beat Rangers still echoes in NJ" },
        { year:2017, pick:"#1",  name:"Nico Hischier",       note:"Swiss center and team captain — the present and future of the franchise" },
        { year:2019, pick:"#1",  name:"Jack Hughes",         note:"Michigan product — one of the most gifted players in the entire NHL" },
        { year:2021, pick:"#2",  name:"Simon Nemec",         note:"Slovak D-man forming a cornerstone defensive pair in the Hughes era" },
        { year:2022, pick:"#2",  name:"Simon Nemec Jr.",     note:"Continuing the Devils tradition of elite defensive drafting" },
        { year:2023, pick:"#2",  name:"Leo Carlsson",        note:"Swedish C with exceptional hockey sense — building alongside Hughes" },
        { year:2025, pick:"TBD", name:"2025 First Rounder",  note:"Devils in ascending phase — the Jack and Luke Hughes window is open" },
        { year:2026, pick:"TBD", name:"2026 Draft Pick",     note:"Devils targeting continued excellence after their 2022-23 breakout season" },
      ]
    },
  };


  const RIVALS_DATA = [
    { team1:"Yankees",   team2:"Red Sox",    sport:"MLB", wins:"27 WS to 9",     note:"Baseball's greatest rivalry — 100+ years of pure hatred. The Bambino Curse. Aaron Boone. 2004 ALCS." },
    { team1:"Yankees",   team2:"Mets",       sport:"MLB", wins:"2000 Subway Series 4-1", note:"Queens vs The Bronx — the city divided every summer. The 2000 Subway Series was a Yankee sweep." },
    { team1:"Jets",      team2:"Dolphins",   sport:"NFL", wins:"Series split",    note:"AFC East — Dan Marino haunted Jets fans for two decades. Chad Pennington went to Miami and beat them." },
    { team1:"Giants",    team2:"Eagles",     sport:"NFL", wins:"Series split",    note:"NFC East — Lawrence Taylor vs Randall Cunningham. Eli Manning vs DeSean Jackson. Brutal division games." },
    { team1:"Giants",    team2:"Cowboys",    sport:"NFL", wins:"Cowboys lead",    note:"America's Team vs NY's team. The rivalry that defines NFC East football. Lawrence Taylor vs Troy Aikman." },
    { team1:"Rangers",   team2:"Islanders",  sport:"NHL", wins:"Rangers lead",   note:"The Battle of New York — Denis Potvin vs the Rangers. John Roach incidents. Four-Cup dynasty tensions." },
    { team1:"Rangers",   team2:"Devils",     sport:"NHL", wins:"Devils 90s-00s", note:"Messier's guarantee. The Devils' trap neutralized Ranger skill. Metropolitan rivals forever." },
    { team1:"Islanders", team2:"Devils",     sport:"NHL", wins:"Devils 3 Cups",  note:"NJ vs Long Island — two dynasties from the same hockey era fighting for the same territory." },
    { team1:"Knicks",    team2:"Celtics",    sport:"NBA", wins:"Celtics lead",   note:"Willis Reed vs Dave Cowens. Ewing vs Bird. The most heated NBA rivalry NY has ever known." },
    { team1:"Knicks",    team2:"Heat",       sport:"NBA", wins:"Split",          note:"Pat Riley's revenge — he coached both teams and crushed the Knicks with Miami. 1990s bad blood forever." },
    { team1:"Nets",      team2:"Knicks",     sport:"NBA", wins:"Split modern era",note:"Brooklyn vs Manhattan — the city's NBA rivalry. The Nets' Big 3 era vs Knicks rebuilding." },
    { team1:"Mets",      team2:"Phillies",   sport:"MLB", wins:"Split",          note:"NL East division rivals — always intense. Ryan Howard, Chase Utley, and Citizens Bank Park hatred." },
  ];

  const TEAM_LINKS = [
    { name:"Yankees Official",   url:"https://www.mlb.com/yankees",       emoji:"⚾",  desc:"mlb.com/yankees" },
    { name:"Mets Official",       url:"https://www.mlb.com/mets",          emoji:"⚾",  desc:"mlb.com/mets" },
    { name:"Jets Official",       url:"https://www.newyorkjets.com",       emoji:"🏈",  desc:"newyorkjets.com" },
    { name:"Giants Official",     url:"https://www.giants.com",            emoji:"🏈",  desc:"giants.com" },
    { name:"Knicks Official",     url:"https://www.nba.com/knicks",        emoji:"🏀",  desc:"nba.com/knicks" },
    { name:"Nets Official",       url:"https://www.nba.com/nets",          emoji:"🏀",  desc:"nba.com/nets" },
    { name:"Rangers Official",    url:"https://www.nhl.com/rangers",       emoji:"🏒",  desc:"nhl.com/rangers" },
    { name:"Islanders Official",  url:"https://www.nhl.com/islanders",     emoji:"🏒",  desc:"nhl.com/islanders" },
    { name:"Devils Official",     url:"https://www.nhl.com/devils",        emoji:"🏒",  desc:"nhl.com/devils" },
    { name:"Liberty Official",    url:"https://liberty.wnba.com",          emoji:"🏀",  desc:"liberty.wnba.com" },
    { name:"ESPN NY Sports",      url:"https://www.espn.com/new-york/",    emoji:"📺",  desc:"espn.com/new-york" },
    { name:"NY Post Sports",      url:"https://nypost.com/sports/",        emoji:"📰",  desc:"nypost.com/sports" },
    { name:"Pinstripe Alley",     url:"https://www.pinstripealley.com",    emoji:"✍️",  desc:"Yankees SB Nation blog" },
    { name:"Amazin Avenue",       url:"https://www.amazinavenue.com",      emoji:"✍️",  desc:"Mets SB Nation blog" },
    { name:"Blueshirt Banter",    url:"https://www.blueshirtbanter.com",   emoji:"✍️",  desc:"Rangers SB Nation blog" },
    { name:"Gang Green Nation",   url:"https://www.ganggreennation.com",   emoji:"✍️",  desc:"Jets SB Nation blog" },
    { name:"Big Blue View",       url:"https://www.bigblueview.com",       emoji:"✍️",  desc:"Giants SB Nation blog" },
    { name:"Posting & Toasting",  url:"https://www.postingandtoasting.com",emoji:"✍️",  desc:"Knicks SB Nation blog" },
    { name:"Lighthouse Hockey",   url:"https://www.lighthousehockey.com",  emoji:"✍️",  desc:"Islanders SB Nation blog" },
    { name:"All About The Jersey",url:"https://www.allaboutthejersey.com", emoji:"✍️",  desc:"Devils SB Nation blog" },
    { name:"r/NYYankees",         url:"https://reddit.com/r/NYYankees",    emoji:"💬",  desc:"185K members" },
    { name:"r/NewYorkMets",       url:"https://reddit.com/r/NewYorkMets",  emoji:"💬",  desc:"Mets Reddit" },
    { name:"r/nyjets",            url:"https://reddit.com/r/nyjets",       emoji:"💬",  desc:"Jets Reddit" },
    { name:"r/NYKnicks",          url:"https://reddit.com/r/NYKnicks",     emoji:"💬",  desc:"385K members" },
    { name:"r/rangers",           url:"https://reddit.com/r/rangers",      emoji:"💬",  desc:"Rangers Reddit" },
    { name:"r/NewYorkIslanders",  url:"https://reddit.com/r/NewYorkIslanders",emoji:"💬",desc:"Islanders Reddit" },
    { name:"r/devils",            url:"https://reddit.com/r/devils",       emoji:"💬",  desc:"Devils Reddit" },
  ];

  const STAT_SITES = {
    MLB: [
      { name:"Batting Average Leaders",    desc:"Current season batting average — active players",       url:"https://www.baseball-reference.com/leaders/batting_avg_active.shtml",      site:"Baseball Ref" },
      { name:"Home Run Leaders",           desc:"Single season and active career home run leaders",       url:"https://www.baseball-reference.com/leaders/HR_active.shtml",               site:"Baseball Ref" },
      { name:"RBI Leaders",                desc:"Runs batted in — season and career",                     url:"https://www.baseball-reference.com/leaders/RBI_active.shtml",              site:"Baseball Ref" },
      { name:"ERA Leaders",                desc:"Earned run average — best pitchers this season",         url:"https://www.baseball-reference.com/leaders/earned_run_avg_active.shtml",   site:"Baseball Ref" },
      { name:"Strikeout Leaders (Pitching)",desc:"Strikeouts by starting pitchers",                      url:"https://www.baseball-reference.com/leaders/SO_active.shtml",               site:"Baseball Ref" },
      { name:"WAR Leaders",                desc:"Wins Above Replacement — best all-around players",       url:"https://www.baseball-reference.com/leaders/WAR_position_active.shtml",     site:"Baseball Ref" },
      { name:"OPS Leaders",                desc:"On-base plus slugging — best offensive players",         url:"https://www.baseball-reference.com/leaders/onbase_plus_slugging_active.shtml",site:"Baseball Ref"},
      { name:"Stolen Base Leaders",        desc:"Speed on the basepaths — SB leaders",                   url:"https://www.baseball-reference.com/leaders/SB_active.shtml",               site:"Baseball Ref" },
      { name:"Yankees All-Time Leaders",   desc:"Career records in pinstripes — all categories",          url:"https://www.baseball-reference.com/teams/NYY/leaders.shtml",               site:"Baseball Ref" },
      { name:"Mets All-Time Leaders",      desc:"Career records as a Met — all categories",               url:"https://www.baseball-reference.com/teams/NYM/leaders.shtml",               site:"Baseball Ref" },
      { name:"Yankees 2026 Roster Stats",  desc:"Current season stats for every Yankee",                  url:"https://www.baseball-reference.com/teams/NYY/2026.shtml",                  site:"Baseball Ref" },
      { name:"Mets 2026 Roster Stats",     desc:"Current season stats for every Met",                     url:"https://www.baseball-reference.com/teams/NYM/2026.shtml",                  site:"Baseball Ref" },
    ],
    NFL: [
      { name:"Passing Yards Leaders",      desc:"Quarterback passing yards — current season",             url:"https://www.pro-football-reference.com/leaders/pass_yds_single_season.htm", site:"PFR" },
      { name:"Rushing Yards Leaders",      desc:"Running back rushing yards — current season",            url:"https://www.pro-football-reference.com/leaders/rush_yds_single_season.htm", site:"PFR" },
      { name:"Receiving Yards Leaders",    desc:"Wide receiver receiving yards",                          url:"https://www.pro-football-reference.com/leaders/rec_yds_single_season.htm",  site:"PFR" },
      { name:"Sack Leaders",               desc:"Defensive sacks — current season",                       url:"https://www.pro-football-reference.com/leaders/sacks.htm",                  site:"PFR" },
      { name:"Passer Rating Leaders",      desc:"QB efficiency — passer rating",                          url:"https://www.pro-football-reference.com/leaders/pass_rating_single_season.htm",site:"PFR"},
      { name:"Jets All-Time Leaders",      desc:"Career records in green and white",                       url:"https://www.pro-football-reference.com/teams/nyj/leaders.htm",              site:"PFR" },
      { name:"Giants All-Time Leaders",    desc:"Career records as a New York Giant",                      url:"https://www.pro-football-reference.com/teams/nyg/leaders.htm",              site:"PFR" },
      { name:"NFL Standings 2026",         desc:"Full AFC and NFC standings",                              url:"https://www.espn.com/nfl/standings",                                         site:"ESPN" },
    ],
    NBA: [
      { name:"Scoring Leaders",            desc:"Points per game — current NBA season",                   url:"https://www.basketball-reference.com/leaders/pts_per_g_active.html",        site:"BBall Ref" },
      { name:"Assists Leaders",            desc:"Assists per game — playmakers",                           url:"https://www.basketball-reference.com/leaders/ast_per_g_active.html",        site:"BBall Ref" },
      { name:"Rebounds Leaders",           desc:"Rebounds per game — big men",                            url:"https://www.basketball-reference.com/leaders/trb_per_g_active.html",        site:"BBall Ref" },
      { name:"3-Point % Leaders",          desc:"Best shooters from deep",                                url:"https://www.basketball-reference.com/leaders/fg3_pct_active.html",          site:"BBall Ref" },
      { name:"PER Leaders",                desc:"Player Efficiency Rating — best all-around players",     url:"https://www.basketball-reference.com/leaders/per_active.html",              site:"BBall Ref" },
      { name:"Knicks All-Time Leaders",    desc:"Career records at Madison Square Garden",                 url:"https://www.basketball-reference.com/teams/NYK/leaders.html",               site:"BBall Ref" },
      { name:"Nets All-Time Leaders",      desc:"Career records as a Brooklyn/NJ Net",                    url:"https://www.basketball-reference.com/teams/BRK/leaders.html",               site:"BBall Ref" },
      { name:"NBA Standings 2026",         desc:"Full Eastern and Western Conference standings",           url:"https://www.espn.com/nba/standings",                                         site:"ESPN" },
    ],
    NHL: [
      { name:"Points Leaders",             desc:"Goals + Assists — scoring leaders",                      url:"https://www.hockey-reference.com/leaders/points_active.html",               site:"Hockey Ref" },
      { name:"Goals Leaders",             desc:"Goal scorers — current season leaders",                   url:"https://www.hockey-reference.com/leaders/goals_active.html",                site:"Hockey Ref" },
      { name:"Assists Leaders",           desc:"Playmakers — primary assists leaders",                    url:"https://www.hockey-reference.com/leaders/assists_active.html",              site:"Hockey Ref" },
      { name:"Save % Leaders",            desc:"Goaltender save percentage",                              url:"https://www.hockey-reference.com/leaders/save_pct_active.html",             site:"Hockey Ref" },
      { name:"GAA Leaders",               desc:"Goals against average — best goaltenders",                url:"https://www.hockey-reference.com/leaders/goals_against_avg_active.html",    site:"Hockey Ref" },
      { name:"Rangers All-Time Leaders",  desc:"Career records as a Broadway Blue",                       url:"https://www.hockey-reference.com/teams/NYR/leaders.html",                   site:"Hockey Ref" },
      { name:"Islanders All-Time Leaders",desc:"Career records as an Islander",                           url:"https://www.hockey-reference.com/teams/NYI/leaders.html",                   site:"Hockey Ref" },
      { name:"Devils All-Time Leaders",   desc:"Career records as a New Jersey Devil",                    url:"https://www.hockey-reference.com/teams/NJD/leaders.html",                   site:"Hockey Ref" },
      { name:"NHL Standings 2026",        desc:"Full Metropolitan and Atlantic division standings",        url:"https://www.espn.com/nhl/standings",                                         site:"ESPN" },
    ],
    WNBA: [
      { name:"WNBA Scoring Leaders",      desc:"Points per game — current WNBA season",                  url:"https://www.basketball-reference.com/wnba/leaders/pts_per_g_active.html",   site:"BBall Ref" },
      { name:"WNBA Rebounds Leaders",     desc:"Rebounds per game",                                       url:"https://www.basketball-reference.com/wnba/leaders/trb_per_g_active.html",   site:"BBall Ref" },
      { name:"WNBA Assists Leaders",      desc:"Assists per game — playmakers",                           url:"https://www.basketball-reference.com/wnba/leaders/ast_per_g_active.html",   site:"BBall Ref" },
      { name:"Liberty All-Time Leaders",  desc:"Career records as a New York Liberty",                    url:"https://www.basketball-reference.com/wnba/teams/LIB/leaders.html",           site:"BBall Ref" },
      { name:"WNBA Standings 2026",       desc:"Full league standings",                                   url:"https://www.espn.com/wnba/standings",                                        site:"ESPN" },
    ],
  };

  const sections = ["LEADERS","DROUGHT","DRAFT","RIVALS","TEAM LINKS"];

  useEffect(() => {
    if (activeSection !== "LEADERS") return;
    setLoadingLeaders(true);
    const cfg = LEAGUE_MAP[activeLeague];
    if (!cfg) { setLoadingLeaders(false); return; }
    Promise.all(cfg.map(ep =>
      fetch(`https://site.api.espn.com/apis/site/v2/sports/${ep.sport}/${ep.league}/leaders`)
        .then(r => r.json()).catch(() => null)
    )).then(results => {
      const all = [];
      results.forEach(data => {
        if (!data?.leaders) return;
        data.leaders.slice(0,4).forEach(cat => {
          if (!cat?.leaders) return;
          cat.leaders.slice(0,5).forEach(l => {
            all.push({
              name:     l.athlete?.displayName || "—",
              team:     l.athlete?.team?.abbreviation || "—",
              stat:     l.displayValue || "—",
              category: cat.displayName || "Stat",
              sport:    activeLeague,
              link:     l.athlete?.links?.[0]?.href || null,
            });
          });
        });
      });
      setLiveLeaders(all.slice(0, 40));
      setLoadingLeaders(false);
    });
  }, [activeSection, activeLeague]);

  return (
    <div style={styles.statsRoot}>
      <div style={styles.stdHeader}>
        <h2 style={styles.stdTitle}>NY SPORTS STATS & HISTORY</h2>
        <p style={styles.stdSub}>LEADERS · DROUGHT TRACKER · DRAFT HISTORY · RIVALRIES · TEAM LINKS</p>
      </div>

      <div style={{display:"flex", gap:4, flexWrap:"wrap", marginBottom:20, borderBottom:"1px solid #2a2a2a", paddingBottom:12}}>
        {sections.map(s => (
          <button key={s} onClick={() => setActiveSection(s)}
            style={{...styles.filterBtn, ...(activeSection===s ? styles.filterBtnActive : {})}}>
            {s}
          </button>
        ))}
      </div>

      {activeSection === "LEADERS" && (
        <div>
          <div style={{...styles.filterGroup, flexWrap:"wrap", marginBottom:16}}>
            {Object.keys(STAT_SITES).map(l => (
              <button key={l} onClick={() => setActiveLeague(l)}
                style={{...styles.filterBtn, ...(activeLeague===l ? styles.filterBtnActive : {})}}>
                {STATS_REFERENCE[l]?.emoji} {l}
              </button>
            ))}
          </div>
          <div>
            <div style={styles.stdDivisionHeader}>{STATS_REFERENCE[activeLeague]?.emoji} {activeLeague} STAT LEADERS & REFERENCE</div>
            <div style={{marginBottom:12, padding:"10px 14px", background:"#161616", borderLeft:"3px solid #c8201c"}}>
              <p style={{margin:0, fontSize:12, color:"#aaa"}}>Live leaderboards from Baseball Reference, Pro Football Reference, Basketball Reference, and Hockey Reference. Click any category to see current leaders.</p>
            </div>
            {(STAT_SITES[activeLeague] || []).map((cat, i) => (
              <a key={i} href={cat.url} target="_blank" rel="noopener noreferrer"
                style={{...styles.leaderRow, ...(i%2===0?{}:{background:"#0f0f0f"}), textDecoration:"none", display:"flex", alignItems:"center", gap:12}}>
                <div style={{flex:1}}>
                  <div style={{fontSize:13, fontWeight:700, color:"#e8e8e8", fontFamily:"'Georgia',serif", marginBottom:2}}>{cat.name}</div>
                  <div style={{fontSize:10, color:"#666"}}>{cat.desc}</div>
                </div>
                <div style={{textAlign:"right", flexShrink:0}}>
                  <div style={{fontSize:9, color:"#c8201c", fontWeight:900, letterSpacing:"0.1em"}}>{cat.site}</div>
                  <div style={{fontSize:9, color:"#555"}}>VIEW LEADERS →</div>
                </div>
              </a>
            ))}
          </div>
          <div style={{marginTop:16, padding:"10px 14px", background:"#161616", borderLeft:"3px solid #c8201c"}}>
            <p style={{margin:0, fontSize:11, color:"#aaa"}}>Powered by Sports Reference · The gold standard for sports statistics since 2000</p>
          </div>
        </div>
      )}

      {activeSection === "DROUGHT" && (
        <div>
          <div style={{marginBottom:16, padding:"10px 14px", background:"#161616", borderLeft:"3px solid #c8201c"}}>
            <p style={{margin:0, fontSize:12, color:"#aaa"}}>How long has it been since each NY team last won a championship? Sorted by most desperate first.</p>
          </div>
          {DROUGHT_DATA.map((t, i) => {
            const years = t.last ? (year - t.last) : 999;
            const pct = Math.min(years / 60 * 100, 100);
            const color = years > 40 ? "#c8201c" : years > 20 ? "#f59e0b" : years === 999 ? "#c8201c" : "#22c55e";
            return (
              <div key={i} style={{...styles.droughtRow, ...(i%2===0?{}:{background:"#0f0f0f"})}}>
                <span style={styles.droughtEmoji}>{t.emoji}</span>
                <div style={styles.droughtInfo}>
                  <span style={styles.droughtTeam}>{t.team}</span>
                  <span style={styles.droughtLast}>{t.last ? `Last: ${t.last} (${years} years ago)` : "Never won"}</span>
                  <div style={styles.droughtBar}>
                    <div style={{...styles.droughtFill, width:`${pct}%`, background:color}} />
                  </div>
                </div>
                <span style={{...styles.droughtYears, color}}>
                  {t.last ? `${years}Y` : "∞"}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {activeSection === "DRAFT" && (
        <div>
          <div style={{marginBottom:16, padding:"10px 14px", background:"#161616", borderLeft:"3px solid #c8201c"}}>
            <p style={{margin:0, fontSize:12, color:"#aaa"}}>Notable draft picks — the best, worst, and most memorable selections in NY sports history. Includes 2025 and 2026 picks.</p>
          </div>
          {Object.entries(DRAFT_DATA).map(([team, teamData]) => (
            <div key={team} style={{marginBottom:28}}>
              <div style={{display:"flex", alignItems:"center", justifyContent:"space-between", flexWrap:"wrap", gap:8, marginBottom:4}}>
                <div style={styles.stdDivisionHeader}>{team.toUpperCase()}</div>
                <a href={teamData.espnLink} target="_blank" rel="noopener noreferrer"
                  style={{...styles.histLink, fontSize:9, letterSpacing:"0.08em"}}>
                  ALL DRAFT PICKS → Sports Reference
                </a>
              </div>
              {teamData.picks.map((p,i) => (
                <a key={i}
                  href={`https://www.google.com/search?q=${encodeURIComponent(p.name+" "+team+" draft pick career")}`}
                  target="_blank" rel="noopener noreferrer"
                  style={{display:"flex", alignItems:"flex-start", gap:10, padding:"9px 14px",
                    borderBottom:"1px solid #1a1a1a",
                    background: p.year >= 2025 ? "#0a1a0a" : i%2===0 ? "#0e0e0e" : "#111",
                    borderLeft: p.year >= 2025 ? "3px solid #22c55e" : p.year >= 2020 ? "3px solid #f59e0b" : "3px solid transparent",
                    textDecoration:"none"}}>
                  <span style={{fontSize:11, color:"#c8201c", fontWeight:900, flexShrink:0, minWidth:36}}>{p.year}</span>
                  <span style={{fontSize:10, color:"#555", flexShrink:0, minWidth:32, letterSpacing:"0.05em"}}>{p.pick}</span>
                  <div style={{flex:1, minWidth:0}}>
                    <div style={{fontSize:13, fontWeight:700, color:"#e8e8e8", fontFamily:"'Georgia',serif", marginBottom:2}}>
                      {p.name}
                      {p.year >= 2025 && <span style={{fontSize:9, marginLeft:6, color:"#22c55e", fontWeight:900}}>2025–26</span>}
                    </div>
                    <div style={{fontSize:11, color:"#777", lineHeight:1.4}}>{p.note}</div>
                  </div>
                  <span style={{fontSize:9, color:"#555", flexShrink:0, alignSelf:"center"}}>→</span>
                </a>
              ))}
            </div>
          ))}
        </div>
      )}

      {activeSection === "RIVALS" && (
        <div>
          <div style={{marginBottom:16, padding:"10px 14px", background:"#161616", borderLeft:"3px solid #c8201c"}}>
            <p style={{margin:0, fontSize:12, color:"#aaa"}}>The rivalries that define New York sports — blood, history, and hatred.</p>
          </div>
          {RIVALS_DATA.map((r,i) => (
            <a key={i}
              href={`https://www.google.com/search?q=${encodeURIComponent(r.team1+" vs "+r.team2+" rivalry history")}`}
              target="_blank" rel="noopener noreferrer"
              style={{...styles.rivalRow, ...(i%2===0?{}:{background:"#0f0f0f"}), textDecoration:"none", display:"block", padding:"12px 14px", borderBottom:"1px solid #222"}}>
              <div style={{display:"flex", alignItems:"center", gap:10, marginBottom:6, flexWrap:"wrap"}}>
                <span style={{fontSize:13, fontWeight:900, color:"#fff", fontFamily:"'Georgia',serif"}}>{r.team1}</span>
                <span style={{fontSize:10, color:"#c8201c", fontWeight:900}}>vs</span>
                <span style={{fontSize:13, fontWeight:900, color:"#fff", fontFamily:"'Georgia',serif"}}>{r.team2}</span>
                <span style={{fontSize:9, color:"#666", letterSpacing:"0.1em"}}>[{r.sport}]</span>
                {r.wins && <span style={{fontSize:10, color:"#888", marginLeft:"auto"}}>{r.wins}</span>}
              </div>
              <p style={{margin:0, fontSize:12, color:"#888", lineHeight:1.5}}>{r.note}</p>
            </a>
          ))}
        </div>
      )}

      {activeSection === "TEAM LINKS" && (
        <div>
          <div style={{marginBottom:16, padding:"10px 14px", background:"#161616", borderLeft:"3px solid #c8201c"}}>
            <p style={{margin:0, fontSize:12, color:"#aaa"}}>Official sites, fan blogs, and Reddit communities for every NY team.</p>
          </div>
          {TEAM_LINKS.map((t,i) => (
            <a key={i} href={t.url} target="_blank" rel="noopener noreferrer"
              style={{...styles.beatWriterRow, ...(i%2===0?{}:{background:"#0f0f0f"})}}>
              <div style={styles.beatWriterIcon}>{t.emoji}</div>
              <div style={styles.beatWriterInfo}>
                <span style={styles.beatWriterName}>{t.name}</span>
                <span style={styles.beatWriterDesc}>{t.desc}</span>
              </div>
              <span style={styles.beatWriterArrow}>→</span>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
function RadioTab() {
  return (
    <div style={styles.statsRoot}>
      <div style={styles.stdHeader}>
        <h2 style={styles.stdTitle}>📻 NY SPORTS RADIO & PODCASTS</h2>
        <p style={styles.stdSub}>STATIONS · PODCASTS · STREAMING</p>
      </div>
      <div style={{marginBottom:16, padding:"10px 14px", background:"#161616", borderLeft:"3px solid #c8201c"}}>
        <p style={{margin:0, fontSize:12, color:"#aaa"}}>Official radio, podcasts and streams for all NY teams. WFAN is the heartbeat of NY sports radio.</p>
      </div>

      <div style={styles.stdDivisionHeader}>📻 NY SPORTS RADIO STATIONS</div>
      {[
        { name:"WFAN 101.9 FM / 66 AM",  teams:"All NY Teams",        url:"https://www.audacy.com/wfan",            desc:"NY's flagship sports station since 1987 — Yankees, Mets, Giants, Jets, Knicks, Rangers, Islanders, Nets, Devils" },
        { name:"ESPN NY 98.7 FM",         teams:"All NY Teams",        url:"https://www.espn.com/espnradio/",        desc:"ESPN Radio New York — breaking news, analysis and live coverage of all NY teams" },
        { name:"YES Network",             teams:"Yankees",             url:"https://www.yesnetwork.com",             desc:"Yankees home radio and TV — Dave Sims, Michael Kay, Suzyn Waldman call the games" },
        { name:"SNY",                     teams:"Mets + All NY",       url:"https://sny.tv",                        desc:"Home of Mets baseball on TV — plus Jets, Giants, Knicks, Yankees, Rangers, Islanders, Nets coverage" },
        { name:"MSG Network",             teams:"Rangers · Knicks",    url:"https://www.msgnetworks.com",            desc:"Rangers and Knicks home broadcast — live from the World's Most Famous Arena" },
        { name:"WGBB 95.5FM / 1240 AM",  teams:"All NY · LI Focus",   url:"https://www.sportstalkny.com",           desc:"Long Island's NY sports talk. Sundays 8PM. Yankees, Mets, Islanders, Jets focus for LI fans" },
        { name:"97.3 ESPN NJ",            teams:"Devils · Giants · Jets",url:"https://www.973espnnj.com",           desc:"NJ-focused ESPN Radio — Devils, Giants, Jets coverage from the NJ perspective" },
      ].map((r, i) => (
        <a key={i} href={r.url} target="_blank" rel="noopener noreferrer"
          style={{...styles.radioRow, ...(i%2===0?{}:{background:"#0f0f0f"})}}>
          <div style={styles.radioIcon}>📻</div>
          <div style={styles.radioInfo}>
            <span style={styles.radioName}>{r.name}</span>
            <span style={styles.radioTeams}>{r.teams}</span>
            <span style={styles.radioDesc}>{r.desc}</span>
          </div>
          <span style={styles.radioArrow}>→</span>
        </a>
      ))}

      <div style={{...styles.stdDivisionHeader, marginTop:20}}>🎙️ OFFICIAL TEAM PODCASTS</div>
      {[
        { name:"Yankees Podcast",          team:"Yankees ⚾",    url:"https://www.mlb.com/yankees/fans/podcasts",      desc:"Official Yankees podcast — player interviews, game breakdowns, analysis" },
        { name:"Mets Podcast",             team:"Mets ⚾",       url:"https://www.mlb.com/mets/fans/podcasts",         desc:"Inside the Mets clubhouse — official team podcast and post-game breakdown" },
        { name:"Big Blue Podcast",         team:"Giants 🏈",    url:"https://www.giants.com/podcasts",                desc:"NY Giants official podcast — news, analysis, player and coach features" },
        { name:"The Green & White Report", team:"Jets 🏈",      url:"https://www.newyorkjets.com/podcasts",           desc:"Official Jets podcast — training camp to game day coverage" },
        { name:"Knicks Podcast",           team:"Knicks 🏀",    url:"https://www.nba.com/knicks/podcasts",            desc:"Madison Square Garden's official Knicks coverage — Brunson era begins" },
        { name:"Blueshirts Beat",          team:"Rangers 🏒",   url:"https://www.nhl.com/rangers/news/podcasts",      desc:"New York Rangers official podcast — from practice to game night" },
        { name:"Isles Audio",             team:"Islanders 🏒",  url:"https://www.nhl.com/islanders/news/podcasts",    desc:"Official Islanders podcast and radio — UBS Arena coverage" },
        { name:"Liberty Podcast",          team:"Liberty 🏀",   url:"https://www.nyliberty.com/multimedia",           desc:"Defending WNBA champion NY Liberty — official coverage and interviews" },
        { name:"NYCFC Podcast",            team:"NYCFC ⚽",     url:"https://www.nycfc.com/news/podcasts",            desc:"Official NYCFC podcast — The Pigeons, MLS Cup coverage, player features" },
        { name:"Nets Podcast",             team:"Nets 🏀",      url:"https://www.nba.com/nets/podcasts",              desc:"Brooklyn Nets official coverage — game analysis and player interviews" },
        { name:"Devils Podcast",           team:"Devils 🏒",    url:"https://www.nhl.com/devils/news/podcasts",       desc:"New Jersey Devils official podcast — Nico Hischier, Jack Hughes era coverage" },
        { name:"Gotham FC Podcast",        team:"Gotham FC ⚽", url:"https://www.gothamfc.com",                       desc:"2x NWSL champion Gotham FC — official team coverage from Harrison NJ" },
      ].map((p, i) => (
        <a key={i} href={p.url} target="_blank" rel="noopener noreferrer"
          style={{...styles.radioRow, ...(i%2===0?{}:{background:"#0f0f0f"})}}>
          <div style={styles.radioIcon}>🎙️</div>
          <div style={styles.radioInfo}>
            <span style={styles.radioName}>{p.name}</span>
            <span style={styles.radioTeams}>{p.team}</span>
            <span style={styles.radioDesc}>{p.desc}</span>
          </div>
          <span style={styles.radioArrow}>→</span>
        </a>
      ))}

      <div style={{...styles.stdDivisionHeader, marginTop:20}}>📱 STREAM LIVE</div>
      {[
        { name:"Audacy App",  icon:"📱", url:"https://www.audacy.com/wfan",                              desc:"Free — stream WFAN 101.9/66 live on iOS and Android" },
        { name:"TuneIn",      icon:"📻", url:"https://tunein.com/radio/WFAN-Sports-Radio-1019-FMa25701/",desc:"Free streaming for WFAN and all NY sports radio stations" },
        { name:"ESPN App",    icon:"📺", url:"https://www.espn.com/espnradio/",                          desc:"ESPN NY 98.7 live radio plus highlights and alerts" },
        { name:"YouTube TV",  icon:"📺", url:"https://tv.youtube.com",                                   desc:"YES Network, SNY, MSG — stream live NY sports TV" },
      ].map((s, i) => (
        <a key={i} href={s.url} target="_blank" rel="noopener noreferrer"
          style={{...styles.radioRow, ...(i%2===0?{}:{background:"#0f0f0f"})}}>
          <div style={styles.radioIcon}>{s.icon}</div>
          <div style={styles.radioInfo}>
            <span style={styles.radioName}>{s.name}</span>
            <span style={styles.radioDesc}>{s.desc}</span>
          </div>
          <span style={styles.radioArrow}>→</span>
        </a>
      ))}
    </div>
  );
}

function ShopTab() {
  return (
    <div style={styles.statsRoot}>
      <div style={styles.stdHeader}>
        <h2 style={styles.stdTitle}>🛒 NY SPORTS SHOP</h2>
        <p style={styles.stdSub}>BOOKS · GEAR · SUPPORT THE SITE</p>
      </div>
      <div style={{padding:"10px 14px", background:"#161616", borderLeft:"3px solid #c8201c", marginBottom:20}}>
        <p style={{margin:0, fontSize:12, color:"#aaa"}}>Curated NY sports books, gear and gifts. All Amazon links support nysportsdaily.com at no extra cost to you. 🙏</p>
        <p style={{margin:"6px 0 0", fontSize:10, color:"#555"}}>As an Amazon Associate, NY Sports Daily earns from qualifying purchases.</p>
      </div>

      {/* Support */}
      <div style={styles.stdDivisionHeader}>☕ SUPPORT NY SPORTS DAILY</div>
      <div style={{display:"flex", gap:12, flexWrap:"wrap", marginBottom:20, paddingBottom:16, borderBottom:"1px solid #1a1a1a"}}>
        <a href="https://buymeacoffee.com/mhughes65v" target="_blank" rel="noopener noreferrer"
          style={{...styles.shopRow, flex:1, minWidth:200, background:"#1a1a1a", border:"1px solid #2a2a2a", textDecoration:"none"}}>
          <span style={styles.shopEmoji}>☕</span>
          <div style={styles.shopInfo}>
            <span style={styles.shopTitle}>Buy Me a Coffee</span>
            <span style={styles.shopDesc}>Keep nysportsdaily.com free — a coffee goes a long way!</span>
          </div>
          <span style={styles.shopBtn}>Support →</span>
        </a>
        <a href="https://www.amazon.com?tag=nysportsdaily-20" target="_blank" rel="noopener noreferrer"
          style={{...styles.shopRow, flex:1, minWidth:200, background:"#1a1a1a", border:"1px solid #2a2a2a", textDecoration:"none"}}>
          <span style={styles.shopEmoji}>🛒</span>
          <div style={styles.shopInfo}>
            <span style={styles.shopTitle}>Shop Amazon</span>
            <span style={styles.shopDesc}>Start any Amazon shopping here — we earn a small commission on anything you buy at no extra cost to you!</span>
          </div>
          <span style={styles.shopBtn}>Shop →</span>
        </a>
      </div>

      {/* Books — reuse from StatsTab data */}
      <div style={styles.stdDivisionHeader}>📚 NY SPORTS BOOKS</div>
      {[
        { title:"The Yankee Years", author:"Joe Torre & Tom Verducci", tag:"yankee+years+torre+verducci", desc:"Inside the dynasty — 4 World Series from the manager's chair" },
        { title:"Summer of '49", author:"David Halberstam", tag:"summer+of+49+halberstam+yankees", desc:"Yankees vs Red Sox — the greatest rivalry ever told" },
        { title:"The Bad Guys Won", author:"Jeff Pearlman", tag:"bad+guys+won+1986+mets+pearlman", desc:"The wild story of the drug-fueled 1986 Mets champions" },
        { title:"The Last Boy: Mickey Mantle", author:"Jane Leavy", tag:"last+boy+mickey+mantle+biography", desc:"The definitive Mantle biography — heroism, pain, greatness" },
        { title:"Luckiest Man: Lou Gehrig", author:"Jonathan Eig", tag:"luckiest+man+lou+gehrig+biography", desc:"The Iron Horse's extraordinary life and tragic death" },
        { title:"The Big Bam: Babe Ruth", author:"Leigh Montville", tag:"big+bam+babe+ruth+biography+montville", desc:"The definitive Ruth biography — from orphanage to legend" },
        { title:"Namath: A Biography", author:"Mark Kriegel", tag:"namath+biography+kriegel+jets", desc:"Broadway Joe and the greatest upset in Super Bowl history" },
        { title:"When the Garden Was Eden", author:"Harvey Araton", tag:"when+garden+was+eden+knicks+araton", desc:"The legendary Knicks of the early 70s — Reed, Frazier, Bradley" },
        { title:"Blood on the Ice", author:"Gare Joyce", tag:"rangers+messier+1994+stanley+cup+blood+ice", desc:"The Rangers 1994 championship run — 54 years of drought ended" },
        { title:"Four on the Floor: Islanders Dynasty", author:"Various", tag:"new+york+islanders+dynasty+four+cups", desc:"The story of 4 consecutive Stanley Cups" },
        { title:"Pinstripe Empire", author:"Marty Appel", tag:"pinstripe+empire+yankees+history+appel", desc:"The complete history of the New York Yankees from 1903 on" },
        { title:"The Miracle Mets", author:"Stanley Cohen", tag:"miracle+mets+1969+cohen", desc:"The complete story of the 1969 Amazin' Mets championship" },
        { title:"Doc: A Memoir", author:"Dwight Gooden", tag:"doc+memoir+dwight+gooden", desc:"Gooden's raw honest account of rise and fall" },
        { title:"LT: Over the Edge", author:"Lawrence Taylor", tag:"lawrence+taylor+LT+autobiography", desc:"LT's brutal honest autobiography — greatness and survival" },
        { title:"Yogi: A Life Behind the Mask", author:"Jon Pessah", tag:"yogi+berra+biography+pessah", desc:"The definitive biography of baseball's greatest character" },
        { title:"The Bronx is Burning", author:"Jonathan Mahler", tag:"bronx+is+burning+1977+yankees+book", desc:"1977 NYC, Billy Martin, Reggie and the summer that defined an era" },
        { title:"Joe DiMaggio: The Hero's Life", author:"Richard Ben Cramer", tag:"joe+dimaggio+hero+life+cramer", desc:"The real DiMaggio behind the myth" },
        { title:"Mariano Rivera: The Closer", author:"Mariano Rivera", tag:"mariano+rivera+closer+autobiography", desc:"Mo's own story — the greatest closer in baseball history" },
        { title:"Steinbrenner", author:"Bill Madden", tag:"steinbrenner+biography+bill+madden", desc:"The complete biography of The Boss" },
        { title:"The Boys of Summer", author:"Roger Kahn", tag:"boys+of+summer+roger+kahn+dodgers", desc:"The greatest sports book ever written — Brooklyn Dodgers" },
        { title:"Mike Bossy: The Boss", author:"Mike Bossy", tag:"mike+bossy+islanders+autobiography", desc:"The greatest pure goal scorer tells his own story" },
        { title:"When You Play the Game of Life", author:"Derek Jeter", tag:"derek+jeter+life+you+imagine", desc:"The Captain's own story from childhood to the major leagues" },
        { title:"Denis Potvin: Power On Ice", author:"Denis Potvin", tag:"denis+potvin+islanders+autobiography", desc:"The Islanders captain — broke Orr's record, won 4 Cups" },
        { title:"Parcells: A Football Life", author:"Bill Parcells", tag:"bill+parcells+football+life+biography", desc:"The Big Tuna's coaching career from Giants to beyond" },
        { title:"The House That Ruth Built", author:"Robert Weintraub", tag:"house+ruth+built+yankee+stadium+history", desc:"The story of the original Yankee Stadium" },
        { title:"Ball Four", author:"Jim Bouton", tag:"ball+four+jim+bouton+yankees", desc:"The Yankees pitcher's diary that blew the lid off baseball" },
        { title:"42: The Jackie Robinson Story", author:"Various", tag:"jackie+robinson+42+biography", desc:"Baseball's greatest moment — Brooklyn, courage, breaking barriers" },
        { title:"I Can't Wait Until Tomorrow", author:"Joe Namath", tag:"namath+cant+wait+tomorrow+autobiography", desc:"Namath's own tell-all — one of sports' greatest memoirs" },
      ].map((b, i) => (
        <a key={i} href={`https://www.amazon.com/s?k=${encodeURIComponent(b.tag)}&tag=nysportsdaily-20`}
          target="_blank" rel="noopener noreferrer"
          style={{...styles.shopRow, ...(i%2===0?{}:{background:"#0f0f0f"})}}>
          <span style={styles.shopEmoji}>📖</span>
          <div style={styles.shopInfo}>
            <span style={styles.shopTitle}>{b.title}</span>
            <span style={styles.shopAuthor}>{b.author}</span>
            <span style={styles.shopDesc}>{b.desc}</span>
          </div>
          <span style={styles.shopBtn}>Shop →</span>
        </a>
      ))}

      {/* Gear */}
      <div style={{...styles.stdDivisionHeader, marginTop:24}}>👕 NY SPORTS GEAR</div>
      {[
        { title:"New York Yankees Gear", tag:"new+york+yankees+jersey+gear+official", desc:"Official Yankees jerseys, hats, merchandise" },
        { title:"New York Mets Gear", tag:"new+york+mets+jersey+gear+official", desc:"Official Mets jerseys, hats, merchandise" },
        { title:"New York Knicks Gear", tag:"new+york+knicks+jersey+gear+nba", desc:"Official Knicks jerseys and merchandise" },
        { title:"NY Rangers Gear", tag:"new+york+rangers+jersey+gear+nhl", desc:"Official Rangers jerseys and hockey gear" },
        { title:"NY Giants Gear", tag:"new+york+giants+jersey+gear+nfl", desc:"Official Giants jerseys and NFL merchandise" },
        { title:"NY Jets Gear", tag:"new+york+jets+jersey+gear+nfl", desc:"Official Jets jerseys and NFL merchandise" },
        { title:"NY Islanders Gear", tag:"new+york+islanders+jersey+gear+nhl", desc:"Official Islanders jerseys and hockey gear" },
        { title:"NJ Devils Gear", tag:"new+jersey+devils+jersey+gear+nhl", desc:"Official Devils jerseys and hockey gear" },
        { title:"NY Liberty Gear",    tag:"new+york+liberty+wnba+jersey+gear",    desc:"Official Liberty jerseys and WNBA gear — defending champions!" },
        { title:"Brooklyn Nets Gear", tag:"brooklyn+nets+jersey+gear+nba",         desc:"Official Nets jerseys and NBA merchandise" },
        { title:"NYCFC Gear",         tag:"nycfc+soccer+jersey+gear+official",     desc:"Official NYCFC jerseys, scarves and MLS merchandise" },
        { title:"NJ Red Bulls Gear",  tag:"new+york+red+bulls+soccer+jersey",      desc:"Official Red Bulls jerseys and MLS gear" },
        { title:"Gotham FC Gear",     tag:"gotham+fc+nwsl+jersey+gear",            desc:"Official Gotham FC jerseys — 2x NWSL champions" },
      ].map((g, i) => (
        <a key={i} href={`https://www.amazon.com/s?k=${encodeURIComponent(g.tag)}&tag=nysportsdaily-20`}
          target="_blank" rel="noopener noreferrer"
          style={{...styles.shopRow, ...(i%2===0?{}:{background:"#0f0f0f"})}}>
          <span style={styles.shopEmoji}>👕</span>
          <div style={styles.shopInfo}>
            <span style={styles.shopTitle}>{g.title}</span>
            <span style={styles.shopDesc}>{g.desc}</span>
          </div>
          <span style={styles.shopBtn}>Shop →</span>
        </a>
      ))}

      {/* Vintage Jerseys */}
      <div style={{...styles.stdDivisionHeader, marginTop:20}}>🏆 VINTAGE & THROWBACK JERSEYS</div>
      {[
        { title:"Vintage Yankees Jerseys", tag:"new+york+yankees+vintage+throwback+jersey", desc:"Classic pinstripes — Mantle, Jeter, Ruth throwbacks" },
        { title:"Vintage Mets Jerseys", tag:"new+york+mets+vintage+throwback+jersey", desc:"1969 Miracle Mets, 1986 championship throwbacks" },
        { title:"Vintage Knicks Jerseys", tag:"new+york+knicks+vintage+throwback+jersey", desc:"Reed, Frazier, Ewing 70s classic Knicks jerseys" },
        { title:"Islanders Dynasty Jerseys", tag:"new+york+islanders+vintage+throwback+jersey+dynasty", desc:"1980s dynasty throwbacks — Bossy, Trottier, Potvin" },
        { title:"Vintage Rangers Jerseys", tag:"new+york+rangers+vintage+throwback+jersey", desc:"Classic Broadway Blue — Messier, Leetch, Gilbert" },
        { title:"Vintage Jets Jerseys", tag:"new+york+jets+vintage+throwback+jersey+namath", desc:"Broadway Joe era and Gang Green throwbacks" },
        { title:"Vintage Giants Jerseys", tag:"new+york+giants+vintage+throwback+jersey+LT", desc:"LT era and classic Big Blue throwbacks" },
      ].map((v, i) => (
        <a key={i} href={`https://www.amazon.com/s?k=${encodeURIComponent(v.tag)}&tag=nysportsdaily-20`}
          target="_blank" rel="noopener noreferrer"
          style={{...styles.shopRow, ...(i%2===0?{}:{background:"#0f0f0f"})}}>
          <span style={styles.shopEmoji}>🏆</span>
          <div style={styles.shopInfo}>
            <span style={styles.shopTitle}>{v.title}</span>
            <span style={styles.shopDesc}>{v.desc}</span>
          </div>
          <span style={styles.shopBtn}>Shop →</span>
        </a>
      ))}

      {/* Memorabilia */}
      <div style={{...styles.stdDivisionHeader, marginTop:20}}>✍️ AUTOGRAPHS & MEMORABILIA</div>
      {[
        { title:"Signed Derek Jeter Items", tag:"derek+jeter+autograph+signed+baseball", desc:"Authenticated Jeter autographs — baseballs, photos, bats" },
        { title:"Joe Namath Autographed Items", tag:"joe+namath+autograph+signed+football", desc:"Broadway Joe signed helmets, footballs, photos" },
        { title:"Yankees Memorabilia", tag:"new+york+yankees+memorabilia+autograph+signed", desc:"Signed Yankees items — frames, display pieces" },
        { title:"Mets Memorabilia", tag:"new+york+mets+memorabilia+autograph+signed", desc:"Authentic Mets signed memorabilia" },
        { title:"NY Sports Framed Art", tag:"new+york+sports+framed+photo+art+print", desc:"Stadium photos, championship prints, framed art" },
      ].map((m, i) => (
        <a key={i} href={`https://www.amazon.com/s?k=${encodeURIComponent(m.tag)}&tag=nysportsdaily-20`}
          target="_blank" rel="noopener noreferrer"
          style={{...styles.shopRow, ...(i%2===0?{}:{background:"#0f0f0f"})}}>
          <span style={styles.shopEmoji}>✍️</span>
          <div style={styles.shopInfo}>
            <span style={styles.shopTitle}>{m.title}</span>
            <span style={styles.shopDesc}>{m.desc}</span>
          </div>
          <span style={styles.shopBtn}>Shop →</span>
        </a>
      ))}

      {/* Home Decor */}
      <div style={{...styles.stdDivisionHeader, marginTop:20}}>🏠 HOME DECOR & BAR SIGNS</div>
      {[
        { title:"Yankees Man Cave Signs", tag:"new+york+yankees+man+cave+bar+sign+decor", desc:"Yankee Stadium bar signs, neon, sports room decor" },
        { title:"Mets Home Decor", tag:"new+york+mets+home+decor+sign+bar", desc:"Queens sports room essentials — pillows, flags, signs" },
        { title:"Knicks Bar Signs", tag:"new+york+knicks+bar+sign+decor+man+cave", desc:"MSG-style Knicks bar and game room decor" },
        { title:"Rangers Hockey Decor", tag:"new+york+rangers+hockey+bar+sign+decor", desc:"Rangers puck holders, banners, bar signs" },
        { title:"NY Sports Barware", tag:"new+york+sports+pint+glass+mug+barware", desc:"Pint glasses, mugs, bottle openers for game day" },
        { title:"Stadium Blueprint Art", tag:"yankee+stadium+shea+stadium+blueprint+art+print", desc:"Architect blueprints of Yankee Stadium, MSG, Shea — incredible wall art" },
      ].map((d, i) => (
        <a key={i} href={`https://www.amazon.com/s?k=${encodeURIComponent(d.tag)}&tag=nysportsdaily-20`}
          target="_blank" rel="noopener noreferrer"
          style={{...styles.shopRow, ...(i%2===0?{}:{background:"#0f0f0f"})}}>
          <span style={styles.shopEmoji}>🏠</span>
          <div style={styles.shopInfo}>
            <span style={styles.shopTitle}>{d.title}</span>
            <span style={styles.shopDesc}>{d.desc}</span>
          </div>
          <span style={styles.shopBtn}>Shop →</span>
        </a>
      ))}

      {/* Kids Books */}
      <div style={{...styles.stdDivisionHeader, marginTop:20}}>👦 KIDS SPORTS BOOKS — FOR THE NEXT GENERATION</div>
      {[
        { title:"Derek Jeter's Little League Series", tag:"derek+jeter+little+league+book+kids", desc:"Jeter's children's book series — perfect for young fans" },
        { title:"R is for Rangers", tag:"new+york+rangers+hockey+kids+book", desc:"Alphabet books and kids guides for young Rangers fans" },
        { title:"Yankees Kids Books", tag:"new+york+yankees+kids+childrens+book+baseball", desc:"Children's books about the Yankees — Mantle, Ruth, Jeter" },
        { title:"Amazing Athletes Baseball", tag:"baseball+amazing+athletes+kids+book", desc:"Kids sports biographies — perfect for grandkids" },
        { title:"Mets Kids Books", tag:"new+york+mets+kids+childrens+book", desc:"Books for young Mets fans — learn the history" },
        { title:"NFL for Kids", tag:"football+nfl+kids+childrens+book+giants+jets", desc:"Giants and Jets books for the little ones" },
      ].map((k, i) => (
        <a key={i} href={`https://www.amazon.com/s?k=${encodeURIComponent(k.tag)}&tag=nysportsdaily-20`}
          target="_blank" rel="noopener noreferrer"
          style={{...styles.shopRow, ...(i%2===0?{}:{background:"#0f0f0f"})}}>
          <span style={styles.shopEmoji}>👦</span>
          <div style={styles.shopInfo}>
            <span style={styles.shopTitle}>{k.title}</span>
            <span style={styles.shopDesc}>{k.desc}</span>
          </div>
          <span style={styles.shopBtn}>Shop →</span>
        </a>
      ))}

      {/* Stadium Experiences */}
      <div style={{...styles.stdDivisionHeader, marginTop:20}}>🏟️ STADIUM TOURS & LIVE EXPERIENCES</div>
      {[
        { name:"Yankee Stadium Tours",   url:"https://www.mlb.com/yankees/ballpark/tours",                         desc:"Behind-the-scenes tours of The Bronx — Monument Park, dugout, press box" },
        { name:"Citi Field Tours",       url:"https://www.mlb.com/mets/ballpark/tours",                           desc:"Mets stadium tours — field access, clubhouse, history exhibit" },
        { name:"Madison Square Garden", url:"https://www.thegarden.com/venue/guided-tours.html",                  desc:"The World's Most Famous Arena — Knicks and Rangers tours" },
        { name:"MetLife Stadium Tours",  url:"https://www.metlifestadium.com/the-stadium/tours",                  desc:"Giants/Jets stadium — Super Bowl XLVIII venue tours" },
        { name:"UBS Arena Tours",        url:"https://www.ubsarena.com",                                           desc:"Brand new Islanders arena at Belmont Park — stunning facility" },
        { name:"StubHub — NY Sports",    url:"https://www.stubhub.com/new-york-teams-tickets",                    desc:"Get tickets to any NY game — Yankees, Mets, Knicks, Rangers and more" },
        { name:"SeatGeek — NY Sports",   url:"https://seatgeek.com/new-york-sports-tickets",                     desc:"Best seats finder — compare prices across all NY venues" },
      ].map((s, i) => (
        <a key={i} href={s.url} target="_blank" rel="noopener noreferrer"
          style={{...styles.shopRow, ...(i%2===0?{}:{background:"#0f0f0f"})}}>
          <span style={styles.shopEmoji}>🏟️</span>
          <div style={styles.shopInfo}>
            <span style={styles.shopTitle}>{s.name}</span>
            <span style={styles.shopDesc}>{s.desc}</span>
          </div>
          <span style={styles.shopBtn}>Visit →</span>
        </a>
      ))}

      {/* Best Sports Bars */}
      <div style={{...styles.stdDivisionHeader, marginTop:20}}>🍺 BEST NY SPORTS BARS BY TEAM</div>
      {[
        { name:"Nevada Smiths (Soccer)",   area:"Manhattan · E Village", desc:"NYC's best soccer bar — all NY soccer teams and international" },
        { name:"Foley's NY Pub",           area:"Manhattan · Midtown",   desc:"Baseball shrine — Yankees and Mets memorabilia covering every inch" },
        { name:"Brother Jimmy's",          area:"Manhattan · Multiple",  desc:"Known for Jets and Giants crowds — all NFL, great game day atmosphere" },
        { name:"Professor Thom's",         area:"Manhattan · E Village", desc:"Red Sox bar that gets louder when the Yankees win" },
        { name:"Standings Bar",            area:"Manhattan · Lower East", desc:"Sports bar known for hockey — Rangers watch parties" },
        { name:"McSorley's Old Ale House", area:"Manhattan · E Village", desc:"Historic NY bar — beloved by all NY sports fans for decades" },
        { name:"Legends NYC",              area:"Manhattan · Hell's Kitchen", desc:"Yankees-themed bar right in Times Square area" },
        { name:"The Irish Exit",           area:"Brooklyn",              desc:"Nets and Brooklyn-centric sports bar" },
      ].map((b, i) => (
        <a key={i} href={`https://www.google.com/search?q=${encodeURIComponent(b.name + " " + b.area + " sports bar")}`}
          target="_blank" rel="noopener noreferrer"
          style={{...styles.shopRow, ...(i%2===0?{}:{background:"#0f0f0f"})}}>
          <span style={styles.shopEmoji}>🍺</span>
          <div style={styles.shopInfo}>
            <span style={styles.shopTitle}>{b.name}</span>
            <span style={styles.shopAuthor}>{b.area}</span>
            <span style={styles.shopDesc}>{b.desc}</span>
          </div>
          <span style={styles.shopBtn}>Find →</span>
        </a>
      ))}

      <div style={{marginTop:20, padding:"12px 14px", background:"#0f0f0f", fontSize:10, color:"#555"}}>
        As an Amazon Associate, NY Sports Daily earns from qualifying purchases at no extra cost to you. Bar recommendations are independent — no paid placement.
      </div>
    </div>
  );
}

function StandingsTab({ standings, loading }) {
  const [sport, setSport]       = useState("MLB");
  const [view, setView]         = useState("DIVISION");
  const [confData, setConfData] = useState({});
  const [fetching, setFetching] = useState(false);

  const NY_IDS = { 
    MLB:["10","21"], NFL:["19","20"], NBA:["18","17"],
    NHL:["13","12","11"], WNBA:["20"]
  };

  // How many playoff spots per LEAGUE (total, both conferences combined)
  // MLB: 12 total (3 div + 3 WC per league)
  // NBA: 16 total (8 per conf)
  // NHL: 16 total (8 per conf)  
  // NFL: 14 total (7 per conf)
  // WNBA: 8 total (single conf)
  const CFG = {
    MLB:  { sport:"baseball",   league:"mlb",  emoji:"⚾", divWinners:3, wcSpots:3, label:"MLB",  espnUrl:"mlb" },
    NBA:  { sport:"basketball", league:"nba",  emoji:"🏀", divWinners:3, wcSpots:5, label:"NBA",  espnUrl:"nba" },
    NHL:  { sport:"hockey",     league:"nhl",  emoji:"🏒", divWinners:3, wcSpots:5, label:"NHL",  espnUrl:"nhl" },
    NFL:  { sport:"football",   league:"nfl",  emoji:"🏈", divWinners:4, wcSpots:3, label:"NFL",  espnUrl:"nfl" },
    WNBA: { sport:"basketball", league:"wnba", emoji:"🏀", divWinners:0, wcSpots:8, label:"WNBA", espnUrl:"wnba" },
  };
  const cfg = CFG[sport];

  function sortFn(a, b) {
    if (sport === "NHL") return b.pts - a.pts || b.w - a.w;
    const pa = parseFloat(a.pct) || (a.w+a.l > 0 ? a.w/(a.w+a.l) : 0);
    const pb = parseFloat(b.pct) || (b.w+b.l > 0 ? b.w/(b.w+b.l) : 0);
    return pb - pa || b.w - a.w;
  }

  useEffect(() => {
    async function load() {
      setFetching(true);
      setConfData({});
      try {
        const r = await fetch(`https://site.api.espn.com/apis/v2/sports/${cfg.sport}/${cfg.league}/standings?level=3`);
        if (!r.ok) throw new Error("ESPN standings failed");
        const json = await r.json();

        const result = {}; // confName -> { name, divs: { divName -> [teams] }, allTeams: [] }

        // Map division names to their parent conference
        const CONF_MAP = {
          "AL East":"American League","AL Central":"American League","AL West":"American League",
          "NL East":"National League","NL Central":"National League","NL West":"National League",
          "Atlantic":"Eastern Conference","Central":"Eastern Conference","Southeast":"Eastern Conference",
          "Northwest":"Western Conference","Pacific":"Western Conference","Southwest":"Western Conference",
          "Metropolitan":"Eastern Conference",
          "AFC East":"AFC","AFC North":"AFC","AFC South":"AFC","AFC West":"AFC",
          "NFC East":"NFC","NFC North":"NFC","NFC South":"NFC","NFC West":"NFC",
        };

        function teamFromEntry(e, confName, divName) {
          const t = e.team;
          const s = {};
          (e.stats||[]).forEach(st => { s[st.name] = st.displayValue ?? st.value ?? "—"; });
          // DEBUG: log all stat fields for NY teams so we can see ESPN's exact field names
          const dbgName = (e.team?.displayName || "").toLowerCase();
          if (dbgName.includes("mets") || dbgName.includes("yankees")) {
            console.log(`[NY Standings DEBUG] ${e.team?.displayName}:`, JSON.stringify(s, null, 2));
          }
          return {
            id:     String(t.id),
            name:   t.shortDisplayName || t.name,
            abbr:   t.abbreviation,
            logo:   t.logos?.[0]?.href || null,
            color:  t.color ? `#${t.color}` : "#888",
            conf:   confName,
            div:    divName,
            w:      parseFloat(s.wins   || s.w  || 0),
            l:      parseFloat(s.losses || s.l  || 0),
            pct:    s.winPercent || "—",
            gb:     s.gamesBehind ?? s.gb ?? "—",
            // ESPN uses several different field names for WC GB — capture all variants
            wcGb:   s.wildCardGamesBehind ?? s.Wild_Card_Games_Behind ?? s.playoffGamesBehind ?? s.wcGamesBehind ?? null,
            pts:    parseFloat(s.points || 0),
            strk:   s.streak || "—",
            l10:    s.last10  || "—",
            isNY:   (NY_IDS[sport]||[]).includes(String(t.id)),
            divRank:0, divLeader:false, inPlayoffs:false, pos:"", wcLabel:"",
          };
        }

        // Recursive walker — handles any nesting depth
        // level=3 makes ESPN return divisions as the top-level children
        function walkNode(node, parentConf) {
          const name = node.name || node.abbreviation || "";
          const confName = CONF_MAP[name] || parentConf || name;

          if (node.standings?.entries?.length) {
            // This node IS a division (has teams directly)
            const divName = name || confName;
            if (!result[confName]) result[confName] = { name:confName, divs:{}, allTeams:[] };
            if (!result[confName].divs[divName]) result[confName].divs[divName] = [];
            node.standings.entries.forEach(e => {
              const team = teamFromEntry(e, confName, divName);
              if (!result[confName].divs[divName].find(x => x.id === team.id)) {
                result[confName].divs[divName].push(team);
              }
            });
          }
          // Always recurse
          (node.children||[]).forEach(child => walkNode(child, confName));
        }

        (json.children||[]).forEach(node => walkNode(node, ""));


        // Now assign positions per conference
        Object.values(result).forEach(conf => {
          const divNames = Object.keys(conf.divs);

          // Step 1: Sort each division, identify div leaders
          const divLeaderIds = new Set();
          divNames.forEach(dn => {
            const sorted = [...conf.divs[dn]].sort(sortFn);
            sorted.forEach((t, i) => {
              t.divRank = i + 1;
              t.divSize = sorted.length;
              if (i === 0) { t.divLeader = true; divLeaderIds.add(t.id); }
            });
            conf.divs[dn] = sorted; // replace with sorted version
          });

          // Step 2: Build allTeams (dedupe since ESPN may list teams in multiple divs)
          const seen = new Set();
          const all = divNames.flatMap(dn => conf.divs[dn])
            .filter(t => { if(seen.has(t.id)) return false; seen.add(t.id); return true; });
          const allSorted = [...all].sort(sortFn);
          conf.allTeams = allSorted;

          // Step 3: Assign playoff positions
          // Division leaders: sorted by record among themselves
          const divLeaders = allSorted.filter(t => divLeaderIds.has(t.id));
          // Wild card: best non-div-leaders
          const nonLeaders = allSorted.filter(t => !divLeaderIds.has(t.id));

          // Seeding: div leaders get seeds 1-N by record, then WC teams
          const { divWinners, wcSpots } = cfg;
          const totalPlayoffSpots = divWinners + wcSpots;

          divLeaders.forEach((t, i) => {
            t.inPlayoffs = true;
            t.pos = `DIV ${i+1}`;
            t.wcLabel = `DIV ${i+1}`;
            t.seed = i + 1;
          });

          // The last wild card team is the cutoff — compute GB from that team's record
          const lastWcTeam = nonLeaders[wcSpots - 1];
          const lastWcPct  = lastWcTeam
            ? (lastWcTeam.w + lastWcTeam.l > 0 ? lastWcTeam.w / (lastWcTeam.w + lastWcTeam.l) : 0)
            : 0;

          nonLeaders.forEach((t, i) => {
            if (i < wcSpots) {
              t.inPlayoffs = true;
              t.pos = `WC${i+1}`;
              t.wcLabel = `WC${i+1}`;
              t.seed = divWinners + i + 1;
            } else {
              t.inPlayoffs = false;
              let gbDisplay;
              if (lastWcTeam && (t.w + t.l) > 0) {
                // Standard GB formula vs last WC team
                const gb = ((lastWcTeam.w - t.w) + (t.l - lastWcTeam.l)) / 2;
                const gbRounded = Math.round(gb * 2) / 2; // round to nearest .5
                gbDisplay = gbRounded > 0
                  ? `${Number.isInteger(gbRounded) ? gbRounded : gbRounded.toFixed(1)} out`
                  : "—";
                // Debug log for NY teams
                if (t.name && (t.name.includes("Mets") || t.name.includes("Yankees") || t.name.includes("Jets") || t.name.includes("Giants"))) {
                  console.log(`[WC GB DEBUG] ${t.name}: ${t.w}W-${t.l}L | cutoff: ${lastWcTeam.name} ${lastWcTeam.w}W-${lastWcTeam.l}L | GB=${gbRounded} | pos=${i} wcSpots=${wcSpots}`);
                }
              } else {
                gbDisplay = `${i - wcSpots + 1} out`;
              }
              t.pos = gbDisplay;
              t.wcLabel = gbDisplay;
            }
          });
        });

        setConfData(result);
      } catch(err) {
        console.error("Standings:", err);
      }
      setFetching(false);
    }
    load();
  }, [sport]);

  // All NY teams across all confs
  const nyTeams = Object.values(confData)
    .flatMap(c => c.allTeams || [])
    .filter(t => t.isNY)
    .filter((t,i,a) => a.findIndex(x=>x.id===t.id)===i);

  const views = sport === "WNBA" ? ["WILDCARD","FULL"] : ["DIVISION","WILDCARD","FULL"];

  function PosChip({ team }) {
    const isDivL = team.divLeader;
    const isWC   = team.inPlayoffs && !isDivL;
    const out    = !team.inPlayoffs;
    const bg  = isDivL ? "#1d4ed822" : isWC ? "#16a34a22" : "#9f121222";
    const clr = isDivL ? "#60a5fa"   : isWC ? "#4ade80"   : "#f87171";
    return (
      <span style={{fontSize:9, padding:"2px 7px", borderRadius:2, fontWeight:900,
        letterSpacing:"0.05em", background:bg, color:clr, whiteSpace:"nowrap", flexShrink:0}}>
        {team.wcLabel}
      </span>
    );
  }

  function GBCell({ val }) {
    if (!val || val === "—" || val === "-" || parseFloat(val) === 0) {
      return <span style={{fontSize:11, color:"#555", minWidth:44, textAlign:"right"}}>—</span>;
    }
    return <span style={{fontSize:11, color:"#888", minWidth:44, textAlign:"right", whiteSpace:"nowrap"}}>{val}</span>;
  }

  function TeamRow({ team, rank }) {
    const pct = parseFloat(team.pct) || (team.w+team.l>0 ? team.w/(team.w+team.l) : 0);
    const bar = Math.min(100, Math.round(pct*100));
    const rec = sport==="NHL" ? `${team.w}W·${team.pts}pts` : `${team.w}–${team.l}`;
    const bdColor = team.divLeader ? "#3b82f6" : team.inPlayoffs ? "#22c55e" : "transparent";
    return (
      <div style={{
        display:"flex", alignItems:"center", gap:8, padding:"9px 14px",
        background: team.isNY ? "#0b180b" : rank%2===0 ? "#111" : "#0e0e0e",
        borderLeft:`4px solid ${bdColor}`,
        borderBottom:"1px solid #1c1c1c",
      }}>
        <span style={{fontSize:10, color:"#555", minWidth:20, textAlign:"right", flexShrink:0}}>{rank}</span>
        {team.logo
          ? <img src={team.logo} alt="" style={{width:22,height:22,objectFit:"contain",flexShrink:0}}
              onError={e=>e.target.style.display="none"}/>
          : <span style={{width:22,flexShrink:0}}/>
        }
        <span style={{
          flex:1, fontSize:13, fontWeight:team.isNY?900:500,
          color:team.isNY?"#fff":"#ccc", fontFamily:"'Georgia',serif",
          overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", minWidth:0,
        }}>
          {team.name}
          {team.isNY && <span style={{fontSize:8,color:"#c8201c",marginLeft:5,fontWeight:900}}>NY</span>}
        </span>
        <div style={{width:40,height:4,background:"#222",borderRadius:2,overflow:"hidden",flexShrink:0}}>
          <div style={{height:"100%",width:`${bar}%`,
            background:team.divLeader?"#3b82f6":team.inPlayoffs?"#22c55e":"#444",borderRadius:2}}/>
        </div>
        <span style={{fontSize:12,fontWeight:700,color:"#e8e8e8",minWidth:60,textAlign:"right",
          fontFamily:"'Georgia',serif",whiteSpace:"nowrap",flexShrink:0}}>
          {rec}
        </span>
        <GBCell val={team.gb} />
        <PosChip team={team} />
      </div>
    );
  }

  function CutLine({ label, color }) {
    return (
      <div style={{display:"flex",alignItems:"center",gap:8,padding:"4px 14px",background:"#080808"}}>
        <div style={{flex:1,height:1,background:`${color}33`}}/>
        <span style={{fontSize:9,color,fontWeight:900,letterSpacing:"0.1em",whiteSpace:"nowrap"}}>{label}</span>
        <div style={{flex:1,height:1,background:`${color}33`}}/>
      </div>
    );
  }

  return (
    <div style={styles.stdRoot}>
      <div style={styles.stdHeader}>
        <h2 style={styles.stdTitle}>📊 STANDINGS & PLAYOFF TRACKER</h2>
        <p style={styles.stdSub}>LIVE · DIVISION LEADERS · WILD CARD RACE · PLAYOFF PICTURE</p>
      </div>

      {/* NY glance strip */}
      {nyTeams.length > 0 && !fetching && (
        <div style={{marginBottom:16}}>
          <div style={{fontSize:9,color:"#555",letterSpacing:"0.12em",fontWeight:900,marginBottom:8}}>
            🗽 NY TEAMS — QUICK LOOK
          </div>
          <div style={{display:"flex",flexWrap:"wrap",gap:8}}>
            {nyTeams.map(t => (
              <div key={t.id} style={{
                display:"flex",alignItems:"center",gap:8,padding:"8px 12px",
                background:"#141414",borderRadius:3,
                border:`1px solid ${t.divLeader?"#3b82f644":t.inPlayoffs?"#22c55e44":"#c8201c33"}`,
                borderLeft:`3px solid ${t.divLeader?"#3b82f6":t.inPlayoffs?"#22c55e":"#c8201c"}`,
              }}>
                {t.logo && <img src={t.logo} alt="" style={{width:28,height:28,objectFit:"contain"}}
                  onError={e=>e.target.style.display="none"}/>}
                <div>
                  <div style={{fontSize:13,fontWeight:900,color:"#fff",fontFamily:"'Georgia',serif"}}>
                    {t.name}
                  </div>
                  <div style={{fontSize:10,color:"#666"}}>
                    {sport==="NHL"?`${t.w}W · ${t.pts}pts`:`${t.w}–${t.l}`} · {t.div}
                  </div>
                </div>
                <div style={{textAlign:"right",marginLeft:4}}>
                  <div style={{fontSize:11,fontWeight:900,
                    color:t.divLeader?"#60a5fa":t.inPlayoffs?"#4ade80":"#f87171"}}>
                    {t.divLeader?"🏆":t.inPlayoffs?"✅":"❌"} {t.wcLabel}
                  </div>
                  <div style={{fontSize:9,color:"#555"}}>{t.conf}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Sport tabs */}
      <div style={{display:"flex",gap:4,flexWrap:"wrap",marginBottom:10}}>
        {Object.keys(CFG).map(s => (
          <button key={s} onClick={()=>{setSport(s);setView("DIVISION");}}
            style={{...styles.filterBtn,...(sport===s?styles.filterBtnActive:{}),fontSize:11,padding:"5px 14px"}}>
            {CFG[s].emoji} {s}
          </button>
        ))}
      </div>

      {/* View tabs */}
      <div style={{display:"flex",gap:6,marginBottom:12}}>
        {views.map(v => (
          <button key={v} onClick={()=>setView(v)}
            style={{...styles.filterBtn,...(view===v?styles.filterBtnActive:{}),fontSize:10,padding:"6px 16px",fontWeight:700}}>
            {v==="WILDCARD"?"🏆 PLAYOFF PICTURE":v==="DIVISION"?"📐 BY DIVISION":"📋 FULL STANDINGS"}
          </button>
        ))}
      </div>

      {/* Legend */}
      <div style={{display:"flex",gap:12,padding:"5px 14px",background:"#0a0a0a",
        marginBottom:8,borderRadius:2,flexWrap:"wrap"}}>
        {[
          {color:"#3b82f6",label:"Division leader"},
          {color:"#22c55e",label:"Wild card"},
          {color:"#c8201c",label:"Out of playoffs"},
        ].map((l,i) => (
          <div key={i} style={{display:"flex",alignItems:"center",gap:5}}>
            <div style={{width:10,height:10,background:l.color,borderRadius:1,flexShrink:0}}/>
            <span style={{fontSize:10,color:"#666"}}>{l.label}</span>
          </div>
        ))}
      </div>

      {/* Col headers */}
      <div style={{display:"flex",alignItems:"center",gap:8,padding:"5px 14px",
        borderBottom:"1px solid #2a2a2a",marginBottom:2}}>
        <span style={{fontSize:9,color:"#444",minWidth:20}}>#</span>
        <span style={{width:22,flexShrink:0}}/>
        <span style={{flex:1,fontSize:9,color:"#444",letterSpacing:"0.1em"}}>TEAM</span>
        <span style={{width:40,flexShrink:0}}/>
        <span style={{fontSize:9,color:"#444",minWidth:60,textAlign:"right"}}>
          {sport==="NHL"?"W–PTS":"W–L"}
        </span>
        <span style={{fontSize:9,color:"#444",minWidth:44,textAlign:"right"}}>GB</span>
        <span style={{fontSize:9,color:"#444",minWidth:44,textAlign:"center"}}>POS</span>
      </div>

      {fetching ? (
        <div style={styles.loading}>
          <div style={styles.loadingDots}>{[0,1,2].map(i=><span key={i} style={{...styles.dot,animationDelay:`${i*0.2}s`}}/>)}</div>
          <p style={styles.loadingText}>LOADING {sport} STANDINGS…</p>
        </div>
      ) : Object.keys(confData).length === 0 ? (
        // Fallback to prop-based standings if ESPN API returned nothing
        <div>
          <div style={{padding:"12px 14px", background:"#161616", borderLeft:"3px solid #f59e0b", marginBottom:12, fontSize:11, color:"#aaa"}}>
            ⚠️ Live standings unavailable — {sport} may be in offseason or ESPN API is temporarily down.
          </div>
          {standings.filter(s => s.league === sport).map((group, gi) => (
            <div key={gi} style={{marginBottom:16}}>
              <div style={styles.stdDivisionHeader}>{group.division}</div>
              <div style={styles.stdTable}>
                <div style={styles.stdRowHeader}>
                  <span style={styles.stdColTeam}>TEAM</span>
                  <span style={styles.stdColStat}>W</span>
                  <span style={styles.stdColStat}>L</span>
                  <span style={styles.stdColStat}>PCT</span>
                  <span style={styles.stdColStat}>GB</span>
                </div>
                {(group.rows||[]).map((row, i) => (
                  <div key={i} style={{...styles.stdRow,...(row.isNY?styles.stdRowNY:{}),...(i%2===0?{}:styles.stdRowAlt)}}>
                    <span style={styles.stdColTeam}>
                      {row.logo && <img src={row.logo} alt="" style={styles.stdLogo} onError={e=>e.target.style.display="none"}/>}
                      <span style={{...styles.stdTeamName,...(row.isNY?{color:"#e8e0d0",fontWeight:900}:{})}}>{row.team}</span>
                      {row.isNY && <span style={styles.stdNYBadge}>NY</span>}
                    </span>
                    <span style={styles.stdColStat}>{row.w}</span>
                    <span style={styles.stdColStat}>{row.l}</span>
                    <span style={styles.stdColStat}>{row.pct}</span>
                    <span style={styles.stdColStat}>{row.gb}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
          <a href={`https://www.espn.com/${cfg.espnUrl}/standings`} target="_blank"
            rel="noopener noreferrer" style={{...styles.histLink,display:"inline-block",marginTop:8}}>
            View full standings on ESPN →
          </a>
        </div>
      ) : view === "WILDCARD" ? (
        Object.values(confData).map((conf, ci) => {
          const divLeaders = [...(conf.allTeams||[]).filter(t=>t.divLeader)].sort(sortFn);
          const wcIn       = [...(conf.allTeams||[]).filter(t=>t.inPlayoffs&&!t.divLeader)].sort(sortFn);
          const wcOut      = [...(conf.allTeams||[]).filter(t=>!t.inPlayoffs)].sort(sortFn);
          const rows       = [...divLeaders, ...wcIn, ...wcOut];
          return (
            <div key={ci} style={{marginBottom:24}}>
              <div style={{...styles.stdDivisionHeader,display:"flex",justifyContent:"space-between"}}>
                <span>{cfg.emoji} {conf.name}</span>
                <span style={{fontSize:9,color:"#555"}}>
                  {divLeaders.length} div leaders + {cfg.wcSpots} wild cards = {divLeaders.length+cfg.wcSpots} playoff spots
                </span>
              </div>
              {rows.map((team, i) => (
                <div key={team.id}>
                  {i === divLeaders.length && divLeaders.length > 0 && (
                    <CutLine label="── WILD CARD RACE ──" color="#3b82f6" />
                  )}
                  {i === divLeaders.length + wcIn.length && wcIn.length > 0 && (
                    <CutLine label="── PLAYOFF CUTOFF ──" color="#c8201c" />
                  )}
                  <TeamRow team={team} rank={i+1} />
                </div>
              ))}
            </div>
          );
        })
      ) : view === "DIVISION" ? (
        Object.values(confData).map((conf, ci) => (
          <div key={ci} style={{marginBottom:24}}>
            <div style={{fontSize:10,color:"#c8201c",fontWeight:900,letterSpacing:"0.15em",
              padding:"6px 14px",background:"#0a0a0a",marginBottom:4}}>
              {cfg.emoji} {conf.name}
            </div>
            {Object.entries(conf.divs).map(([divName, teams], di) => (
              <div key={di} style={{marginBottom:12}}>
                <div style={styles.stdDivisionHeader}>{divName}</div>
                {teams.map((team, i) => <TeamRow key={team.id} team={team} rank={i+1}/>)}
              </div>
            ))}
          </div>
        ))
      ) : (
        Object.values(confData).map((conf, ci) => (
          <div key={ci} style={{marginBottom:24}}>
            <div style={styles.stdDivisionHeader}>{cfg.emoji} {conf.name} — Full Standings</div>
            {(conf.allTeams||[]).map((team, i) => <TeamRow key={team.id} team={team} rank={i+1}/>)}
          </div>
        ))
      )}

      <div style={{marginTop:12,fontSize:9,color:"#444",fontStyle:"italic",display:"flex",justifyContent:"space-between",flexWrap:"wrap"}}>
        <span>Live from ESPN · Updates each page load</span>
        <a href={`https://www.espn.com/${cfg.espnUrl}/standings`} target="_blank"
          rel="noopener noreferrer" style={styles.histLink}>ESPN standings →</a>
      </div>
    </div>
  );
}

// ─── SCHEDULE COMPONENT ───────────────────────────────────────────────────
function ScheduleTab({ schedule, loading }) {
  const [activeTeam, setActiveTeam] = useState("ALL");
  const teams = ["ALL","Yankees","Mets","Jets","Giants","Knicks","Nets","Rangers","Islanders","NJ Devils","Liberty","Gotham FC","NYCFC"];

  const filtered = schedule.filter(g => activeTeam === "ALL" || g.team === activeTeam);

  function formatDate(d) {
    return d.toLocaleDateString("en-US",{weekday:"short",month:"short",day:"numeric"}).toUpperCase();
  }
  function formatTime(d) {
    return d.toLocaleTimeString("en-US",{hour:"numeric",minute:"2-digit"});
  }

  // Group by date
  const grouped = {};
  filtered.forEach(g => {
    const key = g.date.toDateString();
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(g);
  });

  const SPORT_ICONS_SCH = { nfl:"🏈", mlb:"⚾", nba:"🏀", nhl:"🏒", wnba:"🏀", "usa.1":"⚽", nwsl:"⚽" };

  return (
    <div style={styles.schRoot}>
      <div style={styles.stdHeader}>
        <h2 style={styles.stdTitle}>UPCOMING NY GAMES</h2>
        <p style={styles.stdSub}>NEXT 5 GAMES PER TEAM</p>
      </div>

      {/* Team filter */}
      <div style={{...styles.filterGroup, marginBottom: 20, flexWrap:"wrap"}}>
        {teams.map(t => (
          <button key={t} onClick={() => setActiveTeam(t)}
            style={{...styles.filterBtn, ...(activeTeam===t ? styles.filterBtnActive : {})}}>
            {t}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={styles.loading}>
          <div style={styles.loadingDots}>{[0,1,2].map(i=><span key={i} style={{...styles.dot,animationDelay:`${i*0.2}s`}}/>)}</div>
          <p style={styles.loadingText}>LOADING SCHEDULE...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div style={styles.empty}>
          <span style={styles.emptyIcon}>📅</span>
          <p style={styles.emptyText}>NO UPCOMING GAMES FOUND</p>
        </div>
      ) : (
        <div style={styles.schList}>
          {Object.entries(grouped).map(([dateKey, games]) => (
            <div key={dateKey}>
              <div style={styles.schDateHeader}>{formatDate(games[0].date)}</div>
              {games.map((g, i) => (
                <div key={i} style={styles.schRow}>
                  <div style={styles.schTeamBadge}>
                    <span style={styles.schSport}>{SPORT_ICONS_SCH[g.sport?.toLowerCase()] || "🏆"}</span>
                    <span style={styles.schTeamLabel}>{g.team}</span>
                  </div>
                  <div style={styles.schMatchup}>
                    <div style={styles.schTeamLine}>
                      {g.awayLogo && <img src={g.awayLogo} alt="" style={styles.tvLogo} onError={e=>e.target.style.display="none"} />}
                      <span style={styles.schTeamName}>{g.awayTeam}</span>
                    </div>
                    <span style={styles.schAt}>at</span>
                    <div style={styles.schTeamLine}>
                      {g.homeLogo && <img src={g.homeLogo} alt="" style={styles.tvLogo} onError={e=>e.target.style.display="none"} />}
                      <span style={styles.schTeamName}>{g.homeTeam}</span>
                    </div>
                  </div>
                  <div style={styles.schRight}>
                    <span style={styles.schTime}>{formatTime(g.date)}</span>
                    {g.broadcasts.length > 0 && (
                      <span style={{...styles.tvChannelBadge, ...getChannelStyle(g.broadcasts[0]), fontSize:9, padding:"2px 7px"}}>
                        {getChannelStyle(g.broadcasts[0]).label || g.broadcasts[0]}
                      </span>
                    )}
                    {g.venue && <span style={styles.schVenue}>{g.venue}</span>}
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── SEARCH LINK HELPERS ───────────────────────────────────────────────────
function googleUrl(query) {
  return `https://www.google.com/search?q=${encodeURIComponent(query)}`;
}
function wikiUrl(query) {
  return `https://en.wikipedia.org/w/index.php?search=${encodeURIComponent(query)}`;
}
function SearchLinks({ query, style }) {
  return (
    <div style={{...styles.searchLinks, ...style}}>
      <a href={googleUrl(query)} target="_blank" rel="noopener noreferrer" style={styles.searchLinkGoogle}>
        <span style={styles.searchLinkIcon}>🔍</span> Google
      </a>
      <a href={wikiUrl(query)} target="_blank" rel="noopener noreferrer" style={styles.searchLinkWiki}>
        <span style={styles.searchLinkIcon}>📖</span> Wikipedia
      </a>
    </div>
  );
}

// ─── SPIN THE WHEEL ────────────────────────────────────────────────────────
const WHEEL_SEGMENTS = [
  { label: "YANKEES",   color: "#003087", emoji: "⚾" },
  { label: "METS",      color: "#002D72", emoji: "⚾" },
  { label: "JETS",      color: "#125740", emoji: "🏈" },
  { label: "GIANTS",    color: "#0B2265", emoji: "🏈" },
  { label: "KNICKS",    color: "#006BB6", emoji: "🏀" },
  { label: "RANGERS",   color: "#0038A8", emoji: "🏒" },
  { label: "ISLANDERS", color: "#003B8E", emoji: "🏒" },
  { label: "NETS",      color: "#444",    emoji: "🏀" },
  { label: "LIBERTY",   color: "#007A5E", emoji: "🏀" },
  { label: "DEVILS",    color: "#CE1126", emoji: "🏒" },
  { label: "RED BULLS", color: "#ED1C2E", emoji: "⚽" },
  { label: "GOTHAM FC", color: "#0A0A2E", emoji: "⚽" },
];

function polarToCartesian(cx, cy, r, angleDeg) {
  const rad = (angleDeg - 90) * Math.PI / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function slicePath(cx, cy, r, startDeg, endDeg) {
  const s = polarToCartesian(cx, cy, r, startDeg);
  const e = polarToCartesian(cx, cy, r, endDeg);
  const large = endDeg - startDeg > 180 ? 1 : 0;
  return `M ${cx} ${cy} L ${s.x} ${s.y} A ${r} ${r} 0 ${large} 1 ${e.x} ${e.y} Z`;
}

function SVGWheel({ rotation }) {
  const N   = WHEEL_SEGMENTS.length;
  const DEG = 360 / N;
  const cx  = 160, cy = 160, r = 148, rl = 105;

  return (
    <svg width="320" height="320" viewBox="0 0 320 320" style={{ display:"block", filter:"drop-shadow(0 0 12px #c8201c44)" }}>
      {/* Outer ring */}
      <circle cx={cx} cy={cy} r={r+6} fill="none" stroke="#c8201c" strokeWidth="3" />

      <g transform={`rotate(${rotation} ${cx} ${cy})`}>
        {WHEEL_SEGMENTS.map((seg, i) => {
          const start = i * DEG;
          const end   = start + DEG;
          const mid   = start + DEG / 2;
          const lp    = polarToCartesian(cx, cy, rl, mid);

          return (
            <g key={i}>
              <path d={slicePath(cx, cy, r, start, end)} fill={seg.color} stroke="#0e0e0e" strokeWidth="1.5" />
              {/* Emoji */}
              <text
                x={lp.x} y={lp.y - 9}
                textAnchor="middle" dominantBaseline="middle"
                fontSize="14"
                transform={`rotate(${mid} ${lp.x} ${lp.y})`}
              >{seg.emoji}</text>
              {/* Label */}
              <text
                x={lp.x} y={lp.y + 9}
                textAnchor="middle" dominantBaseline="middle"
                fontSize="8.5" fontWeight="900" fill="#fff"
                fontFamily="Georgia, serif" letterSpacing="0.5"
                transform={`rotate(${mid} ${lp.x} ${lp.y})`}
                style={{ textShadow: "0 1px 3px rgba(0,0,0,0.9)" }}
              >{seg.label}</text>
            </g>
          );
        })}
      </g>

      {/* Divider spokes */}
      <g transform={`rotate(${rotation} ${cx} ${cy})`}>
        {WHEEL_SEGMENTS.map((_, i) => {
          const p = polarToCartesian(cx, cy, r, i * DEG);
          return <line key={i} x1={cx} y1={cy} x2={p.x} y2={p.y} stroke="#0e0e0e" strokeWidth="1" />;
        })}
      </g>

      {/* Center cap */}
      <circle cx={cx} cy={cy} r={24} fill="#0e0e0e" stroke="#c8201c" strokeWidth="2.5" />
      <text x={cx} y={cy} textAnchor="middle" dominantBaseline="middle"
        fontSize="11" fontWeight="900" fill="#c8201c" fontFamily="Georgia, serif">NY</text>
    </svg>
  );
}

function SpinTab() {
  const [rotation, setRotation]   = useState(0);
  const [spinning, setSpinning]   = useState(false);
  const [result, setResult]       = useState(null);
  const [fact, setFact]           = useState(null);
  const [loading, setLoading]     = useState(false);
  const spinStateRef              = useRef({ current: 0, target: 0, vel: 0, running: false });
  const rafRef                    = useRef(null);

  const N   = WHEEL_SEGMENTS.length;
  const DEG = 360 / N;

  function getWinner(rot) {
    // Pointer at top. Normalize rotation.
    const norm = ((rot % 360) + 360) % 360;
    // Which segment is under the top pointer (0°)?
    const idx = Math.floor((360 - norm) / DEG) % N;
    return WHEEL_SEGMENTS[idx];
  }

  function spin() {
    if (spinning) return;
    setResult(null); setFact(null);
    const extraSpins  = (5 + Math.floor(Math.random() * 5)) * 360;
    const extraDeg    = Math.floor(Math.random() * 360);
    const target      = rotation + extraSpins + extraDeg;
    spinStateRef.current = { start: rotation, target, startTime: null };
    setSpinning(true);

    function ease(t) { return t < 0.5 ? 2*t*t : -1+(4-2*t)*t; }

    function animate(ts) {
      const s = spinStateRef.current;
      if (!s.startTime) s.startTime = ts;
      const elapsed  = ts - s.startTime;
      const duration = 3500 + Math.random() * 1000;
      const t        = Math.min(elapsed / duration, 1);
      const current  = s.start + (s.target - s.start) * ease(t);
      setRotation(current);

      if (t < 1) {
        rafRef.current = requestAnimationFrame(animate);
      } else {
        setRotation(s.target);
        setSpinning(false);
        const winner = getWinner(s.target);
        setResult(winner);
        fetchFact(winner.label);
      }
    }
    rafRef.current = requestAnimationFrame(animate);
  }

  async function fetchFact(team) {
    setLoading(true);
    try {
      // Map wheel labels to Supabase team names
      const TEAM_MAP = {
        "YANKEES":"YANKEES","METS":"METS","JETS":"JETS","GIANTS":"GIANTS",
        "KNICKS":"KNICKS","RANGERS":"RANGERS","ISLANDERS":"ISLANDERS",
        "NETS":"NETS","LIBERTY":"LIBERTY","DEVILS":"DEVILS",
        "RED BULLS":"RED BULLS","GOTHAM FC":"GOTHAM FC",
        "NYCFC":"NYCFC",
      };
      const teamKey = TEAM_MAP[team];
      const row = teamKey
        ? await sbRandom("ny_spin_facts", `team=eq.${encodeURIComponent(teamKey)}&`)
        : await sbRandom("ny_spin_facts");
      setFact(row || { fact: "Spin again for a great NY sports fact!", teaser: "Try again!", category: "weird", era: "" });
    } catch(e) {
      setFact({ fact: "Couldn't load — try spinning again!", teaser: "Spin again!", category: "weird", era: "" });
    }
    setLoading(false);
  }

  const CATEGORY_COLORS = {
    stat:    { bg: "#003087", label: "STAT"    },
    moment:  { bg: "#c8201c", label: "MOMENT"  },
    record:  { bg: "#125740", label: "RECORD"  },
    legend:  { bg: "#5a2d82", label: "LEGEND"  },
    weird:   { bg: "#7a4a00", label: "WEIRD ✦" },
  };
  const catStyle = CATEGORY_COLORS[fact?.category] || CATEGORY_COLORS.weird;

  return (
    <div style={styles.spinRoot}>
      <div style={styles.spinHeader}>
        <h2 style={styles.spinTitle}>🎵 SONGS & SPIN</h2>
        <p style={styles.spinSub}>WALK-UP SONGS · ENTRANCE MUSIC · SPIN FOR NY SPORTS FACTS</p>
      </div>

      {/* ── WALK-UP SONGS ── */}
      <div style={{marginBottom:24, padding:"14px 16px", background:"#111", border:"1px solid #2a2a2a"}}>
        <div style={{fontSize:9, fontWeight:900, color:"#c8201c", letterSpacing:"0.15em", marginBottom:4}}>🎵 WALK-UP SONGS & ENTRANCE MUSIC — 2026 & ALL-TIME</div>

        {/* PlateMusic links UP TOP */}
        <div style={{display:"flex", gap:10, flexWrap:"wrap", marginBottom:14, padding:"8px 10px", background:"#0a0a0a", border:"1px solid #2a2a2a"}}>
          <span style={{fontSize:9, color:"#555", alignSelf:"center", flexShrink:0}}>🔗 FULL ROSTERS:</span>
          <a href="https://platemusic.com/team/yankees" target="_blank" rel="noopener noreferrer" style={styles.histLink}>⚾ Yankees 2026</a>
          <a href="https://platemusic.com/team/mets" target="_blank" rel="noopener noreferrer" style={styles.histLink}>⚾ Mets 2026</a>
          <a href="https://platemusic.com/team" target="_blank" rel="noopener noreferrer" style={styles.histLink}>🎵 All MLB Teams</a>
          <a href="https://www.mlb.com/yankees/ballpark/music" target="_blank" rel="noopener noreferrer" style={styles.histLink}>🎵 MLB Official</a>
        </div>

        <div style={styles.stdDivisionHeader}>⚾ NEW YORK YANKEES — 2026 CURRENT ROSTER</div>
        {[
          { player:"Aaron Judge",       pos:"RF",  song:"Hot (Remix) feat. Gunna & Travis Scott", artist:"Young Thug",        note:"The Captain's high-energy anthem — fitting for the man who hit 62 HRs in 2022" },
          { player:"Giancarlo Stanton", pos:"DH",  song:"Dreams and Nightmares",                   artist:"Meek Mill",         note:"Stanton's intimidation factor starts before he steps in the box" },
          { player:"Paul Goldschmidt",  pos:"1B",  song:"Numb / Encore",                           artist:"Linkin Park",       note:"Goldy brings the Linkin Park classic to the Bronx" },
          { player:"Cody Bellinger",    pos:"LF",  song:"A Milli",                                 artist:"Lil Wayne",         note:"Bellinger's walk-up matches his big-money arrival in New York" },
          { player:"Trent Grisham",     pos:"CF",  song:"Easton",                                  artist:"Turnpike Troubadours", note:"Country sounds at Yankee Stadium — the crowd loves the contrast" },
          { player:"Randal Grichuk",    pos:"RF",  song:"50 Ways to Leave Your Lover",             artist:"Paul Simon",        note:"Classic NY songwriter vibes — a nod to the city's musical heritage" },
          { player:"Ryan McMahon",      pos:"3B",  song:"Devil's Den",                             artist:"Hippie Sabotage",   note:"The chill electronic intro sets a focused, intense tone" },
          { player:"Amed Rosario",      pos:"3B",  song:"La Gasolina",                             artist:"Daddy Yankee",      note:"Latin energy at Yankee Stadium" },
          { player:"Anthony Volpe",     pos:"SS",  song:"Something",                               artist:"John Summit",       note:"The young shortstop's EDM choice gets the Stadium moving" },
          { player:"Gerrit Cole",       pos:"SP",  song:"Gimme Shelter",                           artist:"The Rolling Stones",note:"The Stones for the ace — legendary taste, legendary pitcher" },
          { player:"Carlos Rodón",      pos:"SP",  song:"Would?",                                  artist:"Alice in Chains",   note:"Heavy grunge for a hard-throwing lefty — dark and powerful" },
          { player:"Clarke Schmidt",    pos:"RP",  song:"Hey Ya!",                                 artist:"OutKast",           note:"Unexpected fun — Schmidt walks to the mound with a classic banger" },
        ].map((s, i) => (
          <div key={i} style={{display:"flex", gap:10, padding:"7px 0", borderBottom:"1px solid #1a1a1a", flexWrap:"wrap"}}>
            <div style={{flexShrink:0, width:22, fontSize:13, textAlign:"center"}}>⚾</div>
            <div style={{flex:1, minWidth:0}}>
              <div style={{display:"flex", gap:6, alignItems:"baseline", flexWrap:"wrap", marginBottom:1}}>
                <span style={{fontSize:11, fontWeight:900, color:"#e8e0d0", fontFamily:"'Georgia',serif"}}>{s.player}</span>
                <span style={{fontSize:8, color:"#666"}}>{s.pos}</span>
                <span style={{fontSize:9, color:"#003087", fontWeight:700}}>Yankees</span>
              </div>
              <div style={{fontSize:11, color:"#FFD700", marginBottom:1}}>"{s.song}" — {s.artist}</div>
              <div style={{fontSize:9, color:"#555", fontStyle:"italic"}}>{s.note}</div>
            </div>
            <a href={`https://www.youtube.com/results?search_query=${encodeURIComponent(s.song+" "+s.artist)}`}
              target="_blank" rel="noopener noreferrer"
              style={{...styles.histLink, flexShrink:0, alignSelf:"center", fontSize:9}}>▶</a>
          </div>
        ))}

        <div style={{...styles.stdDivisionHeader, marginTop:14}}>⚾ NEW YORK METS — 2026 CURRENT ROSTER</div>
        {[
          { player:"Juan Soto",         pos:"RF",  song:"Empire State of Mind",                   artist:"JAY-Z & Alicia Keys", note:"The $765M man plays NY's own anthem when he steps to the plate at Citi Field. Perfect." },
          { player:"Francisco Lindor",  pos:"SS",  song:"My Girl",                                artist:"The Temptations",     note:"Citi Field sings along every at-bat. The Temptations performed it live at Citi during the 2025 NLCS — a true NY moment." },
          { player:"Francisco Lindor",  pos:"SS",  song:"Ain't No Mountain High Enough",          artist:"Marvin Gaye & Tammi Terrell", note:"His alternate — he rotates between this and My Girl. Fans pushed back when he tried to drop My Girl, so he kept both." },
          { player:"Francisco Alvarez", pos:"C",   song:"TBD 2026",                               artist:"Various",             note:"Young franchise catcher — watch for his choice as he becomes the face of the Mets" },
          { player:"Mark Vientos",      pos:"1B",  song:"TBD 2026",                               artist:"Various",             note:"The emerging power bat — his walk-up will grow with his stardom" },
          { player:"Marcus Semien",     pos:"2B",  song:"Studio",                                 artist:"ScHoolboy Q",         note:"Hard-hitting rapper for a hard-hitting second baseman" },
          { player:"Bo Bichette",       pos:"3B",  song:"Love Yourself",                          artist:"Justin Bieber",       note:"Unexpected — but Bichette's always been his own guy" },
          { player:"Tyrone Taylor",     pos:"OF",  song:"THE SCOTTS",                             artist:"Travis Scott & Kid Cudi", note:"High energy for the outfielder who gives 100% every at-bat" },
          { player:"Brett Baty",        pos:"OF",  song:"TBD 2026",                               artist:"charlieonnafriday",   note:"The young Met keeps it indie — a different vibe at Citi" },
          { player:"Clay Holmes",       pos:"RP",  song:"TBD 2026",                               artist:"Various",             note:"The veteran reliever brought from the Bronx — curious what he picks for Citi" },
          { player:"Sean Manaea",       pos:"SP",  song:"TBD 2026",                               artist:"Various",             note:"The lefty starter — Citi Field will give him a big welcome" },
        ].map((s, i) => (
          <div key={i} style={{display:"flex", gap:10, padding:"7px 0", borderBottom:"1px solid #1a1a1a", flexWrap:"wrap"}}>
            <div style={{flexShrink:0, width:22, fontSize:13, textAlign:"center"}}>⚾</div>
            <div style={{flex:1, minWidth:0}}>
              <div style={{display:"flex", gap:6, alignItems:"baseline", flexWrap:"wrap", marginBottom:1}}>
                <span style={{fontSize:11, fontWeight:900, color:"#e8e0d0", fontFamily:"'Georgia',serif"}}>{s.player}</span>
                <span style={{fontSize:8, color:"#666"}}>{s.pos}</span>
                <span style={{fontSize:9, color:"#FF5910", fontWeight:700}}>Mets</span>
              </div>
              <div style={{fontSize:11, color:"#FFD700", marginBottom:1}}>"{s.song}" — {s.artist}</div>
              <div style={{fontSize:9, color:"#555", fontStyle:"italic"}}>{s.note}</div>
            </div>
            <a href={`https://www.youtube.com/results?search_query=${encodeURIComponent(s.song+" "+s.artist)}`}
              target="_blank" rel="noopener noreferrer"
              style={{...styles.histLink, flexShrink:0, alignSelf:"center", fontSize:9}}>▶</a>
          </div>
        ))}

        <div style={{...styles.stdDivisionHeader, marginTop:14}}>🏆 ALL-TIME ICONIC NY SPORTS ENTRANCE MUSIC</div>
        {[
          { player:"Mariano Rivera",   team:"Yankees",  song:"Enter Sandman",              artist:"Metallica",              note:"The most famous walk-up in baseball history. Stadium goes silent — then ERUPTS. Every closer since is compared to this." },
          { player:"Derek Jeter",      team:"Yankees",  song:"Empire State of Mind",       artist:"JAY-Z & Alicia Keys",    note:"NY's anthem for NY's Captain. 50,000 people sang along. Goosebumps every time." },
          { player:"Gary Sheffield",   team:"Yankees",  song:"We're Not Gonna Take It",    artist:"Twisted Sister",         note:"Perfectly matched Sheffield's menacing bat waggle and intensity." },
          { player:"Gerrit Cole",      team:"Yankees",  song:"Gimme Shelter",              artist:"The Rolling Stones",     note:"The ace opens with the Stones — legendary taste from a legendary pitcher." },
          { player:"David Wright",     team:"Mets",     song:"New York Groove",            artist:"Ace Frehley (KISS)",     note:"Mr. Met himself — pure New York rock and roll." },
          { player:"Carlos Beltrán",   team:"Mets",     song:"Fuego",                      artist:"Pitbull",                note:"Beltrán's Latin flair at the plate — powerful and cool." },
          { player:"Pete Alonso",      team:"Mets",     song:"Polar Bear energy",          artist:"Various (2019-2024)",    note:"The Mets all-time HR king rotated songs but always brought the same energy." },
          { player:"Jesse Orosco",     team:"Mets",     song:"Shea Stadium crowd roar",    artist:"1986 World Series",      note:"He didn't need a walk-up — the crowd's roar was his music as he struck out the final batter of the '86 Series." },
          { player:"Mike Piazza",      team:"Mets",     song:"City silence — then bedlam", artist:"Shea Stadium, 9/21/01",  note:"On September 21, 2001, the silence before his at-bat was the most powerful moment. Then he hit the HR that healed a city." },
          { player:"Henrik Lundqvist", team:"Rangers",  song:"Welcome to the Jungle",      artist:"Guns N' Roses",          note:"The King's MSG entrance — electric for 15 seasons. The crowd lit up every time." },
          { player:"Mark Messier",     team:"Rangers",  song:"We Are the Champions",       artist:"Queen",                  note:"The victory anthem that became the Rangers' forever song after 1994." },
          { player:"Patrick Ewing",    team:"Knicks",   song:"Welcome to the Terrordome",  artist:"Public Enemy",           note:"90s Knicks at MSG — Ewing and Public Enemy was peak New York." },
          { player:"Curtis Martin",    team:"Jets",     song:"Can't Stop Won't Stop",      artist:"Young Jeezy",            note:"Martin's workman intensity perfectly captured in music." },
          { player:"Joe Namath",       team:"Jets",     song:"New York, New York",         artist:"Frank Sinatra",          note:"Broadway Joe's era — Sinatra defined the city and Namath defined the Jets." },
        ].map((s, i) => (
          <div key={i} style={{display:"flex", gap:10, padding:"7px 0", borderBottom:"1px solid #1a1a1a", flexWrap:"wrap"}}>
            <div style={{flexShrink:0, width:22, fontSize:13, textAlign:"center"}}>🎵</div>
            <div style={{flex:1, minWidth:0}}>
              <div style={{display:"flex", gap:8, alignItems:"baseline", flexWrap:"wrap", marginBottom:1}}>
                <span style={{fontSize:11, fontWeight:900, color:"#e8e0d0", fontFamily:"'Georgia',serif"}}>{s.player}</span>
                <span style={{fontSize:9, color:"#888", fontWeight:700}}>{s.team}</span>
              </div>
              <div style={{fontSize:11, color:"#FFD700", marginBottom:1}}>"{s.song}" — {s.artist}</div>
              <div style={{fontSize:9, color:"#555", fontStyle:"italic"}}>{s.note}</div>
            </div>
            <a href={`https://www.youtube.com/results?search_query=${encodeURIComponent(s.song+" "+s.artist)}`}
              target="_blank" rel="noopener noreferrer"
              style={{...styles.histLink, flexShrink:0, alignSelf:"center", fontSize:9}}>▶</a>
          </div>
        ))}
      </div>

      {/* ── SPIN WHEEL (below songs) ── */}
      <div style={{padding:"12px 14px", background:"#111", border:"1px solid #2a2a2a", marginBottom:16}}>
        <div style={{fontSize:9, fontWeight:900, color:"#c8201c", letterSpacing:"0.15em", marginBottom:4}}>🎰 SPIN THE WHEEL — NY SPORTS FACTS</div>
        <div style={{fontSize:9, color:"#555", marginBottom:10}}>Land on a team, get a random NY sports fact from our database</div>
      </div>
        {[
          { player:"Aaron Judge",      song:"Swag Surfin'",              artist:"F.L.Y.",           note:"The Captain's swagger anthem — fitting for the AL HR record holder" },
          { player:"Jazz Chisholm Jr.",song:"TBD 2026",                  artist:"Various",           note:"Jazz's energy is electric — whatever he picks gets the Stadium going" },
          { player:"Ben Rice",         song:"Feel Good Inc.",             artist:"Gorillaz",          note:"The fan favorite 'Ben Arroz' keeps the Gorillaz classic" },
          { player:"Cody Bellinger",   song:"TBD 2026",                  artist:"Various",           note:"New Yankee — watch for a big intro song at the Stadium" },
        ].map((s, i) => (
          <div key={i} style={{display:"flex", gap:10, padding:"7px 0", borderBottom:"1px solid #1a1a1a", flexWrap:"wrap"}}>
            <div style={{flexShrink:0, width:22, fontSize:14, textAlign:"center"}}>⚾</div>
            <div style={{flex:1, minWidth:0}}>
              <div style={{display:"flex", gap:8, alignItems:"baseline", flexWrap:"wrap", marginBottom:1}}>
                <span style={{fontSize:11, fontWeight:900, color:"#e8e0d0", fontFamily:"'Georgia',serif"}}>{s.player}</span>
                <span style={{fontSize:9, color:"#003087", fontWeight:700}}>Yankees</span>
              </div>
              <div style={{fontSize:11, color:"#FFD700", marginBottom:1}}>"{s.song}" — {s.artist}</div>
              <div style={{fontSize:9, color:"#555", fontStyle:"italic"}}>{s.note}</div>
            </div>
            <a href={`https://www.youtube.com/results?search_query=${encodeURIComponent(s.song+" "+s.artist)}`}
              target="_blank" rel="noopener noreferrer"
              style={{...styles.histLink, flexShrink:0, alignSelf:"center", fontSize:9}}>▶ YouTube</a>
          </div>
        ))}
      <div style={styles.spinLayout}>
        {/* Wheel column */}
        <div style={styles.spinWheelCol}>
          <div style={styles.spinPointerWrap}>
            <div style={styles.spinPointer}>▼</div>
          </div>
          <SVGWheel rotation={rotation} />
          <button onClick={spin} disabled={spinning}
            style={{...styles.spinBtn, ...(spinning ? styles.spinBtnDisabled : {})}}>
            {spinning ? "SPINNING…" : result ? "SPIN AGAIN" : "SPIN IT"}
          </button>
        </div>

        {/* Result column */}
        <div style={styles.spinResultCol}>
          {!result && !spinning && (
            <div style={styles.spinPrompt}>
              <span style={styles.spinPromptIcon}>🎰</span>
              <p style={styles.spinPromptText}>SPIN THE WHEEL TO REVEAL A NY SPORTS FUN FACT</p>
              <p style={styles.spinPromptSub}>Every spin is a different team, a different era, a different story</p>
            </div>
          )}
          {spinning && (
            <div style={styles.spinWaiting}>
              <div style={styles.spinWaitingDots}>
                {[0,1,2].map(i=><span key={i} style={{...styles.dot, animationDelay:`${i*0.2}s`}}/>)}
              </div>
              <p style={styles.loadingText}>SPINNING…</p>
            </div>
          )}
          {result && !spinning && (
            <div style={styles.spinFactCard}>
              <div style={{...styles.spinTeamBanner, background: result.color}}>
                <span style={styles.spinTeamEmoji}>{result.emoji}</span>
                <span style={styles.spinTeamName}>
                  {["DEVILS","RED BULLS","GOTHAM FC"].includes(result.label) ? "NJ/NY " : "NEW YORK "}
                  {result.label}
                </span>
              </div>
              {loading ? (
                <div style={styles.spinFactLoading}>
                  <div style={styles.loadingDots}>
                    {[0,1,2].map(i=><span key={i} style={{...styles.dot, animationDelay:`${i*0.2}s`}}/>)}
                  </div>
                  <p style={styles.loadingText}>DIGGING THROUGH THE ARCHIVES…</p>
                </div>
              ) : fact ? (
                <div style={styles.spinFactBody}>
                  <div style={styles.spinFactMeta}>
                    <span style={{...styles.spinCatBadge, background: catStyle.bg}}>{catStyle.label}</span>
                    {fact.era && <span style={styles.spinEra}>{fact.era}</span>}
                  </div>
                  <p style={styles.spinTeaser}>"{fact.teaser}"</p>
                  <p style={styles.spinFactText}>{fact.fact}</p>
                  <SearchLinks query={`New York ${result.label} ${fact.era || ""} ${fact.teaser || ""}`} />
                </div>
              ) : null}
            </div>
          )}
        </div>
      </div>
      <p style={styles.spinFootnote}>Fun facts powered by AI · Spin as many times as you like</p>
    </div>
  );
}


// ─── SONGS TAB (walk-up songs only, extracted from SpinTab) ────────────────
// ─── WORD SEARCH TAB ──────────────────────────────────────────────────────
function WordSearchTab() {
  const PUZZLES = [
    {
      title: "NY JETS LEGENDS",
      words: ["NAMATH","MAYNARD","KLECKO","MARTIN","GASTINEAU","PENNINGTON","REVIS","LYONS","BYRD","WILSON","BAILEY","MCNEIL","MANGOLD","FERGUSON","PARCELLS"],
      size: 15,
    },
    {
      title: "NY YANKEES LEGENDS",
      words: ["JETER","MANTLE","DIMAGGIO","RUTH","GEHRIG","FORD","BERRA","RIVERA","MATTINGLY","REGGIE","MUNSON","WINFIELD"],
      size: 15,
    },
    {
      title: "NY METS HEROES",
      words: ["SEAVER","PIAZZA","GOODEN","STRAWBERRY","HERNANDEZ","CARTER","MOOKIE","WRIGHT","LINDOR","SOTO","REYES","DEGROM"],
      size: 15,
    },
    {
      title: "NY RANGERS LEGENDS",
      words: ["MESSIER","LEETCH","GILBERT","GIACOMIN","ESPOSITO","LUNDQVIST","KREIDER","LAFRENIERE","RICHTER","DIONNE"],
      size: 15,
    },
    {
      title: "NY KNICKS ALL-TIME",
      words: ["EWING","FRAZIER","REED","DEBUSSCHERE","BARNETT","MONROE","SPREWELL","STARKS","HOUSTON","BRUNSON","BRIDGES","TOWNS"],
      size: 15,
    },
    {
      title: "NY ISLANDERS DYNASTY",
      words: ["BOSSY","TROTTIER","POTVIN","GILLIES","TONELLI","SMITH","NYSTROM","LAFONTAINE","TAVARES","DIPIETRO","WEIGHT","PARISE"],
      size: 15,
    },
    {
      title: "NJ DEVILS LEGENDS",
      words: ["BRODEUR","NIEDERMAYER","STEVENS","LEMAIRE","ELIAS","HISCHIER","HUGHES","PARISE","SYKORA","MADANO","ROLSTON","GIONTA"],
      size: 15,
    },
    {
      title: "NY GIANTS LEGENDS",
      words: ["TAYLOR","SIMMS","STRAHAN","MANNING","GIFFORD","PARCELLS","BARBER","BECKHAM","NABERS","BARKLEY","CARTER","BANKS"],
      size: 15,
    },
  ];

  const [puzzleIdx, setPuzzleIdx] = useState(0);
  const [refreshKey, setRefreshKey] = useState(0);
  const [grid, setGrid]           = useState([]);
  const [wordData, setWordData]   = useState([]);
  const [selected, setSelected]   = useState(new Set());
  const [found, setFound]         = useState(new Set());
  const [selecting, setSelecting] = useState(false);
  const [startCell, setStartCell] = useState(null);
  const [currentSel, setCurrentSel] = useState([]);
  const [solved, setSolved]       = useState(false);

  const puzzle = PUZZLES[puzzleIdx];
  const { words, size } = puzzle;

  // Generate the grid — refreshKey forces new grid without changing puzzle
  useEffect(() => {
    const { newGrid, placed } = buildWordSearch(words, size);
    setGrid(newGrid);
    setWordData(placed);
    setSelected(new Set());
    setFound(new Set());
    setCurrentSel([]);
    setStartCell(null);
    setSelecting(false);
    setSolved(false);
  }, [puzzleIdx, refreshKey]);

  function buildWordSearch(wordList, sz) {
    const dirs = [
      [0,1],[1,0],[1,1],[0,-1],[-1,0],[-1,-1],[1,-1],[-1,1]
    ];
    const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    const g = Array.from({length:sz}, () => Array(sz).fill(""));
    const placed = [];

    // Sort by length descending for better placement
    const sorted = [...wordList].sort((a,b) => b.length - a.length);

    for (const word of sorted) {
      let success = false;
      const attempts = 300;
      for (let att = 0; att < attempts && !success; att++) {
        const [dr, dc] = dirs[Math.floor(Math.random() * dirs.length)];
        const r0 = Math.floor(Math.random() * sz);
        const c0 = Math.floor(Math.random() * sz);
        // Check if fits
        const cells = [];
        let fits = true;
        for (let i = 0; i < word.length; i++) {
          const r = r0 + dr*i, c = c0 + dc*i;
          if (r < 0 || r >= sz || c < 0 || c >= sz) { fits = false; break; }
          if (g[r][c] !== "" && g[r][c] !== word[i]) { fits = false; break; }
          cells.push([r, c]);
        }
        if (fits) {
          cells.forEach(([r,c], i) => { g[r][c] = word[i]; });
          placed.push({ word, cells });
          success = true;
        }
      }
    }

    // Fill remaining with random letters
    for (let r = 0; r < sz; r++)
      for (let c = 0; c < sz; c++)
        if (!g[r][c]) g[r][c] = letters[Math.floor(Math.random()*26)];

    return { newGrid: g, placed };
  }

  function cellKey(r, c) { return `${r},${c}`; }

  function getCellsBetween(r1, c1, r2, c2) {
    const dr = Math.sign(r2-r1), dc = Math.sign(c2-c1);
    const cells = [];
    let r = r1, c = c1;
    while (r !== r2+dr || c !== c2+dc) {
      cells.push([r,c]);
      if (r === r2 && c === c2) break;
      r += dr; c += dc;
      if (cells.length > 20) break;
    }
    return cells;
  }

  function onMouseDown(r, c) {
    setSelecting(true);
    setStartCell([r,c]);
    setCurrentSel([[r,c]]);
  }

  function onMouseEnter(r, c) {
    if (!selecting || !startCell) return;
    const [r0, c0] = startCell;
    const dr = r - r0, dc = c - c0;
    // Only allow 8 directions
    if (dr === 0 || dc === 0 || Math.abs(dr) === Math.abs(dc)) {
      setCurrentSel(getCellsBetween(r0, c0, r, c));
    }
  }

  function onMouseUp() {
    if (!selecting) return;
    setSelecting(false);
    checkSelection(currentSel);
    setCurrentSel([]);
    setStartCell(null);
  }

  function checkSelection(cells) {
    if (!cells.length) return;
    const word = cells.map(([r,c]) => grid[r]?.[c] || "").join("");
    const revWord = word.split("").reverse().join("");

    const match = wordData.find(wd =>
      (wd.word === word || wd.word === revWord) && !found.has(wd.word)
    );

    if (match) {
      const newFound = new Set(found);
      newFound.add(match.word);
      setFound(newFound);

      const newSel = new Set(selected);
      cells.forEach(([r,c]) => newSel.add(cellKey(r,c)));
      setSelected(newSel);

      if (newFound.size === wordData.length) setSolved(true);
    }
  }

  const WORD_COLORS = [
    "#22c55e","#3b82f6","#f59e0b","#ec4899","#8b5cf6","#14b8a6",
    "#f97316","#06b6d4","#84cc16","#ef4444","#a855f7","#eab308",
  ];

  function cellColor(r, c) {
    const key = cellKey(r,c);
    if (currentSel.find(([cr,cc]) => cr===r && cc===c)) return "#c8201c";
    if (selected.has(key)) {
      // Find which word owns this cell and give it that word's color
      for (let i = 0; i < wordData.length; i++) {
        if (wordData[i].cells.find(([wr,wc]) => wr===r && wc===c)) {
          return WORD_COLORS[i % WORD_COLORS.length];
        }
      }
      return "#22c55e";
    }
    return "transparent";
  }

  function handlePrint() {
    const CS = 32;
    let gridHtml = "";
    for (let r = 0; r < size; r++) {
      let row = "<tr>";
      for (let c = 0; c < size; c++) {
        const letter = grid[r]?.[c] || "";
        const isHighlighted = selected.has(cellKey(r,c));
        let bg = "#fff";
        if (isHighlighted) {
          const colors = ["#bbf7d0","#bfdbfe","#fde68a","#fbcfe8","#ddd6fe","#99f6e4","#fed7aa","#a5f3fc","#d9f99d","#fecaca","#e9d5ff","#fef08a"];
          for (let i = 0; i < wordData.length; i++) {
            if (wordData[i].cells.find(([wr,wc]) => wr===r && wc===c)) { bg = colors[i % colors.length]; break; }
          }
        }
        row += `<td style="width:${CS}px;height:${CS}px;border:1px solid #ccc;text-align:center;vertical-align:middle;font-size:14px;font-weight:700;font-family:monospace;background:${bg} !important;box-sizing:border-box;-webkit-print-color-adjust:exact !important;print-color-adjust:exact !important;">${letter}</td>`;
      }
      gridHtml += row + "</tr>";
    }
    const colors = ["#bbf7d0","#bfdbfe","#fde68a","#fbcfe8","#ddd6fe","#99f6e4","#fed7aa","#a5f3fc","#d9f99d","#fecaca","#e9d5ff","#fef08a"];
    const wordListHtml = words.map((w,i) => {
      const isFoundW = found.has(w);
      const bg = isFoundW ? colors[i % colors.length] : "#fff";
      return `<span style="display:inline-block;margin:3px 4px 3px 0;padding:3px 8px;border:1.5px solid #ccc;border-radius:3px;font-size:11px;font-weight:700;font-family:monospace;background:${bg} !important;-webkit-print-color-adjust:exact !important;print-color-adjust:exact !important;text-decoration:${isFoundW?"line-through":"none"}">${w}</span>`;
    }).join("");
    const answerKey = wordData.map(wd => {
      const r1=wd.cells[0][0],c1=wd.cells[0][1],r2=wd.cells[wd.cells.length-1][0],c2=wd.cells[wd.cells.length-1][1];
      return `${wd.word}: (${r1+1},${c1+1})→(${r2+1},${c2+1})`;
    }).join(" &nbsp;·&nbsp; ");
    const html = `<!DOCTYPE html><html><head><title>${puzzle.title} Word Search</title><style>
      *{box-sizing:border-box;-webkit-print-color-adjust:exact !important;print-color-adjust:exact !important;}
      body{font-family:Georgia,serif;margin:20px;color:#000;}
      h2{text-align:center;font-size:20px;margin:0 0 2px;}
      .sub{text-align:center;font-size:11px;color:#555;margin:0 0 3px;}
      .site{text-align:center;font-size:10px;color:#aaa;margin:0 0 14px;letter-spacing:0.15em;}
      .layout{display:flex;gap:24px;align-items:flex-start;}
      table{border-collapse:collapse;flex-shrink:0;}
      .words-title{font-size:12px;font-weight:bold;border-bottom:2px solid #000;margin:0 0 10px;padding-bottom:4px;}
      .hint{font-size:9px;color:#888;margin-top:12px;font-style:italic;line-height:1.5;}
      .key{font-size:9px;color:#666;margin-top:14px;border-top:1px solid #ccc;padding-top:10px;line-height:1.9;}
      .key-title{font-size:10px;font-weight:bold;margin-bottom:4px;}
      @media print{body{margin:6px;}@page{margin:0.4in;size:landscape;}}
    </style></head><body>
    <h2>🔍 ${puzzle.title}</h2>
    <p class="sub">NY Sports Daily · Word Search · ${size}&times;${size} Grid</p>
    <p class="site">NYSPORTSDAILY.COM</p>
    <div class="layout">
      <table>${gridHtml}</table>
      <div style="flex:1;min-width:180px;">
        <div class="words-title">FIND THESE ${words.length} WORDS</div>
        <div>${wordListHtml}</div>
        <div class="hint">Words are hidden horizontally, vertically, and diagonally — forwards and backwards. Circle or highlight each word as you find it.</div>
        <div class="key"><div class="key-title">ANSWER KEY (row,col)</div>${answerKey}</div>
      </div>
    </div>
    <script>setTimeout(()=>window.print(),400);</script>
    </body></html>`;
    const w = window.open("","_blank","width=1050,height=750");
    if (w) { w.document.write(html); w.document.close(); }
    else alert("Please allow popups to print.");
  }

  return (
    <div style={styles.statsRoot}>
      <div style={styles.stdHeader}>
        <h2 style={styles.stdTitle}>🔍 NY SPORTS WORD SEARCH</h2>
        <p style={styles.stdSub}>FIND ALL THE HIDDEN NY SPORTS LEGENDS</p>
      </div>

      {/* Puzzle selector */}
      <div style={{display:"flex", gap:4, flexWrap:"wrap", marginBottom:16}}>
        {PUZZLES.map((p, i) => (
          <button key={i} onClick={() => setPuzzleIdx(i)}
            style={{...styles.filterBtn, ...(puzzleIdx===i ? styles.filterBtnActive : {}), fontSize:9, padding:"3px 10px"}}>
            {p.title}
          </button>
        ))}
      </div>

      <div style={{display:"flex", gap:24, flexWrap:"wrap", alignItems:"flex-start"}}>
        {/* Grid */}
        <div style={{flexShrink:0}}>
          <div style={{marginBottom:8, fontSize:12, fontWeight:900, color:"#e8e8e8", fontFamily:"'Georgia',serif"}}>
            {puzzle.title}
            {solved && <span style={{marginLeft:12, color:"#22c55e"}}>✅ SOLVED!</span>}
          </div>
          <div
            onMouseLeave={onMouseUp}
            style={{
              display:"grid",
              gridTemplateColumns:`repeat(${size}, 1fr)`,
              gap:1, userSelect:"none", cursor:"crosshair",
              background:"#222", padding:2, borderRadius:3,
            }}>
            {grid.map((row, r) =>
              row.map((letter, c) => {
                const bg = cellColor(r, c);
                return (
                  <div key={`${r}-${c}`}
                    onMouseDown={() => onMouseDown(r,c)}
                    onMouseEnter={() => onMouseEnter(r,c)}
                    onMouseUp={onMouseUp}
                    style={{
                      width:28, height:28,
                      display:"flex", alignItems:"center", justifyContent:"center",
                      fontSize:12, fontWeight:900, fontFamily:"monospace",
                      background: bg,
                      color: bg !== "transparent" ? "#fff" : "#e8e8e8",
                      borderRadius:2, cursor:"crosshair",
                      transition:"background 0.1s",
                    }}>
                    {letter}
                  </div>
                );
              })
            )}
          </div>
          <div style={{fontSize:9, color:"#555", marginTop:6}}>
            Click and drag to select letters · Works in any direction
          </div>
        </div>

        {/* Word list */}
        <div style={{flex:1, minWidth:160}}>
          <div style={{fontSize:10, fontWeight:900, color:"#c8201c", letterSpacing:"0.12em", marginBottom:12}}>
            FIND THESE WORDS ({found.size}/{words.length})
          </div>
          <div style={{display:"flex", flexDirection:"column", gap:5}}>
            {words.map((w, i) => {
              const isFound = found.has(w);
              const color = WORD_COLORS[i % WORD_COLORS.length];
              return (
                <div key={w} style={{
                  display:"flex", alignItems:"center", gap:8,
                  padding:"5px 10px",
                  background: isFound ? `${color}22` : "#111",
                  borderLeft:`3px solid ${isFound ? color : "#333"}`,
                  borderRadius:2,
                }}>
                  <span style={{fontSize:12, fontWeight:700,
                    color: isFound ? color : "#888",
                    textDecoration: isFound ? "line-through" : "none",
                    fontFamily:"monospace", letterSpacing:"0.05em"}}>
                    {w}
                  </span>
                  {isFound && <span style={{fontSize:10}}>✓</span>}
                </div>
              );
            })}
          </div>

          <button onClick={() => setRefreshKey(k => k + 1)}
            style={{...styles.filterBtn, marginTop:16, width:"100%", padding:"8px",
              fontSize:10, letterSpacing:"0.1em"}}>
            🔄 NEW GRID (SAME WORDS)
          </button>
          <button onClick={handlePrint}
            style={{...styles.filterBtn, marginTop:6, width:"100%", padding:"8px",
              fontSize:10, letterSpacing:"0.1em", color:"#aaa"}}>
            🖨 PRINT / SAVE PDF
          </button>
        </div>
      </div>
    </div>
  );
}

function SongsTab() {
  const [activeTeam, setActiveTeam] = useState("Yankees");

  const LEGENDARY_SONGS = {
    Yankees: [
      { player:"Mariano Rivera",     era:"1995–2013", song:"Enter Sandman",                artist:"Metallica",              note:"The most iconic walk-up in baseball history. Every Yankees fan feels it. Mo coming out of the bullpen to that riff is sports perfection." },
      { player:"Derek Jeter",        era:"1995–2014", song:"Empire State of Mind",          artist:"JAY-Z & Alicia Keys",    note:"The Captain's walk-up — New York, New York in spirit, the greatest Yankee anthem for the greatest Yankee of the modern era." },
      { player:"Bernie Williams",    era:"1991–2006", song:"Take Me Out to the Ballgame",   artist:"Traditional (guitar)",   note:"Bernie played classical guitar himself — his walk-up was often a classical piece, showing the soul behind one of the most underrated Yankees ever." },
      { player:"Paul O'Neill",     era:"1992–2001", song:"Lawyers, Guns and Money",       artist:"Warren Zevon",           note:"The Warrior's walk-up matched his intensity — Paul O'Neill going to bat was a sporting event within a sporting event." },
      { player:"Don Mattingly",      era:"1982–1995", song:"Welcome to the Jungle",         artist:"Guns N' Roses",         note:"Donnie Baseball with Axl Rose — it shouldn't work perfectly but it absolutely does. The 1980s Yankees in one song choice." },
      { player:"Jason Giambi",       era:"2002–2008", song:"Welcome to the Jungle",         artist:"Guns N' Roses",         note:"Giambi inherited the Donnie Baseball tradition — his massive swing matched the massive energy of Axl's opening scream." },
      { player:"Reggie Jackson",     era:"1977–1981", song:"Mr. October (Theme)",           artist:"Stadium PA",             note:"Before recorded walk-ups, Reggie's entrance was pure crowd noise — 56,000 fans who knew something historic was coming." },
      { player:"Alex Rodriguez",     era:"2004–2016", song:"Hip Hop Is Dead",               artist:"Nas",                    note:"A-Rod's walk-up choices were always a statement — this one captured his complicated NYC relationship perfectly." },
      { player:"Gary Sheffield",     era:"2004–2006", song:"Tipsy",                         artist:"J-Kwon",                 note:"Sheffield's menacing bat waggle needed a soundtrack — Tipsy was it, and it worked perfectly with his distinctive batting stance." },
      { player:"Jorge Posada",       era:"1995–2011", song:"La Gozadera",                   artist:"Gente de Zona",          note:"The Puerto Rican core Yankee's walk-up reflected his heritage — Posada's Latin pride was always present at the plate." },
      { player:"CC Sabathia",        era:"2009–2019", song:"We Major",                      artist:"Kanye West",             note:"CC walked to the mound like a man on a mission — his commanding presence needed a commanding soundtrack." },
      { player:"Aaron Judge",        era:"2016–present",song:"All I Do Is Win",             artist:"DJ Khaled",              note:"The current Captain's signature. All Rise for Judge — and the music sets the perfect tone for the largest man in baseball." },
    ],
    Mets: [
      { player:"Tom Seaver",         era:"1967–1977", song:"(No recorded walk-up era)",     artist:"Stadium atmosphere",     note:"Tom Terrific's era predates walk-up music — but Shea Stadium roared differently when Seaver took the mound. Pure anticipation." },
      { player:"Darryl Strawberry",  era:"1983–1990", song:"Welcome to the Jungle",         artist:"Guns N' Roses",         note:"The Straw Man's power and menace were personified by Guns N' Roses. The most feared swing in Mets history needed the most feared song." },
      { player:"Gary Carter",        era:"1985–1989", song:"The Kid's Theme",             artist:"Stadium PA",             note:"The Kid's enthusiasm and joy needed music that matched — Gary Carter brought pure positivity to every plate appearance." },
      { player:"Mike Piazza",        era:"1998–2005", song:"Kashmir",                       artist:"Led Zeppelin",           note:"The mightiest Met walks to the mightiest riff. Piazza's walk-up to Kashmir is the gold standard for a power hitter's song choice." },
      { player:"Carlos Beltran",     era:"2005–2011", song:"Lean Back",                     artist:"Fat Joe",                note:"Puerto Rican pride in the Bronx by way of Flushing — Beltran's walk-up was a statement about who he was and where he was from." },
      { player:"David Wright",       era:"2004–2018", song:"Empire State of Mind",          artist:"JAY-Z & Alicia Keys",    note:"The Captain of the Mets claimed NYC's anthem — and Mets fans will never argue. David Wright IS New York." },
      { player:"Jose Reyes",         era:"2003–2011", song:"Ven Bailalo",                   artist:"Alexis & Fido",          note:"The most electric leadoff hitter the Mets ever had used reggaeton energy to announce himself — and Citi Field rocked every time." },
      { player:"Francisco Lindor",   era:"2021–present",song:"My Girl",                    artist:"The Temptations",        note:"The most beloved walk-up in Mets recent history — Citi Field sings along every time. Lindor tried to change it and was told no by the fans." },
      { player:"Pete Alonso",        era:"2019–2024", song:"All I Do Is Win",               artist:"DJ Khaled",              note:"The Polar Bear's power earned this walk-up — now an ex-Met, but his 254 home runs as a Met will never be forgotten." },
      { player:"Edwin Diaz",         era:"2019–2024", song:"Narco",                         artist:"Blasterjaxx & Timmy Trumpet", note:"The most iconic entrance theme in all of baseball. Narco playing meant the game was over. Diaz opted out after 2025 — but Citi Field still plays it in his honor." },
      { player:"Juan Soto",          era:"2025–present",song:"Empire State of Mind",        artist:"JAY-Z & Alicia Keys",    note:"$765M later, Soto claimed NYC's anthem at Citi Field — the most expensive walk-up in baseball history." },
      { player:"Jacob deGrom",       era:"2014–2022", song:"Crazy Train",                   artist:"Ozzy Osbourne",          note:"Two Cy Youngs and a walk-up that matched his dominance — deGrom taking the mound to Crazy Train was appointment viewing." },
    ],
  };

  const TEAMS = Object.keys(LEGENDARY_SONGS);

  return (
    <div style={styles.spinRoot}>
      <div style={styles.spinHeader}>
        <h2 style={styles.spinTitle}>🎵 NY SPORTS WALK-UP SONGS</h2>
        <p style={styles.spinSub}>LEGENDARY SONGS ACROSS THE ERAS · YANKEES & METS</p>
      </div>

      {/* Live links banner */}
      <div style={{marginBottom:20, padding:"12px 16px", background:"#111", border:"1px solid #2a2a2a", borderLeft:"3px solid #c8201c"}}>
        <div style={{fontSize:9, fontWeight:900, color:"#c8201c", letterSpacing:"0.12em", marginBottom:8}}>🔗 CURRENT SEASON WALK-UP SONGS — CHECK LIVE</div>
        <p style={{margin:"0 0 10px", fontSize:11, color:"#888", lineHeight:1.5}}>Walk-up songs change every season and sometimes mid-season. For the most current songs, check these official sources:</p>
        <div style={{display:"flex", gap:8, flexWrap:"wrap"}}>
          <a href="https://platemusic.com/team/yankees" target="_blank" rel="noopener noreferrer"
            style={{...styles.histLink, padding:"5px 12px", border:"1px solid #333", fontSize:10}}>⚾ Yankees Walk-Ups @ PlateMusic</a>
          <a href="https://platemusic.com/team/mets" target="_blank" rel="noopener noreferrer"
            style={{...styles.histLink, padding:"5px 12px", border:"1px solid #333", fontSize:10}}>⚾ Mets Walk-Ups @ PlateMusic</a>
          <a href="https://open.spotify.com/search/baseball%20walk%20up%20songs" target="_blank" rel="noopener noreferrer"
            style={{...styles.histLink, padding:"5px 12px", border:"1px solid #1DB954", fontSize:10, color:"#1DB954"}}>🎵 Find on Spotify</a>
          <a href="https://platemusic.com" target="_blank" rel="noopener noreferrer"
            style={{...styles.histLink, padding:"5px 12px", border:"1px solid #333", fontSize:10}}>🎵 All MLB Teams</a>
        </div>
      </div>

      {/* Team toggle */}
      <div style={{display:"flex", gap:6, marginBottom:16}}>
        {TEAMS.map(t => (
          <button key={t} onClick={() => setActiveTeam(t)}
            style={{...styles.filterBtn, ...(activeTeam===t ? styles.filterBtnActive : {}), fontSize:11, padding:"5px 16px"}}>
            {t === "Yankees" ? "⚾ Yankees" : "⚾ Mets"}
          </button>
        ))}
      </div>

      <div style={{marginBottom:8, padding:"8px 12px", background:"#161616", borderLeft:"2px solid #444", fontSize:10, color:"#666", fontStyle:"italic"}}>
        Legendary walk-up songs across all eras — from Shea Stadium to Citi Field, from the old Yankee Stadium to the new
      </div>

      {(LEGENDARY_SONGS[activeTeam] || []).map((s, i) => {
        const spotifyUrl = `https://open.spotify.com/search/${encodeURIComponent(s.song+" "+s.artist)}`;
        const ytUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(s.song+" "+s.artist)}`;
        const isActive = s.era.includes("present");
        return (
          <div key={i} style={{display:"flex", gap:12, padding:"12px 14px",
            borderBottom:"1px solid #1a1a1a",
            background: isActive ? "#0a120a" : i%2===0 ? "#0e0e0e" : "#111",
            borderLeft: isActive ? "3px solid #22c55e" : "3px solid transparent"}}>
            <div style={{flex:1, minWidth:0}}>
              <div style={{display:"flex", alignItems:"baseline", gap:8, flexWrap:"wrap", marginBottom:3}}>
                <span style={{fontSize:13, fontWeight:900, color:"#fff", fontFamily:"'Georgia',serif"}}>{s.player}</span>
                <span style={{fontSize:9, color:"#666", letterSpacing:"0.08em"}}>{s.era}</span>
                {isActive && <span style={{fontSize:9, color:"#22c55e", fontWeight:900}}>ACTIVE</span>}
              </div>
              <div style={{fontSize:12, color:"#FFD700", marginBottom:4}}>
                "{s.song}" — <span style={{color:"#aaa"}}>{s.artist}</span>
              </div>
              <div style={{fontSize:11, color:"#666", lineHeight:1.5, fontStyle:"italic"}}>{s.note}</div>
            </div>
            <div style={{display:"flex", flexDirection:"column", gap:4, flexShrink:0, alignSelf:"center"}}>
              <a href={spotifyUrl} target="_blank" rel="noopener noreferrer"
                style={{...styles.histLink, fontSize:9, padding:"3px 8px", border:"1px solid #1DB954", color:"#1DB954", textDecoration:"none", textAlign:"center"}}>
                🎵 Spotify
              </a>
              <a href={ytUrl} target="_blank" rel="noopener noreferrer"
                style={{...styles.histLink, fontSize:9, padding:"3px 8px", border:"1px solid #c00", color:"#c00", textDecoration:"none", textAlign:"center"}}>
                ▶ YouTube
              </a>
            </div>
          </div>
        );
      })}

      <div style={{marginTop:16, padding:"10px 14px", background:"#111", borderLeft:"2px solid #2a2a2a", fontSize:10, color:"#555"}}>
        💡 Walk-up songs change every season. This is our historical celebration of the greatest songs across the eras. For today\'s current songs, visit PlateMusic above.
      </div>
    </div>
  );
}


// ─── SPIN WHEEL TAB (facts wheel only, extracted from SpinTab) ─────────────
function SpinWheelTab() {
  const [rotation, setRotation]   = useState(0);
  const [spinning, setSpinning]   = useState(false);
  const [result, setResult]       = useState(null);
  const [fact, setFact]           = useState(null);
  const [loading, setLoading]     = useState(false);
  const spinStateRef              = useRef({ current: 0, target: 0, vel: 0, running: false });
  const rafRef                    = useRef(null);

  const N   = WHEEL_SEGMENTS.length;
  const DEG = 360 / N;

  function getWinner(rot) {
    const norm = ((rot % 360) + 360) % 360;
    const idx = Math.floor((360 - norm) / DEG) % N;
    return WHEEL_SEGMENTS[idx];
  }

  function spin() {
    if (spinning) return;
    setResult(null); setFact(null);
    const extraSpins  = (5 + Math.floor(Math.random() * 5)) * 360;
    const extraDeg    = Math.floor(Math.random() * 360);
    const target      = rotation + extraSpins + extraDeg;
    spinStateRef.current = { start: rotation, target, startTime: null };
    setSpinning(true);

    function ease(t) { return t < 0.5 ? 2*t*t : -1+(4-2*t)*t; }

    function animate(ts) {
      const s = spinStateRef.current;
      if (!s.startTime) s.startTime = ts;
      const elapsed  = ts - s.startTime;
      const duration = 3500 + Math.random() * 1000;
      const t        = Math.min(elapsed / duration, 1);
      const current  = s.start + (s.target - s.start) * ease(t);
      setRotation(current);
      if (t < 1) {
        rafRef.current = requestAnimationFrame(animate);
      } else {
        setRotation(s.target);
        setSpinning(false);
        const winner = getWinner(s.target);
        setResult(winner);
        fetchFact(winner.label);
      }
    }
    rafRef.current = requestAnimationFrame(animate);
  }

  async function fetchFact(team) {
    setLoading(true);
    try {
      const TEAM_MAP = {
        "YANKEES":"YANKEES","METS":"METS","JETS":"JETS","GIANTS":"GIANTS",
        "KNICKS":"KNICKS","RANGERS":"RANGERS","ISLANDERS":"ISLANDERS",
        "NETS":"NETS","LIBERTY":"LIBERTY","DEVILS":"DEVILS",
        "RED BULLS":"RED BULLS","GOTHAM FC":"GOTHAM FC","NYCFC":"NYCFC",
      };
      const teamKey = TEAM_MAP[team];
      const row = teamKey
        ? await sbRandom("ny_spin_facts", `team=eq.${encodeURIComponent(teamKey)}&`)
        : await sbRandom("ny_spin_facts");
      setFact(row || null);
    } catch(e) { setFact(null); }
    setLoading(false);
  }

  const CATEGORY_COLORS = {
    stat:   { bg:"#003087", text:"#fff", label:"📊 STAT"   },
    moment: { bg:"#c8201c", text:"#fff", label:"⚡ MOMENT" },
    record: { bg:"#FFD700", text:"#111", label:"🏆 RECORD" },
    legend: { bg:"#6B21A8", text:"#fff", label:"🌟 LEGEND" },
    weird:  { bg:"#065f46", text:"#fff", label:"🤔 WEIRD"  },
  };
  const catStyle = CATEGORY_COLORS[fact?.category] || CATEGORY_COLORS.weird;

  return (
    <div style={styles.spinRoot}>
      <div style={styles.spinHeader}>
        <h2 style={styles.spinTitle}>🎰 NY SPORTS SPIN</h2>
        <p style={styles.spinSub}>SPIN FOR A RANDOM NY SPORTS FACT</p>
      </div>

      <div style={styles.spinArena}>
        <div style={styles.spinPointer}>▼</div>
        <div style={{transform:`rotate(${rotation}deg)`, transition:"none", display:"flex", alignItems:"center", justifyContent:"center"}}>
          <SVGWheel rotation={0} />
        </div>
      </div>

      <div style={{textAlign:"center", margin:"24px 0 12px"}}>
        <button onClick={spin} disabled={spinning}
          style={{...styles.spinBtn, opacity: spinning ? 0.6 : 1, cursor: spinning ? "default" : "pointer"}}>
          {spinning ? "SPINNING..." : "🎰 SPIN THE WHEEL"}
        </button>
      </div>

      {result && (
        <div style={{...styles.spinResult, borderColor: result.color}}>
          <div style={{fontSize:24, marginBottom:6}}>{result.emoji}</div>
          <div style={{fontSize:11, fontWeight:900, color: result.color, letterSpacing:"0.15em", marginBottom:4}}>
            {result.label}
          </div>
          {loading ? (
            <div style={{fontSize:12, color:"#666"}}>Loading fact...</div>
          ) : fact ? (
            <>
              <div style={{display:"inline-block", padding:"2px 8px", borderRadius:2, fontSize:9, fontWeight:900,
                letterSpacing:"0.1em", background: catStyle.bg, color: catStyle.text, marginBottom:8}}>
                {catStyle.label}
              </div>
              <div style={{fontSize:11, color:"#888", marginBottom:6, fontStyle:"italic"}}>{fact.teaser}</div>
              <p style={{fontSize:13, color:"#e8e0d0", lineHeight:1.6, margin:0, fontFamily:"'Georgia',serif"}}>{fact.fact}</p>
            </>
          ) : (
            <p style={{fontSize:13, color:"#888"}}>Spin to get a random NY sports fact!</p>
          )}
        </div>
      )}
    </div>
  );
}

// ─── BIRTHDAYS TODAY TAB ──────────────────────────────────────────────────
function BirthdaysTab() {
  const today = new Date();
  const month = today.getMonth() + 1;
  const day   = today.getDate();
  const dateStr = today.toLocaleDateString("en-US", {month:"long", day:"numeric"});

  const ALL_BIRTHDAYS = [
    { month:1,  day:7,  name:"Willie Randolph",   team:"Yankees",   year:1954, sport:"MLB", note:"Yankees 2B and later Mets manager — played on four World Series teams" },
    { month:1,  day:10, name:"Rod Gilbert",        team:"Rangers",   year:1941, sport:"NHL", note:"Rangers' all-time scoring leader — 406 goals, 1,021 points in pinstripes" },
    { month:1,  day:14, name:"Carl Banks",         team:"Giants",    year:1962, sport:"NFL", note:"LB on two Super Bowl championship Giants teams alongside Lawrence Taylor" },
    { month:1,  day:17, name:"Hakeem Nicks",       team:"Giants",    year:1988, sport:"NFL", note:"Key WR on the 2012 Super Bowl Giants team" },
    { month:1,  day:19, name:"Phil Simms",         team:"Giants",    year:1954, sport:"NFL", note:"Giants QB who went 22/25 in Super Bowl XXI — 88% completion rate" },
    { month:1,  day:21, name:"Jack Nicklaus",      team:"US Open",   year:1940, sport:"Golf", note:"Won the US Open at Baltusrol NJ twice — the greatest golfer ever" },
    { month:1,  day:26, name:"Wayne Gretzky",      team:"Rangers",   year:1961, sport:"NHL", note:"The Great One wore Ranger blue at the end of his legendary career" },
    { month:2,  day:1,  name:"Don Maynard",        team:"Jets",      year:1935, sport:"NFL", note:"First great Jets wide receiver — caught Joe Namath's passes to glory" },
    { month:2,  day:6,  name:"Babe Ruth",          team:"Yankees",   year:1895, sport:"MLB", note:"The Sultan of Swat. 714 career HR. The greatest Yankee ever." },
    { month:2,  day:9,  name:"Fran Tarkenton",     team:"Giants",    year:1940, sport:"NFL", note:"Scrambling QB who changed the Giants offense in the 1960s" },
    { month:2,  day:18, name:"John McEnroe",       team:"US Open",   year:1959, sport:"Tennis", note:"Queens-born tennis legend — 4x US Open champion at Flushing Meadows" },
    { month:2,  day:22, name:"Julius Erving",      team:"Nets",      year:1950, sport:"NBA", note:"Dr. J — two ABA championships with the NY Nets. The most electrifying player ever." },
    { month:3,  day:2,  name:"Mel Stottlemyre",    team:"Yankees",   year:1941, sport:"MLB", note:"Yankees ace and legendary pitching coach — three World Series teams" },
    { month:3,  day:12, name:"Tug McGraw",         team:"Mets",      year:1944, sport:"MLB", note:"Ya Gotta Believe! The 1973 Mets reliever who coined the greatest rallying cry" },
    { month:3,  day:18, name:"Adam Clayton Powell III", team:"NY",  year:1946, sport:"Boxing", note:"NY sports patron — Madison Square Garden's most storied fights" },
    { month:3,  day:20, name:"Pat Riley",          team:"Knicks",    year:1945, sport:"NBA", note:"Coached the Knicks to the 1994 Finals — the closest they've come since 1973" },
    { month:3,  day:21, name:"Gary Carter",        team:"Mets",      year:1954, sport:"MLB", note:"'The Kid' — the heart of the 1986 champion Mets. Called the greatest catcher of his era." },
    { month:3,  day:23, name:"Moses Malone",       team:"Nets",      year:1955, sport:"NBA", note:"Brief time with NJ Nets — Hall of Fame center and NBA legend" },
    { month:4,  day:8,  name:"Yogi Berra",         team:"Yankees",   year:1925, sport:"MLB", note:"It ain't over till it's over. 10x World Series champion. The greatest catcher in baseball history." },
    { month:4,  day:11, name:"Reggie Jackson",     team:"Yankees",   year:1946, sport:"MLB", note:"Mr. October — three home runs on three pitches in Game 6 of the 1977 World Series" },
    { month:4,  day:12, name:"Joe Namath",         team:"Jets",      year:1943, sport:"NFL", note:"Broadway Joe — guaranteed the Super Bowl III win and delivered. The greatest Jet ever." },
    { month:4,  day:18, name:"Mickey Rivers",      team:"Yankees",   year:1948, sport:"MLB", note:"Speedy CF on the 1977-78 championship Yankees teams" },
    { month:4,  day:28, name:"Bucky Dent",         team:"Yankees",   year:1951, sport:"MLB", note:"His 1978 playoff home run at Fenway is one of the most iconic in baseball history" },
    { month:5,  day:6,  name:"Willie Mays",        team:"NY Giants", year:1931, sport:"MLB", note:"The Say Hey Kid — possibly the greatest all-around player ever. Debuted with the NY Giants at the Polo Grounds." },
    { month:5,  day:9,  name:"Pancho Gonzales",    team:"US Open",   year:1928, sport:"Tennis", note:"One of the greatest players in US Open history at Forest Hills and Flushing" },
    { month:5,  day:14, name:"Dennis Martinez",    team:"Mets",      year:1955, sport:"MLB", note:"Veteran pitcher who closed out his career with the Mets" },
    { month:5,  day:17, name:"Sugar Ray Leonard",  team:"MSG",       year:1956, sport:"Boxing", note:"Had legendary fights at Madison Square Garden — the best arena for boxing" },
    { month:5,  day:20, name:"Mike Richter",       team:"Rangers",   year:1966, sport:"NHL", note:"Goaltender hero of the 1994 Stanley Cup championship — saved 4,000 shots that postseason" },
    { month:5,  day:24, name:"John Elway",         team:"Giants",    year:1960, sport:"NFL", note:"Lost to the Giants in Super Bowl XXI — Simms' masterpiece performance" },
    { month:6,  day:1,  name:"Ron Swoboda",        team:"Mets",      year:1945, sport:"MLB", note:"Made the greatest catch in 1969 World Series history to preserve Tom Seaver's gem" },
    { month:6,  day:3,  name:"Allen Iverson",      team:"Knicks",    year:1975, sport:"NBA", note:"Faced the Knicks in memorable playoff battles — the Answer at MSG" },
    { month:6,  day:6,  name:"Björn Borg",         team:"US Open",   year:1956, sport:"Tennis", note:"Won the US Open at Flushing Meadows — a tennis legend in New York" },
    { month:6,  day:9,  name:"Les Borden",         team:"Yankees",   year:1938, sport:"MLB", note:"Part of the rich Yankees organizational history" },
    { month:6,  day:11, name:"Mike Ditka",         team:"Giants",    year:1939, sport:"NFL", note:"Faced the Giants as a rival — legendary NFL figure connected to NY football history" },
    { month:6,  day:19, name:"Lou Gehrig",         team:"Yankees",   year:1903, sport:"MLB", note:"The Iron Horse. 2,130 consecutive games. 'The luckiest man on the face of the earth.' The greatest Yankee who ever lived." },
    { month:6,  day:21, name:"Bernard King",       team:"Knicks",    year:1956, sport:"NBA", note:"Scored 60 points at MSG — the most unstoppable scorer in Knicks history" },
    { month:6,  day:25, name:"Willis Reed",        team:"Knicks",    year:1942, sport:"NBA", note:"Limped onto the court in Game 7 of the 1970 Finals — the greatest moment in Knicks history" },
    { month:7,  day:2,  name:"Dave Winfield",      team:"Yankees",   year:1951, sport:"MLB", note:"Hall of Fame OF who battled Steinbrenner — 'Mr. May' redeemed himself many times over" },
    { month:7,  day:4,  name:"Marcelino Lopez",    team:"Yankees",   year:1943, sport:"MLB", note:"Part of the rich Yankees pitching history in their dynasty years" },
    { month:7,  day:6,  name:"Bill Johnson",       team:"Rangers",   year:1949, sport:"NHL", note:"Rangers goaltender who played during some of the team's toughest years" },
    { month:7,  day:8,  name:"Billy Wagner",       team:"Mets",      year:1971, sport:"MLB", note:"Mets closer with a 95+ mph fastball — one of the most dominant relievers of his era" },
    { month:7,  day:11, name:"George Bell",        team:"Yankees",   year:1959, sport:"MLB", note:"Played for the Yankees — part of the team's rich 1980s history" },
    { month:7,  day:17, name:"Elston Howard",      team:"Yankees",   year:1929, sport:"MLB", note:"First Black Yankee — 1963 AL MVP, beloved captain and 9x World Series participant" },
    { month:7,  day:18, name:"Patrick Ewing",      team:"Knicks",    year:1962, sport:"NBA", note:"The franchise cornerstone — 23,665 points in 15 Knick seasons. Always a champion in our hearts." },
    { month:7,  day:22, name:"Bobby Thomson",      team:"Giants",    year:1923, sport:"MLB", note:"The Shot Heard Round the World — October 3, 1951. The most famous home run in baseball history." },
    { month:7,  day:28, name:"Tom Brady",          team:"Giants",    year:1977, sport:"NFL", note:"Lost two Super Bowls to the Giants — Eli Manning's greatest nemesis" },
    { month:8,  day:4,  name:"Roger Clemens",      team:"Yankees",   year:1962, sport:"MLB", note:"The Rocket won two Cy Youngs in pinstripes — but his career legacy is complicated" },
    { month:8,  day:7,  name:"David Cone",         team:"Yankees",   year:1963, sport:"MLB", note:"Threw a perfect game on Yogi Berra Day, 1999 — one of the most perfect moments in baseball" },
    { month:8,  day:8,  name:"Brent Musburger",    team:"NY Sports", year:1939, sport:"Broadcasting", note:"Legendary broadcaster who called so many great NY sports moments" },
    { month:8,  day:12, name:"Mark Messier",       team:"Rangers",   year:1961, sport:"NHL", note:"The Captain — guaranteed the 1994 Stanley Cup win, then delivered with a natural hat trick. The greatest Ranger ever." },
    { month:8,  day:16, name:"Frank Gifford",      team:"Giants",    year:1930, sport:"NFL", note:"The most glamorous Giant of his era — All-Pro player turned legendary broadcaster" },
    { month:8,  day:18, name:"Denis Potvin",       team:"Islanders", year:1953, sport:"NHL", note:"Led the Islanders to four consecutive Stanley Cups — the greatest defenseman of his era" },
    { month:8,  day:20, name:"Reggie Miller",      team:"Knicks",    year:1965, sport:"NBA", note:"The villain — scored 8 points in 9 seconds to destroy the Knicks. MSG hated and loved him." },
    { month:8,  day:24, name:"Mike Bossy",         team:"Islanders", year:1957, sport:"NHL", note:"Nine consecutive 50-goal seasons — the most prolific scorer in Islander history" },
    { month:8,  day:28, name:"Phil Rizzuto",       team:"Yankees",   year:1917, sport:"MLB", note:"Holy Cow! The Scooter — SS and beloved broadcaster for the Yankees for 40 years" },
    { month:9,  day:1,  name:"Rocky Marciano",     team:"MSG",       year:1923, sport:"Boxing", note:"Fought legendary bouts at MSG — the only undefeated heavyweight champion ever" },
    { month:9,  day:5,  name:"Jesse James",        team:"Giants",    year:1987, sport:"NFL", note:"Part of the Giants' proud tradition at a key position" },
    { month:9,  day:9,  name:"Whitey Ford",        team:"Yankees",   year:1928, sport:"MLB", note:"The Chairman of the Board — 10x World Series, .690 WS winning percentage, the greatest Yankee pitcher ever" },
    { month:9,  day:11, name:"Tom Landry",         team:"Giants",    year:1924, sport:"NFL", note:"Defensive coordinator for the Giants before becoming Cowboys legend — shaped NY football" },
    { month:9,  day:13, name:"Dave DeBusschere",   team:"Knicks",    year:1940, sport:"NBA", note:"Power forward on both championship Knicks teams — beloved New Yorker and true team player" },
    { month:9,  day:19, name:"Joe Morgan",         team:"Mets",      year:1943, sport:"MLB", note:"Brief time managing the Mets — the Hall of Famer brought his winning pedigree to Queens" },
    { month:9,  day:23, name:"Larry Doby",         team:"Yankees",   year:1923, sport:"MLB", note:"Second Black player in MLB — briefly with the Yankees, forever part of baseball's civil rights story" },
    { month:9,  day:27, name:"Mike Schmidt",       team:"Phillies",  year:1949, sport:"MLB", note:"Rivals of the Mets — the greatest third baseman ever who tormented NY for decades" },
    { month:9,  day:29, name:"Bryant Gumbel",      team:"NY Media",  year:1948, sport:"Broadcasting", note:"NY sports broadcasting legend — his coverage of Yankees and NY sports is iconic" },
    { month:10, day:1,  name:"Rod Carew",          team:"Yankees",   year:1945, sport:"MLB", note:"Hall of Famer who played his final years as an AL rival — one of the greatest hitters ever" },
    { month:10, day:5,  name:"Mario Lemieux",      team:"Rangers",   year:1965, sport:"NHL", note:"Rangers' greatest rival in the early 90s — faced the Rangers in classic playoff battles" },
    { month:10, day:13, name:"Rickey Henderson",   team:"Yankees",   year:1958, sport:"MLB", note:"The greatest leadoff hitter ever — stole 93 bases in his first Yankee season (1985)" },
    { month:10, day:17, name:"Tom Seaver",         team:"Mets",      year:1944, sport:"MLB", note:"Tom Terrific — 311 wins, 2.86 ERA, three Cy Youngs. The greatest Met who ever lived." },
    { month:10, day:19, name:"Evander Holyfield",  team:"MSG",       year:1962, sport:"Boxing", note:"Four world heavyweight title fights at MSG — a boxing legend in the greatest boxing arena" },
    { month:10, day:21, name:"Whitey Herzog",      team:"Mets",      year:1931, sport:"MLB", note:"Manager and executive with the Mets organization before his Cardinals success" },
    { month:10, day:25, name:"Tracy Austin",       team:"US Open",   year:1962, sport:"Tennis", note:"Won the US Open at 16 — the youngest ever. Flushing Meadows legend." },
    { month:10, day:27, name:"Brian Leetch",       team:"Rangers",   year:1968, sport:"NHL", note:"First American to win the Conn Smythe — the greatest Rangers defenseman of the modern era" },
    { month:11, day:1,  name:"Gary Carter",        team:"Mets",      year:1954, sport:"MLB", note:"Double birthday entry — The Kid was born November 1, 1954. 1986 World Series champion." },
    { month:11, day:4,  name:"Ralph Branca",       team:"Giants",    year:1926, sport:"MLB", note:"Threw the pitch Bobby Thomson hit for the Shot Heard Round the World — the most famous pitch ever" },
    { month:11, day:6,  name:"Mike Richter",       team:"Rangers",   year:1966, sport:"NHL", note:"(Also listed in May — checking) — 1994 Stanley Cup hero" },
    { month:11, day:8,  name:"Jack Dempsey",       team:"MSG",       year:1895, sport:"Boxing", note:"The Manassa Mauler fought the most legendary bouts at MSG — the greatest fighter of the 1920s" },
    { month:11, day:14, name:"Joe Frazier",        team:"MSG",       year:1944, sport:"Boxing", note:"Smokin Joe — fought Ali three times, including the Fight of the Century at MSG in 1971" },
    { month:11, day:16, name:"Dwight Gooden",      team:"Mets",      year:1964, sport:"MLB", note:"Doc — 24-4, 1.53 ERA in 1985 at age 20. The most dominant young pitcher in baseball history." },
    { month:11, day:18, name:"Darryl Strawberry",  team:"Mets",      year:1962, sport:"MLB", note:"The Straw Man — 252 Mets HR, 8 All-Star selections. Enormous talent, complicated legacy." },
    { month:11, day:22, name:"Billie Jean King",   team:"US Open",   year:1943, sport:"Tennis", note:"The US Open's home court is named Billie Jean King National Tennis Center in her honor" },
    { month:11, day:26, name:"Dale Berra",         team:"Yankees",   year:1956, sport:"MLB", note:"Son of the great Yogi — played for the Yankees following his father's legendary footsteps" },
    { month:12, day:3,  name:"Walt Frazier",       team:"Knicks",    year:1945, sport:"NBA", note:"Clyde — the coolest man to ever play at MSG. Point guard on both championship Knicks teams. Broadcasting legend." },
    { month:12, day:9,  name:"Dick Butkus",        team:"Giants",    year:1942, sport:"NFL", note:"The greatest linebacker before LT — a rival who made the Giants better by being great" },
    { month:12, day:11, name:"John Kelly",         team:"NY Sports", year:1928, sport:"Broadcasting", note:"NY sports broadcasting pioneer" },
    { month:12, day:13, name:"Larry Doby",         team:"Yankees",   year:1923, sport:"MLB", note:"(See also Sept 23) — one of baseball's most important figures" },
    { month:12, day:16, name:"Frank Viola",        team:"Mets",      year:1960, sport:"MLB", note:"Cy Young winner who came to the Mets — part of the pitching rotation in the late 80s" },
    { month:12, day:19, name:"Reggie White",       team:"Giants",    year:1961, sport:"NFL", note:"The Minister of Defense — faced the Giants in legendary NFC battles" },
    { month:12, day:21, name:"Chris Evert",        team:"US Open",   year:1954, sport:"Tennis", note:"Won six US Opens — one of the greatest champions at Flushing Meadows" },
    { month:12, day:23, name:"Bob Gibson",         team:"Mets",      year:1935, sport:"MLB", note:"Cardinals legend who dominated the Mets in the 1960s — the most intimidating pitcher of his era" },
    { month:12, day:28, name:"Sidd Finch",         team:"Mets",      year:1985, sport:"MLB", note:"The legendary fictional 168 mph pitcher created by George Plimpton for Sports Illustrated — April Fools 1985" },
    { month:1, day:2,  year:1969, name:"Edgar Martinez",       team:"Yankees",   sport:"MLB",         note:"Faced the Yankees in memorable AL battles — one of the greatest DHs in baseball history" },
    { month:1, day:6,  year:1939, name:"Lou Holtz",            team:"Jets",      sport:"NFL",         note:"Briefly coached the Jets in 1976 — went 3-10 but moved on to college greatness at Notre Dame" },
    { month:1, day:9,  year:1934, name:"Bart Starr",           team:"Giants",    sport:"NFL",         note:"Defeated the Giants in the 1961 and 1962 NFL Championships — Green Bay legend vs NY pride" },
    { month:1, day:12, year:1951, name:"Howard Stern",         team:"NY Media",  sport:"Broadcasting",note:"The King of All Media — born in Queens, defined NY radio and pop culture for 40 years" },
    { month:1, day:13, year:1961, name:"Gheorghe Muresan",     team:"Nets",      sport:"NBA",         note:"The tallest player in NBA history at 7-foot-7 — briefly played for the New Jersey Nets" },
    { month:1, day:15, year:1943, name:"Arthur Ashe",          team:"US Open",   sport:"Tennis",      note:"First Black man to win the US Open 1968 — the stadium at Flushing Meadows bears his name" },
    { month:1, day:20, year:1966, name:"Edwin Diaz",           team:"Mets",      sport:"MLB",         note:"The Mets closer whose Narco entrance theme has become the most iconic walk-up in baseball" },
    { month:1, day:25, year:1882, name:"Christy Mathewson",    team:"NY Giants", sport:"MLB",         note:"The Big Six — greatest pitcher of the dead ball era, starred at the Polo Grounds for the NY Giants" },
    { month:1, day:28, year:1955, name:"Nick Price",           team:"US Open",   sport:"Golf",        note:"Won the PGA Championship twice — competed at Shinnecock Hills and Bethpage in US Opens" },
    { month:1, day:31, year:1947, name:"Nolan Ryan",           team:"Mets",      sport:"MLB",         note:"The Ryan Express began his career with the Mets — 5714 strikeouts started in Flushing Queens" },
    { month:2, day:3,  year:1943, name:"Bobby Murcer",         team:"Yankees",   sport:"MLB",         note:"The heir apparent to Mickey Mantle — beloved Yankee player and broadcaster for 40 years" },
    { month:2, day:4,  year:1954, name:"Dave Kingman",         team:"Mets",      sport:"MLB",         note:"Kong hit towering home runs for the Mets — once the franchise HR leader before Strawberry and Alonso" },
    { month:2, day:5,  year:1934, name:"Hank Aaron",           team:"Braves",    sport:"MLB",         note:"Broke Babe Ruth home run record — his 755 HR surpassed the Yankee legend who preceded him" },
    { month:2, day:11, year:1936, name:"Burt Reynolds",        team:"Giants",    sport:"NFL",         note:"The Longest Yard star — played football at FSU and brought the game to Hollywood biggest screen" },
    { month:2, day:17, year:1963, name:"Michael Jordan",       team:"Knicks",    sport:"NBA",         note:"His greatest rival was the Knicks — Patrick Ewing vs Jordan defined 1990s NBA basketball" },
    { month:2, day:21, year:1958, name:"Kelsey Grammer",       team:"Rangers",   sport:"NHL",         note:"Frasier star and avid Rangers fan — spotted at MSG regularly during the team championship years" },
    { month:2, day:26, year:1887, name:"Grover Cleveland Alexander", team:"Giants", sport:"MLB",      note:"Early pitching great who faced the NY Giants — one of the all-time strikeout leaders of the dead ball era" },
    { month:3, day:3,  year:1947, name:"James Worthy",         team:"Knicks",    sport:"NBA",         note:"Showtime Laker who faced the Knicks in memorable battles — Big Game James at the Garden" },
    { month:3, day:4,  year:1975, name:"David Beckham",        team:"Red Bulls", sport:"Soccer",      note:"Played against the NY Red Bulls with LA Galaxy — brought global soccer glamour to the NY market" },
    { month:3, day:6,  year:1944, name:"Willie Stargell",      team:"Mets",      sport:"MLB",         note:"Pittsburgh Pirates legend who faced the Mets in classic NL East battles — one of baseball greats" },
    { month:3, day:10, year:1958, name:"Sharon Stone",         team:"Rangers",   sport:"NHL",         note:"Basic Instinct star and Rangers fan — seen at MSG during the team 1994 championship run" },
    { month:3, day:16, year:1968, name:"Alan Shearer",         team:"Red Bulls", sport:"Soccer",      note:"Newcastle legend whose attacking style influenced the Premier League era that shaped NY soccer fandom" },
    { month:3, day:29, year:1943, name:"Denny McLain",         team:"Yankees",   sport:"MLB",         note:"The last 30-game winner in baseball history faced the Yankees in the AL during his 1968 Cy Young season" },
    { month:4, day:5,  year:1977, name:"Pharrell Williams",    team:"Knicks",    sport:"NBA",         note:"Happy producer and Knicks supporter — his music played at MSG during some of the franchise best moments" },
    { month:4, day:13, year:1939, name:"Seymour Siwoff",       team:"Yankees",   sport:"Broadcasting",note:"Elias Sports Bureau founder — defined baseball statistics in New York for 50 years" },
    { month:4, day:14, year:1941, name:"Pete Rose",            team:"Mets",      sport:"MLB",         note:"Hit King faced the Mets countless times — his career hit record stands forever whatever else is said" },
    { month:4, day:15, year:1947, name:"Kareem Abdul-Jabbar",  team:"Knicks",    sport:"NBA",         note:"Greatest scorer in NBA history faced the Knicks in legendary battles — 38387 career points" },
    { month:4, day:27, year:1922, name:"Jack Klugman",         team:"Mets",      sport:"MLB",         note:"The Odd Couple Oscar Madison was a Mets fan — Klugman himself was a genuine baseball enthusiast" },
    { month:5, day:7,  year:1939, name:"Johnny Unitas",        team:"Giants",    sport:"NFL",         note:"Defeated the Giants in the greatest game ever played at Yankee Stadium — overtime 1958 NFL Championship" },
    { month:5, day:15, year:1953, name:"George Brett",         team:"Yankees",   sport:"MLB",         note:"Pine Tar Game at Yankee Stadium — Brett pine tar bat controversy is one of baseball most iconic moments" },
    { month:5, day:21, year:1952, name:"Mr. T",                team:"MSG",       sport:"Boxing",      note:"I pity the fool who misses MSG boxing — Mr. T was a fixture in 1980s New York sports culture" },
    { month:5, day:23, year:1948, name:"Bill Parcells",        team:"Giants",    sport:"NFL",         note:"The Big Tuna — coached the Giants to two Super Bowls, built the greatest NY football dynasty of the 1980s" },
    { month:5, day:25, year:1963, name:"Mike Myers",           team:"Knicks",    sport:"NBA",         note:"Austin Powers star and hockey fan who became a Knicks supporter — the Garden welcomed him" },
    { month:6, day:20, year:1967, name:"Nicole Kidman",        team:"US Open",   sport:"Tennis",      note:"Regular US Open attendee at Flushing Meadows — Australian tennis royalty at the sport biggest stage" },
    { month:6, day:26, year:1950, name:"Chris Mullin",         team:"Knicks",    sport:"NBA",         note:"St. John and USA Dream Team legend — Brooklyn born, a quintessential New York basketball player" },
    { month:6, day:29, year:1966, name:"Mike Tyson",           team:"MSG",       sport:"Boxing",      note:"Iron Mike fought his greatest fights at MSG — the most fearsome heavyweight in New York boxing history" },
    { month:6, day:30, year:1985, name:"Michael Phelps",       team:"NY",        sport:"Swimming",    note:"Most decorated Olympian ever attended NY events — his 23 gold medals inspired NY sports fans everywhere" },
    { month:7, day:20, year:1873, name:"Cy Young",             team:"Giants",    sport:"MLB",         note:"The Cy Young Award bears his name — he faced the NY Giants and pitched in NYC during the dead ball era" },
    { month:7, day:23, year:1952, name:"Woody Harrelson",      team:"Knicks",    sport:"NBA",         note:"White Men Can Not Jump star and Knicks fan — seen at MSG courtside during the Patrick Ewing era" },
    { month:7, day:27, year:1948, name:"Peggy Fleming",        team:"MSG",       sport:"Figure Skating",note:"Olympic gold medalist who performed at MSG ice shows — a New York figure skating legend" },
    { month:8, day:11, year:1959, name:"Hulk Hogan",           team:"MSG",       sport:"Wrestling",   note:"Wrestled at MSG countless times — Madison Square Garden is the birthplace of WWF greatest moments" },
    { month:8, day:15, year:1950, name:"Princess Anne",        team:"US Open",   sport:"Tennis",      note:"British royalty attended the US Open at Flushing Meadows — a regular fixture at the tournament" },
    { month:8, day:19, year:1969, name:"Matthew Perry",        team:"Knicks",    sport:"NBA",         note:"Chandler Bing from Friends — the show set in NYC made the Knicks the sitcom world default team" },
    { month:8, day:22, year:1934, name:"H. Norman Schwarzkopf",team:"Giants",    sport:"NFL",         note:"General Stormin Norman attended Giants games — the Gulf War hero was a proud New Jersey resident" },
    { month:9, day:2,  year:1948, name:"Terry Bradshaw",       team:"Giants",    sport:"NFL",         note:"Steelers legend who defeated the Giants in memorable Super Bowl era battles — his rivalry with NY defined an era" },
    { month:9, day:10, year:1960, name:"Colin Firth",          team:"US Open",   sport:"Tennis",      note:"British acting royalty who attended the US Open at Flushing Meadows — a tennis fan in America greatest city" },
    { month:9, day:16, year:1956, name:"Mickey Rourke",        team:"MSG",       sport:"Boxing",      note:"The Wrestler star who actually boxed — appeared at MSG boxing events during his brief fighting career" },
    { month:9, day:25, year:1968, name:"Will Smith",           team:"Knicks",    sport:"NBA",         note:"The Fresh Prince grew up in Philly but his NY years made the Knicks his adopted team" },
    { month:10, day:18, year:1956, name:"Martina Navratilova", team:"US Open",   sport:"Tennis",      note:"Won four US Open titles at Flushing Meadows — one of the all-time greats in tennis who called NY home" },
    { month:10, day:23, year:1940, name:"Pele",                team:"Cosmos",    sport:"Soccer",      note:"The greatest soccer player ever played for the NY Cosmos 1975-77 — brought the beautiful game to NYC" },
    { month:10, day:24, year:1969, name:"Wayne Rooney",        team:"Red Bulls", sport:"Soccer",      note:"England legend whose NY Red Bulls connection represents the Premier League influence on New York soccer" },
    { month:11, day:3,  year:1952, name:"Roseanne Barr",       team:"Mets",      sport:"MLB",         note:"Roseanne star whose famously bad national anthem at Fenway made every Mets fan feel better about their team" },
    { month:11, day:11, year:1962, name:"Demi Moore",          team:"Rangers",   sport:"NHL",         note:"Ghost star who attended Rangers games at MSG during her 1990s Hollywood peak" },
    { month:11, day:20, year:1962, name:"Ming Yao",            team:"Knicks",    sport:"NBA",         note:"The 7-foot-6 Rockets center who battled the Knicks in memorable games — one of the game great big men" },
    { month:12, day:2,  year:1968, name:"Lucy Liu",            team:"Knicks",    sport:"NBA",         note:"Born in Queens — Kill Bill and Charlies Angels star who grew up watching Knicks games at MSG" },
    { month:12, day:7,  year:1956, name:"Larry Bird",          team:"Knicks",    sport:"NBA",         note:"Celtic legend whose rivalry with the Knicks defined the most intense NBA battles at Madison Square Garden" },
    { month:12, day:17, year:1946, name:"Bill Moyers",         team:"NY Media",  sport:"Broadcasting",note:"PBS anchor and political journalist who made NYC his base — the conscience of New York broadcasting" },
    { month:12, day:25, year:1945, name:"Larry Csonka",        team:"Giants",    sport:"NFL",         note:"Miami Dolphins fullback who crushed the Giants in memorable AFC-NFC battles — the ground and pound legend" },
    { month:2, day:14, year:1948, name:"Ken Dryden",          team:"Rangers",   sport:"NHL",         note:"Hall of Fame goalie who stopped Rangers cold in the 1970s — his Montreal dynasty was NY hockey nightmare fuel" },
    { month:2, day:16, year:1920, name:"Patty Berg",          team:"US Open",   sport:"Golf",        note:"Golf legend and one of the founders of the LPGA Tour — women golf trailblazer who competed near NYC" },
    { month:2, day:28, year:1942, name:"Bubba Smith",         team:"Jets",      sport:"NFL",         note:"Police Academy star and NFL great who faced the Jets in memorable AFC battles during his Colts days" },
    { month:5, day:12, year:1925, name:"Yogi Berra",          team:"Yankees",   sport:"MLB",         note:"It ain t over till it s over. 10x World Series champion. The greatest catcher in baseball history. Born May 12 1925." },
    { month:7, day:10, year:1943, name:"Arthur Ashe",         team:"US Open",   sport:"Tennis",      note:"Also remembered on Jan 15 — his US Open legacy at the stadium bearing his name is eternal in Flushing" },
    { month:7, day:30, year:1947, name:"Arnold Schwarzenegger",team:"MSG",      sport:"Bodybuilding", note:"Mr. Olympia competed at Madison Square Garden — the Terminator built his legend at the world most famous arena" },
    { month:10, day:30, year:1937, name:"Claude Lemieux",     team:"Devils",    sport:"NHL",         note:"Three-time Stanley Cup winner including with the Devils — one of the most polarizing players in NHL history" },
    { month:1,  day:1,  name:"Branch Rickey",         team:"Yankees",    year:1881, sport:"MLB",    note:"Executive who helped shape baseball's integration era and faced the Yankees as Brooklyn Dodgers GM" },
    { month:1,  day:3,  name:"Bobby Hull",               team:"Rangers",    year:1939, sport:"NHL",    note:"The Golden Jet whose booming slap shot terrorized Rangers goalies for two decades" },
    { month:1,  day:4,  name:"Don Shula",                team:"Jets",       year:1930, sport:"NFL",    note:"Dolphins coach who went 17-0 in 1972 — his AFC East battles with the Jets defined the decade" },
    { month:1,  day:5,  name:"Lenny Moore",              team:"Giants",     year:1933, sport:"NFL",    note:"Colts HB who shredded the Giants in the 1958 and 1959 NFL Championships" },
    { month:1,  day:8,  name:"Floyd Patterson",          team:"MSG",        year:1935, sport:"Boxing", note:"Two-time heavyweight champion whose MSG bouts are the gold standard of New York boxing" },
    { month:1,  day:11, name:"Joe Frazier",              team:"MSG",        year:1944, sport:"Boxing", note:"Smokin Joe fought Ali three times including the Fight of the Century at MSG in 1971 — boxing royalty" },
    { month:1,  day:16, name:"A.J. Foyt",                team:"NY",         year:1935, sport:"Racing", note:"Four-time Indianapolis 500 winner who raced at Watkins Glen, New York's legendary road course" },
    { month:1,  day:18, name:"Bobby Carpenter",          team:"Devils",     year:1963, sport:"NHL",    note:"Washington Capitals star who faced the Devils in Metro Division battles throughout the 1980s" },
    { month:1,  day:22, name:"Oscar Robertson",          team:"Knicks",     year:1938, sport:"NBA",    note:"The Big O averaged a triple-double for an entire season — his battles against the Knicks defined the era" },
    { month:1,  day:23, name:"John Riggins",             team:"Giants",     year:1949, sport:"NFL",    note:"Redskins RB who ran over NFL opponents — his battles against the Giants defined NFC power football" },
    { month:1,  day:24, name:"Mark Bavaro",              team:"Giants",     year:1963, sport:"NFL",    note:"The most feared blocking TE of the 1980s — Bavaro dragged defenders during the Giants Super Bowl runs" },
    { month:1,  day:27, name:"Nick Buoniconti",          team:"Jets",       year:1940, sport:"NFL",    note:"Dolphins LB who engineered the perfect 1972 season — his AFC East battles with the Jets were legendary" },
    { month:1,  day:29, name:"Dave DeBusschere",         team:"Knicks",     year:1940, sport:"NBA",    note:"The trade from Detroit completed the Knicks' dynasty — power forward on both championship teams" },
    { month:1,  day:30, name:"Ernie Banks",              team:"Mets",       year:1931, sport:"MLB",    note:"Mr. Cub faced the Mets in memorable NL battles — 512 career HR and the most beloved Cub ever" },
    { month:2,  day:2,  name:"Red Holzman",              team:"Knicks",     year:1920, sport:"NBA",    note:"The greatest Knicks coach ever — won back-to-back championships in 1970 and 1973 with team basketball" },
    { month:2,  day:7,  name:"Bob Waterfield",           team:"Giants",     year:1920, sport:"NFL",    note:"Rams QB and Hall of Famer whose teams faced the Giants in classic early NFL battles" },
    { month:2,  day:8,  name:"Ted Williams",             team:"Yankees",    year:1918, sport:"MLB",    note:"The Splendid Splinter batted .406 in 1941 — his epic rivalry with the Yankees defined the AL for two decades" },
    { month:2,  day:10, name:"Alex Karras",              team:"Giants",     year:1935, sport:"NFL",    note:"Lions DT who terrorized NFL offenses including the Giants — one of the most dominant interior linemen ever" },
    { month:2,  day:13, name:"Chuck Noll",               team:"Jets",       year:1932, sport:"NFL",    note:"Steelers coach who defeated the Jets in memorable battles — four Super Bowl wins in the greatest dynasty" },
    { month:2,  day:15, name:"Norm Van Brocklin",        team:"Giants",     year:1926, sport:"NFL",    note:"The Dutchman's Eagles beat the Giants in the 1960 NFL Championship — one of NY's most painful losses" },
    { month:2,  day:19, name:"Tony Conigliaro",          team:"Yankees",    year:1945, sport:"MLB",    note:"Red Sox slugger whose tragic beaning shocked baseball — his rivalry with Yankee pitchers was electric" },
    { month:2,  day:20, name:"Monte Irvin",              team:"Giants",     year:1919, sport:"MLB",    note:"NY Giants legend and Hall of Famer — one of the first Black stars in major league baseball" },
    { month:2,  day:23, name:"Bobby Clarke",             team:"Rangers",    year:1949, sport:"NHL",    note:"Flyers captain whose ferocious play made him the Rangers' most despised opponent in the Broad Street Bullies era" },
    { month:2,  day:24, name:"Cal Ripken Jr.",           team:"Yankees",    year:1960, sport:"MLB",    note:"The Iron Man — 2632 consecutive games echoes Lou Gehrig's legacy. His Orioles-Yankees AL battles were epic." },
    { month:2,  day:25, name:"Jerry West",               team:"Knicks",     year:1938, sport:"NBA",    note:"The Logo's Lakers faced the Knicks in the 1970 and 1972 NBA Finals — two of the greatest championship series" },
    { month:2,  day:27, name:"James Lofton",             team:"Giants",     year:1956, sport:"NFL",    note:"Hall of Fame WR who faced the Giants throughout his career — one of the fastest players in NFL history" },
    { month:2,  day:29, name:"Al Rosen",                 team:"Yankees",    year:1924, sport:"MLB",    note:"Indians 3B who nearly beat the Yankees for the 1952 AL MVP — 43 HR in 1953 was the AL's gold standard" },
    { month:3,  day:1,  name:"Sam Jones",                team:"Knicks",     year:1933, sport:"NBA",    note:"Celtics guard whose shooting wrist terrorized Knicks fans for a decade — 10 championships against NY" },
    { month:3,  day:5,  name:"Willie Stargell",          team:"Mets",       year:1940, sport:"MLB",    note:"Pops faced the Mets in NL East battles — his 1979 world champion Pirates are the Mets' greatest rival" },
    { month:3,  day:7,  name:"Jim Rice",                 team:"Yankees",    year:1953, sport:"MLB",    note:"Red Sox DH/LF whose monster AL East rivalries with the Yankees are among baseball's greatest divisional wars" },
    { month:3,  day:8,  name:"Bob Watson",               team:"Yankees",    year:1946, sport:"MLB",    note:"First Black GM to win a World Series — his Yankees won the 1996 title. A true Yankees history maker." },
    { month:3,  day:9,  name:"Ed Giacomin",              team:"Rangers",    year:1939, sport:"NHL",    note:"Fast Eddie — beloved Rangers goalie who wept openly when traded to Detroit. Ten seasons of brilliance." },
    { month:3,  day:11, name:"Thurman Munson",           team:"Yankees",    year:1947, sport:"MLB",    note:"The Captain — the heart of the Yankees dynasty. Gone too soon on August 2, 1979. We will never forget." },
    { month:3,  day:13, name:"Bernie Parent",            team:"Rangers",    year:1945, sport:"NHL",    note:"Flyers goalie whose back-to-back Vezinas crushed Rangers championship hopes in 1974-75 — the most frustrating rival" },
    { month:3,  day:14, name:"Len Dawson",               team:"Jets",       year:1935, sport:"NFL",    note:"Chiefs QB who faced the Jets in AFL battles — his Super Bowl IV win cemented the AFL's legitimacy after Namath" },
    { month:3,  day:15, name:"Norm Ullman",              team:"Rangers",    year:1935, sport:"NHL",    note:"Detroit Red Wings center who battled the Rangers in Original Six showdowns — 490 career goals" },
    { month:3,  day:17, name:"Don Zimmer",               team:"Yankees",    year:1931, sport:"MLB",    note:"Long-time Yankees bench coach under Joe Torre — Zim sat next to Torre for four championships" },
    { month:3,  day:19, name:"Richie Allen",             team:"Mets",       year:1942, sport:"MLB",    note:"Dick Allen's fiery bat and personality — 351 career HR and a force in the NL during the Mets' formative years" },
    { month:3,  day:22, name:"Walt Bellamy",             team:"Knicks",     year:1939, sport:"NBA",    note:"Knicks center who averaged 31 points as a rookie in 1962 — a foundational piece before the championship era" },
    { month:3,  day:24, name:"Honus Wagner",             team:"Yankees",    year:1874, sport:"MLB",    note:"The Flying Dutchman — his T206 card is the most valuable in history, and his Pirates faced the early Yankees" },
    { month:3,  day:25, name:"Joe Torre",                team:"Yankees",    year:1940, sport:"MLB",    note:"Four World Series rings as manager. The classiest bench boss in franchise history. A Bronx legend forever." },
    { month:3,  day:26, name:"Gale Sayers",              team:"Giants",     year:1943, sport:"NFL",    note:"The Kansas Comet — his explosive running terrified NFL defenses including the Giants in his brief brilliant career" },
    { month:3,  day:27, name:"Sparky Anderson",          team:"Yankees",    year:1934, sport:"MLB",    note:"Captain Hook's Reds beat the Yankees in the 1976 World Series sweep — motivating the Bronx Zoo to win in 1977" },
    { month:3,  day:28, name:"Bob Horner",               team:"Mets",       year:1957, sport:"MLB",    note:"Braves slugger whose home runs at Shea Stadium were a regular occurrence — 215 career HR in NL East wars" },
    { month:3,  day:30, name:"Gordie Howe",              team:"Rangers",    year:1928, sport:"NHL",    note:"Mr. Hockey's Detroit Red Wings dominated the Original Six era — his battles with Rangers teams are hockey lore" },
    { month:3,  day:31, name:"Phil Esposito",            team:"Rangers",    year:1942, sport:"NHL",    note:"Traded from Boston to New York — the fiery center captained the Rangers and became a beloved Garden legend" },
    { month:4,  day:1,  name:"Jake LaMotta",             team:"MSG",        year:1922, sport:"Boxing", note:"The Bronx Bull — born in the Bronx, fought six bouts against Sugar Ray Robinson at MSG, became the Raging Bull" },
    { month:4,  day:2,  name:"Mudcat Grant",             team:"Yankees",    year:1935, sport:"MLB",    note:"Twins pitcher who thrilled the AL in 1965 — faced the Yankees in memorable mid-1960s pennant battles" },
    { month:4,  day:3,  name:"Gaylord Perry",            team:"Yankees",    year:1938, sport:"MLB",    note:"The spitball king — his 314 wins came partly from tormenting Yankee hitters with his doctored pitches" },
    { month:4,  day:4,  name:"Mickey Cochrane",          team:"Yankees",    year:1903, sport:"MLB",    note:"One of the all-time great catchers — his Tigers beat the Yankees for the 1934-35 pennants in epic AL battles" },
    { month:4,  day:6,  name:"Carl Hubbell",             team:"Giants",     year:1903, sport:"MLB",    note:"King Carl struck out Ruth, Gehrig, Foxx, Simmons and Cronin in the 1934 All-Star Game — a NY Giants legend" },
    { month:4,  day:7,  name:"Ken Griffey Jr.",          team:"Yankees",    year:1969, sport:"MLB",    note:"630 career HR — his Mariners 1995 ALDS victory over the Yankees is still the most heartbreaking Bronx playoff loss" },
    { month:4,  day:9,  name:"Seymour Siwoff",           team:"Yankees",    year:1939, sport:"Broadcasting", note:"Elias Sports Bureau founder — the man who defined baseball statistics in New York for 50 years" },
    { month:4,  day:10, name:"Rod Carew",                team:"Yankees",    year:1945, sport:"MLB",    note:"Seven consecutive batting titles — his Twins and Angels vs Yankees AL races were the most competitive of the era" },
    { month:4,  day:16, name:"Doug Harvey",              team:"Rangers",    year:1924, sport:"NHL",    note:"The greatest defenseman of the 1950s — his Montreal Canadiens were the Rangers' biggest obstacle to the Cup" },
    { month:4,  day:17, name:"Fred Couples",             team:"US Open",    year:1959, sport:"Golf",   note:"Boom-Boom competed at Shinnecock Hills and Bethpage Black — a crowd favorite at Long Island's US Opens" },
    { month:4,  day:19, name:"Sandy Koufax",             team:"Mets",       year:1935, sport:"MLB",    note:"The greatest pitcher of his era — his Dodgers facing the Mets in the 1960s was the ultimate NL showdown" },
    { month:4,  day:20, name:"Tommy Davis",              team:"Mets",       year:1939, sport:"MLB",    note:"Dodgers outfielder who joined the Mets — two consecutive batting titles made him one of the NL's elite hitters" },
    { month:4,  day:21, name:"Pete Rose",                team:"Mets",       year:1941, sport:"MLB",    note:"Charlie Hustle hit .300 for 15 consecutive seasons — his Reds vs Mets NL battles were the decade's defining rivalry" },
    { month:4,  day:22, name:"Duke Snider",              team:"Mets",       year:1926, sport:"MLB",    note:"The Duke of Flatbush — 407 Brooklyn home runs made him the quintessential NY sports hero before the Mets existed" },
    { month:4,  day:23, name:"Gerry Cooney",             team:"MSG",        year:1956, sport:"Boxing", note:"The Great White Hope from Huntington Long Island — his MSG fights drew massive New York crowds in the 1980s" },
    { month:4,  day:24, name:"Johnny Bench",             team:"Mets",       year:1948, sport:"MLB",    note:"The greatest catcher of his era — his Reds vs Mets battles in the NL were the defining matchups of the 1970s" },
    { month:4,  day:25, name:"Meadowlark Lemon",         team:"MSG",        year:1932, sport:"Basketball", note:"Harlem Globetrotters legend — his shows at MSG and NY arenas brought joy to generations of fans" },
    { month:4,  day:26, name:"Eddie Collins",            team:"Yankees",    year:1887, sport:"MLB",    note:"Second baseman with 3315 hits — his White Sox teams battled the Yankees in memorable early-20th century AL wars" },
    { month:4,  day:29, name:"Jerry Seinfeld",           team:"Yankees",    year:1954, sport:"Culture", note:"Born in Brooklyn, lifelong Yankees fan — the greatest comedy show ever made is about New York and baseball" },
    { month:4,  day:30, name:"Sugar Ray Robinson",       team:"MSG",        year:1921, sport:"Boxing", note:"Pound for pound the greatest boxer ever — his MSG bouts are the gold standard of New York City boxing" },
    { month:5,  day:1,  name:"Phil Rizzuto",             team:"Yankees",    year:1917, sport:"MLB",    note:"Holy Cow! The Scooter — played on 7 championship teams, beloved broadcaster for 40 years. A Yankees icon forever." },
    { month:5,  day:2,  name:"Eddie Collins",            team:"Yankees",    year:1887, sport:"MLB",    note:"Hall of Fame second baseman with 3315 hits who faced the early Yankees in memorable AL confrontations" },
    { month:5,  day:3,  name:"Pete Seeger",              team:"Yankees",    year:1919, sport:"Culture", note:"Folk legend born in Midtown Manhattan — Yankee Stadium's community ties ran through his neighborhood activism" },
    { month:5,  day:8,  name:"Don Nelson",               team:"Knicks",     year:1940, sport:"NBA",    note:"Celtics player and later Warriors coach whose analytical approach to basketball influenced a generation of coaches" },
    { month:5,  day:11, name:"Billy Martin",             team:"Yankees",    year:1928, sport:"MLB",    note:"Hired and fired five times by Steinbrenner — no relationship in sports history was more combustible or compelling" },
    { month:5,  day:13, name:"Reggie Smith",             team:"Mets",       year:1945, sport:"MLB",    note:"Switch-hitting outfielder whose Red Sox and Dodgers battles with the Yankees defined AL and World Series history" },
    { month:5,  day:16, name:"Carl Yastrzemski",         team:"Yankees",    year:1939, sport:"MLB",    note:"Yaz's 1967 Triple Crown — his Red Sox defeated the Yankees for the pennant in one of the greatest AL races ever" },
    { month:5,  day:18, name:"Bobby Cox",                team:"Yankees",    year:1941, sport:"MLB",    note:"Yankees player turned Braves legend — his 14 division titles defined the Mets' greatest rivals of the 1990s-2000s" },
    { month:5,  day:22, name:"Eddie Murray",             team:"Mets",       year:1956, sport:"MLB",    note:"Steady Eddie hit 504 career HR including a stint with the Mets — his Orioles were a perennial Yankees AL rival" },
    { month:5,  day:26, name:"Henry Kissinger",          team:"Yankees",    year:1923, sport:"Culture", note:"Secretary of State and avid Yankees fan — attended World Series games and represented NY on the world stage" },
    { month:5,  day:27, name:"Bob Hope",                 team:"Belmont",    year:1903, sport:"Golf",   note:"Golf legend and comedian who played Winged Foot and Bethpage — his love of Long Island courses was legendary" },
    { month:5,  day:28, name:"Willie Davis",             team:"Mets",       year:1940, sport:"MLB",    note:"Dodgers CF who hit .279 lifetime — his West Coast Dodgers battles against the Mets were classic NL showdowns" },
    { month:5,  day:29, name:"Johnny Vander Meer",       team:"Dodgers",    year:1914, sport:"MLB",    note:"The only pitcher to throw back-to-back no-hitters — the second came at Ebbets Field in Brooklyn in 1938" },
    { month:5,  day:30, name:"Gale Sayers",              team:"Giants",     year:1943, sport:"NFL",    note:"The Kansas Comet's explosive runs terrified the Giants — the most devastating open-field runner in NFL history" },
    { month:5,  day:31, name:"Joe Namath",               team:"Jets",       year:1943, sport:"NFL",    note:"Broadway Joe — the guarantee. Super Bowl III. The AFL is validated. The greatest moment in Jets history." },
    { month:6,  day:2,  name:"Billy Williams",           team:"Mets",       year:1938, sport:"MLB",    note:"Cubs Hall of Famer whose sweet swing tormented Mets pitching — 426 career HR in classic NL battles" },
    { month:6,  day:4,  name:"George Mikan",             team:"Knicks",     year:1924, sport:"NBA",    note:"The first great big man — his Lakers dominated the early NBA and set the standard the Knicks tried to match" },
    { month:6,  day:5,  name:"Frankie Frisch",           team:"Giants",     year:1898, sport:"MLB",    note:"The Fordham Flash — NY Giants second baseman and manager, one of the defining players of the 1920s era" },
    { month:6,  day:8,  name:"Willie McCovey",           team:"Mets",       year:1938, sport:"MLB",    note:"Stretch's line drive to Richardson ended the 1962 Series — one of the most dramatic finishes in baseball history" },
    { month:6,  day:10, name:"Tris Speaker",             team:"Yankees",    year:1888, sport:"MLB",    note:"The Grey Eagle — his 3514 career hits and all-time defensive record made him one of the Yankees' greatest rivals" },
    { month:6,  day:12, name:"Dave Cowens",              team:"Knicks",     year:1948, sport:"NBA",    note:"Celtics center whose physical battles with the Knicks in the early 1970s produced the most intense NBA fights ever" },
    { month:6,  day:13, name:"Bob Sheppard",             team:"Yankees",    year:1910, sport:"Broadcasting", note:"The Voice of God — 56 years as Yankees PA announcer. Jeter used his recording even after his passing." },
    { month:6,  day:15, name:"Jack Dempsey",             team:"MSG",        year:1895, sport:"Boxing", note:"The Manassa Mauler — heavyweight champion whose Madison Square Garden bouts set the standard for NY boxing" },
    { month:6,  day:16, name:"Christy Mathewson",        team:"Giants",     year:1880, sport:"MLB",    note:"Three complete game shutouts in the 1905 World Series — the greatest pitching performance in baseball history" },
    { month:6,  day:18, name:"Lou Brock",                team:"Mets",       year:1939, sport:"MLB",    note:"938 career stolen bases — his Cardinals vs Mets NL battles were the defining moments of the late 1960s" },
    { month:6,  day:22, name:"Vida Blue",                team:"Yankees",    year:1949, sport:"MLB",    note:"The electrifying A's lefty nearly came to the Yankees — Commissioner Kuhn killed the blockbuster trade in 1976" },
    { month:6,  day:23, name:"Wilma Rudolph",            team:"NY",         year:1940, sport:"Track",  note:"Three gold medals in Rome 1960 — the fastest woman alive inspired generations of NY school athletes" },
    { month:6,  day:24, name:"Sam McDowell",             team:"Yankees",    year:1942, sport:"MLB",    note:"Sudden Sam finished his career with the Yankees — his 100 mph fastball once made him the AL's most feared pitcher" },
    { month:6,  day:27, name:"John Havlicek",            team:"Knicks",     year:1940, sport:"NBA",    note:"Hondo's Celtics defeated the Knicks in heartbreaking fashion throughout the 1960s-70s — their greatest rival" },
    { month:6,  day:28, name:"Harmon Killebrew",         team:"Yankees",    year:1936, sport:"MLB",    note:"The Killer's 573 HR made him the AL's most feared right-handed power hitter — his Twins vs Yankees battles were epic" },
    { month:7,  day:1,  name:"Carl Lewis",               team:"NY",         year:1961, sport:"Track",  note:"Nine Olympic gold medals — the greatest track and field athlete ever competed at Icahn Stadium in New York" },
    { month:7,  day:3,  name:"Leon Spinks",              team:"MSG",        year:1953, sport:"Boxing", note:"Shocked Ali for the heavyweight championship in 1978 — his New York fights drew massive boxing crowds" },
    { month:7,  day:5,  name:"Al Arbour",                team:"Islanders",  year:1932, sport:"NHL",    note:"Architect of the dynasty — coached the Islanders to four consecutive Stanley Cups. 781 wins, the greatest Isles coach." },
    { month:7,  day:7,  name:"Elston Howard",            team:"Yankees",    year:1929, sport:"MLB",    note:"First Black Yankee — 1963 AL MVP and 9 World Series trips. His barrier-breaking legacy is central to Yankees history." },
    { month:7,  day:9,  name:"O.J. Simpson",             team:"Giants",     year:1947, sport:"NFL",    note:"The Juice rushed for 2003 yards in 1973 as a Bill — his AFC East battles against the Giants defined the mid-70s NFL" },
    { month:7,  day:12, name:"Tom Dempsey",              team:"Giants",     year:1947, sport:"NFL",    note:"His 63-yard field goal record stood for decades — a feat that lives alongside the greatest Giants-era moments" },
    { month:7,  day:14, name:"Billy Joel",               team:"Yankees",    year:1949, sport:"Culture", note:"Born in Hicksville, raised on Long Island — the Piano Man is NY's greatest musical fan and MSG legend" },
    { month:7,  day:15, name:"Satchel Paige",            team:"Yankees",    year:1906, sport:"MLB",    note:"How old is Satch? Don't look back, something might be gaining on you. He finally made the majors at 42." },
    { month:7,  day:16, name:"Shoeless Joe Jackson",     team:"Yankees",    year:1888, sport:"MLB",    note:"The Natural — his .356 career average is third highest ever. His Black Sox tragedy still haunts baseball" },
    { month:7,  day:19, name:"George McGinnis",          team:"Knicks",     year:1950, sport:"NBA",    note:"76ers power forward whose battles against the Knicks in the mid-1970s produced some of the NBA's most physical play" },
    { month:7,  day:21, name:"Gene Fullmer",             team:"MSG",        year:1931, sport:"Boxing", note:"Middleweight champion who fought Sugar Ray Robinson at MSG — one of boxing's most competitive weight class rivalries" },
    { month:7,  day:24, name:"Barry Bonds",              team:"Mets",       year:1964, sport:"MLB",    note:"762 career HR — his Giants vs Mets NL West and interleague battles were some of baseball's greatest showdowns" },
    { month:7,  day:25, name:"Walter Johnson",           team:"Yankees",    year:1887, sport:"MLB",    note:"The Big Train — 417 wins and the most feared fastball before the live ball era. Senators vs Yankees battles were epic." },
    { month:8,  day:1,  name:"Yves Saint Laurent",       team:"US Open",    year:1936, sport:"Tennis", note:"The US Open's fashion culture has always intersected with luxury — tennis at Flushing Meadows is a fashion event" },
    { month:8,  day:2,  name:"Dock Ellis",               team:"Yankees",    year:1945, sport:"MLB",    note:"Pirates pitcher who threw a no-hitter and later finished his career as a Yankee — one of baseball's most colorful characters" },
    { month:8,  day:3,  name:"Tony Perez",               team:"Mets",       year:1942, sport:"MLB",    note:"Big Doggie hit 379 career HR — his Big Red Machine Reds were the Mets' most dominant rivals in the early 1970s" },
    { month:8,  day:5,  name:"Red Schoendienst",         team:"Yankees",    year:1923, sport:"MLB",    note:"Cardinals Hall of Famer who battled the Yankees in the World Series — his 1946 and 1964 teams represent NL's best" },
    { month:8,  day:6,  name:"Frank Chance",             team:"Giants",     year:1877, sport:"MLB",    note:"Tinker to Evers to Chance — the Cubs first baseman whose double play combination is baseball's most famous poem" },
    { month:8,  day:9,  name:"Travis Jackson",           team:"Giants",     year:1903, sport:"MLB",    note:"NY Giants shortstop who played on two World Series championship teams in the 1920s-30s at the Polo Grounds" },
    { month:8,  day:10, name:"Thurman Munson",           team:"Yankees",    year:1947, sport:"MLB",    note:"(The Captain) — Munson's tragic loss on August 2 1979 is the saddest day in Yankees history" },
    { month:8,  day:13, name:"Gene Upshaw",              team:"Jets",       year:1945, sport:"NFL",    note:"Raiders OL whose blocks paved the way for Oakland's wins over the Jets in fierce AFC divisional battles" },
    { month:8,  day:17, name:"Ted Kluszewski",           team:"Yankees",    year:1924, sport:"MLB",    note:"Big Klu's sleeveless arms and massive HR power made him a menace to Yankees pitching in the 1950s NL" },
    { month:8,  day:21, name:"Usain Bolt",               team:"NY",         year:1986, sport:"Track",  note:"The fastest man in human history competed at Icahn Stadium in NYC — his relay career brought him to New York" },
    { month:8,  day:23, name:"Ivan Lendl",               team:"US Open",    year:1960, sport:"Tennis", note:"Eight Grand Slam titles including three US Opens at Flushing Meadows — the most dominant player of the 1980s" },
    { month:8,  day:25, name:"Larry Holmes",             team:"MSG",        year:1949, sport:"Boxing", note:"48-0 at his peak as heavyweight champion — his MSG title defenses helped define post-Ali boxing in New York" },
    { month:8,  day:26, name:"Elroy Hirsch",             team:"Giants",     year:1923, sport:"NFL",    note:"Crazy Legs — Rams receiver who shredded NFL defenses including the Giants in the early receiver revolution" },
    { month:8,  day:27, name:"Tommy Burns",              team:"MSG",        year:1881, sport:"Boxing", note:"First heavyweight champion of the modern era — his New York bouts set the template for MSG boxing" },
    { month:8,  day:30, name:"Sandy Koufax",             team:"Dodgers",    year:1935, sport:"MLB",    note:"The most dominant four-year run in pitching history — his Brooklyn roots make him an honorary New Yorker forever" },
    { month:8,  day:31, name:"Frank Robinson",           team:"Yankees",    year:1935, sport:"MLB",    note:"His 1961 Reds vs Yankees World Series is a classic — the NL's most dominant player facing baseball's greatest franchise" },
    { month:9,  day:3,  name:"Allen Iverson",            team:"Knicks",     year:1975, sport:"NBA",    note:"The Answer's incredible playoff battles at MSG — the most exciting guard of his era vs the Knicks in the 2001 playoffs" },
    { month:9,  day:4,  name:"Tom Watson",               team:"US Open",    year:1949, sport:"Golf",   note:"His classic battles at Shinnecock Hills and other New York courses define the US Open in the NY area" },
    { month:9,  day:7,  name:"James Brooks",             team:"Giants",     year:1958, sport:"NFL",    note:"Bengals RB who faced the Giants in memorable AFC-NFC matchups — one of the most elusive backs of the 1980s" },
    { month:9,  day:8,  name:"Clyde Lovellette",         team:"Knicks",     year:1929, sport:"NBA",    note:"Lakers center who battled the Knicks in the early NBA era — three championships against NY's title hopes" },
    { month:9,  day:12, name:"Paul Henderson",           team:"Rangers",    year:1943, sport:"NHL",    note:"His Summit Series goal for Canada against the Soviets in 1972 is hockey's most famous moment — rivaling anything at MSG" },
    { month:9,  day:14, name:"Hank Bauer",               team:"Yankees",    year:1922, sport:"MLB",    note:"Marine hero and Yankee outfielder — 7 World Series rings as a player. Don't mess with Hank Bauer." },
    { month:9,  day:15, name:"Norm Crosby",              team:"MSG",        year:1927, sport:"Broadcasting", note:"Comedy legend who performed at MSG countless times — classic NY arena entertainment across five decades" },
    { month:9,  day:17, name:"Grady Little",             team:"Yankees",    year:1950, sport:"MLB",    note:"The Sox manager who left Pedro in too long in Game 7 of 2003 — the Yankees benefited most from that decision" },
    { month:9,  day:18, name:"Orlando Cepeda",           team:"Mets",       year:1937, sport:"MLB",    note:"The Baby Bull hit 379 career HR — his Giants and Cardinals vs Mets battles defined the NL rivalries of his era" },
    { month:9,  day:20, name:"Red Auerbach",             team:"Knicks",     year:1917, sport:"NBA",    note:"Nine championships as Celtics coach — the brilliant strategist who denied the Knicks any title for 13 straight years" },
    { month:9,  day:21, name:"Bill Murray",              team:"Mets",       year:1950, sport:"Culture", note:"Born in Evanston, adopted New Yorker and devoted Mets fan — a fixture at Shea Stadium and Citi Field for decades" },
    { month:9,  day:22, name:"Deion Sanders",            team:"Yankees",    year:1967, sport:"MLB",    note:"Prime Time played outfield for the Yankees in 1989-90 while also starring in the NFL — the ultimate two-sport athlete" },
    { month:9,  day:24, name:"Rafael Palmeiro",          team:"Yankees",    year:1964, sport:"MLB",    note:"3020 hits and 569 HR — his Orioles vs Yankees AL East battles were the mid-1990s most competitive division race" },
    { month:9,  day:26, name:"Larry Bowa",               team:"Mets",       year:1945, sport:"MLB",    note:"Scrappy Phillies shortstop who battled the Mets in classic NL East wars — five-time Gold Glove winner" },
    { month:9,  day:28, name:"Roger Maris",              team:"Yankees",    year:1934, sport:"MLB",    note:"The same birthday as his record-breaking 1961 season — 61 homers that broke Ruth's mark on the final day" },
    { month:9,  day:30, name:"Maury Wills",              team:"Dodgers",    year:1932, sport:"MLB",    note:"104 stolen bases in 1962 — his Dodgers vs Yankees World Series and Dodgers vs Mets NL battles defined the era" },
    { month:10, day:2,  name:"Lefty Grove",              team:"Yankees",    year:1900, sport:"MLB",    note:"300 wins and .680 winning percentage — his A's dominated the Yankees in the late 1920s in epic AL battles" },
    { month:10, day:3,  name:"Charlie Gehringer",        team:"Yankees",    year:1903, sport:"MLB",    note:"The Mechanical Man batted .320 lifetime and faced the Yankees in World Series battles with the Tigers" },
    { month:10, day:4,  name:"Barry Larkin",             team:"Mets",       year:1964, sport:"MLB",    note:"Reds shortstop who battled the Mets in the NL East — his 1990 Reds swept the A's in dominant fashion" },
    { month:10, day:6,  name:"Tony La Russa",            team:"Yankees",    year:1944, sport:"MLB",    note:"Three World Series wins — his A's vs Yankees battles of the late 1980s were the AL's most compelling rivalry" },
    { month:10, day:7,  name:"Al Kaline",                team:"Yankees",    year:1934, sport:"MLB",    note:"Mr. Tiger hit .297 lifetime — his Tigers vs Yankees AL battles for 22 seasons were baseball's most consistent rivalry" },
    { month:10, day:9,  name:"Matt Damon",               team:"Yankees",    year:1970, sport:"Culture", note:"Good Will Hunting actor and Boston Red Sox fan whose genuine Yankees rivalry is the best celebrity sports rivalry" },
    { month:10, day:10, name:"Nolan Ryan",               team:"Mets",       year:1947, sport:"MLB",    note:"Tom Terrific's perfect complement — Ryan's 5714 strikeouts began in a Mets uniform at Shea Stadium in Queens" },
    { month:10, day:11, name:"Steve Young",              team:"Giants",     year:1961, sport:"NFL",    note:"49ers QB who twice defeated the Giants in the NFC — his rivalry with NY defenses is classic West Coast vs Gotham" },
    { month:10, day:12, name:"Johnny Carson",            team:"Yankees",    year:1925, sport:"Broadcasting", note:"The Tonight Show host was a massive Yankees fan who incorporated baseball into his monologues for 30 years" },
    { month:10, day:14, name:"Dick Howser",              team:"Yankees",    year:1936, sport:"MLB",    note:"Yankees manager in 1980 who won 103 games and was fired anyway — his Royals later won the 1985 World Series" },
    { month:10, day:15, name:"Jim Palmer",               team:"Yankees",    year:1945, sport:"MLB",    note:"Three Cy Young awards as an Oriole — his Orioles vs Yankees World Series appearances define AL history" },
    { month:10, day:16, name:"Bob Lemon",                team:"Yankees",    year:1920, sport:"MLB",    note:"Hall of Fame pitcher who managed the Yankees to the 1978 championship — replacing Billy Martin mid-season in the Bronx Zoo era" },
    { month:10, day:20, name:"Tom Petty",                team:"Yankees",    year:1950, sport:"Culture", note:"American rock legend whose music played during Yankees pregame shows at the Stadium for decades" },
    { month:10, day:22, name:"Bobby Abreu",              team:"Yankees",    year:1974, sport:"MLB",    note:"Traded to the Yankees at the 2006 deadline — his .292 career average and great plate approach were pure value" },
    { month:10, day:26, name:"Bob Cousy",                team:"Knicks",     year:1928, sport:"NBA",    note:"The Cooz — his dribbling wizardry made him the most exciting player in the NBA's formative years at MSG" },
    { month:10, day:28, name:"Charlie Joiner",           team:"Giants",     year:1947, sport:"NFL",    note:"Hall of Fame WR whose precise routes tormented defenses — defined the precision passing era the Giants aspired to match" },
    { month:10, day:29, name:"Effa Manley",              team:"Newark Eagles",year:1897,sport:"MLB",  note:"First woman inducted into the Baseball Hall of Fame — co-owned the Newark Eagles of the Negro Leagues near NY" },
    { month:10, day:31, name:"Manny Sanguillen",         team:"Yankees",    year:1944, sport:"MLB",    note:"Pirates catcher who batted .296 lifetime — his Bucs vs Yankees clashes in World Series battles are classic" },
    { month:11, day:2,  name:"Bucky Dent",               team:"Yankees",    year:1951, sport:"MLB",    note:"The most famous home run in Yankees-Red Sox history — October 2, 1978, Fenway Park, off Mike Torrez. Pure legend." },
    { month:11, day:5,  name:"Elroy Hirsch",             team:"Giants",     year:1923, sport:"NFL",    note:"Crazy Legs — Rams receiver who changed how NFL teams defended the pass in his era facing the Giants" },
    { month:11, day:7,  name:"Al Arbour",                team:"Islanders",  year:1932, sport:"NHL",    note:"The architect — coached the Islanders to four consecutive Stanley Cups. 781 wins, the greatest Islander coach." },
    { month:11, day:9,  name:"Whitey Ford",              team:"Yankees",    year:1928, sport:"MLB",    note:"The Chairman of the Board — 10 World Series trips, .690 Series winning percentage. The greatest Yankee pitcher ever." },
    { month:11, day:10, name:"Ron Guidry",               team:"Yankees",    year:1950, sport:"MLB",    note:"Louisiana Lightning — 25-3 in 1978 is the greatest single-season pitching record in Yankees history. Gator forever." },
    { month:11, day:12, name:"Joe DiMaggio",             team:"Yankees",    year:1914, sport:"MLB",    note:"The Yankee Clipper — 56-game hit streak, three MVPs, 13 World Series trips. The most elegant player in baseball history." },
    { month:11, day:13, name:"Jack Nicklaus",            team:"US Open",    year:1940, sport:"Golf",   note:"Won the US Open at Baltusrol twice — the Golden Bear is the greatest golfer ever and a Long Island legend" },
    { month:11, day:15, name:"Roger Craig",              team:"Giants",     year:1930, sport:"NFL",    note:"RB/DB who set multiple NFL records with the Giants in the 1950s — the most versatile player in franchise history" },
    { month:11, day:17, name:"Bob Griese",               team:"Jets",       year:1945, sport:"NFL",    note:"The cerebral Dolphins QB who engineered the perfect 1972 season — his battles against the Jets defined the AFC East" },
    { month:11, day:19, name:"Ted Turner",               team:"Yankees",    year:1938, sport:"MLB",    note:"Braves owner who turned Atlanta into the Yankees' biggest NL World Series rival through the 1990s dynasty" },
    { month:11, day:21, name:"Ken Griffey Sr.",          team:"Yankees",    year:1950, sport:"MLB",    note:"Yankees outfielder who later played alongside his son Ken Jr. with the Mariners — the most remarkable father-son moment in sports" },
    { month:11, day:23, name:"Luis Aparicio",            team:"Yankees",    year:1934, sport:"MLB",    note:"The greatest shortstop of the 1950s-60s with 506 SB — his White Sox and Red Sox were perpetual AL rivals" },
    { month:11, day:24, name:"Oscar Gamble",             team:"Yankees",    year:1949, sport:"MLB",    note:"The Afro that would not fit under the cap — his huge 1976 Yankees season helped launch the Steinbrenner era" },
    { month:11, day:25, name:"Joe DiMaggio Jr.",         team:"Yankees",    year:1941, sport:"MLB",    note:"The Jolter's son carried an impossible name — the DiMaggio legacy in New York transcends generations" },
    { month:11, day:27, name:"Jed Lowrie",               team:"Mets",       year:1984, sport:"MLB",    note:"Utility man who signed a big Mets contract — his career illustrates the challenge of building around NL East core" },
    { month:11, day:28, name:"Randy Newman",             team:"Yankees",    year:1943, sport:"Culture", note:"You've Got a Friend in Me composer — his I Love LA is the greatest anti-NY anthem, making him NY fans' beloved rival" },
    { month:11, day:29, name:"Chadwick Boseman",         team:"Yankees",    year:1976, sport:"Culture", note:"Black Panther star who was a devoted Yankees fan — his 42 film immortalized Jackie Robinson's barrier-breaking legacy" },
    { month:11, day:30, name:"Dick Clark",               team:"Yankees",    year:1929, sport:"Broadcasting", note:"America's Oldest Teenager ran the NY TV scene — his annual shows tied together NY culture and the Yankees world" },
    { month:12, day:1,  name:"Lee Trevino",              team:"US Open",    year:1939, sport:"Golf",   note:"Super Mex won the US Open twice and played at Winged Foot and Merion — the most colorful champion in golf history" },
    { month:12, day:4,  name:"Jim Plunkett",             team:"Giants",     year:1947, sport:"NFL",    note:"Two Super Bowl wins with the Raiders — his Oakland teams defeated the Jets in memorable playoff battles" },
    { month:12, day:5,  name:"Dick Butkus",              team:"Giants",     year:1942, sport:"NFL",    note:"The most feared linebacker before Lawrence Taylor — his Bears vs Giants battles were the NFC's most violent matchups" },
    { month:12, day:6,  name:"Larry Bird",               team:"Knicks",     year:1956, sport:"NBA",    note:"The Hick from French Lick — his Celtics vs Knicks battles at MSG are the arena's most passionate rivalry of the 1980s" },
    { month:12, day:8,  name:"Bob Ojeda",                team:"Mets",       year:1957, sport:"MLB",    note:"Left-handed starter for the miracle 1986 Mets — his steady presence in the rotation was underrated and crucial" },
    { month:12, day:10, name:"Otis Sistrunk",            team:"Jets",       year:1946, sport:"NFL",    note:"The Raiders DT who matched up against Jets offensive linemen in fierce AFC divisional battles of the 1970s" },
    { month:12, day:14, name:"Reggie White",             team:"Giants",     year:1961, sport:"NFL",    note:"The Minister of Defense — the greatest defensive end ever faced the Giants twice a year and made every game a battle" },
    { month:12, day:18, name:"Ty Cobb",                  team:"Yankees",    year:1886, sport:"MLB",    note:"The Georgia Peach batted .366 lifetime and played against the early Yankees — the most ferocious competitor in baseball" },
    { month:12, day:20, name:"Bob Hayes",                team:"Giants",     year:1942, sport:"NFL",    note:"The World's Fastest Human won Olympic gold then terrorized NFL defenses including the Giants with his Cowboys" },
    { month:12, day:22, name:"Steve Carlton",            team:"Mets",       year:1944, sport:"MLB",    note:"Lefty won 329 games and faced the Mets hundreds of times — his Phillies-Mets NL East wars were the decade's best rivalry" },
    { month:12, day:24, name:"Carlton Fisk",             team:"Yankees",    year:1947, sport:"MLB",    note:"His 1975 Game 6 HR wave-fair is one of the most iconic moments ever — the greatest catching performance in Series history" },
    { month:12, day:26, name:"Emlen Tunnell",            team:"Giants",     year:1925, sport:"NFL",    note:"First Black player inducted into the Pro Football Hall of Fame — played nine seasons for the NY Giants as the first great safety" },
    { month:12, day:27, name:"Vic Seixas",               team:"US Open",    year:1923, sport:"Tennis", note:"Won the US Open at Forest Hills in 1954 — one of the great champions before the Open moved to Flushing Meadows" },
    { month:12, day:29, name:"Sandy Koufax",             team:"Dodgers",    year:1935, sport:"MLB",    note:"The lefthander with the most dominant four-year run ever — his Brooklyn roots make him an honorary New Yorker" },
    { month:12, day:30, name:"George Marshall",          team:"Giants",     year:1896, sport:"NFL",    note:"Redskins founder whose team's battles with the Giants helped define the NFL's early East division rivalry" },
    { month:12, day:31, name:"Dick Clark",               team:"Yankees",    year:1929, sport:"Broadcasting", note:"The Rockin' New Year's Eve host who made Times Square and Yankees culture inseparable parts of New York identity" },
    { month:2,  day:12, name:"Abraham Lincoln",       team:"Yankees",    year:1809, sport:"Culture",    note:"Honest Abe — his political life intersected with early American baseball as the sport spread during his presidency" },
    { month:5,  day:4,  name:"Don Larsen",             team:"Yankees",    year:1929, sport:"MLB",        note:"His October 8 1956 perfect game in the World Series vs the Dodgers is the most perfect moment in baseball history" },
    { month:5,  day:5,  name:"Willie Mays",            team:"NY Giants",  year:1931, sport:"MLB",        note:"The Say Hey Kid — The Catch in the 1954 World Series at the Polo Grounds is the greatest defensive play in history" },
    { month:5,  day:10, name:"Phil Rizzuto",           team:"Yankees",    year:1917, sport:"MLB",        note:"Holy Cow! The Scooter — SS on 7 championship teams and beloved Yankees broadcaster for 40 years. A true icon." },
    { month:5,  day:19, name:"Carl Yastrzemski",       team:"Yankees",    year:1939, sport:"MLB",        note:"Yaz's 1967 Triple Crown — his Red Sox defeated the Yankees for the AL pennant in one of the greatest races ever" },
    { month:6,  day:7,  name:"Tom Seaver",             team:"Mets",       year:1944, sport:"MLB",        note:"Tom Terrific — 311 wins, 2.86 ERA, three Cy Youngs, 1969 World Championship. The greatest Met who ever lived." },
    { month:6,  day:14, name:"Babe Ruth",              team:"Yankees",    year:1895, sport:"MLB",        note:"The Sultan of Swat. 714 career HR. Called Shot. 7 WS rings. The reason Yankee Stadium was called the House That Ruth Built." },
    { month:6,  day:17, name:"Elston Howard",          team:"Yankees",    year:1929, sport:"MLB",        note:"First Black Yankee — 1963 AL MVP. His barrier-breaking legacy is one of the most important in Yankees history." },
    { month:7,  day:13, name:"Dave Winfield",          team:"Yankees",    year:1951, sport:"MLB",        note:"Mr. May became Mr. October — his late-career heroics and the Steinbrenner feud are central to Yankees lore" },
    { month:7,  day:26, name:"Jim Watt",               team:"MSG",        year:1948, sport:"Boxing",     note:"WBC lightweight champion who defended his title at Madison Square Garden in classic 1980s boxing bouts" },
    { month:7,  day:29, name:"Mel Ott",                team:"Giants",     year:1909, sport:"MLB",        note:"Master Melvin hit 511 HR for the NY Giants at the Polo Grounds — one of the franchise's all-time greatest sluggers" },
    { month:7,  day:31, name:"Hank Greenberg",         team:"Yankees",    year:1911, sport:"MLB",        note:"The Hebrew Hammer hit 58 HR in 1938 — his Tigers vs Yankees AL battles were the decade's defining pennant races" },
    { month:8,  day:14, name:"Mike Bossy",             team:"Islanders",  year:1957, sport:"NHL",        note:"Nine straight 50-goal seasons and four Stanley Cups — the most prolific goal scorer in Islanders history forever" },
    { month:8,  day:29, name:"Roy Campanella",         team:"Dodgers",    year:1921, sport:"MLB",        note:"Three NL MVPs as a Brooklyn Dodger — his career ended in a tragic car accident but his legacy endures forever" },
    { month:9,  day:6,  name:"Chris Evert",            team:"US Open",    year:1954, sport:"Tennis",     note:"Six US Open titles at Flushing Meadows — Chrissie's baseline game defined an era of NY tennis dominance" },
    { month:10, day:8,  name:"Goose Gossage",          team:"Yankees",    year:1951, sport:"MLB",        note:"The Goose — one of the most intimidating relievers ever wore pinstripes during the Yankees' championship era" },
    { month:12, day:12, name:"Tracy Austin",           team:"US Open",    year:1962, sport:"Tennis",     note:"Won the US Open at 16 in 1979 — the youngest champion ever at Flushing Meadows. A tennis prodigy." },
    { month:12, day:15, name:"Don Maynard",            team:"Jets",       year:1935, sport:"NFL",        note:"The first great Jet receiver and the first AFL player inducted into the Pro Football Hall of Fame" },
  ];

  const todayBirthdays = ALL_BIRTHDAYS.filter(b => b.month === month && b.day === day);

  const SPORT_COLORS = {
    MLB:"#003087", NFL:"#c8201c", NBA:"#F57C00", NHL:"#0038A8",
    Tennis:"#22c55e", Boxing:"#7C3AED", Golf:"#065f46", Culture:"#BE185D", Broadcasting:"#0891B2"
  };

  return (
    <div style={styles.statsRoot}>
      <div style={styles.stdHeader}>
        <h2 style={styles.stdTitle}>🎂 NY SPORTS BIRTHDAYS TODAY</h2>
        <p style={styles.stdSub}>{dateStr.toUpperCase()} · WHO WAS BORN TODAY IN NY SPORTS HISTORY</p>
      </div>

      {todayBirthdays.length === 0 ? (
        <div style={{padding:"30px 0", textAlign:"center"}}>
          <div style={{fontSize:40, marginBottom:12}}>🎂</div>
          <div style={{fontSize:14, color:"#aaa", fontFamily:"'Georgia',serif", marginBottom:8}}>
            No major NY sports birthdays found for {dateStr}.
          </div>
          <div style={{fontSize:11, color:"#555"}}>
            Check back tomorrow — or explore another date in the HISTORY tab.
          </div>
        </div>
      ) : (
        <div>
          <div style={{marginBottom:16, padding:"10px 14px", background:"#161616", borderLeft:"3px solid #c8201c"}}>
            <p style={{margin:0, fontSize:12, color:"#aaa"}}>
              {todayBirthdays.length} NY sports legend{todayBirthdays.length !== 1 ? "s" : ""} born on {dateStr}
            </p>
          </div>
          {todayBirthdays.map((b, i) => {
            const color = SPORT_COLORS[b.sport] || "#888";
            const age = new Date().getFullYear() - b.year;
            return (
              <a key={i}
                href={`https://www.google.com/search?q=${encodeURIComponent(b.name+" "+b.team+" sports")}`}
                target="_blank" rel="noopener noreferrer"
                style={{display:"flex", alignItems:"flex-start", gap:14, padding:"14px 16px",
                  borderBottom:"1px solid #1a1a1a", background: i%2===0?"#0e0e0e":"#111",
                  borderLeft:`4px solid ${color}`, textDecoration:"none", marginBottom:4}}>
                <div style={{flexShrink:0, width:52, height:52, borderRadius:"50%",
                  background:`${color}22`, border:`2px solid ${color}44`,
                  display:"flex", alignItems:"center", justifyContent:"center",
                  flexDirection:"column", textAlign:"center"}}>
                  <div style={{fontSize:14, fontWeight:900, color, lineHeight:1}}>{b.year}</div>
                  <div style={{fontSize:9, color:"#666"}}>{age}y</div>
                </div>
                <div style={{flex:1, minWidth:0}}>
                  <div style={{display:"flex", alignItems:"center", gap:8, flexWrap:"wrap", marginBottom:4}}>
                    <span style={{fontSize:16, fontWeight:900, color:"#fff", fontFamily:"'Georgia',serif"}}>{b.name}</span>
                    <span style={{fontSize:9, padding:"2px 7px", background:`${color}22`, color,
                      fontWeight:900, letterSpacing:"0.1em", borderRadius:2}}>{b.team}</span>
                    <span style={{fontSize:9, color:"#666"}}>[{b.sport}]</span>
                  </div>
                  <p style={{margin:0, fontSize:12, color:"#888", lineHeight:1.55, fontFamily:"'Georgia',serif"}}>{b.note}</p>
                </div>
                <span style={{fontSize:9, color:"#555", flexShrink:0, alignSelf:"center"}}>→</span>
              </a>
            );
          })}
        </div>
      )}

      <div style={{marginTop:20, padding:"10px 14px", background:"#111", borderLeft:"2px solid #2a2a2a", fontSize:10, color:"#555"}}>
        🎂 {ALL_BIRTHDAYS.length} NY sports birthdays in our database · Refreshes automatically each day
      </div>
    </div>
  );
}


// ─── TRIVIA + THIS DATE COMPONENT (AI-powered) ────────────────────────────
function TriviaTab() {
  const today = new Date();
  const dateStr = today.toLocaleDateString("en-US", { month: "long", day: "numeric" });
  const fullDateStr = today.toLocaleDateString("en-US", { weekday:"long", year:"numeric", month:"long", day:"numeric" });

  const [thisDate, setThisDate] = useState([
    { year:1969, team:"Mets", sport:"MLB", headline:"Miracle Mets win the World Series", detail:"The 100-to-1 longshots defeat the Baltimore Orioles to complete the most shocking World Series upset in baseball history. Ya Gotta Believe!" },
    { year:1994, team:"Rangers", sport:"NHL", headline:"Rangers win Stanley Cup ending 54-year drought", detail:"Mark Messier and the Rangers defeat the Vancouver Canucks in Game 7, ending a 54-year championship drought at Madison Square Garden." },
    { year:1969, team:"Jets", sport:"NFL", headline:"Namath guarantees Super Bowl III victory", detail:"Joe Namath backs up his famous guarantee defeating the Baltimore Colts 16-7 in one of the greatest upsets in sports history." },
    { year:1970, team:"Knicks", sport:"NBA", headline:"Willis Reed limps onto court in Game 7", detail:"Playing on a torn thigh muscle Reed inspires the Knicks to their first NBA championship at Madison Square Garden." },
    { year:1980, team:"Islanders", sport:"NHL", headline:"Bob Nystrom OT winner starts Islanders dynasty", detail:"Nystrom's overtime goal against the Flyers launches four consecutive Stanley Cups — the greatest dynasty in Islander history." },
  ]);
  const [trivia, setTrivia]             = useState(null);
  const [loadingDate, setLoadingDate]   = useState(false);
  const [loadingTrivia, setLoadingTrivia] = useState(true);
  const [triviaRevealed, setTriviaRevealed] = useState(false);
  const [triviaCorrect, setTriviaCorrect]   = useState(null);
  const [newTriviaLoading, setNewTriviaLoading] = useState(false);

  const STATIC_MOMENTS = [
    { year:1969, team:"Mets", sport:"MLB", headline:"Miracle Mets win the World Series", detail:"The 100-to-1 longshots defeat the Baltimore Orioles to complete the most shocking World Series upset in baseball history. Ya Gotta Believe!" },
    { year:1994, team:"Rangers", sport:"NHL", headline:"Rangers win Stanley Cup ending 54-year drought", detail:"Mark Messier and the Rangers defeat the Vancouver Canucks in Game 7, ending a 54-year championship drought at Madison Square Garden." },
    { year:1969, team:"Jets", sport:"NFL", headline:"Namath guarantees Super Bowl III victory", detail:"Joe Namath backs up his famous guarantee defeating the Baltimore Colts 16-7 in one of the greatest upsets in sports history." },
    { year:1970, team:"Knicks", sport:"NBA", headline:"Willis Reed limps onto court in Game 7 of NBA Finals", detail:"Playing on a torn thigh muscle Reed scores the first two baskets inspiring Walt Frazier to a 36-point performance as the Knicks win their first title." },
    { year:1980, team:"Islanders", sport:"NHL", headline:"Bob Nystrom scores OT winner to give Islanders first Cup", detail:"Nystrom's overtime goal at 7:11 of OT against the Flyers launches the greatest dynasty in Islander history — four consecutive Stanley Cups." },
  ];

  useEffect(() => {
    // Show static moments immediately — Supabase integration coming soon
    setThisDate(STATIC_MOMENTS);
    setLoadingDate(false);
  }, []);

  async function loadTrivia(isNew = false) {
    isNew ? setNewTriviaLoading(true) : setLoadingTrivia(true);
    setTrivia(null);
    setTriviaRevealed(false);
    setTriviaCorrect(null);
    try {
      const row = await sbRandom("ny_trivia");
      if (row) {
        setTrivia({
          question:    row.question,
          options:     [`A) ${row.option_a}`, `B) ${row.option_b}`, `C) ${row.option_c}`, `D) ${row.option_d}`],
          answer:      row.answer,
          explanation: row.explanation,
          team:        row.team,
          era:         row.era,
        });
      }
    } catch(e) { setTrivia(null); }
    isNew ? setNewTriviaLoading(false) : setLoadingTrivia(false);
  }

  useEffect(() => {
    loadTrivia();
  }, []);

  function handleAnswer(letter) {
    if (triviaRevealed) return;
    setTriviaRevealed(true);
    setTriviaCorrect(letter === trivia?.answer);
  }

  const SPORT_ICONS = { NFL:"🏈", MLB:"⚾", NBA:"🏀", NHL:"🏒", WNBA:"🏀", MLS:"⚽", default:"🏆" };

  return (
    <div style={styles.triviaRoot}>

      {/* ── TRIVIA ── */}
      <section style={styles.triviaSection}>
        <div style={styles.triviaSectionHeader}>
          <span style={styles.triviaSectionIcon}>🧠</span>
          <div>
            <h2 style={styles.triviaSectionTitle}>NY SPORTS TRIVIA</h2>
            <p style={styles.triviaSectionSub}>DAILY CHALLENGE</p>
          </div>
          {triviaRevealed && (
            <button onClick={() => loadTrivia(true)} style={styles.refreshBtn} disabled={newTriviaLoading}>
              {newTriviaLoading ? "…" : "NEW →"}
            </button>
          )}
        </div>

        {loadingTrivia || newTriviaLoading ? (
          <AILoadingBlock text="GENERATING QUESTION..." />
        ) : !trivia ? (
          <div style={styles.triviaEmpty}>
            <button onClick={() => loadTrivia()} style={styles.retryBtn}>TRY AGAIN</button>
          </div>
        ) : (
          <div style={styles.triviaCard}>
            <div style={styles.triviaTeamTag}>
              <span>{SPORT_ICONS[trivia.sport] || "🏆"}</span>
              <span>{trivia.team}</span>
              {trivia.era && <span style={styles.triviaEra}>· {trivia.era}</span>}
            </div>
            <p style={styles.triviaQuestion}>{trivia.question}</p>
            <div style={styles.triviaOptions}>
              {(trivia.options || []).map((opt, i) => {
                const letter = ["A","B","C","D"][i];
                const isCorrect = letter === trivia.answer;
                const isSelected = triviaRevealed;
                let optStyle = styles.triviaOption;
                if (triviaRevealed && isCorrect) optStyle = {...optStyle, ...styles.triviaOptionCorrect};
                else if (triviaRevealed && !isCorrect) optStyle = {...optStyle, ...styles.triviaOptionWrong};
                return (
                  <button key={i} onClick={() => handleAnswer(letter)}
                    style={optStyle} disabled={triviaRevealed}>
                    <span style={styles.triviaOptionLetter}>{letter}</span>
                    <span>{opt.replace(/^[A-D]\)\s*/,"")}</span>
                    {triviaRevealed && isCorrect && <span style={styles.triviaCheck}>✓</span>}
                  </button>
                );
              })}
            </div>
            {triviaRevealed && (
              <div style={{...styles.triviaResult, ...(triviaCorrect ? styles.triviaResultCorrect : styles.triviaResultWrong)}}>
                <p style={styles.triviaResultLabel}>
                  {triviaCorrect ? "🎉 CORRECT!" : "❌ NOT QUITE"}
                </p>
                <p style={styles.triviaExplanation}>{trivia.explanation}</p>
                <SearchLinks query={`${trivia.team} ${trivia.question}`} style={{marginBottom: 12}} />
                <button onClick={() => loadTrivia(true)} style={styles.nextBtn}>
                  NEXT QUESTION →
                </button>
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  );
}

function AILoadingBlock({ text }) {
  return (
    <div style={styles.loading}>
      <div style={styles.loadingDots}>
        {[0,1,2].map(i => <span key={i} style={{...styles.dot, animationDelay:`${i*0.2}s`}} />)}
      </div>
      <p style={styles.loadingText}>{text}</p>
    </div>
  );
}

// ─── SAMPLE PUZZLE DATA (in production: fetched from Supabase by day-of-year) ──
// Grid: '.' = black cell, letter = solution, ' ' = empty white cell
const SAMPLE_PUZZLE = {
  title: "NY SPORTS LEGENDS - PUZZLE 1",
  subtitle: "THE DYNASTY GRID",
  date:  "Week 1 of 52",
  size:  15,
  solution: [
    ["J","E","T","E","R",".",".","B","R","O","D","E","U","R","."],
    [".",".",".",".",".",".",".",".",".",".",".",".",".",".","."],
    ["Y","A","N","K","E","E","S",".","M","E","S","S","I","E","R"],
    [".",".",".",".",".",".",".",".",".",".",".",".",".",".","."],
    ["N","A","M","A","T","H",".",".","P","I","A","Z","Z","A","."],
    [".",".",".",".",".",".",".",".",".",".",".",".",".",".","."],
    ["G","E","H","R","I","G",".","T","R","O","T","T","I","E","R"],
    [".",".",".",".",".",".",".",".",".",".",".",".",".",".","."],
    ["N","A","S","S","A","U",".",".","L","E","E","T","C","H","."],
    [".",".",".",".",".",".",".",".",".",".",".",".",".",".","."],
    ["E","W","I","N","G",".",".",".","S","E","A","V","E","R","."],
    [".",".",".",".",".",".",".",".",".",".",".",".",".",".","."],
    ["P","O","T","V","I","N",".",".","B","O","S","S","Y",".","."],
    [".",".",".",".",".",".",".",".",".",".",".",".",".",".","."],
    ["R","A","N","G","E","R","S",".","L","I","N","D","O","R","."],
  ],
  across: [
    { number:1, row:0, col:0, len:5, clue:"The Captain: 3,465 hits and 5 rings, all in pinstripes" },
    { number:2, row:0, col:7, len:7, clue:"Martin ___ : Devils Hall of Fame goalie, 3 Stanley Cups" },
    { number:3, row:2, col:0, len:7, clue:"The Bronx Bombers: 27 World Series championships" },
    { number:4, row:2, col:8, len:7, clue:"Mark ___ : guaranteed the 1994 Cup and delivered it" },
    { number:5, row:4, col:0, len:6, clue:"Broadway Joe: guaranteed Super Bowl III and delivered" },
    { number:6, row:4, col:8, len:6, clue:"Mike ___ : hit the most emotional HR in Mets history on 9/11" },
    { number:7, row:6, col:0, len:6, clue:"The Iron Horse: 2,130 consecutive games, the greatest Yankee" },
    { number:8, row:6, col:7, len:8, clue:"Bryan ___ : Islanders dynasty center, four Stanley Cup rings" },
    { number:9, row:8, col:0, len:6, clue:"Long Island county: home of the Islanders dynasty" },
    { number:10, row:8, col:8, len:6, clue:"Brian ___ : Rangers defenseman, 1994 Conn Smythe Trophy" },
    { number:11, row:10, col:0, len:5, clue:"Patrick ___ : Georgetown center, first NBA lottery pick" },
    { number:12, row:10, col:8, len:6, clue:"Tom Terrific: 311 wins, three Cy Youngs, greatest Met ever" },
    { number:13, row:12, col:0, len:6, clue:"Denis ___ : Islanders dynasty captain, four Cup rings" },
    { number:14, row:12, col:8, len:5, clue:"Mike ___ : nine straight 50-goal seasons" },
    { number:15, row:14, col:0, len:7, clue:"The Broadway blue-and-red: NY NHL team since 1926" },
    { number:16, row:14, col:8, len:6, clue:"Francisco ___ : current Mets SS, Mr. Smile" },
  ],
  down: [],
};

// ─── CROSSWORD COMPONENT ───────────────────────────────────────────────────

// ─── SCRAMBLE WORD LIST ───────────────────────────────────────────────────
const SCRAMBLE_WORDS = [
  { word:"JETER",      hint:"Yankees SS",    category:"Yankee Legend",  fact:"Derek Jeter hit a home run for his 3,000th career hit — the only player ever to do so." },
  { word:"NAMATH",     hint:"Jets QB",       category:"Jets Legend",    fact:"Joe Namath guaranteed Super Bowl III victory as a 17-point underdog. He delivered, 16-7." },
  { word:"SEAVER",     hint:"Mets SP",       category:"Mets Legend",    fact:"Tom Seaver struck out 19 Padres in 1970, including the final 10 in a row." },
  { word:"MESSIER",    hint:"Rangers C",     category:"Rangers Legend", fact:"Mark Messier guaranteed a win in Game 6 vs the Devils in 1994 — then scored a natural hat trick." },
  { word:"BOSSY",      hint:"Islanders RW",  category:"Islander",       fact:"Mike Bossy scored 50 goals in 50 games in 1981 — matching Rocket Richard's legendary mark." },
  { word:"PIAZZA",     hint:"Mets C",        category:"Mets Legend",    fact:"Mike Piazza's 9/11 home run on September 21, 2001 is the most emotional HR in baseball history." },
  { word:"EWING",      hint:"Knicks C",      category:"Knicks Legend",  fact:"Patrick Ewing played 15 seasons as a Knick and scored 23,665 points — the franchise record." },
  { word:"RIVERA",     hint:"Yankees RP",    category:"Yankee Legend",  fact:"Mariano Rivera was the first unanimous Hall of Fame inductee in baseball history." },
  { word:"GEHRIG",     hint:"Yankees 1B",    category:"Yankee Legend",  fact:"Lou Gehrig played 2,130 consecutive games and was known as 'The Iron Horse'." },
  { word:"BRODEUR",    hint:"Devils G",      category:"Devils Legend",  fact:"Martin Brodeur holds the all-time NHL records for wins (691) and shutouts (125)." },
  { word:"POTVIN",     hint:"Islanders D",   category:"Islander",       fact:"Denis Potvin broke Bobby Orr's all-time defenseman scoring record." },
  { word:"LEETCH",     hint:"Rangers D",     category:"Rangers Legend", fact:"Brian Leetch was the first American-born player to win the Conn Smythe Trophy." },
  { word:"MANTLE",     hint:"Yankees CF",    category:"Yankee Legend",  fact:"Mickey Mantle won the Triple Crown in 1956 — .353 AVG, 52 HR, 130 RBI." },
  { word:"STRAWBERRY", hint:"Mets RF",       category:"Mets Legend",    fact:"Darryl Strawberry was the most naturally gifted hitter of his generation." },
  { word:"TAYLOR",     hint:"Giants LB",     category:"Giants Legend",  fact:"Lawrence Taylor is the only defensive player to win the NFL MVP award in the modern era." },
  { word:"PARCELLS",   hint:"Giants coach",  category:"Giants Legend",  fact:"Bill Parcells won two Super Bowls with the Giants and later rebuilt the Jets." },
  { word:"MOOKIE",     hint:"Mets CF",       category:"Mets Legend",    fact:"Mookie Wilson's slow roller went through Bill Buckner's legs in 1986 World Series Game 6." },
  { word:"MUNSON",     hint:"Yankees C",     category:"Yankee Legend",  fact:"Thurman Munson died in a plane crash at age 32. His number 15 was retired immediately." },
  { word:"TROTTIER",   hint:"Islanders C",   category:"Islander",       fact:"Bryan Trottier won 4 Cups with the Islanders and 2 more with Pittsburgh — 6 total." },
  { word:"FRAZIER",    hint:"Knicks G",      category:"Knicks Legend",  fact:"Walt Frazier scored 36 points and dished 19 assists in Game 7 of the 1970 NBA Finals." },
  { word:"LUNDQVIST",  hint:"Rangers G",     category:"Rangers Legend", fact:"Henrik Lundqvist was called 'The King' — he won the Vezina Trophy in 2012." },
  { word:"HENDERSON",  hint:"Yankees LF",    category:"Yankee Legend",  fact:"Rickey Henderson set the all-time stolen base record (1,406) — many as a Yankee." },
  { word:"GOODEN",     hint:"Mets SP",       category:"Mets Legend",    fact:"Dwight Gooden went 24-4 with a 1.53 ERA in 1985 at just 20 years old." },
  { word:"REED",       hint:"Knicks C",      category:"Knicks Legend",  fact:"Willis Reed's limping entrance in Game 7 of the 1970 Finals is the most inspiring in sports history." },
  { word:"RUTH",       hint:"Yankees RF",    category:"Yankee Legend",  fact:"Babe Ruth hit 714 career home runs and The House That Ruth Built was named in his honor." },
];

// ─── EMOJI QUIZ DATA ──────────────────────────────────────────────────────
const EMOJI_QUIZ = [
  { emojis:"⚾🔔🗽", answer:"METS", hint:"NY National League team", fact:"The Mets were founded in 1962 to bring NL baseball back to New York after the Dodgers and Giants left.", choices:["METS","YANKEES","CUBS","RED SOX"] },
  { emojis:"⚾🎩📌", answer:"YANKEES", hint:"The Bronx Bombers", fact:"The Yankees have 27 World Series championships — more than any franchise in North American sports.", choices:["METS","YANKEES","DODGERS","GIANTS"] },
  { emojis:"🏒🗽🔵", answer:"RANGERS", hint:"Broadway Blueshirts", fact:"The Rangers ended 54 years of heartbreak in 1994 when Mark Messier led them to the Stanley Cup.", choices:["RANGERS","ISLANDERS","DEVILS","BRUINS"] },
  { emojis:"🏒🏝️4️⃣", answer:"ISLANDERS", hint:"4 consecutive Stanley Cups", fact:"The Islanders won 4 consecutive Stanley Cups from 1980-1983 — the most dominant dynasty in modern NHL history.", choices:["RANGERS","ISLANDERS","DEVILS","PENGUINS"] },
  { emojis:"🏈✈️🗽", answer:"JETS", hint:"Gang Green", fact:"Joe Namath guaranteed a Super Bowl victory in 1969 as a 17-point underdog. He delivered.", choices:["JETS","GIANTS","PATRIOTS","DOLPHINS"] },
  { emojis:"🏈🔵🔴🗽", answer:"GIANTS", hint:"Big Blue", fact:"The Giants have won 4 Super Bowls, including two miraculous upsets of the undefeated New England Patriots.", choices:["JETS","GIANTS","COWBOYS","EAGLES"] },
  { emojis:"🏀🎵🏟️", answer:"KNICKS", hint:"Madison Square Garden", fact:"The Knicks won back-to-back NBA championships in 1970 and 1973, led by Willis Reed and Walt Frazier.", choices:["KNICKS","NETS","CELTICS","BULLS"] },
  { emojis:"⚾3️⃣🏠", answer:"BABE RUTH", hint:"Yankees legend", fact:"Babe Ruth wore #3. Yankee Stadium was called 'The House That Ruth Built.'", choices:["BABE RUTH","LOU GEHRIG","JOE DIMAGGIO","MICKEY MANTLE"] },
  { emojis:"⚾2️⃣👑", answer:"DEREK JETER", hint:"The Captain", fact:"Derek Jeter was the only Yankee to homer for his 3,000th career hit. He wore #2.", choices:["DEREK JETER","DON MATTINGLY","MARIANO RIVERA","BERNIE WILLIAMS"] },
  { emojis:"🎸🎺🏒", answer:"ENTER SANDMAN", hint:"Metallica + Yankees bullpen", fact:"Mariano Rivera's Enter Sandman walk-up is the most iconic in baseball history. MSG shook when he emerged.", choices:["ENTER SANDMAN","WELCOME TO THE JUNGLE","EMPIRE STATE OF MIND","ENTER SANDMAN"] },
  { emojis:"🏒✅5️⃣4️⃣", answer:"1994 RANGERS", hint:"End of the drought", fact:"The 1994 Rangers ended 54 years of suffering. Messier guaranteed it. MSG erupted.", choices:["1994 RANGERS","1980 ISLANDERS","2003 DEVILS","1995 DEVILS"] },
  { emojis:"⚾😇🍎86", answer:"1986 METS", hint:"The Bad Guys Won", fact:"The 1986 Mets went 108-54. Mookie's grounder, Buckner's error, Doc and Straw. The Bad Guys Won.", choices:["1986 METS","1969 METS","2015 METS","2000 METS"] },
  { emojis:"🐎🏅31️⃣", answer:"SECRETARIAT", hint:"Belmont Park, 31 lengths, 1973", fact:"Secretariat won the 1973 Belmont Stakes at Belmont Park in Elmont NY by 31 lengths in a world record 2:24 flat.", choices:["SECRETARIAT","AMERICAN PHAROAH","AFFIRMED","SEATTLE SLEW"] },
  { emojis:"🏀😔🦶🏥", answer:"WILLIS REED", hint:"Game 7, 1970 NBA Finals", fact:"Willis Reed tore his thigh muscle, but limped onto the MSG court for Game 7. The crowd went insane.", choices:["WILLIS REED","PATRICK EWING","WALT FRAZIER","EARL MONROE"] },
  { emojis:"⚾💪9️⃣/2️⃣1️⃣", answer:"MIKE PIAZZA", hint:"9/11 home run, Sept 21 2001", fact:"Piazza's solo shot in the 8th inning on Sept 21, 2001 lifted the Mets over the Braves. The city needed it.", choices:["MIKE PIAZZA","TOM SEAVER","DWIGHT GOODEN","DARRYL STRAWBERRY"] },
  { emojis:"🏈🎙️✅💬", answer:"JOE NAMATH", hint:"I guarantee it", fact:"Namath guaranteed Super Bowl III victory as a 17-point underdog. The Jets won 16-7 over Baltimore.", choices:["JOE NAMATH","ELI MANNING","PHIL SIMMS","CHAD PENNINGTON"] },
  { emojis:"🏒🎵🤝", answer:"MARK MESSIER", hint:"Guaranteed + hat trick", fact:"Messier guaranteed a Game 6 win vs the Devils in 1994 when the Rangers were down 3-2. He then scored a natural hat trick.", choices:["MARK MESSIER","BRIAN LEETCH","HENRIK LUNDQVIST","ROD GILBERT"] },
  { emojis:"⚾🎩🔄5️⃣6️⃣", answer:"JOE DIMAGGIO", hint:"56 consecutive games", fact:"Joe DiMaggio hit safely in 56 consecutive games in 1941 — a record mathematicians call the most unbreakable in sports.", choices:["JOE DIMAGGIO","BABE RUTH","TED WILLIAMS","MICKEY MANTLE"] },
];

// ─── HANGMAN WORDS ────────────────────────────────────────────────────────
const HANGMAN_WORDS = [
  { word:"JETER",        hint:"The Captain — wore #2, 5 rings", category:"Yankee" },
  { word:"NAMATH",       hint:"Broadway Joe — Super Bowl III guarantee", category:"Jet" },
  { word:"SEAVER",       hint:"Tom Terrific — 3 Cy Youngs", category:"Met" },
  { word:"MESSIER",      hint:"1994 Cup captain — guaranteed victory", category:"Ranger" },
  { word:"BOSSY",        hint:"9 straight 50-goal seasons", category:"Islander" },
  { word:"EWING",        hint:"Greatest Knick — Georgetown center", category:"Knick" },
  { word:"PIAZZA",       hint:"9/11 home run catcher", category:"Met" },
  { word:"BRODEUR",      hint:"691 wins — all-time NHL goalie", category:"Devil" },
  { word:"RUTH",         hint:"Sultan of Swat — 714 HR", category:"Yankee" },
  { word:"MANTLE",       hint:"Triple Crown 1956 — Commerce Comet", category:"Yankee" },
  { word:"TAYLOR",       hint:"LT — greatest defender in NFL history", category:"Giant" },
  { word:"GEHRIG",       hint:"Iron Horse — 2,130 consecutive games", category:"Yankee" },
  { word:"RIVERA",       hint:"Enter Sandman — 652 saves", category:"Yankee" },
  { word:"FRAZIER",      hint:"Clyde — 36pts/19ast in 1970 Game 7", category:"Knick" },
  { word:"REED",         hint:"Limped onto court in Game 7, 1970", category:"Knick" },
  { word:"LEETCH",       hint:"First American Conn Smythe winner", category:"Ranger" },
  { word:"TROTTIER",     hint:"Islanders engine — Hart Trophy 1979", category:"Islander" },
  { word:"GOODEN",       hint:"Doc — 24-4, 1.53 ERA at age 20", category:"Met" },
  { word:"PARCELLS",     hint:"Big Tuna — 2 Super Bowls with Giants", category:"Giant" },
  { word:"STRAWBERRY",   hint:"The Straw Man — 252 Mets home runs", category:"Met" },
  { word:"LUNDQVIST",    hint:"The King — Vezina 2012", category:"Ranger" },
  { word:"POTVIN",       hint:"Broke Orr's record — 4 Cups", category:"Islander" },
  { word:"MUNSON",       hint:"Yankees Captain — #15 retired forever", category:"Yankee" },
  { word:"MOOKIE",       hint:"His grounder went through Buckner's legs", category:"Met" },
  { word:"HENDERSON",    hint:"Most stolen bases ever — set record as a Yankee", category:"Yankee" },
];

// ─── SCRAMBLE COMPONENT ───────────────────────────────────────────────────
function ScrambleGame({ myTeams }) {
  const [wordObj, setWordObj]     = useState(null);
  const [scrambled, setScrambled] = useState([]);   // array of letters (tiles)
  const [answer, setAnswer]       = useState([]);   // letters user has placed
  const [available, setAvailable] = useState([]);   // which tile indices still in pool
  const [result, setResult]       = useState(null); // null | "correct" | "wrong"
  const [hints, setHints]         = useState(0);
  const [tries, setTries]         = useState(0);
  const [mode, setMode]           = useState("click"); // "click" | "type"
  const [typed, setTyped]         = useState("");
  const inputRef = useRef(null);

  function scrambleWord(w) {
    const arr = w.split("");
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    if (arr.join("") === w && w.length > 1) return scrambleWord(w);
    return arr;
  }

  function newWord() {
    const w = SCRAMBLE_WORDS[Math.floor(Math.random() * SCRAMBLE_WORDS.length)];
    const sc = scrambleWord(w.word);
    setWordObj(w);
    setScrambled(sc);
    setAnswer(Array(w.word.length).fill(null));   // null = empty slot
    setAvailable(sc.map((_, i) => i));            // all tile indices available
    setResult(null); setHints(0); setTries(0); setTyped("");
  }

  useEffect(() => { newWord(); }, []);

  // ── CLICK MODE: tap a tile to place it, tap an answer slot to remove it ──
  function clickTile(tileIdx) {
    if (result) return;
    // Find first empty slot in answer
    const firstEmpty = answer.indexOf(null);
    if (firstEmpty === -1) return;
    const newAnswer = [...answer];
    newAnswer[firstEmpty] = tileIdx;
    const newAvail = available.filter(i => i !== tileIdx);
    setAnswer(newAnswer);
    setAvailable(newAvail);
    // Auto-check when all slots filled
    if (newAvail.length === 0) {
      const word = newAnswer.map(idx => scrambled[idx]).join("");
      checkWord(word, newAnswer, newAvail);
    }
  }

  function clickAnswerSlot(slotIdx) {
    if (result) return;
    const tileIdx = answer[slotIdx];
    if (tileIdx === null) return;
    // Return tile to pool
    const newAnswer = [...answer];
    newAnswer[slotIdx] = null;
    setAnswer(newAnswer);
    setAvailable(prev => [...prev, tileIdx].sort((a,b)=>a-b));
  }

  function checkWord(word, ans, avail) {
    if (!wordObj) return;
    if (word === wordObj.word) {
      setResult("correct");
    } else {
      const newTries = tries + 1;
      setTries(newTries);
      if (newTries >= 3) {
        setResult("wrong");
      } else {
        // Shake and reset after short delay
        setTimeout(() => {
          setAnswer(Array(wordObj.word.length).fill(null));
          setAvailable(scrambled.map((_, i) => i));
        }, 600);
      }
    }
  }

  // ── TYPE MODE ──
  function handleTypedGuess() {
    if (!wordObj) return;
    const clean = typed.trim().toUpperCase();
    if (clean === wordObj.word) {
      setResult("correct");
    } else {
      const newTries = tries + 1;
      setTries(newTries);
      if (newTries >= 3) setResult("wrong");
      else setTyped("");
    }
  }

  if (!wordObj) return null;

  const answerWord = answer.map(idx => (idx !== null ? scrambled[idx] : null));
  const allPlaced  = answer.every(s => s !== null);

  return (
    <div style={{background:"#161616", border:"1px solid #2a2a2a", padding:"20px", maxWidth:520}}>
      {/* Header */}
      <div style={{display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16, flexWrap:"wrap", gap:8}}>
        <div style={{fontSize:9, fontWeight:900, color:"#c8201c", letterSpacing:"0.15em"}}>
          🔀 SCRAMBLE — NY SPORTS LEGEND
        </div>
        <div style={{display:"flex", gap:6}}>
          <button onClick={() => setMode(m => m==="click"?"type":"click")}
            style={{fontSize:9, padding:"3px 10px", background:"transparent", border:"1px solid #444",
              color:"#888", cursor:"pointer", fontWeight:700, letterSpacing:"0.08em"}}>
            {mode==="click" ? "⌨️ TYPE MODE" : "🖱️ CLICK MODE"}
          </button>
          <button onClick={newWord}
            style={{fontSize:9, padding:"3px 10px", background:"transparent", border:"1px solid #444",
              color:"#888", cursor:"pointer", fontWeight:700, letterSpacing:"0.08em"}}>
            ↺ NEW WORD
          </button>
        </div>
      </div>

      {/* Category + hint */}
      <div style={{textAlign:"center", marginBottom:16}}>
        <div style={{fontSize:10, color:"#666", marginBottom:6}}>
          Category: <span style={{color:"#c8201c", fontWeight:900}}>{wordObj.category}</span>
          {tries > 0 && <span style={{color:"#f87171", marginLeft:12}}>
            {3 - tries} {3-tries===1?"try":"tries"} left
          </span>}
        </div>
        {hints >= 1 && (
          <div style={{fontSize:11, color:"#f0b429", fontStyle:"italic", background:"#1a1600",
            border:"1px solid #f0b42944", padding:"6px 12px", display:"inline-block"}}>
            💡 {wordObj.hint}
          </div>
        )}
      </div>

      {/* Answer slots */}
      <div style={{display:"flex", gap:6, justifyContent:"center", flexWrap:"wrap", marginBottom:20}}>
        {answerWord.map((letter, i) => (
          <div key={i}
            onClick={() => mode==="click" && clickAnswerSlot(i)}
            style={{
              width:42, height:48,
              border:`2px solid ${letter ? (result==="correct"?"#22c55e":result==="wrong"?"#c8201c":"#888") : "#333"}`,
              background: letter ? (result==="correct"?"#0d2a1a":result==="wrong"?"#2a0d0d":"#2a2a2a") : "#111",
              display:"flex", alignItems:"center", justifyContent:"center",
              fontSize:20, fontWeight:900, color: result==="correct"?"#4ade80":result==="wrong"?"#f87171":"#e8e0d0",
              fontFamily:"'Georgia',serif",
              cursor: mode==="click" && letter ? "pointer" : "default",
              transition:"all 0.15s",
              borderBottom: letter ? "3px solid #444" : "3px solid #222",
            }}>
            {letter || ""}
          </div>
        ))}
      </div>

      {/* Scrambled tile pool (click mode) */}
      {mode === "click" && result === null && (
        <div style={{display:"flex", gap:6, justifyContent:"center", flexWrap:"wrap", marginBottom:16,
          padding:"12px", background:"#111", border:"1px solid #1a1a1a", minHeight:64}}>
          {scrambled.map((letter, i) => {
            const isUsed = !available.includes(i);
            return (
              <div key={i}
                onClick={() => !isUsed && clickTile(i)}
                style={{
                  width:42, height:48,
                  border:`2px solid ${isUsed?"#222":"#c8201c"}`,
                  background: isUsed ? "#0a0a0a" : "#1a1a1a",
                  display:"flex", alignItems:"center", justifyContent:"center",
                  fontSize:20, fontWeight:900,
                  color: isUsed ? "#222" : "#e8e0d0",
                  fontFamily:"'Georgia',serif",
                  cursor: isUsed ? "default" : "pointer",
                  transition:"all 0.15s",
                  transform: isUsed ? "none" : "translateY(-1px)",
                  boxShadow: isUsed ? "none" : "0 2px 0 #8a0000",
                  userSelect:"none",
                }}>
                {isUsed ? "" : letter}
              </div>
            );
          })}
          <div style={{width:"100%", textAlign:"center", fontSize:9, color:"#444", marginTop:6}}>
            Click tiles to build your answer · Click an answer letter to return it
          </div>
        </div>
      )}

      {/* Type mode input */}
      {mode === "type" && result === null && (
        <div style={{display:"flex", gap:8, justifyContent:"center", marginBottom:16, flexWrap:"wrap"}}>
          <input
            ref={inputRef}
            value={typed}
            onChange={e => setTyped(e.target.value.toUpperCase().replace(/[^A-Z]/g,""))}
            onKeyDown={e => e.key==="Enter" && handleTypedGuess()}
            placeholder="Type your answer..."
            autoFocus
            style={{padding:"10px 14px", background:"#111", border:"1px solid #444",
              color:"#e8e0d0", fontSize:16, fontFamily:"'Georgia',serif",
              letterSpacing:"0.15em", outline:"none", minWidth:180}}
          />
          <button onClick={handleTypedGuess}
            style={{background:"#c8201c", border:"none", color:"#fff",
              padding:"10px 20px", cursor:"pointer", fontSize:11, fontWeight:900, letterSpacing:"0.1em"}}>
            GUESS
          </button>
        </div>
      )}

      {/* Hint + manual check for click mode */}
      {result === null && (
        <div style={{display:"flex", gap:8, justifyContent:"center", flexWrap:"wrap"}}>
          {hints < 1 && (
            <button onClick={() => setHints(1)}
              style={{background:"transparent", border:"1px solid #f0b42966", color:"#f0b429",
                padding:"7px 16px", cursor:"pointer", fontSize:11, fontWeight:900, letterSpacing:"0.08em"}}>
              💡 HINT
            </button>
          )}
          {mode === "click" && allPlaced && (
            <button onClick={() => checkWord(answerWord.join(""), answer, available)}
              style={{background:"#c8201c", border:"none", color:"#fff",
                padding:"7px 20px", cursor:"pointer", fontSize:11, fontWeight:900, letterSpacing:"0.1em"}}>
              ✓ CHECK
            </button>
          )}
          {mode === "click" && !allPlaced && available.length < scrambled.length && (
            <button onClick={() => { setAnswer(Array(wordObj.word.length).fill(null)); setAvailable(scrambled.map((_,i)=>i)); }}
              style={{background:"transparent", border:"1px solid #444", color:"#666",
                padding:"7px 14px", cursor:"pointer", fontSize:11, fontWeight:700}}>
              CLEAR
            </button>
          )}
        </div>
      )}

      {/* Result */}
      {result === "correct" && (
        <div style={{textAlign:"center", marginTop:12}}>
          <div style={{fontSize:18, fontWeight:900, color:"#4ade80", marginBottom:8}}>🎉 CORRECT!</div>
          <p style={{fontSize:12, color:"#aaa", lineHeight:1.6, marginBottom:16,
            fontFamily:"'Georgia',serif", textAlign:"left"}}>{wordObj.fact}</p>
          <button onClick={newWord}
            style={{background:"#c8201c", border:"none", color:"#fff",
              padding:"10px 24px", cursor:"pointer", fontSize:11, fontWeight:900, letterSpacing:"0.1em"}}>
            NEXT WORD →
          </button>
        </div>
      )}

      {result === "wrong" && (
        <div style={{textAlign:"center", marginTop:12}}>
          <div style={{fontSize:14, fontWeight:900, color:"#f87171", marginBottom:6}}>
            The answer was: <span style={{color:"#e8e0d0", letterSpacing:"0.15em"}}>{wordObj.word}</span>
          </div>
          <p style={{fontSize:12, color:"#aaa", lineHeight:1.6, marginBottom:16,
            fontFamily:"'Georgia',serif", textAlign:"left"}}>{wordObj.fact}</p>
          <button onClick={newWord}
            style={{background:"#c8201c", border:"none", color:"#fff",
              padding:"10px 24px", cursor:"pointer", fontSize:11, fontWeight:900, letterSpacing:"0.1em"}}>
            TRY ANOTHER →
          </button>
        </div>
      )}
    </div>
  );
}


// ─── EMOJI QUIZ COMPONENT ─────────────────────────────────────────────────
function EmojiQuizGame({ myTeams }) {
  const [qIdx, setQIdx] = useState(() => Math.floor(Math.random() * EMOJI_QUIZ.length));
  const [selected, setSelected] = useState(null);
  const [showFact, setShowFact] = useState(false);

  const q = EMOJI_QUIZ[qIdx];

  function nextQ() {
    let next = Math.floor(Math.random() * EMOJI_QUIZ.length);
    if (next === qIdx) next = (next + 1) % EMOJI_QUIZ.length;
    setQIdx(next);
    setSelected(null);
    setShowFact(false);
  }

  function handleChoice(c) {
    if (selected) return;
    setSelected(c);
    setShowFact(true);
  }

  const isCorrect = selected === q.answer;

  return (
    <div style={{background:"#161616", border:"1px solid #2a2a2a", padding:"20px"}}>
      <div style={{fontSize:9, fontWeight:900, color:"#c8201c", letterSpacing:"0.15em", marginBottom:16}}>
        🤔 EMOJI QUIZ — GUESS THE NY SPORTS MOMENT
      </div>
      <div style={{textAlign:"center", marginBottom:20}}>
        <div style={{fontSize:48, letterSpacing:"0.1em", marginBottom:12}}>{q.emojis}</div>
        <div style={{fontSize:11, color:"#666", fontStyle:"italic"}}>Hint: {q.hint}</div>
      </div>
      <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, marginBottom:16}}>
        {q.choices.map((c, i) => {
          const isRight = c === q.answer;
          let bg = "#1a1a1a", border = "1px solid #333", color = "#ccc";
          if (selected) {
            if (isRight) { bg = "#0d2a1a"; border = "1px solid #2d8a50"; color = "#4ade80"; }
            else if (c === selected && !isRight) { bg = "#2a0d0d"; border = "1px solid #c8201c"; color = "#f87171"; }
          }
          return (
            <button key={i} onClick={() => handleChoice(c)}
              style={{background:bg, border, color, padding:"10px 12px", cursor:selected?"default":"pointer",
                fontSize:11, fontWeight:700, fontFamily:"'Georgia',serif", textAlign:"left",
                transition:"all 0.15s"}}>
              {c}
              {selected && isRight && " ✓"}
              {selected && c === selected && !isRight && " ✗"}
            </button>
          );
        })}
      </div>
      {showFact && (
        <div>
          <div style={{padding:"12px 14px", background:isCorrect?"#0d2a1a":"#1a0d0d",
            border:`1px solid ${isCorrect?"#2d8a50":"#c8201c"}`, marginBottom:12}}>
            <div style={{fontSize:14, fontWeight:900, color:isCorrect?"#4ade80":"#f87171", marginBottom:6}}>
              {isCorrect ? "🎉 Correct!" : `❌ The answer was: ${q.answer}`}
            </div>
            <p style={{margin:0, fontSize:12, color:"#aaa", lineHeight:1.6, fontFamily:"'Georgia',serif"}}>{q.fact}</p>
          </div>
          <div style={{display:"flex", gap:8, justifyContent:"center", flexWrap:"wrap"}}>
            <button onClick={nextQ} style={{background:"#c8201c", border:"none", color:"#fff",
              padding:"10px 24px", cursor:"pointer", fontSize:11, fontWeight:900, letterSpacing:"0.1em"}}>
              NEXT EMOJI →
            </button>
            {isCorrect && (
              <button onClick={() => {
                const text = `I nailed the NY Sports Emoji Quiz on nysportsdaily.com! Can you guess ${q.emojis}?`;
                navigator.clipboard?.writeText(text).catch(()=>{});
              }} style={{background:"transparent", border:"1px solid #555", color:"#888",
                padding:"10px 16px", cursor:"pointer", fontSize:11, fontWeight:900}}>
                📋 SHARE
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── HANGMAN COMPONENT ────────────────────────────────────────────────────
function HangmanGame({ myTeams }) {
  const [wordObj, setWordObj] = useState(null);
  const [guessed, setGuessed] = useState(new Set());
  const [wrong, setWrong] = useState(0);
  const MAX_WRONG = 6;

  function newGame() {
    const w = HANGMAN_WORDS[Math.floor(Math.random() * HANGMAN_WORDS.length)];
    setWordObj(w);
    setGuessed(new Set());
    setWrong(0);
  }

  useEffect(() => { newGame(); }, []);

  if (!wordObj) return null;

  const won  = wordObj.word.split("").every(l => guessed.has(l));
  const lost = wrong >= MAX_WRONG;

  function guess(l) {
    if (guessed.has(l) || won || lost) return;
    const newG = new Set(guessed); newG.add(l);
    setGuessed(newG);
    if (!wordObj.word.includes(l)) setWrong(w => w + 1);
  }

  const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

  // Simple SVG gallows
  const parts = [
    <line key="h" x1="10" y1="10" x2="90" y2="10" stroke="#c8201c" strokeWidth="3"/>,
    <line key="v" x1="50" y1="10" x2="50" y2="25" stroke="#c8201c" strokeWidth="3"/>,
    <circle key="head" cx="50" cy="32" r="7" stroke="#e8e0d0" strokeWidth="2" fill="none"/>,
    <line key="body" x1="50" y1="39" x2="50" y2="60" stroke="#e8e0d0" strokeWidth="2"/>,
    <line key="larm" x1="50" y1="45" x2="38" y2="55" stroke="#e8e0d0" strokeWidth="2"/>,
    <line key="rarm" x1="50" y1="45" x2="62" y2="55" stroke="#e8e0d0" strokeWidth="2"/>,
    <line key="lleg" x1="50" y1="60" x2="38" y2="75" stroke="#e8e0d0" strokeWidth="2"/>,
    <line key="rleg" x1="50" y1="60" x2="62" y2="75" stroke="#e8e0d0" strokeWidth="2"/>,
  ];

  return (
    <div style={{background:"#161616", border:"1px solid #2a2a2a", padding:"20px"}}>
      <div style={{fontSize:9, fontWeight:900, color:"#c8201c", letterSpacing:"0.15em", marginBottom:16}}>
        🎯 HANGMAN — GUESS THE NY SPORTS LEGEND
      </div>
      <div style={{display:"flex", gap:20, alignItems:"flex-start", flexWrap:"wrap"}}>
        {/* Gallows */}
        <div style={{flexShrink:0}}>
          <svg width="100" height="90" viewBox="0 0 100 90">
            <line x1="10" y1="85" x2="90" y2="85" stroke="#555" strokeWidth="3"/>
            <line x1="20" y1="10" x2="20" y2="85" stroke="#555" strokeWidth="3"/>
            {parts.slice(0, wrong + 1)}
          </svg>
          <div style={{textAlign:"center", fontSize:10, color:"#555"}}>
            {MAX_WRONG - wrong} left
          </div>
        </div>

        {/* Word display */}
        <div style={{flex:1}}>
          <div style={{display:"flex", gap:8, flexWrap:"wrap", marginBottom:16}}>
            {wordObj.word.split("").map((l, i) => (
              <div key={i} style={{
                width:32, height:40, borderBottom:`2px solid ${guessed.has(l)?"#e8e0d0":"#555"}`,
                display:"flex", alignItems:"center", justifyContent:"center",
                fontSize:20, fontWeight:900, color:"#e8e0d0", fontFamily:"'Georgia',serif",
              }}>
                {guessed.has(l) || won || lost ? l : ""}
              </div>
            ))}
          </div>

          <div style={{fontSize:10, color:"#666", marginBottom:12}}>
            Category: <span style={{color:"#c8201c", fontWeight:900}}>{wordObj.category}</span>
            {" · "}{wordObj.hint}
          </div>

          {/* Wrong letters */}
          {[...guessed].filter(l => !wordObj.word.includes(l)).length > 0 && (
            <div style={{fontSize:10, color:"#f87171", marginBottom:12}}>
              Wrong: {[...guessed].filter(l => !wordObj.word.includes(l)).join("  ")}
            </div>
          )}

          {(won || lost) ? (
            <div>
              <div style={{fontSize:16, fontWeight:900, color:won?"#4ade80":"#f87171", marginBottom:8}}>
                {won ? "🎉 CORRECT!" : `💀 The answer was: ${wordObj.word}`}
              </div>
              <p style={{fontSize:11, color:"#aaa", lineHeight:1.6, marginBottom:12, fontFamily:"'Georgia',serif"}}>{wordObj.hint}</p>
              <button onClick={newGame} style={{background:"#c8201c", border:"none", color:"#fff",
                padding:"8px 20px", cursor:"pointer", fontSize:11, fontWeight:900, letterSpacing:"0.1em"}}>
                NEW WORD →
              </button>
            </div>
          ) : (
            /* Keyboard */
            <div style={{display:"flex", flexWrap:"wrap", gap:5, maxWidth:300}}>
              {LETTERS.map(l => (
                <button key={l} onClick={() => guess(l)} disabled={guessed.has(l) || won || lost}
                  style={{
                    width:30, height:30, background:guessed.has(l)
                      ? (wordObj.word.includes(l) ? "#0d2a1a" : "#2a0d0d")
                      : "#1a1a1a",
                    border:`1px solid ${guessed.has(l)
                      ? (wordObj.word.includes(l) ? "#2d8a50" : "#c8201c")
                      : "#444"}`,
                    color:guessed.has(l)
                      ? (wordObj.word.includes(l) ? "#4ade80" : "#f87171")
                      : "#ccc",
                    cursor:guessed.has(l)?"default":"pointer",
                    fontSize:12, fontWeight:900,
                  }}>
                  {l}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── MONTHLY CROSSWORD COMPONENT ──────────────────────────────────────────
function PlayroomCrossword() {
  const monthNum = new Date().getMonth();
  const MONTH_NAMES = ["JANUARY","FEBRUARY","MARCH","APRIL","MAY","JUNE",
                       "JULY","AUGUST","SEPTEMBER","OCTOBER","NOVEMBER","DECEMBER"];

  const MONTHLY_FILLIN = [
    { month:"JANUARY",   theme:"NY WINTER LEGENDS", entries:[
      { answer:"JETER",       clue:"The Captain — 3,465 hits, 5 rings, wore #2" },
      { answer:"MESSIER",     clue:"Guaranteed Game 6 win in 1994 — then scored a hat trick" },
      { answer:"NAMATH",      clue:"Broadway Joe — I guarantee it" },
      { answer:"EWING",       clue:"Georgetown center — greatest Knick of all time" },
      { answer:"BOSSY",       clue:"9 straight 50-goal seasons with the Islanders" },
      { answer:"BRODEUR",     clue:"691 wins, 125 shutouts — all-time NHL goalie records" },
      { answer:"GEHRIG",      clue:"The Iron Horse — 2,130 consecutive games" },
      { answer:"RIVERA",      clue:"Enter Sandman — first unanimous Hall of Famer" },
      { answer:"REED",        clue:"Limped onto MSG court in Game 7, 1970" },
      { answer:"LEETCH",      clue:"First American to win the Conn Smythe Trophy" },
    ]},
    { month:"FEBRUARY",  theme:"SUPER BOWL NY", entries:[
      { answer:"PARCELLS",    clue:"Big Tuna — 2 Super Bowl titles with the Giants" },
      { answer:"TAYLOR",      clue:"LT — only defensive player to win NFL MVP" },
      { answer:"SIMMS",       clue:"22 of 25 in Super Bowl XXI — still the completion record" },
      { answer:"MANNING",     clue:"Beat the undefeated Patriots twice in the Super Bowl" },
      { answer:"NAMATH",      clue:"Super Bowl III MVP — guaranteed the win" },
      { answer:"STRAHAN",     clue:"141.5 career sacks — single-season record 22.5" },
      { answer:"ANDERSON",    clue:"Super Bowl XXV MVP at age 34 — Ottis ___" },
      { answer:"TYREE",       clue:"David ___ — the helmet catch that stunned 18-0 Patriots" },
      { answer:"MARTIN",      clue:"Curtis ___ — greatest Jet since Namath, 14,101 rush yards" },
      { answer:"REVIS",       clue:"___ Island — most dominant CB of his era" },
    ]},
    { month:"MARCH",     theme:"KNICKS AND RANGERS", entries:[
      { answer:"FRAZIER",     clue:"Clyde — 36 pts, 19 ast in Game 7 of the 1970 Finals" },
      { answer:"REED",        clue:"The Captain — limped onto MSG court in the 1970 Finals" },
      { answer:"MESSIER",     clue:"Rangers captain who ended 54 years of drought" },
      { answer:"LEETCH",      clue:"Conn Smythe 1994 — greatest American in NHL history" },
      { answer:"GILBERT",     clue:"Rod ___ — all-time Rangers scoring leader for decades" },
      { answer:"RICHTER",     clue:"Mike ___ — 42-save game in the 1994 Finals" },
      { answer:"BRUNSON",     clue:"Jalen ___ — MSG's new hero, took a hometown discount" },
      { answer:"LUNDQVIST",   clue:"The King — Vezina Trophy 2012, .921 save percentage" },
      { answer:"MONROE",      clue:"The Pearl — Earl ___, pure playground genius at MSG" },
      { answer:"DEBUSSCHERE",  clue:"Dave ___ — power forward on both championship Knicks" },
    ]},
    { month:"APRIL",     theme:"BASEBALL OPENING DAY", entries:[
      { answer:"SEAVER",      clue:"Tom Terrific — 3 Cy Youngs, greatest Met ever" },
      { answer:"JUDGE",       clue:"Aaron ___ — 62 HR in 2022, the American League record" },
      { answer:"MATTINGLY",   clue:"Donnie Baseball — 9 Gold Gloves, AL MVP 1985" },
      { answer:"GOODEN",      clue:"Doc — 24-4, 1.53 ERA at just 20 years old" },
      { answer:"PIAZZA",      clue:"9/11 home run — most emotional HR in baseball history" },
      { answer:"RIVERA",      clue:"Mariano ___ — 652 saves, Enter Sandman" },
      { answer:"LINDOR",      clue:"Francisco ___ — Mr. Smile, My Girl walk-up song" },
      { answer:"JETER",       clue:"Hit a homer for his 3,000th career hit — only player ever" },
      { answer:"SOTO",        clue:"Juan ___ — $765M contract, biggest in baseball history" },
      { answer:"STRAWBERRY",  clue:"Darryl ___ — 252 Mets home runs, 8 All-Star selections" },
    ]},
    { month:"MAY",       theme:"ISLANDERS DYNASTY", entries:[
      { answer:"BOSSY",       clue:"Mike ___ — 573 goals, 9 straight 50-goal seasons" },
      { answer:"TROTTIER",    clue:"Bryan ___ — Hart Trophy 1979, dynasty engine" },
      { answer:"POTVIN",      clue:"Denis ___ — captain of 4 Cups, broke Orr's record" },
      { answer:"GILLIES",     clue:"Clark ___ — the enforcer who protected Bossy" },
      { answer:"SMITH",       clue:"Billy ___ — Battlin' Billy, Vezina 1982" },
      { answer:"NYSTROM",     clue:"Bob ___ — OT goal that started the dynasty in 1980" },
      { answer:"ARBOUR",      clue:"Al ___ — greatest Islanders coach, 4 consecutive Cups" },
      { answer:"TAVARES",     clue:"John ___ — greatest Islander since Bossy, left for Toronto" },
      { answer:"GORING",      clue:"Butch ___ — Conn Smythe 1980, the missing piece" },
      { answer:"LAFONTAINE",  clue:"Pat ___ — gifted center traded too soon from Long Island" },
    ]},
    { month:"JUNE",      theme:"RANGERS 1994", entries:[
      { answer:"MESSIER",     clue:"Guaranteed Game 6, scored hat trick, raised the Cup" },
      { answer:"LEETCH",      clue:"34 playoff points — Conn Smythe MVP in 1994" },
      { answer:"RICHTER",     clue:"Mike ___ — goaltending backbone of the 1994 run" },
      { answer:"GILBERT",     clue:"Rod ___ — franchise icon, all-time Rangers scorer" },
      { answer:"KOVALEV",     clue:"Alexei ___ — dazzling skill in the 1994 championship run" },
      { answer:"ANDERSON",    clue:"Glenn ___ — former Oiler who brought Cup experience" },
      { answer:"GRAVES",      clue:"Adam ___ — scored 52 goals in the championship season" },
      { answer:"RATELLE",     clue:"Jean ___ — GAG Line center, Lady Byng 4 times" },
      { answer:"TIKKANEN",    clue:"Esa ___ — the most annoying pest in playoff hockey" },
      { answer:"BROADWAY",    clue:"The ___ Blues — Rangers nickname from their famous street" },
    ]},
    { month:"JULY",      theme:"YANKEES DYNASTY", entries:[
      { answer:"RUTH",        clue:"The Sultan of Swat — 714 career home runs" },
      { answer:"GEHRIG",      clue:"The Iron Horse — 2,130 consecutive games played" },
      { answer:"DIMAGGIO",    clue:"The Yankee Clipper — 56-game hitting streak" },
      { answer:"MANTLE",      clue:"Triple Crown 1956 — .353 AVG, 52 HR, 130 RBI" },
      { answer:"BERRA",       clue:"It ain't over till it's over — 10 World Series rings" },
      { answer:"FORD",        clue:"The Chairman of the Board — .690 WS win percentage" },
      { answer:"JETER",       clue:"The Captain — 5 rings, 3,465 hits, all in pinstripes" },
      { answer:"RIVERA",      clue:"Enter Sandman — the greatest closer in baseball history" },
      { answer:"JACKSON",     clue:"Reggie ___ — 3 HRs on 3 consecutive pitches, 1977 WS" },
      { answer:"MUNSON",      clue:"Thurman ___ — the Yankees Captain, gone too soon" },
    ]},
    { month:"AUGUST",    theme:"METS MAGIC", entries:[
      { answer:"SEAVER",      clue:"Tom Terrific — 3 Cy Youngs, led the Miracle Mets" },
      { answer:"PIAZZA",      clue:"9/11 home run on September 21, 2001 healed a city" },
      { answer:"GOODEN",      clue:"Doc — most dominant young pitcher in baseball history" },
      { answer:"WRIGHT",      clue:"David ___ — only Met to have his number retired as a lifer" },
      { answer:"CARTER",      clue:"Gary ___ — The Kid started the 1986 WS Game 6 rally" },
      { answer:"MOOKIE",      clue:"___ Wilson — his grounder went through Buckner's legs" },
      { answer:"ALONSO",      clue:"Pete ___ — Mets all-time HR king, 254+ home runs" },
      { answer:"HERNANDEZ",   clue:"Keith ___ — captain of the 1986 championship Mets" },
      { answer:"DEGROM",      clue:"Jacob ___ — 2x Cy Young, 1.08 ERA in 2021" },
      { answer:"STRAWBERRY",  clue:"Darryl ___ — 252 Mets HR, The Straw Man" },
    ]},
    { month:"SEPTEMBER", theme:"PENNANT RACE", entries:[
      { answer:"SEAVER",      clue:"Won 25 games for the 1969 Miracle Mets" },
      { answer:"MCGRAW",      clue:"Tug ___ — Ya Gotta Believe! The 1973 rallying cry" },
      { answer:"JETER",       clue:"Mr. November — walk-off HR after midnight in 2001 WS" },
      { answer:"MESSIER",     clue:"Mark ___ — guaranteed the win and delivered" },
      { answer:"RUTH",        clue:"Babe ___ — his 60 HR record stood for 34 years" },
      { answer:"PIAZZA",      clue:"His 9/11 shot is the most emotional HR in history" },
      { answer:"NAMATH",      clue:"Joe ___ — I guarantee it. And he was right." },
      { answer:"TAYLOR",      clue:"Lawrence ___ — greatest defender in NFL history" },
      { answer:"BOSSY",       clue:"Scored 50 goals in 50 games in 1981" },
      { answer:"FRAZIER",     clue:"Walt ___ — Clyde, the coolest Knick who ever played" },
    ]},
    { month:"OCTOBER",   theme:"WORLD SERIES GLORY", entries:[
      { answer:"JACKSON",     clue:"Mr. October — 3 HRs on 3 consecutive pitches in 1977" },
      { answer:"LARSEN",      clue:"Don ___ — perfect game in the 1956 World Series" },
      { answer:"JETER",       clue:"Derek ___ — Mr. November, walk-off after midnight" },
      { answer:"MOOKIE",      clue:"___ Wilson — Game 6 1986 — Buckner's error" },
      { answer:"RIVERA",      clue:"Mariano ___ — the greatest postseason closer ever" },
      { answer:"MUNSON",      clue:"Thurman ___ — Yankees captain, 1976 AL MVP" },
      { answer:"GOODEN",      clue:"Dwight ___ — ace of the 1986 World Champions" },
      { answer:"ALONSO",      clue:"Mets all-time home run king since August 2025" },
      { answer:"HENDERSON",   clue:"Rickey ___ — all-time stolen base record set as a Yankee" },
      { answer:"MATTINGLY",   clue:"Donnie Baseball — never got his World Series ring" },
    ]},
    { month:"NOVEMBER",  theme:"NY NHL LEGENDS", entries:[
      { answer:"BRODEUR",     clue:"Martin ___ — 691 wins, 125 shutouts, 3 Stanley Cups" },
      { answer:"MESSIER",     clue:"Mark ___ — the greatest captain in hockey history" },
      { answer:"POTVIN",      clue:"Denis ___ — broke Orr's record, captained 4 Cups" },
      { answer:"BOSSY",       clue:"Mike ___ — 9 straight 50-goal seasons" },
      { answer:"LEETCH",      clue:"Brian ___ — greatest American-born player in NHL history" },
      { answer:"TROTTIER",    clue:"Bryan ___ — Hart Trophy, 4 consecutive Stanley Cups" },
      { answer:"LUNDQVIST",   clue:"Henrik ___ — The King, Vezina 2012" },
      { answer:"STEVENS",     clue:"Scott ___ — most feared hitter, Conn Smythe 2000" },
      { answer:"ELIAS",       clue:"Patrik ___ — all-time Devils scorer, 1,025 career points" },
      { answer:"GILBERT",     clue:"Rod ___ — all-time Rangers franchise scoring leader" },
    ]},
    { month:"DECEMBER",  theme:"GREATEST MOMENTS EVER", entries:[
      { answer:"NAMATH",      clue:"I guarantee it — Super Bowl III, January 1969" },
      { answer:"SEAVER",      clue:"Led the 100-to-1 Miracle Mets to the 1969 World Series" },
      { answer:"MESSIER",     clue:"Guaranteed Game 6 in 1994 — ended 54 years of drought" },
      { answer:"REED",        clue:"Limped onto the court in Game 7 — MSG went electric" },
      { answer:"JACKSON",     clue:"Three home runs on three pitches — 1977 WS Game 6" },
      { answer:"PIAZZA",      clue:"September 21, 2001 — the home run that healed New York" },
      { answer:"NYSTROM",     clue:"Bob ___ — OT goal that launched the Islanders dynasty" },
      { answer:"PARCELLS",    clue:"Bill ___ — Big Tuna, 2 Super Bowls with the Giants" },
      { answer:"LARSEN",      clue:"Don ___ — only perfect game in World Series history" },
      { answer:"TAYLOR",      clue:"LT — the greatest defensive player in NFL history" },
    ]},
  ];

  const fillin = MONTHLY_FILLIN[monthNum] || MONTHLY_FILLIN[0];
  const [guesses, setGuesses]   = useState(() => fillin.entries.map(() => ""));
  const [checked, setChecked]   = useState(null);
  const [revealed, setRevealed] = useState(false);
  const [activeRow, setActiveRow] = useState(0);
  const inputRefs = useRef({});

  useEffect(() => {
    setGuesses(fillin.entries.map(() => ""));
    setChecked(null); setRevealed(false); setActiveRow(0);
  }, [monthNum]);

  const solved = checked && checked.every(Boolean);

  function handleInput(i, val) {
    const cleaned = val.toUpperCase().replace(/[^A-Z]/g, "");
    const ng = [...guesses]; ng[i] = cleaned;
    setGuesses(ng); setChecked(null);
  }

  function handleKeyDown(i, e) {
    if (e.key === "Enter") {
      const next = i + 1;
      if (next < fillin.entries.length) {
        setActiveRow(next);
        setTimeout(() => inputRefs.current[next]?.focus(), 0);
      } else { checkAll(); }
    }
  }

  function checkAll() {
    setChecked(fillin.entries.map((entry, i) => guesses[i].trim() === entry.answer));
  }

  function revealAll() {
    setGuesses(fillin.entries.map(e => e.answer));
    setChecked(fillin.entries.map(() => true));
    setRevealed(true);
  }

  function reset() {
    setGuesses(fillin.entries.map(() => ""));
    setChecked(null); setRevealed(false); setActiveRow(0);
  }

  return (
    <div style={{maxWidth:680}}>
      <div style={{display:"flex", justifyContent:"space-between", alignItems:"flex-start",
        marginBottom:16, flexWrap:"wrap", gap:8}}>
        <div>
          <div style={{fontSize:13, fontWeight:900, color:"#e8e0d0",
            fontFamily:"'Georgia',serif", marginBottom:2}}>
            {MONTH_NAMES[monthNum]}: {fillin.theme}
          </div>
          <div style={{fontSize:9, color:"#c8201c", fontWeight:700, letterSpacing:"0.1em"}}>
            FILL-IN PUZZLE · 10 NY SPORTS LEGENDS · UPDATES MONTHLY
          </div>
        </div>
        <div style={{display:"flex", gap:6}}>
          <button onClick={checkAll} style={{background:"transparent",border:"1px solid #555",color:"#aaa",padding:"5px 14px",cursor:"pointer",fontSize:10,letterSpacing:"0.1em",fontWeight:700}}>✓ CHECK</button>
          <button onClick={reset}    style={{background:"transparent",border:"1px solid #444",color:"#666",padding:"5px 14px",cursor:"pointer",fontSize:10,letterSpacing:"0.1em",fontWeight:700}}>↺ RESET</button>
          <button onClick={revealAll} style={{background:"transparent",border:"1px solid #c8201c",color:"#c8201c",padding:"5px 14px",cursor:"pointer",fontSize:10,letterSpacing:"0.1em",fontWeight:700}}>REVEAL</button>
        </div>
      </div>

      {solved && !revealed && (
        <div style={{background:"#0d2a1a",border:"1px solid #2d8a50",color:"#4ade80",
          padding:"10px 16px",marginBottom:14,fontSize:13,fontWeight:700,textAlign:"center"}}>
          🎉 PERFECT SCORE! True NY sports fan confirmed.
        </div>
      )}

      <div style={{fontSize:10, color:"#555", marginBottom:14, fontStyle:"italic"}}>
        Type the answer · Press Enter to advance · Hit CHECK when done
      </div>

      <div style={{display:"flex", flexDirection:"column", gap:4}}>
        {fillin.entries.map((entry, i) => {
          const isCorrect = checked?.[i] === true;
          const isWrong   = checked?.[i] === false && guesses[i].length > 0;
          const isActive  = activeRow === i;
          const letterCount = entry.answer.length;
          return (
            <div key={i}
              onClick={() => { setActiveRow(i); setTimeout(() => inputRefs.current[i]?.focus(), 0); }}
              style={{
                display:"flex", gap:8, alignItems:"center", padding:"7px 10px",
                background: isCorrect?"#0d2a1a":isWrong?"#1a0d0d":isActive?"#1a1a1a":i%2===0?"#111":"#0e0e0e",
                border: isActive?"1px solid #c8201c":"1px solid transparent",
                borderLeft: isCorrect?"3px solid #22c55e":isWrong?"3px solid #c8201c":isActive?"3px solid #c8201c":"3px solid #333",
                cursor:"pointer",
              }}>
              <span style={{fontSize:10,fontWeight:900,color:"#c8201c",minWidth:20,flexShrink:0}}>{i+1}.</span>
              <span style={{flex:1,fontSize:12,color:isCorrect?"#4ade80":isWrong?"#888":"#ccc",
                fontFamily:"'Georgia',serif",lineHeight:1.4}}>
                {entry.clue}
                <span style={{fontSize:9,color:"#444",marginLeft:8}}>({letterCount} letters)</span>
              </span>
              <div style={{display:"flex",gap:3,alignItems:"center",flexShrink:0}}>
                {Array.from({length:letterCount}).map((_, ci) => {
                  const letter  = guesses[i]?.[ci] || "";
                  const correct = revealed || (checked && entry.answer[ci] === letter);
                  return (
                    <div key={ci} style={{
                      width:22,height:26,
                      border:`1px solid ${correct&&letter?"#22c55e":isWrong&&letter&&letter!==entry.answer[ci]?"#c8201c":isActive?"#555":"#333"}`,
                      background:correct&&letter?"#0d2a1a":"#111",
                      display:"flex",alignItems:"center",justifyContent:"center",
                      fontSize:13,fontWeight:900,
                      color:correct&&letter?"#4ade80":"#e8e0d0",
                      fontFamily:"'Georgia',serif",
                    }}>{letter}</div>
                  );
                })}
                <input
                  ref={el => { if(el) inputRefs.current[i] = el; }}
                  value={guesses[i]}
                  onChange={e => handleInput(i, e.target.value)}
                  onKeyDown={e => handleKeyDown(i, e)}
                  onFocus={() => setActiveRow(i)}
                  maxLength={letterCount}
                  style={{position:"absolute",opacity:0,width:1,height:1,pointerEvents:"none"}}
                />
                {isCorrect && <span style={{fontSize:14,marginLeft:4}}>✓</span>}
                {isWrong   && <span style={{fontSize:12,color:"#c8201c",marginLeft:4}}>✗</span>}
              </div>
            </div>
          );
        })}
      </div>

      {checked && (
        <div style={{marginTop:14,padding:"10px 14px",background:"#161616",border:"1px solid #2a2a2a",
          display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:8}}>
          <span style={{fontSize:12,color:"#e8e0d0"}}>
            Score: <strong style={{color:solved?"#4ade80":"#f0b429"}}>{checked.filter(Boolean).length}</strong>
            <span style={{color:"#555"}}> / {fillin.entries.length}</span>
          </span>
          {!solved && (
            <button onClick={revealAll} style={{fontSize:10,color:"#c8201c",background:"transparent",
              border:"1px solid #c8201c",padding:"4px 12px",cursor:"pointer",fontWeight:700,letterSpacing:"0.08em"}}>
              SHOW ANSWERS
            </button>
          )}
        </div>
      )}
    </div>
  );
}


// ─── GUESS THE PLAYER ────────────────────────────────────────────────────
function GuessThePlayer() {
  const [round, setRound]       = useState(null);
  const [selected, setSelected] = useState(null);
  const [score, setScore]       = useState(0);
  const [total, setTotal]       = useState(0);
  const [streak, setStreak]     = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const usedIdxRef = useRef(new Set());

  function buildRound() {
    const pool = DAILY_PLAYERS;
    let idx, attempts = 0;
    do { idx = Math.floor(Math.random() * pool.length); attempts++; }
    while (usedIdxRef.current.has(idx) && attempts < 50);
    usedIdxRef.current.add(idx);
    if (usedIdxRef.current.size > Math.floor(pool.length / 2)) usedIdxRef.current.clear();

    const correct = pool[idx];
    const others = pool
      .filter((p, i) => i !== idx && p.sport === correct.sport)
      .sort(() => Math.random() - 0.5).slice(0, 3);
    let wrong = [...others];
    if (wrong.length < 3) {
      const extras = pool.filter((p, i) => i !== idx && !wrong.includes(p))
        .sort(() => Math.random() - 0.5).slice(0, 3 - wrong.length);
      wrong = [...wrong, ...extras];
    }

    const clueTypes = [
      { label:"STATS",  text: correct.stats },
      { label:"ERA",    text: `Played ${correct.era} · ${correct.pos} · ${correct.team}` },
      { label:"FACT",   text: correct.fact.slice(0, 120) + (correct.fact.length > 120 ? "…" : "") },
      { label:"NUMBER", text: `Wore #${correct.number} for the ${correct.team}` },
    ].filter(c => c.text && c.text.length > 5);
    const clue = clueTypes[Math.floor(Math.random() * clueTypes.length)];

    const choices = [correct, ...wrong.slice(0,3)].sort(() => Math.random() - 0.5);
    return { correct, choices, clue };
  }

  useEffect(() => { setRound(buildRound()); }, []);

  function handleChoice(player) {
    if (selected || !round) return;
    setSelected(player);
    setTotal(t => t + 1);
    const isRight = player.name === round.correct.name;
    if (isRight) {
      setScore(s => s + 1);
      const ns = streak + 1;
      setStreak(ns);
      if (ns > bestStreak) setBestStreak(ns);
    } else { setStreak(0); }
  }

  function nextRound() { setRound(buildRound()); setSelected(null); }

  if (!round) return <div style={{color:"#555", padding:20}}>Loading...</div>;
  const isCorrect = selected?.name === round.correct.name;

  return (
    <div style={{maxWidth:560}}>
      <div style={{display:"flex", gap:16, marginBottom:16, padding:"8px 14px",
        background:"#111", border:"1px solid #1a1a1a", flexWrap:"wrap", alignItems:"center"}}>
        <span style={{fontSize:10, color:"#888"}}>Score: <strong style={{color:"#e8e0d0"}}>{score}/{total}</strong></span>
        <span style={{fontSize:10, color:"#888"}}>Streak: <strong style={{color:streak>2?"#f0b429":"#e8e0d0"}}>{streak} 🔥</strong></span>
        <span style={{fontSize:10, color:"#888"}}>Best: <strong style={{color:"#c8201c"}}>{bestStreak}</strong></span>
        <button onClick={() => { usedIdxRef.current.clear(); setScore(0); setTotal(0); setStreak(0); setBestStreak(0); nextRound(); }}
          style={{marginLeft:"auto", fontSize:9, color:"#555", background:"transparent",
            border:"1px solid #333", padding:"2px 8px", cursor:"pointer", fontWeight:700}}>RESET</button>
      </div>

      <div style={{background:"#161616", border:"1px solid #2a2a2a", borderLeft:"3px solid #c8201c",
        padding:"16px 18px", marginBottom:14}}>
        <div style={{fontSize:8, fontWeight:900, color:"#c8201c", letterSpacing:"0.2em", marginBottom:8}}>
          🎤 {round.clue.label} CLUE — WHO IS THIS NY LEGEND?
        </div>
        <p style={{margin:0, fontSize:14, color:"#e8e0d0", lineHeight:1.6,
          fontFamily:"'Georgia',serif", fontStyle:"italic"}}>"{round.clue.text}"</p>
        <div style={{marginTop:8, fontSize:9, color:"#555"}}>{round.correct.sport} · {round.correct.team}</div>
      </div>

      <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, marginBottom:14}}>
        {round.choices.map((player, i) => {
          const isRight = player.name === round.correct.name;
          const isPicked = selected?.name === player.name;
          let bg="#1a1a1a", border="1px solid #333", color="#ccc";
          if (selected) {
            if (isRight)       { bg="#0d2a1a"; border="1px solid #22c55e"; color="#4ade80"; }
            else if (isPicked) { bg="#2a0d0d"; border="1px solid #c8201c"; color="#f87171"; }
            else               { color="#444"; }
          }
          return (
            <button key={i} onClick={() => handleChoice(player)}
              style={{background:bg, border, color, padding:"12px 14px",
                cursor:selected?"default":"pointer", fontSize:12, fontWeight:700,
                fontFamily:"'Georgia',serif", textAlign:"left",
                display:"flex", justifyContent:"space-between", alignItems:"center",
                transition:"all 0.15s"}}>
              <span>{player.name}</span>
              {selected && isRight  && <span>✓</span>}
              {selected && isPicked && !isRight && <span>✗</span>}
            </button>
          );
        })}
      </div>

      {selected && (
        <>
          <div style={{padding:"14px 16px", background:isCorrect?"#0d2a1a":"#161616",
            border:`1px solid ${isCorrect?"#22c55e":"#2a2a2a"}`, marginBottom:12}}>
            <div style={{fontSize:13, fontWeight:900, color:isCorrect?"#4ade80":"#f87171", marginBottom:8}}>
              {isCorrect ? "🎉 Correct!" : `The answer was ${round.correct.name}`}
            </div>
            <p style={{margin:"0 0 6px", fontSize:12, color:"#aaa", lineHeight:1.6,
              fontFamily:"'Georgia',serif"}}>{round.correct.fact}</p>
            <div style={{fontSize:10, color:"#555"}}>{round.correct.stats}</div>
          </div>
          <button onClick={nextRound}
            style={{width:"100%", background:"#c8201c", border:"none", color:"#fff",
              padding:"12px", cursor:"pointer", fontSize:12, fontWeight:900, letterSpacing:"0.1em"}}>
            NEXT PLAYER →
          </button>
        </>
      )}
    </div>
  );
}

// ─── MATCHING PAIRS ───────────────────────────────────────────────────────
function MatchingPairs() {
  const [cards, setCards]       = useState([]);
  const [flipped, setFlipped]   = useState(new Set());
  const [matched, setMatched]   = useState(new Set());
  const [selected, setSelected] = useState([]);
  const [moves, setMoves]       = useState(0);
  const [won, setWon]           = useState(false);
  const [checking, setChecking] = useState(false);
  const [best, setBest]         = useState(null);

  function buildGame() {
    const pool = DAILY_PLAYERS.filter(p => p.stats && p.stats.length > 10);
    const shuffled = [...pool].sort(() => Math.random() - 0.5).slice(0, 8);
    const nameCards = shuffled.map((p, i) => ({
      id:`n-${i}`, pairId:p.name, type:"name",
      text:p.name, emoji:p.emoji, team:p.team
    }));
    const statCards = shuffled.map((p, i) => ({
      id:`s-${i}`, pairId:p.name, type:"stat",
      text:p.stats.split("·")[0].trim().slice(0, 36), emoji:p.emoji, team:p.team
    }));
    const all = [...nameCards, ...statCards].sort(() => Math.random() - 0.5);
    setCards(all);
    setFlipped(new Set()); setMatched(new Set());
    setSelected([]); setMoves(0); setWon(false); setChecking(false);
  }

  useEffect(() => { buildGame(); }, []);

  function handleFlip(idx) {
    if (checking || matched.has(cards[idx].pairId) || flipped.has(idx) || selected.length === 2) return;
    const newFlipped = new Set(flipped); newFlipped.add(idx);
    setFlipped(newFlipped);
    const newSelected = [...selected, idx];
    setSelected(newSelected);

    if (newSelected.length === 2) {
      setMoves(m => m + 1);
      setChecking(true);
      const [a, b] = newSelected;
      if (cards[a].pairId === cards[b].pairId && cards[a].type !== cards[b].type) {
        setTimeout(() => {
          const newMatched = new Set(matched); newMatched.add(cards[a].pairId);
          setMatched(newMatched); setFlipped(new Set()); setSelected([]); setChecking(false);
          if (newMatched.size === 8) {
            setWon(true);
            const m = moves + 1;
            if (!best || m < best) setBest(m);
          }
        }, 700);
      } else {
        setTimeout(() => { setFlipped(new Set(flipped)); setSelected([]); setChecking(false); }, 900);
      }
    }
  }

  if (!cards.length) return <div style={{color:"#555", padding:20}}>Loading...</div>;

  const TEAM_COLORS = {
    Yankees:"#003087", Mets:"#002D72", Jets:"#125740", Giants:"#0B2265",
    Knicks:"#006BB6", Rangers:"#0038A8", Islanders:"#00539B", Devils:"#CE1126",
  };

  return (
    <div style={{maxWidth:600}}>
      <div style={{display:"flex", justifyContent:"space-between", alignItems:"center",
        marginBottom:12, flexWrap:"wrap", gap:8}}>
        <div>
          <div style={{fontSize:9, fontWeight:900, color:"#c8201c", letterSpacing:"0.15em", marginBottom:2}}>
            🃏 MATCHING PAIRS — NY SPORTS LEGENDS
          </div>
          <div style={{fontSize:10, color:"#666"}}>
            Match player to stat · {matched.size}/8 matched · {moves} moves
            {best && <span style={{color:"#f0b429", marginLeft:8}}>Best: {best}</span>}
          </div>
        </div>
        <button onClick={buildGame}
          style={{fontSize:10, background:"transparent", border:"1px solid #444",
            color:"#888", padding:"5px 14px", cursor:"pointer", fontWeight:900}}>↺ NEW GAME</button>
      </div>

      {won && (
        <div style={{background:"#0d2a1a", border:"1px solid #22c55e", color:"#4ade80",
          padding:"10px 16px", marginBottom:12, textAlign:"center", fontSize:13, fontWeight:700}}>
          🎉 All matched in {moves} moves! {moves<=12?"Excellent!":moves<=16?"Nice work!":"Keep practicing!"}
        </div>
      )}

      <div style={{fontSize:10, color:"#444", marginBottom:10, fontStyle:"italic"}}>
        Click a card to flip · Match each player name to their achievement
      </div>

      <div style={{display:"grid", gridTemplateColumns:"repeat(4, 1fr)", gap:6}}>
        {cards.map((card, idx) => {
          const isFlipped = flipped.has(idx) || matched.has(card.pairId);
          const isMatched = matched.has(card.pairId);
          const teamColor = TEAM_COLORS[card.team] || "#c8201c";
          return (
            <div key={card.id} onClick={() => !isFlipped && handleFlip(idx)}
              style={{height:70, cursor:isFlipped?"default":"pointer", position:"relative"}}>
              {!isFlipped ? (
                <div style={{width:"100%", height:"100%", background:"#1a1a1a",
                  border:"1px solid #2a2a2a", display:"flex", alignItems:"center",
                  justifyContent:"center", fontSize:22, userSelect:"none"}}>🗽</div>
              ) : (
                <div style={{width:"100%", height:"100%",
                  background: isMatched ? `${teamColor}22` : "#1a1a1a",
                  border:`2px solid ${isMatched ? teamColor : "#555"}`,
                  display:"flex", flexDirection:"column", alignItems:"center",
                  justifyContent:"center", padding:"5px 4px", textAlign:"center"}}>
                  {card.type === "name" ? (
                    <>
                      <span style={{fontSize:14, marginBottom:2}}>{card.emoji}</span>
                      <span style={{fontSize:9, fontWeight:900, color:isMatched?teamColor:"#e8e0d0",
                        lineHeight:1.2}}>{card.text}</span>
                    </>
                  ) : (
                    <span style={{fontSize:8, color:isMatched?"#4ade80":"#aaa",
                      lineHeight:1.3}}>{card.text}</span>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── STAT GUESSER ─────────────────────────────────────────────────────────
function StatGuesser() {
  const [round, setRound]       = useState(null);
  const [selected, setSelected] = useState(null);
  const [score, setScore]       = useState(0);
  const [total, setTotal]       = useState(0);
  const [streak, setStreak]     = useState(0);
  const usedRef = useRef(new Set());

  function buildRound() {
    const pool = DAILY_PLAYERS.filter(p => p.stats && p.stats.length > 10);
    let idx, attempts = 0;
    do { idx = Math.floor(Math.random() * pool.length); attempts++; }
    while (usedRef.current.has(idx) && attempts < 50);
    usedRef.current.add(idx);
    if (usedRef.current.size > pool.length / 2) usedRef.current.clear();

    const correct = pool[idx];
    const statParts = correct.stats.split("·").map(s => s.trim()).filter(Boolean);
    const picked = statParts.sort(() => Math.random() - 0.5).slice(0, 2);
    const statClue = picked.join(" · ");

    const sameSport = pool.filter((p, i) => i !== idx && p.sport === correct.sport)
      .sort(() => Math.random() - 0.5).slice(0, 3);
    let wrong = [...sameSport];
    if (wrong.length < 3) {
      const extra = pool.filter((p, i) => i !== idx && !wrong.includes(p))
        .sort(() => Math.random() - 0.5).slice(0, 3 - wrong.length);
      wrong = [...wrong, ...extra];
    }
    const choices = [correct, ...wrong.slice(0,3)].sort(() => Math.random() - 0.5);
    return { correct, choices, statClue };
  }

  useEffect(() => { setRound(buildRound()); }, []);

  function handleChoice(player) {
    if (selected || !round) return;
    setSelected(player);
    setTotal(t => t + 1);
    if (player.name === round.correct.name) { setScore(s => s + 1); setStreak(s => s + 1); }
    else setStreak(0);
  }

  function next() { setRound(buildRound()); setSelected(null); }

  if (!round) return <div style={{color:"#555", padding:20}}>Loading...</div>;
  const isCorrect = selected?.name === round.correct.name;

  return (
    <div style={{maxWidth:560}}>
      <div style={{display:"flex", gap:16, marginBottom:16, padding:"8px 14px",
        background:"#111", border:"1px solid #1a1a1a", flexWrap:"wrap", alignItems:"center"}}>
        <span style={{fontSize:10, color:"#888"}}>Score: <strong style={{color:"#e8e0d0"}}>{score}/{total}</strong></span>
        <span style={{fontSize:10, color:"#888"}}>Streak: <strong style={{color:streak>2?"#f0b429":"#e8e0d0"}}>{streak} 🔥</strong></span>
        <button onClick={() => { usedRef.current.clear(); setScore(0); setTotal(0); setStreak(0); next(); }}
          style={{marginLeft:"auto", fontSize:9, color:"#555", background:"transparent",
            border:"1px solid #333", padding:"2px 8px", cursor:"pointer", fontWeight:700}}>RESET</button>
      </div>

      <div style={{background:"#161616", border:"1px solid #2a2a2a", borderLeft:"3px solid #f0b429",
        padding:"16px 18px", marginBottom:14}}>
        <div style={{fontSize:8, fontWeight:900, color:"#f0b429", letterSpacing:"0.2em", marginBottom:10}}>
          📊 WHOSE STAT IS THIS?
        </div>
        <div style={{fontSize:18, fontWeight:900, color:"#e8e0d0",
          fontFamily:"'Georgia',serif", lineHeight:1.4}}>{round.statClue}</div>
        <div style={{marginTop:10, fontSize:9, color:"#555"}}>
          {round.correct.sport} · {round.correct.team} · {round.correct.era}
        </div>
      </div>

      <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, marginBottom:14}}>
        {round.choices.map((player, i) => {
          const isRight  = player.name === round.correct.name;
          const isPicked = selected?.name === player.name;
          let bg="#1a1a1a", border="1px solid #333", color="#ccc";
          if (selected) {
            if (isRight)       { bg="#0d2a1a"; border="1px solid #22c55e"; color="#4ade80"; }
            else if (isPicked) { bg="#2a0d0d"; border="1px solid #c8201c"; color="#f87171"; }
            else               { color="#444"; }
          }
          return (
            <button key={i} onClick={() => handleChoice(player)}
              style={{background:bg, border, color, padding:"12px 14px",
                cursor:selected?"default":"pointer", fontSize:12, fontWeight:700,
                fontFamily:"'Georgia',serif", textAlign:"left",
                display:"flex", justifyContent:"space-between", alignItems:"center",
                transition:"all 0.15s"}}>
              <span>{player.name}</span>
              {selected && isRight  && <span>✓</span>}
              {selected && isPicked && !isRight && <span>✗</span>}
            </button>
          );
        })}
      </div>

      {selected && (
        <>
          <div style={{padding:"12px 14px", background:isCorrect?"#0d2a1a":"#161616",
            border:`1px solid ${isCorrect?"#22c55e":"#2a2a2a"}`, marginBottom:12}}>
            <div style={{fontSize:13, fontWeight:900,
              color:isCorrect?"#4ade80":"#f87171", marginBottom:6}}>
              {isCorrect ? "🎉 Correct!" : `It was ${round.correct.name}`}
            </div>
            <p style={{margin:0, fontSize:12, color:"#aaa", lineHeight:1.6,
              fontFamily:"'Georgia',serif"}}>{round.correct.fact}</p>
          </div>
          <button onClick={next}
            style={{width:"100%", background:"#c8201c", border:"none", color:"#fff",
              padding:"12px", cursor:"pointer", fontSize:12, fontWeight:900, letterSpacing:"0.1em"}}>
            NEXT STAT →
          </button>
        </>
      )}
    </div>
  );
}


// ─── MAIN PLAYROOM TAB ────────────────────────────────────────────────────
function PlayroomTab({ myTeams }) {
  const GAMES = [
    { id:"trivia",    icon:"🧠", label:"Daily Trivia",    desc:"Test your NY sports knowledge" },
    { id:"guess",     icon:"🎤", label:"Guess the Player", desc:"Who is the NY legend?" },
    { id:"matching",  icon:"🃏", label:"Matching Pairs",   desc:"Flip cards to match legends & stats" },
    { id:"statguesser",icon:"📊",label:"Stat Guesser",     desc:"Whose stat is this?" },
    { id:"emoji",     icon:"🤔", label:"Emoji Quiz",      desc:"Guess the moment from emojis" },
    { id:"scramble",  icon:"🔀", label:"Anagram",         desc:"Click tiles to unscramble legends" },
    { id:"hangman",   icon:"🎯", label:"Hangman",         desc:"Guess letter by letter" },
    { id:"crossword", icon:"✏️", label:"Crossword",       desc:"Monthly NY sports puzzle" },
    { id:"wordsearch",icon:"🔍", label:"Word Search",     desc:"Find hidden legends" },
    { id:"spin",      icon:"🎰", label:"Spin Wheel",      desc:"Random NY sports facts" },
    { id:"birthdays", icon:"🎂", label:"Birthdays Today", desc:"Who was born on this date?" },
    { id:"walkup",    icon:"🎵", label:"Walk-Up Songs",   desc:"Classic Yankees & Mets music" },
  ];

  const [active, setActive] = useState(null);

  function randomGame() {
    const g = GAMES[Math.floor(Math.random() * GAMES.length)];
    setActive(g.id);
  }

  // My Teams weighting — surface games tied to their teams
  const myTeamNames = myTeams ? [...myTeams].map(t => t.toLowerCase()) : [];

  return (
    <div style={{paddingTop:8}}>
      {/* Header */}
      <div style={{textAlign:"center", padding:"16px 0 20px", borderBottom:"2px solid #2a2a2a", marginBottom:20}}>
        <h2 style={{margin:"0 0 4px", fontSize:22, fontWeight:900, color:"#e8e0d0", fontFamily:"'Georgia',serif", letterSpacing:"0.05em"}}>
          🎮 NY Sports Playroom
        </h2>
        <p style={{margin:"0 0 14px", fontSize:11, color:"#888", letterSpacing:"0.1em"}}>
          QUICK GAMES FOR TRUE FANS
        </p>
        <button onClick={randomGame} style={{
          background:"#f0b429", border:"none", color:"#000",
          padding:"10px 28px", cursor:"pointer", fontSize:12,
          fontWeight:900, letterSpacing:"0.1em", fontFamily:"'Georgia',serif",
          boxShadow:"0 3px 0 #8a6200",
        }}>
          🎲 RANDOM PUZZLE
        </button>
        {active && (
          <button onClick={() => setActive(null)} style={{
            background:"transparent", border:"1px solid #444", color:"#888",
            padding:"10px 20px", cursor:"pointer", fontSize:11, fontWeight:900,
            letterSpacing:"0.1em", marginLeft:10,
          }}>
            ← BACK TO PLAYROOM
          </button>
        )}
      </div>

      {/* Game picker grid */}
      {!active && (
        <>
          {myTeamNames.length > 0 && (
            <div style={{marginBottom:16, padding:"10px 14px", background:"#1a1600", border:"1px solid #f0b42944", borderLeft:"3px solid #f0b429"}}>
              <span style={{fontSize:9, fontWeight:900, color:"#f0b429", letterSpacing:"0.15em"}}>⭐ YOUR TEAMS: </span>
              <span style={{fontSize:11, color:"#e8e0d0"}}>{[...myTeams].join(" · ")} — all puzzles feature your teams prominently</span>
            </div>
          )}
          <div style={{display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(160px, 1fr))", gap:10, marginBottom:24}}>
            {GAMES.map(g => (
              <button key={g.id} onClick={() => setActive(g.id)} style={{
                background:"#161616", border:"1px solid #2a2a2a",
                padding:"20px 14px", cursor:"pointer", textAlign:"center",
                transition:"border-color 0.15s, background 0.15s",
                display:"flex", flexDirection:"column", alignItems:"center", gap:8,
              }}
              onMouseEnter={e=>{e.currentTarget.style.borderColor="#c8201c";e.currentTarget.style.background="#1a1a1a";}}
              onMouseLeave={e=>{e.currentTarget.style.borderColor="#2a2a2a";e.currentTarget.style.background="#161616";}}>
                <span style={{fontSize:32}}>{g.icon}</span>
                <span style={{fontSize:12, fontWeight:900, color:"#e8e0d0", fontFamily:"'Georgia',serif"}}>{g.label}</span>
                <span style={{fontSize:10, color:"#666"}}>{g.desc}</span>
              </button>
            ))}
          </div>
        </>
      )}

      {/* Active game */}
      {active === "trivia"    && <TriviaTab />}
      {active === "guess"     && <GuessThePlayer />}
      {active === "matching"  && <MatchingPairs />}
      {active === "statguesser" && <StatGuesser />}
      {active === "emoji"     && <EmojiQuizGame myTeams={myTeams} />}
      {active === "scramble"  && <ScrambleGame myTeams={myTeams} />}
      {active === "hangman"   && <HangmanGame myTeams={myTeams} />}
      {active === "crossword" && <PlayroomCrossword />}
      {active === "wordsearch"&& <WordSearchTab />}
      {active === "spin"      && <SpinWheelTab />}
      {active === "birthdays" && <BirthdaysTab />}
      {active === "walkup"    && <SongsTab />}
    </div>
  );
}



// ═══════════════════════════════════════════════════════════════════════════
// 🏆 GLORY DAYS — NY SPORTS CHAMPIONSHIPS
// ═══════════════════════════════════════════════════════════════════════════

const NY_CHAMPIONSHIPS = [
  // ── YANKEES (27) ──
  { year:1923, team:"Yankees", sport:"MLB", title:"World Series", color:"#003087", emoji:"⚾", opponent:"vs Giants", iconic:false, moment:"The first championship in The House That Ruth Built — Babe Ruth hit 3 HR in the Series.", fact:"The Yankees' first World Series came in the brand-new Yankee Stadium's first season.", wiki:"https://en.wikipedia.org/wiki/1923_World_Series" },
  { year:1927, team:"Yankees", sport:"MLB", title:"World Series", color:"#003087", emoji:"⚾", opponent:"vs Pirates", iconic:true, moment:"Murderers' Row swept the Pirates. Babe Ruth hit 60 home runs that season — the greatest team ever assembled.", fact:"The '27 Yankees are still considered by many the greatest baseball team in history.", wiki:"https://en.wikipedia.org/wiki/1927_World_Series" },
  { year:1928, team:"Yankees", sport:"MLB", title:"World Series", color:"#003087", emoji:"⚾", opponent:"vs Cardinals", iconic:false, moment:"Back-to-back! Ruth and Gehrig combined for 6 HR in the sweep.", fact:"Ruth batted .625 in the Series with three home runs. Gehrig batted .545.", wiki:"https://en.wikipedia.org/wiki/1928_World_Series" },
  { year:1932, team:"Yankees", sport:"MLB", title:"World Series", color:"#003087", emoji:"⚾", opponent:"vs Cubs", iconic:true, moment:"The Called Shot — Babe Ruth allegedly pointed to center field before homering off Charlie Root.", fact:"Whether Ruth really called it remains one of baseball's greatest mysteries. The legend is forever.", wiki:"https://en.wikipedia.org/wiki/1932_World_Series" },
  { year:1936, team:"Yankees", sport:"MLB", title:"World Series", color:"#003087", emoji:"⚾", opponent:"vs Giants", iconic:false, moment:"Joe DiMaggio's first championship. The Yankees won four in five years starting here.", fact:"This began one of the greatest dynasties in sports history.", wiki:"https://en.wikipedia.org/wiki/1936_World_Series" },
  { year:1937, team:"Yankees", sport:"MLB", title:"World Series", color:"#003087", emoji:"⚾", opponent:"vs Giants", iconic:false, moment:"Back-to-back again. DiMaggio and Gehrig were unstoppable.", fact:"Second straight — the dynasty was building.", wiki:"https://en.wikipedia.org/wiki/1937_World_Series" },
  { year:1938, team:"Yankees", sport:"MLB", title:"World Series", color:"#003087", emoji:"⚾", opponent:"vs Cubs", iconic:false, moment:"Three in a row. The Cubs were swept — again. Red Ruffing won two games.", fact:"Lou Gehrig's last full healthy season. The dynasty at its peak.", wiki:"https://en.wikipedia.org/wiki/1938_World_Series" },
  { year:1939, team:"Yankees", sport:"MLB", title:"World Series", color:"#003087", emoji:"⚾", opponent:"vs Reds", iconic:false, moment:"FOUR STRAIGHT! DiMaggio hit .381. The Reds were swept in four games.", fact:"Four consecutive championships — the standard no one has matched.", wiki:"https://en.wikipedia.org/wiki/1939_World_Series" },
  { year:1941, team:"Yankees", sport:"MLB", title:"World Series", color:"#003087", emoji:"⚾", opponent:"vs Dodgers", iconic:false, moment:"Mickey Owen's passed ball in Game 4 let the Yankees back in. DiMaggio's 56-game streak that season.", fact:"The famous Dropped Third Strike changed the Series entirely.", wiki:"https://en.wikipedia.org/wiki/1941_World_Series" },
  { year:1943, team:"Yankees", sport:"MLB", title:"World Series", color:"#003087", emoji:"⚾", opponent:"vs Cardinals", iconic:false, moment:"A wartime championship. Spud Chandler went 20-4 with a 1.64 ERA to win Cy Young and MVP.", fact:"One of the most dominant pitching seasons in baseball history.", wiki:"https://en.wikipedia.org/wiki/1943_World_Series" },
  { year:1947, team:"Yankees", sport:"MLB", title:"World Series", color:"#003087", emoji:"⚾", opponent:"vs Dodgers", iconic:false, moment:"Cookie Lavagetto's pinch hit double broke up Bill Bevens' near no-hitter in Game 4.", fact:"Jackie Robinson's first World Series. The Bronx Bombers prevailed in 7.", wiki:"https://en.wikipedia.org/wiki/1947_World_Series" },
  { year:1949, team:"Yankees", sport:"MLB", title:"World Series", color:"#003087", emoji:"⚾", opponent:"vs Dodgers", iconic:false, moment:"Casey Stengel's first title. This began another dynasty — five straight championships.", fact:"Joe Page was dominant out of the bullpen. A new era began.", wiki:"https://en.wikipedia.org/wiki/1949_World_Series" },
  { year:1950, team:"Yankees", sport:"MLB", title:"World Series", color:"#003087", emoji:"⚾", opponent:"vs Phillies", iconic:false, moment:"The Whiz Kids swept. Whitey Ford made his first World Series start.", fact:"Two straight — Stengel's machine was rolling.", wiki:"https://en.wikipedia.org/wiki/1950_World_Series" },
  { year:1951, team:"Yankees", sport:"MLB", title:"World Series", color:"#003087", emoji:"⚾", opponent:"vs Giants", iconic:false, moment:"Three straight! Mickey Mantle made his first Series appearance.", fact:"The Giants rode Bobby Thomson's Shot Heard Round the World to the Series — and still lost.", wiki:"https://en.wikipedia.org/wiki/1951_World_Series" },
  { year:1952, team:"Yankees", sport:"MLB", title:"World Series", color:"#003087", emoji:"⚾", opponent:"vs Dodgers", iconic:false, moment:"Four straight! Billy Martin made a game-saving bare-hand catch in the 7th inning of Game 7.", fact:"The Yankees beat the Dodgers for the fifth time in seven Series matchups.", wiki:"https://en.wikipedia.org/wiki/1952_World_Series" },
  { year:1953, team:"Yankees", sport:"MLB", title:"World Series", color:"#003087", emoji:"⚾", opponent:"vs Dodgers", iconic:true, moment:"FIVE STRAIGHT — the record that still stands. Billy Martin hit .500 and delivered the Series winner.", fact:"Five consecutive championships under Stengel — no team has ever come close.", wiki:"https://en.wikipedia.org/wiki/1953_World_Series" },
  { year:1956, team:"Yankees", sport:"MLB", title:"World Series", color:"#003087", emoji:"⚾", opponent:"vs Dodgers", iconic:true, moment:"Don Larsen's Perfect Game — the only perfect game in World Series history. Yogi Berra leaped into his arms.", fact:"The most iconic image in World Series history. 97 pitches. 27 up. 27 down. Perfect.", wiki:"https://en.wikipedia.org/wiki/Don_Larsen%27s_perfect_game" },
  { year:1958, team:"Yankees", sport:"MLB", title:"World Series", color:"#003087", emoji:"⚾", opponent:"vs Braves", iconic:false, moment:"Down 3-1 in the Series, the Yankees won three straight. The ultimate comeback.", fact:"One of only four teams in World Series history to come back from a 3-1 deficit.", wiki:"https://en.wikipedia.org/wiki/1958_World_Series" },
  { year:1961, team:"Yankees", sport:"MLB", title:"World Series", color:"#003087", emoji:"⚾", opponent:"vs Reds", iconic:false, moment:"Roger Maris hit his record 61st home run that season. Whitey Ford pitched 32 scoreless WS innings.", fact:"Ford broke Babe Ruth's World Series scoreless innings record.", wiki:"https://en.wikipedia.org/wiki/1961_World_Series" },
  { year:1962, team:"Yankees", sport:"MLB", title:"World Series", color:"#003087", emoji:"⚾", opponent:"vs Giants", iconic:false, moment:"Bobby Richardson caught Willie McCovey's screaming liner to end Game 7. Heart attacks all around.", fact:"McCovey hit it so hard that Yankees fans still have nightmares. Richardson was in exactly the right spot.", wiki:"https://en.wikipedia.org/wiki/1962_World_Series" },
  { year:1977, team:"Yankees", sport:"MLB", title:"World Series", color:"#003087", emoji:"⚾", opponent:"vs Dodgers", iconic:true, moment:"Reggie Jackson hit THREE home runs on THREE consecutive pitches in Game 6. Mr. October was born.", fact:"'I must be the straw that stirs the drink.' The greatest single-game offensive display in World Series history.", wiki:"https://en.wikipedia.org/wiki/1977_World_Series" },
  { year:1978, team:"Yankees", sport:"MLB", title:"World Series", color:"#003087", emoji:"⚾", opponent:"vs Dodgers", iconic:false, moment:"Bucky Dent's playoff homer at Fenway set it up. Back-to-back Dodgers victims.", fact:"Bucky (Bleeping) Dent. Red Sox fans know the rest.", wiki:"https://en.wikipedia.org/wiki/1978_World_Series" },
  { year:1996, team:"Yankees", sport:"MLB", title:"World Series", color:"#003087", emoji:"⚾", opponent:"vs Braves", iconic:true, moment:"Down 2-0, Yankees won 4 straight. Jim Leyritz's 3-run homer in Game 4 was the turning point.", fact:"This began the greatest dynasty of the modern era — 4 championships in 5 years.", wiki:"https://en.wikipedia.org/wiki/1996_World_Series" },
  { year:1998, team:"Yankees", sport:"MLB", title:"World Series", color:"#003087", emoji:"⚾", opponent:"vs Padres", iconic:true, moment:"125 wins total. The Padres were swept. The '98 Yankees are the greatest team of the modern era.", fact:"114-48 in the regular season. 11-2 in the playoffs. The standard of excellence.", wiki:"https://en.wikipedia.org/wiki/1998_World_Series" },
  { year:1999, team:"Yankees", sport:"MLB", title:"World Series", color:"#003087", emoji:"⚾", opponent:"vs Braves", iconic:false, moment:"Three straight. Mariano Rivera entered to Enter Sandman. The dynasty at its absolute peak.", fact:"Rivera had a 0.70 ERA in the postseason. Simply untouchable.", wiki:"https://en.wikipedia.org/wiki/1999_World_Series" },
  { year:2000, team:"Yankees", sport:"MLB", title:"World Series", color:"#003087", emoji:"⚾", opponent:"vs Mets", iconic:true, moment:"THE SUBWAY SERIES! Jeter led off Game 4 with a HR. Luis Sojo's single ended it in Game 5.", fact:"New York vs. New York for the first time since 1956. The city was electric for two straight weeks.", wiki:"https://en.wikipedia.org/wiki/2000_World_Series" },
  { year:2009, team:"Yankees", sport:"MLB", title:"World Series", color:"#003087", emoji:"⚾", opponent:"vs Phillies", iconic:true, moment:"Hideki Matsui hit a grand slam in Game 6 to win Series MVP. The new Stadium's first title.", fact:"A-Rod finally got his ring. Matsui was Series MVP as a designated hitter.", wiki:"https://en.wikipedia.org/wiki/2009_World_Series" },

  // ── METS (2) ──
  { year:1969, team:"Mets", sport:"MLB", title:"World Series", color:"#002D72", emoji:"⚾", opponent:"vs Orioles", iconic:true, moment:"The Miracle Mets! 100-to-1 longshots beat the mighty Orioles. Tom Seaver, Jerry Koosman, and pure belief.", fact:"Manager Gil Hodges built something miraculous. The original 'Ya Gotta Believe' moment.", wiki:"https://en.wikipedia.org/wiki/1969_World_Series" },
  { year:1986, team:"Mets", sport:"MLB", title:"World Series", color:"#002D72", emoji:"⚾", opponent:"vs Red Sox", iconic:true, moment:"Mookie Wilson's grounder rolled through Bill Buckner's legs. Back from the dead in Game 6, then won Game 7.", fact:"'The Bad Guys Won.' Doc, Straw, Keith, Gary, Mookie — the most colorful champion in baseball history.", wiki:"https://en.wikipedia.org/wiki/1986_World_Series" },

  // ── NY GIANTS BASEBALL (5) ──
  { year:1905, team:"NY Giants (Baseball)", sport:"MLB", title:"World Series", color:"#333", emoji:"⚾", opponent:"vs Athletics", iconic:true, moment:"Christy Mathewson threw THREE complete-game shutouts in six days. The most dominant WS pitching ever.", fact:"Mathewson's performance remains the most remarkable individual pitching feat in World Series history.", wiki:"https://en.wikipedia.org/wiki/1905_World_Series" },
  { year:1921, team:"NY Giants (Baseball)", sport:"MLB", title:"World Series", color:"#333", emoji:"⚾", opponent:"vs Yankees", iconic:false, moment:"The first Subway Series — all games at the Polo Grounds. The Giants beat their cross-borough rivals.", fact:"The last World Series played entirely at one ballpark.", wiki:"https://en.wikipedia.org/wiki/1921_World_Series" },
  { year:1922, team:"NY Giants (Baseball)", sport:"MLB", title:"World Series", color:"#333", emoji:"⚾", opponent:"vs Yankees", iconic:false, moment:"Back-to-back Subway Series wins over the Yankees. John McGraw's Giants at their peak.", fact:"The Giants won 4-0-1 — the 'game' being a controversial tie called for darkness.", wiki:"https://en.wikipedia.org/wiki/1922_World_Series" },
  { year:1933, team:"NY Giants (Baseball)", sport:"MLB", title:"World Series", color:"#333", emoji:"⚾", opponent:"vs Senators", iconic:false, moment:"Bill Terry's Giants won in five. Carl Hubbell was the ace — his 1934 All-Star strikeout streak followed.", fact:"Hubbell struck out Ruth, Gehrig, Foxx, Simmons and Cronin consecutively in the 1934 All-Star Game.", wiki:"https://en.wikipedia.org/wiki/1933_World_Series" },
  { year:1954, team:"NY Giants (Baseball)", sport:"MLB", title:"World Series", color:"#333", emoji:"⚾", opponent:"vs Indians", iconic:true, moment:"Willie Mays' over-the-shoulder catch off Vic Wertz is THE greatest defensive play in baseball history.", fact:"The Indians won 111 games — a record. The Giants swept them in four. The Catch changed everything.", wiki:"https://en.wikipedia.org/wiki/1954_World_Series" },

  // ── BROOKLYN DODGERS (1) ──
  { year:1955, team:"Brooklyn Dodgers", sport:"MLB", title:"World Series", color:"#005A9C", emoji:"⚾", opponent:"vs Yankees", iconic:true, moment:"'Next year' FINALLY came. Sandy Amoros' miraculous Game 7 catch. Brooklyn exploded in joy.", fact:"The Dodgers had lost to the Yankees in 1941, 1947, 1949, 1952, and 1953. 1955 was their glorious year.", wiki:"https://en.wikipedia.org/wiki/1955_World_Series" },

  // ── KNICKS (2) ──
  { year:1970, team:"Knicks", sport:"NBA", title:"NBA Championship", color:"#006BB6", emoji:"🏀", opponent:"vs Lakers", iconic:true, moment:"Willis Reed limped onto the MSG court before Game 7. The crowd erupted. Frazier scored 36 with 19 assists.", fact:"Reed had torn his thigh muscle. His entrance is one of the most inspiring moments in sports history.", wiki:"https://en.wikipedia.org/wiki/1970_NBA_Finals" },
  { year:1973, team:"Knicks", sport:"NBA", title:"NBA Championship", color:"#006BB6", emoji:"🏀", opponent:"vs Lakers", iconic:false, moment:"The rematch. DeBusschere, Bradley, Monroe, Frazier — a beautifully constructed championship team.", fact:"Dave DeBusschere's final season. The perfect team concept executed flawlessly.", wiki:"https://en.wikipedia.org/wiki/1973_NBA_Finals" },

  // ── NY NETS ABA (2) ──
  { year:1974, team:"NY Nets (ABA)", sport:"NBA", title:"ABA Championship", color:"#555", emoji:"🏀", opponent:"vs Utah Stars", iconic:false, moment:"Julius Erving's first championship. Dr. J was already redefining what a basketball player could be.", fact:"The Nets played in Uniondale, NY — same arena as the Islanders. Dr. J made them must-see.", wiki:"https://en.wikipedia.org/wiki/1974_ABA_Finals" },
  { year:1976, team:"NY Nets (ABA)", sport:"NBA", title:"ABA Championship", color:"#555", emoji:"🏀", opponent:"vs Denver", iconic:true, moment:"Julius Erving averaged 37.7 points per game in the Finals. The last ABA championship before the merger.", fact:"Dr. J scored 45 in the clincher. The ABA merged with the NBA that fall — and the Nets had to sell his rights.", wiki:"https://en.wikipedia.org/wiki/1976_ABA_Finals" },

  // ── RANGERS (4) ──
  { year:1928, team:"Rangers", sport:"NHL", title:"Stanley Cup", color:"#0038A8", emoji:"🏒", opponent:"vs Maroons", iconic:false, moment:"Their 2nd season in existence! GM Lester Patrick, age 44, played goal when the regular goalie was hurt — and won.", fact:"Patrick held off the Maroons in overtime. One of the great stories in hockey history.", wiki:"https://en.wikipedia.org/wiki/1928_Stanley_Cup_Finals" },
  { year:1933, team:"Rangers", sport:"NHL", title:"Stanley Cup", color:"#0038A8", emoji:"🏒", opponent:"vs Maple Leafs", iconic:false, moment:"Bill Cook scored the overtime winner in Game 4. The Rangers were the toast of Broadway.", fact:"The Cook brothers and Frank Boucher — the original Broadway Blueshirts dynasty.", wiki:"https://en.wikipedia.org/wiki/1933_Stanley_Cup_Finals" },
  { year:1940, team:"Rangers", sport:"NHL", title:"Stanley Cup", color:"#0038A8", emoji:"🏒", opponent:"vs Maple Leafs", iconic:false, moment:"Bryan Hextall won it in OT in Game 6. The last Cup before the 54-year drought began.", fact:"The Rangers would not win again until 1994 — 54 agonizing years. The Garden faithful never forgot.", wiki:"https://en.wikipedia.org/wiki/1940_Stanley_Cup_Finals" },
  { year:1994, team:"Rangers", sport:"NHL", title:"Stanley Cup", color:"#0038A8", emoji:"🏒", opponent:"vs Canucks", iconic:true, moment:"Messier GUARANTEED a win in Game 6 when down 3-2. He scored a hat trick. Then the Rangers beat Vancouver. 54 YEARS ENDED.", fact:"'Now I can die in peace.' Leetch won the Conn Smythe. MSG shook. New York wept. The wait was over.", wiki:"https://en.wikipedia.org/wiki/1994_Stanley_Cup_Finals" },

  // ── ISLANDERS (4) ──
  { year:1980, team:"Islanders", sport:"NHL", title:"Stanley Cup", color:"#00539B", emoji:"🏒", opponent:"vs Flyers", iconic:true, moment:"Bob Nystrom's OT goal in Game 6 launched the dynasty. The Islanders were the new kings of hockey.", fact:"Potvin, Bossy, Trottier, Smith, Nystrom — Long Island fell in love with hockey.", wiki:"https://en.wikipedia.org/wiki/1980_Stanley_Cup_Finals" },
  { year:1981, team:"Islanders", sport:"NHL", title:"Stanley Cup", color:"#00539B", emoji:"🏒", opponent:"vs North Stars", iconic:false, moment:"Back-to-back! Bossy scored 50 goals in 50 games that season. The dynasty was unstoppable.", fact:"Butch Goring won the Conn Smythe. The Islanders were dominant from first shift to last.", wiki:"https://en.wikipedia.org/wiki/1981_Stanley_Cup_Finals" },
  { year:1982, team:"Islanders", sport:"NHL", title:"Stanley Cup", color:"#00539B", emoji:"🏒", opponent:"vs Canucks", iconic:false, moment:"Three straight! Mike Bossy won the Conn Smythe. Comparisons to the Canadiens dynasties were made.", fact:"Billy Smith would do anything to win — and usually did.", wiki:"https://en.wikipedia.org/wiki/1982_Stanley_Cup_Finals" },
  { year:1983, team:"Islanders", sport:"NHL", title:"Stanley Cup", color:"#00539B", emoji:"🏒", opponent:"vs Oilers", iconic:true, moment:"FOUR STRAIGHT! The Islanders SWEPT Gretzky's Oilers who had scored 424 goals. The dynasty's crowning achievement.", fact:"Potvin, Bossy, Trottier, Smith, Gillies — this team belongs with the greatest dynasties in all of sports.", wiki:"https://en.wikipedia.org/wiki/1983_Stanley_Cup_Finals" },

  // ── NJ DEVILS (3) ──
  { year:1995, team:"NJ Devils", sport:"NHL", title:"Stanley Cup", color:"#CE1126", emoji:"🏒", opponent:"vs Red Wings", iconic:false, moment:"The trap system suffocated Detroit's offense. Martin Brodeur was brilliant. Claude Lemieux won the Conn Smythe.", fact:"New Jersey proved that defense and goaltending wins championships. The blueprint still works.", wiki:"https://en.wikipedia.org/wiki/1995_Stanley_Cup_Finals" },
  { year:2000, team:"NJ Devils", sport:"NHL", title:"Stanley Cup", color:"#CE1126", emoji:"🏒", opponent:"vs Stars", iconic:false, moment:"Scott Stevens was the most feared hitter in hockey. Brodeur was the best goalie on earth.", fact:"Stevens' hit on Lindros changed the series — and arguably Lindros's career.", wiki:"https://en.wikipedia.org/wiki/2000_Stanley_Cup_Finals" },
  { year:2003, team:"NJ Devils", sport:"NHL", title:"Stanley Cup", color:"#CE1126", emoji:"🏒", opponent:"vs Ducks", iconic:false, moment:"Brodeur was magnificent against the Ducks. The Devils won in 7. Ken Daneyko's third ring.", fact:"Daneyko played all 1,283 games in a Devils uniform. The ultimate team-first player.", wiki:"https://en.wikipedia.org/wiki/2003_Stanley_Cup_Finals" },

  // ── NY GIANTS NFL (4) ──
  { year:1987, team:"Giants (NFL)", sport:"NFL", title:"Super Bowl XXI", color:"#0B2265", emoji:"🏈", opponent:"vs Broncos", iconic:true, moment:"Phil Simms completed 22 of 25 passes — still the highest completion % in Super Bowl history. LT was a force of nature.", fact:"Simms was nearly perfect. Parcells became the premier coach in the game. LT was the best player on earth.", wiki:"https://en.wikipedia.org/wiki/Super_Bowl_XXI" },
  { year:1991, team:"Giants (NFL)", sport:"NFL", title:"Super Bowl XXV", color:"#0B2265", emoji:"🏈", opponent:"vs Bills", iconic:true, moment:"WIDE RIGHT! Scott Norwood's kick sailed wide as time expired. Giants win 20-19. Ottis Anderson MVP at age 34.", fact:"The most dramatic Super Bowl finish ever. Hostetler started for injured Simms and delivered.", wiki:"https://en.wikipedia.org/wiki/Super_Bowl_XXV" },
  { year:2008, team:"Giants (NFL)", sport:"NFL", title:"Super Bowl XLII", color:"#0B2265", emoji:"🏈", opponent:"vs Patriots", iconic:true, moment:"David Tyree pinned it to his HELMET. Then Eli hit Burress in the end zone. The 18-0 Patriots became 18-1.", fact:"One of the greatest upsets in Super Bowl history. The helmet catch is the most improbable play ever.", wiki:"https://en.wikipedia.org/wiki/Super_Bowl_XLII" },
  { year:2012, team:"Giants (NFL)", sport:"NFL", title:"Super Bowl XLVI", color:"#0B2265", emoji:"🏈", opponent:"vs Patriots", iconic:false, moment:"Eli did it AGAIN to the Patriots. Bradshaw accidentally scored the go-ahead TD. Two upsets in four years.", fact:"Two Super Bowl upsets over the 'unbeatable' Patriots. Eli Manning's legacy is cemented forever.", wiki:"https://en.wikipedia.org/wiki/Super_Bowl_XLVI" },

  // ── JETS (1) ──
  { year:1969, team:"Jets", sport:"NFL", title:"Super Bowl III", color:"#125740", emoji:"🏈", opponent:"vs Colts", iconic:true, moment:"Joe Namath GUARANTEED victory as a 17-point underdog. Broadway Joe delivered a 16-7 masterpiece.", fact:"The most famous guarantee in sports history. Namath's win legitimized the AFL and changed pro football forever.", wiki:"https://en.wikipedia.org/wiki/Super_Bowl_III" },

  // ── LIBERTY (1) ──
  { year:2024, team:"NY Liberty", sport:"WNBA", title:"WNBA Championship", color:"#000", emoji:"🏀", opponent:"vs Lynx", iconic:true, moment:"Breanna Stewart and Sabrina Ionescu led the Liberty to their FIRST championship in franchise history.", fact:"The Liberty were founded in 1997. 27 years of waiting ended. MSG erupted.", wiki:"https://en.wikipedia.org/wiki/2024_WNBA_Finals" },

  // ── SOCCER ──
  // NY Cosmos — 5 NASL titles (1972, 1977, 1978, 1980, 1982)
  { year:1972, team:"NY Cosmos (NASL)", sport:"SOCCER", title:"NASL Championship", color:"#00843d", emoji:"⚽", opponent:"vs St. Louis Stars", iconic:false, moment:"The Cosmos win their first NASL title, planting the flag for soccer in New York.", fact:"The original Cosmos played at Hofstra and Randall's Island before Pelé arrived — this was their first great moment.", wiki:"https://en.wikipedia.org/wiki/1972_NASL_season" },
  { year:1977, team:"NY Cosmos (NASL)", sport:"SOCCER", title:"NASL Championship", color:"#00843d", emoji:"⚽", opponent:"vs Seattle Sounders", iconic:true, moment:"Pelé, Beckenbauer, and Carlos Alberto on one team. The Cosmos beat Seattle before 77,000 fans at Giants Stadium. Soccer in America would never be the same.", fact:"Pelé came out of retirement to sign with the Cosmos in 1975 for $7M. This was his last championship. The signing legitimized soccer in the US.", wiki:"https://en.wikipedia.org/wiki/1977_NASL_season" },
  { year:1978, team:"NY Cosmos (NASL)", sport:"SOCCER", title:"NASL Championship", color:"#00843d", emoji:"⚽", opponent:"vs Tampa Bay Rowdies", iconic:false, moment:"Back-to-back! Beckenbauer led the Cosmos to a second straight Soccer Bowl title.", fact:"Franz Beckenbauer — fresh off lifting the World Cup with Germany — was the captain of this dynasty.", wiki:"https://en.wikipedia.org/wiki/Soccer_Bowl_78" },
  { year:1980, team:"NY Cosmos (NASL)", sport:"SOCCER", title:"NASL Championship", color:"#00843d", emoji:"⚽", opponent:"vs Fort Lauderdale Strikers", iconic:false, moment:"The Cosmos win their fourth title. Carlos Alberto lifts the trophy at Giants Stadium.", fact:"The Cosmos drew 70,000+ fans regularly at Giants Stadium. No American soccer club has matched that era.", wiki:"https://en.wikipedia.org/wiki/Soccer_Bowl_80" },
  { year:1982, team:"NY Cosmos (NASL)", sport:"SOCCER", title:"NASL Championship", color:"#00843d", emoji:"⚽", opponent:"vs Seattle Sounders", iconic:false, moment:"The fifth and final NASL title — the dynasty's last stand before the league collapsed in 1984.", fact:"The Cosmos went 23-7 that season. Two years later the NASL was gone. No team has come close to what the Cosmos built in the 1970s.", wiki:"https://en.wikipedia.org/wiki/Soccer_Bowl_82" },
  // NYCFC — 2021 MLS Cup
  { year:2021, team:"NYCFC", sport:"SOCCER", title:"MLS Cup", color:"#6CACE4", emoji:"⚽", opponent:"vs Portland Timbers", iconic:true, moment:"NYCFC won their first MLS Cup on penalty kicks. New York finally had an MLS champion.", fact:"NYCFC was founded in 2013 and won it all in just their 7th season. Valentín Castellanos was the MVP.", wiki:"https://en.wikipedia.org/wiki/2021_MLS_Cup" },
  // NJ/NY Gotham FC — 2023 NWSL Championship
  { year:2023, team:"NJ/NY Gotham FC", sport:"SOCCER", title:"NWSL Championship", color:"#1a1a1a", emoji:"⚽", opponent:"vs Portland Thorns", iconic:true, moment:"Gotham FC won the NWSL Championship for the first time — NJ/NY's first major women's soccer title.", fact:"Marta, Rose Lavelle, and Lynn Williams led Gotham to the title. New Jersey and New York claimed their first NWSL crown.", wiki:"https://en.wikipedia.org/wiki/2023_NWSL_Championship" },
];

// ─── GLORY DAYS TAB COMPONENT ─────────────────────────────────────────────
function GloryDaysTab({ myTeams }) {
  const [view, setView]         = useState("team");   // "team" | "decade"
  const [sport, setSport]       = useState("ALL");
  const [spotlight, setSpotlight] = useState(null);   // index into NY_CHAMPIONSHIPS

  const myTeamNames = myTeams ? [...myTeams].map(t => t.toLowerCase()) : [];

  function filtered() {
    if (sport === "ALL") return NY_CHAMPIONSHIPS;
    return NY_CHAMPIONSHIPS.filter(c => c.sport === sport);
  }

  function openRandom() {
    const pool = filtered();
    const c = pool[Math.floor(Math.random() * pool.length)];
    setSpotlight(NY_CHAMPIONSHIPS.indexOf(c));
  }

  function navSpotlight(dir) {
    const pool = filtered();
    const cur  = pool.findIndex((_, i) => NY_CHAMPIONSHIPS.indexOf(pool[i]) === spotlight);
    const next = (cur + dir + pool.length) % pool.length;
    setSpotlight(NY_CHAMPIONSHIPS.indexOf(pool[next]));
  }

  const total = filtered().length;
  const sp    = spotlight !== null ? NY_CHAMPIONSHIPS[spotlight] : null;

  // ── TEAM VIEW ────────────────────────────────────────────────────────
  const SPORT_ORDER = ["MLB","NBA","NHL","NFL","WNBA","SOCCER"];
  const SPORT_META  = {
    MLB:    { icon:"⚾", label:"Baseball" },
    NBA:    { icon:"🏀", label:"Basketball" },
    NHL:    { icon:"🏒", label:"Hockey" },
    NFL:    { icon:"🏈", label:"Football" },
    WNBA:   { icon:"🏀", label:"WNBA" },
    SOCCER: { icon:"⚽", label:"Soccer" },
  };
  const TEAM_ORDER = [
    "Yankees","Mets","NY Giants (Baseball)","Brooklyn Dodgers",
    "Knicks","NY Nets (ABA)",
    "Rangers","Islanders","NJ Devils",
    "Giants (NFL)","Jets","NY Liberty",
    "NY Cosmos (NASL)","NYCFC","NJ/NY Gotham FC",
  ];

  function renderTeamView() {
    const data = filtered();
    const bySport = {};
    data.forEach(c => {
      if (!bySport[c.sport]) bySport[c.sport] = {};
      if (!bySport[c.sport][c.team]) bySport[c.sport][c.team] = [];
      bySport[c.sport][c.team].push(c);
    });

    return SPORT_ORDER.map(sp => {
      if (!bySport[sp]) return null;
      const teams = bySport[sp];
      const spTotal = Object.values(teams).flat().length;
      return (
        <div key={sp} style={{marginBottom:32}}>
          {/* Sport header */}
          <div style={{display:"flex", alignItems:"center", gap:10, marginBottom:14,
            paddingBottom:8, borderBottom:"2px solid #1f1f1f"}}>
            <span style={{fontSize:18}}>{SPORT_META[sp].icon}</span>
            <span style={{fontFamily:"'Georgia',serif", fontSize:11, fontWeight:900,
              letterSpacing:"0.2em", color:"#666", textTransform:"uppercase"}}>{SPORT_META[sp].label}</span>
            <span style={{fontSize:10, fontWeight:700, color:"#f0b429",
              background:"rgba(240,180,41,0.1)", border:"1px solid rgba(240,180,41,0.2)",
              padding:"2px 8px"}}>{spTotal} title{spTotal!==1?"s":""}</span>
          </div>

          {/* Teams */}
          {TEAM_ORDER.map(team => {
            if (!teams[team]) return null;
            const champs = [...teams[team]].sort((a,b) => a.year - b.year);
            const isFav  = myTeamNames.some(t =>
              team.toLowerCase().includes(t) || t.includes(team.toLowerCase().split(" ")[0])
            );
            return (
              <div key={team} style={{marginBottom:16, paddingLeft:8,
                borderLeft:`3px solid ${isFav?"#f0b429":"#1f1f1f"}`}}>
                <div style={{display:"flex", alignItems:"center", gap:8, marginBottom:8}}>
                  <span style={{fontSize:14}}>{champs[0].emoji}</span>
                  <span style={{fontFamily:"'Georgia',serif", fontSize:12, fontWeight:900,
                    letterSpacing:"0.1em", color: isFav?"#f0b429":"#e8e0d0",
                    textTransform:"uppercase"}}>{team}</span>
                  {isFav && <span style={{fontSize:9, color:"#f0b429"}}>⭐</span>}
                  <span style={{fontSize:10, color:"#555", marginLeft:2}}>
                    {champs.length} title{champs.length!==1?"s":""}
                  </span>
                </div>
                <div style={{display:"flex", flexWrap:"wrap", gap:5}}>
                  {champs.map(c => {
                    const idx = NY_CHAMPIONSHIPS.indexOf(c);
                    return (
                      <button key={c.year} onClick={() => setSpotlight(idx)}
                        style={{
                          display:"flex", alignItems:"center", gap:5,
                          padding:"6px 10px",
                          background: c.iconic ? "rgba(200,32,28,0.08)" : "#111",
                          border: `1px solid ${c.iconic ? "#c8201c44" : "#222"}`,
                          borderLeft: `3px solid ${c.color}`,
                          color:"#ccc", cursor:"pointer", fontSize:12,
                          fontFamily:"'Georgia',serif", fontWeight:700,
                          transition:"all 0.12s",
                          position:"relative",
                        }}
                        onMouseEnter={e => { e.currentTarget.style.borderColor="#f0b429"; e.currentTarget.style.color="#f0b429"; e.currentTarget.style.transform="translateY(-1px)"; }}
                        onMouseLeave={e => { e.currentTarget.style.borderColor=c.iconic?"#c8201c44":"#222"; e.currentTarget.style.color="#ccc"; e.currentTarget.style.transform="none"; }}>
                        <span style={{fontWeight:900, fontSize:13}}>{c.year}</span>
                        <span style={{fontSize:9, color:"#555"}}>{c.opponent}</span>
                        {c.iconic && <span style={{fontSize:9, color:"#f0b429", position:"absolute", top:-5, right:-4, background:"#0a0a0a", padding:"0 2px"}}>★</span>}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      );
    });
  }

  // ── DECADE VIEW ──────────────────────────────────────────────────────
  function renderDecadeView() {
    const data = filtered();
    const byDecade = {};
    data.forEach(c => {
      const dec = Math.floor(c.year / 10) * 10;
      if (!byDecade[dec]) byDecade[dec] = [];
      byDecade[dec].push(c);
    });
    return Object.keys(byDecade).sort((a,b) => a-b).map(dec => (
      <div key={dec} style={{marginBottom:28}}>
        <div style={{fontFamily:"'Georgia',serif", fontSize:24, fontWeight:900,
          color:"#333", marginBottom:10}}>{dec}s</div>
        <div style={{display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(160px,1fr))", gap:8}}>
          {byDecade[dec].sort((a,b) => a.year-b.year).map(c => {
            const idx = NY_CHAMPIONSHIPS.indexOf(c);
            return (
              <div key={c.year} onClick={() => setSpotlight(idx)}
                style={{
                  background:"#111", border:"1px solid #1f1f1f",
                  borderLeft:`3px solid ${c.color}`,
                  padding:"12px 14px", cursor:"pointer",
                  transition:"all 0.15s", position:"relative",
                }}
                onMouseEnter={e => { e.currentTarget.style.transform="translateY(-2px)"; e.currentTarget.style.borderTopColor="#f0b429"; e.currentTarget.style.borderRightColor="#f0b429"; e.currentTarget.style.borderBottomColor="#f0b429"; }}
                onMouseLeave={e => { e.currentTarget.style.transform="none"; e.currentTarget.style.borderTopColor="#1f1f1f"; e.currentTarget.style.borderRightColor="#1f1f1f"; e.currentTarget.style.borderBottomColor="#1f1f1f"; }}>
                {c.iconic && <span style={{position:"absolute", top:6, right:8, fontSize:10, color:"#f0b429"}}>★</span>}
                <div style={{fontFamily:"'Georgia',serif", fontSize:26, fontWeight:900,
                  color:"#f0b429", lineHeight:1, marginBottom:4}}>{c.year}</div>
                <div style={{fontFamily:"'Georgia',serif", fontSize:11, fontWeight:700,
                  textTransform:"uppercase", letterSpacing:"0.08em",
                  color:"#e8e0d0", marginBottom:2}}>{c.team}</div>
                <div style={{fontSize:10, color:"#555", letterSpacing:"0.08em"}}>{c.title}</div>
              </div>
            );
          })}
        </div>
      </div>
    ));
  }

  // ── BANNER STRIP ─────────────────────────────────────────────────────
  const bannerItems = [...NY_CHAMPIONSHIPS].sort((a,b) => a.year - b.year);

  return (
    <div>
      {/* ── HERO ── */}
      <div style={{textAlign:"center", padding:"24px 0 20px", borderBottom:"1px solid #1a1a1a",
        marginBottom:0, background:"linear-gradient(180deg, rgba(200,32,28,0.06) 0%, transparent 100%)"}}>
        <div style={{fontSize:9, fontWeight:900, color:"#f0b429", letterSpacing:"0.3em",
          marginBottom:8, fontFamily:"'Georgia',serif"}}>🏆 NEW YORK · NEW YORK</div>
        <h2 style={{fontFamily:"'Georgia',serif", fontSize:32, fontWeight:900,
          color:"#e8e0d0", margin:"0 0 4px", letterSpacing:"0.02em"}}>
          Glory <em style={{color:"#f0b429", fontStyle:"italic"}}>Days</em>
        </h2>
        <div style={{fontSize:10, color:"#666", letterSpacing:"0.18em",
          textTransform:"uppercase", marginBottom:16}}>NY Sports Championships — The Complete Record</div>
        <div style={{display:"inline-flex", alignItems:"center", gap:12,
          background:"#111", border:"1px solid #1f1f1f", padding:"8px 20px"}}>
          <span style={{fontFamily:"'Georgia',serif", fontSize:32, fontWeight:900,
            color:"#f0b429", lineHeight:1}}>{NY_CHAMPIONSHIPS.length}</span>
          <span style={{fontSize:9, fontWeight:700, letterSpacing:"0.15em",
            color:"#555", textAlign:"left", lineHeight:1.5, textTransform:"uppercase"}}>
            Major<br/>Championships
          </span>
        </div>
      </div>

      {/* ── BANNER STRIP ── */}
      <div style={{display:"flex", overflowX:"auto", borderBottom:"1px solid #1a1a1a",
        scrollbarWidth:"none", background:"#0a0a0a"}}>
        {bannerItems.map((c, i) => (
          <div key={i} onClick={() => setSpotlight(NY_CHAMPIONSHIPS.indexOf(c))}
            style={{flexShrink:0, padding:"8px 14px", borderRight:"1px solid #1a1a1a",
              cursor:"pointer", textAlign:"center", minWidth:64, transition:"background 0.1s"}}
            onMouseEnter={e => e.currentTarget.style.background="#161616"}
            onMouseLeave={e => e.currentTarget.style.background="transparent"}>
            <span style={{display:"block", fontFamily:"'Georgia',serif", fontSize:14,
              fontWeight:900, color:"#f0b429"}}>{c.year}</span>
            <span style={{display:"block", fontSize:8, fontWeight:700,
              letterSpacing:"0.08em", color:"#555", textTransform:"uppercase",
              whiteSpace:"nowrap"}}>
              {c.team.replace(" (Baseball)","").replace(" (NFL)","").replace(" (ABA)","")}
            </span>
          </div>
        ))}
      </div>

      {/* ── CONTROLS ── */}
      <div style={{display:"flex", gap:6, flexWrap:"wrap", padding:"12px 16px",
        borderBottom:"1px solid #1a1a1a", alignItems:"center",
        position:"sticky", top:0, zIndex:50, background:"#111"}}>

        <span style={{fontSize:9, fontWeight:900, color:"#444", letterSpacing:"0.18em",
          textTransform:"uppercase"}}>VIEW:</span>
        {["team","decade"].map(v => (
          <button key={v} onClick={() => setView(v)}
            style={{...btnStyle, ...(view===v?activeBtnStyle:{})}}>
            {v === "team" ? "BY TEAM" : "BY DECADE"}
          </button>
        ))}

        <span style={{fontSize:9, fontWeight:900, color:"#444", letterSpacing:"0.18em",
          textTransform:"uppercase", marginLeft:8}}>SPORT:</span>
        {["ALL","MLB","NBA","NHL","NFL","WNBA","SOCCER"].map(s => (
          <button key={s} onClick={() => setSport(s)}
            style={{...btnStyle, ...(sport===s?activeBtnStyle:{})}}>
            {s === "ALL" ? "ALL" : s === "WNBA" ? "🏀 WNBA" : s === "SOCCER" ? "⚽ SOCCER" : {MLB:"⚾",NBA:"🏀",NHL:"🏒",NFL:"🏈"}[s]+" "+s}
          </button>
        ))}

        <span style={{marginLeft:"auto", fontSize:10, color:"#444", fontWeight:700,
          letterSpacing:"0.1em"}}>{total} title{total!==1?"s":""}</span>

        <button onClick={openRandom}
          style={{background:"#f0b429", border:"none", color:"#000",
            padding:"7px 16px", cursor:"pointer", fontSize:10, fontWeight:900,
            letterSpacing:"0.12em", fontFamily:"'Georgia',serif",
            boxShadow:"0 2px 0 #8a6200"}}>
          🎲 RANDOM GLORY
        </button>
      </div>

      {/* ── CONTENT ── */}
      <div style={{padding:"20px 16px"}}>
        {view === "team" ? renderTeamView() : renderDecadeView()}
      </div>

      {/* ── SPOTLIGHT MODAL ── */}
      {sp && (
        <div onClick={e => e.target === e.currentTarget && setSpotlight(null)}
          style={{position:"fixed", inset:0, background:"rgba(0,0,0,0.88)",
            zIndex:1000, display:"flex", alignItems:"center", justifyContent:"center",
            padding:"20px"}}>
          <div style={{background:"#111", border:"1px solid #2a2a2a",
            maxWidth:520, width:"100%", position:"relative",
            animation:"none"}}
            onClick={e => e.stopPropagation()}>

            {/* Close */}
            <button onClick={() => setSpotlight(null)}
              style={{position:"absolute", top:10, right:10, background:"transparent",
                border:"1px solid #2a2a2a", color:"#666", width:28, height:28,
                cursor:"pointer", fontSize:12, display:"flex",
                alignItems:"center", justifyContent:"center"}}>✕</button>

            {/* Header */}
            <div style={{padding:"18px 22px 14px", borderBottom:"1px solid #1a1a1a",
              display:"flex", gap:14, alignItems:"flex-start"}}>
              <span style={{fontSize:44, lineHeight:1, flexShrink:0}}>🏆</span>
              <div>
                <div style={{fontFamily:"'Georgia',serif", fontSize:52, fontWeight:900,
                  color:"#f0b429", lineHeight:1}}>{sp.year}</div>
                <div style={{fontFamily:"'Georgia',serif", fontSize:16, fontWeight:900,
                  letterSpacing:"0.08em", textTransform:"uppercase",
                  color:"#e8e0d0", marginBottom:2}}>{sp.team}</div>
                <div style={{fontSize:10, fontWeight:700, letterSpacing:"0.15em",
                  color:"#c8201c", textTransform:"uppercase"}}>
                  {sp.title} · {sp.opponent}
                </div>
              </div>
            </div>

            {/* Body */}
            <div style={{padding:"16px 22px 18px"}}>
              <p style={{fontFamily:"'Georgia',serif", fontSize:15, lineHeight:1.65,
                color:"#e8e0d0", fontStyle:"italic", marginBottom:12}}>{sp.moment}</p>
              <p style={{fontSize:12, lineHeight:1.65, color:"#777",
                marginBottom:14}}>{sp.fact}</p>
              <div style={{display:"flex", gap:8, flexWrap:"wrap"}}>
                <a href={sp.wiki} target="_blank" rel="noopener"
                  style={{fontSize:10, fontWeight:700, letterSpacing:"0.12em",
                    textTransform:"uppercase", padding:"5px 12px",
                    border:"1px solid #2a2a2a", color:"#888",
                    textDecoration:"none", transition:"all 0.15s"}}
                  onMouseEnter={e=>{e.currentTarget.style.borderColor="#f0b429";e.currentTarget.style.color="#f0b429";}}
                  onMouseLeave={e=>{e.currentTarget.style.borderColor="#2a2a2a";e.currentTarget.style.color="#888";}}>
                  📖 WIKIPEDIA
                </a>
                <a href={`https://www.google.com/search?q=${encodeURIComponent(sp.year+' '+sp.team+' '+sp.title)}`}
                  target="_blank" rel="noopener"
                  style={{fontSize:10, fontWeight:700, letterSpacing:"0.12em",
                    textTransform:"uppercase", padding:"5px 12px",
                    border:"1px solid #2a2a2a", color:"#888",
                    textDecoration:"none", transition:"all 0.15s"}}
                  onMouseEnter={e=>{e.currentTarget.style.borderColor="#f0b429";e.currentTarget.style.color="#f0b429";}}
                  onMouseLeave={e=>{e.currentTarget.style.borderColor="#2a2a2a";e.currentTarget.style.color="#888";}}>
                  🔍 GOOGLE
                </a>
              </div>
            </div>

            {/* Nav */}
            <div style={{display:"flex", justifyContent:"space-between", padding:"10px 22px",
              borderTop:"1px solid #1a1a1a"}}>
              <button onClick={() => navSpotlight(-1)}
                style={{...btnStyle, fontSize:10}}>← PREV</button>
              <button onClick={openRandom}
                style={{...btnStyle, fontSize:10}}>🎲 RANDOM</button>
              <button onClick={() => navSpotlight(1)}
                style={{...btnStyle, fontSize:10}}>NEXT →</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Shared button styles for GloryDaysTab
const btnStyle = {
  fontFamily:"'Georgia',serif", fontSize:9, fontWeight:700,
  letterSpacing:"0.12em", textTransform:"uppercase",
  padding:"5px 10px", background:"transparent",
  border:"1px solid #2a2a2a", color:"#777", cursor:"pointer",
  transition:"all 0.12s",
};

const activeBtnStyle = {
  background:"#c8201c", borderColor:"#c8201c", color:"#fff",
};



// ═══════════════════════════════════════════════════════════════════════════
// ① ONBOARDING BANNER
// Shows once to first-time visitors. Dismisses forever via localStorage.
// ═══════════════════════════════════════════════════════════════════════════

// ─── HOMEPAGE WIDGETS WRAPPER ─────────────────────────────────────────────
// Manages collapse state for Playoff Widget + Legends/OTD panel.
// State persisted in localStorage so preferences survive page reloads.
// ─── LAST NIGHT'S NY SCORES ───────────────────────────────────────────────
function LastNightScores({ myTeams }) {
  const [games, setGames]       = useState([]);
  const [loading, setLoading]   = useState(true);
  const [date, setDate]         = useState(null);
  const [expanded, setExpanded] = useState(null);

  // STRICT matching — full display names to avoid Texas Rangers / SF Giants
  const NY_FULL_NAMES = [
    "new york yankees", "new york mets",
    "new york jets",    "new york giants",
    "new york knicks",  "brooklyn nets",
    "new york rangers", "new york islanders", "new jersey devils",
    "new york liberty", "new york city fc",
    "new york red bulls", "nj/ny gotham",
  ];

  const SPORT_CONFIGS = [
    { sport:"baseball",   league:"mlb",     label:"MLB",  emoji:"⚾", recapPath:"mlb/recap/_/gameId"     },
    { sport:"basketball", league:"nba",      label:"NBA",  emoji:"🏀", recapPath:"nba/recap/_/gameId"     },
    { sport:"hockey",     league:"nhl",      label:"NHL",  emoji:"🏒", recapPath:"nhl/recap/_/gameId"     },
    { sport:"football",   league:"nfl",      label:"NFL",  emoji:"🏈", recapPath:"nfl/recap/_/gameId"     },
    { sport:"basketball", league:"wnba",     label:"WNBA", emoji:"🏀", recapPath:"wnba/recap/_/gameId"    },
    { sport:"soccer",     league:"usa.nwsl", label:"NWSL", emoji:"⚽", recapPath:"soccer/recap/_/gameId"  },
    { sport:"soccer",     league:"usa.1",    label:"MLS",  emoji:"⚽", recapPath:"soccer/recap/_/gameId"  },
  ];

  function isNY(displayName) {
    const dn = (displayName||"").toLowerCase();
    return NY_FULL_NAMES.some(ny => dn === ny || dn.startsWith(ny));
  }

  function getMyTeam(home, away) {
    if (!myTeams || myTeams.size === 0) return null;
    const names = [...myTeams].map(t => t.toLowerCase());
    if (names.some(t => (home||"").toLowerCase().includes(t))) return home;
    if (names.some(t => (away||"").toLowerCase().includes(t))) return away;
    return null;
  }

  useEffect(() => {
    async function load() {
      setLoading(true);
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const y = yesterday.getFullYear();
      const m = String(yesterday.getMonth()+1).padStart(2,"0");
      const d = String(yesterday.getDate()).padStart(2,"0");
      const dateStr = `${y}${m}${d}`;
      setDate(yesterday.toLocaleDateString("en-US",{weekday:"long",month:"long",day:"numeric"}));

      const allGames = [];
      await Promise.all(SPORT_CONFIGS.map(async cfg => {
        try {
          const r = await fetch(
            `https://site.api.espn.com/apis/site/v2/sports/${cfg.sport}/${cfg.league}/scoreboard?dates=${dateStr}`,
            { cache:"no-store" }
          );
          if (!r.ok) return;
          const json = await r.json();
          (json.events||[]).forEach(ev => {
            const comp = ev.competitions?.[0];
            if (!comp) return;
            const home = comp.competitors?.find(c => c.homeAway==="home");
            const away = comp.competitors?.find(c => c.homeAway==="away");
            if (!home || !away) return;
            const homeName = home.team?.displayName || home.team?.name || "";
            const awayName = away.team?.displayName || away.team?.name || "";
            const homeShort = home.team?.shortDisplayName || homeName;
            const awayShort = away.team?.shortDisplayName || awayName;
            if (!isNY(homeName) && !isNY(awayName)) return;
            if (!comp.status?.type?.completed) return;
            const homeScore = parseInt(home.score || 0);
            const awayScore = parseInt(away.score || 0);
            allGames.push({
              id: ev.id,
              sport: cfg.label,
              espnSport: cfg.sport,
              emoji: cfg.emoji,
              homeName, homeShort, homeScore,
              homeRecord: home.records?.[0]?.summary || "",
              awayName, awayShort, awayScore,
              awayRecord: away.records?.[0]?.summary || "",
              homeWin: homeScore > awayScore,
              awayWin: awayScore > homeScore,
              boxUrl: `https://www.espn.com/${cfg.recapPath}/${ev.id}`,
              myTeam: getMyTeam(homeName, awayName),
              homeLinescores: (home.linescores||[]).map(l => l.value),
              awayLinescores: (away.linescores||[]).map(l => l.value),
              note: comp.notes?.[0]?.headline || "",
            });
          });
        } catch(e) {}
      }));

      allGames.sort((a,b) => {
        if (a.myTeam && !b.myTeam) return -1;
        if (!a.myTeam && b.myTeam) return 1;
        return 0;
      });
      setGames(allGames);
      setLoading(false);
    }
    load();
  }, []);

  function periodLabel(sport, i) {
    if (sport === "MLB")  return i < 9 ? String(i+1) : `E${i-8}`;
    if (sport === "NBA" || sport === "WNBA") return i < 4 ? `Q${i+1}` : `OT${i-3}`;
    if (sport === "NHL")  return i < 3 ? `P${i+1}` : `OT${i-2}`;
    if (sport === "NFL")  return i < 4 ? `Q${i+1}` : `OT${i-3}`;
    return String(i+1);
  }

  const SPORT_COLORS = {
    MLB:"#003087", NBA:"#006BB6", NHL:"#0038A8",
    NFL:"#13274F", WNBA:"#FF6900", NWSL:"#00843d", MLS:"#000"
  };

  return (
    <div style={{background:"#111", border:"1px solid #1a1a1a",
      borderTop:"2px solid #2a2a2a", marginBottom:8}}>
      <div style={{display:"flex", alignItems:"center", gap:8,
        padding:"8px 12px", borderBottom:"1px solid #1a1a1a", background:"#0e0e0e"}}>
        <span style={{fontSize:15}}>🌙</span>
        <span style={{fontFamily:"'Georgia',serif", fontSize:9, fontWeight:900,
          letterSpacing:"0.22em", color:"#888", textTransform:"uppercase"}}>
          Last Night's NY Scores
        </span>
        {date && <span style={{fontSize:9, color:"#444"}}>{date}</span>}
        <span style={{marginLeft:"auto", fontSize:9, color:"#444"}}>
          {loading ? "Loading…" : `${games.length} game${games.length!==1?"s":""}`}
        </span>
      </div>

      <div>
        {loading ? (
          <div style={{padding:"16px", textAlign:"center", fontSize:10, color:"#555"}}>
            LOADING SCORES…
          </div>
        ) : games.length === 0 ? (
          <div style={{padding:"16px", textAlign:"center", fontSize:11,
            color:"#555", fontStyle:"italic"}}>No NY games played yesterday.</div>
        ) : games.map((g, i) => {
          const isOpen = expanded === g.id;
          const cols   = g.homeLinescores.length;
          return (
            <div key={g.id} style={{
              borderBottom:"1px solid #1a1a1a",
              borderLeft: g.myTeam ? "3px solid #f0b429" : "3px solid transparent",
              background: g.myTeam ? "rgba(240,180,41,0.04)" : i%2===0?"#111":"#0e0e0e",
            }}>
              {/* Score row */}
              <div onClick={() => setExpanded(prev => prev===g.id ? null : g.id)}
                style={{display:"flex", alignItems:"center", gap:8,
                  padding:"9px 12px", cursor:"pointer"}}
                onMouseEnter={e=>e.currentTarget.style.background="rgba(255,255,255,0.03)"}
                onMouseLeave={e=>e.currentTarget.style.background="transparent"}>

                <span style={{fontFamily:"'Georgia',serif", fontSize:9, fontWeight:900,
                  padding:"2px 5px", flexShrink:0, minWidth:26, textAlign:"center",
                  background: SPORT_COLORS[g.sport]||"#333", color:"#fff"}}>
                  {g.emoji}
                </span>

                <div style={{flex:1, minWidth:0}}>
                  {[{name:g.awayShort, score:g.awayScore, win:g.awayWin},
                    {name:g.homeShort, score:g.homeScore, win:g.homeWin}].map((row,ri) => (
                    <div key={ri} style={{display:"flex", alignItems:"center",
                      marginBottom: ri===0 ? 2 : 0}}>
                      <span style={{fontFamily:"'Georgia',serif", fontSize:12,
                        fontWeight: row.win?900:500,
                        color: row.win?"#e8e0d0":"#666",
                        flex:1, overflow:"hidden", textOverflow:"ellipsis",
                        whiteSpace:"nowrap"}}>{row.name}</span>
                      <span style={{fontFamily:"'Georgia',serif", fontSize:15,
                        fontWeight:900, color: row.win?"#e8e0d0":"#555",
                        minWidth:28, textAlign:"right", flexShrink:0}}>
                        {row.score}
                      </span>
                    </div>
                  ))}
                </div>

                <div style={{flexShrink:0, textAlign:"right", minWidth:36}}>
                  <div style={{fontSize:8, color:"#555", fontWeight:700,
                    letterSpacing:"0.06em"}}>FINAL</div>
                  {g.myTeam && <div style={{fontSize:9, color:"#f0b429"}}>⭐</div>}
                  <div style={{fontSize:10, color:"#444", marginTop:2}}>
                    {isOpen ? "▲" : "▼"}
                  </div>
                </div>
              </div>

              {/* Inline linescore */}
              {isOpen && (
                <div style={{padding:"10px 12px 12px",
                  borderTop:"1px solid #1a1a1a", background:"#0a0a0a"}}>
                  {cols > 0 && (
                    <div style={{overflowX:"auto", marginBottom:10}}>
                      <table style={{borderCollapse:"collapse", fontSize:10,
                        fontFamily:"'Georgia',serif", width:"100%"}}>
                        <thead>
                          <tr>
                            <td style={{padding:"2px 8px 4px", color:"#555",
                              fontWeight:700, minWidth:80}}>TEAM</td>
                            {g.homeLinescores.map((_, ci) => (
                              <td key={ci} style={{padding:"2px 4px 4px",
                                textAlign:"center", color:"#555",
                                fontWeight:700, minWidth:22}}>
                                {periodLabel(g.sport, ci)}
                              </td>
                            ))}
                            <td style={{padding:"2px 8px 4px", textAlign:"center",
                              color:"#e8e0d0", fontWeight:900}}>F</td>
                          </tr>
                        </thead>
                        <tbody>
                          {[
                            {n:g.awayShort, ls:g.awayLinescores, t:g.awayScore, w:g.awayWin},
                            {n:g.homeShort, ls:g.homeLinescores, t:g.homeScore, w:g.homeWin},
                          ].map((row,ri) => (
                            <tr key={ri} style={{background:ri%2===0?"transparent":"rgba(255,255,255,0.02)"}}>
                              <td style={{padding:"3px 8px", fontWeight:row.w?900:500,
                                color:row.w?"#e8e0d0":"#777",
                                overflow:"hidden", textOverflow:"ellipsis",
                                whiteSpace:"nowrap", maxWidth:80}}>{row.n}</td>
                              {row.ls.map((s,si) => (
                                <td key={si} style={{padding:"3px 4px",
                                  textAlign:"center", color:"#aaa"}}>{s??"-"}</td>
                              ))}
                              <td style={{padding:"3px 8px", textAlign:"center",
                                fontWeight:900, fontSize:13,
                                color:row.w?"#e8e0d0":"#555"}}>{row.t}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                  {g.note && (
                    <div style={{fontSize:10, color:"#666", fontStyle:"italic",
                      marginBottom:8}}>{g.note}</div>
                  )}
                  <a href={g.boxUrl} target="_blank" rel="noopener noreferrer"
                    style={{fontSize:10, fontWeight:700, letterSpacing:"0.08em",
                      padding:"4px 12px", border:"1px solid #2a2a2a",
                      color:"#888", textDecoration:"none", display:"inline-block"}}
                    onMouseEnter={e=>{e.currentTarget.style.color="#f0b429";e.currentTarget.style.borderColor="#f0b429";}}
                    onMouseLeave={e=>{e.currentTarget.style.color="#888";e.currentTarget.style.borderColor="#2a2a2a";}}>
                    📊 FULL BOX SCORE ON ESPN →
                  </a>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function HomepageWidgets({ myTeams, setActiveTab }) {
  const [showPlayoff, setShowPlayoff] = useState(() => {
    try { return localStorage.getItem("nsd_show_playoff") !== "0"; } catch(e) { return true; }
  });
  const [showLegends, setShowLegends] = useState(() => {
    try { return localStorage.getItem("nsd_show_legends") !== "0"; } catch(e) { return false; }
  });
  const [showLastNight, setShowLastNight] = useState(() => {
    try { return localStorage.getItem("nsd_show_lastnight") === "1"; } catch(e) { return false; }
  });
  const [onboardDone, setOnboardDone] = useState(() => {
    try { return !!localStorage.getItem("nsd_onboarded"); } catch(e) { return false; }
  });

  function togglePlayoff() {
    const next = !showPlayoff;
    setShowPlayoff(next);
    try { localStorage.setItem("nsd_show_playoff", next ? "1" : "0"); } catch(e) {}
  }
  function toggleLegends() {
    const next = !showLegends;
    setShowLegends(next);
    try { localStorage.setItem("nsd_show_legends", next ? "1" : "0"); } catch(e) {}
  }
  function toggleLastNight() {
    const next = !showLastNight;
    setShowLastNight(next);
    try { localStorage.setItem("nsd_show_lastnight", next ? "1" : "0"); } catch(e) {}
  }
  function dismissOnboard() {
    setOnboardDone(true);
    try { localStorage.setItem("nsd_onboarded","1"); } catch(e) {}
  }

  return (
    <div style={{marginBottom:12}}>
      {/* Onboard */}
      {!onboardDone && (
        <OnboardBanner
          onDismiss={dismissOnboard}
          onAction={(tab) => { dismissOnboard(); setActiveTab(tab); }}
        />
      )}

      {/* Toggle bar */}
      <div style={{display:"flex", gap:6, marginBottom:8, flexWrap:"wrap", alignItems:"center"}}>
        <span style={{fontSize:8, fontWeight:900, color:"#444", letterSpacing:"0.2em",
          textTransform:"uppercase", fontFamily:"'Georgia',serif"}}>SHOW:</span>
        {[
          { label:"🗽 Playoff Picture",      on:showPlayoff,   toggle:togglePlayoff   },
          { label:"🌙 Last Night's Scores",  on:showLastNight, toggle:toggleLastNight },
          { label:"⚡ Legends + This Date",  on:showLegends,   toggle:toggleLegends  },
        ].map(({label, on, toggle}) => (
          <button key={label} onClick={toggle} style={{
            fontFamily:"'Georgia',serif", fontSize:10, fontWeight:700,
            letterSpacing:"0.06em", padding:"4px 12px",
            background: on ? "#c8201c" : "transparent",
            border: `1px solid ${on ? "#c8201c" : "#2a2a2a"}`,
            color: on ? "#fff" : "#555",
            cursor:"pointer", transition:"all 0.15s",
          }}>
            {label} {on ? "▲" : "▼"}
          </button>
        ))}
      </div>

      {/* Playoff widget */}
      {showPlayoff && <NYPlayoffWidget myTeams={myTeams} />}

      {/* Last Night's NY Scores */}
      {showLastNight && <LastNightScores myTeams={myTeams} />}

      {/* Legends + OTD side by side */}
      {showLegends && (
        <div style={{display:"flex", gap:12, marginBottom:8, flexWrap:"wrap"}}>
          <div style={{flex:"1 1 260px"}}><LegendsCorner myTeams={myTeams} /></div>
          <div style={{flex:"2 1 300px"}}><EnhancedOTD /></div>
        </div>
      )}
    </div>
  );
}

// ─── ONBOARDING BANNER ────────────────────────────────────────────────────
function OnboardBanner({ onDismiss, onAction }) {
  return (
    <div style={{
      background:"linear-gradient(135deg,#0d1a0d 0%,#0a0a0a 60%)",
      border:"1px solid #1a3a1a", borderLeft:"3px solid #22c55e",
      padding:"12px 16px", display:"flex", gap:12, alignItems:"flex-start",
      position:"relative", marginBottom:8,
    }}>
      <span style={{fontSize:20, flexShrink:0, marginTop:2}}>🗽</span>
      <div style={{flex:1}}>
        <div style={{fontFamily:"'Georgia',serif", fontSize:12, fontWeight:900,
          color:"#22c55e", marginBottom:4, textTransform:"uppercase",
          letterSpacing:"0.08em"}}>Welcome to NY Sports Daily</div>
        <div style={{fontSize:11, color:"#aaa", lineHeight:1.5, marginBottom:8}}>
          Set your teams once and the whole site personalizes around you.
        </div>
        <div style={{display:"flex", gap:6, flexWrap:"wrap"}}>
          {[
            { label:"⭐ Set My Teams", tab:"SCORES" },
            { label:"🎮 Playroom", tab:"PLAYROOM" },
            { label:"🏆 Glory Days", tab:"GLORY" },
          ].map(({label,tab}) => (
            <button key={tab} onClick={() => onAction(tab)} style={{
              fontSize:10, fontWeight:700, padding:"4px 10px",
              background:"rgba(34,197,94,0.1)", border:"1px solid rgba(34,197,94,0.3)",
              color:"#22c55e", cursor:"pointer",
              fontFamily:"'Georgia',serif",
            }}>{label}</button>
          ))}
          <button onClick={onDismiss} style={{
            fontSize:10, fontWeight:700, padding:"4px 10px",
            background:"transparent", border:"1px solid #333",
            color:"#666", cursor:"pointer", fontFamily:"'Georgia',serif",
          }}>Got it →</button>
        </div>
      </div>
      <button onClick={onDismiss} style={{
        position:"absolute", top:8, right:8, background:"transparent",
        border:"none", color:"#444", cursor:"pointer", fontSize:14,
      }}>✕</button>
    </div>
  );
}

// ─── NY LEGENDS CORNER ────────────────────────────────────────────────────
function LegendsCorner({ myTeams }) {
  const [idx, setIdx]       = useState(() => Math.floor(Math.random() * DAILY_PLAYERS.length));
  const [fading, setFading] = useState(false);
  const timerRef            = useRef(null);
  const myTeamNames         = myTeams ? [...myTeams].map(t => t.toLowerCase()) : [];

  function goTo(newIdx) {
    setFading(true);
    setTimeout(() => { setIdx(newIdx); setFading(false); }, 180);
    resetTimer();
  }
  function resetTimer() {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => setIdx(i => (i+1) % DAILY_PLAYERS.length), 12000);
  }
  useEffect(() => { resetTimer(); return () => clearInterval(timerRef.current); }, []);

  const legend = DAILY_PLAYERS[idx];
  if (!legend) return null;
  const isFav = myTeamNames.some(t =>
    legend.team.toLowerCase().includes(t) || t.includes(legend.team.toLowerCase())
  );
  const dotStart = Math.max(0, Math.min(idx - 3, DAILY_PLAYERS.length - 8));

  return (
    <div style={{
      background:"#111", borderTop:"2px solid #c8201c",
      border:`1px solid ${isFav?"#f0b42944":"#1a1a1a"}`,
      borderLeft: isFav ? "3px solid #f0b429" : "1px solid #1a1a1a",
      padding:"12px 14px", height:"100%",
      opacity:fading?0:1, transition:"opacity 0.18s",
    }}>
      <div style={{display:"flex", alignItems:"center", gap:8, marginBottom:10}}>
        <span style={{fontSize:13}}>⚡</span>
        <span style={{fontFamily:"'Georgia',serif", fontSize:8, fontWeight:900,
          letterSpacing:"0.22em", color:"#c8201c", textTransform:"uppercase"}}>
          NY Legends Corner
        </span>
        <button onClick={() => goTo((idx+1) % DAILY_PLAYERS.length)}
          style={{marginLeft:"auto", fontSize:9, fontWeight:700, letterSpacing:"0.08em",
            padding:"2px 8px", background:"transparent", border:"1px solid #2a2a2a",
            color:"#555", cursor:"pointer", fontFamily:"'Georgia',serif"}}
          onMouseEnter={e=>{e.currentTarget.style.color="#e8e0d0";}}
          onMouseLeave={e=>{e.currentTarget.style.color="#555";}}>
          ↻ NEXT
        </button>
      </div>
      <div style={{display:"flex", gap:10, alignItems:"flex-start", marginBottom:8}}>
        <div style={{width:44, height:44, flexShrink:0, background:"#161616",
          border:"1px solid #2a2a2a", display:"flex", alignItems:"center",
          justifyContent:"center", fontSize:24}}>{legend.emoji}</div>
        <div style={{flex:1, minWidth:0}}>
          <div style={{fontFamily:"'Georgia',serif", fontSize:15, fontWeight:900,
            color:"#e8e0d0", lineHeight:1.1, marginBottom:2}}>
            {legend.name}{isFav && <span style={{color:"#f0b429", fontSize:11, marginLeft:5}}>⭐</span>}
          </div>
          <div style={{fontFamily:"'Georgia',serif", fontSize:8, fontWeight:700,
            letterSpacing:"0.12em", color:"#c8201c", textTransform:"uppercase",
            marginBottom:5}}>{legend.team} · {legend.pos} · {legend.era}</div>
          <div style={{fontSize:11, color:"#999", lineHeight:1.5,
            display:"-webkit-box", WebkitLineClamp:3, WebkitBoxOrient:"vertical",
            overflow:"hidden"}}>{legend.fact}</div>
        </div>
      </div>
      <div style={{fontFamily:"'Georgia',serif", fontSize:10, fontWeight:600,
        color:"#f0b429", paddingTop:8, borderTop:"1px solid #1a1a1a",
        marginBottom:8}}>{legend.stats}</div>
      <div style={{display:"flex", justifyContent:"space-between", alignItems:"center"}}>
        <div style={{display:"flex", gap:4}}>
          {DAILY_PLAYERS.slice(dotStart, dotStart+8).map((_, i) => (
            <div key={i} onClick={() => goTo(dotStart+i)}
              style={{width:5, height:5, borderRadius:"50%", cursor:"pointer",
                background:(dotStart+i)===idx?"#c8201c":"#2a2a2a"}} />
          ))}
        </div>
        <div style={{display:"flex", gap:8, alignItems:"center"}}>
          <span style={{fontSize:9, color:"#444", fontFamily:"'Georgia',serif"}}>
            {idx+1}/{DAILY_PLAYERS.length}
          </span>
          <a href={legend.wiki} target="_blank" rel="noopener"
            style={{fontSize:9, fontWeight:700, letterSpacing:"0.1em",
              padding:"2px 8px", border:"1px solid #2a2a2a", color:"#555",
              textDecoration:"none", fontFamily:"'Georgia',serif"}}
            onMouseEnter={e=>{e.currentTarget.style.color="#f0b429";e.currentTarget.style.borderColor="#f0b429";}}
            onMouseLeave={e=>{e.currentTarget.style.color="#555";e.currentTarget.style.borderColor="#2a2a2a";}}>
            📖 WIKI
          </a>
        </div>
      </div>
    </div>
  );
}

// ─── ENHANCED ON THIS DATE ────────────────────────────────────────────────
function EnhancedOTD() {
  const [showAll, setShowAll]     = useState(false);
  const [spotlight, setSpotlight] = useState(null);
  const now   = new Date();
  const month = now.getMonth() + 1;
  const day   = now.getDate();
  const MONTH_NAMES = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const todayEvents = (typeof TODAY_IN_NY_SPORTS !== "undefined" ? TODAY_IN_NY_SPORTS : [])
    .filter(e => e.month === month && e.day === day)
    .sort((a,b) => b.year - a.year);
  const shown = showAll ? todayEvents : todayEvents.slice(0,3);
  const TEAM_COLORS = {
    Yankees:"#003087",Mets:"#002D72",Jets:"#125740",Giants:"#0B2265",
    Knicks:"#006BB6",Rangers:"#0038A8",Islanders:"#00539B",Devils:"#CE1126",
  };
  function randomDeepDive() {
    if (!todayEvents.length) return;
    setSpotlight(todayEvents[Math.floor(Math.random()*todayEvents.length)]);
  }
  return (
    <div style={{background:"#111", border:"1px solid #1a1a1a", borderLeft:"3px solid #f0b429"}}>
      <div style={{display:"flex", alignItems:"center", gap:10, padding:"8px 12px",
        borderBottom:"1px solid #1a1a1a", background:"rgba(240,180,41,0.04)"}}>
        <div style={{background:"#f0b429", color:"#000", padding:"3px 8px",
          textAlign:"center", flexShrink:0, minWidth:44}}>
          <span style={{fontFamily:"'Georgia',serif", fontSize:8, fontWeight:900,
            letterSpacing:"0.1em", textTransform:"uppercase", display:"block"}}>
            {MONTH_NAMES[month-1]}
          </span>
          <span style={{fontFamily:"'Georgia',serif", fontSize:20, fontWeight:900,
            lineHeight:1, display:"block"}}>{day}</span>
        </div>
        <div style={{flex:1}}>
          <div style={{fontFamily:"'Georgia',serif", fontSize:8, fontWeight:900,
            letterSpacing:"0.22em", color:"#f0b429", textTransform:"uppercase",
            marginBottom:1}}>On This Date in NY Sports</div>
          <div style={{fontSize:10, color:"#666"}}>
            {todayEvents.length > 0
              ? `${todayEvents.length} moment${todayEvents.length!==1?"s":""}`
              : "No moments recorded today"}
          </div>
        </div>
        <button onClick={randomDeepDive}
          style={{background:"#f0b429", border:"none", color:"#000",
            padding:"5px 12px", cursor:"pointer", fontSize:10, fontWeight:900,
            letterSpacing:"0.08em", fontFamily:"'Georgia',serif",
            boxShadow:"0 2px 0 #8a6200", flexShrink:0}}>
          🎲 Random
        </button>
      </div>
      {shown.length > 0 ? shown.map((e,i) => (
        <div key={i} onClick={() => setSpotlight(e)}
          style={{display:"flex", gap:10, alignItems:"flex-start",
            padding:"9px 12px", borderBottom:"1px solid #1a1a1a",
            borderLeft: i===0 ? `3px solid ${TEAM_COLORS[e.team]||"#c8201c"}` : "none",
            background: i===0 ? "rgba(240,180,41,0.03)" : "transparent",
            cursor:"pointer", transition:"background 0.1s"}}
          onMouseEnter={ev=>ev.currentTarget.style.background="rgba(240,180,41,0.05)"}
          onMouseLeave={ev=>ev.currentTarget.style.background=i===0?"rgba(240,180,41,0.03)":"transparent"}>
          <div style={{fontFamily:"'Georgia',serif", fontSize:18, fontWeight:900,
            color:"#f0b429", lineHeight:1, minWidth:36, flexShrink:0}}>{e.year}</div>
          <div style={{flex:1, minWidth:0}}>
            <div style={{fontFamily:"'Georgia',serif", fontSize:8, fontWeight:800,
              letterSpacing:"0.15em", color:"#c8201c", textTransform:"uppercase",
              marginBottom:1}}>{e.team}</div>
            <div style={{fontSize:12, fontWeight:600, color:"#e8e0d0",
              lineHeight:1.3, marginBottom:2}}>{e.headline}</div>
            <div style={{fontSize:10, color:"#888", lineHeight:1.4,
              overflow:"hidden", display:"-webkit-box",
              WebkitLineClamp:2, WebkitBoxOrient:"vertical"}}>{e.desc}</div>
          </div>
          {i===0 && <span style={{fontSize:16, flexShrink:0, opacity:0.7}}>⭐</span>}
        </div>
      )) : (
        <div style={{padding:"16px 12px", textAlign:"center", fontSize:11, color:"#555",
          fontStyle:"italic"}}>No NY sports moments recorded for today.</div>
      )}
      {todayEvents.length > 3 && (
        <button onClick={() => setShowAll(s=>!s)}
          style={{width:"100%", padding:"7px", background:"transparent",
            border:"none", borderTop:"1px solid #1a1a1a",
            fontFamily:"'Georgia',serif", fontSize:9, fontWeight:700,
            letterSpacing:"0.12em", textTransform:"uppercase",
            color:"#555", cursor:"pointer"}}
          onMouseEnter={e=>{e.currentTarget.style.background="#161616";e.currentTarget.style.color="#e8e0d0";}}
          onMouseLeave={e=>{e.currentTarget.style.background="transparent";e.currentTarget.style.color="#555";}}>
          {showAll ? "▲ SHOW LESS" : `▼ SHOW ALL ${todayEvents.length} MOMENTS`}
        </button>
      )}
      {spotlight && (
        <div onClick={() => setSpotlight(null)}
          style={{position:"fixed", inset:0, background:"rgba(0,0,0,0.85)",
            zIndex:1000, display:"flex", alignItems:"center", justifyContent:"center", padding:20}}>
          <div onClick={e=>e.stopPropagation()}
            style={{background:"#111", border:"1px solid #2a2a2a",
              maxWidth:480, width:"100%", padding:"20px 22px", position:"relative"}}>
            <button onClick={() => setSpotlight(null)}
              style={{position:"absolute", top:8, right:8, background:"transparent",
                border:"none", color:"#555", cursor:"pointer", fontSize:16}}>✕</button>
            <div style={{fontFamily:"'Georgia',serif", fontSize:48, fontWeight:900,
              color:"#f0b429", lineHeight:1, marginBottom:4}}>{spotlight.year}</div>
            <div style={{fontFamily:"'Georgia',serif", fontSize:8, fontWeight:800,
              letterSpacing:"0.2em", color:"#c8201c", textTransform:"uppercase",
              marginBottom:8}}>{spotlight.team}</div>
            <div style={{fontSize:15, fontWeight:700, color:"#e8e0d0", lineHeight:1.4,
              marginBottom:8, fontFamily:"'Georgia',serif"}}>{spotlight.headline}</div>
            <p style={{fontSize:12, color:"#aaa", lineHeight:1.6, marginBottom:12}}>{spotlight.desc}</p>
            <a href={`https://www.google.com/search?q=${encodeURIComponent(spotlight.year+" "+spotlight.team+" "+spotlight.headline)}`}
              target="_blank" rel="noopener"
              style={{fontSize:10, fontWeight:700, letterSpacing:"0.1em", padding:"4px 12px",
                border:"1px solid #2a2a2a", color:"#888", textDecoration:"none"}}>
              🔍 GOOGLE THIS MOMENT
            </a>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── NY PLAYOFF WIDGET ────────────────────────────────────────────────────
// Live ESPN fetch. Computes WC GB mathematically to avoid ESPN field name
// inconsistencies. NY teams pinned to top. My Teams starred.
function NYPlayoffWidget({ myTeams }) {
  const [data, setData]           = useState({});
  const [sport, setSport]         = useState("mlb");
  const [lastUpdated, setLastUpdated] = useState(null);
  const [loading, setLoading]     = useState(true);

  const MY_TEAM_NAMES = myTeams ? [...myTeams].map(t => t.toLowerCase()) : [];

  const SPORTS = [
    { key:"mlb", label:"⚾ MLB", espnSport:"baseball",   league:"mlb", poSlots:6, wcSlots:3 },
    { key:"nba", label:"🏀 NBA", espnSport:"basketball", league:"nba", poSlots:8, wcSlots:0 },
    { key:"nhl", label:"🏒 NHL", espnSport:"hockey",     league:"nhl", poSlots:8, wcSlots:2 },
    { key:"nfl", label:"🏈 NFL", espnSport:"football",   league:"nfl", poSlots:7, wcSlots:0 },
  ];

  const NY_NAMES = {
    mlb:["Yankees","Mets"], nba:["Knicks","Nets"],
    nhl:["Rangers","Islanders","Devils"], nfl:["Giants","Jets"],
  };

  function isNY(name, key) {
    return (NY_NAMES[key]||[]).some(t => name.toLowerCase().includes(t.toLowerCase()));
  }
  function isMyTeam(name) {
    return MY_TEAM_NAMES.some(t =>
      name.toLowerCase().includes(t) || t.includes(name.toLowerCase().split(" ").pop().toLowerCase())
    );
  }

  async function fetchSport(cfg) {
    try {
      // Try level=3 first, fall back to level=2 if 400
      let r = await fetch(
        `https://site.api.espn.com/apis/v2/sports/${cfg.espnSport}/${cfg.league}/standings?level=3`,
        { cache:"no-store" }
      );
      // If 400, try without level param
      if (!r.ok) {
        r = await fetch(
          `https://site.api.espn.com/apis/v2/sports/${cfg.espnSport}/${cfg.league}/standings`,
          { cache:"no-store" }
        );
      }
      if (!r.ok) return [];
      const json = await r.json();

      const CONF_MAP = {
        "AL East":"AL","AL Central":"AL","AL West":"AL",
        "NL East":"NL","NL Central":"NL","NL West":"NL",
        "Atlantic":"East","Metropolitan":"East","Central":"East","Southeast":"East",
        "Pacific":"West","Northwest":"West","Southwest":"West",
        "AFC East":"AFC","AFC North":"AFC","AFC South":"AFC","AFC West":"AFC",
        "NFC East":"NFC","NFC North":"NFC","NFC South":"NFC","NFC West":"NFC",
      };

      const confResult = {};

      function walkNode(node, parentConf) {
        const nodeName = node.name || node.abbreviation || "";
        const confName = CONF_MAP[nodeName] || parentConf || nodeName || "unknown";
        if (node.standings?.entries?.length) {
          if (!confResult[confName]) confResult[confName] = { divs:{} };
          const divName = nodeName || confName;
          if (!confResult[confName].divs[divName]) confResult[confName].divs[divName] = [];
          node.standings.entries.forEach(e => {
            const name = e.team?.displayName || e.team?.name || "";
            const s = {};
            (e.stats||[]).forEach(st => { s[st.name] = st.displayValue ?? String(st.value??""); });
            const w   = parseFloat(s.wins || s.W || 0);
            const l   = parseFloat(s.losses || s.L || 0);
            const id  = String(e.team?.id || name);
            if (!confResult[confName].divs[divName].find(x => x.id === id)) {
              confResult[confName].divs[divName].push({
                id, name, w, l,
                pts: parseFloat(s.points || 0),
                pct: (w+l)>0 ? w/(w+l) : 0,
                isNY: isNY(name, cfg.key),
                isMy: isMyTeam(name),
              });
            }
          });
        }
        (node.children||[]).forEach(child => walkNode(child, confName));
      }

      (json.children||[]).forEach(node => walkNode(node, ""));

      const { divWinners, wcSpots } = cfg;
      const finalTeams = [];

      Object.values(confResult).forEach(conf => {
        const divNames = Object.keys(conf.divs);
        if (!divNames.length) return;

        const divLeaderIds = new Set();
        divNames.forEach(dn => {
          const sorted = [...conf.divs[dn]].sort((a,b) => b.pct - a.pct);
          if (sorted[0]) divLeaderIds.add(sorted[0].id);
        });

        const seen = new Set();
        const all = divNames.flatMap(dn => conf.divs[dn])
          .filter(t => { if(seen.has(t.id)) return false; seen.add(t.id); return true; });
        const allSorted = [...all].sort((a,b) => b.pct - a.pct);

        const divLeaders = allSorted.filter(t =>  divLeaderIds.has(t.id));
        const nonLeaders = allSorted.filter(t => !divLeaderIds.has(t.id));
        const lastWcTeam = nonLeaders[wcSpots - 1];

        divLeaders.forEach((t, i) => {
          finalTeams.push({ ...t, inPO:true, wcGb:null, seed:i+1 });
        });
        nonLeaders.forEach((t, i) => {
          const inPO = i < wcSpots;
          let wcGb = null;
          if (!inPO && lastWcTeam && (t.w+t.l)>0 && (lastWcTeam.w+lastWcTeam.l)>0) {
            const gb = ((lastWcTeam.w - t.w) + (t.l - lastWcTeam.l)) / 2;
            wcGb = Math.max(0, Math.round(gb * 2) / 2);
          }
          finalTeams.push({ ...t, inPO, wcGb, seed: divWinners + i + 1 });
        });
      });

      // If conference walk gave no results, fall back to flat seed-based approach
      if (finalTeams.length === 0) {
        console.log("[PO WIDGET] Conference walk empty, using flat fallback");
        const allEntries = [];
        function walkFlat(node) {
          (node?.standings?.entries||[]).forEach(e => allEntries.push(e));
          (node.children||[]).forEach(walkFlat);
        }
        walkFlat(json);
        const seen2 = new Set();
        const flatTeams = allEntries
          .map(e => {
            const name = e.team?.displayName || e.team?.name || "";
            const s = {};
            (e.stats||[]).forEach(st => { s[st.name] = st.displayValue ?? String(st.value??""); });
            const w = parseFloat(s.wins||s.W||0);
            const l = parseFloat(s.losses||s.L||0);
            const seed = parseInt(s.playoffSeed||99);
            return { id:String(e.team?.id||name), name, w, l, seed,
              pct:(w+l)>0?w/(w+l):0, pts:parseFloat(s.points||0),
              isNY:isNY(name,cfg.key), isMy:isMyTeam(name) };
          })
          .filter(t => { if(!t.name||seen2.has(t.id)) return false; seen2.add(t.id); return true; })
          .sort((a,b) => a.seed-b.seed || b.pct-a.pct);
        // Split at midpoint for two conferences
        const half = Math.ceil(flatTeams.length/2);
        [flatTeams.slice(0,half), flatTeams.slice(half)].forEach(conf => {
          const lastIn = conf[divWinners+wcSpots-1];
          conf.forEach((t,i) => {
            const inPO = i < divWinners+wcSpots;
            let wcGb = null;
            if (!inPO && lastIn && (t.w+t.l)>0 && (lastIn.w+lastIn.l)>0) {
              const gb = ((lastIn.w-t.w)+(t.l-lastIn.l))/2;
              wcGb = Math.max(0, Math.round(gb*2)/2);
            }
            finalTeams.push({...t, inPO, wcGb, seed:i+1});
          });
        });
      }

      return finalTeams;
    } catch(e) { console.error("fetchSport:", e); return []; }
  }
  async function fetchAll() {
    setLoading(true);
    const results = {};
    await Promise.all(SPORTS.map(async cfg => {
      results[cfg.key] = await fetchSport(cfg);
    }));
    setData(results);
    setLastUpdated(new Date());
    setLoading(false);
  }

  useEffect(() => {
    fetchAll();
    const t = setInterval(fetchAll, 300000);
    return () => clearInterval(t);
  }, []);

  const cfg     = SPORTS.find(s => s.key === sport);
  const teams   = data[sport] || [];
  const nyTeams = teams.filter(t => t.isNY).sort((a,b) => (a.seed||99)-(b.seed||99));
  const topRest = teams.filter(t => !t.isNY).sort((a,b) => (a.seed||99)-(b.seed||99)).slice(0,6);

  function RecRow({ t, showSeed }) {
    const rec = sport==="nhl" && t.pts > 0
      ? `${t.w}W · ${t.pts}pts`
      : `${t.w}–${t.l}`;
    const gbDisplay = t.inPO
      ? "✓ IN"
      : t.wcGb !== null && t.wcGb > 0
        ? `${Number.isInteger(t.wcGb) ? t.wcGb : t.wcGb.toFixed(1)} out`
        : "—";
    const gbColor = t.inPO ? "#22c55e" : "#c8201c";

    return (
      <div style={{display:"flex", alignItems:"center", gap:7, padding:"5px 8px",
        background:t.isMy?"rgba(240,180,41,0.06)":"transparent",
        borderLeft:t.isMy?"2px solid #f0b429":"2px solid transparent"}}>
        {showSeed && (
          <span style={{fontFamily:"'Georgia',serif", fontSize:10, fontWeight:900,
            color:"#444", minWidth:14, textAlign:"center"}}>
            {t.seed < 99 ? t.seed : "—"}
          </span>
        )}
        {t.isMy && <span style={{fontSize:9, color:"#f0b429", flexShrink:0}}>★</span>}
        <span style={{fontFamily:"'Georgia',serif", fontSize:12,
          fontWeight:t.isNY?900:700,
          color:t.inPO?"#22c55e":t.isNY?"#e8e0d0":"#888",
          flex:1, letterSpacing:"0.03em"}}>
          {t.name.split(" ").slice(-1)[0]}
        </span>
        <span style={{fontFamily:"'Georgia',serif", fontSize:10, color:"#555",
          minWidth:46, textAlign:"right"}}>{rec}</span>
        <span style={{fontFamily:"'Georgia',serif", fontSize:10, fontWeight:700,
          minWidth:50, textAlign:"right", color:gbColor}}>
          {gbDisplay}
        </span>
      </div>
    );
  }

  return (
    <div style={{background:"#111", border:"1px solid #1a1a1a",
      borderTop:"2px solid #c8201c", marginBottom:8}}>
      {/* Header */}
      <div style={{display:"flex", alignItems:"center", gap:8, padding:"7px 12px",
        borderBottom:"1px solid #1a1a1a"}}>
        <div style={{width:6, height:6, borderRadius:"50%", background:"#22c55e",
          animation:"pulse 2s infinite", flexShrink:0}} />
        <span style={{fontFamily:"'Georgia',serif", fontSize:8, fontWeight:900,
          letterSpacing:"0.22em", color:"#c8201c", textTransform:"uppercase"}}>
          🗽 NY Playoff Picture
        </span>
        <span style={{marginLeft:"auto", fontSize:9, color:"#444"}}>
          {lastUpdated
            ? `Updated ${lastUpdated.toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"})}`
            : loading ? "Loading live data…" : ""}
        </span>
        <button onClick={fetchAll}
          style={{fontSize:9, color:"#444", background:"transparent",
            border:"1px solid #2a2a2a", padding:"2px 6px", cursor:"pointer",
            fontFamily:"'Georgia',serif", fontWeight:700}}>↺</button>
      </div>

      {/* Sport tabs */}
      <div style={{display:"flex", borderBottom:"1px solid #1a1a1a", background:"#0e0e0e"}}>
        {SPORTS.map(s => (
          <button key={s.key} onClick={() => setSport(s.key)}
            style={{fontFamily:"'Georgia',serif", fontSize:10, fontWeight:700,
              letterSpacing:"0.06em", padding:"5px 13px",
              background:"transparent", border:"none", cursor:"pointer",
              color:sport===s.key?"#e8e0d0":"#555",
              borderBottom:sport===s.key?"2px solid #c8201c":"2px solid transparent",
              transition:"all 0.15s"}}>
            {s.label}
          </button>
        ))}
      </div>

      {/* Body */}
      <div style={{padding:"6px 4px"}}>
        {loading && !teams.length ? (
          <div style={{padding:"14px", textAlign:"center", fontSize:10,
            color:"#555", letterSpacing:"0.1em"}}>LOADING LIVE DATA…</div>
        ) : (
          <>
            {nyTeams.length > 0 && (
              <>
                <div style={{fontFamily:"'Georgia',serif", fontSize:8, fontWeight:900,
                  letterSpacing:"0.2em", color:"#444", textTransform:"uppercase",
                  padding:"5px 8px 3px", borderBottom:"1px solid #1a1a1a", marginBottom:2}}>
                  🗽 NY TEAMS
                </div>
                {nyTeams.map((t,i) => <RecRow key={i} t={t} showSeed={false} />)}
              </>
            )}
            {topRest.length > 0 && (
              <>
                <div style={{fontFamily:"'Georgia',serif", fontSize:8, fontWeight:900,
                  letterSpacing:"0.2em", color:"#333", textTransform:"uppercase",
                  padding:"6px 8px 3px", borderTop:"1px solid #1a1a1a",
                  borderBottom:"1px solid #1a1a1a", marginTop:3, marginBottom:2}}>
                  PLAYOFF PICTURE — TOP {topRest.length}
                </div>
                {topRest.map((t,i) => <RecRow key={i} t={t} showSeed={true} />)}
              </>
            )}
            {!nyTeams.length && !topRest.length && (
              <div style={{padding:"12px", textAlign:"center", fontSize:10,
                color:"#555", fontStyle:"italic"}}>No standings data available.</div>
            )}
          </>
        )}
      </div>

      {/* Legend */}
      <div style={{display:"flex", gap:12, padding:"5px 12px",
        borderTop:"1px solid #1a1a1a", background:"#0e0e0e", flexWrap:"wrap"}}>
        {[{color:"#22c55e",label:"In"},{color:"#c8201c",label:"Out"},{color:"#f0b429",label:"My Teams ★"}]
          .map(({color,label}) => (
            <div key={label} style={{display:"flex", alignItems:"center", gap:4}}>
              <div style={{width:5, height:5, borderRadius:"50%", background:color}} />
              <span style={{fontSize:9, color:"#555"}}>{label}</span>
            </div>
          ))}
      </div>
    </div>
  );
}


// ─── MORNING DIGEST SIGNUP ────────────────────────────────────────────────
function DigestSignup() {
  const NY_TEAMS_LIST = [
    "Yankees","Mets","Knicks","Nets","Rangers","Islanders",
    "Devils","Giants","Jets","Liberty","NYCFC","Red Bulls",
  ];

  const [name, setName]         = useState("");
  const [email, setEmail]       = useState("");
  const [teams, setTeams]       = useState([]);
  const [status, setStatus]     = useState("idle"); // idle | loading | success | error
  const [message, setMessage]   = useState("");
  const [expanded, setExpanded] = useState(false);

  function toggleTeam(team) {
    setTeams(prev =>
      prev.includes(team) ? prev.filter(t => t !== team) : [...prev, team]
    );
  }

  async function handleSubmit() {
    if (!email || !email.includes("@")) {
      setMessage("Please enter a valid email address.");
      setStatus("error");
      return;
    }
    setStatus("loading");
    try {
      const r = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, teams }),
      });
      const json = await r.json();
      if (r.ok) {
        setStatus("success");
        setMessage("You're in! Check your email for a welcome message. 🗽");
      } else {
        setStatus("error");
        setMessage(json.error || "Something went wrong. Try again.");
      }
    } catch(e) {
      setStatus("error");
      setMessage("Could not connect. Please try again.");
    }
  }

  if (status === "success") {
    return (
      <div style={{background:"#0d2a1a", borderTop:"2px solid #22c55e",
        borderBottom:"1px solid #1a3a1a", padding:"20px 24px", textAlign:"center"}}>
        <div style={{fontSize:24, marginBottom:8}}>🗽</div>
        <div style={{fontFamily:"'Georgia',serif", fontSize:16, fontWeight:900,
          color:"#22c55e", marginBottom:6}}>{message}</div>
        <div style={{fontSize:12, color:"#aaa"}}>
          Your first digest arrives tomorrow at 7am ET.
        </div>
      </div>
    );
  }

  return (
    <div style={{background:"#0e0e0e", borderTop:"2px solid #c8201c",
      borderBottom:"1px solid #1a1a1a", padding:"20px 24px"}}>

      {/* Header row — always visible */}
      <div style={{display:"flex", alignItems:"center", justifyContent:"space-between",
        flexWrap:"wrap", gap:10, marginBottom: expanded ? 16 : 0}}>
        <div>
          <div style={{fontFamily:"'Georgia',serif", fontSize:13, fontWeight:900,
            color:"#e8e0d0", marginBottom:2}}>
            🗽 Get the NY Sports Daily Morning Digest
          </div>
          <div style={{fontSize:11, color:"#666"}}>
            Last night's scores · Top headlines · Glory moment · 7am ET · Free always
          </div>
        </div>
        <button onClick={() => setExpanded(e => !e)}
          style={{fontFamily:"'Georgia',serif", fontSize:10, fontWeight:900,
            letterSpacing:"0.1em", padding:"7px 18px",
            background: expanded ? "transparent" : "#c8201c",
            border: `1px solid ${expanded ? "#444" : "#c8201c"}`,
            color: expanded ? "#666" : "#fff",
            cursor:"pointer", transition:"all 0.15s", flexShrink:0}}>
          {expanded ? "CANCEL" : "SUBSCRIBE FREE →"}
        </button>
      </div>

      {/* Expanded form */}
      {expanded && (
        <div>
          {/* Name + Email */}
          <div style={{display:"flex", gap:8, marginBottom:12, flexWrap:"wrap"}}>
            <input
              type="text"
              placeholder="First name (optional)"
              value={name}
              onChange={e => setName(e.target.value)}
              style={{flex:"1 1 160px", padding:"8px 12px",
                background:"#111", border:"1px solid #2a2a2a",
                color:"#e8e0d0", fontSize:12, fontFamily:"'Georgia',serif",
                outline:"none"}}
            />
            <input
              type="email"
              placeholder="your@email.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleSubmit()}
              style={{flex:"2 1 200px", padding:"8px 12px",
                background:"#111", border:"1px solid #2a2a2a",
                color:"#e8e0d0", fontSize:12, fontFamily:"'Georgia',serif",
                outline:"none"}}
            />
          </div>

          {/* Team picker */}
          <div style={{marginBottom:14}}>
            <div style={{fontSize:9, fontWeight:900, color:"#555",
              letterSpacing:"0.18em", textTransform:"uppercase",
              marginBottom:8}}>
              Pick your teams (optional — leave blank for all NY):
            </div>
            <div style={{display:"flex", flexWrap:"wrap", gap:6}}>
              {NY_TEAMS_LIST.map(team => {
                const on = teams.includes(team);
                return (
                  <button key={team} onClick={() => toggleTeam(team)}
                    style={{fontFamily:"'Georgia',serif", fontSize:10,
                      fontWeight:700, letterSpacing:"0.06em",
                      padding:"4px 10px",
                      background: on ? "#c8201c" : "transparent",
                      border: `1px solid ${on ? "#c8201c" : "#2a2a2a"}`,
                      color: on ? "#fff" : "#666",
                      cursor:"pointer", transition:"all 0.12s"}}>
                    {team}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Error message */}
          {status === "error" && (
            <div style={{fontSize:11, color:"#f87171", marginBottom:10}}>{message}</div>
          )}

          {/* Submit */}
          <div style={{display:"flex", alignItems:"center", gap:12, flexWrap:"wrap"}}>
            <button onClick={handleSubmit} disabled={status === "loading"}
              style={{fontFamily:"'Georgia',serif", fontSize:11, fontWeight:900,
                letterSpacing:"0.1em", padding:"9px 24px",
                background: status === "loading" ? "#555" : "#c8201c",
                border:"none", color:"#fff", cursor:"pointer",
                transition:"all 0.15s", boxShadow:"0 2px 0 #8a0000"}}>
              {status === "loading" ? "SUBSCRIBING…" : "GET MY DIGEST →"}
            </button>
            <span style={{fontSize:10, color:"#444"}}>
              No ads. No spam. Unsubscribe anytime.
            </span>
          </div>
        </div>
      )}
    </div>
  );
}


const styles = {
  root: {
    background: "#0a0a0a",
    minHeight: "100vh",
    fontFamily: "'Georgia', 'Times New Roman', serif",
    color: "#f0ece4",
    position: "relative",
    overflow: "hidden",
  },
  noise: {
    position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0,
    backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.04'/%3E%3C/svg%3E")`,
    opacity: 0.4,
  },

  // MASTHEAD
  masthead: {
    background: "#0e0e0e",
    borderBottom: "4px double #c8201c",
    padding: "16px 20px 0",
    position: "sticky", top: 0, zIndex: 500,
  },
  mastheadTop: {
    display: "flex", justifyContent: "space-between", alignItems: "center",
    marginBottom: 8,
    fontSize: 9, letterSpacing: "0.15em",
    color: "#888", fontFamily: "'Georgia', serif",
  },

  // MASTHEAD
  masthead: {
    background: "#0e0e0e",
    borderBottom: "4px double #c8201c",
    padding: "16px 20px 0",
    position: "sticky", top: 0, zIndex: 500,
  },
  mastheadTop: {
    display: "flex", justifyContent: "space-between", alignItems: "center",
    marginBottom: 8, fontSize: 9, letterSpacing: "0.15em",
    color: "#888", fontFamily: "'Georgia', serif",
  },
  mastheadKicker: {},
  mastheadMain: {
    display: "flex", alignItems: "center", gap: 12, justifyContent: "center",
    padding: "8px 0",
  },
  mastheadLines: { flex: 1, display: "flex", flexDirection: "column", gap: 4 },
  mastheadLineBar: { height: 2, background: "#c8201c" },
  mastheadRule: { height: 1, background: "#222", position: "relative", zIndex: 1 },
  mastheadTitle: {
    textAlign: "center", margin: 0, lineHeight: 0.9,
    fontSize: "clamp(32px, 8vw, 72px)",
    fontFamily: "'Georgia', 'Times New Roman', serif",
    fontWeight: 900, letterSpacing: "-0.02em",
    color: "#e8e0d0", textTransform: "uppercase",
    textShadow: "3px 3px 0 #c8201c",
  },
  mastheadTitleRed: { color: "#c8201c" },
  mastheadTitleThin: { fontWeight: 300, color: "#aaa" },
  mastheadBottom: {
    display: "flex", justifyContent: "center", alignItems: "center",
    gap: 12, padding: "8px 0", borderTop: "1px solid #333",
    fontSize: 10, letterSpacing: "0.1em",
  },
  mastheadTag: { color: "#e8e0d0" },
  mastheadSep: { color: "#c8201c", fontSize: 8 },

  // PENNANT STRIPE
  pennantStripe: {
    display: "flex", height: 3, position: "relative", zIndex: 1,
  },
  pennantSegment: { flex: 1 },

  // SITE SEARCH
  searchBar: {
    position: "relative", padding: "6px 16px 10px",
    borderTop: "1px solid #1a1a1a",
  },
  searchInput: {
    width: "100%", background: "#111",
    border: "1px solid #2a2a2a", color: "#bbb",
    padding: "7px 34px 7px 12px", fontSize: 11,
    fontFamily: "'Georgia', serif",
    outline: "none", boxSizing: "border-box",
    letterSpacing: "0.03em",
  },
  searchClear: {
    position: "absolute", right: 22, top: "50%", transform: "translateY(-50%)",
    background: "none", border: "none", color: "#666",
    cursor: "pointer", fontSize: 12, padding: "4px",
  },
  searchDropdown: {
    position: "relative", left: "auto", right: "auto", zIndex: 1001,
    background: "#0e0e0e", border: "1px solid #c8201c",
    borderTop: "none", maxHeight: 380, overflowY: "auto",
    boxShadow: "0 8px 24px rgba(0,0,0,0.9)",
  },
  searchResult: {
    display: "flex", gap: 10, width: "100%", padding: "10px 14px",
    background: "transparent", border: "none", cursor: "pointer",
    textAlign: "left", borderBottom: "1px solid #1a1a1a",
    transition: "background 0.1s",
  },
  searchResultIcon: { fontSize: 18, flexShrink: 0, paddingTop: 2 },
  searchResultBody: { flex: 1, display: "flex", flexDirection: "column", gap: 2 },
  searchResultTop: { display: "flex", justifyContent: "space-between", alignItems: "center" },
  searchResultType: { fontSize: 8, fontWeight: 900, letterSpacing: "0.12em" },
  searchResultTab: { fontSize: 8, color: "#555", letterSpacing: "0.08em" },
  searchResultTitle: { fontSize: 12, fontWeight: 900, color: "#e8e0d0", fontFamily: "'Georgia', serif" },
  searchResultSub: { fontSize: 10, color: "#888" },
  searchResultHighlight: { fontSize: 10, color: "#666", fontStyle: "italic" },
  searchNoResult: { padding: "14px 16px", fontSize: 11, color: "#555", fontStyle: "italic" },
  searchFooter: { padding: "6px 14px", fontSize: 9, color: "#444", letterSpacing: "0.08em", borderTop: "1px solid #1a1a1a" },


  // BUY ME A COFFEE
  bmcBtn: {
    display: "inline-block", marginTop: 14,
    background: "transparent",
    border: "1px solid #555",
    color: "#ccc", fontSize: 11,
    fontWeight: 700, letterSpacing: "0.1em",
    padding: "8px 20px",
    fontFamily: "'Georgia', serif", textDecoration: "none",
    transition: "all 0.15s",
  },
  bmcSub: {
    margin: "8px 0 0", fontSize: 9, color: "#444", letterSpacing: "0.06em",
  },

  // SCORES + NEWS LAYOUT
  scoresNewsLayout: {
    display: "flex", gap: 20, alignItems: "flex-start", flexWrap: "wrap",
  },
  scoresCol: { flex: "1 1 55%", minWidth: 260 },
  newsSidebar: {
    flex: "1 1 240px", minWidth: 220,
    borderLeft: "2px solid #1e1e1e", paddingLeft: 16,
  },
  newsSidebarHeader: {
    fontSize: 9, fontWeight: 900, letterSpacing: "0.2em", color: "#c8201c",
    borderBottom: "1px solid #222", paddingBottom: 8, marginBottom: 10,
  },
  newsSidebarLoading: { fontSize: 10, color: "#444", margin: 0 },
  newsSidebarItem: {
    display: "block", textDecoration: "none", color: "inherit",
    borderBottom: "1px solid #1a1a1a", paddingBottom: 10, marginBottom: 10,
  },
  newsSidebarSource: {
    fontSize: 8, color: "#555", letterSpacing: "0.12em", fontWeight: 900,
    textTransform: "uppercase", display: "block", marginBottom: 3,
  },
  newsSidebarTitle: {
    margin: 0, fontSize: 12, fontWeight: 700, lineHeight: 1.4,
    color: "#bbb", fontFamily: "'Georgia', serif",
  },
  newsSidebarMore: {
    background: "transparent", border: "none", color: "#c8201c",
    fontSize: 9, fontWeight: 900, letterSpacing: "0.15em",
    cursor: "pointer", padding: 0, marginTop: 4,
  },

  // DATE STRIP
  dateStrip: {
    display: "flex", overflowX: "auto", gap: 1,
    background: "#1a1a1a", padding: "0",
    borderBottom: "2px solid #c8201c",
    position: "relative", zIndex: 1,
    scrollbarWidth: "none",
  },
  dateBtn: {
    flex: "0 0 auto", padding: "10px 16px",
    background: "transparent", border: "none",
    color: "#888", cursor: "pointer",
    fontSize: 10, letterSpacing: "0.12em",
    fontFamily: "'Georgia', serif", fontWeight: 700,
    transition: "all 0.15s", whiteSpace: "nowrap",
  },
  dateBtnActive: { background: "#c8201c", color: "#fff" },
  dateBtnLabel: {},

  // TICKER
  ticker: {
    background: "#c8201c",
    height: 32, position: "relative", zIndex: 1,
    width: "100%", display: "flex", overflow: "hidden",
  },
  tickerInner: {
    display: "flex", alignItems: "center",
    width: "100%", overflow: "hidden",
  },
  tickerBug: {
    background: "#0e0e0e", color: "#fff",
    padding: "0 12px", height: 32,
    display: "flex", alignItems: "center",
    fontSize: 10, fontWeight: 900, letterSpacing: "0.1em",
    flexShrink: 0, whiteSpace: "nowrap", zIndex: 2,
    minWidth: 50,
  },
  tickerScroll: {
    display: "flex", alignItems: "center",
    animation: "ticker 50s linear infinite",
    whiteSpace: "nowrap", paddingLeft: 16,
  },
  tickerItem: {
    fontSize: 11, fontWeight: 700, letterSpacing: "0.05em",
    color: "#fff", padding: "0 8px",
  },
  tickerSport: { opacity: 0.7, fontSize: 10 },
  tickerStatus: { opacity: 0.8 },
  tickerDot: { color: "#fff", opacity: 0.5 },

  // MAIN
  main: { padding: "0 16px 40px", position: "relative", zIndex: 1, maxWidth: 1200, margin: "0 auto" },

  // TABS
  tabNav: {
    display: "flex", borderBottom: "2px solid #1a1a1a",
    marginBottom: 0, marginTop: 8,
    overflowX: "auto", scrollbarWidth: "none",
    WebkitOverflowScrolling: "touch",
    msOverflowStyle: "none",
  },
  tabBtn: {
    padding: "10px 16px", border: "none", background: "transparent",
    color: "#555", cursor: "pointer", fontSize: 11,
    fontWeight: 900, letterSpacing: "0.1em",
    fontFamily: "'Georgia', serif",
    transition: "color 0.15s, border-color 0.15s",
    whiteSpace: "nowrap", flexShrink: 0,
    borderBottom: "2px solid transparent",
    marginBottom: -2,
  },
  tabBtnActive: {
    color: "#e8e0d0", borderBottom: "2px solid #c8201c",
  },

  // FILTER BAR
  filterBar: {
    display: "flex", justifyContent: "space-between", alignItems: "center",
    flexWrap: "wrap", gap: 6, marginBottom: 16,
    padding: "10px 14px",
    background: "#0e0e0e",
    border: "1px solid #1a1a1a",
    borderTop: "none",
    marginTop: 0,
  },
  filterGroup: { display: "flex", flexWrap: "wrap", gap: 4 },
  filterBtn: {
    padding: "4px 12px", border: "1px solid #222", background: "transparent",
    color: "#666", cursor: "pointer", fontSize: 10, letterSpacing: "0.1em",
    fontFamily: "'Georgia', serif", fontWeight: 700, transition: "all 0.12s",
    borderRadius: 0,
  },
  filterBtnActive: { background: "#c8201c", border: "1px solid #c8201c", color: "#fff" },
  nyToggle: {
    padding: "4px 14px", border: "1px solid #2a2a2a", background: "transparent",
    color: "#666", cursor: "pointer", fontSize: 10, letterSpacing: "0.1em",
    fontFamily: "'Georgia', serif", fontWeight: 700, transition: "all 0.12s",
  },
  nyToggleActive: { background: "#0d2a1a", border: "1px solid #22c55e", color: "#22c55e" },
  myTeamsActive:  { background: "#1a1600", border: "1px solid #f0b429", color: "#f0b429" },

  // SCORES GRID
  scoresGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
    gap: 8,
  },
  scoreCard: {
    background: "#111", border: "1px solid #1f1f1f",
    padding: "12px 14px", position: "relative",
    transition: "border-color 0.15s, box-shadow 0.15s",
  },
  scoreCardNY: {
    border: "1px solid #c8201c22",
    borderLeft: "3px solid #c8201c",
    background: "#130a0a",
    boxShadow: "0 2px 8px rgba(200,32,28,0.08)",
  },
  nyBadge: {
    position: "absolute", top: 0, right: 0,
    background: "#c8201c", color: "#fff",
    fontSize: 8, fontWeight: 900, padding: "2px 5px",
    letterSpacing: "0.1em",
  },
  scoreCardSport: {
    fontSize: 8, letterSpacing: "0.22em", color: "#555",
    fontWeight: 900, marginBottom: 8, textTransform: "uppercase",
  },
  scoreTeams: { display: "flex", flexDirection: "column", gap: 8 },
  teamRow: { display: "flex", alignItems: "center", gap: 8 },
  teamLogo: { width: 24, height: 24, objectFit: "contain" },
  teamName: { flex: 1, fontSize: 12, fontWeight: 700, letterSpacing: "0.02em", color: "#e8e0d0" },
  teamScore: { fontSize: 22, fontWeight: 900, fontFamily: "'Georgia', serif", minWidth: 32, textAlign: "right", color: "#e8e0d0" },
  scoreAt: { fontSize: 10, color: "#888", textAlign: "center", margin: "2px 0" },
  scoreStatus: { marginTop: 10, fontSize: 10, color: "#aaa", letterSpacing: "0.05em" },
  scoreStatusLive: { color: "#4ade80" },
  livePulse: {
    display: "inline-block", marginRight: 4, color: "#4ade80",
    animation: "pulse 1s ease-in-out infinite",
  },
  scoreVenue: { marginTop: 4, fontSize: 9, color: "#888" },

  // NEWS
  newsGrid: { display:"flex", flexDirection:"column" },
  newsFeatured: {
    display: "block", textDecoration: "none", color: "inherit",
    background: "#141414", border: "1px solid #2e2e2e",
    padding: "20px", borderRadius: 3,
    transition: "border-color 0.15s, box-shadow 0.15s",
    cursor: "pointer",
    boxShadow: "0 1px 3px rgba(0,0,0,0.5)",
  },
  newsFeaturedSource: {
    fontSize: 10, letterSpacing: "0.18em", color: "#c8201c",
    fontWeight: 900, marginBottom: 8, textTransform: "uppercase",
  },
  newsFeaturedTitle: {
    margin: "0 0 10px", fontSize: "clamp(16px, 2.5vw, 21px)",
    fontWeight: 900, lineHeight: 1.25, letterSpacing: "-0.01em",
    color: "#ffffff", fontFamily: "'Georgia', serif",
  },
  newsFeaturedDesc: {
    margin: "0 0 12px", fontSize: 13, lineHeight: 1.65, color: "#aaa",
    fontFamily: "'Georgia', serif",
  },
  newsReadMore: {
    fontSize: 10, color: "#c8201c", fontWeight: 900, letterSpacing: "0.12em",
  },
  newsDivider: {
    display: "flex", alignItems: "center", gap: 12,
    margin: "24px 0 16px", borderTop: "2px solid #222", paddingTop: 12,
  },
  newsDividerText: { fontSize: 10, color: "#666", letterSpacing: "0.2em", fontWeight: 900 },
  newsSmall: {
    display: "block", textDecoration: "none", color: "inherit",
    padding: "12px 14px", borderBottom: "1px solid #222",
    transition: "background 0.12s", cursor: "pointer",
  },
  newsSmallAlt: { background: "#0f0f0f" },
  newsSmallMeta: { display: "flex", gap: 8, marginBottom: 5, alignItems: "center", flexWrap: "wrap" },
  newsSmallSource: { fontSize: 9, letterSpacing: "0.12em", color: "#666", fontWeight: 900, textTransform: "uppercase" },
  newsSmallDate: { fontSize: 9, color: "#555", marginLeft: "auto" },
  newsSmallTitle: {
    margin: 0, fontSize: 14, fontWeight: 700, lineHeight: 1.45, color: "#e8e8e8",
    fontFamily: "'Georgia', serif",
  },

  // LOADING / EMPTY
  loading: {
    display: "flex", flexDirection: "column", alignItems: "center",
    justifyContent: "center", padding: "60px 20px", gap: 16,
  },
  loadingDots: { display: "flex", gap: 8 },
  dot: {
    width: 8, height: 8, background: "#c8201c", borderRadius: "50%",
    animation: "bounce 0.8s ease-in-out infinite",
  },
  loadingText: {
    margin: 0, fontSize: 11, letterSpacing: "0.2em", color: "#555", fontWeight: 900,
  },
  empty: {
    display: "flex", flexDirection: "column", alignItems: "center",
    padding: "60px 20px", gap: 12,
  },
  emptyIcon: { fontSize: 32, opacity: 0.4 },
  emptyText: { margin: 0, fontSize: 11, letterSpacing: "0.2em", color: "#555", fontWeight: 900 },

  // FOOTER
  footer: {
    padding: "20px 20px 30px", textAlign: "center", position: "relative", zIndex: 1,
  },
  footerRule: { height: 1, background: "#2a2a2a", marginBottom: 16 },
  footerText: { margin: "0 0 6px", fontSize: 9, color: "#555", letterSpacing: "0.15em" },
  footerSub: { margin: 0, fontSize: 9, color: "#444", letterSpacing: "0.1em" },

  // SPIN WHEEL
  spinRoot: { paddingTop: 8, display: "flex", flexDirection: "column", gap: 20 },
  spinHeader: { textAlign: "center", borderBottom: "2px solid #2a2a2a", paddingBottom: 14 },
  spinTitle: {
    margin: "0 0 6px", fontSize: 18, fontWeight: 900, letterSpacing: "0.15em",
    color: "#e8e0d0", fontFamily: "'Georgia', serif",
  },
  spinSub: { margin: 0, fontSize: 9, color: "#c8201c", letterSpacing: "0.2em", fontWeight: 700 },
  spinLayout: {
    display: "flex", gap: 24, alignItems: "flex-start", flexWrap: "wrap", justifyContent: "center",
  },
  spinWheelCol: {
    display: "flex", flexDirection: "column", alignItems: "center", gap: 14, flexShrink: 0,
  },
  spinPointerWrap: { height: 24, display: "flex", justifyContent: "center", alignItems: "flex-end" },
  spinPointer: {
    fontSize: 22, color: "#c8201c", lineHeight: 1,
    filter: "drop-shadow(0 0 6px #c8201c)",
    animation: "pointerPulse 2s ease-in-out infinite",
  },
  spinCanvas: { display: "block", borderRadius: "50%", cursor: "pointer" },
  spinBtn: {
    background: "#c8201c", border: "none", color: "#fff",
    padding: "12px 36px", cursor: "pointer",
    fontSize: 13, fontWeight: 900, letterSpacing: "0.2em",
    fontFamily: "'Georgia', serif", transition: "all 0.2s",
    boxShadow: "0 4px 0 #8a0000",
  },
  spinBtnDisabled: { background: "#444", boxShadow: "none", cursor: "not-allowed" },
  spinResultCol: {
    flex: 1, minWidth: 260, maxWidth: 420,
    display: "flex", flexDirection: "column",
  },
  spinPrompt: {
    display: "flex", flexDirection: "column", alignItems: "center",
    gap: 12, padding: "40px 20px", textAlign: "center",
    border: "1px dashed #2a2a2a",
  },
  spinPromptIcon: { fontSize: 40 },
  spinPromptText: {
    margin: 0, fontSize: 13, fontWeight: 900, letterSpacing: "0.1em",
    color: "#666", fontFamily: "'Georgia', serif",
  },
  spinPromptSub: { margin: 0, fontSize: 11, color: "#444" },
  spinWaiting: {
    display: "flex", flexDirection: "column", alignItems: "center",
    gap: 12, padding: "60px 20px",
  },
  spinWaitingDots: { display: "flex", gap: 8 },
  spinFactCard: {
    border: "1px solid #2a2a2a", overflow: "hidden",
    animation: "fadeIn 0.4s ease forwards",
  },
  spinTeamBanner: {
    display: "flex", alignItems: "center", gap: 12,
    padding: "14px 18px",
  },
  spinTeamEmoji: { fontSize: 24 },
  spinTeamName: {
    fontSize: 16, fontWeight: 900, letterSpacing: "0.1em",
    color: "#fff", fontFamily: "'Georgia', serif",
  },
  spinFactLoading: {
    display: "flex", flexDirection: "column", alignItems: "center",
    gap: 12, padding: "40px 20px", background: "#161616",
  },
  spinFactBody: { background: "#161616", padding: "18px 20px", display: "flex", flexDirection: "column", gap: 12 },
  spinFactMeta: { display: "flex", alignItems: "center", gap: 10 },
  spinCatBadge: {
    fontSize: 9, fontWeight: 900, letterSpacing: "0.15em",
    color: "#fff", padding: "3px 10px",
  },
  spinEra: { fontSize: 10, color: "#666", letterSpacing: "0.05em" },
  spinTeaser: {
    margin: 0, fontSize: "clamp(15px, 3vw, 20px)",
    fontWeight: 900, lineHeight: 1.3, color: "#e8e0d0",
    fontFamily: "'Georgia', serif", fontStyle: "italic",
    borderLeft: "3px solid #c8201c", paddingLeft: 14,
  },
  spinFactText: {
    margin: 0, fontSize: 14, lineHeight: 1.7, color: "#aaa",
    fontFamily: "'Georgia', serif",
  },
  spinFootnote: {
    textAlign: "center", fontSize: 9, color: "#444", letterSpacing: "0.1em",
    borderTop: "1px solid #1a1a1a", paddingTop: 12,
  },

  // TRADING CARD STYLE PLAYER SPOTLIGHT
  tcardWrap: { cursor:"pointer", userSelect:"none", width:200 },
  tcardOuter: {
    padding:3, borderRadius:6,
    boxShadow:"0 2px 12px rgba(0,0,0,0.5)",
  },
  tcardInner: {
    background:"#0a0a0a", borderRadius:4,
    padding:"10px 12px 12px",
    border:"1px solid rgba(255,255,255,0.08)",
  },
  tcardTopBar: {
    display:"flex", justifyContent:"space-between", alignItems:"center",
    marginBottom:8,
  },
  tcardBadge: {
    fontSize:8, fontWeight:900, color:"#FFD700",
    letterSpacing:"0.15em",
  },
  tcardYear: {
    fontSize:7, color:"#666", letterSpacing:"0.1em", fontWeight:700,
  },
  tcardPhotoFrame: {
    position:"relative", height:110, marginBottom:6,
    borderRadius:3, overflow:"hidden",
    border:"1px solid rgba(255,215,0,0.3)",
    display:"flex", alignItems:"center", justifyContent:"center",
  },
  tcardPhoto: {
    width:"100%", height:"100%", objectFit:"cover", objectPosition:"center top",
  },
  tcardPhotoFallback: {
    width:"100%", height:"100%",
    display:"flex", alignItems:"center", justifyContent:"center",
    background:"rgba(0,0,0,0.3)",
  },
  tcardJerseyNum: {
    position:"absolute", bottom:4, right:6,
    fontSize:32, fontWeight:900, color:"rgba(255,255,255,0.85)",
    fontFamily:"'Georgia',serif",
    textShadow:"2px 2px 4px rgba(0,0,0,0.9)",
    lineHeight:1,
  },
  tcardNamePlate: {
    background:"#0a0a0a", padding:"4px 0 6px",
    borderTop:"1px solid rgba(255,215,0,0.3)",
    borderBottom:"1px solid rgba(255,215,0,0.3)",
  },
  tcardName: {
    fontSize:12, fontWeight:900, color:"#e8e0d0",
    fontFamily:"'Georgia',serif", lineHeight:1.1, marginBottom:2,
  },
  tcardTeamRow: { display:"flex", alignItems:"center", gap:6, flexWrap:"wrap" },
  tcardTeamBadge: {
    fontSize:8, fontWeight:900, padding:"2px 6px",
    color:"#fff", letterSpacing:"0.08em",
  },
  tcardPos: { fontSize:9, color:"#888", fontWeight:700 },
  tcardActiveDot: { fontSize:8, color:"#4ade80", fontWeight:900 },
  tcardStatsLine: { paddingTop:6 },
  tcardEraLabel: {
    display:"block", fontSize:8, color:"#FFD700",
    letterSpacing:"0.1em", fontWeight:700, marginBottom:3,
  },
  tcardStats: {
    display:"block", fontSize:10, color:"#bbb", lineHeight:1.5,
  },
  tcardFlipHint: {
    fontSize:8, color:"#444", fontStyle:"italic",
    marginTop:6, textAlign:"right",
  },
  tcardBackBody: { display:"flex", flexDirection:"column", gap:12, minHeight:160 },
  tcardFact: {
    margin:0, fontSize:12, color:"#bbb", lineHeight:1.6,
    fontFamily:"'Georgia',serif",
  },
  tcardBackStats: {
    display:"flex", gap:8, padding:"8px 0",
    borderTop:"1px solid rgba(255,215,0,0.2)",
    borderBottom:"1px solid rgba(255,215,0,0.2)",
  },
  tcardBackStatItem: {
    flex:1, display:"flex", flexDirection:"column", gap:2, alignItems:"center",
  },
  tcardBackStatLabel: { fontSize:7, color:"#666", letterSpacing:"0.1em", fontWeight:700 },
  tcardBackStatVal: { fontSize:11, color:"#e8e0d0", fontWeight:900 },
  tcardLinks: { display:"flex", gap:10, flexWrap:"wrap" },
  tcardLink: { fontSize:10, color:"#FFD700", fontWeight:700, textDecoration:"none" },

  // PLAYER SPOTLIGHT (old)
  spotlightWrap: { cursor:"pointer", userSelect:"none" },
  spotlightCard: {
    background:"#161616", border:"1px solid #2a2a2a",
    borderLeft:"3px solid #c8201c", padding:"12px 14px",
    height:"100%", boxSizing:"border-box",
  },
  spotlightFront: { display:"flex", flexDirection:"column", gap:4 },
  spotlightBack: { display:"flex", flexDirection:"column", gap:8 },
  spotlightHeader: { display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:4 },
  spotlightBadge: { fontSize:8, fontWeight:900, color:"#c8201c", letterSpacing:"0.15em" },
  spotlightTap: { fontSize:8, color:"#444", fontStyle:"italic" },
  spotlightEmoji: { fontSize:28, lineHeight:1 },
  spotlightName: { fontSize:16, fontWeight:900, color:"#e8e0d0", fontFamily:"'Georgia',serif", lineHeight:1.2 },
  spotlightMeta: { display:"flex", gap:8, alignItems:"center", flexWrap:"wrap" },
  spotlightTeam: { fontSize:10, color:"#c8201c", fontWeight:900 },
  spotlightPos: { fontSize:9, color:"#666" },
  spotlightActive: { fontSize:9, color:"#4ade80", fontWeight:900 },
  spotlightEra: { fontSize:9, color:"#555", letterSpacing:"0.05em" },
  spotlightStats: { fontSize:10, color:"#aaa", lineHeight:1.5 },
  spotlightFact: { fontSize:11, color:"#aaa", lineHeight:1.6, fontFamily:"'Georgia',serif", margin:0 },
  spotlightLinks: { display:"flex", gap:10, flexWrap:"wrap" },
  spotlightLink: { fontSize:10, color:"#c8201c", fontWeight:700, textDecoration:"none" },

  // QUOTE OF THE DAY
  quoteBar: {
    display:"flex", gap:10, alignItems:"flex-start",
    background:"transparent", borderLeft:"2px solid #333",
    padding:"8px 12px", marginBottom:12,
  },
  quoteIcon: { fontSize:14, flexShrink:0, marginTop:2, color:"#555" },
  quoteBody: { flex:1 },
  quoteText: {
    margin:"0 0 3px", fontSize:11, fontStyle:"italic",
    color:"#ccc", lineHeight:1.5, fontFamily:"'Georgia',serif",
  },
  quoteAuthor: { margin:0, fontSize:9, color:"#666", letterSpacing:"0.05em" },
  quoteTeam: { color:"#c8201c", fontWeight:700 },
  quoteLinkSmall: { fontSize:8, color:"#555", fontWeight:700, textDecoration:"none", letterSpacing:"0.05em" },

  // STATS
  statsRoot: { paddingTop:8 },
  statsGrid: {
    display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(280px,1fr))",
    gap:16, marginTop:8,
  },
  statsCat: { border:"1px solid #2a2a2a", overflow:"hidden" },
  statsCatHeader: {
    display:"flex", justifyContent:"space-between", alignItems:"center",
    background:"#1a1a1a", padding:"8px 12px",
    borderBottom:"1px solid #2a2a2a",
  },
  statsCatName: { fontSize:10, fontWeight:900, letterSpacing:"0.15em", color:"#e8e0d0" },
  statsCatAbbrev: { fontSize:9, color:"#c8201c", fontWeight:900, letterSpacing:"0.1em" },
  statsRow: {
    display:"flex", alignItems:"center", gap:8,
    padding:"7px 10px", textDecoration:"none", color:"inherit",
    borderTop:"1px solid #111", transition:"background 0.1s",
  },
  statsRowAlt: { background:"#0f0f0f" },
  statsRowNY: { borderLeft:"2px solid #c8201c", background:"#161616" },
  statsRank: { fontSize:10, color:"#888", minWidth:16, textAlign:"center", fontWeight:900 },
  statsHeadshot: { width:24, height:24, borderRadius:"50%", objectFit:"cover", flexShrink:0 },
  statsPlayerInfo: { flex:1, display:"flex", flexDirection:"column", gap:1 },
  statsName: { fontSize:12, color:"#aaa", fontWeight:700 },
  statsTeam: { fontSize:9, color:"#888", letterSpacing:"0.04em" },
  statsValue: { fontSize:14, fontWeight:900, color:"#888", fontFamily:"'Georgia',serif", minWidth:40, textAlign:"right" },
  statsNYBadge: { fontSize:7, background:"#c8201c", color:"#fff", padding:"1px 4px", fontWeight:900, letterSpacing:"0.05em" },
  statsDeepDive: {
    display:"flex", alignItems:"center", gap:14,
    marginTop:20, padding:"12px 16px",
    background:"#161616", border:"1px solid #2a2a2a",
  },
  statsDeepDiveLabel: { fontSize:9, color:"#888", fontWeight:900, letterSpacing:"0.15em" },
  statsDeepDiveLink: {
    fontSize:10, color:"#c8201c", fontWeight:900, letterSpacing:"0.1em",
    textDecoration:"none",
  },

  // STATS REFERENCE
  statsRoot: { paddingTop:8 },
  statsLeagueHeader: {
    padding:"14px 16px", background:"#161616",
    marginBottom:16, display:"flex", alignItems:"center",
  },
  statsLeagueTitle: { fontSize:16, fontWeight:900, color:"#e8e0d0", letterSpacing:"0.1em", fontFamily:"'Georgia',serif" },
  statsLeagueDesc: { margin:"4px 0 0", fontSize:11, color:"#888" },
  statsNYTeams: { margin:"4px 0 0", fontSize:10, color:"#c8201c", fontWeight:700, letterSpacing:"0.05em" },
  statsRefGrid: {
    display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(220px,1fr))",
    gap:8, marginBottom:20,
  },
  statsRefCard: {
    display:"flex", alignItems:"center", gap:10,
    background:"#161616", border:"1px solid #2a2a2a",
    padding:"12px 14px", textDecoration:"none",
    transition:"border-color 0.15s", cursor:"pointer",
  },
  statsRefAbbrev: {
    fontSize:11, fontWeight:900, color:"#fff",
    padding:"4px 8px", minWidth:36, textAlign:"center",
    letterSpacing:"0.05em", flexShrink:0,
  },
  statsRefBody: { flex:1, display:"flex", flexDirection:"column", gap:2 },
  statsRefName: { fontSize:12, fontWeight:700, color:"#e8e0d0", fontFamily:"'Georgia',serif" },
  statsRefDesc: { fontSize:9, color:"#888", letterSpacing:"0.04em" },
  statsRefArrow: { fontSize:14, color:"#c8201c", fontWeight:900 },
  statsNYSection: { borderTop:"1px solid #2a2a2a", paddingTop:16 },
  statsNYHeader: { fontSize:9, fontWeight:900, color:"#c8201c", letterSpacing:"0.2em", marginBottom:10 },
  statsNYCards: { display:"flex", flexWrap:"wrap", gap:8 },
  statsNYCard: {
    padding:"8px 16px", border:"1px solid #333", background:"#1a1a1a",
    color:"#aaa", fontSize:10, fontWeight:900, letterSpacing:"0.1em",
    textDecoration:"none", fontFamily:"'Georgia',serif",
  },
  stdRoot: { paddingTop: 8 },
  stdHeader: { borderBottom: "2px solid #2a2a2a", paddingBottom: 12, marginBottom: 16 },
  stdTitle: { margin:"0 0 4px", fontSize:14, fontWeight:900, letterSpacing:"0.15em", color:"#e8e0d0", fontFamily:"'Georgia',serif" },
  stdSub: { margin:0, fontSize:9, color:"#c8201c", letterSpacing:"0.2em", fontWeight:700 },
  stdGroups: { display:"flex", flexDirection:"column", gap:20, marginTop:16 },
  stdGroup: {},
  stdDivisionHeader: { fontSize:9, fontWeight:900, letterSpacing:"0.18em", color:"#888", marginBottom:8 },
  stdTable: { border:"1px solid #2a2a2a", overflow:"hidden" },
  stdRowHeader: {
    display:"grid", gridTemplateColumns:"1fr 40px 40px 60px 50px",
    background:"#1a1a1a", padding:"6px 10px",
    fontSize:8, fontWeight:900, letterSpacing:"0.15em", color:"#555",
  },
  stdRow: {
    display:"grid", gridTemplateColumns:"1fr 40px 40px 60px 50px",
    padding:"8px 10px", alignItems:"center",
    borderTop:"1px solid #1a1a1a",
  },
  stdRowAlt: { background:"#0f0f0f" },
  stdRowNY: { borderLeft:"3px solid #c8201c", background:"#161616" },
  stdColTeam: { display:"flex", alignItems:"center", gap:6, fontSize:11 },
  stdColStat: { fontSize:11, color:"#aaa", textAlign:"center" },
  stdLogo: { width:18, height:18, objectFit:"contain", flexShrink:0 },
  stdTeamName: { fontSize:11, color:"#888" },
  stdNYBadge: { fontSize:7, background:"#c8201c", color:"#fff", padding:"1px 4px", fontWeight:900, letterSpacing:"0.05em", marginLeft:4 },

  // SCHEDULE
  schRoot: { paddingTop:8 },
  schList: { display:"flex", flexDirection:"column", gap:2 },
  schDateHeader: {
    fontSize:9, fontWeight:900, letterSpacing:"0.18em", color:"#c8201c",
    background:"#161616", padding:"6px 12px", marginTop:16, marginBottom:4,
    borderLeft:"3px solid #c8201c",
  },
  schRow: {
    display:"flex", alignItems:"center", gap:10,
    background:"#111", border:"1px solid #1a1a1a",
    padding:"10px 12px", flexWrap:"wrap",
  },
  schTeamBadge: { display:"flex", flexDirection:"column", alignItems:"center", gap:2, minWidth:54, flexShrink:0 },
  schSport: { fontSize:14 },
  schTeamLabel: { fontSize:8, fontWeight:900, color:"#c8201c", letterSpacing:"0.08em" },
  schMatchup: { flex:1, display:"flex", flexDirection:"column", gap:4, minWidth:140 },
  schTeamLine: { display:"flex", alignItems:"center", gap:6 },
  schTeamName: { fontSize:12, fontWeight:700, color:"#ccc" },
  schAt: { fontSize:8, color:"#888", paddingLeft:24 },
  schRight: { display:"flex", flexDirection:"column", alignItems:"flex-end", gap:4, minWidth:80 },
  schTime: { fontSize:11, fontWeight:900, color:"#e8e0d0", letterSpacing:"0.03em" },
  schVenue: { fontSize:8, color:"#888", textAlign:"right" },

  gameInfoBar: {
    display:"flex", gap:12, flexWrap:"wrap", padding:"6px 10px",
    background:"#111", fontSize:9, color:"#888", marginBottom:8,
    borderBottom:"1px solid #1a1a1a",
  },
  scoringSummary: { marginBottom: 12, border:"1px solid #2a2a2a", overflow:"hidden" },
  scoringHeader: { fontSize:8, fontWeight:900, letterSpacing:"0.15em", color:"#c8201c", background:"#1a1a1a", padding:"5px 10px" },
  scoringPlay: { display:"flex", gap:8, padding:"6px 10px", alignItems:"flex-start", fontSize:10, borderTop:"1px solid #1a1a1a" },
  scoringLeft: { display:"flex", flexDirection:"column", gap:2, minWidth:70, flexShrink:0 },
  scoringPeriod: { color:"#666", fontSize:9, letterSpacing:"0.05em" },
  scoringTeamBadge: { color:"#c8201c", fontWeight:900, fontSize:9, letterSpacing:"0.05em" },
  scoringMiddle: { flex:1, display:"flex", flexDirection:"column", gap:2 },
  scoringAthletes: { color:"#e8e0d0", fontWeight:700, fontSize:10 },
  scoringText: { color:"#aaa", fontSize:10, lineHeight:1.4 },
  scoringScore: { color:"#e8e0d0", fontWeight:900, fontSize:11, minWidth:35, textAlign:"right", flexShrink:0, fontFamily:"'Georgia',serif" },

  // BOX SCORE
  boxScoreBtn: {
    marginTop:8, background:"transparent", border:"1px solid #333",
    color:"#666", fontSize:9, fontWeight:900, letterSpacing:"0.1em",
    padding:"4px 10px", cursor:"pointer", width:"100%",
    fontFamily:"'Georgia',serif", transition:"all 0.15s",
  },
  boxScorePanel: {
    marginTop:8, borderTop:"1px solid #2a2a2a", paddingTop:8,
  },
  boxScoreLoading: { display:"flex", justifyContent:"center", padding:"16px 0" },
  boxScoreEmpty: { fontSize:10, color:"#444", textAlign:"center", margin:"10px 0" },
  lineScoreWrap: { overflowX:"auto", marginBottom:12 },
  lineScoreTable: { width:"100%", borderCollapse:"collapse", fontSize:10 },
  lsThTeam: { textAlign:"left", padding:"4px 6px", color:"#666", fontWeight:900, fontSize:8, letterSpacing:"0.1em", background:"#1a1a1a" },
  lsTh: { textAlign:"center", padding:"4px 6px", color:"#666", fontWeight:900, fontSize:8, letterSpacing:"0.1em", background:"#1a1a1a" },
  lsTdTeam: { padding:"4px 6px", color:"#aaa", fontSize:10, fontWeight:700, whiteSpace:"nowrap" },
  lsTd: { textAlign:"center", padding:"4px 6px", color:"#888", fontSize:10 },
  playerStatsSection: { marginBottom:12 },
  playerStatsTeamHeader: {
    fontSize:9, fontWeight:900, letterSpacing:"0.15em", color:"#c8201c",
    padding:"4px 0", marginBottom:6, borderBottom:"1px solid #2a2a2a",
  },
  statGroupWrap: { marginBottom:10 },
  statGroupName: { fontSize:8, color:"#999", letterSpacing:"0.15em", fontWeight:900, marginBottom:4 },
  statTableWrap: { overflowX:"auto" },
  statTable: { width:"100%", borderCollapse:"collapse", fontSize:10, minWidth:300 },
  statThPlayer: { textAlign:"left", padding:"3px 6px", color:"#555", fontWeight:900, fontSize:8, background:"#1a1a1a", cursor:"pointer", whiteSpace:"nowrap" },
  statTh: { textAlign:"center", padding:"3px 6px", color:"#555", fontWeight:900, fontSize:8, background:"#1a1a1a", cursor:"pointer", whiteSpace:"nowrap" },
  statTdPlayer: { padding:"3px 6px", color:"#bbb", fontSize:10, whiteSpace:"nowrap" },
  statTd: { textAlign:"center", padding:"3px 6px", color:"#888", fontSize:10 },

  // STADIUM HISTORY
  stadiumGrid: { display:"flex", flexDirection:"column", gap:12 },
  stadiumCard: {
    display:"flex", gap:14, background:"#161616",
    border:"1px solid #2a2a2a", padding:"14px 16px",
    borderLeft:"3px solid #c8201c",
  },
  stadiumEmoji: { fontSize:28, flexShrink:0, paddingTop:4 },
  stadiumBody: { flex:1 },
  stadiumName: { fontSize:15, fontWeight:900, color:"#e8e0d0", fontFamily:"'Georgia',serif", marginBottom:4 },
  stadiumMeta: { display:"flex", gap:10, flexWrap:"wrap", marginBottom:4 },
  stadiumTeam: { fontSize:10, color:"#c8201c", fontWeight:900, letterSpacing:"0.05em" },
  stadiumYears: { fontSize:10, color:"#888" },
  stadiumCap: { fontSize:10, color:"#666" },
  stadiumLocation: { fontSize:10, color:"#888", marginBottom:6 },
  stadiumNote: { margin:"0 0 8px", fontSize:12, color:"#aaa", lineHeight:1.6, fontFamily:"'Georgia',serif" },

  // HISTORY
  histRoot: { paddingTop:8 },
  histList: { border:"1px solid #2a2a2a", overflow:"hidden" },
  histListHeader: {
    background:"#1a1a1a", padding:"12px 14px",
    borderBottom:"1px solid #2a2a2a",
    display:"flex", flexWrap:"wrap", gap:10, alignItems:"center",
  },
  histListTitle: {
    fontSize:12, fontWeight:900, letterSpacing:"0.08em",
    color:"#e8e0d0", fontFamily:"'Georgia',serif", flex:1,
  },
  histRow: {
    display:"flex", alignItems:"center", gap:12,
    padding:"10px 14px", borderTop:"1px solid #111",
  },
  histRowAlt: { background:"#0f0f0f" },
  histRowFirst: { background:"#1a1500", borderLeft:"3px solid #FFD700" },
  histRank: {
    fontSize:13, fontWeight:900, minWidth:28, textAlign:"center",
    color:"#555", fontFamily:"'Georgia',serif",
  },
  histRankFirst:  { color:"#FFD700" },
  histRankSecond: { color:"#aaa"    },
  histRankThird:  { color:"#cd7f32" },
  histInfo: { flex:1, display:"flex", flexDirection:"column", gap:2 },
  histName: { fontSize:13, fontWeight:700, color:"#e8e0d0", fontFamily:"'Georgia',serif" },
  histYears: { fontSize:9, color:"#555", letterSpacing:"0.04em" },
  histLinks: { display:"flex", gap:8, marginTop:4 },
  histLink: {
    fontSize:9, color:"#c8201c", textDecoration:"none",
    fontWeight:700, letterSpacing:"0.05em",
  },

  // DROUGHT TRACKER
  droughtRow: { display:"flex", alignItems:"center", gap:12, padding:"10px 12px", flexWrap:"wrap" },
  droughtTeam: { display:"flex", alignItems:"center", gap:8, minWidth:140, flexShrink:0 },
  droughtEmoji: { fontSize:18 },
  droughtTeamName: { fontSize:13, fontWeight:900, color:"#e8e0d0", fontFamily:"'Georgia',serif" },
  droughtSport: { fontSize:9, color:"#666" },
  droughtBar: { flex:1, height:8, background:"#1a1a1a", borderRadius:4, overflow:"hidden", minWidth:60 },
  droughtFill: { height:"100%", borderRadius:4, transition:"width 0.5s" },
  droughtRight: { display:"flex", flexDirection:"column", alignItems:"flex-end", minWidth:120 },
  droughtYear: { fontSize:11, fontWeight:900, color:"#aaa" },
  droughtNote: { fontSize:9, color:"#666" },

  // RIVALS
  rivalRow: { display:"flex", alignItems:"center", gap:12, padding:"12px 14px", flexWrap:"wrap", borderTop:"1px solid #1a1a1a" },
  rivalTeams: { display:"flex", alignItems:"center", gap:8, minWidth:200, flexShrink:0 },
  rivalTeam: { fontSize:13, fontWeight:900, color:"#e8e0d0", fontFamily:"'Georgia',serif" },
  rivalVs: { fontSize:10, color:"#c8201c", fontWeight:900 },
  rivalSport: { fontSize:9, color:"#555", marginLeft:4 },
  rivalInfo: { flex:1, display:"flex", flexDirection:"column", gap:2 },
  rivalStat: { fontSize:11, fontWeight:700, color:"#aaa" },
  rivalNote: { fontSize:10, color:"#666" },

  // TEAM LINKS
  teamLinkCard: {
    background:"#161616", border:"1px solid #2a2a2a",
    padding:"14px", display:"flex", flexDirection:"column", gap:10,
  },
  teamLinkHeader: { display:"flex", alignItems:"center", gap:8 },
  teamLinkEmoji: { fontSize:20 },
  teamLinkName: { fontSize:14, fontWeight:900, color:"#e8e0d0", fontFamily:"'Georgia',serif", flex:1 },
  teamLinkLeague: { fontSize:9, color:"#666", letterSpacing:"0.1em" },
  teamLinkBtns: { display:"flex", flexDirection:"column", gap:4 },
  teamLinkBtn: {
    display:"block", padding:"6px 10px", background:"#1a1a1a",
    border:"1px solid #2a2a2a", color:"#aaa", textDecoration:"none",
    fontSize:10, fontWeight:700, letterSpacing:"0.05em",
    transition:"border-color 0.15s",
  },

  // RECAP TAB
  recapScoreRow: { display:"flex", alignItems:"center", justifyContent:"space-between", padding:"10px 14px", borderTop:"1px solid #1a1a1a", flexWrap:"wrap", gap:8 },
  recapTeams: { display:"flex", alignItems:"center", gap:10, flexWrap:"wrap" },
  recapSport: { fontSize:9, color:"#666", fontWeight:900, letterSpacing:"0.1em" },
  recapAway: { fontSize:13, fontWeight:900, color:"#e8e0d0", fontFamily:"'Georgia',serif" },
  recapScore: { fontSize:14, fontWeight:900, color:"#c8201c", fontFamily:"'Georgia',serif" },
  recapHome: { fontSize:13, fontWeight:900, color:"#e8e0d0", fontFamily:"'Georgia',serif" },
  recapStatus: { fontSize:10, color:"#888" },
  ytTeamGrid: { display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(200px, 1fr))", gap:8 },
  ytTeamCard: { display:"flex", alignItems:"center", gap:12, padding:"12px 14px", textDecoration:"none", border:"1px solid #2a2a2a" },
  ytEmoji: { fontSize:24, flexShrink:0 },
  ytInfo: { flex:1, display:"flex", flexDirection:"column", gap:2 },
  ytTeamName: { fontSize:13, fontWeight:900, color:"#e8e0d0", fontFamily:"'Georgia',serif" },
  ytSubtext: { fontSize:9, color:"#888" },

  // ICONIC EVENTS
  iconicRow: { display:"flex", gap:14, padding:"11px 14px", borderTop:"1px solid #1a1a1a", alignItems:"flex-start" },
  iconicIcon: { fontSize:18, flexShrink:0, width:26, textAlign:"center", paddingTop:1 },
  iconicYear: { fontSize:15, fontWeight:900, color:"#c8201c", fontFamily:"'Georgia',serif", flexShrink:0, width:52 },
  iconicInfo: { flex:1, display:"flex", flexDirection:"column", gap:3 },
  iconicTitle: { fontSize:13, fontWeight:900, color:"#e8e0d0", fontFamily:"'Georgia',serif" },
  iconicDesc: { fontSize:11, color:"#aaa", lineHeight:1.6 },

  // TODAY IN NY SPORTS
  todayCard: { display:"flex", gap:14, padding:"14px 16px", borderTop:"1px solid #1a1a1a" },
  todayEmoji: { fontSize:28, flexShrink:0, paddingTop:2 },
  todayBody: { flex:1 },
  todayHeader: { display:"flex", gap:10, alignItems:"center", marginBottom:4 },
  todayYear: { fontSize:16, fontWeight:900, color:"#c8201c", fontFamily:"'Georgia',serif" },
  todayTeam: { fontSize:10, color:"#888", fontWeight:700, letterSpacing:"0.08em" },
  todayTitle: { fontSize:14, fontWeight:900, color:"#e8e0d0", fontFamily:"'Georgia',serif", marginBottom:6 },
  todayDesc: { margin:"0 0 8px", fontSize:11, color:"#aaa", lineHeight:1.6 },

  // POLLS
  pollCard: { background:"#161616", border:"1px solid #2a2a2a", padding:"16px" },
  pollQuestion: { fontSize:14, fontWeight:900, color:"#e8e0d0", fontFamily:"'Georgia',serif", marginBottom:12 },
  pollOptions: { display:"flex", flexDirection:"column", gap:6 },
  pollOptionWrap: { position:"relative" },
  pollOption: {
    display:"flex", alignItems:"center", width:"100%", padding:"8px 12px",
    background:"#1a1a1a", border:"1px solid #333", color:"#e8e0d0",
    fontSize:11, fontWeight:700, textAlign:"left", position:"relative", overflow:"hidden",
    transition:"border-color 0.15s",
  },
  pollOptionVoted: { border:"1px solid #c8201c", color:"#fff" },
  pollOptionDisabled: { color:"#888" },
  pollBar: { position:"absolute", left:0, top:0, bottom:0, opacity:0.2, transition:"width 0.4s" },
  pollOptionText: { position:"relative", zIndex:1, flex:1 },
  pollPct: { position:"relative", zIndex:1, fontSize:12, fontWeight:900, color:"#c8201c" },
  pollMeta: { marginTop:8, fontSize:9, color:"#555", letterSpacing:"0.08em" },

  // HALL OF FAME
  hofRow: { display:"flex", gap:14, padding:"12px 14px", borderTop:"1px solid #1a1a1a" },
  hofEmoji: { fontSize:22, flexShrink:0, paddingTop:2 },
  hofInfo: { flex:1 },
  hofHeader: { display:"flex", alignItems:"center", gap:10, flexWrap:"wrap", marginBottom:4 },
  hofName: { fontSize:14, fontWeight:900, color:"#e8e0d0", fontFamily:"'Georgia',serif" },
  hofPos: { fontSize:10, color:"#c8201c", fontWeight:900 },
  hofYear: { fontSize:10, color:"#888" },
  hofNote: { margin:"0 0 6px", fontSize:11, color:"#aaa" },

  // MISERY INDEX
  miseryCard: { background:"#161616", border:"1px solid #2a2a2a", padding:"14px 16px", marginBottom:12 },
  miseryHeader: { display:"flex", alignItems:"center", gap:12, marginBottom:8 },
  miseryRank: { fontSize:20, fontWeight:900, color:"#666", fontFamily:"'Georgia',serif", minWidth:28 },
  miseryEmoji: { fontSize:28, flexShrink:0 },
  miseryTeamInfo: { flex:1 },
  miseryTeamName: { display:"block", fontSize:16, fontWeight:900, color:"#e8e0d0", fontFamily:"'Georgia',serif" },
  miseryTitle: { display:"block", fontSize:9, color:"#c8201c", fontWeight:900, letterSpacing:"0.1em" },
  miseryScoreBox: { minWidth:80, position:"relative", height:20, background:"#1a1a1a", flexShrink:0 },
  miseryScoreFill: { position:"absolute", left:0, top:0, bottom:0, transition:"width 0.5s" },
  miseryScore: { position:"absolute", right:6, top:"50%", transform:"translateY(-50%)", fontSize:12, fontWeight:900, color:"#fff" },
  miseryMeta: { display:"flex", gap:16, marginBottom:8 },
  miseryLowlights: { display:"flex", flexDirection:"column", gap:4, marginBottom:8 },
  miseryLow: { fontSize:11, color:"#aaa", paddingLeft:4 },
  miseryBright: { fontSize:11, color:"#4ade80", fontStyle:"italic", paddingTop:8, borderTop:"1px solid #1a1a1a" },

  // RADIO
  radioRow: { display:"flex", alignItems:"center", gap:12, padding:"10px 14px", textDecoration:"none", borderTop:"1px solid #1a1a1a" },
  
  // BEAT WRITERS / FAN COMMUNITIES / NY SITES
  beatWriterRow: { display:"flex", alignItems:"center", gap:12, padding:"10px 14px", textDecoration:"none", borderTop:"1px solid #1a1a1a" },
  beatWriterIcon: { fontSize:22, flexShrink:0, width:30, textAlign:"center" },
  beatWriterInfo: { flex:1, display:"flex", flexDirection:"column", gap:3 },
  beatWriterTopLine: { display:"flex", gap:10, alignItems:"baseline" },
  beatWriterName: { fontSize:13, fontWeight:900, color:"#e8e0d0", fontFamily:"'Georgia',serif" },
  beatWriterHandle: { fontSize:10, color:"#888" },
  beatWriterMeta: { display:"flex", gap:10, alignItems:"center", flexWrap:"wrap" },
  beatWriterOutlet: { fontSize:10, color:"#c8201c", fontWeight:900, letterSpacing:"0.05em" },
  beatWriterTeams: { fontSize:9, color:"#666" },
  beatWriterDesc: { fontSize:10, color:"#888", fontStyle:"italic" },
  beatWriterArrow: { fontSize:14, color:"#c8201c", fontWeight:900, flexShrink:0 },
  radioIcon: { fontSize:20, flexShrink:0 },
  radioInfo: { flex:1, display:"flex", flexDirection:"column", gap:2 },
  radioName: { fontSize:13, fontWeight:900, color:"#e8e0d0", fontFamily:"'Georgia',serif" },
  radioTeams: { fontSize:9, color:"#c8201c", fontWeight:900, letterSpacing:"0.08em" },
  radioDesc: { fontSize:10, color:"#888" },
  radioArrow: { fontSize:14, color:"#c8201c", fontWeight:900, flexShrink:0 },

  // SHOP
  shopRow: { display:"flex", alignItems:"center", gap:12, padding:"12px 14px", textDecoration:"none", borderTop:"1px solid #1a1a1a" },
  shopEmoji: { fontSize:22, flexShrink:0 },
  shopInfo: { flex:1, display:"flex", flexDirection:"column", gap:2 },
  shopTitle: { fontSize:13, fontWeight:900, color:"#e8e0d0", fontFamily:"'Georgia',serif" },
  shopAuthor: { fontSize:10, color:"#888", fontStyle:"italic" },
  shopDesc: { fontSize:10, color:"#666" },
  shopBtn: { fontSize:10, fontWeight:900, color:"#c8201c", letterSpacing:"0.05em", flexShrink:0, whiteSpace:"nowrap" },

  // BIOS
  bioRow: { display:"flex", gap:14, padding:"14px", borderTop:"1px solid #1a1a1a" },
  bioEmoji: { fontSize:26, flexShrink:0, paddingTop:2 },
  bioInfo: { flex:1 },
  bioHeader: { display:"flex", alignItems:"center", gap:8, flexWrap:"wrap", marginBottom:6 },
  bioName: { fontSize:15, fontWeight:900, color:"#e8e0d0", fontFamily:"'Georgia',serif" },
  bioTeam: { fontSize:10, color:"#c8201c", fontWeight:900, letterSpacing:"0.05em" },
  bioYears: { fontSize:9, color:"#666" },
  bioRole: { fontSize:9, color:"#888", letterSpacing:"0.08em", fontWeight:700 },
  bioBio: { margin:"0 0 6px", fontSize:12, color:"#aaa", lineHeight:1.6, fontFamily:"'Georgia',serif" },
  bioStats: { fontSize:10, color:"#888", marginBottom:6, letterSpacing:"0.03em" },
  bioLinks: { display:"flex", gap:12, flexWrap:"wrap" },

  // SEARCH LINKS
  searchLinks: {
    display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap",
  },
  searchLinkGoogle: {
    display: "inline-flex", alignItems: "center", gap: 5,
    padding: "5px 12px", border: "1px solid #333",
    background: "#1a1a1a", color: "#aaa",
    fontSize: 10, fontWeight: 700, letterSpacing: "0.08em",
    textDecoration: "none", transition: "all 0.15s",
    fontFamily: "'Georgia', serif",
  },
  searchLinkWiki: {
    display: "inline-flex", alignItems: "center", gap: 5,
    padding: "5px 12px", border: "1px solid #333",
    background: "#1a1a1a", color: "#aaa",
    fontSize: 10, fontWeight: 700, letterSpacing: "0.08em",
    textDecoration: "none", transition: "all 0.15s",
    fontFamily: "'Georgia', serif",
  },
  searchLinkIcon: { fontSize: 11 },

  // TRIVIA + THIS DATE
  triviaRoot: { display: "flex", flexDirection: "column", gap: 32, paddingTop: 8 },
  triviaSection: { display: "flex", flexDirection: "column", gap: 16 },
  triviaSectionHeader: {
    display: "flex", alignItems: "center", gap: 12,
    borderBottom: "2px solid #2a2a2a", paddingBottom: 12,
  },
  triviaSectionIcon: { fontSize: 24 },
  triviaSectionTitle: {
    margin: 0, fontSize: 14, fontWeight: 900, letterSpacing: "0.15em",
    color: "#e8e0d0", fontFamily: "'Georgia', serif",
  },
  triviaSectionSub: { margin: "2px 0 0", fontSize: 9, color: "#c8201c", letterSpacing: "0.2em", fontWeight: 700 },
  refreshBtn: {
    marginLeft: "auto", background: "transparent", border: "1px solid #444",
    color: "#888", cursor: "pointer", padding: "6px 12px",
    fontSize: 11, letterSpacing: "0.1em", fontFamily: "'Georgia', serif",
    transition: "all 0.15s",
  },

  // MOMENTS
  momentsList: { display: "flex", flexDirection: "column", gap: 12 },
  momentCard: {
    display: "flex", gap: 0, background: "#161616",
    border: "1px solid #2a2a2a", overflow: "hidden",
    animation: "fadeIn 0.4s ease forwards", opacity: 0,
  },
  momentYear: {
    background: "#c8201c", color: "#fff", padding: "16px 12px",
    fontSize: 13, fontWeight: 900, letterSpacing: "0.05em",
    writingMode: "vertical-rl", textOrientation: "mixed",
    display: "flex", alignItems: "center", justifyContent: "center",
    minWidth: 40, flexShrink: 0,
  },
  momentBody: { padding: "14px 16px", flex: 1 },
  momentMeta: { display: "flex", gap: 10, alignItems: "center", marginBottom: 6 },
  momentTeam: { fontSize: 10, color: "#c8201c", fontWeight: 900, letterSpacing: "0.1em" },
  momentSport: { fontSize: 9, color: "#666", letterSpacing: "0.05em" },
  momentHeadline: {
    margin: "0 0 6px", fontSize: 15, fontWeight: 900, lineHeight: 1.3,
    color: "#e8e0d0", fontFamily: "'Georgia', serif",
  },
  momentDetail: { margin: 0, fontSize: 12, color: "#888", lineHeight: 1.6 },

  // TRIVIA DIVIDER
  triviaDivider: {
    display: "flex", alignItems: "center", gap: 12,
  },
  triviaDividerLine: { flex: 1, height: 1, background: "#2a2a2a" },
  triviaDividerText: { fontSize: 10, color: "#555", letterSpacing: "0.2em", fontWeight: 900, whiteSpace: "nowrap" },

  // TRIVIA CARD
  triviaCard: { background: "#161616", border: "1px solid #2a2a2a", padding: "20px" },
  triviaTeamTag: {
    display: "flex", gap: 8, alignItems: "center",
    fontSize: 10, color: "#c8201c", fontWeight: 900, letterSpacing: "0.1em",
    marginBottom: 12,
  },
  triviaEra: { color: "#555", fontWeight: 400 },
  triviaQuestion: {
    margin: "0 0 20px", fontSize: "clamp(15px, 3vw, 19px)",
    fontWeight: 700, lineHeight: 1.4, color: "#e8e0d0",
    fontFamily: "'Georgia', serif",
  },
  triviaOptions: { display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 },
  triviaOption: {
    display: "flex", alignItems: "center", gap: 12,
    padding: "12px 16px", background: "#1a1a1a",
    border: "1px solid #333", cursor: "pointer",
    fontSize: 13, color: "#ccc", textAlign: "left",
    transition: "all 0.15s", fontFamily: "'Georgia', serif",
  },
  triviaOptionCorrect: { background: "#0d2a1a", border: "1px solid #2d8a50", color: "#4ade80" },
  triviaOptionWrong:   { background: "#1a0d0d", border: "1px solid #662222", color: "#666", opacity: 0.6 },
  triviaOptionLetter: {
    fontWeight: 900, color: "#c8201c", fontSize: 12, minWidth: 16, letterSpacing: "0.05em",
  },
  triviaCheck: { marginLeft: "auto", color: "#4ade80", fontWeight: 900 },
  triviaResult: {
    padding: "16px", border: "1px solid #333", marginTop: 8,
  },
  triviaResultCorrect: { background: "#0d2a1a", borderColor: "#2d8a50" },
  triviaResultWrong:   { background: "#1a0d0d", borderColor: "#662222" },
  triviaResultLabel: {
    margin: "0 0 8px", fontSize: 14, fontWeight: 900, letterSpacing: "0.1em",
  },
  triviaExplanation: { margin: "0 0 14px", fontSize: 13, color: "#aaa", lineHeight: 1.6 },
  nextBtn: {
    background: "#c8201c", border: "none", color: "#fff",
    padding: "8px 20px", cursor: "pointer",
    fontSize: 11, fontWeight: 900, letterSpacing: "0.15em",
    fontFamily: "'Georgia', serif", transition: "opacity 0.15s",
  },
  triviaEmpty: { padding: "30px 0", textAlign: "center", color: "#555", fontSize: 12 },
  retryBtn: {
    background: "transparent", border: "1px solid #444", color: "#888",
    padding: "8px 20px", cursor: "pointer", fontSize: 11, letterSpacing: "0.1em",
  },

  // TV SCHEDULE
  tvRoot: { paddingTop: 8, display: "flex", flexDirection: "column", gap: 20 },
  tvDateBanner: {
    display: "flex", alignItems: "center", gap: 14,
    background: "#161616", border: "1px solid #c8201c",
    padding: "14px 18px",
  },
  tvDateIcon: { fontSize: 28 },
  tvDateTitle: {
    fontSize: 16, fontWeight: 900, letterSpacing: "0.15em",
    color: "#e8e0d0", fontFamily: "'Georgia', serif",
  },
  tvDateSub: { fontSize: 9, color: "#c8201c", letterSpacing: "0.15em", fontWeight: 700, marginTop: 3 },
  tvSection: { display: "flex", flexDirection: "column", gap: 2 },
  tvSectionHeader: {
    background: "#1a1a1a", borderLeft: "3px solid #c8201c",
    padding: "6px 12px", marginBottom: 6,
  },
  tvSectionHeaderText: {
    fontSize: 10, fontWeight: 900, letterSpacing: "0.18em", color: "#c8201c",
  },
  tvRow: {
    display: "flex", gap: 12, alignItems: "center",
    background: "#111", border: "1px solid #1e1e1e",
    padding: "12px 14px", flexWrap: "wrap",
    transition: "border-color 0.15s",
  },
  tvRowFeatured: {
    background: "#161616", border: "1px solid #2a2a2a",
    borderLeft: "3px solid #c8201c",
  },
  tvTimeCol: {
    display: "flex", flexDirection: "column", alignItems: "center",
    gap: 4, minWidth: 70, flexShrink: 0,
  },
  tvTime: {
    fontSize: 11, fontWeight: 900, color: "#e8e0d0",
    letterSpacing: "0.03em", textAlign: "center", lineHeight: 1.3,
  },
  tvLiveBadge: {
    display: "flex", alignItems: "center", gap: 4,
    background: "#0d2a1a", border: "1px solid #2d8a50",
    color: "#4ade80", padding: "3px 8px",
    fontSize: 10, fontWeight: 900, letterSpacing: "0.08em",
  },
  tvLiveDot: { fontSize: 8, animation: "pulse 1s ease-in-out infinite" },
  tvFinalBadge: {
    fontSize: 10, fontWeight: 900, color: "#666", letterSpacing: "0.1em",
  },
  tvSportBadge: {
    fontSize: 9, color: "#555", letterSpacing: "0.05em",
  },
  tvMatchup: { flex: 1, display: "flex", flexDirection: "column", gap: 4, minWidth: 160 },
  tvTeamLine: { display: "flex", alignItems: "center", gap: 8 },
  tvLogo: { width: 22, height: 22, objectFit: "contain", flexShrink: 0 },
  tvTeamName: { fontSize: 13, fontWeight: 700, color: "#e8e0d0", flex: 1 },
  tvScore: { fontSize: 16, fontWeight: 900, color: "#e8e0d0", fontFamily: "'Georgia', serif", minWidth: 24, textAlign: "right" },
  tvAt: { fontSize: 9, color: "#444", paddingLeft: 30, letterSpacing: "0.05em" },
  tvVenue: { fontSize: 9, color: "#444", marginTop: 2, paddingLeft: 30 },
  tvChannels: {
    display: "flex", flexWrap: "wrap", gap: 6,
    justifyContent: "flex-end", minWidth: 80,
  },
  tvChannelBadge: {
    padding: "4px 10px", fontSize: 10, fontWeight: 900,
    letterSpacing: "0.08em", whiteSpace: "nowrap",
    fontFamily: "'Georgia', serif",
  },
  tvNoChannel: {
    fontSize: 9, color: "#444", letterSpacing: "0.08em",
    fontStyle: "italic",
  },
  tvFootnote: {
    fontSize: 9, color: "#444", letterSpacing: "0.05em",
    textAlign: "center", paddingTop: 8, borderTop: "1px solid #1a1a1a",
  },

  // CROSSWORD
  xwRoot: { paddingTop: 8 },
  xwHeader: {
    display: "flex", justifyContent: "space-between", alignItems: "flex-start",
    borderBottom: "2px solid #2a2a2a", paddingBottom: 12, marginBottom: 14, flexWrap: "wrap", gap: 10,
  },
  xwTitle: {
    margin: "0 0 4px", fontSize: 14, fontWeight: 900, letterSpacing: "0.15em",
    color: "#e8e0d0", fontFamily: "'Georgia', serif",
  },
  xwDate: { margin: 0, fontSize: 9, color: "#c8201c", letterSpacing: "0.15em", fontWeight: 700 },
  xwActions: { display: "flex", gap: 8 },
  xwBtn: {
    background: "transparent", border: "1px solid #555", color: "#aaa",
    padding: "6px 14px", cursor: "pointer", fontSize: 10,
    letterSpacing: "0.12em", fontFamily: "'Georgia', serif", fontWeight: 700,
    transition: "all 0.15s",
  },
  xwBtnReveal: { borderColor: "#c8201c", color: "#c8201c" },
  xwComplete: {
    background: "#0d2a1a", border: "1px solid #2d8a50", color: "#4ade80",
    padding: "10px 16px", marginBottom: 12, fontSize: 13, fontWeight: 700,
    letterSpacing: "0.05em", textAlign: "center",
  },
  xwActiveClueBanner: {
    display: "flex", alignItems: "center", gap: 10,
    background: "#1a1a1a", border: "1px solid #c8201c",
    padding: "8px 14px", marginBottom: 14,
  },
  xwActiveClueNum: { color: "#c8201c", fontWeight: 900, fontSize: 12, minWidth: 28, letterSpacing: "0.05em" },
  xwActiveClueText: { flex: 1, fontSize: 13, color: "#e8e0d0", fontFamily: "'Georgia', serif" },
  xwActiveClueDir: { fontSize: 9, color: "#555", letterSpacing: "0.15em" },
  xwLayout: {
    display: "flex", gap: 20, alignItems: "flex-start", flexWrap: "wrap",
  },
  xwGridWrap: { flexShrink: 0, width: "100%", overflowX: "auto" },
  xwGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(15, clamp(20px, 5.5vw, 32px))",
    gridTemplateRows: "repeat(15, clamp(20px, 5.5vw, 32px))",
    gap: 2, background: "#0e0e0e",
    border: "2px solid #c8201c", padding: 2,
    margin: "0 auto",
  },
  xwCell: {
    width: "clamp(20px, 5.5vw, 32px)",
    height: "clamp(20px, 5.5vw, 32px)",
    position: "relative",
    cursor: "pointer", border: "1px solid #ccc",
    display: "flex", alignItems: "center", justifyContent: "center",
  },
  xwCellBlack: { background: "#111", border: "1px solid #111", cursor: "default" },
  xwCellNum: {
    position: "absolute", top: 1, left: 2,
    fontSize: "clamp(5px, 1.5vw, 7px)", fontWeight: 900, color: "#333", lineHeight: 1, zIndex: 1,
    pointerEvents: "none",
  },
  xwInput: {
    width: "100%", height: "100%", border: "none", background: "transparent",
    textAlign: "center", fontSize: "clamp(10px, 3vw, 15px)", fontWeight: 900,
    fontFamily: "'Georgia', serif", color: "#111",
    cursor: "pointer", outline: "none", textTransform: "uppercase",
    padding: 0, zIndex: 2,
  },
  xwClues: {
    flex: 1, display: "flex", gap: 16, minWidth: 0, width: "100%", flexWrap: "wrap",
  },
  xwClueCol: { flex: 1, minWidth: 120 },
  xwClueHeader: {
    fontSize: 10, fontWeight: 900, letterSpacing: "0.2em", color: "#c8201c",
    borderBottom: "1px solid #333", paddingBottom: 6, marginBottom: 8,
  },
  xwClueItem: {
    display: "flex", gap: 6, padding: "4px 6px", cursor: "pointer",
    marginBottom: 2, transition: "background 0.1s",
  },
  xwClueItemActive: { background: "#1a1a1a", borderLeft: "2px solid #c8201c" },
  xwClueNum: {
    fontSize: 10, fontWeight: 900, color: "#c8201c", minWidth: 20,
    letterSpacing: "0.05em", flexShrink: 0,
  },
  xwClueText: { fontSize: 11, color: "#aaa", lineHeight: 1.4, fontFamily: "'Georgia', serif" },
};

// ─── INJECT KEYFRAMES ──────────────────────────────────────────────────────
const styleTag = document.createElement("style");
styleTag.textContent = `
  @keyframes ticker {
    from { transform: translateX(0); }
    to   { transform: translateX(-50%); }
  }
  @keyframes bounce {
    0%, 100% { transform: translateY(0); opacity: 1; }
    50%       { transform: translateY(-8px); opacity: 0.4; }
  }
  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50%       { opacity: 0.3; }
  }
  @keyframes pointerPulse {
    0%, 100% { transform: translateY(0);   }
    50%       { transform: translateY(3px); }
  }
  @keyframes fadeUp {
    from { opacity: 0; transform: translateY(8px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  ::-webkit-scrollbar { height: 4px; background: #1a1a1a; }
  ::-webkit-scrollbar-thumb { background: #c8201c; }
`;
document.head.appendChild(styleTag);

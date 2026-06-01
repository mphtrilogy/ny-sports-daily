import { useState, useEffect, useCallback, useRef, createContext, useContext } from "react";

// ─── SUPABASE CONFIG ───────────────────────────────────────────────────────
const SUPABASE_URL = "https://fnxoucliekhotvartyfu.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZueG91Y2xpZWtob3R2YXJ0eWZ1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM5NTI3MzEsImV4cCI6MjA4OTUyODczMX0.V4A75JO9s-7MbDRY7VMydwydOvdkU4SNSz_BRoVAoqA";

// Dark mode context — must be declared before any component that uses it
const DarkModeCtx = createContext(true);

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
  NHL:  [{ name: "Rangers", espnId: "13", color: "#0038A8" }, { name: "Islanders", espnId: "22", color: "#00539B" }, { name: "NJ Devils", espnId: "1", color: "#CE1126" }],
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
  { sport:"hockey",     league:"nhl",  id:"22",    name:"Islanders", espnSlug:"nyi" },
  { sport:"hockey",     league:"nhl",  id:"1",     name:"Devils",    espnSlug:"njd" },
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
    { name:"Islanders", sport:"hockey",     league:"nhl",        id:"22" },
    { name:"NJ Devils", sport:"hockey",     league:"nhl",        id:"1"  },
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
    { team:"Knicks",    must:["knicks","madison square garden"], exclude:[] },
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
  const [nyOnly, setNyOnly]               = useState(false);
  const [activeTab, setActiveTab]         = useState("SCORES");
  const [darkMode, setDarkMode]           = useState(true);
  const [searchOpen, setSearchOpen]       = useState(false);
  const [searchQuery, setSearchQuery]     = useState("");
  const days = getLast7Days();

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
        <div style={styles.mastheadMain}>
          <div style={styles.mastheadLines}>
            <div style={styles.mastheadLineBar} />
            <div style={styles.mastheadLineBar} />
          </div>
          <h1 style={styles.mastheadTitle}>NEW YORK<br /><span style={styles.mastheadTitleRed}>SPORTS</span><span style={styles.mastheadTitleThin}> DAILY</span></h1>
          <div style={styles.mastheadLines}>
            <div style={styles.mastheadLineBar} />
            <div style={styles.mastheadLineBar} />
          </div>
        </div>
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
      <main style={styles.main}>

        {/* TAB NAV — Primary */}
        <div style={styles.tabNav}>
          {["SCORES","TV","STANDINGS","SCHEDULE","RECAP","NEWS","RADIO","SHOP"].map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              style={{...styles.tabBtn, ...(activeTab===tab ? styles.tabBtnActive : {}),
                ...(tab==="SHOP" ? {marginLeft:"auto", color:"#c8201c"} : {})}}>
              {tab === "SHOP" ? "🛒 SHOP" : tab}
            </button>
          ))}
        </div>
        {/* TAB NAV — Secondary */}
        <div style={{...styles.tabNav, marginTop:-16, borderBottom:"1px solid #1a1a1a", marginBottom:20}}>
          {["STATS","HISTORY","THIS DATE","NY EVENTS","HOF","AWARDS","FORGOTTEN","POLLS","MISERY","TRIVIA","XWORD","SONGS & SPIN"].map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              style={{...styles.tabBtn, ...(activeTab===tab ? styles.tabBtnActive : {}), fontSize:9, padding:"7px 10px"}}>
              {tab}
            </button>
          ))}
        </div>

        {/* ──── SCORES TAB ──── */}
        {activeTab === "SCORES" && (
          <div>
            {/* ── TOP SECTION: Featured Stories + Quote + Player Card ── */}
            <div style={{display:"flex", gap:12, marginBottom:14, alignItems:"stretch", flexWrap:"wrap"}}>

              {/* Left — Top 2 Featured News Stories */}
              <div style={{flex:3, minWidth:260, display:"flex", flexDirection:"column", gap:8}}>
                {(() => {
                const nyTeams = ["Yankees","Mets","Jets","Giants","Knicks","Nets","Rangers","Islanders","Devils","Liberty","NYCFC"];
                const nyStories = news.filter(n => nyTeams.includes(n.team) && n.title);
                // Prefer stories with images first, then fall back to any story
                const withImages = nyStories.filter(n => n.image);
                const featured = withImages.length >= 2 ? withImages.slice(0,2) : nyStories.slice(0,2);
                return featured.map((story, i) => (
                  <a key={i} href={story.link} target="_blank" rel="noopener noreferrer"
                    style={{textDecoration:"none", display:"flex", gap:10, padding:"10px 12px",
                      background: darkMode ? "#161616" : "#fff",
                      border: darkMode ? "1px solid #2a2a2a" : "1px solid #ddd",
                      borderLeft:"3px solid #c8201c", flex:1}}>
                    {story.image && (
                      <img src={story.image} alt="" style={{width:80, height:60, objectFit:"cover", flexShrink:0, borderRadius:2}} />
                    )}
                    <div style={{flex:1, minWidth:0}}>
                      <div style={{fontSize:8, fontWeight:900, color:"#c8201c", letterSpacing:"0.1em", marginBottom:3}}>
                        {story.team?.toUpperCase()} · {story.source}
                      </div>
                      <div style={{fontSize:12, fontWeight:700, color: darkMode ? "#e8e0d0" : "#111",
                        lineHeight:1.3, fontFamily:"'Georgia',serif",
                        overflow:"hidden", display:"-webkit-box", WebkitLineClamp:2, WebkitBoxOrient:"vertical"}}>
                        {story.title}
                      </div>
                      {story.desc && (
                        <div style={{fontSize:10, color: darkMode ? "#888" : "#666", marginTop:3, lineHeight:1.4,
                          overflow:"hidden", display:"-webkit-box", WebkitLineClamp:2, WebkitBoxOrient:"vertical"}}>
                          {story.desc}
                        </div>
                      )}
                    </div>
                  </a>
                ));
              })()}
              {news.filter(n => ["Yankees","Mets","Jets","Giants","Knicks","Nets","Rangers","Islanders","Devils","Liberty"].includes(n.team)).length === 0 && (
                <div style={{padding:"12px", background: darkMode?"#161616":"#fff", border:"1px solid #2a2a2a", fontSize:10, color:"#666"}}>
                  Loading top NY sports stories...
                </div>
              )}
              </div>

              {/* Center — Quote */}
              <div style={{flex:2, minWidth:180}}>
                <QuoteOfDay />
              </div>

              {/* Right — Player Spotlight card */}
              <div style={{flexShrink:0, width:190}}>
                <PlayerSpotlight />
              </div>
            </div>
            {/* ── Playoff tracker strip — uses standings data ── */}
            {standings && standings.length > 0 && (() => {
              const NY_TEAMS_TRACK = ["Yankees","Mets","Jets","Giants","Knicks","Nets","Rangers","Islanders","Devils","Liberty"];
              const nyStandings = standings.filter(s =>
                NY_TEAMS_TRACK.some(t => (s.team||"").includes(t))
              ).slice(0, 6);
              if (!nyStandings.length) return null;
              return (
                <div style={{display:"flex", gap:6, flexWrap:"wrap", marginBottom:12, padding:"8px 12px", background:"#111", border:"1px solid #1a1a1a"}}>
                  <span style={{fontSize:8, fontWeight:900, color:"#555", letterSpacing:"0.15em", alignSelf:"center", flexShrink:0}}>📊 NY STANDINGS:</span>
                  {nyStandings.map((s, i) => (
                    <div key={i} style={{display:"flex", gap:4, alignItems:"center", fontSize:10, color:"#bbb"}}>
                      <span style={{fontWeight:700, color:"#e8e0d0"}}>{s.team?.split(" ").pop()}</span>
                      <span style={{color:"#888"}}>{s.wins}-{s.losses}</span>
                      {s.gamesBehind && s.gamesBehind !== "0" && s.gamesBehind !== "-" &&
                        <span style={{color:"#c8201c", fontSize:9}}>{s.gamesBehind}GB</span>
                      }
                      {i < nyStandings.length-1 && <span style={{color:"#333", marginLeft:2}}>·</span>}
                    </div>
                  ))}
                </div>
              );
            })()}
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
            </div>

            <div style={styles.scoresNewsLayout}>
              {/* Scores column */}
              <div style={styles.scoresCol}>
                {loadingScores ? (
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
        {/* ──── THIS DATE · TRIVIA TAB ──── */}
        {activeTab === "TRIVIA" && (
          <TriviaTab />
        )}
        {/* ──── CROSSWORD TAB ──── */}
        {activeTab === "RADIO" && (
          <RadioTab />
        )}
        {activeTab === "XWORD" && (
          <CrosswordTab />
        )}
        {/* ──── SPIN TAB ──── */}
        {activeTab === "SONGS & SPIN" && (
          <SpinTab />
        )}
        {/* ──── SHOP TAB ──── */}
        {activeTab === "SHOP" && (
          <ShopTab />
        )}
      </main>

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

function ScoreCard({ game }) {
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
    <div style={{...styles.scoreCard, ...(isNY ? styles.scoreCardNY : {})}}>
      {isNY && <div style={styles.nyBadge}>NY</div>}
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
  const teamColor = item.team ? (TEAM_COLORS[item.team] || "#c8201c") : "#c8201c";
  const sportEmoji = { MLB:"⚾", NFL:"🏈", NBA:"🏀", NHL:"🏒", WNBA:"🏀", MLS:"⚽", NWSL:"⚽" }[item.sport] || "📰";
  const domain = getSourceDomain(item);
  const hasLink = isValidLink(item.link);
  const cardBg   = dark ? "#141414" : "#ffffff";
  const titleClr = dark ? "#ffffff"  : "#111111";
  const descClr  = dark ? "#aaaaaa"  : "#555555";
  const borderClr= dark ? "#2e2e2e"  : "#e0e0e0";
  return (
    <a href={hasLink ? item.link : "#"} target={hasLink ? "_blank" : "_self"} rel="noopener noreferrer"
      style={{...styles.newsFeatured, background:cardBg, border:`1px solid ${borderClr}`,
        cursor: hasLink ? "pointer" : "default", boxShadow: dark ? "0 2px 8px rgba(0,0,0,0.6)" : "0 1px 4px rgba(0,0,0,0.1)"}}>
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
    if (filter === "NY" && !isNY) return false;
    if (["Red Bulls","NYCFC","Gotham FC"].includes(item.team) && filter === "NY") {
      const t = (item.title||"").toLowerCase();
      if (!t.includes("red bull") && !t.includes("nycfc") && !t.includes("new york city fc") && !t.includes("gotham")) return false;
    }
    if (sport !== "ALL") {
      const sportKws = SPORT_KEYWORDS[sport] || [];
      if (!sportKws.some(kw => combined.includes(kw))) return false;
    }
    if (teamFilter !== "ALL") {
      if (item.team === teamFilter) return true;
      if (item.source?.includes(teamFilter)) return true;
      return false;
    }
    if (sourceFilter !== "ALL") {
      const src = (item.source||"").toLowerCase();
      if (sourceFilter === "ESPN"        && !src.includes("espn"))         return false;
      if (sourceFilter === "NY POST"     && !src.includes("ny post"))      return false;
      if (sourceFilter === "GOOGLE NEWS" && !src.includes("google news"))  return false;
      if (sourceFilter === "REDDIT"      && !src.includes("reddit"))       return false;
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
    { keywords:["spin","songs","walk up","walkup","music","facts","random"], tab:"SONGS & SPIN",      icon:"🎰", title:"Songs & Spin",                sub:"Random NY sports facts" },
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
  const [loadingYesterday, setLoadingYesterday]   = useState(true);

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

  const NY_NAMES = ["yankees","mets","jets","giants","knicks","nets","rangers","islanders","devils","liberty","nycfc","gotham","red bulls"];

  // Strict NY filter — must contain an actual NY team name, not just TX Rangers or SF Giants
  const NY_EXCLUSIONS = ["texas rangers","texas ","sf giants","san francisco giants","kansas city","royals","houston","seattle mariners","boston red","minnesota twins","toronto blue","chicago white","cleveland","detroit","tampa bay","baltimore orioles","oakland","los angeles angels"];

  const yesterdayNYGames = yesterdayScores.filter(s => {
    const teams = `${s.homeTeam||""} ${s.awayTeam||""}`.toLowerCase();
    // Must have an NY team
    const hasNY = NY_NAMES.some(n => teams.includes(n));
    // Must NOT be a non-NY game that accidentally matches (e.g. Texas Rangers)
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

  return (
    <div style={styles.statsRoot}>
      <div style={styles.stdHeader}>
        <h2 style={styles.stdTitle}>📺 LAST NIGHT'S RECAP</h2>
        <p style={styles.stdSub}>{yDate.toUpperCase()} · NY SPORTS RESULTS · VIDEO HIGHLIGHTS</p>
      </div>

      {/* Yesterday's NY scores with box score links */}
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
            return (
              <div key={i} style={{display:"flex", alignItems:"center", justifyContent:"space-between",
                padding:"10px 14px", borderBottom:"1px solid #1a1a1a",
                background: i%2===0 ? "#0e0e0e" : "#111", flexWrap:"wrap", gap:8}}>
                <div style={{display:"flex", alignItems:"center", gap:10, flex:1, minWidth:200}}>
                  <span style={{fontSize:9, color:"#c8201c", fontWeight:900, letterSpacing:"0.1em"}}>[{g.sport}]</span>
                  <span style={{fontSize:13, fontWeight: awayWin ? 900 : 400, color: awayWin ? "#fff" : "#aaa", fontFamily:"'Georgia',serif"}}>{g.awayTeam}</span>
                  <span style={{fontSize:15, fontWeight:900, color:"#e8e0d0", minWidth:60, textAlign:"center"}}>
                    {g.awayScore ?? "—"} — {g.homeScore ?? "—"}
                  </span>
                  <span style={{fontSize:13, fontWeight: homeWin ? 900 : 400, color: homeWin ? "#fff" : "#aaa", fontFamily:"'Georgia',serif"}}>{g.homeTeam}</span>
                  {g.statusDesc && <span style={{fontSize:9, color:"#666", marginLeft:4}}>{g.statusDesc}</span>}
                </div>
                <a href={boxScoreUrl} target="_blank" rel="noopener noreferrer"
                  style={{...styles.histLink, fontSize:9, flexShrink:0}}>📊 BOX SCORE →</a>
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

      {/* Tomorrow's NY games */}
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
        if (!tmrGames.length) return (
          <p style={{fontSize:12, color:"#555", padding:"8px 0"}}>No NY games scheduled for tomorrow yet — check the SCHEDULE tab.</p>
        );
        return tmrGames.map((g, i) => (
          <div key={i} style={{...styles.recapScoreRow, ...(i%2===0?{}:{background:"#0f0f0f"})}}>
            <div style={styles.recapTeams}>
              <span style={styles.recapSport}>[{g.sport}]</span>
              <span style={styles.recapAway}>{g.awayTeam}</span>
              <span style={{...styles.recapScore, color:"#888"}}>vs</span>
              <span style={styles.recapHome}>{g.homeTeam}</span>
            </div>
            {g.broadcasts?.length > 0 && (
              <span style={styles.recapStatus}>📺 {g.broadcasts.join(", ")}</span>
            )}
          </div>
        ));
      })()}
    </div>
  );
}

// ─── NY ICONIC EVENTS TAB ─────────────────────────────────────────────────
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
  // WEEK 1-8: GOAT BY TEAM
  { id:"goat_yankee",       question:"Who is the greatest Yankee of all time?",                        options:["Babe Ruth","Lou Gehrig","Mickey Mantle","Joe DiMaggio","Derek Jeter"] },
  { id:"goat_met",          question:"Who is the greatest Met of all time?",                           options:["Tom Seaver","Mike Piazza","Dwight Gooden","David Wright","Pete Alonso"] },
  { id:"goat_knick",        question:"Who is the greatest Knick of all time?",                         options:["Patrick Ewing","Walt Frazier","Willis Reed","Carmelo Anthony","Jalen Brunson"] },
  { id:"goat_jet",          question:"Who is the greatest Jet of all time?",                           options:["Joe Namath","Curtis Martin","Don Maynard","Darrelle Revis","Mark Gastineau"] },
  { id:"goat_giant",        question:"Who is the greatest Giant of all time?",                         options:["Lawrence Taylor","Eli Manning","Frank Gifford","Phil Simms","Michael Strahan"] },
  { id:"goat_ranger",       question:"Who is the greatest Ranger of all time?",                        options:["Mark Messier","Brian Leetch","Rod Gilbert","Mike Richter","Henrik Lundqvist"] },
  { id:"goat_islander",     question:"Who is the greatest Islander of all time?",                      options:["Bryan Trottier","Mike Bossy","Denis Potvin","Billy Smith","John Tavares"] },
  { id:"goat_devil",        question:"Who is the greatest Devil of all time?",                         options:["Martin Brodeur","Scott Stevens","Patrik Elias","Scott Niedermayer","Ken Daneyko"] },
  // WEEK 9-16: MOMENTS & VENUES
  { id:"best_moment",       question:"Greatest NY sports moment ever?",                                options:["1969 Mets WS","Namath Guarantee","Rangers 1994 Cup","Helmet Catch","Piazza 9/11 HR"] },
  { id:"best_stadium",      question:"Best NY sports venue?",                                          options:["Yankee Stadium","Madison Square Garden","MetLife Stadium","Citi Field","UBS Arena"] },
  { id:"misery_leader",     question:"Which NY team makes you suffer the most?",                       options:["Jets","Mets","Knicks","Islanders","Rangers"] },
  { id:"mt_rushmore",       question:"NY Sports Mt. Rushmore — who's on it?",                         options:["Ruth/Namath/LT/Messier","Jeter/Ewing/Messier/LT","Ruth/DiMaggio/Namath/Ewing","Mantle/Seaver/Reed/Bossy"] },
  { id:"best_rivalry",      question:"Best NY sports rivalry?",                                        options:["Yankees vs Red Sox","Rangers vs Devils","Knicks vs Heat (90s)","Jets vs Patriots","Mets vs Phillies"] },
  { id:"best_choke",        question:"Most painful NY sports collapse?",                               options:["2004 ALCS (Yankees blew 3-0)","2007 Mets (7-game September collapse)","2015 Mets World Series","2019 Yankees ALCS"] },
  { id:"best_dynasty",      question:"Greatest NY dynasty?",                                           options:["Yankees (any era)","Islanders 1980-83","Knicks early 70s","Devils 1995-2003","Liberty 2024-25"] },
  { id:"best_single_season",question:"Greatest single NY team season?",                                options:["1927 Yankees","1986 Mets","1998 Yankees","1969 Mets","1970 Knicks"] },
  // WEEK 17-24: POSITIONS & INDIVIDUALS
  { id:"best_qb",           question:"Best NY quarterback ever?",                                      options:["Joe Namath","Eli Manning","Phil Simms","Y.A. Tittle"] },
  { id:"best_pitcher",      question:"Best NY pitcher of all time?",                                   options:["Tom Seaver","Whitey Ford","Dwight Gooden","Mariano Rivera","Jacob deGrom"] },
  { id:"best_coach",        question:"Greatest NY coach/manager ever?",                                options:["Casey Stengel","Bill Parcells","Red Holzman","Al Arbour","Joe Torre"] },
  { id:"best_nickname",     question:"Best NY sports nickname?",                                       options:["Mr. October","The Captain","Broadway Joe","LT","Doc","The Pearl"] },
  { id:"goat_overall",      question:"The single greatest NY athlete ever?",                           options:["Babe Ruth","Lawrence Taylor","Willis Reed","Mark Messier","Tom Seaver"] },
  { id:"best_broadcaster",  question:"Best NY sports broadcaster ever?",                               options:["Bob Murphy","Phil Rizzuto","Marv Albert","Mike Breen","Gary Cohen"] },
  { id:"best_walkup",       question:"Best NY sports entrance/walk-up moment?",                        options:["Enter Sandman (Rivera)","Jeter's intro at the Stadium","MSG Rangers goal song","Mets Piazza at-bats"] },
  { id:"best_owner",        question:"Most impactful NY sports owner?",                                options:["George Steinbrenner","Steve Cohen","James Dolan (complicated)","Charles Wang"] },
  // WEEK 25-32: DEEP DEBATES
  { id:"seaver_gooden",     question:"Better career as a Met — Seaver or Gooden?",                    options:["Tom Seaver — no question","Doc Gooden — peak was higher","Too close to call"] },
  { id:"mets_1969_1986",    question:"Better Mets team — 1969 or 1986?",                              options:["1969 — the miracle makes it","1986 — best team top to bottom","Both equally legendary"] },
  { id:"best_trade_ever",   question:"Best trade in NY sports history?",                               options:["Yankees acquire Babe Ruth (1920)","Piazza trade to Mets (1998)","Jason Kidd to Nets (2001)","Messier trade to Rangers (1991)"] },
  { id:"worst_trade_ever",  question:"Worst trade/transaction in NY sports history?",                  options:["Red Sox sell Ruth to Yankees","Islanders let Tavares walk","DiPietro 15-year contract","Ewing traded to Seattle"] },
  { id:"best_game_ever",    question:"Single greatest game in NY sports history?",                     options:["1994 Rangers Cup Game 7","1986 WS Game 6 (Mookie/Buckner)","Super Bowl XLII (Helmet Catch)","1969 WS Game 5 (Koosman)","1973 Belmont (Secretariat)"] },
  { id:"best_individual",   question:"Greatest single individual performance in NY sports?",           options:["Reggie 3 HRs consecutive pitches (1977)","Messier hat trick guarantee (1994)","Simms 22/25 in SB XXI","Secretariat 31 lengths (1973)","Seaver 19 Ks including 10 straight (1970)"] },
  { id:"subway_series",     question:"Who wins the all-time Subway Series?",                          options:["Yankees — no contest","Mets — heart over history","Too close to call"] },
  { id:"most_lovable_loser",question:"Most lovable NY team despite the suffering?",                    options:["The Jets — forever hopeful","The Knicks — MSG still rocks","The Mets — Ya Gotta Believe","The Islanders — loyal Long Island"] },
  // WEEK 33-40: FUN & CULTURE
  { id:"best_chant",        question:"Best NY sports chant or song?",                                 options:["Enter Sandman (Yankees)","Let's Go Mets","Let's Go Rangers","DE-FENSE (Knicks/Giants)","1940! (Rangers fans to taunt them)"] },
  { id:"best_jersey",       question:"Best NY sports jersey ever designed?",                           options:["Yankees pinstripes","Mets '86 home blues","Rangers white with crest","Knicks blue and orange","Giants blue"] },
  { id:"best_borough",      question:"Best borough for NY sports fans?",                               options:["The Bronx — Yankee country","Queens — Mets and US Open","Brooklyn — Nets and nostalgia","Manhattan — MSG rules","Long Island — Islanders diehards"] },
  { id:"best_comeback",     question:"Greatest comeback in NY sports history?",                        options:["1978 Yankees (14 games back in July)","1969 Mets (100-1 shots)","Giants beating 18-0 Patriots (SB XLII)","Knicks 1999 8-seed Finals run","Rangers from 3-2 down vs Devils (1994)"] },
  { id:"next_championship", question:"Which NY team wins the NEXT championship?",                     options:["Yankees","Mets","Knicks","Rangers","Liberty","Devils","Giants","Jets"] },
  { id:"best_moment_you_witnessed", question:"Which NY moment do you most wish you'd seen live?",    options:["Secretariat's Belmont (1973)","Rangers win Cup (1994)","Miracle Mets clinch (1969)","Namath's guarantee game (1969)","Reggie's 3 HRs (1977 WS)"] },
  { id:"goat_hitter",       question:"Greatest pure hitter to play in New York?",                     options:["Babe Ruth","Joe DiMaggio","Mickey Mantle","Mike Piazza","Derek Jeter"] },
  { id:"goat_defender",     question:"Greatest defensive player in NY sports history?",               options:["Lawrence Taylor (Giants)","Willis Reed (Knicks)","Martin Brodeur (Devils)","Denis Potvin (Islanders)","Darrelle Revis (Jets)"] },
  // WEEK 41-48: ICONIC NY EVENTS
  { id:"us_open_best_match",question:"Greatest US Open Tennis moment at Flushing Meadows?",           options:["Connors 1991 run at age 39","Serena's first title at 17 (1999)","Arthur Ashe wins first Open Era (1968)","Sampras final career slam (2002)"] },
  { id:"bethpage_best",     question:"Best major golf at Bethpage Black?",                            options:["Tiger 2002 — only one under par","Koepka PGA 2019 — brutally dominated","Ryder Cup crowd energy 2025","Lucas Glover dramatic win 2009"] },
  { id:"belmont_best",      question:"Greatest Belmont Stakes moment?",                               options:["Secretariat 31 lengths (1973)","American Pharoah ends 37-year drought (2015)","Affirmed vs Alydar thriller (1978)","Seattle Slew stays undefeated (1977)"] },
  { id:"shinnecock_best",   question:"Best US Open Golf at Shinnecock Hills?",                        options:["Corey Pavin's 4-wood to 18th (1995)","Retief Goosen dominates (2004)","Brooks Koepka wins at +1 (2018)","2026 — the next chapter"] },
  { id:"goat_tennis",       question:"Greatest US Open tennis champion overall?",                     options:["Serena Williams (6 titles)","Jimmy Connors (5 titles, 3 surfaces)","Pete Sampras (5 titles)","Chris Evert (6 titles)","Roger Federer (5 titles)"] },
  { id:"goat_golf_ny",      question:"Best golfer to play NY's US Open courses?",                     options:["Tiger Woods (Bethpage 2002)","Jack Nicklaus (multiple Open finals)","Bryson DeChambeau (Winged Foot 2020)","Brooks Koepka (Shinnecock 2018)"] },
  { id:"belmont_triple",    question:"Most dominant Triple Crown performance?",                        options:["Secretariat 1973 — 31 lengths","Seattle Slew 1977 — undefeated","Affirmed 1978 — beat Alydar every race","American Pharoah 2015 — ended the drought"] },
  { id:"best_ny_sports_year",question:"Best single year in NY sports history?",                       options:["1969 (Mets WS + Jets SB win)","1994 (Rangers Cup)","1998-2000 (Yankees dynasty peak)","1980-83 (Islanders 4 Cups)","1986 (Mets WS + Giants Super Bowl run)"] },
  // WEEK 49-52: YEAR-END BIG ONES
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
    // Yankees
    { name:"Tommy John",       team:"Yankees", era:"1979–1982,1986–1989", emoji:"⚾", why:"The man who gave pitchers a second life. Tommy John surgery is named after him. Went 21-9 as a Yankee in 1979.", wiki:"https://en.wikipedia.org/wiki/Tommy_John" },
    { name:"Dave Righetti",    team:"Yankees", era:"1979–1990", emoji:"⚾", why:"No-hit the Red Sox on July 4, 1983. Led the AL in saves in 1986 with 46. The bridge between dynasty eras.", wiki:"https://en.wikipedia.org/wiki/Dave_Righetti" },
    { name:"Willie Randolph",  team:"Yankees", era:"1976–1988", emoji:"⚾", why:"The heartbeat of the late-70s Yankees dynasty. Six All-Star selections, four World Series. Criminally overlooked for the Hall.", wiki:"https://en.wikipedia.org/wiki/Willie_Randolph" },
    { name:"Ron Guidry",       team:"Yankees", era:"1975–1988", emoji:"⚾", why:"25-3 in 1978 — one of the most dominant single seasons by any pitcher ever. Louisiana Lightning.", wiki:"https://en.wikipedia.org/wiki/Ron_Guidry" },
    { name:"Chris Chambliss",  team:"Yankees", era:"1974–1979", emoji:"⚾", why:"His pennant-clinching home run off Mark Littell in 1976 is one of the most electrifying moments in Yankees playoff history.", wiki:"https://en.wikipedia.org/wiki/Chris_Chambliss" },
    // Mets
    { name:"John Olerud",      team:"Mets",    era:"1997–1999", emoji:"⚾", why:"Hit .354 in 1998 — the best batting average by a Met since Cleon Jones in 1969. A complete player who deserved more recognition.", wiki:"https://en.wikipedia.org/wiki/John_Olerud" },
    { name:"Cleon Jones",      team:"Mets",    era:"1963–1975", emoji:"⚾", why:"Hit .340 in 1969 as the Mets won it all. Caught the final out of the 1969 World Series. Career New York Met.", wiki:"https://en.wikipedia.org/wiki/Cleon_Jones" },
    { name:"Al Leiter",        team:"Mets",    era:"1998–2004", emoji:"⚾", why:"The 2000 Subway Series ace. His two-out 9th inning against the Cubs in the 1999 wild card game remains one of the best single-game pitching performances in Mets history.", wiki:"https://en.wikipedia.org/wiki/Al_Leiter" },
    { name:"John Franco",      team:"Mets",    era:"1990–2001", emoji:"⚾", why:"All-time NL saves leader when he retired. A Queens kid who grew up rooting for the Mets and became their closer for a decade.", wiki:"https://en.wikipedia.org/wiki/John_Franco" },
    { name:"Edgardo Alfonzo",  team:"Mets",    era:"1995–2002", emoji:"⚾", why:"Hit .324 in 2000 with 25 HR. Perhaps the best all-around Mets player of the late 1990s. Maestro at 2B and 3B.", wiki:"https://en.wikipedia.org/wiki/Edgardo_Alfonzo" },
    { name:"Lenny Dykstra",    team:"Mets",    era:"1985–1989", emoji:"⚾", why:"Nails — the scrappiest lead-off hitter of his era. His single in Game 3 of the 1986 NLCS vs the Astros changed the series.", wiki:"https://en.wikipedia.org/wiki/Lenny_Dykstra" },
    // Jets/Giants
    { name:"Wesley Walker",    team:"Jets",    era:"1977–1989", emoji:"🏈", why:"Legally blind in one eye — yet one of the most dangerous deep threats in NFL history. Part of the 1986 AFC Championship run.", wiki:"https://en.wikipedia.org/wiki/Wesley_Walker" },
    { name:"Otis Anderson",    team:"Giants",  era:"1986–1992", emoji:"🏈", why:"Super Bowl XXV MVP at age 34. Rushed for 102 yards. The unsung hero of the Giants' second championship.", wiki:"https://en.wikipedia.org/wiki/Ottis_Anderson" },
    { name:"Brad Van Pelt",    team:"Giants",  era:"1973–1983", emoji:"🏈", why:"Five straight Pro Bowls as a Giant. The unrecognized defensive leader who kept the franchise alive through a dark decade before LT and Parcells.", wiki:"https://en.wikipedia.org/wiki/Brad_Van_Pelt" },
    { name:"Joe Klecko",       team:"Jets",    era:"1977–1987", emoji:"🏈", why:"The only player in NFL history to be named to the Pro Bowl at three different positions — DE, DT, and NT. Heart of the NY Sack Exchange.", wiki:"https://en.wikipedia.org/wiki/Joe_Klecko" },
    { name:"Freeman McNeil",   team:"Jets",    era:"1981–1992", emoji:"🏈", why:"Led the NFL in rushing in 1982. A quiet, durable back who was the Jets' best offensive player through a decade of mediocrity.", wiki:"https://en.wikipedia.org/wiki/Freeman_McNeil" },
    // Knicks
    { name:"Dick Barnett",     team:"Knicks",  era:"1965–1974", emoji:"🏀", why:"'Fall back, baby!' Two championships. An elegant shooter who anchored the backcourt alongside Frazier. Underappreciated champion.", wiki:"https://en.wikipedia.org/wiki/Dick_Barnett" },
    { name:"Bernard King",     team:"Knicks",  era:"1982–1987", emoji:"🏀", why:"Scored 60 points at Madison Square Garden in 1984. Before knee injuries, he was as unstoppable as anyone in the NBA — a pure scorer.", wiki:"https://en.wikipedia.org/wiki/Bernard_King" },
    { name:"Kerry Kittles",    team:"Nets",    era:"1996–2004", emoji:"🏀", why:"The building block of the Jason Kidd Finals teams. His smooth shooting and relentless defense made the Nets dangerous.", wiki:"https://en.wikipedia.org/wiki/Kerry_Kittles" },
    { name:"Micheal Ray Richardson", team:"Knicks", era:"1978–1982", emoji:"🏀", why:"One of the most gifted players the Knicks ever had. His 'The ship be sinking' quote is iconic. Addiction robbed the game of something special.", wiki:"https://en.wikipedia.org/wiki/Micheal_Ray_Richardson" },
    // Rangers/Islanders/Devils
    { name:"Rod Gilbert",      team:"Rangers", era:"1960–1978", emoji:"🏒", why:"All-time Rangers scoring leader for decades. Overcame serious back surgery to become the franchise icon. First Ranger to have his number retired.", wiki:"https://en.wikipedia.org/wiki/Rod_Gilbert" },
    { name:"Ed Giacomin",      team:"Rangers", era:"1965–1975", emoji:"🏒", why:"Fast Eddie — goaltender who played with such personality MSG named the ice after him conceptually. HOF career, beloved in NY.", wiki:"https://en.wikipedia.org/wiki/Ed_Giacomin" },
    { name:"Bob Nystrom",      team:"Islanders",era:"1972–1986",emoji:"🏒", why:"Scored the OT goal that won the Islanders' first Stanley Cup in 1980. As beloved in Nassau County as any player in franchise history.", wiki:"https://en.wikipedia.org/wiki/Bob_Nystrom" },
    { name:"Butch Goring",     team:"Islanders",era:"1980–1985",emoji:"🏒", why:"The missing piece. Acquired mid-season 1980, he was the Conn Smythe winner that year and the defensive forward who made the dynasty work.", wiki:"https://en.wikipedia.org/wiki/Butch_Goring" },
    { name:"Patrik Elias",     team:"Devils",  era:"1994–2016", emoji:"🏒", why:"The all-time leading scorer in Devils history who played his entire career in New Jersey — quietly building one of the great NHL careers.", wiki:"https://en.wikipedia.org/wiki/Patrik_Elias" },
    { name:"Ken Daneyko",      team:"Devils",  era:"1983–2003", emoji:"🏒", why:"Mr. Devil — played all 1,283 NHL games in a Devils uniform. Three Cups. The soul of New Jersey hockey for 20 years.", wiki:"https://en.wikipedia.org/wiki/Ken_Daneyko" },
    // US Open / Golf / Racing
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
    MLB:  { sport:"baseball",   league:"mlb"  },
    NFL:  { sport:"football",   league:"nfl"  },
    NBA:  { sport:"basketball", league:"nba"  },
    NHL:  { sport:"hockey",     league:"nhl"  },
    WNBA: { sport:"basketball", league:"wnba" },
  };

  useEffect(() => {
    if (activeSection !== "LEADERS") return;
    setLoadingLeaders(true);
    setLiveLeaders([]);
    const lm = LEAGUE_MAP[activeLeague];
    if (lm) {
      fetchLeagueLeaders(lm.sport, lm.league).then(cats => {
        setLiveLeaders(cats);
        setLoadingLeaders(false);
      });
    } else {
      setLoadingLeaders(false);
    }
  }, [activeSection, activeLeague]);

  const NY_TEAMS_DATA = {
    Yankees:   { color:"#003087", emoji:"⚾", site:"https://www.mlb.com/yankees",   ref:"https://www.baseball-reference.com/teams/NYY/",   league:"MLB" },
    Mets:      { color:"#002D72", emoji:"⚾", site:"https://www.mlb.com/mets",      ref:"https://www.baseball-reference.com/teams/NYM/",   league:"MLB" },
    Jets:      { color:"#125740", emoji:"🏈", site:"https://www.newyorkjets.com",   ref:"https://www.pro-football-reference.com/teams/nyj/",league:"NFL" },
    Giants:    { color:"#0B2265", emoji:"🏈", site:"https://www.giants.com",        ref:"https://www.pro-football-reference.com/teams/nyg/",league:"NFL" },
    Knicks:    { color:"#006BB6", emoji:"🏀", site:"https://www.nba.com/knicks",    ref:"https://www.basketball-reference.com/teams/NYK/", league:"NBA" },
    Nets:      { color:"#000000", emoji:"🏀", site:"https://www.nba.com/nets",      ref:"https://www.basketball-reference.com/teams/BRK/", league:"NBA" },
    Rangers:   { color:"#0038A8", emoji:"🏒", site:"https://www.nhl.com/rangers",   ref:"https://www.hockey-reference.com/teams/NYR/",    league:"NHL" },
    Islanders: { color:"#00539B", emoji:"🏒", site:"https://www.nhl.com/islanders", ref:"https://www.hockey-reference.com/teams/NYI/",    league:"NHL" },
    Devils:    { color:"#CE1126", emoji:"🏒", site:"https://www.nhl.com/devils",    ref:"https://www.hockey-reference.com/teams/NJD/",    league:"NHL" },
    Liberty:   { color:"#007A5E", emoji:"🏀", site:"https://www.nyliberty.com",     ref:"https://www.basketball-reference.com/wnba/teams/NYL/", league:"WNBA" },
    NYCFC:     { color:"#6CACE4", emoji:"⚽", site:"https://www.nycfc.com",         ref:"https://fbref.com/en/squads/",                   league:"MLS" },
    "Red Bulls":{ color:"#ED1C2E",emoji:"⚽", site:"https://www.rbny.com",          ref:"https://fbref.com/en/squads/",                   league:"MLS" },
    "Gotham FC":{ color:"#0A0A2E",emoji:"⚽", site:"https://www.gothamfc.com",      ref:"https://fbref.com/en/squads/",                   league:"NWSL" },
  };

  const DROUGHT_DATA = [
    { team:"Mets",      last:1986, sport:"MLB",  note:"39 years and counting" },
    { team:"Jets",      last:1969, sport:"NFL",  note:"56 years — longest in NFL" },
    { team:"Giants",    last:2012, sport:"NFL",  note:"13 years" },
    { team:"Knicks",    last:1973, sport:"NBA",  note:"52 years of heartbreak" },
    { team:"Nets",      last:null, sport:"NBA",  note:"Never won a championship" },
    { team:"Rangers",   last:1994, sport:"NHL",  note:"31 years" },
    { team:"Islanders", last:1983, sport:"NHL",  note:"42 years since dynasty ended" },
    { team:"Devils",    last:2003, sport:"NHL",  note:"22 years — 3 Cups in 9 years (1995, 2000, 2003)" },
    { team:"Yankees",   last:2009, sport:"MLB",  note:"16 years" },
    { team:"Liberty",   last:2025, sport:"WNBA", note:"Defending champions! 🏆" },
    { team:"NYCFC",     last:2021, sport:"MLS",  note:"4 years" },
  ].sort((a,b) => (a.last||0) - (b.last||0));

  const DRAFT_DATA = {
    Yankees: [
      { year:1965, pick:"#1",  name:"Ron Blomberg",    note:"Became the first designated hitter in MLB history on April 6, 1973" },
      { year:1991, pick:"#1",  name:"Brien Taylor",    note:"$1.55M bonus — largest ever at the time. Blew out shoulder in bar fight. Never played an MLB game." },
      { year:1999, pick:"#1",  name:"David Walling",   note:"Never reached majors — one of many forgettable #1s in the Steinbrenner era" },
      { year:2005, pick:"#1",  name:"C.C. Lee",        note:"Never made impact — Yankees drafted better in later rounds" },
      { year:2009, pick:"#28", name:"Gary Sanchez",    note:"16th round international signing — became a 3x All-Star and key part of the 2009 dynasty" },
      { year:2010, pick:"#17", name:"Cito Culver",     note:"Highly touted shortstop — never cracked the majors" },
      { year:2013, pick:"#32", name:"Aaron Judge",     note:"Best pick in Yankees draft history. 2017 AL ROY, 2022 MVP, 62 HR season. The next Yankee icon." },
      { year:2016, pick:"#1",  name:"Blake Rutherford",note:"Traded to White Sox in 2017 — never became the star Yankees hoped for" },
      { year:2017, pick:"#16", name:"Clarke Schmidt",  note:"Solid rotation piece — part of the young Yankees core" },
      { year:2019, pick:"#10", name:"Anthony Volpe",   note:"Current starting SS — Yankees shortstop of the future who arrived ahead of schedule" },
    ],
    Mets: [
      { year:1966, pick:"#1",  name:"Les Rohr",        note:"First overall pick — went 3-3 in career, never fulfilled potential" },
      { year:1973, pick:"#1",  name:"John Stearns",    note:"4x All-Star catcher — one of the Mets' better #1 picks" },
      { year:1984, pick:"#1",  name:"Shawn Abner",     note:"Traded for Kevin McReynolds — decent trade but Abner was a bust" },
      { year:1994, pick:"#1",  name:"Paul Wilson",     note:"Part of the 'Generation K' that was supposed to be historic — injuries derailed it" },
      { year:1999, pick:"#1",  name:"Jason Vargas",    note:"Solid starter but not the star the Mets needed" },
      { year:2001, pick:"#1",  name:"Aaron Heilman",   note:"Better as reliever than starter — 100+ save career in parts" },
      { year:2004, pick:"#1",  name:"Philip Humber",   note:"Threw a perfect game for the White Sox in 2012 — Mets fans still sigh" },
      { year:2006, pick:"#1",  name:"Mike Pelfrey",    note:"Solid starter — made Opening Day roster, wins in double digits" },
      { year:2011, pick:"#1",  name:"Brandon Nimmo",   note:"Best Mets #1 pick in years — All-Star caliber outfielder and true fan favorite" },
      { year:2019, pick:"#1",  name:"Brett Baty",      note:"Current Mets 3B — part of rebuild core" },
      { year:2021, pick:"#1",  name:"Kumar Rocker",    note:"Declined to sign — re-entered draft 2022 and went to Texas" },
    ],
    Jets: [
      { year:1965, pick:"#1",  name:"Joe Namath",      note:"Changed football forever. $427K contract broke the sport. Super Bowl III guarantee. The greatest Jet ever." },
      { year:1969, pick:"#1",  name:"Dave Foley",      note:"Solid offensive lineman — part of the post-Namath rebuild" },
      { year:1976, pick:"#1",  name:"Richard Todd",    note:"Namath's successor — led Jets to 1982 AFC Championship game" },
      { year:1983, pick:"#24", name:"Ken O'Brien",     note:"Solid QB but taken one spot before Dan Marino. The Jets' great what-if." },
      { year:1984, pick:"#1",  name:"Russell Carter",  note:"DB who never lived up to first-round billing" },
      { year:1995, pick:"#1",  name:"Hugh Douglas",    note:"Traded immediately — became a Pro Bowl DE for the Eagles. Jets got Kyle Brady." },
      { year:2009, pick:"#5",  name:"Mark Sanchez",    note:"Led back-to-back AFC Championship runs. 2009-10 playoff magic defined his legacy." },
      { year:2013, pick:"#9",  name:"Dee Milliner",    note:"CB bust — injuries derailed promising career" },
      { year:2018, pick:"#3",  name:"Sam Darnold",     note:"Never overcame the supporting cast — traded to Carolina 2021" },
      { year:2021, pick:"#2",  name:"Zach Wilson",     note:"BYU product who could not translate college success to the NFL. Released 2023." },
      { year:2022, pick:"#4",  name:"Ahmad Gardner",   note:"Sauce — immediate Pro Bowler and one of the best CBs in the game" },
      { year:2023, pick:"#13", name:"Will McDonald IV", note:"Pass rusher developing in the Jets defense" },
      { year:2025, pick:"#13", name:"Armand Membou",   note:"Missouri OT — Jets address the offensive line in 2025 draft" },
      { year:2026, pick:"#7",  name:"David Bailey",    note:"2026 first round pick — Jets continue their rebuild under new regime" },
    ],
    Giants: [
      { year:1958, pick:"#1",  name:"Lee Grosscup",    note:"QB bust — but the Giants were a dynasty without him" },
      { year:1965, pick:"#1",  name:"Tucker Frederickson", note:"RB who had solid but injury-plagued career" },
      { year:1979, pick:"#1",  name:"Phil Simms",       note:"Booed on draft day by Giants fans. Won Super Bowl XXI MVP with 88% completion rate. Redemption." },
      { year:1981, pick:"#2",  name:"Lawrence Taylor",  note:"The greatest defensive player in NFL history. Period. Changed the game forever." },
      { year:1987, pick:"#1",  name:"Reggie White",     note:"Giants passed on Reggie White — he went to Eagles. Greatest miss in franchise history." },
      { year:1992, pick:"#1",  name:"Derek Brown",      note:"TE bust — career ended early due to injuries" },
      { year:2000, pick:"#1",  name:"Ron Dayne",        note:"Heisman Trophy winner — never replicated college success in the NFL" },
      { year:2004, pick:"#4",  name:"Eli Manning",      note:"Traded from San Diego for Philip Rivers. Won 2 Super Bowls. Worth every bit of it." },
      { year:2018, pick:"#2",  name:"Saquon Barkley",   note:"Most electrifying offensive talent in years — lost to Eagles as a free agent" },
      { year:2019, pick:"#6",  name:"Daniel Jones",     note:"Showed promise but never reached franchise QB level" },
      { year:2022, pick:"#5",  name:"Kayvon Thibodeaux",note:"Oregon DE — developing into the pass rusher Giants hoped for" },
      { year:2025, pick:"#3",  name:"Abdul Carter",     note:"Penn State LB — most electrifying Giants pick in years. Generational pass rusher." },
    ],
    Knicks: [
      { year:1985, pick:"#1",  name:"Patrick Ewing",    note:"First NBA lottery pick ever. Led the Knicks for 15 years. Should have won at least one title." },
      { year:1986, pick:"#5",  name:"Kenny Walker",     note:"Dunked on everyone in college — never quite replicated it in the pros" },
      { year:1991, pick:"#1",  name:"Greg Anthony",     note:"Solid reserve PG — part of the Ewing-era Knicks" },
      { year:1993, pick:"#3",  name:"Hubert Davis",     note:"Sharp shooter — part of the 1994 Finals run" },
      { year:1996, pick:"#18", name:"John Wallace",     note:"Syracuse hero — limited impact with Knicks" },
      { year:1999, pick:"#8",  name:"Frederic Weis",    note:"Never played in NBA. Infamously dunked on by Vince Carter in 2000 Olympics. 'The Dunk of Death.'" },
      { year:2001, pick:"#1",  name:"Eddy Curry",       note:"Traded to Chicago — heart condition concerns ended promising run" },
      { year:2006, pick:"#29", name:"Renaldo Balkman",  note:"Stolen in late first round — tough defender" },
      { year:2009, pick:"#8",  name:"Jordan Hill",      note:"Part of Knicks lottery era struggles" },
      { year:2011, pick:"#17", name:"Iman Shumpert",    note:"Key defensive stooge of the Melo era" },
      { year:2015, pick:"#4",  name:"Kristaps Porzingis",note:"The Unicorn — electrifying but traded dramatically in 2019. Could have been everything." },
      { year:2021, pick:"#19", name:"Quentin Grimes",   note:"Solid rotation piece — part of the Brunson era foundation" },
    ],
    Rangers: [
      { year:1965, pick:"#1",  name:"Andre Veilleux",   note:"Rangers' ONLY first overall before 2020 — never played an NHL game. One of draft history's biggest busts." },
      { year:1973, pick:"#14", name:"Rick Middleton",   note:"Traded to Boston for Ken Hodge — Middleton became a star, Hodge was washed. Worst Rangers deal." },
      { year:1976, pick:"#3",  name:"Don Murdoch",      note:"Scored 32 goals as a rookie then suspended for drug issues — a tragic what-if" },
      { year:1986, pick:"#9",  name:"Brian Leetch",     note:"Best Rangers pick of the modern era — Norris Trophy, Conn Smythe 1994, Hall of Famer" },
      { year:2000, pick:"#12", name:"Pavel Brendl",     note:"Czech winger bust — highly touted, barely played in the NHL" },
      { year:2005, pick:"#6",  name:"Marc Staal",       note:"Solid shutdown defenseman for over a decade — brother of Eric and Jordan Staal" },
      { year:2006, pick:"#21", name:"Bobby Sanguinetti",note:"NJ native bust — Flyers took Claude Giroux (1,066 pts) with the very next pick" },
      { year:2009, pick:"#7",  name:"Chris Kreider",    note:"Best Rangers pick in 20 years — power forward, team's heart and soul for over a decade" },
      { year:2017, pick:"#27", name:"Filip Chytil",     note:"Czech center — key piece of the current Rangers young core" },
      { year:2019, pick:"#2",  name:"Kaapo Kakko",      note:"Finnish winger — struggled early but showing real upside in his role" },
      { year:2020, pick:"#1",  name:"Alexis Lafrenière",note:"Rangers' second ever #1 overall — Quebec-born LW emerging as the future" },
      { year:2023, pick:"#23", name:"Gabriel Perreault",note:"Skilled forward — son of former NHL player Yanic Perreault, high hockey IQ" },
    ],
    Islanders: [
      { year:1972, pick:"#1",  name:"Billy Harris",     note:"First ever Islanders draft pick — solid contributor to the dynasty" },
      { year:1973, pick:"#1",  name:"Denis Potvin",     note:"#1 overall. 3× Norris Trophy. Broke Bobby Orr's points record. Captained 4 consecutive Cup champions." },
      { year:1977, pick:"#15", name:"Mike Bossy",       note:"Greatest steal in draft history? 15th overall. 9 straight 50-goal seasons. 4 Cups. Pure goal-scoring genius." },
      { year:1980, pick:"#1",  name:"Brent Sutter",     note:"Hard-nosed center who was a key part of all 4 Cup teams" },
      { year:1988, pick:"#1",  name:"Mike Turgeon",     note:"Solid player who put up big numbers — one of the better #1 picks post-dynasty" },
      { year:1993, pick:"#1",  name:"Todd Bertuzzi",    note:"Traded before reaching potential — controversial career but NHL all-star caliber" },
      { year:2000, pick:"#1",  name:"Rick DiPietro",    note:"Goalie signed to 15-year $67.5M deal — played only 301 games due to injuries. Costliest bust." },
      { year:2001, pick:"#1",  name:"Raffi Torres",     note:"Traded in Alexei Yashin deal — one of many moves that stalled Islanders rebuilds" },
      { year:2009, pick:"#1",  name:"John Tavares",     note:"Franchise cornerstone for 9 years. Left for Toronto in free agency in 2018. Broke Long Island hearts." },
      { year:2015, pick:"#1",  name:"Mathew Barzal",    note:"Calder Trophy winner, 3× All-Star — the face of the current Islanders" },
      { year:2019, pick:"#5",  name:"Simon Holmstrom",  note:"Swedish winger still developing into the player the Islanders need" },
      { year:2025, pick:"#1",  name:"Matthew Schaefer", note:"Franchise-altering #1 overall — elite defenseman from Erie OHL. Lost mother to cancer before draft. Made opening night roster as a 17-year-old." },
    ],
    Devils: [
      { year:1982, pick:"#1",  name:"Rocky Trottier",   note:"Brother of Bryan Trottier. Disappointingly couldn't replicate his sibling's greatness." },
      { year:1987, pick:"#1",  name:"Brendan Shanahan", note:"Traded to St. Louis — became a Hall of Famer. One that got away." },
      { year:1988, pick:"#1",  name:"Corey Foster",     note:"Defenseman who never made impact in NJ" },
      { year:1991, pick:"#1",  name:"Scott Niedermayer", note:"The best Devils draft pick ever. 4× Cup winner including 3 with NJ. Hall of Famer. Pure elegance." },
      { year:1995, pick:"#1",  name:"Petr Sykora",      note:"Czech winger who was a key part of 2000 and 2003 Cup wins" },
      { year:2000, pick:"#1",  name:"David Hale",       note:"Defenseman who never fulfilled first-round promise" },
      { year:2003, pick:"#3",  name:"Zach Parise",      note:"Minnesota native who became the Devils' best player. Left for Minnesota in 2012 — heartbreak." },
      { year:2012, pick:"#9",  name:"Stefan Matteau",   note:"Son of Stephane Matteau — scored a memorable OT goal like his dad but career was limited" },
      { year:2017, pick:"#1",  name:"Nico Hischier",    note:"Swiss center — #1 overall, named captain and the foundation of the Devils rebuild" },
      { year:2019, pick:"#1",  name:"Jack Hughes",      note:"#1 overall — the most hyped Devils pick since Niedermayer. True franchise center emerging." },
      { year:2021, pick:"#2",  name:"Luke Hughes",      note:"Brother of Jack — #2 overall defenseman. The Hughes brothers could anchor the franchise for years." },
    ],
  };

  const RIVALS_DATA = [
    // MLB
    { team1:"Yankees", team2:"Red Sox",    sport:"MLB", t1wins:"27 WS titles to 9", note:"Baseball's greatest rivalry — 100+ years of pure hatred" },
    { team1:"Yankees", team2:"Mets",       sport:"MLB", t1wins:"2000 Subway Series", note:"Queens vs The Bronx — the city divided every summer" },
    { team1:"Mets",    team2:"Phillies",   sport:"MLB", t1wins:"Split historically", note:"NL East division rivals — always intense" },
    { team1:"Yankees", team2:"Orioles",    sport:"MLB", t1wins:"Yankees lead AL East", note:"AL East rivals — old-school battles in the division" },
    // NFL
    { team1:"Jets",    team2:"Dolphins",   sport:"NFL", t1wins:"Split all time", note:"AFC East rivals — Miami always haunted the Jets" },
    { team1:"Jets",    team2:"Bills",      sport:"NFL", t1wins:"Bills dominate recent era", note:"AFC East division battle" },
    { team1:"Giants",  team2:"Eagles",     sport:"NFL", t1wins:"Split historically", note:"NFC East — LT vs Philly, brutal division games" },
    { team1:"Giants",  team2:"Cowboys",    sport:"NFL", t1wins:"Cowboys lead all-time", note:"NFC East — America's Team vs NY's team" },
    // NHL
    { team1:"Rangers", team2:"Islanders",  sport:"NHL", t1wins:"Rangers lead overall", note:"The Battle of New York — defining tri-state hockey wars" },
    { team1:"Rangers", team2:"Devils",     sport:"NHL", t1wins:"Devils dominated 90s-00s", note:"Metropolitan rivals — Messier's guarantee the defining moment" },
    { team1:"Islanders",team2:"Devils",    sport:"NHL", t1wins:"Devils won 3 Cups", note:"NJ vs LI — two dynasties from the same era" },
    // NBA
    { team1:"Knicks",  team2:"Celtics",    sport:"NBA", t1wins:"Celtics lead all-time", note:"Reed vs Cowens, Ewing vs Bird — classic battles" },
    { team1:"Knicks",  team2:"Heat",       sport:"NBA", t1wins:"Split in key series", note:"Riley's revenge — he coached both sides" },
    { team1:"Nets",    team2:"Knicks",     sport:"NBA", t1wins:"Split in modern era", note:"Brooklyn vs Manhattan — the city's NBA rivalry" },
  ];

  const STATS_REFERENCE = {
    MLB: { color:"#003087", emoji:"⚾", categories:[
      { name:"Batting Average", abbrev:"AVG", url:"https://www.baseball-reference.com/leaders/batting_avg_active.shtml", desc:"Best hitters" },
      { name:"Home Runs",       abbrev:"HR",  url:"https://www.baseball-reference.com/leaders/HR_active.shtml",         desc:"Power hitters" },
      { name:"RBI",             abbrev:"RBI", url:"https://www.baseball-reference.com/leaders/RBI_active.shtml",        desc:"Run producers" },
      { name:"ERA",             abbrev:"ERA", url:"https://www.baseball-reference.com/leaders/earned_run_avg_active.shtml", desc:"Best starters" },
      { name:"Strikeouts",      abbrev:"K",   url:"https://www.baseball-reference.com/leaders/SO_p_active.shtml",       desc:"Power pitchers" },
      { name:"OPS",             abbrev:"OPS", url:"https://www.baseball-reference.com/leaders/onbase_plus_slugging_active.shtml", desc:"Overall hitting" },
      { name:"WAR",             abbrev:"WAR", url:"https://www.baseball-reference.com/leaders/WAR_active.shtml",        desc:"Best overall players" },
      { name:"Saves",           abbrev:"SV",  url:"https://www.baseball-reference.com/leaders/SV_active.shtml",         desc:"Closers" },
    ], nyTeams:["Yankees","Mets"], ref:"https://www.baseball-reference.com" },
    NFL: { color:"#013369", emoji:"🏈", categories:[
      { name:"Passing Yards",  abbrev:"YDS", url:"https://www.pro-football-reference.com/leaders/pass_yds_single_season.htm", desc:"Top QBs" },
      { name:"Rushing Yards",  abbrev:"RU",  url:"https://www.pro-football-reference.com/leaders/rush_yds_single_season.htm", desc:"Ground game" },
      { name:"Receiving Yards",abbrev:"REC", url:"https://www.pro-football-reference.com/leaders/rec_yds_single_season.htm",  desc:"Top receivers" },
      { name:"Sacks",          abbrev:"SK",  url:"https://www.pro-football-reference.com/leaders/def_sacks_single_season.htm",desc:"Pass rushers" },
      { name:"Interceptions",  abbrev:"INT", url:"https://www.pro-football-reference.com/leaders/def_int_single_season.htm",  desc:"Ball hawks" },
      { name:"Passer Rating",  abbrev:"RTG", url:"https://www.pro-football-reference.com/leaders/pass_rating_single_season.htm", desc:"QB efficiency" },
    ], nyTeams:["Jets","Giants"], ref:"https://www.pro-football-reference.com" },
    NBA: { color:"#006BB6", emoji:"🏀", categories:[
      { name:"Points Per Game", abbrev:"PPG", url:`https://www.basketball-reference.com/leagues/NBA_${year}_per_game.html`, desc:"Scoring leaders" },
      { name:"Rebounds",        abbrev:"RPG", url:`https://www.basketball-reference.com/leagues/NBA_${year}_per_game.html`, desc:"Board men" },
      { name:"Assists",         abbrev:"APG", url:`https://www.basketball-reference.com/leagues/NBA_${year}_per_game.html`, desc:"Playmakers" },
      { name:"Blocks",          abbrev:"BPG", url:`https://www.basketball-reference.com/leagues/NBA_${year}_per_game.html`, desc:"Shot blockers" },
      { name:"Win Shares",      abbrev:"WS",  url:`https://www.basketball-reference.com/leagues/NBA_${year}_advanced.html`, desc:"Overall impact" },
      { name:"PER",             abbrev:"PER", url:`https://www.basketball-reference.com/leagues/NBA_${year}_advanced.html`, desc:"Player efficiency" },
    ], nyTeams:["Knicks","Nets"], ref:"https://www.basketball-reference.com" },
    NHL: { color:"#0038A8", emoji:"🏒", categories:[
      { name:"Points",    abbrev:"PTS", url:`https://www.hockey-reference.com/leagues/NHL_${year}_skaters.html`, desc:"Goals + assists" },
      { name:"Goals",     abbrev:"G",   url:`https://www.hockey-reference.com/leagues/NHL_${year}_skaters.html`, desc:"Goal scorers" },
      { name:"Assists",   abbrev:"A",   url:`https://www.hockey-reference.com/leagues/NHL_${year}_skaters.html`, desc:"Playmakers" },
      { name:"GAA",       abbrev:"GAA", url:`https://www.hockey-reference.com/leagues/NHL_${year}_goalies.html`, desc:"Goalie avg" },
      { name:"Save %",    abbrev:"SV%", url:`https://www.hockey-reference.com/leagues/NHL_${year}_goalies.html`, desc:"Goalie efficiency" },
    ], nyTeams:["Rangers","Islanders","Devils"], ref:"https://www.hockey-reference.com" },
    WNBA: { color:"#FF6B35", emoji:"🏀", categories:[
      { name:"Points",   abbrev:"PPG", url:`https://www.basketball-reference.com/wnba/leagues/WNBA_${year}_per_game.html`, desc:"Scoring leaders" },
      { name:"Rebounds", abbrev:"RPG", url:`https://www.basketball-reference.com/wnba/leagues/WNBA_${year}_per_game.html`, desc:"Board women" },
      { name:"Assists",  abbrev:"APG", url:`https://www.basketball-reference.com/wnba/leagues/WNBA_${year}_per_game.html`, desc:"Playmakers" },
    ], nyTeams:["Liberty"], ref:"https://www.basketball-reference.com/wnba" },
  };

  const sections = ["LEADERS","DROUGHT","DRAFT","RIVALS","TEAM LINKS"];

      <div style={styles.stdHeader}>
        <h2 style={styles.stdTitle}>NY SPORTS STATS & HISTORY</h2>
        <p style={styles.stdSub}>LEADERS · DROUGHT TRACKER · DRAFT HISTORY · RIVALRIES · TEAM LINKS · RADIO</p>
      </div>

      {/* Section tabs */}
      <div style={{display:"flex", gap:4, flexWrap:"wrap", marginBottom:20, borderBottom:"1px solid #2a2a2a", paddingBottom:12}}>
        {sections.map(s => (
          <button key={s} onClick={() => setActiveSection(s)}
            style={{...styles.filterBtn, ...(activeSection===s ? styles.filterBtnActive : {})}}>
            {s}
          </button>
        ))}
      </div>

      {/* LEADERS */}
      {activeSection === "LEADERS" && (
        <div>
          {/* League selector for live leaders */}
          <div style={{...styles.filterGroup, flexWrap:"wrap", marginBottom:16}}>
            {Object.keys(LEAGUE_MAP).map(l => (
              <button key={l} onClick={() => setActiveLeague(l)}
                style={{...styles.filterBtn, ...(activeLeague===l ? styles.filterBtnActive : {})}}>
                {STATS_REFERENCE[l]?.emoji} {l}
              </button>
            ))}
          </div>

          {/* Live leaders from ESPN */}
          {loadingLeaders ? (
            <div style={styles.loading}>
              <div style={styles.loadingDots}>{[0,1,2].map(i=><span key={i} style={{...styles.dot,animationDelay:`${i*0.2}s`}}/>)}</div>
              <p style={styles.loadingText}>LOADING {activeLeague} LEADERS...</p>
            </div>
          ) : liveLeaders.length > 0 ? (
            <div>
              <div style={styles.statsCatHeader}>
                <span style={{color:"#4ade80", marginRight:8}}>●</span>
                <span style={styles.statsCatName}>LIVE {activeLeague} LEADERS</span>
              </div>
              <div style={styles.statsGrid}>
                {liveLeaders.slice(0,6).map((cat, ci) => {
                  const rows = (cat.leaders || []).slice(0,10);
                  if (!rows.length) return null;
                  return (
                    <div key={ci} style={styles.statsCat}>
                      <div style={styles.statsCatHeader}>
                        <span style={styles.statsCatName}>{cat.displayName || cat.name}</span>
                        <span style={styles.statsCatAbbrev}>{cat.abbreviation}</span>
                      </div>
                      {rows.map((l, i) => {
                        const isNY = NY_TEAM_NAMES.some(t => (l.athlete?.team?.displayName || "").toLowerCase().includes(t));
                        return (
                          <a key={i}
                            href={`https://www.google.com/search?q=${encodeURIComponent(`${l.athlete?.displayName} ${activeLeague} stats ${year}`)}`}
                            target="_blank" rel="noopener noreferrer"
                            style={{...styles.statsRow, ...(isNY ? styles.statsRowNY : {}), ...(i%2===0?{}:styles.statsRowAlt)}}>
                            <span style={styles.statsRank}>{i+1}</span>
                            {l.athlete?.headshot?.href && <img src={l.athlete.headshot.href} alt="" style={styles.statsHeadshot} onError={e=>e.target.style.display="none"} />}
                            <div style={styles.statsPlayerInfo}>
                              <span style={{...styles.statsName, ...(isNY?{color:"#e8e0d0",fontWeight:900}:{})}}>{l.athlete?.displayName}</span>
                              <span style={styles.statsTeam}>{l.athlete?.team?.displayName || ""}</span>
                            </div>
                            <span style={{...styles.statsValue, ...(isNY?{color:"#c8201c"}:{})}}>{l.displayValue || l.value}</span>
                            {isNY && <span style={styles.statsNYBadge}>NY</span>}
                          </a>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div style={{padding:"10px 0 16px", borderBottom:"1px solid #2a2a2a", marginBottom:16}}>
              <p style={{margin:0, fontSize:11, color:"#555"}}>Live leaders unavailable — ESPN doesn't expose this endpoint reliably. Use the reference links below.</p>
            </div>
          )}

          {/* Reference cards */}
          <div style={{marginTop:20}}>
            {Object.entries(STATS_REFERENCE).filter(([l]) => l === activeLeague).map(([league, data]) => (
              <div key={league}>
                <div style={{...styles.statsLeagueHeader, borderLeft:`4px solid ${data.color}`, marginBottom:10}}>
                  <div>
                    <span style={styles.statsLeagueTitle}>{data.emoji} {league} DEEP DIVE</span>
                    <span style={{fontSize:9, color:"#888", marginLeft:10}}>NY: {data.nyTeams.join(" · ")}</span>
                  </div>
                  <a href={data.ref} target="_blank" rel="noopener noreferrer"
                    style={{fontSize:9, color:"#c8201c", fontWeight:900, textDecoration:"none", marginLeft:"auto"}}>
                    FULL STATS →
                  </a>
                </div>
                <div style={styles.statsRefGrid}>
                  {data.categories.map((cat, i) => (
                    <a key={i} href={cat.url} target="_blank" rel="noopener noreferrer" style={styles.statsRefCard}>
                      <span style={{...styles.statsRefAbbrev, background: data.color}}>{cat.abbrev}</span>
                      <div style={styles.statsRefBody}>
                        <span style={styles.statsRefName}>{cat.name}</span>
                        <span style={styles.statsRefDesc}>{cat.desc}</span>
                      </div>
                      <span style={styles.statsRefArrow}>→</span>
                    </a>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* DROUGHT TRACKER */}
      {activeSection === "DROUGHT" && (
        <div>
          <div style={{marginBottom:16, padding:"10px 14px", background:"#161616", borderLeft:"3px solid #c8201c"}}>
            <p style={{margin:0, fontSize:12, color:"#aaa"}}>How long has it been since each NY team last won a championship? Sorted by most desperate first.</p>
          </div>
          {DROUGHT_DATA.map((t, i) => {
            const years = t.last ? (new Date().getFullYear() - t.last) : 999;
            const pct = Math.min(years / 60 * 100, 100);
            return (
              <div key={i} style={{...styles.droughtRow, ...(i%2===0?{}:{background:"#0f0f0f"})}}>
                <div style={styles.droughtTeam}>
                  <span style={styles.droughtEmoji}>{["⚾","🏈","🏀","🏒","⚽"].find(e => ["MLB","NFL","NBA","NHL","MLS","WNBA","NWSL"].includes(t.sport)) || "🏆"}</span>
                  <div>
                    <span style={styles.droughtTeamName}>{t.team}</span>
                    <span style={styles.droughtSport}> · {t.sport}</span>
                  </div>
                </div>
                <div style={styles.droughtBar}>
                  <div style={{...styles.droughtFill, width:`${pct}%`, background: years > 40 ? "#c8201c" : years > 20 ? "#cc8800" : "#2d8a50"}} />
                </div>
                <div style={styles.droughtRight}>
                  <span style={styles.droughtYear}>{t.last ? `Last: ${t.last}` : "Never"}</span>
                  <span style={styles.droughtNote}>{t.note}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* DRAFT HISTORY */}
      {activeSection === "DRAFT" && (
        <div>
          <div style={{marginBottom:16, padding:"10px 14px", background:"#161616", borderLeft:"3px solid #c8201c"}}>
            <p style={{margin:0, fontSize:12, color:"#aaa"}}>Notable draft picks — the hits, the misses, and the legends. Click any name to search, or view full draft history.</p>
          </div>

          {/* Draft reference links */}
          <div style={{display:"flex", gap:8, flexWrap:"wrap", marginBottom:16, paddingBottom:12, borderBottom:"1px solid #2a2a2a"}}>
            {[
              { label:"MLB Draft History", url:"https://www.baseball-reference.com/draft/" },
              { label:"NFL Draft History", url:"https://www.pro-football-reference.com/draft/" },
              { label:"NBA Draft History", url:"https://www.basketball-reference.com/draft/" },
              { label:"NHL Draft History", url:"https://www.hockey-reference.com/draft/" },
            ].map((l, i) => (
              <a key={i} href={l.url} target="_blank" rel="noopener noreferrer"
                style={{fontSize:10, fontWeight:900, color:"#c8201c", textDecoration:"none", padding:"4px 10px", border:"1px solid #333", background:"#161616"}}>
                {l.label} →
              </a>
            ))}
          </div>

          {Object.entries(DRAFT_DATA).map(([team, picks]) => (
            <div key={team} style={{marginBottom:16}}>
              <div style={{...styles.stdDivisionHeader, display:"flex", justifyContent:"space-between", alignItems:"center"}}>
                <span>{team.toUpperCase()}</span>
                <a href={`https://www.google.com/search?q=${encodeURIComponent(team+" draft history picks all years")}`}
                  target="_blank" rel="noopener noreferrer"
                  style={{fontSize:9, color:"#c8201c", textDecoration:"none", fontWeight:900}}>
                  FULL HISTORY →
                </a>
              </div>
              {picks.map((p, i) => (
                <a key={i}
                  href={`https://www.google.com/search?q=${encodeURIComponent(`${p.name} ${team} draft ${p.year} NFL NBA MLB NHL`)}`}
                  target="_blank" rel="noopener noreferrer"
                  style={{...styles.histRow, ...(i%2===0?{}:styles.histRowAlt), textDecoration:"none", display:"flex", alignItems:"center", gap:10}}>
                  <span style={{...styles.histRank, color:"#c8201c", fontSize:11, fontWeight:900, minWidth:36}}>{p.year}</span>
                  <span style={{fontSize:10, color:"#888", fontWeight:700, minWidth:30}}>{p.pick}</span>
                  <div style={styles.histInfo}>
                    <span style={styles.histName}>{p.name}</span>
                    <span style={styles.histYears}>{p.note}</span>
                  </div>
                  <span style={{fontSize:10, color:"#c8201c", flexShrink:0}}>→</span>
                </a>
              ))}
            </div>
          ))}
        </div>
      )}

      {/* RIVALS */}
      {activeSection === "RIVALS" && (
        <div>
          <div style={{marginBottom:16, padding:"10px 14px", background:"#161616", borderLeft:"3px solid #c8201c"}}>
            <p style={{margin:0, fontSize:12, color:"#aaa"}}>The rivalries that define NY sports — decades of passion, heartbreak and glory.</p>
          </div>
          {RIVALS_DATA.map((r, i) => (
            <div key={i} style={{...styles.rivalRow, ...(i%2===0?{}:{background:"#0f0f0f"})}}>
              <div style={styles.rivalTeams}>
                <span style={styles.rivalTeam}>{r.team1}</span>
                <span style={styles.rivalVs}>vs</span>
                <span style={styles.rivalTeam}>{r.team2}</span>
                <span style={styles.rivalSport}>{r.sport}</span>
              </div>
              <div style={styles.rivalInfo}>
                <span style={styles.rivalStat}>{r.t1wins}</span>
                <span style={styles.rivalNote}>{r.note}</span>
              </div>
              <SearchLinks query={`${r.team1} vs ${r.team2} rivalry history`} />
            </div>
          ))}
        </div>
      )}

      {/* TEAM LINKS */}
      {activeSection === "TEAM LINKS" && (
        <div style={styles.statsRefGrid}>
          {Object.entries(NY_TEAMS_DATA).map(([team, data]) => (
            <div key={team} style={{...styles.teamLinkCard, borderLeft:`3px solid ${data.color}`}}>
              <div style={styles.teamLinkHeader}>
                <span style={styles.teamLinkEmoji}>{data.emoji}</span>
                <span style={styles.teamLinkName}>{team}</span>
                <span style={styles.teamLinkLeague}>{data.league}</span>
              </div>
              <div style={styles.teamLinkBtns}>
                <a href={data.site} target="_blank" rel="noopener noreferrer" style={styles.teamLinkBtn}>
                  🌐 Official Site
                </a>
                <a href={data.ref} target="_blank" rel="noopener noreferrer" style={styles.teamLinkBtn}>
                  📊 Stats & History
                </a>
                <a href={`https://www.google.com/search?q=${encodeURIComponent(`${team} latest news ${year}`)}`}
                  target="_blank" rel="noopener noreferrer" style={styles.teamLinkBtn}>
                  📰 Latest News
                </a>
              </div>
            </div>
          ))}
        </div>
      )}
      {/* RADIO & PODCASTS */}
      {activeSection === "RADIO" && (
        <div>
          <div style={{marginBottom:16, padding:"10px 14px", background:"#161616", borderLeft:"3px solid #c8201c"}}>
            <p style={{margin:0, fontSize:12, color:"#aaa"}}>Official radio broadcasts, podcasts and streams for all NY teams. WFAN is the heartbeat of NY sports radio.</p>
          </div>

          {/* Main NY Radio Stations */}
          <div style={styles.stdDivisionHeader}>📻 NY SPORTS RADIO STATIONS</div>
          {[
            { name:"WFAN 101.9 FM / 66 AM", desc:"The home of Yankees, Mets, Giants, Jets, Knicks, Rangers, Islanders, Nets, Devils — NY's flagship sports station since 1987", url:"https://www.audacy.com/wfan", teams:"All NY Teams" },
            { name:"ESPN NY 98.7 FM", desc:"ESPN Radio New York — breaking news, analysis and coverage of all NY teams", url:"https://espn.com/new-york", teams:"All NY Teams" },
            { name:"YES Network Radio", desc:"Yankees home radio — Dave Sims, Suzyn Waldman call the games", url:"https://www.yesnetwork.com", teams:"Yankees" },
            { name:"SNY", desc:"SNY covers Mets, Jets, Giants, Knicks, Yankees, Nets, Rangers, Islanders, Devils", url:"https://sny.tv", teams:"All NY Teams" },
            { name:"MSG Network", desc:"Rangers and Knicks home broadcast — garden-fresh coverage", url:"https://www.msgnetworks.com", teams:"Rangers · Knicks" },
            { name:"WGBB 95.5FM / 1240 AM", desc:"Long Island's NY sports talk — Sundays at 8PM. Yankees, Mets, Islanders focus", url:"https://www.sportstalkny.com", teams:"All NY Teams · LI Focus" },
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

          {/* Team Podcasts */}
          <div style={{...styles.stdDivisionHeader, marginTop:20}}>🎙️ OFFICIAL TEAM PODCASTS</div>
          {[
            { name:"Yankees Podcast", team:"Yankees ⚾", url:"https://www.mlb.com/yankees/fans/podcasts", desc:"Official MLB Yankees podcast — player interviews, game breakdowns" },
            { name:"Mets Pod", team:"Mets ⚾", url:"https://www.mlb.com/mets/fans/podcasts", desc:"Inside the Mets clubhouse — official team podcast" },
            { name:"Big Blue Podcast", team:"Giants 🏈", url:"https://www.giants.com/podcasts", desc:"NY Giants official podcast — news, analysis, player features" },
            { name:"The Green & White Report", team:"Jets 🏈", url:"https://www.newyorkjets.com/podcasts", desc:"Official Jets podcast — training camp to game day" },
            { name:"Knicks Podcast", team:"Knicks 🏀", url:"https://www.nba.com/knicks/podcasts", desc:"Madison Square Garden's official Knicks coverage" },
            { name:"Rangers Podcast", team:"Rangers 🏒", url:"https://www.nhl.com/rangers/podcasts", desc:"Broadway Blueshirts official podcast" },
            { name:"Isles Podcast", team:"Islanders 🏒", url:"https://www.nhl.com/islanders/podcasts", desc:"Official Islanders podcast — news from UBS Arena" },
            { name:"Liberty Podcast", team:"Liberty 🏀", url:"https://www.nyliberty.com", desc:"WNBA Champion NY Liberty — official team coverage" },
            { name:"NYCFC Podcast", team:"NYCFC ⚽", url:"https://www.nycfc.com/podcasts", desc:"The Pigeons official podcast — soccer in NYC" },
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

          {/* Streaming */}
          <div style={{...styles.stdDivisionHeader, marginTop:20}}>📱 STREAM NY SPORTS</div>
          {[
            { name:"TuneIn", desc:"Free streaming for WFAN and all NY sports radio", url:"https://tunein.com/radio/WFAN-Sports-Radio-1019-FMa25701/", icon:"📻" },
            { name:"Audacy App", desc:"Free — stream WFAN live on iOS and Android", url:"https://www.audacy.com/wfan", icon:"📱" },
            { name:"ESPN App", desc:"ESPN NY coverage plus live radio", url:"https://www.espn.com/espnradio/", icon:"📺" },
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
      )}

      {/* BIOGRAPHIES */}
      {activeSection === "BIOS" && (
        <div>
          <div style={{marginBottom:16, padding:"10px 14px", background:"#161616", borderLeft:"3px solid #c8201c"}}>
            <p style={{margin:0, fontSize:12, color:"#aaa"}}>The legends who defined NY sports — click any name for their full biography.</p>
          </div>
          {[
            { name:"Babe Ruth", team:"Yankees", years:"1920–1934", emoji:"⚾", role:"Outfielder", bio:"The greatest player in baseball history transformed the Yankees into a dynasty. 659 HR as a Yankee, 7 World Series titles. Called his shot in 1932.", wiki:"https://en.wikipedia.org/wiki/Babe_Ruth" },
            { name:"Lou Gehrig", team:"Yankees", years:"1923–1939", emoji:"⚾", role:"First Baseman", bio:"The Iron Horse played 2,130 consecutive games. Four-time batting champion, died tragically of ALS at 37. 'Luckiest man on the face of the earth.'", wiki:"https://en.wikipedia.org/wiki/Lou_Gehrig" },
            { name:"Joe DiMaggio", team:"Yankees", years:"1936–1951", emoji:"⚾", role:"Centerfielder", bio:"56-game hitting streak in 1941 — possibly the most unbreakable record in sports. 9 World Series rings, 13-time All-Star, married Marilyn Monroe.", wiki:"https://en.wikipedia.org/wiki/Joe_DiMaggio" },
            { name:"Mickey Mantle", team:"Yankees", years:"1951–1968", emoji:"⚾", role:"Centerfielder", bio:"Switch-hitting power and speed. 536 career HR despite playing through constant pain. Three-time MVP, 7 World Series titles, tape measure home runs.", wiki:"https://en.wikipedia.org/wiki/Mickey_Mantle" },
            { name:"Yogi Berra", team:"Yankees", years:"1946–1963", emoji:"⚾", role:"Catcher", bio:"10 World Series rings as player. Famous for Yogi-isms: 'It ain't over till it's over.' One of the greatest catchers in baseball history.", wiki:"https://en.wikipedia.org/wiki/Yogi_Berra" },
            { name:"Derek Jeter", team:"Yankees", years:"1995–2014", emoji:"⚾", role:"Shortstop", bio:"The Captain. 5 World Series rings, 14 All-Star Games, 3,465 career hits. The face of the Yankees dynasty. The Flip, the Dive, Mr. November.", wiki:"https://en.wikipedia.org/wiki/Derek_Jeter" },
            { name:"Joe Namath", team:"Jets", years:"1965–1976", emoji:"🏈", role:"Quarterback", bio:"Broadway Joe guaranteed a Super Bowl III victory then delivered. Changed pro football forever with his $427K contract and charisma.", wiki:"https://en.wikipedia.org/wiki/Joe_Namath" },
            { name:"Lawrence Taylor", team:"Giants", years:"1981–1993", emoji:"🏈", role:"Linebacker", bio:"Arguably the greatest defensive player in NFL history. Revolutionized the outside linebacker position. 2 Super Bowls, NFL MVP 1986, 22 sacks.", wiki:"https://en.wikipedia.org/wiki/Lawrence_Taylor" },
            { name:"Willis Reed", team:"Knicks", years:"1964–1974", emoji:"🏀", role:"Center", bio:"Limped onto court for Game 7 of 1970 Finals on a torn thigh muscle. Inspired Walt Frazier's 36-point performance. 2 championships, Hall of Famer.", wiki:"https://en.wikipedia.org/wiki/Willis_Reed" },
            { name:"Walt Frazier", team:"Knicks", years:"1967–1977", emoji:"🏀", role:"Guard", bio:"Clyde — the most stylish player in NBA history. Led the Knicks to 2 championships. Scored 36 points in the famous Game 7 Willis Reed game.", wiki:"https://en.wikipedia.org/wiki/Walt_Frazier" },
            { name:"Patrick Ewing", team:"Knicks", years:"1985–2000", emoji:"🏀", role:"Center", bio:"The first NBA lottery pick led the Knicks for 15 years. All-time leading scorer. Came heartbreakingly close to a championship in 1994.", wiki:"https://en.wikipedia.org/wiki/Patrick_Ewing" },
            { name:"Mark Messier", team:"Rangers", years:"1991–97, 2000–04", emoji:"🏒", role:"Center", bio:"The Captain who ended 54 years of Rangers heartbreak in 1994. Guaranteed a Game 6 win against the Devils then scored a hat trick to back it up.", wiki:"https://en.wikipedia.org/wiki/Mark_Messier" },
            { name:"Mike Bossy", team:"Islanders", years:"1977–1987", emoji:"🏒", role:"Right Wing", bio:"9 consecutive 50-goal seasons. Matched Rocket Richard's 50 in 50 in 1981. 4 Stanley Cups. One of the purest goal scorers in NHL history.", wiki:"https://en.wikipedia.org/wiki/Mike_Bossy" },
            { name:"Denis Potvin", team:"Islanders", years:"1973–1988", emoji:"🏒", role:"Defenseman", bio:"Three Norris Trophies. Broke Bobby Orr's career points record for defensemen. Captain of four consecutive Stanley Cup champions.", wiki:"https://en.wikipedia.org/wiki/Denis_Potvin" },
            { name:"Tom Seaver", team:"Mets", years:"1967–77, 1983", emoji:"⚾", role:"Pitcher", bio:"Tom Terrific led the Miracle Mets to the 1969 World Series. 3 Cy Young Awards, 311 career wins, 3,272 strikeouts. Greatest Met ever.", wiki:"https://en.wikipedia.org/wiki/Tom_Seaver" },
            { name:"Mike Piazza", team:"Mets", years:"1998–2005", emoji:"⚾", role:"Catcher", bio:"Greatest hitting catcher in baseball history. His 9/11 home run is the most emotional moment in Mets history. 220 HR as a Met.", wiki:"https://en.wikipedia.org/wiki/Mike_Piazza" },
            { name:"Dwight Gooden", team:"Mets", years:"1984–1994", emoji:"⚾", role:"Pitcher", bio:"Doc at age 20 went 24-4 with a 1.53 ERA. Virtually unhittable. What could have been the greatest career in baseball history.", wiki:"https://en.wikipedia.org/wiki/Dwight_Gooden" },
            { name:"Bryan Trottier", team:"Islanders", years:"1975–1990", emoji:"🏒", role:"Center", bio:"The engine of the Islanders dynasty. Hart Trophy winner, 4 Stanley Cups, 1,353 career points. Won 2 more Cups with Pittsburgh.", wiki:"https://en.wikipedia.org/wiki/Bryan_Trottier" },
          ].map((p, i) => (
            <div key={i} style={{...styles.bioRow, ...(i%2===0?{}:{background:"#0f0f0f"})}}>
              <div style={styles.bioEmoji}>{p.emoji}</div>
              <div style={styles.bioInfo}>
                <div style={styles.bioHeader}>
                  <span style={styles.bioName}>{p.name}</span>
                  <span style={styles.bioTeam}>{p.team}</span>
                  <span style={styles.bioYears}>{p.years}</span>
                  <span style={styles.bioRole}>{p.role}</span>
                </div>
                <p style={styles.bioBio}>{p.bio}</p>
                <div style={styles.bioLinks}>
                  <a href={p.wiki} target="_blank" rel="noopener noreferrer" style={styles.histLink}>📖 Wikipedia</a>
                  <a href={googleUrl(`${p.name} New York ${p.team} baseball career stats`)} target="_blank" rel="noopener noreferrer" style={styles.histLink}>🔍 Google</a>
                  <a href={`https://www.amazon.com/s?k=${encodeURIComponent(p.name+" biography")}&tag=nysportsdaily-20`} target="_blank" rel="noopener noreferrer" style={styles.histLink}>📚 Books</a>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      {/* SHOP */}
      {activeSection === "SHOP" && (
        <div>
          <div style={{marginBottom:16, padding:"10px 14px", background:"#161616", borderLeft:"3px solid #c8201c"}}>
            <p style={{margin:0, fontSize:12, color:"#aaa"}}>Curated NY sports books, gear and gifts — all links support nysportsdaily.com at no extra cost to you. 🙏</p>
          </div>

          <div style={styles.stdDivisionHeader}>📚 NY SPORTS BOOKS</div>
          {[
            // YANKEES
            { title:"The Yankee Years", author:"Joe Torre & Tom Verducci", tag:"yankee+years+torre+verducci", desc:"Inside the dynasty from the manager who led them to 4 World Series titles" },
            { title:"Summer of '49", author:"David Halberstam", tag:"summer+of+49+halberstam+yankees", desc:"Yankees vs Red Sox — the greatest rivalry told by a master storyteller" },
            { title:"The Last Boy: Mickey Mantle", author:"Jane Leavy", tag:"last+boy+mickey+mantle+biography", desc:"The definitive Mantle biography — heroism, pain and unfulfilled greatness" },
            { title:"Luckiest Man: Lou Gehrig", author:"Jonathan Eig", tag:"luckiest+man+lou+gehrig+biography", desc:"The Iron Horse's extraordinary life and tragic death from ALS" },
            { title:"The Big Bam: Babe Ruth", author:"Leigh Montville", tag:"big+bam+babe+ruth+biography+montville", desc:"The definitive Ruth biography — from orphanage to legend" },
            { title:"Pinstripe Empire", author:"Marty Appel", tag:"pinstripe+empire+yankees+history+appel", desc:"The complete history of the New York Yankees from 1903 to present" },
            { title:"October 1964", author:"David Halberstam", tag:"october+1964+halberstam+yankees", desc:"The Yankees' last pennant before the dynasty's fall — Mantle, Maris and the end of an era" },
            { title:"Joe DiMaggio: The Hero's Life", author:"Richard Ben Cramer", tag:"joe+dimaggio+hero+life+cramer", desc:"The real DiMaggio behind the myth — one of the great sports biographies" },
            { title:"Derek Jeter: The Life You Imagine", author:"Derek Jeter", tag:"derek+jeter+life+you+imagine", desc:"The Captain's own story from childhood to the major leagues" },
            { title:"Yogi: A Life Behind the Mask", author:"Jon Pessah", tag:"yogi+berra+biography+pessah", desc:"The definitive biography of one of baseball's greatest characters" },
            // METS
            { title:"The Bad Guys Won", author:"Jeff Pearlman", tag:"bad+guys+won+1986+mets+pearlman", desc:"The wild, outrageous story of the drug-fueled 1986 Mets championship team" },
            { title:"The Miracle Mets", author:"Stanley Cohen", tag:"miracle+mets+1969+cohen", desc:"The complete story of the 1969 Amazin' Mets championship season" },
            { title:"Doc: A Memoir", author:"Dwight Gooden", tag:"doc+memoir+dwight+gooden", desc:"Gooden's raw honest account of his extraordinary rise and fall" },
            { title:"Mike and the Mad Dog", author:"Bob Raissman", tag:"WFAN+mike+francesca+mad+dog+russo", desc:"The story behind the greatest sports radio show in New York history" },
            { title:"Tom Seaver: A Terrific Life", author:"Various", tag:"tom+seaver+biography+mets", desc:"The life of Tom Terrific — the greatest Met of all time" },
            { title:"Queens Reigns Supreme: Mets Dynasty", author:"Various", tag:"new+york+mets+history+book", desc:"The complete history of the New York Mets franchise" },
            // JETS/GIANTS
            { title:"Namath: A Biography", author:"Mark Kriegel", tag:"namath+biography+kriegel+jets", desc:"The definitive biography of Broadway Joe and the greatest upset in Super Bowl history" },
            { title:"I Can't Wait Until Tomorrow", author:"Joe Namath", tag:"namath+cant+wait+tomorrow+autobiography", desc:"Namath's own tell-all autobiography — one of sports greatest memoirs" },
            { title:"LT: Over the Edge", author:"Lawrence Taylor", tag:"lawrence+taylor+LT+autobiography", desc:"LT's brutal honest autobiography — greatness, addiction and survival" },
            { title:"Parcells: A Football Life", author:"Bill Parcells", tag:"bill+parcells+football+life+biography", desc:"The Big Tuna's coaching career from Giants to beyond" },
            { title:"Eli Manning: The Making of a Champion", author:"Various", tag:"eli+manning+giants+super+bowl+book", desc:"The story of two Super Bowl upsets and the quarterback who delivered them" },
            { title:"Gang Green: The Rise and Fall of the Jets", author:"Dennis Derossett", tag:"new+york+jets+history+book+gang+green", desc:"The complete history of the Jets franchise" },
            // KNICKS
            { title:"When the Garden Was Eden", author:"Harvey Araton", tag:"when+garden+was+eden+knicks+araton", desc:"The legendary Knicks of the early 70s — Reed, Frazier, Bradley, DeBusschere" },
            { title:"My Life in Basketball: Walt Frazier", author:"Walt Frazier", tag:"walt+frazier+clyde+autobiography+knicks", desc:"Clyde's story — from the streets to the Garden to four decades as the voice of the Knicks" },
            { title:"Patrick Ewing: A Life in Basketball", author:"Various", tag:"patrick+ewing+biography+knicks", desc:"The life and career of the greatest Knick" },
            { title:"The Rivalry: Bill Russell, Wilt Chamberlain", author:"John Taylor", tag:"rivalry+russell+wilt+knicks+basketball", desc:"The NBA's golden age and the battles that shaped the Knicks' greatest years" },
            // RANGERS/ISLANDERS/DEVILS
            { title:"Blood on the Ice", author:"Gare Joyce", tag:"rangers+messier+1994+stanley+cup+blood+ice", desc:"The Rangers 1994 championship run — ending the 54-year drought" },
            { title:"Thunder and Lightning", author:"Phil Esposito", tag:"phil+esposito+rangers+autobiography", desc:"The Rangers GM's story of building the 1994 championship team" },
            { title:"Mike Bossy: The Boss", author:"Mike Bossy", tag:"mike+bossy+islanders+autobiography", desc:"The greatest pure goal scorer in NHL history tells his own story" },
            { title:"Four on the Floor", author:"Various", tag:"new+york+islanders+dynasty+four+cups", desc:"The story of the Islanders' four consecutive Stanley Cup championships" },
            { title:"Mark Messier: Hockey's Legendary Captain", author:"Various", tag:"mark+messier+biography+captain", desc:"The life and career of hockey's greatest leader" },
            { title:"Denis Potvin: Power On Ice", author:"Denis Potvin", tag:"denis+potvin+islanders+autobiography", desc:"The Islanders captain's story — breaking Orr's record and winning four Cups" },
            // GENERAL NY SPORTS
            { title:"The Boys of Summer", author:"Roger Kahn", tag:"boys+of+summer+roger+kahn+dodgers", desc:"The greatest sports book ever written — the Brooklyn Dodgers and their place in NY history" },
            { title:"New York Sports: A History", author:"Various", tag:"new+york+sports+history+book", desc:"The complete history of sports in the greatest city in the world" },
            { title:"Ghosts of Flatbush", author:"Michael Shapiro", tag:"ghosts+flatbush+brooklyn+dodgers+history", desc:"The Brooklyn Dodgers — NY's heartbreak story told in full" },
            { title:"The House That Ruth Built", author:"Robert Weintraub", tag:"house+ruth+built+yankee+stadium+history", desc:"The story of the original Yankee Stadium and its place in American culture" },
            { title:"City Game", author:"Matthew Goodman", tag:"city+game+new+york+basketball+history", desc:"How basketball became New York's game — the history of hoops in NYC" },
            { title:"Friday Night Lights", author:"H.G. Bissinger", tag:"friday+night+lights+football+book", desc:"Not NY but the greatest football book ever written — essential reading for any fan" },
            { title:"Ball Four", author:"Jim Bouton", tag:"ball+four+jim+bouton+yankees", desc:"The Yankees pitcher's diary that blew the lid off baseball — still controversial" },
            { title:"The Bronx is Burning", author:"Jonathan Mahler", tag:"bronx+is+burning+1977+yankees+book", desc:"1977 NYC, Billy Martin, Reggie Jackson and the summer that defined an era" },
            // WFAN/NY MEDIA
            { title:"The Last Commissioner", author:"Fay Vincent", tag:"fay+vincent+baseball+commissioner+book", desc:"Inside baseball from the man who ran it during the Yankees' early 90s resurgence" },
            { title:"Steinbrenner", author:"Bill Madden", tag:"steinbrenner+biography+bill+madden", desc:"The complete biography of the Boss — turbulent, brilliant and unforgettable" },
            { title:"Mariano Rivera: The Closer", author:"Mariano Rivera", tag:"mariano+rivera+closer+autobiography", desc:"Mo's own story — the greatest closer in baseball history" },
            { title:"Phil Rizzuto: A Yankee Tradition", author:"Various", tag:"phil+rizzuto+yankees+biography", desc:"Holy Cow! — the life of the Scooter, Yankees legend and beloved broadcaster" },
            { title:"The Natural: Joe DiMaggio", author:"Various", tag:"joe+dimaggio+natural+baseball+yankees", desc:"DiMaggio's place in American culture — baseball, Marilyn and the myth" },
            { title:"True Blue: The Cynical Fan's Guide to the Mets", author:"Various", tag:"mets+fan+guide+history+book", desc:"Everything a Mets fan needs to know — the good, the bad and the ugly" },
            { title:"Gang Green: An Irreverent Look at the Jets", author:"Barry Stanton", tag:"new+york+jets+gang+green+fan+book", desc:"The Jets through the eyes of long-suffering fans" },
            { title:"Hockey Is My Life", author:"Phil Esposito", tag:"phil+esposito+hockey+autobiography", desc:"One of the game's greats tells the full story of his career" },
            { title:"Ice Time: A Tale of Fathers, Sons and Hockey", author:"Jay Atkinson", tag:"ice+time+hockey+fathers+sons+book", desc:"The beauty of hockey and what it means to NY area fans" },
            { title:"42: The Jackie Robinson Story", author:"Various", tag:"jackie+robinson+42+biography", desc:"The story of baseball's greatest moment — Brooklyn, courage and breaking barriers" },
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

          <div style={{...styles.stdDivisionHeader, marginTop:20}}>👕 NY SPORTS GEAR</div>
          {[
            { title:"New York Yankees Gear", tag:"new+york+yankees+jersey+gear", desc:"Official Yankees jerseys, hats, merchandise" },
            { title:"New York Mets Gear", tag:"new+york+mets+jersey+gear", desc:"Official Mets jerseys, hats, merchandise" },
            { title:"New York Knicks Gear", tag:"new+york+knicks+jersey+gear", desc:"Official Knicks jerseys and merchandise" },
            { title:"NY Rangers Gear", tag:"new+york+rangers+jersey+gear", desc:"Official Rangers jerseys and hockey gear" },
            { title:"NY Giants Gear", tag:"new+york+giants+jersey+gear", desc:"Official Giants jerseys and NFL merchandise" },
            { title:"NY Jets Gear", tag:"new+york+jets+jersey+gear", desc:"Official Jets jerseys and NFL merchandise" },
            { title:"NY Islanders Gear", tag:"new+york+islanders+jersey+gear", desc:"Official Islanders jerseys and hockey gear" },
            { title:"NY Liberty Gear", tag:"new+york+liberty+wnba+gear", desc:"Official Liberty jerseys and WNBA gear" },
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

          <div style={{...styles.stdDivisionHeader, marginTop:20}}>🎵 NY SPORTS ON VINYL</div>
          {[
            { title:"Frank Sinatra — New York New York", tag:"frank+sinatra+new+york+new+york+vinyl", desc:"The ultimate NY anthem on vinyl" },
            { title:"NY Sports Theme Songs", tag:"new+york+sports+themes+vinyl", desc:"Classic NY sports anthems on vinyl" },
          ].map((v, i) => (
            <a key={i} href={`https://www.amazon.com/s?k=${encodeURIComponent(v.tag)}&tag=nysportsdaily-20`}
              target="_blank" rel="noopener noreferrer"
              style={{...styles.shopRow, ...(i%2===0?{}:{background:"#0f0f0f"})}}>
              <span style={styles.shopEmoji}>🎵</span>
              <div style={styles.shopInfo}>
                <span style={styles.shopTitle}>{v.title}</span>
                <span style={styles.shopDesc}>{v.desc}</span>
              </div>
              <span style={styles.shopBtn}>Shop →</span>
            </a>
          ))}

          <div style={{marginTop:20, padding:"12px 14px", background:"#0f0f0f", fontSize:10, color:"#555"}}>
            As an Amazon Associate, NY Sports Daily earns from qualifying purchases at no extra cost to you.
          </div>
        </div>
      )}
    </div>
  );
}

// ─── SHOP TAB ─────────────────────────────────────────────────────────────
// ─── RADIO TAB ────────────────────────────────────────────────────────────
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
  const [activeLeague, setActiveLeague] = useState("MLB");
  const [activeView, setActiveView]     = useState("PLAYOFF"); // PLAYOFF | STANDINGS
  const leagues = ["MLB","NFL","NBA","NHL","WNBA","MLS"];
  const [playoffData, setPlayoffData]   = useState({});
  const [loadingPlayoffs, setLoadingPlayoffs] = useState(true);

  // NY team identifiers in ESPN standings
  const NY_IDS = {
    MLB:  { teams:["10","21"],        names:{"10":"Yankees","21":"Mets"} },
    NFL:  { teams:["20","19"],        names:{"20":"Jets","19":"Giants"} },
    NBA:  { teams:["18","17"],        names:{"18":"Knicks","17":"Nets"} },
    NHL:  { teams:["13","22","1"],    names:{"13":"Rangers","22":"Islanders","1":"Devils"} },
    WNBA: { teams:["20"],            names:{"20":"Liberty"} },
  };

  const LEAGUE_CONFIGS = [
    { key:"MLB",  sport:"baseball",   league:"mlb",   emoji:"⚾", spots:12, label:"MLB Wild Card" },
    { key:"NBA",  sport:"basketball", league:"nba",   emoji:"🏀", spots:16, label:"NBA Playoffs"  },
    { key:"NHL",  sport:"hockey",     league:"nhl",   emoji:"🏒", spots:16, label:"NHL Playoffs"  },
    { key:"NFL",  sport:"football",   league:"nfl",   emoji:"🏈", spots:14, label:"NFL Playoffs"  },
    { key:"WNBA", sport:"basketball", league:"wnba",  emoji:"🏀", spots:8,  label:"WNBA Playoffs" },
  ];

  useEffect(() => {
    async function load() {
      setLoadingPlayoffs(true);
      const out = {};
      await Promise.all(LEAGUE_CONFIGS.map(async ({ key, sport, league, spots }) => {
        try {
          // Use /apis/v2/ for standings (confirmed correct endpoint)
          const r = await fetch(`https://site.api.espn.com/apis/v2/sports/${sport}/${league}/standings`);
          if (!r.ok) return;
          const data = await r.json();
          const allTeams = [];
          function walk(node) {
            if (node?.standings?.entries) {
              node.standings.entries.forEach(e => {
                const t = e.team;
                const stats = {};
                (e.stats||[]).forEach(s => { stats[s.name] = s.displayValue ?? s.value; });
                allTeams.push({
                  id: String(t.id),
                  name: t.shortDisplayName || t.displayName || t.name,
                  abbr: t.abbreviation,
                  logo: t.logos?.[0]?.href || null,
                  color: t.color ? `#${t.color}` : "#888",
                  wins:   parseFloat(stats.wins   || stats.w   || 0),
                  losses: parseFloat(stats.losses  || stats.l   || 0),
                  pct:    parseFloat(stats.winPercent || 0),
                  gb:     stats.gamesBehind || stats.gb || null,
                  pts:    parseFloat(stats.points || 0),
                  clinched: stats.clinched || null,
                });
              });
            }
            (node?.children || []).forEach(walk);
          }
          (data.children || []).forEach(walk);
          if (!allTeams.length) return;

          // Sort by wins (or points for NHL)
          const sorted = [...allTeams].sort((a,b) =>
            key==="NHL" ? b.pts-a.pts : b.wins-a.losses-(a.wins-b.losses) || b.pct-a.pct
          );

          const nyConfig = NY_IDS[key];
          if (!nyConfig) return;
          const nyTeams = allTeams.filter(t => nyConfig.teams.includes(t.id))
            .map(t => {
              const rank = sorted.findIndex(s=>s.id===t.id)+1;
              const halfSpots = Math.ceil(spots/2);
              const inPlayoffs = rank <= halfSpots || rank <= spots;
              return { ...t, rank, inPlayoffs, totalTeams: allTeams.length };
            });
          if (nyTeams.length) out[key] = { nyTeams, label: LEAGUE_CONFIGS.find(l=>l.key===key)?.label, emoji: LEAGUE_CONFIGS.find(l=>l.key===key)?.emoji, spots };
        } catch(e) {}
      }));
      setPlayoffData(out);
      setLoadingPlayoffs(false);
    }
    load();
  }, []);

  const filtered = standings.filter(s => s.league === activeLeague);

  return (
    <div style={styles.stdRoot}>
      <div style={styles.stdHeader}>
        <h2 style={styles.stdTitle}>📊 NY TEAMS STANDINGS & PLAYOFF TRACKER</h2>
        <p style={styles.stdSub}>WHERE YOUR TEAMS STAND RIGHT NOW</p>
      </div>

      {/* View toggle */}
      <div style={{display:"flex", gap:6, marginBottom:16}}>
        {["PLAYOFF PICTURE","FULL STANDINGS"].map(v => (
          <button key={v} onClick={() => setActiveView(v==="PLAYOFF PICTURE" ? "PLAYOFF" : "STANDINGS")}
            style={{...styles.filterBtn, ...(activeView===(v==="PLAYOFF PICTURE"?"PLAYOFF":"STANDINGS") ? styles.filterBtnActive : {}), fontSize:10, padding:"6px 14px"}}>
            {v}
          </button>
        ))}
      </div>

      {/* ── PLAYOFF PICTURE ── */}
      {activeView === "PLAYOFF" && (
        <div>
          {loadingPlayoffs ? (
            <div style={styles.loading}>
              <div style={styles.loadingDots}>{[0,1,2].map(i=><span key={i} style={{...styles.dot,animationDelay:`${i*0.2}s`}}/>)}</div>
              <p style={styles.loadingText}>LOADING PLAYOFF PICTURE...</p>
            </div>
          ) : Object.keys(playoffData).length === 0 ? (
            <div style={{padding:"20px 0", color:"#666", fontSize:12}}>
              Standings data unavailable — some leagues may be in offseason. Check back when the season starts.
            </div>
          ) : (
            <div style={{display:"flex", flexDirection:"column", gap:10}}>
              {LEAGUE_CONFIGS.map(({ key, emoji }) => {
                const ld = playoffData[key];
                if (!ld?.nyTeams?.length) return null;
                return ld.nyTeams.map(team => {
                  const inPlay = team.inPlayoffs;
                  const pct = team.pct > 0 ? (team.pct*100).toFixed(1)+"%" : team.wins > 0 ? ((team.wins/(team.wins+team.losses))*100).toFixed(1)+"%" : "—";
                  const barW = Math.min(100, team.pct>0 ? Math.round(team.pct*100) : team.wins>0 ? Math.round(team.wins/(team.wins+team.losses)*100) : 0);
                  const record = key==="NHL" ? `${team.wins}W · ${team.pts}PTS` : `${team.wins}–${team.losses}`;
                  return (
                    <div key={team.id} style={{
                      display:"flex", alignItems:"center", gap:12,
                      padding:"12px 16px",
                      background:"#141414",
                      border:`1px solid ${inPlay?"#22c55e44":"#c8201c33"}`,
                      borderLeft:`4px solid ${inPlay?"#22c55e":"#c8201c"}`,
                      borderRadius:3, flexWrap:"wrap",
                    }}>
                      {team.logo && <img src={team.logo} alt="" style={{width:36,height:36,objectFit:"contain",flexShrink:0}} onError={e=>e.target.style.display="none"} />}
                      <div style={{flex:1, minWidth:120}}>
                        <div style={{display:"flex", alignItems:"center", gap:8, marginBottom:4, flexWrap:"wrap"}}>
                          <span style={{fontSize:14, fontWeight:900, color:"#fff", fontFamily:"'Georgia',serif"}}>{team.name}</span>
                          <span style={{fontSize:9, color:"#666", letterSpacing:"0.1em"}}>{emoji} {key}</span>
                        </div>
                        <div style={{display:"flex", alignItems:"center", gap:8}}>
                          <div style={{flex:1, height:6, background:"#222", borderRadius:3, overflow:"hidden", minWidth:80}}>
                            <div style={{height:"100%", width:`${barW}%`, background:inPlay?"#22c55e":"#c8201c", borderRadius:3}} />
                          </div>
                          <span style={{fontSize:11, fontWeight:700, color:"#aaa", whiteSpace:"nowrap"}}>{record}</span>
                        </div>
                      </div>
                      <div style={{textAlign:"right", flexShrink:0}}>
                        <div style={{fontSize:11, fontWeight:900, letterSpacing:"0.08em",
                          color: inPlay ? "#22c55e" : "#c8201c"}}>
                          {inPlay ? "✅ IN" : "❌ OUT"}
                        </div>
                        <div style={{fontSize:10, color:"#555"}}>
                          #{team.rank} of {team.totalTeams}
                          {team.gb && team.gb !== "0" && ` · ${team.gb} GB`}
                        </div>
                        {team.clinched && <div style={{fontSize:9, color:"#22c55e", marginTop:2}}>{team.clinched}</div>}
                      </div>
                    </div>
                  );
                });
              })}
              <div style={{fontSize:9, color:"#555", padding:"8px 0", fontStyle:"italic"}}>
                Live from ESPN · Updates with each game · {new Date().toLocaleDateString("en-US",{month:"short",day:"numeric",hour:"2-digit",minute:"2-digit"})}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── FULL STANDINGS ── */}
      {activeView === "STANDINGS" && (
        <>
          <div style={styles.filterGroup}>
            {leagues.map(l => (
              <button key={l} onClick={() => setActiveLeague(l)}
                style={{...styles.filterBtn, ...(activeLeague===l ? styles.filterBtnActive : {})}}>
                {l}
              </button>
            ))}
          </div>
          {loading ? (
            <div style={styles.loading}>
              <div style={styles.loadingDots}>{[0,1,2].map(i=><span key={i} style={{...styles.dot,animationDelay:`${i*0.2}s`}}/>)}</div>
              <p style={styles.loadingText}>LOADING STANDINGS...</p>
            </div>
          ) : filtered.length === 0 ? (
            <div style={styles.empty}>
              <span style={styles.emptyIcon}>📊</span>
              <p style={styles.emptyText}>NO STANDINGS AVAILABLE</p>
            </div>
          ) : (
            <div style={styles.stdGroups}>
              {filtered.map((group, gi) => (
                <div key={gi} style={styles.stdGroup}>
                  <div style={styles.stdDivisionHeader}>{group.division}</div>
                  <div style={styles.stdTable}>
                    <div style={styles.stdRowHeader}>
                      <span style={styles.stdColTeam}>TEAM</span>
                      <span style={styles.stdColStat}>W</span>
                      <span style={styles.stdColStat}>L</span>
                      <span style={styles.stdColStat}>PCT</span>
                      <span style={styles.stdColStat}>GB</span>
                    </div>
                    {group.rows.map((row, i) => (
                      <div key={i} style={{...styles.stdRow, ...(row.isNY ? styles.stdRowNY : {}), ...(i%2===0?{}:styles.stdRowAlt)}}>
                        <span style={styles.stdColTeam}>
                          {row.logo && <img src={row.logo} alt="" style={styles.stdLogo} onError={e=>e.target.style.display="none"} />}
                          <span style={{...styles.stdTeamName, ...(row.isNY?{color:"#e8e0d0",fontWeight:900}:{})}}>{row.team}</span>
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
            </div>
          )}
        </>
      )}
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
  title: "NY SPORTS DAILY · SUNDAY CHALLENGE",
  date:  new Date().toLocaleDateString("en-US",{weekday:"long",month:"long",day:"numeric",year:"numeric"}),
  size:  15,
  solution: [
    ["N","A","M","A","T","H",".","B","O","S","S","Y",".","L","T"],
    ["E",".","E",".",".","O","M","A","R",".","H",".",".","E","."],
    ["T","R","O","T","T","I","E","R",".","P","E","A","R","L","S"],
    ["S",".","W",".",".",".","S",".",".",".",".","N",".",".","E"],
    [".","P","I","A","Z","Z","A",".","G","E","H","R","I","G","."],
    ["R","A","N","G","E","R","S",".","A",".",".","K",".",".","E"],
    ["E","R","A",".","W","I","L","L","I","S",".","E",".","J","W"],
    ["E",".",".","S","T","A","D","I","U","M",".","R",".","E","."],
    ["D","I","V","I","S","I","O","N",".","E","A","S","T",".","B"],
    [".","S",".",".","T",".",".","G","O","D","E","N",".","T","A"],
    [".","L","E","E","C","H",".","A",".",".",".",".","R","E","R"],
    ["M","E","S","S","I","E","R",".","N","A","S","S","A","U","."],
    ["S",".",".","T","O","M","S","E","A","V","E","R",".",".","."],
    ["G","Y","O","G","I",".","T",".",".",".",".","E","A","S","T"],
    [".",".","L",".",".","C","U","P",".",".",".","D",".",".","S"],
  ],
  across: [
    { number:1,  row:0,  col:0,  len:6,  clue:"Broadway QB who guaranteed it" },
    { number:7,  row:0,  col:7,  len:5,  clue:"Islander who scored 50 in 50" },
    { number:12, row:0,  col:13, len:2,  clue:"Giants LB initials, the greatest defender" },
    { number:13, row:2,  col:0,  len:8,  clue:"Islanders dynasty center, Bryan ___" },
    { number:15, row:2,  col:9,  len:6,  clue:"Monroe's nickname, also a gem" },
    { number:16, row:4,  col:1,  len:7,  clue:"9/11 home run hero, Mike ___" },
    { number:18, row:4,  col:9,  len:6,  clue:"Iron Horse's real surname" },
    { number:19, row:5,  col:0,  len:7,  clue:"Broadway blue-and-red, the ___" },
    { number:21, row:6,  col:0,  len:3,  clue:"Gooden's best stat category abbrev" },
    { number:22, row:6,  col:4,  len:6,  clue:"___ Reed, limping hero of 1970 Finals" },
    { number:24, row:7,  col:3,  len:7,  clue:"Where the Knicks and Rangers play" },
    { number:25, row:8,  col:0,  len:8,  clue:"NL ___ — Mets and Yankees fight for it" },
    { number:27, row:9,  col:7,  len:6,  clue:"Doc Gooden's nickname, reverse spelling" },
    { number:28, row:10, col:1,  len:6,  clue:"Rangers Conn Smythe winner '94, Brian ___" },
    { number:29, row:11, col:0,  len:7,  clue:"The Captain who ended the 54-year drought" },
    { number:30, row:11, col:8,  len:6,  clue:"Islanders dynasty arena, ___ Coliseum" },
    { number:31, row:12, col:0,  len:9,  clue:"Tom ___, the franchise ace, Mr. Met" },
    { number:32, row:13, col:0,  len:5,  clue:"It ain't over — Berra's first name" },
    { number:33, row:13, col:6,  len:1,  clue:"See 6-Down" },
    { number:34, row:13, col:11, len:4,  clue:"AL ___ — Yankees' division" },
    { number:35, row:14, col:7,  len:3,  clue:"What Messier hoisted in 1994" },
  ],
  down: [
    { number:1,  row:0,  col:0,  len:8,  clue:"Brooklyn hoops — the ___" },
    { number:2,  row:0,  col:2,  len:4,  clue:"Mets pitcher Dwight ___ at 20" },
    { number:3,  row:0,  col:3,  len:4,  clue:"Yankees Pennant run month, abbrev" },
    { number:4,  row:0,  col:7,  len:4,  clue:"Orioles' ___ Robinson who tormented NY" },
    { number:5,  row:0,  col:8,  len:4,  clue:"___ Darling, '86 Mets rotation" },
    { number:6,  row:0,  col:9,  len:14, clue:"Seats at the Garden: sold ___" },
    { number:7,  row:0,  col:11, len:4,  clue:"Yankee hero's HR total in 1927 season" },
    { number:8,  row:2,  col:7,  len:5,  clue:"Ricky ___, Mets stolen base king" },
    { number:9,  row:1,  col:6,  len:5,  clue:"The ___ Mets — 1969 nickname" },
    { number:10, row:4,  col:8,  len:6,  clue:"Yankee Stadium used to be The ___ That Ruth Built" },
    { number:11, row:4,  col:11, len:5,  clue:"___ King, 32.9 PPG Knick" },
    { number:14, row:5,  col:6,  len:5,  clue:"Mookie Wilson position, outfield abbrev" },
    { number:17, row:6,  col:13, len:5,  clue:"Jets QB who wore #12, ___ Pennington" },
    { number:20, row:7,  col:11, len:4,  clue:"Rangers all-time points leader, Rod ___" },
    { number:23, row:8,  col:10, len:5,  clue:"Islanders goalie Billy ___, Battlin' Billy" },
    { number:26, row:11, col:5,  len:4,  clue:"Mets stadium after Shea: ___ Field" },
  ],
};

// ─── CROSSWORD COMPONENT ───────────────────────────────────────────────────
function CrosswordTab() {
  const [puzzle, setPuzzle]             = useState(SAMPLE_PUZZLE);
  const [loadingPuzzle, setLoadingPuzzle] = useState(true);

  // Load weekly puzzle from Supabase — falls back to SAMPLE_PUZZLE
  useEffect(() => {
    const weekNum = Math.floor((Date.now() - new Date(new Date().getFullYear(),0,0)) / (86400000*7));
    sbFetch("ny_crossword", `?week_num=eq.${weekNum}&select=puzzle_json&limit=1`)
      .then(rows => {
        if (rows && rows[0]?.puzzle_json) {
          try { setPuzzle(JSON.parse(rows[0].puzzle_json)); } catch(e) {}
        }
      })
      .catch(() => {})
      .finally(() => setLoadingPuzzle(false));
  }, []);

  const ROWS = puzzle.solution.length;
  const COLS = puzzle.solution[0].length;
  const CELL = 34; // px per cell — larger for better usability

  const numberMap = {};
  [...puzzle.across, ...puzzle.down].forEach(c => { numberMap[`${c.row}-${c.col}`] = c.number; });

  const cellClues = {};
  puzzle.across.forEach(c => {
    for (let i = 0; i < c.len; i++) {
      const key = `${c.row}-${c.col+i}`;
      if (!cellClues[key]) cellClues[key] = {};
      cellClues[key].across = c.number;
    }
  });
  puzzle.down.forEach(c => {
    for (let i = 0; i < c.len; i++) {
      const key = `${c.row+i}-${c.col}`;
      if (!cellClues[key]) cellClues[key] = {};
      cellClues[key].down = c.number;
    }
  });

  const [userGrid, setUserGrid]         = useState(() => Array.from({length:ROWS}, ()=>Array(COLS).fill("")));
  const [selectedCell, setSelectedCell] = useState(null);
  const [direction, setDirection]       = useState("across");
  const [checked, setChecked]           = useState({});
  const [revealed, setRevealed]         = useState(false);
  const [complete, setComplete]         = useState(false);
  const inputRefs = useRef({});

  // Reset grid when puzzle changes
  useEffect(() => {
    setUserGrid(Array.from({length:puzzle.solution.length}, ()=>Array(puzzle.solution[0].length).fill("")));
    setChecked({}); setRevealed(false); setComplete(false); setSelectedCell(null);
  }, [puzzle]);

  function isBlack(r,c) { return puzzle.solution[r]?.[c] === "."; }

  function getActiveClueNum() {
    if (!selectedCell) return null;
    return cellClues[`${selectedCell.r}-${selectedCell.c}`]?.[direction] || null;
  }

  function getActiveClueObj() {
    const num = getActiveClueNum();
    if (!num) return null;
    return (direction==="across" ? puzzle.across : puzzle.down).find(c=>c.number===num);
  }

  function selectCell(r, c) {
    if (isBlack(r,c)) return;
    if (selectedCell?.r===r && selectedCell?.c===c) {
      setDirection(d => d==="across" ? "down" : "across");
    } else {
      setSelectedCell({r,c});
    }
    setTimeout(() => inputRefs.current[`${r}-${c}`]?.focus(), 0);
  }

  function handleKey(r, c, e) {
    const letter = e.key.toUpperCase();
    if (e.key === "Tab") { e.preventDefault(); nextClue(); return; }
    if (letter.length===1 && letter>="A" && letter<="Z") {
      const ng = userGrid.map(row=>[...row]);
      ng[r][c] = letter;
      setUserGrid(ng);
      setChecked(prev=>{ const n={...prev}; delete n[`${r}-${c}`]; return n; });
      advanceCursor(r, c, ng);
    } else if (e.key==="Backspace") {
      const ng = userGrid.map(row=>[...row]);
      if (ng[r][c]) { ng[r][c]=""; setUserGrid(ng); }
      else retreatCursor(r, c);
    } else if (e.key==="ArrowRight") { e.preventDefault(); setDirection("across"); moveTo(r,c+1); }
    else if (e.key==="ArrowLeft")   { e.preventDefault(); setDirection("across"); moveTo(r,c-1); }
    else if (e.key==="ArrowDown")   { e.preventDefault(); setDirection("down");   moveTo(r+1,c); }
    else if (e.key==="ArrowUp")     { e.preventDefault(); setDirection("down");   moveTo(r-1,c); }
  }

  function moveTo(r,c) {
    if (r>=0&&r<ROWS&&c>=0&&c<COLS&&!isBlack(r,c)) { setSelectedCell({r,c}); setTimeout(()=>inputRefs.current[`${r}-${c}`]?.focus(),0); }
  }

  function advanceCursor(r, c, grid) {
    const done = puzzle.solution.every((row,r2)=>row.every((cell,c2)=>cell==="."||grid[r2][c2]===cell));
    if (done) { setComplete(true); return; }
    if (direction==="across") { for(let nc=c+1;nc<COLS;nc++) { if(!isBlack(r,nc)){moveTo(r,nc);return;} } }
    else { for(let nr=r+1;nr<ROWS;nr++) { if(!isBlack(nr,c)){moveTo(nr,c);return;} } }
  }

  function retreatCursor(r, c) {
    if (direction==="across") { for(let nc=c-1;nc>=0;nc--) { if(!isBlack(r,nc)){moveTo(r,nc);return;} } }
    else { for(let nr=r-1;nr>=0;nr--) { if(!isBlack(nr,c)){moveTo(nr,c);return;} } }
  }

  function nextClue() {
    const clues = direction==="across" ? puzzle.across : puzzle.down;
    const num = getActiveClueNum();
    const idx = clues.findIndex(c=>c.number===num);
    const next = clues[(idx+1)%clues.length];
    setSelectedCell({r:next.row,c:next.col});
    setTimeout(()=>inputRefs.current[`${next.row}-${next.col}`]?.focus(),0);
  }

  function handleCheck() {
    const newChecked = {};
    puzzle.solution.forEach((row,r) => row.forEach((cell,c) => {
      if (cell!=="."&&userGrid[r][c]) {
        newChecked[`${r}-${c}`] = userGrid[r][c]===cell ? "correct" : "wrong";
      }
    }));
    setChecked(newChecked);
  }

  function handleReveal() {
    setRevealed(true);
    setUserGrid(puzzle.solution.map(row=>row.map(c=>c==="."?"":c)));
    setComplete(true);
  }

  function handlePrint() {
    const numMap = {};
    [...puzzle.across, ...puzzle.down].forEach(c=>{ numMap[`${c.row}-${c.col}`]=c.number; });
    const CS = 36; // cell size px for print

    let gridRows = "";
    puzzle.solution.forEach((row,r) => {
      let cells = "";
      row.forEach((cell,c) => {
        const blk = cell===".";
        const num = numMap[`${r}-${c}`];
        cells += `<td class="${blk?"black":""}" style="width:${CS}px;height:${CS}px;border:1.5px solid #333;
          background-color:${blk?"#000":"#fff"} !important;position:relative;vertical-align:top;
          box-sizing:border-box;padding:0;">
          ${!blk&&num ? `<span style="position:absolute;top:2px;left:2px;font-size:8px;line-height:1;">${num}</span>` : ""}
          ${!blk&&revealed ? `<span style="position:absolute;bottom:2px;width:100%;text-align:center;font-size:16px;font-weight:bold;">${cell}</span>` : ""}
        </td>`;
      });
      gridRows += `<tr>${cells}</tr>`;
    });

    const aClues = puzzle.across.map(c=>`<div style="font-size:10px;padding:1px 0;"><b>${c.number}.</b> ${c.clue}</div>`).join("");
    const dClues = puzzle.down.map(c=>`<div style="font-size:10px;padding:1px 0;"><b>${c.number}.</b> ${c.clue}</div>`).join("");

    const html = `<!DOCTYPE html><html><head><title>${puzzle.title}</title>
    <style>
      *{box-sizing:border-box; -webkit-print-color-adjust:exact !important; print-color-adjust:exact !important; color-adjust:exact !important;}
      body{font-family:Georgia,serif;margin:16px;color:#000;}
      h2{text-align:center;font-size:18px;margin:0 0 2px;}
      .sub{text-align:center;font-size:11px;color:#555;margin:0 0 12px;}
      .layout{display:flex;gap:20px;align-items:flex-start;}
      table{border-collapse:collapse;flex-shrink:0;}
      td{border:1.5px solid #333 !important;}
      td.black{background:#000 !important;}
      .clues{flex:1;display:flex;gap:16px;}
      .col{flex:1;}
      .col h3{font-size:12px;font-weight:bold;border-bottom:2px solid #000;margin:0 0 6px;padding-bottom:3px;}
      @media print{
        body{margin:8px;}
        @page{margin:0.5in;}
        td.black{background:#000 !important;}
      }
    </style></head><body>
    <h2>${puzzle.title}</h2>
    <p class="sub">${puzzle.date} · NY Sports Crossword · nysportsdaily.com</p>
    <div class="layout">
      <table>${gridRows}</table>
      <div class="clues">
        <div class="col"><h3>ACROSS</h3>${aClues}</div>
        <div class="col"><h3>DOWN</h3>${dClues}</div>
      </div>
    </div>
    <script>setTimeout(()=>window.print(),300);</script>
    </body></html>`;

    const w = window.open("","_blank","width=900,height=700");
    if (w) { w.document.write(html); w.document.close(); }
    else alert("Please allow popups to print the crossword.");
  }

  function getCellBg(r, c) {
    if (isBlack(r,c)) return "#111";
    const key = `${r}-${c}`;
    const isSel = selectedCell?.r===r && selectedCell?.c===c;
    const clueNum = getActiveClueNum();
    const isHl = clueNum && cellClues[key]?.[direction]===clueNum;
    const chk = checked[key];
    if (isSel) return "#f5e642";
    if (isHl)  return "#d4edff";
    if (chk==="wrong")   return "#ffc0c0";
    if (chk==="correct") return "#c0ffc0";
    return "#fff";
  }

  const activeClueObj = getActiveClueObj();

  if (loadingPuzzle) return (
    <div style={{padding:40, textAlign:"center", color:"#888"}}>Loading puzzle...</div>
  );

  return (
    <div style={styles.xwRoot}>
      <div style={styles.xwHeader}>
        <div>
          <h2 style={styles.xwTitle}>{puzzle.title}</h2>
          <p style={styles.xwDate}>{puzzle.date} · {ROWS}×{COLS} · NY SPORTS CROSSWORD</p>
        </div>
        <div style={styles.xwActions}>
          <button onClick={handleCheck} style={styles.xwBtn}>✓ CHECK</button>
          <button onClick={handleReveal} style={{...styles.xwBtn, ...styles.xwBtnReveal}}>REVEAL</button>
          <button onClick={handlePrint} style={{...styles.xwBtn, color:"#aaa"}}>🖨 PRINT</button>
        </div>
      </div>

      {complete && (
        <div style={styles.xwComplete}>🎉 SOLVED! New York sports fan confirmed.</div>
      )}

      {/* Active clue banner */}
      {activeClueObj && (
        <div style={styles.xwActiveClueBanner}>
          <span style={styles.xwActiveClueNum}>{activeClueObj.number}{direction==="across"?"A":"D"}</span>
          <span style={styles.xwActiveClueText}>{activeClueObj.clue}</span>
          <span style={styles.xwActiveClueDir}>{direction.toUpperCase()}</span>
        </div>
      )}

      {/* Main layout — grid left, clues right */}
      <div style={{display:"flex", gap:16, alignItems:"flex-start", flexWrap:"wrap"}}>

        {/* GRID */}
        <div style={{flexShrink:0, overflowX:"auto"}}>
          <div style={{
            display:"grid",
            gridTemplateColumns:`repeat(${COLS}, ${CELL}px)`,
            gridTemplateRows:`repeat(${ROWS}, ${CELL}px)`,
            border:"2px solid #333",
            width: COLS*CELL,
          }}>
            {puzzle.solution.map((row,r) => row.map((cell,c) => {
              const num = numberMap[`${r}-${c}`];
              const blk = isBlack(r,c);
              const bg  = getCellBg(r,c);
              return (
                <div key={`${r}-${c}`}
                  onClick={()=>selectCell(r,c)}
                  style={{
                    width:CELL, height:CELL,
                    background: bg,
                    borderRight: c<COLS-1 ? "1px solid #bbb" : "none",
                    borderBottom: r<ROWS-1 ? "1px solid #bbb" : "none",
                    position:"relative", cursor: blk?"default":"pointer",
                    display:"flex", alignItems:"center", justifyContent:"center",
                  }}>
                  {!blk && num && (
                    <span style={{
                      position:"absolute", top:2, left:2,
                      fontSize:8, lineHeight:1, color:"#333", fontWeight:700, zIndex:1,
                    }}>{num}</span>
                  )}
                  {!blk && (
                    <input
                      ref={el=>{ if(el) inputRefs.current[`${r}-${c}`]=el; }}
                      value={userGrid[r]?.[c]||""}
                      onChange={()=>{}}
                      onKeyDown={e=>handleKey(r,c,e)}
                      onFocus={()=>selectCell(r,c)}
                      maxLength={1}
                      style={{
                        width:"100%", height:"100%",
                        background:"transparent", border:"none", outline:"none",
                        textAlign:"center", fontSize:16, fontWeight:700,
                        color: revealed?"#c8201c":"#111",
                        cursor:"pointer", caretColor:"transparent",
                        fontFamily:"Georgia,serif", paddingTop:8,
                      }}
                    />
                  )}
                </div>
              );
            }))}
          </div>
        </div>

        {/* CLUES */}
        <div style={{flex:1, minWidth:220, display:"flex", gap:12, maxHeight:ROWS*CELL, overflowY:"auto"}}>
          <div style={{flex:1}}>
            <div style={styles.xwClueHeader}>ACROSS</div>
            {puzzle.across.map(cl => {
              const isAct = direction==="across" && getActiveClueNum()===cl.number;
              return (
                <div key={cl.number}
                  onClick={()=>{ setSelectedCell({r:cl.row,c:cl.col}); setDirection("across"); setTimeout(()=>inputRefs.current[`${cl.row}-${cl.col}`]?.focus(),0); }}
                  style={{...styles.xwClueItem, ...(isAct?styles.xwClueItemActive:{})}}>
                  <span style={styles.xwClueNum}>{cl.number}</span>
                  <span style={styles.xwClueText}>{cl.clue}</span>
                </div>
              );
            })}
          </div>
          <div style={{flex:1}}>
            <div style={styles.xwClueHeader}>DOWN</div>
            {puzzle.down.map(cl => {
              const isAct = direction==="down" && getActiveClueNum()===cl.number;
              return (
                <div key={cl.number}
                  onClick={()=>{ setSelectedCell({r:cl.row,c:cl.col}); setDirection("down"); setTimeout(()=>inputRefs.current[`${cl.row}-${cl.col}`]?.focus(),0); }}
                  style={{...styles.xwClueItem, ...(isAct?styles.xwClueItemActive:{})}}>
                  <span style={styles.xwClueNum}>{cl.number}</span>
                  <span style={styles.xwClueText}>{cl.clue}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Supabase note */}
      <div style={{marginTop:12, padding:"8px 12px", background:"#111", fontSize:10, color:"#555", borderLeft:"2px solid #2a2a2a"}}>
        💡 New puzzle each week. To add more puzzles: create a <code style={{color:"#888"}}>ny_crossword</code> table in Supabase with <code style={{color:"#888"}}>week_num</code> (int) and <code style={{color:"#888"}}>puzzle_json</code> (text) columns.
      </div>
    </div>
  );
}


// ─── STYLES ────────────────────────────────────────────────────────────────
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
    display: "flex", borderBottom: "2px solid #333",
    marginBottom: 20, marginTop: 16,
    overflowX: "auto", scrollbarWidth: "none",
    WebkitOverflowScrolling: "touch",
  },
  tabBtn: {
    padding: "10px 14px", border: "none", background: "transparent",
    color: "#666", cursor: "pointer", fontSize: 11,
    fontWeight: 900, letterSpacing: "0.08em",
    fontFamily: "'Georgia', serif",
    transition: "all 0.15s", whiteSpace: "nowrap", flexShrink: 0,
  },
  tabBtnActive: {
    color: "#888", borderBottom: "3px solid #888",
  },

  // FILTER BAR
  filterBar: {
    display: "flex", justifyContent: "space-between", alignItems: "center",
    flexWrap: "wrap", gap: 8, marginBottom: 20,
  },
  filterGroup: { display: "flex", flexWrap: "wrap", gap: 4 },
  filterBtn: {
    padding: "5px 12px", border: "1px solid #333", background: "transparent",
    color: "#888", cursor: "pointer", fontSize: 10, letterSpacing: "0.1em",
    fontFamily: "'Georgia', serif", fontWeight: 700, transition: "all 0.15s",
  },
  filterBtnActive: { background: "#c8201c", border: "1px solid #c8201c", color: "#fff" },
  nyToggle: {
    padding: "5px 14px", border: "1px solid #555", background: "transparent",
    color: "#888", cursor: "pointer", fontSize: 10, letterSpacing: "0.1em",
    fontFamily: "'Georgia', serif", fontWeight: 700, transition: "all 0.15s",
  },
  nyToggleActive: { background: "#1a3a2a", border: "1px solid #2d8a50", color: "#4ade80" },

  // SCORES GRID
  scoresGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
    gap: 12,
  },
  scoreCard: {
    background: "#161616", border: "1px solid #2a2a2a",
    padding: "14px 16px", position: "relative",
    transition: "border-color 0.2s",
  },
  scoreCardNY: { border: "1px solid #c8201c" },
  nyBadge: {
    position: "absolute", top: 0, right: 0,
    background: "#c8201c", color: "#fff",
    fontSize: 9, fontWeight: 900, padding: "2px 6px",
    letterSpacing: "0.1em",
  },
  scoreCardSport: {
    fontSize: 9, letterSpacing: "0.2em", color: "#999",
    fontWeight: 900, marginBottom: 10,
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

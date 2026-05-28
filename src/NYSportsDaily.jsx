import { useState, useEffect, useCallback, useRef } from "react";

// ─── SUPABASE CONFIG ───────────────────────────────────────────────────────
const SUPABASE_URL = "https://fnxoucliekhotvartyfu.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZueG91Y2xpZWtob3R2YXJ0eWZ1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM5NTI3MzEsImV4cCI6MjA4OTUyODczMX0.V4A75JO9s-7MbDRY7VMydwydOvdkU4SNSz_BRoVAoqA";

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
const NY_NEWS_ENDPOINTS = [
  { sport:"baseball",   league:"mlb",   name:"MLB"  },
  { sport:"football",   league:"nfl",   name:"NFL"  },
  { sport:"basketball", league:"nba",   name:"NBA"  },
  { sport:"hockey",     league:"nhl",   name:"NHL"  },
  { sport:"basketball", league:"wnba",  name:"WNBA" },
  { sport:"soccer",     league:"usa.1", name:"MLS"  },
  { sport:"soccer",     league:"nwsl",  name:"NWSL" },
];

// Also fetch team-specific news for NY teams
const NY_TEAM_NEWS = [
  { sport:"baseball",   league:"mlb",  id:"10",    name:"Yankees" },
  { sport:"baseball",   league:"mlb",  id:"21",    name:"Mets"    },
  { sport:"football",   league:"nfl",  id:"20",    name:"Jets"    },
  { sport:"football",   league:"nfl",  id:"19",    name:"Giants"  },
  { sport:"basketball", league:"nba",  id:"18",    name:"Knicks"  },
  { sport:"basketball", league:"nba",  id:"17",    name:"Nets"    },
  { sport:"hockey",     league:"nhl",  id:"13",    name:"Rangers" },
  { sport:"hockey",     league:"nhl",  id:"22",    name:"Islanders"},
  { sport:"hockey",     league:"nhl",  id:"1",     name:"Devils"  },
  { sport:"basketball", league:"wnba", id:"20",    name:"Liberty" },
];

// Additional NY Extra news endpoints
const NY_EXTRA_NEWS = [
  { sport:"football",   league:"nfl",  id:"20",    name:"Jets"      },
  { sport:"football",   league:"nfl",  id:"19",    name:"Giants"    },
  { sport:"hockey",     league:"nhl",  id:"1",     name:"Devils"    },
  { sport:"soccer",     league:"usa.1",id:"18479", name:"NYCFC"     },
  { sport:"soccer",     league:"nwsl", id:"1163",  name:"Gotham FC" },
];

// Free RSS feeds via rss2json (best chance of working in browser)
const FREE_RSS_FEEDS = [
  { url:"https://api.foxsports.com/v2/content/optimized-rss-feed?legacy=true&hl=en-US&sourceId=5add9f40-5bfc-4f3c-ab9c-88e81437af3e", name:"Fox Sports" },
  { url:"https://www.espn.com/espn/rss/nfl/news", name:"ESPN NFL" },
  { url:"https://www.espn.com/espn/rss/mlb/news", name:"ESPN MLB" },
  { url:"https://www.espn.com/espn/rss/nba/news", name:"ESPN NBA" },
  { url:"https://www.espn.com/espn/rss/nhl/news", name:"ESPN NHL" },
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
  "new york yankees","new york mets","new york jets","new york giants",
  "new york knicks","brooklyn nets","new york rangers","new york islanders",
  "new jersey devils","new york liberty","nycfc","red bulls","gotham fc",
  "yankees","mets","knicks","nets","islanders","liberty",
  // Use full names only for teams with common words in other team names
  // Avoid: "giants" (SF Giants), "rangers" (Texas Rangers), "jets" (generic)
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
  // YANKEES
  { quote: "I want to thank the Good Lord for making me a Yankee.", author: "Joe DiMaggio", team: "Yankees" },
  { quote: "Some people say New York is the capital of the world. I wouldn't argue with that.", author: "Derek Jeter", team: "Yankees" },
  { quote: "We are the Yankees. We don't rebuild, we reload.", author: "Derek Jeter", team: "Yankees" },
  { quote: "The way a team plays as a whole determines its success.", author: "Babe Ruth", team: "Yankees" },
  { quote: "It ain't over till it's over.", author: "Yogi Berra", team: "Yankees" },
  { quote: "You can observe a lot just by watching.", author: "Yogi Berra", team: "Yankees" },
  { quote: "When you come to a fork in the road, take it.", author: "Yogi Berra", team: "Yankees" },
  { quote: "I never said most of the things I said.", author: "Yogi Berra", team: "Yankees" },
  { quote: "A nickel ain't worth a dime anymore.", author: "Yogi Berra", team: "Yankees" },
  { quote: "We made too many wrong mistakes.", author: "Yogi Berra", team: "Yankees" },
  { quote: "Nobody goes there anymore. It's too crowded.", author: "Yogi Berra", team: "Yankees" },
  { quote: "The future ain't what it used to be.", author: "Yogi Berra", team: "Yankees" },
  { quote: "If you don't know where you are going, you might wind up someplace else.", author: "Yogi Berra", team: "Yankees" },
  { quote: "Baseball is 90% mental and the other half is physical.", author: "Yogi Berra", team: "Yankees" },
  { quote: "When you're in a slump, it's almost as if you look out at the field and it's one big glove.", author: "Vince Coleman", team: "Baseball" },
  { quote: "There is always some kid who may be seeing me for the first or last time. I owe him my best.", author: "Joe DiMaggio", team: "Yankees" },
  { quote: "Today I consider myself the luckiest man on the face of the earth.", author: "Lou Gehrig", team: "Yankees", context: "Farewell speech, 1939" },
  { quote: "Fans don't boo nobodies.", author: "Reggie Jackson", team: "Yankees" },
  { quote: "October is not like any other month in baseball.", author: "Reggie Jackson", team: "Yankees" },
  { quote: "I'm the best in baseball. No one comes close. The Yankees are the best in baseball.", author: "Reggie Jackson", team: "Yankees" },
  { quote: "I make my best pitch and trust my defense.", author: "Mariano Rivera", team: "Yankees" },
  { quote: "I've never worried about statistics.", author: "Mariano Rivera", team: "Yankees" },
  { quote: "Don't look back. Something might be gaining on you.", author: "Satchel Paige", team: "Baseball" },
  // METS
  { quote: "Ya gotta believe!", author: "Tug McGraw", team: "Mets", context: "1973 pennant run" },
  { quote: "New York is a city of conversation, of energy. The fans here live and die with every pitch.", author: "Mike Piazza", team: "Mets" },
  { quote: "I don't think about the negative. That's a waste of time.", author: "Tom Seaver", team: "Mets" },
  { quote: "In baseball, you can't sit on a lead and run a few plays into the line and just kill the clock. You've got to throw the ball over the damn plate and let the game proceed.", author: "Tom Seaver", team: "Mets" },
  { quote: "Good pitching will always stop good hitting and vice-versa.", author: "Casey Stengel", team: "Mets" },
  { quote: "Being with a team the whole season, winning and losing together... then winning in the end... that's special.", author: "David Wright", team: "Mets" },
  { quote: "The Mets are losers, just like nearly everybody else in life. This is the team for the cab driver, the guy who owns the diner, the bartender.", author: "Jimmy Breslin", team: "Mets" },
  // JETS
  { quote: "I guarantee it.", author: "Joe Namath", team: "Jets", context: "Super Bowl III, 1969" },
  { quote: "I can throw the ball better than any quarterback in the game.", author: "Joe Namath", team: "Jets" },
  { quote: "You got to be a man first before you can be a player.", author: "Joe Namath", team: "Jets" },
  { quote: "I live and die with the New York Jets.", author: "Rex Ryan", team: "Jets" },
  { quote: "The key to this football team is Mark Gastineau.", author: "Joe Klecko", team: "Jets" },
  // GIANTS
  { quote: "If you want to win, do the little things right.", author: "Lawrence Taylor", team: "Giants" },
  { quote: "I want to be the best. Not the best in New York. The best in the NFL.", author: "Lawrence Taylor", team: "Giants" },
  { quote: "Pressure is a privilege.", author: "Lawrence Taylor", team: "Giants" },
  { quote: "You play the way you practice.", author: "Bill Parcells", team: "Giants" },
  { quote: "I'm not telling you it's going to be easy. I'm telling you it's going to be worth it.", author: "Bill Parcells", team: "Giants" },
  { quote: "When the game is on the line, you want Eli Manning.", author: "Tiki Barber", team: "Giants" },
  // KNICKS
  { quote: "The key to this team is the same as it always has been: pride.", author: "Red Holzman", team: "Knicks" },
  { quote: "I'm coming back to New York. I belong in New York.", author: "Patrick Ewing", team: "Knicks" },
  { quote: "Clyde is poetry in motion. He glides, he doesn't run.", author: "Walt Frazier self-intro", team: "Knicks" },
  { quote: "I feel great — better than anyone in this building right now.", author: "Willis Reed", team: "Knicks", context: "Limping onto court, 1970 Finals" },
  { quote: "This is our building. Don't come in here.", author: "Patrick Ewing", team: "Knicks" },
  { quote: "New York basketball is different. The passion, the energy, the fans — nothing like it.", author: "Jalen Brunson", team: "Knicks" },
  // RANGERS
  { quote: "We will win tonight.", author: "Mark Messier", team: "Rangers", context: "Game 6 guarantee vs Devils, 1994" },
  { quote: "The best trophy in sports is the Stanley Cup. And we have it.", author: "Mark Messier", team: "Rangers" },
  { quote: "Hockey is a unique sport — you need each and every guy pulling in the same direction.", author: "Mark Messier", team: "Rangers" },
  { quote: "You can get great talent anywhere. The difference is what you do with it.", author: "Brian Leetch", team: "Rangers" },
  { quote: "I don't care about goals. I care about wins.", author: "Henrik Lundqvist", team: "Rangers" },
  // ISLANDERS
  { quote: "We had a special group. Nobody gave us credit. We just won.", author: "Bryan Trottier", team: "Islanders" },
  { quote: "Four Stanley Cups. Nobody can take that away from us.", author: "Mike Bossy", team: "Islanders" },
  { quote: "I'll take the puck to the net every time. That's where goals are scored.", author: "Mike Bossy", team: "Islanders" },
  { quote: "When we played, we played to win. Not to look good. To win.", author: "Denis Potvin", team: "Islanders" },
  // GENERAL SPORTS
  { quote: "The strength of the team is each individual member. The strength of each member is the team.", author: "Phil Jackson", team: "Sports" },
  { quote: "You miss 100% of the shots you don't take.", author: "Wayne Gretzky", team: "Hockey" },
  { quote: "The more difficult the victory, the greater the happiness in winning.", author: "Pele", team: "Soccer" },
  { quote: "Champions keep playing until they get it right.", author: "Billie Jean King", team: "Sports" },
  { quote: "The only place success comes before work is in the dictionary.", author: "Vince Lombardi", team: "NFL" },
  { quote: "Hard work beats talent when talent doesn't work hard.", author: "Tim Notke", team: "Sports" },
  { quote: "Baseball is like church. Many attend, few understand.", author: "Leo Durocher", team: "Baseball" },
  { quote: "Every strike brings me closer to the next home run.", author: "Babe Ruth", team: "Yankees" },
  { quote: "The secret to success is to know something nobody else knows.", author: "Aristotle Onassis", team: "Business" },
  { quote: "New York City is the place where all the people come who want to make something of themselves.", author: "Unknown", team: "NYC" },
  { quote: "Being a New York sports fan means having the highest highs and the lowest lows. Wouldn't trade it.", author: "NY Fan", team: "NYC" },
];

function getDailyQuote() {
  const day = Math.floor(Date.now() / 86400000);
  return NY_QUOTES[day % NY_QUOTES.length];
}

// ─── DAILY PLAYER SPOTLIGHT ───────────────────────────────────────────────
const DAILY_PLAYERS = [
  { name:"Derek Jeter",    team:"Yankees",   sport:"MLB", pos:"SS",  emoji:"⚾", number:"2",  active:false, era:"1995–2014", stats:"3,465 H · .310 AVG · 260 HR · 14× All-Star", fact:"The only Yankee to win 5 World Series rings AND be drafted by the team. Made the flip, the dive, and Mr. November moments.", wiki:"https://en.wikipedia.org/wiki/Derek_Jeter", photo:"https://upload.wikimedia.org/wikipedia/commons/thumb/2/22/Derek_Jeter_2007.jpg/256px-Derek_Jeter_2007.jpg", cardColor:"#003087" },
  { name:"Mike Piazza",    team:"Mets",      sport:"MLB", pos:"C",   emoji:"⚾", number:"31", active:false, era:"1998–2005", stats:"220 HR · .296 AVG · 655 RBI as a Met", fact:"His 9/11 home run on September 21, 2001 is the most emotional moment in Mets history. Greatest hitting catcher ever.", wiki:"https://en.wikipedia.org/wiki/Mike_Piazza", photo:"https://upload.wikimedia.org/wikipedia/commons/thumb/8/85/Mike_Piazza_2013.jpg/256px-Mike_Piazza_2013.jpg", cardColor:"#FF5910" },
  { name:"Joe Namath",     team:"Jets",      sport:"NFL", pos:"QB",  emoji:"🏈", number:"12", active:false, era:"1965–1976", stats:"27,057 yds · 173 TD · Super Bowl III MVP", fact:"Guaranteed a Super Bowl win as a 17-point underdog then delivered. Changed professional football forever with one press conference.", wiki:"https://en.wikipedia.org/wiki/Joe_Namath", photo:"https://upload.wikimedia.org/wikipedia/commons/thumb/0/0e/Joe_Namath_1965.jpg/256px-Joe_Namath_1965.jpg", cardColor:"#125740" },
  { name:"Lawrence Taylor", team:"Giants",   sport:"NFL", pos:"LB",  emoji:"🏈", number:"56", active:false, era:"1981–1993", stats:"132.5 sacks · 2× SB · NFL MVP 1986", fact:"The NFL changed its blocking rules because of him. Every modern edge rusher is chasing his ghost.", wiki:"https://en.wikipedia.org/wiki/Lawrence_Taylor", photo:"https://upload.wikimedia.org/wikipedia/commons/thumb/9/9d/Lawrence_Taylor_2009.jpg/256px-Lawrence_Taylor_2009.jpg", cardColor:"#0B2265" },
  { name:"Patrick Ewing",  team:"Knicks",   sport:"NBA", pos:"C",   emoji:"🏀", number:"33", active:false, era:"1985–2000", stats:"23,665 pts · 10,759 reb · 11× All-Star", fact:"First ever NBA lottery pick. Led the Knicks for 15 years and came heartbreakingly close to a championship in 1994.", wiki:"https://en.wikipedia.org/wiki/Patrick_Ewing", photo:"https://upload.wikimedia.org/wikipedia/commons/thumb/6/61/Patrick_Ewing_2008.jpg/256px-Patrick_Ewing_2008.jpg", cardColor:"#006BB6" },
  { name:"Walt Frazier",   team:"Knicks",   sport:"NBA", pos:"G",   emoji:"🏀", number:"10", active:false, era:"1967–1977", stats:"14,617 pts · 4,791 ast · 2× NBA Champion", fact:"Scored 36 points in the famous Willis Reed Game 7. The most stylishly dressed player in NBA history.", wiki:"https://en.wikipedia.org/wiki/Walt_Frazier", photo:"https://upload.wikimedia.org/wikipedia/commons/thumb/3/37/Walt_Frazier_1972.jpg/256px-Walt_Frazier_1972.jpg", cardColor:"#006BB6" },
  { name:"Mark Messier",   team:"Rangers",  sport:"NHL", pos:"C",   emoji:"🏒", number:"11", active:false, era:"1991–2004", stats:"851 pts as a Ranger · 6× Stanley Cup champion", fact:"Guaranteed a Game 6 win against the Devils when down 3-2. Then scored a hat trick. The greatest captain in hockey history.", wiki:"https://en.wikipedia.org/wiki/Mark_Messier", photo:"https://upload.wikimedia.org/wikipedia/commons/thumb/c/cd/Mark_Messier_2014.jpg/256px-Mark_Messier_2014.jpg", cardColor:"#0038A8" },
  { name:"Mike Bossy",     team:"Islanders",sport:"NHL", pos:"RW",  emoji:"🏒", number:"22", active:false, era:"1977–1987", stats:"573 G · 9 straight 50-goal seasons · 4× Cup", fact:"Matched Rocket Richard's 50 in 50 in 1981. Retired at 30 due to back injuries — may have been even greater.", wiki:"https://en.wikipedia.org/wiki/Mike_Bossy", photo:"https://upload.wikimedia.org/wikipedia/en/thumb/8/8d/Mike_Bossy.jpg/256px-Mike_Bossy.jpg", cardColor:"#00539B" },
  { name:"Bryan Trottier", team:"Islanders",sport:"NHL", pos:"C",   emoji:"🏒", number:"19", active:false, era:"1975–1990", stats:"1,353 pts · 4× Cup · Hart Trophy 1979", fact:"Won 4 Cups with the Islanders then 2 more with Pittsburgh. The engine of the greatest dynasty in NHL history.", wiki:"https://en.wikipedia.org/wiki/Bryan_Trottier", photo:"https://upload.wikimedia.org/wikipedia/commons/thumb/2/24/Bryan_Trottier_2018.jpg/256px-Bryan_Trottier_2018.jpg", cardColor:"#00539B" },
  { name:"Tom Seaver",     team:"Mets",     sport:"MLB", pos:"SP",  emoji:"⚾", number:"41", active:false, era:"1967–1983", stats:"311 W · 2.57 ERA · 2,541 K · 3× Cy Young", fact:"Led the Miracle Mets to the 1969 World Series. Tom Terrific is the greatest Met of all time — not even close. Holds Mets records for wins, Ks and innings pitched.", wiki:"https://en.wikipedia.org/wiki/Tom_Seaver", photo:"https://upload.wikimedia.org/wikipedia/commons/thumb/4/4e/Tom_Seaver_1972.jpg/256px-Tom_Seaver_1972.jpg", cardColor:"#FF5910" },
  { name:"Babe Ruth",      team:"Yankees",  sport:"MLB", pos:"RF",  emoji:"⚾", number:"3",  active:false, era:"1920–1934", stats:"659 HR as Yankee · .349 AVG · 7× WS", fact:"Was sold by Boston for $100,000 in 1920 — cursing them for 86 years. Possibly the most impactful transaction in sports history.", wiki:"https://en.wikipedia.org/wiki/Babe_Ruth", photo:"https://upload.wikimedia.org/wikipedia/commons/thumb/a/a4/Babe_Ruth2.jpg/256px-Babe_Ruth2.jpg", cardColor:"#003087" },
  { name:"Lou Gehrig",     team:"Yankees",  sport:"MLB", pos:"1B",  emoji:"⚾", number:"4",  active:false, era:"1923–1939", stats:"2,721 H · 1,995 RBI · .340 AVG · 7× All-Star", fact:"Played 2,130 consecutive games as the Iron Horse. His farewell speech — 'luckiest man' — is the most powerful in sports history.", wiki:"https://en.wikipedia.org/wiki/Lou_Gehrig", photo:"https://upload.wikimedia.org/wikipedia/commons/thumb/3/3b/Lou_Gehrig_as_a_New_York_Yankee.jpg/256px-Lou_Gehrig_as_a_New_York_Yankee.jpg", cardColor:"#003087" },
  { name:"Willis Reed",    team:"Knicks",   sport:"NBA", pos:"C",   emoji:"🏀", number:"19", active:false, era:"1964–1974", stats:"12,183 pts · 8,414 reb · 2× NBA Champion", fact:"Limped onto the Garden floor on a torn thigh muscle for Game 7. The crowd went insane. The Knicks won. Frazier scored 36.", wiki:"https://en.wikipedia.org/wiki/Willis_Reed", photo:"https://upload.wikimedia.org/wikipedia/commons/thumb/d/da/Willis_Reed.jpg/256px-Willis_Reed.jpg", cardColor:"#006BB6" },
  { name:"Denis Potvin",   team:"Islanders",sport:"NHL", pos:"D",   emoji:"🏒", number:"5",  active:false, era:"1973–1988", stats:"1,052 pts · 3× Norris · 4× Cup", fact:"Broke Bobby Orr's career points record for defensemen. Captained four consecutive Stanley Cup champions.", wiki:"https://en.wikipedia.org/wiki/Denis_Potvin", photo:"https://upload.wikimedia.org/wikipedia/commons/thumb/a/a2/Denis_Potvin_2009.jpg/256px-Denis_Potvin_2009.jpg", cardColor:"#00539B" },
  { name:"Phil Simms",     team:"Giants",   sport:"NFL", pos:"QB",  emoji:"🏈", number:"11", active:false, era:"1979–1993", stats:"33,462 yds · 199 TD · Super Bowl XXI MVP", fact:"Completed 22 of 25 passes (88%) in Super Bowl XXI — still the record completion percentage in Super Bowl history.", wiki:"https://en.wikipedia.org/wiki/Phil_Simms", photo:"https://upload.wikimedia.org/wikipedia/commons/thumb/b/b0/Phil_Simms_2015.jpg/256px-Phil_Simms_2015.jpg", cardColor:"#0B2265" },
  { name:"Don Mattingly",  team:"Yankees",  sport:"MLB", pos:"1B",  emoji:"⚾", number:"23", active:false, era:"1982–1995", stats:"2,153 H · 9× Gold Glove · .307 career AVG", fact:"The most beloved Yankee of the 1980s never won a World Series ring. Finally made the playoffs in his last season.", wiki:"https://en.wikipedia.org/wiki/Don_Mattingly", photo:"https://upload.wikimedia.org/wikipedia/commons/thumb/0/0b/Don_Mattingly_2011.jpg/256px-Don_Mattingly_2011.jpg", cardColor:"#003087" },
  { name:"Joe DiMaggio",   team:"Yankees",  sport:"MLB", pos:"CF",  emoji:"⚾", number:"5",  active:false, era:"1936–1951", stats:"361 HR · .325 AVG · 9× WS · 3× MVP", fact:"Hit safely in 56 consecutive games in 1941. Mathematical models suggest the odds of that ever happening are less than 1 in 1,000.", wiki:"https://en.wikipedia.org/wiki/Joe_DiMaggio", photo:"https://upload.wikimedia.org/wikipedia/commons/thumb/e/ec/Joe_DiMaggio_1951.jpg/256px-Joe_DiMaggio_1951.jpg", cardColor:"#003087" },
  { name:"Dwight Gooden",  team:"Mets",     sport:"MLB", pos:"SP",  emoji:"⚾", number:"16", active:false, era:"1984–1994", stats:"194 W · 1.53 ERA in 1985 · Cy Young 1985", fact:"At age 20, went 24-4 with 1.53 ERA. Batters said facing him was like hitting against a wall. What could have been the greatest career.", wiki:"https://en.wikipedia.org/wiki/Dwight_Gooden", photo:"https://upload.wikimedia.org/wikipedia/commons/thumb/e/eb/Dwight_Gooden_2009.jpg/256px-Dwight_Gooden_2009.jpg", cardColor:"#FF5910" },
  { name:"Eli Manning",    team:"Giants",   sport:"NFL", pos:"QB",  emoji:"🏈", number:"10", active:false, era:"2004–2019", stats:"57,023 yds · 366 TD · 2× Super Bowl MVP", fact:"Beat the undefeated Patriots twice in the Super Bowl. Made the pass to David Tyree and the throw to Mario Manningham.", wiki:"https://en.wikipedia.org/wiki/Eli_Manning", photo:"https://upload.wikimedia.org/wikipedia/commons/thumb/d/d8/Eli_Manning_2019.jpg/256px-Eli_Manning_2019.jpg", cardColor:"#0B2265" },
  { name:"Mariano Rivera", team:"Yankees", sport:"MLB", pos:"RP",  emoji:"⚾", number:"42", active:false, era:"1995–2013", stats:"652 SV · 2.21 ERA · 5× WS · ALCS MVP 2003", fact:"Unanimous Hall of Fame election — first ever. Threw one pitch (cutter) his entire career. The greatest closer in baseball history.", wiki:"https://en.wikipedia.org/wiki/Mariano_Rivera", photo:"https://upload.wikimedia.org/wikipedia/commons/thumb/a/a5/Mariano_Rivera_2008.jpg/256px-Mariano_Rivera_2008.jpg", cardColor:"#003087" },
  { name:"Jalen Brunson",  team:"Knicks",   sport:"NBA", pos:"PG",  emoji:"🏀", number:"11", active:true,  era:"2022–present", stats:"28+ PPG · 6+ APG · MSG's new hero", fact:"Turned down a max contract extension, then got a bigger one. Breathed new life into Knicks basketball in a way the Garden hasn't seen since Ewing.", wiki:"https://en.wikipedia.org/wiki/Jalen_Brunson", photo:"https://upload.wikimedia.org/wikipedia/commons/thumb/b/b3/Jalen_Brunson_2024.jpg/256px-Jalen_Brunson_2024.jpg", cardColor:"#006BB6" },
  { name:"Pete Alonso",    team:"Mets",     sport:"MLB", pos:"1B",  emoji:"⚾", number:"20", active:true,  era:"2019–present", stats:"254+ HR · Mets All-Time HR Record · 53 HR rookie record 2019", fact:"The Polar Bear broke the MLB rookie home run record in 2019 with 53 HR. On Aug 12, 2025 he broke Darryl Strawberry's Mets all-time record of 252. The franchise's home run king.", wiki:"https://en.wikipedia.org/wiki/Pete_Alonso", photo:"https://upload.wikimedia.org/wikipedia/commons/thumb/a/a3/Pete_Alonso_in_2021.jpg/256px-Pete_Alonso_in_2021.jpg", cardColor:"#FF5910" },
  { name:"Aaron Judge",    team:"Yankees",  sport:"MLB", pos:"RF",  emoji:"⚾", number:"99", active:true,  era:"2016–present", stats:"60+ HR seasons · .280+ AVG · AL MVP 2017, 2022", fact:"Hit 62 home runs in 2022 — the American League single-season record. The current face of the Yankees dynasty.", wiki:"https://en.wikipedia.org/wiki/Aaron_Judge", photo:"https://upload.wikimedia.org/wikipedia/commons/thumb/9/95/Aaron_Judge_2017.jpg/256px-Aaron_Judge_2017.jpg", cardColor:"#003087" },
  { name:"Breanna Stewart",team:"Liberty", sport:"WNBA",pos:"F",  emoji:"🏀", number:"30", active:true,  era:"2023–present", stats:"2× WNBA Champion · Finals MVP", fact:"Came to New York to win and delivered back-to-back championships. The best player in women's basketball history.", wiki:"https://en.wikipedia.org/wiki/Breanna_Stewart", photo:"https://upload.wikimedia.org/wikipedia/commons/thumb/5/5c/Breanna_Stewart_2024.jpg/256px-Breanna_Stewart_2024.jpg", cardColor:"#007A5E" },
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

  // Helper to safely fetch with timeout fallback
  async function safeFetch(url) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);
      const res = await fetch(url, { signal: controller.signal });
      clearTimeout(timeoutId);
      return await res.json();
    } catch(e) { return null; }
  }

  // Team-specific ESPN news — always NY relevant, no keyword filtering needed
  const allTeams = [...NY_TEAM_NEWS, ...NY_EXTRA_NEWS];
  await Promise.all(allTeams.map(async ({ sport, league, id, name }) => {
    const json = await safeFetch(`https://site.api.espn.com/apis/site/v2/sports/${sport}/${league}/teams/${id}/news?limit=10`);
    if (!json) return;
    (json.articles || []).forEach(a => {
      const title = a.headline || a.title || "";
      if (!title || seen.has(title)) return;
      seen.add(title);
      results.push({
        title,
        link:   a.links?.web?.href || "#",
        desc:   a.description || "",
        pub:    a.published || a.lastModified || "",
        source: `ESPN · ${name}`,
        team:   name,
        sport:  league.toUpperCase(),
        isNY:   true,
      });
    });
  }));

  // League-level ESPN news — store ALL articles, mark isNY based on keywords
  await Promise.all(NY_NEWS_ENDPOINTS.map(async ({ sport, league, name }) => {
    const json = await safeFetch(`https://site.api.espn.com/apis/site/v2/sports/${sport}/${league}/news?limit=25`);
    if (!json) return;
    (json.articles || []).forEach(a => {
      const title = a.headline || a.title || "";
      if (!title || seen.has(title)) return;
      const desc = a.description || "";
      seen.add(title);
      const combined = (title + " " + desc).toLowerCase();
      const isNY = NY_KEYWORDS.some(kw => combined.includes(kw));
      results.push({
        title,
        link:   a.links?.web?.href || "#",
        desc,
        pub:    a.published || a.lastModified || "",
        source: `ESPN · ${name}`,
        sport:  name,
        isNY,
      });
    });
  }));

  // Reddit team subreddits — top posts of the day
  const REDDIT_SUBS = [
    { sub:"NYYankees",      team:"Yankees"  },
    { sub:"NewYorkMets",    team:"Mets"     },
    { sub:"nyjets",         team:"Jets"     },
    { sub:"NYGiants",       team:"Giants"   },
    { sub:"NYKnicks",       team:"Knicks"   },
    { sub:"GoNets",         team:"Nets"     },
    { sub:"rangers",        team:"Rangers"  },
    { sub:"NewYorkIslanders",team:"Islanders"},
    { sub:"devils",         team:"Devils"   },
    { sub:"nyliberty",      team:"Liberty"  },
  ];
  await Promise.all(REDDIT_SUBS.map(async ({ sub, team }) => {
    const json = await safeFetch(`https://www.reddit.com/r/${sub}/top.json?limit=5&t=day`);
    if (!json?.data?.children) return;
    json.data.children.forEach(post => {
      const p = post.data;
      if (!p || p.stickied || p.over_18) return;
      const title = p.title;
      if (!title || seen.has(title)) return;
      // Skip pure discussion threads / game threads / lineup threads
      const lowerTitle = title.toLowerCase();
      if (lowerTitle.includes("game thread") || lowerTitle.includes("post-game thread") ||
          lowerTitle.includes("daily discussion") || lowerTitle.includes("lineup thread") ||
          lowerTitle.includes("pre-game thread")) return;
      seen.add(title);
      results.push({
        title,
        link:   `https://reddit.com${p.permalink}`,
        desc:   p.selftext ? p.selftext.slice(0,200) : "",
        pub:    new Date(p.created_utc * 1000).toISOString(),
        source: `Reddit · r/${sub}`,
        team,
        sport:  team,
        isNY:   true,
        upvotes: p.ups,
      });
    });
  }));

  return results.sort((a,b) => new Date(b.pub) - new Date(a.pub));
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
    <div style={styles.root}>
      {/* NOISE TEXTURE OVERLAY */}
      <div style={styles.noise} />

      {/* ── MASTHEAD ── */}
      <header style={styles.masthead}>
        <div style={styles.mastheadTop}>
          <span style={styles.mastheadKicker}>EST. 2026 · ALL NEW YORK · ALL THE TIME</span>
          <span style={styles.mastheadKicker}>{new Date().toLocaleDateString("en-US",{weekday:"long",year:"numeric",month:"long",day:"numeric"}).toUpperCase()}</span>
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
          {["STATS","HISTORY","THIS DATE","HOF","POLLS","MISERY","TRIVIA","XWORD","SPIN"].map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              style={{...styles.tabBtn, ...(activeTab===tab ? styles.tabBtnActive : {}), fontSize:9, padding:"7px 10px"}}>
              {tab}
            </button>
          ))}
        </div>

        {/* ──── SCORES TAB ──── */}
        {activeTab === "SCORES" && (
          <div>
            {/* Quote of the Day */}
            <div style={{display:"flex", gap:12, flexWrap:"wrap", marginBottom:16}}>
              <div style={{flex:1, minWidth:280}}><QuoteOfDay /></div>
              <div style={{minWidth:220}}><PlayerSpotlight /></div>
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
                ) : news.filter(n => n.isNY).slice(0, 10).map((item, i) => (
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
        {activeTab === "THIS DATE" && <TodayTab />}
        {activeTab === "POLLS" && <PollsTab />}
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
        {activeTab === "SPIN" && (
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
function NewsCardFeatured({ item }) {
  return (
    <a href={item.link} target="_blank" rel="noopener noreferrer" style={styles.newsFeatured}>
      <div style={styles.newsFeaturedSource}>{item.source}</div>
      <h2 style={styles.newsFeaturedTitle}>{item.title}</h2>
      {item.desc && <p style={styles.newsFeaturedDesc}>{item.desc}…</p>}
      <span style={styles.newsReadMore}>READ FULL STORY →</span>
    </a>
  );
}

function NewsCardSmall({ item, index }) {
  return (
    <a href={item.link} target="_blank" rel="noopener noreferrer"
      style={{...styles.newsSmall, ...(index % 2 === 0 ? {} : styles.newsSmallAlt)}}>
      <div style={styles.newsSmallMeta}>
        <span style={styles.newsSmallSource}>{item.source}</span>
        {item.pub && <span style={styles.newsSmallDate}>{new Date(item.pub).toLocaleDateString("en-US",{month:"short",day:"numeric"})}</span>}
      </div>
      <p style={styles.newsSmallTitle}>{item.title}</p>
    </a>
  );
}

function NewsTab({ news, loading }) {
  const [section, setSection] = useState("HEADLINES");
  const [filter, setFilter] = useState("NY");
  const [sport,  setSport]  = useState("ALL");
  const [teamFilter, setTeamFilter] = useState("ALL");

  const NY_KEYWORDS_CHECK = ["yankees","mets","knicks","nets","rangers","islanders","devils","liberty","nycfc","red bulls","gotham","new york","brooklyn","bronx","queens"];
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
    if (sport !== "ALL") {
      const sportKws = SPORT_KEYWORDS[sport] || [];
      if (!sportKws.some(kw => combined.includes(kw))) return false;
    }
    if (teamFilter !== "ALL") {
      const tf = teamFilter.toLowerCase();
      if (!combined.includes(tf)) return false;
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
            <div style={styles.newsGrid}>
              {filtered.slice(0,4).map((item,i) => <NewsCardFeatured key={i} item={item} />)}
              <div style={styles.newsDivider}><span style={styles.newsDividerText}>MORE STORIES</span></div>
              {filtered.slice(4,80).map((item,i) => <NewsCardSmall key={i} item={item} index={i} />)}
            </div>
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
            { name:"Zach Rozenblatt",  outlet:"NY Times",     teams:"Jets",              handle:"@ZachRozenblatt",   url:"https://twitter.com/ZachRozenblatt",   desc:"NY Times Jets reporter — thorough, credible coverage" },
            { name:"Brian Costello",   outlet:"NY Post",      teams:"Jets",              handle:"@BrianCoz",         url:"https://twitter.com/BrianCoz",         desc:"NY Post Jets beat — strong insider access" },
            { name:"Rich Cimini",      outlet:"ESPN",         teams:"Jets",              handle:"@RichCimini",       url:"https://twitter.com/RichCimini",       desc:"ESPN's veteran Jets reporter — decades of coverage" },
            { name:"Jordan Raanan",   outlet:"ESPN",         teams:"Giants",            handle:"@JordanRaanan",     url:"https://twitter.com/JordanRaanan",     desc:"ESPN Giants insider" },
            { name:"Ralph Vacchiano", outlet:"FOX Sports",   teams:"Giants",            handle:"@RVacchianoSNY",    url:"https://twitter.com/RVacchianoSNY",    desc:"Giants beat veteran" },
            { name:"Ian Begley",      outlet:"SNY",          teams:"Knicks",            handle:"@IanBegley",        url:"https://twitter.com/IanBegley",        desc:"Top Knicks reporter — Brunson era insider" },
            { name:"Marc Berman",     outlet:"NY Post",      teams:"Knicks",            handle:"@NYPost_Berman",    url:"https://twitter.com/NYPost_Berman",    desc:"Knicks beat for the NY Post" },
            { name:"Stefan Bondy",    outlet:"NY Post",      teams:"Knicks · Nets",     handle:"@SbondyNYP",        url:"https://twitter.com/SbondyNYP",        desc:"NBA NY coverage" },
            { name:"Brett Cyrgalis",  outlet:"NY Post",      teams:"Rangers",           handle:"@BrettCyrgalis",    url:"https://twitter.com/BrettCyrgalis",    desc:"Rangers beat reporter" },
            { name:"Larry Brooks",    outlet:"NY Post",      teams:"Rangers · NHL",     handle:"@NYP_Brooksie",     url:"https://twitter.com/NYP_Brooksie",     desc:"Legendary NY hockey columnist" },
            { name:"Andrew Gross",    outlet:"Newsday",      teams:"Islanders",         handle:"@AGrossNewsday",    url:"https://twitter.com/AGrossNewsday",    desc:"Newsday Islanders beat" },
            { name:"Stefen Rosner",   outlet:"NY Hockey Now",teams:"Islanders",         handle:"@SRosner91",        url:"https://twitter.com/SRosner91",        desc:"Islanders deep coverage" },
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
  return (
    <div style={styles.quoteBar}>
      <span style={styles.quoteIcon}>💬</span>
      <div style={styles.quoteBody}>
        <p style={styles.quoteText}>"{q.quote}"</p>
        <p style={styles.quoteAuthor}>— {q.author}{q.context ? `, ${q.context}` : ""} <span style={styles.quoteTeam}>· {q.team}</span></p>
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
// ─── RECAP TAB ─────────────────────────────────────────────────────────────
function RecapTab({ scores }) {
  const [ytResults, setYtResults] = useState({});
  const [loadingYT, setLoadingYT] = useState(false);
  const [activeTeam, setActiveTeam] = useState("ALL");

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yDate = yesterday.toLocaleDateString("en-US", {weekday:"long", month:"long", day:"numeric"});

  // NY teams from scores
  const NY_NAMES = ["yankees","mets","jets","giants","knicks","nets","rangers","islanders","devils","liberty","nycfc","gotham","red bulls"];
  const yesterdayGames = scores.filter(s => {
    const d = new Date(s.gameDate || s.date);
    const isYesterday = d.toDateString() === yesterday.toDateString();
    const isNY = [s.homeTeam, s.awayTeam].some(t => NY_NAMES.some(n => (t||"").toLowerCase().includes(n)));
    return isYesterday && isNY;
  });

  // Fetch YouTube highlights for a team
  async function fetchYTHighlights(query) {
    if (ytResults[query]) return;
    setLoadingYT(true);
    try {
      // Use YouTube's oEmbed + no-auth search via public RSS
      const searchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}&sp=EgIIAQ%3D%3D`;
      setYtResults(prev => ({...prev, [query]: {url: searchUrl, query}}));
    } catch(e) {}
    setLoadingYT(false);
  }

  const NY_TEAMS_RECAP = [
    {name:"Yankees",   keywords:"New York Yankees highlights",    color:"#003087", emoji:"⚾"},
    {name:"Mets",      keywords:"New York Mets highlights",       color:"#FF5910", emoji:"⚾"},
    {name:"Knicks",    keywords:"New York Knicks highlights",     color:"#006BB6", emoji:"🏀"},
    {name:"Nets",      keywords:"Brooklyn Nets highlights",       color:"#000000", emoji:"🏀"},
    {name:"Rangers",   keywords:"New York Rangers highlights",    color:"#0038A8", emoji:"🏒"},
    {name:"Islanders", keywords:"NY Islanders highlights",        color:"#00539B", emoji:"🏒"},
    {name:"Devils",    keywords:"New Jersey Devils highlights",   color:"#CE1126", emoji:"🏒"},
    {name:"Liberty",   keywords:"New York Liberty highlights",    color:"#007A5E", emoji:"🏀"},
    {name:"Jets",      keywords:"New York Jets highlights",       color:"#125740", emoji:"🏈"},
    {name:"Giants",    keywords:"New York Giants highlights",     color:"#0B2265", emoji:"🏈"},
  ];

  return (
    <div style={styles.statsRoot}>
      <div style={styles.stdHeader}>
        <h2 style={styles.stdTitle}>📺 LAST NIGHT'S RECAP</h2>
        <p style={styles.stdSub}>{yDate.toUpperCase()} · NY SPORTS RESULTS · VIDEO HIGHLIGHTS</p>
      </div>

      {/* Yesterday's NY scores */}
      {yesterdayGames.length > 0 ? (
        <>
          <div style={styles.stdDivisionHeader}>🏆 YESTERDAY'S NY RESULTS</div>
          {yesterdayGames.map((g, i) => (
            <div key={i} style={{...styles.recapScoreRow, ...(i%2===0?{}:{background:"#0f0f0f"})}}>
              <div style={styles.recapTeams}>
                <span style={styles.recapSport}>[{g.sport}]</span>
                <span style={styles.recapAway}>{g.awayTeam}</span>
                <span style={styles.recapScore}>{g.awayScore} — {g.homeScore}</span>
                <span style={styles.recapHome}>{g.homeTeam}</span>
              </div>
              {g.statusDesc && <span style={styles.recapStatus}>{g.statusDesc}</span>}
            </div>
          ))}
        </>
      ) : (
        <div style={{padding:"12px 0 20px", fontSize:12, color:"#555"}}>
          No NY games found for yesterday — check ESPN for results or use the SCORES tab.
        </div>
      )}

      {/* Video Highlights */}
      <div style={{...styles.stdDivisionHeader, marginTop:20}}>🎬 VIDEO HIGHLIGHTS — CLICK TO WATCH ON YOUTUBE</div>
      <div style={{marginBottom:16, padding:"10px 14px", background:"#161616", borderLeft:"3px solid #c8201c"}}>
        <p style={{margin:0, fontSize:12, color:"#aaa"}}>Click any team below to find today's highlights on YouTube. Results open in YouTube — always fresh, always free.</p>
      </div>

      <div style={styles.ytTeamGrid}>
        {NY_TEAMS_RECAP.map((t, i) => {
          const today = new Date();
          const dateStr = `${today.toLocaleDateString("en-US",{month:"short",day:"numeric"})} ${today.getFullYear()}`;
          const searchQuery = `${t.keywords} ${dateStr}`;
          const ytUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(searchQuery)}&sp=EgIIAQ%3D%3D`;
          return (
            <a key={i} href={ytUrl} target="_blank" rel="noopener noreferrer"
              style={{...styles.ytTeamCard, background:`linear-gradient(135deg, ${t.color}22 0%, #0a0a0a 100%)`, borderLeft:`3px solid ${t.color}`}}>
              <span style={styles.ytEmoji}>{t.emoji}</span>
              <div style={styles.ytInfo}>
                <span style={styles.ytTeamName}>{t.name}</span>
                <span style={styles.ytSubtext}>Latest highlights →</span>
              </div>
              <span style={{fontSize:18}}>▶</span>
            </a>
          );
        })}
      </div>

      {/* ESPN Highlights links */}
      <div style={{...styles.stdDivisionHeader, marginTop:20}}>📰 ADDITIONAL RECAP SOURCES</div>
      {[
        { name:"ESPN MLB Recap",   url:"https://www.espn.com/mlb/",           desc:"Box scores, highlights and reports from last night's baseball" },
        { name:"ESPN NBA Recap",   url:"https://www.espn.com/nba/",           desc:"Last night's basketball — scores, standouts and video" },
        { name:"ESPN NHL Recap",   url:"https://www.espn.com/nhl/",           desc:"Hockey scores, goals and highlights from last night" },
        { name:"ESPN NFL Recap",   url:"https://www.espn.com/nfl/",           desc:"Latest football news, camp updates and game recaps" },
        { name:"SNY Yankees/Mets", url:"https://sny.tv/",                     desc:"SNY's NY-focused baseball coverage — best Mets/Yankees recap" },
        { name:"MSG Knicks/Rangers",url:"https://www.msgnetworks.com/",       desc:"Post-game shows and video highlights from MSG" },
        { name:"YouTube NY Sports", url:"https://www.youtube.com/results?search_query=new+york+sports+highlights+today&sp=EgIIAQ%3D%3D", desc:"Search YouTube directly for today's NY sports highlights" },
        { name:"r/NYYankees",      url:"https://reddit.com/r/NYYankees/new/", desc:"Fan reactions, game threads and post-game discussion" },
        { name:"r/NewYorkMets",    url:"https://reddit.com/r/NewYorkMets/new/",desc:"Mets fans react to last night in real time" },
        { name:"r/NYKnicks",       url:"https://reddit.com/r/NYKnicks/new/",  desc:"Knicks game threads and post-game breakdowns" },
      ].map((r, i) => (
        <a key={i} href={r.url} target="_blank" rel="noopener noreferrer"
          style={{...styles.beatWriterRow, ...(i%2===0?{}:{background:"#0f0f0f"})}}>
          <div style={styles.beatWriterIcon}>🔗</div>
          <div style={styles.beatWriterInfo}>
            <span style={styles.beatWriterName}>{r.name}</span>
            <span style={styles.beatWriterDesc}>{r.desc}</span>
          </div>
          <span style={styles.beatWriterArrow}>→</span>
        </a>
      ))}

      {/* Tomorrow's big games */}
      <div style={{...styles.stdDivisionHeader, marginTop:20}}>📅 TOMORROW'S NY GAMES</div>
      {(() => {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const tmrGames = scores.filter(s => {
          const d = new Date(s.gameDate || s.date);
          return d.toDateString() === tomorrow.toDateString() &&
            [s.homeTeam, s.awayTeam].some(t => NY_NAMES.some(n => (t||"").toLowerCase().includes(n)));
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

const TODAY_IN_NY_SPORTS = [
  // JANUARY
  { month:1,  day:11, year:1969, team:"Jets",      emoji:"🏈", title:"Super Bowl III — Namath's Guarantee Pays Off", desc:"The Jets shock the NFL world, defeating the Baltimore Colts 16-7. Namath's famous guarantee fulfilled. The AFL is validated forever." },
  { month:1,  day:19, year:1994, team:"Rangers",   emoji:"🏒", title:"Mark Messier Signs Contract Extension", desc:"The Captain agrees to stay in New York — the move that would directly lead to the 1994 Stanley Cup." },
  { month:1,  day:25, year:1987, team:"Giants",    emoji:"🏈", title:"Giants Win Super Bowl XXI", desc:"Phil Simms goes 22-for-25 (88%) — still the Super Bowl record. Giants crush the Denver Broncos 39-20. LT and the Big Blue are champions." },
  { month:1,  day:27, year:2008, team:"Giants",    emoji:"🏈", title:"Giants Reach Super Bowl XLII", desc:"Eli Manning leads a stunning upset of the 18-0 New England Patriots in Super Bowl XLII — one of the greatest games ever played." },
  // FEBRUARY
  { month:2,  day:3,  year:2008, team:"Giants",    emoji:"🏈", title:"The Helmet Catch — Giants Stun Patriots", desc:"Eli to David Tyree. On 4th and 1 with 1:15 left. The catch that defines improbable. 17-14 Giants over the perfect Patriots." },
  { month:2,  day:5,  year:2012, team:"Giants",    emoji:"🏈", title:"Giants Win Super Bowl XLVI", desc:"Second Patriots upset in 4 years. Bradshaw's reluctant TD seals it 21-17. Eli Manning is a two-time Super Bowl MVP." },
  { month:2,  day:10, year:1985, team:"Mets",      emoji:"⚾", title:"Dwight Gooden Wins NL Cy Young Award", desc:"Doc at age 20 — 24-4, 1.53 ERA. The youngest Cy Young winner in history. The most dominant season by a Mets pitcher ever." },
  // MARCH
  { month:3,  day:6,  year:1961, team:"Yankees",   emoji:"⚾", title:"Roger Maris Returns for Historic Season", desc:"Maris prepares for the 1961 season that will produce 61 home runs — breaking Babe Ruth's 34-year-old record." },
  { month:3,  day:28, year:1973, team:"Yankees",   emoji:"⚾", title:"George Steinbrenner Buys the Yankees", desc:"A group led by George Steinbrenner purchases the Yankees for $10 million. The Boss era begins. Nothing in NY sports would ever be the same." },
  { month:3,  day:15, year:1991, team:"Rangers",   emoji:"🏒", title:"Mark Messier Traded to Rangers", desc:"The greatest captain in hockey history arrives in New York. Three years later he ends the 54-year drought." },
  // APRIL
  { month:4,  day:6,  year:1973, team:"Yankees",   emoji:"⚾", title:"Ron Blomberg Becomes First DH", desc:"Yankees' Ron Blomberg becomes the first designated hitter in baseball history — forever changing the game." },
  { month:4,  day:8,  year:1969, team:"Mets",      emoji:"⚾", title:"Miracle Mets Season Opens", desc:"The 1969 Mets begin their miraculous journey as 100-to-1 longshots. The world has no idea what's coming." },
  { month:4,  day:14, year:2024, team:"Mets",      emoji:"⚾", title:"Mets Retire Dwight Gooden's #16", desc:"Doc's number goes to the rafters at Citi Field — a bittersweet celebration of what might have been the greatest pitching career ever." },
  { month:4,  day:18, year:1923, team:"Yankees",   emoji:"⚾", title:"Yankee Stadium Opens — Ruth Hits Homer", desc:"Babe Ruth hits a three-run homer in the first game at the original Yankee Stadium — 'The House That Ruth Built.' The shrine is open." },
  { month:4,  day:22, year:1970, team:"Mets",      emoji:"⚾", title:"Seaver Strikes Out 19 Padres", desc:"Tom Seaver fans 19 Padres — including 10 consecutive to end the game — then the greatest single pitching performance in Mets history." },
  { month:4,  day:28, year:1973, team:"Mets",      emoji:"⚾", title:"Tug McGraw Utters 'Ya Gotta Believe'", desc:"Tug McGraw fires up his teammates with those three words. The rallying cry that defines Mets fandom forever." },
  // MAY
  { month:5,  day:17, year:1998, team:"Yankees",   emoji:"⚾", title:"David Wells Throws a Perfect Game", desc:"Hungover Wells (his words, not ours) retires all 27 Minnesota Twins he faces. The 15th perfect game in MLB history." },
  { month:5,  day:20, year:1980, team:"Islanders", emoji:"🏒", title:"Bob Nystrom OT Goal — First Dynasty Cup", desc:"Nystrom scores at 7:11 of overtime to give the Islanders their first Stanley Cup, defeating the Flyers. The dynasty is born." },
  { month:5,  day:28, year:2026, team:"NY Sports", emoji:"🗽", title:"NY Sports Daily Launches!", desc:"nysportsdaily.com goes live — the definitive destination for obsessed NY sports fans everywhere." },
  { month:5,  day:9,  year:1984, team:"Islanders", emoji:"🏒", title:"Islanders Win 4th Consecutive Cup", desc:"Denis Potvin lifts the Cup after sweeping the Edmonton Oilers — stopping Gretzky's dynasty at its doorstep." },
  // JUNE
  { month:6,  day:3,  year:1932, team:"Yankees",   emoji:"⚾", title:"Lou Gehrig Hits 4 Home Runs in a Game", desc:"The Iron Horse hits 4 HRs in a single game — a feat matched but never beaten. Pure power on display at Shibe Park." },
  { month:6,  day:9,  year:2004, team:"Devils",    emoji:"🏒", title:"Martin Brodeur Named All-Time Wins Leader", desc:"Brodeur breaks Terry Sawchuk's all-time NHL wins record — cementing his status as the greatest goalie in NHL history." },
  { month:6,  day:14, year:1994, team:"Rangers",   emoji:"🏒", title:"Rangers Win the Stanley Cup — 54-Year Drought Over", desc:"Mark Messier's Rangers defeat the Vancouver Canucks in Game 7. 'The Curse of 1940' is over. MSG goes absolutely insane." },
  { month:6,  day:14, year:2000, team:"Devils",    emoji:"🏒", title:"Devils Win Second Stanley Cup", desc:"Scott Stevens era peaks — Devils defeat the Dallas Stars. New Jersey's second Cup in 6 years. The dynasty is real." },
  // JULY
  { month:7,  day:4,  year:1939, team:"Yankees",   emoji:"⚾", title:"Lou Gehrig's Farewell Speech", desc:"'Today I consider myself the luckiest man on the face of the earth.' Gehrig's iconic goodbye at Yankee Stadium — the most powerful speech in sports history." },
  { month:7,  day:9,  year:1934, team:"Yankees",   emoji:"⚾", title:"Babe Ruth's 'Called Shot' Anniversary", desc:"Ruth's most legendary act remains debated — but the Babe always insisted he pointed to center field before hitting that home run." },
  { month:7,  day:17, year:1941, team:"Yankees",   emoji:"⚾", title:"DiMaggio's 56-Game Streak Ends", desc:"Joe DiMaggio's unbelievable run ends in Cleveland — the most unbreakable record in sports is now in the books at 56 games." },
  { month:7,  day:18, year:1999, team:"Yankees",   emoji:"⚾", title:"David Cone Perfect Game on Yogi Berra Day", desc:"On Yogi Berra Day, with Don Larsen in attendance, Cone throws a perfect game against the Expos. Only in New York." },
  { month:7,  day:24, year:1983, team:"Yankees",   emoji:"⚾", title:"The Pine Tar Game", desc:"George Brett's homer nullified. Billy Martin's scheming at its finest. Yankees win the protest — then lose the makeup game anyway." },
  // AUGUST
  { month:8,  day:12, year:2025, team:"Mets",      emoji:"⚾", title:"Pete Alonso Sets Mets All-Time HR Record", desc:"The Polar Bear hits #253 off Spencer Strider, passing Darryl Strawberry's 37-year-old record. Citi Field erupts. He adds #254 in the same game." },
  { month:8,  day:19, year:1951, team:"Giants",    emoji:"⚾", title:"Bobby Thomson Joins the Giants Roster", desc:"The man who would hit the Shot Heard Round the World settles into the Giants lineup." },
  // SEPTEMBER
  { month:9,  day:8,  year:1985, team:"Yankees",   emoji:"⚾", title:"Don Mattingly Sets AL RBI Record", desc:"Donnie Baseball sets the American League record for RBIs in a season — the most beloved Yankee of his generation at his peak." },
  { month:9,  day:21, year:2001, team:"Mets",      emoji:"⚾", title:"Piazza's 9/11 Home Run — The Most Emotional HR Ever", desc:"With NYC still in mourning after 9/11, Mike Piazza's solo shot in the 8th inning lifts the Mets over the Braves. The city needed this." },
  { month:9,  day:28, year:1941, team:"Yankees",   emoji:"⚾", title:"DiMaggio's .357 Season Ends", desc:"Joe DiMaggio finishes one of the great seasons in baseball history — in the same year his 56-game hit streak entranced the nation." },
  // OCTOBER
  { month:10, day:1,  year:1961, team:"Yankees",   emoji:"⚾", title:"Roger Maris Hits Home Run #61", desc:"On the final day of the season, Maris breaks Babe Ruth's 34-year-old single-season record. He deserved the asterisk removed — which it finally was." },
  { month:10, day:8,  year:1956, team:"Yankees",   emoji:"⚾", title:"Don Larsen's Perfect Game in the World Series", desc:"Larsen retires all 27 Brooklyn Dodgers in Game 5 — the only perfect game in postseason history. Roy Campanella called it: 'The impossible has happened.'" },
  { month:10, day:16, year:1969, team:"Mets",      emoji:"⚾", title:"Miracle Mets Win the World Series", desc:"The Amazin' Mets defeat the Baltimore Orioles in 5 games. The 100-1 longshots pull off the greatest upset in World Series history. Shea Stadium explodes." },
  { month:10, day:17, year:1977, team:"Yankees",   emoji:"⚾", title:"Reggie Jackson's 3 Home Runs on 3 Consecutive Pitches", desc:"Mr. October hits 3 HRs on 3 pitches from 3 different pitchers in the World Series clincher. The defining image of the Bronx Zoo era." },
  { month:10, day:21, year:1986, team:"Mets",      emoji:"⚾", title:"Mets Win the 1986 World Series", desc:"After Buckner's error saved their season in Game 6, the Mets beat the Red Sox in Game 7. New York goes wild. The Bad Guys Won." },
  { month:10, day:25, year:1986, team:"Mets",      emoji:"⚾", title:"Mookie Wilson's Grounder — Game 6 Miracle", desc:"Mookie's grounder to first. Buckner's legs fail him. The Mets survive to play Game 7 in one of the most dramatic moments in baseball history." },
  { month:10, day:26, year:2003, team:"Devils",    emoji:"🏒", title:"Devils Win Third Stanley Cup", desc:"NJ completes a dynasty — three Cups in 9 years. Pat Burns's masterpiece. Brodeur and Stevens cement their legacies." },
  // NOVEMBER
  { month:11, day:1,  year:2001, team:"Yankees",   emoji:"⚾", title:"Mr. November — Jeter's Walk-Off in the World Series", desc:"Derek Jeter hits a walk-off home run in the 10th inning, crossing into November. The most dramatic walk-off in Yankees history in a World Series they ultimately lose." },
  { month:11, day:4,  year:2001, team:"Yankees",   emoji:"⚾", title:"Yankees Win Game 7 of 2001 World Series... Wait, They Lose", desc:"The Diamondbacks beat Rivera in the 9th inning of Game 7. Luis Gonzalez's bloop single shatters Yankee invincibility. One of the greatest Series ever." },
  { month:11, day:18, year:1985, team:"Giants",    emoji:"🏈", title:"LT Breaks Theismann's Leg on Monday Night Football", desc:"Lawrence Taylor's hit on Monday Night Football shatters Joe Theismann's leg. The image changes the NFL. LT weeps on the field." },
  // DECEMBER
  { month:12, day:19, year:1925, team:"Yankees",   emoji:"⚾", title:"Babe Ruth Sold to Yankees from Red Sox", desc:"The most consequential transaction in sports history — Boston sells Ruth for $100,000, cursing themselves for 86 years." },
  { month:12, day:28, year:1958, team:"Giants",    emoji:"🏈", title:"The Greatest Game Ever Played", desc:"Baltimore Colts defeat the NY Giants 23-17 in sudden death overtime. The game that made the NFL the dominant American sport. Every sports fan owes this game a debt." },
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
function PollsTab() {
  const [votes, setVotes] = useState({});
  const [voted, setVoted] = useState({});

  const POLLS = [
    {
      id:"goat_yankee", question:"Who is the greatest Yankee of all time?",
      options:["Babe Ruth","Lou Gehrig","Mickey Mantle","Joe DiMaggio","Derek Jeter"],
    },
    {
      id:"goat_met", question:"Who is the greatest Met of all time?",
      options:["Tom Seaver","Mike Piazza","Dwight Gooden","David Wright","Pete Alonso"],
    },
    {
      id:"goat_knick", question:"Who is the greatest Knick of all time?",
      options:["Patrick Ewing","Walt Frazier","Willis Reed","Carmelo Anthony","Jalen Brunson"],
    },
    {
      id:"goat_jet", question:"Who is the greatest Jet of all time?",
      options:["Joe Namath","Curtis Martin","Don Maynard","Darrelle Revis","Mark Gastineau"],
    },
    {
      id:"goat_giant", question:"Who is the greatest Giant of all time?",
      options:["Lawrence Taylor","Eli Manning","Frank Gifford","Phil Simms","Saquon Barkley"],
    },
    {
      id:"goat_ranger", question:"Who is the greatest Ranger of all time?",
      options:["Mark Messier","Brian Leetch","Rod Gilbert","Mike Richter","Henrik Lundqvist"],
    },
    {
      id:"goat_islander", question:"Who is the greatest Islander of all time?",
      options:["Bryan Trottier","Mike Bossy","Denis Potvin","Billy Smith","John Tavares"],
    },
    {
      id:"best_moment", question:"Greatest NY sports moment ever?",
      options:["1969 Mets WS","Namath Guarantee","Rangers 1994 Cup","Helmet Catch","Piazza 9/11 HR"],
    },
    {
      id:"best_stadium", question:"Best NY sports venue?",
      options:["Yankee Stadium","Madison Square Garden","MetLife Stadium","Citi Field","UBS Arena"],
    },
    {
      id:"misery_leader", question:"Which NY team makes you suffer the most?",
      options:["Jets","Mets","Knicks","Islanders","Rangers"],
    },
    {
      id:"mt_rushmore", question:"NY Sports Mt. Rushmore — who's on it?",
      options:["Ruth/Namath/LT/Messier","Jeter/Ewing/Messier/LT","Ruth/DiMaggio/Namath/Ewing","Mantle/Seaver/Reed/Bossy"],
    },
  ];

  function handleVote(pollId, option) {
    if (voted[pollId]) return;
    setVotes(v => ({...v, [pollId]: {...(v[pollId]||{}), [option]: ((v[pollId]||{})[option]||0)+1}}));
    setVoted(v => ({...v, [pollId]: option}));
  }

  function getTotal(pollId) {
    return Object.values(votes[pollId]||{}).reduce((a,b)=>a+b,0);
  }

  function getPct(pollId, option) {
    const total = getTotal(pollId);
    if (!total) return 0;
    return Math.round(((votes[pollId]||{})[option]||0) / total * 100);
  }

  return (
    <div style={styles.statsRoot}>
      <div style={styles.stdHeader}>
        <h2 style={styles.stdTitle}>🗳️ NY SPORTS POLLS</h2>
        <p style={styles.stdSub}>VOTE · DEBATE · SETTLE THE ARGUMENT</p>
      </div>
      <div style={{marginBottom:20, padding:"10px 14px", background:"#161616", borderLeft:"3px solid #c8201c"}}>
        <p style={{margin:0, fontSize:12, color:"#aaa"}}>Vote in each poll — results shown after you pick. Polls reset when you reload. Have your say!</p>
      </div>
      <div style={{display:"flex", flexDirection:"column", gap:20}}>
        {POLLS.map(poll => {
          const hasVoted = voted[poll.id];
          const total = getTotal(poll.id);
          return (
            <div key={poll.id} style={styles.pollCard}>
              <div style={styles.pollQuestion}>{poll.question}</div>
              <div style={styles.pollOptions}>
                {poll.options.map((opt, i) => {
                  const pct = getPct(poll.id, opt);
                  const isWinner = hasVoted && pct === Math.max(...poll.options.map(o => getPct(poll.id, o)));
                  const isMyVote = voted[poll.id] === opt;
                  return (
                    <div key={i} style={styles.pollOptionWrap}>
                      <button
                        onClick={() => handleVote(poll.id, opt)}
                        disabled={!!hasVoted}
                        style={{
                          ...styles.pollOption,
                          ...(isMyVote ? styles.pollOptionVoted : {}),
                          ...(hasVoted && !isMyVote ? styles.pollOptionDisabled : {}),
                          cursor: hasVoted ? "default" : "pointer",
                        }}>
                        {hasVoted && (
                          <div style={{...styles.pollBar, width:`${pct}%`, background: isWinner?"#c8201c":"#2a2a2a"}} />
                        )}
                        <span style={styles.pollOptionText}>
                          {isMyVote && "✓ "}{opt}
                        </span>
                        {hasVoted && <span style={styles.pollPct}>{pct}%</span>}
                      </button>
                    </div>
                  );
                })}
              </div>
              {hasVoted && <div style={styles.pollMeta}>{total} vote{total!==1?"s":""} · you voted: {voted[poll.id]}</div>}
            </div>
          );
        })}
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
      lowlights:["56 years without a Super Bowl — longest drought in the NFL","Missed on Dan Marino in 1983 (took Ken O'Brien)","Brett Favre torn Achilles Week 4, 2008","Sanchez Butt Fumble on national TV 2012","Sam Darnold's ghost haunts every draft pick","Aaron Rodgers: Achilles in Week 1, 2023"],
      brightside:"They do have Joe Namath and Super Bowl III — the greatest moment in franchise history. Aaron Rodgers healthy again gives real hope.",
    },
    {
      team:"Knicks", emoji:"🏀", color:"#006BB6",
      score:91,
      title:"CHRONIC HEARTBREAK",
      last:"1973", drought:53,
      lowlights:["52 years without an NBA title","1994 Finals — Ewing's closest call, lost to Rockets","7 shots at the playoffs in the Isiah Thomas era","James Dolan's endless ownership chaos","Carmelo Anthony's best years wasted","Kristaps Porzingis traded for nothing tangible"],
      brightside:"Brunson has MSG rocking again. Real hope for the first time in decades.",
    },
    {
      team:"Mets", emoji:"⚾", color:"#FF5910",
      score:85,
      title:"HIGH SUFFERING",
      last:"1986", drought:40,
      lowlights:["40 years without a World Series title","1988: 100 wins and still lost to the Dodgers in NLCS","Generation K: Wilson, Pulsipher, Isringhausen — all busted before they started","2007: Collapsed with 17 games to play — 7 game lead vanished","2015: Harvey's arm, one strike away, Familia blows Save","Bobby Bonilla Day — paid $1.19M every July 1 through 2035"],
      brightside:"Pete Alonso is the all-time HR king. Steve Cohen's money. Soto signed. Juan Soto and Alonso together could finally bring it home.",
    },
    {
      team:"Rangers", emoji:"🏒", color:"#0038A8",
      score:72,
      title:"ELEVATED SUFFERING",
      last:"1994", drought:32,
      lowlights:["54-year drought before 1994","2014 Finals loss to the LA Kings","2022 Conference Finals loss to Lightning","Losing Messier's free agent negotiations","Trading Rick Middleton for Ken Hodge — criminal"],
      brightside:"1994 happened. Panarin/Fox core is legitimate. The drought feels manageable.",
    },
    {
      team:"Giants", emoji:"🏈", color:"#0B2265",
      score:65,
      title:"MODERATE SUFFERING",
      last:"2012", drought:14,
      lowlights:["Back-to-back losing seasons 2017-2023","Daniel Jones experiment cost 3 years","Saquon Barkley left for Philadelphia and immediately won","Odell Beckham traded away","McAdoo benched Eli Manning — immediate fan revolt"],
      brightside:"4 Super Bowls. Two miracle upsets of the Patriots. LT. The resume is elite.",
    },
    {
      team:"Islanders", emoji:"🏒", color:"#00539B",
      score:62,
      title:"MODERATE SUFFERING",
      last:"1983", drought:43,
      lowlights:["John Tavares left for Toronto in free agency — broke hearts","Rick DiPietro 15-year $67.5M contract — disaster","Years of arena uncertainty (Nassau vs Brooklyn vs UBS)","Mike Milbury's trades still echoing","No Cup since the dynasty ended in 1983"],
      brightside:"Matthew Schaefer #1 overall. Barry Trotz era nearly made it. Patrick Roy coaching.",
    },
    {
      team:"Nets", emoji:"🏀", color:"#000000",
      score:55,
      title:"EXISTENTIAL CONFUSION",
      last:"Never (NBA)", drought:999,
      lowlights:["Never won an NBA championship","Dr. J sold to 76ers to pay the ABA-NBA merger fee","KD/Kyrie/Harden Big 3 never won a single playoff round","Moved from Jersey to Brooklyn — identity crisis","Brook Lopez era was good but not good enough"],
      brightside:"Dr. J's two ABA titles count. Barclays Center is beautiful. Mikal Bridges/Cam Johnson core.",
    },
    {
      team:"Yankees", emoji:"⚾", color:"#003087",
      score:35,
      title:"BASELINE SUFFERING",
      last:"2009", drought:17,
      lowlights:["17 years since last World Series — a LONG time by Yankee standards","2004 ALCS: blew 3-0 series lead to Red Sox","ARod's steroid legacy taints multiple eras","2022 ALCS: 7 games, Judge and Stanton disappear","Gerrit Cole's spider tack suspension embarrassment"],
      brightside:"27 championships. Aaron Judge. They're always in contention. The standard is the standard.",
    },
    {
      team:"Liberty", emoji:"🏀", color:"#007A5E",
      score:15,
      title:"REIGNING CHAMPIONS",
      last:"2025", drought:0,
      lowlights:["Years of irrelevance before Stewart's arrival","Played second fiddle to the Knicks for decades","Had to fight for visibility in NY sports media"],
      brightside:"Back-to-back WNBA champions. Breanna Stewart. Sabrina Ionescu. The best team in women's basketball.",
    },
    {
      team:"Devils", emoji:"🏒", color:"#CE1126",
      score:22,
      title:"SURPRISINGLY MANAGEABLE",
      last:"2003", drought:23,
      lowlights:["23 years since last Cup despite 3 championships","Patrik Elias retired without enough recognition","Zach Parise left for Minnesota, never won","2012 Finals loss to Kings after incredible playoff run","Jack Hughes growing pains"],
      brightside:"Three Cups in 9 years (1995-2003). Brodeur's records forever. Hughes brothers era dawning.",
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
      { year:2026, pick:"#3",  name:"Abdul Carter",     note:"Penn State LB — most electrifying Giants pick in years. Generational pass rusher." },
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

  return (
    <div style={styles.statsRoot}>
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
  const leagues = ["MLB","NFL","NBA","NHL","WNBA","MLS"];

  const filtered = standings.filter(s => s.league === activeLeague);

  return (
    <div style={styles.stdRoot}>
      <div style={styles.stdHeader}>
        <h2 style={styles.stdTitle}>NY TEAMS STANDINGS</h2>
        <p style={styles.stdSub}>WHERE YOUR TEAMS STAND RIGHT NOW</p>
      </div>

      {/* League filter */}
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
                {/* Header */}
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
        "NETS":"NETS","LIBERTY":"LIBERTY",
        // These don't have dedicated facts yet — will show random NY fact
        "DEVILS":null,"RED BULLS":null,"GOTHAM FC":null,
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
        <h2 style={styles.spinTitle}>SPIN FOR A FUN FACT</h2>
        <p style={styles.spinSub}>LAND ON A TEAM · GET A PIECE OF NY SPORTS HISTORY</p>
      </div>

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
  const puzzle = SAMPLE_PUZZLE;
  const ROWS = puzzle.solution.length;
  const COLS = puzzle.solution[0].length;

  // Build number map
  const numberMap = {};
  [...puzzle.across, ...puzzle.down].forEach(c => {
    numberMap[`${c.row}-${c.col}`] = c.number;
  });

  // Build cell membership: which across/down clue does each cell belong to?
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

  const [userGrid, setUserGrid]         = useState(() =>
    Array.from({length:ROWS}, () => Array(COLS).fill(""))
  );
  const [selectedCell, setSelectedCell] = useState(null);
  const [direction, setDirection]       = useState("across");
  const [activeClue, setActiveClue]     = useState(null);
  const [revealed, setRevealed]         = useState(false);
  const [checked, setChecked]           = useState({});
  const [complete, setComplete]         = useState(false);
  const inputRefs = {};

  function isBlack(r,c) { return puzzle.solution[r][c] === "."; }

  function getActiveClueNum() {
    if (!selectedCell) return null;
    const key = `${selectedCell.r}-${selectedCell.c}`;
    return cellClues[key]?.[direction] || null;
  }

  function getActiveClueObj() {
    const num = getActiveClueNum();
    if (!num) return null;
    return (direction === "across" ? puzzle.across : puzzle.down).find(c => c.number === num);
  }

  function selectCell(r, c) {
    if (isBlack(r,c)) return;
    const key = `${r}-${c}`;
    if (selectedCell?.r === r && selectedCell?.c === c) {
      setDirection(d => d === "across" ? "down" : "across");
    } else {
      setSelectedCell({r,c});
    }
    setActiveClue(getActiveClueNum());
  }

  function handleKey(r, c, e) {
    const letter = e.key.toUpperCase();
    if (letter.length === 1 && letter >= "A" && letter <= "Z") {
      const ng = userGrid.map(row => [...row]);
      ng[r][c] = letter;
      setUserGrid(ng);
      setChecked(prev => { const n={...prev}; delete n[`${r}-${c}`]; return n; });
      advanceCursor(r, c);
      checkComplete(ng);
    } else if (e.key === "Backspace") {
      const ng = userGrid.map(row => [...row]);
      if (ng[r][c]) { ng[r][c] = ""; setUserGrid(ng); }
      else retreatCursor(r, c);
    } else if (e.key === "ArrowRight") { setDirection("across"); moveTo(r, c+1); }
    else if (e.key === "ArrowLeft")  { setDirection("across"); moveTo(r, c-1); }
    else if (e.key === "ArrowDown")  { setDirection("down");   moveTo(r+1, c); }
    else if (e.key === "ArrowUp")    { setDirection("down");   moveTo(r-1, c); }
    else if (e.key === "Tab") { e.preventDefault(); nextClue(); }
  }

  function moveTo(r, c) {
    if (r>=0 && r<ROWS && c>=0 && c<COLS && !isBlack(r,c)) {
      setSelectedCell({r,c});
    }
  }

  function advanceCursor(r, c) {
    if (direction === "across") { for(let nc=c+1;nc<COLS;nc++) { if(!isBlack(r,nc)){setSelectedCell({r,c:nc});return;} } }
    else { for(let nr=r+1;nr<ROWS;nr++) { if(!isBlack(nr,c)){setSelectedCell({r:nr,c});return;} } }
  }

  function retreatCursor(r, c) {
    if (direction === "across") { for(let nc=c-1;nc>=0;nc--) { if(!isBlack(r,nc)){setSelectedCell({r,c:nc});return;} } }
    else { for(let nr=r-1;nr>=0;nr--) { if(!isBlack(nr,c)){setSelectedCell({r:nr,c});return;} } }
  }

  function nextClue() {
    const clues = direction === "across" ? puzzle.across : puzzle.down;
    const num = getActiveClueNum();
    const idx = clues.findIndex(c => c.number === num);
    const next = clues[(idx+1) % clues.length];
    setSelectedCell({r:next.row, c:next.col});
  }

  function checkComplete(grid) {
    const done = puzzle.solution.every((row,r) =>
      row.every((cell,c) => cell === "." || grid[r][c] === cell)
    );
    setComplete(done);
  }

  function handleCheck() {
    const newChecked = {};
    puzzle.solution.forEach((row,r) => row.forEach((cell,c) => {
      if (cell !== "." && userGrid[r][c] && userGrid[r][c] !== cell) {
        newChecked[`${r}-${c}`] = "wrong";
      } else if (cell !== "." && userGrid[r][c] === cell) {
        newChecked[`${r}-${c}`] = "correct";
      }
    }));
    setChecked(newChecked);
  }

  function handleReveal() {
    setRevealed(true);
    setUserGrid(puzzle.solution.map(row => row.map(c => c === "." ? "" : c)));
    setComplete(true);
  }

  function handleDownload() {
    // Build printable HTML and open print dialog
    const SIZE = puzzle.solution.length;
    const cellSize = 28;
    const gridPx = SIZE * cellSize + SIZE + 2;

    // Build number map
    const numMap = {};
    [...puzzle.across, ...puzzle.down].forEach(c => { numMap[`${c.row}-${c.col}`] = c.number; });

    let gridHTML = `<table style="border-collapse:collapse;margin:0 auto;">`;
    puzzle.solution.forEach((row, r) => {
      gridHTML += `<tr>`;
      row.forEach((cell, c) => {
        const isBlack = cell === ".";
        const num = numMap[`${r}-${c}`];
        gridHTML += `<td style="width:${cellSize}px;height:${cellSize}px;border:1px solid #000;background:${isBlack?"#000":"#fff"};position:relative;vertical-align:top;font-size:7px;padding:1px;">`;
        if (!isBlack && num) gridHTML += `<span style="font-size:7px;line-height:1;">${num}</span>`;
        gridHTML += `</td>`;
      });
      gridHTML += `</tr>`;
    });
    gridHTML += `</table>`;

    let acrossHTML = puzzle.across.map(c => `<tr><td style="padding:2px 6px;font-weight:bold;white-space:nowrap;">${c.number}A</td><td style="padding:2px 6px;">${c.clue}</td></tr>`).join("");
    let downHTML   = puzzle.down.map(c => `<tr><td style="padding:2px 6px;font-weight:bold;white-space:nowrap;">${c.number}D</td><td style="padding:2px 6px;">${c.clue}</td></tr>`).join("");

    const html = `
      <html><head><title>${puzzle.title}</title>
      <style>
        body{font-family:Georgia,serif;margin:20px;color:#000;}
        h2{text-align:center;font-size:16px;margin:0 0 4px;}
        p{text-align:center;font-size:11px;margin:0 0 12px;color:#555;}
        .grid{margin-bottom:16px;}
        .clues{display:flex;gap:20px;font-size:11px;}
        .col{flex:1;}
        h3{font-size:12px;border-bottom:1px solid #000;margin:0 0 4px;}
        table.clue-table td{vertical-align:top;}
        @media print{button{display:none;}}
      </style></head>
      <body>
        <h2>${puzzle.title}</h2>
        <p>${puzzle.date} · 15×15 · SUNDAY CHALLENGE</p>
        <div class="grid">${gridHTML}</div>
        <div class="clues">
          <div class="col"><h3>ACROSS</h3><table class="clue-table">${acrossHTML}</table></div>
          <div class="col"><h3>DOWN</h3><table class="clue-table">${downHTML}</table></div>
        </div>
        <script>window.onload=()=>window.print();</script>
      </body></html>`;

    const w = window.open("","_blank");
    w.document.write(html);
    w.document.close();
  }

  // Highlight logic
  function getCellStyle(r, c) {
    if (isBlack(r,c)) return {...styles.xwCell, ...styles.xwCellBlack};
    const key = `${r}-${c}`;
    const isSel = selectedCell?.r===r && selectedCell?.c===c;
    const clueNum = getActiveClueNum();
    const isHighlighted = clueNum && cellClues[key]?.[direction] === clueNum;
    const chk = checked[key];
    let bg = "#fff";
    if (isSel) bg = "#f5e642";
    else if (isHighlighted) bg = "#c8e8ff";
    else if (chk === "wrong") bg = "#ffcccc";
    else if (chk === "correct") bg = "#ccffcc";
    return {...styles.xwCell, background: bg};
  }

  const activeClueObj = getActiveClueObj();
  const acrossClues = puzzle.across;
  const downClues   = puzzle.down;

  return (
    <div style={styles.xwRoot}>
      {/* Header */}
      <div style={styles.xwHeader}>
        <div>
          <h2 style={styles.xwTitle}>{puzzle.title}</h2>
          <p style={styles.xwDate}>{puzzle.date} · 15×15 · SUNDAY CHALLENGE</p>
        </div>
        <div style={styles.xwActions}>
          <button onClick={handleCheck} style={styles.xwBtn}>CHECK</button>
          <button onClick={handleReveal} style={{...styles.xwBtn, ...styles.xwBtnReveal}}>REVEAL</button>
          <button onClick={handleDownload} style={{...styles.xwBtn, color:"#888"}}>🖨 PRINT / PDF</button>
        </div>
      </div>

      {complete && (
        <div style={styles.xwComplete}>
          🎉 SOLVED! New York sports fan confirmed.
        </div>
      )}

      {/* Active clue banner */}
      {activeClueObj && (
        <div style={styles.xwActiveClueBanner}>
          <span style={styles.xwActiveClueNum}>{activeClueObj.number}{direction === "across" ? "A" : "D"}</span>
          <span style={styles.xwActiveClueText}>{activeClueObj.clue}</span>
          <span style={styles.xwActiveClueDir}>{direction.toUpperCase()}</span>
        </div>
      )}

      {/* Grid + Clues layout */}
      <div style={styles.xwLayout}>
        {/* GRID */}
        <div style={styles.xwGridWrap}>
          <div style={styles.xwGrid}>
            {puzzle.solution.map((row,r) => row.map((cell,c) => {
              const num = numberMap[`${r}-${c}`];
              const isBlk = isBlack(r,c);
              return (
                <div key={`${r}-${c}`} style={getCellStyle(r,c)}
                  onClick={() => selectCell(r,c)}>
                  {!isBlk && num && <span style={styles.xwCellNum}>{num}</span>}
                  {!isBlk && (
                    <input
                      ref={el => { if(el) inputRefs[`${r}-${c}`]=el; }}
                      style={styles.xwInput}
                      value={userGrid[r][c]}
                      onChange={()=>{}}
                      onKeyDown={e => handleKey(r,c,e)}
                      onFocus={() => selectCell(r,c)}
                      maxLength={1}
                    />
                  )}
                </div>
              );
            }))}
          </div>
        </div>

        {/* CLUES */}
        <div style={styles.xwClues}>
          <div style={styles.xwClueCol}>
            <div style={styles.xwClueHeader}>ACROSS</div>
            {acrossClues.map(cl => {
              const isAct = direction==="across" && getActiveClueNum()===cl.number;
              return (
                <div key={cl.number}
                  onClick={() => { setSelectedCell({r:cl.row,c:cl.col}); setDirection("across"); }}
                  style={{...styles.xwClueItem, ...(isAct ? styles.xwClueItemActive : {})}}>
                  <span style={styles.xwClueNum}>{cl.number}</span>
                  <span style={styles.xwClueText}>{cl.clue}</span>
                </div>
              );
            })}
          </div>
          <div style={styles.xwClueCol}>
            <div style={styles.xwClueHeader}>DOWN</div>
            {downClues.map(cl => {
              const isAct = direction==="down" && getActiveClueNum()===cl.number;
              return (
                <div key={cl.number}
                  onClick={() => { setSelectedCell({r:cl.row,c:cl.col}); setDirection("down"); }}
                  style={{...styles.xwClueItem, ...(isAct ? styles.xwClueItemActive : {})}}>
                  <span style={styles.xwClueNum}>{cl.number}</span>
                  <span style={styles.xwClueText}>{cl.clue}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── STYLES ────────────────────────────────────────────────────────────────
const styles = {
  root: {
    background: "#0e0e0e",
    minHeight: "100vh",
    fontFamily: "'Georgia', 'Times New Roman', serif",
    color: "#e8e0d0",
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
    position: "relative", zIndex: 1,
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
    position: "relative", zIndex: 1,
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
  newsGrid: {},
  newsFeatured: {
    display: "block", textDecoration: "none", color: "inherit",
    background: "#161616", border: "1px solid #333",
    padding: "20px", marginBottom: 12,
    transition: "border-color 0.2s",
    borderLeft: "4px solid #c8201c",
  },
  newsFeaturedSource: {
    fontSize: 9, letterSpacing: "0.2em", color: "#c8201c",
    fontWeight: 900, marginBottom: 8, textTransform: "uppercase",
  },
  newsFeaturedTitle: {
    margin: "0 0 10px", fontSize: "clamp(16px, 3vw, 22px)",
    fontWeight: 900, lineHeight: 1.2, letterSpacing: "-0.01em",
    color: "#e8e0d0", fontFamily: "'Georgia', serif",
  },
  newsFeaturedDesc: {
    margin: "0 0 12px", fontSize: 13, lineHeight: 1.6, color: "#999",
  },
  newsReadMore: {
    fontSize: 10, color: "#c8201c", fontWeight: 900, letterSpacing: "0.1em",
  },
  newsDivider: {
    display: "flex", alignItems: "center", gap: 12,
    margin: "20px 0 16px", borderTop: "1px solid #2a2a2a", paddingTop: 12,
  },
  newsDividerText: { fontSize: 9, color: "#555", letterSpacing: "0.2em", fontWeight: 900 },
  newsSmall: {
    display: "block", textDecoration: "none", color: "inherit",
    padding: "12px 0", borderBottom: "1px solid #1e1e1e",
    transition: "background 0.15s",
  },
  newsSmallAlt: { background: "transparent" },
  newsSmallMeta: { display: "flex", gap: 12, marginBottom: 4, alignItems: "center" },
  newsSmallSource: { fontSize: 9, letterSpacing: "0.15em", color: "#666", fontWeight: 900, textTransform: "uppercase" },
  newsSmallDate: { fontSize: 9, color: "#555" },
  newsSmallTitle: {
    margin: 0, fontSize: 14, fontWeight: 700, lineHeight: 1.4, color: "#ccc",
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
  tcardWrap: { cursor:"pointer", userSelect:"none", maxWidth:280 },
  tcardOuter: {
    padding:6, borderRadius:8,
    boxShadow:"0 4px 20px rgba(0,0,0,0.6)",
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
    position:"relative", height:160, marginBottom:8,
    borderRadius:4, overflow:"hidden",
    border:"2px solid rgba(255,215,0,0.4)",
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
    fontSize:16, fontWeight:900, color:"#e8e0d0",
    fontFamily:"'Georgia',serif", lineHeight:1.1, marginBottom:3,
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
    display:"flex", gap:12, alignItems:"flex-start",
    background:"#161616", borderLeft:"3px solid #c8201c",
    padding:"12px 16px", marginBottom:16,
  },
  quoteIcon: { fontSize:18, flexShrink:0, marginTop:2 },
  quoteBody: { flex:1 },
  quoteText: {
    margin:"0 0 4px", fontSize:13, fontStyle:"italic",
    color:"#e8e0d0", lineHeight:1.5, fontFamily:"'Georgia',serif",
  },
  quoteAuthor: { margin:0, fontSize:10, color:"#aaa", letterSpacing:"0.05em" },
  quoteTeam: { color:"#c8201c", fontWeight:700 },

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

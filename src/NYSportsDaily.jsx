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
];

const NY_KEYWORDS = ["jets","giants","yankees","mets","knicks","nets","rangers","islanders","devils","gotham","nycfc","red bulls","new york","liberty"];

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
      const upcoming = events.filter(e => {
        const d = new Date(e.date);
        return d >= new Date();
      }).slice(0, 5);
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
  { quote: "I want to thank the Good Lord for making me a Yankee.", author: "Joe DiMaggio", team: "Yankees" },
  { quote: "I guarantee it.", author: "Joe Namath", team: "Jets", context: "Super Bowl III, 1969" },
  { quote: "Ya gotta believe!", author: "Tug McGraw", team: "Mets", context: "1973 pennant run" },
  { quote: "Some people say New York is the capital of the world. I wouldn't argue with that.", author: "Derek Jeter", team: "Yankees" },
  { quote: "New York is a city of conversation, of energy. The fans here live and die with every pitch.", author: "Mike Piazza", team: "Mets" },
  { quote: "The key to this team is the same as it always has been: pride.", author: "Phil Jackson", team: "Knicks" },
  { quote: "There is always some kid who may be seeing me for the first or last time. I owe him my best.", author: "Joe DiMaggio", team: "Yankees" },
  { quote: "Hockey is a unique sport — you need each and every guy pulling in the same direction.", author: "Mark Messier", team: "Rangers" },
  { quote: "We are the Yankees. We don't rebuild, we reload.", author: "Derek Jeter", team: "Yankees" },
  { quote: "Pressure is a privilege — it only comes to those who earn it.", author: "Billie Jean King", team: "Sports" },
  { quote: "The only way to prove you are a good sport is to lose.", author: "Ernie Banks", team: "Baseball" },
  { quote: "Every day is a new opportunity. You can build on yesterday's success or put its failures behind and start over again.", author: "Bob Feller", team: "Baseball" },
  { quote: "Baseball is like church. Many attend, few understand.", author: "Leo Durocher", team: "Baseball" },
  { quote: "The way a team plays as a whole determines its success.", author: "Babe Ruth", team: "Yankees" },
  { quote: "Hard work beats talent when talent doesn't work hard.", author: "Tim Notke", team: "Sports" },
  { quote: "Champions keep playing until they get it right.", author: "Billie Jean King", team: "Sports" },
  { quote: "The only place success comes before work is in the dictionary.", author: "Vince Lombardi", team: "NFL" },
  { quote: "It ain't over till it's over.", author: "Yogi Berra", team: "Yankees" },
  { quote: "You can observe a lot just by watching.", author: "Yogi Berra", team: "Yankees" },
  { quote: "When you come to a fork in the road, take it.", author: "Yogi Berra", team: "Yankees" },
  { quote: "In theory there is no difference between theory and practice. In practice there is.", author: "Yogi Berra", team: "Yankees" },
  { quote: "I never said most of the things I said.", author: "Yogi Berra", team: "Yankees" },
  { quote: "Little League baseball is a very good thing because it keeps the parents off the streets.", author: "Yogi Berra", team: "Yankees" },
  { quote: "I'm not going to buy my kids an encyclopedia. Let them walk to school like I did.", author: "Yogi Berra", team: "Yankees" },
  { quote: "A nickel ain't worth a dime anymore.", author: "Yogi Berra", team: "Yankees" },
  { quote: "We made too many wrong mistakes.", author: "Yogi Berra", team: "Yankees" },
  { quote: "Nobody goes there anymore. It's too crowded.", author: "Yogi Berra", team: "Yankees" },
  { quote: "Always go to other people's funerals, otherwise they won't come to yours.", author: "Yogi Berra", team: "Yankees" },
  { quote: "If you don't know where you are going, you might wind up someplace else.", author: "Yogi Berra", team: "Yankees" },
  { quote: "The future ain't what it used to be.", author: "Yogi Berra", team: "Yankees" },
];

function getDailyQuote() {
  const day = Math.floor(Date.now() / 86400000);
  return NY_QUOTES[day % NY_QUOTES.length];
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
  try {
    // Use the correct ESPN core API for leaders
    const year = new Date().getFullYear();
    const url = `https://sports.core.api.espn.com/v2/sports/${sport}/leagues/${league}/seasons/${year}/types/2/leaders?limit=10`;
    const res  = await fetch(url);
    const json = await res.json();
    const cats = json.categories || [];
    if (cats.length) return cats;
    // Fallback to site API
    const url2 = `https://site.api.espn.com/apis/site/v2/sports/${sport}/${league}/leaders`;
    const res2  = await fetch(url2);
    const json2 = await res2.json();
    return json2.categories || json2.leaders || [];
  } catch(e) { return []; }
}

async function fetchNYNews() {
  const results = [];
  await Promise.all(NY_NEWS_ENDPOINTS.map(async ({ sport, league, name }) => {
    try {
      const url = `https://site.api.espn.com/apis/site/v2/sports/${sport}/${league}/news?limit=20`;
      const res  = await fetch(url);
      const json = await res.json();
      (json.articles || []).forEach(a => {
        const title = a.headline || a.title || "";
        const desc  = a.description || "";
        const combined = (title + " " + desc).toLowerCase();
        const isNY = NY_KEYWORDS.some(kw => combined.includes(kw));
        if (!isNY) return;
        results.push({
          title,
          link:   a.links?.web?.href || "#",
          desc,
          pub:    a.published || a.lastModified || "",
          source: `ESPN · ${name}`,
        });
      });
    } catch(e) {}
  }));
  const seen = new Set();
  return results
    .sort((a,b) => new Date(b.pub) - new Date(a.pub))
    .filter(item => {
      if (!item.title || seen.has(item.title)) return false;
      seen.add(item.title);
      return true;
    });
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

        {/* TAB NAV */}
        <div style={styles.tabNav}>
          {["SCORES","TV","STANDINGS","SCHEDULE","STATS","HISTORY","NEWS","TRIVIA","XWORD","SPIN"].map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              style={{...styles.tabBtn, ...(activeTab===tab ? styles.tabBtnActive : {})}}>
              {tab}
            </button>
          ))}
        </div>

        {/* ──── SCORES TAB ──── */}
        {activeTab === "SCORES" && (
          <div>
            {/* Quote of the Day */}
            <QuoteOfDay />
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
                ) : news.slice(0, 8).map((item, i) => (
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
          <div>
            {loadingNews ? (
              <div style={styles.loading}>
                <div style={styles.loadingDots}>
                  {[0,1,2].map(i => <span key={i} style={{...styles.dot, animationDelay:`${i*0.2}s`}} />)}
                </div>
                <p style={styles.loadingText}>LOADING HEADLINES...</p>
              </div>
            ) : news.length === 0 ? (
              <div style={styles.empty}>
                <span style={styles.emptyIcon}>📰</span>
                <p style={styles.emptyText}>NO STORIES AVAILABLE</p>
              </div>
            ) : (
              <div style={styles.newsGrid}>
                {news.slice(0,4).map((item,i) => (
                  <NewsCardFeatured key={i} item={item} />
                ))}
                <div style={styles.newsDivider}><span style={styles.newsDividerText}>MORE STORIES</span></div>
                {news.slice(4,30).map((item,i) => (
                  <NewsCardSmall key={i} item={item} index={i} />
                ))}
              </div>
            )}
          </div>
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
        {activeTab === "XWORD" && (
          <CrosswordTab />
        )}
        {/* ──── SPIN TAB ──── */}
        {activeTab === "SPIN" && (
          <SpinTab />
        )}
      </main>

      {/* ── FOOTER ── */}
      <footer style={styles.footer}>
        <div style={styles.footerRule} />
        <p style={styles.footerText}>NY SPORTS DAILY · SCORES VIA ESPN · NEWS VIA RSS</p>
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
    const comp = json.header?.competitions?.[0];
    const boxscore = json.boxscore;
    const players  = boxscore?.players || [];
    const teams    = comp?.competitors || [];
    // Line score (periods/innings/quarters)
    const linescores = teams.map(t => ({
      team: t.team?.displayName,
      abbrev: t.team?.abbreviation,
      logo: t.team?.logo,
      periods: t.linescores?.map(l => l.displayValue || l.value) || [],
      total: t.score,
    }));
    // Player stats per team
    const playerStats = players.map(teamStats => ({
      team: teamStats.team?.displayName,
      stats: (teamStats.statistics || []).map(statGroup => ({
        name: statGroup.name,
        keys: statGroup.keys || [],
        labels: statGroup.labels || [],
        athletes: (statGroup.athletes || []).map(a => ({
          name: a.athlete?.displayName || a.athlete?.shortName || "",
          headshot: a.athlete?.headshot?.href || "",
          stats: a.stats || [],
        })),
      })),
    }));
    return { linescores, playerStats };
  } catch { return null; }
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
              {/* Line score */}
              {boxScore.linescores?.length > 0 && boxScore.linescores[0].periods?.length > 0 && (
                <div style={styles.lineScoreWrap}>
                  <table style={styles.lineScoreTable}>
                    <thead>
                      <tr>
                        <th style={styles.lsThTeam}>TEAM</th>
                        {boxScore.linescores[0].periods.map((_,i) => (
                          <th key={i} style={styles.lsTh}>{i+1}</th>
                        ))}
                        <th style={{...styles.lsTh, color:"#c8201c"}}>T</th>
                      </tr>
                    </thead>
                    <tbody>
                      {boxScore.linescores.map((ls, i) => (
                        <tr key={i} style={i%2===0?{}:{background:"#0f0f0f"}}>
                          <td style={styles.lsTdTeam}>
                            {ls.logo && <img src={ls.logo} alt="" style={{width:14,height:14,objectFit:"contain",marginRight:4,verticalAlign:"middle"}} onError={e=>e.target.style.display="none"} />}
                            {ls.abbrev}
                          </td>
                          {ls.periods.map((p,j) => <td key={j} style={styles.lsTd}>{p}</td>)}
                          <td style={{...styles.lsTd, fontWeight:900, color:"#e8e0d0"}}>{ls.total}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Player stats per team */}
              {boxScore.playerStats?.map((teamData, ti) => (
                <div key={ti} style={styles.playerStatsSection}>
                  <div style={styles.playerStatsTeamHeader}>{teamData.team}</div>
                  {teamData.stats?.map((statGroup, gi) => (
                    <div key={gi} style={styles.statGroupWrap}>
                      <div style={styles.statGroupName}>{statGroup.name?.toUpperCase()}</div>
                      <div style={styles.statTableWrap}>
                        <table style={styles.statTable}>
                          <thead>
                            <tr>
                              <th style={styles.statThPlayer}>PLAYER</th>
                              {statGroup.labels?.map((lbl,i) => (
                                <th key={i} style={styles.statTh}
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
                                  {a.headshot && <img src={a.headshot} alt="" style={{width:16,height:16,borderRadius:"50%",objectFit:"cover",marginRight:4,verticalAlign:"middle"}} onError={e=>e.target.style.display="none"} />}
                                  {a.name}
                                </td>
                                {a.stats.map((s,si) => (
                                  <td key={si} style={styles.statTd}>{s}</td>
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

const SPORT_ICONS_TV = { NFL:"🏈", MLB:"⚾", NBA:"🏀", NHL:"🏒", WNBA:"🏀", MLS:"⚽" };

// ─── TV SCHEDULE COMPONENT ─────────────────────────────────────────────────
function TVScheduleTab({ scores, loading }) {
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
              <span key={i} style={{...styles.tvChannelBadge, background: cs.bg, color: cs.text}}>
                {cs.label || ch}
              </span>
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
const HISTORY_LISTS = {
  "Yankees": [
    { title: "All-Time Yankees Home Run Leaders", items: [
      { rank:1, name:"Babe Ruth",        value:"659 HR",  years:"1920–1934" },
      { rank:2, name:"Mickey Mantle",    value:"536 HR",  years:"1951–1968" },
      { rank:3, name:"Lou Gehrig",       value:"493 HR",  years:"1923–1939" },
      { rank:4, name:"Joe DiMaggio",     value:"361 HR",  years:"1936–1951" },
      { rank:5, name:"Yogi Berra",       value:"358 HR",  years:"1946–1963" },
      { rank:6, name:"Bernie Williams",  value:"287 HR",  years:"1991–2006" },
      { rank:7, name:"Jorge Posada",     value:"275 HR",  years:"1995–2011" },
      { rank:8, name:"Derek Jeter",      value:"260 HR",  years:"1995–2014" },
      { rank:9, name:"Don Mattingly",    value:"222 HR",  years:"1982–1995" },
      { rank:10,name:"Dave Winfield",    value:"205 HR",  years:"1981–1990" },
    ]},
    { title: "Yankees World Series Championships", items: [
      { rank:1,  name:"1923", value:"vs Giants",       years:"First championship" },
      { rank:2,  name:"1927", value:"vs Pirates",      years:"Murderers' Row" },
      { rank:3,  name:"1928", value:"vs Cardinals",    years:"Back-to-back" },
      { rank:4,  name:"1932", value:"vs Cubs",         years:"Babe's called shot" },
      { rank:5,  name:"1936–39", value:"4 straight",   years:"DiMaggio era" },
      { rank:6,  name:"1949–53", value:"5 straight",   years:"Greatest dynasty" },
      { rank:7,  name:"1977–78", value:"Back-to-back", years:"Reggie Jackson era" },
      { rank:8,  name:"1996", value:"vs Braves",       years:"Jeter's first ring" },
      { rank:9,  name:"1998–2000", value:"3 straight", years:"Dynasty repeat" },
      { rank:10, name:"2009", value:"vs Phillies",     years:"27th championship" },
    ]},
  ],
  "Mets": [
    { title: "Greatest Mets Seasons", items: [
      { rank:1, name:"1969",  value:"World Champions",    years:"Miracle Mets" },
      { rank:2, name:"1986",  value:"World Champions",    years:"108 wins, Gooden, Strawberry" },
      { rank:3, name:"2015",  value:"NL Champions",       years:"Harvey, deGrom, Syndergaard" },
      { rank:4, name:"1988",  value:"100 wins",           years:"Cone, Gooden dominate" },
      { rank:5, name:"1973",  value:"NL Champions",       years:"Ya Gotta Believe!" },
      { rank:6, name:"2000",  value:"NL Champions",       years:"Subway Series" },
      { rank:7, name:"1999",  value:"NLCS",               years:"Piazza era begins" },
      { rank:8, name:"1985",  value:"98 wins",            years:"One game from division" },
      { rank:9, name:"2022",  value:"101 wins",           years:"deGrom/Scherzer" },
      { rank:10,name:"1990",  value:"91 wins",            years:"Last great Straw season" },
    ]},
    { title: "All-Time Mets HR Leaders", items: [
      { rank:1,  name:"Darryl Strawberry", value:"252 HR", years:"1983–1990" },
      { rank:2,  name:"Mike Piazza",       value:"220 HR", years:"1998–2005" },
      { rank:3,  name:"Dave Kingman",      value:"154 HR", years:"1975–77, 1981–83" },
      { rank:4,  name:"Howard Johnson",    value:"192 HR", years:"1985–1993" },
      { rank:5,  name:"Carlos Delgado",    value:"104 HR", years:"2006–2009" },
      { rank:6,  name:"Todd Hundley",      value:"124 HR", years:"1990–1998" },
      { rank:7,  name:"Cleon Jones",       value:"93 HR",  years:"1963–1975" },
      { rank:8,  name:"Pete Alonso",       value:"226 HR", years:"2019–present" },
      { rank:9,  name:"Lucas Duda",        value:"100 HR", years:"2010–2017" },
      { rank:10, name:"John Olerud",       value:"63 HR",  years:"1997–1999" },
    ]},
  ],
  "Knicks": [
    { title: "All-Time Knicks Scoring Leaders", items: [
      { rank:1,  name:"Patrick Ewing",     value:"23,665 pts", years:"1985–2000" },
      { rank:2,  name:"Walt Frazier",      value:"14,617 pts", years:"1967–1977" },
      { rank:3,  name:"Allan Houston",     value:"9,253 pts",  years:"1996–2005" },
      { rank:4,  name:"Bill Cartwright",   value:"8,674 pts",  years:"1979–1988" },
      { rank:5,  name:"Earl Monroe",       value:"8,710 pts",  years:"1971–1980" },
      { rank:6,  name:"Dick Barnett",      value:"8,378 pts",  years:"1965–1974" },
      { rank:7,  name:"Bernard King",      value:"8,145 pts",  years:"1982–1987, 1987" },
      { rank:8,  name:"Carmelo Anthony",   value:"8,752 pts",  years:"2011–2017" },
      { rank:9,  name:"Charles Oakley",    value:"6,871 pts",  years:"1988–1998" },
      { rank:10, name:"Willis Reed",       value:"12,183 pts", years:"1964–1974" },
    ]},
    { title: "Knicks Championship Seasons", items: [
      { rank:1, name:"1970 Champions", value:"vs Lakers",   years:"Willis Reed's heroic return" },
      { rank:2, name:"1973 Champions", value:"vs Lakers",   years:"Frazier, DeBusschere, Bradley" },
      { rank:3, name:"1994 Finals",    value:"Lost to Rockets", years:"Ewing's closest call" },
      { rank:4, name:"1999 Finals",    value:"Lost to Spurs",   years:"8-seed made the Finals" },
      { rank:5, name:"1971–72",        value:"48 wins",         years:"Back-to-back dynasty" },
      { rank:6, name:"2024–25",        value:"Best in decades", years:"Thibodeau era peaks" },
      { rank:7, name:"1968–69",        value:"Division title",  years:"Pre-championship rise" },
      { rank:8, name:"2012–13",        value:"54 wins",         years:"Melo's best season" },
      { rank:9, name:"1988–89",        value:"52 wins",         years:"Ewing prime begins" },
      { rank:10,name:"1995–96",        value:"47 wins",         years:"Riley's last season" },
    ]},
  ],
  "Islanders": [
    { title: "4 Consecutive Stanley Cup Championships", items: [
      { rank:1,  name:"1980 Stanley Cup", value:"vs Flyers",      years:"First Cup — end of Flyers dynasty" },
      { rank:2,  name:"1981 Stanley Cup", value:"vs North Stars", years:"Back-to-back, Butch Goring MVP" },
      { rank:3,  name:"1982 Stanley Cup", value:"vs Canucks",     years:"Three straight, Potvin lifts Cup" },
      { rank:4,  name:"1983 Stanley Cup", value:"vs Oilers",      years:"Four straight — swept Gretzky's Oilers" },
      { rank:5,  name:"1984 Finals",      value:"Lost to Oilers", years:"Bid for 5 straight — Gretzky ends dynasty" },
      { rank:6,  name:"1975 Champions",   value:"vs Flyers",      years:"First championship run begins" },
      { rank:7,  name:"19 Consecutive Playoff Series Wins", value:"1980–84", years:"Most dominant playoff run in NHL history" },
      { rank:8,  name:"Billy Smith Vezina", value:"1982",         years:"Battlin' Billy — warrior in net" },
      { rank:9,  name:"Bossy 50 in 50",   value:"1981",           years:"Matched Rocket Richard's legendary mark" },
      { rank:10, name:"2002 Playoffs",    value:"Upset Devils",   years:"Parise OT goal — Nassau goes crazy" },
    ]},
    { title: "All-Time Islanders Points Leaders", items: [
      { rank:1,  name:"Bryan Trottier",   value:"1,353 pts", years:"1975–1990 · 4x Cup champion" },
      { rank:2,  name:"Mike Bossy",       value:"1,126 pts", years:"1977–1987 · 9 straight 50-goal seasons" },
      { rank:3,  name:"Denis Potvin",     value:"1,052 pts", years:"1973–1988 · 3x Norris Trophy" },
      { rank:4,  name:"Clark Gillies",    value:"872 pts",   years:"1974–1986 · Enforcer of the dynasty" },
      { rank:5,  name:"Bob Nystrom",      value:"672 pts",   years:"1972–1986 · OT Cup winner 1980" },
      { rank:6,  name:"Brent Sutter",     value:"822 pts",   years:"1980–1991 · Heart of the dynasty" },
      { rank:7,  name:"Pat LaFontaine",   value:"560 pts",   years:"1983–1991 · Fog Game hero" },
      { rank:8,  name:"Billy Smith",      value:"Goalie",    years:"1972–1989 · Conn Smythe 1983" },
      { rank:9,  name:"John Tonelli",     value:"627 pts",   years:"1978–1986 · Underrated dynasty glue" },
      { rank:10, name:"Mathew Barzal",    value:"Active",    years:"2017–present · Modern era star" },
    ]},
    { title: "Top 10 Islanders Moments", items: [
      { rank:1,  name:"Bob Nystrom OT Winner", value:"1980",   years:"Cup win vs Flyers — franchise forever changed" },
      { rank:2,  name:"Bossy's 50 in 50",      value:"1981",   years:"Matched Rocket Richard on final night" },
      { rank:3,  name:"4th Straight Cup",       value:"1983",   years:"Swept Gretzky's Oilers — peak of dynasty" },
      { rank:4,  name:"The Fog Game",           value:"1987",   years:"LaFontaine OT winner in the fog vs Capitals" },
      { rank:5,  name:"19 Straight Playoff Series", value:"1980–84", years:"Most dominant playoff run in NHL history" },
      { rank:6,  name:"Denis Potvin — HOF",    value:"1991",   years:"Greatest defensive career in team history" },
      { rank:7,  name:"Parise OT — 2002",      value:"2002",   years:"10th man, 5 seconds left — Nassau explodes" },
      { rank:8,  name:"Trottier 50-Goal Season", value:"1978", years:"Center of the greatest dynasty" },
      { rank:9,  name:"Fisherman Controversy", value:"1995",   years:"New logo causes fan revolt — classic NY" },
      { rank:10, name:"John Tavares Era",       value:"2009–18", years:"Franchise hope reborn — before the heartbreak" },
    ]},
  ],
  "Rangers": [
    { title: "All-Time Rangers Points Leaders", items: [
      { rank:1,  name:"Rod Gilbert",      value:"1,021 pts", years:"1960–1978" },
      { rank:2,  name:"Brian Leetch",     value:"1,028 pts", years:"1987–2004" },
      { rank:3,  name:"Jean Ratelle",     value:"817 pts",   years:"1960–1975" },
      { rank:4,  name:"Andy Bathgate",    value:"729 pts",   years:"1952–1964" },
      { rank:5,  name:"Mark Messier",     value:"851 pts",   years:"1991–1997, 2000–04" },
      { rank:6,  name:"Ron Duguay",       value:"432 pts",   years:"1977–1983" },
      { rank:7,  name:"Adam Graves",      value:"614 pts",   years:"1991–2001" },
      { rank:8,  name:"Vic Hadfield",     value:"571 pts",   years:"1961–1974" },
      { rank:9,  name:"Mike Gartner",     value:"469 pts",   years:"1990–1994" },
      { rank:10, name:"Henrik Lundqvist", value:"459 GS",    years:"2005–2021" },
    ]},
    { title: "Rangers Stanley Cup Championships", items: [
      { rank:1, name:"1928", value:"vs Maroons",    years:"First Cup — Lester Patrick era" },
      { rank:2, name:"1933", value:"vs Leafs",      years:"Bill Cook's heroics" },
      { rank:3, name:"1940", value:"vs Leafs",      years:"Last Cup for 54 years" },
      { rank:4, name:"1994", value:"vs Canucks",    years:"Messier's guarantee, curse broken" },
      { rank:5, name:"1928–33", value:"Dynasty",    years:"Two Cups in six years" },
      { rank:6, name:"1979 Finals", value:"Lost to Canadiens", years:"Heartbreak on ice" },
      { rank:7, name:"2014 Finals", value:"Lost to Kings",     years:"Henrik era peaks" },
      { rank:8, name:"1972 Finals", value:"Lost to Bruins",    years:"GAG Line era" },
      { rank:9, name:"1950 Finals", value:"Lost to Wings",     years:"So close in OT" },
      { rank:10,name:"2022 Conference Finals", value:"Lost to Lightning", years:"New core rises" },
    ]},
  ],
  "Jets & Giants": [
    { title: "Top 10 Jets Moments", items: [
      { rank:1,  name:"Super Bowl III Win",        value:"1969",  years:"Namath's guarantee, 16–7 vs Colts" },
      { rank:2,  name:"The Guarantee",             value:"Jan 1969", years:"Namath: 'I guarantee it'" },
      { rank:3,  name:"Mud Bowl",                  value:"1982",  years:"Freeman McNeil, 44–17 vs Raiders" },
      { rank:4,  name:"Gastineau's 22 Sacks",      value:"1984",  years:"Single season sack record" },
      { rank:5,  name:"2010 AFC Championship",     value:"2010",  years:"Sanchez leads Jets to title game" },
      { rank:6,  name:"Don Maynard 1,000 Yards",   value:"1965",  years:"First AFL receiver to do it" },
      { rank:7,  name:"Dennis Byrd Comeback",       value:"1993",  years:"Walked onto field — moving moment" },
      { rank:8,  name:"Keyshawn's Super Bowl",      value:"1996",  years:"#1 pick transforms offense" },
      { rank:9,  name:"Darrelle Revis Island",      value:"2009",  years:"Best CB in football era" },
      { rank:10, name:"Gang Green Defense",         value:"1998",  years:"7 sacks vs Cowboys on MNF" },
    ]},
    { title: "Top 10 Giants Moments", items: [
      { rank:1,  name:"Super Bowl XXI Win",        value:"1987",  years:"LT, Simms, 39–20 vs Broncos" },
      { rank:2,  name:"Super Bowl XXV Win",        value:"1991",  years:"Ottis Anderson MVP, beat Bills" },
      { rank:3,  name:"Super Bowl XLII Win",       value:"2008",  years:"Manning to Tyree — greatest catch" },
      { rank:4,  name:"Super Bowl XLVI Win",       value:"2012",  years:"Repeat vs Patriots" },
      { rank:5,  name:"The Helmet Catch",          value:"Feb 2008", years:"David Tyree, 4th and 1" },
      { rank:6,  name:"LT's 1986 Season",          value:"1986",  years:"22 sacks, Defensive POY" },
      { rank:7,  name:"1958 Championship",         value:"1958",  years:"Greatest game ever played vs Colts" },
      { rank:8,  name:"Bavaro's '86 Season",       value:"1986",  years:"Dragged Cowboys for 30 yards" },
      { rank:9,  name:"Phil Simms SB MVP",         value:"1987",  years:"22/25 completions, 88% accuracy" },
      { rank:10, name:"OBJ's One-Handed Catch",    value:"2014",  years:"vs Cowboys — most viral catch ever" },
    ]},
  ],
  "Greatest NY Moments": [
    { title: "Greatest NY Sports Moments of All Time", items: [
      { rank:1,  name:"1969 Mets World Series",    value:"Mets",    years:"'Miracle Mets' shock the world" },
      { rank:2,  name:"Namath's Guarantee",        value:"Jets",    years:"Super Bowl III — changed the AFL" },
      { rank:3,  name:"1994 Rangers Stanley Cup",  value:"Rangers", years:"54-year curse broken" },
      { rank:4,  name:"The Helmet Catch",          value:"Giants",  years:"18-0 Patriots stunned" },
      { rank:5,  name:"Reggie Jackson — 3 HRs",   value:"Yankees", years:"3 HRs on 3 pitches, 1977 WS" },
      { rank:6,  name:"Willis Reed Walks Out",     value:"Knicks",  years:"1970 Finals Game 7 — pure electricity" },
      { rank:7,  name:"Roger Maris — 61st HR",     value:"Yankees", years:"1961, broke Ruth's record" },
      { rank:8,  name:"Don Larsen's Perfect Game", value:"Yankees", years:"1956 World Series — only one ever" },
      { rank:9,  name:"Ewing's 1994 Finals Run",   value:"Knicks",  years:"8 seed to the Finals" },
      { rank:10, name:"Mark Messier's Hat Trick",  value:"Rangers", years:"Game 6 guarantee vs Devils" },
    ]},
  ],
};

// ─── HISTORY TAB ──────────────────────────────────────────────────────────
function HistoryTab() {
  const [activeGroup, setActiveGroup] = useState("Greatest NY Moments");
  const [activeList, setActiveList]   = useState(0);
  const groups = Object.keys(HISTORY_LISTS);
  const lists  = HISTORY_LISTS[activeGroup] || [];
  const list   = lists[activeList] || lists[0];

  return (
    <div style={styles.histRoot}>
      <div style={styles.stdHeader}>
        <h2 style={styles.stdTitle}>🏆 NY SPORTS HISTORY</h2>
        <p style={styles.stdSub}>ALL-TIME LISTS · GREATEST MOMENTS · LEGENDS</p>
      </div>

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
        <div style={{...styles.filterGroup, flexWrap:"wrap", marginBottom:16}}>
          {lists.map((l, i) => (
            <button key={i} onClick={() => setActiveList(i)}
              style={{...styles.filterBtn, fontSize:9, ...(activeList===i ? styles.filterBtnActive : {})}}>
              {l.title.replace("All-Time ","").replace("Top 10 ","").replace("Greatest ","").slice(0,30)}
            </button>
          ))}
        </div>
      )}

      {/* List display */}
      {list && (
        <div style={styles.histList}>
          <div style={styles.histListHeader}>
            <span style={styles.histListTitle}>{list.title}</span>
            <SearchLinks query={`${list.title} New York sports`} />
          </div>
          {list.items.map((item, i) => (
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
    </div>
  );
}

// ─── STATS TAB ────────────────────────────────────────────────────────────
function StatsTab() {
  const [activeLeague, setActiveLeague] = useState("MLB");

  const STATS_REFERENCE = {
    MLB: {
      color: "#003087", emoji: "⚾",
      desc: "Major League Baseball statistics — batting, pitching, fielding",
      categories: [
        { name:"Batting Average",  abbrev:"AVG",  url:"https://www.baseball-reference.com/leaders/batting_avg_active.shtml",   desc:"Best hitters by AVG" },
        { name:"Home Runs",        abbrev:"HR",   url:"https://www.baseball-reference.com/leaders/HR_active.shtml",            desc:"Power hitters" },
        { name:"RBI",              abbrev:"RBI",  url:"https://www.baseball-reference.com/leaders/RBI_active.shtml",           desc:"Runs batted in" },
        { name:"ERA",              abbrev:"ERA",  url:"https://www.baseball-reference.com/leaders/earned_run_avg_active.shtml",desc:"Best ERA starters" },
        { name:"Strikeouts",       abbrev:"K",    url:"https://www.baseball-reference.com/leaders/SO_p_active.shtml",          desc:"Pitching strikeouts" },
        { name:"Stolen Bases",     abbrev:"SB",   url:"https://www.baseball-reference.com/leaders/SB_active.shtml",            desc:"Speed on the bases" },
        { name:"OPS",              abbrev:"OPS",  url:"https://www.baseball-reference.com/leaders/onbase_plus_slugging_active.shtml", desc:"On-base + slugging" },
        { name:"Wins",             abbrev:"W",    url:"https://www.baseball-reference.com/leaders/W_active.shtml",             desc:"Pitcher wins" },
        { name:"WHIP",             abbrev:"WHIP", url:"https://www.baseball-reference.com/leaders/whip_active.shtml",          desc:"Walks + hits per inning" },
        { name:"Saves",            abbrev:"SV",   url:"https://www.baseball-reference.com/leaders/SV_active.shtml",            desc:"Closer saves" },
      ],
      nySearch: "https://www.baseball-reference.com/teams/NYY/2026.shtml",
      nyTeams: ["Yankees","Mets"],
    },
    NFL: {
      color: "#013369", emoji: "🏈",
      desc: "National Football League statistics — offense, defense, special teams",
      categories: [
        { name:"Passing Yards",    abbrev:"YDS",  url:"https://www.pro-football-reference.com/leaders/pass_yds_single_season.htm", desc:"Top QBs by yards" },
        { name:"Touchdowns",       abbrev:"TD",   url:"https://www.pro-football-reference.com/leaders/pass_td_single_season.htm",  desc:"Passing TDs" },
        { name:"Rushing Yards",    abbrev:"RU",   url:"https://www.pro-football-reference.com/leaders/rush_yds_single_season.htm", desc:"Ground game leaders" },
        { name:"Receiving Yards",  abbrev:"REC",  url:"https://www.pro-football-reference.com/leaders/rec_yds_single_season.htm",  desc:"Top receivers" },
        { name:"Receptions",       abbrev:"REC",  url:"https://www.pro-football-reference.com/leaders/rec_single_season.htm",      desc:"Most catches" },
        { name:"Sacks",            abbrev:"SK",   url:"https://www.pro-football-reference.com/leaders/def_sacks_single_season.htm",desc:"Pass rushers" },
        { name:"Interceptions",    abbrev:"INT",  url:"https://www.pro-football-reference.com/leaders/def_int_single_season.htm",  desc:"Ball hawks" },
        { name:"Passer Rating",    abbrev:"RTG",  url:"https://www.pro-football-reference.com/leaders/pass_rating_single_season.htm", desc:"QB efficiency" },
      ],
      nyTeams: ["Jets","Giants"],
    },
    NBA: {
      color: "#006BB6", emoji: "🏀",
      desc: "National Basketball Association statistics — scoring, rebounds, assists",
      categories: [
        { name:"Points Per Game",  abbrev:"PPG",  url:"https://www.basketball-reference.com/leagues/NBA_2026_per_game.html",    desc:"Scoring leaders" },
        { name:"Rebounds",         abbrev:"RPG",  url:"https://www.basketball-reference.com/leagues/NBA_2026_per_game.html",    desc:"Board men" },
        { name:"Assists",          abbrev:"APG",  url:"https://www.basketball-reference.com/leagues/NBA_2026_per_game.html",    desc:"Playmakers" },
        { name:"Steals",           abbrev:"SPG",  url:"https://www.basketball-reference.com/leagues/NBA_2026_per_game.html",    desc:"Defensive disruptors" },
        { name:"Blocks",           abbrev:"BPG",  url:"https://www.basketball-reference.com/leagues/NBA_2026_per_game.html",    desc:"Shot blockers" },
        { name:"3-Pointers Made",  abbrev:"3PM",  url:"https://www.basketball-reference.com/leagues/NBA_2026_per_game.html",    desc:"Long range shooters" },
        { name:"Field Goal %",     abbrev:"FG%",  url:"https://www.basketball-reference.com/leagues/NBA_2026_per_game.html",    desc:"Efficiency inside" },
        { name:"Win Shares",       abbrev:"WS",   url:"https://www.basketball-reference.com/leagues/NBA_2026_advanced.html",   desc:"Overall impact" },
      ],
      nyTeams: ["Knicks","Nets"],
    },
    NHL: {
      color: "#0038A8", emoji: "🏒",
      desc: "National Hockey League statistics — scoring, goaltending, defense",
      categories: [
        { name:"Points",           abbrev:"PTS",  url:"https://www.hockey-reference.com/leagues/NHL_2026_skaters.html",         desc:"Goals + assists" },
        { name:"Goals",            abbrev:"G",    url:"https://www.hockey-reference.com/leagues/NHL_2026_skaters.html",         desc:"Goal scorers" },
        { name:"Assists",          abbrev:"A",    url:"https://www.hockey-reference.com/leagues/NHL_2026_skaters.html",         desc:"Primary playmakers" },
        { name:"Plus/Minus",       abbrev:"+/-",  url:"https://www.hockey-reference.com/leagues/NHL_2026_skaters.html",         desc:"Defensive impact" },
        { name:"GAA",              abbrev:"GAA",  url:"https://www.hockey-reference.com/leagues/NHL_2026_goalies.html",         desc:"Goalie avg against" },
        { name:"Save %",           abbrev:"SV%",  url:"https://www.hockey-reference.com/leagues/NHL_2026_goalies.html",         desc:"Goalie efficiency" },
        { name:"Penalty Minutes",  abbrev:"PIM",  url:"https://www.hockey-reference.com/leagues/NHL_2026_skaters.html",         desc:"Tough guys" },
        { name:"Power Play Goals", abbrev:"PPG",  url:"https://www.hockey-reference.com/leagues/NHL_2026_skaters.html",         desc:"PP specialists" },
      ],
      nyTeams: ["Rangers","Islanders","NJ Devils"],
    },
    WNBA: {
      color: "#FF6B35", emoji: "🏀",
      desc: "Women's National Basketball Association — NY Liberty are defending champs!",
      categories: [
        { name:"Points Per Game",  abbrev:"PPG",  url:"https://www.basketball-reference.com/wnba/leagues/WNBA_2026_per_game.html", desc:"Scoring leaders" },
        { name:"Rebounds",         abbrev:"RPG",  url:"https://www.basketball-reference.com/wnba/leagues/WNBA_2026_per_game.html", desc:"Board women" },
        { name:"Assists",          abbrev:"APG",  url:"https://www.basketball-reference.com/wnba/leagues/WNBA_2026_per_game.html", desc:"Playmakers" },
        { name:"Field Goal %",     abbrev:"FG%",  url:"https://www.basketball-reference.com/wnba/leagues/WNBA_2026_per_game.html", desc:"Efficiency" },
        { name:"3-Pointers",       abbrev:"3PM",  url:"https://www.basketball-reference.com/wnba/leagues/WNBA_2026_per_game.html", desc:"Long range" },
        { name:"Win Shares",       abbrev:"WS",   url:"https://www.basketball-reference.com/wnba/leagues/WNBA_2026_advanced.html", desc:"Overall impact" },
      ],
      nyTeams: ["NY Liberty"],
    },
    MLS: {
      color: "#1a1a2e", emoji: "⚽",
      desc: "Major League Soccer and NWSL statistics",
      categories: [
        { name:"Goals",            abbrev:"G",    url:"https://fbref.com/en/comps/22/stats/MLS-Stats",    desc:"Top scorers" },
        { name:"Assists",          abbrev:"A",    url:"https://fbref.com/en/comps/22/stats/MLS-Stats",    desc:"Playmakers" },
        { name:"xG",               abbrev:"xG",   url:"https://fbref.com/en/comps/22/stats/MLS-Stats",    desc:"Expected goals" },
        { name:"Clean Sheets",     abbrev:"CS",   url:"https://fbref.com/en/comps/22/keepers/MLS-Stats",  desc:"GK clean sheets" },
        { name:"NWSL Goals",       abbrev:"G",    url:"https://fbref.com/en/comps/182/stats/NWSL-Stats",  desc:"NWSL top scorers" },
        { name:"NWSL Assists",     abbrev:"A",    url:"https://fbref.com/en/comps/182/stats/NWSL-Stats",  desc:"NWSL playmakers" },
      ],
      nyTeams: ["NYCFC","NJ Red Bulls","Gotham FC"],
    },
  };

  const leagues = Object.keys(STATS_REFERENCE);
  const active  = STATS_REFERENCE[activeLeague];
  const year    = new Date().getFullYear();

  return (
    <div style={styles.statsRoot}>
      <div style={styles.stdHeader}>
        <h2 style={styles.stdTitle}>STATS REFERENCE</h2>
        <p style={styles.stdSub}>KEY CATEGORIES · CLICK ANY STAT FOR FULL LEAGUE LEADERS</p>
      </div>

      {/* League selector */}
      <div style={{...styles.filterGroup, flexWrap:"wrap", marginBottom:20}}>
        {leagues.map(l => (
          <button key={l} onClick={() => setActiveLeague(l)}
            style={{...styles.filterBtn, ...(activeLeague===l ? styles.filterBtnActive : {})}}>
            {STATS_REFERENCE[l].emoji} {l}
          </button>
        ))}
      </div>

      {/* League header */}
      <div style={{...styles.statsLeagueHeader, borderLeft:`4px solid ${active.color}`}}>
        <div>
          <span style={styles.statsLeagueTitle}>{activeLeague}</span>
          <p style={styles.statsLeagueDesc}>{active.desc}</p>
          {active.nyTeams && (
            <p style={styles.statsNYTeams}>
              🗽 NY TEAMS: {active.nyTeams.join(" · ")}
            </p>
          )}
        </div>
      </div>

      {/* Stat category cards */}
      <div style={styles.statsRefGrid}>
        {active.categories.map((cat, i) => (
          <a key={i} href={cat.url} target="_blank" rel="noopener noreferrer"
            style={styles.statsRefCard}>
            <div style={{...styles.statsRefAbbrev, background: active.color}}>{cat.abbrev}</div>
            <div style={styles.statsRefBody}>
              <span style={styles.statsRefName}>{cat.name}</span>
              <span style={styles.statsRefDesc}>{cat.desc}</span>
            </div>
            <span style={styles.statsRefArrow}>→</span>
          </a>
        ))}
      </div>

      {/* NY Teams quick search */}
      <div style={styles.statsNYSection}>
        <div style={styles.statsNYHeader}>🗽 SEARCH NY PLAYERS</div>
        <div style={styles.statsNYCards}>
          {active.nyTeams?.map((team, i) => (
            <a key={i}
              href={`https://www.google.com/search?q=${encodeURIComponent(`${team} ${year} stats roster`)}`}
              target="_blank" rel="noopener noreferrer"
              style={styles.statsNYCard}>
              {team} STATS →
            </a>
          ))}
          <a href={`https://www.google.com/search?q=${encodeURIComponent(`${activeLeague} leaders stats ${year}`)}`}
            target="_blank" rel="noopener noreferrer"
            style={{...styles.statsNYCard, background:"#c8201c", color:"#fff"}}>
            {activeLeague} ALL LEADERS →
          </a>
        </div>
      </div>
    </div>
  );
}

// ─── STANDINGS COMPONENT ──────────────────────────────────────────────────
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
  { label: "NJ DEVILS",    color: "#CE1126", emoji: "🏒" },
  { label: "NJ RED BULLS", color: "#ED1C2E", emoji: "⚽" },
  { label: "GOTHAM FC",    color: "#0A0A2E", emoji: "⚽" },
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
      const teamKey = team.replace("NJ ","").replace(" FC","").toUpperCase();
      const row = await sbRandom("ny_spin_facts", `team=eq.${encodeURIComponent(teamKey)}&`);
      if (row) {
        setFact(row);
      } else {
        const fallback = await sbRandom("ny_spin_facts");
        setFact(fallback || { fact: "Spin again for a great NY sports fact!", teaser: "Try again!", category: "weird", era: "" });
      }
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
                <span style={styles.spinTeamName}>NEW YORK {result.label}</span>
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

      {/* ── ON THIS DATE ── */}
      <section style={styles.triviaSection}>
        <div style={styles.triviaSectionHeader}>
          <span style={styles.triviaSectionIcon}>📅</span>
          <div>
            <h2 style={styles.triviaSectionTitle}>ON THIS DATE IN NY SPORTS</h2>
            <p style={styles.triviaSectionSub}>{dateStr.toUpperCase()} · NY SPORTS HISTORY</p>
          </div>
          <button onClick={() => setThisDate(STATIC_MOMENTS)} style={styles.refreshBtn}>
            ↺
          </button>
        </div>

        {loadingDate ? (
          <div style={{padding:"12px 0"}}>
            <div style={styles.loadingDots}>
              {[0,1,2].map(i=><span key={i} style={{...styles.dot,animationDelay:`${i*0.2}s`}}/>)}
            </div>
          </div>
        ) : !thisDate || thisDate.length === 0 ? (
          <div style={{padding:"10px 0", fontSize:11, color:"#555"}}>
            No moments recorded for today — more added regularly!
          </div>
        ) : (
          <div style={styles.momentsList}>
            {thisDate.map((m, i) => (
              <div key={i} style={{...styles.momentCard, animationDelay: `${i * 0.15}s`}}>
                <div style={styles.momentYear}>{m.year}</div>
                <div style={styles.momentBody}>
                  <div style={styles.momentMeta}>
                    <span style={styles.momentTeam}>{m.team}</span>
                    <span style={styles.momentSport}>{SPORT_ICONS[m.sport] || "🏆"} {m.sport}</span>
                  </div>
                  <p style={styles.momentHeadline}>{m.headline}</p>
                  <p style={styles.momentDetail}>{m.detail}</p>
                  <SearchLinks query={`${m.team} ${m.headline} ${m.year}`} />
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ── DIVIDER ── */}
      <div style={styles.triviaDivider}>
        <div style={styles.triviaDividerLine} />
        <span style={styles.triviaDividerText}>◆ TEST YOUR KNOWLEDGE ◆</span>
        <div style={styles.triviaDividerLine} />
      </div>

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
    const lines = [];
    lines.push(puzzle.title);
    lines.push(puzzle.date);
    lines.push("");
    lines.push("ACROSS");
    puzzle.across.forEach(c => lines.push(`${c.number}. ${c.clue}`));
    lines.push("");
    lines.push("DOWN");
    puzzle.down.forEach(c => lines.push(`${c.number}. ${c.clue}`));
    lines.push("");
    lines.push("--- GRID (for printing) ---");
    puzzle.solution.forEach(row => {
      lines.push(row.map(c => c === "." ? "■" : "□").join(" "));
    });
    const blob = new Blob([lines.join("\n")], { type: "text/plain" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href     = url;
    a.download = "NYSportsDaily-Crossword.txt";
    a.click();
    URL.revokeObjectURL(url);
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
          <button onClick={handleDownload} style={{...styles.xwBtn, color:"#888"}}>⬇ PRINT</button>
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
    animation: "ticker 70s linear infinite",
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
    color: "#c8201c", borderBottom: "3px solid #c8201c",
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
    from { opacity: 0; transform: translateY(8px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  ::-webkit-scrollbar { height: 4px; background: #1a1a1a; }
  ::-webkit-scrollbar-thumb { background: #c8201c; }
`;
document.head.appendChild(styleTag);

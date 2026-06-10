// api/send-digest.js
// Vercel Cron: runs daily at 12:00 UTC = 8am ET

export const config = { maxDuration: 60 };

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;
const RESEND_KEY   = process.env.RESEND_API_KEY;
const SITE_URL     = 'https://nysportsdaily.com';

// ── NY team name matching ─────────────────────────────────────────────────────
const NY_FULL = [
  'new york yankees','new york mets','new york jets','new york giants',
  'new york knicks','brooklyn nets','new york rangers','new york islanders',
  'new jersey devils','new york liberty','new york city fc','new york red bulls',
  'nj/ny gotham',
];
function isNYTeam(name) {
  return NY_FULL.some(ny => (name||'').toLowerCase().includes(ny));
}

// ── Stadium coordinates for weather ──────────────────────────────────────────
const STADIUM_COORDS = {
  // ── NY HOME STADIUMS ──
  'yankee stadium':        { lat:40.8296, lon:-73.9262, name:'Yankee Stadium' },
  'citi field':            { lat:40.7571, lon:-73.8458, name:'Citi Field' },
  'metlife stadium':       { lat:40.8135, lon:-74.0745, name:'MetLife Stadium' },
  'red bull arena':        { lat:40.7369, lon:-74.1502, name:'Red Bull Arena' },
  // ── NY INDOOR (no weather) ──
  'madison square garden': { lat:40.7505, lon:-73.9934, name:'MSG', indoor:true },
  'ubs arena':             { lat:40.7227, lon:-73.5933, name:'UBS Arena', indoor:true },
  'prudential center':     { lat:40.7334, lon:-74.1713, name:'Prudential Center', indoor:true },
  'barclays center':       { lat:40.6828, lon:-73.9752, name:'Barclays Center', indoor:true },
  // ── MLB AWAY STADIUMS ──
  'progressive field':     { lat:41.4962, lon:-81.6852, name:'Progressive Field' },
  'fenway park':           { lat:42.3467, lon:-71.0972, name:'Fenway Park' },
  'camden yards':          { lat:39.2838, lon:-76.6218, name:'Camden Yards' },
  'tropicana field':       { lat:27.7682, lon:-82.6534, name:'Tropicana Field' },
  'rogers centre':         { lat:43.6414, lon:-79.3894, name:'Rogers Centre' },
  'great american ball park':{ lat:39.0979, lon:-84.5082, name:'Great American Ball Park' },
  'guaranteed rate field': { lat:41.8300, lon:-87.6338, name:'Guaranteed Rate Field' },
  'wrigley field':         { lat:41.9484, lon:-87.6553, name:'Wrigley Field' },
  'comerica park':         { lat:42.3390, lon:-83.0485, name:'Comerica Park' },
  'kauffman stadium':      { lat:39.0517, lon:-94.4803, name:'Kauffman Stadium' },
  'target field':          { lat:44.9817, lon:-93.2781, name:'Target Field' },
  'minute maid park':      { lat:29.7573, lon:-95.3555, name:'Minute Maid Park' },
  'globe life field':      { lat:32.7473, lon:-97.0845, name:'Globe Life Field' },
  'angel stadium':         { lat:33.8003, lon:-117.8827, name:'Angel Stadium' },
  'dodger stadium':        { lat:34.0739, lon:-118.2400, name:'Dodger Stadium' },
  'petco park':            { lat:32.7076, lon:-117.1570, name:'Petco Park' },
  'oracle park':           { lat:37.7786, lon:-122.3893, name:'Oracle Park' },
  'chase field':           { lat:33.4453, lon:-112.0667, name:'Chase Field' },
  't-mobile park':         { lat:47.5914, lon:-122.3325, name:'T-Mobile Park' },
  'american family field': { lat:43.0280, lon:-87.9712, name:'American Family Field' },
  'busch stadium':         { lat:38.6226, lon:-90.1928, name:'Busch Stadium' },
  'pnc park':              { lat:40.4469, lon:-80.0057, name:'PNC Park' },
  'great american':        { lat:39.0979, lon:-84.5082, name:'Great American Ball Park' },
  'nationals park':        { lat:38.8730, lon:-77.0074, name:'Nationals Park' },
  'truist park':           { lat:33.8907, lon:-84.4677, name:'Truist Park' },
  'loanDepot park':        { lat:25.7781, lon:-80.2197, name:'loanDepot Park' },
  'loandepot park':        { lat:25.7781, lon:-80.2197, name:'loanDepot Park' },
  'coors field':           { lat:39.7559, lon:-104.9942, name:'Coors Field' },
  'oakland coliseum':      { lat:37.7516, lon:-122.2005, name:'Oakland Coliseum' },
  // ── NFL AWAY ──
  'acrisure stadium':      { lat:40.4468, lon:-80.0158, name:'Acrisure Stadium' },
  'sofi stadium':          { lat:33.9535, lon:-118.3392, name:'SoFi Stadium' },
  'gillette stadium':      { lat:42.0909, lon:-71.2643, name:'Gillette Stadium' },
  "lincoln financial field":{ lat:39.9008, lon:-75.1675, name:'Lincoln Financial Field' },
  'm&t bank stadium':      { lat:39.2780, lon:-76.6227, name:'M&T Bank Stadium' },
};

// ── Weather code → description ────────────────────────────────────────────────
function weatherDesc(code) {
  if (code === 0)              return 'Clear skies ☀️';
  if (code <= 2)               return 'Partly cloudy ⛅';
  if (code === 3)              return 'Overcast ☁️';
  if (code <= 49)              return 'Foggy 🌫️';
  if (code <= 59)              return 'Drizzle 🌦️';
  if (code <= 69)              return 'Rainy 🌧️';
  if (code <= 79)              return 'Snow possible 🌨️';
  if (code <= 82)              return 'Showers 🌧️';
  if (code <= 84)              return 'Sleet 🌨️';
  if (code <= 94)              return 'Thunderstorm possible ⛈️';
  return 'Stormy ⛈️';
}

function weatherVibes(code, temp) {
  if (code <= 2 && temp >= 65 && temp <= 85) return '🌟 Perfect baseball weather';
  if (code <= 2 && temp >= 85)               return '☀️ Hot one tonight';
  if (code <= 2 && temp < 55)                return '🧥 Dress warm';
  if (code >= 60 && code <= 69)              return '☔ Rain possible — check before heading out';
  if (code >= 80)                            return '⛈️ Severe weather — confirm the game is on';
  if (code <= 3 && temp >= 55 && temp <= 75) return '👌 Great night at the ballpark';
  return '';
}

async function getWeather(lat, lon) {
  try {
    const r = await fetch(
      'https://api.open-meteo.com/v1/forecast'
      + '?latitude=' + lat
      + '&longitude=' + lon
      + '&current=temperature_2m,weathercode,windspeed_10m'
      + '&temperature_unit=fahrenheit'
      + '&windspeed_unit=mph'
      + '&timezone=America/New_York'
    );
    if (!r.ok) return null;
    const json = await r.json();
    const c = json.current;
    return {
      temp:  Math.round(c.temperature_2m),
      code:  c.weathercode,
      wind:  Math.round(c.windspeed_10m),
      desc:  weatherDesc(c.weathercode),
      vibes: weatherVibes(c.weathercode, Math.round(c.temperature_2m)),
    };
  } catch(e) { return null; }
}

// ── Subscribers ───────────────────────────────────────────────────────────────
async function getSubscribers() {
  const r = await fetch(
    SUPABASE_URL + '/rest/v1/ny_subscribers?active=eq.true&confirmed=eq.true&select=*',
    { headers: { 'apikey': SUPABASE_KEY, 'Authorization': 'Bearer ' + SUPABASE_KEY } }
  );
  if (!r.ok) throw new Error('Could not fetch subscribers');
  return r.json();
}

// ── Yesterday's scores ────────────────────────────────────────────────────────
async function getYesterdayScores(teams) {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const y = yesterday.getFullYear();
  const m = String(yesterday.getMonth()+1).padStart(2,'0');
  const d = String(yesterday.getDate()).padStart(2,'0');
  const dateStr = y + m + d;

  const CONFIGS = [
    { sport:'baseball',   league:'mlb',  label:'MLB',  emoji:'⚾' },
    { sport:'basketball', league:'nba',  label:'NBA',  emoji:'🏀' },
    { sport:'hockey',     league:'nhl',  label:'NHL',  emoji:'🏒' },
    { sport:'football',   league:'nfl',  label:'NFL',  emoji:'🏈' },
    { sport:'basketball', league:'wnba', label:'WNBA', emoji:'🏀' },
  ];

  const allGames = [];
  await Promise.all(CONFIGS.map(async cfg => {
    try {
      const r = await fetch(
        'https://site.api.espn.com/apis/site/v2/sports/' + cfg.sport + '/' + cfg.league
        + '/scoreboard?dates=' + dateStr
      );
      if (!r.ok) return;
      const json = await r.json();
      (json.events||[]).forEach(ev => {
        const comp = ev.competitions && ev.competitions[0];
        if (!comp || !comp.status?.type?.completed) return;
        const home = (comp.competitors||[]).find(c => c.homeAway === 'home');
        const away = (comp.competitors||[]).find(c => c.homeAway === 'away');
        if (!home || !away) return;
        const homeFull = (home.team?.displayName||'').toLowerCase();
        const awayFull = (away.team?.displayName||'').toLowerCase();
        if (!isNYTeam(homeFull) && !isNYTeam(awayFull)) return;
        const homeScore = parseInt(home.score||0);
        const awayScore = parseInt(away.score||0);
        allGames.push({
          sport:     cfg.label,
          emoji:     cfg.emoji,
          homeName:  home.team?.shortDisplayName || home.team?.name || '',
          homeScore,
          awayName:  away.team?.shortDisplayName || away.team?.name || '',
          awayScore,
          homeWin:   homeScore > awayScore,
          awayWin:   awayScore > homeScore,
          homeLines: (home.linescores||[]).map(l => l.value),
          awayLines: (away.linescores||[]).map(l => l.value),
          boxUrl:    'https://www.espn.com/' + cfg.league + '/recap/_/gameId/' + ev.id,
        });
      });
    } catch(e) { console.error('Scores error:', e); }
  }));

  if (!teams || teams.length === 0) return allGames;
  return allGames.filter(g =>
    teams.some(t =>
      (g.homeName||'').toLowerCase().includes(t.toLowerCase()) ||
      (g.awayName||'').toLowerCase().includes(t.toLowerCase())
    )
  );
}

// ── Today's games ─────────────────────────────────────────────────────────────
async function getTodaysGames(teams) {
  const today = new Date();
  const y = today.getFullYear();
  const m = String(today.getMonth()+1).padStart(2,'0');
  const d = String(today.getDate()).padStart(2,'0');
  const dateStr = y + m + d;

  const CONFIGS = [
    { sport:'baseball',   league:'mlb',  label:'MLB',  emoji:'⚾' },
    { sport:'basketball', league:'nba',  label:'NBA',  emoji:'🏀' },
    { sport:'hockey',     league:'nhl',  label:'NHL',  emoji:'🏒' },
    { sport:'football',   league:'nfl',  label:'NFL',  emoji:'🏈' },
    { sport:'basketball', league:'wnba', label:'WNBA', emoji:'🏀' },
    { sport:'soccer',     league:'usa.1',label:'MLS',  emoji:'⚽' },
  ];

  const allGames = [];
  await Promise.all(CONFIGS.map(async cfg => {
    try {
      const r = await fetch(
        'https://site.api.espn.com/apis/site/v2/sports/' + cfg.sport + '/' + cfg.league
        + '/scoreboard?dates=' + dateStr
      );
      if (!r.ok) return;
      const json = await r.json();
      (json.events||[]).forEach(ev => {
        const comp = ev.competitions && ev.competitions[0];
        if (!comp) return;
        // Skip completed games
        if (comp.status?.type?.completed) return;
        const home = (comp.competitors||[]).find(c => c.homeAway === 'home');
        const away = (comp.competitors||[]).find(c => c.homeAway === 'away');
        if (!home || !away) return;
        const homeFull = (home.team?.displayName||'').toLowerCase();
        const awayFull = (away.team?.displayName||'').toLowerCase();
        if (!isNYTeam(homeFull) && !isNYTeam(awayFull)) return;

        // Parse game time to ET
        const gameDate = new Date(ev.date);
        const timeStr  = gameDate.toLocaleTimeString('en-US', {
          hour:'numeric', minute:'2-digit',
          timeZone:'America/New_York',
        }) + ' ET';

        // Broadcast info — ESPN API + regional network mapping
        const broadcasts = (comp.broadcasts||[]).flatMap(b => b.names||[]);
        // Add regional networks based on home team
        const homeTeamName = (home.team?.displayName||'').toLowerCase();
        const awayTeamName = (away.team?.displayName||'').toLowerCase();
        const REGIONAL_TV = {
          'new york yankees':  'YES',
          'new york mets':     'SNY',
          'new york knicks':   'MSG',
          'new york rangers':  'MSG',
          'new york islanders':'MSG+',
          'new jersey devils': 'MSGSN',
          'new york giants':   'WJLP',
          'new york jets':     'WJLP',
          'new york liberty':  'ION',
          'brooklyn nets':     'YES Network',
        };
        // Exclusive streaming deals block local RSN — don't add YES/SNY if exclusive
        const EXCLUSIVE_STREAMERS = ['apple tv', 'amazon', 'peacock', 'paramount+', 'netflix'];
        const hasExclusive = broadcasts.some(b =>
          EXCLUSIVE_STREAMERS.some(s => b.toLowerCase().includes(s))
        );
        const regionalNet = (!hasExclusive && (REGIONAL_TV[homeTeamName] || REGIONAL_TV[awayTeamName])) || '';
        const allBroadcasts = regionalNet
          ? [regionalNet, ...broadcasts].slice(0,3)
          : broadcasts.slice(0,3);
        // Filter out duplicates and clean up
        const seen = new Set();
        const uniqueBroadcasts = allBroadcasts.filter(b => {
          const key = b.toLowerCase();
          if (seen.has(key)) return false;
          seen.add(key); return true;
        });
        const tvStr = uniqueBroadcasts.join(' / ') || '';

        // Venue
        const venueName  = comp.venue?.fullName || '';
        const venueKey   = venueName.toLowerCase();
        const stadiumInfo = Object.entries(STADIUM_COORDS).find(([k]) => venueKey.includes(k));
        const stadium    = stadiumInfo ? stadiumInfo[1] : null;

        // Series context (NBA/NHL playoffs)
        const seriesNote = ev.competitions?.[0]?.series?.summary || '';

        allGames.push({
          sport:      cfg.label,
          emoji:      cfg.emoji,
          homeName:   home.team?.shortDisplayName || home.team?.name || '',
          awayName:   away.team?.shortDisplayName || away.team?.name || '',
          homeFull:   home.team?.displayName || '',
          awayFull:   away.team?.displayName || '',
          time:       timeStr,
          venue:      venueName,
          tv:         tvStr,
          seriesNote,
          stadium,           // coords for weather fetch
          weather:    null,  // filled in below
        });
      });
    } catch(e) { console.error('Games error:', e); }
  }));

  // Fetch weather for outdoor stadiums
  await Promise.all(allGames.map(async g => {
    if (g.stadium && !g.stadium.indoor) {
      g.weather = await getWeather(g.stadium.lat, g.stadium.lon);
    }
  }));

  // Sort by time, filter to subscriber's teams if set
  const sorted = allGames.sort((a,b) => a.time.localeCompare(b.time));
  if (!teams || teams.length === 0) return sorted;
  return sorted.filter(g =>
    teams.some(t =>
      (g.homeName||'').toLowerCase().includes(t.toLowerCase()) ||
      (g.awayName||'').toLowerCase().includes(t.toLowerCase()) ||
      (g.homeFull||'').toLowerCase().includes(t.toLowerCase()) ||
      (g.awayFull||'').toLowerCase().includes(t.toLowerCase())
    )
  );
}

// ── Headlines ─────────────────────────────────────────────────────────────────
// ── Quality filter helpers ────────────────────────────────────────────────────
const TRUSTED_SOURCES = [
  'espn','athletic','new york post','daily news','newsday',
  'mlb.com','nba.com','nhl.com','nfl.com','nfl network',
  'sports illustrated','bleacher report','new york times','nytimes',
  'ap ','associated press','reuters','cbs sports','nbc sports',
  'yahoo sports','usa today','sny','yes network','amny','amnewyork',
  'gothamist','northjersey','fox sports',
];
const JUNK_KEYWORDS = [
  'odds','betting','bet ','parlay','picks','fantasy','dfs',
  'draftkings','fanduel','prop bet','wager','best bets',
  'lineup','waiver wire','trade value','rotowire','covers.com',
];

function isQualityStory(title, source) {
  const t = (title||'').toLowerCase();
  const s = (source||'').toLowerCase();
  // Reject junk keywords in title
  if (JUNK_KEYWORDS.some(k => t.includes(k))) return false;
  // Accept if from trusted source
  if (TRUSTED_SOURCES.some(ts => s.includes(ts))) return true;
  // If source unknown but title looks legit, include it
  return true;
}

function parseRssItems(xml, team, source) {
  const items = xml.match(/<item>([\s\S]*?)<\/item>/g) || [];
  const results = [];
  items.forEach(item => {
    const titleMatch = item.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/) ||
                       item.match(/<title>(.*?)<\/title>/);
    const linkMatch  = item.match(/<link>(.*?)<\/link>/);
    const srcMatch   = item.match(/<source[^>]*>(.*?)<\/source>/);
    const title  = titleMatch ? titleMatch[1].replace(/&amp;/g,'&').replace(/&#39;/g,"'").replace(/<[^>]*>/g,'') : '';
    const link   = linkMatch  ? linkMatch[1]  : SITE_URL;
    const src    = source || (srcMatch ? srcMatch[1] : '');
    if (title && !title.includes('Google News') && isQualityStory(title, src)) {
      results.push({ team, title, link, source: src });
    }
  });
  return results;
}

async function getTeamHeadlines(teams) {
  const headlines = [];
  const toFetch = (teams && teams.length > 0) ? teams : ['Yankees','Mets','Knicks'];

  // Direct RSS feeds for quality NY sports coverage
  // Note: amNY blocks direct RSS fetches (403) — surfaced via Google News instead
  const DIRECT_FEEDS = [
    { url:'https://nypost.com/sports/feed/',   source:'New York Post' },
    { url:'https://sny.tv/rss/articles',       source:'SNY' },
  ];

  // Fetch direct feeds in parallel — grab all stories then match to teams
  const directStories = [];
  await Promise.all(DIRECT_FEEDS.map(async feed => {
    try {
      const r = await fetch(feed.url);
      if (!r.ok) return;
      const xml = await r.text();
      // Match stories to subscriber's teams
      toFetch.forEach(team => {
        const teamLower = team.toLowerCase();
        const items = xml.match(/<item>([\s\S]*?)<\/item>/g) || [];
        items.forEach(item => {
          const titleMatch = item.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/) ||
                             item.match(/<title>(.*?)<\/title>/);
          const linkMatch  = item.match(/<link>(.*?)<\/link>/);
          const title = titleMatch ? titleMatch[1].replace(/&amp;/g,'&').replace(/&#39;/g,"'").replace(/<[^>]*>/g,'') : '';
          const link  = linkMatch  ? linkMatch[1] : SITE_URL;
          if (title && title.toLowerCase().includes(teamLower) && isQualityStory(title, feed.source)) {
            directStories.push({ team, title, link, source: feed.source });
          }
        });
      });
    } catch(e) { console.error('Direct feed error:', feed.source, e); }
  }));

  // Google News for each team (fallback + supplement)
  await Promise.all(toFetch.map(async team => {
    try {
      const query = encodeURIComponent('New York ' + team + ' sports');
      const r = await fetch(
        'https://news.google.com/rss/search?q=' + query + '&hl=en-US&gl=US&ceid=US:en'
      );
      if (!r.ok) return;
      const xml = await r.text();
      const parsed = parseRssItems(xml, team, '');
      parsed.slice(0,2).forEach(s => headlines.push(s));
    } catch(e) { console.error('Headlines error:', e); }
  }));

  // Merge: direct stories first (higher quality), then Google News
  // Dedupe by title
  const seen = new Set();
  const merged = [...directStories, ...headlines].filter(s => {
    const key = s.title.toLowerCase().slice(0,60);
    if (seen.has(key)) return false;
    seen.add(key); return true;
  });

  // Cap at 2 stories per team
  const byTeam = {};
  merged.forEach(s => {
    if (!byTeam[s.team]) byTeam[s.team] = [];
    if (byTeam[s.team].length < 2) byTeam[s.team].push(s);
  });

  return Object.values(byTeam).flat();
}

// ── On This Date ─────────────────────────────────────────────────────────────
// Full 366-entry array pulled directly from NYSportsDaily.jsx
const ON_THIS_DATE = [
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

function getOnThisDate() {
  const today = new Date();
  const month = today.getMonth() + 1;
  const day   = today.getDate();
  const matches = ON_THIS_DATE.filter(e => e.month === month && e.day === day);
  if (matches.length === 0) return null;
  // Return the most iconic one (last in array = most recent addition = usually best)
  return matches[Math.floor(Math.random() * matches.length)];
}

// ── Glory moments ───────────────────────────────────────────────────────────────
const GLORY_MOMENTS = [
  { year:1927, team:'Yankees',   text:"Murderers' Row — the greatest team ever assembled. Ruth hits his 40th home run of the season." },
  { year:1956, team:'Yankees',   text:'Don Larsen throws the only perfect game in World Series history. Yogi Berra leaps into his arms.' },
  { year:1969, team:'Mets',      text:'Tom Seaver strikes out 10 consecutive Padres. The Miracle Mets were becoming real.' },
  { year:1969, team:'Jets',      text:'Joe Namath guarantees Super Bowl victory as a 17-point underdog. Broadway Joe delivers.' },
  { year:1970, team:'Knicks',    text:'Willis Reed limps onto the MSG court before Game 7. The crowd erupts. The Knicks win.' },
  { year:1973, team:'Knicks',    text:'The Knicks win their second NBA championship. Frazier, Reed, DeBusschere — a perfect team.' },
  { year:1977, team:'Yankees',   text:'Reggie Jackson hits 3 home runs on 3 consecutive pitches in World Series Game 6. Mr. October is born.' },
  { year:1977, team:'NY Cosmos', text:"Pelé, Beckenbauer, and Carlos Alberto on one team. The Cosmos beat Seattle before 77,000 fans at Giants Stadium. Soccer in America would never be the same." },
  { year:1980, team:'Islanders', text:'Bob Nystrom scores in overtime. The Islanders dynasty begins.' },
  { year:1983, team:'Islanders', text:"The Islanders sweep Gretzky's Oilers for their 4th straight Stanley Cup. A dynasty for the ages." },
  { year:1986, team:'Mets',      text:"Mookie Wilson's grounder rolls through Buckner's legs. The Mets are World Champions." },
  { year:1994, team:'Rangers',   text:'Mark Messier guarantees a Rangers win in Game 6 then scores a hat trick. 54 years of waiting ends.' },
  { year:2000, team:'Yankees',   text:'The Subway Series — Yankees vs Mets. Derek Jeter leads off Game 4 with a home run.' },
  { year:2009, team:'Yankees',   text:'Hideki Matsui hits a grand slam in Game 6. The Yankees win their 27th championship.' },
  { year:1958, team:'Giants',    text:'The Giants beat the Colts in overtime — the Greatest Game Ever Played births modern pro football.' },
  { year:2021, team:'NYCFC',     text:'NYCFC win their first MLS Cup on penalty kicks. New York finally had an MLS champion.' },
  { year:2023, team:'Gotham FC', text:'Gotham FC win the NWSL Championship. NJ/NY claims its first major women\'s soccer title.' },
  { year:2024, team:'Liberty',   text:'Breanna Stewart leads the Liberty to their first WNBA championship. 27 years of waiting over.' },
];

// ── Trivia questions ──────────────────────────────────────────────────────────
const TRIVIA_QUESTIONS = [
  { q:'Which New York Ranger was known as "The Captain" and led the team to the 1994 Stanley Cup?', hint:'He also guaranteed a win in Game 6 of the Conference Finals.', a:'Mark Messier' },
  { q:'Who hit three home runs on three consecutive pitches in World Series Game 6 in 1977?', hint:'His nickname was "Mr. October."', a:'Reggie Jackson' },
  { q:'Which Met struck out 10 consecutive batters against the Padres in 1969?', hint:'"Tom Terrific" — he won 3 Cy Young Awards with the Mets.', a:'Tom Seaver' },
  { q:'Joe Namath guaranteed victory before which Super Bowl?', hint:'The Jets were 17-point underdogs against the Baltimore Colts.', a:'Super Bowl III (January 1969)' },
  { q:'Who scored in overtime to give the Islanders their first Stanley Cup in 1980?', hint:'His first name is Bob.', a:'Bob Nystrom' },
  { q:'Which Knick limped onto the MSG court before Game 7 of the 1970 NBA Finals?', hint:'His entrance may be the most dramatic moment in Knicks history.', a:'Willis Reed' },
  { q:'What NY team won 5 NASL championships in the 1970s and 80s with Pelé on the roster?', hint:'They played at Giants Stadium and drew 77,000 fans.', a:'New York Cosmos' },
  { q:'Which Yankee was the first unanimous Hall of Fame inductee in baseball history?', hint:'His nickname was "The Sandman" and he closed to Enter Sandman.', a:'Mariano Rivera' },
  { q:'In what year did the Mets win the World Series as 100-to-1 longshots?', hint:'They were known as "The Miracle Mets."', a:'1969' },
  { q:'Which Islander scored 50+ goals in 9 consecutive seasons and won 4 straight Cups?', hint:'He wore #22 and is considered one of the greatest goal-scorers ever.', a:'Mike Bossy' },
  { q:'How many World Series championships have the Yankees won in total?', hint:'More than any other team in baseball history.', a:'27' },
  { q:'Which Giants linebacker won the NFL MVP award in 1986 — the only defensive player ever?', hint:'His initials are L.T.', a:'Lawrence Taylor' },
];

// ── Email builder ─────────────────────────────────────────────────────────────
function buildEmail(subscriber, scores, todayGames, headlines, glory, trivia, otd) {
  const firstName = subscriber.name ? subscriber.name.split(' ')[0] : 'NY Sports Fan';
  const teams     = (subscriber.teams && subscriber.teams.length > 0)
                    ? subscriber.teams.join(' &nbsp;&middot;&nbsp; ')
                    : 'All NY Teams';
  const today     = new Date().toLocaleDateString('en-US', {
    weekday:'long', month:'long', day:'numeric', year:'numeric'
  });

  // ── SCORES ──────────────────────────────────────────────────────────────────
  const scoresHtml = scores.length > 0
    ? scores.map(g => {
        const awayW = g.awayWin ? 'font-weight:900;color:#111' : 'font-weight:400;color:#999';
        const homeW = g.homeWin ? 'font-weight:900;color:#111' : 'font-weight:400;color:#999';
        const awayS = g.awayWin ? 'font-weight:900;color:#111' : 'font-weight:900;color:#ccc';
        const homeS = g.homeWin ? 'font-weight:900;color:#111' : 'font-weight:900;color:#ccc';
        const lines = (g.homeLines && g.homeLines.length > 0)
          ? '<div style="font-size:9px;color:#bbb;font-family:Courier New,monospace;margin-top:8px;padding-top:6px;border-top:1px solid #ebebeb;line-height:1.7">'
            + g.awayName + ':&nbsp; ' + g.awayLines.join(' | ') + ' = ' + g.awayScore + '<br>'
            + g.homeName + ':&nbsp; ' + g.homeLines.join(' | ') + ' = ' + g.homeScore
            + '</div>'
          : '';
        return '<div style="background:#f8f8f8;border-left:4px solid #c8201c;padding:12px 14px;margin-bottom:10px">'
          + '<div style="font-size:8px;font-weight:900;color:#c8201c;letter-spacing:0.15em;text-transform:uppercase;margin-bottom:8px">' + g.emoji + ' ' + g.sport + ' &nbsp;&middot;&nbsp; Final</div>'
          + '<table width="100%" cellpadding="2" cellspacing="0" style="font-family:Georgia,serif">'
          + '<tr><td style="font-size:14px;' + awayW + '">' + g.awayName + '</td><td align="right" style="font-size:18px;' + awayS + ';width:36px">' + g.awayScore + '</td></tr>'
          + '<tr><td style="font-size:14px;' + homeW + '">' + g.homeName + '</td><td align="right" style="font-size:18px;' + homeS + ';width:36px">' + g.homeScore + '</td></tr>'
          + '</table>'
          + lines
          + '<a href="' + g.boxUrl + '" style="display:inline-block;margin-top:8px;font-size:10px;color:#888;text-decoration:none;border:1px solid #ddd;padding:3px 10px">Full recap on ESPN &rarr;</a>'
          + '</div>';
      }).join('')
    : '<p style="color:#aaa;font-style:italic;font-size:13px;margin:8px 0">No NY games played last night.</p>';

  // ── TODAY'S GAMES ────────────────────────────────────────────────────────────
  const gamesHtml = todayGames.length > 0
    ? todayGames.map(g => {
        const tvLine = g.tv
          ? ' &nbsp;&middot;&nbsp; <span style="font-weight:700">' + g.tv + '</span>'
          : '';
        const venueLine = g.venue
          ? ' &nbsp;&middot;&nbsp; ' + g.venue
          : '';
        let weatherLine = '';
        if (g.weather) {
          const w = g.weather;
          weatherLine = '<div style="font-size:10px;color:#888;margin-top:4px;font-style:italic">'
            + w.temp + '&deg;F &nbsp;&middot;&nbsp; ' + w.desc + ' &nbsp;&middot;&nbsp; Wind ' + w.wind + ' mph'
            + (w.vibes ? '<br><span style="display:inline-block;background:#f0f7ff;border:1px solid #d0e4f7;color:#4a7fa5;font-size:8px;font-weight:700;letter-spacing:0.08em;padding:2px 8px;margin-top:4px;text-transform:uppercase;font-style:normal">' + w.vibes + '</span>' : '')
            + '</div>';
        } else if (g.stadium && g.stadium.indoor) {
          // Indoor venue — no weather but show if it's a big game
          weatherLine = '';
        }
        const seriesLine = g.seriesNote
          ? '<div style="font-size:10px;font-weight:700;color:#5555bb;margin-top:4px">' + g.seriesNote + '</div>'
          : '';
        return '<div style="padding:10px 0;border-bottom:1px solid #f2f2f2">'
          + '<div style="font-size:14px;font-weight:700;color:#111;margin-bottom:4px">' + g.emoji + ' ' + g.awayName + ' vs ' + g.homeName + '</div>'
          + '<div style="font-size:11px;color:#666;line-height:1.6">'
          + '<span style="font-weight:900;color:#c8201c">' + g.time + '</span>'
          + venueLine
          + tvLine
          + '</div>'
          + weatherLine
          + seriesLine
          + '</div>';
      }).join('')
    : '<p style="color:#aaa;font-style:italic;font-size:13px;margin:8px 0">No NY games scheduled today.</p>';

  // ── HEADLINES ────────────────────────────────────────────────────────────────
  // Group by team
  const grouped = {};
  headlines.forEach(h => {
    if (!grouped[h.team]) grouped[h.team] = [];
    grouped[h.team].push(h);
  });
  const headlinesHtml = Object.keys(grouped).length > 0
    ? Object.entries(grouped).map(([team, stories]) =>
        '<div style="font-size:8px;font-weight:900;color:#c8201c;letter-spacing:0.2em;text-transform:uppercase;padding:6px 0 4px;border-bottom:1px solid #f5f5f5;margin-bottom:4px">' + team + '</div>'
        + stories.map(s =>
            '<div style="padding:7px 0;border-bottom:1px solid #f8f8f8">'
            + '<a href="' + s.link + '" style="font-size:13px;font-weight:600;color:#111;text-decoration:none;line-height:1.4;display:block">' + s.title + '</a>'
            + '<div style="font-size:9px;color:#bbb;margin-top:2px">' + s.source + '</div>'
            + '</div>'
          ).join('')
      ).join('')
    : '';

  // ── ON THIS DATE ─────────────────────────────────────────────────────────────
  const otdHtml = otd
    ? '<div style="background:#f0fff4;border:1px solid #b0e0c0;border-left:4px solid #22c55e;padding:14px 18px">'
      + '<div style="font-size:8px;font-weight:900;color:#22c55e;letter-spacing:0.2em;text-transform:uppercase;margin-bottom:6px">&#128197; On This Date in NY Sports</div>'
      + '<div style="font-size:9px;font-weight:900;color:#c8201c;letter-spacing:0.12em;text-transform:uppercase;margin-bottom:4px">' + otd.team + ' &nbsp;&middot;&nbsp; ' + otd.year + '</div>'
      + '<div style="font-size:13px;color:#333;line-height:1.6;font-style:italic">&ldquo;' + otd.text + '&rdquo;</div>'
      + '</div>'
    : '';

  // ── GLORY ─────────────────────────────────────────────────────────────────────
  const gloryHtml = '<div style="background:#fffbf2;border:1px solid #f0e2b0;border-left:4px solid #f0b429;padding:16px 18px">'
    + '<div style="font-size:38px;font-weight:900;color:#f0b429;line-height:1;margin-bottom:3px">' + glory.year + '</div>'
    + '<div style="font-size:8px;font-weight:900;color:#c8201c;letter-spacing:0.2em;text-transform:uppercase;margin-bottom:8px">' + (glory.team||'New York') + '</div>'
    + '<div style="font-size:14px;color:#333;line-height:1.65;font-style:italic">&ldquo;' + glory.text + '&rdquo;</div>'
    + '</div>';

  // ── TRIVIA ───────────────────────────────────────────────────────────────────
  const triviaHtml = '<div style="background:#f5f5ff;border-left:4px solid #5555bb;padding:16px 18px">'
    + '<div style="font-size:8px;font-weight:900;color:#5555bb;letter-spacing:0.2em;text-transform:uppercase;margin-bottom:8px">Today&rsquo;s Trivia Question</div>'
    + '<div style="font-size:14px;font-weight:700;color:#111;line-height:1.5;margin-bottom:4px">' + trivia.q + '</div>'
    + '<div style="font-size:11px;color:#888;font-style:italic;margin-bottom:10px">' + trivia.hint + '</div>'
    + '<div style="background:#f0f0ff;border:1px solid #ccccee;padding:10px 14px;margin-bottom:14px">'
    + '<div style="font-size:8px;font-weight:900;color:#5555bb;letter-spacing:0.12em;text-transform:uppercase;margin-bottom:6px">&#128161; Answer — tap and hold or copy to reveal</div>'
    + '<div style="font-size:13px;font-weight:700;color:#f0f0ff;background:#5555bb;padding:7px 12px;display:inline-block;letter-spacing:0.04em;user-select:all;-webkit-user-select:all">' + trivia.a + '</div>'
    + '<div style="font-size:9px;color:#aaa;margin-top:5px;font-style:italic">Blue box — select/highlight on desktop · tap &amp; hold on iPhone · long press on Android</div>'
    + '</div>'
    + '<a href="' + SITE_URL + '" style="display:inline-block;background:#c8201c;color:#fff;text-decoration:none;font-size:11px;font-weight:900;letter-spacing:0.1em;padding:10px 22px;text-transform:uppercase">Play in the Playroom &rarr;</a>'
    + '<p style="font-size:10px;color:#aaa;margin:10px 0 0;font-style:italic">Also today: Hangman &nbsp;&middot;&nbsp; Anagram &nbsp;&middot;&nbsp; Emoji Quiz &nbsp;&middot;&nbsp; Crossword &nbsp;&middot;&nbsp; Guess the Player</p>'
    + '</div>';

  // ── ASSEMBLE ─────────────────────────────────────────────────────────────────
  return '<!DOCTYPE html><html lang="en"><head>'
    + '<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">'
    + '<meta name="color-scheme" content="light">'
    + '<title>NY Sports Daily &middot; Morning Digest</title>'
    + '</head>'
    + '<body style="margin:0;padding:0;background:#e8e8e8;font-family:Georgia,\'Times New Roman\',serif;color:#111">'
    + '<div style="max-width:600px;margin:0 auto;background:#fff;border:1px solid #ccc">'

    // Header
    + '<div style="background:#111;padding:22px 28px 18px;text-align:center;border-bottom:4px solid #c8201c">'
    + '<p style="font-size:9px;color:#777;letter-spacing:0.25em;text-transform:uppercase;margin:0 0 5px">Good Morning &nbsp;&middot;&nbsp; ' + today + '</p>'
    + '<h1 style="font-size:28px;font-weight:900;color:#fff;margin:0 0 5px;line-height:1">NY <span style="color:#c8201c">SPORTS</span> <span style="font-weight:300;color:#888">DAILY</span></h1>'
    + '<p style="font-size:9px;color:#f0b429;letter-spacing:0.2em;text-transform:uppercase;margin:0 0 5px">Morning Digest</p>'
    + '<p style="font-size:11px;color:#777;margin:0;letter-spacing:0.05em">' + teams + '</p>'
    + '</div>'

    // Greeting
    + '<div style="padding:12px 28px;background:#fafafa;border-bottom:1px solid #ebebeb">'
    + '<p style="margin:0;font-size:13px;color:#444;line-height:1.5">Good morning, <strong style="color:#111">' + firstName + '</strong> &mdash; here&rsquo;s your NY sports briefing. &#9749;</p>'
    + '</div>'

    // Last Night
    + '<div style="padding:18px 28px;border-bottom:1px solid #ebebeb">'
    + '<div style="font-size:8px;font-weight:900;color:#bbb;letter-spacing:0.25em;text-transform:uppercase;padding-bottom:8px;border-bottom:1px solid #ebebeb;margin-bottom:14px">&#127769; Last Night&rsquo;s Results</div>'
    + scoresHtml
    + '</div>'

    // Today's Games
    + '<div style="padding:18px 28px;border-bottom:1px solid #ebebeb">'
    + '<div style="font-size:8px;font-weight:900;color:#bbb;letter-spacing:0.25em;text-transform:uppercase;padding-bottom:8px;border-bottom:1px solid #ebebeb;margin-bottom:14px">&#128197; Today&rsquo;s NY Games</div>'
    + gamesHtml
    + '</div>'

    // Headlines
    + (headlinesHtml
      ? '<div style="padding:18px 28px;border-bottom:1px solid #ebebeb">'
        + '<div style="font-size:8px;font-weight:900;color:#bbb;letter-spacing:0.25em;text-transform:uppercase;padding-bottom:8px;border-bottom:1px solid #ebebeb;margin-bottom:14px">&#128240; Top Stories</div>'
        + headlinesHtml
        + '</div>'
      : '')

    // On This Date (only shown when there's a match)
    + (otdHtml
      ? '<div style="padding:18px 28px;border-bottom:1px solid #ebebeb">'
        + '<div style="font-size:8px;font-weight:900;color:#bbb;letter-spacing:0.25em;text-transform:uppercase;padding-bottom:8px;border-bottom:1px solid #ebebeb;margin-bottom:14px">&#128197; On This Date in NY Sports</div>'
        + otdHtml
        + '</div>'
      : '')

    // Glory
    + '<div style="padding:18px 28px;border-bottom:1px solid #ebebeb">'
    + '<div style="font-size:8px;font-weight:900;color:#bbb;letter-spacing:0.25em;text-transform:uppercase;padding-bottom:8px;border-bottom:1px solid #ebebeb;margin-bottom:14px">&#127942; NY Glory Moment</div>'
    + gloryHtml
    + '</div>'

    // Trivia
    + '<div style="padding:18px 28px;border-bottom:1px solid #ebebeb">'
    + '<div style="font-size:8px;font-weight:900;color:#bbb;letter-spacing:0.25em;text-transform:uppercase;padding-bottom:8px;border-bottom:1px solid #ebebeb;margin-bottom:14px">&#127918; Daily Playroom Challenge</div>'
    + triviaHtml
    + '</div>'

    // CTA
    + '<div style="padding:20px 28px;background:#fafafa;text-align:center;border-top:1px solid #ebebeb">'
    + '<a href="' + SITE_URL + '" style="display:inline-block;background:#c8201c;color:#fff;text-decoration:none;font-size:12px;font-weight:900;letter-spacing:0.12em;padding:12px 28px;text-transform:uppercase">Open NY Sports Daily &rarr;</a>'
    + '</div>'

    // Footer
    + '<div style="background:#f5f5f5;border-top:1px solid #e0e0e0;padding:18px 28px;text-align:center">'
    + '<p style="font-size:13px;color:#555;font-style:italic;line-height:1.6;margin:0 0 8px">No matter who you root for in NY &mdash; we&rsquo;re in it together. 🗽</p>'
    + '<p style="font-size:10px;color:#aaa;margin:0 0 10px;letter-spacing:0.06em">NY Sports Daily &nbsp;&middot;&nbsp; Free always &nbsp;&middot;&nbsp; No ads ever</p>'
    + '<div>'
    + '<a href="https://buymeacoffee.com/mhughes65v" style="color:#888;text-decoration:none;font-size:11px;margin:0 8px">&#9749; Buy me a coffee</a>'
    + '<a href="' + SITE_URL + '" style="color:#888;text-decoration:none;font-size:11px;margin:0 8px">Visit the site</a>'
    + '<a href="https://www.instagram.com/nysportsdaily_com/" style="color:#888;text-decoration:none;font-size:11px;margin:0 8px">&#128248; Instagram</a>'
    + '</div>'
    + '<p style="font-size:10px;color:#ccc;margin-top:10px"><a href="' + SITE_URL + '/unsubscribe?email=' + '{{EMAIL}}' + '" style="color:#ccc">Unsubscribe</a></p>'
    + '</div>'

    + '</div></body></html>';
}

// ── Subject line builder ──────────────────────────────────────────────────────
function buildSubject(scores, todayGames) {
  const today = new Date().toLocaleDateString('en-US', { weekday:'short', month:'short', day:'numeric' });

  // Build a score summary for the subject line
  // Use short name matching for subject line (scores have shortDisplayName)
  const NY_SHORT = ['yankees','mets','jets','giants','knicks','nets','rangers',
                    'islanders','devils','liberty','nycfc','red bulls','gotham'];
  function isNYShort(name) {
    return NY_SHORT.some(t => (name||'').toLowerCase().includes(t));
  }
  const nyWins  = scores.filter(g => {
    const homeNY = isNYShort(g.homeName);
    const awayNY = isNYShort(g.awayName);
    return (homeNY && g.homeWin) || (awayNY && g.awayWin);
  });
  const nyLosses = scores.filter(g => {
    const homeNY = isNYShort(g.homeName);
    const awayNY = isNYShort(g.awayName);
    return (homeNY && !g.homeWin) || (awayNY && !g.awayWin);
  });

  let scoreSummary = '';
  if (scores.length === 0) {
    scoreSummary = 'No games last night';
  } else if (nyWins.length > 0 && nyLosses.length === 0) {
    scoreSummary = nyWins.map(g => {
      const winner = isNYTeam((g.homeName||'').toLowerCase()) ? g.homeName : g.awayName;
      return winner + ' Win';
    }).join(', ');
  } else if (nyWins.length === 0 && nyLosses.length > 0) {
    scoreSummary = nyLosses.map(g => {
      const loser = isNYTeam((g.homeName||'').toLowerCase()) ? g.homeName : g.awayName;
      return loser + ' Loss';
    }).join(', ');
  } else if (scores.length > 0) {
    scoreSummary = nyWins.length + 'W-' + nyLosses.length + 'L last night';
  }

  // Big games today
  const bigGame = todayGames.find(g => g.seriesNote); // playoffs
  const gameSuffix = bigGame
    ? ' · ' + bigGame.awayName + ' vs ' + bigGame.homeName + ' ' + (bigGame.seriesNote || '')
    : todayGames.length > 0
      ? ' · ' + todayGames.length + ' game' + (todayGames.length > 1 ? 's' : '') + ' today'
      : '';

  return '🗽 NY Sports Daily · ' + today + (scoreSummary ? ' · ' + scoreSummary : '') + gameSuffix;
}

// ── Main handler ──────────────────────────────────────────────────────────────
export default async function handler(req, res) {
  try {
    const subscribers = await getSubscribers();
    console.log('Sending digest to ' + subscribers.length + ' subscribers');

    const glory   = GLORY_MOMENTS[Math.floor(Math.random() * GLORY_MOMENTS.length)];
  const otd     = getOnThisDate(); // On This Date — null if no match today
    const trivia = TRIVIA_QUESTIONS[Math.floor(Math.random() * TRIVIA_QUESTIONS.length)];

    // Fetch today's games once (shared across all subscribers)
    // We'll filter per subscriber in the loop
    const allTodayGames = await getTodaysGames([]);

    let sent = 0, errors = 0;

    for (let i = 0; i < subscribers.length; i++) {
      const sub = subscribers[i];
      try {
        // Fetch subscriber-specific data in parallel
        const [scores, headlines] = await Promise.all([
          getYesterdayScores(sub.teams),
          getTeamHeadlines(sub.teams),
        ]);

        // Filter today's games to this subscriber's teams
        const todayGames = (sub.teams && sub.teams.length > 0)
          ? allTodayGames.filter(g =>
              sub.teams.some(t =>
                (g.homeName||'').toLowerCase().includes(t.toLowerCase()) ||
                (g.awayName||'').toLowerCase().includes(t.toLowerCase()) ||
                (g.homeFull||'').toLowerCase().includes(t.toLowerCase()) ||
                (g.awayFull||'').toLowerCase().includes(t.toLowerCase())
              )
            )
          : allTodayGames;

        const html    = buildEmail(sub, scores, todayGames, headlines, glory, trivia, otd);
        const subject = buildSubject(scores, todayGames);

        // Fix unsubscribe URL with actual email
        const finalHtml = html.replace('{{EMAIL}}', encodeURIComponent(sub.email));

        await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Content-Type':  'application/json',
            'Authorization': 'Bearer ' + RESEND_KEY,
          },
          body: JSON.stringify({
            from:    'NY Sports Daily <digest@nysportsdaily.com>',
            to:      [sub.email],
            subject: subject,
            html:    finalHtml,
          }),
        });

        // Update last_sent
        await fetch(
          SUPABASE_URL + '/rest/v1/ny_subscribers?email=eq.' + encodeURIComponent(sub.email),
          {
            method: 'PATCH',
            headers: {
              'Content-Type':  'application/json',
              'apikey':        SUPABASE_KEY,
              'Authorization': 'Bearer ' + SUPABASE_KEY,
            },
            body: JSON.stringify({ last_sent: new Date().toISOString() }),
          }
        );

        sent++;
        await new Promise(r => setTimeout(r, 300));

      } catch(e) {
        console.error('Failed for ' + sub.email + ':', e);
        errors++;
      }
    }

    console.log('Done. Sent: ' + sent + ', Errors: ' + errors);
    return res.status(200).json({ ok:true, sent, errors });

  } catch(err) {
    console.error('Digest error:', err);
    return res.status(500).json({ error: err.message });
  }
}

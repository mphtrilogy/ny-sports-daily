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
  // MLB
  'yankee stadium':      { lat:40.8296, lon:-73.9262, name:'Yankee Stadium' },
  'citi field':          { lat:40.7571, lon:-73.8458, name:'Citi Field' },
  // NBA/NHL (indoor — no weather needed, show arena name only)
  'madison square garden':{ lat:40.7505, lon:-73.9934, name:'Madison Square Garden', indoor:true },
  'ubs arena':           { lat:40.7227, lon:-73.5933, name:'UBS Arena', indoor:true },
  'prudential center':   { lat:40.7334, lon:-74.1713, name:'Prudential Center', indoor:true },
  'barclays center':     { lat:40.6828, lon:-73.9752, name:'Barclays Center', indoor:true },
  // NFL
  'metlife stadium':     { lat:40.8135, lon:-74.0745, name:'MetLife Stadium' },
  // Soccer
  'yankee stadium (mls)':{ lat:40.8296, lon:-73.9262, name:'Yankee Stadium' },
  'red bull arena':      { lat:40.7369, lon:-74.1502, name:'Red Bull Arena' },
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

        // Broadcast info
        const broadcasts = (comp.broadcasts||[]).flatMap(b => b.names||[]);
        const tvStr = broadcasts.slice(0,2).join(' / ') || '';

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
async function getTeamHeadlines(teams) {
  const headlines = [];
  const toFetch = (teams && teams.length > 0) ? teams.slice(0,3) : ['Yankees','Mets','Knicks'];
  await Promise.all(toFetch.map(async team => {
    try {
      const query = encodeURIComponent('New York ' + team + ' sports');
      const r = await fetch(
        'https://news.google.com/rss/search?q=' + query + '&hl=en-US&gl=US&ceid=US:en'
      );
      if (!r.ok) return;
      const xml = await r.text();
      const items = xml.match(/<item>([\s\S]*?)<\/item>/g) || [];
      items.slice(0,2).forEach(item => {
        const titleMatch = item.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/) ||
                           item.match(/<title>(.*?)<\/title>/);
        const linkMatch  = item.match(/<link>(.*?)<\/link>/);
        const srcMatch   = item.match(/<source[^>]*>(.*?)<\/source>/);
        const title  = titleMatch ? titleMatch[1] : '';
        const link   = linkMatch  ? linkMatch[1]  : SITE_URL;
        const source = srcMatch   ? srcMatch[1]   : '';
        if (title && !title.includes('Google News')) {
          headlines.push({
            team, title: title.replace(/&amp;/g,'&').replace(/&#39;/g,"'"),
            link, source,
          });
        }
      });
    } catch(e) { console.error('Headlines error:', e); }
  }));
  return headlines;
}

// ── Glory moments ─────────────────────────────────────────────────────────────
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
function buildEmail(subscriber, scores, todayGames, headlines, glory, trivia) {
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

  // ── GLORY ────────────────────────────────────────────────────────────────────
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
    + '<div style="background:#eeeeff;border:1px solid #ccccee;padding:8px 12px">'
    + '<span style="font-size:9px;font-weight:900;color:#5555bb;letter-spacing:0.1em;text-transform:uppercase">&#128161; Answer &mdash; </span><span style="font-size:9px;color:#888;font-style:italic">select text below to reveal</span></div>'
    + '<div style="background:#333333;border:1px solid #222222;padding:10px 12px;margin-bottom:14px;border-radius:3px"><span style="font-size:13px;font-weight:700;color:#333333;background:#333333;cursor:text">' + trivia.a + '</span>&nbsp;<span style="font-size:9px;color:#666;font-style:italic">(highlight to reveal)</span></div>'
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
    + '<p style="font-size:13px;color:#555;font-style:italic;line-height:1.6;margin:0 0 8px">No matter who you root for in NY &mdash; we&rsquo;re in it together. &#127965;</p>'
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
  const nyWins  = scores.filter(g => {
    const homeNY = isNYTeam((g.homeName||'').toLowerCase());
    const awayNY = isNYTeam((g.awayName||'').toLowerCase());
    return (homeNY && g.homeWin) || (awayNY && g.awayWin);
  });
  const nyLosses = scores.filter(g => {
    const homeNY = isNYTeam((g.homeName||'').toLowerCase());
    const awayNY = isNYTeam((g.awayName||'').toLowerCase());
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

    const glory  = GLORY_MOMENTS[Math.floor(Math.random() * GLORY_MOMENTS.length)];
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

        const html    = buildEmail(sub, scores, todayGames, headlines, glory, trivia);
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

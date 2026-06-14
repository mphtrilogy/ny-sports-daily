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
  'rogers centre':         { lat:43.6414, lon:-79.3894, name:'Rogers Centre', retractable:true },
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
  'chase field':           { lat:33.4453, lon:-112.0667, name:'Chase Field', retractable:true },
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
  if (code >= 95)                            return '⛈️ Thunderstorms likely — confirm game status';
  if (code >= 80 && code <= 94)              return '🌧️ Showers possible — check game status';
  if (code >= 60 && code <= 79)              return '☔ Rain possible — bring a jacket';
  if (code <= 1 && temp >= 68 && temp <= 82) return '🌟 Perfect baseball weather';
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

// ── MLB Pitching Matchup + Series Status ────────────────────────────────────────
// Uses free public MLB Stats API — silent failsafe, never crashes pipeline
async function getMLBGameDetails(teams) {
  try {
    const today = new Date();
    const y = today.getFullYear();
    const m = String(today.getMonth()+1).padStart(2,'0');
    const d = String(today.getDate()).padStart(2,'0');
    const dateStr = y + '-' + m + '-' + d;

    // Mets = 121, Yankees = 147
    const NY_MLB_IDS = { 121:'Mets', 147:'Yankees' };

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000); // 5s max

    let data;
    try {
      const r = await fetch(
        'https://statsapi.mlb.com/api/v1/schedule?sportId=1&date=' + dateStr
        + '&hydrate=probablePitcher,seriesStatus,team',
        { signal: controller.signal }
      );
      clearTimeout(timeout);
      if (!r.ok) return {};
      data = await r.json();
    } catch(e) {
      clearTimeout(timeout);
      return {}; // timeout or network error — fail silently
    }

    const results = {};
    const dates = (data && data.dates) || [];

    dates.forEach(function(dateObj) {
      (dateObj.games || []).forEach(function(game) {
        try {
          const homeId = game.teams && game.teams.home && game.teams.home.team && game.teams.home.team.id;
          const awayId = game.teams && game.teams.away && game.teams.away.team && game.teams.away.team.id;

          // Only process Mets and Yankees games
          const isNYGame = NY_MLB_IDS[homeId] || NY_MLB_IDS[awayId];
          if (!isNYGame) return;

          // Series status — e.g. "Game 2 of 3" or "Series tied 1-1"
          const seriesStatus = (game.seriesStatus && game.seriesStatus.shortDescription) || '';

          // Probable pitchers
          const homePitcher = game.teams && game.teams.home && game.teams.home.probablePitcher
            ? game.teams.home.probablePitcher.fullName : '';
          const awayPitcher = game.teams && game.teams.away && game.teams.away.probablePitcher
            ? game.teams.away.probablePitcher.fullName : '';


          const awayDisplay = awayPitcher || 'TBD';
          const homeDisplay = homePitcher || 'TBD';
          const pitchingLine = (homePitcher || awayPitcher)
            ? ('&#128640; ' + awayDisplay + ' vs. ' + homeDisplay)
            : '';
          // Key by home team name for matching
          const homeShort = game.teams.home.team.name || '';
          const awayShort = game.teams.away.team.name || '';
          const gameKey = awayShort + '_' + homeShort;

          results[gameKey] = {
            seriesStatus: seriesStatus,
            pitchingLine: pitchingLine,
            homePitcher:  homePitcher,
            awayPitcher:  awayPitcher,
          };
        } catch(e) {} // silent — bad game data
      });
    });

    return results;
  } catch(e) {
    return {}; // always fail silently
  }
}


// ═══════════════════════════════════════════════════════════════════════════════
// NY SPORTS DAILY — WEEKLY NUGGET SYSTEM
// Each day of the week gets a themed section in the newsletter
// Sunday=0 Monday=1 Tuesday=2 Wednesday=3 Thursday=4 Friday=5 Saturday=6
// ═══════════════════════════════════════════════════════════════════════════════

// ── SUNDAY: DEEP DIVE ─────────────────────────────────────────────────────────
const DEEP_DIVES = [
  {
    title: "The Miracle Mets: How 1969 Actually Happened",
    body: "In April 1969, the New York Mets were 100-to-1 longshots. By October they were World Champions. It wasn't luck — it was Tom Seaver going 25-7, Jerry Koosman anchoring the rotation, and a manager named Gil Hodges who believed before anyone else did. The turning point came August 13th when the Cubs came to Shea for a crucial series. Two black cats crossed the field. The Cubs collapsed. The Mets went 38-11 the rest of the way. Cleon Jones caught the final out on his knees. New York went insane. 57 years later it remains the most improbable championship in baseball history.",
    team: "Mets",
    charity: "Amazin' Mets Foundation | mets.com/community", year: 1969
  },
  {
    title: "The Islanders Dynasty Nobody Talks About Enough",
    body: "Four straight Stanley Cups. 1980, 1981, 1982, 1983. Nineteen consecutive playoff series wins. Mike Bossy scoring 50 goals nine seasons in a row. Bryan Trottier, Denis Potvin, Billy Smith. The Islanders dynasty was as dominant as any team in the history of North American professional sports — and it happened in the shadow of the Yankees, in a building on Long Island that held 16,000 people. In 1983 they swept Wayne Gretzky's Oilers, widely considered the greatest team ever assembled. They won anyway. Then the dynasty ended, almost overnight, and New York moved on. They deserved so much more.",
    team: "Islanders",
    charity: "NY Islanders Children's Foundation | nhl.com/islanders/community", year: 1983
  },
  {
    title: "Broadway Joe's Guarantee: The Full Story",
    body: "Three days before Super Bowl III, Joe Namath was at the Miami Touchdown Club when a heckler shouted that the Baltimore Colts would win easily. Namath grabbed the microphone. 'We're gonna win Sunday. I guarantee it.' The Jets were 17-point underdogs. Nobody believed him. On January 12, 1969, the Jets won 16-7. Namath completed 17 of 28 passes, called his own plays, and walked off the field with his index finger raised. It wasn't just a win. It changed professional football forever — proving the AFL was equal to the NFL and setting the stage for the merger that created the modern NFL.",
    team: "Jets",
    charity: "New York Jets Foundation | newyorkjets.com/community", year: 1969
  },
  {
    title: "The Cosmos and Pelé: When Soccer Almost Conquered New York",
    body: "In 1975, the New York Cosmos signed Pelé for $4.5 million — the richest contract in team sports history at the time. Then they signed Franz Beckenbauer and Carlos Alberto. Suddenly Giants Stadium was drawing 77,000 fans to watch soccer. The Cosmos won the NASL championship in 1977, 1978, 1980 and 1982. Kids across New York were kicking balls in the streets. Soccer was going to be America's next sport. Then the NASL collapsed in 1984, the Cosmos folded, and the whole dream evaporated. But for a decade, New York had the greatest soccer team on earth.",
    team: "NY Cosmos",
    charity: "Soccer for Success NY | soccerforsuccess.org", year: 1977
  },
  {
    title: "Mark Messier's Guarantee: 54 Years Ends Tonight",
    body: "May 25, 1994. The Rangers were down 3-2 in their series against the New Jersey Devils. Before Game 6, Mark Messier told the newspapers: 'We will win tonight.' Nobody — not even Rangers fans — fully believed him. Then Messier scored a hat trick in the third period to force a Game 7. The Rangers won that too, then beat Vancouver in seven games for the Stanley Cup. It ended 54 years of waiting and a curse so powerful New York had made it into a cultural identity. The Captain delivered. It remains the most clutch performance in Rangers history.",
    team: "Rangers",
    charity: "Garden of Dreams Foundation | gardenofdreams.org", year: 1994
  },
  {
    title: "Willis Reed Limps Out: The Most Dramatic Moment in NBA History",
    body: "May 8, 1970. Game 7, NBA Finals. Madison Square Garden. Willis Reed had torn a muscle in his thigh in Game 5 and didn't play Game 6. Nobody knew if he'd play Game 7. The Lakers warmed up. The Knicks warmed up. Then Reed emerged from the tunnel. The crowd erupted before he even touched the ball. He scored the first two baskets of the game — the only points he'd score all night — and MSG never came back down. Walt Frazier scored 36 and dished 19 assists. The Knicks won 113-99. Reed's entrance remains the single most electric moment in Garden history.",
    team: "Knicks",
    charity: "Garden of Dreams Foundation | gardenofdreams.org", year: 1970
  },
  {
    title: "Don Larsen's Perfect Game: The Greatest Moment in World Series History",
    body: "October 8, 1956. Game 5 of the World Series. Yankee Stadium. Don Larsen was not an ace — he'd gone 11-5 that season, a solid but unremarkable pitcher. Yet that afternoon he retired all 27 Brooklyn Dodgers he faced. No hits. No walks. No errors. 97 pitches. The last out was Dale Mitchell on a called strike three. Yogi Berra sprinted to the mound and leapt into Larsen's arms — one of the most iconic images in sports history. It remains the only perfect game in World Series history. Larsen never threw another one. Sometimes one afternoon defines a lifetime.",
    team: "Yankees",
    charity: "New York Yankees Foundation | yankees.com/community", year: 1956
  },
  {
    title: "Reggie Jackson: Three Swings, Three Pitches, Three Home Runs",
    body: "October 18, 1977. World Series Game 6. Yankee Stadium. Reggie Jackson stepped to the plate in the fourth inning and hit the first pitch he saw into the seats. Then in the fifth — first pitch, home run. Then in the eighth — first pitch, home run. Three consecutive pitches. Three home runs. Five RBIs. The Yankees won 8-4 and claimed their 21st World Series title. In the dugout afterward, a teammate called him 'the straw that stirs the drink.' The nickname Mr. October was born that night. No one has come close to matching it in the 47 years since.",
    team: "Yankees",
    charity: "New York Yankees Foundation | yankees.com/community", year: 1977
  },
  {
    title: "Mookie's Grounder: The Night Boston's Curse Was Born",
    body: "October 25, 1986. Game 6. Shea Stadium. The Mets were one out away from elimination. Two outs, nobody on, trailing 5-3 in the tenth inning. Then the Mets scored twice to tie it. Then Mookie Wilson hit a slow grounder down the first base line toward Bill Buckner. The ball rolled through his legs. Ray Knight scored. The Mets won. Two days later they won Game 7. What followed for Boston — 18 more years of heartbreak — became baseball's most famous curse. For Mets fans it remains the single most electric moment in franchise history. For Buckner it became an unfair lifetime of regret.",
    team: "Mets",
    charity: "Amazin' Mets Foundation | mets.com/community", year: 1986
  },
  {
    title: "Breanna Stewart and the Liberty's First Championship",
    body: "October 2024. The New York Liberty had been waiting 27 years for this. Founded in 1997, they'd reached the Finals three times and lost all three. Then Breanna Stewart arrived — arguably the best player in WNBA history — and everything changed. The 2024 Liberty were dominant all season. In the Finals they faced the Minnesota Lynx in five games. Stewart was everywhere: scoring, rebounding, defending, leading. When the final buzzer sounded, Madison Square Garden — a building that has seen everything — erupted for a WNBA champion for the first time. New York finally had its title.",
    team: "Liberty",
    charity: "Brooklyn Nets & NY Liberty Foundation | netslibertyfoundation.org", year: 2024
  },
  {
    title: "The Greatest Game Ever Played: Giants vs. Colts 1958",
    body: "December 28, 1958. Yankee Stadium. The Baltimore Colts versus the New York Giants for the NFL Championship. The first sudden-death overtime game in league history. Johnny Unitas drove the Colts 80 yards to set up Alan Ameche's touchdown. Colts 23, Giants 17. But the score almost doesn't matter. What matters is that 45 million Americans watched on television — the largest audience for a sporting event in history at the time. Commissioner Bert Bell had insisted the game be televised nationally. Pro football was born as a national obsession that afternoon in the Bronx. Every Super Bowl since traces back to this game.",
    team: "Giants",
    charity: "The Giants Foundation | giants.com/community", year: 1958
  },
  {
    title: "Derek Jeter: The Captain, The Farewell, The Legacy",
    body: "September 25, 2014. Yankee Stadium. Derek Jeter's last home game. Walk-off single in the ninth inning. The whole stadium in tears. It was almost too perfect — except Jeter made it perfect on purpose, the way he always did. Twenty seasons. Five championships. 3,465 hits. The flip play. Mr. November. The dive into the stands. The Yankee Way personified. When you ask New Yorkers to name the defining athlete of their lifetime, more often than not the answer is Jeter. Not for the stats. For what he represented: professionalism, loyalty, clutch performance, and the quiet certainty that everything would be fine.",
    team: "Yankees",
    charity: "New York Yankees Foundation | yankees.com/community", year: 2014
  },
];


// ── NEW SUNDAY DEEP DIVES (40 additional essays) ─────────────────────────────

const DEEP_DIVES_NEW = [

  // ── YANKEES ────────────────────────────────────────────────────────────────

  {
    title: "The Mantle/Maris Chase: Summer of '61",
    team: "Yankees",
    charity: "New York Yankees Foundation | yankees.com/community", year: 1961,
    body: "In the summer of 1961, two Yankees were chasing Babe Ruth's ghost. Mickey Mantle and Roger Maris were both gunning for the single-season home run record of 60, set by Ruth in 1927. The city was transfixed. Commissioner Ford Frick — Ruth's old friend — ruled that if the record fell after game 154, it would carry an asterisk. Mantle got hurt in September and finished with 54. Maris kept going. On October 1st, the last day of the season, he hit number 61 off Tracy Stallard of the Red Sox. The crowd of 23,000 barely reacted. Maris was never fully embraced by New York — too quiet, too private, too not-Mantle. History has been kinder. 61 stands as one of the great individual seasons in baseball history."
  },

  {
    title: "Mariano Rivera: The Last Sandman",
    team: "Yankees",
    charity: "New York Yankees Foundation | yankees.com/community", year: 2013,
    body: "Enter Sandman hit the speakers and Mariano Rivera jogged in from the bullpen and the game was effectively over. For 19 seasons, Rivera was the most reliable weapon in baseball — a cut fastball that broke bats and broke hearts, delivered with the calm of a man who never seemed to notice the pressure. Five championships. 652 saves. A 0.70 ERA in the postseason. The first unanimous Hall of Fame inductee in baseball history. What made Rivera special wasn't just the numbers — it was the consistency. He never had a bad year. Never had a bad month. Just inning after inning of late-game dominance that Yankees fans took for granted until the day it was gone."
  },

  {
    title: "The 1978 Yankees: Down 14, Then Champions",
    team: "Yankees",
    charity: "New York Yankees Foundation | yankees.com/community", year: 1978,
    body: "By July 19th, 1978, the Yankees were 14 games behind the Boston Red Sox. Billy Martin had just resigned. Bob Lemon had taken over. What followed was one of the greatest comebacks in baseball history. The Yankees caught the Red Sox on the last day of the season, forcing a one-game playoff at Fenway. Bucky Dent — a light-hitting shortstop with three home runs all season — hit a three-run shot over the Green Monster in the seventh inning. The Yankees won 5-4. They went on to beat the Dodgers in six games in the World Series. In New England, Bucky Dent's middle name is still unprintable. In New York, it's poetry."
  },

  {
    title: "George Steinbrenner: The Boss Who Changed Everything",
    team: "Yankees",
    charity: "New York Yankees Foundation | yankees.com/community", year: 1973,
    body: "He bought the Yankees in 1973 for $10 million and immediately announced he wouldn't be involved in day-to-day operations. He lied. Over 37 years, George Steinbrenner fired managers 20 times — Billy Martin alone five times. He spent lavishly, feuded publicly, and demanded winning with an intensity that exhausted everyone around him. He was also right. The Yankees won seven pennants and four World Series under his ownership. He turned the franchise from a struggling operation into a $4 billion empire. You didn't have to like him. But New York was never boring when the Boss was in charge, and the championships speak for themselves."
  },

  {
    title: "Thurman Munson: The Captain We Lost Too Soon",
    team: "Yankees",
    charity: "New York Yankees Foundation | yankees.com/community", year: 1979,
    body: "Thurman Munson was named the Yankees' first team captain since Lou Gehrig in 1976. He was tough, ornery, private, and the heart of those championship teams. He caught every game in 1976, 1977 and 1978. He hit .529 in the 1976 World Series. He was the one player in the clubhouse everyone followed without question. On August 2, 1979, Munson died when he crashed his private plane near Canton, Ohio. He was 32 years old. The Yankees held a ceremony at home plate before their next game. The locker room was never quite the same. The captain's locker was left empty for the rest of the season. It still sits preserved at the Stadium today."
  },

  // ── METS ──────────────────────────────────────────────────────────────────

  {
    title: "The 1986 Mets: The Most Talented and Most Complicated Team in NY History",
    team: "Mets",
    charity: "Amazin' Mets Foundation | mets.com/community", year: 1986,
    body: "The 1986 Mets won 108 games. They had Dwight Gooden on the mound, Darryl Strawberry in the outfield, Keith Hernandez at first, Gary Carter behind the plate, and Lenny Dykstra everywhere at once. They were cocky, talented, loud and beloved. The NLCS against Houston was one of the greatest playoff series ever played — Game 6 going 16 innings, the Mets winning in the dark. Then the World Series against Boston: down to their last strike twice in Game 6, Mookie Wilson's grounder through Buckner's legs, Ray Knight scoring. Game 7 they trailed 3-0 and came back anyway. It wasn't just a championship. It was New York at its most New York — loud, improbable, and absolutely unforgettable."
  },

  {
    title: "Doc Gooden's 1985: The Greatest Pitching Season You've Ever Seen",
    team: "Mets",
    charity: "Amazin' Mets Foundation | mets.com/community", year: 1985,
    body: "Dwight Gooden was 20 years old in 1985. He went 24-4. His ERA was 1.53 — the lowest in the National League in 43 years. He struck out 268 batters. He completed 16 games. He was so dominant that batters would shake their heads walking back to the dugout, unable to explain what had just happened. The K Korner in right field at Shea became a landmark — fans holding up K signs for every strikeout, running out of room by the sixth inning. He won the Cy Young Award unanimously. He was supposed to be the face of the Mets for a decade. The career that followed was complicated, but that 1985 season stands on its own as one of the finest ever pitched."
  },

  {
    title: "Tom Seaver: The Franchise",
    team: "Mets",
    charity: "Amazin' Mets Foundation | mets.com/community", year: 1969,
    body: "Before Tom Seaver arrived in 1967, the Mets were a punchline. After him, they were the Amazin' Mets. Seaver went 16-13 as a rookie, 16-12 in year two, then 25-7 in 1969 as New York won the World Series. He won three Cy Young Awards. He struck out 19 Padres in one game — 10 consecutively, a record that still stands. He was smart, elegant, and fiercely competitive. He was also the first Met that opponents actually feared. When the Mets traded him to Cincinnati in 1977 in a cost-cutting move, Mets fans wept openly. The day is still called the Midnight Massacre. No player has meant more to the franchise, before or since."
  },

  {
    title: "The Midnight Massacre: When the Mets Broke Their Fans' Hearts",
    team: "Mets",
    charity: "Amazin' Mets Foundation | mets.com/community", year: 1977,
    body: "June 15, 1977. Baseball's trade deadline. The Mets, cash-strapped and struggling, traded Tom Seaver to the Cincinnati Reds. They also dealt Dave Kingman. In one afternoon, the face of the franchise was gone. Dick Young, a columnist for the Daily News, had written a piece attacking Seaver's wife Nancy for being envious of Nolan Ryan's wife. Seaver — furious — asked to be traded. The Mets obliged. Fans called the radio stations in tears. Some burned their season tickets outside Shea Stadium. New York had given Seaver everything — he'd given them a championship, a dignity, an identity. What they gave him in return was a one-way ticket to Cincinnati. It remains one of the most painful days in franchise history."
  },

  {
    title: "September 21, 2001: Mike Piazza and the Home Run That Healed a City",
    team: "Mets",
    charity: "Amazin' Mets Foundation | mets.com/community", year: 2001,
    body: "The first sporting event in New York after 9/11. Shea Stadium, September 21st, ten days after the attacks. The Mets had spent those ten days at the Javits Center, visiting hospitals, volunteering, wearing NYPD and FDNY caps instead of their own. When they finally played, the stadium was electric with grief and defiance. In the eighth inning, down 2-1 to the Braves, Mike Piazza stepped in against Steve Karsay. The pitch came in. Piazza swung. The ball sailed over the center field fence and the stadium erupted like nothing before or since. Players on both benches were crying. Strangers embraced. A city that had been shattered found something — not healing exactly, but a moment to breathe together. It is the most important home run in Mets history."
  },

  {
    title: "The 2015 Mets: The Young Arms and the Almost Season",
    team: "Mets",
    charity: "Amazin' Mets Foundation | mets.com/community", year: 2015,
    body: "They came out of nowhere. Jacob deGrom, Noah Syndergaard, Matt Harvey, Steven Matz, Bartolo Colon — five starters who made every game feel winnable. The Mets were in last place on July 31st when they traded for Yoenis Cespedes. He hit .287 with 17 homers in 57 games and turned the season. They won the NL East. They swept the Cubs in four games. They got to the World Series — the first time since 2000. Then the Royals outscored them 12-2 in Game 5 after three straight losses. But that summer — those young arms, that rotation, the way the city fell back in love with the Mets — felt like the beginning of something. It turned out to be the peak. Those arms never stayed healthy at the same time again."
  },

  // ── KNICKS ────────────────────────────────────────────────────────────────

  {
    title: "The 1973 Knicks: A Perfect Team",
    team: "Knicks",
    charity: "Garden of Dreams Foundation | gardenofdreams.org", year: 1973,
    body: "The 1973 Knicks didn't have one superstar. They had five good ones and a coach who made them greater than the sum of their parts. Walt Frazier running the offense with ice-cold precision. Dave DeBusschere defending like his life depended on it. Bill Bradley thinking three passes ahead. Jerry Lucas with his encyclopedic memory and shooting touch. And Willis Reed, still the Captain, the soul of the team. Red Holzman coached them to 57 wins and through the playoffs to a championship over the Lakers. They beat Los Angeles four games to one. It was the last championship the Knicks would win for over 50 years. But what a way to go out — a team that genuinely loved each other, playing the game the right way."
  },

  {
    title: "Old School Knicks: When Basketball Was Born in New York",
    team: "Knicks",
    charity: "Garden of Dreams Foundation | gardenofdreams.org", year: 1954,
    body: "Before the Garden became the World's Most Famous Arena, before Clyde and the Captain, before any of it — the Knicks were one of the NBA's founding franchises, playing in a league that was still figuring itself out. The 1950s Knicks reached the Finals three times — 1951, 1952, 1953 — and lost all three. Carl Braun was their star, a silky shooting guard who could fill it up before scoring was fashionable. Max Zaslofsky. Harry Gallatin. Sweetwater Clifton, one of the first Black players in the NBA, who brought his Harlem Globetrotters showmanship to the Garden and made fans fall in love. They didn't win. But they built something — a fanbase, a tradition, a relationship between New York and basketball that has never broken."
  },

  {
    title: "Red Holzman: The Coach New York Never Forgot",
    team: "Knicks",
    charity: "Garden of Dreams Foundation | gardenofdreams.org", year: 1970,
    body: "Red Holzman coached the Knicks for 18 seasons. He won two championships. But what made him beloved wasn't the trophies — it was the way he coached. Hit the open man. See the ball. Play defense. Simple principles delivered without ego, without drama, without the volatility that defined so many coaches of his era. His players adored him. Walt Frazier, his greatest player, said Holzman treated everyone equally — stars and reserves, veterans and rookies. He was the son of Jewish immigrants from Brooklyn who grew up playing ball on the streets and never forgot where he came from. When he died in 1998, the entire basketball world stopped to remember a man who had made the game more beautiful simply by insisting it be played the right way."
  },

  {
    title: "Patrick Ewing: What New York Owes Its Greatest Knick",
    team: "Knicks",
    charity: "Garden of Dreams Foundation | gardenofdreams.org", year: 1985,
    body: "Patrick Ewing never won a championship in New York. He also never stopped trying. For 15 seasons he was the Knicks — the one constant through coaching changes, ownership drama, and roster upheaval. He carried them to the Finals in 1994, watching from the bench with a torn tendon as they lost Game 7 to Houston. He came back the next year and the year after that. When they traded him to Seattle in 2000, Madison Square Garden gave him a two-minute standing ovation. He cried. The city cried. The ring never came. But ask any New Yorker who came of age in the 1980s and 90s who their Knick was. It's always Patrick. Always. The city owes him more gratitude than it's ever properly given. In June 2026, the Knicks finally won it all again — and somewhere, Patrick Ewing was almost certainly courtside, smiling at a franchise that had carried his torch for over three decades."
  },

  {
    title: "The 1994 Knicks: So Close You Could Taste It",
    team: "Knicks",
    charity: "Garden of Dreams Foundation | gardenofdreams.org", year: 1994,
    body: "Game 7. NBA Finals. MSG. The Knicks against the Houston Rockets. Patrick Ewing had torn his tendon and was watching from the bench in street clothes. John Starks — the undrafted guard who had become the heart of the team — went 2-for-18. The Knicks lost 90-84. It remains the closest the Knicks have come to a championship since 1973. That team — Ewing, Starks, Charles Oakley, Anthony Mason, Derek Harper — was as tough and physical as any team in the league. Pat Riley coached them with military precision. They beat the Bulls. They went seven games with Indiana. They just couldn't get past Hakeem Olajuwon, who was playing the best basketball of his career. One championship. That's all New York needed. It didn't come."
  },

  // ── RANGERS ───────────────────────────────────────────────────────────────

  {
    title: "The Original Six Rangers: Three Cups Nobody Knows About",
    team: "Rangers",
    charity: "Garden of Dreams Foundation | gardenofdreams.org", year: 1940,
    body: "Before the 54-year drought, before the curse, the Rangers were champions. Three times. In 1928, their second season of existence, they won the Stanley Cup in five games over the Montreal Maroons. In 1933 they beat the Toronto Maple Leafs. And in 1940 — the last time before Messier's guarantee — they defeated the Maple Leafs again in six games. Bill Cook, the captain of those early teams, was one of the finest players of his era. Frank Boucher won the Lady Byng Trophy for gentlemanly play seven times — they eventually gave him the trophy to keep. Those early Rangers were a legitimate dynasty. Then the Second World War scattered their roster, the league changed, and the drought began. Most Rangers fans don't know their team has four Cups. Now you do."
  },

  {
    title: "Henrik Lundqvist: The King Who Deserved More",
    team: "Rangers",
    charity: "Garden of Dreams Foundation | gardenofdreams.org", year: 2012,
    body: "For 15 seasons, Henrik Lundqvist made saves that didn't seem possible. The butterfly technique perfected to an art form, the glove hand impossibly fast, the compete level never wavering. He won the Vezina Trophy in 2012. He backstopped the Rangers to the Stanley Cup Finals in 2014, nearly single-handedly. He made the All-Star team eight times. He was as good as anyone who ever played the position. And he never won a Cup as a Ranger. When injuries finally ended his time in New York in 2021, the Garden put up his number 30 in the rafters. He deserved it. He also deserved a ring. The hockey gods weren't paying attention."
  },

  {
    title: "The Drought: 54 Years Between Ranger Cups",
    team: "Rangers",
    charity: "Garden of Dreams Foundation | gardenofdreams.org", year: 1994,
    body: "From 1940 to 1994, the Rangers did not win the Stanley Cup. Fifty-four years. An entire generation of New York hockey fans grew old and died without seeing it. The chant from opposing fans — '1940! 1940!' — became the most effective taunt in sports. The Rangers got close. They made the Finals in 1950, 1972, 1979. They always found a way to lose. By the time the 1994 team came together around Mark Messier, the drought had become part of the franchise's identity — something between a tragedy and a badge of honor. When Messier lifted the Cup that June night at MSG, fans who had waited 54 years wept openly. Their fathers had waited. Their grandfathers had waited. It was finally over."
  },

  {
    title: "Rod Gilbert: The Ranger Who Never Got His Ring",
    team: "Rangers",
    charity: "Garden of Dreams Foundation | gardenofdreams.org", year: 1972,
    body: "Rod Gilbert played 18 seasons for the Rangers — all of them. He never won a Stanley Cup. He scored 406 goals and added 615 assists, making him the Rangers' all-time scoring leader at the time of his retirement. He played with a back so damaged by surgery that doctors told him he'd never play again — twice. He did anyway. He was the most popular Ranger of his era, a French-Canadian from Montreal who fell in love with New York and stayed forever. When he died in 2021, the tributes from all across hockey spoke of a man who had given everything to one franchise and never asked for more than the chance to compete. Number 7 hangs in the rafters at MSG. It will hang there forever."
  },

  // ── ISLANDERS ─────────────────────────────────────────────────────────────

  {
    title: "Bill Torrey and Al Arbour: The Architect and the Coach",
    team: "Islanders",
    charity: "NY Islanders Children's Foundation | nhl.com/islanders/community", year: 1980,
    body: "Every dynasty needs two things: someone to build it and someone to lead it. The Islanders had both in perfect harmony. Bill Torrey was a general manager of rare patience and vision — he drafted Mike Bossy, Bryan Trottier, Denis Potvin and Clark Gillies in consecutive years, building the foundation of four championships. He never panicked. He never chased short-term fixes. Al Arbour was the coach Torrey gave that roster — a former defenseman who had won Cups as a player and understood what it took. Arbour coached 1,607 NHL games, all but 50 of them with the Islanders. He won four Stanley Cups. He was demanding but fair, intense but warm. Together, Torrey and Arbour created something on Long Island that the hockey world still marvels at."
  },

  {
    title: "Mike Bossy: The Greatest Goal Scorer Nobody Talks About",
    team: "Islanders",
    charity: "NY Islanders Children's Foundation | nhl.com/islanders/community", year: 1981,
    body: "Mike Bossy scored 50 goals in each of his first nine NHL seasons. Nine straight. No one has come close before or since. He was told at the 1977 draft that he was soft, that he wouldn't fight, that NHL defenses would swallow him whole. Fifteen teams passed on him. Bill Torrey took him 15th overall. What followed was the greatest goal-scoring career of his era. Four Stanley Cups. The Conn Smythe Trophy in 1982. A lifetime shooting percentage so high that analysts still debate whether it was skill or something beyond skill. Back injuries forced him to retire at 30. He never played a single season without 50 goals. When he died in 2022, the hockey world lost one of its purest artists."
  },

  {
    title: "Denis Potvin: The Best Defenseman of His Era",
    team: "Islanders",
    charity: "NY Islanders Children's Foundation | nhl.com/islanders/community", year: 1979,
    body: "Before Bobby Orr's injuries ended his prime, the debate was simple: Orr was the best defenseman in hockey. After Orr, it was Denis Potvin — and it wasn't particularly close. Potvin won three Norris Trophies as the league's best defenseman. He was the captain of four championship teams. He could skate, shoot, pass and hit with equal ferocity. He was the engine that drove the Islanders' power play through their dynasty years. Rangers fans — still furious about a 1979 hit on Ulf Nilsson — chanted 'Potvin Sucks' for the next four decades. The chant actually became a Madison Square Garden tradition, played on the organ during stoppages. Potvin was inducted into the Hockey Hall of Fame in 1991. He did not suck."
  },

  {
    title: "The Dynasty Ends: What Happened After 1983",
    team: "Islanders",
    charity: "NY Islanders Children's Foundation | nhl.com/islanders/community", year: 1984,
    body: "In 1984, the Islanders faced the Edmonton Oilers in the Stanley Cup Finals for the second straight year. They had swept the Oilers in 1983. In 1984, the Oilers won in five games. Wayne Gretzky had learned from the loss. Mark Messier had grown up. The dynasty was over — not with a collapse, but with a handoff to a new generation. What's remarkable is how quickly it ended. The Islanders won 50 games in 1984-85 and were eliminated in the first round. The roster aged. Bossy's back gave out. The Nassau Coliseum, never a great building for revenue, fell further behind. The dynasty of 1980-83 remains one of the most dominant four-year runs in sports history. It just ended, as all dynasties do, faster than anyone expected."
  },

  // ── JETS ──────────────────────────────────────────────────────────────────

  {
    title: "Weeb Ewbank: The Coach Who Won Everything",
    team: "Jets",
    charity: "New York Jets Foundation | newyorkjets.com/community", year: 1969,
    body: "Weeb Ewbank is the only coach in professional football history to win championships in both the NFL and AFL. He won with the Baltimore Colts in 1958 and 1959 — including the Greatest Game Ever Played. Then he came to the Jets, spent seven years building something from nothing, and won Super Bowl III with Joe Namath over those same Colts. He was 61 years old. Ewbank was not flashy. He was an Ohio farm boy who believed in fundamentals, preparation, and treating his players like men. He let Namath be Namath — the nightlife, the fur coat, the guarantee. He understood that the talent was worth the complexity. When the Jets won 16-7 on January 12, 1969, Ewbank became the most accomplished coach in professional football. He deserved every word of it."
  },

  {
    title: "The Sack Exchange: Joe Klecko and the Most Feared Defense in Football",
    team: "Jets",
    charity: "New York Jets Foundation | newyorkjets.com/community", year: 1981,
    body: "In 1981, the New York Jets had the most terrifying defensive line in the NFL. Mark Gastineau with his sack dance. Marty Lyons with his relentlessness. Abdul Salaam. And at the center of it all, Joe Klecko — the toughest of the bunch, a blue-collar kid from Chester, Pennsylvania who played nose tackle, defensive end, and defensive tackle with equal dominance. The Sack Exchange, as they were called, led the NFL in sacks in 1981. Gastineau got the headlines. Klecko got the work done. It took 42 years, but in 2023 the Pro Football Hall of Fame finally inducted Klecko — one of the most deserving waits in Hall of Fame history. Green and white forever."
  },

  {
    title: "Dennis Byrd: The Comeback That Moved a City",
    team: "Jets",
    charity: "New York Jets Foundation | newyorkjets.com/community", year: 1992,
    body: "On November 29, 1992, Jets defensive end Dennis Byrd collided with a teammate at Giants Stadium and broke his neck. Doctors said he would never walk again. The Jets retired his number 90 immediately. The outpouring of support from New York was overwhelming — 45,000 letters arrived at his home in Oklahoma in the weeks after the injury. What followed was one of the great comeback stories in sports history. Through sheer will, intense rehabilitation and his deep Christian faith, Byrd walked onto the field at Giants Stadium the following season. He walked his daughter down the aisle at her wedding. He lived a full life until 2016, when he died in a car accident at 50. The number 90 still hangs retired for the Jets. It always will."
  },

  {
    title: "The 1969 Super Bowl: The Full Story of the Greatest Upset",
    team: "Jets",
    charity: "New York Jets Foundation | newyorkjets.com/community", year: 1969,
    body: "The Baltimore Colts were 18-point favorites. They had gone 15-1 during the regular season. Their quarterback, Earl Morrall, had been the NFL's MVP. The Jets were considered good but outclassed — a team from that other league, the AFL, playing the big boys for the first time in what everyone assumed would be a lopsided coronation. Joe Namath completed 17 of 28 passes for 206 yards and called his own plays at the line, reading the Colts defense with the precision of a chess master. Matt Snell ran for 121 yards. The Jets defense held the Colts to one touchdown. Final score: Jets 16, Colts 7. Namath walked off the field with his index finger raised. The AFL had arrived. Professional football would never be the same."
  },

  // ── GIANTS ────────────────────────────────────────────────────────────────

  {
    title: "Frank Gifford and the Boys: The 1950s Giants",
    team: "Giants",
    charity: "The Giants Foundation | giants.com/community", year: 1956,
    body: "Before the Super Bowl era, before television turned pro football into America's game, the New York Giants of the 1950s were the most glamorous team in the sport. Frank Gifford was their star — a USC All-American who was handsome enough to be a movie star and talented enough to be an All-Pro halfback. He ran, caught and occasionally threw the ball for a Giants team that won the NFL Championship in 1956. Kyle Rote. Charlie Conerly at quarterback, beloved despite his losing record. Sam Huff on defense. Vince Lombardi calling plays as offensive coordinator before he went to Green Bay and became a legend. The Giants of the 1950s played to sellout crowds at Yankee Stadium and made professional football fashionable in New York."
  },

  {
    title: "Wellington Mara: The Man Who Saved the NFL",
    team: "Giants",
    charity: "The Giants Foundation | giants.com/community", year: 1961,
    body: "In 1961, the NFL's small-market teams were struggling to compete financially with franchises in New York and Chicago. Wellington Mara — owner of the Giants, son of the founder — proposed something radical: all teams should share equally in television revenue, regardless of market size. It meant the Giants would receive the same money as the Green Bay Packers. It was an act of extraordinary generosity and long-term thinking. The NFL accepted. Revenue sharing became the foundation of competitive balance that defines pro football to this day. Without Wellington Mara's willingness to sacrifice his own financial advantage for the good of the league, the NFL as we know it — the most successful sports enterprise in American history — might never have emerged. The Giants won two Super Bowls in his lifetime. His bigger championship was the one he gave the whole league."
  },

  {
    title: "Lawrence Taylor: The Greatest Defensive Player Who Ever Lived",
    team: "Giants",
    charity: "The Giants Foundation | giants.com/community", year: 1986,
    body: "Lawrence Taylor changed the way football was played. Before LT, the outside linebacker was a secondary position — a support piece, not a difference-maker. After LT, every team in football tried to find one. Taylor was so disruptive — so fast, so powerful, so instinctively violent in his pursuit of the quarterback — that offensive coordinators had to redesign their entire blocking schemes around containing one player. He was the NFL's MVP in 1986, the only defensive player ever to win the award. He won two Super Bowls. He recorded 132.5 sacks in an era before sacks were an official statistic. He is the standard against which every defensive player since has been measured. None have reached it."
  },

  {
    title: "Super Bowl XLII: The Perfect Upset",
    team: "Giants",
    charity: "The Giants Foundation | giants.com/community", year: 2008,
    body: "The New England Patriots had gone 16-0 in the regular season. They were trying to become the first team in NFL history to finish 19-0. No one gave the Giants a chance. Then David Tyree caught a pass against his helmet with 35 seconds left, pinning it to his head with one hand while a Patriots defender tried to rip it away. The Giants scored on the next play. They won 17-14. The 2007 Patriots are still the only 16-0 team in NFL history — the perfect season that became the most famous loss in football history. Eli Manning, who had been mediocre for much of the season, was suddenly a Giant among men. The play is simply called The Helmet Catch. It needs no other explanation."
  },

  {
    title: "Phil Simms: The Quarterback Nobody Wanted",
    team: "Giants",
    charity: "The Giants Foundation | giants.com/community", year: 1987,
    body: "When the Giants drafted Phil Simms with the seventh overall pick in 1979, the New York crowd at Madison Square Garden — where the draft was held — booed. They had wanted Notre Dame's Joe Montana or Ohio State's Art Schlichter. They got a kid from Morehead State, a school so small that most scouts hadn't bothered watching him. What followed was 15 seasons of toughness, leadership, and one absolutely perfect afternoon. Super Bowl XXI, January 1987: Phil Simms completed 22 of 25 passes for 268 yards and three touchdowns. An 88 percent completion rate — still the most accurate Super Bowl performance in history. He was named MVP. The crowd that had booed him eight years earlier called him the greatest Giant who ever played."
  },

  // ── GENERAL NEW YORK ──────────────────────────────────────────────────────

  {
    title: "The 1994 New York Sports Year: When Everything Was Possible",
    team: "New York",
    charity: "Garden of Dreams Foundation | gardenofdreams.org", year: 1994,
    body: "In the spring of 1994, New York had three teams in three championship series simultaneously. The Rangers were winning the Stanley Cup. The Knicks were in the NBA Finals. The Yankees, before the strike ended their season, were on pace for 100 wins. It was the most electric sports moment the city had experienced since the early 1970s. The Rangers won. The Knicks lost in seven heartbreaking games to Houston. The baseball strike wiped out the World Series and left the Yankees without a title they were almost certain to claim. Two out of three — one perfect June night when Messier raised the Cup at MSG — made 1994 a year New York sports fans still talk about with a particular kind of wistfulness. We were so close to everything."
  },

  {
    title: "The Subway Series: New York vs. New York, October 2000",
    team: "New York",
    charity: "Garden of Dreams Foundation | gardenofdreams.org", year: 2000,
    body: "For the first time since 1956, the Yankees and Mets met in the World Series. The city was completely and beautifully at war with itself. Yankees fans and Mets fans who had been ignoring each other for decades were suddenly engaged in arguments that consumed every office, every subway car, every dinner table. Roger Clemens threw a broken bat at Mike Piazza. Derek Jeter hit a home run on the first pitch of Game 4 at midnight — becoming Mr. November. The Yankees won in five games. But the series itself — the tension, the shared geography, the tabloid back pages screaming every morning — was something New York had never quite experienced before and may never experience again. A city arguing with itself. The ultimate New York story."
  },

  {
    title: "New York Sports and 9/11: How the Games Helped Heal",
    team: "New York",
    charity: "Garden of Dreams Foundation | gardenofdreams.org", year: 2001,
    body: "In the weeks after September 11th, people debated whether sports even mattered. Then the games came back and answered the question. Mike Piazza's home run at Shea on September 21st. The Yankees winning three straight extra-inning World Series games in October — Tino Martinez tying Game 4 in the ninth, Scott Brosius doing the same in Game 5, Jeter's walk-off as Mr. November. The city needed something to cheer for together. It needed to sit next to strangers and share something joyful after so much grief. The Yankees lost the World Series in seven games, but the response of New York sports to that autumn — the players who volunteered, the moments that transcended the games themselves — remains one of the finest chapters in this city's relationship with its teams."
  },

  {
    title: "Yogi Berra: Beyond the Yogi-isms",
    team: "Yankees",
    charity: "New York Yankees Foundation | yankees.com/community", year: 1955,
    body: "Everyone knows the quotes. It ain't over till it's over. Nobody goes there anymore, it's too crowded. When you come to a fork in the road, take it. What gets lost in the Yogi-isms is the actual player — one of the greatest catchers in baseball history. Ten World Series rings. Three MVP awards. An 18-time All-Star. A man who grew up on The Hill in St. Louis, barely finished high school, and became the most beloved Yankee since Gehrig. He managed two teams to pennants in two different leagues. He served in the Navy on D-Day. He was small and squat and moved awkwardly and hit pitches that were six inches outside the strike zone for home runs. He was Yogi, which meant he was one of a kind — and New York loved him for every Yogi-ism and every moment between them."
  },

  {
    title: "The Back Page: How New York Tabloids Shaped NY Sports Culture",
    team: "New York",
    charity: "Garden of Dreams Foundation | gardenofdreams.org", year: 1970,
    body: "No city reads its sports teams the way New York does. The Daily News and the New York Post have been competing for the back page — the sports front page — since the middle of the 20th century, and the headlines they've produced are as much a part of NY sports history as the games themselves. AMAZIN'! after the '69 Mets. BUCKY BLEEPING DENT. YANKEES WIN! The Post's headline the morning after the 2000 Subway Series: BRONX BOMBERS DO IT AGAIN. The back page is where NY sports lives between games — where the feuds are started, the heroes celebrated, the villains buried. When something great or terrible happens to a New York team, the first thing fans want to know the next morning is: what did the back page say?"
  },

];

// Merge old and new deep dives into one pool
// ── 6 NEW DEEP DIVE ESSAYS ────────────────────────────────────────────────────

const DEEP_DIVES_EXTRA = [

  {
    title: "Lou, Marty and the Devils: New Jersey's Three Cups",
    team: "NJ Devils", year: 1995,
    charity: "NJ Devils Foundation | njdevils.com/community",
    body: "In 1982, a struggling Colorado Rockies franchise relocated to New Jersey and called themselves the Devils. Rangers fans laughed. Islanders fans ignored them. Twenty-two years later, they had won three Stanley Cups and produced the greatest goaltender of his generation. Lou Lamoriello arrived as general manager in 1987 and immediately established a culture unlike anything in professional hockey — strict, disciplined, team-first in every conceivable way. Players wore no names on the back of their jerseys during his tenure. There were no distractions, no drama, no excuses. Then came Martin Brodeur — drafted 20th overall in 1990 and developed into a 691-win goaltender who redefined the position. Brodeur played the puck like a third defenseman, killed penalties, handled shots with an athleticism that left forwards shaking their heads. The Devils won the Cup in 1995, sweeping Detroit. They won again in 2000 on a Jason Arnott overtime goal in Game 6 against Dallas. Then 2003, beating Anaheim in seven. Three championships in nine years — the most underappreciated dynasty in New York area sports history. Scott Stevens. Scott Niedermayer. Brodeur. Lamoriello. New Jersey had built something extraordinary, right across the river, while New York looked the other way."
  },

  {
    title: "Is It New York or New Jersey? The Most Complicated Question in Sports",
    team: "New York", year: 1984,
    charity: "NY Giants Foundation | giants.com/community | NY Jets Foundation | newyorkjets.com/community",
    body: "The New York Giants and New York Jets play in East Rutherford, New Jersey. They have never played a regular season game in New York State. The New Jersey Devils are called the Devils and play in Newark — but they are covered here as part of the NY metro sports family. The Brooklyn Nets began as the New Jersey Americans in 1967, became the New York Nets on Long Island, went back to New Jersey as the Nets, then crossed the river to Barclays Center in Brooklyn in 2012. The New York Red Bulls play in Harrison, New Jersey. MetLife Stadium — home of the Giants and Jets — hosted Super Bowl XLVIII in February 2014, the first outdoor cold-weather Super Bowl in NFL history. The teams called it a New York Super Bowl. The host committee was the New York New Jersey Super Bowl Host Committee. Nobody could quite agree. What makes a team a New York team? It isn't geography — it's identity, fanbase, media market, and history. The Giants have been 'New York' since 1925. The Jets since 1963. The Devils since they stopped being Colorado. The lines have always been blurry in the greatest sports market in the world. And honestly? That's part of what makes it interesting."
  },

  {
    title: "Soccer in New York: From Pelé to the Future",
    team: "New York", year: 1977,
    charity: "NYCFC Foundation | nycfc.com/foundation | NY Red Bulls Foundation | newyorkredbulls.com/community",
    body: "The story of soccer in New York is a story of impossible peaks and patient rebuilding. It started with the Cosmos — the most glamorous soccer club America has ever seen, with Pelé and Beckenbauer playing at Giants Stadium before 77,000 fans. When the NASL collapsed in 1984 the dream seemed dead. Then the MetroStars arrived in 1996 as a founding MLS club, eventually becoming the New York Red Bulls under Red Bull's ownership. In 2015 NYCFC launched as the league's second New York team, backed by Manchester City's ownership group, playing at Yankee Stadium to sellout crowds. They won the MLS Cup in 2021. Meanwhile on the women's side, NJ/NY Gotham FC won the NWSL Championship in 2023 and are currently building a dedicated stadium in Queens — the first soccer-specific stadium in New York City. The Red Bulls are building their own training complex. NYCFC is finalizing their own stadium plans. Soccer in New York has never been stronger. The generation that grew up watching the 1994 World Cup hosted in New York is now in their 40s and bringing their kids to matches. The next chapter — dedicated stadiums, homegrown stars, a real soccer culture — is being written right now."
  },

  {
    title: "Women's Sports in New York: The Rising Tide",
    team: "New York", year: 1997,
    charity: "Brooklyn Nets & NY Liberty Foundation | netslibertyfoundation.org | Gotham FC Foundation | nj-nysc.com",
    body: "In 1997, the WNBA launched with eight founding franchises. The New York Liberty was one of them. For 27 years they played in MSG's shadow, drawing respectable crowds but never capturing the city the way the Knicks did. Rebecca Lobo, Teresa Weatherspoon, Cappie Pondexter — great players who deserved more attention than they got. Then Breanna Stewart arrived and everything changed. In 2024, Stewart led the Liberty to their first WNBA championship. The Garden erupted. The city finally noticed. At the same time, NJ/NY Gotham FC was building something remarkable on the women's soccer side — winning the NWSL Championship in 2023 and breaking ground on a new dedicated stadium in Queens that will be the first women's soccer-specific stadium in the United States. New York women's sports is having its greatest moment. Attendance is up. Coverage is up. Investment is up. The Liberty sellout Barclays Center. Gotham FC draws passionate crowds. A generation of young girls in New York is growing up with champions to root for who look like them. That is the real championship."
  },

  {
    title: "The Nets: From Dr. J to Brooklyn, A Journey Unlike Any Other",
    team: "Nets", year: 2002,
    charity: "Brooklyn Nets & NY Liberty Foundation | netslibertyfoundation.org",
    body: "The franchise that became the Brooklyn Nets has had more identities than any team in professional sports. They began in 1967 as the New Jersey Americans in the ABA. They became the New York Nets and moved to Long Island, where Julius Erving — Dr. J — made them the most exciting team in basketball. His soaring dunks, his impossible finishes, his elegance in the air defined an era. They won two ABA championships in 1974 and 1976. Then came the merger with the NBA and a decision that still stings: to join the NBA, the Nets had to pay a territorial fee to the Knicks. They sold Dr. J to Philadelphia to cover it. The dynasty ended before it began. They moved back to New Jersey, struggled for years, then finally built something around Jason Kidd in the early 2000s — two straight NBA Finals appearances in 2002 and 2003, losing both times but establishing themselves as legitimate contenders. Then more wandering. A move to Brooklyn in 2012. The Kevin Durant and Kyrie Irving superteam that never quite came together. Now a rebuild, a young core, a franchise searching again for its identity. The Nets have always lived in the Knicks' considerable shadow. But their story — from Dr. J's impossible flight to Jason Kidd's no-look passes to the promise of what comes next — is one of the great untold stories in New York sports."
  },

  {
    title: "Forgotten Heroes: The Players New York Should Remember",
    team: "New York", year: 1986,
    charity: "Garden of Dreams Foundation | gardenofdreams.org",
    body: "Every championship team has players the history books undervalue. Mark Bavaro caught everything Eli Manning's predecessors could throw and blocked like a pulling guard — the most complete tight end of his era, somehow overlooked. Dave DeBusschere was the defensive engine of those Knicks championship teams, the forward who guarded the other team's best player every night so Frazier and Reed could shine. Butch Goring arrived in Long Island in 1980 and the Islanders immediately won four straight Cups — his spark and leadership the missing piece Bill Torrey had been searching for. Clark Gillies was the enforcer and heart of those same Islanders, the forward who made space for Bossy and Trottier by being the last player anyone wanted to fight. Cleon Jones caught the final out of the 1969 World Series on his knees and has spent 50 years being overshadowed by the pitchers who got them there. Jesse Orosco leaping into Gary Carter's arms after the final out in 1986. Tommy Henrich, 'Old Reliable,' the Yankee who delivered in October after October without ever becoming a household name. New York has always loved its superstars. Sometimes the heroes who made the superstars possible deserve a moment too."
  },
,

  {
    title: "53 Years: The Full Story of the 2026 Knicks Championship",
    team: "Knicks", year: 2026,
    charity: "Garden of Dreams Foundation | gardenofdreams.org",
    body: "Fifty-three years. That's how long New York waited between Knicks championships -- longer than the Rangers' famous 54-year Stanley Cup drought, longer than most of the people celebrating in the streets on June 13th had been alive. The 2026 Knicks didn't just end the wait. They ended it in a way that felt, somehow, perfectly Knicks -- chaotic, nerve-wracking, and ultimately triumphant. The story starts in the summer of 2022, when New York handed Jalen Brunson a four-year, $104 million contract. The reaction was skepticism bordering on mockery -- a 6-foot-1 guard, a second-round pick, the son of a journeyman who'd bounced around the league. People called it an overpay. Brunson spent the next four seasons making that contract look like the bargain of the decade. The front office built around him with purpose: Mikal Bridges and OG Anunoby for two-way wing depth, Josh Hart for relentless energy, and ahead of the 2024-25 season, a trade for Karl-Anthony Towns that finally gave the Knicks the stretch-five they'd lacked for a generation. Then in the summer of 2025, New York hired Mike Brown as head coach -- the 24th coach since the 1973 championship. Nobody knew yet that he'd be the one to finally get it done. The 2025-26 regular season was good, not great. But something clicked in the playoffs. The first round against Atlanta went six games, the Knicks falling behind 2-1 before winning three straight to close it out. Then came a sweep of Philadelphia in the second round. Then a sweep of Cleveland in the Eastern Conference Finals -- New York's first trip to the NBA Finals since 1999, achieved by outscoring opponents by 271 points across 14 playoff games, the largest such margin in NBA history entering a Finals. Brunson was named Eastern Conference Finals MVP, unanimously. The Finals against the San Antonio Spurs and Victor Wembanyama began about as well as a Finals can begin -- the Knicks won both road games in San Antonio, extending their postseason winning streak to 13 straight, the second-longest in NBA history. Then the Spurs won Game 3 at the Garden, and Game 4 became one of the strangest, most dramatic games in Finals history: San Antonio led by 29 points at halftime. The Knicks didn't just claw back -- they completed the largest comeback in NBA playoff history, winning 107-106. Of the 38 previous teams to fall behind 3-1 in the Finals, only one had ever come back to win it. The Spurs, a young and talented team, had two days to recover before Game 5 in San Antonio. It didn't matter. Jalen Brunson scored 45 points -- 15 of them in the final 7:43 of regulation, including 13 straight at one stretch -- as the Knicks erased a double-digit deficit one final time and won 94-90. The Larry O'Brien Trophy was heading to New York for the first time since 1973. Brunson's 45 points matched Michael Jordan's 1998 total for the most ever scored on the road in a title-clinching Finals game. The Finals MVP vote was unanimous -- all 11 voters. At 6-foot-1, he became the second-shortest Finals MVP in NBA history, behind only Isiah Thomas. And he became the fourth player ever to win Finals MVP after being drafted in the second round -- joining Dennis Johnson, Nikola Jokic, and a Knicks legend named Willis Reed, who delivered New York's first two championships in 1970 and 1973. After the final buzzer, Brunson found his father Rick -- a Knicks assistant coach -- for an embrace that said everything words couldn't. Walt 'Clyde' Frazier, who led those 1970 and 1973 teams, watched it all happen and had nothing but praise for what he'd just witnessed. Fifty-three years of heartbreak -- Ewing's torn tendon in 1994, the playoff disappointments, the Dolan-era dysfunction, all of it -- gave way to something New York had almost stopped letting itself hope for. The Knicks are NBA Champions. Again. Finally. And with Brunson, Towns, Bridges, Anunoby and Hart all under contract, with Mike Brown established as exactly the right coach, this doesn't look like a one-year miracle. It looks like the beginning."
  }
];


const ALL_DEEP_DIVES = DEEP_DIVES.concat(DEEP_DIVES_NEW).concat(DEEP_DIVES_EXTRA);

// ── MONDAY: BY THE NUMBERS ────────────────────────────────────────────────────
const BY_THE_NUMBERS = [
  { number:"27", label:"Yankee World Series Championships", story:"More than any franchise in North American professional sports. The next closest is the St. Louis Cardinals with 11. The Yankees have won more championships than some entire sports leagues have played seasons." },
  { number:"56", label:"DiMaggio's Consecutive Game Hitting Streak", story:"Set in 1941. Still standing 83 years later. The sabermetric community has calculated that the odds of it ever being broken are astronomically small — something like 1 in 10,000 over the next century of baseball." },
  { number:"17", label:"Point Underdog — Jets in Super Bowl III", story:"Joe Namath guaranteed victory anyway. Then delivered. It remains one of the greatest upsets in sports history and directly led to the AFL-NFL merger that created the modern NFL." },
  { number:"4", label:"Consecutive Stanley Cups — NY Islanders", story:"1980 through 1983. Nineteen consecutive playoff series wins. The Islanders dynasty is criminally underappreciated in NY sports history. They were as dominant as any team, anywhere, at any time." },
  { number:"2,632", label:"Consecutive Games Played — Cal Ripken Jr.", story:"Lou Gehrig's record was 2,130 games — set as a Yankee. The Iron Horse's streak defined an era of New York baseball and stands as one of sport's most remarkable feats of durability and dedication." },
  { number:"100-to-1", label:"Odds on the 1969 Mets at Season Start", story:"The most improbable championship in baseball history. Tom Seaver went 25-7. Gil Hodges managed brilliantly. And New York fell in love with the team nobody believed in — until everybody did." },
  { number:"9", label:"Consecutive 50-Goal Seasons — Mike Bossy", story:"The Islanders legend scored 50+ goals in each of his first nine NHL seasons. A record that will almost certainly never be broken in the modern era of defensive hockey and goalie equipment." },
  { number:"73", label:"Points — Mark Messier's 1991-92 Season with Rangers", story:"The Captain's best regular season in New York. Two years later he'd deliver the guarantee, the hat trick, and the Cup. But this season showed what the Rangers had acquired when they traded for Messier." },
  { number:"3,465", label:"Career Hits — Derek Jeter", story:"6th all-time in MLB history. All of them as a Yankee. In an era of performance-enhancing drugs, Jeter's numbers were built the old-fashioned way. Every hit earned, every game played with the same intensity." },
  { number:"0.406", label:"Ted Williams' .406 Average — Last .400 Season", story:"Hit against the Yankees, among others. No player has batted .400 since 1941. Williams went 6-for-8 on the final day of the season to push over .400, refusing to sit out and protect the number." },
  { number:"54", label:"Years Between Rangers Championships", story:"1940 to 1994. Two generations of Rangers fans lived and died without seeing the Cup. When Messier lifted it at MSG in June 1994, grown men wept openly on Seventh Avenue." },
  { number:"77,000", label:"Fans at Giants Stadium for NY Cosmos vs. Tampa Bay — 1977", story:"The largest soccer crowd in North American history at the time. Pelé, Beckenbauer, Carlos Alberto — and a city that fell briefly, beautifully in love with the beautiful game." },
];

// ── TUESDAY: QUOTES ───────────────────────────────────────────────────────────
const NY_QUOTES = [
  { quote:"I guarantee it.", who:"Joe Namath", context:"Before Super Bowl III, January 1969. The Jets were 17-point underdogs. They won 16-7.", team:"Jets" },
  { quote:"Ya Gotta Believe!", who:"Tug McGraw", context:"August 1973, as the Mets rallied from last place to win the NL pennant. Became the rallying cry of a generation.", team:"Mets" },
  { quote:"We will win tonight. I guarantee it.", who:"Mark Messier", context:"Before Game 6 of the 1994 Eastern Conference Finals. He then scored a hat trick in the third period.", team:"Rangers" },
  { quote:"The name's Reggie Jackson, and I'm the straw that stirs the drink.", who:"Reggie Jackson", context:"Shortly after joining the Yankees in 1977. He then hit three home runs on three pitches in the World Series.", team:"Yankees" },
  { quote:"I don't care what people think. I never have and I never will.", who:"Derek Jeter", context:"After endless media scrutiny during his career. Jeter remained the model of professionalism for 20 seasons.", team:"Yankees" },
  { quote:"How can you not be romantic about baseball?", who:"Billy Beane", context:"Technically about Oakland, but no city is more romantic about baseball than New York — two teams, two boroughs, one heartbeat.", team:"General" },
  { quote:"The Most Valuable Player award should be mine. I had the best year.", who:"Reggie Jackson", context:"1977. He backed it up with a World Series performance for the ages.", team:"Yankees" },
  { quote:"Every day I go out there, I feel like it's the most important game of my life.", who:"Mike Piazza", context:"The greatest hitting catcher in baseball history spent his prime years at Shea, including that September 21, 2001 home run.", team:"Mets" },
  { quote:"I want to thank the Good Lord for making me a Yankee.", who:"Joe DiMaggio", context:"The Yankee Clipper's most famous quote. 56-game hitting streak, 9 championships, one of the most elegant athletes ever to play the game.", team:"Yankees" },
  { quote:"These are the Amazin' Mets.", who:"Casey Stengel", context:"Stengel managed the original 1962 Mets who went 40-120 — and somehow made New York fall in love with them anyway.", team:"Mets" },
  { quote:"To play 18 years in Yankee Stadium is the greatest thing that could happen to a ballplayer.", who:"Mickey Mantle", context:"At his retirement press conference, 1969. The Commerce Comet played in pain for most of his career and still hit 536 home runs.", team:"Yankees" },
  { quote:"I want to be the Michael Jordan of hockey.", who:"Mike Bossy", context:"Bossy said this early in his career. He then went out and scored 50+ goals nine straight seasons, winning four Stanley Cups.", team:"Islanders" },
  { quote:"This city deserves a winner.", who:"Patrick Ewing", context:"Said many times throughout his Knicks career. Ewing never got that ring. New York never stopped loving him anyway.", team:"Knicks" },
  { quote:"I guarantee this ball club will win more games than it loses.", who:"George Steinbrenner", context:"The Boss, in 1973, after buying the Yankees for $10 million. They went on to win 7 pennants and 4 World Series under his ownership.", team:"Yankees" },
  { quote:"There's no traffic after you win.", who:"Bill Parcells", context:"The Giants coach's deadpan response to a question about the Super Bowl parade route in 1987. They won. There was no traffic.", team:"Giants" },
  { quote:"Holy Cow!", who:"Phil Rizzuto", context:"The Scooter's signature call, used for everything from home runs to thunderstorms to birthday announcements during Yankee broadcasts.", team:"Yankees" },
];

// ── WEDNESDAY: STADIUMS ───────────────────────────────────────────────────────
const STADIUMS = [
  {
    name: "The Original Yankee Stadium",
    years: "1923-2008",
    nickname: "The House That Ruth Built",
    story: "Opened April 18, 1923 — Babe Ruth hit a three-run home run in the first game. Over 85 years it hosted 26 World Series championships, Joe DiMaggio, Mickey Mantle, Thurman Munson, Reggie Jackson and Derek Jeter. Muhammad Ali fought there. The Pope held Mass there. When it closed in 2008, grown men cried in the upper deck. No building in American sports history held more history.",
    teams: "Yankees"
  },
  {
    name: "Shea Stadium",
    years: "1964-2008",
    nickname: "The House of Noise",
    story: "The Beatles played there in 1965 — the first stadium rock concert in history. The 1969 Miracle Mets won the World Series there. Mike Piazza hit the most emotional home run in baseball history there on September 21, 2001. Game 6 of the 1986 World Series. The Mets faithful were loud, passionate, and occasionally heartbroken — but always there. When it was demolished in 2009, the wrecking ball wore a Mets uniform.",
    teams: "Mets"
  },
  {
    name: "Madison Square Garden",
    years: "1968-present",
    nickname: "The World's Most Famous Arena",
    story: "The fourth building to carry the name. Willis Reed limped out. Patrick Ewing soared. Mark Messier raised the Cup. Bernard King dropped 60 points. Walt Frazier glided. Every great moment in Knicks and Rangers history happened in this building. The Garden is not just an arena — it's a state of mind. When MSG is loud, there is no louder building on earth.",
    teams: "Knicks, Rangers"
  },
  {
    name: "Giants Stadium",
    years: "1976-2010",
    nickname: "The Meadowlands",
    story: "Built in the New Jersey swamps, shared by the Giants and Jets — and briefly the Cosmos, who packed it with 77,000 fans to watch Pelé. Lawrence Taylor terrorized quarterbacks there for 13 seasons. The Giants won two Super Bowls with teams built in that building. Joe Namath's last game as a Jet. Phil Simms' perfect Super Bowl. Cold, windy, and magnificent. MetLife Stadium replaced it — but the Meadowlands had the soul.",
    teams: "Giants, Jets"
  },
  {
    name: "Nassau Veterans Memorial Coliseum",
    years: "1972-2015",
    nickname: "The Nassau Coliseum / The Mausoleum",
    story: "They called it the Mausoleum — a brutal nickname for a building that hosted one of the greatest dynasties in sports history. Four straight Stanley Cups. Mike Bossy, Bryan Trottier, Denis Potvin, Billy Smith. The Islanders owned this building from 1980 to 1983. It held just 16,000 people and shook like a tin can when the crowd got going. Small, loud, passionate — everything a hockey arena should be.",
    teams: "Islanders"
  },
  {
    name: "Citi Field",
    years: "2009-present",
    nickname: "Home of the Mets",
    story: "Built next to where Shea Stadium stood, honoring its predecessor with a Jackie Robinson Rotunda at the entrance. The field dimensions finally gave Mets pitchers a chance. David Wright's last game. Noah Syndergaard throwing in the 2015 World Series. The 2016 team that nearly made it. A young stadium still building its memories — but the Amazin' faithful fill it with the same noise and hope they always have.",
    teams: "Mets"
  },
  {
    name: "Yankee Stadium (New)",
    years: "2009-present",
    nickname: "The New Cathedral",
    story: "Opened in 2009 — the same year the Yankees won their 27th championship. Derek Jeter's walk-off single in his final home game. Aaron Judge breaking the AL home run record in 2022. The most expensive stadium ever built at the time of construction, it sits directly across the street from where the original stood. The ghosts moved across River Avenue without complaint.",
    teams: "Yankees"
  },
  {
    name: "Polo Grounds",
    years: "1880-1964",
    nickname: "The Shot Heard Round the World",
    story: "Home of the Giants, Yankees, and Mets at various points in history. Bobby Thomson hit the Shot Heard Round the World there in 1951. Willie Mays made The Catch there in 1954. The original New York football Giants played there. Babe Ruth hit home runs there before Yankee Stadium was built. When it was demolished in 1964, a city lost one of its oldest sports cathedrals.",
    teams: "Giants (baseball), Yankees, Mets"
  },
  {
    name: "UBS Arena",
    years: "2021-present",
    nickname: "The New Barn",
    story: "The Islanders finally came home — sort of. Built adjacent to the old Nassau Coliseum site at Elmont, UBS Arena opened in 2021 as one of the most modern hockey arenas in North America. Matthew Schaefer's era begins here. The ghosts of Bossy, Trottier and Potvin watch from the rafters as a new generation of Islanders tries to bring the Cup back to Long Island.",
    teams: "Islanders"
  },
  {
    name: "Red Bull Arena",
    years: "2010-present",
    nickname: "Harrison's Hidden Gem",
    story: "Tucked away in Harrison, New Jersey, Red Bull Arena is one of the best soccer-specific stadiums in MLS — intimate, loud, and designed for the sport. The Red Bulls have never won MLS Cup but have built some of the most passionate supporter sections in American soccer. On a crisp October night with the supporters' section in full voice, there's nowhere quite like it.",
    teams: "NY Red Bulls"
  },
];

// ── THURSDAY: RIVALRIES ───────────────────────────────────────────────────────
const RIVALRIES = [
  {
    matchup: "Yankees vs Red Sox",
    subtitle: "The Greatest Rivalry in American Sports",
    story: "It started with the Babe Ruth sale in 1920 — Boston sold Ruth to New York for $100,000. The Red Sox didn't win again until 2004. 84 years of the Curse of the Bambino. Bucky Dent's home run in 1978. Aaron Boone in 2003. David Ortiz in 2004. The rivalry has produced more drama, more heartbreak, and more pure baseball than any other matchup in the sport's history.",
    teams: "Yankees vs Red Sox"
  },
  {
    matchup: "Rangers vs Islanders",
    subtitle: "The Battle of New York on Ice",
    story: "Rangers fans hate the Islanders. Islanders fans hate the Rangers. Both groups are correct. The rivalry peaked in the early 1980s when the Islanders were winning Cups and the Rangers were watching. Physical, emotional, and deeply personal — every game between these two is a referendum on which half of New York owns the ice.",
    teams: "Rangers vs Islanders"
  },
  {
    matchup: "Knicks vs Heat",
    subtitle: "The Nastiest Rivalry of the 1990s",
    story: "Pat Riley left the Knicks for Miami and the rivalry was born. Patrick Ewing vs. Alonzo Mourning. Charles Oakley enforcing. P.J. Brown throwing Charlie Ward. Seven playoff series in eight years. Neither team won a championship during the rivalry's peak, but they certainly prevented the other from getting one. The nastiest, most physical basketball of the decade.",
    teams: "Knicks vs Heat"
  },
  {
    matchup: "Giants vs Eagles",
    subtitle: "The NFC East's Most Heated Border War",
    story: "New York vs. Philadelphia. Classy vs. brutal. Every game feels like a street fight. Lawrence Taylor vs. Randall Cunningham. The snowball game. The fake spike. Three decades of late-season games with playoff implications riding on every snap. Eagles fans boo Santa Claus. Giants fans have two Super Bowls. The argument continues.",
    teams: "Giants vs Eagles"
  },
  {
    matchup: "Mets vs Yankees",
    subtitle: "The Subway Series",
    story: "They share a city, a tabloid back page, and a burning desire to outdo each other. The 2000 World Series — Yankees vs. Mets — was the only Subway Series in modern history. The Yankees won in five games. Roger Clemens threw a broken bat at Mike Piazza. Derek Jeter homered in extra innings. For one October, New York was completely and beautifully at war with itself.",
    teams: "Mets vs Yankees"
  },
  {
    matchup: "Jets vs Giants",
    subtitle: "Two Teams, One Stadium, Zero Harmony",
    story: "They share MetLife Stadium and have never played a regular season game against each other in that building. The rivalry is more civic than competitive — Jets fans wearing green in a sea of Giants blue, arguing about who owns New Jersey. The Jets have one Super Bowl. The Giants have four. The argument about whose stadium it really is will never be settled.",
    teams: "Jets vs Giants"
  },
  {
    matchup: "Rangers vs Devils",
    subtitle: "The Hudson River Rivalry",
    story: "The Devils left Colorado in 1982 and moved to New Jersey, immediately becoming the Rangers' most hated neighbor. Martin Brodeur vs. Mike Richter. Scott Stevens delivering hits. The rivalry peaked in the 1994 Eastern Conference Finals when Messier guaranteed victory and delivered. Three Stanley Cups later, the Devils had the last laugh — but the Garden still boos them loudest.",
    teams: "Rangers vs Devils"
  },
  {
    matchup: "Knicks vs Bulls",
    subtitle: "When Michael Jordan Owned New York",
    story: "Six times the Knicks and Bulls met in the playoffs. Six times Chicago won. Michael Jordan averaged 31 points per game against New York. Patrick Ewing gave everything he had and it was never quite enough. The rivalry defined the early 1990s — brilliant, physical, and ultimately heartbreaking for everyone in blue and orange.",
    teams: "Knicks vs Bulls"
  },
];


// ── WEDNESDAY DRAFT CONTENT (39 entries — 3 drafts per 1 stadium) ────────────

const DRAFT_ENTRIES = [

  // ── YANKEES DRAFT ─────────────────────────────────────────────────────────
  {
    title: "Derek Jeter: The Pick That Defined a Franchise",
    team: "Yankees",
    charity: "New York Yankees Foundation | yankees.com/community", year: 1992, sport: "MLB",
    body: "In 1992, the Yankees held the sixth overall pick in the amateur draft. They used it on a skinny 18-year-old shortstop from Kalamazoo, Michigan named Derek Jeter. He cried when they called his name. Scouts loved his instincts and his makeup but worried he'd hit enough to play at the major league level. He hit .202 in rookie ball that first summer. The Yankees didn't panic. By 1996 he was the starting shortstop on a World Series champion. By 2000 he was the World Series MVP. By 2014 he was the Captain walking off the field after a walk-off single in his final home game. The sixth pick in 1992 became the most important pick in Yankees history."
  },
  {
    title: "How the Yankees Build: Scouting, Development and the Pipeline",
    team: "Yankees",
    charity: "New York Yankees Foundation | yankees.com/community", year: 2000, sport: "MLB",
    body: "The Yankees aren't just a big-market team that buys championships. They're also one of the finest player development organizations in baseball. The pipeline that produced Bernie Williams, Jorge Posada, Andy Pettitte and Mariano Rivera — the Core Four — was built through scouting and patience, not free agency. Rivera was an undrafted signing from Panama. Posada was a 24th-round pick. The Yankees' ability to draft, sign internationally, and develop players has been as important to their dynasty as any free agent acquisition. When they get both right — homegrown core plus targeted free agents — they're nearly impossible to beat."
  },

  // ── METS DRAFT ────────────────────────────────────────────────────────────
  {
    title: "Darryl Strawberry: The First Pick and the Promise",
    team: "Mets",
    charity: "Amazin' Mets Foundation | mets.com/community", year: 1980, sport: "MLB",
    body: "In 1980, the Mets had the first overall pick in the amateur draft. They selected Darryl Strawberry, a 6-foot-6 outfielder from Los Angeles with a swing that looked like it was designed by an artist. He arrived in New York in 1983 and was immediately the most exciting young player in the National League — Rookie of the Year, eight All-Star selections, the most feared right-handed power hitter of his generation. The Mets had Strawberry and Gooden at the same time and won one championship when they should have won three or four. The what-ifs are painful. But that 1980 draft pick — the very first selection — was as good as any the franchise ever made."
  },
  {
    title: "Dwight Gooden: The Pick That Was Almost Perfect",
    team: "Mets",
    charity: "Amazin' Mets Foundation | mets.com/community", year: 1982, sport: "MLB",
    body: "The Mets took Dwight Gooden with the fifth pick of the 1982 draft. He was 17 years old, from Tampa, and threw a fastball that made scouts' radar guns nervous. Within two years he was in the majors. Within three he was having one of the greatest pitching seasons in baseball history — 24-4, a 1.53 ERA, 268 strikeouts. The K Korner at Shea Stadium became a cultural institution. Gooden was supposed to be the face of the franchise for a decade. The story of what followed is complicated and has been told enough. What deserves more celebration is the draft pick itself — a 17-year-old from Tampa who arrived at Shea Stadium and immediately became the most electrifying pitcher in baseball."
  },
  {
    title: "Jacob deGrom: The Pick Who Came From Nowhere",
    team: "Mets",
    charity: "Amazin' Mets Foundation | mets.com/community", year: 2010, sport: "MLB",
    body: "The Mets drafted Jacob deGrom in the ninth round of the 2010 draft as a shortstop. He threw hard enough that they converted him to pitching. He spent four years in the minor leagues. In 2014, at age 26, he made his major league debut and won the NL Rookie of the Year Award. In 2018 and 2019 he won back-to-back Cy Young Awards with ERAs so low they seemed like typos. A ninth-round shortstop became the best pitcher in baseball. The Mets eventually couldn't afford to keep him — he signed with Texas after the 2022 season. But for those years at Citi Field, watching deGrom pitch was watching something that didn't seem possible from a human being."
  },

  // ── KNICKS DRAFT ──────────────────────────────────────────────────────────
  {
    title: "The 1985 NBA Draft Lottery: Did the Knicks Need Help?",
    team: "Knicks",
    charity: "Garden of Dreams Foundation | gardenofdreams.org", year: 1985, sport: "NBA",
    body: "The 1985 NBA Draft Lottery was the first of its kind — a process designed to prevent teams from tanking for top picks. Seven teams had equal odds. The ping pong balls were loaded into an envelope. When David Stern reached in and pulled out the first envelope, it revealed the New York Knicks — winners of the right to select Patrick Ewing first overall. Instantly, conspiracy theories erupted. A bent corner on the envelope. The envelope being cold from a refrigerator. None of it was ever proven. What was proven: Patrick Ewing was the most dominant college player in the country, and the Knicks got him. Whether the basketball gods or something else arranged it, New York got their center for the next 15 years."
  },
  {
    title: "Walt Frazier: The Draft Pick Who Became Clyde",
    team: "Knicks",
    charity: "Garden of Dreams Foundation | gardenofdreams.org", year: 1967, sport: "NBA",
    body: "The Knicks took Walt Frazier with the fifth pick of the 1967 NBA Draft out of Southern Illinois. He arrived in New York and immediately fit — the style, the swagger, the cool. He bought a Rolls-Royce and wore a wide-brimmed hat that earned him the nickname Clyde, after the Bonnie and Clyde film. On the court he was the perfect point guard for Red Holzman's system — smart, unselfish, a defensive genius who could also score when the team needed it. In Game 7 of the 1970 NBA Finals, Frazier scored 36 points and added 19 assists — one of the great individual performances in Finals history. The draft pick who became Clyde became one of the most beloved Knicks ever."
  },

  // ── RANGERS DRAFT ─────────────────────────────────────────────────────────
  {
    title: "Henrik Lundqvist: The Seventh-Round Pick Who Became The King",
    team: "Rangers",
    charity: "Garden of Dreams Foundation | gardenofdreams.org", year: 2000, sport: "NHL",
    body: "In 2000, the Rangers used their seventh-round pick — the 205th overall selection — on a Swedish goaltender named Henrik Lundqvist. Seventh round. 205th overall. The players taken before him are mostly forgotten. Lundqvist went on to play 15 seasons for the Rangers, win the Vezina Trophy, make eight All-Star teams, and carry the franchise to the Stanley Cup Finals in 2014. He made saves that goalies aren't supposed to make with a calm that suggested the moment never got too big. The most productive seventh-round pick in Rangers history — and one of the best late-round picks in NHL history — came to Madison Square Garden and became The King."
  },
  {
    title: "The Draft That Built the 1994 Rangers",
    team: "Rangers",
    charity: "Garden of Dreams Foundation | gardenofdreams.org", year: 1994, sport: "NHL",
    body: "The Rangers' 1994 championship wasn't built through the draft — it was built through trades and free agency. Mark Messier came from Edmonton. Brian Leetch was their one great draft pick, taken ninth overall in 1986. But what makes the 1994 team instructive is how general manager Neil Smith constructed it: a homegrown core of Leetch and Mike Richter, surrounded by veterans acquired through smart trading. Messier. Glenn Anderson. Craig MacTavish. Esa Tikkanen. The lesson: you need great drafting AND great trading to build a championship. The Rangers had both in 1994. The balance of home-grown talent and experienced acquisitions is still the model every NHL team aspires to."
  },

  // ── ISLANDERS DRAFT ───────────────────────────────────────────────────────
  {
    title: "The Draft That Built a Dynasty: Potvin, Trottier, Bossy, Gillies",
    team: "Islanders",
    charity: "NY Islanders Children's Foundation | nhl.com/islanders/community", year: 1977, sport: "NHL",
    body: "Bill Torrey's masterpiece wasn't a single draft — it was four consecutive drafts that built an empire. Denis Potvin in 1973, first overall. Clark Gillies in 1974, fourth overall. Bryan Trottier in 1974, 22nd overall — a steal. Mike Bossy in 1977, 15th overall — passed on by 14 teams who thought he was too soft. In four drafts, Torrey assembled the defensive anchor, the power forward, the center and the pure goal scorer of a dynasty. Each pick was made with patience and conviction against conventional wisdom. Potvin was obvious. Trottier at 22 was brilliant. Bossy at 15 — after 14 teams said no — was genius. This is how championships are built: one draft at a time, by people who see what others miss."
  },
  {
    title: "Matthew Schaefer: The Future Arrives on Long Island",
    team: "Islanders",
    charity: "NY Islanders Children's Foundation | nhl.com/islanders/community", year: 2025, sport: "NHL",
    body: "In 2025, the New York Islanders held the first overall pick in the NHL Draft. They selected Matthew Schaefer, an 18-year-old defenseman from Erie of the OHL who some scouts compared — carefully — to Denis Potvin. Schaefer won the Calder Trophy as the NHL's Rookie of the Year in 2026, becoming the first Islander to win the award and the first number-one overall pick in franchise history. The rebuild that began after years of playoff frustration suddenly had its anchor. Long Island hockey fans — who remember Potvin and Bossy and the four Cups — allow themselves to dream carefully. The last time the Islanders had a generational defenseman, they won four Stanley Cups. The future is wearing number one."
  },

  // ── JETS DRAFT ────────────────────────────────────────────────────────────
  {
    title: "Joe Namath: The AFL Draft Pick That Changed Football",
    team: "Jets",
    charity: "New York Jets Foundation | newyorkjets.com/community", year: 1965, sport: "AFL",
    body: "In 1965, the AFL and NFL were still separate leagues fighting for talent. The New York Jets of the AFL and the St. Louis Cardinals of the NFL both drafted Joe Namath out of Alabama. The Jets signed him to a $427,000 contract — the largest in professional football history at the time — and the football world was shocked. The AFL could compete for marquee talent. That signing changed the power dynamic between the leagues and accelerated the merger that created the modern NFL. And then Namath delivered: a Super Bowl championship, a guarantee kept, and an AFL victory that validated everything the rival league had claimed about itself. One contract. One player. One moment that changed the sport."
  },
  {
    title: "The Jets' Search for a Quarterback: Decades of Hope and Heartbreak",
    team: "Jets",
    charity: "New York Jets Foundation | newyorkjets.com/community", year: 2000, sport: "NFL",
    body: "Since Joe Namath retired in 1977, the Jets have drafted quarterback after quarterback in search of the next Broadway Joe. Richard Todd. Ken O'Brien. Browning Nagle. Chad Pennington — the closest thing, who took them to the AFC Championship. Mark Sanchez, who reached two Championship Games before the famous Butt Fumble. Geno Smith. Sam Darnold, traded for draft picks. Zach Wilson, the second overall pick in 2021 who never found his footing. The carousel spins. The search continues. Every spring, Jets fans study the draft board with hope. Every few years, they believe they've found the one. The history of the Jets quarterback position is the history of football hope — the belief that this time, this draft, this player will be the one."
  },
  {
    title: "The Sack Exchange Draft Class: Building the '81 Defense",
    team: "Jets",
    charity: "New York Jets Foundation | newyorkjets.com/community", year: 1977, sport: "NFL",
    body: "The Jets didn't build the Sack Exchange in one draft — they built it over several years with a clear defensive philosophy. Joe Klecko came in the sixth round of the 1977 draft, passed on by every team 160 times before the Jets said yes. Marty Lyons arrived as the 14th pick in 1979. Mark Gastineau in the second round of 1979. Abdul Salaam had been there since 1976. When they all came together in 1981 under coordinator Joe Gardi, the result was the most ferocious defensive line in the NFL. The lesson: sometimes a dynasty isn't built with top picks — it's built by finding the right player at every level of the draft and giving them a system where they can thrive."
  },

  // ── GIANTS DRAFT ──────────────────────────────────────────────────────────
  {
    title: "Lawrence Taylor: The Pick That Redefined a Position",
    team: "Giants",
    charity: "The Giants Foundation | giants.com/community", year: 1981, sport: "NFL",
    body: "The Giants took Lawrence Taylor with the second overall pick in 1981, immediately after the New Orleans Saints selected running back George Rogers first overall. Rogers had a fine career. Taylor had one of the greatest careers in NFL history. Coaches across the league spent the next decade designing blocking schemes specifically to neutralize one player. Quarterbacks left the field after games limping from hits delivered by a player who wasn't quite like anything football had seen before. Taylor brought a speed and power to the linebacker position that forced the game to evolve. When he was inducted into the Pro Football Hall of Fame in 1999 in his first year of eligibility, no one argued. LT was different. LT changed everything."
  },
  {
    title: "Eli Manning: The Trade-Up That Won Two Super Bowls",
    team: "Giants",
    charity: "The Giants Foundation | giants.com/community", year: 2004, sport: "NFL",
    body: "In 2004, the San Diego Chargers held the first overall pick and wanted Eli Manning. The Giants held the fourth pick and wanted Eli Manning. On draft day, San Diego selected Manning first overall — and immediately traded him to New York for Philip Rivers (the fourth pick) plus additional picks. Eli Manning arrived in New York and was booed. He struggled his first two seasons. Then he won two Super Bowls — one by engineering the greatest upset in championship game history, another by outdueling Tom Brady in a rematch. The trade-up cost the Giants multiple picks. It also cost them nothing, because Eli Manning delivered exactly what they hoped he would, twice, on the biggest stage in football."
  },
  {
    title: "Phil Simms: The Most Overlooked Great Draft Pick in NY History",
    team: "Giants",
    charity: "The Giants Foundation | giants.com/community", year: 1979, sport: "NFL",
    body: "The Giants took Phil Simms seventh overall in 1979 and the crowd at Madison Square Garden booed. They wanted Joe Montana. They got a kid from Morehead State. For the first six years of his career, New York wasn't sure. Then in Super Bowl XXI, Phil Simms completed 22 of 25 passes — 88 percent, the most accurate Super Bowl performance in history — and won the MVP award. He was never the most celebrated quarterback of his era. He never had Montana's mystique or Marino's arm. But he led the Giants to two Super Bowls and played through injuries that would have ended lesser men's careers. The crowd that booed him in 1979 came to love him. He deserved it."
  },

  // ── NFL DRAFT IN NEW YORK ─────────────────────────────────────────────────
  {
    title: "The NFL Draft Comes to New York: When the City Became the Stage",
    team: "New York",
    charity: "Garden of Dreams Foundation | gardenofdreams.org", year: 2014, sport: "NFL",
    body: "For decades the NFL Draft was held in New York City — at the Hilton, at Madison Square Garden, at Radio City Music Hall. It was a civic event as much as a sports one: fans cramming into midtown, commissioner after commissioner stepping to the microphone, the names called echoing through the city. When the draft moved to different cities starting in 2015 — Chicago, Philadelphia, Nashville, Las Vegas — something was lost. New York was the natural home for the event that marks the start of every team's hope. The draft returning to New York, whenever it does, always feels like a homecoming. Football belongs in this city. The draft belongs in this city. The two together? That's a New York institution."
  },

  // ── NBA DRAFT ─────────────────────────────────────────────────────────────
  {
    title: "The Nets' Draft History: Brooklyn's Ongoing Rebuild",
    team: "Nets",
    charity: "Brooklyn Nets & NY Liberty Foundation | netslibertyfoundation.org", year: 2019, sport: "NBA",
    body: "The Brooklyn Nets traded most of their draft picks for Kyrie Irving and Kevin Durant. They got two seasons of brilliance and then watched both stars demand trades. The cost was a half-decade of draft capital — picks that went to Boston, Houston and Cleveland and became other teams' foundations. The lesson for Brooklyn, learned painfully: sustainable success in the NBA requires draft picks. You can build a superteam, but if it doesn't win a championship, you're left with nothing. The Nets are rebuilding now, accumulating picks, developing young players. The Ben Simmons era is the cautionary tale. The future — Cam Thomas, Dariq Whitehead, picks still to come — is the promise that this time, they'll build it right."
  },
  {
    title: "Bernard King: The Knicks Pick Who Became the Garden's Greatest Scorer",
    team: "Knicks",
    charity: "Garden of Dreams Foundation | gardenofdreams.org", year: 1982, sport: "NBA",
    body: "The Knicks acquired Bernard King in a 1982 trade, not a draft pick. But his story deserves to be told in any discussion of how players are evaluated and developed. King was a force of nature — a scorer of such purity that he averaged 32.9 points per game in the 1984-85 season, fourth highest in NBA history, largely forgotten because it happened on a losing team in a city that wasn't paying attention. He tore his ACL in March 1985 — a career-ending injury for most players of that era. King came back and scored 20 points in his return game. He was eventually inducted into the Hall of Fame. Madison Square Garden gave him his number in the rafters. The Garden had seen thousands of players. Few scored it the way Bernard King did."
  },

  // ── NHL DRAFT ─────────────────────────────────────────────────────────────
  {
    title: "The Rangers' Blueprint: How to Draft in a Big Market",
    team: "Rangers",
    charity: "Garden of Dreams Foundation | gardenofdreams.org", year: 2022, sport: "NHL",
    body: "The Rangers of the early 2020s represent a case study in modern NHL team building. GM Chris Drury accumulated picks and prospects during a rebuild, then gradually added veterans around a young core. Alexis Lafrenière, taken first overall in 2020. Kaapo Kakko, second overall in 2019. Adam Fox — acquired in a trade but developed beautifully — won the Norris Trophy in 2021. The model is patient and disciplined: draft well at the top, develop the players, don't rush them, then supplement with targeted acquisitions. The Rangers are now one of the NHL's elite franchises again. They got there the right way. Draft picks first, stars second."
  },
  {
    title: "Devils Draft History: How New Jersey Built Three Cup Winners",
    team: "Devils", year: 1995, sport: "NHL",
    body: "The New Jersey Devils are the most underappreciated dynasty in NY-area sports history. Three Stanley Cups — 1995, 2000, 2003 — built around Scott Stevens (acquired in a trade), Martin Brodeur (drafted 20th overall in 1990), and a rotating cast of complementary players. Brodeur in the second round of 1990 was the pick that defined the franchise for 20 years. The Devils never had the highest payroll. They never made the flashiest moves. They drafted Brodeur, built a defensive system around him, and let it run. Three championships in nine years. The most boring dynasty in hockey was also one of the most effective."
  },

  // ── BASEBALL DRAFT ────────────────────────────────────────────────────────
  {
    title: "The Best Draft Classes in NY Sports History",
    team: "New York",
    charity: "Garden of Dreams Foundation | gardenofdreams.org", year: 1979, sport: "All Sports",
    body: "If you had to pick the single greatest draft class for any NY team, the Islanders' run from 1973-1977 stands alone — Potvin, Gillies, Trottier, Bossy in sequence, the building blocks of a dynasty. The Mets' 1980-82 run of Strawberry, then Gooden comes second. The Giants' 1979-81 drafts — Simms then Lawrence Taylor — built two Super Bowl champions. What all three share: a general manager with a clear vision, the patience to develop players rather than rush them, and the wisdom to trust the process when it was working. Great drafting is repeatable. Teams that do it well tend to do it consistently — because the same philosophy that identifies one great player tends to identify the next one."
  },
  {
    title: "The Worst Draft Decisions in NY Sports History",
    team: "New York",
    charity: "Garden of Dreams Foundation | gardenofdreams.org", year: 1992, sport: "All Sports",
    body: "Every franchise has them — the picks that haunt. The Jets took Blair Thomas second overall in 1990 over Junior Seau and Emmitt Smith. The Knicks passed on Kevin Durant in 2007 for Danilo Gallinari. The Rangers took Alexei Kovalev fifth overall in 1991 — not a disaster, but they passed on players who became Hall of Famers. The Mets drafted Steve Chilcott first overall in 1966 — the only first overall pick in baseball history who never played a major league game — passing on Reggie Jackson. Draft mistakes aren't failures of effort. They're failures of evaluation — seeing what you want to see rather than what's there. Every team gets them wrong sometimes. The great franchises get them right more than they get them wrong."
  },
  {
    title: "The One That Got Away: Players NY Almost Drafted",
    team: "New York",
    charity: "Garden of Dreams Foundation | gardenofdreams.org", year: 2003, sport: "All Sports",
    body: "In 2003 the Cavaliers took LeBron James first overall. The Knicks were picking sixth and took Michael Sweetney. LeBron went to Cleveland, then Miami, then back to Cleveland, then Los Angeles, winning four championships. The pick the Knicks made has been long forgotten. In 1984, the Mets had the first pick and took Shawn Abner — passing on Barry Bonds and Will Clark who were also available. In football, the Giants passed on Johnny Unitas in 1955. Every franchise has a player who got away — the one who might have changed everything. In New York, where championships are expected and mediocrity is unforgivable, the ones that got away haunt for generations."
  },
  {
    title: "International Scouting: How NY Teams Find Global Talent",
    team: "New York",
    charity: "Garden of Dreams Foundation | gardenofdreams.org", year: 2000, sport: "All Sports",
    body: "The modern sports draft isn't just a domestic operation anymore. The Yankees signed Mariano Rivera from Panama as an undrafted free agent. The Mets drafted Japanese pitcher Daisuke Matsuzaka's rights. The Rangers found Henrik Lundqvist in Sweden. The Islanders took a chance on Aleksander Barkov — who went to Florida — but have found European talent throughout their history. The globalization of sports has expanded the talent pool dramatically, and NY teams with resources and international scouting networks have benefited enormously. The next great Yankee might be from the Dominican Republic. The next great Knick might be from Australia. The next Islanders dynasty might include players from six different countries. That's the modern draft — and New York is playing it."
  },
  {
    title: "The Draft Lottery System: How NY Teams Have Fared",
    team: "New York",
    charity: "Garden of Dreams Foundation | gardenofdreams.org", year: 1985, sport: "NBA/NHL",
    body: "Lottery systems in basketball and hockey were designed to prevent tanking and give bad teams a path to improvement. New York teams have had complicated relationships with them. The Knicks won the very first NBA lottery in 1985 and got Patrick Ewing. They've won it once since, in 2019, getting RJ Barrett. The Islanders won the 2025 NHL draft lottery and got Matthew Schaefer first overall. The Nets — having traded most of their picks — have been largely absent from lottery discussions. The Rangers' careful accumulation of picks in the early 2020s gave them top selections without relying on the lottery. The lottery is a lifeline. The great franchises use it once, then build systems that keep them out of it."
  },
  {
    title: "Draft Day in New York: The Theater of Hope",
    team: "New York",
    charity: "Garden of Dreams Foundation | gardenofdreams.org", year: 2019, sport: "All Sports",
    body: "There is nothing quite like draft day for a New York sports fan. The name is called. The pick is announced. For one moment, the player who will become the next star — the next Jeter, the next Ewing, the next Bossy — is pure possibility. He hasn't played a game yet. He hasn't disappointed anyone. He is everything you hope he will be. New York draft days have produced moments of pure joy: the lottery envelope in 1985, Jeter's name called in 1992, Schaefer going first in 2025. They've also produced heartbreak. But every spring, the draft arrives and New York sports fans allow themselves the oldest and most powerful sports emotion there is: hope. Uncomplicated, unreasonable, irresistible hope."
  },

  // ── CROSS-SPORT DRAFT STORIES ─────────────────────────────────────────────
  {
    title: "When Two NY Teams Draft the Same Player: The Territory Wars",
    team: "New York",
    charity: "Garden of Dreams Foundation | gardenofdreams.org", year: 1965, sport: "All Sports",
    body: "In 1965, both the AFL's New York Jets and the NFL's St. Louis Cardinals drafted Joe Namath. The Jets got him by paying more money. Similar bidding wars have defined NY sports history — two leagues, two teams, occasionally two sports competing for the same athlete. Bo Jackson was drafted by multiple teams in multiple sports. Deion Sanders played for the Yankees and the Falcons simultaneously. John Elway was drafted by the Yankees. The crossover between sports — the athletes talented enough to succeed at multiple levels — has intersected with New York more than any other market. When you're playing in New York, you're playing on the biggest stage. The draft is just the beginning of the story."
  },
  {
    title: "Building Through the Draft vs. Buying Championships: The NY Debate",
    team: "New York",
    charity: "Garden of Dreams Foundation | gardenofdreams.org", year: 2000, sport: "All Sports",
    body: "New York teams have tried both approaches. The Yankees have spent freely on free agents — A-Rod, CC Sabathia, Giancarlo Stanton — and won championships and not won championships. The Islanders built through the draft and won four Cups. The Knicks spent lavishly on free agents through the 2010s and won nothing. The Rangers accumulated draft picks, developed young players, and built a contender. There's no single answer, but the evidence suggests: you need a great homegrown core before the free agent additions mean anything. Jeter, Posada, Rivera and Pettitte were the Yankees' foundation. Bossy, Trottier and Potvin were the Islanders'. Leetch and Richter were the Rangers'. Build first. Buy second. New York has learned this lesson the hard way, repeatedly."
  },
  {
    title: "The Second Round Steal: NY's Best Late Draft Finds",
    team: "New York",
    charity: "Garden of Dreams Foundation | gardenofdreams.org", year: 1977, sport: "All Sports",
    body: "The most satisfying draft pick isn't the obvious one — it's the player everyone else missed. Joe Klecko, sixth round, 1977. Bryan Trottier, 22nd overall, 1974. Mariano Rivera, undrafted free agent from Panama. Jacob deGrom, ninth round, converted from shortstop. These players share something: evaluators elsewhere saw a flaw and moved on. Someone in the NY organization saw past the flaw to the player underneath. The ability to find value where others don't is the most valuable skill a front office can have — more valuable, in the long run, than the ability to evaluate obvious talent at the top of the draft. Any team can draft the consensus first pick. The great franchises find the Trottieres and Riveras hiding in the later rounds."
  },
];


// ── FRIDAY: TROPHY CASE ───────────────────────────────────────────────────────
// Built from NY_CHAMPIONSHIPS — all 63 entries. Rotated by week number.
// Data is already in GLORY_MOMENTS array — we repurpose it here with a
// different display format emphasizing the championship context.

// ── SATURDAY: POLL ────────────────────────────────────────────────────────────
// Fetched live from Supabase ny_polls table
// See getSaturdayPoll() function below

async function getSaturdayPoll() {
  try {
    const r = await fetch(
      SUPABASE_URL + '/rest/v1/ny_polls?select=*&order=created_at.desc&limit=1',
      { headers: { 'apikey': SUPABASE_KEY, 'Authorization': 'Bearer ' + SUPABASE_KEY } }
    );
    if (!r.ok) return null;
    const rows = await r.json();
    if (!rows || !rows.length) return null;
    // Get vote counts for this poll
    const poll = rows[0];
    return poll;
  } catch(e) {
    console.error('getSaturdayPoll error:', e);
    return null;
  }
}

// ── DATE-SPECIFIC OVERRIDES ───────────────────────────────────────────────────
// For major NY sports moments, force a specific Deep Dive on a specific Sunday
// regardless of what the shuffle would normally pick. Format: 'YYYY-MM-DD'
const SUNDAY_DEEP_DIVE_OVERRIDES = {
  '2026-06-21': '53 Years: The Full Story of the 2026 Knicks Championship',
};

// ── MAIN: GET TODAY'S NUGGET ─────────────────────────────────────────────────
function getDayNugget(dayOfWeek, weekNumber) {
  // weekNumber = Math.floor((Date.now() - new Date('2026-01-01')) / 604800000)
  // Ensures rotation through arrays without repeating

  // Check for date-specific Sunday override
  if (dayOfWeek === 0) {
    const dateStr = new Date().toISOString().slice(0,10);
    const overrideTitle = SUNDAY_DEEP_DIVE_OVERRIDES[dateStr];
    if (overrideTitle) {
      const overrideEntry = ALL_DEEP_DIVES.find(d => d.title === overrideTitle);
      if (overrideEntry) {
        return { type:'deepdive', data: overrideEntry };
      }
    }
  }

  switch(dayOfWeek) {
    case 0: {
    // Smart shuffle — no same team within 4 weeks
    // Build a deterministic but well-distributed order each time
    function getShuffledDive(entries, weekNum) {
      // Create a seeded shuffle that distributes teams evenly
      // Use team-aware rotation: sort by (last_seen + team_count)
      const n = entries.length;
      const order = [];
      const used = new Array(n).fill(false);
      const recentTeams = [];

      while (order.length < n) {
        // Score each unused entry
        let bestScore = -Infinity;
        let bestIdx   = -1;

        for (let i = 0; i < n; i++) {
          if (used[i]) continue;
          const team = entries[i].team || 'Unknown';
          // Penalize if team appeared recently
          const lastSeen = recentTeams.lastIndexOf(team);
          const recencyPenalty = lastSeen >= 0
            ? Math.max(0, 4 - (recentTeams.length - lastSeen)) * -10
            : 0;
          // Favor entries whose team has appeared less recently
          // Use a pseudo-random tiebreaker based on index + week
          const tiebreak = ((i * 2654435761 + weekNum * 40503) >>> 0) % 100 / 100;
          const score = recencyPenalty + tiebreak;
          if (score > bestScore) {
            bestScore = score;
            bestIdx   = i;
          }
        }

        if (bestIdx === -1) break;
        used[bestIdx] = true;
        order.push(bestIdx);
        recentTeams.push(entries[bestIdx].team || 'Unknown');
      }

      return entries[order[weekNum % order.length]];
    }
    return { type:'deepdive', data: getShuffledDive(ALL_DEEP_DIVES, weekNumber) };
  }
    case 1: return { type:'numbers',   data: BY_THE_NUMBERS[weekNumber % BY_THE_NUMBERS.length] };
    case 2: return { type:'quote',     data: NY_QUOTES[weekNumber % NY_QUOTES.length] };
    case 3: {
    // Alternate: 1 stadium every 4 weeks, draft the other 3
    const isStadiumWeek = (weekNumber % 4 === 0);
    if (isStadiumWeek) {
      return { type:'stadium', data: STADIUMS[Math.floor(weekNumber / 4) % STADIUMS.length] };
    } else {
      const draftIdx = weekNumber % DRAFT_ENTRIES.length;
      return { type:'draft', data: DRAFT_ENTRIES[draftIdx] };
    }
  }
    case 4: return { type:'rivalry',   data: RIVALRIES[weekNumber % RIVALRIES.length] };
    case 5: return { type:'trophy',    data: null }; // uses GLORY_MOMENTS with trophy display
    case 6: return { type:'poll',      data: null }; // fetched from Supabase
    default: return null;
  }
}



// ── BUILD NUGGET HTML ─────────────────────────────────────────────────────────
function buildNuggetHtml(nugget, saturdayPoll, trophyEntry) {
  if (!nugget) return '';

  const wrap = function(label, color, inner) {
    return '<div style="padding:18px 28px;border-bottom:1px solid #ebebeb">'
      + '<div style="font-size:8px;font-weight:900;color:#bbb;letter-spacing:0.25em;text-transform:uppercase;'
      + 'padding-bottom:8px;border-bottom:1px solid #ebebeb;margin-bottom:14px">'
      + '<span style="color:' + color + '">' + label + '</span></div>'
      + inner
      + '</div>';
  };

  switch(nugget.type) {

    case 'deepdive': {
      const d = nugget.data;
      if (!d) return '';
      return wrap('&#128269; Sunday Deep Dive', '#1a7fc2',
        '<div style="font-size:16px;font-weight:900;color:#111;font-family:Georgia,serif;'
        + 'line-height:1.3;margin-bottom:10px">' + d.title + '</div>'
        + '<div style="font-size:11px;font-weight:700;color:#c8201c;letter-spacing:0.1em;'
        + 'text-transform:uppercase;margin-bottom:12px">' + d.team + ' &nbsp;&middot;&nbsp; ' + d.year + '</div>'
        + '<div style="font-size:13px;color:#444;line-height:1.75;font-family:Georgia,serif">' + d.body + '</div>'
        + (d.charity ? '<div style="margin-top:14px;padding-top:10px;border-top:1px solid #ebebeb;font-size:10px;color:#888;font-style:italic">&#129293; Support this team: ' + d.charity + '</div>' : '')
      );
    }

    case 'numbers': {
      const n = nugget.data;
      if (!n) return '';
      return wrap('&#128202; Monday By The Numbers', '#1a7fc2',
        '<div style="display:flex;align-items:flex-start;gap:16px">'
        + '<div style="font-size:52px;font-weight:900;color:#c8201c;font-family:Georgia,serif;'
        + 'line-height:1;flex-shrink:0;min-width:80px">' + n.number + '</div>'
        + '<div>'
        + '<div style="font-size:13px;font-weight:900;color:#111;margin-bottom:8px;line-height:1.3">' + n.label + '</div>'
        + '<div style="font-size:12px;color:#555;line-height:1.65;font-family:Georgia,serif">' + n.story + '</div>'
        + '</div>'
        + '</div>'
      );
    }

    case 'quote': {
      const q = nugget.data;
      if (!q) return '';
      return wrap('&#127908; Tuesday Quote of the Week', '#5555bb',
        '<div style="font-size:22px;font-weight:900;color:#111;font-family:Georgia,serif;'
        + 'font-style:italic;line-height:1.4;margin-bottom:12px;border-left:4px solid #c8201c;padding-left:14px">'
        + '&ldquo;' + q.quote + '&rdquo;</div>'
        + '<div style="font-size:12px;font-weight:900;color:#c8201c;letter-spacing:0.08em;margin-bottom:6px">'
        + '&mdash; ' + q.who + '</div>'
        + '<div style="font-size:11px;color:#888;font-style:italic;line-height:1.5">' + q.context + '</div>'
      );
    }

    case 'stadium': {
      const s = nugget.data;
      if (!s) return '';
      return wrap('&#127967; Wednesday: This Stadium', '#f0b429',
        '<div style="font-size:16px;font-weight:900;color:#111;font-family:Georgia,serif;margin-bottom:4px">'
        + s.name + '</div>'
        + '<div style="font-size:10px;font-weight:700;color:#c8201c;letter-spacing:0.1em;text-transform:uppercase;margin-bottom:4px">'
        + s.teams + ' &nbsp;&middot;&nbsp; ' + s.years + '</div>'
        + '<div style="font-size:10px;color:#f0b429;font-weight:700;font-style:italic;margin-bottom:12px">'
        + '&ldquo;' + s.nickname + '&rdquo;</div>'
        + '<div style="font-size:12px;color:#444;line-height:1.7;font-family:Georgia,serif">' + s.story + '</div>'
      );
    }

    case 'rivalry': {
      const r = nugget.data;
      if (!r) return '';
      return wrap('&#9876;&#65039; Thursday: The Rivalry', '#c8201c',
        '<div style="font-size:16px;font-weight:900;color:#111;font-family:Georgia,serif;margin-bottom:4px">'
        + r.matchup + '</div>'
        + '<div style="font-size:10px;font-weight:700;color:#888;letter-spacing:0.1em;text-transform:uppercase;margin-bottom:12px">'
        + r.subtitle + '</div>'
        + '<div style="font-size:12px;color:#444;line-height:1.7;font-family:Georgia,serif">' + r.story + '</div>'
      );
    }

    case 'draft': {
      const d = nugget.data;
      if (!d) return '';
      return wrap('&#127944; Wednesday: The Draft', '#1a7fc2',
        '<div style="font-size:11px;font-weight:700;color:#c8201c;letter-spacing:0.1em;text-transform:uppercase;margin-bottom:4px">'
        + d.team + ' &nbsp;&middot;&nbsp; ' + d.sport + ' &nbsp;&middot;&nbsp; ' + d.year + '</div>'
        + '<div style="font-size:15px;font-weight:900;color:#111;font-family:Georgia,serif;line-height:1.3;margin-bottom:10px">' + d.title + '</div>'
        + '<div style="font-size:12px;color:#444;line-height:1.75;font-family:Georgia,serif">' + d.body + '</div>'
      );
    }

    case 'trophy': {
      const t = trophyEntry;
      if (!t) return '';
      const rdColor = '#c8201c';
      return wrap('&#127942; Friday: The Trophy Case', '#f0b429',
        '<div style="background:#fffbf2;border:1px solid #f0e2b0;border-left:4px solid #f0b429;padding:16px 18px">'
        + '<div style="font-size:42px;font-weight:900;color:#f0b429;line-height:1;margin-bottom:2px">'
        + t.year + '</div>'
        + '<div style="font-size:9px;font-weight:900;color:' + rdColor + ';letter-spacing:0.2em;'
        + 'text-transform:uppercase;margin-bottom:2px">' + t.team + '</div>'
        + '<div style="font-size:11px;font-weight:700;color:#888;margin-bottom:10px">'
        + t.title + (t.opponent ? ' &nbsp;&middot;&nbsp; ' + t.opponent : '') + '</div>'
        + '<div style="font-size:13px;color:#333;line-height:1.65;font-style:italic;margin-bottom:10px">'
        + '&ldquo;' + t.text + '&rdquo;</div>'
        + (t.fact ? '<div style="font-size:11px;color:#888;padding-top:8px;border-top:1px solid #f0e2b0">'
          + '&#128161; ' + t.fact + '</div>' : '')
        + '</div>'
      );
    }

    case 'poll': {
      const p = saturdayPoll;
      if (!p) return '';
      return wrap('&#128483;&#65039; Saturday: Fan Poll', '#22c55e',
        '<div style="font-size:15px;font-weight:700;color:#111;font-family:Georgia,serif;'
        + 'line-height:1.4;margin-bottom:14px">' + (p.question || p.poll_id || 'This week\'s poll') + '</div>'
        + '<div style="font-size:11px;color:#888;font-style:italic;margin-bottom:14px">'
        + 'Vote on the site &mdash; results revealed next week!</div>'
        + '<a href="https://nysportsdaily.com" style="display:inline-block;background:#22c55e;color:#fff;'
        + 'text-decoration:none;font-size:11px;font-weight:900;letter-spacing:0.1em;'
        + 'padding:10px 22px;text-transform:uppercase">Cast Your Vote &rarr;</a>'
      );
    }

    default: return '';
  }
}


// ── MLB Standings: Streak, Run Diff, Division Position ───────────────────────
// Silent failsafe — never crashes pipeline. Returns {} on any error.
async function getMLBStandings() {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    let data;
    try {
      const r = await fetch(
        'https://statsapi.mlb.com/api/v1/standings?leagueId=103,104&standingsTypes=regularSeason&hydrate=team,streak,records',
        { signal: controller.signal }
      );
      clearTimeout(timeout);
      if (!r.ok) return {};
      data = await r.json();
    } catch(e) { clearTimeout(timeout); return {}; }

    const NY_IDS = { 121: 'Mets', 147: 'Yankees' };
    const results = {};

    (data.records || []).forEach(function(division) {
      const divName = (division.division && division.division.name) || '';
      (division.teamRecords || []).forEach(function(rec) {
        try {
          const teamId = rec.team && rec.team.id;
          if (!NY_IDS[teamId]) return;

          // 1. STREAK BADGE
          const streakCode = (rec.streak && rec.streak.streakCode) || '';
          let streakBadge = streakCode;
          if (streakCode) {
            const type = streakCode[0];
            const num  = parseInt(streakCode.slice(1)) || 0;
            if (type === 'W' && num >= 3)      streakBadge = streakCode + ' \uD83D\uDD25';
            else if (type === 'L' && num >= 3) streakBadge = streakCode + ' \u2744\uFE0F';
          }

          // 2. RUN DIFFERENTIAL
          const runDiff = parseInt(rec.runDifferential) || 0;
          const runDiffStr = (runDiff > 0 ? '+' : '') + runDiff + ' Run Diff';

          // 3. DIVISION POSITION + GAMES BACK
          const rank    = parseInt(rec.divisionRank) || 0;
          const wcRank  = parseInt(rec.wildCardRank) || 0;
          const gb      = rec.gamesBack || '';
          const wcGb    = rec.wildCardGamesBack || '';
          const suffix  = rank === 1 ? 'st' : rank === 2 ? 'nd' : rank === 3 ? 'rd' : 'th';
          const isDiv1  = (rank === 1);
          const isWC    = (rank > 1 && wcRank >= 1 && wcRank <= 3);
          let gbStr;
          if (isDiv1) {
            gbStr = '1st in ' + divName + ' \u00B7 Division Leader';
          } else if (isWC && wcGb && wcGb !== '-') {
            gbStr = rank + suffix + ' in ' + divName + ' \u00B7 WC' + wcRank + ' \u00B7 ' + wcGb + ' GB';
          } else if (isWC) {
            gbStr = rank + suffix + ' in ' + divName + ' \u00B7 Wild Card';
          } else {
            gbStr = rank + suffix + ' in ' + divName + (gb && gb !== '-' ? ' \u00B7 ' + gb + ' GB' : '');
          }
          const isFirst = isDiv1;

          results[NY_IDS[teamId]] = {
            streak:   streakBadge,
            runDiff:  runDiffStr,
            standing: gbStr,
            isFirst:  isFirst,
            isHot:    streakCode && streakCode[0] === 'W' && parseInt(streakCode.slice(1)) >= 3,
            isCold:   streakCode && streakCode[0] === 'L' && parseInt(streakCode.slice(1)) >= 3,
          };
        } catch(e) {}
      });
    });

    return results;
  } catch(e) { return {}; }
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

// ── Trivia: Save today's + fetch yesterday's from Supabase ───────────────────
async function saveTodayTrivia(trivia) {
  try {
    const today = new Date().toISOString().slice(0,10); // "2026-06-13"
    await fetch(SUPABASE_URL + '/rest/v1/ny_trivia_daily', {
      method: 'POST',
      headers: {
        'Content-Type':  'application/json',
        'apikey':        SUPABASE_KEY,
        'Authorization': 'Bearer ' + SUPABASE_KEY,
        'Prefer':        'resolution=merge-duplicates', // upsert
      },
      body: JSON.stringify({
        date:     today,
        question: trivia.q,
        hint:     trivia.hint,
        answer:   trivia.a,
      }),
    });
  } catch(e) {
    console.error('saveTodayTrivia error:', e);
  }
}

async function getYesterdayTrivia() {
  try {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const dateStr = yesterday.toISOString().slice(0,10);
    const r = await fetch(
      SUPABASE_URL + '/rest/v1/ny_trivia_daily?date=eq.' + dateStr + '&select=*',
      { headers: { 'apikey': SUPABASE_KEY, 'Authorization': 'Bearer ' + SUPABASE_KEY } }
    );
    if (!r.ok) return null;
    const rows = await r.json();
    return (rows && rows.length > 0) ? rows[0] : null;
  } catch(e) {
    console.error('getYesterdayTrivia error:', e);
    return null;
  }
}

// ── Glory moments ─────────────────────────────────────────────────────────────────
const GLORY_MOMENTS = [
  { year:1923, team:"Yankees", title:"World Series", text:"The first championship in The House That Ruth Built — Babe Ruth hit 3 HR in the Series." },
  { year:1927, team:"Yankees", title:"World Series", text:"Murderers\' Row swept the Pirates. Babe Ruth hit 60 home runs that season — the greatest team ever assembled." },
  { year:1928, team:"Yankees", title:"World Series", text:"Back-to-back! Ruth and Gehrig combined for 6 HR in the sweep." },
  { year:1932, team:"Yankees", title:"World Series", text:"The Called Shot — Babe Ruth allegedly pointed to center field before homering off Charlie Root." },
  { year:1936, team:"Yankees", title:"World Series", text:"Joe DiMaggio\'s first championship. The Yankees won four in five years starting here." },
  { year:1937, team:"Yankees", title:"World Series", text:"Back-to-back again. DiMaggio and Gehrig were unstoppable." },
  { year:1938, team:"Yankees", title:"World Series", text:"Three in a row. The Cubs were swept — again. Red Ruffing won two games." },
  { year:1939, team:"Yankees", title:"World Series", text:"FOUR STRAIGHT! DiMaggio hit .381. The Reds were swept in four games." },
  { year:1941, team:"Yankees", title:"World Series", text:"Mickey Owen\'s passed ball in Game 4 let the Yankees back in. DiMaggio\'s 56-game streak that season." },
  { year:1943, team:"Yankees", title:"World Series", text:"A wartime championship. Spud Chandler went 20-4 with a 1.64 ERA to win Cy Young and MVP." },
  { year:1947, team:"Yankees", title:"World Series", text:"Cookie Lavagetto\'s pinch hit double broke up Bill Bevens\' near no-hitter in Game 4." },
  { year:1949, team:"Yankees", title:"World Series", text:"Casey Stengel\'s first title. This began another dynasty — five straight championships." },
  { year:1950, team:"Yankees", title:"World Series", text:"The Whiz Kids swept. Whitey Ford made his first World Series start." },
  { year:1951, team:"Yankees", title:"World Series", text:"Three straight! Mickey Mantle made his first Series appearance." },
  { year:1952, team:"Yankees", title:"World Series", text:"Four straight! Billy Martin made a game-saving bare-hand catch in the 7th inning of Game 7." },
  { year:1953, team:"Yankees", title:"World Series", text:"FIVE STRAIGHT — the record that still stands. Billy Martin hit .500 and delivered the Series winner." },
  { year:1956, team:"Yankees", title:"World Series", text:"Don Larsen\'s Perfect Game — the only perfect game in World Series history. Yogi Berra leaped into his arms." },
  { year:1958, team:"Yankees", title:"World Series", text:"Down 3-1 in the Series, the Yankees won three straight. The ultimate comeback." },
  { year:1961, team:"Yankees", title:"World Series", text:"Roger Maris hit his record 61st home run that season. Whitey Ford pitched 32 scoreless WS innings." },
  { year:1962, team:"Yankees", title:"World Series", text:"Bobby Richardson caught Willie McCovey\'s screaming liner to end Game 7. Heart attacks all around." },
  { year:1977, team:"Yankees", title:"World Series", text:"Reggie Jackson hit THREE home runs on THREE consecutive pitches in Game 6. Mr. October was born." },
  { year:1978, team:"Yankees", title:"World Series", text:"Bucky Dent\'s playoff homer at Fenway set it up. Back-to-back Dodgers victims." },
  { year:1996, team:"Yankees", title:"World Series", text:"Down 2-0, Yankees won 4 straight. Jim Leyritz\'s 3-run homer in Game 4 was the turning point." },
  { year:1998, team:"Yankees", title:"World Series", text:"125 wins total. The Padres were swept. The \'98 Yankees are the greatest team of the modern era." },
  { year:1999, team:"Yankees", title:"World Series", text:"Three straight. Mariano Rivera entered to Enter Sandman. The dynasty at its absolute peak." },
  { year:2000, team:"Yankees", title:"World Series", text:"THE SUBWAY SERIES! Jeter led off Game 4 with a HR. Luis Sojo\'s single ended it in Game 5." },
  { year:2009, team:"Yankees", title:"World Series", text:"Hideki Matsui hit a grand slam in Game 6 to win Series MVP. The new Stadium\'s first title." },
  { year:1969, team:"Mets", title:"World Series", text:"The Miracle Mets! 100-to-1 longshots beat the mighty Orioles. Tom Seaver, Jerry Koosman, and pure belief." },
  { year:1986, team:"Mets", title:"World Series", text:"Mookie Wilson\'s grounder rolled through Bill Buckner\'s legs. Back from the dead in Game 6, then won Game 7." },
  { year:1905, team:"NY Giants (Baseball)", title:"World Series", text:"Christy Mathewson threw THREE complete-game shutouts in six days. The most dominant WS pitching ever." },
  { year:1921, team:"NY Giants (Baseball)", title:"World Series", text:"The first Subway Series — all games at the Polo Grounds. The Giants beat their cross-borough rivals." },
  { year:1922, team:"NY Giants (Baseball)", title:"World Series", text:"Back-to-back Subway Series wins over the Yankees. John McGraw\'s Giants at their peak." },
  { year:1933, team:"NY Giants (Baseball)", title:"World Series", text:"Bill Terry\'s Giants won in five. Carl Hubbell was the ace — his 1934 All-Star strikeout streak followed." },
  { year:1954, team:"NY Giants (Baseball)", title:"World Series", text:"Willie Mays\' over-the-shoulder catch off Vic Wertz is THE greatest defensive play in baseball history." },
  { year:1955, team:"Brooklyn Dodgers", title:"World Series", text:"\'Next year\' FINALLY came. Sandy Amoros\' miraculous Game 7 catch. Brooklyn exploded in joy." },
  { year:1970, team:"Knicks", title:"NBA Championship", text:"Willis Reed limped onto the MSG court before Game 7. The crowd erupted. Frazier scored 36 with 19 assists." },
  { year:1973, team:"Knicks", title:"NBA Championship", text:"The rematch. DeBusschere, Bradley, Monroe, Frazier — a beautifully constructed championship team." },
  { year:2026, team:"Knicks", title:"NBA Championship", text:"53 years of waiting ended. Jalen Brunson scored 45 points on the road to close out the Spurs in Game 5, capping a Finals run defined by comeback after comeback. Unanimous Finals MVP. The Knicks are NBA Champions again." },
  { year:1974, team:"NY Nets (ABA)", title:"ABA Championship", text:"Julius Erving\'s first championship. Dr. J was already redefining what a basketball player could be." },
  { year:1976, team:"NY Nets (ABA)", title:"ABA Championship", text:"Julius Erving averaged 37.7 points per game in the Finals. The last ABA championship before the merger." },
  { year:1928, team:"Rangers", title:"Stanley Cup", text:"Their 2nd season in existence! GM Lester Patrick, age 44, played goal when the regular goalie was hurt — and won." },
  { year:1933, team:"Rangers", title:"Stanley Cup", text:"Bill Cook scored the overtime winner in Game 4. The Rangers were the toast of Broadway." },
  { year:1940, team:"Rangers", title:"Stanley Cup", text:"Bryan Hextall won it in OT in Game 6. The last Cup before the 54-year drought began." },
  { year:1994, team:"Rangers", title:"Stanley Cup", text:"Messier GUARANTEED a win in Game 6 when down 3-2. He scored a hat trick. Then the Rangers beat Vancouver. 54 YEARS ENDED." },
  { year:1980, team:"Islanders", title:"Stanley Cup", text:"Bob Nystrom\'s OT goal in Game 6 launched the dynasty. The Islanders were the new kings of hockey." },
  { year:1981, team:"Islanders", title:"Stanley Cup", text:"Back-to-back! Bossy scored 50 goals in 50 games that season. The dynasty was unstoppable." },
  { year:1982, team:"Islanders", title:"Stanley Cup", text:"Three straight! Mike Bossy won the Conn Smythe. Comparisons to the Canadiens dynasties were made." },
  { year:1983, team:"Islanders", title:"Stanley Cup", text:"FOUR STRAIGHT! The Islanders SWEPT Gretzky\'s Oilers who had scored 424 goals. The dynasty\'s crowning achievement." },
  { year:1995, team:"NJ Devils", title:"Stanley Cup", text:"The trap system suffocated Detroit\'s offense. Martin Brodeur was brilliant. Claude Lemieux won the Conn Smythe." },
  { year:2000, team:"NJ Devils", title:"Stanley Cup", text:"Scott Stevens was the most feared hitter in hockey. Brodeur was the best goalie on earth." },
  { year:2003, team:"NJ Devils", title:"Stanley Cup", text:"Brodeur was magnificent against the Ducks. The Devils won in 7. Ken Daneyko\'s third ring." },
  { year:1987, team:"Giants (NFL)", title:"Super Bowl XXI", text:"Phil Simms completed 22 of 25 passes — still the highest completion % in Super Bowl history. LT was a force of nature." },
  { year:1991, team:"Giants (NFL)", title:"Super Bowl XXV", text:"WIDE RIGHT! Scott Norwood\'s kick sailed wide as time expired. Giants win 20-19. Ottis Anderson MVP at age 34." },
  { year:2008, team:"Giants (NFL)", title:"Super Bowl XLII", text:"David Tyree pinned it to his HELMET. Then Eli hit Burress in the end zone. The 18-0 Patriots became 18-1." },
  { year:2012, team:"Giants (NFL)", title:"Super Bowl XLVI", text:"Eli did it AGAIN to the Patriots. Bradshaw accidentally scored the go-ahead TD. Two upsets in four years." },
  { year:1969, team:"Jets", title:"Super Bowl III", text:"Joe Namath GUARANTEED victory as a 17-point underdog. Broadway Joe delivered a 16-7 masterpiece." },
  { year:2024, team:"NY Liberty", title:"WNBA Championship", text:"Breanna Stewart and Sabrina Ionescu led the Liberty to their FIRST championship in franchise history." },
  { year:1972, team:"NY Cosmos (NASL)", title:"NASL Championship", text:"The Cosmos win their first NASL title, planting the flag for soccer in New York." },
  { year:1977, team:"NY Cosmos (NASL)", title:"NASL Championship", text:"Pelé, Beckenbauer, and Carlos Alberto on one team. The Cosmos beat Seattle before 77,000 fans at Giants Stadium. Soccer in America would never be the same." },
  { year:1978, team:"NY Cosmos (NASL)", title:"NASL Championship", text:"Back-to-back! Beckenbauer led the Cosmos to a second straight Soccer Bowl title." },
  { year:1980, team:"NY Cosmos (NASL)", title:"NASL Championship", text:"The Cosmos win their fourth title. Carlos Alberto lifts the trophy at Giants Stadium." },
  { year:1982, team:"NY Cosmos (NASL)", title:"NASL Championship", text:"The fifth and final NASL title — the dynasty\'s last stand before the league collapsed in 1984." },
  { year:2021, team:"NYCFC", title:"MLS Cup", text:"NYCFC won their first MLS Cup on penalty kicks. New York finally had an MLS champion." },
  { year:2023, team:"NJ/NY Gotham FC", title:"NWSL Championship", text:"Gotham FC won the NWSL Championship for the first time — NJ/NY\'s first major women\'s soccer title." },
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
function buildEmail(subscriber, scores, todayGames, headlines, glory, trivia, otd, mlbDetails, mlbStandings, yesterdayTrivia, nugget, saturdayPoll, trophyEntry) {
  const firstName = subscriber.name ? subscriber.name.split(' ')[0] : 'NY Sports Fan';
  const teams     = (subscriber.teams && subscriber.teams.length > 0)
                    ? subscriber.teams.join(' &nbsp;&middot;&nbsp; ')
                    : 'All NY Teams';
  const today     = new Date().toLocaleDateString('en-US', {
    weekday:'long', month:'long', day:'numeric', year:'numeric'
  });

  // ── NY STANDINGS STRIP ───────────────────────────────────────────────────────
  const teamsToShow = ['Yankees', 'Mets'].filter(function(t) {
    return mlbStandings && mlbStandings[t];
  });
  const standingsStrip = teamsToShow.length > 0
    ? '<div style="padding:10px 28px;border-bottom:1px solid #ebebeb;background:#f8f8f8;display:flex;gap:0;flex-wrap:wrap">'
      + teamsToShow.map(function(team) {
          const s = mlbStandings[team];
          const accentColor = team === 'Yankees' ? '#003087' : '#002D72';
          const rdColor = (s.runDiff && s.runDiff.startsWith('+')) ? '#22c55e' : '#c8201c';
          return '<div style="flex:1;min-width:180px;padding:6px 12px;border-right:1px solid #e0e0e0">'
            + '<div style="font-size:8px;font-weight:900;color:' + accentColor + ';letter-spacing:0.15em;text-transform:uppercase;margin-bottom:4px">' + team + '</div>'
            + '<div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap">'
            + (s.streak   ? '<span style="font-size:13px;font-weight:900;color:#111">' + s.streak + '</span>' : '')
            + (s.standing ? '<span style="font-size:10px;color:#555">' + s.standing + '</span>' : '')
            + (s.runDiff  ? '<span style="font-size:10px;font-weight:700;color:' + rdColor + '">' + s.runDiff + '</span>' : '')
            + '</div>'
            + '</div>';
        }).join('')
      + '</div>'
    : '';

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
          weatherLine = '';
        } else if (g.stadium && g.stadium.retractable && g.weather) {
          const w = g.weather;
          weatherLine = '<div style="font-size:10px;color:#888;margin-top:4px;font-style:italic">'
            + w.temp + '&deg;F &nbsp;&middot;&nbsp; ' + w.desc
            + ' &nbsp;&middot;&nbsp; <span style="color:#f0b429">Retractable roof</span>'
            + '</div>';
        }
        const seriesLine = g.seriesNote
          ? '<div style="font-size:10px;font-weight:700;color:#5555bb;margin-top:4px">' + g.seriesNote + '</div>'
          : '';
        // Look up MLB pitching/series details for this game
        const gameKey = (g.awayFull || g.awayName) + '_' + (g.homeFull || g.homeName);
        const mlbInfo = (mlbDetails && mlbDetails[gameKey]) || {};
        const seriesStatusTxt = (mlbInfo.seriesStatus || '').trim();
        // Hide generic regular-season label "Season" — only show meaningful series info
        // (e.g. "Game 2 of 3", "Series tied 1-1") which only appears for postseason/rivalry series
        const isGenericSeason = /^season$/i.test(seriesStatusTxt) || seriesStatusTxt === '';
        const seriesStatusLine = (!isGenericSeason)
          ? '<div style="font-size:10px;font-weight:700;color:#1a7fc2;margin-top:3px">&#128202; ' + seriesStatusTxt + '</div>'
          : '';
        const pitchingLine = mlbInfo.pitchingLine
          ? '<div style="font-size:10px;color:#555;margin-top:3px">' + mlbInfo.pitchingLine + '</div>'
          : '';

        // Clinch badge
        const NY_CLINCH = ['yankees','mets','jets','giants','knicks','nets','rangers','islanders','devils','liberty','nycfc','red bulls'];
        const isNYInGame = NY_CLINCH.some(function(t) { return (g.homeName||'').toLowerCase().includes(t) || (g.awayName||'').toLowerCase().includes(t); });
        let clinchBadge = '';
        if (isNYInGame) {
          const seriesStr = ((g.seriesNote || '') + ' ' + (mlbInfo.seriesStatus || '')).toLowerCase();
          const cm = seriesStr.match(/leads\s+(\d)-(\d)/i);
          if (cm) {
            const wL = parseInt(cm[1]);
            if (wL === 3 || (wL === 2 && seriesStr.indexOf('best-of-5') > -1)) {
              clinchBadge = '<div style="background:#c8201c;color:#fff;font-size:11px;font-weight:900;padding:8px 12px;margin-top:6px;letter-spacing:0.08em;text-align:center">'
                + '&#127942; CHAMPIONSHIP CLINCH GAME &#8212; NY leads ' + cm[1] + '-' + cm[2] + '</div>';
            }
          }
        }

        return '<div style="padding:10px 0;border-bottom:1px solid #f2f2f2">'
          + '<div style="font-size:14px;font-weight:700;color:#111;margin-bottom:4px">' + g.emoji + ' ' + g.awayName + ' vs ' + g.homeName + '</div>'
          + '<div style="font-size:11px;color:#666;line-height:1.6">'
          + '<span style="font-weight:900;color:#c8201c">' + g.time + '</span>'
          + venueLine
          + tvLine
          + '</div>'
          + weatherLine
          + seriesLine
          + seriesStatusLine
          + pitchingLine
          + clinchBadge
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
      + (otd.title ? '<div style="font-size:12px;font-weight:700;color:#333;margin-bottom:6px">' + otd.title + '</div>' : '')
      + '<div style="font-size:13px;color:#333;line-height:1.6;font-style:italic">&ldquo;' + (otd.desc || otd.text || 'A great moment in NY sports history.') + '&rdquo;</div>'
      + '</div>'
    : '';

  // ── GLORY ─────────────────────────────────────────────────────────────────────
  const gloryHtml = '<div style="background:#fffbf2;border:1px solid #f0e2b0;border-left:4px solid #f0b429;padding:16px 18px">'
    + '<div style="font-size:38px;font-weight:900;color:#f0b429;line-height:1;margin-bottom:3px">' + glory.year + '</div>'
    + '<div style="font-size:8px;font-weight:900;color:#c8201c;letter-spacing:0.2em;text-transform:uppercase;margin-bottom:8px">' + (glory.team||'New York') + '</div>'
    + '<div style="font-size:14px;color:#333;line-height:1.65;font-style:italic">&ldquo;' + glory.text + '&rdquo;</div>'
    + '</div>';

  // ── WEEKLY NUGGET ────────────────────────────────────────────────────────────
  const nuggetHtml = buildNuggetHtml(nugget, saturdayPoll, trophyEntry);

  // ── TRIVIA ───────────────────────────────────────────────────────────────────
  // Today's trivia — question + hint only, NO answer shown
  // Answer will appear in TOMORROW's digest
  const triviaHtml = '<div style="background:#f5f5ff;border-left:4px solid #5555bb;padding:16px 18px">'
    + '<div style="font-size:8px;font-weight:900;color:#5555bb;letter-spacing:0.2em;text-transform:uppercase;margin-bottom:8px">&#127914; Today&rsquo;s Trivia Question</div>'
    + '<div style="font-size:15px;font-weight:700;color:#111;line-height:1.5;margin-bottom:6px">' + trivia.q + '</div>'
    + '<div style="font-size:11px;color:#888;font-style:italic;margin-bottom:14px">' + trivia.hint + '</div>'
    + '<div style="font-size:11px;color:#5555bb;font-style:italic;margin-bottom:14px">&#128073; Answer revealed in tomorrow&rsquo;s digest &mdash; check back!</div>'
    + '<a href="' + SITE_URL + '" style="display:inline-block;background:#c8201c;color:#fff;text-decoration:none;font-size:11px;font-weight:900;letter-spacing:0.1em;padding:10px 22px;text-transform:uppercase">Play in the Playroom &rarr;</a>'
    + '<p style="font-size:10px;color:#aaa;margin:10px 0 0;font-style:italic">Also today: Hangman &nbsp;&middot;&nbsp; Anagram &nbsp;&middot;&nbsp; Emoji Quiz &nbsp;&middot;&nbsp; Crossword &nbsp;&middot;&nbsp; Guess the Player</p>'
    + '</div>';

  // Yesterday's trivia answer — shown at TOP of email
  const yesterdayTriviaHtml = yesterdayTrivia
    ? '<div style="background:#fff9e6;border:1px solid #f0e0a0;border-left:4px solid #f0b429;padding:16px 18px">'
      + '<div style="font-size:8px;font-weight:900;color:#c8a000;letter-spacing:0.2em;text-transform:uppercase;margin-bottom:8px">&#129504; Yesterday&rsquo;s Trivia Answer</div>'
      + '<div style="font-size:13px;color:#555;font-style:italic;margin-bottom:8px">&ldquo;' + yesterdayTrivia.question + '&rdquo;</div>'
      + '<div style="font-size:10px;color:#888;margin-bottom:6px">' + yesterdayTrivia.hint + '</div>'
      + '<div style="background:#f0b429;color:#111;padding:10px 14px;display:inline-block;font-size:16px;font-weight:900;letter-spacing:0.02em;margin-bottom:8px">&#128161; ' + yesterdayTrivia.answer + '</div>'
      + '<div style="font-size:11px;color:#888;font-style:italic">How did you do? &nbsp;&#128522;</div>'
      + '</div>'
    : '';

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

    // Yesterday's trivia answer (shown first — great engagement hook)
    + yesterdayTriviaHtml

    // NY Standings Strip
    + standingsStrip

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

    // Weekly Day Nugget (Sunday-Saturday themed section)
    + nuggetHtml

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
      const winner = isNYShort(g.homeName) ? g.homeName : g.awayName;
      return winner + ' Win';
    }).join(', ');
  } else if (nyWins.length === 0 && nyLosses.length > 0) {
    scoreSummary = nyLosses.map(g => {
      const loser = isNYShort(g.homeName) ? g.homeName : g.awayName;
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

  // CHAMPIONSHIP OVERRIDE — checks if any NY team's last game was a title-clinching win
  // (seriesNote contains "Championship" or "Finals" + a series-ending score like 4-1)
  const champGame = scores.find(g => {
    const note = (g.seriesNote || '').toLowerCase();
    const isTitleClincher = note.includes('championship') || note.includes('finals')
      || note.includes('world series') || note.includes('stanley cup') || note.includes('super bowl');
    const homeNY = isNYShort(g.homeName);
    const awayNY = isNYShort(g.awayName);
    const nyWon = (homeNY && g.homeWin) || (awayNY && g.awayWin);
    return isTitleClincher && nyWon;
  });

  if (champGame) {
    const winner = isNYShort(champGame.homeName) ? champGame.homeName : champGame.awayName;
    return '\uD83C\uDFC6 BREAKING: ' + winner.toUpperCase() + ' ARE CHAMPIONS! · ' + today + ' · 🗽 NY Sports Daily';
  }

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

    // Save today's trivia to Supabase + fetch yesterday's answer
    await saveTodayTrivia(trivia);
    const yesterdayTrivia = await getYesterdayTrivia();

    // Fetch today's games once (shared across all subscribers)
    const allTodayGames = await getTodaysGames([]);

    // Fetch MLB pitching/series details (Mets + Yankees only, silent failsafe)
    const mlbDetails = await getMLBGameDetails([]);
    const mlbStandings = await getMLBStandings();

    // Weekly day nugget
    const today       = new Date();
    const dayOfWeek   = today.getDay(); // 0=Sun 1=Mon 2=Tue 3=Wed 4=Thu 5=Fri 6=Sat
    const weekNumber  = Math.floor((today - new Date('2026-01-01')) / 604800000);
    const nugget      = getDayNugget(dayOfWeek, weekNumber);

    // Saturday: fetch poll from Supabase
    let saturdayPoll = null;
    if (dayOfWeek === 6) saturdayPoll = await getSaturdayPoll();

    // Friday: Trophy Case — use GLORY_MOMENTS rotated by week
    const trophyEntry = (dayOfWeek === 5)
      ? GLORY_MOMENTS[weekNumber % GLORY_MOMENTS.length]
      : null;


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

        const html    = buildEmail(sub, scores, todayGames, headlines, glory, trivia, otd, mlbDetails, mlbStandings, yesterdayTrivia, nugget, saturdayPoll, trophyEntry);
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

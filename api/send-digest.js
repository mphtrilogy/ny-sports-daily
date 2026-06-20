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
    body: "In June of 1975, a private jet carrying the most famous athlete on earth touched down in New York. Pel\u00e9 had just signed with the New York Cosmos for a reported $4.5 million over three years -- the richest contract in the history of professional sports at the time, for a soccer team most Americans couldn't have located in the standings of any sport they actually followed. It was, on paper, an act of pure financial madness. It turned out to be one of the most important moments in the history of American sports marketing.\n\nThe Cosmos had been a forgettable franchise in the fledgling North American Soccer League, playing in front of a few thousand people at Hofstra University on Long Island. Warner Communications chairman Steve Ross owned the club and had a vision nobody else in American sports shared: soccer, the world's most popular game, simply needed the world's most famous player wearing the right jersey. He was right. Almost overnight, the Cosmos became a global phenomenon disguised as a New York sports team.\n\nPel\u00e9 was just the beginning. Ross and the Cosmos front office went out and signed West German legend Franz Beckenbauer, the most decorated defender in the history of the sport, followed by Brazilian international Carlos Alberto, who had captained Brazil's iconic 1970 World Cup championship team. By the time the roster was assembled, the Cosmos weren't just a soccer team -- they were arguably the most talented collection of players ever assembled on a single American sports roster, in any sport, at any time.\n\nThe team moved to Giants Stadium in 1977 because Downing Stadium on Randall's Island could no longer contain the crowds. They drew 77,691 fans for a playoff game that August -- a North American soccer attendance record that stood for decades. Mick Jagger, Henry Kissinger, Robert Redford and Andy Warhol turned up courtside. Studio 54 reportedly kept a private room for Cosmos players. This was not a niche sports phenomenon; for a few extraordinary years in the late 1970s, the Cosmos were as culturally significant in New York as the Yankees, the Knicks, or the Studio 54 dance floor itself.\n\nAnd they won. The Cosmos captured the NASL championship -- the Soccer Bowl -- in 1977, 1978, 1980 and 1982, assembling a run of dominance that the league's other franchises simply could not match, in talent or in spectacle. Giorgio Chinaglia, an Italian international striker who arrived the same era, became the NASL's all-time leading scorer playing alongside the legends Ross had imported. For a brief, shining window, it looked like soccer was about to become the next great American sport, the way Ross and his investors had gambled it would.\n\nThen it all came apart, almost as quickly as it had been built. Pel\u00e9 retired after the 1977 season. The NASL had expanded recklessly during the boom years, adding franchises in cities with no real soccer culture to support them, and television deals never materialized the way the league needed them to. Attendance around the rest of the league sagged even as the Cosmos kept selling out Giants Stadium. By 1984 the NASL had collapsed entirely, taking the Cosmos down with it. The team limped on briefly in indoor soccer before folding for good in 1985. The most glamorous team in the history of American sports had lasted barely a decade.\n\nThe dream did not entirely die, even if the original NASL did. The Cosmos name was revived in 2010 in the lower tiers of American soccer, won three more league titles in the 2010s, and went dormant again in 2020. Then, in February 2025, the franchise rose once more -- this time as a USL League One club anchoring a $110 million revitalization of the historic Hinchliffe Stadium in Paterson, New Jersey, just across the river from where it all began. It is a smaller stage than Giants Stadium in 1977. It is also, fifty years later, proof that the idea Steve Ross bet $4.5 million on -- that New York could fall in love with soccer -- never actually went away. It just needed the rest of the country to catch up.",
    team: "NY Cosmos",
    charity: "Soccer for Success (U.S. Soccer Foundation) | ussoccerfoundation.org/programs/soccer-for-success", year: 1977
  },
  {
    title: "Mark Messier's Guarantee: 54 Years Ends Tonight",
    body: "For 54 years, the New York Rangers had not won the Stanley Cup. An entire generation had been born, grown old, and in some cases died without seeing it happen. Opposing fans had turned the drought into a chant -- \"1940! 1940!\" -- the year of the Rangers' last championship, hurled across rinks like a curse. By the spring of 1994, the wait had become something close to a punchline. It was about to become something else entirely.\n\nThe Rangers had assembled a roster built to end exactly this kind of suffering. Mark Messier arrived via trade from Edmonton in 1991, bringing with him five Stanley Cup rings and a captain's presence that no one in the organization could fully replicate on their own. Mike Keenan took over as head coach in 1993, demanding and unyielding. Brian Leetch anchored the blue line with a smoothness that made the game look slower than it was. Mike Richter stood on his head in net, game after game. They won the Presidents' Trophy for the best regular-season record. Everyone in New York allowed themselves, cautiously, to hope.\n\nThe path to the Cup ran straight through New Jersey. The Devils, the Rangers' tormentors from across the Hudson, had pushed the Eastern Conference Final to six games and held a 3-2 series lead heading into Game 6 at Brendan Byrne Arena. The Rangers were facing elimination on the road, the kind of moment that had swallowed this franchise whole for more than five decades.\n\nThen Mark Messier did something that, in retrospect, only Mark Messier could have pulled off. The day before the game, surrounded by reporters at practice, he was asked about New York's chances. \"We know we are going to go in there and win Game 6 and bring it back to the Garden,\" he said -- not a hope, not a hedge, a guarantee, stated as fact. \"I felt that guaranteeing a win would be a great way to let my players know that I believed we could go in there and win Game 6,\" Messier explained later, \"because we had beaten them six times during the regular season -- three times in their building.\"\n\nThe tabloids could not resist. The Daily News ran \"MESS SEZ WE'LL WIN.\" The Post countered with \"WE'LL WIN TONIGHT\" above a photo of the Rangers captain, branding him Captain Courageous. Messier insisted afterward he hadn't fully grasped what he'd unleashed. \"I was so focused in on our own team that I wasn't really looking into everybody else getting up and reading the New York Post,\" he said. \"I thought there would be 19 or 20 players reading it.\" Instead, by puck drop, the entire tri-state area had read it.\n\nNew Jersey made him look foolish early. The Devils jumped out to a 2-0 first-period lead in front of a hostile home crowd that smelled blood. Messier, nursing sore ribs from the physical series, did not panic. Late in the second period he set up Alexei Kovalev to cut the deficit to 2-1, and the Garden faithful watching on television exhaled, just slightly. Then the third period arrived, and Mark Messier authored one of the great individual performances in playoff history. He tied the game. He put New York ahead with under eight minutes remaining. And with the Devils pulling their goalie in desperation, he found the empty net to complete a natural hat trick and seal a 4-2 victory, exactly as promised.\n\nTwo nights later, back at Madison Square Garden, the Rangers and Devils played a Game 7 that needed double overtime to settle. Stephane Matteau -- a journeyman winger who would never again come close to this kind of moment -- buried the series winner past Martin Brodeur, and the building shook in a way it hadn't in over five decades. \"Matteau! Matteau! Matteau!\" broadcaster Howie Rose screamed into his microphone, the call instantly entering Rangers lore alongside the guarantee itself.\n\nThe Stanley Cup Final against the Vancouver Canucks was, fittingly, not easy. It went the full seven games, the last of them played at the Garden on June 14, 1994. The Rangers won 3-2, and Mark Messier -- already a five-time champion with Edmonton, already a Hall of Famer in waiting -- lifted the Stanley Cup as captain of the New York Rangers. Fifty-four years of waiting ended in a single, deafening roar. Fathers who had waited their whole lives turned to sons who had only ever known the chant of \"1940\" and, for the first time, got to point at a banner instead of an insult.\n\nMessier called that Devils series \"maybe one of the best series\" he ever played in, and three decades later he still describes the run with something between pride and disbelief. \"We had a great team, great camaraderie, we had great chemistry, unbelievable character on our team,\" he said, \"and we were very much a part of the whole fabric of the city. I think because of it, it was something that we were able to share with the entire city and something it had been waiting for for a long time.\"\n\nThe guarantee itself has only grown larger with age. Photos of that Post back page still surface at Rangers games three decades later, held aloft by fans too young to have witnessed it live, passed down like a family heirloom. It remains the single boldest promise in New York sports history that was actually kept -- not a guarantee made and quietly forgotten, but one fulfilled in real time, on the road, against a desperate opponent, by a captain who refused to let his team's 54-year nightmare continue one inning, one period, one shift longer than it absolutely had to.",
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

  {
    title: "53 Years: The Full Story of the 2026 Knicks Championship",
    team: "Knicks", year: 2026,
    charity: "Garden of Dreams Foundation | gardenofdreams.org",
    body: "Fifty-three years. Let's sit with that number, because the Knicks certainly made everyone else sit with it long enough. Fifty-three years is long enough for a baby born the last time this team won a title to retire with a full pension. It's long enough that entire generations of New Yorkers grew up, had kids, and explained to those kids — with a straight face, the way adults are supposed to — that no, the Knicks had never won anything in their lifetime, and yes, we were all still completely serious about caring this much regardless. On June 13th, that ended. And it ended the most Knicks way imaginable: messy, terrifying, and somehow spectacular by the time it was over.\n\nAnd yes, let's get the obvious joke out of the way early, because somebody's going to make it anyway: the team across the hall waited 54 years before finally breaking through, in 1994. The Knicks had to sit there and watch that parade too. Misery doesn't care which jersey you're wearing. It just likes long math.\n\nBut this number — fifty-three years — was never just one long, flat stretch of nothing. It had texture. It had specific, individual wounds, decade by decade, each one its own particular flavor of New York heartbreak. To understand what June 13th actually meant, you have to walk through all of it.\n\n**THE 80s: A SCORING MACHINE, GONE IN ONE STEP**\n\nThe decade after the 1973 championship wasn't kind, and it set an early tone the Knicks would spend the rest of the century failing to shake. By 1982, the team was bad enough that guard Michael Ray Richardson, asked by a reporter to assess the state of his sinking franchise, offered up four words that have outlived nearly everyone involved: \"The ship be sinking.\" It's still quoted today, usually by some other miserable fan base borrowing the line for their own disaster.\n\nThe Knicks' response, that same year, was to trade Richardson to Golden State for a 6-foot-7 small forward out of Brooklyn named Bernard King. It turned into the best basketball decision the franchise made in the entire decade. King was relentless, a player Knicks legend Red Holzman called \"the greatest scoring machine I've ever seen.\" On back-to-back nights in January 1984, King dropped 50 points in Texas, against the Spurs and then the Mavericks — the first time anyone had done that in consecutive games since Rick Barry in 1967. On Christmas Day that December, in a losing effort against the Nets no less, he scored 60. By the 1984-85 season he was the league's scoring leader at nearly 33 points a game, outproducing Larry Bird, on a Knicks team that, true to form, still only won 24 games around him.\n\nThen, on March 23, 1985, in a nothing late-season game in Kansas City, King planted his right leg trying to contest a dunk and simply ran out of his own knee — a torn ACL, torn meniscus, and a fractured femur, all at once, the kind of injury nobody in professional basketball had ever fully come back from. King later said there were only two moments of real depression in the entire ordeal: the night it happened, and two months later, when the Knicks used the draft lottery pick they'd backed into — by losing all those games without him — to select Patrick Ewing. King realized, watching that pick get made, that the franchise might finally have its championship center, and he might not be there to share in it. He fought back anyway, missing the entire 1985-86 season and most of the next, working in private, refusing to let anyone watch him fail. The Knicks released him before he ever got the chance to prove he was whole again. He went to Washington and made another All-Star team in 1991, at an age and on a knee that should have made it impossible. New York didn't get to keep him for any of it.\n\nIt would be hard to invent a more perfectly Knicks decade than this one: their best offensive talent in a generation, gone in a single freak step, replaced on the roster sheet by exactly the player who'd go on to define — and frustrate — the next fifteen years of the franchise.\n\n**THE 90s: SO CLOSE, REPEATEDLY, ON PURPOSE**\n\nIf the 80s were one sharp, sudden tragedy, the 90s were death by a thousand near-misses, each more specific and more painful than the last.\n\nThe defining Knicks team of the era arrived in 1994 under Pat Riley — Ewing, John Starks, Charles Oakley, a roster that didn't so much play basketball as administer a series of structured fistfights. They reached Game 7 of the NBA Finals against Hakeem Olajuwon's Houston Rockets. In Game 6, up two points with 5.5 seconds left, all they had to do was not lose. Starks launched a potential series-winning three that Olajuwon got just enough of a hand on to alter. Two nights later, in Game 7, Starks went 2-for-18 from the field — a stat line that still has its own wing in the museum of New York sports pain — and Houston closed it out.\n\nHere is the detail that somehow gets funnier and stranger every time it's retold: Game 5 of that same series, played at Madison Square Garden, got hijacked midway through by a white Ford Bronco. O.J. Simpson, fleeing an arrest warrant in the murder of his ex-wife and her friend, led Los Angeles police on a slow-speed chase down the 405 with a gun reportedly to his own head, and NBC — which also happened to employ Simpson as an NFL sideline reporter — cut away from live Finals action to Tom Brokaw narrating freeway footage in real time. For long stretches, the actual basketball game got shoved into a small box in the corner of the screen while close to a hundred million Americans watched a Bronco instead. Reportedly, at one point during the chase, Simpson himself asked his driver to slow down so he could listen to the end of the Knicks game on the radio before surrendering. New York won that night, 91-84, behind 25 from Ewing — on the very same day, as it happens, that the Rangers were holding their own championship parade up the Canyon of Heroes for that 54-year title. One New York team got its parade. The other got buried by a car chase on its own night, and then lost the series two days later anyway. You could not write this. It actually happened.\n\nThe following spring brought a quieter, smaller-scale version of the same poison: Game 7 of the 1995 Eastern Conference Semis against Indiana, tied with seconds left, Ewing — whose hands, for a player his size, were never quite big enough — drove the lane for a finger roll that rolled off the rim and out. No overtime. No second chance.\n\nBy 1998, the Knicks' rivalry with Pat Riley's own Miami Heat (Riley having left New York for Florida, in its own small betrayal) had curdled into something close to a blood feud, and it produced maybe the single funniest fifteen seconds in franchise history. Late in Game 4 of their first-round series, Alonzo Mourning and Larry Johnson came to blows near midcourt. Knicks head coach Jeff Van Gundy — 5-foot-9, maybe 165 pounds soaking wet — sprinted onto the court to break it up and ended up, instead, wrapped around Mourning's leg like a child trying to stop a parent from leaving the house, getting dragged several feet across the floor while still holding on. \"He felt like a piece of gum on my shoe,\" Mourning said years later, with real affection. Both men still laugh about it whenever they cross paths. It's one of the only purely joyful memories to come out of the entire decade, and it happened during a brawl.\n\nThe last real shot of the Ewing era arrived in 1999, under circumstances nobody could have scripted. New York barely made the playoffs, sneaking in as the eighth and final seed in the East — and then did something no team in NBA history had ever done, riding that eighth seed all the way to the Finals. Ewing tore his Achilles along the way and was lost for the rest of it. The Knicks got there anyway, banged up and overmatched, and ran straight into a San Antonio Spurs team built around a young, generational big man named Tim Duncan. San Antonio won in five. Latrell Sprewell put up a genuinely heroic 35 points in the Game 5 loss, a 78-77 final that still stings precisely because of how close it actually was. It would be New York's last Finals trip for twenty-seven years. And the team that finally beat the Knicks for the title in 2026 was the exact same San Antonio Spurs franchise that broke their hearts in 1999 — same logo, different generation, the only team standing on the other side of both the franchise's most painful near-miss and, decades later, its actual redemption.\n\n**THE 2000s AND 2010s: SELF-INFLICTED**\n\nWhat followed the Ewing era wasn't a rebuild. It was closer to a slow-motion demolition, and the Knicks did most of the demolishing themselves, with their own hands, repeatedly, on purpose. The cracks showed almost immediately: fresh off the '99 Finals heartbreak, New York used the 15th pick that summer's draft on a seven-foot Frenchman named Frederic Weis — one slot ahead of Ron Artest, who'd go on to a long, productive NBA career while Weis never played a single game in a Knicks uniform. A year later, at the Sydney Olympics, Vince Carter literally jumped clean over him for a dunk that ended up more famous than anything Weis accomplished in his actual career — which, for a player whose entire American basketball future had rested on that draft pick, is its own special cruelty.\n\nThen came Isiah Thomas, hired by owner James Dolan in 2003 with zero front office experience, who proceeded to construct what's still considered, by nearly unanimous consent, one of the worst stretches of roster management the league has ever seen. He shipped multiple future first-round picks to Chicago for Eddy Curry — picks that became LaMarcus Aldridge and Joakim Noah, two players who went on to have very good careers wearing literally any jersey except a Knicks one. He handed out bench-player money like he was chasing a record for it, blew the team's cap flexibility for years, and somehow managed to have the league's highest payroll and one of its worst records in the same season. A former team executive sued Thomas and the organization for sexual harassment and won, to the tune of $11.6 million. Dolan's response was to re-sign Thomas to an extension afterward, rather than fire him.\n\nA few years later came the trade that, more than any other single move, defines the Dolan era's particular brand of self-sabotage. In February 2011, with Carmelo Anthony available in Denver and the crosstown Nets circling, general manager Donnie Walsh wanted to wait — let Melo's contract run out, sign him outright that summer for nothing in return. Dolan, panicked that the Nets would beat him to a star ahead of their move to Brooklyn, overruled Walsh entirely and forced the trade through anyway, surrendering Wilson Chandler, Raymond Felton, Danilo Gallinari, Timofey Mozgov, multiple first-round picks, and more. Walsh resigned that summer. In one of the stranger footnotes in this entire story, the agent reportedly behind the architecture of that very deal — sending Carmelo to New York, Amar'e Stoudemire's money to Toronto, the assets flying everywhere — was Leon Rose, then still working as a CAA super-agent. The same quiet operator who'd eventually run the front office that won a championship in 2026 had, a decade and a half earlier, helped engineer one of the moves that set the franchise back the furthest.\n\nPhil Jackson arrived in 2014 with eleven championship rings as a player and coach, hired specifically to import the winning culture he'd built in Chicago and Los Angeles. He tried to install the triangle offense in a league that had already moved past it, clashed openly with Anthony, and the Knicks missed the playoffs in every single season of his tenure. By this point \"Dolan's Knicks\" wasn't really a phrase anymore — it was a fully recognized national punchline, understood instantly by basketball fans who'd never set foot in New York in their lives.\n\n**HOW WE ACTUALLY GOT HERE**\n\nAnd then, almost quietly, the part that worked began.\n\nLeon Rose took over as team president in March 2020 — the same Leon Rose from the Carmelo deal, only now running the show instead of brokering it from the outside. He brought William Wesley, known across the league simply as World Wide Wes, in as an executive vice president with a Rolodex that may be the single most valuable non-playing asset in basketball. Reporters who've covered Rose for years say it's genuinely easier to get him talking about Bruce Springsteen than about an actual trade. He doesn't do victory laps. He doesn't explain himself in press conferences. The first time anyone really saw what this team meant to him personally was when he broke down in tears on the bench as the clock wound down in Cleveland, the Knicks finally clinching their first trip back to the Finals since 1999.\n\nWhat Rose and Wesley built over five years was a roster constructed almost entirely out of players the rest of the league had quietly decided weren't quite stars — and that wasn't an accident, it was the whole philosophy. It started with Jalen Brunson in 2022, a 6-foot-2 second-round pick out of Villanova who got a four-year, $104 million contract that the rest of the league treated as a punchline. Three years later, Brunson did something that barely made news at the time but mattered enormously: he signed an extension worth $113 million less than he could have commanded on the open market, freeing up exactly the cap space the front office needed to build out the roster around him. Stars don't usually leave that kind of money on the table. Brunson did, quietly, and it's arguably the single most important transaction of the entire championship.\n\nThe front office spent that room aggressively. In the summer of 2024, the Knicks sent five unprotected first-round picks and a draft swap to the Brooklyn Nets — the crosstown rival, watching the whole thing with obvious glee — for Mikal Bridges, a reliable wing defender who'd never made an All-Star team. The reaction across the league was nearly unanimous: an absurd overpay, the kind of draft capital you spend on a top-five superstar, not a role player. Bridges started slow enough in year one that columnists were ready to call the trade a disaster outright. He spent this postseason making all of them eat it — locking up Tyrese Maxey well enough in the second round to take him almost entirely out of the series, then erupting through the Eastern Conference run. Midway through the first round, with the Knicks' season briefly on the line, one team executive summed up the front office's confidence about as bluntly as you'll ever hear an NBA team talk about its own trade: \"F— them picks.\" Nobody was still counting them by the time the Finals arrived.\n\nThe Karl-Anthony Towns trade, completed on the eve of the 2024-25 season, asked the fan base to give up something it actually liked — Julius Randle, a popular and productive player — in exchange for the seven-foot stretch-five the roster had been missing for a decade. And underneath all of it sat a stranger, more New York footnote that deserves its own mention, because it sounds invented and isn't: for years, Dolan's reputation as the league's most meddling, micromanaging owner was not just deserved but legendary. And then, right around the time Rose and Wesley were quietly building this roster, Dolan got very busy building something else entirely — the Sphere, his massive entertainment venue out in Las Vegas. By multiple accounts from inside the organization this spring, Knicks staffers have come to genuinely credit the Sphere with helping the championship happen, in the strange backhanded way that only sports can produce a compliment like this: Dolan, consumed by his shinier new project, simply stopped getting in the way. He let go, not because he chose to, but because something else finally held his attention instead. New York may genuinely owe a small, ironic debt to a giant orb in the Nevada desert.\n\nNone of it looked inevitable in real time. Mike Brown, hired the previous summer as the 24th coach since 1973, inherited a finished roster but not yet a finished identity, and at one stretch this season the Knicks sat 25-18, technically third in the East but feeling, in that particularly New York way, much closer to tenth. Something clicked in April. Atlanta in six. Philadelphia in a sweep. Cleveland in the Conference Finals, New York's deepest run since that cursed 1999 season, outscoring its playoff opponents by 271 total points along the way — the largest such margin in NBA postseason history.\n\nThe Finals against the Spurs and a genuinely terrifying Victor Wembanyama opened about as well as it possibly could, the Knicks stealing both games in San Antonio before the Spurs evened things at the Garden. Then came Game 4, as strange a basketball game as has ever been played on a stage this size — San Antonio up 29 at one point, the Garden gone quiet in a way that, for this fan base, has historically meant exactly the wrong thing — before New York authored the largest comeback in NBA playoff history, OG Anunoby tipping in the winner with 1.2 seconds left. Two nights later in Game 5, down 16 in the third quarter, Jalen Brunson scored 45 — his ninth thirty-point game of the postseason — and New York closed it out, 94-90. Fifty-three years, done.\n\n**THE GUY ON THE CALL**\n\nOne more piece of this deserves its own space, because it's the kind of detail that only really lands if you understand what it means to actually be from here.\n\nMike Breen called Game 5 — the lead voice of NBA broadcasts on ABC and ESPN since 2006, the Knicks' own play-by-play man since the late 1990s. But long before any of that, he was a kid from Yonkers who started rooting for this team around age seven, old enough to have actually watched both of the franchise's previous championships happen live, in 1970 and 1973, well before he ever sat behind a microphone for a living. He spent the next twenty-seven years — coincidentally, exactly as long as the gap between 1999 and this latest Finals trip — waiting for the Knicks to get back to the biggest stage at all, let alone win it. Breen has always kept his own fandom out of the actual broadcast — \"I learned from the best in Marv Albert that you have a job to do,\" he's said — and by every account he managed it again on the biggest night of his career. But afterward, microphone finally down, he let himself say it plainly: \"I feel so happy for the fans. I've been a fan since I was about seven years old. I've been a Knick broadcaster for more than half my life... for them to have a night like this is wonderful.\" A hometown guy, calling the biggest moment in his hometown team's history, after waiting for it just about as long as anyone else in that building.\n\n**WHAT IT MEANS**\n\nFifty-three years of this — Bernard King's knee, the Bronco interrupting the Finals, the missed finger roll, Van Gundy holding on for dear life, the eighth-seed miracle that fell one round short, the Weis pick, Isiah Thomas, the Carmelo trade Dolan forced through over his own GM's objections — finally gave way, in one absurd, glorious June, to something this city had quietly stopped letting itself hope for. The Knicks are NBA Champions. Again. Finally.\n\nAnd with Brunson, Towns, Bridges, Anunoby and Hart all locked up for years, Leon Rose still operating in near-total silence somewhere behind the scenes, and Mike Brown already proving to be exactly the voice this group needed, this doesn't look like a one-year miracle that quietly ends here. It looks, against every bit of historical evidence the Knicks have ever given us reason to expect otherwise, like a beginning."
  }
];


const ALL_DEEP_DIVES = DEEP_DIVES.concat(DEEP_DIVES_NEW).concat(DEEP_DIVES_EXTRA);

// ── MONDAY: BY THE NUMBERS ────────────────────────────────────────────────────
const BY_THE_NUMBERS = [
  { number:"27", label:"Yankee World Series Championships", story:"More than any franchise in North American professional sports. The Yankees have won 27 titles — nearly twice as many as their closest competitor. The number is simultaneously their greatest achievement and their greatest burden: every season without one feels like failure." },
  { number:"56", label:"DiMaggio's Consecutive Game Hitting Streak, 1941", story:"Set between May 15 and July 17, 1941. Still the most untouchable individual record in major American sports. No one has come within 12 games of it since. In 83 years of trying, baseball has produced nothing close." },
  { number:"17", label:"Point Underdog — Jets in Super Bowl III", story:"The Jets were 17-point underdogs to the Baltimore Colts when Joe Namath guaranteed victory. He was right. The 16-7 win remains the biggest upset in Super Bowl history, and Namath's guarantee remains the most famous prediction in sports." },
  { number:"4", label:"Consecutive Stanley Cups — NY Islanders, 1980-1983", story:"The first American franchise to win four consecutive Stanley Cups. The Islanders matched the dynastic runs of the Montreal Canadiens. Potvin, Trottier, Bossy, Smith — a dynasty that Long Island built quietly and the rest of the hockey world eventually had to acknowledge." },
  { number:"100-to-1", label:"Odds on the 1969 Mets at Season Start", story:"The Miracle Mets were 100-to-1 longshots in April. They were 9.5 games behind the Cubs in August. They won 100 games, swept the NLCS, and beat the Orioles in five in the World Series. The number 100-to-1 still means something specific if you grew up in New York." },
  { number:"9", label:"Consecutive 50-Goal Seasons — Mike Bossy", story:"Mike Bossy scored 50 or more goals in each of his first nine NHL seasons — a record that has never been matched. He averaged 57 goals per season over his career. A back injury ended it at 10 seasons. We will never know what the number would have been." },
  { number:"73", label:"Points — Mark Messier's 1991-92 Season with Rangers", story:"Messier's first full season in New York produced 107 points and the Hart Trophy. But it was the character he brought — five Stanley Cup rings, a captain's presence — that changed what the Rangers believed was possible. Two years later, the Cup came back to New York." },
  { number:"3,465", label:"Career Hits — Derek Jeter", story:"The sixth-most in baseball history, all of them in a Yankees uniform. Jeter played 20 seasons in New York and never played a single game for another team. The number 3,465 doesn't capture the intangibles, but nothing about Derek Jeter was ever fully captured by numbers." },
  { number:"54", label:"Years Between Rangers Stanley Cup Championships", story:"From 1940 to 1994. Two generations of New York hockey fans were born, grew old, and in some cases died without seeing it. When it ended — Sam Rosen's call, the Garden erupting — it was the longest-running drought in NHL history." },
  { number:"77,691", label:"Fans at Giants Stadium for NY Cosmos, 1977", story:"The largest soccer crowd in North American history at the time. Pelé, Beckenbauer, Carlos Alberto, and 77,691 people who had been told Americans didn't care about soccer. The game that proved them wrong for a decade — and then the NASL collapsed, and the dream went dormant for 40 years." },
  { number:"20", label:"Consecutive Seasons — Mariano Rivera, One Team", story:"Rivera pitched for the Yankees from 1995 to 2013 — 19 seasons, plus the postseason that extended it to 20 effective years of dominance. 652 career saves. The first unanimous Hall of Fame inductee in history. The greatest closer who ever lived, all of it in pinstripes." },
  { number:"41", label:"Years — Phil Rizzuto's Yankee Career (Player + Broadcaster)", story:"Rizzuto played for the Yankees from 1941 to 1956 and called their games on radio and television until 1996 — a 55-year association with a single franchise, as player and broadcaster. No one in New York sports has given more years to one organization." },
  { number:"5", label:"World Series Titles — Yankees, 1949-1953", story:"Five consecutive World Series championships. The most dominant five-year run in the history of American team sports. Casey Stengel managed all five. DiMaggio played in three, then retired. Mantle arrived and kept winning. The number 5 in five years has never been replicated in any major sport." },
  { number:"2,632", label:"Consecutive Games — Lou Gehrig", story:"Gehrig played in 2,632 consecutive games before ALS forced him out in 1939. Cal Ripken eventually broke it at 2,131. Gehrig's streak is remembered not for the number but for why it ended — and the speech he gave when it did." },
  { number:"108", label:"Wins — 1998 New York Yankees", story:"The Yankees won 114 regular season games and 125 total including playoffs in 1998 — the most dominant single-season run in modern baseball. David Wells threw a perfect game in May. David Cone threw one in July. They swept the Padres in the World Series. It was, by any measure, the greatest Yankees season since 1927." },
  { number:"24,000", label:"Career Points — Wayne Gretzky at MSG", story:"Gretzky scored his 1,851st career point against the Rangers in 1989, setting the all-time NHL scoring record. He ended his career as a Ranger, retiring in a ceremony at Madison Square Garden in 1999. The Garden has held many retirements. None like his." },
  { number:"69", label:"Sacks — Lawrence Taylor Career Total", story:"Taylor recorded 132.5 sacks in his career, but his single-season record of 20.5 in 1986 is the number that defines the era. He also won the MVP that year — one of the only defensive players in history to do so. He redefined what a linebacker was supposed to do." },
  { number:"660", label:"Home Runs — Willie Mays at the Polo Grounds", story:"Willie Mays played the first years of his career with the New York Giants at the Polo Grounds before the team moved to San Francisco. His over-the-shoulder catch of Vic Wertz's drive in the 1954 World Series — 'The Catch' — happened in that park. New York had him first, and let him go." },
  { number:"4.5", label:"Million Dollars — Pelé's Contract with the Cosmos, 1975", story:"The richest contract in the history of professional sports at the time. Warner Communications chairman Steve Ross spent $4.5 million on Pelé to put American soccer on the map. For a decade, it worked. Giants Stadium drew 77,000. Then the NASL collapsed. The number remains a monument to an audacious idea that was right about everything except the timing." },
  { number:"42", label:"Years — Bob Murphy's Tenure with the Mets", story:"Murphy called Mets games from 1962 to 2003 — 42 seasons, longer than any broadcaster with a single team in baseball history at the time. He called expansion-era futility, the 1969 miracle, the 1986 championship, and everything in between, with the same warm baritone and the same genuine affection for the team and its fans." },
  { number:"86", label:"Years — Red Sox Wait Between World Series Titles", story:"The Red Sox did not win the World Series from 1918 to 2004. During that same 86-year period, the Yankees won 26 championships. The Curse of the Bambino — named for the Babe Ruth sale that triggered it — became baseball's most famous superstition. When it ended, in 2004, it ended with the Red Sox coming back from 3-0 against the Yankees in the ALCS." },
  { number:"11", label:"Players — Giants Defensive Unit, 1956 NFL Champions", story:"The 1956 New York Giants defense, coached by Tom Landry, was one of the first in NFL history to be treated as a unit with its own identity. Sam Huff, Andy Robustelli, Emlen Tunnell. The 47-7 championship game victory over the Chicago Bears remains one of the most lopsided in title game history. It was the foundation of a Giants dynasty that won the championship again in 1958 and reached the title game five more times in the next seven years." },
  { number:"10", label:"Days After 9/11 — When Baseball Came Back", story:"The Mets played their first home game 10 days after September 11, 2001. Mike Piazza hit a home run in the eighth inning. The number 10 — the days it took to return to the field — represents something specific about what sports actually does in moments of genuine grief: it comes back, because the city needs it to." },
  { number:"7", label:"World Series — Casey Stengel Managed", story:"Stengel managed the Yankees to seven World Series championships in 12 years (1949-1960), winning five consecutively. He was then fired. He came back to manage the 1962 Mets — the worst team in modern baseball history — and made them beloved. His career arc is the most complete story in New York baseball managing." },
  { number:"200", label:"Career Wins — Tom Seaver at Shea", story:"Tom Seaver won 198 games in two stints with the Mets, plus two more while briefly returning in 1983 before the Mets inexplicably let him go to Chicago on a free agent technicality — one of the worst front-office decisions in franchise history. Seaver was the greatest pitcher the Mets ever had. The front office knew this and still let him go. Twice." },
  { number:"1", label:"Game — The 1951 Playoff Between Giants and Dodgers", story:"One game. After 154 regular season games, the Brooklyn Dodgers and New York Giants were tied. One additional game, at the Polo Grounds, decided the National League pennant. Bobby Thomson hit a three-run homer in the bottom of the ninth — 'The Shot Heard 'Round the World.' The Dodgers had a 4-2 lead with one out. Thomson hit the second pitch he saw. One game decided everything, forever." },
  { number:"99", label:"Career Shutouts — Whitey Ford", story:"Ford pitched 99 career shutouts and won 236 games with a .690 winning percentage — the highest in the history of major league baseball for any pitcher with more than 200 wins. He pitched in 22 World Series games and won 10 of them. The Chairman of the Board. All of it in pinstripes." },
  { number:"15", label:"Years — Ed Westfall as Islanders Analyst", story:"Ed Westfall, the former Islanders captain, spent 15 years alongside Jiggs McDonald in the broadcast booth, calling three of the Islanders' four Stanley Cup championships. His combination of former-player credibility and warmth made him the model color analyst for a generation of Long Island hockey fans who grew up with that team." },
  { number:"8", label:"Pro Bowl Selections — Lawrence Taylor", story:"Taylor made the Pro Bowl in 10 of his 13 seasons. He won two Super Bowls. He won the 1986 NFL MVP — one of the few defensive players ever to do so. But the number 8 consecutive Pro Bowls from 1981 to 1990, with only a brief interruption, tells you better than the awards do just how long he was the best player in football." },
  { number:"50", label:"States Watching Namath's Guarantee", story:"When Namath guaranteed a Super Bowl victory in January 1969, the clip played on every television station in the country. It was not just a New York story. The AFL was in the middle of proving its legitimacy against the NFL, and Namath's guarantee — and then his team's performance — settled the argument in a way that no game before or since has quite replicated." },
  { number:"32", label:"Years — Phil Simms With the Giants Organization", story:"Simms played for the Giants from 1979 to 1993 and then spent decades in broadcasting, much of it covering the team that drafted him. His Super Bowl XXI performance — 22-for-25, 88% completion rate, still a Super Bowl record — is the best single-game quarterback performance in championship history. He never got the credit he deserved while playing. Posterity has been more generous." },
  { number:"0", label:"Rings — Patrick Ewing's Knicks Career", story:"Zero. Patrick Ewing played 15 seasons in New York, made 11 All-Star teams, and never won a ring. He came closest in 1994 — Game 7 of the Finals, in Houston, with John Starks going 2-for-18 and the series slipping away. The city loved him anyway, completely and without condition. When the Knicks won in 2026, Ewing was there as an ambassador. The zero, at last, no longer defined him." },
  { number:"53", label:"Years — Between Knicks NBA Championships", story:"From 1973 to 2026. Two generations of New York basketball fans were born and grew old without seeing it. When Jalen Brunson scored 45 points in Game 5 in San Antonio, the drought ended in a city that had almost stopped believing it was possible. The number 53 will be the number Knicks fans cite for the rest of their lives." },
  { number:"40", label:"Years — Sam Rosen's Tenure with the Rangers", story:"Rosen called Rangers games from 1984 to 2025 — 40 seasons, from the lean years of the 1980s through the 1994 championship through the Lundqvist era through the rebuilds. He retired after the 2024-25 season. The Rangers gave him a custom jersey with his signature call on the back. No. 40." },
  { number:"1987", label:"The Year WFAN Changed Sports Radio Forever", story:"In 1987, WFAN launched in New York as the first 24-hour all-sports radio station in America. The format — no music, no news, just sports, all day, all night — was considered a gamble. New York proved it wasn't. The format spread to every major American city within a decade. Thirty-seven years later, WFAN is still running." },
  { number:"25", label:"Miles — The Distance Between the Two NY Hockey Arenas", story:"Madison Square Garden and UBS Arena on Long Island are separated by 25 miles on the Long Island Expressway. In those 25 miles lives one of the most intense tribal divisions in New York sports — Rangers fans vs. Islanders fans, Manhattan vs. Long Island, blue and white vs. blue and orange. The highway that connects them also divides them." },
];

// ── TUESDAY: THE VOICE — NY Sports Broadcasting History ────────────────────────
const NY_VOICES = [
  { title:"Mel Allen: \"Going, Going, Gone!\"", voice:"Mel Allen", team:"Yankees", era:"1939–1964", quote:"Going, going, gone!", story:"The Voice of the Yankees from 1939 to 1964, Mel Allen was born Melvin Israel in Alabama, the son of Jewish immigrants. He changed his name on air, became the most famous broadcaster in America, and turned \"Going, going, gone!\" and \"How about that?\" into the soundtrack of Yankee dominance. He called DiMaggio's 56-game hitting streak, every Yankees dynasty of the 40s and 50s. Then, without explanation, the Yankees fired him in 1964. Red Barber later said: \"He gave the Yankees his life and they broke his heart.\" He came back decades later as the first host of This Week in Baseball — and a generation who had forgotten, remembered all over again." },
  { title:"Red Barber: The Ol' Redhead Comes to New York", voice:"Red Barber", team:"Dodgers/Yankees", era:"1939–1966", quote:"Sitting in the catbird seat.", story:"Red Barber was the voice of the Brooklyn Dodgers from 1939 to 1953 — a Mississippi man with a Southern lilt who taught an entire borough to love baseball. His vocabulary was poetic: a bases-loaded situation was \"the catbird seat,\" a close game was \"tighter than a new pair of shoes.\" When the Dodgers left for Los Angeles, Barber moved to the Yankees — where he and Mel Allen formed arguably the greatest broadcast duo in baseball history. The Yankees eventually fired him too, in 1966, for honestly reporting an embarrassingly small crowd. It was the most principled exit in the history of New York sports broadcasting." },
  { title:"Marty Glickman: The Voice That Built NY Sports Broadcasting", voice:"Marty Glickman", team:"ALL NY", era:"1939–1992", quote:"Swishhhhhhhhh!", story:"Before Marv Albert, before any of them, there was Marty Glickman. Born in the Bronx in 1917, he was a sprinter who made the 1936 US Olympic team — then was pulled from the relay at the last minute in Berlin, along with the only other Jewish athlete on the squad, in what most historians believe was an attempt to avoid offending Adolf Hitler. Glickman went home and spent the next 50 years becoming the defining voice of New York sports. Knicks for 24 years, Giants for 23 years, pre/post-game shows for the Dodgers and Yankees for 22. He invented the word \"swish.\" Almost every great NY broadcaster who came after him — Marv Albert, Mike Breen, Spencer Ross — traces a direct line back to Marty Glickman." },
  { title:"Marty Glickman: \"Good! Like Nedick's!\"", voice:"Marty Glickman", team:"Knicks", era:"1946–1970", quote:"Good! Like Nedick's!", story:"When a basket went through the hoop cleanly, Marty Glickman said \"Good — like Nedick's,\" a reference to the chain of NYC hot dog and orange-drink stands that sponsored the Knicks for years. It became a household phrase across the five boroughs. Glickman's calls were specific to New York in a way nothing before them had been — rooted in the streets, the neighborhoods, the hot dog stands and corner bodegas his listeners walked past every day. When kids in Queens or the Bronx heard \"Good — like Nedick's,\" they felt the person behind the microphone was one of their own. Because he was." },
  { title:"Lindsey Nelson: The Man in the Plaid Jackets", voice:"Lindsey Nelson", team:"Mets", era:"1962–1978", quote:"Hello everybody, I'm Lindsey Nelson!", story:"Lindsey Nelson called the first 17 years of Mets history alongside Bob Murphy and Ralph Kiner — a trio that gave New York's new National League team something it desperately needed: warmth. Nelson was a Tennessee man who had covered World War II before getting into broadcasting, attacking a career with legendary ferocity: 19 years of NFL football, 13 years of Notre Dame, the Masters, 26 bowl games. He owned more than 300 blazers, all of them famously garish. \"I looked them over,\" he once said of spotting plaid fabric in Hong Kong, \"and I'll take them all.\" The voice of the Miracle Mets' entire existence, in a jacket that could be seen from the upper deck." },
  { title:"Mel Allen: The Most Mysterious Firing in Sports Broadcasting", voice:"Mel Allen", team:"Yankees", era:"1964", quote:"How about that?", story:"In October 1964, the Yankees fired Mel Allen without explanation. No press conference, no statement, no reason ever officially given. Allen had been the Voice of the Yankees for 25 years. He had called 20 World Series. He had made \"How about that?\" a national phrase. He went home and sat in silence for years. The Yankees offered nothing. The baseball world offered nothing either. He later said: \"I don't know why they did it. I never found out.\" The most famous broadcaster in America spent a decade in the wilderness before This Week in Baseball brought him back. It remains one of the strangest and cruelest exits in the history of New York sports." },
  { title:"Marv Albert: The Birth of \"YES!\"", voice:"Marv Albert", team:"Knicks", era:"1967", quote:"YES!", story:"Marv Albert got his start as Marty Glickman's ballboy for the Knicks in the early 1960s. He became the voice of the Knicks in 1967. During a playoff game against Philadelphia, Knicks guard Dick Barnett hit a jumper that banked off the glass, and Albert — without planning it — said \"YES!\" for the first time. \"It just seemed to feel right,\" he recalled. \"I'd throw it in every once in a while on big baskets. That was when I started hearing it said back to me. I realized, people are actually listening.\" The greatest one-word call in sports broadcasting came out of a regular season Knicks game, on a bank shot by a player most fans have forgotten." },
  { title:"Marv Albert: Willis Reed Walks Out", voice:"Marv Albert", team:"Knicks", era:"1970", quote:"Willis Reed is on the floor!", story:"Marv Albert has called his single favorite moment as an announcer: before Game 7 of the 1970 NBA Finals, Willis Reed — who had torn a muscle in his thigh and been ruled out — walked gingerly out of the tunnel at Madison Square Garden to take the floor. The Garden erupted. Reed hadn't played Game 6. He hit the first two baskets of the game and the Knicks won the title with Reed barely able to run. Albert described the moment with a restraint and precision he has never forgotten. It remains the most iconic scene in Knicks history, and Marv Albert was behind the mic for every second of it." },
  { title:"Phil Rizzuto: \"Holy Cow!\"", voice:"Phil Rizzuto", team:"Yankees", era:"1957–1996", quote:"Holy Cow!", story:"Phil Rizzuto was a Hall of Fame Yankees shortstop who somehow became a more beloved figure in the broadcast booth than he had ever been on the field. \"Holy Cow!\" was his signature call — deployed for home runs, close plays, surprising moments, and occasionally for no discernible reason at all. He regularly interrupted game calls to wish listeners happy birthday, discuss his wife Cora, or mention cannoli. He once admitted, on air, that he had missed a key play because he was talking to Joe DiMaggio. None of it mattered. New York loved him completely and without reservation for 40 years." },
  { title:"Phil Rizzuto: The Broadcaster Who Made Everything Personal", voice:"Phil Rizzuto", team:"Yankees", era:"1957–1996", quote:"I'll tell you what — Holy Cow! That's all I gotta say.", story:"There are broadcasters who call games, and there are broadcasters who become part of the game. Phil Rizzuto was the second kind. His game calls were frequently interrupted by birthday announcements, cannoli references, observations about the weather, and lengthy discussions about traffic on the Garden State Parkway. He once left a game early — during a broadcast — to beat traffic. He once fell asleep on air, which a colleague had to cover for. He was, by every traditional measure, an unconventional broadcaster. He was also, by every measure that actually matters, exactly what New York needed: a man who made a baseball broadcast feel like a conversation at the dinner table." },
  { title:"Marv Albert: The Voice of the Rangers", voice:"Marv Albert", team:"Rangers", era:"1965–1995", quote:"YES! Rangers win!", story:"Before he was the Voice of the NBA nationally, Marv Albert spent nearly 30 years as the radio voice of the New York Rangers. The Rangers in the 1970s were legitimate contenders — Brad Park, Rod Gilbert, the high-scoring GAG Line — and Albert gave those years their sound. His Rangers work has been somewhat overshadowed by his NBA fame, but anyone who grew up in New York listening to hockey on the radio in the 1970s remembers Albert's voice the same way they remember Mel Allen. He was the sound of that team, in that arena. Sam Rosen, who eventually replaced him, called Albert the single biggest influence on his own career." },
  { title:"Bob Murphy: 42 Years of Mets Baseball", voice:"Bob Murphy", team:"Mets", era:"1962–2003", quote:"The Mets have won!", story:"Bob Murphy was the radio voice of the New York Mets from their very first game in 1962 until he retired after the 2003 season — 42 years, longer than any broadcaster with a single team in baseball history at the time. Murphy had a warm, professorial baritone that made even a Mets loss feel manageable. He called Tom Seaver, the 1969 miracle, the 1973 near-miss, the 1986 World Series, and all the decades in between. He never made it feel like suffering. His signature — a slow, considered \"The Mets have won!\" — was simple enough that it carried all 42 years of history with it by the time he finally said it for the last time." },
  { title:"Ralph Kiner: Kiner's Korner and 52 Years of Mets", voice:"Ralph Kiner", team:"Mets", era:"1962–2014", quote:"Solo home run with nobody on!", story:"Ralph Kiner hit 369 home runs in a Hall of Fame playing career, then spent 52 years as a Mets broadcaster. His post-game show, \"Kiner's Korner,\" was appointment television for decades, and his malapropisms became legendary: Gary Carter became \"Gary Cooper,\" Dwight Gooden became \"Dr. Jay,\" and dozens of players heard their names mangled with cheerful regularity. Nobody cared. Kiner was beloved precisely as he was — a former superstar who showed up every day with warmth and wit. When he died in 2014 at 91, having called Mets games in some capacity for 52 years, the franchise had lost its most enduring presence." },
  { title:"Sam Rosen: 40 Years, \"It's a Power Play Goal!\"", voice:"Sam Rosen", team:"Rangers", era:"1984–2025", quote:"It's a power play goal!", story:"Sam Rosen grew up a Rangers fan in New York and spent 40 years as their television voice. He called the 1994 Stanley Cup championship — ending the 54-year drought — in one of the most significant broadcast moments in New York hockey history. After his retirement in 2025, he showed up at the 2026 Winter Classic as a fan — and when the Rangers scored a power play goal, he stood up in the crowd and delivered the call to the fans around him: \"It's a power play goal!\" You can take the announcer out of the booth, apparently, but not out of the building. The Rangers gave him a custom jersey with his signature call on the back. He wore No. 40." },
  { title:"Lindsey Nelson Calls the 1969 Miracle", voice:"Lindsey Nelson", team:"Mets", era:"1969", quote:"The Mets are the world champions of baseball!", story:"The 1969 Mets were 100-to-1 longshots in April. By October they were World Champions, and Lindsey Nelson was behind the microphone for all of it. Nelson called Cleon Jones catching the final out in Game 5, the Mets storming the field, fans tearing up the Shea Stadium turf in celebration. It was the greatest upset in baseball history to that point, broadcast by a Tennessee man in a plaid jacket from a booth in Queens. Nelson later called it the most joyful professional moment of his life. When he died in 1995, the Baseball Hall of Fame released a statement noting he was the voice of a miracle." },
  { title:"Bob Murphy Calls the 1986 World Series", voice:"Bob Murphy", team:"Mets", era:"1986", quote:"The Mets are going to the seventh game of the World Series!", story:"Bob Murphy called the most dramatic game in Mets history — Game 6 of the 1986 World Series, the Buckner game — from the radio booth at Shea Stadium. When Mookie Wilson's grounder rolled through Bill Buckner's legs and Ray Knight scored the winning run, Murphy's call captured the disbelief of the moment with a precision the television broadcast never quite matched. Radio had always been the Mets' primary medium, and Murphy was the reason why. He made you see it without seeing it. The Mets' radio booth in 1986 was the warmest, most New York broadcast team in the franchise's history." },
  { title:"Howie Rose: \"Matteau! Matteau! Matteau!\"", voice:"Howie Rose", team:"Rangers", era:"1994", quote:"Matteau! Matteau! Matteau!", story:"On May 27, 1994, Stephane Matteau scored in double overtime of Game 7 of the Eastern Conference Finals to send the Rangers to the Stanley Cup Final. Howie Rose, then the Rangers' radio voice, delivered what may be the most famous call in New York hockey history: \"Matteau! Matteau! Matteau! Stephane Matteau! And the Rangers have one more step to take!\" The repetition wasn't planned — Rose simply couldn't stop saying the name, caught up in something he'd waited his entire life to call. Rose grew up in Bayside, Queens, a Mets fan who became the voice of three New York franchises. That one call, in that one game, is what most people hear when they close their eyes and picture New York hockey." },
  { title:"Gary Cohen: \"Outta Here!\"", voice:"Gary Cohen", team:"Mets", era:"2006–present", quote:"Outta here!", story:"Gary Cohen has been the television play-by-play voice of the Mets on SNY since 2006, and his home run call — \"Outta here!\" — has become one of the most recognizable phrases in New York baseball. Cohen grew up going to Shea Stadium, graduated from Columbia University, and called Mets games on radio for 17 years before moving to television. His partnership with Keith Hernandez and Ron Darling is widely considered the best booth in baseball — not because they agree on everything, but because they don't. Cohen holds it together with precision and humor. His philosophy: \"You try to make people feel what you feel.\" A lifelong Mets fan doing the most New York job in New York baseball." },
  { title:"Howie Rose: \"Put It in the Books!\"", voice:"Howie Rose", team:"Mets", era:"2003–2026", quote:"Put it in the books!", story:"Howie Rose inherited Bob Murphy's radio chair in 2003 and brought his own signature call: \"Put it in the books!\" — delivered with the satisfaction of a man from Bayside, Queens who'd been waiting his whole life to say it. He called the 2006 NLCS, the David Wright era, the 2015 pennant run. And Pete Alonso's stunning 2024 playoff homer against Milwaukee — \"It's gone! He did it! Pete Alonso with the most memorable home run of his career!\" — went viral within minutes and was played on the Mets' flight home while Rose stood and took a bow. In 2026 he announced his retirement at season's end. The kid from Bayside, finally hanging it up." },
  { title:"The Mets' Original Trio: Nelson, Murphy, Kiner", voice:"Multiple", team:"Mets", era:"1962–1978", quote:"You can't predict baseball, Suzyn.", story:"From 1962 through 1978, three men called Mets games together: Lindsey Nelson, Bob Murphy, and Ralph Kiner. No expansion franchise in any sport has ever had three Hall of Fame-caliber broadcasters simultaneously, for nearly two decades. Nelson was theatrical. Murphy was warm and meticulous. Kiner was conversational and funny, with a Hall of Fame playing career underneath all the malapropisms. Together they made the early Mets — often terrible — genuinely fun to follow. They gave a new franchise something money can't really buy: a voice that sounded like home. Every generation of Mets fans since has been chasing that same feeling." },
  { title:"Marty Glickman and the 1958 Giants", voice:"Marty Glickman", team:"Giants", era:"1958", quote:"Giants! Giants!", story:"The 1958 NFL Championship — the Giants vs. the Baltimore Colts, \"The Greatest Game Ever Played\" — was the game that turned professional football into America's sport. The first sudden-death overtime in NFL championship history, broadcast nationally on NBC television. But in New York, Marty Glickman called it on the radio, and the fans who had followed the Giants through that entire remarkable season — Frank Gifford, Sam Huff, Vince Lombardi as offensive coordinator — heard it through Glickman's voice. He had been the voice of the Giants since 1948. He would continue until 1971. That 1958 game was the apex of the dynasty he had narrated from the very beginning." },
  { title:"Marty Glickman Invents the Language of Football Broadcasting", voice:"Marty Glickman", team:"Giants", era:"1948–1971", quote:"First and ten — do it again!", story:"Marty Glickman invented much of the language of football broadcasting still used today. He coined the goalpost as a standard reference point, standardized down-and-distance calls, and developed the spatial language that let radio listeners picture where the ball was without seeing it. Before Glickman, football on radio was disorienting and hard to follow. He made it visual. When he got unceremoniously dumped by the Giants in 1971 — \"in favor of a younger man\" — an era ended in New York football broadcasting that had lasted longer than most broadcasters' entire careers. He was 53 years old. He came back as the voice of the rival Jets the following year." },
  { title:"The Jets, Namath, and a Radio Generation", voice:"Multiple", team:"Jets", era:"1969", quote:"We will win. I guarantee it.", story:"Joe Namath's guarantee before Super Bowl III was made at a dinner, repeated in print — but it was radio that carried it into the homes of New York fans that week, building the anticipation into something the city had never felt before. And it was radio that carried the actual game as the Jets shocked the Colts 16-7. For the generation of New York fans who listened that day, the radio call is burned in memory as clearly as any television image. The voice behind it, Merle Harmon, was good. But what he was calling was great enough to make anyone sound legendary." },
  { title:"Bob Papa: The Voice of Giants Football", voice:"Bob Papa", team:"Giants", era:"1995–2019", quote:"Manning — escapes — throws it deep — Tyree — HE CAUGHT IT!", story:"Bob Papa became the radio voice of the New York Giants in 1995 and held the job for 24 years, including two Super Bowl championships. His call of David Tyree's helmet catch in Super Bowl XLII — one of the most shocking plays in football history — was calm and precise in the way great radio calls often are, letting the moment breathe rather than overwhelming it. Papa grew up in New Jersey as a Giants fan, which meant he spent decades as the professional voice of the team he had grown up rooting for. He has described it as \"the greatest job in the world,\" which sounds like PR until you realize he's been saying the same thing for 24 years." },
  { title:"Red Barber and the Brooklyn Dodgers", voice:"Red Barber", team:"Dodgers", era:"1939–1953", quote:"Tighter than a new pair of shoes.", story:"Before Red Barber was a Yankee, he was a Dodger — and in Brooklyn, he was something close to sacred. From 1939 to 1953, Barber called Ebbets Field the way a painter describes a subject he loves. His vocabulary was distinctly Southern — \"rhubarb\" for an on-field argument — but Brooklyn absorbed it completely and made it their own. When the Dodgers left for Los Angeles after 1957, something in Brooklyn never recovered. Barber moved briefly with them before ending up with the Yankees. He was, objectively, the greatest baseball broadcaster of his generation. That he ended his career by getting fired by the Yankees for telling the truth about an empty stadium is the most classically New York ending imaginable." },
  { title:"John Sterling: \"Theeeee Yankees Win!\"", voice:"John Sterling", team:"Yankees", era:"1989–2024", quote:"Theeeee Yankees win!", story:"John Sterling became the radio voice of the New York Yankees in 1989 and held the job for more than three decades. His signature call — \"The Yankees win! Theeeee Yankees Win!\" — became one of the most recognizable phrases in New York sports radio. He was also famous for elaborate, player-specific home run calls: \"An A-bomb, from A-Rod!\" for Alex Rodriguez, \"El Capitan!\" for Derek Jeter. Sports radio critics spent 30 years arguing about whether Sterling was good or not. Nobody argued about whether he was New York. His voice became the sound of Yankees baseball for an entire generation — whether they wanted it to or not." },
  { title:"Michael Kay: \"See Ya!\"", voice:"Michael Kay", team:"Yankees", era:"2002–present", quote:"See ya!", story:"Michael Kay has been the television voice of the New York Yankees on YES Network since the channel launched in 2002, and his home run call — \"See ya!\" — has become the signature phrase of Yankees television for a generation. Kay grew up in the Bronx as a Yankees fan, which gives him a credibility with that audience that no outside hire could manufacture. He has also been willing to criticize the team that employs him, which is uncommon in regional sports broadcasting and entirely consistent with the directness New York expects. His Yankees career has now spanned longer than most of the players he has called — Jeter's entire tenure, Rodriguez, Rivera, Judge." },
  { title:"Mel Allen Returns: This Week in Baseball", voice:"Mel Allen", team:"ALL NY", era:"1977–1996", quote:"How about that?", story:"After more than a decade in the wilderness following his firing by the Yankees, Mel Allen was hired in 1977 as the first host of This Week in Baseball, a weekly highlight show that ran on network television until 1998. For a new generation who had never heard him call a live game, Allen's voice — \"How about that!\" — became the sound of baseball itself, heard over slow-motion replays and spectacular catches from across the country. He had gone from the most famous broadcaster in America to silence, and then to something like a second act. He held that job for 19 years. When he died in 1996, nearly every baseball player in America knew his voice." },
  { title:"WFAN Launches: The First 24-Hour Sports Radio Station", voice:"WFAN", team:"ALL NY", era:"1987", quote:"You're on the FAN. Whaddya got?", story:"On July 1, 1987, WFAN launched in New York as the first 24-hour all-sports radio station in America. The first voice heard was Suzyn Waldman, at 3pm, reporting from outside Yankee Stadium. Nobody knew if the format would work — a full day of sports talk, not music, not news, just sports. New York made it work. Within a few years, WFAN had become one of the most profitable radio stations in the country and had launched a format every major American city eventually copied. The idea that a city could sustain round-the-clock sports conversation was treated as a gamble in 1987. New York proved it wasn't even close." },
  { title:"Mike Francesa and Mad Dog: The Greatest Show in Sports Radio", voice:"Francesa/Mad Dog", team:"ALL NY", era:"1989–2008", quote:"WFAN, New York. Russo. Go ahead.", story:"From 1989 to 2008, Mike Francesa and Chris \"Mad Dog\" Russo hosted afternoons on WFAN — \"Mike and the Mad Dog\" — and built what may be the most influential sports radio program in American history. Francesa was measured, authoritative, encyclopedic. Russo was passionate, excitable, and loud. Together they covered two Yankees dynasties, the Mets' collapse of 2007, countless Giants and Jets seasons, and approximately one million arguments. Their split in 2008 was treated in New York like a celebrity divorce. Neither has ever quite replicated what they had together. Sports radio has been chasing that specific chemistry ever since." },
  { title:"Suzyn Waldman: The First Voice on WFAN", voice:"Suzyn Waldman", team:"Yankees", era:"1987–present", quote:"Roger Clemens is coming back!", story:"Suzyn Waldman was the first person heard on WFAN the day it launched in 1987. She went on to become the first woman to work as a full-time on-air employee of a major league baseball team, joining the Yankees radio booth in 2005 alongside John Sterling. Her emotional call when Roger Clemens announced his return to the Yankees in 2007 — live on the air, completely unprepared — became one of the most-discussed moments in sports radio history. Waldman has never pretended she wasn't affected by what she was covering. In a world of practiced impartiality, her transparency has always been both her vulnerability and her strength." },
  { title:"Mike Francesa: The Pope of Sports Radio", voice:"Mike Francesa", team:"ALL NY", era:"1989–2021", quote:"Mike, MIKE — he's asleep!", story:"Mike Francesa hosted afternoons on WFAN from 1989 until 2021 — over 30 years — and became known as \"the Pope of Sports Radio\" for his authoritative style and willingness to deliver verdicts on any topic with complete confidence. He famously fell asleep on air during a live broadcast, which was caught on video and became a viral moment he handled by doubling down and barely acknowledging it. He retired once, came back, and in 2021 retired again. His actual sports analysis was frequently excellent and occasionally embarrassingly wrong — which is perhaps the most New York quality any broadcaster can have." },
  { title:"Sam Rosen: 40 Years of Rangers Hockey", voice:"Sam Rosen", team:"Rangers", era:"1984–2025", quote:"It's a power play goal!", story:"Sam Rosen first called Rangers games in the 1977-78 season as Marv Albert's backup, then took over the television booth full-time in 1984. He called 40 seasons of Rangers hockey — the lean years of the 1980s, the 1994 championship, the Lundqvist era, the rebuilds and the heartbreaks. When he announced his retirement after the 2024-25 season, the Rangers gave him a custom jersey bearing his signature call: \"It's a power play goal!\" The number on the back was 40. His career spanned more Rangers history than any non-player in franchise history." },
  { title:"Howie Rose and the Islanders", voice:"Howie Rose", team:"Islanders", era:"Multiple", quote:"The Islanders have tied it!", story:"Howie Rose has done more than most people realize. He called Rangers games, Mets games, and also served as the television voice of the New York Islanders — the team he grew up rooting for in an arena he knew as a fan. His ability to bring genuine feeling to three different New York franchises is unique in the city's broadcasting history. Most voices are identified with one team. Rose is genuinely of all of New York — every borough, every rink, every diamond. His eventual retirement from the Mets booth in 2026 landed the way it did because the city understood, finally, the full scale of what it was losing." },
  { title:"Sam Rosen Calls the 1994 Stanley Cup", voice:"Sam Rosen", team:"Rangers", era:"1994", quote:"The waiting is over — the New York Rangers are Stanley Cup champions!", story:"On June 14, 1994, the New York Rangers beat the Vancouver Canucks in Game 7 to win the Stanley Cup for the first time since 1940. Sam Rosen delivered the call from the television booth: \"The waiting is over — the New York Rangers are the Stanley Cup champions!\" It was the most significant moment in New York hockey since the Rangers' last championship 54 years earlier, and it fell to a guy from New York who had grown up wanting this exact moment to happen. Rosen has been asked about it hundreds of times in the 30-plus years since. His answer is always the same: \"I just said what I felt. That's all you can ever do.\"" },
  { title:"Bob Papa Calls the Helmet Catch", voice:"Bob Papa", team:"Giants", era:"2008", quote:"Manning, in trouble — gets away — throws it deep — and TYREE HOLDS ON!", story:"Super Bowl XLII, February 3, 2008. The New England Patriots were 18-0 and trying to complete the first perfect season in NFL history. With 1:15 remaining, Eli Manning escaped what should have been a sack, launched a ball downfield, and David Tyree pinned it against his helmet for a 32-yard reception that changed history. Bob Papa called it on the Giants Radio Network with a calm that, in retrospect, sounds almost supernatural: \"Manning, in trouble — gets away — throws it deep — and Tyree holds on!\" The world lost its mind. Papa stayed steady. That is what great radio does." },
  { title:"Bob Papa: The 2012 Super Bowl", voice:"Bob Papa", team:"Giants", era:"2012", quote:"The Giants win the Super Bowl! Eli Manning is a champion!", story:"In Super Bowl XLVI, the Giants defeated the Patriots again, 21-17. Victor Cruz's touchdown — preceded by a season full of salsa dances in the end zone — was called by Bob Papa with a warmth that matched the moment's joy. The Giants had won two Super Bowls in five years, both over the same dynasty, both as underdogs, both with Eli Manning engineering late drives. Papa had called both of them. In a franchise with some of the greatest moments in NFL history, he was the voice of its most recent championship era — a New Jersey kid who got to call two of the biggest Giants wins in history." },
  { title:"Mike Breen: \"BANG!\"", voice:"Mike Breen", team:"Knicks/NBA", era:"2006–present", quote:"BANG!", story:"Mike Breen grew up in Yonkers as a Knicks fan, watching the 1970 and 1973 championships as a kid. He became the Knicks' own play-by-play voice on MSG Network, then the lead NBA play-by-play voice on ABC and ESPN nationally. His signature call for a big three-pointer — \"BANG!\" — is one of the most recognized calls in basketball. When the Knicks finally won the championship in 2026, Mike Breen was behind the microphone on the national broadcast. Afterward, he said: \"I've been a fan since I was about seven years old. I've been a Knick broadcaster for more than half my life. For them to have a night like this is wonderful.\" The kid from Yonkers, calling the thing he'd waited 53 years to call." },
  { title:"Kenny Albert: Following a Dynasty", voice:"Kenny Albert", team:"Rangers", era:"2025–present", quote:"Rangers score!", story:"Kenny Albert is the son of Marv Albert, and has built his own distinguished career calling Rangers, Giants, and national games. In 2025, after Sam Rosen's retirement, he was named the new television voice of the New York Rangers — effectively taking the job his father once held, in the same building, for the same team. It is the most direct broadcasting family dynasty in New York sports history: Marty Glickman mentored Marv Albert, who covered the Rangers for 30 years. Kenny Albert is now the Rangers' voice. Three generations of New York sports broadcasting, connected in a straight line from a Bronx gym in the 1940s to Madison Square Garden today." },
  { title:"Gary Cohen, Keith Hernandez, Ron Darling: The Best Booth in Baseball", voice:"Gary Cohen", team:"Mets", era:"2006–present", quote:"You can't predict baseball!", story:"The SNY broadcast booth for the Mets — Gary Cohen on play-by-play, Keith Hernandez and Ron Darling as analysts — has been widely called the best in baseball for nearly two decades. What makes it work is that Hernandez and Darling criticize the Mets openly, argue with each other's assessments, and occasionally go on long tangents about wine, proper bunting technique, and grammar. Cohen holds it together with precision and humor. Hernandez in particular has become a character beloved by a generation of Mets fans who discovered him through the booth rather than through his playing career. The best booth in baseball, by the consensus of everyone not contractually obligated to disagree." },
  { title:"Bob Murphy's Last Game", voice:"Bob Murphy", team:"Mets", era:"2003", quote:"The Mets have won!", story:"On September 28, 2003, Bob Murphy called his final game as the radio voice of the New York Mets — the last regular season game at Shea Stadium that year. He had been calling Mets games since the franchise's first day of existence in 1962. After 42 years, he said goodbye simply and without drama, the way he had always done everything. \"I've been very fortunate,\" he said afterward. \"To have this job, in this city, for this long — I'm a very lucky man.\" The Mets gave him a day at Shea, the kind of retirement ceremony usually reserved for legendary players. Murphy was not a player. He was something harder to quantify and, in New York, often harder to replace: a voice that felt like home." },
  { title:"Howie Rose Calls the Piazza 9/11 Home Run", voice:"Howie Rose", team:"Mets", era:"2001", quote:"It's gone! It's gone! Mike Piazza with a home run!", story:"On September 21, 2001, ten days after the terrorist attacks, the Mets played their first home game back at Shea Stadium. The city was still in shock. In the 8th inning, with the Mets trailing 2-1, Mike Piazza hit a two-run home run to right-center field. The stadium erupted in a way that was about far more than baseball. Howie Rose, calling it on the radio, didn't try to make it bigger than it was — he just described what happened, clearly and honestly, and let 50,000 people do the rest. \"It's gone!\" he said. The Mets won 3-2. For one night, in the most terrible month the city had ever experienced, baseball gave New York something it needed." },
  { title:"Marv Albert: The Voice That Started Everything", voice:"Marv Albert", team:"Knicks/NBA", era:"1967–2021", quote:"YES! And it counts!", story:"Marv Albert spent 37 years as the voice of the Knicks, 30 years calling Rangers games, and became the lead play-by-play voice for the NBA nationally on NBC and then TNT. He called five Michael Jordan championships, Magic vs. Bird, the Dream Team. He is, by most accounts, the most accomplished play-by-play broadcaster in NBA history. He grew up in Brooklyn, became Marty Glickman's ballboy, and ended his career the same way he started it — calling basketball with a precision and personality nobody has quite replicated. When he retired in 2021 he said: \"I wish I were starting all over again. It has been such a joy.\"" },
  { title:"Spencer Ross: The Voice You've Heard Without Knowing", voice:"Spencer Ross", team:"ALL NY", era:"1960s–1990s", quote:"The Nets have done it again!", story:"Spencer Ross was a New York broadcaster for four decades, calling games for the Knicks, the Yankees, the Jets, and the original New York Nets of the ABA in their very first season in 1967. He was one of Marty Glickman's direct proteges, and a transitional voice between the Glickman era and the Albert era of New York sports broadcasting. He is among the least remembered significant figures in NY broadcasting history — which is perhaps the most accurate illustration of how many great voices this city has produced and then quietly moved past, each generation replacing the last." },
  { title:"Marty Glickman: The NBC Snub", voice:"Marty Glickman", team:"ALL NY", era:"1950s–1960s", quote:"Swishhhhhhhhh!", story:"In the late 1950s, NBC approached Marty Glickman about expanding to national television. According to Glickman's own account, a network executive told him his name was \"too Jewish\" for national audiences. Glickman replied by offering an alternative: \"Marty Lipschitz.\" The executive's face reddened and the meeting ended. The greatest broadcaster in New York City's history — the voice of every major NY team for 50 years — was never once the national voice of anything, in a period when Mel Allen, also Jewish and from the same background, was the most famous broadcaster in America. The difference, as far as anyone can tell, was the name." },
  { title:"Chris Chambliss 1976: The Call Nobody Quite Caught", voice:"Multiple", team:"Yankees", era:"1976", quote:"Chambliss hits it deep to right — it's gone! The Yankees are going to the World Series!", story:"On October 14, 1976, Chris Chambliss hit a walk-off home run in the bottom of the ninth of Game 5 of the ALCS to send the Yankees to their first World Series since 1964. The crowd stormed the field before Chambliss could circle the bases — he had to fight his way through thousands of fans around the infield. The radio call was briefly overtaken by crowd noise. Chambliss himself has said he was never sure he actually touched home plate. The Yankees won the pennant in a moment so chaotic the broadcast couldn't quite contain it. Which is, in a strange way, the most New York possible ending to the most New York possible kind of game." },
  { title:"1986 World Series: Radio vs. TV", voice:"Multiple", team:"Mets", era:"1986", quote:"The greatest game in baseball history is going to continue.", story:"Game 6 of the 1986 World Series has been analyzed and mythologized for 40 years. But there's a persistent argument among Mets fans about which version — radio or television — captured the moment better. The television call, by NBC's Vin Scully, was eloquent and controlled. Bob Murphy's radio call had something Scully couldn't: 25 years of being the Mets' own voice, calling it for the people who had suffered alongside the team for a quarter-century. For Mets fans who grew up with Murphy, there's no contest. For everyone else, Scully. That split itself is one of the most revealing things about how New York experiences sports." },
  { title:"Howie Rose: Three Teams, One Voice, One City", voice:"Howie Rose", team:"Mets/Rangers/Islanders", era:"1987–2026", quote:"Put it in the books!", story:"Across his career, Howie Rose has been the official broadcaster for the New York Mets, the New York Rangers, and the New York Islanders — three separate franchises, three separate fanbases, in a city where those fanbases regard each other with deep suspicion. Only in New York could a single broadcaster cover that much territory and be genuinely loved by all three sets of fans. Rose once said he never wanted to be just one team's guy — he wanted to be New York's guy. He got there. When he announced his retirement from the Mets in 2026, all three fanbases felt it." },
  { title:"Marty Glickman's Legacy: The Family Tree", voice:"Marty Glickman", team:"ALL NY", era:"1939–present", quote:"Good! Like Nedick's!", story:"The family tree Marty Glickman planted in New York sports broadcasting is extraordinary. He mentored Marv Albert. Albert influenced Mike Breen, who grew up in Yonkers listening to the Knicks on the radio. Howie Rose grew up in Bayside listening to the Mets and became the voice of three NY franchises. Gary Cohen grew up going to Shea and became the TV voice of the Mets. Kenny Albert — Marv's son — is now the Rangers' television voice, the same job his father once held. Every voice that has defined New York sports for 60 years traces back, in some meaningful way, to a Bronx-born Jewish sprinter who got pulled from the 1936 Berlin Olympics and spent the rest of his life making his city's sports sound like themselves." },
  { title:"What Makes a New York Voice", voice:"Multiple", team:"ALL NY", era:"All eras", quote:"And the crowd goes wild at Madison Square Garden.", story:"There is something specific about the best New York sports broadcasters that separates them from great broadcasters anywhere else. They are fans who happened to find microphones. They grew up in these boroughs and suburbs, rooting for these teams, and when they got the jobs they never fully stopped being fans — they just learned to channel it through the discipline of professional broadcasting. Phil Rizzuto missed plays because he was talking to Joe DiMaggio. Bob Murphy called his team's games for 42 years without losing his warmth. Howie Rose cried after Mets wins. The New York voice is not really about technique. It's about belonging to the city you're describing." },
  { title:"The Voices We Remember", voice:"Multiple", team:"ALL NY", era:"All eras", quote:"This is New York. This is what we do.", story:"When a New York sports fan closes their eyes and replays a great moment, what they hear is a voice. \"Going, going, gone!\" \"Holy Cow!\" \"YES!\" \"BANG!\" \"Matteau! Matteau! Matteau!\" \"Put it in the books!\" \"The Yankees win! Theeeee Yankees win!\" \"It's a power play goal!\" \"Outta here!\" These are not just catchphrases — they are the sounds of actual moments in actual games that actually mattered to people who loved these teams. The broadcasters who made those calls were not neutral observers. They were New Yorkers with microphones, doing the same thing New York fans have always done: caring too much, saying exactly what they felt, and making sure everybody within earshot knew it." },
  { title:"Fran Healy: The Knowledgeable One", voice:"Fran Healy", team:"Yankees/Mets", era:"1980s–2000s", quote:"Here's the windup, and the pitch...", story:"Fran Healy played 10 years in the major leagues as a catcher, including several seasons with the Yankees, before becoming a broadcast analyst for the Mets on SportsChannel and later SNY. His unassuming, thoroughly knowledgeable style was a perfect complement to the more theatrical voices around him. In a city that rewards big personalities, Healy was the reminder that knowing what you're talking about is its own kind of authority. He could tell you exactly why a pitcher was tipping his pitches, or why a catcher set up wrong, because he had lived it himself. The quietest credible voice in the history of New York baseball broadcasting." },
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
  { matchup:"Yankees vs Red Sox", subtitle:"The Rivalry That Defined Baseball", story:"It started with the sale of Babe Ruth in January 1920 — the Red Sox sent Ruth to the Yankees for $100,000 and a loan against Fenway Park, and spent the next 86 years waiting for a World Series title. The Curse of the Bambino was the popular explanation. The real explanation was simpler: the Yankees took the best player in baseball history and won 26 championships with him and his successors, while Boston came tantalizingly close and fell short, repeatedly and dramatically. The rivalry produced Aaron Boone's home run in 2003, the Red Sox's comeback from 3-0 down in 2004, and generations of New Englanders who grew up defining themselves primarily by what they were not: Yankees fans." },
  { matchup:"Rangers vs Islanders", subtitle:"The Battle of New York on Ice", story:"The Rangers and Islanders have played each other since 1972, separated by 25 miles of the Long Island Expressway and a cultural divide that cannot be explained to people who have not grown up on either side of it. Rangers fans think they own New York. Islanders fans think Rangers fans are pretenders from Manhattan who don't actually watch hockey. The Islanders won four consecutive Stanley Cups from 1980 to 1983, during which time the Rangers won none. The Rangers won in 1994, during which time the Islanders were beginning a drought that would last decades. The games between these two teams are not played for the standings. They are played for the rights to something that neither side can fully articulate." },
  { matchup:"Mets vs Yankees", subtitle:"The Subway Series That Never Ends", story:"The Yankees and Mets share a city, a media market, and occasionally a World Series. Their rivalry is less about hatred than it is about identity: Yankees fans believe in championships and tradition and the weight of history. Mets fans believe in suffering and resilience and the specific joy of winning despite expectations. The 1986 Mets were better than any Yankees team of that decade. The Yankees of 1996-2000 were better than any Mets team of that era. The 2000 Subway Series went five games, with the Yankees winning, Roger Clemens throwing a broken bat at Mike Piazza, and the city briefly dividing along lines that usually go unspoken. They share a city. They do not share a rooting section." },
  { matchup:"Giants vs Eagles", subtitle:"The NFC East's Oldest Grudge", story:"The New York Giants and Philadelphia Eagles have been playing each other since 1933. It is the oldest continuous rivalry in the NFC East, and arguably the nastiest. Eagles fans are famous for their hostility to opposing teams and their own — they once booed Santa Claus, and they will tell you about it with genuine pride. Giants fans regard Eagles games with a specific intensity that doesn't apply to Cowboys or Redskins games. The rivalry has produced Lawrence Taylor hitting quarterbacks, Eli Manning being booed at the Linc before he ever took a snap, and a seemingly endless rotation of games decided by a field goal in the final seconds. Philadelphia and New York agree on essentially nothing. The Eagles-Giants rivalry is where that disagreement gets resolved, once a year, twice." },
  { matchup:"Jets vs Giants", subtitle:"Two Teams, One City, Zero Agreement", story:"The Jets and Giants share MetLife Stadium and have shared the New York media market since the Jets arrived in 1960. They do not share a fan base, a sensibility, or a recent decade of success. Giants fans consider themselves the real football team of New York, with four Super Bowls and a history that runs back to the 1920s. Jets fans consider themselves the real football team of New York because Joe Namath guaranteed a Super Bowl and delivered it. Both sides have a point. Neither side will admit it. The preseason game between the two teams is meaningless in the standings and treated like a playoff game by fans who have been waiting all year to win this specific argument." },
  { matchup:"Knicks vs Heat", subtitle:"Pat Riley's Betrayal and Its Consequences", story:"The Knicks-Heat rivalry of the 1990s was created by Pat Riley leaving New York for Miami in 1995. He took the Knicks' defensive system, their physical style, and their front office sophistication to South Beach and built a rival that eliminated New York from the playoffs in 1997, 1998, 1999, and 2000. The rivalry was genuinely nasty — P.J. Brown flipping Charlie Ward into photographers, Jeff Van Gundy clinging to Alonzo Mourning's leg on the court floor, six suspensions in a single game. Riley coaching against the organization he had built, knowing its tendencies and its limits. In New York, there is no betrayal more personal than the one that comes from the inside." },
  { matchup:"Rangers vs Devils", subtitle:"The Hudson Rivalry That Produced Two Dynasties", story:"The Rangers and Devils share a geographic footprint and nothing else. The Rangers are Broadway, history, the Garden, 54 years between championships. The Devils are New Jersey, efficiency, the neutral zone trap, three Cups in nine years. In 1994, the Devils eliminated the Rangers 4-3 in the conference finals before Mark Messier guaranteed a win and delivered it. In 2000, the Devils won the Cup while the Rangers watched. Martin Brodeur vs. Mike Richter. Scott Stevens vs. everyone. The rivalry is real but asymmetrical: Devils fans resent the Rangers' fame; Rangers fans resent the Devils' recent success. Neither side has had much to celebrate in the 2010s. Both sides remember when they did." },
  { matchup:"Knicks vs Bulls", subtitle:"Jordan's Obstacle Course", story:"For eight years, Michael Jordan and the Chicago Bulls were the obstacle between the New York Knicks and a championship. The Knicks eliminated the Bulls in 1994 when Jordan was retired. Every other year, Jordan eliminated the Knicks — in 1989, 1991, 1992, 1993, and then again in 1996. Patrick Ewing and the Knicks were good enough to make it hard. They were not good enough to finish it. Jordan scored 55 points against them in a playoff game in 1988. He scored 54 in one against them in 1989. The Knicks' 1994 Finals run happened specifically because Jordan was playing baseball. It is not a rivalry the Knicks won. But it is the rivalry that defined what the Knicks could not overcome." },
  { matchup:"Yankees vs Dodgers", subtitle:"The October Classic That Defined a City", story:"Between 1941 and 1956, the Yankees and Dodgers met in the World Series seven times. The Yankees won five of those seven series. The Dodgers were Brooklyn's team, the Yankees were Manhattan's team, and the postseason battles between them were the defining sports event of New York's golden era. 'Wait till next year' became the Brooklyn Dodgers' unofficial motto after each defeat. In 1955, they finally won — the only World Series title in Brooklyn Dodgers history. Two years later, the Dodgers left for Los Angeles, and the rivalry ended. The Yankees-Dodgers World Series of 2024 was played in different cities with different rosters. But for anyone who remembers the original, it carried the same weight." },
  { matchup:"Mets vs Phillies", subtitle:"The NL East's Most Complicated Relationship", story:"The Mets and Phillies have been playing each other since 1962 — and for most of that time, both teams' fans have regarded each other with a contempt that goes beyond normal sports rivalry. Citizens Bank Park is consistently one of the most hostile environments for Mets players in the league. Mets fans have given as good as they've gotten, particularly during the teams' overlapping competitive windows in 2006-2008 and again in the 2020s. The 2007 Mets collapse — seven games up with 17 to play, losing the division to the Phillies on the last day of the season — is the defining moment of this rivalry for Mets fans. It is never fully forgotten, never fully discussed, and never, ever forgiven." },
  { matchup:"Giants vs Cowboys", subtitle:"America's Team vs. New York's Team", story:"The Dallas Cowboys called themselves 'America's Team.' The New York Giants called themselves New York's team, which in their view was better. The NFC East rivalry between the Giants and Cowboys has produced Hall of Famers at nearly every position — Emmitt Smith against Lawrence Taylor, Troy Aikman against Phil Simms and then Eli Manning, Tony Dorsett against Joe Morris. The 1990 NFC Championship Game, the playoff games of the 2000s and 2010s, the casual brutality of Cowboys fans showing up at MetLife in large numbers — all of it feeds a rivalry that is old enough to have changed entirely several times over and still feel personal." },
  { matchup:"Islanders vs Oilers", subtitle:"The Dynasty That Stopped a Dynasty", story:"When the Edmonton Oilers entered the NHL in 1979, they had the most talented roster ever assembled — Gretzky, Messier, Coffey, Kurri, Anderson. They were supposed to win immediately. Instead, they ran directly into the New York Islanders, who were in the middle of their own dynasty. The Islanders beat the Oilers in 1983 to win their fourth consecutive Cup, sweeping a team that would go on to win five Championships of its own. The loss, Gretzky has said, was the moment the Oilers understood what it meant to be champions. What it meant, specifically, was being as physical and as consistent as the team that was stopping them. The Islanders' dynasty made the Oilers' dynasty possible." },
  { matchup:"Yankees vs Athletics", subtitle:"The Rivalry That Launched the Golden Age", story:"The Yankees' first dynasty was built in competition with the Philadelphia Athletics, who won championships in 1910, 1911, 1913, 1929, 1930, and 1931 before Connie Mack broke up the roster for financial reasons. Ruth, Gehrig, and the Yankees then dominated the 1930s in a void left by the A's departure. When the A's moved to Kansas City and then Oakland, the rivalry reconfigured itself into something more modern — the Billy Martin Oakland A's of the 1970s, the Moneyball A's of the early 2000s beating the Yankees in the 2001 ALDS, the endless cycles of a small-market team trying to outthink a large-market monster. Oakland has since lost its team. The rivalry, for now, is in pause." },
  { matchup:"Nets vs Knicks", subtitle:"Brooklyn vs Manhattan, Finally", story:"For most of their coexistence in New York, the Nets and Knicks had a rivalry that existed mainly on paper. The Knicks were the NBA franchise in New York. The Nets were the other team, out in New Jersey, the ones who had Dr. J briefly and then gave him away, the ones who made the ABA Finals, the ones who had Kidd but couldn't close it. When the Nets moved to Brooklyn in 2012, the rivalry became real — two teams in the same city, competing for fans, attention, and the right to call themselves New York's basketball franchise. The Knicks won the 2026 championship. The Nets have not yet won one. The rivalry is no longer hypothetical." },
  { matchup:"Rangers vs Bruins", subtitle:"The Original NHL Rivalry", story:"The Rangers and Bruins have been playing each other since 1926 — making it one of the longest-running rivalries in professional hockey. The 1972 Rangers-Bruins playoff series, with Rod Gilbert and Phil Esposito facing off in MSG, was one of the most physical in league history. The 1979 Cup Final went six games, with the Canadiens winning, but the Rangers-Bruins history before and after that series has its own weight. In the Boston Garden era, Rangers fans who made the trip north were guaranteed a hostile reception. In the modern era, the rivalry is occasionally heated and occasionally not, depending entirely on whether both teams happen to be good at the same time." },
  { matchup:"Jets vs Patriots", subtitle:"A Very Long Losing Streak", story:"The Jets and Patriots share a division and a history of dysfunction, though the balance of dysfunction has shifted heavily toward New York over the past two decades. The Patriots won six Super Bowls in the Belichick-Brady era, the Jets won zero, and the games between them were frequently the most painful evidence of that disparity. The 2010 Jets — Rex Ryan's team, loud and confident and genuinely good — beat the Patriots twice in the regular season, lost in the AFC Championship game. They came close. They have not been close again. The rivalry is one-sided in results and exactly even in the intensity of feeling, because Jets fans have made losing to the Patriots the central organizing principle of their rooting lives." },
  { matchup:"Giants vs 49ers", subtitle:"The NFC Championship That Kept Repeating", story:"In the 1980s and 1990s, the Giants and 49ers met repeatedly in NFC Championship games, trading the conference title back and forth between New York and San Francisco. Joe Montana vs. Lawrence Taylor. Jerry Rice vs. Everson Walls. The 1990 NFC Championship game, which the Giants won 15-13 in a defensive masterpiece that sent New York to the Super Bowl, is one of the greatest games in the history of the conference championship. Two legitimate dynasties, competing for the right to represent the NFC. The rivalry has been less meaningful since then, but its 1980s chapter stands as one of the finest in NFL playoff history." },
  { matchup:"Mets vs Cardinals", subtitle:"The September War", story:"The Mets and Cardinals have met in some of the most consequential late-season races in National League history. The Cardinals beat the Mets to the 1973 pennant. The Mets beat the Cardinals in the 1969 pennant race. The Cardinals won the division over the Mets in 1985, 1987, and 2001. In 2006, the Mets finally beat the Cardinals in the NLCS and reached the World Series. The rivalry is not built on hatred — it is built on geography, competitive windows, and the specific misery of losing a pennant race in September to the same team that has been just ahead of you all summer. Cardinals fans are gracious in victory. Mets fans remember every loss." },
  { matchup:"Knicks vs Celtics", subtitle:"The Original NBA Rivalry", story:"The Knicks and Celtics met in the Eastern Division Finals repeatedly in the 1970s — the Red Auerbach Celtics against the Willis Reed Knicks, and then against the Walt Frazier Knicks — producing some of the best basketball the NBA had seen. The rivalry cooled as both franchises struggled, then heated again in the Ewing vs. Bird era, then cooled again. The modern version of it — the 2020s Knicks against the Jayson Tatum Celtics — has been the most competitive iteration since the 1970s, with the Celtics winning most of the important games and the Knicks developing the specific resentment of a team that knows it's close but keeps coming up short." },
  { matchup:"Yankees vs Mets (2000 World Series)", subtitle:"Five Games, One City", story:"The 2000 World Series was the only Subway Series since 1956, the first time the Yankees and Mets had met in the postseason. The Yankees won in five games, but none of the games were easy. Roger Clemens threw a broken bat toward Mike Piazza in Game 2. Luis Sojo hit a seeing-eye single in the ninth inning of Game 5 that scored the winning run. The city was divided not exactly in half — the Yankees had the better roster — but in ways that felt even because of how much it mattered. For five nights in October, New York was entirely absorbed in something that had nothing to do with the rest of the world. It was, in that specific way, exactly what sports is for." },
  { matchup:"Devils vs Flyers", subtitle:"The Neutral Zone Trap vs. Broad Street Bullies", story:"The New Jersey Devils and Philadelphia Flyers have one of the most physically intense rivalries in the Eastern Conference. The Devils' trap-based defensive system and the Flyers' historically aggressive style have produced some of the most bruising playoff series in NHL history. The 1995 Eastern Conference Finals, with the Devils en route to their first Stanley Cup, featured a level of physical play that has not been matched in the conference since. Scott Stevens was the most feared hitter in the league. The Flyers had the most feared lineup. New Jersey won in four games. The rivalry has ebbed and flowed since, but its early 2000s chapter was as violent as hockey gets." },
  { matchup:"Giants vs Ravens", subtitle:"Harbaugh's Shadow", story:"The Giants and Ravens are not a traditional rivalry — they're in different conferences and rarely meet in meaningful games. But their two Super Bowl encounters have been among the most dramatic in the game's history, and the Baltimore-New York football connection runs deep through the history of both franchises. The original Baltimore Colts beat the Giants in the 1958 game widely called the greatest ever played. The Ravens won Super Bowl XLVII in 2012 — a rematch of sorts with New York rooting interests on both sides. It is less a rivalry than a recurring collision between two franchises with genuine claims to football history." },
  { matchup:"Islanders vs Capitals", subtitle:"The Easter Epic", story:"On April 18, 1987, the New York Islanders and Washington Capitals played what is still considered the greatest single game in NHL history. Game 7 of the Patrick Division Semifinals, four overtime periods, ended at 1:56 AM when Pat LaFontaine scored for the Islanders. The game lasted 68 minutes and 47 seconds of overtime — nearly two full additional games after regulation. Both goalies, Kelly Hrudey and Bob Mason, were exhausted and magnificent. The building in Landover, Maryland, had nearly emptied and then filled back up as the overtime periods accumulated. Jiggs McDonald called it. LaFontaine's goal remains one of the most celebrated in franchise history." },
  { matchup:"Yankees vs Red Sox (2004 ALCS)", subtitle:"The Comeback", story:"The 2004 ALCS between the Yankees and Red Sox began as a Yankee coronation. New York won the first three games. No team in baseball history had ever come back from 3-0. The Red Sox won Game 4 on a Dave Roberts stolen base and a David Ortiz walkoff. Then Game 5, another Ortiz walkoff. Then Game 6 in Boston, Curt Schilling pitching with a tendon sutured to his ankle, blood seeping through his sock on national television. Then Game 7, and the Red Sox won 10-3. Boston went on to sweep the Cardinals in the World Series. The Yankee lead — three games, seemingly insurmountable — was the largest blown postseason series lead in history." },
];


// ── WEDNESDAY DRAFT CONTENT (39 entries — 3 drafts per 1 stadium) ────────────

const DRAFT_ENTRIES = [
  { title:"Derek Jeter: The Pick That Defined a Franchise", team:"Yankees", year:"1992", story:"The Yankees took Derek Jeter with the sixth overall pick in the 1992 draft. Five teams passed on him. He was a high school shortstop from Kalamazoo, Michigan, who had been promising scouts since he was 13 that he was going to play for the Yankees. He then went out and played for the Yankees for 20 seasons, made 14 All-Star teams, won five World Series, and retired with 3,465 career hits and a reputation for professionalism that bordered on the mythological. The five teams that passed on him in 1992 have spent three decades explaining why." },
  { title:"Darryl Strawberry: The First Pick", team:"Mets", year:"1980", story:"Darryl Strawberry was the first overall pick in the 1980 amateur draft — and for a few years, he looked like the most talented player the Mets had ever produced. He won the 1983 NL Rookie of the Year, made eight All-Star teams, and helped the Mets win the 1986 World Series. His career was a study in what could have been: the talent was transcendent, the personal struggles were constant, and by the time he left New York for the Dodgers in 1991, the city had fallen in love with him and lost him in roughly equal measure." },
  { title:"Dwight Gooden: The Pick That Was Almost Perfect", team:"Mets", year:"1982", story:"The Mets took Dwight Gooden in the first round of the 1982 draft. He won the NL Rookie of the Year at 19. He went 24-4 with a 1.53 ERA and 268 strikeouts at age 20 — one of the greatest pitching seasons in baseball history. He was supposed to define the Mets for a generation. Instead, his career became a cautionary tale about talent and circumstance and the specific weight of being that good, that young, in New York. When he finally threw a no-hitter in 1996, in Yankee pinstripes, he wept on the mound. The number he could have been is still the most interesting question in Mets history." },
  { title:"Jacob deGrom: The Pick Who Came From Nowhere", team:"Mets", year:"2010", story:"The Mets drafted Jacob deGrom in the ninth round of the 2010 draft — a shortstop from Stetson University who had converted to pitching the year before. Nobody considered him a significant prospect. Eight years later he won back-to-back NL Cy Young Awards, posting some of the most dominant two-year stretches in the history of pitching. The ninth round. The Mets found the best pitcher in baseball in the ninth round of a draft nobody was paying attention to, and then let him leave for Texas as a free agent in 2022. Both things are equally true." },
  { title:"The 1985 NBA Draft Lottery: Did the Knicks Need Help?", team:"Knicks", year:"1985", story:"The 1985 NBA Draft Lottery was the first in league history — and the New York Knicks won it, getting the first overall pick and selecting Patrick Ewing from Georgetown. The coincidence of New York, the league's largest market, winning the first lottery produced immediate conspiracy theories that persist to this day. The ping-pong ball bearing the Knicks' logo reportedly had a bent corner. The NBA has never fully addressed the question. What is not in doubt: Ewing was the right pick, and he became the greatest Knick of his generation, even if the championship never came." },
  { title:"Walt Frazier: The Draft Pick Who Became Clyde", team:"Knicks", year:"1967", story:"The Knicks took Walt Frazier with the fifth overall pick in the 1967 NBA Draft. He became one of the great defenders in NBA history, the co-star of the 1970 and 1973 championship teams, and an icon of New York cool. His style — the wide-brimmed hats, the Rolls-Royce, the fur coats — made him a fashion figure as much as an athlete. When Frazier scored 36 points and handed out 19 assists in Game 7 of the 1970 Finals while Willis Reed absorbed all the attention, it was the most elegant performance in Knicks playoff history. 'Clyde' was the nickname. It stuck forever." },
  { title:"Henrik Lundqvist: The Seventh-Round Pick Who Became The King", team:"Rangers", year:"2000", story:"Henrik Lundqvist was taken in the seventh round of the 2000 NHL Draft — the 205th overall pick. He spent four years developing in the Swedish league before joining the Rangers in 2005, and immediately became one of the best goalies in the world. He played 15 seasons in New York, won the Vezina Trophy in 2012, and is the only player in Rangers history who can reasonably claim to have personally kept the franchise relevant for a decade through the force of his individual performance. They called him 'The King.' He earned it. The seventh round." },
  { title:"The Draft That Built the 1994 Rangers", team:"Rangers", year:"1980s", story:"The 1994 Stanley Cup championship was assembled not through a single great draft but through a decade of patient accumulation. Brian Leetch arrived in 1988 — the 9th overall pick in 1986 — and became the best defensive defenseman in the NHL. Mike Richter was a 2nd rounder in 1985. Adam Graves was acquired in a trade. Mark Messier came via trade from Edmonton. The lesson of the 1994 Rangers is that championships are rarely built in one draft; they're assembled over years, through multiple drafts, through trades, through the slow alignment of talent and moment." },
  { title:"The Draft That Built a Dynasty: Potvin, Trottier, Bossy, Gillies", team:"Islanders", year:"1970s", story:"The Islanders' dynasty was built almost entirely through the draft. Denis Potvin — the first overall pick in 1973. Bryan Trottier — 22nd overall in 1974. Clark Gillies — 4th overall in 1974. Mike Bossy — 15th overall in 1977, passed on by 14 teams because scouts thought he wasn't physical enough. That draft class produced four consecutive Stanley Cups. Bill Torrey, the general manager who assembled it, did so in a decade when the draft was still an inexact science and the Islanders were still a new franchise. It is the best draft-building job in NHL history." },
  { title:"Mike Bossy: Passed Over 14 Times", team:"Islanders", year:"1977", story:"In the 1977 NHL Draft, 14 teams passed on Mike Bossy before the Islanders took him 15th overall. The scouts' concern: he wasn't physical enough, couldn't play in the corners. What he did instead was score 50 or more goals in each of his first nine seasons — a record that has never been matched. He scored 573 goals in 752 career games. He was passed over 14 times. The Islanders took him. He helped win four Stanley Cups. In the history of NHL drafts, it may be the single greatest mistake made by 14 consecutive teams." },
  { title:"Joe Namath: The AFL Pick That Changed Football", team:"Jets", year:"1965", story:"The AFL's New York Jets signed Joe Namath in 1965 for $427,000 — the largest contract in professional football history. The NFL laughed. Three years later, Namath had guaranteed and won a Super Bowl, proved the AFL could compete with the NFL, and forced the merger that created modern professional football. The signature play was his willingness to throw into coverage, to take risks, to play quarterback the way it was eventually supposed to be played. The contract that shocked the league in 1965 looks like a bargain in retrospect." },
  { title:"Lawrence Taylor: The Pick That Redefined a Position", team:"Giants", year:"1981", story:"The Giants took Lawrence Taylor with the second overall pick in the 1981 NFL Draft. He redefined what a linebacker was supposed to do — not just stop runners and drop into coverage, but rush the passer, dominate the line of scrimmage, and make offensive coordinators build their entire game plans around avoiding him. He won the NFL MVP in 1986 — one of the very few defensive players in history to do so. Opposing offenses began using two tight ends to provide an extra blocker specifically to handle LT. The position of outside linebacker was never the same after he played it." },
  { title:"Eli Manning: The Trade-Up That Won Two Super Bowls", team:"Giants", year:"2004", story:"The Giants traded the fourth overall pick in 2004 — Philip Rivers — to the San Diego Chargers for Eli Manning. Chargers fans consider this one of the great robberies in NFL draft history. Giants fans consider it the trade that won two Super Bowls. Both are correct. Rivers was an excellent quarterback in San Diego. Manning was a Giant who made the greatest comeback in Super Bowl history and then did it again. The trade was criticized when it happened. The two Lombardi Trophies changed the argument permanently." },
  { title:"Phil Simms: The Most Overlooked Great Draft Pick in NY History", team:"Giants", year:"1979", story:"Phil Simms was booed when the Giants announced his selection with the seventh overall pick in 1979. Giants fans had wanted someone else. Simms then went out and won two Super Bowls, completed 22 of 25 passes in Super Bowl XXI for a completion percentage that still stands as the best in championship game history, and was named MVP. He was never fully appreciated in New York while he played — that is a specific New York tradition, undervaluing what you have — but his career record stands up favorably against any quarterback the Giants have ever fielded." },
  { title:"The NFL Draft Comes to New York", team:"Multiple", year:"2014", story:"In 2014, the NFL held its annual draft at Radio City Music Hall in New York — which it had done for years — but for the first time broadcast it in primetime as a full-scale television event. The combination of Radio City's stage, the New York crowd, and the NFL's newly discovered understanding of the draft as entertainment changed professional football's offseason permanently. Commissioner Roger Goodell was booed every time he announced a pick. It became a tradition. New York made something that had been a procedural announcement into the league's second-biggest event of the year." },
  { title:"Bernard King: The Knicks Pick Who Became the Garden's Greatest Scorer", team:"Knicks", year:"1982", story:"The Knicks didn't draft Bernard King — they acquired him in 1982 in a trade from Golden State for Michael Ray Richardson. King averaged 32.9 points per game in 1984-85, the best scoring season in Knicks history, before tearing his knee in Kansas City. He came back 23 months later and the Knicks released him. He averaged 28 points in Washington at age 34. Red Holzman called him 'the greatest scoring machine I've ever seen.' The Knicks had him for 2.5 years and let him go because they couldn't see past the knee. The Garden deserved him longer than it got him." },
  { title:"Matthew Schaefer: The Future Arrives on Long Island", team:"Islanders", year:"2025", story:"The Islanders held the first overall pick in the 2025 NHL Draft and took Matthew Schaefer — a 6-foot-2 defenseman widely considered the best defensive prospect in years. Schaefer had suffered a serious injury during the season before the draft but recovered in time. For Islanders fans who had been waiting years for the franchise to return to relevance, the first overall pick felt like a real turning point — the beginning of something, not just a data point. The dynasty years of Potvin, Trottier, Bossy, and Gillies were all built through exactly this kind of patient drafting. The Islanders have done it before. Long Island is betting they can do it again." },
  { title:"Patrick Ewing: The Pick That Needed a Lottery", team:"Knicks", year:"1985", story:"Patrick Ewing was the consensus best player in the 1985 draft — a dominant center from Georgetown who had been to three NCAA championship games. The question was who would get him. The Knicks won the first NBA Draft Lottery and selected him with the first overall pick. He became the greatest Knick of his era, an 11-time All-Star, and the face of the franchise for 15 years. He never won a championship. When the Knicks finally won in 2026, Ewing was there as an ambassador. The pick that the lottery gave New York produced the player the city loved most — even when it hurt." },
  { title:"Tom Seaver: The Draft That Created a Franchise", team:"Mets", year:"1966", story:"The Mets drafted Tom Seaver in 1966 — or rather, they were awarded him through a special lottery after his original signing was voided. USC had signed Seaver after the NCAA season began, which was against the rules. Three teams threw their names into a hat for him. The Mets won. Seaver went on to win three Cy Young Awards, throw the Mets into competitive contention, and become the most important player in the franchise's first two decades. The Mets eventually traded him in 1977 in one of the worst moves in franchise history. But they got him first through a lottery. New York's relationship with Seaver began with luck and ended with a mistake." },
  { title:"Don Mattingly: The Yankees Miss the Championship Window", team:"Yankees", year:"1979", story:"Don Mattingly was taken in the 19th round of the 1979 draft — as a high school senior from Evansville, Indiana. He won the AL batting title in 1984, the AL MVP in 1985, and was the best first baseman in baseball for a stretch in the mid-1980s. He never played in a World Series game, which stands as one of the true injustices in the history of Yankee baseball. The dynasty years ended just before Mattingly arrived and began again just after he retired. He was the bridge, the one who held the franchise together during the lean years, and he never got to hold a trophy." },
  { title:"Ron Darling: The Draft Pick Who Became a Broadcasting Legend", team:"Mets", year:"1981", story:"The Mets drafted Ron Darling in 1981 and he became part of the rotation that won the 1986 World Series — a Yale graduate who brought an intellectual approach to pitching that endeared him to the New York media. After his playing career ended, he joined the SNY broadcast booth alongside Gary Cohen and Keith Hernandez, where he has been since 2006. Darling's second career as a broadcaster has outlasted his pitching career. He is now as associated with the Mets booth as with the 1986 team — a draft pick who found two ways to become part of Mets history." },
  { title:"The 1980 NFL Draft: Lawrence Taylor, Mark Bavaro, and the Giants' Window", team:"Giants", year:"1981", story:"The Giants' draft classes of the early 1980s built the foundation for two Super Bowl championships. Lawrence Taylor in 1981. Carl Banks in 1984. Mark Bavaro as a fourth-round pick in 1985 who became one of the toughest tight ends the NFC East had seen. The 1986 championship roster was assembled over six years of smart drafting by George Young — a GM who understood that great teams aren't built in a year but in a succession of drafts, each one adding a piece. The Giants' two Super Bowl wins of the 1980s were the product of patience." },
  { title:"Doc Gooden at 16: Scouted Before He Was Old Enough to Drive", team:"Mets", year:"1982", story:"Dwight Gooden was 16 years old when Mets scouts first became aware of him in Tampa, Florida. The team drafted him two years later, in 1982, with the fifth overall pick. At 19 he struck out 276 batters and won Rookie of the Year. At 20 he was the best pitcher on earth. The Mets had found him at 16 and signed him at 18 and watched him become something genuinely rare. What followed — the struggles, the suspensions, the decline — was tragic precisely because the talent was so obvious so early. Nobody who saw him in 1985 could have predicted what came after." },
  { title:"Dennis Byrd: The Jet We Still Honor", team:"Jets", year:"1989", story:"The Jets drafted Dennis Byrd in 1989. He became a defensive end who played with enthusiasm and genuine affection for the game — and on November 29, 1992, he was paralyzed when he collided with a teammate during a game. His recovery, which doctors said was unlikely to allow him to walk again, produced one of the most moving moments in NFL history when he walked onto the field at Giants Stadium. Byrd died in a car accident in 2016. The Jets retired his number 90 and established the Dennis Byrd Award, given annually to the team's most inspirational player. The draft pick became the franchise's conscience." },
  { title:"Mark Messier: The Trade That Felt Like a Draft Pick", team:"Rangers", year:"1991", story:"Mark Messier was not a draft pick — the Rangers acquired him from Edmonton in a trade in October 1991. But in terms of what he meant to the franchise, he functioned like the most important selection the team ever made. He brought five championship rings, a captain's presence, and the specific leadership that comes from having already won. He remade the Rangers' culture in three years. He guaranteed a win in Game 6 of the 1994 conference finals against New Jersey and delivered it. He lifted the Stanley Cup at the Garden on June 14, 1994. The trade that brought him to New York was the best personnel decision in Rangers history." },
  { title:"The Nets' Draft History: Building and Starting Over", team:"Nets", year:"Multiple", story:"The Nets have drafted Julius Erving (who they lost to the NBA merger), Drazen Petrovic (who they nearly traded and then lost to a car accident), Kenyon Martin, Richard Jefferson, and Brook Lopez — building rosters that reached the NBA Finals in 2002 and 2003 with Jason Kidd but never won a title. The move to Brooklyn in 2012 came with a trade for Paul Pierce and Kevin Garnett that cost the team multiple first-round picks and set the franchise back years. The Nets' draft history is a lesson in how difficult it is to build a championship team in the shadow of the Knicks, in a city that only has room for one basketball narrative at a time." },
  { title:"Willis Reed: Second Round, First in History", team:"Knicks", year:"1964", story:"Willis Reed was a second-round pick in the 1964 NBA Draft — taken 10th overall, by a franchise that didn't fully understand what it had. Reed became the first player to win MVP awards in the All-Star Game, the regular season, and the Finals in the same year (1970). He was captain of two championship teams. His limping entrance before Game 7 in 1970 is the most iconic moment in Knicks history. A second-round pick, passed on by teams that could have had him. He became the Captain." },
  { title:"Pat LaFontaine: The Draft That Almost Fixed the Islanders", team:"Islanders", year:"1983", story:"The Islanders took Pat LaFontaine third overall in the 1983 draft — and for a few years, it looked like he might be the next piece of the dynasty. LaFontaine was explosive and gifted, and his overtime goal in the Easter Epic of 1987 (four overtime periods against the Capitals) is the most celebrated moment of the post-dynasty era on Long Island. The dynasty years had ended. LaFontaine was the proof that the organization could still find generational talent. He was eventually traded to Buffalo, where he played the best years of his career. The Islanders have spent decades wondering what might have been." },
  { title:"Mookie Wilson: The 12th-Round Pick Who Made History", team:"Mets", year:"1977", story:"Mookie Wilson was drafted by the Mets in the second round in 1977 — and became the player most associated with the greatest single moment in franchise history. His slow roller to first base in Game 6 of the 1986 World Series, which rolled through Bill Buckner's legs and sent the game to the Mets, is the most replayed play in team history. Wilson scored the winning run, too — he was on second base when the ball went through. He became a coach for the franchise and remained one of the most beloved figures in Mets history. A draft pick who became a legend on a ground ball." },
  { title:"The Devil's Draft: Building Three Cups in Nine Years", team:"Devils", year:"1990s", story:"The New Jersey Devils won Stanley Cup championships in 1995, 2000, and 2003 — three titles in nine years — and built the team almost entirely through smart drafting and development. Martin Brodeur was taken 20th overall in 1990 and became the greatest goalie in NHL history. Scott Stevens was acquired in a compensation deal. Scott Niedermayer was taken third overall in 1991. Brian Rafalski went undrafted by every NHL team and signed as a free agent from Europe. The Devils built quietly while the Rangers and Islanders drew more attention. The quiet team won three times." },
  { title:"Clyde Frazier: The Pick Who Redefined Cool", team:"Knicks", year:"1967", story:"Walt 'Clyde' Frazier was taken fifth overall by the Knicks in the 1967 draft. He became the co-star of two championship teams and arguably the most stylish athlete in New York sports history. The wide-brimmed hats, the fur coats, the Rolls-Royce, the apartment full of peacock furniture — Frazier was a legitimate fashion icon before that was a category most athletes aspired to. His basketball was as elegant as his wardrobe: precise, economical, devastating on defense. His Game 7 performance in 1970 — 36 points, 19 assists — remains the greatest individual game in Knicks championship history." },
  { title:"The Second-Round Steal: Late-Round NY Finds", team:"Multiple", year:"Various", story:"New York teams have found franchise players in the late rounds more than once. Henrik Lundqvist in the seventh round of the 2000 NHL draft. Mookie Wilson in the second round of the 1977 baseball draft. Willis Reed in the second round in 1964. The lesson is consistent: the draft is uncertain enough that talent hides in late rounds, waits for a team willing to develop it, and sometimes emerges as something far larger than the pick number suggests. New York's greatest draft success stories are not always the first overall picks. They are sometimes the quiet ones, found late, developed slowly, revealed over time." },
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
  '2026-07-05': 'George Steinbrenner: The Boss Who Changed Everything', // Sunday after his July 4 birthday — also fixes a rotation quirk where Knicks would otherwise repeat 2 weeks after their title essay
};

// ── DEEP DIVE HELPERS — slug generation + email teaser truncation ──────────
function slugify(title) {
  return title.toLowerCase()
    .replace(/['"]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}

function makeTeaser(body, maxWords) {
  maxWords = maxWords || 65;
  // Split on the paragraph breaks we use in long-form essays, take first paragraph
  const firstPara = body.split('\\n\\n')[0];
  const words = firstPara.split(/\\s+/);
  if (words.length <= maxWords) return firstPara;
  return words.slice(0, maxWords).join(' ') + '...';
}

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
    case 2: {
    function getShuffledVoice(entries, weekNum) {
      const n = entries.length;
      const order = [];
      const used = new Array(n).fill(false);
      const recentVoices = [];
      while (order.length < n) {
        let bestScore = -Infinity;
        let bestIdx   = -1;
        for (let i = 0; i < n; i++) {
          if (used[i]) continue;
          const voice = entries[i].voice || 'Unknown';
          const lastSeen = recentVoices.lastIndexOf(voice);
          const recencyPenalty = lastSeen >= 0
            ? Math.max(0, 4 - (recentVoices.length - lastSeen)) * -10 : 0;
          const tiebreak = ((i * 2654435761 + weekNum * 40503) >>> 0) % 100 / 100;
          const score = recencyPenalty + tiebreak;
          if (score > bestScore) { bestScore = score; bestIdx = i; }
        }
        if (bestIdx === -1) break;
        used[bestIdx] = true;
        order.push(bestIdx);
        recentVoices.push(entries[bestIdx].voice || 'Unknown');
      }
      return entries[order[weekNum % order.length]];
    }
    return { type:'quote', data: getShuffledVoice(NY_VOICES, weekNumber) };
  }
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
      const slug   = slugify(d.title);
      const teaser = makeTeaser(d.body, 65);
      const readMoreUrl = SITE_URL + '/?tab=DEEPDIVE&essay=' + slug;
      return wrap('&#128269; Sunday Deep Dive', '#1a7fc2',
        '<div style="font-size:16px;font-weight:900;color:#111;font-family:Georgia,serif;'
        + 'line-height:1.3;margin-bottom:10px">' + d.title + '</div>'
        + '<div style="font-size:11px;font-weight:700;color:#c8201c;letter-spacing:0.1em;'
        + 'text-transform:uppercase;margin-bottom:12px">' + d.team + ' &nbsp;&middot;&nbsp; ' + d.year + '</div>'
        + '<div style="font-size:13px;color:#444;line-height:1.75;font-family:Georgia,serif">' + teaser + '</div>'
        + '<a href="' + readMoreUrl + '" style="display:inline-block;margin-top:14px;background:#1a7fc2;color:#fff;'
        + 'text-decoration:none;font-size:11px;font-weight:900;letter-spacing:0.08em;padding:11px 24px;'
        + 'text-transform:uppercase">Continue Reading &rarr;</a>'
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
      return wrap('&#127908; Tuesday: The Voice', '#2a4a7f',
        '<div style="font-size:9px;font-weight:900;color:#2a4a7f;letter-spacing:0.2em;'
        + 'text-transform:uppercase;margin-bottom:10px">' + q.era + ' &nbsp;&middot;&nbsp; ' + q.team + '</div>'
        + '<div style="font-size:13px;font-weight:900;color:#111;margin-bottom:12px;line-height:1.3">' + q.title + '</div>'
        + '<div style="font-size:20px;font-weight:900;color:#c8201c;font-family:Georgia,serif;'
        + 'font-style:italic;line-height:1.35;margin-bottom:16px;border-left:4px solid #c8201c;padding-left:14px">'
        + '&ldquo;' + q.quote + '&rdquo;</div>'
        + '<div style="font-size:12px;color:#444;line-height:1.7;font-family:Georgia,serif;margin-bottom:12px">' + q.story + '</div>'
        + '<div style="font-size:9px;font-weight:900;color:#888;letter-spacing:0.15em;text-transform:uppercase">'
        + '&#127908; ' + q.voice + '</div>'
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
      const draftMeta = [d.team, d.year].filter(Boolean).join(' &nbsp;&middot;&nbsp; ');
      return wrap('&#127944; Wednesday: The Draft', '#1a7fc2',
        '<div style="font-size:11px;font-weight:700;color:#c8201c;letter-spacing:0.1em;text-transform:uppercase;margin-bottom:4px">'
        + draftMeta + '</div>'
        + '<div style="font-size:15px;font-weight:900;color:#111;font-family:Georgia,serif;line-height:1.3;margin-bottom:10px">' + d.title + '</div>'
        + '<div style="font-size:12px;color:#444;line-height:1.75;font-family:Georgia,serif">' + (d.story || d.body || '') + '</div>'
      );
    }

    case 'trophy': {
      const t = trophyEntry;
      if (!t) return '';
      // Support both new THIS_WEEK format (has .story, .date) and old GLORY_MOMENTS format
      const isNewFormat = !!t.story;
      if (isNewFormat) {
        return wrap('&#128197; This Week in NY Sports History', '#1a5f1a',
          '<div style="font-size:9px;font-weight:900;color:#1a5f1a;letter-spacing:0.2em;'
          + 'text-transform:uppercase;margin-bottom:6px">' + t.date + ' &nbsp;&middot;&nbsp; ' + t.team + '</div>'
          + '<div style="font-size:15px;font-weight:900;color:#111;font-family:Georgia,serif;'
          + 'line-height:1.3;margin-bottom:12px">' + t.title + '</div>'
          + '<div style="font-size:13px;color:#444;line-height:1.75;font-family:Georgia,serif">' + t.story + '</div>'
        );
      }
      // Fallback: old Trophy Case format
      return wrap('&#127942; Friday: The Trophy Case', '#f0b429',
        '<div style="background:#fffbf2;border:1px solid #f0e2b0;border-left:4px solid #f0b429;padding:16px 18px">'
        + '<div style="font-size:42px;font-weight:900;color:#f0b429;line-height:1;margin-bottom:2px">' + t.year + '</div>'
        + '<div style="font-size:9px;font-weight:900;color:#c8201c;letter-spacing:0.2em;text-transform:uppercase;margin-bottom:2px">' + t.team + '</div>'
        + '<div style="font-size:13px;font-weight:700;color:#111;margin-bottom:8px">' + t.title + '</div>'
        + '<div style="font-size:12px;color:#555;line-height:1.6">' + (t.text||'') + '</div>'
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
// ── FRIDAY: THIS WEEK IN NY SPORTS HISTORY ─────────────────────────────────
const THIS_WEEK_IN_NY_SPORTS = [
  { week:1, date:"January 2, 1935", team:"Yankees", title:"Babe Ruth Signs His Last Yankees Contract", story:"On January 2, 1935, Babe Ruth signed what would be the last contract of his Yankees career — though he didn't know it yet. He had hit 659 home runs in pinstripes, won four World Series, and turned Yankee Stadium into a cathedral. The Yankees released him two months later. Ruth went to the Braves, hit three final home runs in Pittsburgh, and retired. He never managed in the major leagues, which was the one thing he wanted most. His relationship with the Yankees ended not with a parade but with a quiet exit from an office on Fifth Avenue." },
  { week:2, date:"January 12, 1969", team:"Jets", title:"Joe Namath Makes Good on His Guarantee", story:"Super Bowl III. The New York Jets against the Baltimore Colts, 18-point underdogs, in Miami. Three days earlier, at a dinner, Joe Namath had guaranteed a Jets victory. The football world laughed. On January 12, 1969, the Jets won 16-7. Namath threw for 206 yards, was named MVP, and jogged off the field with his index finger raised — not for himself, but for the Jets, for the AFL, for everyone who had been told their league didn't belong on the same field as the NFL. It remains the single greatest upset in Super Bowl history, built on a guarantee nobody believed." },
  { week:3, date:"January 19, 1984", team:"Islanders", title:"The Easter Epic Begins", story:"The 1984 Patrick Division Semifinals between the New York Islanders and the Washington Capitals produced what is widely considered the greatest single game in NHL history. Game 7, April 18, 1987 — but its roots trace to the dynasty years of the early 1980s. Jiggs McDonald called those Islanders teams through four consecutive Stanley Cups, and the franchise became the first American team to win four straight. For the generation of Long Island kids who grew up with those teams, the dynasty was simply the order of things — until it wasn't, and they spent the next four decades waiting for it to come back." },
  { week:4, date:"January 25, 1987", team:"Giants", title:"The Giants Win Super Bowl XXI", story:"On January 25, 1987, the New York Giants defeated the Denver Broncos 39-20 in Super Bowl XXI in Pasadena. Phil Simms completed 22 of 25 passes — an 88 percent completion rate that remains a Super Bowl record. Lawrence Taylor was the best defensive player on the field and arguably the best in the sport. Bill Parcells had built something in New Jersey that felt, finally, like a legitimate dynasty. The franchise that had won NFL championships in 1956 and 1963 under different rules and different eras had finally won it in the modern game, with a team that looked and played like New York." },
  { week:5, date:"February 3, 2008", team:"Giants", title:"The Helmet Catch", story:"On February 3, 2008, with 1:15 remaining in Super Bowl XLII, the New England Patriots were 18-0 and 12 points ahead. Eli Manning escaped what should have been a sack, launched a ball downfield, and David Tyree — who had caught exactly one pass all season — pinned it against his helmet for 32 yards. The Giants won 17-14. The Patriots did not complete the perfect season. In a single play, one of the most improbable in football history, New York had beaten the most dominant team anyone could remember. Tyree never caught another meaningful NFL pass. He didn't have to." },
  { week:6, date:"February 9, 1895", team:"Giants", title:"The Day New York Baseball Was Born", story:"The New York Giants played their first game at the Polo Grounds in 1883, but it was in the winter of 1895 that the franchise began the transformation that would make it the dominant team of the early 20th century. John McGraw arrived as manager in 1902 and won ten pennants over the next 24 years. The Giants were New York baseball before the Yankees arrived, before the Mets existed — the original. When they left for San Francisco in 1957, something in New York that had existed since before the Civil War simply stopped existing." },
  { week:7, date:"February 18, 1978", team:"Rangers", title:"The Rangers Trade for Don Murdoch — and Begin a Slow Build", story:"The late 1970s Rangers were a team of near-misses — Phil Esposito, Rod Gilbert, Ken Dryden stopping them cold in the playoffs year after year. But the seeds of the 1994 championship were being planted, one transaction at a time. Brian Leetch would arrive in 1988. Mike Richter in 1989. Mark Messier in 1991. Championships are not built in a single trade or a single draft. They are built in the slow accumulation of the right people, in the right place, over more years than anyone wants to admit. The Rangers' 54-year wait between titles was not a drought. It was a construction project, moving too slowly for anyone standing in the building to see." },
  { week:8, date:"February 22, 1994", team:"Rangers", title:"Mark Messier Arrives and Changes Everything", story:"When the Rangers acquired Mark Messier from the Edmonton Oilers in October 1991, they did not just get a center. They got five Stanley Cup rings, a captain's presence that no one in the organization could replicate, and the specific kind of leadership that only comes from having already won. Messier had been to the mountain. He knew what it took. By February of the 1993-94 season, with the team building toward a run nobody could quite believe was happening, Messier was the reason the dressing room believed it. When he guaranteed a win in Game 6 against New Jersey that May and then went out and delivered it, it was simply Messier being Messier." },
  { week:9, date:"March 2, 1962", team:"Knicks", title:"Wilt Chamberlain Scores 100 Against the Knicks", story:"On March 2, 1962, Wilt Chamberlain scored 100 points against the New York Knicks in Hershey, Pennsylvania — the most points ever scored by one player in one NBA game, a record that has stood for over 60 years. The Knicks lost 169-147. There were no cameras in the building. The only photograph of Chamberlain from that night is him holding a piece of paper with '100' written on it. For the Knicks, it remains the most famous loss in franchise history — proof that sometimes what you witness being done against you becomes as legendary as anything your own team ever accomplishes." },
  { week:10, date:"March 8, 1971", team:"Ali/Frazier", title:"The Fight of the Century at the Garden", story:"On March 8, 1971, Muhammad Ali and Joe Frazier met at Madison Square Garden for what was billed as the Fight of the Century — the first time two undefeated heavyweight champions had ever faced each other. Ali called it the biggest fight since creation. Frazier knocked him down in the 15th round and won a unanimous decision. The Garden had never held something this large, and arguably has not since. It was not just a fight — it was a cultural referendum on the 1960s, on Vietnam, on race and politics and what it meant to be an American. New York was the only city that could have held it." },
  { week:11, date:"March 14, 1985", team:"Mets", title:"Dwight Gooden's Perfect Spring", story:"In the spring of 1985, Dwight Gooden was 20 years old and the most dominant pitcher anyone had ever seen at that age. He had struck out 276 batters the previous year as a 19-year-old. That March, he was untouchable in Florida — and what followed in the regular season was a season that stands alone in modern baseball history. He went 24-4, posted a 1.53 ERA, struck out 268 batters, and won the Cy Young Award unanimously at age 20. The Mets won 98 games and lost the division to the Cardinals. The championship was a year away. Gooden, at that moment, was the best pitcher on earth." },
  { week:12, date:"March 22, 1994", team:"Rangers", title:"The Rangers Clinch the Presidents' Trophy", story:"On March 22, 1994, the New York Rangers clinched the Presidents' Trophy — the best record in the NHL for the regular season. It was the first time the franchise had earned that distinction in decades, and it was both a promise and a warning. The teams with the best regular-season records don't always win the Cup. The Rangers had been here before, close enough to taste it, and lost. The roster knew this. Mark Messier knew this better than anyone. Winning the Presidents' Trophy meant nothing unless what followed was the only thing that actually mattered. Two months later, it was." },
  { week:13, date:"March 30, 1985", team:"Mets", title:"Bernard King's Knee — and What It Cost the Knicks", story:"On March 30, 1985, in a nothing late-season game in Kansas City, Bernard King planted his right leg to contest a dunk and destroyed his knee in an instant — a torn ACL, torn meniscus, and fractured femur, all at once. King was leading the league in scoring at 32.9 points per game. No NBA player had ever fully recovered from an injury like this. He fought back anyway. He came back 23 months later, played six games, and the Knicks released him. He went to Washington and made another All-Star team six years later. The Knicks got Patrick Ewing in the draft lottery that summer. They never got another King." },
  { week:14, date:"April 6, 1973", team:"Mets", title:"The 1973 Mets Open the Season in Last Place", story:"The 1973 New York Mets opened the season badly and kept getting worse. By late August they were in last place in the National League East, nine games under .500. Tug McGraw gathered the team and delivered what became the rallying cry of one of the most improbable runs in baseball history: 'Ya Gotta Believe!' The Mets won the division on the last day of the season with an 82-79 record. They beat the Big Red Machine in the NLCS. They took the Oakland A's to seven games in the World Series. They lost Game 7. But 'Ya Gotta Believe' lasted longer than the season. It's still being said." },
  { week:15, date:"April 10, 1947", team:"Brooklyn Dodgers", title:"Jackie Robinson Breaks the Color Barrier", story:"On April 10, 1947, the Brooklyn Dodgers announced that Jackie Robinson had made the major league roster. Six days later, at Ebbets Field against the Boston Braves, he played his first game. He went 0-for-3 but reached base on an error. Over the course of that season, facing death threats, deliberate spikings, racial slurs from opposing dugouts, and the weight of an entire country watching, Robinson batted .297, scored 125 runs, stole 29 bases, and won the first Rookie of the Year Award in baseball history. He changed the sport. He changed New York. He may have changed the country." },
  { week:16, date:"April 17, 1976", team:"Yankees", title:"The Renovated Yankee Stadium Opens", story:"On April 17, 1976, Yankee Stadium reopened after two years of renovation — and the Yankees, who had been playing in Shea Stadium while the work was done, returned home. The new stadium had a smaller capacity, better sightlines, and a modern scoreboard. The mystique of the old building was mostly intact. The Yankees won the American League pennant that year, their first in 12 seasons, and won it again the next two years, taking the 1977 and 1978 World Series. The House That Ruth Built, renovated, was still the House That Ruth Built. It just took two years away to remind everyone of what they had." },
  { week:17, date:"April 27, 1983", team:"Islanders", title:"The Islanders Win Their Fourth Straight Stanley Cup", story:"On April 27, 1983, the New York Islanders swept the Edmonton Oilers to win their fourth consecutive Stanley Cup — the first American franchise to accomplish that feat, matching the dynastic runs of the Montreal Canadiens. Mike Bossy, Bryan Trottier, Denis Potvin, and Billy Smith formed the core of what was, for four years, the best hockey team on earth. The Oilers, who would dominate the rest of the decade, were swept in their first Finals appearance. Long Island erupted. Jiggs McDonald called it with the disbelief of someone who had watched every game. For a generation of Islanders fans, this was the apex — and it remains so." },
  { week:18, date:"May 1, 1991", team:"Mets", title:"The Night Darryl Strawberry Returns to Shea", story:"When Darryl Strawberry signed with the Los Angeles Dodgers as a free agent in 1991 and returned to Shea Stadium for the first time in a Dodgers uniform, the reception from the Mets fans was as ugly as any moment in the stadium's history. They booed him savagely, threw things, held signs. Strawberry, who had been one of the most talented players in Mets history, had left for more money. In New York, that is the one thing that is not easily forgiven. The night was a kind of summary of what the relationship between New York and its sports figures actually is — conditional, intense, and occasionally unforgiving." },
  { week:19, date:"May 8, 1970", team:"Knicks", title:"Willis Reed Limps Out of the Tunnel", story:"Before Game 7 of the 1970 NBA Finals, nobody knew if Willis Reed could play. He had torn a muscle in his right thigh in Game 5 and sat out Game 6. When he walked out of the tunnel at Madison Square Garden on May 8, 1970, the building lost its mind. Reed hit the first two baskets of the game — the only two he would score all night — and the Knicks won 113-99. Walt Frazier, freed from double-teams by Reed's presence, scored 36 points and handed out 19 assists. The Knicks won their first championship. Reed's limp is the most iconic image in franchise history." },
  { week:20, date:"May 14, 1998", team:"Yankees", title:"David Wells Throws a Perfect Game", story:"On May 14, 1998, David Wells — a portly left-hander who had reportedly been nursing a hangover from a Saturday Night Live after-party the night before — threw a perfect game against the Minnesota Twins at Yankee Stadium. It was the first perfect game in Yankees history since Don Larsen's in the 1956 World Series. The 1998 Yankees would go on to win 125 total games (including playoffs) and the World Series — the greatest single-season performance in the franchise's history. Wells, who had once worn Babe Ruth's cap during a game, understood better than most that being a Yankee was a kind of theater as much as a sport." },
  { week:21, date:"May 27, 1994", team:"Rangers", title:"Matteau! Matteau! Matteau!", story:"On May 27, 1994, Stephane Matteau scored in double overtime of Game 7 of the Eastern Conference Finals to send the New York Rangers to the Stanley Cup Final for the first time since 1979. Howie Rose's call — 'Matteau! Matteau! Matteau!' — was heard on radios across the five boroughs and on Long Island by people who had been waiting since 1940 for the Rangers to win a championship. Two weeks later, they would. But this moment — a journeyman winger scoring past Martin Brodeur in a Garden that was practically vibrating — was the moment the city allowed itself to believe for the first time." },
  { week:22, date:"June 2, 1941", team:"Yankees", title:"Lou Gehrig Dies at 37", story:"On June 2, 1941, Lou Gehrig died at his home in Riverdale, the Bronx, at the age of 37 — two years after his farewell speech at Yankee Stadium. He had been diagnosed with ALS in June 1939, forced to end his consecutive games streak at 2,130, and delivered what became one of the most famous speeches in American sports history: 'Today, I consider myself the luckiest man on the face of the earth.' He meant it. Gehrig had been a Yankee for 17 seasons, had hit 493 home runs, and never won a batting title because he hit behind Babe Ruth. The disease that killed him now bears his name." },
  { week:23, date:"June 6, 1986", team:"Mets", title:"The 1986 Mets Are Officially Unstoppable", story:"By June 6, 1986, the New York Mets had built a lead in the National League East that was beginning to look permanent. Dwight Gooden, Darryl Strawberry, Keith Hernandez, Gary Carter, Lenny Dykstra, Mookie Wilson — a roster assembled over years of careful drafting and shrewd trades, managed by Davey Johnson with a controlled looseness that allowed the talent to breathe. They would win 108 games that year. They would win the World Series in six games. They were, at their peak in the summer of 1986, as dominant a baseball team as New York had seen in decades. And everyone in the city knew it." },
  { week:24, date:"June 14, 1994", team:"Rangers", title:"The Rangers Win the Stanley Cup", story:"On June 14, 1994, the New York Rangers defeated the Vancouver Canucks in Game 7 to win the Stanley Cup for the first time since 1940 — ending a 54-year drought that had become the sport's longest-running joke. Mark Messier hoisted the Cup first, as captain, the way the tradition demands. Sam Rosen called it: 'The waiting is over!' Madison Square Garden, which had survived wars and recessions and 54 years of near-misses, erupted in a way it hadn't since Willis Reed walked out of the tunnel in 1970. In the stands, grown men wept. In the streets, strangers hugged. New York, finally, had its hockey championship back." },
  { week:25, date:"June 21, 1964", team:"Mets", title:"Casey Stengel and the Amazin' Mets", story:"Casey Stengel managed the original 1962 Mets to a 40-120 record — the worst in modern baseball history — and somehow made New York fall in love with them anyway. He called them his Amazin' Mets, said it with genuine wonder rather than irony, and turned a collection of rejects and retreads into the most entertaining bad team the sport had ever seen. Stengel broke his hip in 1965 and retired at 75, but what he had built in those first few years was something harder to manufacture than wins: a fan base that showed up anyway, because Stengel made losing feel like a shared adventure rather than a catastrophe." },
  { week:26, date:"June 28, 1977", team:"Yankees", title:"Reggie Jackson Becomes 'Mr. October' (in June)", story:"When Reggie Jackson arrived in New York in 1977, he told reporters he was 'the straw that stirs the drink' — which did not endear him to his teammates or to Thurman Munson, whom he had essentially displaced as the team's most important presence. The Yankees won the World Series anyway, in six games, with Jackson hitting three home runs on three consecutive pitches from three different pitchers in Game 6 — the greatest individual performance in World Series history. 'Mr. October' was born. The straw had, in fact, stirred the drink. New York forgave the quote. It always does when the at-bat is that good." },
  { week:27, date:"July 4, 1939", team:"Yankees", title:"Lou Gehrig's Farewell", story:"On July 4, 1939, Lou Gehrig stood at home plate at Yankee Stadium between games of a doubleheader against the Washington Senators and told 61,808 people that he considered himself the luckiest man on the face of the earth. He had been diagnosed with ALS weeks earlier. His consecutive games streak was over at 2,130. He was 36 years old. The speech lasted two minutes. Babe Ruth — who had feuded with Gehrig for years — walked out of the crowd and embraced him. The stadium went silent and then erupted. It remains the most moving moment in the history of Yankee Stadium, which produced no shortage of them." },
  { week:28, date:"July 13, 1977", team:"Yankees", title:"The Bronx is Burning", story:"During Game 2 of the 1977 World Series, with the Yankees playing the Dodgers in the Bronx, ABC cameras cut to a fire burning in a building visible from the stadium's upper deck. Howard Cosell narrated the scene: 'There it is, ladies and gentlemen, the Bronx is burning.' The image — a crumbling, burning building visible from a World Series game — became the defining image of New York City in the 1970s. The city was nearly bankrupt, crime was at historic highs, neighborhoods were collapsing. The Yankees won the Series in six games. Baseball, as it sometimes does, provided the escape that the city desperately needed." },
  { week:29, date:"July 17, 1941", team:"Yankees", title:"DiMaggio's Streak Ends at 56", story:"On July 17, 1941, in Cleveland, the third baseman Ken Keltner made two spectacular plays to rob Joe DiMaggio of hits, and the most famous consecutive-game hitting streak in baseball history ended at 56 games. DiMaggio had started the streak on May 15. It had lasted 56 games, through 91 at-bats, through pitchers who knew exactly what he was doing and couldn't stop him. He started another streak the very next day that lasted 16 games. The 56-game record has never been seriously threatened in the 80-plus years since. Baseball has changed in every conceivable way. The number 56 has not." },
  { week:30, date:"July 25, 1978", team:"Yankees", title:"Bucky Dent's Home Run", story:"On October 2, 1978 — but it is a July story at heart. The Yankees had been 14 games behind the Boston Red Sox in July. What followed was the 'Boston Massacre,' four straight blowout wins in Fenway, a complete collapse by the Red Sox, and a one-game playoff at Fenway on October 2. In the seventh inning, with two on and the Yankees trailing 2-0, Bucky Dent — a light-hitting shortstop with four home runs all season — lifted a Mike Torrez fastball just over the Green Monster. Yankees 3, Red Sox 2. The collapse had been completed from July to October. In Boston, Bucky Dent's middle name became an expletive. In New York, he was a hero." },
  { week:31, date:"August 4, 1985", team:"Mets", title:"Tom Seaver Returns to New York — as a White Sox", story:"On August 4, 1985, Tom Seaver returned to pitch at Shea Stadium for the first time since the Mets had traded him — in the most heartbreaking transaction in franchise history — to Cincinnati in 1977. He was now with the Chicago White Sox. He was 40 years old. The Mets crowd gave him a standing ovation that lasted several minutes. Seaver won the game. He had been robbed of what should have been his entire career in New York, handed away by a front office that miscalculated his value, and the fans never forgot either what they had lost or who had taken it from them. The ovation was equal parts tribute and apology." },
  { week:32, date:"August 11, 1979", team:"Yankees", title:"Thurman Munson", story:"On August 2, 1979, Yankees captain Thurman Munson died when the private jet he was piloting crashed during a practice approach in Canton, Ohio. He was 32 years old. Two days later, the Yankees gathered on the field at Yankee Stadium before a game against Baltimore, and his locker — No. 15 — was left empty. Bobby Murcer, Munson's closest friend on the team, hit a three-run homer and a two-run single to win the game the night of his funeral, while crying between at-bats. The Yankees have never reissued the number 15. Munson's locker remains as it was." },
  { week:33, date:"August 15, 1969", team:"Mets", title:"The Miracle Begins", story:"On August 15, 1969, the New York Mets were nine and a half games behind the Chicago Cubs in the National League East with six weeks left in the season. Then, remarkably, the Cubs collapsed and the Mets caught fire. Tom Seaver, Jerry Koosman, and Nolan Ryan held opposing lineups to nothing. The Mets overtook Chicago by the end of August and never looked back. They clinched the division, swept the Braves in the NLCS, and beat the heavily favored Baltimore Orioles in five games in the World Series. They had been 100-to-1 longshots in April. The year 1969 was already a year of impossible things. The Mets fit right in." },
  { week:34, date:"August 22, 1965", team:"Yankees", title:"The Beatles Play Yankee Stadium", story:"On August 22, 1965 — wait, the Beatles played Shea Stadium, not Yankee Stadium, on August 15, 1965. That correction itself is part of the story. Lindsey Nelson called their arrival at Shea as if it were a baseball game, describing the crowd, the noise, the impossible scale of it. 55,600 people came to watch four young men from Liverpool play an outdoor concert in a baseball stadium — the first stadium rock concert in history. The music could barely be heard over the screaming. It didn't matter. What mattered was that New York had figured out something the rest of the world hadn't yet: Shea Stadium could hold anything." },
  { week:35, date:"September 1, 1994", team:"Multiple", title:"The Strike That Cancelled the World Series", story:"On September 14, 1994, the World Series was cancelled for the first time since 1904 — cancelled by a labor strike that had stopped play on August 12. The New York Yankees, at 70-43, had the best record in the American League. The Montreal Expos, at 74-40, had the best record in baseball. Neither team got to finish its season. For the city that had produced some of the greatest October moments in baseball history, there was simply no October. The strike lasted 232 days. When baseball came back in 1995, Montreal was never the same. Neither, for a while, was the relationship between fans and the game." },
  { week:36, date:"September 6, 1995", team:"Yankees", title:"Cal Ripken Passes Gehrig — and the Yankees Honor Both", story:"On September 6, 1995, Cal Ripken Jr. played his 2,131st consecutive game, breaking Lou Gehrig's 56-year-old record. The moment happened in Baltimore, not New York, but it reverberated through Yankee Stadium in a specific way — because Gehrig was not just a Yankee statistic. He was a Yankee soul. The consecutive games record had always felt permanent, the kind of number that doesn't fall. Ripken breaking it was celebrated generously by the baseball world, including in New York. But for Yankees fans, something small and permanent had changed. The Iron Horse's unbreakable record had been broken." },
  { week:37, date:"September 11, 2001", team:"Multiple", title:"The Day Sports Stood Still", story:"On September 11, 2001, New York stopped. The city that defined itself through its pace and its urgency and its noise went silent in a way nobody had ever heard before. The Yankees, the Mets, every New York team suspended play. When they returned, ten days later, New York's sports venues became something they don't usually get to be: places of collective grief and eventually, tentative recovery. The Mets played first, at Shea, on September 21. Mike Piazza hit a home run in the eighth inning. In a city trying to remember how to feel something other than fear and sorrow, he gave them a reason to stand up and cheer." },
  { week:38, date:"September 21, 2001", team:"Mets", title:"Piazza's Home Run", story:"Ten days after September 11, the New York Mets returned to Shea Stadium to play the Atlanta Braves. The city was still in shock. The stadium was draped in American flags. In the eighth inning, with the Mets trailing 2-1, Mike Piazza stepped to the plate and hit a two-run home run to right-center field. The stadium erupted in a way that was about far more than baseball — it was about a city that needed, desperately, to feel something other than grief. The Mets won 3-2. Howie Rose's call on the radio — 'It's gone!' — was all anyone needed to say. Some moments announce themselves. This one did." },
  { week:39, date:"September 29, 1962", team:"Mets", title:"The 1962 Mets Finish 40-120", story:"The 1962 New York Mets finished the season 40-120 — the worst record in modern baseball history, a mark that has never been approached in the six decades since. They were managed by Casey Stengel, who had won seven World Series with the Yankees, and who responded to the daily chaos of the season's worst team with a combination of genuine bafflement and theatrical delight. 'Can't anybody here play this game?' he reportedly asked, the question becoming something like a motto. 922,530 people came to watch them anyway. They were the city's team, in a way the Yankees never quite managed — imperfect, lovable, and hopelessly, endearingly bad." },
  { week:40, date:"October 3, 1951", team:"Giants", title:"The Shot Heard 'Round the World", story:"On October 3, 1951, Bobby Thomson hit a three-run home run off Ralph Branca in the bottom of the ninth inning of a playoff game at the Polo Grounds to send the New York Giants to the World Series. The call by Russ Hodges — 'The Giants win the pennant! The Giants win the pennant!' — remains the most famous in baseball broadcasting history. The Dodgers led 4-2 with one out in the ninth. Thomson hit the second pitch he saw. The Dodgers' dugout was so quiet that the players could hear the Giants celebrating through the concrete walls. It is still called, simply, 'The Shot.'" },
  { week:41, date:"October 8, 1956", team:"Yankees", title:"Don Larsen's Perfect Game", story:"On October 8, 1956, Don Larsen threw the only perfect game in World Series history — 27 up, 27 down, against the Brooklyn Dodgers at Yankee Stadium. Larsen was a journeyman pitcher who would finish his career with a losing record. He had been knocked out in the second inning in his previous World Series start. On this afternoon, in the most watched baseball game of the year, he was untouchable. Yogi Berra leapt into his arms when the final out was recorded. The photograph is one of the most iconic in baseball history. Larsen never came close to another performance like it. He didn't need to." },
  { week:42, date:"October 15, 1969", team:"Mets", title:"The Miracle Mets Win the World Series", story:"On October 15, 1969, the New York Mets defeated the Baltimore Orioles in Game 5 of the World Series, completing one of the most improbable championship runs in sports history. The Mets had been 100-to-1 longshots in April. The Orioles had won 109 games in the regular season. The Mets won four straight after losing Game 1. Cleon Jones caught the final out in left field and the fans poured onto the field and tore up the turf and parts of the park while Lindsey Nelson described it from the booth. It was the first championship New York had won in any sport since the Yankees in 1962. The city had been waiting. The Mets delivered." },
  { week:43, date:"October 25, 1986", team:"Mets", title:"Mookie Wilson's Grounder", story:"With two outs in the bottom of the tenth inning of Game 6, the Mets trailing the Red Sox by a run, a wild pitch scored the tying run. Then Mookie Wilson hit a slow roller down the first base line. Mets announcer Bob Murphy, calling it on the radio, captured what followed with a restrained disbelief that suited the moment perfectly: the ball rolled through Bill Buckner's legs, Ray Knight scored from second, and the Mets had survived. Two nights later they won Game 7 and the World Series. Buckner's error has been replayed so many times it has become its own cultural artifact. Wilson, who made perfect contact on a slow roller, barely gets mentioned." },
  { week:44, date:"October 30, 1977", team:"Yankees", title:"Reggie Hits Three in Game 6", story:"In Game 6 of the 1977 World Series, Reggie Jackson hit three home runs on three consecutive pitches from three different pitchers — Burt Hooton, Elias Sosa, and Charlie Hough. Each left the park on the first pitch it was thrown. The Yankees won 8-4 and took the Series. Jackson circled the bases for the third time to a standing ovation at Yankee Stadium that lasted several minutes. Howard Cosell narrated it for ABC, struggling to find adjectives large enough. Jackson called himself 'the straw that stirs the drink' when he arrived. After October 18, 1977, he was something more specific than that: Mr. October, forever." },
  { week:45, date:"November 5, 2000", team:"Yankees", title:"The Subway Series", story:"The 2000 World Series between the Yankees and the Mets — the first Subway Series since 1956 — was decided by five games, none of them blowouts, most of them decided late. Roger Clemens threw a broken bat toward Mike Piazza. The Yankees won Game 5 in extra innings on a Luis Sojo single. The city was not divided so much as it was doubled: every neighborhood had a rooting interest, every bar had two teams watching. The Yankees won their fourth consecutive World Series title. The Mets lost, but not badly. The Subway Series reminded New York that having two teams is not a burden. It is a specific kind of luxury." },
  { week:46, date:"November 16, 1958", team:"Giants", title:"The Greatest Game Ever Played", story:"On December 28, 1958 — though it was decided in November spirit — the NFL Championship Game between the New York Giants and the Baltimore Colts at Yankee Stadium is still called 'the Greatest Game Ever Played.' The first overtime in NFL championship history. Johnny Unitas driving the Colts down the field in sudden death. Alan Ameche scoring from the one. 45 million Americans watched on television — the largest audience for a sporting event in US history to that point. The game convinced the NFL it could challenge baseball as America's sport. It also broke New York's heart. The Giants lost. But they gave football its moment." },
  { week:47, date:"November 20, 1966", team:"Knicks", title:"The Knicks Take Willis Reed", story:"The 1964 NBA Draft was not historic for the Knicks — they took Willis Reed in the second round, the 10th pick overall. Reed had played at Grambling, a historically Black college that major programs routinely ignored. The Knicks' scout saw something others didn't. Reed became a two-time NBA champion, a two-time Finals MVP, and the most iconic player in franchise history. His Hall of Fame career, his limping entrance before Game 7 of the 1970 Finals, and the championship banner he helped hoist all trace back to a second-round pick that most teams let pass. In New York, the best things sometimes arrive quietly." },
  { week:48, date:"November 28, 1943", team:"Giants", title:"Frank Gifford is Born", story:"Frank Gifford played 12 seasons for the New York Giants, made eight Pro Bowls, won the NFL MVP in 1956, and became one of the most recognizable faces in American sports. When Chuck Bednarik hit him so hard in 1960 that Gifford missed a full season with a concussion, it was the most famous tackle in the history of professional football. After he retired, he became the voice of Monday Night Football for 27 years. He was not just a New York Giant. He was, for two generations of New Yorkers, what a New York athlete was supposed to look like: talented, elegant, and incapable of being embarrassed." },
  { week:49, date:"December 5, 1969", team:"Jets", title:"The Jets Defend Their Championship", story:"The 1969 New York Jets were the defending Super Bowl champions — the team that had guaranteed a victory against the Colts, delivered it, and changed professional football forever. Joe Namath was the most famous athlete in America. The AFL-NFL merger was complete. The Jets, by December of 1969, were trying to repeat what nobody had believed the first time. They didn't — they missed the playoffs after Namath was injured. But what they had done the previous January had permanently changed New York's relationship with football. The city now had two football teams it could believe in, even if the Jets spent the next several decades making that belief as difficult as possible." },
  { week:50, date:"December 14, 1969", team:"Knicks", title:"The Knicks Begin Their Championship Run", story:"The New York Knicks of 1969-70 were building toward something nobody could fully articulate yet. Willis Reed, Walt Frazier, Bill Bradley, Dave DeBusschere, Dick Barnett — a team of complementary talents without an obvious superstar, coached by Red Holzman with a defensive discipline that made them genuinely hard to play against. Marv Albert was calling their games on the radio. By December they were in first place in the Eastern Division and clearly the best team in the conference. What followed in the spring — the championship, the Game 7, the tunnel — was not a surprise to anyone who had been watching since December. It was simply an arrival." },
  { week:51, date:"December 19, 1973", team:"Knicks", title:"The Knicks Win Their Second Championship", story:"The 1973 New York Knicks won the franchise's second NBA championship, defeating the Los Angeles Lakers in five games. Willis Reed, in his final championship season, was Finals MVP. Walt Frazier was the best player on the floor. It was, at the time, the closing chapter of the greatest era in Knicks history. Nobody knew it would also be the opening of a 53-year wait. What followed — Ewing's near-misses, the Isiah Thomas disaster, the Dolan era, the decades of lottery balls — was still entirely in the future. In December 1973, the Knicks were simply champions, and New York was content, and nothing about the next half-century seemed inevitable yet." },
  { week:52, date:"December 31, 1990", team:"Giants", title:"Lawrence Taylor Ends the Decade", story:"Lawrence Taylor played the last game of the 1980s decade as the most dominant defensive player anyone had ever seen. He had redefined his position, forced offensive coordinators to design entire game plans around avoiding him, won two Super Bowls, and won the NFL MVP in 1986 — one of the few times a defensive player has won that award. He was the reason the Giants of the 1980s were what they were. Parcells built the offense around a defense that Taylor anchored. As the decade ended and the 1990s began, Taylor was 31 years old, still playing, still the most feared presence on any field he walked onto. New York doesn't produce defensive players like this. It produced one." },
];

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
  { q:'Who hit three home runs on three consecutive pitches in World Series Game 6 in 1977?', hint:'He was a 5-time World Series champion across three different teams.', a:'Reggie Jackson' },
  { q:'Which Met struck out 10 consecutive batters against the Padres in 1969?', hint:'He won 3 Cy Young Awards and was the first Met to have his number retired.', a:'Tom Seaver' },
  { q:'Joe Namath guaranteed victory before which Super Bowl?', hint:'The Jets were 17-point underdogs against the Baltimore Colts.', a:'Super Bowl III (January 1969)' },
  { q:'Who scored in overtime to give the Islanders their first Stanley Cup in 1980?', hint:'He spent his entire 14-year career on Long Island.', a:'Bob Nystrom' },
  { q:'Which Knick limped onto the MSG court before Game 7 of the 1970 NBA Finals?', hint:'His entrance may be the most dramatic moment in Knicks history.', a:'Willis Reed' },
  { q:'What NY team won 5 NASL championships in the 1970s and 80s with Pelé on the roster?', hint:'They played at Giants Stadium and drew 77,000 fans.', a:'New York Cosmos' },
  { q:'Which Yankee was the first unanimous Hall of Fame inductee in baseball history?', hint:'He recorded 652 career saves, the most in MLB history at the time of his retirement.', a:'Mariano Rivera' },
  { q:'In what year did the Mets win the World Series as 100-to-1 longshots?', hint:'They were known as "The Miracle Mets."', a:'1969' },
  { q:'Which Islander scored 50+ goals in 9 consecutive seasons and won 4 straight Cups?', hint:'He wore #22 and is considered one of the greatest goal-scorers ever.', a:'Mike Bossy' },
  { q:'How many World Series championships have the Yankees won in total?', hint:'More than any other team in baseball history.', a:'27' },
  { q:'Which Giants linebacker won the NFL MVP award in 1986 — the only defensive player ever?', hint:'He\u2019s widely considered the greatest defensive player in NFL history.', a:'Lawrence Taylor' },
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

  // Yesterday's trivia answer — shown BELOW today's question in the Playroom section
  const yesterdayTriviaHtml = yesterdayTrivia
    ? '<div style="background:#fff9e6;border:1px solid #f0e0a0;border-left:3px solid #f0b429;padding:12px 14px;margin-top:14px">'
      + '<div style="font-size:7px;font-weight:900;color:#c8a000;letter-spacing:0.2em;text-transform:uppercase;margin-bottom:6px">&#129504; Yesterday&rsquo;s Answer</div>'
      + '<div style="font-size:11px;color:#666;font-style:italic;margin-bottom:6px">&ldquo;' + yesterdayTrivia.question + '&rdquo;</div>'
      + '<div style="background:#f0b429;color:#111;padding:6px 10px;display:inline-block;font-size:12px;font-weight:900;letter-spacing:0.02em;margin-bottom:4px">&#128161; ' + yesterdayTrivia.answer + '</div>'
      + '<div style="font-size:9px;color:#999;font-style:italic;margin-top:4px">How did you do? &nbsp;&#128522;</div>'
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

    // Trivia (today's question, then yesterday's answer below it)
    + '<div style="padding:18px 28px;border-bottom:1px solid #ebebeb">'
    + '<div style="font-size:8px;font-weight:900;color:#bbb;letter-spacing:0.25em;text-transform:uppercase;padding-bottom:8px;border-bottom:1px solid #ebebeb;margin-bottom:14px">&#127918; Daily Playroom Challenge</div>'
    + triviaHtml
    + yesterdayTriviaHtml
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
    // Friday picks "This Week in NY Sports History" entry by week number
    const trophyEntry = (dayOfWeek === 5)
      ? (THIS_WEEK_IN_NY_SPORTS.find(e => e.week === ((weekNumber % 52) + 1)) || GLORY_MOMENTS[weekNumber % GLORY_MOMENTS.length])
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

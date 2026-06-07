// api/send-digest.js
// Vercel Cron: runs daily at 12:00 UTC = 7am ET

export const config = { maxDuration: 60 };

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;
const RESEND_KEY   = process.env.RESEND_API_KEY;
const CRON_SECRET  = process.env.CRON_SECRET;
const SITE_URL     = 'https://nysportsdaily.com';

async function getSubscribers() {
  const r = await fetch(
    `${SUPABASE_URL}/rest/v1/ny_subscribers?active=eq.true&confirmed=eq.true&select=*`,
    { headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` } }
  );
  if (!r.ok) throw new Error('Could not fetch subscribers');
  return r.json();
}

async function getYesterdayScores(teams) {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const y = yesterday.getFullYear();
  const m = String(yesterday.getMonth()+1).padStart(2,'0');
  const d = String(yesterday.getDate()).padStart(2,'0');
  const dateStr = `${y}${m}${d}`;

  const NY_FULL = [
    'new york yankees','new york mets','new york jets','new york giants',
    'new york knicks','brooklyn nets','new york rangers','new york islanders',
    'new jersey devils','new york liberty','new york city fc','new york red bulls',
  ];

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
        `https://site.api.espn.com/apis/site/v2/sports/${cfg.sport}/${cfg.league}/scoreboard?dates=${dateStr}`
      );
      if (!r.ok) return;
      const json = await r.json();
      (json.events||[]).forEach(ev => {
        const comp = ev.competitions?.[0];
        if (!comp?.status?.type?.completed) return;
        const home = comp.competitors?.find(c => c.homeAway==='home');
        const away = comp.competitors?.find(c => c.homeAway==='away');
        if (!home || !away) return;
        const homeName = (home.team?.displayName||'').toLowerCase();
        const awayName = (away.team?.displayName||'').toLowerCase();
        if (!NY_FULL.some(ny => homeName.includes(ny) || awayName.includes(ny))) return;
        const homeScore = parseInt(home.score||0);
        const awayScore = parseInt(away.score||0);
        allGames.push({
          sport:     cfg.label,
          emoji:     cfg.emoji,
          homeName:  home.team?.shortDisplayName || home.team?.name,
          homeScore,
          awayName:  away.team?.shortDisplayName || away.team?.name,
          awayScore,
          homeWin:   homeScore > awayScore,
          awayWin:   awayScore > homeScore,
          homeLines: (home.linescores||[]).map(l=>l.value),
          awayLines: (away.linescores||[]).map(l=>l.value),
          boxUrl:    `https://www.espn.com/${cfg.sport}/recap/_/gameId/${ev.id}`,
        });
      });
    } catch(e) {}
  }));

  if (!teams || teams.length === 0) return allGames;
  return allGames.filter(g =>
    teams.some(t =>
      g.homeName?.toLowerCase().includes(t.toLowerCase()) ||
      g.awayName?.toLowerCase().includes(t.toLowerCa

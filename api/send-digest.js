// api/send-digest.js
// Vercel Cron: runs daily at 12:00 UTC = 8am ET

export const config = { maxDuration: 60 };

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;
const RESEND_KEY   = process.env.RESEND_API_KEY;
const SITE_URL     = 'https://nysportsdaily.com';

async function getSubscribers() {
  const r = await fetch(
    SUPABASE_URL + '/rest/v1/ny_subscribers?active=eq.true&confirmed=eq.true&select=*',
    { headers: { 'apikey': SUPABASE_KEY, 'Authorization': 'Bearer ' + SUPABASE_KEY } }
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
  const dateStr = y + m + d;

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
  await Promise.all(CONFIGS.map(async function(cfg) {
    try {
      const r = await fetch(
        'https://site.api.espn.com/apis/site/v2/sports/' + cfg.sport + '/' + cfg.league + '/scoreboard?dates=' + dateStr
      );
      if (!r.ok) return;
      const json = await r.json();
      (json.events||[]).forEach(function(ev) {
        const comp = ev.competitions && ev.competitions[0];
        if (!comp || !comp.status || !comp.status.type || !comp.status.type.completed) return;
        const home = (comp.competitors||[]).find(function(c) { return c.homeAway === 'home'; });
        const away = (comp.competitors||[]).find(function(c) { return c.homeAway === 'away'; });
        if (!home || !away) return;
        const homeName = ((home.team && home.team.displayName) || '').toLowerCase();
        const awayName = ((away.team && away.team.displayName) || '').toLowerCase();
        const isNY = NY_FULL.some(function(ny) { return homeName.includes(ny) || awayName.includes(ny); });
        if (!isNY) return;
        const homeScore = parseInt(home.score || 0);
        const awayScore = parseInt(away.score || 0);
        allGames.push({
          sport:     cfg.label,
          emoji:     cfg.emoji,
          homeName:  (home.team && (home.team.shortDisplayName || home.team.name)) || '',
          homeScore: homeScore,
          awayName:  (away.team && (away.team.shortDisplayName || away.team.name)) || '',
          awayScore: awayScore,
          homeWin:   homeScore > awayScore,
          awayWin:   awayScore > homeScore,
          homeLines: (home.linescores||[]).map(function(l) { return l.value; }),
          awayLines: (away.linescores||[]).map(function(l) { return l.value; }),
          boxUrl:    'https://www.espn.com/' + cfg.sport + '/recap/_/gameId/' + ev.id,
        });
      });
    } catch(e) { console.error('Scores error:', e); }
  }));

  if (!teams || teams.length === 0) return allGames;
  return allGames.filter(function(g) {
    return teams.some(function(t) {
      return (g.homeName||'').toLowerCase().includes(t.toLowerCase()) ||
             (g.awayName||'').toLowerCase().includes(t.toLowerCase());
    });
  });
}

async function getTeamHeadlines(teams) {
  const headlines = [];
  const toFetch = (teams && teams.length > 0) ? teams.slice(0,3) : ['Yankees','Mets','Knicks'];
  await Promise.all(toFetch.map(async function(team) {
    try {
      const query = encodeURIComponent('New York ' + team + ' sports');
      const r = await fetch(
        'https://news.google.com/rss/search?q=' + query + '&hl=en-US&gl=US&ceid=US:en'
      );
      if (!r.ok) return;
      const xml = await r.text();
      const items = xml.match(/<item>([\s\S]*?)<\/item>/g) || [];
      items.slice(0,2).forEach(function(item) {
        const titleMatch = item.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/) ||
                           item.match(/<title>(.*?)<\/title>/);
        const linkMatch  = item.match(/<link>(.*?)<\/link>/);
        const srcMatch   = item.match(/<source[^>]*>(.*?)<\/source>/);
        const title  = titleMatch ? titleMatch[1] : '';
        const link   = linkMatch  ? linkMatch[1]  : SITE_URL;
        const source = srcMatch   ? srcMatch[1]   : '';
        if (title && !title.includes('Google News')) {
          headlines.push({ team: team, title: title.replace(/&amp;/g,'&'), link: link, source: source });
        }
      });
    } catch(e) { console.error('Headlines error:', e); }
  }));
  return headlines;
}

const GLORY_MOMENTS = [
  { year:1969, text:'Tom Seaver strikes out 10 consecutive Padres. The Miracle Mets were becoming real.' },
  { year:1977, text:'Reggie Jackson hits 3 home runs on 3 consecutive pitches in World Series Game 6. Mr. October is born.' },
  { year:1994, text:'Mark Messier guarantees a Rangers win in Game 6 then scores a hat trick. 54 years of waiting ends.' },
  { year:1986, text:"Mookie Wilson's grounder rolls through Buckner's legs. The Mets are World Champions." },
  { year:1970, text:'Willis Reed limps onto the MSG court before Game 7. The crowd erupts. The Knicks win.' },
  { year:1969, text:'Joe Namath guarantees Super Bowl victory as a 17-point underdog. Broadway Joe delivers.' },
  { year:1927, text:"Murderers' Row — the greatest team ever assembled. Ruth hits his 40th home run of the season." },
  { year:1980, text:'Bob Nystrom scores in overtime. The Islanders dynasty begins.' },
  { year:2000, text:'The Subway Series — Yankees vs Mets. Derek Jeter leads off Game 4 with a home run.' },
  { year:2009, text:'Hideki Matsui hits a grand slam. The Yankees win their 27th championship.' },
  { year:1973, text:'The Knicks win their second NBA championship. Frazier, Reed, DeBusschere — a perfect team.' },
  { year:1956, text:'Don Larsen throws the only perfect game in World Series history. Yogi leaps into his arms.' },
  { year:1983, text:"The Islanders sweep Gretzky's Oilers for their 4th straight Stanley Cup. A dynasty for the ages." },
  { year:2024, text:'Breanna Stewart leads the Liberty to their first WNBA championship. 27 years of waiting over.' },
  { year:1958, text:'The Giants beat the Colts in overtime — the Greatest Game Ever Played births modern pro football.' },
];

function buildEmail(subscriber, scores, headlines, glory) {
  const name    = subscriber.name || 'NY Sports Fan';
  const teams   = (subscriber.teams && subscriber.teams.length > 0) ? subscriber.teams.join(' · ') : 'All NY Teams';
  const today   = new Date().toLocaleDateString('en-US', { weekday:'long', month:'long', day:'numeric' });

  const scoresHtml = scores.length > 0
    ? scores.map(function(g) {
        return '<div style="margin-bottom:12px;padding:12px 14px;background:#f8f8f8;border-left:4px solid #c8201c">'
          + '<div style="font-size:9px;font-weight:900;color:#c8201c;letter-spacing:0.12em;margin-bottom:8px;text-transform:uppercase">' + g.emoji + ' ' + g.sport + ' &nbsp;·&nbsp; FINAL</div>'
          + '<table width="100%" cellpadding="3" cellspacing="0" style="font-family:Georgia,serif">'
          + '<tr><td style="font-size:14px;font-weight:' + (g.awayWin?900:400) + ';color:' + (g.awayWin?'#111':'#888') + '">' + g.awayName + '</td>'
          + '<td align="right" style="font-size:16px;font-weight:900;color:' + (g.awayWin?'#111':'#999') + '">' + g.awayScore + '</td></tr>'
          + '<tr><td style="font-size:14px;font-weight:' + (g.homeWin?900:400) + ';color:' + (g.homeWin?'#111':'#888') + '">' + g.homeName + '</td>'
          + '<td align="right" style="font-size:16px;font-weight:900;color:' + (g.homeWin?'#111':'#999') + '">' + g.homeScore + '</td></tr>'
          + '</table>'
          + (g.homeLines.length > 0
            ? '<div style="margin-top:6px;font-size:10px;color:#999;font-family:monospace">'
              + g.awayName + ': ' + g.awayLines.join(' | ') + ' = ' + g.awayScore + '<br>'
              + g.homeName + ': ' + g.homeLines.join(' | ') + ' = ' + g.homeScore
              + '</div>' : '')
          + '<a href="' + g.boxUrl + '" style="font-size:10px;color:#888;text-decoration:none;display:inline-block;margin-top:6px;border:1px solid #ddd;padding:2px 8px">Full recap on ESPN →</a>'
          + '</div>';
      }).join('')
    : '<div style="padding:12px;color:#888;font-style:italic;font-size:13px">No NY games played yesterday.</div>';

  const headlinesHtml = headlines.length > 0
    ? headlines.map(function(h) {
        return '<div style="border-bottom:1px solid #eee;padding:10px 0">'
          + '<div style="font-size:9px;font-weight:900;color:#c8201c;letter-spacing:0.1em;margin-bottom:3px;text-transform:uppercase">'
          + h.team + (h.source ? ' &nbsp;·&nbsp; ' + h.source : '') + '</div>'
          + '<a href="' + h.link + '" style="font-size:13px;color:#111;text-decoration:none;font-weight:600;line-height:1.4;display:block">' + h.title + '</a>'
          + '</div>';
      }).join('')
    : '';

  return '<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>'
    + '<body style="margin:0;padding:0;background:#f0f0f0;font-family:Georgia,serif;color:#111">'
    + '<div style="max-width:600px;margin:0 auto;background:#ffffff;border:1px solid #ddd">'

    // Header
    + '<div style="background:#111111;padding:22px 24px;text-align:center;border-bottom:3px solid #c8201c">'
    + '<div style="font-size:11px;color:#888;letter-spacing:0.2em;margin-bottom:4px">GOOD MORNING &nbsp;·&nbsp; ' + today.toUpperCase() + '</div>'
    + '<div style="font-size:30px;font-weight:900;color:#ffffff;line-height:1;margin-bottom:4px">'
    + 'NY <span style="color:#c8201c">SPORTS</span> <span style="font-weight:300;color:#aaa">DAILY</span>'
    + '</div>'
    + '<div style="font-size:10px;color:#f0b429;letter-spacing:0.18em">MORNING DIGEST &nbsp;·&nbsp; ' + teams + '</div>'
    + '</div>'

    // Body
    + '<div style="padding:24px 28px">'

    // Scores
    + '<div style="margin-bottom:24px">'
    + '<div style="font-size:9px;font-weight:900;color:#999;letter-spacing:0.2em;text-transform:uppercase;border-bottom:2px solid #eee;padding-bottom:6px;margin-bottom:12px">🌙 LAST NIGHT\'S NY SCORES</div>'
    + scoresHtml
    + '</div>'

    // Headlines
    + (headlines.length > 0
      ? '<div style="margin-bottom:24px">'
        + '<div style="font-size:9px;font-weight:900;color:#999;letter-spacing:0.2em;text-transform:uppercase;border-bottom:2px solid #eee;padding-bottom:6px;margin-bottom:4px">📰 TOP STORIES</div>'
        + headlinesHtml
        + '</div>'
      : '')

    // Glory moment
    + '<div style="margin-bottom:24px;padding:16px;background:#fff8f0;border:1px solid #f0e0c0;border-left:4px solid #f0b429">'
    + '<div style="font-size:9px;font-weight:900;color:#c8a000;letter-spacing:0.15em;text-transform:uppercase;margin-bottom:6px">🏆 NY GLORY MOMENT</div>'
    + '<div style="font-size:11px;color:#888;margin-bottom:4px">' + glory.year + '</div>'
    + '<div style="font-size:14px;color:#333;line-height:1.6;font-style:italic">"' + glory.text + '"</div>'
    + '</div>'

    // CTA
    + '<div style="text-align:center;margin:20px 0 24px">'
    + '<a href="' + SITE_URL + '" style="display:inline-block;background:#c8201c;color:#ffffff;text-decoration:none;padding:12px 28px;font-weight:900;font-size:12px;letter-spacing:0.12em">🎮 PLAY TODAY\'S TRIVIA →</a>'
    + '</div>'

    + '</div>'

    // Footer
    + '<div style="background:#f8f8f8;border-top:1px solid #eee;padding:16px 24px;text-align:center">'
    + '<p style="color:#888;font-size:12px;line-height:1.6;margin:0 0 6px;font-style:italic">No matter who you root for in NY — we\'re in it together. 🗽</p>'
    + '<p style="color:#aaa;font-size:11px;margin:0 0 8px">NY Sports Daily &nbsp;·&nbsp; Free always &nbsp;·&nbsp; No ads ever</p>'
    + '<a href="https://buymeacoffee.com/mhughes65v" style="color:#aaa;font-size:11px;text-decoration:none">☕ Buy me a coffee</a>'
    + '&nbsp;&nbsp;·&nbsp;&nbsp;'
    + '<a href="' + SITE_URL + '" style="color:#aaa;font-size:11px;text-decoration:none">Visit the site</a>'
    + '</div>'

    + '</div></body></html>';
}

export default async function handler(req, res) {
  try {
    const subscribers = await getSubscribers();
    console.log('Sending digest to ' + subscribers.length + ' subscribers');

    const glory = GLORY_MOMENTS[Math.floor(Math.random() * GLORY_MOMENTS.length)];
    let sent = 0;
    let errors = 0;

    for (let i = 0; i < subscribers.length; i++) {
      const sub = subscribers[i];
      try {
        const results = await Promise.all([
          getYesterdayScores(sub.teams),
          getTeamHeadlines(sub.teams),
        ]);
        const scores    = results[0];
        const headlines = results[1];
        const html      = buildEmail(sub, scores, headlines, glory);
        const today     = new Date().toLocaleDateString('en-US', { weekday:'long', month:'short', day:'numeric' });

        await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Content-Type':  'application/json',
            'Authorization': 'Bearer ' + RESEND_KEY,
          },
          body: JSON.stringify({
            from:    'NY Sports Daily <digest@nysportsdaily.com>',
            to:      [sub.email],
            subject: '🗽 NY Sports Daily · ' + today,
            html:    html,
          }),
        });

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
        await new Promise(function(r) { setTimeout(r, 300); });

      } catch(e) {
        console.error('Failed for ' + sub.email + ':', e);
        errors++;
      }
    }

    console.log('Done. Sent: ' + sent + ', Errors: ' + errors);
    return res.status(200).json({ ok: true, sent: sent, errors: errors });

  } catch(err) {
    console.error('Digest error:', err);
    return res.status(500).json({ error: err.message });
  }
}

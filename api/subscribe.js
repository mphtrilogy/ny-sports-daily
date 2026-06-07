// api/subscribe.js
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;
const RESEND_KEY   = process.env.RESEND_API_KEY;
const FROM_EMAIL   = 'digest@nysportsdaily.com';
const SITE_URL     = 'https://nysportsdaily.com';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { email, name, teams } = req.body || {};

  if (!email || !email.includes('@')) {
    return res.status(400).json({ error: 'Valid email required' });
  }

  try {
    const sbRes = await fetch(SUPABASE_URL + '/rest/v1/ny_subscribers', {
      method: 'POST',
      headers: {
        'Content-Type':  'application/json',
        'apikey':        SUPABASE_KEY,
        'Authorization': 'Bearer ' + SUPABASE_KEY,
        'Prefer':        'return=minimal',
      },
      body: JSON.stringify({
        email:     email.toLowerCase().trim(),
        name:      name || '',
        teams:     teams || [],
        active:    true,
        confirmed: true,
      }),
    });

    if (!sbRes.ok && sbRes.status !== 409) {
      const err = await sbRes.text();
      console.error('Supabase error:', err);
      return res.status(500).json({ error: 'Could not save subscription' });
    }

    const teamList = (teams && teams.length > 0) ? teams.join(', ') : 'All NY Teams';
    const greeting = name ? (', ' + name) : '';

    const welcomeHtml = '<!DOCTYPE html><html><head><meta charset="utf-8"></head>'
      + '<body style="margin:0;padding:0;background:#f5f5f5;font-family:Georgia,serif;color:#111">'
      + '<div style="max-width:600px;margin:0 auto;background:#ffffff;border:1px solid #e0e0e0">'

      // Header
      + '<div style="background:#111111;padding:24px;text-align:center;border-bottom:3px solid #c8201c">'
      + '<div style="font-size:28px;font-weight:900;color:#ffffff;letter-spacing:-0.01em">'
      + 'NY <span style="color:#c8201c">SPORTS</span> <span style="font-weight:300;color:#aaa">DAILY</span>'
      + '</div>'
      + '<div style="font-size:10px;color:#f0b429;letter-spacing:0.2em;margin-top:6px">THE MORNING DIGEST</div>'
      + '</div>'

      // Body
      + '<div style="padding:28px 32px">'
      + '<h2 style="color:#111;font-size:22px;margin:0 0 10px;font-weight:900">Welcome' + greeting + '! 🗽</h2>'
      + '<p style="color:#444;font-size:15px;line-height:1.7;margin:0 0 20px">'
      + 'Every morning at <strong style="color:#c8201c">7am ET</strong> you\'ll get your personalized NY Sports Daily digest.'
      + '</p>'

      // Feature list
      + '<div style="background:#f8f8f8;border-left:4px solid #c8201c;padding:16px 20px;margin:0 0 20px">'
      + '<div style="margin-bottom:8px;color:#222;font-size:14px">⚾ &nbsp;<strong>Last night\'s scores</strong> — with linescore breakdown</div>'
      + '<div style="margin-bottom:8px;color:#222;font-size:14px">📰 &nbsp;<strong>Top headlines</strong> for your teams</div>'
      + '<div style="margin-bottom:8px;color:#222;font-size:14px">🏆 &nbsp;<strong>Glory Days moment</strong> — a piece of NY history</div>'
      + '<div style="color:#222;font-size:14px">🎮 &nbsp;<strong>Daily trivia</strong> — test your NY sports knowledge</div>'
      + '</div>'

      // Teams
      + '<p style="color:#555;font-size:14px;margin:0 0 24px">'
      + 'Your teams: <strong style="color:#c8201c">' + teamList + '</strong>'
      + '</p>'

      // CTA button
      + '<div style="text-align:center;margin:24px 0 28px">'
      + '<a href="' + SITE_URL + '" style="display:inline-block;background:#c8201c;color:#ffffff;'
      + 'text-decoration:none;padding:13px 32px;font-weight:900;font-size:13px;'
      + 'letter-spacing:0.1em;font-family:Georgia,serif">'
      + 'VISIT NYSPORTSDAILY.COM →'
      + '</a>'
      + '</div>'

      + '</div>'

      // Footer
      + '<div style="background:#f0f0f0;border-top:1px solid #ddd;padding:16px 24px;text-align:center">'
      + '<p style="color:#888;font-size:12px;margin:0 0 6px;font-style:italic">'
      + 'No matter who you root for in NY — we\'re in it together. 🗽'
      + '</p>'
      + '<p style="color:#aaa;font-size:11px;margin:0 0 8px">NY Sports Daily · Free always · No ads ever</p>'
      + '<a href="https://buymeacoffee.com/mhughes65v" style="color:#888;font-size:11px;text-decoration:none">'
      + '☕ Buy me a coffee'
      + '</a>'
      + '</div>'

      + '</div></body></html>';

    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': 'Bearer ' + RESEND_KEY,
      },
      body: JSON.stringify({
        from:    'NY Sports Daily <' + FROM_EMAIL + '>',
        to:      [email],
        subject: '🗽 Welcome to the NY Sports Daily Morning Digest',
        html:    welcomeHtml,
      }),
    });

    return res.status(200).json({ ok: true, message: 'Subscribed! Check your email.' });

  } catch (err) {
    console.error('Subscribe error:', err);
    return res.status(500).json({ error: 'Something went wrong' });
  }
}

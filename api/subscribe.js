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
    // Save to Supabase
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

    const teamList = (teams && teams.length > 0) ? teams.join(', ') : 'all NY teams';
    const greeting = name ? (', ' + name) : '';

    // Send welcome email
    const welcomeHtml = '<html><body style="margin:0;padding:0;background:#0a0a0a;font-family:Georgia,serif;color:#e8e0d0">'
      + '<div style="max-width:600px;margin:0 auto;padding:32px 24px">'
      + '<div style="text-align:center;border-bottom:2px solid #c8201c;padding-bottom:20px;margin-bottom:24px">'
      + '<div style="font-size:32px;font-weight:900;color:#e8e0d0">NY <span style="color:#c8201c">SPORTS</span> <span style="font-weight:300;color:#aaa">DAILY</span></div>'
      + '<div style="font-size:11px;color:#f0b429;letter-spacing:0.15em;margin-top:6px">THE MORNING DIGEST</div>'
      + '</div>'
      + '<h2 style="color:#e8e0d0;font-size:22px;margin:0 0 12px">Welcome' + greeting + '! 🗽</h2>'
      + '<p style="color:#aaa;font-size:15px;line-height:1.7;margin:0 0 16px">Every morning at <strong style="color:#e8e0d0">7am ET</strong> you get your personalized NY Sports Daily digest.</p>'
      + '<div style="background:#111;border:1px solid #1f1f1f;border-left:3px solid #c8201c;padding:16px 20px;margin:0 0 20px">'
      + '<div style="margin-bottom:8px">⚾ <strong>Last night\'s scores</strong></div>'
      + '<div style="margin-bottom:8px">📰 <strong>Top headlines for your teams</strong></div>'
      + '<div style="margin-bottom:8px">🏆 <strong>Glory Days moment</strong></div>'
      + '<div>🎮 <strong>Daily trivia</strong></div>'
      + '</div>'
      + '<p style="color:#aaa;font-size:14px;margin:0 0 20px">Your teams: <strong style="color:#f0b429">' + teamList + '</strong></p>'
      + '<div style="text-align:center;margin:28px 0">'
      + '<a href="' + SITE_URL + '" style="background:#c8201c;color:#fff;text-decoration:none;padding:12px 28px;font-weight:900;font-size:13px">VISIT NYSPORTSDAILY.COM</a>'
      + '</div>'
      + '<div style="border-top:1px solid #1f1f1f;padding-top:20px;text-align:center">'
      + '<p style="color:#555;font-size:12px;margin:0 0 8px">No matter who you root for in NY — we\'re in it together. 🗽</p>'
      + '<p style="color:#444;font-size:11px;margin:0">NY Sports Daily · Free always · No ads</p>'
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

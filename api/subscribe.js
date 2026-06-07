// api/subscribe.js
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;
const RESEND_KEY   = process.env.RESEND_API_KEY;
const FROM_EMAIL   = 'digest@nysportsdaily.com';
const SITE_URL     = 'https://nysportsdaily.com';

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { email, name, teams } = req.body;

  if (!email || !email.includes('@')) {
    return res.status(400).json({ error: 'Valid email required' });
  }

  try {
    const sbRes = await fetch(`${SUPABASE_URL}/rest/v1/ny_subscribers`, {
      method: 'POST',
      headers: {
        'Content-Type':  'application/json',
        'apikey':        SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
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

    const teamList = teams?.length > 0 ? teams.join(', ') : 'all NY teams';

    const welcomeHtml = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></h

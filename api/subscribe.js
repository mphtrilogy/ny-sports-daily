// api/subscribe.js
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;
const RESEND_KEY   = process.env.RESEND_API_KEY;
const FROM_EMAIL   = 'digest@nysportsdaily.com';
const SITE_URL     = 'https://nysportsdaily.com';

export default async function handler(req, res) {
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
        email:     email.toLowerCase

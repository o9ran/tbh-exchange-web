import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const page = req.query.page ?? 1;
  try {
    const upstream = await fetch(`https://tbh-market.com/api/items?page=${page}`, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0' },
    });
    const data = await upstream.json();
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cache-Control', 's-maxage=300');
    res.json(data);
  } catch {
    res.status(502).json({ error: 'upstream_error' });
  }
}

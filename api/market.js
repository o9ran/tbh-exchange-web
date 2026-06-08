module.exports = async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
    res.status(200).end();
    return;
  }
  const page = req.query.page || 1;
  try {
    const https = require('https');
    const data = await new Promise((resolve, reject) => {
      const url = `https://tbh-market.com/api/items?page=${page}`;
      https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0' } }, (r) => {
        let body = '';
        r.on('data', chunk => body += chunk);
        r.on('end', () => {
          try { resolve(JSON.parse(body)); }
          catch { reject(new Error('parse error')); }
        });
      }).on('error', reject);
    });
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cache-Control', 's-maxage=1800, stale-while-revalidate=3600');
    res.json(data);
  } catch (err) {
    res.status(502).json({ error: 'upstream_error', detail: err.message });
  }
};

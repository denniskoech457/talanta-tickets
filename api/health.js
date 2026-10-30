export default function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed.' });
  }
  res.setHeader('Cache-Control', 'no-store');
  return res.status(200).json({ ok: true, megapayConfigured: Boolean(process.env.MEGAPAY_API_KEY && process.env.MEGAPAY_EMAIL) });
}

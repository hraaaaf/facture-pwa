export default function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const payload = req.body && typeof req.body === 'object' ? req.body : {}
  console.log('[voice-debug]', JSON.stringify({
    ...payload,
    userAgent: req.headers['user-agent'] ?? null
  }))
  return res.status(204).end()
}

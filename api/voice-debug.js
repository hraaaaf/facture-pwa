export default async function handler(req, res) {
  if (process.env.VERCEL_ENV !== 'preview') {
    res.statusCode = 404
    res.end()
    return
  }
  if (req.method !== 'POST') {
    res.statusCode = 405
    res.setHeader('allow', 'POST')
    res.end()
    return
  }

  let body = req.body
  if (typeof body === 'string') {
    try { body = JSON.parse(body) } catch { body = { parseError: true, rawBody: body.slice(0, 1000) } }
  }

  const payload = {
    marker: body?.marker ?? null,
    transcript: typeof body?.transcript === 'string' ? body.transcript.slice(0, 1500) : null,
    normalizedTranscript: typeof body?.normalizedTranscript === 'string' ? body.normalizedTranscript.slice(0, 1500) : null,
    defaultVatRate: body?.defaultVatRate ?? null,
    raw: body?.raw ?? null,
    userAgent: req.headers['user-agent'] ?? null
  }

  console.log('FACTEA_VOICE_DEBUG', JSON.stringify(payload))
  res.setHeader('cache-control', 'no-store')
  res.statusCode = 204
  res.end()
}

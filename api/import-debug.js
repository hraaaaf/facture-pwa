const scrub = (value, depth = 0) => {
  if (depth > 4) return '[depth-limit]'
  if (value == null || typeof value === 'number' || typeof value === 'boolean') return value
  if (typeof value === 'string') return value.slice(0, 240)
  if (Array.isArray(value)) return value.slice(0, 30).map(item => scrub(item, depth + 1))
  if (typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).slice(0, 40).map(([key, item]) => [key, scrub(item, depth + 1)]))
  }
  return String(value).slice(0, 240)
}

export default function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ ok: false })
  }

  let body = req.body
  if (typeof body === 'string') {
    try { body = JSON.parse(body) } catch { body = { parseError: true } }
  }

  console.log('[FACTEA_IMPORT_DEBUG]', JSON.stringify(scrub(body ?? {})))
  return res.status(204).end()
}

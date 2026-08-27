import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const root = resolve(process.cwd())

const pngDimensions = (relativePath: string) => {
  const file = readFileSync(resolve(root, relativePath))
  expect(file.subarray(0, 8).toString('hex')).toBe('89504e470d0a1a0a')
  return {
    width: file.readUInt32BE(16),
    height: file.readUInt32BE(20)
  }
}

describe('Factea PWA install assets', () => {
  it('ships generated square PNG icons at the required sizes', () => {
    expect(pngDimensions('public/apple-touch-icon.png')).toEqual({ width: 180, height: 180 })
    expect(pngDimensions('public/pwa-192.png')).toEqual({ width: 192, height: 192 })
    expect(pngDimensions('public/pwa-512.png')).toEqual({ width: 512, height: 512 })
  })

  it('wires the Factea identity and Apple touch icon in index.html', () => {
    const html = readFileSync(resolve(root, 'index.html'), 'utf8')
    expect(html).toContain('apple-mobile-web-app-title" content="Factea"')
    expect(html).toContain('<title>Factea</title>')
    expect(html).toContain('rel="apple-touch-icon"')
    expect(html).toContain('/apple-touch-icon.png')
  })

  it('wires Factea and Android install icons in the Vite PWA manifest', () => {
    const config = readFileSync(resolve(root, 'vite.config.ts'), 'utf8')
    expect(config).toContain("name: 'Factea'")
    expect(config).toContain("short_name: 'Factea'")
    expect(config).toContain("src: '/pwa-192.png'")
    expect(config).toContain("sizes: '192x192'")
    expect(config).toContain("src: '/pwa-512.png'")
    expect(config).toContain("sizes: '512x512'")
    expect(config).toContain("purpose: 'maskable'")
  })
})

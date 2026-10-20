// Draws the app icons (no image libraries): an ink square with an amber
// crescent moon and a small raven-eye dot. Run: node scripts/make-icons.mjs
import { writeFileSync } from 'node:fs'
import { deflateSync } from 'node:zlib'

const INK = [24, 25, 29]
const AMBER = [232, 150, 72]
const PAPER = [246, 244, 239]

function crc32(buf) {
  let c, crc = 0xffffffff
  for (const b of buf) {
    c = (crc ^ b) & 0xff
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    crc = (crc >>> 8) ^ c
  }
  return (crc ^ 0xffffffff) >>> 0
}

function chunk(type, data) {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length)
  const body = Buffer.concat([Buffer.from(type), data])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(body))
  return Buffer.concat([len, body, crc])
}

function png(size, pixel) {
  const raw = Buffer.alloc((size * 4 + 1) * size)
  const S = 4 // supersampling
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0
    for (let x = 0; x < size; x++) {
      const acc = [0, 0, 0]
      for (let sy = 0; sy < S; sy++)
        for (let sx = 0; sx < S; sx++) {
          const c = pixel((x + (sx + 0.5) / S) / size, (y + (sy + 0.5) / S) / size)
          acc[0] += c[0]; acc[1] += c[1]; acc[2] += c[2]
        }
      const o = y * (size * 4 + 1) + 1 + x * 4
      raw[o] = acc[0] / (S * S); raw[o + 1] = acc[1] / (S * S); raw[o + 2] = acc[2] / (S * S); raw[o + 3] = 255
    }
  }
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

// Full-bleed: iOS and maskable icons round the corners themselves.
function icon(u, v) {
  const d = (cx, cy) => Math.hypot(u - cx, v - cy)
  const inMoon = d(0.5, 0.5) < 0.3 && d(0.62, 0.42) > 0.25
  if (inMoon) return AMBER
  if (d(0.6, 0.47) < 0.035) return PAPER
  return INK
}

writeFileSync('public/icons/icon-192.png', png(192, icon))
writeFileSync('public/icons/icon-512.png', png(512, icon))
writeFileSync('public/icons/apple-touch-icon.png', png(180, icon))
console.log('icons written')

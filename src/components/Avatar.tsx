// A raven's initial on a colour derived from its folder, so it stays put.
const HUES = [24, 200, 140, 280, 340, 60, 170, 230]

function hue(folder: string): number {
  let h = 0
  for (const c of folder) h = (h * 31 + c.charCodeAt(0)) >>> 0
  return HUES[h % HUES.length]!
}

export function Avatar({ name, folder, size = 40 }: { name: string; folder: string; size?: number }) {
  return (
    <span
      className="avatar"
      aria-hidden="true"
      style={{ width: size, height: size, fontSize: size * 0.42, ['--hue' as string]: hue(folder) }}
    >
      {name.trim().charAt(0).toUpperCase() || '?'}
    </span>
  )
}

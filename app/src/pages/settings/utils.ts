/** Format minutes as "2h30min" / "45min" / "3h". */
export function mToStr(m: number): string {
  if (m < 60) return `${m}min`
  const h = Math.floor(m / 60)
  const r = m % 60
  return r > 0 ? `${h}h${r}min` : `${h}h`
}

/** Format an integer hour as "HH:00". */
export function padH(h: number): string {
  return `${h.toString().padStart(2, '0')}:00`
}

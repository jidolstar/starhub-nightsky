import type { StarData } from '../types';

function parseCsvLine(line: string): string[] {
  const fields: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i]

    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"'
        i += 1
      } else {
        inQuotes = !inQuotes
      }
      continue
    }

    if (char === ',' && !inQuotes) {
      fields.push(current)
      current = ''
      continue
    }

    current += char
  }

  fields.push(current)
  return fields.map((value) => value.trim())
}

function parseSexagesimalRa(value: string): number {
  const parts = value.trim().split(/\s+/).map(Number)
  if (parts.length < 3 || parts.some((part) => Number.isNaN(part))) return Number.NaN

  const [hours, minutes, seconds] = parts
  return (hours + minutes / 60 + seconds / 3600) * 15
}

function parseSexagesimalDec(value: string): number {
  const trimmed = value.trim()
  if (!trimmed) return Number.NaN

  const sign = trimmed.startsWith('-') ? -1 : 1
  const normalized = trimmed.replace(/^[+-]/, '')
  const parts = normalized.split(/\s+/).map(Number)
  if (parts.length < 3 || parts.some((part) => Number.isNaN(part))) return Number.NaN

  const [degrees, minutes, seconds] = parts
  return sign * (degrees + minutes / 60 + seconds / 3600)
}

export function parseBrightStarCatalogCsv(csvText: string): StarData[] {
  const lines = csvText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)

  if (lines.length < 2) return []

  const headers = parseCsvLine(lines[0]).map((header) => header.toLowerCase())
  const nameIndex = headers.indexOf('name')
  const altNameIndex = headers.indexOf('alt_name')
  const raIndex = headers.indexOf('ra')
  const decIndex = headers.indexOf('dec')
  const magIndex = headers.indexOf('vmag')

  if (raIndex < 0 || decIndex < 0 || magIndex < 0) return []

  const stars: StarData[] = []

  for (const line of lines.slice(1)) {
    const fields = parseCsvLine(line)
    const ra = parseSexagesimalRa(fields[raIndex] ?? '')
    const dec = parseSexagesimalDec(fields[decIndex] ?? '')
    const mag = Number.parseFloat(fields[magIndex] ?? '')

    if (!Number.isFinite(ra) || !Number.isFinite(dec) || !Number.isFinite(mag)) continue

    stars.push({
      ra,
      dec,
      mag,
      name: nameIndex >= 0 ? fields[nameIndex] || undefined : undefined,
      altName: altNameIndex >= 0 ? fields[altNameIndex] || undefined : undefined,
    })
  }

  return stars
}

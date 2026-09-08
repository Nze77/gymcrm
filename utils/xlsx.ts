// Minimal, dependency-free XLSX (Office Open XML) writer.
// Builds a real multi-sheet .xlsx by zipping the required parts with the
// STORE method, so no compression library is needed.

export type CellValue = string | number | null | undefined

export interface SheetData {
  name: string
  rows: CellValue[][]
}

const encoder = new TextEncoder()

const escapeXml = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
    // Strip control characters Excel refuses to open
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '')

const columnName = (index: number) => {
  let name = ''
  let i = index
  while (i >= 0) {
    name = String.fromCharCode(65 + (i % 26)) + name
    i = Math.floor(i / 26) - 1
  }
  return name
}

// Excel sheet names: max 31 chars, no []:*?/\ and must be unique
const sanitizeSheetName = (name: string, used: Set<string>) => {
  const base = name.replace(/[\[\]:*?/\\]/g, ' ').trim().slice(0, 31) || 'Sheet'
  let candidate = base
  let n = 2
  while (used.has(candidate.toLowerCase())) {
    const suffix = ` ${n++}`
    candidate = base.slice(0, 31 - suffix.length) + suffix
  }
  used.add(candidate.toLowerCase())
  return candidate
}

const buildSheetXml = (rows: CellValue[][]) => {
  const body = rows
    .map((row, rowIndex) => {
      const r = rowIndex + 1
      const cells = row
        .map((value, colIndex) => {
          if (value === null || value === undefined || value === '') return ''
          const ref = `${columnName(colIndex)}${r}`
          if (typeof value === 'number' && Number.isFinite(value)) {
            return `<c r="${ref}"><v>${value}</v></c>`
          }
          return `<c r="${ref}" t="inlineStr"><is><t xml:space="preserve">${escapeXml(String(value))}</t></is></c>`
        })
        .join('')
      return `<row r="${r}">${cells}</row>`
    })
    .join('')

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
    `<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">` +
    `<sheetData>${body}</sheetData></worksheet>`
}

/* ---------------------------------- zip ---------------------------------- */

let crcTable: Uint32Array | null = null

const getCrcTable = () => {
  if (crcTable) return crcTable
  const table = new Uint32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    table[n] = c >>> 0
  }
  crcTable = table
  return table
}

const crc32 = (bytes: Uint8Array) => {
  const table = getCrcTable()
  let c = 0xffffffff
  for (let i = 0; i < bytes.length; i++) c = table[(c ^ bytes[i]) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

const dosDateTime = (date: Date) => ({
  time: (date.getHours() << 11) | (date.getMinutes() << 5) | (date.getSeconds() >> 1),
  date: ((date.getFullYear() - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate(),
})

const zip = (files: { name: string; content: string }[]) => {
  const stamp = dosDateTime(new Date())
  const chunks: Uint8Array[] = []
  const central: Uint8Array[] = []
  let offset = 0

  for (const file of files) {
    const nameBytes = encoder.encode(file.name)
    const data = encoder.encode(file.content)
    const crc = crc32(data)

    const header = new Uint8Array(30 + nameBytes.length)
    const hv = new DataView(header.buffer)
    hv.setUint32(0, 0x04034b50, true)
    hv.setUint16(4, 20, true) // version needed
    hv.setUint16(6, 0x0800, true) // UTF-8 names
    hv.setUint16(8, 0, true) // stored, no compression
    hv.setUint16(10, stamp.time, true)
    hv.setUint16(12, stamp.date, true)
    hv.setUint32(14, crc, true)
    hv.setUint32(18, data.length, true)
    hv.setUint32(22, data.length, true)
    hv.setUint16(26, nameBytes.length, true)
    hv.setUint16(28, 0, true)
    header.set(nameBytes, 30)

    const entry = new Uint8Array(46 + nameBytes.length)
    const ev = new DataView(entry.buffer)
    ev.setUint32(0, 0x02014b50, true)
    ev.setUint16(4, 20, true) // version made by
    ev.setUint16(6, 20, true) // version needed
    ev.setUint16(8, 0x0800, true)
    ev.setUint16(10, 0, true)
    ev.setUint16(12, stamp.time, true)
    ev.setUint16(14, stamp.date, true)
    ev.setUint32(16, crc, true)
    ev.setUint32(20, data.length, true)
    ev.setUint32(24, data.length, true)
    ev.setUint16(28, nameBytes.length, true)
    ev.setUint32(42, offset, true)
    entry.set(nameBytes, 46)

    chunks.push(header, data)
    central.push(entry)
    offset += header.length + data.length
  }

  const centralSize = central.reduce((sum, e) => sum + e.length, 0)
  const end = new Uint8Array(22)
  const endView = new DataView(end.buffer)
  endView.setUint32(0, 0x06054b50, true)
  endView.setUint16(8, files.length, true)
  endView.setUint16(10, files.length, true)
  endView.setUint32(12, centralSize, true)
  endView.setUint32(16, offset, true)

  const all = [...chunks, ...central, end]
  const total = all.reduce((sum, part) => sum + part.length, 0)
  const out = new Uint8Array(total)
  let pos = 0
  for (const part of all) {
    out.set(part, pos)
    pos += part.length
  }
  return out
}

/* --------------------------------- public -------------------------------- */

export const buildWorkbook = (sheets: SheetData[]) => {
  const used = new Set<string>()
  const named = sheets.map((sheet, i) => ({
    name: sanitizeSheetName(sheet.name, used),
    path: `xl/worksheets/sheet${i + 1}.xml`,
    id: i + 1,
    rows: sheet.rows,
  }))

  const files: { name: string; content: string }[] = [
    {
      name: '[Content_Types].xml',
      content:
        `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
        `<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">` +
        `<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>` +
        `<Default Extension="xml" ContentType="application/xml"/>` +
        `<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>` +
        named
          .map(
            s =>
              `<Override PartName="/${s.path}" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`
          )
          .join('') +
        `</Types>`,
    },
    {
      name: '_rels/.rels',
      content:
        `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
        `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">` +
        `<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>` +
        `</Relationships>`,
    },
    {
      name: 'xl/workbook.xml',
      content:
        `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
        `<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" ` +
        `xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>` +
        named
          .map(s => `<sheet name="${escapeXml(s.name)}" sheetId="${s.id}" r:id="rId${s.id}"/>`)
          .join('') +
        `</sheets></workbook>`,
    },
    {
      name: 'xl/_rels/workbook.xml.rels',
      content:
        `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
        `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">` +
        named
          .map(
            s =>
              `<Relationship Id="rId${s.id}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${s.id}.xml"/>`
          )
          .join('') +
        `</Relationships>`,
    },
    ...named.map(s => ({ name: s.path, content: buildSheetXml(s.rows) })),
  ]

  return zip(files)
}

export const downloadWorkbook = (filename: string, sheets: SheetData[]) => {
  const bytes = buildWorkbook(sheets)
  const blob = new Blob([bytes as unknown as BlobPart], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename.endsWith('.xlsx') ? filename : `${filename}.xlsx`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

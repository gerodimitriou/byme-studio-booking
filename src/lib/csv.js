// Lightweight CSV export — no dependencies.
// Adds a UTF-8 BOM so Greek opens correctly in Excel.

function escapeCell(value) {
  if (value == null) return ''
  const s = String(value)
  // Quote if it contains comma, quote, or newline
  if (/[",\n\r]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`
  }
  return s
}

/**
 * Builds a CSV string.
 * @param {object[]} rows
 * @param {{ key: string, label: string }[]} columns
 */
export function toCSV(rows, columns) {
  const header = columns.map(c => escapeCell(c.label)).join(',')
  const body = rows
    .map(row => columns.map(c => escapeCell(row[c.key])).join(','))
    .join('\r\n')
  return `${header}\r\n${body}`
}

/** Triggers a browser download of a CSV file. */
export function downloadCSV(filename, rows, columns) {
  const csv  = toCSV(rows, columns)
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

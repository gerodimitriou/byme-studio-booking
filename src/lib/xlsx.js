// Multi-sheet Excel export via SheetJS.
// Loaded only on the (lazy) Admin route, so it doesn't weigh down the public site.
import * as XLSX from 'xlsx'

/**
 * Triggers a browser download of an .xlsx workbook with one sheet per entry.
 * @param {string} filename
 * @param {{ name: string, rows: object[], columns: { key: string, label: string }[] }[]} sheets
 */
export function downloadXLSX(filename, sheets) {
  const wb = XLSX.utils.book_new()
  for (const { name, rows, columns } of sheets) {
    const header = columns.map(c => c.label)
    const body   = rows.map(row => columns.map(c => row[c.key] ?? ''))
    const ws     = XLSX.utils.aoa_to_sheet([header, ...body])

    // Column widths sized to the widest cell (header or any value), so nothing
    // gets clipped — capped so a long email doesn't blow out the layout.
    ws['!cols'] = columns.map(c => {
      const widest = body.reduce((max, r, i) => {
        const v = String(rows[i][c.key] ?? '')
        return Math.max(max, v.length)
      }, c.label.length)
      return { wch: Math.min(40, Math.max(12, widest + 2)) }
    })

    // Bold the header row.
    for (let i = 0; i < columns.length; i++) {
      const cell = ws[XLSX.utils.encode_cell({ r: 0, c: i })]
      if (cell) cell.s = { font: { bold: true } }
    }

    // Freeze the header row and enable column filters/sorting.
    ws['!freeze'] = { xSplit: 0, ySplit: 1, topLeftCell: 'A2', activePane: 'bottomLeft', state: 'frozen' }
    const lastCol = XLSX.utils.encode_col(columns.length - 1)
    ws['!autofilter'] = { ref: `A1:${lastCol}${body.length + 1}` }

    // Sheet names: max 31 chars, no : \ / ? * [ ]
    const safe = name.slice(0, 31).replace(/[:\\/?*[\]]/g, ' ')
    XLSX.utils.book_append_sheet(wb, ws, safe)
  }
  XLSX.writeFile(wb, filename)
}
